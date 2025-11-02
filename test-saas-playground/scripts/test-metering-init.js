/**
 * Test d'initialisation du service Marketplace Metering
 * Vérifie que la configuration est correctement lue depuis la base de données
 */

const sql = require('mssql');

// Configuration base de données (depuis .env.playground)
const dbConfig = {
    server: process.env.SAAS_DB_SERVER || 'localhost',
    database: process.env.SAAS_DB_NAME,
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

async function testMeteringInit() {
    console.log('🔍 Test d\'initialisation du service Marketplace Metering\n');
    
    let pool;
    try {
        // 1. Connexion à la base de données
        console.log('1️⃣  Connexion à la base de données...');
        pool = await sql.connect(dbConfig);
        console.log('   ✅ Connecté\n');
        
        // 2. Lecture de IsMeteredBillingEnabled depuis ApplicationConfiguration
        console.log('2️⃣  Lecture de IsMeteredBillingEnabled depuis ApplicationConfiguration...');
        const result = await pool.request()
            .input('name', sql.NVarChar(50), 'IsMeteredBillingEnabled')
            .query(`
                SELECT [Name], [Value], [Description]
                FROM [dbo].[ApplicationConfiguration]
                WHERE [Name] = @name
            `);
        
        if (result.recordset.length === 0) {
            console.log('   ❌ IsMeteredBillingEnabled NOT FOUND in database');
            console.log('   ⚠️  Le service utilisera la variable d\'environnement en fallback\n');
        } else {
            const config = result.recordset[0];
            const enabled = config.Value.toLowerCase() === 'true';
            
            console.log('   ✅ Configuration trouvée:');
            console.log(`      Name: ${config.Name}`);
            console.log(`      Value: ${config.Value}`);
            console.log(`      Enabled: ${enabled}`);
            console.log(`      Description: ${config.Description}\n`);
            
            if (!enabled) {
                console.log('   ⚠️  Le metering est DÉSACTIVÉ dans la base de données');
                console.log('   ℹ️  Pour activer, exécuter:');
                console.log('      UPDATE [dbo].[ApplicationConfiguration]');
                console.log('      SET [Value] = \'true\'');
                console.log('      WHERE [Name] = \'IsMeteredBillingEnabled\'\n');
                return;
            }
        }
        
        // 3. Vérification des variables d'environnement (fallback)
        console.log('3️⃣  Vérification des variables d\'environnement (fallback)...');
        const envVars = {
            MARKETPLACE_METERING_ENABLED: process.env.MARKETPLACE_METERING_ENABLED,
            TENANT_ID: process.env.TENANT_ID ? '✅ Défini' : '❌ Manquant',
            CLIENT_ID: process.env.CLIENT_ID ? '✅ Défini' : '❌ Manquant',
            CLIENT_SECRET: process.env.CLIENT_SECRET ? '✅ Défini' : '❌ Manquant'
        };
        
        console.log('   Variables d\'environnement:');
        Object.entries(envVars).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
        });
        console.log('');
        
        // 4. Simulation de la logique d'initialisation de meteringApiService
        console.log('4️⃣  Simulation de la logique d\'initialisation...');
        
        if (result.recordset.length > 0) {
            const dbValue = result.recordset[0].Value;
            const enabled = dbValue.toLowerCase() === 'true';
            console.log(`   [MeteringApiService] IsMeteredBillingEnabled from DB: ${dbValue} → ${enabled}`);
            
            if (!enabled) {
                console.log('   [MeteringApiService] Marketplace metering is DISABLED in database');
                console.log('   ❌ Le service NE SERA PAS initialisé\n');
                return;
            }
        } else {
            console.log('   [MeteringApiService] IsMeteredBillingEnabled not found in DB, using environment variable');
            const envEnabled = process.env.MARKETPLACE_METERING_ENABLED === 'true';
            
            if (!envEnabled) {
                console.log(`   [MeteringApiService] MARKETPLACE_METERING_ENABLED="${process.env.MARKETPLACE_METERING_ENABLED}" → ${envEnabled}`);
                console.log('   [MeteringApiService] Marketplace metering is DISABLED via config');
                console.log('   ❌ Le service NE SERA PAS initialisé\n');
                return;
            }
        }
        
        console.log('   [MeteringApiService] ✅ Marketplace metering is ENABLED');
        
        // Vérification des configurations requises
        const requiredConfig = ['TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET'];
        const missingConfig = requiredConfig.filter(key => !process.env[key]);
        
        if (missingConfig.length > 0) {
            console.log(`   ❌ [MeteringApiService] Missing required configuration: ${missingConfig.join(', ')}`);
            console.log('   ⚠️  Le service ne pourra pas s\'authentifier auprès de Azure AD\n');
            return;
        }
        
        console.log('   [MeteringApiService] Configuration validated');
        console.log('   ✅ Le service SERA initialisé et pourra émettre vers l\'API\n');
        
        console.log('═══════════════════════════════════════════════════');
        console.log('✅ Tous les tests ont réussi');
        console.log('   Le service Marketplace Metering devrait fonctionner');
        console.log('═══════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('\n❌ Erreur lors du test:', error.message);
        if (error.code) {
            console.error(`   Code: ${error.code}`);
        }
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

// Exécution
testMeteringInit()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Erreur fatale:', error);
        process.exit(1);
    });
