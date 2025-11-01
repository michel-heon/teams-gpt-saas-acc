// scripts/list-plans-market.js
// Liste les plans avec leurs configurations Marketplace (limites, coûts, dimensions)
// Combine les données de la BD SaaS Accelerator avec la configuration locale
const sql = require('mssql');
const config = require('../../src/config');

// Configuration Marketplace depuis config.js
const marketplaceConfig = {
    dimensions: config.saas.dimensions || {},
    limits: config.saas.limits || {},
    costs: config.saas.costs || {},
    plans: config.saas.plans || {},
    meteringEnabled: config.marketplace?.enabled || false,
    meteringApiUrl: config.marketplace?.meteringApiUrl || 'N/A'
};

async function listPlansFromMarketplace() {
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
        
        // Récupérer les plans avec leurs dimensions et les abonnements actifs
        const result = await pool.request().query(`
            SELECT 
                p.Id,
                p.PlanId,
                p.DisplayName,
                p.Description,
                p.IsPerUser,
                p.IsmeteringSupported,
                STRING_AGG(ISNULL(md.Dimension, ''), ', ') AS Dimensions,
                COUNT(DISTINCT md.Id) AS DimensionCount,
                COUNT(DISTINCT s.Id) AS ActiveSubscriptions
            FROM Plans p
            LEFT JOIN MeteredDimensions md ON p.Id = md.PlanId
            LEFT JOIN Subscriptions s ON p.PlanId = s.AmpPlanId AND s.SubscriptionStatus = 'Subscribed'
            GROUP BY p.Id, p.PlanId, p.DisplayName, p.Description, p.IsPerUser, p.IsmeteringSupported
            ORDER BY p.PlanId
        `);
        
        console.log('✅ Plans disponibles avec configuration Marketplace:\n');
        
        // Afficher le tableau récapitulatif
        console.log('┌────────────────────┬────────────────────┬──────────┬───────────┬──────────┬─────────┐');
        console.log('│ Plan ID            │ Dimension          │ Limite/m │ Coût/msg  │ Metering │ Subs    │');
        console.log('├────────────────────┼────────────────────┼──────────┼───────────┼──────────┼─────────┤');
        
        result.recordset.forEach(plan => {
            // Trouver la configuration Marketplace correspondante
            let dimensionName = 'N/A';
            let limit = 'N/A';
            let cost = 'N/A';
            
            // Mapper le PlanId vers la configuration
            const planKey = plan.PlanId?.toLowerCase();
            
            // Chercher dans les dimensions configurées
            if (marketplaceConfig.dimensions.free && planKey.includes('dev')) {
                dimensionName = marketplaceConfig.dimensions.free;
                limit = marketplaceConfig.limits.free || 'N/A';
                cost = marketplaceConfig.costs.free?.toFixed(3) || 'N/A';
            } else if (marketplaceConfig.dimensions.pro && (planKey.includes('professional') || planKey === 'professional')) {
                dimensionName = marketplaceConfig.dimensions.pro;
                limit = marketplaceConfig.limits.pro || 'N/A';
                cost = marketplaceConfig.costs.pro?.toFixed(3) || 'N/A';
            } else if (marketplaceConfig.dimensions.proPlus && (planKey.includes('pro-plus') || planKey === 'pro-plus')) {
                dimensionName = marketplaceConfig.dimensions.proPlus;
                limit = marketplaceConfig.limits.proPlus || 'N/A';
                cost = marketplaceConfig.costs.proPlus?.toFixed(3) || 'N/A';
            } else if (planKey.includes('starter')) {
                dimensionName = 'starter';
                limit = '100';
                cost = '0.020';
            }
            
            const planId = (plan.PlanId || '').padEnd(18).substring(0, 18);
            const dimension = dimensionName.padEnd(18).substring(0, 18);
            const limitStr = (typeof limit === 'number' ? limit.toString() : limit).padStart(8);
            const costStr = (cost === 'N/A' ? cost : `$${cost}`).padStart(9);
            const metering = (plan.IsmeteringSupported ? 'Oui' : 'Non').padEnd(8);
            const subs = String(plan.ActiveSubscriptions || 0).padStart(7);
            
            console.log(`│ ${planId} │ ${dimension} │ ${limitStr} │ ${costStr} │ ${metering} │ ${subs} │`);
        });
        
        console.log('└────────────────────┴────────────────────┴──────────┴───────────┴──────────┴─────────┘');
        console.log(`\nTotal: ${result.recordset.length} plan(s)\n`);
        
        // Afficher la configuration Marketplace
        console.log('� Configuration Marketplace:\n');
        console.log(`╔═══ API Configuration ═══`);
        console.log(`║ Metering activé:   ${marketplaceConfig.meteringEnabled ? 'Oui' : 'Non'}`);
        console.log(`║ API URL:           ${marketplaceConfig.meteringApiUrl}`);
        console.log(`║`);
        console.log(`║ 💰 Dimensions configurées:`);
        console.log(`║    Free:     ${marketplaceConfig.dimensions.free || 'N/A'}`);
        console.log(`║    Pro:      ${marketplaceConfig.dimensions.pro || 'N/A'}`);
        console.log(`║    Pro+:     ${marketplaceConfig.dimensions.proPlus || 'N/A'}`);
        console.log(`║`);
        console.log(`║ 📊 Limites mensuelles (messages):`);
        console.log(`║    Free:     ${marketplaceConfig.limits.free || 'N/A'}`);
        console.log(`║    Pro:      ${marketplaceConfig.limits.pro || 'N/A'}`);
        console.log(`║    Pro+:     ${marketplaceConfig.limits.proPlus || 'N/A'}`);
        console.log(`║`);
        console.log(`║ 💵 Coûts par message (USD):`);
        console.log(`║    Free:     $${marketplaceConfig.costs.free?.toFixed(3) || 'N/A'}`);
        console.log(`║    Pro:      $${marketplaceConfig.costs.pro?.toFixed(3) || 'N/A'}`);
        console.log(`║    Pro+:     $${marketplaceConfig.costs.proPlus?.toFixed(3) || 'N/A'}`);
        console.log(`╚${'═'.repeat(50)}\n`);
        
        await sql.close();
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    }
}

// Exécution
listPlansFromMarketplace();
