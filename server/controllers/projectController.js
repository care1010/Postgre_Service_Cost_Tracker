const db = require('../config/db');
const XLSX = require('xlsx');
const fs = require('fs');
const { triggerAutoSync } = require('./cronController');

const EXCLUDED_WBS_TYPES_FOR_CJ74 = ['Warranty', 'Warranty/Other'];

// 🔥 INTERNAL HELPER: Copy of applyRLS (PostgreSQL Compatible)
const applyRLS = (type, allowedCustomers, conditions, params) => {
    if (type === 'super_admin') return;

    if (allowedCustomers && typeof allowedCustomers === 'string') {
        const customersArray = allowedCustomers.split('|||').map(c => c.trim().toLowerCase()).filter(Boolean);
        if (customersArray.length > 0) {
            // 🔥 FIXED: Table 'customer' mein column 'customer_name' h
            conditions.push(`TRIM(LOWER(customer_name)) IN (?)`); 
            params.push(customersArray);
            return;
        }
    }
    conditions.push(`1=0`);
};

/**
 * 🔥 INTERNAL BACKGROUND SYNC ENGINE
 * Yeh function background mein chalta rahega, user ko wait nahi karna padega.
 */
const runBackgroundSync = async (processedLoas, projectGroups, created_by) => {
    console.log("🕒 [BACKGROUND]: Processing started for LOAs:", processedLoas);
    const connection = await db.getConnection();
    try {
        // 1. Get Cost Elements for seeding
        const [ceRows] = await connection.query("SELECT cost_element FROM master_cost_element");
        const costElements = ceRows.map(r => r.cost_element);

        if (costElements.length === 0) {
            console.error("❌ [BACKGROUND]: No cost elements found in master_cost_element table!");
            return;
        }

        for (const loaId of processedLoas) {
            const project = projectGroups[loaId];
            
            // 🔥 FIX: Sirf unhi WBS ko seed karein jo is batch mein naye aaye hain
            // Agar hum saare wbs_rows bhejenge toh purane WBS ki wajah se duplicate error aa sakti h
            if (project.wbs_rows && project.wbs_rows.length > 0) {
                console.log(`🕒 [BACKGROUND]: Seeding CJ74 for LOA ${loaId} (${project.wbs_rows.length} WBS)`);
                await insertCj74DummyData(connection, project.wbs_rows, costElements);
            }
        }

        // 2. Heavy Task: Dashboard Physical Table Sync
        console.log("🕒 [BACKGROUND]: Refreshing final_dashboard_table...");
        const uniqueLoaList = [...new Set(processedLoas)];
        await connection.query("DELETE FROM final_dashboard_table WHERE loa_id IN (?)", [uniqueLoaList]);
        
        await connection.query(`
            INSERT INTO final_dashboard_table 
            (id, bu, customer, loa_id, loa_name, cost_revenue, categories, merged_wbs, active_inactive, 
             asbl, asbl_amc, asbl_project, asbl_warranty, asbl_loa, 
             non_committed, non_committed_amc, non_committed_project, non_committed_warranty, 
             non_committed_editable, non_committed_editable_amc, non_committed_editable_project, non_committed_editable_warranty, 
             period, ptd, wbs_element_single, wbs_type, wbs_description, 
             "open_commitment_KEUR", eac, eac_vs_asbl, "Merged_wbs_categories", updated_by, updated_at)
            SELECT 
                id, bu, customer, loa_id, loa_name, cost_revenue, categories, merged_wbs, active_inactive, 
                asbl, asbl_amc, asbl_project, asbl_warranty, asbl_loa, 
                non_committed, non_committed_amc, non_committed_project, non_committed_warranty, 
                non_committed_editable, non_committed_editable_amc, non_committed_editable_project, non_committed_editable_warranty, 
                period, ptd, wbs_element_single, wbs_type, wbs_description, 
                open_commitment_keur, eac, eac_vs_asbl, "Merged_wbs_categories", updated_by, updated_at 
            FROM final_dashboard WHERE loa_id IN (?)
        `, [uniqueLoaList]);

        console.log("✅ [BACKGROUND]: All tasks completed successfully!");
    } catch (err) {
        console.error("❌ [BACKGROUND ERROR]:", err.message);
    } finally {
        connection.release();
    }
};

/**
 * Helper: Sync WBS mappings
 */
const syncProjectWbs = async (connection, loa_id, loa_name) => {
    // 1. Get ALL unique single_wbs for this project
    const [rows] = await connection.query(
        'SELECT DISTINCT TRIM(single_wbs) as wbs FROM wbs_loa_id_mapping1 WHERE loa_id = ? AND loa_name = ?',
        [loa_id, loa_name]
    );
    
    const uniqueWbsList = rows.map(r => r.wbs).filter(Boolean);
    if (uniqueWbsList.length === 0) return "";
    
    const mergedWbsStr = uniqueWbsList.sort().join(',');

    // 2. Update Mapping Table
    await connection.query(
        'UPDATE wbs_loa_id_mapping1 SET merged_wbs = ? WHERE loa_id = ? AND loa_name = ?',
        [mergedWbsStr, loa_id, loa_name]
    );

    // 3. Update Summary Table
    // 🔥 FIXED: Added ::text casting for Postgres to determine data type correctly
    await connection.query(`
        UPDATE summary 
        SET merged_wbs = ?::text,
            "Merged_wbs_category" = CONCAT(?::text, '-', categories)
        WHERE loa_id = ? AND loa_name = ?
    `, [mergedWbsStr, mergedWbsStr, loa_id, loa_name]);

    return mergedWbsStr;
};

/**
 * Helper: Seeding dummy data in CJ74
 */
const insertCj74DummyData = async (connection, newWbsList, costElements) => {
    if (newWbsList.length === 0 || costElements.length === 0) return;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1).toString();
    let cj74BatchRows = [];

    for (const wbsObj of newWbsList) {
        const type = (wbsObj.wbs_type || "").trim();
        const wbsId = (wbsObj.wbs_element || "").trim();

        if (!wbsId) continue;

        // Skip Warranty types
        if (!EXCLUDED_WBS_TYPES_FOR_CJ74.some(ex => ex.toLowerCase() === type.toLowerCase())) {
            for (const ce of costElements) {
                cj74BatchRows.push([
                    currentYear, 
                    currentMonth, 
                    ce, 
                    wbsId, 
                    wbsId, 
                    0 // val_in_rc
                ]);
            }
        }
    }

    if (cj74BatchRows.length > 0) {
        try {
            // 🔥 Using VALUES ? which your db.js converts to Postgres bulk format
            await connection.query(
                "INSERT INTO cj74_new (year, per, cost_element, object_1, object_2, val_in_rc) VALUES ?", 
                [cj74BatchRows]
            );
            console.log(`✅ [CJ74_NEW]: Seeded ${cj74BatchRows.length} rows.`);
        } catch (dbErr) {
            console.error("❌ [CJ74_NEW SEED ERROR]:", dbErr.message);
        }
    }
};

/**
 * 🔥 CORE PROCESSING ENGINE
 */
/**
 * 🔥 CORE PROCESSING ENGINE (Fixed Scope & Error handling)
 */
const processProjectData = async (dataGrid, created_by, mode) => {
    if (!dataGrid || dataGrid.length < 2) throw new Error("No data found!");

    const headers = dataGrid[0].map(h => String(h || "").trim().toUpperCase());
    const idxBu = headers.findIndex(h => h.includes('BUSINESS DIVISION') || h === 'BU');
    const idxCustomer = headers.findIndex(h => h.includes('CT NAME') || h === 'CUSTOMER');
    const idxLoaId = headers.findIndex(h => h.includes('OPPORTUNITY CODE') || h === 'LOA_ID');
    const idxLoaName = headers.findIndex(h => h.includes('PROJECT DESCRIPTION') || h === 'LOA_NAME');
    const idxWbsType = headers.findIndex(h => h.includes('WBS TYPE'));
    const idxWbsElement = headers.findIndex(h => h === 'WBS');
    const idxWbsDesc = headers.findIndex(h => h.includes('WBS DESCRIPTION'));

    const projectGroups = {};
    let lBu = "", lCust = "", lLid = "", lLname = "";

    // 1. Grouping and Internal Duplicate Check for user input
    dataGrid.slice(1).forEach(cols => {
        if (cols.every(c => !c || String(c).trim() === '')) return;
        const rLid = cols[idxLoaId]?.toString().trim();
        if (rLid) { lLid = rLid; lBu = cols[idxBu] || lBu; lCust = cols[idxCustomer] || lCust; lLname = cols[idxLoaName] || lLname; }
        if (!lLid) return;
        
        if (!projectGroups[lLid]) projectGroups[lLid] = { bu: lBu, customer: lCust, loa_id: lLid, loa_name: lLname, wbs_rows: [] };
        
        if (cols[idxWbsElement]) {
            const wbsVal = cols[idxWbsElement].toString().trim();
            const isBatchDuplicate = projectGroups[lLid].wbs_rows.some(r => r.wbs_element === wbsVal);
            if (!isBatchDuplicate) {
                projectGroups[lLid].wbs_rows.push({
                    wbs_type: cols[idxWbsType]?.toString().trim() || "Project",
                    wbs_element: wbsVal,
                    wbs_description: cols[idxWbsDesc]?.toString().trim() || ""
                });
            }
        }
    });

    const connection = await db.getConnection();
    
    // 🔥 FIX: Defined variables properly so it won't crash
    let processedCount = 0; 
    let warnings = []; 
    let processedLoas = [];
    let backgroundGroups = {}; 

    try {

        // 🔥 FIX: monthYear define kiya CURRENT_TIMESTAMP ke basis pe (mmm-yyyy format)
        const now = new Date();
        const monthYear = now.toLocaleString('en-US', { month: 'short' }) + '-' + now.getFullYear();
        await connection.beginTransaction();
        const [catRows] = await connection.query("SELECT category_name as cat, cost_revenue_type as type FROM master_categories");
        
        for (const loaId of Object.keys(projectGroups)) {
            const project = projectGroups[loaId];
            const [exSummary] = await connection.query('SELECT id FROM summary WHERE loa_id = ? LIMIT 1', [loaId]);

            if (mode === 'new') {
                if (exSummary.length > 0) {
                    throw new Error(`Project [${loaId}] already exists. Please use the 'Add WBS' tab to update it.`);
                }
                const mergedWbs = project.wbs_rows.map(r => r.wbs_element).join(',');
                const sRows = catRows.map(c => [project.bu, project.customer, project.loa_id, project.loa_name, c.type, c.cat, mergedWbs, `${mergedWbs}-${c.cat}`, 'Active']);
                
                await connection.query('INSERT INTO summary (bu, customer, loa_id, loa_name, cost_revenue, categories, merged_wbs, "Merged_wbs_category", active_inactive) VALUES ?', [sRows]);
                
                const mRows = project.wbs_rows.map(r => [project.bu, project.customer, project.loa_id, project.loa_name, r.wbs_type, r.wbs_element, r.wbs_description, mergedWbs, created_by]);
                await connection.query("INSERT INTO wbs_loa_id_mapping1 (bu, customer, loa_id, loa_name, wbs_type, single_wbs, wbs_description, merged_wbs, created_by) VALUES ? ", [mRows]);

                // 🔥 NAYA: Log entry (monthYear ab defined hai)
                await connection.query(
                    `INSERT INTO project_activity_logs (user_email, loa_id, loa_name, action_mode, wbs_count, month_year) VALUES (?, ?, ?, ?, ?, ?)`,
                    [created_by, loaId, project.loa_name, 'New Project', project.wbs_rows.length, monthYear]
                );
                
                processedLoas.push(loaId);
                backgroundGroups[loaId] = project;
                processedCount++;

            } else if (mode === 'existing') {
                const [exMap] = await connection.query("SELECT TRIM(single_wbs) as wbs FROM wbs_loa_id_mapping1 WHERE loa_id = ?", [loaId]);
                const dbWbsSet = new Set(exMap.map(e => e.wbs.toUpperCase()));
                
                const newWbsToMap = project.wbs_rows.filter(r => !dbWbsSet.has(r.wbs_element.toUpperCase()));
                const duplicateCount = project.wbs_rows.length - newWbsToMap.length;

                if (newWbsToMap.length === 0) {
                    warnings.push(`Project [${loaId}] was skipped because all provided WBS already exist.`);
                    continue;
                }

                if (duplicateCount > 0) {
                    warnings.push(`In Project [${loaId}]: ${newWbsToMap.length} new WBS added, ${duplicateCount} duplicates skipped.`);
                }

                const mRows = newWbsToMap.map(r => [project.bu, project.customer, project.loa_id, project.loa_name, r.wbs_type, r.wbs_element, r.wbs_description, "", created_by]);
                await connection.query("INSERT INTO wbs_loa_id_mapping1 (bu, customer, loa_id, loa_name, wbs_type, single_wbs, wbs_description, merged_wbs, created_by) VALUES ?", [mRows]);
                await syncProjectWbs(connection, loaId, project.loa_name);

                // 🔥 NAYA: Log entry (monthYear ab defined hai)
                    await connection.query(
                        `INSERT INTO project_activity_logs (user_email, loa_id, loa_name, action_mode, wbs_count, month_year) VALUES (?, ?, ?, ?, ?, ?)`,
                        [created_by, loaId, project.loa_name, 'Added WBS', newWbsToMap.length, monthYear]
                    );
                
                processedLoas.push(loaId);
                backgroundGroups[loaId] = { ...project, wbs_rows: newWbsToMap };
                processedCount++;
            }
        }
        
        await connection.commit();

        // Pass to background processor
        if (processedLoas.length > 0) {
            runBackgroundSync(processedLoas, backgroundGroups, created_by);
        }

        // Return standard feedback
        let finalMessage = processedCount > 0 
            ? "Data Submitted! Data will be refresh in 5 minutes." 
            : "No data was updated.";
        
        if (warnings.length > 0) {
            finalMessage += " \n\nDetails: " + warnings.join(' | ');
        }

        triggerAutoSync('new_project_or_wbs');

        return { message: finalMessage };

    } catch (err) {
        if (connection) await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

exports.processProjectPaste = async (req, res) => {
    try {
        const { rawText, mode, email } = req.body; // 🔥 'email' extract karein
        const dataGrid = rawText.trim().split(/\r?\n/).map(l => l.split('\t'));
        // req.user?.email fallback ke liye rakha hai, primary 'email' hoga
        const currentUser = email || req.user?.email || 'System'; 
        const result = await processProjectData(dataGrid, currentUser, mode);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.uploadProjectFile = async (req, res) => {
    try {
        const { mode, email } = req.body; // 🔥 Multer req.body mein fields de deta hai
        const wb = XLSX.readFile(req.file.path);
        const dataGrid = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
        const result = await processProjectData(dataGrid, req.user?.email || 'System', mode);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(200).json(result);
    } catch (error) { 
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message }); 
    }
};

exports.fixMissingSummaryRows = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const [catRows] = await connection.query("SELECT category_name as cat, cost_revenue_type as type FROM master_categories");
        const [projects] = await connection.query("SELECT DISTINCT loa_id, loa_name, bu, customer FROM wbs_loa_id_mapping1");
        for (const p of projects) {
            for (const catItem of catRows) {
                const [exists] = await connection.query("SELECT id FROM summary WHERE loa_id = ? AND categories = ? LIMIT 1", [p.loa_id, catItem.cat]);
                if (exists.length === 0) {
                    await connection.query("INSERT INTO summary (bu, customer, loa_id, loa_name, cost_revenue, categories, active_inactive) VALUES (?,?,?,?,?,?,?)", [p.bu, p.customer, p.loa_id, p.loa_name, catItem.type, catItem.cat, 'Active']);
                }
            }
            await syncProjectWbs(connection, p.loa_id, p.loa_name);
        }
        res.status(200).json({ message: "Sync Success!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
    finally { if (connection) connection.release(); }
};

exports.getAddProjectOptions = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        
        // 1. BU fetch
        const [buRows] = await db.query(`SELECT DISTINCT bu FROM wbs_loa_id_mapping1 WHERE bu IS NOT NULL ORDER BY 1`);

        // 2. Customer fetch with RLS
        let custConditions = ["customer_name IS NOT NULL"];
        let custParams = [];
        applyRLS(type, allowedCustomers, custConditions, custParams);
        const whereCust = custConditions.length > 0 ? `WHERE ${custConditions.join(' AND ')}` : '';
        const [custRows] = await db.query(`SELECT DISTINCT customer_name FROM public.customer ${whereCust} ORDER BY 1`, custParams);

        // 3. LOA ID & Name fetch with RLS (Mapping table se)
        // Note: Mapping table mein column 'customer' h
        let loaConditions = ["loa_id IS NOT NULL"];
        let loaParams = [];
        if (type !== 'super_admin' && allowedCustomers) {
            const customersArray = allowedCustomers.split('|||').map(c => c.trim().toLowerCase()).filter(Boolean);
            loaConditions.push(`TRIM(LOWER(customer)) IN (?)`);
            loaParams.push(customersArray);
        }
        const whereLoa = loaConditions.length > 0 ? `WHERE ${loaConditions.join(' AND ')}` : '';
        
        const [loaIdRows] = await db.query(`SELECT DISTINCT loa_id FROM wbs_loa_id_mapping1 ${whereLoa} ORDER BY 1`, loaParams);
        const [loaNameRows] = await db.query(`SELECT DISTINCT loa_name FROM wbs_loa_id_mapping1 ${whereLoa} ORDER BY 1`, loaParams);

        res.status(200).json({
            bus: buRows.map(r => r.bu),
            customers: custRows.map(r => r.customer_name),
            loaIds: loaIdRows.map(r => r.loa_id),
            loaNames: loaNameRows.map(r => r.loa_name)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ----------------------------------------------------------------------------
//          Keep this code commented to add new cost elements in CJ74 sheet
// ----------------------------------------------------------------------------
// exports.testPtdSeeding = async (req, res) => {
//     let connection;
//     try {
//         connection = await db.getConnection();
//         console.log("🛠️ Starting Multi-DB Smart Seeding (Fixed Data Types)...");
 
//         // Javascript se Year aur Month nikalna sabse safe h (Integer vs String error nahi aayega)
//         const currentYear = new Date().getFullYear();
//         const currentMonth = (new Date().getMonth() + 1).toString();
 
//         const sql = `
//             INSERT INTO cj74_new (year, per, object_1, object_2, cost_element, val_in_rc)
//             SELECT
//                 ${currentYear},
//                 '${currentMonth}',
//                 ideal.single_wbs,
//                 ideal.single_wbs,
//                 ideal.ce_code,
//                 0
//             FROM (
//                 SELECT DISTINCT
//                     c.object_1 AS single_wbs,
//                     ce_union.cost_element AS ce_code
//                 FROM cj74_new c
//                 CROSS JOIN (
//                     SELECT cost_element FROM master_cost_element
//                     UNION
//                     SELECT '11-Overall ASBL'
//                 ) AS ce_union
//                 WHERE c.object_1 IS NOT NULL
//             ) AS ideal
//             WHERE NOT EXISTS (
//                 SELECT 1 FROM cj74_new actual
//                 WHERE actual.object_1 = ideal.single_wbs
//                 AND actual.cost_element = ideal.ce_code
//             )
//         `;
 
//         const [result] = await connection.query(sql);
//         const insertedRows = result.affectedRows || result.rowCount || 0;
 
//         console.log(`✅ Success! Data Type issue resolved. Added ${insertedRows} rows.`);
 
//         res.status(200).json({
//             success: true,
//             message: "17-Category Sync Complete (Multi-DB Safe)!",
//             new_rows_inserted: insertedRows
//         });
 
//     } catch (error) {
//         console.error("❌ Seeding Error:", error);
//         res.status(500).json({ error: error.message });
//     } finally {
//         if (connection) connection.release();
//     }
// };