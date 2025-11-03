#!/usr/bin/env node

/**
 * Exécution manuelle du Scheduler
 * 
 * Ce script simule ce que le WebJob SaaS Accelerator fait automatiquement:
 * 1. Lit les Schedulers actifs dont StartDate est dépassé
 * 2. Génère les messages dans MeteredAuditLogs
 * 3. Met à jour NextRunTime
 * 
 * Usage:
 *   node run-scheduler-manually.js [scheduler-id]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../env/.env.playground') });
const sql = require('mssql');

const config = {
  server: process.env.SAAS_DB_SERVER || 'sac-02-sql.database.windows.net',
  database: process.env.SAAS_DB_NAME || 'sac-02AMPSaaSDB',
  authentication: { type: 'azure-active-directory-default' },
  options: { encrypt: true, trustServerCertificate: false }
};

// Conversion EST <-> UTC
function toEST(date) {
  const est = new Date(date);
  est.setHours(est.getHours() - 5);
  return est;
}

function formatEST(date) {
  const est = toEST(date);
  return est.toISOString().replace('T', ' ').replace('Z', '') + ' EST';
}

async function runScheduler(pool, schedulerId) {
  console.log(`\n🔧 Exécution manuelle du Scheduler #${schedulerId}...\n`);

  // Récupérer le Scheduler
  const schedulerResult = await pool.request()
    .input('id', sql.Int, schedulerId)
    .query`
      SELECT 
        sm.*,
        s.AmpsubscriptionId,
        s.AmpplanId,
        md.Dimension
      FROM MeteredPlanSchedulerManagement sm
      JOIN Subscriptions s ON sm.SubscriptionId = s.Id
      JOIN MeteredDimensions md ON sm.DimensionId = md.Id
      WHERE sm.Id = @id
    `;

  if (schedulerResult.recordset.length === 0) {
    throw new Error(`Scheduler #${schedulerId} non trouvé`);
  }

  const scheduler = schedulerResult.recordset[0];

  console.log('📋 Scheduler:');
  console.log(`   Nom: ${scheduler.SchedulerName}`);
  console.log(`   Subscription: ${scheduler.AmpsubscriptionId}`);
  console.log(`   Plan: ${scheduler.AmpplanId}`);
  console.log(`   Dimension: ${scheduler.Dimension}`);
  console.log(`   Quantité: ${scheduler.Quantity}`);
  console.log(`   Fréquence: Hourly\n`);

  // Générer le message
  const now = new Date();
  const usageDate = new Date(now);
  usageDate.setMinutes(0, 0, 0); // Heure pile

  console.log('📝 Génération du message...');
  console.log(`   Date usage: ${usageDate.toISOString()} (${formatEST(usageDate)})`);
  console.log(`   Quantité: ${scheduler.Quantity}\n`);

  // Construire le RequestJson pour l'API Marketplace
  const requestJson = {
    resourceId: scheduler.AmpsubscriptionId,
    quantity: scheduler.Quantity,
    dimension: scheduler.Dimension,
    effectiveStartTime: usageDate.toISOString(),
    planId: scheduler.AmpplanId
  };

  // Insérer dans MeteredAuditLogs
  await pool.request().query`
    INSERT INTO MeteredAuditLogs (
      SubscriptionId,
      SubscriptionUsageDate,
      RequestJson,
      RunBy,
      CreatedBy,
      CreatedDate
    )
    VALUES (
      ${scheduler.SubscriptionId},
      ${usageDate},
      ${JSON.stringify(requestJson)},
      'Manual Scheduler Execution',
      0,
      ${now}
    )
  `;

  console.log('✅ Message créé dans MeteredAuditLogs');
  console.log(`   RequestJson: ${JSON.stringify(requestJson, null, 2)}\n`);

  // Calculer NextRunTime (dans 1 heure)
  const nextRun = new Date(now);
  nextRun.setMinutes(0, 0, 0);
  nextRun.setHours(nextRun.getHours() + 1);

  await pool.request().query`
    UPDATE MeteredPlanSchedulerManagement
    SET NextRunTime = ${nextRun}
    WHERE Id = ${schedulerId}
  `;

  console.log('📅 NextRunTime mis à jour:');
  console.log(`   UTC: ${nextRun.toISOString()}`);
  console.log(`   EST: ${formatEST(nextRun)}\n`);

  console.log('✅ Scheduler exécuté avec succès!\n');
  console.log('🔍 Vérifiez avec: make message-diag');
}

async function main() {
  const schedulerId = process.argv[2] ? parseInt(process.argv[2]) : 4; // Default: Scheduler #4

  let pool;
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Exécution Manuelle du Scheduler');
    console.log('═══════════════════════════════════════════════════════════════');

    console.log('\n🔗 Connexion à la base de données...');
    pool = await sql.connect(config);
    console.log('✓ Connecté');

    await runScheduler(pool, schedulerId);

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

main();
