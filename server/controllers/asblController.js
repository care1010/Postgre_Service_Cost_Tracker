const db = require('../config/db'); 
const { triggerAutoSync } = require('./cronController');

// --- Helper: RLS logic (Postgres Style) ---
const applyRLSLocal = (userType, allowedCustomers, conditions, params) => {
    if (userType === 'super_admin') return;
   
    if (allowedCustomers && typeof allowedCustomers === 'string') {
        const customersArray = allowedCustomers.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
        if (customersArray.length > 0) {
            conditions.push(`TRIM(LOWER(customer)) IN (?)`);
            params.push(customersArray);
        } else {
            conditions.push("1=0");
        }
    } else {
        conditions.push("1=0");
    }
};

// 🔥 1. getFilteredProjects (SQL Sequence Fixed)
exports.getFilteredProjects = async (req, res) => {
    try {
        const { wbs_type, type, allowedCustomers } = req.query;
        let conditions = ["1=1"];
        let params = [];

        // 1. RLS Apply karo
        applyRLSLocal(type, allowedCustomers, conditions, params);

        // 2. WBS Type Filter Apply karo (SQL banne se PEHLE!)
        if (wbs_type && wbs_type !== 'All') {
            conditions.push(`wbs_type = ?`);
            params.push(wbs_type);
        }

        // 3. 🔥 FIX: SQL string saari conditions push hone ke BAAD banegi
        const sql = `
            SELECT DISTINCT loa_id, loa_name
            FROM final_dashboard_table
            WHERE ${conditions.join(" AND ")}
            ORDER BY loa_name ASC
        `;

        const [rows] = await db.query(sql, params);
        res.json(Array.isArray(rows) ? rows : []);
    } catch (err) { 
        console.error("getFilteredProjects Error:", err);
        res.status(500).json({ error: err.message }); 
    }
};

// 🔥 2. getProjectDetails
exports.getProjectDetails = async (req, res) => {
    try {
        const { loa_id, wbs_type, type, allowedCustomers } = req.query;
        if (!loa_id || !wbs_type) return res.json([]);

        let asblCol = 'asbl_project';
        if (wbs_type.toLowerCase().includes('amc')) asblCol = 'asbl_amc';
        if (wbs_type.toLowerCase().includes('warranty')) asblCol = 'asbl_warranty';

        let conditions = ["TRIM(LOWER(s.loa_id)) = TRIM(LOWER(?))"];
        let params = [loa_id];
        applyRLSLocal(type, allowedCustomers, conditions, params);

        const sql = `
            SELECT
                MAX(s.loa_id) as loa_id,
                s.categories,
                MAX(s.${asblCol}) as asbl
            FROM summary s
            INNER JOIN master_cost_element mce
                ON TRIM(LOWER(s.categories)) = TRIM(LOWER(mce.cost_mapping))
            WHERE ${conditions.join(' AND ')}
            GROUP BY s.categories
            ORDER BY s.categories ASC`;

        const [rows] = await db.query(sql, params);
        res.status(200).json(Array.isArray(rows) ? rows : []);
    } catch (error) { 
        console.error("getProjectDetails Error:", error);
        res.status(500).json({ error: error.message }); 
    }
};

// 🔥 3. Manual UI Edit Update (Fixed Parameter Count: 5 = 5)
exports.updateManualAsbl = async (req, res) => {
    const { loa_id, wbs_type, updates } = req.body;
    const connection = await db.getConnection(); 
    try {
        await connection.beginTransaction(); 

        let asblCol = 'asbl_project';
        if (wbs_type.toLowerCase().includes('amc')) asblCol = 'asbl_amc';
        if (wbs_type.toLowerCase().includes('warranty')) asblCol = 'asbl_warranty';

        for (const item of updates) {
            const val = parseFloat(item.asbl) || 0;
           
            // 1. Update Summary (3 Placeholders = 3 Params)
            await connection.query(
                `UPDATE summary SET ${asblCol} = ? WHERE loa_id = ? AND categories = ?`,
                [val, loa_id, item.categories]
            );

            // 2. Update Dashboard Table (🔥 FIX: `val` is passed TWICE because query updates 2 columns!)
            await connection.query(
                `UPDATE final_dashboard_table SET asbl = ?, ${asblCol} = ?
                 WHERE loa_id = ? AND categories = ? AND wbs_type = ?`,
                [val, val, loa_id, item.categories, wbs_type] // <-- Total 5 Params!
            );
        }

        // 3. Recalculate Variance (2 Placeholders = 2 Params)
        await connection.query(`
            UPDATE final_dashboard_table
            SET eac_vs_asbl = (asbl - (ptd + open_commitment_KEUR + non_committed_editable))
            WHERE loa_id = ? AND wbs_type = ?`, [loa_id, wbs_type]
        );

        await connection.commit();

        triggerAutoSync('asbl_updated');
        
        res.status(200).json({ message: "ASBL Updated Successfully!" });
    } catch (error) {
        await connection.rollback();
        console.error("updateManualAsbl Error:", error);
        res.status(500).json({ error: error.message });
    } finally { 
        connection.release(); 
    }
};

// 🔥 4. processAsblUpdate (Excel Paste)
exports.processAsblUpdate = async (req, res) => {
    try {
        const { rawText, wbs_type } = req.body;
        const lines = rawText.trim().split(/\r?\n/);
        const headers = lines[0].split('\t').map(h => h.trim());
       
        const catIdx = headers.indexOf('Cost Element Mapping');
        const asblIdx = headers.indexOf('ASBL');
        const loaIdIdx = headers.indexOf('LOA ID');

        let asblCol = 'asbl_project';
        if (wbs_type.toLowerCase().includes('amc')) asblCol = 'asbl_amc';
        if (wbs_type.toLowerCase().includes('warranty')) asblCol = 'asbl_warranty';

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            const lId = cols[loaIdIdx]?.trim();
            const category = cols[catIdx]?.trim();
            const val = parseFloat(cols[asblIdx]?.replace(/[^0-9.-]/g, '')) || 0;

            if (lId && category) {
                await db.query(`UPDATE summary SET ${asblCol} = ? WHERE loa_id = ? AND TRIM(LOWER(categories)) = TRIM(LOWER(?))`, [val, lId, category]);
                await db.query(`UPDATE final_dashboard_table SET ${asblCol} = ?, asbl = ? WHERE loa_id = ? AND TRIM(LOWER(categories)) = TRIM(LOWER(?)) AND wbs_type = ?`, [val, val, lId, category, wbs_type]);
            }
        }
        res.status(200).json({ message: "ASBL Excel Sync Done!" });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// 🔥 5. getProjectWbsOptions
exports.getProjectWbsOptions = async (req, res) => {
    try {
        const { loa_name } = req.query;
        const sql = `
            SELECT DISTINCT wbs_type, single_wbs as wbs_element
            FROM wbs_loa_id_mapping1
            WHERE TRIM(LOWER(loa_name)) = TRIM(LOWER(?))`;
       
        const [rows] = await db.query(sql, [loa_name]);
        res.json(Array.isArray(rows) ? rows : []);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};