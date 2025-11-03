#!/usr/bin/env node

/**
 * Script pour activer manuellement une subscription en statut PendingFulfillmentStart
 * 
 * Usage:
 *   node activate-subscription.js <subscription-name>
 * 
 * Exemple:
 *   node activate-subscription.js heon-net
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../env/.env.playground') });
const sql = require('mssql');

const config = {
  server: process.env.SAAS_DB_SERVER || 'sac-02-sql.database.windows.net',
  database: process.env.SAAS_DB_NAME || 'sac-02AMPSaaSDB',
  authentication: {
    type: 'azure-active-directory-default'
  },
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function activateSubscription(subscriptionName) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Activation manuelle de subscription');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let pool;
  try {
    console.log('🔗 Connexion à la base de données...');
    pool = await sql.connect(config);
    console.log('✓ Connecté\n');

    // Trouver la subscription
    console.log(`🔍 Recherche de la subscription "${subscriptionName}"...`);
    const subResult = await pool.request()
      .input('name', sql.NVarChar, subscriptionName)
      .query`
        SELECT 
          Id,
          Name,
          AmpsubscriptionId,
          AmpplanId,
          SubscriptionStatus,
          IsActive
        FROM Subscriptions
        WHERE Name = @name
      `;

    if (subResult.recordset.length === 0) {
      throw new Error(`❌ Subscription "${subscriptionName}" non trouvée`);
    }

    const subscription = subResult.recordset[0];
    console.log('\n📋 Subscription trouvée:');
    console.log(`   ID: ${subscription.Id}`);
    console.log(`   Name: ${subscription.Name}`);
    console.log(`   AMP ID: ${subscription.AmpsubscriptionId}`);
    console.log(`   Plan: ${subscription.AmpplanId}`);
    console.log(`   Status: ${subscription.SubscriptionStatus}`);
    console.log(`   Active: ${subscription.IsActive ? 'Oui' : 'Non'}\n`);

    if (subscription.SubscriptionStatus !== 'PendingFulfillmentStart') {
      console.log(`⚠️  La subscription est déjà en statut: ${subscription.SubscriptionStatus}`);
      console.log('   Aucune action nécessaire.\n');
      return;
    }

    // Activer la subscription
    console.log('🔧 Activation de la subscription...');
    
    await pool.request()
      .input('id', sql.Int, subscription.Id)
      .query`
        UPDATE Subscriptions
        SET 
          SubscriptionStatus = 'Subscribed',
          IsActive = 1
        WHERE Id = @id
      `;

    console.log('✅ Subscription activée avec succès!\n');

    // Vérifier le résultat
    const verifyResult = await pool.request()
      .input('id', sql.Int, subscription.Id)
      .query`
        SELECT 
          Id,
          Name,
          SubscriptionStatus,
          IsActive
        FROM Subscriptions
        WHERE Id = @id
      `;

    const updated = verifyResult.recordset[0];
    console.log('📋 État final:');
    console.log(`   Status: ${updated.SubscriptionStatus}`);
    console.log(`   Active: ${updated.IsActive ? 'Oui' : 'Non'}\n`);

    console.log('💡 Prochaines étapes:');
    console.log('   1. Vérifier dans le portail que le statut est "Subscribed"');
    console.log('   2. Configurer le Scheduler avec: make configure-scheduler');
    console.log('   3. Valider l\'émission avec: make message-diag\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Main
const subscriptionName = process.argv[2];

if (!subscriptionName) {
  console.error('\n❌ Usage: node activate-subscription.js <subscription-name>');
  console.error('\nExemple:');
  console.error('   node activate-subscription.js heon-net\n');
  process.exit(1);
}

activateSubscription(subscriptionName);
