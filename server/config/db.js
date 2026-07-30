const { Pool } = require('pg');
const pgFormat = require('pg-format');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 🚀 ENTERPRISE POOLING FOR 100 CONCURRENT USERS
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'service_cost',
    port: parseInt(process.env.DB_PORT) || 5432,
    
    max: 150, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 10000, 
    maxUses: 7500, 
});

pool.on('error', (err, client) => {
    console.error('⚡ PostgreSQL Pool Error (Safe Auto-Reconnect):', err.message);
});

// 🚀 FOOLPROOF QUERY PARSER (1:1 Value Mapping to prevent Parameter Count Mismatch)
const formatQueryToPostgres = (sql, params = []) => {
    let text = sql.replace(/`/g, '');
    text = text.replace(/"?Merged_wbs_categories"?/gi, '"Merged_wbs_categories"');
    text = text.replace(/"?Merged_wbs_category"?/gi, '"Merged_wbs_category"');
    text = text.replace(/"?open_commitment_KEUR"?/gi, '"open_commitment_KEUR"');
    text = text.replace(/\bREGEXP\b/gi, '~');

    let newParams = [...params];

    if (/VALUES\s*\?/i.test(text) && Array.isArray(newParams) && newParams.length > 0 && Array.isArray(newParams[0])) {
        const bulkValues = newParams[0]; 
        const formattedValues = pgFormat('VALUES %L', bulkValues);
        text = text.replace(/VALUES\s*\?/i, formattedValues);
        newParams = newParams.slice(1); 
    }

    if (/LIMIT\s*\?\s*,\s*\?/i.test(text)) {
        const limitVal = parseInt(newParams.pop()) || 100;
        const offsetVal = parseInt(newParams.pop()) || 0;
        text = text.replace(/LIMIT\s*\?\s*,\s*\?/i, `LIMIT ${limitVal} OFFSET ${offsetVal}`);
    }

    // 🔥 FIX: Inline flat parameter generation for exact match with $1, $2, $3
    const flatParams = [];
    let index = 1;
    let inSingleQuote = false;
    let paramIdx = 0;
    let formattedSql = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === "'") {
            if (i + 1 < text.length && text[i + 1] === "'") {
                formattedSql += "''";
                i++;
                continue;
            }
            inSingleQuote = !inSingleQuote;
            formattedSql += char;
        } else if (char === '?' && !inSingleQuote) {
            const val = newParams[paramIdx++];
            if (Array.isArray(val)) {
                if (val.length === 0) {
                    formattedSql += 'NULL';
                } else {
                    const placeholders = [];
                    for (const v of val) {
                        placeholders.push(`$${index++}`);
                        flatParams.push(v); // Adds value precisely when $ is generated
                    }
                    formattedSql += placeholders.join(', ');
                }
            } else {
                formattedSql += `$${index++}`;
                flatParams.push(val);
            }
        } else {
            formattedSql += char;
        }
    }

    return { sql: formattedSql, params: flatParams };
};

const db = {
    query: async (sql, params = []) => {
        const { sql: pgSql, params: pgParams } = formatQueryToPostgres(sql, params);
        const res = await pool.query(pgSql, pgParams);
        const rows = res.rows;
        rows.affectedRows = res.rowCount; 
        rows.insertId = res.rows[0]?.id || null;
        return [rows, res.fields || []];
    },

    getConnection: async () => {
        const client = await pool.connect();
        return {
            query: async (sql, params = []) => {
                const { sql: pgSql, params: pgParams } = formatQueryToPostgres(sql, params);
                const res = await client.query(pgSql, pgParams);
                const rows = res.rows;
                rows.affectedRows = res.rowCount;
                rows.insertId = res.rows[0]?.id || null;
                return [rows, res.fields || []];
            },
            beginTransaction: () => client.query('BEGIN'),
            commit: () => client.query('COMMIT'),
            rollback: () => client.query('ROLLBACK'),
            release: () => client.release(),
        };
    }
};

module.exports = db;