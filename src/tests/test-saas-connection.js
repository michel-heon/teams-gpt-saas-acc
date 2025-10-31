/**
 * Script de test pour la connexion SaaS Accelerator
 * Teste la connexion à Azure SQL et la procédure sp_LinkTeamsUserToSubscription
 * 
 * Usage: node src/tests/test-saas-connection.js
 */

require('dotenv').config({ path: './env/.env.dev' });

const saasIntegration = require('../services/saasIntegration');
const config = require('../config');

async function runTests() {
    console.log('\n=== Test de connexion SaaS Accelerator ===\n');
    
    console.log('Configuration:');
    console.log(`  Server: ${config.saas.dbServer}`);
    console.log(`  Database: ${config.saas.dbName}`);
    console.log(`  Use Managed Identity: ${config.saas.useManagedIdentity}`);
    console.log(`  Debug Mode: ${config.saas.debugMode}`);
    console.log(`  Permissive Mode: ${config.saas.permissiveMode}`);
    console.log('');

    // Test 1: Connexion à la base de données
    console.log('Test 1: Testing database connection...');
    const connectionResult = await saasIntegration.testConnection();
    
    if (connectionResult.success) {
        console.log('✅ Connection successful!');
        console.log(`  Auth Method: ${connectionResult.authMethod}`);
        console.log(`  Current User: ${connectionResult.currentUser}`);
        console.log(`  SQL Server Version: ${connectionResult.version.substring(0, 100)}...`);
    } else {
        console.log('❌ Connection failed!');
        console.log(`  Error: ${connectionResult.error}`);
        if (connectionResult.permissiveMode) {
            console.log('  Note: Running in permissive mode - continuing with tests');
        } else {
            console.log('  Aborting tests due to connection failure');
            await saasIntegration.close();
            process.exit(1);
        }
    }
    console.log('');

    // Test 2: Procédure stockée sp_LinkTeamsUserToSubscription
    console.log('Test 2: Testing sp_LinkTeamsUserToSubscription...');
    
    // Données de test (utiliser un GUID réel existant dans la base)
    const testData = {
        ampSubscriptionId: 'FC4A0055-D1D7-464B-C64E-8E862AD4C1B1', // GUID réel depuis la base
        teamsUserId: '29:test-user-id-12345',
        conversationId: '19:test-conversation-id-67890',
        tenantId: config.saas.tenantId || 'test-tenant-id'
    };
    
    console.log(`  AMP Subscription ID: ${testData.ampSubscriptionId}`);
    console.log(`  Teams User ID: ${testData.teamsUserId}`);
    console.log(`  Conversation ID: ${testData.conversationId}`);
    console.log(`  Tenant ID: ${testData.tenantId}`);
    console.log('');

    const linkResult = await saasIntegration.testLinkTeamsUser(
        testData.ampSubscriptionId,
        testData.teamsUserId,
        testData.conversationId,
        testData.tenantId
    );

    if (linkResult.success) {
        console.log('✅ Stored procedure executed successfully!');
        console.log(`  Message: ${linkResult.message}`);
    } else {
        console.log('❌ Stored procedure execution failed!');
        console.log(`  Error: ${linkResult.error}`);
        if (linkResult.permissiveMode) {
            console.log('  Note: Running in permissive mode - not blocking');
        }
    }
    console.log('');

    // Test 3: Vérifier si un abonnement existe pour l'utilisateur test
    if (connectionResult.success) {
        console.log('Test 3: Checking for active subscription...');
        try {
            const subscription = await saasIntegration.getActiveSubscription(
                testData.teamsUserId,
                testData.tenantId
            );

            if (subscription) {
                console.log('✅ Active subscription found!');
                console.log(`  Subscription ID: ${subscription.Id}`);
                console.log(`  Plan ID: ${subscription.AMPPlanId}`);
                console.log(`  Status: ${subscription.SubscriptionStatus}`);
                console.log(`  AMP Subscription ID: ${subscription.AMPSubscriptionId}`);
            } else {
                console.log('ℹ️  No active subscription found for test user');
                console.log('  This is expected if no subscription is configured for the test user');
            }
        } catch (error) {
            console.log('❌ Error checking subscription:');
            console.log(`  ${error.message}`);
        }
        console.log('');
    }

    // Fermer la connexion
    await saasIntegration.close();
    console.log('=== Tests completed ===\n');
}

// Exécuter les tests
runTests().catch(error => {
    console.error('\n❌ Fatal error during tests:');
    console.error(error);
    process.exit(1);
});
