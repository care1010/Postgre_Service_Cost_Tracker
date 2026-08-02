const db = require('../config/db');
const cron = require('node-cron');
const dataController = require('./dataController');

let currentCronJob = null;
let isSyncing = false;
let autoSyncTimeout = null;

// The actual Sync Runner
const runSync = async (triggeredBy = 'cron') => {
    if (isSyncing) {
        console.log(`⏳ Sync already in progress. Skipping trigger from: ${triggeredBy}`);
        return;
    }

    isSyncing = true;
    console.log(`🟢 CRON/TRIGGER: Starting sync (Triggered by: ${triggeredBy})`);

    try {
        await db.query("UPDATE cron_config SET last_run_at = NOW(), last_run_status = 'running', last_run_message = 'Sync in progress' WHERE job_name = 'full_sync'");
        
        // 🔥 Calling the actual DB Sync engine!
        await dataController.runFullSyncCore();

        await db.query("UPDATE cron_config SET last_run_status = 'success', last_run_message = 'Sync completed successfully', run_count = run_count + 1 WHERE job_name = 'full_sync'");
        console.log('✅ CRON/TRIGGER: Sync completed successfully!');
    } catch (error) {
        console.error('❌ CRON/TRIGGER Error:', error.message);
        // 🔥 FIXED: Used '?' here
        await db.query("UPDATE cron_config SET last_run_status = 'error', last_run_message = ? WHERE job_name = 'full_sync'", [error.message.substring(0, 250)]);
    } finally {
        isSyncing = false;
    }
};

exports.initCron = async () => {
    try {
        if (currentCronJob) {
            currentCronJob.stop();
            currentCronJob = null;
        }

        const [rows] = await db.query("SELECT * FROM cron_config WHERE job_name = 'full_sync'");
        if (rows.length === 0) return;

        const config = rows[0];
        if (config.is_enabled) {
            currentCronJob = cron.schedule(config.cron_expression, () => {
                runSync('scheduled_cron');
            });
            console.log(`⏰ Cron Job initialized: ${config.cron_expression}`);
        } else {
            console.log('⏰ Cron Job is currently disabled in DB.');
        }
    } catch (err) {
        console.error("Cron Init Error:", err);
    }
};

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
            // Validate basic cron format
            if (cron_expression !== 'custom' && !cron.validate(cron_expression)) {
                return res.status(400).json({ error: 'Invalid cron expression format' });
            }
            // 🔥 FIXED: Use '?' instead of $ syntax
            updates.push(`cron_expression = ?`);
            params.push(cron_expression);
        }
        if (is_enabled !== undefined) {
            // 🔥 FIXED: Use '?' instead of $ syntax
            updates.push(`is_enabled = ?`);
            params.push(is_enabled);
        }

        if (updates.length > 0) {
            params.push('full_sync'); // For WHERE job_name = ?
            
            // 🔥 FIXED: Use '?' for the WHERE clause
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
    
    // Background execution
    runSync(req.body.triggeredBy || 'manual_trigger');
    res.json({ message: "Sync started in background." });
};

// Delay to prevent 10 parallel syncs if user uploads 10 files rapidly
exports.triggerAutoSync = (source) => {
    if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
    console.log(`⏳ Auto-Sync queued by [${source}]. Waiting 2 seconds...`);
    
    autoSyncTimeout = setTimeout(() => {
        runSync(`auto_trigger_${source}`);
    }, 2000); 
};