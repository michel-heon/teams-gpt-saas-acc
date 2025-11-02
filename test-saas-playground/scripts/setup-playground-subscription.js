// scripts/setup-playground-subscription.js
// Configuration interactive de la subscription Playground
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

// Lister les subscriptions existantes
async function listCurrentSubscriptions(pool) {
    const result = await pool.request().query(`
        SELECT 
            Id, AMPSubscriptionId, Name, AMPPlanId, SubscriptionStatus,
            TeamsUserId, TenantId, IsActive, CreateDate
        FROM Subscriptions
        ORDER BY CreateDate DESC
    `);
    
    return result.recordset;
}

// Lister les plans disponibles
async function listAvailablePlans(pool) {
    const result = await pool.request().query(`
        SELECT PlanId, DisplayName, Description
        FROM Plans
        ORDER BY PlanId
    `);
    
    return result.recordset;
}

// Afficher l'état actuel
async function displayCurrentState(subscriptions) {
    console.log('\n📊 État actuel de la base de données:\n');
    
    if (subscriptions.length === 0) {
        console.log('   ⚠️  Aucune subscription trouvée\n');
        return;
    }
    
    subscriptions.forEach((sub, idx) => {
        const statusIcon = sub.SubscriptionStatus === 'Subscribed' ? '✅' : '❌';
        const activeIcon = sub.IsActive ? '✅' : '❌';
        
        console.log(`   ${idx + 1}. Subscription #${sub.Id}`);
        console.log(`      Nom: ${sub.Name || 'N/A'}`);
        console.log(`      Plan: ${sub.AMPPlanId}`);
        console.log(`      Statut: ${sub.SubscriptionStatus} ${statusIcon}`);
        console.log(`      Active: ${sub.IsActive} ${activeIcon}`);
        console.log(`      TeamsUserId: ${sub.TeamsUserId || 'Non lié'}`);
        console.log(`      TenantId: ${sub.TenantId || 'N/A'}`);
        console.log('');
    });
}

// Afficher les options
function displayOptions() {
    console.log('❓ Que voulez-vous faire?\n');
    console.log('   A) Corriger la subscription existante #1');
    console.log('      → Change le statut à \'Subscribed\'');
    console.log('      → Permet de choisir un nouveau plan');
    console.log('      → (Le TeamsUserId sera lié automatiquement au premier message)\n');
    
    console.log('   B) Créer une nouvelle subscription Playground');
    console.log('      → Neuve, propre, statut correct');
    console.log('      → Sera liée au premier utilisateur qui envoie un message\n');
    
    console.log('   C) Supprimer toutes les subscriptions et créer une nouvelle');
    console.log('      → Repart à zéro (⚠️  destructif)');
    console.log('      → Crée une subscription propre\n');
    
    console.log('   Q) Quitter sans modification\n');
}

// Option A : Corriger subscription existante
async function updateExistingSubscription(pool, subscriptionId, planId) {
    console.log(`\n🔧 Mise à jour de la subscription #${subscriptionId}...\n`);
    
    const result = await pool.request()
        .input('id', sql.Int, subscriptionId)
        .input('planId', sql.NVarChar, planId)
        .query(`
            UPDATE Subscriptions
            SET 
                SubscriptionStatus = 'Subscribed',
                AMPPlanId = @planId,
                Name = 'Playground Subscription',
                IsActive = 1,
                ModifyDate = GETUTCDATE(),
                TeamsUserId = NULL,
                TenantId = NULL
            WHERE Id = @id
        `);
    
    return result.rowsAffected[0] > 0;
}

// Option B : Créer nouvelle subscription
async function createNewSubscription(pool, planId) {
    console.log('\n🔧 Création d\'une nouvelle subscription Playground...\n');
    
    const result = await pool.request()
        .input('ampSubId', sql.UniqueIdentifier, null)
        .input('planId', sql.NVarChar, planId)
        .query(`
            INSERT INTO Subscriptions (
                AMPSubscriptionId,
                Name,
                AMPPlanId,
                AMPQuantity,
                SubscriptionStatus,
                IsActive,
                CreateDate
            ) VALUES (
                NEWID(),
                'Playground Subscription',
                @planId,
                1,
                'Subscribed',
                1,
                GETUTCDATE()
            );
            SELECT SCOPE_IDENTITY() AS NewId;
        `);
    
    return result.recordset[0].NewId;
}

// Option C : Supprimer toutes et créer nouvelle
async function resetAndCreateNew(pool, planId) {
    console.log('\n⚠️  Suppression de toutes les subscriptions existantes...\n');
    
    // Supprimer toutes les subscriptions
    await pool.request().query(`DELETE FROM Subscriptions`);
    console.log('   ✅ Subscriptions supprimées\n');
    
    // Créer nouvelle subscription
    const newId = await createNewSubscription(pool, planId);
    return newId;
}

// Vérifier la configuration finale
async function verifySetup(pool) {
    const result = await pool.request().query(`
        SELECT TOP 1
            Id, Name, AMPPlanId, SubscriptionStatus, IsActive, TeamsUserId
        FROM Subscriptions
        WHERE SubscriptionStatus = 'Subscribed' AND IsActive = 1
        ORDER BY CreateDate DESC
    `);
    
    return result.recordset[0];
}

// Afficher le résumé
function displaySummary(subscription) {
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Configuration terminée avec succès!\n');
    console.log('📋 Résumé de la configuration:\n');
    console.log(`   Subscription ID: ${subscription.Id}`);
    console.log(`   Nom: ${subscription.Name}`);
    console.log(`   Plan: ${subscription.AMPPlanId}`);
    console.log(`   Statut: ${subscription.SubscriptionStatus} ✅`);
    console.log(`   Active: ${subscription.IsActive} ✅`);
    console.log(`   TeamsUserId: ${subscription.TeamsUserId || 'Sera lié automatiquement'}`);
    console.log('\n' + '═'.repeat(60));
    
    console.log('\n📋 Prochaines étapes:\n');
    console.log('   1. Lancer le bot en mode Playground:');
    console.log('      → Depuis la racine du projet: npm run start:playground');
    console.log('      → Ou avec la task VSCode: "Start Agent in Microsoft 365 Agents Playground"\n');
    
    console.log('   2. Envoyer un message dans Teams Playground');
    console.log('      → Votre TeamsUserId sera automatiquement lié à la subscription\n');
    
    console.log('   3. Vérifier le comptage des messages:');
    console.log('      → make message-count\n');
    
    console.log('   4. Vérifier les émissions vers Marketplace:');
    console.log('      → make message-count-market\n');
    
    console.log('💡 Notes importantes:\n');
    console.log('   • Le mode permissif (SAAS_PERMISSIVE_MODE) est activé en playground');
    console.log('   • L\'application fonctionnera même si la liaison TeamsUserId échoue');
    console.log('   • Le comptage des messages sera activé dès le premier message envoyé\n');
    
    console.log('🔗 Pour plus d\'informations:');
    console.log('   → Consultez test-saas-playground/README.md\n');
}

// Fonction principale
async function main() {
    let pool = null;
    
    try {
        console.log('🔧 Configuration de la subscription Playground');
        console.log('═'.repeat(60) + '\n');
        
        // Connexion
        console.log('🔗 Connexion à la base de données...\n');
        pool = await connectToDatabase();
        console.log('   ✅ Connecté à sac-02-sql.database.windows.net\n');
        
        // Lister subscriptions existantes
        const subscriptions = await listCurrentSubscriptions(pool);
        await displayCurrentState(subscriptions);
        
        // Lister plans disponibles
        const plans = await listAvailablePlans(pool);
        console.log('📋 Plans disponibles:\n');
        plans.forEach((plan, idx) => {
            console.log(`   ${idx + 1}. ${plan.PlanId} - ${plan.DisplayName}`);
        });
        console.log('');
        
        // Afficher options
        displayOptions();
        
        // Demander le choix
        const choice = (await question('Votre choix [A/B/C/Q]: ')).trim().toUpperCase();
        console.log('');
        
        if (choice === 'Q') {
            console.log('❌ Annulé par l\'utilisateur\n');
            rl.close();
            await sql.close();
            return;
        }
        
        if (!['A', 'B', 'C'].includes(choice)) {
            console.log('❌ Choix invalide. Abandon.\n');
            rl.close();
            await sql.close();
            return;
        }
        
        // Demander le plan
        const planInput = await question(`Quel plan voulez-vous utiliser? [${plans[0].PlanId}]: `);
        const selectedPlan = planInput.trim() || plans[0].PlanId;
        
        // Vérifier que le plan existe
        const planExists = plans.find(p => p.PlanId === selectedPlan);
        if (!planExists) {
            console.log(`\n❌ Plan "${selectedPlan}" non trouvé. Abandon.\n`);
            rl.close();
            await sql.close();
            return;
        }
        
        console.log(`\n✅ Plan sélectionné: ${selectedPlan}\n`);
        
        // Confirmation
        const confirm = await question(`⚠️  Confirmer la modification? [o/N]: `);
        if (confirm.trim().toLowerCase() !== 'o') {
            console.log('\n❌ Annulé par l\'utilisateur\n');
            rl.close();
            await sql.close();
            return;
        }
        
        // Exécuter l'action choisie
        let result;
        if (choice === 'A') {
            if (subscriptions.length === 0) {
                console.log('\n❌ Aucune subscription à mettre à jour. Utilisez l\'option B.\n');
                rl.close();
                await sql.close();
                return;
            }
            result = await updateExistingSubscription(pool, subscriptions[0].Id, selectedPlan);
            if (!result) {
                throw new Error('Échec de la mise à jour');
            }
        } else if (choice === 'B') {
            result = await createNewSubscription(pool, selectedPlan);
            if (!result) {
                throw new Error('Échec de la création');
            }
        } else if (choice === 'C') {
            result = await resetAndCreateNew(pool, selectedPlan);
            if (!result) {
                throw new Error('Échec du reset et de la création');
            }
        }
        
        // Vérifier la configuration finale
        const finalConfig = await verifySetup(pool);
        
        if (!finalConfig) {
            throw new Error('Configuration non trouvée après modification');
        }
        
        // Afficher le résumé
        displaySummary(finalConfig);
        
        rl.close();
        await sql.close();
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        console.error('\n💡 Vérifiez:');
        console.error('   • Connexion Azure CLI: az login');
        console.error('   • Permissions sur la base de données');
        console.error('   • Configuration dans src/config.js\n');
        
        if (pool) {
            await sql.close();
        }
        rl.close();
        process.exit(1);
    }
}

// Exécution
main();
