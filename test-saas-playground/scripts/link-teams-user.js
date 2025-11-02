// scripts/link-teams-user.js
// Lier un TeamsUserId réel à une subscription Playground existante
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

// Lister les subscriptions Playground (sans TeamsUserId)
async function listPlaygroundSubscriptions(pool) {
    const result = await pool.request().query(`
        SELECT 
            Id, AMPSubscriptionId, Name, AMPPlanId, SubscriptionStatus,
            TeamsUserId, TenantId, IsActive, CreateDate
        FROM Subscriptions
        WHERE Name LIKE '%Playground%' OR Name LIKE '%playground%'
        ORDER BY CreateDate DESC
    `);
    
    return result.recordset;
}

// Lier le TeamsUserId
async function linkTeamsUser(pool, subscriptionId, teamsUserId, tenantId) {
    const result = await pool.request()
        .input('id', sql.Int, subscriptionId)
        .input('teamsUserId', sql.NVarChar, teamsUserId)
        .input('tenantId', sql.NVarChar, tenantId || null)
        .query(`
            UPDATE Subscriptions
            SET 
                TeamsUserId = @teamsUserId,
                TenantId = @tenantId,
                ModifyDate = GETUTCDATE()
            WHERE Id = @id
        `);
    
    return result.rowsAffected[0] > 0;
}

// Fonction principale
async function main() {
    let pool = null;
    
    try {
        console.log('🔗 Liaison d\'un TeamsUserId à une subscription Playground');
        console.log('═'.repeat(60) + '\n');
        
        // Connexion
        console.log('🔗 Connexion à la base de données...\n');
        pool = await connectToDatabase();
        console.log('   ✅ Connecté à sac-02-sql.database.windows.net\n');
        
        // Lister subscriptions Playground
        const subscriptions = await listPlaygroundSubscriptions(pool);
        
        if (subscriptions.length === 0) {
            console.log('❌ Aucune subscription Playground trouvée');
            console.log('💡 Créez-en une avec: make setup-playground\n');
            rl.close();
            await sql.close();
            return;
        }
        
        console.log('📋 Subscriptions Playground disponibles:\n');
        subscriptions.forEach((sub, idx) => {
            const linkedIcon = sub.TeamsUserId ? '🔗' : '⚠️';
            console.log(`   ${idx + 1}. [ID: ${sub.Id}] ${sub.Name || 'N/A'} ${linkedIcon}`);
            console.log(`      Plan: ${sub.AMPPlanId}`);
            console.log(`      Statut: ${sub.SubscriptionStatus}`);
            console.log(`      TeamsUserId: ${sub.TeamsUserId || 'Non lié'}`);
            console.log('');
        });
        
        // Demander quelle subscription
        const subChoice = await question(`Quelle subscription voulez-vous lier? [1]: `);
        const subIndex = parseInt(subChoice.trim() || '1') - 1;
        
        if (subIndex < 0 || subIndex >= subscriptions.length) {
            console.log('\n❌ Choix invalide. Abandon.\n');
            rl.close();
            await sql.close();
            return;
        }
        
        const selectedSub = subscriptions[subIndex];
        console.log(`\n✅ Subscription sélectionnée: ${selectedSub.Name} (ID: ${selectedSub.Id})\n`);
        
        // Informations sur comment obtenir le TeamsUserId
        console.log('💡 Comment obtenir votre TeamsUserId:\n');
        console.log('   1. Lancez le bot en mode Playground');
        console.log('   2. Envoyez un message');
        console.log('   3. Regardez les logs du bot, vous verrez:');
        console.log('      [SubscriptionCheck] Checking subscription for user: 29:XXXXX-XXXXX...\n');
        console.log('   Le TeamsUserId commence généralement par "29:" suivi d\'un GUID\n');
        
        // Demander le TeamsUserId
        const teamsUserId = await question('TeamsUserId à lier: ');
        
        if (!teamsUserId.trim()) {
            console.log('\n❌ TeamsUserId vide. Abandon.\n');
            rl.close();
            await sql.close();
            return;
        }
        
        // Demander le TenantId (optionnel)
        const tenantId = await question('TenantId (optionnel, pressez Entrée pour ignorer): ');
        
        console.log('\n📋 Récapitulatif:\n');
        console.log(`   Subscription: ${selectedSub.Name} (ID: ${selectedSub.Id})`);
        console.log(`   Plan: ${selectedSub.AMPPlanId}`);
        console.log(`   TeamsUserId: ${teamsUserId.trim()}`);
        console.log(`   TenantId: ${tenantId.trim() || 'Non spécifié'}\n`);
        
        // Confirmation
        const confirm = await question('⚠️  Confirmer la liaison? [o/N]: ');
        if (confirm.trim().toLowerCase() !== 'o') {
            console.log('\n❌ Annulé par l\'utilisateur\n');
            rl.close();
            await sql.close();
            return;
        }
        
        // Effectuer la liaison
        console.log('\n🔧 Liaison en cours...\n');
        const success = await linkTeamsUser(
            pool, 
            selectedSub.Id, 
            teamsUserId.trim(), 
            tenantId.trim() || null
        );
        
        if (!success) {
            throw new Error('Échec de la liaison');
        }
        
        // Vérifier
        const verification = await pool.request()
            .input('id', sql.Int, selectedSub.Id)
            .query(`SELECT TeamsUserId, TenantId FROM Subscriptions WHERE Id = @id`);
        
        const updated = verification.recordset[0];
        
        console.log('═'.repeat(60));
        console.log('✅ Liaison effectuée avec succès!\n');
        console.log('📋 Configuration finale:\n');
        console.log(`   Subscription ID: ${selectedSub.Id}`);
        console.log(`   Nom: ${selectedSub.Name}`);
        console.log(`   Plan: ${selectedSub.AMPPlanId}`);
        console.log(`   TeamsUserId: ${updated.TeamsUserId} ✅`);
        console.log(`   TenantId: ${updated.TenantId || 'N/A'}`);
        console.log('\n' + '═'.repeat(60));
        
        console.log('\n📋 Prochaines étapes:\n');
        console.log('   1. Lancez le bot en mode Playground');
        console.log('   2. Envoyez un message avec l\'utilisateur lié');
        console.log('   3. Vérifiez le comptage: make message-count\n');
        
        rl.close();
        await sql.close();
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        console.error('\n💡 Vérifiez:');
        console.error('   • Connexion Azure CLI: az login');
        console.error('   • Permissions sur la base de données');
        console.error('   • Format du TeamsUserId (commence par "29:" généralement)\n');
        
        if (pool) {
            await sql.close();
        }
        rl.close();
        process.exit(1);
    }
}

// Exécution
main();
