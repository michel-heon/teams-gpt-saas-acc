#!/usr/bin/env node
/**
 * Configure SaaS Accelerator Metered Scheduler via SQL API
 * 
 * Ce script permet de créer ou mettre à jour un Scheduler pour l'émission
 * automatique des messages vers l'API Azure Marketplace.
 * 
 * Usage:
 *   node scripts/configure-scheduler.js --subscription "Playground Subscription" --plan dev-01 --dimension free --frequency Hourly --start "2025-11-03 20:00:00"
 *   node scripts/configure-scheduler.js --update --id 1 --dimension free
 *   node scripts/configure-scheduler.js --delete --id 1
 *   node scripts/configure-scheduler.js --list
 * 
 * Options:
 *   --subscription <name>  Nom de la subscription
 *   --plan <planId>        ID du plan (ex: dev-01, starter, professional)
 *   --dimension <dim>      Dimension Marketplace (free, pro, pro-plus, starter)
 *   --frequency <freq>     Fréquence (Hourly, Daily, Weekly, Monthly)
 *   --quantity <qty>       Quantité par défaut (défaut: 0.01)
 *   --start <datetime>     Date/heure de début (UTC) "YYYY-MM-DD HH:MM:SS"
 *   --update               Mode mise à jour (nécessite --id)
 *   --delete               Mode suppression (nécessite --id)
 *   --list                 Lister tous les Schedulers
 *   --id <id>              ID du Scheduler (pour --update ou --delete)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../env/.env.playground') });
const sql = require('mssql');

// Configuration de la connexion
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

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'create', // create, update, delete, list
    subscription: null,
    plan: null,
    dimension: null,
    frequency: 'Hourly',
    quantity: 0.01,
    startDate: null,
    id: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--list':
        options.mode = 'list';
        break;
      case '--update':
        options.mode = 'update';
        break;
      case '--delete':
        options.mode = 'delete';
        break;
      case '--subscription':
        options.subscription = args[++i];
        break;
      case '--plan':
        options.plan = args[++i];
        break;
      case '--dimension':
        options.dimension = args[++i];
        break;
      case '--frequency':
        options.frequency = args[++i];
        break;
      case '--quantity':
        options.quantity = parseFloat(args[++i]);
        break;
      case '--start':
        options.startDate = args[++i];
        break;
      case '--id':
        options.id = parseInt(args[++i]);
        break;
    }
  }

  return options;
}

// Lister tous les Schedulers
async function listSchedulers(pool) {
  console.log('\n📋 Schedulers configurés:\n');

  const result = await pool.request().query`
    SELECT 
      Id,
      SchedulerName,
      AMPSubscriptionId,
      SubscriptionName,
      PurchaserEmail,
      PlanId,
      Dimension,
      Frequency,
      Quantity,
      StartDate,
      NextRunTime
    FROM SchedulerManagerView
    ORDER BY Id DESC
  `;

  if (result.recordset.length === 0) {
    console.log('   Aucun Scheduler configuré\n');
    return;
  }

  result.recordset.forEach(scheduler => {
    console.log(`─────────────────────────────────────────────────`);
    console.log(`ID: ${scheduler.Id}`);
    console.log(`Nom: ${scheduler.SchedulerName || 'N/A'}`);
    console.log(`Subscription: ${scheduler.SubscriptionName}`);
    console.log(`  - AMP ID: ${scheduler.AMPSubscriptionId}`);
    console.log(`  - Email: ${scheduler.PurchaserEmail || 'N/A'}`);
    console.log(`Plan: ${scheduler.PlanId}`);
    console.log(`Dimension: ${scheduler.Dimension}`);
    console.log(`Fréquence: ${scheduler.Frequency}`);
    console.log(`Quantité: ${scheduler.Quantity}`);
    console.log(`Date début: ${scheduler.StartDate ? scheduler.StartDate.toISOString() : 'N/A'}`);
    console.log(`Prochaine exécution: ${scheduler.NextRunTime ? scheduler.NextRunTime.toISOString() : 'Non calculée'}`);
  });
  console.log(`─────────────────────────────────────────────────\n`);
}

// Créer un nouveau Scheduler
async function createScheduler(pool, options) {
  console.log('\n🔧 Création d\'un nouveau Scheduler...\n');

  // Validation
  if (!options.subscription || !options.plan || !options.dimension) {
    throw new Error('Les options --subscription, --plan et --dimension sont requises');
  }

  // Trouver la subscription
  const subResult = await pool.request()
    .input('subscriptionName', sql.NVarChar, options.subscription)
    .query`
      SELECT Id, AmpsubscriptionId, Name
      FROM Subscriptions
      WHERE Name = @subscriptionName
    `;

  if (subResult.recordset.length === 0) {
    throw new Error(`Subscription "${options.subscription}" non trouvée`);
  }

  const subscription = subResult.recordset[0];
  console.log(`✓ Subscription trouvée: ${subscription.Name} (ID: ${subscription.Id})`);

  // Vérifier que le plan existe
  const planResult = await pool.request()
    .input('planId', sql.NVarChar, options.plan)
    .query`
      SELECT PlanId, DisplayName
      FROM Plans
      WHERE PlanId = @planId
    `;

  if (planResult.recordset.length === 0) {
    throw new Error(`Plan "${options.plan}" non trouvé`);
  }

  console.log(`✓ Plan trouvé: ${planResult.recordset[0].DisplayName} (${options.plan})`);

  // Générer le nom du Scheduler
  const schedulerName = `${subscription.Name}-${options.plan}-meter`;

  // Insérer dans SchedulerManagerView (ou table appropriée)
  // Note: La table exacte peut varier selon la version du SaaS Accelerator
  const insertResult = await pool.request()
    .input('subscriptionId', sql.Int, subscription.Id)
    .input('schedulerName', sql.NVarChar, schedulerName)
    .input('dimension', sql.NVarChar, options.dimension)
    .input('frequency', sql.NVarChar, options.frequency)
    .input('quantity', sql.Decimal(18, 2), options.quantity)
    .input('startDate', sql.DateTime2, options.startDate ? new Date(options.startDate) : new Date())
    .input('isActive', sql.Bit, 1)
    .query`
      INSERT INTO MeteredPlanSchedulerManagement (
        SubscriptionId,
        PlanId,
        DimensionId,
        FrequencyId,
        Quantity,
        StartDate
      )
      VALUES (
        @subscriptionId,
        (SELECT Id FROM Plans WHERE PlanId = ${options.plan}),
        (SELECT Id FROM MeteredDimensions WHERE Dimension = @dimension),
        (SELECT Id FROM SchedulerFrequency WHERE Frequency = @frequency),
        @quantity,
        @startDate
      )
      SELECT SCOPE_IDENTITY() AS NewId
    `;

  const newId = insertResult.recordset[0].NewId;

  console.log(`\n✅ Scheduler créé avec succès!`);
  console.log(`   ID: ${newId}`);
  console.log(`   Nom: ${schedulerName}`);
  console.log(`   Dimension: ${options.dimension}`);
  console.log(`   Fréquence: ${options.frequency}`);
  console.log(`   Date début: ${options.startDate || 'Maintenant'}\n`);
}

// Mettre à jour un Scheduler existant
async function updateScheduler(pool, options) {
  console.log('\n🔧 Mise à jour du Scheduler...\n');

  if (!options.id) {
    throw new Error('L\'option --id est requise pour --update');
  }

  // Construire la requête de mise à jour dynamiquement
  const updates = [];
  const request = pool.request().input('id', sql.Int, options.id);

  if (options.dimension) {
    updates.push('DimensionId = (SELECT Id FROM MeteredDimensions WHERE Dimension = @dimension)');
    request.input('dimension', sql.NVarChar, options.dimension);
  }

  if (options.frequency) {
    updates.push('FrequencyId = (SELECT Id FROM SchedulerFrequency WHERE Frequency = @frequency)');
    request.input('frequency', sql.NVarChar, options.frequency);
  }

  if (options.quantity) {
    updates.push('Quantity = @quantity');
    request.input('quantity', sql.Decimal(18, 2), options.quantity);
  }

  if (options.startDate) {
    updates.push('StartDate = @startDate');
    request.input('startDate', sql.DateTime2, new Date(options.startDate));
  }

  if (updates.length === 0) {
    throw new Error('Aucune modification spécifiée. Utilisez --dimension, --frequency, --quantity ou --start');
  }

  const updateQuery = `
    UPDATE MeteredPlanSchedulerManagement
    SET ${updates.join(', ')}
    WHERE Id = @id
  `;

  await request.query(updateQuery);

  console.log(`✅ Scheduler #${options.id} mis à jour avec succès!\n`);
}

// Supprimer un Scheduler
async function deleteScheduler(pool, options) {
  console.log('\n🗑️  Suppression du Scheduler...\n');

  if (!options.id) {
    throw new Error('L\'option --id est requise pour --delete');
  }

  await pool.request()
    .input('id', sql.Int, options.id)
    .query`
      DELETE FROM MeteredPlanSchedulerManagement
      WHERE Id = @id
    `;

  console.log(`✅ Scheduler #${options.id} supprimé avec succès!\n`);
}

// Main
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SaaS Accelerator Scheduler Configuration Tool');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const options = parseArgs();

  let pool;
  try {
    console.log('🔗 Connexion à la base de données SaaS Accelerator...');
    pool = await sql.connect(config);
    console.log('✓ Connecté\n');

    switch (options.mode) {
      case 'list':
        await listSchedulers(pool);
        break;
      case 'create':
        await createScheduler(pool, options);
        await listSchedulers(pool);
        break;
      case 'update':
        await updateScheduler(pool, options);
        await listSchedulers(pool);
        break;
      case 'delete':
        await deleteScheduler(pool, options);
        await listSchedulers(pool);
        break;
    }

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

// Afficher l'aide
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage:
  
  Créer un Scheduler:
    node scripts/configure-scheduler.js \\
      --subscription "Playground Subscription" \\
      --plan dev-01 \\
      --dimension free \\
      --frequency Hourly \\
      --start "2025-11-03 20:00:00"

  Lister les Schedulers:
    node scripts/configure-scheduler.js --list

  Mettre à jour un Scheduler:
    node scripts/configure-scheduler.js --update --id 1 --dimension free

  Supprimer un Scheduler:
    node scripts/configure-scheduler.js --delete --id 1

Options:
  --subscription <name>  Nom de la subscription
  --plan <planId>        ID du plan (ex: dev-01, starter, professional)
  --dimension <dim>      Dimension Marketplace (free, pro, pro-plus, starter)
  --frequency <freq>     Fréquence (Hourly, Daily, Weekly, Monthly)
  --quantity <qty>       Quantité par défaut (défaut: 0.01)
  --start <datetime>     Date/heure de début UTC "YYYY-MM-DD HH:MM:SS"
  --update               Mode mise à jour (nécessite --id)
  --delete               Mode suppression (nécessite --id)
  --list                 Lister tous les Schedulers
  --id <id>              ID du Scheduler (pour --update ou --delete)
  --help, -h             Afficher cette aide

Dimensions valides:
  - free      (plan starter, 50 msgs @ $0.02)
  - pro       (plan professional, 300 msgs @ $0.015)
  - pro-plus  (plan pro-plus, 1500 msgs @ $0.01)
  - starter   (si configuré dans Partner Center)

Fréquences valides:
  - Hourly   (recommandé pour Marketplace API)
  - Daily
  - Weekly
  - Monthly
`);
  process.exit(0);
}

main();
