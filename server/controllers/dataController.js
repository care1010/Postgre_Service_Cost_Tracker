const db = require('../config/db');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const fs = require('fs');
const NodeCache = require('node-cache');

const filterCache = new NodeCache({ stdTTL: 300 }); 

// ==============================
// COMMON RLS FUNCTION
// ==============================
const applyRLS = (type, allowedCustomers, conditions, params) => {
    if (type === 'super_admin') return;

    if (allowedCustomers && typeof allowedCustomers === 'string') {
        const customersArray = allowedCustomers
            .split(',')
            .map(c => c.trim().toLowerCase())
            .filter(Boolean);

        if (customersArray.length > 0) {
            conditions.push(`TRIM(LOWER(customer)) IN (?)`);
            params.push(customersArray);
            return;
        }
    }

    conditions.push(`1=0`);
};

// ==============================
// COMMON Dashboard Filters FUNCTION
// ==============================
const applyDashboardFilters = (query, conditions, params) => {
    const { bu, years, periods, customers, loa_names, active_inactive, category_type } = query;

    if (!category_type) {
        conditions.push(`categories <> 'Local Materials'`);
    } else {
        let catArr = Array.isArray(category_type) ? category_type : category_type.split(',').map(v => v.trim());
        const hasAll = catArr.includes('All');
        const hasLM = catArr.includes('Local Materials');

        if (hasAll && !hasLM) conditions.push(`categories <> 'Local Materials'`);
        else if (!hasAll && hasLM) conditions.push(`categories = 'Local Materials'`);
        else if (!hasAll && !hasLM) conditions.push(`categories <> 'Local Materials'`);
    }

    if (bu) {
        const buArray = bu.split(',').map(b => b.trim()).filter(Boolean);
        if (buArray.length > 0) {
            conditions.push(`bu IN (?)`);
            params.push(buArray);
        }
    }
    if (years) {
        const yearArray = years.split(',');
        conditions.push(`(${yearArray.map(() => "period LIKE ?").join(' OR ')})`);
        params.push(...yearArray.map(y => `${y}-%`));
    }
    if (periods) {
        const periodArray = periods.split(',');
        conditions.push(`period IN (?)`);
        params.push(periodArray);
    }
    if (customers) {
        const customerArray = customers.split(',');
        conditions.push(`customer IN (?)`);
        params.push(customerArray);
    }
    if (loa_names) {
        const loaArray = loa_names.split(',');
        conditions.push(`loa_name IN (?)`);
        params.push(loaArray);
    }
    if (active_inactive) {
        conditions.push(`active_inactive = ?`);
        params.push(active_inactive);
    }
};

const getValArray = (val, reqQuery = null, keyName = null) => {
    let targetVal = val;
    if (reqQuery && keyName && targetVal === undefined) {
        targetVal = reqQuery[`${keyName}[]`] || reqQuery[`${keyName}%5B%5D`];
    }

    if (targetVal === undefined || targetVal === null || targetVal === '' || targetVal === 'null' || (Array.isArray(targetVal) && targetVal.length === 0)) {
        return null;
    }
    let arr = Array.isArray(targetVal) ? targetVal : targetVal.toString().split(',').map(v => v.trim()).filter(Boolean);
    arr = arr.filter(v => v.toLowerCase() !== 'all'); 
    return arr.length > 0 ? arr : null;
};

const applyCategoryTypeFilter = (catType, conditions) => {
    let catArr = Array.isArray(catType) ? catType : (catType ? catType.split(",") : []);
    catArr = catArr.map(v => v.trim()).filter(Boolean);

    const hasAll = catArr.includes("All");
    const hasLM = catArr.includes("Local Materials");

    if (hasAll && hasLM) return;
    if (hasLM && !hasAll) { conditions.push("TRIM(categories) = 'Local Materials'"); return; }
    if (hasAll || catArr.length === 0) { conditions.push("TRIM(categories) <> 'Local Materials'"); return; }
};

// ==============================
// 2. Summary View Cascading Filters
// ==============================
exports.getFilterOptions = async (req, res) => {
    try {
        const cacheKey = `CASCADED_FILTERS_${JSON.stringify(req.query)}`;
        const cachedData = filterCache.get(cacheKey);

        if (cachedData) {
            return res.status(200).json(cachedData); 
        }

        const { type, allowedCustomers } = req.query;
        
        let baseConditions = [
            "(categories IS NULL OR categories NOT IN ('Not to considered'))",
            "(cost_revenue IS NULL OR cost_revenue <> 'NTC')"
        ];
        let baseParams = [];
        applyRLS(type, allowedCustomers, baseConditions, baseParams);

        const columnMapping = {
            'bu': 'bu', 'customer': 'customer', 'loa_id': 'loa_id', 'loa_name': 'loa_name',
            'wbs_type': 'wbs_type', 'wbs': 'wbs_element_single', 
            'wbs_description': 'wbs_description', 'period': 'period',
            'active_inactive': 'active_inactive', 'category_type': 'categories'
        };

        const getFilteredOptions = async (targetField) => {
            let conditions = [...baseConditions];
            let filterValues = [...baseParams];

            if (targetField !== 'category_type') {
                applyCategoryTypeFilter(req.query.category_type, conditions);
            }

            Object.keys(columnMapping).forEach(key => {
                if (key !== targetField && key !== 'category_type') {
                    const vals = getValArray(req.query[key], req.query, key);
                    if (vals && vals.length > 0 && !vals.includes('All')) {
                        const dbCol = columnMapping[key];
                        if (key === 'active_inactive') {
                            const hasActive = vals.some(v => v.toLowerCase() === 'active');
                            const hasInactive = vals.some(v => v.toLowerCase() === 'inactive');
                            if (hasActive && hasInactive) return;
                            if (hasActive) conditions.push(`(TRIM(LOWER("${dbCol}")) = 'active' OR "${dbCol}" IS NULL OR TRIM("${dbCol}") = '')`);
                            else if (hasInactive) conditions.push(`TRIM(LOWER("${dbCol}")) = 'inactive'`);
                        } else {
                            const lowerVals = vals.map(v => v.trim().toLowerCase());
                            conditions.push(`TRIM(LOWER("${dbCol}")) IN (?)`);
                            filterValues.push(lowerVals);
                        }
                    }
                }
            });

            const dbColName = columnMapping[targetField];
            const sql = `SELECT DISTINCT "${dbColName}" as value 
                         FROM final_dashboard_table 
                         WHERE ${conditions.join(' AND ')} 
                         AND "${dbColName}" IS NOT NULL AND "${dbColName}" <> ''
                         ORDER BY 1 ASC`;

            const [rows] = await db.query(sql, filterValues);
            return rows.map(r => r.value);
        };

        const keys = ['bu', 'customer', 'loa_id', 'loa_name', 'wbs_type', 'wbs', 'wbs_description', 'period'];
        const results = await Promise.all(keys.map(k => getFilteredOptions(k)));

        const response = {
            category_type: ['All', 'Local Materials'],
            active_inactive: ['Active', 'Inactive']
        };
        keys.forEach((key, i) => { response[key] = results[i]; });

        filterCache.set(cacheKey, response);
        res.status(200).json(response);
    } catch (error) {
        console.error("Filter Options Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const calculateSM = (rev, cost) => {
    const r = Math.abs(parseFloat(rev) || 0); 
    const c = parseFloat(cost) || 0;
    if (r === 0) return "0.00"; 
    const margin = ((r - c) / r) * 100;
    return margin.toFixed(2);
};

// 🔥 DYNAMIC ASBL COLUMN CALCULATOR BY WBS TYPE
const getDynamicSumColumns = (wbsTypes, prefix) => {
    if (!wbsTypes || wbsTypes.length === 0 || wbsTypes.includes('All')) return "0";
    let cols = [];
    if (wbsTypes.some(v => v.toLowerCase().includes('project'))) cols.push(`COALESCE(${prefix}_project, 0)`);
    if (wbsTypes.some(v => v.toLowerCase().includes('amc'))) cols.push(`COALESCE(${prefix}_amc, 0)`);
    if (wbsTypes.some(v => v.toLowerCase().includes('warranty'))) cols.push(`COALESCE(${prefix}_warranty, 0)`);
    return cols.length > 0 ? `(${cols.join(' + ')})` : "0";
};

// 🔥 SMART DYNAMIC NON-COMMITTED COLUMN CALCULATOR (Fallback Enabled)
const getDynamicNCColumns = (wbsTypes) => {
    if (!wbsTypes || wbsTypes.length === 0 || wbsTypes.includes('All')) return "0";
    let cols = [];
    if (wbsTypes.some(v => v.toLowerCase().includes('project'))) {
        cols.push(`COALESCE(NULLIF(non_committed_editable_project, 0), COALESCE(NULLIF(non_committed_project, 0), 0))`);
    }
    if (wbsTypes.some(v => v.toLowerCase().includes('amc'))) {
        cols.push(`COALESCE(NULLIF(non_committed_editable_amc, 0), COALESCE(NULLIF(non_committed_amc, 0), 0))`);
    }
    if (wbsTypes.some(v => v.toLowerCase().includes('warranty'))) {
        cols.push(`COALESCE(NULLIF(non_committed_editable_warranty, 0), COALESCE(NULLIF(non_committed_warranty, 0), 0))`);
    }
    return cols.length > 0 ? `(${cols.join(' + ')})` : "0";
};
// ==============================
// 3. WBS Summary View (Matrix - DYNAMIC ASBL/NC + ZERO VALUE ROWS FILTERED)
// ==============================
// ==============================
// 3. WBS Summary View (Matrix - DYNAMIC ASBL & DYNAMIC NON-COMMITTED FIXED)
// ==============================
exports.getWbsSummary = async (req, res) => {
    try {
        const { draw, start, length, showAll, type, allowedCustomers, bu, customer, loa_id } = req.query;
        const startIdx = parseInt(start) || 0;
        const limitIdx = parseInt(length) || 100;

        const wTArr = getValArray(req.query.wbs_type, req.query, 'wbs_type');

        // 🟢 1. DYNAMIC ASBL COLUMNS
        const asblCols = getDynamicSumColumns(wTArr, 'asbl');
        const asblValExpression = asblCols === "0" ? "0" : `COALESCE(NULLIF(${asblCols}, 0), asbl, 0)`;

        // 🟢 2. DYNAMIC NON-COMMITTED COLUMNS (Smart Fallback for Both Original & Editable!)
        const ncCols = getDynamicNCColumns(wTArr);
        const ncValExpression = ncCols === "0" ? "0" : `COALESCE(NULLIF(${ncCols}, 0), non_committed_editable, non_committed, 0)`;

        const filterColumnMap = {
            'bu': 'bu',
            'customer': 'customer',
            'loa_id': 'loa_id',
            'loa_name': 'loa_name',
            'wbs_type': 'wbs_type',
            'wbs': 'wbs_element_single',
            'wbs_description': 'wbs_description',
            'period': 'period',
            'active_inactive': 'active_inactive'
        };

        let hasActiveFilters = false;
        let filterParams = [];
        let conditions = ["(categories IS NULL OR categories NOT IN ('Not to considered'))", "(cost_revenue IS NULL OR cost_revenue <> 'NTC')"];
        let baseParams = [];

        applyRLS(type, allowedCustomers, conditions, baseParams);

        // Case & Space Safe Filter Loop
        Object.keys(filterColumnMap).forEach(key => {
            const vals = getValArray(req.query[key], req.query, key);
            if (vals && vals.length > 0 && !vals.includes('All')) {
                hasActiveFilters = true; 
                const dbCol = filterColumnMap[key];

                if (key === 'active_inactive') {
                    const hasActive = vals.some(v => v.toLowerCase() === 'active');
                    const hasInactive = vals.some(v => v.toLowerCase() === 'inactive');

                    if (hasActive && hasInactive) return; // Show All

                    if (hasActive) {
                        conditions.push(`(TRIM(LOWER("${dbCol}")) = 'active' OR "${dbCol}" IS NULL OR TRIM("${dbCol}") = '')`);
                    } else if (hasInactive) {
                        conditions.push(`TRIM(LOWER("${dbCol}")) = 'inactive'`);
                    }
                } else {
                    const lowerVals = vals.map(v => String(v).trim().toLowerCase());
                    conditions.push(`TRIM(LOWER("${dbCol}")) IN (?)`);
                    filterParams.push(lowerVals);
                }
            }
        });

        const catTypeVal = req.query.category_type || req.query['category_type[]'];
        applyCategoryTypeFilter(catTypeVal, conditions);

        const isDefaultView = !hasActiveFilters && (startIdx === 0);
        const cacheKey = `DEFAULT_SUMMARY_VIEW_${type}_${allowedCustomers || 'ALL'}`;

        if (isDefaultView) {
            const cachedPage = filterCache.get(cacheKey);
            if (cachedPage) {
                return res.status(200).json({ ...cachedPage, draw: parseInt(draw) || 0 });
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const combinedParams = [...baseParams, ...filterParams];

        // 🔥 MATRIX QUERY WITH FALLBACK ASBL & DYNAMIC NON-COMMITTED
        const matrixQuery = `
            SELECT 
                t.bu, t.customer, t.loa_id, t.loa_name, t.cost_revenue, t.categories, 
                t."Merged_wbs_categories",
                
                ROUND(MAX(COALESCE(static.asbl_val, 0)), 2) as asbl,
                ROUND(MAX(COALESCE(static.asbl_loa_val, 0)), 2) as asbl_loa,
                
                ROUND(SUM(t.ptd_val), 2) as ptd, 
                ROUND(SUM(t.oc_val), 2) as open_commitment_KEUR, 
                ROUND(SUM(t.oc_val), 2) as open_commitment,
                
                ROUND(MAX(COALESCE(static.nc_val, 0)), 2) as non_committed_editable, 
                ROUND(MAX(COALESCE(static.nc_val, 0)), 2) as non_committed, 

                ROUND(SUM(t.ptd_val) + SUM(t.oc_val) + MAX(COALESCE(static.nc_val, 0)), 2) as eac,
                ROUND(MAX(COALESCE(static.asbl_val, 0)) - (SUM(t.ptd_val) + SUM(t.oc_val) + MAX(COALESCE(static.nc_val, 0))), 2) as eac_vs_asbl

            FROM (
                SELECT 
                    bu, customer, loa_id, loa_name, cost_revenue, categories, "Merged_wbs_categories",
                    ptd as ptd_val, open_commitment_KEUR as oc_val
                FROM final_dashboard_table
                ${whereClause}
            ) as t
            LEFT JOIN (
                SELECT 
                    "Merged_wbs_categories", 
                    MAX(${asblValExpression}) as asbl_val, 
                    MAX(asbl_loa) as asbl_loa_val,
                    MAX(${ncValExpression}) as nc_val      -- 🔥 Dynamic NC Value with Fallback!
                FROM final_dashboard_table
                GROUP BY "Merged_wbs_categories"
            ) as static ON t."Merged_wbs_categories" = static."Merged_wbs_categories"
            
            GROUP BY t.bu, t.customer, t.loa_id, t.loa_name, t.cost_revenue, t.categories, t."Merged_wbs_categories"
            HAVING 1=1 
            ${String(showAll) === 'false' ? 'AND (ABS(SUM(t.ptd_val)) > 0.01 OR ABS(SUM(t.oc_val)) > 0.01 OR ABS(MAX(COALESCE(static.asbl_val, 0))) > 0.01 OR ABS(MAX(COALESCE(static.nc_val, 0))) > 0.01)' : ''}
            ORDER BY loa_name ASC, cost_revenue ASC
        `;

        const [dataRows] = await db.query(`${matrixQuery} LIMIT ?, ?`, [...combinedParams, startIdx, limitIdx]);
        const [countRes] = await db.query(`SELECT COUNT(*) as total FROM (${matrixQuery}) as temp`, combinedParams);

        const totalCount = parseInt(countRes[0]?.total || countRes[0]?.count || 0);

        const kpiQuery = `
            SELECT 
                SUM(CASE WHEN cost_revenue = 'Revenue' THEN cat_asbl ELSE 0 END) as asbl_rev,
                SUM(CASE WHEN cost_revenue = 'Revenue' THEN cat_ptd ELSE 0 END) as ptd_rev,
                SUM(CASE WHEN cost_revenue = 'Cost' THEN cat_ptd ELSE 0 END) as ptd_cost,
                SUM(CASE WHEN cost_revenue = 'Revenue' THEN (cat_ptd + cat_oc + cat_nc) ELSE 0 END) as eac_rev,
                SUM(CASE WHEN cost_revenue = 'Cost' THEN (cat_ptd + cat_oc + cat_nc) ELSE 0 END) as eac_cost
            FROM (
                SELECT t.cost_revenue, t."Merged_wbs_categories",
                       MAX(static.asbl_val) as cat_asbl,
                       SUM(t.ptd_val) as cat_ptd,
                       SUM(t.oc_val) as cat_oc,
                       MAX(static.nc_val) as cat_nc
                FROM (
                    SELECT cost_revenue, "Merged_wbs_categories", ptd as ptd_val, open_commitment_KEUR as oc_val 
                    FROM final_dashboard_table ${whereClause}
                ) as t
                LEFT JOIN (
                    SELECT "Merged_wbs_categories", MAX(${asblValExpression}) as asbl_val, MAX(${ncValExpression}) as nc_val 
                    FROM final_dashboard_table GROUP BY 1
                ) as static ON t."Merged_wbs_categories" = static."Merged_wbs_categories"
                GROUP BY t.cost_revenue, t."Merged_wbs_categories"
            ) as aggregated_t
        `;
        
        const [kpiRes] = await db.query(kpiQuery, combinedParams);
        const k = kpiRes[0] || {};

        const responsePayload = {
            draw: parseInt(draw) || 0, 
            recordsTotal: totalCount,
            recordsFiltered: totalCount, 
            data: dataRows,
            kpis: {
                asbl_rev: Number(k.asbl_rev || 0).toFixed(2), asbl_cost: Number(k.asbl_cost || 0).toFixed(2),
                asbl_sm: calculateSM(k.asbl_rev, k.asbl_cost),
                ptd_rev: Number(k.ptd_rev || 0).toFixed(2), ptd_cost: Number(k.ptd_cost || 0).toFixed(2),
                ptd_sm: calculateSM(k.ptd_rev, k.ptd_cost), eac_sm: calculateSM(k.eac_rev, k.eac_cost)
            }
        };

        if (isDefaultView) {
            filterCache.set(cacheKey, responsePayload);
        }

        res.status(200).json(responsePayload);

    } catch (error) {
        console.error("WbsSummary Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ==============================
// 4. Summary View (Collapse)
// ==============================
exports.getWbsSummaryCollapse = async (req, res) => {
    try {
        const { draw, start, length, type, allowedCustomers } = req.query;
        const startIdx = parseInt(start) || 0;
        const limitIdx = parseInt(length) || 100;

        const wTArr = getValArray(req.query.wbs_type);
        const wEArr = getValArray(req.query.wbs);

        let conditions = ["(categories IS NULL OR categories NOT IN ('Not to considered'))", "(cost_revenue IS NULL OR cost_revenue <> 'NTC')"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);

        let filterParams = [];
        const dbFilters = ['bu', 'customer', 'loa_id', 'loa_name', 'active_inactive', 'period', 'wbs_type', 'wbs_description'];
        dbFilters.forEach(key => {
            const vals = getValArray(req.query[key]);
            if (vals && vals.length > 0 && !vals.includes('All')) {
                conditions.push(`"${key}" IN (?)`);
                filterParams.push(vals);
            }
        });
        if (wEArr && !wEArr.includes('All')) { conditions.push(`wbs_element_single IN (?)`); filterParams.push(wEArr); }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        let asblSumLogic = "MAX(asbl)"; 
        if (wTArr && wTArr.length > 0) {
            let parts = [];
            if (wTArr.some(v => v.toLowerCase().includes('project'))) parts.push("MAX(asbl_project)");
            if (wTArr.some(v => v.toLowerCase().includes('amc'))) parts.push("MAX(asbl_amc)");
            if (parts.length > 0) asblSumLogic = `(${parts.join(' + ')})`;
        }

        const sql = `
            SELECT 
                bu, customer, loa_name, loa_id, cost_revenue,
                ROUND(${asblSumLogic}, 2) AS asbl, 
                ROUND(MAX(asbl_loa), 2) AS asbl_loa,
                ROUND(SUM(ptd), 2) AS ptd,
                ROUND(SUM(open_commitment_KEUR), 2) AS open_commitment_KEUR, 
                ROUND(SUM(open_commitment_KEUR), 2) AS open_commitment, 
                ROUND(SUM(non_committed_editable), 2) AS non_committed_editable,
                ROUND(SUM(non_committed_editable), 2) AS non_committed,
                ROUND(SUM(ptd) + SUM(open_commitment_KEUR) + SUM(non_committed_editable), 2) as eac
            FROM final_dashboard_table
            ${whereClause}
            GROUP BY bu, customer, loa_name, loa_id, cost_revenue
            ORDER BY loa_name ASC
        `;

        const [dataRows] = await db.query(`${sql} LIMIT ?, ?`, [...baseParams, ...filterParams, startIdx, limitIdx]);
        const [countRes] = await db.query(`SELECT COUNT(*) as total FROM (${sql}) temp`, [...baseParams, ...filterParams]);

        const totalCount = parseInt(countRes[0]?.total || 0);

        res.status(200).json({ draw: parseInt(draw) || 0, recordsTotal: totalCount, recordsFiltered: totalCount, data: dataRows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==============================
// 5. FULL REFRESH (PostgreSQL Native - Blazing Fast)
// ==============================
exports.fullRefresh = async (req, res) => {
    try {
        console.log("🚀 Starting Sync (PTD & OC Corrected - PostgreSQL Version)...");

        // Phase 1: PTD Staging
        await db.query(`DROP TABLE IF EXISTS stg_cj74_agg`);
        await db.query(`
            CREATE TABLE stg_cj74_agg AS
            SELECT
                TRIM(REPLACE(REPLACE(REPLACE(object_1, ' ', ''), CHR(10), ''), CHR(13), '')) AS clean_wbs,
                cost_element,
                TRIM(CONCAT(year, '-P', LPAD(TRIM(per), 3, '0'))) AS period,
                SUM(
                    CASE 
                        WHEN TRIM(val_in_rc::text) ~ '^[+-]?[0-9]*\.?[0-9]+$' THEN CAST(TRIM(val_in_rc::text) AS NUMERIC(18,2))
                        ELSE 0 
                    END / 1000
                ) AS ptd_val
            FROM cj74_new 
            WHERE year IS NOT NULL AND per IS NOT NULL 
              AND TRIM(year::text) != 'NULL' AND TRIM(per::text) != 'NULL'
              AND TRIM(year::text) != '' AND TRIM(per::text) != ''
            GROUP BY 1, 2, 3
        `);
        await db.query("CREATE INDEX idx_stg_cj74_wbs ON stg_cj74_agg (clean_wbs)");
        await db.query("CREATE INDEX idx_stg_cj74_ce ON stg_cj74_agg (cost_element)");

        // Phase 2: OC Staging
        await db.query(`DROP TABLE IF EXISTS stg_cji5_agg`);
        await db.query(`
            CREATE TABLE stg_cji5_agg AS
            SELECT
                TRIM(REPLACE(REPLACE(REPLACE(wbs_element, ' ', ''), CHR(10), ''), CHR(13), '')) AS clean_wbs,
                TRIM(cost_element) AS cost_element,
                SUM(
                    CASE 
                        WHEN TRIM(val_in_rep_cur::text) ~ '^[+-]?[0-9]*\.?[0-9]+$' THEN CAST(TRIM(val_in_rep_cur::text) AS NUMERIC(18,2))
                        ELSE 0 
                    END / 1000
                ) AS oc_val
            FROM cji5_new 
            GROUP BY 1, 2
        `);
        await db.query("CREATE INDEX idx_stg_cji5_wbs ON stg_cji5_agg (clean_wbs)");
        await db.query("CREATE INDEX idx_stg_cji5_ce ON stg_cji5_agg (cost_element)");

        // Phase 3: Master Mapping
        await db.query(`DROP TABLE IF EXISTS stg_master_mapping`);
        await db.query(`
            CREATE TABLE stg_master_mapping AS
            SELECT
                TRIM(m.single_wbs) AS single_wbs,
                m.bu, m.customer, m.loa_id, m.loa_name, m.merged_wbs, m.wbs_type, m.wbs_description,
                cm.categories, cm.cost_element, cm.cost_revenue AS mapped_cost_revenue,
                TRIM(CONCAT(COALESCE(m.merged_wbs, ''), '-', COALESCE(cm.categories, ''))) AS "Merged_wbs_categories"
            FROM wbs_loa_id_mapping1 m
            CROSS JOIN (SELECT DISTINCT cost_element, categories, cost_revenue FROM cost_mapping) cm
        `);
        await db.query("CREATE INDEX idx_stg_mm_wbs ON stg_master_mapping (single_wbs)");
        await db.query("CREATE INDEX idx_stg_mm_ce ON stg_master_mapping (cost_element)");
        await db.query('CREATE INDEX idx_stg_mm_cat ON stg_master_mapping ("Merged_wbs_categories")');

        // Phase 4: Final Table Fill
        await db.query("TRUNCATE TABLE final_dashboard_table");

        const finalInsertSql = `
            INSERT INTO final_dashboard_table 
            (id, bu, customer, loa_id, loa_name, cost_revenue, categories, merged_wbs, active_inactive, 
             asbl, asbl_amc, asbl_project, asbl_warranty, asbl_loa, 
             non_committed, non_committed_amc, non_committed_project, non_committed_warranty,
             non_committed_editable, non_committed_editable_amc, non_committed_editable_project, non_committed_editable_warranty,
             period, ptd, wbs_element_single, wbs_type, wbs_description, 
             open_commitment_KEUR, eac, eac_vs_asbl, "Merged_wbs_categories", updated_by, updated_at)
            
            SELECT 
                id, bu, customer, loa_id, loa_name, cost_revenue, categories, merged_wbs, active_inactive,
                
                CASE WHEN rank_project = 1 THEN asbl ELSE 0 END,
                CASE WHEN rank_project = 1 THEN asbl_amc ELSE 0 END,
                CASE WHEN rank_project = 1 THEN asbl_project ELSE 0 END,
                CASE WHEN rank_project = 1 THEN asbl_warranty ELSE 0 END,
                CASE WHEN rank_project = 1 THEN asbl_loa ELSE 0 END,
                
                CASE WHEN rank_project = 1 THEN non_committed ELSE 0 END,
                CASE WHEN rank_project = 1 THEN non_committed_amc ELSE 0 END,
                CASE WHEN rank_project = 1 THEN non_committed_project ELSE 0 END,
                CASE WHEN rank_project = 1 THEN non_committed_warranty ELSE 0 END,
                
                CASE WHEN rank_project = 1 THEN non_committed_editable ELSE 0 END,
                CASE WHEN rank_project = 1 THEN non_committed_editable_amc ELSE 0 END,
                CASE WHEN rank_project = 1 THEN non_committed_editable_project ELSE 0 END,
                CASE WHEN rank_project = 1 THEN non_committed_editable_warranty ELSE 0 END,
                
                period, ptd, wbs_element_single, wbs_type, wbs_description,
                
                CASE WHEN rank_oc = 1 THEN oc_val_raw ELSE 0 END,
                
                (ptd + CASE WHEN rank_oc = 1 THEN oc_val_raw ELSE 0 END + CASE WHEN rank_project = 1 THEN non_committed_editable ELSE 0 END),
                (CASE WHEN rank_project = 1 THEN asbl ELSE 0 END - (ptd + CASE WHEN rank_oc = 1 THEN oc_val_raw ELSE 0 END + CASE WHEN rank_project = 1 THEN non_committed_editable ELSE 0 END)),
                
                "Merged_wbs_categories", updated_by, updated_at
            FROM (
                SELECT 
                    COALESCE(s.id::text, CONCAT('NEW-', m."Merged_wbs_categories")) AS id,
                    COALESCE(s.bu, m.bu) AS bu, COALESCE(s.customer, m.customer) AS customer, 
                    COALESCE(s.loa_id, m.loa_id) AS loa_id, COALESCE(s.loa_name, m.loa_name) AS loa_name,
                    COALESCE(s.cost_revenue, m.mapped_cost_revenue) AS cost_revenue, m.categories, 
                    COALESCE(s.merged_wbs, m.merged_wbs) AS merged_wbs, COALESCE(s.active_inactive, 'Active') AS active_inactive,
                    COALESCE(s.asbl, 0) AS asbl, COALESCE(s.asbl_amc, 0) AS asbl_amc, COALESCE(s.asbl_project, 0) AS asbl_project, COALESCE(s.asbl_warranty, 0) AS asbl_warranty, COALESCE(s.asbl_loa, 0) AS asbl_loa,
                    COALESCE(s.non_committed, 0) AS non_committed, COALESCE(s.non_committed_amc, 0) AS non_committed_amc, COALESCE(s.non_committed_project, 0) AS non_committed_project, COALESCE(s.non_committed_warranty, 0) AS non_committed_warranty,
                    COALESCE(s.non_committed_editable, 0) AS non_committed_editable, COALESCE(s.non_committed_editable_amc, 0) AS non_committed_editable_amc, COALESCE(s.non_committed_editable_project, 0) AS non_committed_editable_project, COALESCE(s.non_committed_editable_warranty, 0) AS non_committed_editable_warranty,
                    cj.period, COALESCE(cj.ptd_val, 0) AS ptd, m.single_wbs AS wbs_element_single, m.wbs_type, m.wbs_description,
                    COALESCE(ci.oc_val, 0) AS oc_val_raw, m."Merged_wbs_categories", s.updated_by, s.updated_at,
                    
                    ROW_NUMBER() OVER (PARTITION BY m.single_wbs, m.cost_element ORDER BY cj.period DESC) AS rank_oc,
                    ROW_NUMBER() OVER (PARTITION BY m."Merged_wbs_categories" ORDER BY cj.period DESC) AS rank_project
                FROM stg_master_mapping m
                LEFT JOIN stg_cj74_agg cj ON (m.single_wbs = cj.clean_wbs AND m.cost_element = cj.cost_element)
                LEFT JOIN stg_cji5_agg ci ON (m.single_wbs = ci.clean_wbs AND m.cost_element = ci.cost_element)
                LEFT JOIN summary s ON (m."Merged_wbs_categories" = s."Merged_wbs_category")
                WHERE cj.ptd_val IS NOT NULL OR ci.oc_val IS NOT NULL OR s.asbl > 0
            ) AS final_src
        `;
        
        await db.query(finalInsertSql);

        // Phase 5: Flush Cache & Sync Drilldowns
        filterCache.flushAll(); 
        if (typeof exports.syncDrilldownTables === 'function') {
            await exports.syncDrilldownTables();
        }

        // Phase 6: Pre-Aggregated Table for Blazing Fast Summary
        await db.query(`DROP TABLE IF EXISTS summary_matrix_aggregated`);
        await db.query(`
            CREATE TABLE summary_matrix_aggregated AS
            SELECT 
                t.bu, t.customer, t.loa_id, t.loa_name, t.cost_revenue, t.categories, 
                t."Merged_wbs_categories",
                ROUND(MAX(COALESCE(static.asbl_val, 0)), 2) as asbl,
                ROUND(MAX(COALESCE(static.asbl_loa_val, 0)), 2) as asbl_loa,
                ROUND(SUM(t.ptd_val), 2) as ptd, 
                ROUND(SUM(t.oc_val), 2) as open_commitment_KEUR, 
                ROUND(SUM(t.oc_val), 2) as open_commitment,
                ROUND(MAX(COALESCE(static.nc_val, 0)), 2) as non_committed_editable, 
                ROUND(MAX(COALESCE(static.nc_val, 0)), 2) as non_committed, 
                ROUND(SUM(t.ptd_val) + SUM(t.oc_val) + MAX(COALESCE(static.nc_val, 0)), 2) as eac,
                ROUND(MAX(COALESCE(static.asbl_val, 0)) - (SUM(t.ptd_val) + SUM(t.oc_val) + MAX(COALESCE(static.nc_val, 0))), 2) as eac_vs_asbl
            FROM (
                SELECT 
                    bu, customer, loa_id, loa_name, cost_revenue, categories, "Merged_wbs_categories",
                    ptd as ptd_val, open_commitment_KEUR as oc_val
                FROM final_dashboard_table
            ) as t
            LEFT JOIN (
                SELECT 
                    "Merged_wbs_categories", 
                    MAX(asbl) as asbl_val, 
                    MAX(asbl_loa) as asbl_loa_val,
                    MAX(non_committed_editable) as nc_val
                FROM final_dashboard_table
                GROUP BY "Merged_wbs_categories"
            ) as static ON t."Merged_wbs_categories" = static."Merged_wbs_categories"
            GROUP BY t.bu, t.customer, t.loa_id, t.loa_name, t.cost_revenue, t.categories, t."Merged_wbs_categories"
        `);
        await db.query(`CREATE INDEX idx_sma_loa ON summary_matrix_aggregated (loa_id)`);
        await db.query(`CREATE INDEX idx_sma_bu ON summary_matrix_aggregated (bu)`);
        filterCache.flushAll(); // Clear old cache
        console.log("⚡ Default Page 1 Pre-calculated & Saved in RAM for Instant User Load!");

        res.status(200).json({ message: "Sync Success! Everything is now accurate and Postgres-compatible." });

    } catch (error) {
        console.error("Full Refresh Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ==========================================
// DRILLDOWN TABLES SYNC HELPER
// ==========================================
exports.syncDrilldownTables = async () => {
    try {
        console.log("🔄 Syncing Drilldown Tables (PostgreSQL Direct)...");

        await db.query("TRUNCATE TABLE t_cj74_transformed");
        await db.query(`
            INSERT INTO t_cj74_transformed (
                id, sap_wbs, year, per, cost_element, cost_element_name, ptd_val, period, cocd, proj_def, 
                profit_ctr, name2, tcurr, value_trancurr, obcur, val_in_obj_crcy, val_in_rc, rcurr, 
                cost_element_descr, refdocno, document_no, doc_date, postg_date, offst_acct, 
                name_of_offsetting_account, material, material_description, name1, name22, created_on, 
                origin_form, user_name, pur_doc, quantity, purchase_order_text, loa_id, wbs_string, 
                wbs_type, wbs_description, categories, cost_revenue
            )
            SELECT 
                c.id, 
                TRIM(REPLACE(REPLACE(REPLACE(c.object_1, ' ', ''), CHR(10), ''), CHR(13), '')) AS sap_wbs, 
                c.year, 
                CASE WHEN TRIM(c.per::text) ~ '^[0-9]+$' THEN CAST(TRIM(c.per::text) AS INTEGER) ELSE NULL END AS per, 
                c.cost_element, c.cost_element_name, 
                CAST(COALESCE(c.val_in_rc, 0) AS NUMERIC(15,2)) / 1000 AS ptd_val, 
                TRIM(CONCAT(c.year, '-P', LPAD(CASE WHEN TRIM(c.per::text) ~ '^[0-9]+$' THEN TRIM(c.per::text) ELSE '0' END, 3, '0'))) AS period, 
                c.cocd, c.proj_def, c.profit_ctr, c.name2, c.tcurr, c.value_trancurr, c.obcur, 
                c.val_in_obj_crcy, c.val_in_rc, c.rcurr, c.cost_element_descr, c.refdocno, 
                c.document_no, c.doc_date, c.postg_date, c.offst_acct, c.name_of_offsetting_account, 
                c.material, c.material_description, c.name1, c.name22, c.created_on, c.frm, 
                c.user_name, c.pur_doc, c.quantity, c.purchase_order_text, 
                m.loa_id, m.merged_wbs, m.wbs_type, m.wbs_description, 
                cm.categories, cm.cost_revenue
            FROM cj74_new c
            LEFT JOIN (
                SELECT DISTINCT single_wbs, loa_id, merged_wbs, wbs_type, wbs_description
                FROM wbs_loa_id_mapping1
            ) m ON TRIM(REPLACE(REPLACE(REPLACE(c.object_1, ' ', ''), CHR(10), ''), CHR(13), '')) = m.single_wbs
            LEFT JOIN (
                SELECT DISTINCT cost_element, categories, cost_revenue
                FROM cost_mapping
            ) cm ON TRIM(c.cost_element) = TRIM(cm.cost_element)
        `);

        await db.query("TRUNCATE TABLE t_cji5_transformed");
        await db.query(`
            INSERT INTO t_cji5_transformed (
                id, project_def, sap_wbs, refdocno, item, co_object_name, supplier, name, exch_rate, 
                year, per, cost_element, cost_element_descr, matl_group, material, description, 
                user_name, docc, quantity, qty_plan, debit_date, doc_date, cocode, report_currency, 
                val_in_rep_cur, tcurr, value_tcur, obj_curr, value_in_obj_crcy, oc_val, loa_id, wbs_type, categories
            )
            SELECT 
                c.id, c.project_def, TRIM(c.wbs_element) AS sap_wbs, c.refdocno, c.item, 
                c.co_object_name, c.supplier, c.name, c.exch_rate, c.year, c.per, c.cost_element, 
                c.cost_element_descr, c.matl_group, c.material, c.description, c.user_name, c.docc, 
                c.quantity, c.qty_plan, c.debit_date, c.doc_date, c.cocode, c.report_currency, 
                c.val_in_rep_cur, c.tcurr, c.value_tcur, c.obj_curr, c.value_in_obj_crcy, 
                CAST(COALESCE(c.val_in_rep_cur, 0) AS NUMERIC(15,2)) / 1000 AS oc_val, 
                m.loa_id, m.wbs_type, cm.categories
            FROM cji5_new c
            LEFT JOIN (
                SELECT DISTINCT single_wbs, loa_id, wbs_type
                FROM wbs_loa_id_mapping1
            ) m ON TRIM(c.wbs_element) = m.single_wbs
            LEFT JOIN (
                SELECT DISTINCT cost_element, categories
                FROM cost_mapping
            ) cm ON TRIM(c.cost_element) = TRIM(cm.cost_element)
        `);

        console.log("✅ Drilldown Tables Synced on PostgreSQL!");
    } catch (err) {
        console.error("❌ Error in syncing Drilldown tables:", err);
    }
};

// ===========================================
// Helper: Dynamic Drilldown Filters Builder (PostgreSQL Case & Space Safe)
// ===========================================
const buildDrilldownConditions = (filters, tableName) => {
    let conds = [];
    let params = [];

    if (!filters) return { sql: '', params: [] };

    const getArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return val.split(',').map(v => v.trim()).filter(v => v && v.toLowerCase() !== 'all');
    };

    // 1. WBS Type Filter
    const wbsTypes = getArray(filters.wbs_type).map(v => v.toLowerCase());
    if (wbsTypes.length > 0) {
        conds.push(`TRIM(LOWER(wbs_type)) IN (?)`);
        params.push(wbsTypes);
    }

    // 2. WBS Element Filter (sap_wbs)
    const wbsElements = getArray(filters.wbs).map(v => v.toLowerCase());
    if (wbsElements.length > 0) {
        conds.push(`TRIM(LOWER(sap_wbs)) IN (?)`);
        params.push(wbsElements);
    }

    // 3. Period Filter
    const periods = getArray(filters.period).map(v => v.toLowerCase());
    if (periods.length > 0) {
        if (tableName === 't_cj74_transformed') {
            conds.push(`TRIM(LOWER(period)) IN (?)`);
            params.push(periods);
        } else {
            conds.push(`TRIM(LOWER(CONCAT(year, '-P', LPAD(per::text, 3, '0')))) IN (?)`);
            params.push(periods);
        }
    }

    return { 
        sql: conds.length > 0 ? ' AND ' + conds.join(' AND ') : '', 
        params 
    };
};

// ===========================================
// Get Drilldown Data (With Active Filters Applied!)
// ===========================================
exports.getDrillDownData = async (req, res) => {
    try {
        const { field, row, filters } = req.body; // 🔥 FIX: Reading active filters from frontend!
        const loaId = row?.loa_id;
        const category = row?.categories;

        if (!loaId || !category) return res.status(400).json({ error: "Missing LOA ID or Category" });

        const tableName = (field === 'ptd') ? 't_cj74_transformed' : 't_cji5_transformed';
        
        let selectColumns = field === 'ptd' 
            ? `sap_wbs AS wbs, year, per, cost_element, cost_element_name, ptd_val, period, cocd, proj_def, profit_ctr, name2, tcurr, value_trancurr, obcur, val_in_obj_crcy, rcurr, cost_element_descr, refdocno, document_no, doc_date, postg_date, offst_acct, material, material_description, name1, name22, created_on, user_name, pur_doc, quantity, purchase_order_text, loa_id`
            : `project_def, sap_wbs AS wbs, refdocno, item, co_object_name, supplier, name, exch_rate, year, per, cost_element, cost_element_descr, matl_group, material, description, user_name, docc, quantity, qty_plan, debit_date, doc_date, cocode, report_currency, tcurr, value_tcur, obj_curr, value_in_obj_crcy, oc_val AS open_commitment, loa_id`;
        
        let sql = `SELECT ${selectColumns} FROM ${tableName} WHERE TRIM(LOWER(loa_id)) = TRIM(LOWER(?)) AND TRIM(LOWER(categories)) = TRIM(LOWER(?))`;
        let params = [loaId, category];

        // 🔥 FIX: Append active filters (WBS, WBS Type, Period) to Drilldown SQL Query!
        const dynamicFilters = buildDrilldownConditions(filters, tableName);
        sql += dynamicFilters.sql;
        params.push(...dynamicFilters.params);

        sql += ` LIMIT 10000`;

        const [rows] = await db.query(sql, params);
        res.status(200).json(Array.isArray(rows) ? rows : []); 
    } catch (error) {
        console.error("Drilldown Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ===========================================
// Export Drilldown Data to Excel (With Active Filters!)
// ===========================================
exports.exportDrillDown = async (req, res) => {
    try {
        const { field, loa_id, categories, filters } = req.query;
        if (!loa_id || !categories) return res.status(400).send("Missing required parameters");

        let parsedFilters = {};
        try { parsedFilters = JSON.parse(filters || '{}'); } catch(e) {}

        const tableName = field === 'ptd' ? 't_cj74_transformed' : 't_cji5_transformed';
        let selectColumns = field === 'ptd'
            ? `sap_wbs AS wbs, year, per, cost_element, cost_element_name, ptd_val, period, cocd, proj_def, profit_ctr, name2, tcurr, value_trancurr, obcur, val_in_obj_crcy, rcurr, cost_element_descr, refdocno, document_no, doc_date, postg_date, offst_acct, material, material_description, name1, name22, created_on, user_name, pur_doc, quantity, purchase_order_text, loa_id`
            : `project_def, sap_wbs AS wbs, refdocno, item, co_object_name, supplier, name, exch_rate, year, per, cost_element, cost_element_descr, matl_group, material, description, user_name, docc, quantity, qty_plan, debit_date, doc_date, cocode, report_currency, tcurr, value_tcur, obj_curr, value_in_obj_crcy, oc_val AS open_commitment, loa_id`;
        
        let sql = `SELECT ${selectColumns} FROM ${tableName} WHERE TRIM(LOWER(loa_id)) = TRIM(LOWER(?)) AND TRIM(LOWER(categories)) = TRIM(LOWER(?))`;
        let params = [loa_id, categories];

        const dynamicFilters = buildDrilldownConditions(parsedFilters, tableName);
        sql += dynamicFilters.sql;
        params.push(...dynamicFilters.params);

        sql += ` ORDER BY year DESC, per DESC`;

        const [rows] = await db.query(sql, params);

        const fileName = field === 'ptd' ? `PTD_${loa_id}_${categories}.xlsx` : `OC_${loa_id}_${categories}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/\s+/g, '_')}"`);

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
        const worksheet = workbook.addWorksheet('Details');

        if (rows.length > 0) {
            worksheet.columns = Object.keys(rows[0]).map(key => ({ header: key.replace(/_/g, ' ').toUpperCase(), key, width: 20 }));
            rows.forEach(row => worksheet.addRow(row).commit());
        }
        await workbook.commit();
    } catch (error) { 
        res.status(500).send("Export failed"); 
    }
};

// 🔥 DYNAMIC NON-COMMITTED UPDATER (LOA ID + LOA Name Dual Matching)
exports.updateNonCommitted = async (req, res) => {
    const { updates, createdBy } = req.body;
    try {
        const monthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        let totalUpdated = 0;

        for (let item of updates) {
            const { loa_name, categories, value, wbs_type } = item;
            const numVal = parseFloat(value) || 0;

            // Determine Dynamic Column (Project, AMC, or Warranty)
            let ncCol = 'non_committed_editable_project';
            const wTypeStr = String(wbs_type || '').toLowerCase();
            if (wTypeStr.includes('amc')) ncCol = 'non_committed_editable_amc';
            if (wTypeStr.includes('warranty')) ncCol = 'non_committed_editable_warranty';

            // 1. Fetch details from summary
            const [existing] = await db.query(
                `SELECT non_committed_editable, customer, bu, loa_id, active_inactive 
                 FROM summary 
                 WHERE TRIM(LOWER(loa_name)) = TRIM(LOWER(?)) AND TRIM(LOWER(categories)) = TRIM(LOWER(?))`,
                [loa_name, categories]
            );

            if (!existing || existing.length === 0) continue;

            const oldValue = existing[0].non_committed_editable || 0;
            const { customer, bu, loa_id, active_inactive } = existing[0];

            // 2. Update Summary Table (Updates both main & dynamic columns!)
            await db.query(
                `UPDATE summary 
                 SET non_committed_editable = ?, ${ncCol} = ?, updated_by = ? 
                 WHERE TRIM(LOWER(loa_name)) = TRIM(LOWER(?)) AND TRIM(LOWER(categories)) = TRIM(LOWER(?))`,
                [numVal, numVal, createdBy, loa_name, categories]
            );

            // 3. Update Dashboard Table (Updates both main & dynamic columns!)
            const [dashRes] = await db.query(
                `UPDATE final_dashboard_table 
                 SET non_committed_editable = ?, ${ncCol} = ?, updated_by = ? 
                 WHERE TRIM(LOWER(loa_name)) = TRIM(LOWER(?)) AND TRIM(LOWER(categories)) = TRIM(LOWER(?))`,
                [numVal, numVal, createdBy, loa_name, categories]
            );

            // Count successfully updated categories
            totalUpdated++;

            // 4. Activity Log
            await db.query(
                `INSERT INTO user_activity_logs (user_email, bu, customer, loa_name, loa_id, categories, old_value, new_value, active_inactive, month_year, wbs_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [createdBy, bu, customer, loa_name, loa_id, categories, oldValue, numVal, active_inactive, monthYear, wbs_type]
            );
        }

        // 5. Recalculate EAC & Variance
        await db.query(`
            UPDATE final_dashboard_table 
            SET eac = (ptd + open_commitment_KEUR + non_committed_editable),
                eac_vs_asbl = (asbl - (ptd + open_commitment_KEUR + non_committed_editable))
            WHERE ABS(non_committed - non_committed_editable) > 0.01 OR non_committed_editable <> 0
        `);

        filterCache.flushAll(); // Clear Cache
        res.status(200).json({ message: `Successfully saved changes for ${totalUpdated} categories!`, updatedCount: totalUpdated });

    } catch (error) {
        console.error("updateNonCommitted Error:", error);
        res.status(500).json({ error: "Server Error: " + error.message });
    }
};

exports.getUserActivityLogs = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT id, user_email, bu, customer, loa_name, loa_id, categories, old_value, new_value, month_year, created_at FROM user_activity_logs ORDER BY created_at DESC`);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getPendingUsers = async (req, res) => {
    try {
        const monthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        const [rows] = await db.query(`
            SELECT u.email, u.type FROM users u
            LEFT JOIN (SELECT DISTINCT user_email FROM user_activity_logs WHERE month_year = ?) l ON u.email = l.user_email
            WHERE l.user_email IS NULL ORDER BY u.email
        `, [monthYear]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// ===========================================
// Export Summary View Data to Excel (100% Sync with UI Table)
// ===========================================
exports.exportToExcel = async (req, res) => {
    try {
        const { showAll, collapseView, type, allowedCustomers } = req.query;

        const wTArr = getValArray(req.query.wbs_type, req.query, 'wbs_type');
        const wEArr = getValArray(req.query.wbs, req.query, 'wbs');

        // 🔥 STRICT DYNAMIC ASBL & NON-COMMITTED (Exact match with UI logic)
        const asblCols = getDynamicSumColumns(wTArr, 'asbl');
        const asblValExpression = asblCols !== "0" ? asblCols : "0";

        const ncCols = getDynamicNCColumns(wTArr);
        const ncValExpression = ncCols !== "0" ? ncCols : "0";

        let conditions = ["(categories IS NULL OR categories NOT IN ('Not to considered'))", "(cost_revenue IS NULL OR cost_revenue <> 'NTC')"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);

        const filterColumnMap = {
            'bu': 'bu', 'customer': 'customer', 'loa_id': 'loa_id', 'loa_name': 'loa_name',
            'wbs_type': 'wbs_type', 'wbs': 'wbs_element_single', 'wbs_description': 'wbs_description',
            'period': 'period', 'active_inactive': 'active_inactive'
        };

        let filterParams = [];
        Object.keys(filterColumnMap).forEach(key => {
            const vals = getValArray(req.query[key], req.query, key);
            if (vals && vals.length > 0 && !vals.includes('All')) {
                const dbCol = filterColumnMap[key];
                if (key === 'active_inactive') {
                    const hasActive = vals.some(v => String(v).toLowerCase() === 'active');
                    const hasInactive = vals.some(v => String(v).toLowerCase() === 'inactive');
                    if (hasActive && hasInactive) return;
                    if (hasActive) conditions.push(`(TRIM(LOWER("${dbCol}")) = 'active' OR "${dbCol}" IS NULL OR TRIM("${dbCol}") = '')`);
                    else if (hasInactive) conditions.push(`TRIM(LOWER("${dbCol}")) = 'inactive'`);
                } else {
                    const lowerVals = vals.map(v => String(v).trim().toLowerCase());
                    conditions.push(`TRIM(LOWER("${dbCol}")) IN (?)`);
                    filterParams.push(lowerVals);
                }
            }
        });

        const catTypeVal = req.query.category_type || req.query['category_type[]'];
        if (catTypeVal && !catTypeVal.includes('All') && catTypeVal !== 'All') {
            applyCategoryTypeFilter(catTypeVal, conditions);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const combinedParams = [...baseParams, ...filterParams];

        let exportQuery = '';

        // 🟢 If user is exporting COLLAPSED View
        if (String(collapseView) === 'true') {
            let asblSumLogic = "MAX(asbl)"; 
            if (wTArr && wTArr.length > 0 && !wTArr.includes('All') && !wTArr.includes('all')) {
                let parts = [];
                if (wTArr.some(v => String(v).toLowerCase().includes('project'))) parts.push("MAX(asbl_project)");
                if (wTArr.some(v => String(v).toLowerCase().includes('amc'))) parts.push("MAX(asbl_amc)");
                if (parts.length > 0) asblSumLogic = `(${parts.join(' + ')})`;
            }

            let ncSumLogic = "SUM(non_committed)";
            if (wTArr && wTArr.length > 0 && !wTArr.includes('All') && !wTArr.includes('all')) {
                let parts = [];
                if (wTArr.some(v => String(v).toLowerCase().includes('project'))) parts.push("SUM(COALESCE(non_committed_project, 0))");
                if (wTArr.some(v => String(v).toLowerCase().includes('amc'))) parts.push("SUM(COALESCE(non_committed_amc, 0))");
                if (wTArr.some(v => String(v).toLowerCase().includes('warranty'))) parts.push("SUM(COALESCE(non_committed_warranty, 0))");
                if (parts.length > 0) ncSumLogic = `(${parts.join(' + ')})`;
            }

            exportQuery = `
                SELECT 
                    bu, customer, loa_name, loa_id, cost_revenue,
                    ROUND(${asblSumLogic}, 2) AS asbl, 
                    ROUND(MAX(asbl_loa), 2) AS asbl_loa,
                    ROUND(SUM(ptd), 2) AS ptd,
                    ROUND(SUM(open_commitment_KEUR), 2) AS open_commitment,
                    ROUND(${ncSumLogic}, 2) AS non_committed,
                    ROUND(SUM(ptd) + SUM(open_commitment_KEUR) + ${ncSumLogic}, 2) as eac,
                    ROUND(${asblSumLogic} - (SUM(ptd) + SUM(open_commitment_KEUR) + ${ncSumLogic}), 2) as eac_vs_asbl
                FROM final_dashboard_table
                ${whereClause}
                GROUP BY bu, customer, loa_name, loa_id, cost_revenue
                ORDER BY loa_name ASC
            `;
        } 
        // 🟢 If user is exporting NORMAL View (Identical to getWbsSummary)
        else {
            exportQuery = `
                SELECT 
                    t.bu, t.customer, t.loa_id, t.loa_name, t.cost_revenue, t.categories, 
                    ROUND(MAX(COALESCE(static.asbl_val, 0)), 2) as asbl,
                    ROUND(MAX(COALESCE(static.asbl_loa_val, 0)), 2) as asbl_loa,
                    ROUND(SUM(t.ptd_val), 2) as ptd, 
                    ROUND(SUM(t.oc_val), 2) as open_commitment, 
                    ROUND(MAX(COALESCE(static.nc_val, 0)), 2) as non_committed, 
                    ROUND(SUM(t.ptd_val) + SUM(t.oc_val) + MAX(COALESCE(static.nc_val, 0)), 2) as eac,
                    ROUND(MAX(COALESCE(static.asbl_val, 0)) - (SUM(t.ptd_val) + SUM(t.oc_val) + MAX(COALESCE(static.nc_val, 0))), 2) as eac_vs_asbl
                FROM (
                    SELECT 
                        bu, customer, loa_id, loa_name, cost_revenue, categories, "Merged_wbs_categories",
                        ptd as ptd_val, open_commitment_KEUR as oc_val
                    FROM final_dashboard_table
                    ${whereClause}
                ) as t
                LEFT JOIN (
                    SELECT 
                        "Merged_wbs_categories", 
                        MAX(${asblValExpression}) as asbl_val, 
                        MAX(asbl_loa) as asbl_loa_val,
                        MAX(${ncValExpression}) as nc_val      
                    FROM final_dashboard_table
                    GROUP BY "Merged_wbs_categories"
                ) as static ON t."Merged_wbs_categories" = static."Merged_wbs_categories"
                
                GROUP BY t.bu, t.customer, t.loa_id, t.loa_name, t.cost_revenue, t.categories, t."Merged_wbs_categories"
                HAVING 1=1 
                ${String(showAll) === 'false' ? 'AND (ABS(SUM(t.ptd_val)) > 0.01 OR ABS(SUM(t.oc_val)) > 0.01 OR ABS(MAX(COALESCE(static.asbl_val, 0))) > 0.01 OR ABS(MAX(COALESCE(static.nc_val, 0))) > 0.01)' : ''}
                ORDER BY loa_name ASC, cost_revenue ASC
            `;
        }

        const [rows] = await db.query(exportQuery, combinedParams);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Summary_Export_${new Date().getTime()}.xlsx`);
        
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
        const worksheet = workbook.addWorksheet('Matrix Data');
        
        const cols = [
            { header: 'BU', key: 'bu', width: 12 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'LOA Name', key: 'loa_name', width: 40 },
            { header: 'LOA ID', key: 'loa_id', width: 15 },
            { header: 'Cost/Revenue', key: 'cost_revenue', width: 15 }
        ];
        if (String(collapseView) !== 'true') cols.push({ header: 'Category', key: 'categories', width: 25 });
        cols.push(
            { header: 'ASBL', key: 'asbl', width: 15 },
            { header: 'ASBL LOA', key: 'asbl_loa', width: 15 },
            { header: 'PTD', key: 'ptd', width: 15 },
            { header: 'Open Commitment', key: 'open_commitment', width: 15 },
            { header: 'Non Committed', key: 'non_committed', width: 15 },
            { header: 'EAC', key: 'eac', width: 15 },
            { header: 'EAC vs ASBL', key: 'eac_vs_asbl', width: 15 }
        );
        worksheet.columns = cols;

        // Ensure proper numeric formatting in Excel
        rows.forEach(row => {
            const cleanRow = { ...row };
            ['asbl', 'asbl_loa', 'ptd', 'open_commitment', 'non_committed', 'eac', 'eac_vs_asbl'].forEach(k => {
                if (cleanRow[k] === null || cleanRow[k] === undefined) {
                    cleanRow[k] = (k === 'asbl' || k === 'eac_vs_asbl') ? '-' : 0;
                } else {
                    cleanRow[k] = Number(cleanRow[k]);
                }
            });
            worksheet.addRow(cleanRow).commit();
        });
        
        await workbook.commit();

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).send("Export failed: " + error.message);
    }
};

exports.clearDraftChanges = async (req, res) => {
    try {
        await db.query("UPDATE final_dashboard_table SET non_committed_editable = non_committed");
        await db.query("UPDATE summary SET non_committed_editable = non_committed");
        filterCache.flushAll();
        res.status(200).json({ message: "Draft cleared! All values reset to original." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.exportReviewExcel = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Review_Changes_Export.xlsx`);
        
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
        const worksheet = workbook.addWorksheet('Review Data');
        
        worksheet.columns = [
            { header: 'BU', key: 'bu', width: 10 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'LOA Name', key: 'loa_name', width: 35 },
            { header: 'LOA ID', key: 'loa_id', width: 35 },
            { header: 'Cost/Revenue', key: 'cost_revenue', width: 35 },
            { header: 'Category', key: 'categories', width: 25 },
            { header: 'ASBL', key: 'asbl', width: 15 },
            { header: 'ASBL LOA', key: 'asbl_loa', width: 25 },
            { header: 'PTD', key: 'ptd', width: 25 },
            { header: 'Open Commitment', key: 'open_commitment', width: 25 },
            { header: 'Original Non Committed', key: 'non_committed_original', width: 25 },
            { header: 'Edited Non Committed', key: 'non_committed', width: 25 },
            { header: 'EAC', key: 'eac', width: 15 },
            { header: 'EAC vs ASBL', key: 'eac_vs_asbl', width: 15 }
        ];

        const query = `
            SELECT 
                bu, customer, loa_id, loa_name, cost_revenue, categories,
                MAX(asbl) as asbl, 
                MAX(asbl_loa) as asbl_loa, 
                SUM(ptd) as ptd, 
                MAX(open_commitment_KEUR) as open_commitment, 
                MAX(non_committed_editable) as non_committed, 
                MAX(non_committed) as non_committed_original,
                (SUM(ptd) + MAX(open_commitment_KEUR) + MAX(non_committed_editable)) as eac,
                (MAX(asbl) - (SUM(ptd) + MAX(open_commitment_KEUR) + MAX(non_committed_editable))) as eac_vs_asbl
            FROM final_dashboard_table
            WHERE categories != 'Revenue' 
            AND ABS(COALESCE(non_committed, 0) - COALESCE(non_committed_editable, 0)) > 0.01
            GROUP BY bu, customer, loa_id, loa_name, cost_revenue, categories
            ORDER BY loa_name ASC, cost_revenue ASC
        `;

        const [rows] = await db.query(query);
        rows.forEach(row => worksheet.addRow(row).commit());
        await workbook.commit();
    } catch (error) { 
        console.error("exportReviewExcel Error:", error);
        res.status(500).send("Export failed: " + error.message); 
    }
};

exports.getCategories = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT DISTINCT categories FROM summary WHERE categories IS NOT NULL AND categories <> '' ORDER BY categories ASC");
        res.status(200).json(rows.map(r => r.categories));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.saveProjectData = async (req, res) => {
    const { bu, customer, loa_id, loa_name, wbs, asblData } = req.body;
    try {
        const [existing] = await db.query("SELECT id FROM summary WHERE loa_name = ?", [loa_name]);
        if (existing.length > 0) {
            await db.query("DELETE FROM summary WHERE loa_name = ?", [loa_name]);
        }

        const insertPromises = Object.keys(asblData).map(cat => {
            const val = asblData[cat] || 0;
            if (val === 0 || val === '') return null;
            return db.query(
                `INSERT INTO summary (bu, customer, loa_id, loa_name, merged_wbs, categories, asbl, active_inactive) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
                [bu, customer, loa_id, loa_name, wbs, cat, val]
            );
        }).filter(p => p !== null);

        await Promise.all(insertPromises);
        filterCache.flushAll();
        res.status(200).json({ message: "Data saved successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDashboardFilters = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;

        const buildConditions = (excludeKey) => {
            const { years, periods, customers, active_inactive, loa_names, bu, wbs_type, category_type } = req.query;
            let conditions = ["customer IS NOT NULL", "loa_name IS NOT NULL"];
            let params = [];

            applyRLS(type, allowedCustomers, conditions, params);

            if (!category_type) {
                conditions.push(`categories <> 'Local Materials'`);
            } else {
                let catArr = Array.isArray(category_type) ? category_type : category_type.split(',').map(v => v.trim());
                const hasAll = catArr.includes('All');
                const hasLM = catArr.includes('Local Materials');
                if (hasAll && !hasLM) conditions.push(`categories <> 'Local Materials'`);
                else if (!hasAll && hasLM) conditions.push(`categories = 'Local Materials'`);
                else if (!hasAll && !hasLM) conditions.push(`categories <> 'Local Materials'`);
            }

            if (bu && excludeKey !== 'bus') {
                const buArray = bu.split(',').filter(Boolean);
                if (buArray.length > 0) {
                    conditions.push(`bu IN (?)`);
                    params.push(buArray);
                }
            }
            if (wbs_type && wbs_type !== 'All' && excludeKey !== 'wbs_type') {
                conditions.push(`wbs_type = ?`);
                params.push(wbs_type);
            }
            if (years && excludeKey !== 'years') {
                const yearArray = years.split(',').filter(Boolean);
                if (yearArray.length > 0) {
                    conditions.push(`(${yearArray.map(() => "period LIKE ?").join(' OR ')})`);
                    params.push(...yearArray.map(y => `${y}-%`));
                }
            }
            if (periods && excludeKey !== 'periods') {
                const periodArray = periods.split(',').filter(Boolean);
                if (periodArray.length > 0) {
                    conditions.push(`period IN (?)`);
                    params.push(periodArray);
                }
            }
            if (customers && excludeKey !== 'customers') {
                const customerArray = customers.split(',').filter(Boolean);
                if (customerArray.length > 0) {
                    conditions.push(`customer IN (?)`);
                    params.push(customerArray);
                }
            }
            if (loa_names && excludeKey !== 'loa_names') {
                const loaArray = loa_names.split(',').filter(Boolean);
                if (loaArray.length > 0) {
                    conditions.push(`loa_name IN (?)`);
                    params.push(loaArray);
                }
            }
            if (active_inactive) {
                conditions.push(`active_inactive = ?`);
                params.push(active_inactive);
            }
            return { whereSql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '', params };
        };

        const buQ = buildConditions('bus');
        const [buRows] = await db.query(`SELECT DISTINCT bu FROM final_dashboard_table ${buQ.whereSql} ORDER BY bu ASC`, buQ.params);

        const wbsQ = buildConditions('wbs_type');
        const [wbsRows] = await db.query(`SELECT DISTINCT wbs_type FROM final_dashboard_table ${wbsQ.whereSql} AND wbs_type IS NOT NULL ORDER BY wbs_type ASC`, wbsQ.params);

        const custQ = buildConditions('customers');
        const [customerRows] = await db.query(`SELECT DISTINCT customer FROM final_dashboard_table ${custQ.whereSql} ORDER BY customer ASC`, custQ.params);

        const perQ = buildConditions('periods');
        const [periodRows] = await db.query(`SELECT DISTINCT period FROM final_dashboard_table ${perQ.whereSql} AND period IS NOT NULL ORDER BY period DESC`, perQ.params);

        const loaQ = buildConditions('loa_names');
        const [loaRows] = await db.query(`SELECT DISTINCT loa_name FROM final_dashboard_table ${loaQ.whereSql} ORDER BY loa_name ASC`, loaQ.params);

        const yearsList = [...new Set(periodRows.map(r => r.period?.split('-')[0]))].filter(Boolean).sort((a,b)=>b-a);

        res.status(200).json({
            category_types: ['All', 'Local Materials'],
            bus: buRows.map(r => r.bu),
            wbs_types: wbsRows.map(r => r.wbs_type), 
            years: yearsList,
            periods: periodRows.map(r => r.period),
            customers: customerRows.map(r => r.customer),
            loa_names: loaRows.map(r => r.loa_name)
        });

    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// 🔥 DYNAMIC ASBL DASHBOARD ANALYTICS QUERY
const getDashboardAnalyticsSQL = (groupByCol, asblCols) => {
    const hasAsbl = asblCols !== "0";
    const asblValExpression = asblCols === "0" ? "0" : `COALESCE(NULLIF(${asblCols}, 0), asbl, 0)`;

    return `
        SELECT 
            ${groupByCol},
            ${hasAsbl ? 'ROUND(SUM(cat_asbl), 2)' : "'0.00'"} as asbl,
            ROUND(SUM(cat_ptd), 2) as ptd,
            ROUND(SUM(cat_oc), 2) as open_commitment,
            ROUND(SUM(cat_nc), 2) as non_committed,
            ROUND(SUM(cat_ptd + cat_oc + cat_nc), 2) as eac,
            ROUND(${hasAsbl ? 'SUM(cat_asbl)' : '0.00'} - SUM(cat_ptd + cat_oc + cat_nc), 2) as eac_vs_asbl
        FROM (
            -- 🟢 STEP 1: CATEGORY LEVEL ROLLUP (EXACT MATCHING SUMMARY PAGE MATH!)
            SELECT 
                t.${groupByCol},
                t.loa_id,
                t."Merged_wbs_categories",
                t.wbs_type,
                MAX(COALESCE(static.asbl_val, 0)) as cat_asbl,
                SUM(t.ptd_val) as cat_ptd,
                SUM(t.oc_val) as cat_oc,
                MAX(COALESCE(static.nc_val, 0)) as cat_nc
            FROM (
                SELECT 
                    ${groupByCol}, loa_id, categories, "Merged_wbs_categories", wbs_type,
                    ptd as ptd_val, open_commitment_KEUR as oc_val
                FROM final_dashboard_table
                {{WHERE_CLAUSE}}
            ) as t
            LEFT JOIN (
                SELECT 
                    "Merged_wbs_categories", 
                    MAX(${asblValExpression}) as asbl_val, 
                    MAX(non_committed_editable) as nc_val
                FROM final_dashboard_table
                GROUP BY "Merged_wbs_categories"
            ) as static ON t."Merged_wbs_categories" = static."Merged_wbs_categories"
            GROUP BY t.${groupByCol}, t.loa_id, t."Merged_wbs_categories", t.wbs_type
        ) as category_rollup
        WHERE (? = 'All' OR ? = '' OR TRIM(LOWER(wbs_type)) = TRIM(LOWER(?)))
        GROUP BY ${groupByCol}
        ORDER BY ${groupByCol} ASC
    `;
};

// 1. Business Unit Analytics (Updated with Dynamic ASBL)
exports.getBuAnalytics = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        let wT = req.query.wbs_type || 'All';
        const wTArr = getValArray(req.query.wbs_type, req.query, 'wbs_type');
        
        // 🔥 Dynamic ASBL Column Selection (Picks asbl_project, asbl_amc or 0)
        const asblCols = getDynamicSumColumns(wTArr, 'asbl');

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);
        
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = getDashboardAnalyticsSQL('bu', asblCols).replace('{{WHERE_CLAUSE}}', whereSql);

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.status(200).json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 2. LOA Name Analytics (Updated with Dynamic ASBL)
exports.getLoaAnalytics = async (req, res) => {
    try {
        const { type, allowedCustomers, showAll } = req.query;
        let wT = req.query.wbs_type || 'All';
        const wTArr = getValArray(req.query.wbs_type, req.query, 'wbs_type');
        
        // 🔥 Dynamic ASBL Column Selection
        const asblCols = getDynamicSumColumns(wTArr, 'asbl');
        const limitSql = showAll === 'true' ? '' : 'LIMIT 10';

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);
        
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const rawSql = getDashboardAnalyticsSQL('loa_name', asblCols).replace('{{WHERE_CLAUSE}}', whereSql);
        
        const sql = `SELECT * FROM (${rawSql}) final_t ORDER BY asbl DESC ${limitSql}`;

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.status(200).json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getNonCommittedTrend = async (req, res) => {
    try {
        const { loa_name = '' , active_inactive = ''} = req.query;
        const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        const [rows] = await db.query(
            `
            SELECT
                latest.month_year,
                SUM(latest.new_value) AS total_non_committed
            FROM
            (
                SELECT l1.*
                FROM user_activity_logs l1
                INNER JOIN
                (
                    SELECT loa_name, categories, month_year, MAX(id) AS latest_id
                    FROM user_activity_logs
                    GROUP BY loa_name, categories, month_year
                ) l2 ON l1.id = l2.latest_id
            ) latest
            WHERE (? = '' OR latest.loa_name = ?)
              AND (? = '' OR latest.active_inactive = ?)
              AND latest.month_year <> ?
            GROUP BY latest.month_year
            ORDER BY TO_DATE(CONCAT('01-', latest.month_year), 'DD-Mon-YYYY') DESC
            LIMIT 6
            `,
            [loa_name, loa_name, active_inactive, active_inactive, currentMonthYear]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTrendLoas = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT DISTINCT loa_name FROM user_activity_logs ORDER BY loa_name`);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 🔥 DYNAMIC ASBL DASHBOARD TABLE QUERY
const getDashboardTableSQL = (groupByCols, asblCols) => {
    const hasAsbl = asblCols !== "0";
    const asblValExpression = asblCols === "0" ? "0" : `COALESCE(NULLIF(${asblCols}, 0), asbl, 0)`;

    return `
        SELECT 
            ${groupByCols},
            ${hasAsbl ? 'ROUND(SUM(cat_asbl), 2)' : "'0.00'"} as asbl,
            ROUND(SUM(cat_asbl_loa), 2) as asbl_loa,
            ROUND(SUM(cat_ptd), 2) as ptd,
            ROUND(SUM(cat_oc), 2) as open_commitment,
            ROUND(SUM(cat_nc), 2) as non_committed,
            ROUND(SUM(cat_ptd + cat_oc + cat_nc), 2) as eac,
            ROUND(${hasAsbl ? 'SUM(cat_asbl)' : '0.00'} - SUM(cat_ptd + cat_oc + cat_nc), 2) as eac_vs_asbl
        FROM (
            -- 🟢 STEP 1: CATEGORY LEVEL ROLLUP (EXACT MATCHING SUMMARY PAGE MATH!)
            SELECT 
                ${groupByCols},
                t.loa_id,
                t."Merged_wbs_categories",
                t.wbs_type,
                MAX(COALESCE(static.asbl_val, 0)) as cat_asbl,
                MAX(COALESCE(static.asbl_loa_val, 0)) as cat_asbl_loa,
                SUM(t.ptd_val) as cat_ptd,
                SUM(t.oc_val) as cat_oc,
                MAX(COALESCE(static.nc_val, 0)) as cat_nc
            FROM (
                SELECT 
                    ${groupByCols}, loa_id, categories, "Merged_wbs_categories", wbs_type,
                    ptd as ptd_val, open_commitment_KEUR as oc_val
                FROM final_dashboard_table
                {{WHERE_CLAUSE}}
            ) as t
            LEFT JOIN (
                SELECT 
                    "Merged_wbs_categories", 
                    MAX(${asblValExpression}) as asbl_val, 
                    MAX(asbl_loa) as asbl_loa_val,
                    MAX(non_committed_editable) as nc_val
                FROM final_dashboard_table
                GROUP BY "Merged_wbs_categories"
            ) as static ON t."Merged_wbs_categories" = static."Merged_wbs_categories"
            GROUP BY ${groupByCols}, t.loa_id, t."Merged_wbs_categories", t.wbs_type
        ) as category_rollup
        WHERE (? = 'All' OR ? = '' OR TRIM(LOWER(wbs_type)) = TRIM(LOWER(?)))
        GROUP BY ${groupByCols}
    `;
};

// 3. BU Only Table Views (Updated with Dynamic ASBL)
exports.getFinalDashboardTable = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        let wT = req.query.wbs_type || 'All';
        const wTArr = getValArray(req.query.wbs_type, req.query, 'wbs_type');
        const asblCols = getDynamicSumColumns(wTArr, 'asbl');

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);
        
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = getDashboardTableSQL('bu', asblCols).replace('{{WHERE_CLAUSE}}', whereSql) + " ORDER BY bu ASC";

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getNegativeLOATable = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        let wT = req.query.wbs_type || 'All';
        const showAsbl = wT !== 'All' && wT.toLowerCase() !== 'warranty/other';

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);

        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = getDashboardTableSQL('bu, customer, loa_id, loa_name', showAsbl).replace('{{WHERE_CLAUSE}}', whereSql) + " HAVING ROUND(" + (showAsbl ? 'SUM(type_asbl)' : '0.00') + " - SUM(type_ptd + type_oc + type_nc), 2) < 0 ORDER BY eac_vs_asbl ASC";

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getCostViewTable = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        let wT = req.query.wbs_type || 'All';
        const showAsbl = wT !== 'All' && wT.toLowerCase() !== 'warranty/other';

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);
        
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = getDashboardTableSQL('bu, customer, loa_id, loa_name', showAsbl).replace('{{WHERE_CLAUSE}}', whereSql) + " ORDER BY asbl DESC";

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getCustomerViewTable = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        let wT = req.query.wbs_type || 'All';
        const showAsbl = wT !== 'All' && wT.toLowerCase() !== 'warranty/other';

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);
        
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = getDashboardTableSQL('customer', showAsbl).replace('{{WHERE_CLAUSE}}', whereSql) + " ORDER BY asbl DESC";

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getBuCustomerViewTable = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        let wT = req.query.wbs_type || 'All';
        const showAsbl = wT !== 'All' && wT.toLowerCase() !== 'warranty/other';

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);
        
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `
            SELECT bu, customer,
                   ${showAsbl ? 'ROUND(SUM(type_asbl), 2)' : "'0.00'"} as asbl,
                   ROUND(SUM(type_asbl_loa), 2) as asbl_loa,
                   ROUND(SUM(type_ptd), 2) as ptd,
                   ROUND(SUM(type_oc), 2) as open_commitment,
                   ROUND(SUM(type_nc), 2) as non_committed,
                   ROUND(SUM(type_ptd + type_oc + type_nc), 2) as eac,
                   ROUND(${showAsbl ? 'SUM(type_asbl)' : '0.00'} - SUM(type_ptd + type_oc + type_nc), 2) as eac_vs_asbl
            FROM (
                SELECT bu, customer, loa_id, categories, wbs_type,
                       MAX(asbl) as type_asbl, MAX(asbl_loa) as type_asbl_loa,
                       SUM(ptd) as type_ptd, MAX(open_commitment_KEUR) as type_oc, MAX(non_committed_editable) as type_nc
                FROM final_dashboard_table ${whereSql}
                GROUP BY bu, customer, loa_id, categories, wbs_type
            ) t 
            WHERE (? = 'All' OR ? = '' OR wbs_type = ?)
            GROUP BY bu, customer 
            ORDER BY bu ASC, asbl DESC`;

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getCustomerBuViewTable = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        let wT = req.query.wbs_type || 'All';
        const showAsbl = wT !== 'All' && wT.toLowerCase() !== 'warranty/other';

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);
        
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = getDashboardTableSQL('customer, bu', showAsbl).replace('{{WHERE_CLAUSE}}', whereSql) + " ORDER BY customer ASC";

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getCustomerBuLoaViewTable = async (req, res) => {
    try {
        const { type, allowedCustomers } = req.query;
        let wT = req.query.wbs_type || 'All';
        const showAsbl = wT !== 'All' && wT.toLowerCase() !== 'warranty/other';

        let conditions = ["categories NOT IN ('Not to considered')", "cost_revenue = 'Cost'"];
        let baseParams = [];
        applyRLS(type, allowedCustomers, conditions, baseParams);
        applyDashboardFilters(req.query, conditions, baseParams);
        
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const sql = `
            SELECT customer, bu, loa_id, loa_name,
                   ${showAsbl ? 'ROUND(SUM(type_asbl), 2)' : "'0.00'"} as asbl,
                   ROUND(SUM(type_asbl_loa), 2) as asbl_loa,
                   ROUND(SUM(type_ptd), 2) as ptd,
                   ROUND(SUM(type_oc), 2) as open_commitment,
                   ROUND(SUM(type_nc), 2) as non_committed,
                   ROUND(SUM(type_ptd + type_oc + type_nc), 2) as eac,
                   ROUND(${showAsbl ? 'SUM(type_asbl)' : '0.00'} - SUM(type_ptd + type_oc + type_nc), 2) as eac_vs_asbl
            FROM (
                SELECT customer, bu, loa_id, loa_name, categories, wbs_type,
                       MAX(asbl) as type_asbl, MAX(asbl_loa) as type_asbl_loa,
                       SUM(ptd) as type_ptd, MAX(open_commitment_KEUR) as type_oc, MAX(non_committed_editable) as type_nc
                FROM final_dashboard_table ${whereSql}
                GROUP BY customer, bu, loa_id, loa_name, categories, wbs_type
            ) t 
            WHERE (? = 'All' OR ? = '' OR wbs_type = ?)
            GROUP BY customer, bu, loa_id, loa_name 
            ORDER BY customer ASC`;

        const [rows] = await db.query(sql, [...baseParams, wT, wT, wT]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getReviewChanges = async (req, res) => {
    try {
        const { draw, start, length } = req.query;
        const startIdx = parseInt(start) || 0;
        const limitIdx = parseInt(length) || 100;

        const matrixQuery = `
            SELECT 
                bu, customer, loa_id, loa_name, cost_revenue, categories,
                MAX(asbl) as asbl, 
                MAX(asbl_loa) as asbl_loa, 
                SUM(ptd) as ptd, 
                MAX(open_commitment_KEUR) as open_commitment, 
                MAX(non_committed_editable) as non_committed, 
                MAX(non_committed) as non_committed_original,
                (SUM(ptd) + MAX(open_commitment_KEUR) + MAX(non_committed_editable)) as eac,
                (MAX(asbl) - (SUM(ptd) + MAX(open_commitment_KEUR) + MAX(non_committed_editable))) as eac_vs_asbl
            FROM final_dashboard_table
            WHERE categories != 'Revenue' 
            AND ABS(COALESCE(non_committed, 0) - COALESCE(non_committed_editable, 0)) > 0.01
            GROUP BY bu, customer, loa_id, loa_name, cost_revenue, categories
            ORDER BY loa_name ASC, cost_revenue ASC
        `;

        const [countRes] = await db.query(`SELECT COUNT(*) as total FROM (${matrixQuery}) as temp`);
        const [dataRows] = await db.query(`${matrixQuery} LIMIT ?, ?`, [startIdx, limitIdx]);

        const totalCount = parseInt(countRes[0]?.total || 0);

        res.status(200).json({
            draw: parseInt(draw) || 0,
            recordsTotal: totalCount,
            recordsFiltered: totalCount,
            data: dataRows
        });
    } catch (error) { 
        console.error("getReviewChanges Error:", error);
        res.status(500).json({ error: error.message }); 
    }
};

exports.finalizeChanges = async (req, res) => {
    try {
        // 1. Move editable -> original in Summary Table
        await db.query(`
            UPDATE summary 
            SET non_committed = non_committed_editable,
                non_committed_project = non_committed_editable_project,
                non_committed_amc = non_committed_editable_amc,
                non_committed_warranty = non_committed_editable_warranty
            WHERE ABS(COALESCE(non_committed, 0) - COALESCE(non_committed_editable, 0)) > 0.01
        `);

        // 2. Move editable -> original in Dashboard Table
        await db.query(`
            UPDATE final_dashboard_table 
            SET non_committed = non_committed_editable,
                non_committed_project = non_committed_editable_project,
                non_committed_amc = non_committed_editable_amc,
                non_committed_warranty = non_committed_editable_warranty
            WHERE ABS(COALESCE(non_committed, 0) - COALESCE(non_committed_editable, 0)) > 0.01
        `);

        // 3. Recalculate EAC and Variance globally
        await db.query(`
            UPDATE final_dashboard_table 
            SET eac = (ptd + open_commitment_KEUR + non_committed),
                eac_vs_asbl = (asbl - (ptd + open_commitment_KEUR + non_committed))
        `);

        filterCache.flushAll(); // Flush RAM Cache
        res.status(200).json({ message: "All changes finalized successfully!" });
    } catch (error) {
        console.error("finalizeChanges Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.checkPendingChanges = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT COUNT(*) as count 
            FROM final_dashboard_table 
            WHERE categories != 'Revenue' 
            AND ABS(COALESCE(non_committed, 0) - COALESCE(non_committed_editable, 0)) > 0.01
        `);
        
        const count = parseInt(rows[0]?.count || rows[0]?.total || 0);
        res.status(200).json({ count });
    } catch (error) {
        console.error("checkPendingChanges Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getERPResource = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const search = req.query.search || '';

    const offset = (page - 1) * pageSize;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = `
        WHERE
          tr_global_period ILIKE ?
          OR lm_nokia_id_name ILIKE ?
          OR resource_nokia_id_name ILIKE ?
          OR home_country ILIKE ?
          OR customer_team ILIKE ?
          OR gic_name ILIKE ?
      `;
      const searchValue = `%${search}%`;
      params = [searchValue, searchValue, searchValue, searchValue, searchValue, searchValue];
    }

    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM erp_resource ${whereClause}`,
      params
    );

    const totalRecords = parseInt(countRows[0]?.total || 0);

    const [rows] = await db.query(
      `SELECT * FROM erp_resource ${whereClause} ORDER BY id ASC LIMIT ?, ?`,
      [...params, offset, pageSize]
    );

    res.json({
      data: rows,
      totalRecords,
      page,
      pageSize
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch ERP Resource data'
    });
  }
};

exports.exportERPResource = async (req, res) => {
  try {
    const search = req.query.search || '';
    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = `
        WHERE
          tr_global_period ILIKE ?
          OR lm_nokia_id_name ILIKE ?
          OR resource_nokia_id_name ILIKE ?
          OR home_country ILIKE ?
          OR customer_team ILIKE ?
      `;
      const searchValue = `%${search}%`;
      params = [searchValue, searchValue, searchValue, searchValue, searchValue];
    }

    const [rows] = await db.query(`SELECT * FROM erp_resource ${whereClause} ORDER BY id ASC`, params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ERP Resource');
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'TR Global Period', key: 'tr_global_period', width: 20 },
      { header: 'LM Nokia ID Name', key: 'lm_nokia_id_name', width: 35 },
      { header: 'Home Country', key: 'home_country', width: 20 },
      { header: 'Resource ERP Type', key: 'resource_erp_type', width: 20 },
      { header: 'Resource Person Number', key: 'resource_person_number', width: 20 },
      { header: 'Resource Nokia ID Name', key: 'resource_nokia_id_name', width: 35 },
      { header: 'Time Entry Date', key: 'time_entry_date', width: 20 },
      { header: 'Recorded Hours', key: 'recorded_hours', width: 15 },
      { header: 'Time Entry Status', key: 'time_entry_status', width: 20 },
      { header: 'Daily Working Hours', key: 'daily_working_hours', width: 20 },
      { header: 'TR WBS/Care Contract/Opp', key: 'tr_wbs_care_contract_opp', width: 35 },
      { header: 'TR WBS Description', key: 'tr_wbs_care_contract_opp_description', width: 50 },
      { header: 'SVO ID', key: 'svo_id', width: 20 },
      { header: 'SVO Description', key: 'svo_description', width: 40 },
      { header: 'GIC', key: 'gic', width: 20 },
      { header: 'GIC Name', key: 'gic_name', width: 30 },
      { header: 'Customer Team', key: 'customer_team', width: 30 },
      { header: 'Time Approval Date', key: 'time_approval_date', width: 20 },
      { header: 'LM Email', key: 'lm_email', width: 35 },
      { header: 'Resource Email', key: 'resource_email', width: 35 }
    ];

    rows.forEach(row => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ERP_Resource_${formattedDate}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    res.status(500).json({ message: 'Excel export failed' });
  }
};

const formatSqlDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return typeof val === 'string' && val.trim() !== '' ? val : null;
};

const getValueByAliases = (normalizedRow, aliases) => {
  for (const alias of aliases) {
    if (normalizedRow[alias] !== undefined) return normalizedRow[alias];
    const cleanAlias = alias.replace(/[^a-z0-9]/g, '');
    for (const key of Object.keys(normalizedRow)) {
      const cleanKey = key.replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanAlias) return normalizedRow[key];
    }
  }
  return null;
};

exports.uploadERPResource = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please upload a file' });

    const workbook = XLSX.readFile(req.file.path, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const created_by = req.body.created_by || (req.user && req.user.email) || 'System';
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');

    const erpBatchRows = [];

    for (const row of rows) {
      const normalizedRow = {};
      for (const key of Object.keys(row)) normalizedRow[key.toLowerCase().trim()] = row[key];

      erpBatchRows.push([
        getValueByAliases(normalizedRow, ['tr global period', 'trglobalperiod']),
        getValueByAliases(normalizedRow, ['lm nokia id, name', 'lm nokia id name', 'lmnokiaidname']),
        getValueByAliases(normalizedRow, ['home country', 'homecountry']),
        getValueByAliases(normalizedRow, ['resource erp type', 'resourceerptype']),
        getValueByAliases(normalizedRow, ['resource persn. number', 'resource persn number', 'resource person number', 'resourcepersonnumber']),
        getValueByAliases(normalizedRow, ['resource nokia id, name', 'resource nokia id name', 'resourcenokiaidname']),
        formatSqlDate(getValueByAliases(normalizedRow, ['time entry date', 'timeentrydate'])),
        getValueByAliases(normalizedRow, ['recorded hours', 'recordedhours']),
        getValueByAliases(normalizedRow, ['time entry status', 'timeentrystatus']),
        getValueByAliases(normalizedRow, ['daily working hours', 'dailyworkinghours']),
        getValueByAliases(normalizedRow, ['tr wbs/care contract/opp', 'tr wbs care contract opp', 'trwbscarecontractopp']),
        getValueByAliases(normalizedRow, ['tr wbs/care contract/opp description', 'tr wbs care contract opp description', 'trwbscarecontractoppdescription']),
        getValueByAliases(normalizedRow, ['svo id', 'svoid']),
        getValueByAliases(normalizedRow, ['svo description', 'svodescription']),
        getValueByAliases(normalizedRow, ['gic']),
        getValueByAliases(normalizedRow, ['gic name', 'gicname']),
        getValueByAliases(normalizedRow, ['ct (customer team)', 'ct customer team', 'customer team', 'ct', 'customerteam']),
        formatSqlDate(getValueByAliases(normalizedRow, ['time approval date', 'timeapprovaldate'])),
        getValueByAliases(normalizedRow, ['lm email', 'lmemail']),
        getValueByAliases(normalizedRow, ['resource email', 'resourceemail']),
        currentMonth,
        created_by
      ]);
    }

    if (erpBatchRows.length > 0) {
        await db.query(
            `INSERT INTO erp_resource 
            (tr_global_period, lm_nokia_id_name, home_country, resource_erp_type, resource_person_number, resource_nokia_id_name, time_entry_date, recorded_hours, time_entry_status, daily_working_hours, tr_wbs_care_contract_opp, tr_wbs_care_contract_opp_description, svo_id, svo_description, gic, gic_name, customer_team, time_approval_date, lm_email, resource_email, month, created_by) 
            VALUES ?`,
            [erpBatchRows]
        );
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, uploadedRows: rows.length, month: currentMonth });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Upload failed: ' + err.message });
  }
};