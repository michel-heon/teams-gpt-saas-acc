# Scripts de Test SaaS Playground

Ce répertoire contient tous les scripts Node.js pour tester et gérer l'intégration SaaS Accelerator.

## 📋 Scripts de production (utilisés via Makefile)

### Gestion des subscriptions

#### `setup-playground-subscription.js`
Configure une nouvelle subscription Playground de manière interactive.

**Usage:** `make setup-playground`

**Fonctionnalités:**
- Crée une subscription avec plan dev-01
- Génère un GUID unique pour AMPSubscriptionId
- Configure automatiquement les dates (créé, dernier modifié)
- Lie automatiquement au TeamsUserId configuré

#### `link-teams-user.js`
Lie un TeamsUserId à une subscription existante.

**Usage:** `make link-teams-user`

**Fonctionnalités:**
- Liste les subscriptions disponibles
- Demande le TeamsUserId à lier
- Met à jour la table SubscriptionCustomUsers

#### `reset-playground.js`
Supprime toutes les subscriptions Playground (⚠️ destructif).

**Usage:** `make reset-playground`

**Attention:** Cette commande supprime définitivement les données!

### Gestion des plans

#### `list-plans.js`
Liste tous les plans depuis la base de données avec leurs dimensions.

**Usage:** `make list-plans`

**Affiche:**
- ID du plan
- Nom du plan
- Description
- Dimensions associées (dimension, unité, prix)

#### `list-plans-market.js`
Liste les plans avec la configuration Marketplace (limites et coûts).

**Usage:** `make list-plans-market`

**Affiche:**
- Prix de base mensuel
- Messages inclus dans le quota
- Tarif par message de dépassement
- Dimension de facturation Marketplace

### Diagnostic des messages

#### `message-count.js`
Compte les messages enregistrés dans MeteredAuditLogs.

**Usage:** `make message-count`

**Affiche:**
- Total de messages par plan
- Statistiques par statut (succès/erreurs)
- Période couverte (première/dernière date)
- Taux de succès

#### `message-count-market.js`
Compte les messages émis vers l'API Azure Marketplace.

**Usage:** `make message-count-market`

**Affiche:**
- Messages avec réponse API (ResponseJson NOT NULL)
- Codes de statut HTTP
- Taux de succès des émissions
- Messages en attente d'émission

#### `message-diag.js` ⭐ **NOUVEAU**
Diagnostic complet de l'état des messages Marketplace.

**Usage:** `make message-diag`

**Affiche:**
- 📊 Nombre total de messages dans la BD
- ⏳ Nombre de messages en transit (non émis)
- ⏰ Heure de la prochaine transmission (via Scheduler)
- ✅ Nombre de messages enregistrés dans Marketplace
- 📋 Détails des messages par heure
- ⚙️ Configuration du Metered Billing
- 📅 Informations du Scheduler (StartDate, NextRunTime, Frequency)

**Exemple de sortie:**
```
🔍 DIAGNOSTIC COMPLET DES MESSAGES MARKETPLACE
═══════════════════════════════════════════════
📊 Messages dans la base de données: 9
⏳ Messages en transit (non émis): 9
✅ Messages enregistrés dans Marketplace: 0

📋 Détail des messages en transit:
   🕐 Heure 2025-11-02 11:00 UTC: 6 message(s)
   🕐 Heure 2025-11-02 12:00 UTC: 3 message(s)

⏰ Prochaine transmission prévue:
   📅 Scheduler: Playground-meter
   🔁 Fréquence: Hourly
   ⏱️  Démarrage dans: 53 minute(s)
```

## 🔧 Scripts utilitaires (pour développement)

### `check-schema.js`
Inspecte le schéma d'une table de la base de données.

**Usage direct:** `node scripts/check-schema.js`

**Fonctionnalités:**
- Affiche les colonnes et leurs types
- Utile pour comprendre la structure des tables

### `check-tables.js`
Liste toutes les tables disponibles dans la base de données.

**Usage direct:** `node scripts/check-tables.js`

### `check-hourly-aggregation.js`
Vérifie l'agrégation horaire des messages.

**Usage direct:** `node scripts/check-hourly-aggregation.js`

**Fonctionnalités:**
- Affiche les messages groupés par heure
- Calcule les totaux agrégés
- Vérifie la conformité avec les contraintes Marketplace (1 événement/heure/dimension)

### `check-marketplace-config.js`
Vérifie la configuration Marketplace dans les variables d'environnement.

**Usage direct:** `node scripts/check-marketplace-config.js`

**Affiche:**
- MARKETPLACE_METERING_API_URL
- MARKETPLACE_TENANT_ID
- MARKETPLACE_CLIENT_ID
- MARKETPLACE_CLIENT_SECRET (masqué)

### `check-messages-by-hour.js`
Affiche les messages enregistrés groupés par heure.

**Usage direct:** `node scripts/check-messages-by-hour.js`

**Utile pour:**
- Déboguer l'agrégation horaire
- Vérifier la répartition temporelle des messages

### `test-metering-init.js`
Teste l'initialisation du système de metering.

**Usage direct:** `node scripts/test-metering-init.js`

**Vérifie:**
- Connexion à la base de données
- Configuration des credentials Marketplace
- Tables MeteredAuditLogs accessibles

## 📊 Architecture des messages (Novembre 2025)

### Flux correct (actuel)

```
Teams App → MeteredAuditLogs (INSERT)
                ↓
SaaS Accelerator Metered Scheduler
                ↓
Agrégation par heure
                ↓
Marketplace API (POST)
                ↓
MeteredAuditLogs (UPDATE ResponseJson)
```

### ⚠️ Architecture obsolète (supprimée)

Les composants suivants ont été supprimés car incorrects:
- ❌ `usageAggregationService.js` (agrégation dans Teams app)
- ❌ `data/usage-buffer.json` (buffer local)
- ❌ Cron job dans l'application Teams
- ❌ `meteringApiService.js` (émission directe depuis Teams app)
- ❌ Scripts de diagnostic obsolètes (diagnostic-marketplace.js, force-emit-pending.js)

**Raison:** L'émission vers Marketplace API doit être gérée par le **SaaS Accelerator Metered Scheduler**, pas par l'application Teams.

Voir: `doc/phase2/saas-accelerator-metered-scheduler.md` pour la configuration.

## 🔗 Connexion à la base de données

Tous les scripts utilisent **Azure AD authentication** (passwordless):

```javascript
const dbConfig = {
  server: 'sac-02-sql.database.windows.net',
  database: 'sac-02AMPSaaSDB',
  authentication: {
    type: 'azure-active-directory-default'
  },
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};
```

**Prérequis:**
- Être connecté via `az login`
- Avoir les permissions sur la base de données SQL

## 📦 Dépendances

```json
{
  "dependencies": {
    "mssql": "^10.0.0",
    "dotenv": "^16.0.0"
  }
}
```

## 🔑 Variables d'environnement

Fichier: `env/.env.playground`

```bash
# Base de données SaaS Accelerator
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB

# Marketplace API (pour référence uniquement - utilisé par SaaS Accelerator)
MARKETPLACE_METERING_API_URL=https://marketplaceapi.microsoft.com/api/usageEvent?api-version=2018-08-31
MARKETPLACE_TENANT_ID=aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2
MARKETPLACE_CLIENT_ID=d3b2710f-1be9-4f89-8834-6273619bd838
```

## 📚 Documentation

- [TEST-PLAN-PLAYGROUND.md](../../doc/phase2/TEST-PLAN-PLAYGROUND.md) - Plan de tests Playground complet
- [saas-accelerator-metered-scheduler.md](../../doc/phase2/saas-accelerator-metered-scheduler.md) - Configuration du Metered Scheduler
- [ARCHITECTURE.md](../../doc/phase2/ARCHITECTURE.md) - Architecture Phase 2
- [configuration-saas.md](../../doc/phase2/configuration-saas.md) - Configuration SaaS Accelerator

## 🆘 Support

Pour toute question ou problème:
1. Vérifier que `az login` est actif
2. Vérifier les permissions sur la base de données
3. Consulter la documentation dans `doc/phase2/`
4. Utiliser `make message-diag` pour un diagnostic complet
