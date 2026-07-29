const db = require('../config/db');
const XLSX = require('xlsx');
const fs = require('fs');

const EXCLUDED_WBS_TYPES_FOR_CJ74 = ['Warranty', 'Warranty/Other'];

/**
 * Helper: Sync WBS mappings (Internal)
 */
const syncProjectWbs = async (connection, loa_id, loa_name) => {
    const [rows] = await connection.query(
        "SELECT DISTINCT single_wbs as wbs FROM wbs_loa_id_mapping1 WHERE loa_id = ? AND loa_name = ?",
        [loa_id, loa_name]
    );
    
    const uniqueWbsList = rows.map(r => r.wbs).filter(Boolean);
    if (uniqueWbsList.length === 0) return "";

    const mergedWbsStr = uniqueWbsList.join(',');

    await connection.query(
        "UPDATE wbs_loa_id_mapping1 SET merged_wbs = ? WHERE loa_id = ? AND loa_name = ?",
        [mergedWbsStr, loa_id, loa_name]
    );

    await connection.query(`
        UPDATE summary 
        SET merged_wbs = ?,
            Merged_wbs_category = CONCAT(?, '-', categories)
        WHERE loa_id = ? AND loa_name = ?
    `, [mergedWbsStr, mergedWbsStr, loa_id, loa_name]);

    return mergedWbsStr;
};

/**
 * Helper: Insert Dummy Rows (Internal)
 */
const insertCj74DummyData = async (connection, newWbsList, costElements) => {
    if (newWbsList.length === 0 || costElements.length === 0) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1).toString();
    let cj74BatchRows = [];

    for (const wbsObj of newWbsList) {
        const type = (wbsObj.wbs_type || "").trim();
        const isExcluded = EXCLUDED_WBS_TYPES_FOR_CJ74.some(ex => ex.toLowerCase() === type.toLowerCase());

        if (!isExcluded) {
            for (const ce of costElements) {
                cj74BatchRows.push([currentYear, currentMonth, ce, wbsObj.wbs_element, wbsObj.wbs_element, 0]);
            }
        }
    }

    if (cj74BatchRows.length > 0) {
        await connection.query(
            "INSERT INTO cj74_new (year, per, cost_element, object_1, object_2, val_in_rc) VALUES ?",
            [cj74BatchRows]
        );
        console.log(`📦 [CJ74_NEW]: Inserted ${cj74BatchRows.length} dummy rows.`);
    }
};

/**
 * Core Processing Engine (Internal)
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

    dataGrid.slice(1).forEach(cols => {
        if (cols.every(c => !c || String(c).trim() === '')) return;
        const rLid = cols[idxLoaId]?.toString().trim();
        if (rLid) { lLid = rLid; lBu = cols[idxBu] || lBu; lCust = cols[idxCustomer] || lCust; lLname = cols[idxLoaName] || lLname; }
        if (!lLid) return;

        if (!projectGroups[lLid]) projectGroups[lLid] = { bu: lBu, customer: lCust, loa_id: lLid, loa_name: lLname, wbs_rows: [] };
        if (cols[idxWbsElement]) {
            projectGroups[lLid].wbs_rows.push({
                wbs_type: cols[idxWbsType]?.toString().trim() || "",
                wbs_element: cols[idxWbsElement]?.toString().trim() || "",
                wbs_description: cols[idxWbsDesc]?.toString().trim() || ""
            });
        }
    });

    const connection = await db.getConnection();
    try {
        await connection.query("SET SESSION innodb_lock_wait_timeout = 300");
        await connection.beginTransaction();

        const [CATEGORY_MAP] = await connection.query("SELECT categories as cat, cost_revenue_type as type FROM master_categories");
        const [ceRows] = await connection.query("SELECT cost_element FROM master_cost_element");
        const costElements = ceRows.map(r => r.cost_element);

        let processedLoas = 0;

        for (const loaId of Object.keys(projectGroups)) {
            const project = projectGroups[loaId];
            const [exSummary] = await connection.query("SELECT id FROM summary WHERE loa_id = ? LIMIT 1", [loaId]);

            if (mode === 'new') {
                if (exSummary.length > 0) throw new Error(`Project [${loaId}] already exists.`);

                const mergedWbs = [...new Set(project.wbs_rows.map(r => r.wbs_element))].join(',');
                const sRows = CATEGORY_MAP.map(c => [project.bu, project.customer, project.loa_id, project.loa_name, c.type, c.cat, mergedWbs, `${mergedWbs}-${c.cat}`, 'Active']);
                await connection.query("INSERT INTO summary (bu, customer, loa_id, loa_name, cost_revenue, categories, merged_wbs, Merged_wbs_category, active_inactive) VALUES ?", [sRows]);
                
                const mRows = project.wbs_rows.map(r => [project.bu, project.customer, project.loa_id, project.loa_name, r.wbs_type, r.wbs_element, r.wbs_description, mergedWbs, created_by]);
                await connection.query("INSERT INTO wbs_loa_id_mapping1 (bu, customer, loa_id, loa_name, wbs_type, single_wbs, wbs_description, merged_wbs, created_by) VALUES ?", [mRows]);

                await insertCj74DummyData(connection, project.wbs_rows, costElements);
                processedLoas++;

            } else if (mode === 'existing') {
                const [exMap] = await connection.query("SELECT single_wbs as wbs, wbs_type as type FROM wbs_loa_id_mapping1 WHERE loa_id = ?", [loaId]);
                const existingSet = new Set(exMap.map(e => `${e.wbs}|${e.type}`.toUpperCase()));
                const newWbs = project.wbs_rows.filter(r => !existingSet.has(`${r.wbs_element}|${r.wbs_type}`.toUpperCase()));

                if (newWbs.length > 0) {
                    const mRows = newWbs.map(r => [project.bu, project.customer, project.loa_id, project.loa_name, r.wbs_type, r.wbs_element, r.wbs_description, "", created_by]);
                    await connection.query("INSERT INTO wbs_loa_id_mapping1 (bu, customer, loa_id, loa_name, wbs_type, single_wbs, wbs_description, merged_wbs, created_by) VALUES ?", [mRows]);
                    await syncProjectWbs(connection, loaId, project.loa_name);
                    await insertCj74DummyData(connection, newWbs, costElements);
                }
                processedLoas++;
            }
        }

        await connection.commit();

        // One-Shot UI Refresh
        const loaList = Object.keys(projectGroups);
        await db.query("DELETE FROM final_dashboard_table WHERE loa_id IN (?)", [loaList]);
        await db.query(`
            INSERT INTO final_dashboard_table (bu, customer, loa_id, loa_name, cost_revenue, categories, active_inactive, wbs_element_single, wbs_type, wbs_description, merged_wbs, Merged_wbs_categories, ptd, open_commitment_KEUR, asbl, non_committed_editable)
            SELECT bu, customer, loa_id, loa_name, cost_revenue, categories, active_inactive, wbs_element_single, wbs_type, wbs_description, merged_wbs, Merged_wbs_categories, ptd, open_commitment_KEUR, asbl, non_committed_editable
            FROM final_dashboard WHERE loa_id IN (?)
        `, [loaList, loaList]);

        return { message: `Successfully synced ${processedLoas} LOA(s).` };
    } catch (err) {
        if (connection) await connection.rollback();
        throw err;
    } finally {
        if (connection) connection.release();
    }
};

// ==========================================
// 🔥 PUBLIC EXPORTS (Sahi se export karna zaroori h)
// ==========================================

exports.processProjectPaste = async (req, res) => {
    try {
        const { rawText, mode } = req.body;
        if (!rawText) return res.status(400).json({ error: "No data pasted" });
        const dataGrid = rawText.trim().split(/\r?\n/).map(l => l.split('\t'));
        const result = await processProjectData(dataGrid, req.user?.email || 'System', mode || 'new');
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.uploadProjectFile = async (req, res) => {
    try {
        const { mode } = req.body;
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const wb = XLSX.readFile(req.file.path);
        const dataGrid = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
        const result = await processProjectData(dataGrid, req.user?.email || 'System', mode || 'new');
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
        const [catRows] = await connection.query("SELECT categories as cat, cost_revenue_type as type FROM master_categories");
        const CATEGORY_MAP = catRows;
        const [projects] = await connection.query("SELECT DISTINCT loa_id, loa_name, bu, customer FROM wbs_loa_id_mapping1");

        for (const p of projects) {
            for (const catItem of CATEGORY_MAP) {
                const [exists] = await connection.query("SELECT id FROM summary WHERE loa_id = ? AND categories = ? LIMIT 1", [p.loa_id, catItem.cat]);
                if (exists.length === 0) {
                    await connection.query("INSERT INTO summary (bu, customer, loa_id, loa_name, cost_revenue, categories, active_inactive) VALUES (?,?,?,?,?,?,?)", [p.bu, p.customer, p.loa_id, p.loa_name, catItem.type, catItem.cat, 'Active']);
                }
            }
            await syncProjectWbs(connection, p.loa_id, p.loa_name);
        }
        res.status(200).json({ message: "Database Cleaned & Synced Successfully!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
    finally { if (connection) connection.release(); }
};