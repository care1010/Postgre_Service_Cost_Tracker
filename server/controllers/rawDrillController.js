const db = require('../config/db');
const ExcelJS = require('exceljs');

// Helper for filters (Shared logic)
const buildRawFilters = (reqQuery, conditions, params) => {
    const filterMap = {
        'bu': 'bu',
        'customer': 'customer',
        'loa_id': 'loa_id',
        'wbs_type': 'wbs_type',
        'period': 'period'
    };
    Object.keys(filterMap).forEach(key => {
        let val = reqQuery[key];
        if (val && val !== 'All') {
            const vals = Array.isArray(val) ? val : val.split(',');
            const cleaned = vals.filter(v => v !== 'All' && v !== '');
            if (cleaned.length > 0) {
                conditions.push(`TRIM(LOWER(${filterMap[key]})) IN (?)`);
                params.push(cleaned.map(v => v.trim().toLowerCase()));
            }
        }
    });
};

exports.getRawData = async (req, res) => {
    try {
        const { tableType, start, length, draw } = req.query;
        const tableName = tableType === 'cj74' ? 't_cj74_transformed' : 't_cji5_transformed';
        let conditions = ["1=1"];
        let params = [];
        buildRawFilters(req.query, conditions, params);

        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        const [rows] = await db.query(`SELECT * FROM ${tableName} ${whereClause} LIMIT ? OFFSET ?`, [...params, parseInt(length) || 50, parseInt(start) || 0]);
        const [total] = await db.query(`SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`, params);

        res.status(200).json({ draw, recordsTotal: total[0].total, recordsFiltered: total[0].total, data: rows });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.exportRawData = async (req, res) => {
    try {
        const { tableType } = req.query;
        const tableName = tableType === 'cj74' ? 't_cj74_transformed' : 't_cji5_transformed';
        let conditions = ["1=1"];
        let params = [];
        buildRawFilters(req.query, conditions, params);

        const [rows] = await db.query(`SELECT * FROM ${tableName} WHERE ${conditions.join(' AND ')}`, params);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Raw_Data_${tableType}.xlsx`);
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
        const worksheet = workbook.addWorksheet('Data');
        if (rows.length > 0) {
            worksheet.columns = Object.keys(rows[0]).map(key => ({ header: key.toUpperCase(), key, width: 20 }));
            rows.forEach(row => worksheet.addRow(row).commit());
        }
        await workbook.commit();
    } catch (error) { res.status(500).send("Export failed"); }
};