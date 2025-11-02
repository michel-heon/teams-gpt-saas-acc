const sql = require('mssql');
const config = {
    server: process.env.SAAS_DB_SERVER,
    database: process.env.SAAS_DB_NAME,
    authentication: { type: 'azure-active-directory-default' },
    options: { encrypt: true }
};

async function check() {
    const pool = await sql.connect(config);
    const result = await pool.query`
        SELECT TOP 1 * FROM MeteredAuditLogs ORDER BY CreatedDate DESC
    `;
    console.log('Colonnes disponibles:', Object.keys(result.recordset[0]));
    await pool.close();
}
check();
