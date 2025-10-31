/**
 * Script pour interroger le schéma de la base de données
 * Récupère les colonnes des tables principales du SaaS Accelerator
 */

require('dotenv').config({ path: './env/.env.dev' });

const saasIntegration = require('../services/saasIntegration');

async function querySchema() {
    console.log('\n=== Database Schema Query ===\n');
    
    await saasIntegration.initialize();
    
    if (!saasIntegration.pool) {
        console.error('Failed to connect to database');
        return;
    }

    // Récupérer les colonnes de la table Subscriptions
    console.log('Table: Subscriptions');
    const subsResult = await saasIntegration.pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Subscriptions' 
        ORDER BY ORDINAL_POSITION
    `);
    console.table(subsResult.recordset);

    // Récupérer la signature de la procédure stockée
    console.log('\nStored Procedure: sp_LinkTeamsUserToSubscription');
    const spResult = await saasIntegration.pool.request().query(`
        SELECT 
            PARAMETER_NAME,
            DATA_TYPE,
            PARAMETER_MODE,
            CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.PARAMETERS
        WHERE SPECIFIC_NAME = 'sp_LinkTeamsUserToSubscription'
        ORDER BY ORDINAL_POSITION
    `);
    console.table(spResult.recordset);

    await saasIntegration.close();
    console.log('\n=== Query completed ===\n');
}

querySchema().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
