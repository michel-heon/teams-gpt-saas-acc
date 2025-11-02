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
        SELECT 
            DATEPART(hour, CreatedDate) as Hour,
            COUNT(*) as MessageCount,
            MIN(CreatedDate) as FirstMessage,
            MAX(CreatedDate) as LastMessage,
            COUNT(CASE WHEN ResponseJson IS NOT NULL AND ResponseJson != '' THEN 1 END) as WithAPIResponse
        FROM MeteredAuditLogs
        WHERE CAST(CreatedDate AS DATE) = CAST(GETDATE() AS DATE)
        GROUP BY DATEPART(hour, CreatedDate)
        ORDER BY Hour
    `;
    
    console.log('📊 Messages par heure aujourd\'hui:\n');
    console.table(result.recordset);
    
    const now = new Date();
    const currentHour = now.getUTCHours();
    console.log(`\n⏰ Heure actuelle UTC: ${currentHour}h`);
    console.log(`   Locale (timezone serveur): ${now.toString()}`);
    
    await pool.close();
}
check();
