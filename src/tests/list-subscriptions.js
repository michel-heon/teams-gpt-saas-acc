/**
 * Liste les abonnements existants dans la base de données
 */

require('dotenv').config({ path: './env/.env.dev' });

const saasIntegration = require('../services/saasIntegration');

async function listSubscriptions() {
    console.log('\n=== Liste des abonnements ===\n');
    
    await saasIntegration.initialize();
    
    if (!saasIntegration.pool) {
        console.error('Failed to connect to database');
        return;
    }

    const result = await saasIntegration.pool.request().query(`
        SELECT TOP 10
            Id,
            AMPSubscriptionId,
            Name,
            AMPPlanId,
            SubscriptionStatus,
            IsActive,
            TeamsUserId,
            TenantId,
            CreateDate
        FROM [dbo].[Subscriptions]
        ORDER BY CreateDate DESC
    `);

    console.table(result.recordset);
    console.log(`\nTotal: ${result.recordset.length} subscription(s) found\n`);

    await saasIntegration.close();
}

listSubscriptions().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
