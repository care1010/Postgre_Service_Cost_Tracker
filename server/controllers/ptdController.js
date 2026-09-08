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

        // 🔥 1. Fetch all valid cost elements from master table
        const [validCE] = await db.query("SELECT cost_element FROM master_cost_element");
        const validCESet = new Set(validCE.map(r => String(r.cost_element).trim()));
        const OTHER_CE = "64830010"; // "Other" category code

        let affectedLoas = new Set();
        const batchSize = 500; // Optimal for memory
        let detectedPeriods = new Set(); // 🔥 Period tracking

        // ==========================================
        // --- 1. CJI5 SHEET PROCESSING ---
        // ==========================================
        if (sheetNames.includes('CJI5')) {
            const cji5Data = xlsx.utils.sheet_to_json(workbook.Sheets['CJI5']);
            await db.query("TRUNCATE TABLE cji5_new");

            const cji5Rows = cji5Data.filter(row => row['WBS Element']).map(row => {
                if (row['LOA_ID']) affectedLoas.add(row['LOA_ID'].toString().trim());

                // 🔥 NAYA: Mapping Logic for CJI5
                let currentCE = String(row['Cost elem.'] || '').trim();
                // Agar Excel ka CE master table mein nahi hai, toh usey 'Other' bana do
                if (currentCE && !validCESet.has(currentCE)) {
                    currentCE = OTHER_CE;
                }

                return [
                    row['Project Def.'], row['WBS Element'], row['RefDocNo'], row['Item'],
                    row['CO object name'], row['Supplier'], row['Name'], row['Year'],
                    row['Per'],
                    currentCE, // 🔥 Use mapped CE here
                    row['Cost element descr.'], row['Matl Group'],
                    row['Material'], row['Description'], row['User Name'], row['DocC'],
                    row['CoCode'], row['Exch. Rate'], row['Quantity'], row['Qty/plan'],
                    formatExcelDate(row['Debit date']), formatExcelDate(row['Doc. Date']),
                    row['Report currency'], row['Val.in rep.cur.'], row['TCurr'], row['Value TCur'], 
                    row['Obj Curr.'], row['Value in Obj. Crcy']
                ];
            });

            for (let i = 0; i < cji5Rows.length; i += batchSize) {
                // 🔥 Bypass db.js parser by formatting here
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

            const cj74Rows = cj74Data.filter(row => row['Object']).map(row => {
                if (row['LOA_ID']) affectedLoas.add(row['LOA_ID'].toString().trim());

                // 🔥 NAYA: Mapping Logic for CJ74
                let currentCE = String(row['Cost Element'] || '').trim();
                // Check against valid set
                if (currentCE && !validCESet.has(currentCE)) {
                    currentCE = OTHER_CE;
                }

                // 🔥 FIXED: Period capture logic ab loop ke ANDAR hai jahan 'row' defined hai
                const pValRaw = row['Per'] || row['per'] || row['PER'];
                if (pValRaw) {
                    const pClean = pValRaw.toString().trim().padStart(3, '0');
                    detectedPeriods.add(`P${pClean}`);
                }

                return [
                    row['CoCd'], row['Year'], row['Per'], row['Project def.'], 
                    row['Object'], row['Object'], row['Object'], row['Profit Ctr'], 
                    currentCE, // 🔥 Use mapped CE here
                    row['Cost element name'], row['Cost element descr.'], 
                    row['Pur. Doc.'], row['Purchase order text'], row['DocumentNo'], 
                    row['Material'], row['Material Description'], row['Name'], row['RefDocNo'], 
                    row['frm'], row['User Name'], row['Offst.acct'], row['Name of offsetting account'], 
                    row['Quantity'], formatExcelDate(row['Created on']), formatExcelDate(row['Postg Date']), 
                    formatExcelDate(row['Doc. Date']), row['TCurr'], row['Value TranCurr'], 
                    row['ObCur'], row['Value in Obj. Crcy'], row['RCurr'], row['Val.in RC']
                ];
            });

            for (let i = 0; i < cj74Rows.length; i += batchSize) {
                const sql = pgFormat(`INSERT INTO cj74_new (cocd, year, per, proj_def, object_1, object_2, object_3, profit_ctr, cost_element, cost_element_name, cost_element_descr, pur_doc, purchase_order_text, document_no, material, material_description, name1, refdocno, frm, user_name, offst_acct, name_of_offsetting_account, quantity, created_on, postg_date, doc_date, tcurr, value_trancurr, obcur, val_in_obj_crcy, rcurr, val_in_rc) VALUES %L`, cj74Rows.slice(i, i + batchSize));
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
        let periodArray = Array.from(detectedPeriods);
        console.log("🔍 [PTD]: Fetching all active users for notification...");

        // Fallback logic for period
        if (periodArray.length === 0) {
            const curMonth = (new Date().getMonth() + 1).toString().padStart(3, '0');
            periodArray.push(`P${curMonth}`);
        }

        try {
            // 1. Latest Period calculate karein
            const maxPeriodNum = Math.max(...periodArray.map(p => parseInt(p.replace('P', ''))));
            const finalPeriodCode = `P${maxPeriodNum.toString().padStart(3, '0')}`;

            // 2. 🔥 NAYA: Database se saare active users ki email list nikalon
            const [userRows] = await db.query("SELECT email FROM users WHERE is_active = '1'");
            const allUserEmails = userRows.map(u => u.email).filter(Boolean);

            if (allUserEmails.length > 0) {
                console.log(`📧 [PTD]: Sending mail to ${allUserEmails.length} users:`, allUserEmails);
                
                // 3. Sabhi users ko mail bhejein (recipientEmails array pass hoga)
                await mailService.sendPTDUpdateAlert(allUserEmails, finalPeriodCode);
                console.log(`✅ [PTD]: Success! Mail sent to all stakeholders for ${finalPeriodCode}`);

                // 4. Reminder entry for 7 days later
                await db.query(
                    `INSERT INTO pending_ptd_reminders (period_code, scheduled_at, status) 
                    VALUES (?, CURRENT_TIMESTAMP + interval '7 days', 'pending')`, 
                    [finalPeriodCode]
                );
            } else {
                console.log("⚠️ [PTD]: No active users found in database. Mail not sent.");
            }

        } catch (mailErr) {
            console.error("❌ [PTD] Mail Error:", mailErr.message);
        }


        triggerAutoSync('ptd_uploaded');

        res.status(200).json({ message: "Everything Uploaded and Synced Successfully!" });
    } catch (error) { 
        console.error("PTD ERROR:", error); 
        res.status(500).json({ error: error.message }); 
    }
};

