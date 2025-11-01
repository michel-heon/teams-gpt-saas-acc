// scripts/check-tables.js
const sql = require('mssql');
const config = require('../../src/config');

async function checkTables() {
    try {
        const dbConfig = {
            server: config.saas.dbServer,
            database: config.saas.dbName,
            authentication: {
                type: 'azure-active-directory-default'
            },
            options: {
                encrypt: true,
                enableArithAbort: true,
                trustServerCertificate: false
            }
        };
        
        console.log(`🔗 Connexion à ${config.saas.dbServer}/${config.saas.dbName}...`);
        const pool = await sql.connect(dbConfig);
        
        // Lister toutes les tables
        const tables = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        console.log('\n📋 Tables disponibles:');
        console.log('');
        tables.recordset.forEach(t => {
            console.log(`  - ${t.TABLE_NAME}`);
        });
        
        // Chercher les tables liées aux dimensions
        console.log('\n🔍 Recherche de tables de dimensions/pricing...');
        const dimensionTables = tables.recordset.filter(t => 
            t.TABLE_NAME.toLowerCase().includes('dimension') ||
            t.TABLE_NAME.toLowerCase().includes('metered') ||
            t.TABLE_NAME.toLowerCase().includes('price')
        );
        
        if (dimensionTables.length > 0) {
            console.log('Trouvé:');
            for (const t of dimensionTables) {
                console.log(`\n📊 ${t.TABLE_NAME}:`);
                const cols = await pool.request().query(`
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = '${t.TABLE_NAME}'
                    ORDER BY ORDINAL_POSITION
                `);
                cols.recordset.forEach(c => {
                    console.log(`   - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
                });
            }
        }
        
        console.log('');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

checkTables();
