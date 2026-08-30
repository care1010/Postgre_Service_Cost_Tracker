const db = require('../config/db');
const cron = require('node-cron');
const dataController = require('./dataController');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const mailService = require('../services/mailService');

let currentCronJob = null;
let monthlyBackupJob = null; // Backup cron job reference
let isSyncing = false;
let autoSyncTimeout = null;
let bgdmAlertJob = null; // 🔥 Naya job reference
let monthlyAuditJob = null;

// ==========================================
// 📦 DATABASE BACKUP ENGINE (PostgreSQL)
// ==========================================
const runDatabaseBackup = () => {
    console.log("📦 CRON: Starting Monthly Database Backup...");

    // 1. Create Backup Directory (OS Independent: Windows/Linux)
    // Yeh server/controllers folder se 2 level up jayega: 7_Service_Cost_Tracker_Postgres/database/backup
    const backupDir = path.join(__dirname, '../../database/backup');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    // 2. Format Date: dd-mmm-yyyy (e.g., 01-Aug-2026)
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const fileName = `Backup_ServiceCost_${day}-${month}-${year}.backup`;
    const filePath = path.join(backupDir, fileName);

    // 3. Get DB Credentials
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';
    const dbName = process.env.DB_NAME || 'service_cost';

    // 4. Build pg_dump Command
    // -F c = Custom format (Compressed, best for 1M+ rows)
    const cmd = `pg_dump -h ${host} -p ${port} -U ${user} -F c -d ${dbName} -f "${filePath}"`;

    // 5. Execute Command (Passing Password securely via Env Variables)
    exec(cmd, { env: { ...process.env, PGPASSWORD: password } }, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ CRON Backup Failed: ${error.message}`);
            return;
        }
        console.log(`✅ CRON Backup Successful! File saved at: ${filePath}`);
    });
};


// ==========================================
// 🔄 DATA SYNC ENGINE
// ==========================================
const runSync = async (triggeredBy = 'cron') => {
    if (isSyncing) {
        console.log(`⏳ Sync already in progress. Skipping trigger from: ${triggeredBy}`);
        return;
    }

    isSyncing = true;
    console.log(`🟢 CRON/TRIGGER: Starting sync (Triggered by: ${triggeredBy})`);

    try {
        await db.query("UPDATE cron_config SET last_run_at = NOW(), last_run_status = 'running', last_run_message = 'Sync in progress' WHERE job_name = 'full_sync'");
        
        await dataController.runFullSyncCore();

        await db.query("UPDATE cron_config SET last_run_status = 'success', last_run_message = 'Sync completed successfully', run_count = run_count + 1 WHERE job_name = 'full_sync'");
        console.log('✅ CRON/TRIGGER: Sync completed successfully!');
    } catch (error) {
        console.error('❌ CRON/TRIGGER Error:', error.message);
        await db.query("UPDATE cron_config SET last_run_status = 'error', last_run_message = ? WHERE job_name = 'full_sync'", [error.message.substring(0, 250)]);
    } finally {
        isSyncing = false;
    }
};

// 🔥 NAYA: Alerts Runner
const runMonthlyAlerts = async () => {
    console.log("🚀 CRON: Starting Monthly BGDM Alerts...");
    try {
        await db.query("UPDATE cron_config SET last_run_at = NOW(), last_run_status = 'running' WHERE job_name = 'bgdm_alerts'");
        
        const mailsSent = await dataController.runBGDMAlertsCore();

        await db.query("UPDATE cron_config SET last_run_status = 'success', last_run_message = ?, run_count = run_count + 1 WHERE job_name = 'bgdm_alerts'", 
        [`Sent ${mailsSent} alerts successfully`]);
        console.log(`✅ CRON Alerts: Completed. Mails sent: ${mailsSent}`);
    } catch (error) {
        console.error('❌ CRON Alerts Error:', error.message);
        await db.query("UPDATE cron_config SET last_run_status = 'error', last_run_message = ? WHERE job_name = 'bgdm_alerts'", [error.message.substring(0, 250)]);
    }
};

// 🔥 NAYA: Monthly Project Audit Runner
const runMonthlyProjectAudit = async () => {
    console.log("🚀 CRON: Starting Monthly Project WBS Audit...");
    try {
        await db.query("UPDATE cron_config SET last_run_at = NOW(), last_run_status = 'running' WHERE job_name = 'monthly_project_audit'");

        // 1. Get Previous Month name
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        const reportMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        // 2. Fetch logs from previous month (Postgres Logic)
        const [logRows] = await db.query(`
            SELECT user_email, loa_id, loa_name, action_mode, wbs_count, single_wbs, created_at 
            FROM project_activity_logs 
            WHERE created_at >= date_trunc('month', current_date - interval '1 month')
              AND created_at < date_trunc('month', current_date)
            ORDER BY created_at ASC
        `);

        // 3. Generate Excel
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Audit Log');
        sheet.columns = [
            { header: 'LOA ID', key: 'loa_id', width: 15 },
            { header: 'Project Name', key: 'loa_name', width: 40 },
            { header: 'Action', key: 'mode', width: 20 },
            { header: 'WBS Elements', key: 'wbs', width: 80 }
        ];

        logRows.forEach(log => {
            sheet.addRow({
                loa_id: log.loa_id, 
                loa_name: log.loa_name,
                mode: log.action_mode, 
                wbs: log.single_wbs
            });
        });
        sheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();

        // 🔥 Final check: Admin list fetch logic ensure karein
        const [admins] = await db.query("SELECT email FROM users WHERE type IN ('admin', 'super_admin') AND is_active = '1'");
        const adminEmails = admins.map(a => a.email);

        // Mail trigger
        await mailService.sendMonthlyProjectAuditMail(adminEmails, buffer, reportMonth);

        await db.query("UPDATE cron_config SET last_run_status = 'success', last_run_message = 'Audit report delivered to Admin team', run_count = run_count + 1 WHERE job_name = 'monthly_project_audit'");
        console.log(`✅ CRON: Audit mail sent to Neha for ${reportMonth}`);

    } catch (error) {
        console.error('❌ CRON Audit Error:', error.message);
        await db.query("UPDATE cron_config SET last_run_status = 'error', last_run_message = ? WHERE job_name = 'monthly_project_audit'", [error.message.substring(0, 250)]);
    }
};


// ==========================================
// ⏰ INITIALIZATION (Sync + Backup)
// ==========================================
// ==========================================
// ⏰ INITIALIZATION (Sync + Backup + Audit)
// ==========================================
exports.initCron = async () => {
    try {
        // --- 1. DATA SYNC CRON ---
        if (currentCronJob) currentCronJob.stop();
        const [syncRows] = await db.query("SELECT * FROM cron_config WHERE job_name = 'full_sync'");
        if (syncRows.length > 0 && syncRows[0].is_enabled) {
            currentCronJob = cron.schedule(syncRows[0].cron_expression, () => runSync('scheduled_cron'));
            console.log(`⏰ Data Sync Cron: ${syncRows[0].cron_expression}`);
        }

        // --- 2. MONTHLY BACKUP CRON ---
        if (monthlyBackupJob) monthlyBackupJob.stop();
        // Standard: 1st of month at 00:00
        monthlyBackupJob = cron.schedule('0 0 1 * *', () => runDatabaseBackup());
        console.log(`⏰ Monthly DB Backup Cron: 0 0 1 * *`);

        // --- 3. BGDM ALERTS CRON ---
        if (bgdmAlertJob) bgdmAlertJob.stop();
        const [alertRows] = await db.query("SELECT * FROM cron_config WHERE job_name = 'bgdm_alerts'");
        if (alertRows.length > 0 && alertRows[0].is_enabled) {
            bgdmAlertJob = cron.schedule(alertRows[0].cron_expression, () => runMonthlyAlerts());
            console.log(`⏰ BGDM Alerts Cron: ${alertRows[0].cron_expression}`);
        }

        // --- 4. 🔥 FIXED: MONTHLY PROJECT AUDIT CRON ---
        if (monthlyAuditJob) monthlyAuditJob.stop();
        const [auditConfig] = await db.query("SELECT * FROM cron_config WHERE job_name = 'monthly_project_audit'");
        if (auditConfig.length > 0 && auditConfig[0].is_enabled) {
            // 🔥 Ab ye wahi time pick karega jo aapne DB mein dala hai (*/3 * * * *)
            monthlyAuditJob = cron.schedule(auditConfig[0].cron_expression, () => {
                runMonthlyProjectAudit();
            });
            console.log(`⏰ Audit Cron initialized: ${auditConfig[0].cron_expression}`);
        }

    } catch (err) {
        console.error("❌ Cron Init Error:", err.message);
    }
};

// ==========================================
// 🎛️ API ENDPOINTS
// ==========================================
exports.getCronConfig = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM cron_config WHERE job_name = 'full_sync'");
        res.json(rows[0] || null);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSyncStatus = (req, res) => {
    res.json({ isRunning: isSyncing, cronActive: currentCronJob !== null });
};

exports.updateCronConfig = async (req, res) => {
    try {
        const { cron_expression, is_enabled } = req.body;
        const updates = [];
        const params = [];

        if (cron_expression !== undefined) {
            if (cron_expression !== 'custom' && !cron.validate(cron_expression)) {
                return res.status(400).json({ error: 'Invalid cron expression format' });
            }
            updates.push(`cron_expression = ?`);
            params.push(cron_expression);
        }
        if (is_enabled !== undefined) {
            updates.push(`is_enabled = ?`);
            params.push(is_enabled);
        }

        if (updates.length > 0) {
            params.push('full_sync'); 
            await db.query(`UPDATE cron_config SET ${updates.join(', ')}, updated_at = NOW() WHERE job_name = ?`, params);
            await exports.initCron();
        }

        const [rows] = await db.query("SELECT * FROM cron_config WHERE job_name = 'full_sync'");
        res.json({ message: "Settings updated successfully", config: rows[0] });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.triggerManualSync = async (req, res) => {
    if (isSyncing) return res.status(400).json({ message: "Sync is already running." });
    runSync(req.body.triggeredBy || 'manual_trigger');
    res.json({ message: "Sync started in background." });
};

exports.triggerAutoSync = (source) => {
    if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
    console.log(`⏳ Auto-Sync queued by [${source}]. Waiting 2 seconds...`);
    
    autoSyncTimeout = setTimeout(() => {
        runSync(`auto_trigger_${source}`);
    }, 2000); 
};

// EXPORTING BACKUP FUNCTION SO YOU CAN TEST IT IF NEEDED
exports.testDatabaseBackup = (req, res) => {
    runDatabaseBackup();
    res.json({ message: "Backup process triggered in background. Check console logs." });
};