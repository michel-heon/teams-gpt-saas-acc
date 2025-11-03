#!/usr/bin/env node

/**
 * Script de statut des messages Marketplace
 * Affiche clairement:
 * - Messages EN ATTENTE (dans la BD, non traités)
 * - Messages TRAITÉS (envoyés au Marketplace)
 * - Détails par heure et par dimension
 */

const sql = require('mssql');
const path = require('path');

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

// Fonction pour formater en EST
function toEST(date) {
  const est = new Date(date.getTime() - (5 * 60 * 60 * 1000));
  return est;
}

function formatEST(date) {
  const est = toEST(date);
  return est.toISOString().replace('T', ' ').substring(0, 19) + ' EST';
}

async function getMessageStatus() {
  let pool;
  
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           STATUT DES MESSAGES MARKETPLACE                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Connexion à la base de données
    pool = await sql.connect(dbConfig);

    // ============================================================
    // 1. STATISTIQUES GLOBALES
    // ============================================================
    
    const stats = await pool.request().query(`
      SELECT 
        COUNT(*) as Total,
        SUM(CASE WHEN ResponseJson IS NULL THEN 1 ELSE 0 END) as EnAttente,
        SUM(CASE WHEN ResponseJson IS NOT NULL THEN 1 ELSE 0 END) as Traites
      FROM [dbo].[MeteredAuditLogs]
    `);

    const { Total, EnAttente, Traites } = stats.recordset[0];

    console.log('📊 RÉSUMÉ GLOBAL');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`   📁 Total messages dans la BD:     ${Total}`);
    console.log(`   ⏳ Messages EN ATTENTE:            ${EnAttente}  (à traiter par le WebJob)`);
    console.log(`   ✅ Messages TRAITÉS:               ${Traites}  (envoyés au Marketplace)`);
    console.log(`   📈 Taux de traitement:             ${Total > 0 ? ((Traites/Total)*100).toFixed(1) : 0}%\n`);

    // ============================================================
    // 2. MESSAGES EN ATTENTE - DÉTAILS
    // ============================================================
    
    if (EnAttente > 0) {
      console.log('⏳ MESSAGES EN ATTENTE (Non traités)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      // Grouper par heure
      const pendingByHour = await pool.request().query(`
        SELECT 
          DATEADD(hour, DATEDIFF(hour, 0, SubscriptionUsageDate), 0) as UsageHour,
          COUNT(*) as Count,
          MIN(CreatedDate) as FirstCreated,
          MAX(CreatedDate) as LastCreated
        FROM [dbo].[MeteredAuditLogs]
        WHERE ResponseJson IS NULL
        GROUP BY DATEADD(hour, DATEDIFF(hour, 0, SubscriptionUsageDate), 0)
        ORDER BY UsageHour
      `);

      let totalPending = 0;
      pendingByHour.recordset.forEach(row => {
        const hour = new Date(row.UsageHour);
        console.log(`   🕐 Heure ${hour.toISOString().substring(0, 13)}:00 UTC (${toEST(hour).toISOString().substring(0, 13)}:00 EST)`);
        console.log(`      📦 ${row.Count} message(s) en attente`);
        console.log(`      📅 Créés entre: ${formatEST(row.FirstCreated)}`);
        console.log(`                     ${formatEST(row.LastCreated)}\n`);
        totalPending += row.Count;
      });

      // Détails par dimension pour les messages en attente
      const pendingByDimension = await pool.request().query(`
        SELECT 
          JSON_VALUE(RequestJson, '$.dimension') as Dimension,
          COUNT(*) as Count
        FROM [dbo].[MeteredAuditLogs]
        WHERE ResponseJson IS NULL
          AND RequestJson IS NOT NULL
        GROUP BY JSON_VALUE(RequestJson, '$.dimension')
        ORDER BY Dimension
      `);

      if (pendingByDimension.recordset.length > 0) {
        console.log('   📊 Par dimension:');
        pendingByDimension.recordset.forEach(row => {
          console.log(`      🏷️  ${row.Dimension || '(null)'}: ${row.Count} message(s)`);
        });
        console.log();
      }
    } else {
      console.log('⏳ MESSAGES EN ATTENTE: Aucun\n');
    }

    // ============================================================
    // 3. MESSAGES TRAITÉS - DÉTAILS
    // ============================================================
    
    if (Traites > 0) {
      console.log('✅ MESSAGES TRAITÉS (Envoyés au Marketplace)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      // Statistiques de traitement
      const processedStats = await pool.request().query(`
        SELECT 
          StatusCode,
          COUNT(*) as Count,
          MIN(CreatedDate) as FirstProcessed,
          MAX(CreatedDate) as LastProcessed
        FROM [dbo].[MeteredAuditLogs]
        WHERE ResponseJson IS NOT NULL
        GROUP BY StatusCode
        ORDER BY StatusCode
      `);

      console.log('   📡 Par code de statut HTTP:\n');
      processedStats.recordset.forEach(row => {
        const emoji = row.StatusCode === '200' ? '✅' : 
                     row.StatusCode === '400' ? '❌' : 
                     row.StatusCode === '409' ? '⚠️' : '❓';
        console.log(`      ${emoji} ${row.StatusCode}: ${row.Count} message(s)`);
        console.log(`         Premier: ${formatEST(row.FirstProcessed)}`);
        console.log(`         Dernier: ${formatEST(row.LastProcessed)}\n`);
      });

      // Détails par dimension pour les messages traités
      const processedByDimension = await pool.request().query(`
        SELECT 
          JSON_VALUE(RequestJson, '$.dimension') as Dimension,
          StatusCode,
          COUNT(*) as Count
        FROM [dbo].[MeteredAuditLogs]
        WHERE ResponseJson IS NOT NULL
          AND RequestJson IS NOT NULL
        GROUP BY JSON_VALUE(RequestJson, '$.dimension'), StatusCode
        ORDER BY Dimension, StatusCode
      `);

      if (processedByDimension.recordset.length > 0) {
        console.log('   📊 Par dimension:');
        
        // Grouper par dimension
        const byDim = {};
        processedByDimension.recordset.forEach(row => {
          const dim = row.Dimension || '(null)';
          if (!byDim[dim]) byDim[dim] = [];
          byDim[dim].push(row);
        });

        Object.keys(byDim).sort().forEach(dim => {
          const total = byDim[dim].reduce((sum, row) => sum + row.Count, 0);
          console.log(`\n      🏷️  ${dim}: ${total} message(s)`);
          byDim[dim].forEach(row => {
            const emoji = row.StatusCode === '200' ? '✅' : 
                         row.StatusCode === '400' ? '❌' : 
                         row.StatusCode === '409' ? '⚠️' : '❓';
            console.log(`         ${emoji} ${row.StatusCode}: ${row.Count}`);
          });
        });
        console.log();
      }

      // Dernières réponses d'erreur (si applicable)
      const errors = await pool.request().query(`
        SELECT TOP 3
          StatusCode,
          ResponseJson,
          CreatedDate,
          SubscriptionUsageDate
        FROM [dbo].[MeteredAuditLogs]
        WHERE ResponseJson IS NOT NULL
          AND StatusCode NOT IN ('200', '201', '202')
        ORDER BY CreatedDate DESC
      `);

      if (errors.recordset.length > 0) {
        console.log('   ❌ Dernières erreurs:\n');
        errors.recordset.forEach((err, idx) => {
          console.log(`      ${idx + 1}. StatusCode: ${err.StatusCode}`);
          console.log(`         Date: ${formatEST(err.CreatedDate)}`);
          try {
            const response = JSON.parse(err.ResponseJson);
            if (response.message) {
              console.log(`         Erreur: ${response.message}`);
            }
          } catch (e) {
            console.log(`         ResponseJson: ${err.ResponseJson.substring(0, 100)}...`);
          }
          console.log();
        });
      }

    } else {
      console.log('✅ MESSAGES TRAITÉS: Aucun\n');
    }

    // ============================================================
    // 4. PROCHAINE EXÉCUTION SCHEDULER
    // ============================================================
    
    console.log('⏰ PROCHAINE EXÉCUTION SCHEDULER');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const nextRun = await pool.request().query(`
      SELECT TOP 1
        sm.Id,
        sm.SchedulerName,
        s.Name as SubscriptionName,
        md.Dimension,
        sm.Quantity,
        sm.NextRunTime,
        sm.StartDate,
        f.Frequency
      FROM [dbo].[MeteredPlanSchedulerManagement] sm
      INNER JOIN [dbo].[Subscriptions] s ON sm.SubscriptionId = s.Id
      INNER JOIN [dbo].[MeteredDimensions] md ON sm.DimensionId = md.Id
      INNER JOIN [dbo].[SchedulerFrequency] f ON sm.FrequencyId = f.Id
      WHERE sm.NextRunTime IS NOT NULL
      ORDER BY sm.NextRunTime ASC
    `);

    if (nextRun.recordset.length > 0) {
      const sched = nextRun.recordset[0];
      const nextTime = new Date(sched.NextRunTime);
      const now = new Date();
      const diffMinutes = Math.round((nextTime - now) / (1000 * 60));
      
      console.log(`   📅 Scheduler: ${sched.SchedulerName}`);
      console.log(`   📦 Subscription: ${sched.SubscriptionName}`);
      console.log(`   🏷️  Dimension: ${sched.Dimension}`);
      console.log(`   📊 Quantité: ${sched.Quantity}`);
      console.log(`   🔁 Fréquence: ${sched.Frequency}`);
      console.log(`   ⏰ Prochaine exécution:`);
      console.log(`      UTC: ${nextTime.toISOString()}`);
      console.log(`      EST: ${formatEST(nextTime)}`);
      console.log(`      Dans: ${diffMinutes > 0 ? diffMinutes : 0} minute(s)\n`);
    } else {
      const noNextRun = await pool.request().query(`
        SELECT TOP 1
          sm.Id,
          sm.SchedulerName,
          s.Name as SubscriptionName,
          md.Dimension,
          sm.StartDate
        FROM [dbo].[MeteredPlanSchedulerManagement] sm
        INNER JOIN [dbo].[Subscriptions] s ON sm.SubscriptionId = s.Id
        INNER JOIN [dbo].[MeteredDimensions] md ON sm.DimensionId = md.Id
        WHERE sm.NextRunTime IS NULL
        ORDER BY sm.StartDate DESC
      `);

      if (noNextRun.recordset.length > 0) {
        const sched = noNextRun.recordset[0];
        console.log(`   ⚠️  Scheduler configuré mais NextRunTime = NULL`);
        console.log(`   📅 Scheduler: ${sched.SchedulerName} (ID: ${sched.Id})`);
        console.log(`   📦 Subscription: ${sched.SubscriptionName}`);
        console.log(`   🏷️  Dimension: ${sched.Dimension}`);
        console.log(`   💡 Le WebJob n'a pas encore calculé NextRunTime\n`);
      } else {
        console.log(`   ℹ️  Aucun Scheduler configuré\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════════════════\n');

    await pool.close();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (pool) await pool.close();
    process.exit(1);
  }
}

// Exécution
getMessageStatus();
