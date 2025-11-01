// scripts/message-count-market.js
// Compte les messages émis vers l'API Marketplace
// Analyse les logs pour identifier les émissions réussies vs échouées
const sql = require('mssql');
const config = require('../../src/config');

async function countMarketplaceMessages() {
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
        
        // Analyser les messages avec ResponseJson pour identifier ceux émis vers Marketplace
        // Les messages avec StatusCode 200/201 ET un ResponseJson valide sont considérés comme émis
        const result = await pool.request().query(`
            SELECT 
                s.AmpPlanId AS PlanId,
                p.DisplayName AS PlanName,
                mal.StatusCode,
                COUNT(*) AS MessageCount,
                SUM(CASE WHEN mal.ResponseJson IS NOT NULL AND mal.ResponseJson != '' THEN 1 ELSE 0 END) AS WithResponse,
                MIN(mal.CreatedDate) AS FirstMessage,
                MAX(mal.CreatedDate) AS LastMessage
            FROM MeteredAuditLogs mal
            INNER JOIN Subscriptions s ON mal.SubscriptionId = s.Id
            LEFT JOIN Plans p ON s.AmpPlanId = p.PlanId
            WHERE mal.StatusCode IN ('200', '201', '202', '400', '409', '500')
            GROUP BY s.AmpPlanId, p.DisplayName, mal.StatusCode
            ORDER BY s.AmpPlanId, mal.StatusCode
        `);
        
        // Obtenir les statistiques globales
        const totalResult = await pool.request().query(`
            SELECT 
                COUNT(*) AS TotalMessages,
                SUM(CASE WHEN StatusCode IN ('200', '201', '202') THEN 1 ELSE 0 END) AS SuccessCount,
                SUM(CASE WHEN StatusCode NOT IN ('200', '201', '202') THEN 1 ELSE 0 END) AS ErrorCount,
                SUM(CASE WHEN ResponseJson IS NOT NULL AND ResponseJson != '' THEN 1 ELSE 0 END) AS WithResponse,
                COUNT(DISTINCT SubscriptionId) AS TotalSubscriptions,
                MIN(CreatedDate) AS FirstMessage,
                MAX(CreatedDate) AS LastMessage
            FROM MeteredAuditLogs
            WHERE StatusCode IN ('200', '201', '202', '400', '409', '500')
        `);
        
        const total = totalResult.recordset[0];
        
        console.log('📡 Messages émis vers l\'API Azure Marketplace:\n');
        console.log(`   API: ${config.marketplace?.meteringApiUrl || 'N/A'}`);
        console.log(`   État: ${config.marketplace?.enabled ? '✅ Activé' : '⚠️  Désactivé'}\n`);
        
        if (result.recordset.length === 0) {
            console.log('⚠️  Aucun message émis vers Marketplace trouvé\n');
            console.log('💡 Note: Les messages doivent avoir un StatusCode (200, 201, 202, 400, 409, 500)\n');
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
                    success: 0,
                    errors: 0,
                    withResponse: 0,
                    total: 0,
                    statuses: {}
                };
            }
            
            const isSuccess = ['200', '201', '202'].includes(row.StatusCode);
            planGroups[planId].statuses[row.StatusCode] = row.MessageCount;
            planGroups[planId].total += row.MessageCount;
            planGroups[planId].withResponse += row.WithResponse;
            
            if (isSuccess) {
                planGroups[planId].success += row.MessageCount;
            } else {
                planGroups[planId].errors += row.MessageCount;
            }
        });
        
        // Afficher le tableau récapitulatif
        console.log('┌──────────────────────┬──────────────────┬──────────┬──────────┬──────────┬──────────┐');
        console.log('│ Plan ID              │ Nom              │ Émis ✅  │ Échecs ❌ │ Réponses │ Total    │');
        console.log('├──────────────────────┼──────────────────┼──────────┼──────────┼──────────┼──────────┤');
        
        let totalSuccess = 0;
        let totalError = 0;
        let totalWithResponse = 0;
        
        Object.keys(planGroups).forEach(planId => {
            const plan = planGroups[planId];
            
            totalSuccess += plan.success;
            totalError += plan.errors;
            totalWithResponse += plan.withResponse;
            
            const planIdStr = planId.padEnd(20).substring(0, 20);
            const planName = plan.planName.padEnd(16).substring(0, 16);
            const successStr = String(plan.success).padStart(8);
            const errorsStr = String(plan.errors).padStart(8);
            const responseStr = String(plan.withResponse).padStart(8);
            const totalStr = String(plan.total).padStart(8);
            
            console.log(`│ ${planIdStr} │ ${planName} │ ${successStr} │ ${errorsStr} │ ${responseStr} │ ${totalStr} │`);
        });
        
        console.log('├──────────────────────┴──────────────────┼──────────┼──────────┼──────────┼──────────┤');
        const successTotal = String(totalSuccess).padStart(8);
        const errorTotal = String(totalError).padStart(8);
        const responseTotal = String(totalWithResponse).padStart(8);
        const grandTotal = String(total.TotalMessages).padStart(8);
        console.log(`│ TOTAL${' '.repeat(33)} │ ${successTotal} │ ${errorTotal} │ ${responseTotal} │ ${grandTotal} │`);
        console.log('└────────────────────────────────────────┴──────────┴──────────┴──────────┴──────────┘');
        
        // Afficher les statistiques détaillées
        console.log('\n📈 Statistiques Marketplace:\n');
        console.log(`╔═══ Résumé des émissions ═══`);
        console.log(`║ Total émis:         ${total.TotalMessages}`);
        console.log(`║ Succès (2xx):       ${total.SuccessCount} (${((total.SuccessCount / total.TotalMessages) * 100).toFixed(1)}%)`);
        console.log(`║ Erreurs (4xx/5xx):  ${total.ErrorCount} (${((total.ErrorCount / total.TotalMessages) * 100).toFixed(1)}%)`);
        console.log(`║ Avec réponse API:   ${total.WithResponse}`);
        console.log(`║ Subscriptions:      ${total.TotalSubscriptions}`);
        console.log(`║`);
        
        if (total.FirstMessage) {
            console.log(`║ 📅 Période d'émission:`);
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
            
            console.log(`╔═══ ${planId} (${plan.planName}) ═══`);
            console.log(`║ Total émis:      ${plan.total}`);
            console.log(`║ Taux succès:     ${((plan.success / plan.total) * 100).toFixed(1)}%`);
            console.log(`║ Avec réponse:    ${plan.withResponse}`);
            console.log(`║`);
            console.log(`║ 📊 Codes de statut HTTP:`);
            
            const statusOrder = ['200', '201', '202', '400', '409', '500'];
            statusOrder.forEach(status => {
                if (plan.statuses[status]) {
                    const count = plan.statuses[status];
                    const percent = ((count / plan.total) * 100).toFixed(1);
                    const isSuccess = ['200', '201', '202'].includes(status);
                    const icon = isSuccess ? '✅' : '❌';
                    const label = {
                        '200': 'OK',
                        '201': 'Created',
                        '202': 'Accepted',
                        '400': 'Bad Request',
                        '409': 'Conflict',
                        '500': 'Server Error'
                    }[status];
                    
                    console.log(`║    ${icon} ${status} ${label}: ${count} (${percent}%)`);
                }
            });
            
            console.log(`╚${'═'.repeat(50)}\n`);
        }
        
        // Analyser les erreurs courantes si présentes
        if (totalError > 0) {
            console.log('⚠️  Analyse des erreurs:\n');
            
            const errorDetails = await pool.request().query(`
                SELECT TOP 5
                    mal.StatusCode,
                    mal.ResponseJson,
                    COUNT(*) AS ErrorCount
                FROM MeteredAuditLogs mal
                WHERE mal.StatusCode NOT IN ('200', '201', '202')
                GROUP BY mal.StatusCode, mal.ResponseJson
                ORDER BY COUNT(*) DESC
            `);
            
            if (errorDetails.recordset.length > 0) {
                console.log('╔═══ Top 5 erreurs ═══');
                errorDetails.recordset.forEach((err, idx) => {
                    console.log(`║ ${idx + 1}. Statut ${err.StatusCode}: ${err.ErrorCount} occurrence(s)`);
                    if (err.ResponseJson) {
                        try {
                            const response = JSON.parse(err.ResponseJson);
                            if (response.message) {
                                console.log(`║    Message: ${response.message.substring(0, 60)}`);
                            }
                        } catch (e) {
                            console.log(`║    Réponse: ${err.ResponseJson.substring(0, 60)}...`);
                        }
                    }
                });
                console.log(`╚${'═'.repeat(50)}\n`);
            }
        }
        
        await sql.close();
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    }
}

// Exécution
countMarketplaceMessages();
