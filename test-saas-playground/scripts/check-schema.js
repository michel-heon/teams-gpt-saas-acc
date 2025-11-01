// scripts/check-schema.js
const sql = require('mssql');
const config = require('../../src/config');

async function checkSchema() {
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
        
        // Interroger le schéma de la table Plans
        const result = await pool.request().query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Plans'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('\n📋 Colonnes de la table Plans:');
        console.log('');
        result.recordset.forEach(col => {
            const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
            const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`  ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE}${length.padEnd(10)} ${nullable}`);
        });
        
        console.log('');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

checkSchema();
