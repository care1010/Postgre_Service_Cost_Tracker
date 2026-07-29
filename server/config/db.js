const { Pool } = require('pg');
const pgFormat = require('pg-format');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'service_cost',
    port: parseInt(process.env.DB_PORT) || 5432,
    max: 150,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000, // FIX 1: Sync ke waqt wait karega, timeout nahi hoga
});

// FIX 2: Idle clients ke auto-disconnect ko safely handle karna (Console crash nahi hoga)
pool.on('error', (err, client) => {
    console.log('⚡ PostgreSQL Idle Client auto-reconnected gracefully.');
});

// UNIVERSAL MYSQL -> POSTGRES TRANSLATOR (v7.0 - Double Quotes Conflict Fixed)
const formatQuery = (sql, params = []) => {
    let text = sql.replace(/`/g, '');

    // FIX: Smart Auto-Quoting (Ignores if quotes already exist!)
    text = text.replace(/"?Merged_wbs_categories"?/gi, '"Merged_wbs_categories"');
    text = text.replace(/"?Merged_wbs_category"?/gi, '"Merged_wbs_category"');
    text = text.replace(/"?open_commitment_KEUR"?/gi, '"open_commitment_KEUR"');
    text = text.replace(/\bREGEXP\b/gi, '~');

    let newParams = [...params];

    // 1. BULK INSERT INTERCEPTOR (Excel Uploads)
    if (/VALUES\s*\?/i.test(text) && Array.isArray(newParams) && newParams.length > 0 && Array.isArray(newParams[0])) {
        const bulkValues = newParams[0]; 
        const formattedValues = pgFormat('VALUES %L', bulkValues);
        text = text.replace(/VALUES\s*\?/i, formattedValues);
        newParams = newParams.slice(1); 
    }

    // 2. MYSQL COMMA-BASED LIMIT INTERCEPTOR (LIMIT ?, ?)
    if (/LIMIT\s*\?\s*,\s*\?/i.test(text)) {
        const limitVal = parseInt(newParams.pop()) || 100;
        const offsetVal = parseInt(newParams.pop()) || 0;
        text = text.replace(/LIMIT\s*\?\s*,\s*\?/i, `LIMIT ${limitVal} OFFSET ${offsetVal}`);
    }

    // 3. PARSE SQL AND CONVERT PLACEHOLDERS (? -> $1, $2)
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
            const currentParam = newParams[paramIdx++];

            if (Array.isArray(currentParam)) {
                if (currentParam.length === 0) {
                    formattedSql += 'NULL';
                } else {
                    const placeholders = currentParam.map(() => `$${index++}`).join(', ');
                    formattedSql += placeholders;
                }
            } else {
                formattedSql += `$${index++}`;
            }
        } else {
            formattedSql += char;
        }
    }

    // Flatten array parameters for Postgres (Handles IN (?) arrays)
    const flattenedParams = [];
    for (let p of newParams) {
        if (Array.isArray(p)) {
            flattenedParams.push(...p);
        } else {
            flattenedParams.push(p);
        }
    }

    return { sql: formattedSql, params: flattenedParams };
};

const db = {
    query: async (sql, params = []) => {
        const { sql: pgSql, params: pgParams } = formatQuery(sql, params);
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
                const { sql: pgSql, params: pgParams } = formatQuery(sql, params);
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