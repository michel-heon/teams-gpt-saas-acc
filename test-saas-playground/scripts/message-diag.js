#!/usr/bin/env node

/**
 * Script de diagnostic complet des messages Marketplace
 * Affiche:
 * - Nombre de messages dans la BD
 * - Nombre de messages en transit (non émis)
 * - Heure de la prochaine transmission
 * - Nombre de messages enregistrés dans le Marketplace
 */

const sql = require('mssql');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Charger les variables d'environnement
require('dotenv').config({ path: path.join(__dirname, '../../env/.env.playground') });

// Configuration de la base de données
const dbConfig = {
  server: process.env.SAAS_DB_SERVER || 'sac-02-sql.database.windows.net',
  database: process.env.SAAS_DB_NAME || 'sac-02AMPSaaSDB',
  authentication: {
    type: 'azure-active-directory-default'
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

async function getMessageDiagnostics() {
  let pool;
  
  try {
    console.log('🔍 DIAGNOSTIC COMPLET DES MESSAGES MARKETPLACE\n');
    console.log('═══════════════════════════════════════════════\n');

    // Connexion à la base de données
    pool = await sql.connect(dbConfig);

    // 1. Nombre total de messages dans la BD
    const totalMessages = await pool.request().query(`
      SELECT COUNT(*) as Total
      FROM [dbo].[MeteredAuditLogs]
    `);

    const total = totalMessages.recordset[0].Total;
    console.log(`📊 Messages dans la base de données: ${total}`);

    // 2. Nombre de messages en transit (non émis - ResponseJson NULL)
    const transitMessages = await pool.request().query(`
      SELECT COUNT(*) as InTransit
      FROM [dbo].[MeteredAuditLogs]
      WHERE ResponseJson IS NULL
    `);

    const inTransit = transitMessages.recordset[0].InTransit;
    console.log(`⏳ Messages en transit (non émis): ${inTransit}`);

    // 3. Nombre de messages enregistrés dans le Marketplace (avec réponse API)
    const marketplaceMessages = await pool.request().query(`
      SELECT COUNT(*) as Emitted
      FROM [dbo].[MeteredAuditLogs]
      WHERE ResponseJson IS NOT NULL
    `);

    const emitted = marketplaceMessages.recordset[0].Emitted;
    console.log(`✅ Messages enregistrés dans Marketplace: ${emitted}`);

    console.log('\n───────────────────────────────────────────────\n');

    // 4. Détails des messages en transit par heure
    if (inTransit > 0) {
      console.log('📋 Détail des messages en transit:\n');

      const transitDetails = await pool.request().query(`
        SELECT 
          DATEPART(YEAR, CreatedDate) as Year,
          DATEPART(MONTH, CreatedDate) as Month,
          DATEPART(DAY, CreatedDate) as Day,
          DATEPART(HOUR, CreatedDate) as Hour,
          COUNT(*) as MessageCount,
          MIN(CreatedDate) as FirstMessage,
          MAX(CreatedDate) as LastMessage
        FROM [dbo].[MeteredAuditLogs]
        WHERE ResponseJson IS NULL
        GROUP BY 
          DATEPART(YEAR, CreatedDate),
          DATEPART(MONTH, CreatedDate),
          DATEPART(DAY, CreatedDate),
          DATEPART(HOUR, CreatedDate)
        ORDER BY Year, Month, Day, Hour
      `);

      transitDetails.recordset.forEach(row => {
        const hourLabel = `${row.Year}-${String(row.Month).padStart(2, '0')}-${String(row.Day).padStart(2, '0')} ${String(row.Hour).padStart(2, '0')}:00`;
        console.log(`   🕐 Heure ${hourLabel} UTC: ${row.MessageCount} message(s)`);
        console.log(`      Premier: ${row.FirstMessage.toISOString().replace('T', ' ').substring(0, 19)}`);
        console.log(`      Dernier: ${row.LastMessage.toISOString().replace('T', ' ').substring(0, 19)}`);
      });

      console.log('\n───────────────────────────────────────────────\n');
    }

    // 5. Heure de la prochaine transmission (basée sur le Scheduler)
    console.log('⏰ Prochaine transmission prévue:\n');

    // Vérifier si le scheduler est configuré
    const schedulerConfig = await pool.request().query(`
      SELECT TOP 1
        Id,
        SchedulerName,
        SubscriptionName,
        PlanId,
        Dimension,
        Frequency,
        Quantity,
        StartDate,
        NextRunTime
      FROM [dbo].[SchedulerManagerView]
      WHERE Frequency = 'Hourly'
      ORDER BY NextRunTime ASC
    `);

    if (schedulerConfig.recordset.length > 0) {
      const scheduler = schedulerConfig.recordset[0];
      const nextRun = scheduler.NextRunTime;
      const startDate = scheduler.StartDate;
      const now = new Date();
      
      console.log(`   📅 Scheduler: ${scheduler.SchedulerName}`);
      console.log(`   📦 Subscription: ${scheduler.SubscriptionName}`);
      console.log(`   📋 Plan: ${scheduler.PlanId}`);
      console.log(`   🏷️  Dimension: ${scheduler.Dimension}`);
      console.log(`   🔁 Fréquence: ${scheduler.Frequency}`);
      console.log(`   📊 Quantité: ${scheduler.Quantity}`);
      
      if (startDate) {
        console.log(`   📅 Date de début: ${startDate.toISOString().replace('T', ' ').substring(0, 19)} UTC`);
        
        if (startDate > now) {
          const minutesUntilStart = Math.floor((startDate - now) / 60000);
          console.log(`   ⏱️  Démarrage dans: ${minutesUntilStart} minute(s)`);
        }
      }
      
      if (nextRun) {
        const diff = nextRun - now;
        const minutesLeft = Math.floor(diff / 60000);
        
        console.log(`   ⏰ Prochaine exécution: ${nextRun.toISOString().replace('T', ' ').substring(0, 19)} UTC`);
        
        if (minutesLeft > 0) {
          console.log(`   ⏱️  Dans: ${minutesLeft} minute(s)`);
        } else {
          console.log(`   ⏱️  ⚠️  Devrait s'exécuter maintenant!`);
        }
      } else {
        if (startDate && startDate > now) {
          console.log(`   ⏰ Prochaine exécution: Après la date de début`);
        } else {
          console.log(`   ⚠️  Prochaine exécution non programmée (NextRunTime = NULL)`);
          console.log(`   💡 Le scheduler devrait calculer NextRunTime automatiquement après StartDate`);
        }
      }
    } else {
      console.log('   ⚠️  Aucun scheduler configuré avec fréquence "Hourly"');
      console.log('   💡 Pour configurer le scheduler:');
      console.log('      1. Accédez au portail admin: https://sac-02-admin.azurewebsites.net');
      console.log('      2. Naviguez vers Scheduler Manager');
      console.log('      3. Créez une nouvelle tâche avec fréquence "Hourly"');
      console.log('');
      console.log('   📖 Documentation: doc/phase2/saas-accelerator-metered-scheduler.md');
    }

    console.log('\n───────────────────────────────────────────────\n');

    // 6. Vérifier la configuration du Metered Billing
    const meteredConfig = await pool.request().query(`
      SELECT [Value]
      FROM [dbo].[ApplicationConfiguration]
      WHERE [Name] = 'IsMeteredBillingEnabled'
    `);

    const isEnabled = meteredConfig.recordset.length > 0 && 
                      meteredConfig.recordset[0].Value.toLowerCase() === 'true';

    console.log('⚙️  Configuration:\n');
    console.log(`   Metered Billing: ${isEnabled ? '✅ Activé' : '❌ Désactivé'}`);
    
    if (!isEnabled) {
      console.log('   ⚠️  Pour activer: UPDATE ApplicationConfiguration SET Value=\'true\' WHERE Name=\'IsMeteredBillingEnabled\'');
    }

    // 7. Résumé des dernières émissions réussies
    if (emitted > 0) {
      console.log('\n───────────────────────────────────────────────\n');
      console.log('📈 Dernières émissions réussies:\n');

      const lastEmissions = await pool.request().query(`
        SELECT TOP 5
          CreatedDate,
          JSON_VALUE(ResponseJson, '$.usageEventId') as UsageEventId,
          JSON_VALUE(ResponseJson, '$.status') as Status,
          JSON_VALUE(ResponseJson, '$.resourceUri') as ResourceUri
        FROM [dbo].[MeteredAuditLogs]
        WHERE ResponseJson IS NOT NULL
        ORDER BY CreatedDate DESC
      `);

      lastEmissions.recordset.forEach((emission, index) => {
        console.log(`   ${index + 1}. ${emission.CreatedDate.toISOString().replace('T', ' ').substring(0, 19)} UTC`);
        console.log(`      Status: ${emission.Status || 'N/A'}`);
        console.log(`      Event ID: ${emission.UsageEventId || 'N/A'}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════\n');

    // Afficher un résumé coloré
    const percentage = total > 0 ? ((emitted / total) * 100).toFixed(1) : 0;
    console.log('📊 RÉSUMÉ:');
    console.log(`   Total messages: ${total}`);
    console.log(`   En transit: ${inTransit} (${total > 0 ? ((inTransit / total) * 100).toFixed(1) : 0}%)`);
    console.log(`   Émis: ${emitted} (${percentage}%)`);
    
    if (inTransit > 0 && schedulerConfig.recordset.length === 0) {
      console.log('\n⚠️  ACTION REQUISE: Configurez le Metered Scheduler pour émettre les messages en transit');
    } else if (inTransit > 0) {
      console.log('\n✅ Les messages en transit seront émis lors de la prochaine exécution du scheduler');
    } else {
      console.log('\n✅ Tous les messages ont été émis avec succès');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Exécution
getMessageDiagnostics();
