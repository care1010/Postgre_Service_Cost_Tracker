const db = require('../config/db');
const cron = require('node-cron');
const dataController = require('./dataController');

// Active cron job reference — restart karne ke liye
let activeCronJob = null;
let isSyncRunning = false; // Prevent concurrent syncs

// ═══════════════════════════════════════════════════════
// CORE SYNC FUNCTION
// Yeh wahi logic hai jo fullRefresh mein tha
// Sab triggers yahan aate hain
// ═══════════════════════════════════════════════════════
const runFullSync = async (triggeredBy = 'cron') => {
    if (isSyncRunning) {
        console.log(`⏭️ Sync already running, skipping trigger: ${triggeredBy}`);
        return { success: false, message: 'Sync already in progress' };
    }

    isSyncRunning = true;
    const startTime = Date.now();
    console.log(`🚀 Auto-Sync started | Trigger: ${triggeredBy} | Time: ${new Date().toISOString()}`);

    try {
        // --- Reuse fullRefresh logic via mock req/res ---
        await new Promise((resolve, reject) => {
            const mockReq = {};
            const mockRes = {
                status: () => mockRes,
                json: (data) => {
                    if (data?.error) reject(new Error(data.error));
                    else resolve(data);
                }
            };
            dataController.fullRefresh(mockReq, mockRes).catch(reject);
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const message = `Sync completed in ${duration}s | Trigger: ${triggeredBy}`;
        console.log(`✅ ${message}`);

        // Update cron_config log
        await db.query(`
            UPDATE cron_config 
            SET last_run_at = NOW(), last_run_status = 'success', 
                last_run_message = ?, run_count = run_count + 1, updated_at = NOW()
            WHERE job_name = 'full_sync'
        `, [message]);

        return { success: true, message, duration };

    } catch (error) {
        const message = `Sync failed: ${error.message} | Trigger: ${triggeredBy}`;
        console.error(`❌ ${message}`);

        await db.query(`
            UPDATE cron_config 
            SET last_run_at = NOW(), last_run_status = 'error',
                last_run_message = ?, run_count = run_count + 1, updated_at = NOW()
            WHERE job_name = 'full_sync'
        `, [message]).catch(console.error);

        return { success: false, message };

    } finally {
        isSyncRunning = false;
    }
};

// ═══════════════════════════════════════════════════════
// START/RESTART CRON — DB se schedule load karke start karo
// ═══════════════════════════════════════════════════════
const startCronFromDB = async () => {
    try {
        const [rows] = await db.query(
            `SELECT cron_expression, is_enabled FROM cron_config WHERE job_name = 'full_sync'`
        );

        if (!rows || rows.length === 0) {
            console.log('⚠️ No cron config found in DB, using default: 0 8,14,20 * * *');
            scheduleCron('0 8,14,20 * * *');
            return;
        }

        const { cron_expression, is_enabled } = rows[0];

        if (!is_enabled) {
            console.log('⏸️ Cron job is DISABLED in DB');
            if (activeCronJob) { activeCronJob.stop(); activeCronJob = null; }
            return;
        }

        scheduleCron(cron_expression);
    } catch (err) {
        console.error('❌ Failed to load cron config from DB:', err.message);
        // Fallback to default
        scheduleCron('0 8,14,20 * * *');
    }
};

const scheduleCron = (expression) => {
    // Stop existing job
    if (activeCronJob) {
        activeCronJob.stop();
        activeCronJob = null;
        console.log('🔄 Previous cron job stopped');
    }

    if (!cron.validate(expression)) {
        console.error(`❌ Invalid cron expression: ${expression}`);
        return;
    }

    activeCronJob = cron.schedule(expression, async () => {
        console.log(`⏰ Cron triggered at ${new Date().toISOString()}`);
        await runFullSync('scheduled_cron');
    }, {
        timezone: 'Asia/Kolkata' // IST timezone
    });

    console.log(`✅ Cron job scheduled: "${expression}" (IST)`);
};

// ═══════════════════════════════════════════════════════
// API: Get cron config
// ═══════════════════════════════════════════════════════
exports.getCronConfig = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM cron_config WHERE job_name = 'full_sync'`);
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ═══════════════════════════════════════════════════════
// API: Update cron schedule (Admin panel se)
// ═══════════════════════════════════════════════════════
exports.updateCronConfig = async (req, res) => {
    try {
        const { cron_expression, is_enabled } = req.body;

        if (cron_expression && !cron.validate(cron_expression)) {
            return res.status(400).json({ error: `Invalid cron expression: "${cron_expression}"` });
        }

        await db.query(`
            UPDATE cron_config 
            SET cron_expression = COALESCE(?, cron_expression),
                is_enabled = COALESCE(?, is_enabled),
                updated_at = NOW()
            WHERE job_name = 'full_sync'
        `, [cron_expression || null, is_enabled !== undefined ? is_enabled : null]);

        // Restart cron with new config
        await startCronFromDB();

        const [updated] = await db.query(`SELECT * FROM cron_config WHERE job_name = 'full_sync'`);
        res.json({ message: 'Cron config updated & restarted!', config: updated[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ═══════════════════════════════════════════════════════
// API: Manual trigger from Admin Panel
// ═══════════════════════════════════════════════════════
exports.triggerManualSync = async (req, res) => {
    const triggeredBy = req.body?.triggeredBy || req.query?.triggeredBy || 'manual_admin';

    if (isSyncRunning) {
        return res.status(409).json({ 
            success: false, 
            message: 'Sync is already running. Please wait for it to complete.' 
        });
    }

    // Non-blocking: response bhejo, background mein sync chalo
    res.json({ success: true, message: `Sync started (trigger: ${triggeredBy}). Check logs for status.` });
    
    // Background mein run karo
    runFullSync(triggeredBy).catch(console.error);
};

// ═══════════════════════════════════════════════════════
// API: Check sync status
// ═══════════════════════════════════════════════════════
exports.getSyncStatus = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM cron_config WHERE job_name = 'full_sync'`);
        res.json({
            isRunning: isSyncRunning,
            cronActive: !!activeCronJob,
            config: rows[0] || {}
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ═══════════════════════════════════════════════════════
// AUTO-TRIGGER HELPER — other controllers import karenge
// Trigger: Add Project, Add WBS, Add ASBL, Add PTD, Add NC
// ═══════════════════════════════════════════════════════
exports.triggerAutoSync = async (reason) => {
    console.log(`🔔 Auto-sync triggered: ${reason}`);
    // Small delay — DB write settle hone de pehle
    setTimeout(() => {
        runFullSync(`auto_${reason}`).catch(console.error);
    }, 2000);
};

// ═══════════════════════════════════════════════════════
// INIT — server start pe call karo
// ═══════════════════════════════════════════════════════
exports.initCron = startCronFromDB;
exports.runFullSync = runFullSync;