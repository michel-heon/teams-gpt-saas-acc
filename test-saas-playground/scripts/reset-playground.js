// scripts/reset-playground.js
// Remettre à zéro toutes les subscriptions Playground
const sql = require('mssql');
const config = require('../../src/config');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper pour poser une question
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Connexion à la base de données
async function connectToDatabase() {
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
    
    return await sql.connect(dbConfig);
}

// Lister toutes les subscriptions
async function listAllSubscriptions(pool) {
    const result = await pool.request().query(`
        SELECT 
            Id, AMPSubscriptionId, Name, AMPPlanId, SubscriptionStatus,
            TeamsUserId, IsActive, CreateDate
        FROM Subscriptions
        ORDER BY CreateDate DESC
    `);
    
    return result.recordset;
}

// Supprimer toutes les subscriptions
async function deleteAllSubscriptions(pool) {
    const result = await pool.request().query(`DELETE FROM Subscriptions`);
    return result.rowsAffected[0];
}

// Supprimer uniquement les subscriptions Playground
async function deletePlaygroundSubscriptions(pool) {
    const result = await pool.request().query(`
        DELETE FROM Subscriptions
        WHERE Name LIKE '%Playground%' OR Name LIKE '%playground%' OR Name LIKE '%test%'
    `);
    return result.rowsAffected[0];
}

// Fonction principale
async function main() {
    let pool = null;
    
    try {
        console.log('🗑️  Reset des subscriptions Playground');
        console.log('═'.repeat(60) + '\n');
        
        console.log('⚠️  ATTENTION : Cette opération est DESTRUCTIVE!\n');
        
        // Connexion
        console.log('🔗 Connexion à la base de données...\n');
        pool = await connectToDatabase();
        console.log('   ✅ Connecté à sac-02-sql.database.windows.net\n');
        
        // Lister subscriptions existantes
        const subscriptions = await listAllSubscriptions(pool);
        
        if (subscriptions.length === 0) {
            console.log('✅ Aucune subscription trouvée. Rien à supprimer.\n');
            rl.close();
            await sql.close();
            return;
        }
        
        console.log(`📋 Subscriptions actuelles (${subscriptions.length}):\n`);
        subscriptions.forEach((sub, idx) => {
            const isPlayground = sub.Name && (
                sub.Name.toLowerCase().includes('playground') || 
                sub.Name.toLowerCase().includes('test')
            );
            const icon = isPlayground ? '🎮' : '📦';
            
            console.log(`   ${idx + 1}. ${icon} [ID: ${sub.Id}] ${sub.Name || 'N/A'}`);
            console.log(`      Plan: ${sub.AMPPlanId}`);
            console.log(`      Statut: ${sub.SubscriptionStatus}`);
            console.log(`      TeamsUserId: ${sub.TeamsUserId || 'Non lié'}`);
            console.log('');
        });
        
        // Compter Playground subscriptions
        const playgroundCount = subscriptions.filter(sub => 
            sub.Name && (
                sub.Name.toLowerCase().includes('playground') || 
                sub.Name.toLowerCase().includes('test')
            )
        ).length;
        
        // Options
        console.log('❓ Que voulez-vous faire?\n');
        console.log(`   A) Supprimer uniquement les subscriptions Playground/Test (${playgroundCount})`);
        console.log(`   B) Supprimer TOUTES les subscriptions (${subscriptions.length}) ⚠️  DANGEREUX`);
        console.log('   Q) Quitter sans modification\n');
        
        const choice = (await question('Votre choix [A/B/Q]: ')).trim().toUpperCase();
        console.log('');
        
        if (choice === 'Q') {
            console.log('❌ Annulé par l\'utilisateur\n');
            rl.close();
            await sql.close();
            return;
        }
        
        if (!['A', 'B'].includes(choice)) {
            console.log('❌ Choix invalide. Abandon.\n');
            rl.close();
            await sql.close();
            return;
        }
        
        // Afficher avertissement
        if (choice === 'A') {
            console.log(`⚠️  Vous allez supprimer ${playgroundCount} subscription(s) Playground/Test\n`);
        } else {
            console.log(`⚠️  Vous allez supprimer TOUTES les ${subscriptions.length} subscriptions!\n`);
            console.log('🚨 CETTE OPÉRATION EST IRRÉVERSIBLE!\n');
        }
        
        // Double confirmation
        const confirm1 = await question('Êtes-vous SÛR de vouloir continuer? Tapez "OUI" en majuscules: ');
        if (confirm1.trim() !== 'OUI') {
            console.log('\n❌ Annulé par l\'utilisateur\n');
            rl.close();
            await sql.close();
            return;
        }
        
        const confirm2 = await question('Dernière confirmation. Tapez "SUPPRIMER" pour confirmer: ');
        if (confirm2.trim() !== 'SUPPRIMER') {
            console.log('\n❌ Annulé par l\'utilisateur\n');
            rl.close();
            await sql.close();
            return;
        }
        
        // Effectuer la suppression
        console.log('\n🗑️  Suppression en cours...\n');
        
        let deletedCount;
        if (choice === 'A') {
            deletedCount = await deletePlaygroundSubscriptions(pool);
        } else {
            deletedCount = await deleteAllSubscriptions(pool);
        }
        
        // Vérification
        const remaining = await listAllSubscriptions(pool);
        
        console.log('═'.repeat(60));
        console.log('✅ Suppression effectuée!\n');
        console.log('📊 Résultat:\n');
        console.log(`   Subscriptions supprimées: ${deletedCount}`);
        console.log(`   Subscriptions restantes: ${remaining.length}\n`);
        
        if (remaining.length > 0) {
            console.log('📋 Subscriptions restantes:\n');
            remaining.forEach((sub, idx) => {
                console.log(`   ${idx + 1}. [ID: ${sub.Id}] ${sub.Name || 'N/A'}`);
                console.log(`      Plan: ${sub.AMPPlanId}`);
                console.log('');
            });
        }
        
        console.log('═'.repeat(60));
        
        console.log('\n📋 Prochaines étapes:\n');
        console.log('   1. Créer une nouvelle subscription Playground:');
        console.log('      → make setup-playground\n');
        console.log('   2. Ou importer des données de test:');
        console.log('      → Exécuter les scripts de migration SQL\n');
        
        rl.close();
        await sql.close();
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        console.error('\n💡 Vérifiez:');
        console.error('   • Connexion Azure CLI: az login');
        console.error('   • Permissions sur la base de données');
        console.error('   • Aucune contrainte FK ne bloque la suppression\n');
        
        if (pool) {
            await sql.close();
        }
        rl.close();
        process.exit(1);
    }
}

// Exécution
main();
