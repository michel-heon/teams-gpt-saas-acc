# Plan de tests : Niveau 4 - Playground (Tests interactifs)

## 📊 État d'implémentation

**Version** : 1.0.0  
**Date** : Novembre 2025  
**Phase** : 2.5 - Infrastructure de test Playground

### ✅ Scripts implémentés

| Commande | Script | État | Description |
|----------|--------|------|-------------|
| `make list-plans` | `list-plans.js` | ✅ **Implémenté** | Liste tous les plans depuis la BD avec dimensions |
| `make list-plans-market` | `list-plans-market.js` | ✅ **Implémenté** | Plans avec config Marketplace (limites, coûts) |
| `make message-count` | `message-count.js` | ✅ **Implémenté** | Compte messages dans MeteredAuditLogs par plan |
| `make message-count-market` | `message-count-market.js` | ✅ **Implémenté** | Compte messages émis vers API Marketplace |
| `make message-diag` | `message-diag.js` | ✅ **Implémenté** | Diagnostic complet (BD, transit, scheduler, Marketplace) |
| `make setup-playground` | `setup-playground-subscription.js` | ✅ **Implémenté** | Configure subscription Playground (interactif) |
| `make link-teams-user` | `link-teams-user.js` | ✅ **Implémenté** | Lie TeamsUserId à subscription |
| `make reset-playground` | `reset-playground.js` | ✅ **Implémenté** | Supprime subscriptions Playground |

### 🔧 Utilitaires créés

- `check-schema.js` : Inspect schéma de table BD
- `check-tables.js` : Liste toutes les tables BD
- `check-hourly-aggregation.js` : Vérifie agrégation horaire
- `check-marketplace-config.js` : Vérifie configuration Marketplace
- `check-messages-by-hour.js` : Affiche messages par heure
- `test-metering-init.js` : Test initialisation metering

### 📝 Documentation

- ✅ `test-saas-playground/README.md` : Documentation complète des commandes et exemples
- ✅ Authentication Azure AD configurée (passwordless)
- ✅ Base de données testée : sac-02-sql.database.windows.net
- ✅ `doc/phase2/saas-accelerator-metered-scheduler.md` : Guide configuration Metered Scheduler

### ⚠️ Architecture modifiée (Novembre 2025)

**Ancienne architecture (supprimée):**
- ❌ `usageAggregationService.js` dans l'application Teams
- ❌ Buffer local `data/usage-buffer.json`
- ❌ Cron job dans l'application Teams

**Nouvelle architecture (correcte):**
- ✅ Teams app enregistre UNIQUEMENT dans `MeteredAuditLogs`
- ✅ SaaS Accelerator Metered Scheduler gère l'émission vers Marketplace API
- ✅ Séparation claire des responsabilités

Voir documentation: `doc/phase2/saas-accelerator-metered-scheduler.md`

### 🎯 Prochaines étapes

1. ✅ Configurer le Metered Scheduler dans le portail admin Azure
2. ✅ Tester l'émission automatique des messages en transit
3. ⏳ Créer scénarios de test additionnels

## Vue d'ensemble

Ce document décrit le **Niveau 4** de la stratégie de test : les tests interactifs en environnement Playground. Ce niveau permet de tester le système d'agrégation dans un environnement Teams réel avec des commandes de diagnostic interactives.

## Objectifs

### 1. **Validation en environnement réel Teams**
   - Tester le chatbot dans Microsoft 365 Agents Playground
   - Valider l'intégration complète : Bot → SaaS Accelerator → Marketplace API
   - Vérifier le comportement utilisateur réel

### 2. **Diagnostic interactif**
   - Inspecter l'état du système en temps réel
   - Vérifier les données de subscription
   - Monitorer le buffer d'agrégation
   - Valider les événements Marketplace

### 3. **Tests de scénarios utilisateur**
   - Envoyer des messages via l'interface Teams
   - Observer l'accumulation dans le buffer
   - Vérifier l'émission horaire vers Marketplace
   - Valider l'audit dans MeteredAuditLogs

## Architecture du Niveau 4

```
┌─────────────────────────────────────────────────────────────┐
│                    Niveau 4 - Playground                     │
│                                                               │
│  ┌──────────────────┐     ┌──────────────────┐              │
│  │  Teams Chatbot   │────▶│  Bot Service     │              │
│  │   (Playground)   │     │  (localhost:3978)│              │
│  └──────────────────┘     └──────────────────┘              │
│           │                        │                          │
│           │                        ▼                          │
│           │              ┌──────────────────┐                │
│           │              │ Aggregation      │                │
│           │              │ Service (buffer) │                │
│           │              └──────────────────┘                │
│           │                        │                          │
│           │                        ▼                          │
│           │              ┌──────────────────┐                │
│           └─────────────▶│  SaaS Database   │                │
│                          │  (Subscriptions, │                │
│                          │   MeteredAudit)  │                │
│                          └──────────────────┘                │
│                                    │                          │
│                                    ▼                          │
│                          ┌──────────────────┐                │
│                          │ Marketplace API  │                │
│                          │  (Azure Cloud)   │                │
│                          └──────────────────┘                │
│                                                               │
│  ┌─────────────────────────────────────────┐                │
│  │  Commandes de diagnostic (Makefile)     │                │
│  │  - make get-subscription                 │                │
│  │  - make get-plan                         │                │
│  │  - make set-plan PLAN=<name>            │                │
│  │  - make list-plans                       │                │
│  │  - make count-marketplace-messages       │                │
│  │  - make count-buffer-messages            │                │
│  │  - make show-buffer                      │                │
│  │  - make show-audit-logs                  │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Structure du répertoire

```
test-saas-playground/
├── Makefile                          # Commandes de diagnostic
├── README.md                         # Documentation du playground
├── scripts/
│   ├── get-subscription.js           # Récupère la subscription Playground
│   ├── get-plan.js                   # Récupère le plan actuel
│   ├── set-plan.js                   # Change le plan de subscription
│   ├── list-plans.js                 # Liste les plans disponibles
│   ├── count-marketplace-messages.js # Compte messages dans Marketplace API
│   ├── count-buffer-messages.js      # Compte messages dans buffer
│   ├── show-buffer.js                # Affiche contenu du buffer
│   └── show-audit-logs.js            # Affiche derniers audit logs
├── .env.playground                   # Configuration Playground
└── test-scenarios/
    ├── scenario-1-single-message.md
    ├── scenario-2-burst-messages.md
    ├── scenario-3-hourly-emission.md
    └── scenario-4-plan-change.md
```

## Commandes de diagnostic

### 1. `make get-subscription`

**Objectif** : Récupérer les détails de la subscription Playground

**Implémentation** :
```javascript
// scripts/get-subscription.js
const sql = require('mssql');
const config = require('../src/config');

async function getPlaygroundSubscription() {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request().query(`
            SELECT 
                SubscriptionId,
                PlanId,
                SubscriptionStatus,
                Name,
                IsActive,
                CreatedDate,
                ModifyDate
            FROM Subscriptions
            WHERE Name LIKE '%playground%' OR Name LIKE '%test%'
            ORDER BY CreatedDate DESC
        `);
        
        if (result.recordset.length === 0) {
            console.log('❌ Aucune subscription Playground trouvée');
            return null;
        }
        
        const sub = result.recordset[0];
        console.log('✅ Subscription Playground:');
        console.log('   ID:', sub.SubscriptionId);
        console.log('   Plan:', sub.PlanId);
        console.log('   Statut:', sub.SubscriptionStatus);
        console.log('   Nom:', sub.Name);
        console.log('   Active:', sub.IsActive);
        console.log('   Créée:', sub.CreatedDate);
        
        return sub;
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

getPlaygroundSubscription();
```

**Makefile** :
```makefile
get-subscription:
    @node scripts/get-subscription.js
```

**Usage** :
```bash
make get-subscription
```

**Sortie attendue** :
```
✅ Subscription Playground:
   ID: abc-123-playground
   Plan: development
   Statut: Subscribed
   Nom: Playground Test Subscription
   Active: true
   Créée: 2024-11-01T10:00:00.000Z
```

---

### 2. `make get-plan`

**Objectif** : Afficher le plan actuel de la subscription Playground

**Implémentation** :
```javascript
// scripts/get-plan.js
const sql = require('mssql');
const config = require('../src/config');

async function getCurrentPlan() {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request().query(`
            SELECT TOP 1
                s.SubscriptionId,
                s.PlanId,
                p.DisplayName,
                p.Description,
                p.IsPerUser
            FROM Subscriptions s
            LEFT JOIN Plans p ON s.PlanId = p.PlanId
            WHERE s.Name LIKE '%playground%' OR s.Name LIKE '%test%'
            ORDER BY s.CreatedDate DESC
        `);
        
        if (result.recordset.length === 0) {
            console.log('❌ Aucune subscription trouvée');
            return null;
        }
        
        const plan = result.recordset[0];
        console.log('✅ Plan actuel:');
        console.log('   Subscription:', plan.SubscriptionId);
        console.log('   Plan ID:', plan.PlanId);
        console.log('   Nom:', plan.DisplayName || plan.PlanId);
        console.log('   Description:', plan.Description || 'N/A');
        
        return plan;
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

getCurrentPlan();
```

**Makefile** :
```makefile
get-plan:
    @node scripts/get-plan.js
```

**Usage** :
```bash
make get-plan
```

**Sortie attendue** :
```
✅ Plan actuel:
   Subscription: abc-123-playground
   Plan ID: development
   Nom: Development Plan
   Description: Free development and testing plan
```

---

### 3. `make set-plan PLAN=<name>`

**Objectif** : Changer le plan de la subscription Playground

**Implémentation** :
```javascript
// scripts/set-plan.js
const sql = require('mssql');
const config = require('../src/config');

async function setPlan(newPlanId) {
    if (!newPlanId) {
        console.error('❌ Usage: node scripts/set-plan.js <planId>');
        console.log('   Plans disponibles: development, starter, professional, pro-plus');
        process.exit(1);
    }
    
    try {
        const pool = await sql.connect(config.database);
        
        // Vérifier que le plan existe
        const planCheck = await pool.request()
            .input('planId', sql.NVarChar, newPlanId)
            .query('SELECT PlanId FROM Plans WHERE PlanId = @planId');
        
        if (planCheck.recordset.length === 0) {
            console.error(`❌ Plan "${newPlanId}" n'existe pas`);
            process.exit(1);
        }
        
        // Récupérer la subscription Playground
        const subResult = await pool.request().query(`
            SELECT TOP 1 SubscriptionId, PlanId
            FROM Subscriptions
            WHERE Name LIKE '%playground%' OR Name LIKE '%test%'
            ORDER BY CreatedDate DESC
        `);
        
        if (subResult.recordset.length === 0) {
            console.error('❌ Aucune subscription Playground trouvée');
            process.exit(1);
        }
        
        const subscription = subResult.recordset[0];
        const oldPlan = subscription.PlanId;
        
        // Mettre à jour le plan
        await pool.request()
            .input('subscriptionId', sql.UniqueIdentifier, subscription.SubscriptionId)
            .input('newPlanId', sql.NVarChar, newPlanId)
            .query(`
                UPDATE Subscriptions 
                SET PlanId = @newPlanId, ModifyDate = GETUTCDATE()
                WHERE SubscriptionId = @subscriptionId
            `);
        
        console.log('✅ Plan mis à jour avec succès');
        console.log('   Subscription:', subscription.SubscriptionId);
        console.log('   Ancien plan:', oldPlan);
        console.log('   Nouveau plan:', newPlanId);
        console.log('');
        console.log('⚠️  Note: Redémarrez le bot pour que le changement prenne effet');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

const planId = process.argv[2];
setPlan(planId);
```

**Makefile** :
```makefile
set-plan:
ifndef PLAN
    @echo "❌ Usage: make set-plan PLAN=<plan_name>"
    @echo "   Plans disponibles: development, starter, professional, pro-plus"
    @exit 1
endif
    @node scripts/set-plan.js $(PLAN)
```

**Usage** :
```bash
make set-plan PLAN=professional
```

**Sortie attendue** :
```
✅ Plan mis à jour avec succès
   Subscription: abc-123-playground
   Ancien plan: development
   Nouveau plan: professional

⚠️  Note: Redémarrez le bot pour que le changement prenne effet
```

---

### 4. `make list-plans`

**Objectif** : Lister tous les plans disponibles

**Implémentation** :
```javascript
// scripts/list-plans.js
const sql = require('mssql');
const config = require('../src/config');

async function listPlans() {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request().query(`
            SELECT 
                PlanId,
                DisplayName,
                Description,
                IsPerUser,
                IsFree
            FROM Plans
            ORDER BY PlanId
        `);
        
        console.log('✅ Plans disponibles:');
        console.log('');
        
        result.recordset.forEach(plan => {
            console.log(`📋 ${plan.PlanId}`);
            console.log(`   Nom: ${plan.DisplayName || 'N/A'}`);
            console.log(`   Description: ${plan.Description || 'N/A'}`);
            console.log(`   Type: ${plan.IsPerUser ? 'Par utilisateur' : 'Flat rate'}`);
            console.log(`   Gratuit: ${plan.IsFree ? 'Oui' : 'Non'}`);
            console.log('');
        });
        
        console.log(`Total: ${result.recordset.length} plan(s)`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

listPlans();
```

**Makefile** :
```makefile
list-plans:
    @node scripts/list-plans.js
```

**Usage** :
```bash
make list-plans
```

**Sortie attendue** :
```
✅ Plans disponibles:

📋 development
   Nom: Development Plan
   Description: Free development and testing plan
   Type: Flat rate
   Gratuit: Oui

📋 starter
   Nom: Starter Plan
   Description: 50 messages/month included
   Type: Flat rate
   Gratuit: Non

📋 professional
   Nom: Professional Plan
   Description: 1500 messages/month included
   Type: Flat rate
   Gratuit: Non

📋 pro-plus
   Nom: Pro Plus Plan
   Description: 1500 messages/month included + priority support
   Type: Flat rate
   Gratuit: Non

Total: 4 plan(s)
```

---

### 5. `make count-marketplace-messages`

**Objectif** : Compter les messages émis vers Azure Marketplace API

**Implémentation** :
```javascript
// scripts/count-marketplace-messages.js
const sql = require('mssql');
const config = require('../src/config');

async function countMarketplaceMessages() {
    try {
        const pool = await sql.connect(config.database);
        
        // Récupérer la subscription Playground
        const subResult = await pool.request().query(`
            SELECT TOP 1 SubscriptionId
            FROM Subscriptions
            WHERE Name LIKE '%playground%' OR Name LIKE '%test%'
            ORDER BY CreatedDate DESC
        `);
        
        if (subResult.recordset.length === 0) {
            console.error('❌ Aucune subscription Playground trouvée');
            process.exit(1);
        }
        
        const subscriptionId = subResult.recordset[0].SubscriptionId;
        
        // Compter les événements avec succès (200) dans MeteredAuditLogs
        const result = await pool.request()
            .input('subscriptionId', sql.UniqueIdentifier, subscriptionId)
            .query(`
                SELECT 
                    COUNT(*) as TotalEvents,
                    SUM(CAST(JSON_VALUE(RequestJson, '$.quantity') AS INT)) as TotalQuantity,
                    MIN(CreatedDate) as FirstEvent,
                    MAX(CreatedDate) as LastEvent
                FROM MeteredAuditLogs
                WHERE SubscriptionId = @subscriptionId
                  AND StatusCode = 200
            `);
        
        const stats = result.recordset[0];
        
        console.log('✅ Messages émis vers Marketplace API:');
        console.log('   Subscription:', subscriptionId);
        console.log('   Événements émis:', stats.TotalEvents || 0);
        console.log('   Messages totaux:', stats.TotalQuantity || 0);
        console.log('   Premier événement:', stats.FirstEvent || 'N/A');
        console.log('   Dernier événement:', stats.LastEvent || 'N/A');
        
        // Détail par dimension
        const dimResult = await pool.request()
            .input('subscriptionId', sql.UniqueIdentifier, subscriptionId)
            .query(`
                SELECT 
                    JSON_VALUE(RequestJson, '$.dimension') as Dimension,
                    COUNT(*) as Events,
                    SUM(CAST(JSON_VALUE(RequestJson, '$.quantity') AS INT)) as Quantity
                FROM MeteredAuditLogs
                WHERE SubscriptionId = @subscriptionId
                  AND StatusCode = 200
                GROUP BY JSON_VALUE(RequestJson, '$.dimension')
                ORDER BY Quantity DESC
            `);
        
        if (dimResult.recordset.length > 0) {
            console.log('');
            console.log('📊 Répartition par dimension:');
            dimResult.recordset.forEach(dim => {
                console.log(`   ${dim.Dimension}: ${dim.Quantity} messages (${dim.Events} événements)`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

countMarketplaceMessages();
```

**Makefile** :
```makefile
count-marketplace-messages:
    @node scripts/count-marketplace-messages.js
```

**Usage** :
```bash
make count-marketplace-messages
```

**Sortie attendue** :
```
✅ Messages émis vers Marketplace API:
   Subscription: abc-123-playground
   Événements émis: 5
   Messages totaux: 127
   Premier événement: 2024-11-01T10:00:00.000Z
   Dernier événement: 2024-11-01T14:00:00.000Z

📊 Répartition par dimension:
   dev-test: 127 messages (5 événements)
```

---

### 6. `make count-buffer-messages`

**Objectif** : Compter les messages accumulés dans le buffer d'agrégation

**Implémentation** :
```javascript
// scripts/count-buffer-messages.js
const usageAggregationService = require('../src/services/usageAggregationService');

async function countBufferMessages() {
    try {
        const service = usageAggregationService.getInstance();
        
        // Charger le buffer depuis le fichier
        await service.loadBuffer();
        
        const stats = service.getStats();
        
        console.log('✅ Messages dans le buffer d\'agrégation:');
        console.log('   Entrées actives:', stats.totalEntries);
        
        if (stats.totalEntries === 0) {
            console.log('   Buffer vide (tous les messages ont été émis)');
            return;
        }
        
        let totalMessages = 0;
        stats.entries.forEach(entry => {
            totalMessages += entry.quantity;
        });
        
        console.log('   Messages en attente:', totalMessages);
        console.log('');
        console.log('📊 Détail par entrée:');
        
        stats.entries.forEach(entry => {
            const hourDate = new Date(entry.hour);
            const now = Date.now();
            const hourEnd = new Date(entry.hour).getTime() + 3600000;
            const isComplete = now >= hourEnd;
            
            console.log(`   ${entry.dimension} (${entry.planId}):`);
            console.log(`      Quantité: ${entry.quantity} messages`);
            console.log(`      Heure: ${hourDate.toISOString()}`);
            console.log(`      Statut: ${isComplete ? '✅ Prêt pour émission' : '⏳ En cours'}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    }
}

countBufferMessages();
```

**Makefile** :
```makefile
count-buffer-messages:
    @node scripts/count-buffer-messages.js
```

**Usage** :
```bash
make count-buffer-messages
```

**Sortie attendue** :
```
✅ Messages dans le buffer d'agrégation:
   Entrées actives: 2
   Messages en attente: 35

📊 Détail par entrée:
   dev-test (development):
      Quantité: 20 messages
      Heure: 2024-11-01T14:00:00.000Z
      Statut: ⏳ En cours

   pro (professional):
      Quantité: 15 messages
      Heure: 2024-11-01T14:00:00.000Z
      Statut: ⏳ En cours
```

---

### 7. `make show-buffer`

**Objectif** : Afficher le contenu détaillé du buffer

**Implémentation** :
```javascript
// scripts/show-buffer.js
const fs = require('fs');
const path = require('path');

function showBuffer() {
    const bufferPath = path.join(__dirname, '../data/usage-buffer.json');
    
    if (!fs.existsSync(bufferPath)) {
        console.log('ℹ️  Fichier buffer n\'existe pas encore (buffer vide)');
        return;
    }
    
    try {
        const bufferData = JSON.parse(fs.readFileSync(bufferPath, 'utf8'));
        
        if (bufferData.length === 0) {
            console.log('ℹ️  Buffer vide');
            return;
        }
        
        console.log('📦 Contenu du buffer d\'agrégation:');
        console.log(`   Fichier: ${bufferPath}`);
        console.log(`   Entrées: ${bufferData.length}`);
        console.log('');
        
        bufferData.forEach((entry, index) => {
            const hourDate = new Date(entry.hour);
            const firstSeenDate = new Date(entry.firstSeen);
            const now = Date.now();
            const hourEnd = entry.hour + 3600000;
            const isComplete = now >= hourEnd;
            
            console.log(`${index + 1}. ${entry.key}`);
            console.log(`   Subscription: ${entry.subscriptionId}`);
            console.log(`   Plan: ${entry.planId}`);
            console.log(`   Dimension: ${entry.dimension}`);
            console.log(`   Quantité: ${entry.quantity} messages`);
            console.log(`   Heure: ${hourDate.toISOString()}`);
            console.log(`   Premier message: ${firstSeenDate.toISOString()}`);
            console.log(`   Statut: ${isComplete ? '✅ Complet (prêt)' : '⏳ En cours'}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erreur lecture buffer:', error.message);
        throw error;
    }
}

showBuffer();
```

**Makefile** :
```makefile
show-buffer:
    @node scripts/show-buffer.js
```

**Usage** :
```bash
make show-buffer
```

**Sortie attendue** :
```
📦 Contenu du buffer d'agrégation:
   Fichier: /path/to/data/usage-buffer.json
   Entrées: 2

1. abc-123:development:dev-test:1730469600000
   Subscription: abc-123-playground
   Plan: development
   Dimension: dev-test
   Quantité: 20 messages
   Heure: 2024-11-01T14:00:00.000Z
   Premier message: 2024-11-01T14:05:23.456Z
   Statut: ⏳ En cours

2. def-456:professional:pro:1730469600000
   Subscription: def-456-test
   Plan: professional
   Dimension: pro
   Quantité: 15 messages
   Heure: 2024-11-01T14:00:00.000Z
   Premier message: 2024-11-01T14:12:45.789Z
   Statut: ⏳ En cours
```

---

### 8. `make show-audit-logs`

**Objectif** : Afficher les derniers audit logs Marketplace

**Implémentation** :
```javascript
// scripts/show-audit-logs.js
const sql = require('mssql');
const config = require('../src/config');

async function showAuditLogs(limit = 10) {
    try {
        const pool = await sql.connect(config.database);
        
        // Récupérer la subscription Playground
        const subResult = await pool.request().query(`
            SELECT TOP 1 SubscriptionId
            FROM Subscriptions
            WHERE Name LIKE '%playground%' OR Name LIKE '%test%'
            ORDER BY CreatedDate DESC
        `);
        
        if (subResult.recordset.length === 0) {
            console.error('❌ Aucune subscription Playground trouvée');
            process.exit(1);
        }
        
        const subscriptionId = subResult.recordset[0].SubscriptionId;
        
        const result = await pool.request()
            .input('subscriptionId', sql.UniqueIdentifier, subscriptionId)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    Id,
                    RequestJson,
                    ResponseJson,
                    StatusCode,
                    CreatedDate
                FROM MeteredAuditLogs
                WHERE SubscriptionId = @subscriptionId
                ORDER BY CreatedDate DESC
            `);
        
        console.log(`✅ Derniers ${limit} audit logs (Subscription: ${subscriptionId}):`);
        console.log('');
        
        if (result.recordset.length === 0) {
            console.log('ℹ️  Aucun audit log trouvé');
            return;
        }
        
        result.recordset.forEach((log, index) => {
            const request = JSON.parse(log.RequestJson);
            let response = null;
            try {
                response = JSON.parse(log.ResponseJson);
            } catch (e) {
                // Response peut être vide
            }
            
            const statusIcon = log.StatusCode === 200 ? '✅' : 
                              log.StatusCode === 409 ? '⚠️' : '❌';
            
            console.log(`${statusIcon} #${log.Id} - ${log.CreatedDate.toISOString()}`);
            console.log(`   Status: ${log.StatusCode}`);
            console.log(`   Dimension: ${request.dimension}`);
            console.log(`   Quantité: ${request.quantity} messages`);
            console.log(`   Heure effective: ${request.effectiveStartTime}`);
            
            if (response) {
                if (response.usageEventId) {
                    console.log(`   Event ID: ${response.usageEventId}`);
                }
                if (response.status) {
                    console.log(`   Statut API: ${response.status}`);
                }
                if (response.message) {
                    console.log(`   Message: ${response.message}`);
                }
            }
            
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await sql.close();
    }
}

const limit = parseInt(process.argv[2]) || 10;
showAuditLogs(limit);
```

**Makefile** :
```makefile
show-audit-logs:
    @node scripts/show-audit-logs.js 10

show-audit-logs-all:
    @node scripts/show-audit-logs.js 100
```

**Usage** :
```bash
make show-audit-logs         # 10 derniers
make show-audit-logs-all     # 100 derniers
```

**Sortie attendue** :
```
✅ Derniers 10 audit logs (Subscription: abc-123-playground):

✅ #145 - 2024-11-01T14:00:05.234Z
   Status: 200
   Dimension: dev-test
   Quantité: 25 messages
   Heure effective: 2024-11-01T13:00:00.000Z
   Event ID: 87654321-4321-4321-4321-cba987654321
   Statut API: Accepted

✅ #144 - 2024-11-01T13:00:03.123Z
   Status: 200
   Dimension: dev-test
   Quantité: 18 messages
   Heure effective: 2024-11-01T12:00:00.000Z
   Event ID: 12345678-1234-1234-1234-123456789abc
   Statut API: Accepted

⚠️ #143 - 2024-11-01T12:00:02.456Z
   Status: 409
   Dimension: dev-test
   Quantité: 10 messages
   Heure effective: 2024-11-01T11:00:00.000Z
   Message: Duplicate usage event
```

---

## Makefile complet

```makefile
# Test Playground - Commandes de diagnostic
# Usage: make <command>

.PHONY: help get-subscription get-plan set-plan list-plans \
        count-marketplace-messages count-buffer-messages \
        show-buffer show-audit-logs show-audit-logs-all \
        show-traces show-traces-aggregation show-traces-api show-traces-buffer \
        show-traces-errors analyze-traces \
        test-scenario-1 test-scenario-2 test-scenario-3 test-scenario-4 \
        start-playground stop-playground restart-playground

# Configuration
NODE = node
SCRIPTS_DIR = scripts

# Couleurs pour l'affichage
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

help:
    @echo "$(GREEN)Test Playground - Commandes disponibles:$(NC)"
    @echo ""
    @echo "$(YELLOW)Diagnostic de base:$(NC)"
    @echo "  make get-subscription           - Afficher la subscription Playground"
    @echo "  make get-plan                   - Afficher le plan actuel"
    @echo "  make set-plan PLAN=<name>       - Changer le plan"
    @echo "  make list-plans                 - Lister tous les plans"
    @echo ""
    @echo "$(YELLOW)Monitoring:$(NC)"
    @echo "  make count-marketplace-messages - Compter messages Marketplace API"
    @echo "  make count-buffer-messages      - Compter messages dans buffer"
    @echo "  make show-buffer                - Afficher contenu buffer"
    @echo "  make show-audit-logs            - Afficher 10 derniers audit logs"
    @echo "  make show-audit-logs-all        - Afficher 100 derniers audit logs"
    @echo ""
    @echo "$(YELLOW)Analyse des traces:$(NC)"
    @echo "  make show-traces                - Afficher traces en temps réel (toutes)"
    @echo "  make show-traces-aggregation    - Traces d'agrégation uniquement"
    @echo "  make show-traces-api            - Traces API uniquement"
    @echo "  make show-traces-buffer         - Traces buffer uniquement"
    @echo "  make show-traces-errors         - Erreurs uniquement"
    @echo "  make analyze-traces             - Analyse statistique des traces"
    @echo ""
    @echo "$(YELLOW)Scénarios de test:$(NC)"
    @echo "  make test-scenario-1            - Test message unique"
    @echo "  make test-scenario-2            - Test burst messages"
    @echo "  make test-scenario-3            - Test émission horaire"
    @echo "  make test-scenario-4            - Test changement de plan"
    @echo ""
    @echo "$(YELLOW)Contrôle du Playground:$(NC)"
    @echo "  make start-playground           - Démarrer le bot Playground"
    @echo "  make stop-playground            - Arrêter le bot Playground"
    @echo "  make restart-playground         - Redémarrer le bot Playground"

# Diagnostic de base
get-subscription:
    @$(NODE) $(SCRIPTS_DIR)/get-subscription.js

get-plan:
    @$(NODE) $(SCRIPTS_DIR)/get-plan.js

set-plan:
ifndef PLAN
    @echo "$(RED)❌ Usage: make set-plan PLAN=<plan_name>$(NC)"
    @echo "   Plans disponibles: development, starter, professional, pro-plus"
    @exit 1
endif
    @$(NODE) $(SCRIPTS_DIR)/set-plan.js $(PLAN)

list-plans:
    @$(NODE) $(SCRIPTS_DIR)/list-plans.js

# Monitoring
count-marketplace-messages:
    @$(NODE) $(SCRIPTS_DIR)/count-marketplace-messages.js

count-buffer-messages:
    @$(NODE) $(SCRIPTS_DIR)/count-buffer-messages.js

show-buffer:
    @$(NODE) $(SCRIPTS_DIR)/show-buffer.js

show-audit-logs:
    @$(NODE) $(SCRIPTS_DIR)/show-audit-logs.js 10

show-audit-logs-all:
    @$(NODE) $(SCRIPTS_DIR)/show-audit-logs.js 100

# Analyse des traces
show-traces:
    @tail -f logs/playground-traces.log | grep --color=auto -E 'error|ERROR|warn|WARN|'

show-traces-aggregation:
    @tail -f logs/playground-traces.log | grep "AGGREGATION"

show-traces-api:
    @tail -f logs/playground-traces.log | grep "API"

show-traces-buffer:
    @tail -f logs/playground-traces.log | grep "BUFFER"

show-traces-errors:
    @tail -f logs/playground-traces.log | grep -E "error|ERROR"

analyze-traces:
    @echo "$(GREEN)📊 Analyse des traces...$(NC)"
    @$(NODE) $(SCRIPTS_DIR)/analyze-traces.js

# Scénarios de test (ouvre le document markdown)
test-scenario-1:
    @echo "$(GREEN)📖 Ouvrir le scénario 1: Message unique$(NC)"
    @cat test-scenarios/scenario-1-single-message.md

test-scenario-2:
    @echo "$(GREEN)📖 Ouvrir le scénario 2: Burst messages$(NC)"
    @cat test-scenarios/scenario-2-burst-messages.md

test-scenario-3:
    @echo "$(GREEN)📖 Ouvrir le scénario 3: Émission horaire$(NC)"
    @cat test-scenarios/scenario-3-hourly-emission.md

test-scenario-4:
    @echo "$(GREEN)📖 Ouvrir le scénario 4: Changement de plan$(NC)"
    @cat test-scenarios/scenario-4-plan-change.md

# Contrôle du Playground
start-playground:
    @echo "$(GREEN)🚀 Démarrage du Playground...$(NC)"
    @npm run dev:teamsfx:testtool &

stop-playground:
    @echo "$(YELLOW)🛑 Arrêt du Playground...$(NC)"
    @pkill -f "dev:teamsfx:testtool" || true

restart-playground: stop-playground
    @sleep 2
    @make start-playground
```

---

## Scénarios de test interactifs

### Scénario 1 : Message unique

**Fichier** : `test-scenarios/scenario-1-single-message.md`

```markdown
# Scénario 1 : Test d'un message unique

## Objectif
Valider l'accumulation d'un seul message dans le buffer

## Prérequis
- Bot Playground démarré
- Plan configuré (development recommandé)

## Étapes

1. **Vérifier l'état initial**
   ```bash
   make get-subscription
   make get-plan
   make count-buffer-messages
   ```

2. **Envoyer un message via Teams**
   - Ouvrir Microsoft 365 Agents Playground
   - Envoyer : "Bonjour, test 1"
   - Attendre la réponse du bot

3. **Vérifier l'accumulation**
   ```bash
   make count-buffer-messages
   make show-buffer
   ```

4. **Résultat attendu**
   - Buffer contient 1 entrée
   - Quantité = 1
   - Statut = ⏳ En cours

## Validation
- ✅ Message ajouté au buffer
- ✅ Pas encore émis (heure incomplète)
- ✅ Aucune erreur dans les logs
```

### Scénario 2 : Burst de messages

**Fichier** : `test-scenarios/scenario-2-burst-messages.md`

```markdown
# Scénario 2 : Test burst de messages (20 messages en 5 minutes)

## Objectif
Valider l'accumulation de plusieurs messages dans la même heure

## Prérequis
- Bot Playground démarré
- Plan configuré

## Étapes

1. **Vérifier l'état initial**
   ```bash
   make show-buffer
   ```

2. **Envoyer 20 messages rapidement**
   - Message 1-5 : Intervalle 10 secondes
   - Message 6-10 : Intervalle 15 secondes
   - Message 11-20 : Intervalle 10 secondes

3. **Vérifier après chaque lot**
   ```bash
   # Après 5 messages
   make count-buffer-messages
   
   # Après 10 messages
   make count-buffer-messages
   
   # Après 20 messages
   make show-buffer
   ```

4. **Résultat attendu**
   - Buffer contient 1 entrée (même heure)
   - Quantité = 20
   - firstSeen = timestamp du 1er message

## Validation
- ✅ Tous les messages accumulés dans même entrée
- ✅ Quantité incrémente correctement
- ✅ Pas de duplication d'entrées
- ✅ Performance acceptable (< 1ms par message)
```

### Scénario 3 : Émission horaire

**Fichier** : `test-scenarios/scenario-3-hourly-emission.md`

```markdown
# Scénario 3 : Test émission horaire automatique

## Objectif
Valider l'émission automatique du buffer à la fin de l'heure

## Prérequis
- Bot Playground démarré
- Cron actif (vérifier logs)

## Étapes

1. **Accumuler des messages** (ex: 14:15)
   ```bash
   # Envoyer 10 messages
   make count-buffer-messages
   # Résultat: 10 messages pour heure 14:00
   ```

2. **Attendre la fin de l'heure** (15:00)
   - Le cron s'exécute à 15:00:00
   - Observer les logs du bot

3. **Vérifier l'émission**
   ```bash
   # Immédiatement après 15:00
   make count-buffer-messages
   # Résultat: Buffer vide ou nouvelle heure

   make show-audit-logs
   # Résultat: Nouvel événement avec quantity=10
   ```

4. **Vérifier Marketplace**
   ```bash
   make count-marketplace-messages
   # Résultat: +1 événement, +10 messages
   ```

## Validation
- ✅ Cron exécuté à 15:00:00
- ✅ Buffer vidé (heure 14:00 supprimée)
- ✅ Événement dans MeteredAuditLogs (StatusCode=200)
- ✅ Quantity=10 dans la requête API
- ✅ usageEventId reçu d'Azure
```

### Scénario 4 : Changement de plan

**Fichier** : `test-scenarios/scenario-4-plan-change.md`

```markdown
# Scénario 4 : Test changement de plan

## Objectif
Valider que le changement de plan fonctionne correctement

## Prérequis
- Bot Playground démarré
- Plan actuel = development

## Étapes

1. **Vérifier plan actuel**
   ```bash
   make get-plan
   # Résultat: development
   ```

2. **Accumuler messages avec plan development**
   ```bash
   # Envoyer 5 messages
   make count-buffer-messages
   # Résultat: 5 messages, dimension=dev-test
   ```

3. **Changer le plan**
   ```bash
   make set-plan PLAN=professional
   ```

4. **Redémarrer le bot**
   ```bash
   make restart-playground
   ```

5. **Envoyer nouveaux messages**
   ```bash
   # Envoyer 5 messages
   make show-buffer
   # Résultat: 2 entrées distinctes
   #   - development:dev-test:5
   #   - professional:pro:5
   ```

6. **Attendre émission horaire**
   ```bash
   make show-audit-logs
   # Résultat: 2 événements avec dimensions différentes
   ```

## Validation
- ✅ Plan changé avec succès
- ✅ Anciennes données development préservées
- ✅ Nouvelles données professional séparées
- ✅ Émission correcte pour les 2 dimensions
- ✅ Pas de mélange des données
```

---

## Configuration Playground

**Fichier** : `.env.playground`

```bash
# Configuration Playground
NODE_ENV=playground

# Bot Framework
MicrosoftAppId=<playground-app-id>
MicrosoftAppPassword=<playground-app-password>
BOT_DOMAIN=<tunnel-domain>

# SaaS Database
SQL_SERVER=<saas-database-server>
SQL_DATABASE=<saas-database-name>
SQL_USER=<saas-database-user>
SQL_PASSWORD=<saas-database-password>

# Marketplace API (mode test)
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_TEST_MODE=true
MARKETPLACE_TENANT_ID=<azure-tenant-id>
MARKETPLACE_CLIENT_ID=<azure-client-id>
MARKETPLACE_CLIENT_SECRET=<azure-client-secret>

# Aggregation
AGGREGATION_ENABLED=true
AGGREGATION_CRON_SCHEDULE=0 * * * *

# Logging et Traces
LOG_LEVEL=debug
TRACE_ENABLED=true
TRACE_LEVEL=verbose
TRACE_OUTPUT=console,file
TRACE_FILE_PATH=./logs/playground-traces.log
TRACE_MAX_FILE_SIZE=10485760
TRACE_AGGREGATION=true
TRACE_API_CALLS=true
TRACE_BUFFER_OPS=true
TRACE_SQL_QUERIES=false
```

---

## 📊 Gestion et Analyse des Traces d'Exécution

### Vue d'ensemble

Le système de traçage permet de suivre en détail l'exécution du code en environnement Playground, facilitant le diagnostic des problèmes et l'analyse du comportement du système.

### Configuration des niveaux de trace

Les niveaux de trace sont configurables via le fichier `.env.playground` :

| Niveau | Description | Cas d'usage |
|--------|-------------|-------------|
| `error` | Erreurs critiques uniquement | Production |
| `warn` | Erreurs + avertissements | Production |
| `info` | Informations importantes | Tests E2E |
| `debug` | Informations détaillées | Tests interactifs |
| `verbose` | Tous les détails + données | Debugging approfondi |
| `trace` | Chaque appel de fonction | Debugging très détaillé |

### Variables d'environnement pour le traçage

```bash
# Activation globale du traçage
TRACE_ENABLED=true                    # true/false

# Niveau de détail
TRACE_LEVEL=verbose                   # error|warn|info|debug|verbose|trace

# Destination des traces
TRACE_OUTPUT=console,file             # console|file|both (séparés par virgule)
TRACE_FILE_PATH=./logs/playground-traces.log
TRACE_MAX_FILE_SIZE=10485760         # 10 MB en bytes
TRACE_MAX_FILES=5                     # Nombre de fichiers de rotation

# Traces sélectives par composant
TRACE_AGGREGATION=true                # Traces du service d'agrégation
TRACE_API_CALLS=true                  # Traces des appels API Marketplace
TRACE_BUFFER_OPS=true                 # Traces des opérations sur le buffer
TRACE_SQL_QUERIES=false               # Traces des requêtes SQL (attention: verbeux!)
TRACE_BOT_MESSAGES=true               # Traces des messages bot
TRACE_CRON_JOBS=true                  # Traces des jobs cron

# Format des traces
TRACE_FORMAT=json                     # json|text|pretty
TRACE_TIMESTAMP=iso                   # iso|unix|relative
TRACE_INCLUDE_STACK=false             # Inclure stack trace pour debug/verbose
```

### Implémentation du système de traçage

#### 1. Service de traçage centralisé

**Fichier** : `src/services/traceService.js`

```javascript
// src/services/traceService.js
const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

class TraceService {
    constructor() {
        this.enabled = process.env.TRACE_ENABLED === 'true';
        this.level = process.env.TRACE_LEVEL || 'info';
        this.output = (process.env.TRACE_OUTPUT || 'console').split(',');
        this.format = process.env.TRACE_FORMAT || 'pretty';
        
        // Configuration des composants à tracer
        this.components = {
            aggregation: process.env.TRACE_AGGREGATION === 'true',
            apiCalls: process.env.TRACE_API_CALLS === 'true',
            bufferOps: process.env.TRACE_BUFFER_OPS === 'true',
            sqlQueries: process.env.TRACE_SQL_QUERIES === 'true',
            botMessages: process.env.TRACE_BOT_MESSAGES === 'true',
            cronJobs: process.env.TRACE_CRON_JOBS === 'true'
        };
        
        this.logger = this._createLogger();
    }
    
    _createLogger() {
        const logFormat = this._getLogFormat();
        const logTransports = this._getLogTransports();
        
        return createLogger({
            level: this.level,
            format: logFormat,
            transports: logTransports,
            silent: !this.enabled
        });
    }
    
    _getLogFormat() {
        const timestamp = format.timestamp({
            format: process.env.TRACE_TIMESTAMP === 'unix' 
                ? 'X' 
                : 'YYYY-MM-DD HH:mm:ss.SSS'
        });
        
        if (this.format === 'json') {
            return format.combine(
                timestamp,
                format.errors({ stack: process.env.TRACE_INCLUDE_STACK === 'true' }),
                format.json()
            );
        } else if (this.format === 'pretty') {
            return format.combine(
                timestamp,
                format.colorize(),
                format.printf(({ timestamp, level, message, component, ...metadata }) => {
                    let msg = `${timestamp} [${level}]`;
                    if (component) msg += ` [${component}]`;
                    msg += `: ${message}`;
                    
                    if (Object.keys(metadata).length > 0) {
                        msg += '\n' + JSON.stringify(metadata, null, 2);
                    }
                    
                    return msg;
                })
            );
        } else {
            return format.combine(
                timestamp,
                format.simple()
            );
        }
    }
    
    _getLogTransports() {
        const transportsList = [];
        
        if (this.output.includes('console')) {
            transportsList.push(new transports.Console({
                level: this.level
            }));
        }
        
        if (this.output.includes('file')) {
            const logDir = path.dirname(process.env.TRACE_FILE_PATH || './logs/traces.log');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            transportsList.push(new DailyRotateFile({
                filename: process.env.TRACE_FILE_PATH || './logs/playground-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxSize: process.env.TRACE_MAX_FILE_SIZE || '10m',
                maxFiles: process.env.TRACE_MAX_FILES || '5d',
                level: this.level
            }));
        }
        
        return transportsList;
    }
    
    // Méthodes de traçage par composant
    
    traceAggregation(level, message, metadata = {}) {
        if (!this.components.aggregation) return;
        this._log(level, 'AGGREGATION', message, metadata);
    }
    
    traceApiCall(level, message, metadata = {}) {
        if (!this.components.apiCalls) return;
        this._log(level, 'API', message, metadata);
    }
    
    traceBufferOp(level, message, metadata = {}) {
        if (!this.components.bufferOps) return;
        this._log(level, 'BUFFER', message, metadata);
    }
    
    traceSqlQuery(level, message, metadata = {}) {
        if (!this.components.sqlQueries) return;
        this._log(level, 'SQL', message, metadata);
    }
    
    traceBotMessage(level, message, metadata = {}) {
        if (!this.components.botMessages) return;
        this._log(level, 'BOT', message, metadata);
    }
    
    traceCronJob(level, message, metadata = {}) {
        if (!this.components.cronJobs) return;
        this._log(level, 'CRON', message, metadata);
    }
    
    _log(level, component, message, metadata) {
        this.logger.log({
            level,
            component,
            message,
            ...metadata
        });
    }
    
    // Méthodes de niveau direct
    
    error(component, message, metadata = {}) {
        this._log('error', component, message, metadata);
    }
    
    warn(component, message, metadata = {}) {
        this._log('warn', component, message, metadata);
    }
    
    info(component, message, metadata = {}) {
        this._log('info', component, message, metadata);
    }
    
    debug(component, message, metadata = {}) {
        this._log('debug', component, message, metadata);
    }
    
    verbose(component, message, metadata = {}) {
        this._log('verbose', component, message, metadata);
    }
    
    // Utilitaires de mesure de performance
    
    startTimer(component, operation) {
        const startTime = Date.now();
        return {
            end: (metadata = {}) => {
                const duration = Date.now() - startTime;
                this._log('debug', component, `${operation} completed`, {
                    duration: `${duration}ms`,
                    ...metadata
                });
                return duration;
            }
        };
    }
}

// Singleton
let instance = null;

function getInstance() {
    if (!instance) {
        instance = new TraceService();
    }
    return instance;
}

module.exports = { getInstance };
```

#### 2. Intégration dans UsageAggregationService

**Modification** : `src/services/usageAggregationService.js`

```javascript
// Ajouter en haut du fichier
const traceService = require('./traceService').getInstance();

class UsageAggregationService {
    // ... code existant ...
    
    async trackUsage(subscriptionId, planId, dimension, quantity = 1) {
        const timer = traceService.startTimer('AGGREGATION', 'trackUsage');
        
        traceService.traceAggregation('verbose', 'Tracking usage', {
            subscriptionId,
            planId,
            dimension,
            quantity
        });
        
        try {
            const key = this._getBufferKey(subscriptionId, planId, dimension);
            
            if (this.buffer.has(key)) {
                const entry = this.buffer.get(key);
                entry.quantity += quantity;
                
                traceService.traceBufferOp('debug', 'Updated existing buffer entry', {
                    key,
                    newQuantity: entry.quantity,
                    added: quantity
                });
            } else {
                const hourTimestamp = this._getHourTimestamp();
                const entry = {
                    key,
                    subscriptionId,
                    planId,
                    dimension,
                    quantity,
                    hour: hourTimestamp,
                    firstSeen: Date.now()
                };
                
                this.buffer.set(key, entry);
                
                traceService.traceBufferOp('info', 'Created new buffer entry', {
                    key,
                    quantity,
                    hour: new Date(hourTimestamp).toISOString()
                });
            }
            
            await this.saveBuffer();
            
            const duration = timer.end({ bufferSize: this.buffer.size });
            
            traceService.traceAggregation('debug', 'Usage tracked successfully', {
                duration: `${duration}ms`,
                bufferSize: this.buffer.size
            });
            
        } catch (error) {
            timer.end({ error: true });
            traceService.error('AGGREGATION', 'Failed to track usage', {
                error: error.message,
                stack: error.stack,
                subscriptionId,
                planId,
                dimension
            });
            throw error;
        }
    }
    
    async emitAggregatedUsage() {
        const timer = traceService.startTimer('AGGREGATION', 'emitAggregatedUsage');
        
        traceService.traceCronJob('info', 'Starting hourly emission', {
            bufferSize: this.buffer.size,
            timestamp: new Date().toISOString()
        });
        
        try {
            const now = Date.now();
            const completedEntries = [];
            
            for (const [key, entry] of this.buffer.entries()) {
                const hourEnd = entry.hour + 3600000;
                
                if (now >= hourEnd) {
                    completedEntries.push(entry);
                    
                    traceService.traceAggregation('debug', 'Entry ready for emission', {
                        key,
                        quantity: entry.quantity,
                        hourStart: new Date(entry.hour).toISOString(),
                        hourEnd: new Date(hourEnd).toISOString()
                    });
                }
            }
            
            traceService.traceCronJob('info', `Found ${completedEntries.length} entries to emit`);
            
            for (const entry of completedEntries) {
                try {
                    const emitTimer = traceService.startTimer('API', 'emitUsageEvent');
                    
                    await meteringApiService.emitUsageEvent(
                        entry.subscriptionId,
                        entry.planId,
                        entry.dimension,
                        entry.quantity,
                        new Date(entry.hour).toISOString()
                    );
                    
                    this.buffer.delete(entry.key);
                    
                    const emitDuration = emitTimer.end();
                    
                    traceService.traceApiCall('info', 'Usage event emitted successfully', {
                        key: entry.key,
                        quantity: entry.quantity,
                        duration: `${emitDuration}ms`
                    });
                    
                } catch (error) {
                    traceService.error('API', 'Failed to emit usage event', {
                        error: error.message,
                        key: entry.key,
                        quantity: entry.quantity,
                        retryable: error.statusCode >= 500
                    });
                }
            }
            
            await this.saveBuffer();
            
            const duration = timer.end({
                emittedCount: completedEntries.length,
                remainingInBuffer: this.buffer.size
            });
            
            traceService.traceCronJob('info', 'Hourly emission completed', {
                duration: `${duration}ms`,
                emitted: completedEntries.length,
                remaining: this.buffer.size
            });
            
        } catch (error) {
            timer.end({ error: true });
            traceService.error('AGGREGATION', 'Hourly emission failed', {
                error: error.message,
                stack: error.stack
            });
        }
    }
}
```

#### 3. Intégration dans meteringApiService

**Modification** : `src/services/meteringApiService.js`

```javascript
const traceService = require('./traceService').getInstance();

async function emitUsageEvent(subscriptionId, planId, dimension, quantity, effectiveStartTime) {
    const timer = traceService.startTimer('API', 'emitUsageEvent');
    
    traceService.traceApiCall('verbose', 'Preparing API request', {
        subscriptionId,
        planId,
        dimension,
        quantity,
        effectiveStartTime
    });
    
    try {
        const token = await getMarketplaceToken();
        const requestBody = {
            resourceId: subscriptionId,
            quantity,
            dimension: dimensionMap[planId] || dimension,
            effectiveStartTime,
            planId
        };
        
        traceService.traceApiCall('debug', 'Sending request to Marketplace API', {
            endpoint: MARKETPLACE_API_URL,
            body: requestBody
        });
        
        const response = await axios.post(MARKETPLACE_API_URL, requestBody, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        timer.end({ statusCode: response.status });
        
        traceService.traceApiCall('info', 'API request successful', {
            statusCode: response.status,
            usageEventId: response.data.usageEventId,
            status: response.data.status
        });
        
        await auditLog(subscriptionId, requestBody, response.data, response.status);
        
        return response.data;
        
    } catch (error) {
        timer.end({ error: true, statusCode: error.response?.status });
        
        traceService.error('API', 'API request failed', {
            error: error.message,
            statusCode: error.response?.status,
            responseData: error.response?.data,
            subscriptionId,
            quantity
        });
        
        if (error.response) {
            await auditLog(
                subscriptionId,
                { quantity, dimension, effectiveStartTime },
                error.response.data,
                error.response.status
            );
        }
        
        throw error;
    }
}
```

### Commandes d'analyse des traces

#### 1. `make show-traces` - Afficher traces en temps réel

**Ajout au Makefile** :

```makefile
# Analyse des traces
show-traces:
    @tail -f logs/playground-traces.log | grep --color=auto -E 'error|ERROR|warn|WARN|'

show-traces-aggregation:
    @tail -f logs/playground-traces.log | grep "AGGREGATION"

show-traces-api:
    @tail -f logs/playground-traces.log | grep "API"

show-traces-buffer:
    @tail -f logs/playground-traces.log | grep "BUFFER"

show-traces-errors:
    @tail -f logs/playground-traces.log | grep -E "error|ERROR"

analyze-traces:
    @echo "$(GREEN)📊 Analyse des traces...$(NC)"
    @$(NODE) $(SCRIPTS_DIR)/analyze-traces.js
```

#### 2. Script d'analyse des traces

**Fichier** : `scripts/analyze-traces.js`

```javascript
// scripts/analyze-traces.js
const fs = require('fs');
const path = require('path');

function analyzeTraces() {
    const logFile = process.env.TRACE_FILE_PATH || './logs/playground-traces.log';
    
    if (!fs.existsSync(logFile)) {
        console.log('ℹ️  Aucun fichier de traces trouvé');
        return;
    }
    
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    // Statistiques
    const stats = {
        total: lines.length,
        byLevel: {},
        byComponent: {},
        errors: [],
        apiCalls: { success: 0, failed: 0, totalDuration: 0 },
        aggregation: { tracked: 0, emitted: 0 }
    };
    
    lines.forEach(line => {
        try {
            const log = JSON.parse(line);
            
            // Par niveau
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
            
            // Par composant
            if (log.component) {
                stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
            }
            
            // Erreurs
            if (log.level === 'error') {
                stats.errors.push({
                    timestamp: log.timestamp,
                    component: log.component,
                    message: log.message
                });
            }
            
            // API calls
            if (log.component === 'API') {
                if (log.message.includes('successful')) {
                    stats.apiCalls.success++;
                } else if (log.message.includes('failed')) {
                    stats.apiCalls.failed++;
                }
                
                if (log.duration) {
                    const ms = parseInt(log.duration);
                    stats.apiCalls.totalDuration += ms;
                }
            }
            
            // Agrégation
            if (log.component === 'AGGREGATION') {
                if (log.message.includes('Usage tracked')) {
                    stats.aggregation.tracked++;
                } else if (log.message.includes('emitted successfully')) {
                    stats.aggregation.emitted++;
                }
            }
            
        } catch (e) {
            // Ligne non-JSON, ignorer
        }
    });
    
    // Affichage
    console.log('📊 Analyse des traces Playground\n');
    console.log(`Total de lignes: ${stats.total}`);
    console.log('');
    
    console.log('Par niveau:');
    Object.entries(stats.byLevel).forEach(([level, count]) => {
        console.log(`  ${level}: ${count}`);
    });
    console.log('');
    
    console.log('Par composant:');
    Object.entries(stats.byComponent).forEach(([comp, count]) => {
        console.log(`  ${comp}: ${count}`);
    });
    console.log('');
    
    console.log('📞 Appels API:');
    console.log(`  Succès: ${stats.apiCalls.success}`);
    console.log(`  Échecs: ${stats.apiCalls.failed}`);
    if (stats.apiCalls.success > 0) {
        const avgDuration = stats.apiCalls.totalDuration / stats.apiCalls.success;
        console.log(`  Durée moyenne: ${avgDuration.toFixed(2)}ms`);
    }
    console.log('');
    
    console.log('📦 Agrégation:');
    console.log(`  Messages trackés: ${stats.aggregation.tracked}`);
    console.log(`  Messages émis: ${stats.aggregation.emitted}`);
    console.log('');
    
    if (stats.errors.length > 0) {
        console.log('❌ Erreurs récentes:');
        stats.errors.slice(-5).forEach(err => {
            console.log(`  [${err.timestamp}] ${err.component}: ${err.message}`);
        });
    }
}

analyzeTraces();
```

### Exemple de configuration complète

**Fichier** : `.env.playground` (version complète avec traces)

```bash
# Configuration Playground avec traçage avancé
NODE_ENV=playground

# Bot Framework
MicrosoftAppId=<playground-app-id>
MicrosoftAppPassword=<playground-app-password>
BOT_DOMAIN=<tunnel-domain>

# SaaS Database
SQL_SERVER=<saas-database-server>
SQL_DATABASE=<saas-database-name>
SQL_USER=<saas-database-user>
SQL_PASSWORD=<saas-database-password>

# Marketplace API
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_TEST_MODE=true
MARKETPLACE_TENANT_ID=<azure-tenant-id>
MARKETPLACE_CLIENT_ID=<azure-client-id>
MARKETPLACE_CLIENT_SECRET=<azure-client-secret>

# Aggregation
AGGREGATION_ENABLED=true
AGGREGATION_CRON_SCHEDULE=0 * * * *

# Logging standard
LOG_LEVEL=debug

# ===== SYSTÈME DE TRAÇAGE =====

# Activation et niveau global
TRACE_ENABLED=true
TRACE_LEVEL=verbose          # error|warn|info|debug|verbose|trace
TRACE_OUTPUT=console,file
TRACE_FORMAT=pretty          # json|text|pretty

# Fichiers de traces
TRACE_FILE_PATH=./logs/playground-traces.log
TRACE_MAX_FILE_SIZE=10485760  # 10 MB
TRACE_MAX_FILES=5
TRACE_TIMESTAMP=iso          # iso|unix|relative
TRACE_INCLUDE_STACK=false

# Traces par composant (activer sélectivement)
TRACE_AGGREGATION=true       # Service d'agrégation
TRACE_API_CALLS=true         # Appels Marketplace API
TRACE_BUFFER_OPS=true        # Opérations sur le buffer
TRACE_SQL_QUERIES=false      # Requêtes SQL (très verbeux!)
TRACE_BOT_MESSAGES=true      # Messages bot Teams
TRACE_CRON_JOBS=true         # Jobs cron
```

### Utilisation des traces en Playground

#### Workflow typique de diagnostic

```bash
# 1. Démarrer le bot avec traces activées
make start-playground

# 2. Observer les traces en temps réel
make show-traces

# 3. Envoyer des messages de test dans Teams
# ...

# 4. Analyser les traces d'agrégation
make show-traces-aggregation

# 5. Vérifier les appels API
make show-traces-api

# 6. Analyser les statistiques
make analyze-traces

# 7. En cas d'erreur, consulter les erreurs uniquement
make show-traces-errors
```

#### Exemples de sorties de traces

**Niveau verbose - Agrégation** :
```
2024-11-01 14:23:45.123 [verbose] [AGGREGATION]: Tracking usage
{
  "subscriptionId": "abc-123",
  "planId": "development",
  "dimension": "dev-test",
  "quantity": 1
}

2024-11-01 14:23:45.134 [debug] [BUFFER]: Updated existing buffer entry
{
  "key": "abc-123:development:dev-test:1730469600000",
  "newQuantity": 15,
  "added": 1
}

2024-11-01 14:23:45.142 [debug] [AGGREGATION]: Usage tracked successfully
{
  "duration": "19ms",
  "bufferSize": 2
}
```

**Niveau info - Émission horaire** :
```
2024-11-01 15:00:00.001 [info] [CRON]: Starting hourly emission
{
  "bufferSize": 2,
  "timestamp": "2024-11-01T15:00:00.001Z"
}

2024-11-01 15:00:00.045 [info] [CRON]: Found 2 entries to emit

2024-11-01 15:00:00.234 [info] [API]: Usage event emitted successfully
{
  "key": "abc-123:development:dev-test:1730469600000",
  "quantity": 15,
  "duration": "189ms"
}

2024-11-01 15:00:00.456 [info] [CRON]: Hourly emission completed
{
  "duration": "455ms",
  "emitted": 2,
  "remaining": 0
}
```

### Avantages du système de traçage

✅ **Diagnostic précis** : Identification rapide des problèmes  
✅ **Performance** : Mesure des temps d'exécution  
✅ **Sélectif** : Activation par composant  
✅ **Configurable** : Contrôle via variables d'environnement  
✅ **Analyse** : Scripts d'analyse automatisés  
✅ **Production-ready** : Rotation des fichiers, niveaux adaptés

---

## README du Playground

**Fichier** : `test-saas-playground/README.md`

```markdown
# Test Playground - Niveau 4

Tests interactifs en environnement Microsoft 365 Agents Playground

## Installation

1. Créer le répertoire
   ```bash
   mkdir -p test-saas-playground/scripts
   mkdir -p test-saas-playground/test-scenarios
   ```

2. Copier les scripts
   ```bash
   # Copier tous les fichiers .js dans scripts/
   ```

3. Configurer l'environnement
   ```bash
   cp .env.example .env.playground
   # Éditer .env.playground avec vos credentials
   ```

4. Installer les dépendances
   ```bash
   npm install
   ```

## Utilisation

### Démarrage
```bash
make start-playground
```

### Commandes de diagnostic
```bash
make help                        # Afficher toutes les commandes
make get-subscription            # Voir la subscription
make count-buffer-messages       # Voir buffer actuel
make show-audit-logs             # Voir les derniers événements
```

### Tests interactifs
1. Ouvrir Microsoft 365 Agents Playground
2. Envoyer des messages au bot
3. Utiliser les commandes make pour observer le comportement

### Scénarios pré-définis
```bash
make test-scenario-1    # Message unique
make test-scenario-2    # Burst messages
make test-scenario-3    # Émission horaire
make test-scenario-4    # Changement de plan
```

## Architecture

Ce niveau de test valide l'intégration complète :
- Teams Chatbot (UI)
- Bot Service (localhost:3978)
- UsageAggregationService (buffer)
- SaaS Database (Subscriptions, MeteredAuditLogs)
- Azure Marketplace API

## Avantages

- ✅ Tests en conditions réelles (Teams UI)
- ✅ Observation en temps réel du buffer
- ✅ Validation end-to-end complète
- ✅ Debugging interactif facile
- ✅ Commandes make simples

## Précautions

- ⚠️ Utiliser plan development ou starter
- ⚠️ Activer MARKETPLACE_TEST_MODE=true
- ⚠️ Limiter le nombre de messages si plan payant
- ⚠️ Monitorer les coûts Marketplace

## Support

Voir [TEST-PLAN-AGGREGATION.md](../../doc/phase2/TEST-PLAN-AGGREGATION.md) pour la stratégie complète.
```

---

## Résumé

Le **Niveau 4 - Playground** offre :

1. ✅ **Tests interactifs** via Microsoft Teams
2. ✅ **8 commandes de diagnostic** simples (Makefile)
3. ✅ **4 scénarios de test** pré-définis
4. ✅ **Observation temps réel** du buffer et API
5. ✅ **Debugging facile** avec logs détaillés

**Usage typique** :
```bash
# Démarrer
make start-playground

# Diagnostic
make get-plan
make show-buffer

# Envoyer messages via Teams...

# Observer
make count-buffer-messages
make show-audit-logs

# Changer configuration
make set-plan PLAN=professional
make restart-playground
```

---

**Document rédigé le** : 2024-11-01  
**Version** : 1.0  
**Auteur** : GitHub Copilot  
**Statut** : ✅ Prêt pour implémentation
