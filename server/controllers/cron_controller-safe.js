const db = require('../config/db');
const cron = require('node-cron');
const dataController = require('./dataController');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const mailService = require('../services/mailService');

// Global job references to prevent "not defined" errors
// 🔥 ENSURE ALL REFERENCES ARE DECLARED TOP
let syncJob = null;
let backupJob = null;
let bgdmAlertJob = null;
let projectAuditJob = null;
let ptdReminderJob = null; // 🔥 Reference for Reminder
let pendingLoaJob = null;  // 🔥 Reference for Pending Audit

let isSyncing = false;
let autoSyncTimeout = null;

// ==========================================
// 🛡️ PM2 INSTANCE GUARD
// Only run cron on the first instance to prevent duplicate mails
// ==========================================
const isPrimaryInstance = () => {
    // PM2 sets NODE_APP_INSTANCE. If not using PM2, it will be undefined (return true)
    const instance = process.env.NODE_APP_INSTANCE;
    return instance === undefined || instance === '0';
};

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
    if (!isPrimaryInstance()) return;
    console.log("🚀 CRON: Starting Monthly BGDM Alerts...");
    try {
        await db.query("UPDATE cron_config SET last_run_at = NOW(), last_run_status = 'running' WHERE job_name = 'bgdm_alerts'");
        const mailsSent = await dataController.runBGDMAlertsCore();
        await db.query("UPDATE cron_config SET last_run_status = 'success', last_run_message = ?, run_count = run_count + 1 WHERE job_name = 'bgdm_alerts'", 
        [`Sent ${mailsSent} consolidated alerts`]);
        console.log(`✅ CRON Alerts: Sent ${mailsSent} mails.`);
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

        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        const reportMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        // SQL: Fetch August data if today is September
        const [logRows] = await db.query(`
            SELECT loa_id, loa_name, action_mode, single_wbs, created_at 
            FROM project_activity_logs 
            WHERE created_at >= date_trunc('month', current_date - interval '1 month')
              AND created_at < date_trunc('month', current_date)
            ORDER BY created_at ASC
        `);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Audit Log');
        sheet.columns = [
            { header: 'LOA ID', key: 'loa_id', width: 15 },
            { header: 'Project Name', key: 'loa_name', width: 40 },
            { header: 'Action', key: 'mode', width: 20 },
            { header: 'WBS Elements', key: 'wbs', width: 80 }
        ];

        logRows.forEach(log => {
            sheet.addRow({ loa_id: log.loa_id, loa_name: log.loa_name, mode: log.action_mode, wbs: log.single_wbs });
        });
        sheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();
        const [admins] = await db.query("SELECT email FROM users WHERE type IN ('admin', 'super_admin') AND is_active = '1'");
        const adminEmails = admins.map(a => a.email);

        if (adminEmails.length > 0) {
            await mailService.sendMonthlyProjectAuditMail(adminEmails, buffer, reportMonth);
            await db.query("UPDATE cron_config SET last_run_status = 'success', last_run_message = 'Audit report delivered', run_count = run_count + 1 WHERE job_name = 'monthly_project_audit'");
            console.log(`✅ Audit mail sent for ${reportMonth}`);
        }
    } catch (error) {
        console.error('❌ Audit Error:', error.message);
        await db.query("UPDATE cron_config SET last_run_status = 'error', last_run_message = ? WHERE job_name = 'monthly_project_audit'", [error.message.substring(0, 250)]);
    }
};


// 1. Naya FTC REminder date checker Function define karein
const runDailyReminderCheck = async () => {
    console.log("🚀 CRON: Checking PTD Reminders...");
    try {
        const [due] = await db.query(
            `SELECT * FROM pending_ptd_reminders WHERE status = 'pending' AND scheduled_at <= NOW()`
        );

        if (due.length === 0) return console.log("ℹ️ No pending reminders due.");

        // 1. 🔥 Fetch saare active users
        const [userRows] = await db.query("SELECT email FROM users WHERE is_active = '1'");
        
        // 2. 🔥 FILTER LOGIC: Sirf wahi users jinme '.ext' nahi hai
        const internalUsers = userRows
            .map(u => u.email)
            .filter(email => {
                // Email ko lowercase karke check karo ki '.ext@' hai ya nahi
                return email && !email.toLowerCase().includes(".ext@");
            });

        if (internalUsers.length === 0) {
            console.log("⚠️ No internal (non-ext) users found to send reminder.");
            return;
        }

        for (const rem of due) {
            // 3. Trigger filtered reminder
            await mailService.sendPTDReminderAlert(internalUsers, rem.period_code);
            
            await db.query(`UPDATE pending_ptd_reminders SET status = 'sent' WHERE id = ?`, [rem.id]);
            console.log(`✅ Reminder sent to ${internalUsers.length} internal users for ${rem.period_code}`);
        }

    } catch (error) {
        console.error("❌ Reminder Job Error:", error.message);
    }
};


const runPendingLoaAudit = async () => {
    console.log("🚀 CRON: Starting Monthly Pending LOA Audit...");
    try {
        await db.query("UPDATE cron_config SET last_run_at = NOW(), last_run_status = 'running' WHERE job_name = 'pending_loa_audit'");

        const now = new Date();
        const monthYear = now.toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        
        // 🔥 Internal Call: No req/res needed
        const pendingData = await dataController.getPendingLoas();

        if (pendingData.length === 0) {
            return await db.query("UPDATE cron_config SET last_run_status = 'success', last_run_message = 'No pending LOAs today' WHERE job_name = 'pending_loa_audit'");
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Pending Projects');
        sheet.columns = [
            { header: 'BU', key: 'bu', width: 10 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'LOA ID', key: 'loa_id', width: 15 },
            { header: 'Project Name', key: 'loa_name', width: 40 }
        ];
        pendingData.forEach(row => sheet.addRow(row));
        sheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();
        
        const [admins] = await db.query("SELECT email FROM users WHERE type IN ('admin', 'super_admin') AND is_active = '1'");
        const adminEmails = admins.map(a => a.email);

        await mailService.sendPendingLoaAuditMail(adminEmails, buffer, monthYear);
        
        await db.query("UPDATE cron_config SET last_run_status = 'success', last_run_message = 'Mail sent successfully', run_count = run_count + 1 WHERE job_name = 'pending_loa_audit'");
        console.log("✅ CRON: Pending Audit mail delivered.");
    } catch (err) {
        console.error("❌ CRON Error:", err.message);
        await db.query("UPDATE cron_config SET last_run_status = 'error', last_run_message = ? WHERE job_name = 'pending_loa_audit'", [err.message.substring(0, 200)]);
    }
};


// ==========================================
// ⏰ INITIALIZATION (With Primary Check)
// ==========================================
exports.initCron = async () => {
    // 🛑 STOP: Agar ye primary instance nahi hai, toh scheduler mat chalao
    if (!isPrimaryInstance()) {
        console.log(`⏭️  Instance ${process.env.NODE_APP_INSTANCE}: Skipping Cron initialization.`);
        return;
    }

    try {
        console.log("♻️  Initializing Primary Scheduler...");

        // 1. Stop all existing to prevent "Zombie" jobs
        if (syncJob) syncJob.stop();
        if (backupJob) backupJob.stop();
        if (bgdmAlertJob) bgdmAlertJob.stop();
        if (projectAuditJob) projectAuditJob.stop();
        if (ptdReminderJob) ptdReminderJob.stop();
        if (pendingLoaJob) pendingLoaJob.stop();

        // 2. Fetch fresh config
        const [configs] = await db.query("SELECT * FROM cron_config");

        configs.forEach(conf => {
            if (!conf.is_enabled) return;

            console.log(`⏰ Setting up [${conf.job_name}]: ${conf.cron_expression}`);

            if (conf.job_name === 'full_sync') {
                syncJob = cron.schedule(conf.cron_expression, () => runSync('scheduled'));
            } 
            else if (conf.job_name === 'db_backup') {
                backupJob = cron.schedule(conf.cron_expression, () => runDatabaseBackup());
            } 
            else if (conf.job_name === 'bgdm_alerts') {
                bgdmAlertJob = cron.schedule(conf.cron_expression, () => runMonthlyAlerts());
            } 
            else if (conf.job_name === 'monthly_project_audit') {
                projectAuditJob = cron.schedule(conf.cron_expression, () => runMonthlyProjectAudit());
            } 
            else if (conf.job_name === 'ptd_reminder_check') {
                ptdReminderJob = cron.schedule(conf.cron_expression, () => runDailyReminderCheck());
            } 
            else if (conf.job_name === 'pending_loa_audit') {
                pendingLoaJob = cron.schedule(conf.cron_expression, () => runPendingLoaAudit());
            }
        });
    } catch (err) {
        console.error("❌ Cron Init Error:", err.message);
    }
};

// ==========================================
// 🎛️ API ENDPOINTS
// ==========================================
exports.getCronConfig = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM cron_config ORDER BY id ASC");
        res.json(rows); // 🔥 Return poori list
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSyncStatus = (req, res) => {
    res.json({ isRunning: isSyncing, cronActive: currentCronJob !== null });
};

exports.updateCronConfig = async (req, res) => {
    try {
        const { job_name, cron_expression, is_enabled } = req.body;
        if (!job_name) return res.status(400).json({ error: "Job name is required" });

        const updates = [];
        const params = [];

        if (cron_expression !== undefined) {
            if (cron_expression !== 'custom' && !cron.validate(cron_expression)) {
                return res.status(400).json({ error: 'Invalid format' });
            }
            updates.push(`cron_expression = ?`);
            params.push(cron_expression);
        }
        if (is_enabled !== undefined) {
            updates.push(`is_enabled = ?`);
            params.push(is_enabled);
        }

        if (updates.length > 0) {
            params.push(job_name); 
            await db.query(`UPDATE cron_config SET ${updates.join(', ')}, updated_at = NOW() WHERE job_name = ?`, params);
            await exports.initCron(); // 🔥 Jobs ko reload karo naye time ke saath
        }

        const [rows] = await db.query("SELECT * FROM cron_config WHERE job_name = ?", [job_name]);
        res.json({ message: `${job_name} updated!`, config: rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.triggerManualSync = async (req, res) => {
    const { job_name } = req.body;
    try {
        if (job_name === 'full_sync') runSync('manual_admin');
        else if (job_name === 'db_backup') runDatabaseBackup();
        else if (job_name === 'bgdm_alerts') runMonthlyAlerts();
        else if (job_name === 'monthly_project_audit') runMonthlyProjectAudit();
        
        res.json({ message: `Job [${job_name}] triggered in background.` });
    } catch (err) { res.status(500).json({ message: "Failed to trigger" }); }
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