const sql = require('mssql');

const config = {
    server: process.env.SAAS_DB_SERVER,
    database: process.env.SAAS_DB_NAME,
    authentication: { type: 'azure-active-directory-default' },
    options: { encrypt: true, trustServerCertificate: false }
};

async function checkAggregation() {
    console.log('🔍 Vérification de l\'agrégation horaire Marketplace\n');
    
    try {
        const pool = await sql.connect(config);
        
        // Vérifier les événements dans MeteredAuditLogs
        console.log('📊 Événements dans MeteredAuditLogs:\n');
        const events = await pool.query`
            SELECT 
                CONVERT(varchar, CreatedDate, 120) as DateTime,
                DATEPART(hour, CreatedDate) as Hour,
                SubscriptionId,
                PlanId,
                Dimension,
                Quantity,
                StatusCode,
                CASE 
                    WHEN ResponseJson IS NOT NULL AND ResponseJson != '' THEN 'Oui'
                    ELSE 'Non'
                END as HasResponse
            FROM MeteredAuditLogs
            ORDER BY CreatedDate DESC
        `;
        
        console.table(events.recordset);
        
        // Grouper par heure
        console.log('\n📈 Agrégation par heure:\n');
        const hourly = await pool.query`
            SELECT 
                DATEPART(year, CreatedDate) as Year,
                DATEPART(month, CreatedDate) as Month,
                DATEPART(day, CreatedDate) as Day,
                DATEPART(hour, CreatedDate) as Hour,
                COUNT(*) as MessageCount,
                SUM(Quantity) as TotalQuantity,
                COUNT(CASE WHEN ResponseJson IS NOT NULL AND ResponseJson != '' THEN 1 END) as WithAPIResponse
            FROM MeteredAuditLogs
            GROUP BY 
                DATEPART(year, CreatedDate),
                DATEPART(month, CreatedDate),
                DATEPART(day, CreatedDate),
                DATEPART(hour, CreatedDate)
            ORDER BY Year DESC, Month DESC, Day DESC, Hour DESC
        `;
        
        console.table(hourly.recordset);
        
        // Vérifier l'heure actuelle
        const now = new Date();
        const currentHour = now.getHours();
        console.log(`\n⏰ Heure actuelle: ${now.toISOString()}`);
        console.log(`   Heure locale: ${currentHour}h`);
        
        // Compter les messages de l'heure en cours
        const currentHourEvents = await pool.query`
            SELECT COUNT(*) as Count
            FROM MeteredAuditLogs
            WHERE DATEPART(hour, CreatedDate) = ${currentHour}
              AND CAST(CreatedDate AS DATE) = CAST(GETDATE() AS DATE)
        `;
        
        console.log(`\n📌 Messages dans l'heure en cours (${currentHour}h): ${currentHourEvents.recordset[0].Count}`);
        console.log(`   ⚠️  Ces messages seront agrégés et émis à la FIN de l'heure (${currentHour}:59)`);
        
        // Vérifier s'il y a des heures complètes non émises
        const completeHours = await pool.query`
            SELECT 
                DATEPART(hour, CreatedDate) as Hour,
                COUNT(*) as MessageCount,
                COUNT(CASE WHEN ResponseJson IS NOT NULL AND ResponseJson != '' THEN 1 END) as EmittedCount
            FROM MeteredAuditLogs
            WHERE CAST(CreatedDate AS DATE) = CAST(GETDATE() AS DATE)
              AND DATEPART(hour, CreatedDate) < ${currentHour}
            GROUP BY DATEPART(hour, CreatedDate)
            ORDER BY Hour DESC
        `;
        
        if (completeHours.recordset.length > 0) {
            console.log('\n⏳ Heures complètes (devraient être émises):\n');
            console.table(completeHours.recordset);
            
            const notEmitted = completeHours.recordset.filter(h => h.EmittedCount === 0);
            if (notEmitted.length > 0) {
                console.log('\n⚠️  ATTENTION: Heures complètes NON émises vers l\'API:');
                notEmitted.forEach(h => {
                    console.log(`   - ${h.Hour}h: ${h.MessageCount} messages (0 émis)`);
                });
            }
        }
        
        await pool.close();
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        process.exit(1);
    }
}

checkAggregation().then(() => process.exit(0));
