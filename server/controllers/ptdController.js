const db = require('../config/db');
const xlsx = require('xlsx');
const pgFormat = require('pg-format');
const { triggerAutoSync } = require('./cronController');
const mailService = require('../services/mailService');

const formatExcelDate = (excelDate) => {
    if (!excelDate) return null;
    if (typeof excelDate === 'number') {
        const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    return excelDate;
};

exports.uploadPtdData = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        const workbook = xlsx.readFile(req.file.path, { cellDates: true });
        const sheetNames = workbook.SheetNames;

        // 🔥 REMOVED: master_cost_element check and OTHER_CE hardcoding

        let affectedLoas = new Set();
        const batchSize = 500; 
        let detectedPeriods = new Set(); 

        // ==========================================
        // --- 1. CJI5 SHEET PROCESSING ---
        // ==========================================
        if (sheetNames.includes('CJI5')) {
            const cji5Data = xlsx.utils.sheet_to_json(workbook.Sheets['CJI5']);
            await db.query("TRUNCATE TABLE cji5_new");

            const cji5Rows = cji5Data.filter(row => row['WBS Element']).map(row => {
                if (row['LOA_ID']) affectedLoas.add(row['LOA_ID'].toString().trim());

                // 🔥 FIXED: Direct raw value from Excel, no mapping/replacement
                const currentCE = String(row['Cost elem.'] || '').trim();

                return [
                    row['Project Def.'], row['WBS Element'], row['RefDocNo'], row['Item'],
                    row['CO object name'], row['Supplier'], row['Name'], row['Year'],
                    row['Per'],
                    currentCE, // RAW Cost Element
                    row['Cost element descr.'], row['Matl Group'],
                    row['Material'], row['Description'], row['User Name'], row['DocC'],
                    row['CoCode'], row['Exch. Rate'], row['Quantity'], row['Qty/plan'],
                    formatExcelDate(row['Debit date']), formatExcelDate(row['Doc. Date']),
                    row['Report currency'], row['Val.in rep.cur.'], row['TCurr'], row['Value TCur'], 
                    row['Obj Curr.'], row['Value in Obj. Crcy']
                ];
            });

            for (let i = 0; i < cji5Rows.length; i += batchSize) {
                const sql = pgFormat(`INSERT INTO cji5_new (project_def, wbs_element, refdocno, item, co_object_name, supplier, name, year, per, cost_element, cost_element_descr, matl_group, material, description, user_name, docc, cocode, exch_rate, quantity, qty_plan, debit_date, doc_date, report_currency, val_in_rep_cur, tcurr, value_tcur, obj_curr, value_in_obj_crcy) VALUES %L`, cji5Rows.slice(i, i + batchSize));
                await db.query(sql); 
            }
            console.log("✅ CJI5 Batches Uploaded");
        }

        // ==========================================
        // --- 2. CJ74 SHEET PROCESSING ---
        // ==========================================
        if (sheetNames.includes('CJ74')) {
            const cj74Data = xlsx.utils.sheet_to_json(workbook.Sheets['CJ74']);

            // 🔥 NAYA: Current Upload Month-Year generate karo (e.g., "Sep-2026")
            const uploadTimestamp = new Date().toLocaleString('en-US', { month: 'short' }) + '-' + new Date().getFullYear();

            const cj74Rows = cj74Data.filter(row => row['Object']).map(row => {
                if (row['LOA_ID']) affectedLoas.add(row['LOA_ID'].toString().trim());

                // 🔥 FIXED: Direct raw value from Excel, no mapping/replacement
                const currentCE = String(row['Cost Element'] || '').trim();

                const pValRaw = row['Per'] || row['per'] || row['PER'];
                if (pValRaw) {
                    const pClean = pValRaw.toString().trim().padStart(3, '0');
                    detectedPeriods.add(`P${pClean}`);
                }

                return [
                    row['CoCd'], row['Year'], row['Per'], row['Project def.'], 
                    row['Object'], row['Object'], row['Object'], row['Profit Ctr'], 
                    currentCE, // RAW Cost Element
                    row['Cost element name'], row['Cost element descr.'], 
                    row['Pur. Doc.'], row['Purchase order text'], row['DocumentNo'], 
                    row['Material'], row['Material Description'], row['Name'], row['RefDocNo'], 
                    row['frm'], row['User Name'], row['Offst.acct'], row['Name of offsetting account'], 
                    row['Quantity'], formatExcelDate(row['Created on']), formatExcelDate(row['Postg Date']), 
                    formatExcelDate(row['Doc. Date']), row['TCurr'], row['Value TranCurr'], 
                    row['ObCur'], row['Value in Obj. Crcy'], row['RCurr'], row['Val.in RC'], uploadTimestamp // 🔥 Naya data added to the row array
                ];
            });

            for (let i = 0; i < cj74Rows.length; i += batchSize) {
                const sql = pgFormat(`INSERT INTO cj74_new (cocd, year, per, proj_def, object_1, object_2, object_3, profit_ctr, cost_element, cost_element_name, cost_element_descr, pur_doc, purchase_order_text, document_no, material, material_description, name1, refdocno, frm, user_name, offst_acct, name_of_offsetting_account, quantity, created_on, postg_date, doc_date, tcurr, value_trancurr, obcur, val_in_obj_crcy, rcurr, val_in_rc, upload_month_year) VALUES %L`, cj74Rows.slice(i, i + batchSize));
                await db.query(sql);
                console.log(`📦 CJ74: Batch ${Math.floor(i/batchSize) + 1} Done`);
            }
        }

        // ==========================================
        // --- 3. FINAL DASHBOARD SYNC (Safe & Strict) ---
        // ==========================================
        const loaList = Array.from(affectedLoas).filter(id => id);

        if (loaList.length > 0) {
            // 🔥 NEW LOGIC: Humne Views ko nahi chheda, bas unse data lene ka tarika badal diya
            const syncSql = pgFormat(`
                UPDATE final_dashboard_table f
                SET ptd = COALESCE(src.ptd_sum, 0),
                    "open_commitment_KEUR" = COALESCE(src.oc_sum, 0),
                    eac = (COALESCE(src.ptd_sum, 0) + COALESCE(src.oc_sum, 0) + f.non_committed_editable),
                    eac_vs_asbl = (f.asbl - (COALESCE(src.ptd_sum, 0) + COALESCE(src.oc_sum, 0) + f.non_committed_editable))
                FROM (
                    SELECT 
                        agg.loa_id, 
                        agg.final_category as categories, 
                        SUM(agg.ptd_val) as ptd_sum, 
                        SUM(agg.oc_val) as oc_sum
                    FROM (
                        -- A. CJ74 se data lo aur unknown ko 'Other' mark karo
                        SELECT 
                            loa_id, 
                            COALESCE(NULLIF(categories, ''), 'Other') as final_category, 
                            ptd_val, 
                            0 as oc_val
                        FROM v_cj74_transformed
                        WHERE loa_id IN (%L)

                        UNION ALL

                        -- B. CJI5 se data lo aur unknown ko 'Other' mark karo
                        SELECT 
                            loa_id, 
                            COALESCE(NULLIF(categories, ''), 'Other') as final_category, 
                            0 as ptd_val, 
                            open_commitment_keur as oc_val
                        FROM v_cji5_transformed
                        WHERE loa_id IN (%L)
                    ) agg
                    GROUP BY agg.loa_id, agg.final_category
                ) src
                WHERE f.loa_id = src.loa_id AND f.categories = src.categories
            `, loaList, loaList); // 🔥 loaList do baar pass hogi kyunki UNION mein 2 placeholders hain

            await db.query(syncSql);
            console.log("✅ Dashboard Sync Completed (Unknown elements mapped to 'Other')");
        }

        // ==========================================
        // --- 4. 🔥 PRODUCTION AUTO-MAILER TRIGGER ---
        // ==========================================
        try {
            console.log("📧 [PTD]: Preparing notification for last month...");

            // 1. 🔥 SIMPLE LOGIC: Hamesha aaj se pichle mahine ka Period code banao
            const today = new Date();
            // getMonth() 0-based hota hai (Sept is 8). 
            // Agar Sept (8) chal raha hai, toh prevMonthNum = 8, yaani "P008"
            let prevMonthNum = today.getMonth(); 
            if (prevMonthNum === 0) prevMonthNum = 12; // Jan mein upload ho toh Dec (12) ka data
            
            const finalPeriodCode = `P${prevMonthNum.toString().padStart(3, '0')}`;
            console.log(`🔍 [PTD]: Generated reporting period: ${finalPeriodCode}`);

            // 2. Database se saare active users ki list
            const [userRows] = await db.query("SELECT email FROM users WHERE is_active = '1'");
            const allUserEmails = userRows.map(u => u.email).filter(Boolean);

            if (allUserEmails.length > 0) {
                // 3. Immediate Alert (All Users)
                await mailService.sendPTDUpdateAlert(allUserEmails, finalPeriodCode);
                console.log(`✅ [PTD]: Success! Notification sent for ${finalPeriodCode}`);

                // 4. Reminder entry for 7 days later
                // Isme bhi ab finalPeriodCode (P008) hi jayega, toh reminder b sahi jayega
                await db.query(
                    `INSERT INTO pending_ptd_reminders (period_code, scheduled_at, status) 
                    VALUES (?, CURRENT_TIMESTAMP + interval '7 days', 'pending')`, 
                    [finalPeriodCode]
                );
            }
        } catch (mailErr) {
            console.error("❌ [PTD] Mail Error:", mailErr.message);
        }


        triggerAutoSync('ptd_uploaded');

        res.status(200).json({ message: "Data Submitted! Data will be refreshed in 5 minutes." });
    } catch (error) { 
        console.error("PTD ERROR:", error); 
        res.status(500).json({ error: error.message }); 
    }
};

