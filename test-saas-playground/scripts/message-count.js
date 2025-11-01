// scripts/message-count.js
// Compte les messages enregistrés dans MeteredAuditLogs (SaaS Accelerator)
// Affiche le nombre de messages par plan et par statut
const sql = require('mssql');
const config = require('../../src/config');

async function countMessages() {
    try {
        console.log('🔗 Connexion à la base de données SaaS Accelerator...\n');
        
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
        
        const pool = await sql.connect(dbConfig);
        
        // Compter les messages par plan et par statut
        const result = await pool.request().query(`
            SELECT 
                s.AmpPlanId AS PlanId,
                p.DisplayName AS PlanName,
                mal.StatusCode,
                COUNT(*) AS MessageCount,
                MIN(mal.CreatedDate) AS FirstMessage,
                MAX(mal.CreatedDate) AS LastMessage
            FROM MeteredAuditLogs mal
            INNER JOIN Subscriptions s ON mal.SubscriptionId = s.Id
            LEFT JOIN Plans p ON s.AmpPlanId = p.PlanId
            GROUP BY s.AmpPlanId, p.DisplayName, mal.StatusCode
            ORDER BY s.AmpPlanId, mal.StatusCode
        `);
        
        // Obtenir le total global
        const totalResult = await pool.request().query(`
            SELECT 
                COUNT(*) AS TotalMessages,
                COUNT(DISTINCT SubscriptionId) AS TotalSubscriptions,
                MIN(CreatedDate) AS FirstMessage,
                MAX(CreatedDate) AS LastMessage
            FROM MeteredAuditLogs
        `);
        
        const total = totalResult.recordset[0];
        
        console.log('📊 Messages enregistrés dans MeteredAuditLogs:\n');
        
        if (result.recordset.length === 0) {
            console.log('⚠️  Aucun message trouvé dans les audit logs\n');
            await sql.close();
            return;
        }
        
        // Grouper par plan
        const planGroups = {};
        result.recordset.forEach(row => {
            const planId = row.PlanId || 'N/A';
            if (!planGroups[planId]) {
                planGroups[planId] = {
                    planName: row.PlanName || 'N/A',
                    statuses: {},
                    total: 0
                };
            }
            planGroups[planId].statuses[row.StatusCode] = row.MessageCount;
            planGroups[planId].total += row.MessageCount;
        });
        
        // Afficher le tableau récapitulatif
        console.log('┌──────────────────────┬──────────────────┬──────────┬──────────┬──────────┐');
        console.log('│ Plan ID              │ Nom              │ Succès   │ Erreurs  │ Total    │');
        console.log('├──────────────────────┼──────────────────┼──────────┼──────────┼──────────┤');
        
        let totalSuccess = 0;
        let totalError = 0;
        
        Object.keys(planGroups).forEach(planId => {
            const plan = planGroups[planId];
            const success = (plan.statuses['200'] || plan.statuses['201'] || 0);
            const errors = plan.total - success;
            
            totalSuccess += success;
            totalError += errors;
            
            const planIdStr = planId.padEnd(20).substring(0, 20);
            const planName = plan.planName.padEnd(16).substring(0, 16);
            const successStr = String(success).padStart(8);
            const errorsStr = String(errors).padStart(8);
            const totalStr = String(plan.total).padStart(8);
            
            console.log(`│ ${planIdStr} │ ${planName} │ ${successStr} │ ${errorsStr} │ ${totalStr} │`);
        });
        
        console.log('├──────────────────────┴──────────────────┼──────────┼──────────┼──────────┤');
        const successTotal = String(totalSuccess).padStart(8);
        const errorTotal = String(totalError).padStart(8);
        const grandTotal = String(total.TotalMessages).padStart(8);
        console.log(`│ TOTAL${' '.repeat(33)} │ ${successTotal} │ ${errorTotal} │ ${grandTotal} │`);
        console.log('└────────────────────────────────────────┴──────────┴──────────┴──────────┘');
        
        // Afficher les statistiques détaillées
        console.log('\n📈 Statistiques détaillées:\n');
        console.log(`╔═══ Résumé global ═══`);
        console.log(`║ Total messages:     ${total.TotalMessages}`);
        console.log(`║ Subscriptions:      ${total.TotalSubscriptions}`);
        console.log(`║ Taux de succès:     ${((totalSuccess / total.TotalMessages) * 100).toFixed(1)}%`);
        console.log(`║`);
        console.log(`║ 📅 Période:`);
        if (total.FirstMessage) {
            console.log(`║    Première:  ${new Date(total.FirstMessage).toLocaleString('fr-CA')}`);
            console.log(`║    Dernière:  ${new Date(total.LastMessage).toLocaleString('fr-CA')}`);
            
            const duration = new Date(total.LastMessage) - new Date(total.FirstMessage);
            const days = Math.floor(duration / (1000 * 60 * 60 * 24));
            const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            console.log(`║    Durée:     ${days}j ${hours}h`);
        }
        console.log(`╚${'═'.repeat(50)}\n`);
        
        // Afficher les détails par plan
        console.log('📋 Détails par plan:\n');
        
        for (const planId of Object.keys(planGroups)) {
            const plan = planGroups[planId];
            const planRows = result.recordset.filter(r => (r.PlanId || 'N/A') === planId);
            
            console.log(`╔═══ ${planId} (${plan.planName}) ═══`);
            console.log(`║ Total messages:  ${plan.total}`);
            console.log(`║`);
            console.log(`║ 📊 Par statut:`);
            
            Object.keys(plan.statuses).forEach(status => {
                const count = plan.statuses[status];
                const percent = ((count / plan.total) * 100).toFixed(1);
                const statusLabel = status === '200' || status === '201' ? '✅' : '❌';
                console.log(`║    ${statusLabel} ${status}: ${count} (${percent}%)`);
            });
            
            if (planRows.length > 0) {
                const firstMsg = planRows.reduce((min, r) => r.FirstMessage < min ? r.FirstMessage : min, planRows[0].FirstMessage);
                const lastMsg = planRows.reduce((max, r) => r.LastMessage > max ? r.LastMessage : max, planRows[0].LastMessage);
                
                console.log(`║`);
                console.log(`║ 📅 Période:`);
                console.log(`║    ${new Date(firstMsg).toLocaleString('fr-CA')} → ${new Date(lastMsg).toLocaleString('fr-CA')}`);
            }
            
            console.log(`╚${'═'.repeat(50)}\n`);
        }
        
        await sql.close();
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    }
}

// Exécution
countMessages();
