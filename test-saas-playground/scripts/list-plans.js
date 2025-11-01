// scripts/list-plans.js
const sql = require('mssql');
const config = require('../../src/config');

async function listPlans() {
    try {
        // Configuration de la connexion avec Azure AD Default Authentication
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
        
        console.log(`🔗 Connexion à ${config.saas.dbServer}/${config.saas.dbName}...`);
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request().query(`
            SELECT 
                p.Id,
                p.PlanId,
                p.DisplayName,
                p.Description,
                p.IsPerUser,
                p.IsmeteringSupported,
                p.PlanGUID,
                STRING_AGG(ISNULL(md.Dimension, ''), ', ') AS Dimensions,
                COUNT(md.Id) AS DimensionCount
            FROM Plans p
            LEFT JOIN MeteredDimensions md ON p.Id = md.PlanId
            GROUP BY p.Id, p.PlanId, p.DisplayName, p.Description, p.IsPerUser, p.IsmeteringSupported, p.PlanGUID
            ORDER BY p.PlanId
        `);
        
        console.log('\n✅ Plans disponibles:\n');
        
        // Afficher l'en-tête du tableau
        console.log('┌─────────────────────┬────────────────────────┬─────────────┬──────────┬───────────────────────┐');
        console.log('│ Plan ID             │ Nom                    │ Type        │ Metering │ Dimensions            │');
        console.log('├─────────────────────┼────────────────────────┼─────────────┼──────────┼───────────────────────┤');
        
        result.recordset.forEach(plan => {
            const planId = (plan.PlanId || '').padEnd(19).substring(0, 19);
            const displayName = (plan.DisplayName || 'N/A').padEnd(22).substring(0, 22);
            const type = (plan.IsPerUser ? 'Par user' : 'Flat rate').padEnd(11);
            const metering = (plan.IsmeteringSupported ? 'Oui' : 'Non').padEnd(8);
            const dimensions = (plan.Dimensions || 'Aucune').padEnd(21).substring(0, 21);
            
            console.log(`│ ${planId} │ ${displayName} │ ${type} │ ${metering} │ ${dimensions} │`);
        });
        
        console.log('└─────────────────────┴────────────────────────┴─────────────┴──────────┴───────────────────────┘');
        console.log(`\nTotal: ${result.recordset.length} plan(s)\n`);
        
        // Afficher les détails complets pour chaque plan
        console.log('📋 Détails des plans:\n');
        
        for (const plan of result.recordset) {
            // Récupérer les dimensions détaillées pour ce plan
            const dimensions = await pool.request()
                .input('planId', sql.Int, plan.Id)
                .query(`
                    SELECT Dimension, Description
                    FROM MeteredDimensions
                    WHERE PlanId = @planId
                    ORDER BY Dimension
                `);
            
            console.log(`╔═══ ${plan.PlanId} (${plan.DisplayName}) ═══`);
            console.log(`║ ID interne:    ${plan.Id}`);
            console.log(`║ GUID:          ${plan.PlanGUID}`);
            console.log(`║ Type:          ${plan.IsPerUser ? 'Par utilisateur' : 'Tarif fixe'}`);
            console.log(`║ Metering:      ${plan.IsmeteringSupported ? 'Activé' : 'Désactivé'}`);
            if (plan.Description) {
                console.log(`║ Description:   ${plan.Description}`);
            }
            
            if (dimensions.recordset.length > 0) {
                console.log(`║`);
                console.log(`║ 💰 Dimensions métrées (${dimensions.recordset.length}):`);
                dimensions.recordset.forEach(dim => {
                    console.log(`║    • ${dim.Dimension}${dim.Description ? ' - ' + dim.Description : ''}`);
                });
            }
            console.log(`╚${'═'.repeat(50)}\n`);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

listPlans();
