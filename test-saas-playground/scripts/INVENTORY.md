# Inventaire des Scripts - SaaS Accelerator Playground

## Vue d'ensemble

Ce dossier contient les scripts de gestion et diagnostic du SaaS Accelerator pour Azure Marketplace.

## Scripts par Catégorie

### 📊 Diagnostic des Messages (Recommandé: `message-status.js`)

| Script | Commande | Description | Utilisation recommandée |
|--------|----------|-------------|------------------------|
| **`message-status.js`** | `make message-status` | ⭐ **Script unifié recommandé** - Affiche clairement les messages EN ATTENTE vs TRAITÉS avec détails par dimension et heure | **Utiliser en priorité** |
| `message-diag.js` | `make message-diag` | Diagnostic détaillé avec scheduler et marketplace | Redondant avec message-status |
| `message-count.js` | `make message-count` | Compte les messages par plan et statut | Redondant avec message-status |
| `message-count-market.js` | `make message-count-market` | Compte les messages émis au Marketplace | Redondant avec message-status |

**Recommandation:** Utiliser uniquement `message-status.js` qui combine toutes les fonctionnalités des 3 autres scripts.

### ⏰ Gestion du Scheduler

| Script | Commande | Description | Fonctionnalités |
|--------|----------|-------------|-----------------|
| `configure-scheduler.js` | `make list-schedulers` | Liste tous les Schedulers configurés | list, create, update, delete |
| `run-scheduler-manually.js` | `make run-scheduler ID=<id>` | Exécution manuelle d'un Scheduler (workaround WebJob) | Génère un message MeteredAuditLogs, met à jour NextRunTime |

### 🔧 Configuration Subscription

| Script | Commande | Description | Usage |
|--------|----------|-------------|-------|
| `setup-playground-subscription.js` | `make setup-playground` | Configuration interactive d'une nouvelle subscription | Création initiale |
| `activate-subscription.js` | `make activate-subscription SUB=<name>` | Active une subscription PendingFulfillmentStart | Déblocage |
| `link-teams-user.js` | `make link-teams-user` | Lie un TeamsUserId à une subscription | Association utilisateur |
| `reset-playground.js` | `make reset-playground` | ⚠️ Supprime les subscriptions Playground | Nettoyage (destructif) |

### 📋 Gestion des Plans

| Script | Commande | Description | Détails |
|--------|----------|-------------|---------|
| `list-plans.js` | `make list-plans` | Liste les plans depuis la BD SaaS Accelerator | Plans actifs |
| `list-plans-market.js` | `make list-plans-market` | Liste les plans avec config Marketplace (limites, coûts) | Plans + pricing |

### 🔍 Diagnostics Techniques

| Script | Description | Usage |
|--------|-------------|-------|
| `check-schema.js` | Vérifie le schéma de la base de données | Debugging DB |
| `check-tables.js` | Liste toutes les tables disponibles | Exploration DB |
| `check-marketplace-config.js` | Vérifie la configuration Marketplace | Validation config |
| `check-hourly-aggregation.js` | Vérifie l'agrégation horaire des messages | Analyse agrégation |
| `check-messages-by-hour.js` | Analyse les messages par heure | Distribution temporelle |
| `test-metering-init.js` | Initialisation de test pour metering | Setup initial |

## Dépendances Communes

Tous les scripts utilisent:
- **Node.js modules**: `mssql`, `dotenv`
- **Configuration**: `../../src/config.js` ou `../../env/.env.playground`
- **Base de données**: Azure SQL avec authentification AAD

## Patterns de Réutilisation

### 1. Connexion Base de Données

```javascript
const sql = require('mssql');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../env/.env.playground') });

const dbConfig = {
  server: process.env.SAAS_DB_SERVER,
  database: process.env.SAAS_DB_NAME,
  authentication: { type: 'azure-active-directory-default' },
  options: { encrypt: true, trustServerCertificate: false }
};

const pool = await sql.connect(dbConfig);
```

### 2. Conversion Timezone EST

```javascript
function toEST(date) {
  return new Date(date.getTime() - (5 * 60 * 60 * 1000));
}

function formatEST(date) {
  const est = toEST(date);
  return est.toISOString().replace('T', ' ').substring(0, 19) + ' EST';
}
```

### 3. Requêtes Messages EN ATTENTE vs TRAITÉS

```javascript
// Messages en attente (non traités)
SELECT * FROM MeteredAuditLogs WHERE ResponseJson IS NULL

// Messages traités (envoyés au Marketplace)
SELECT * FROM MeteredAuditLogs WHERE ResponseJson IS NOT NULL
```

### 4. Extraction Dimension depuis RequestJson

```javascript
SELECT 
  JSON_VALUE(RequestJson, '$.dimension') as Dimension,
  COUNT(*) as Count
FROM MeteredAuditLogs
WHERE RequestJson IS NOT NULL
GROUP BY JSON_VALUE(RequestJson, '$.dimension')
```

## Scripts Redondants à Consolider

### Actuellement

- ❌ `message-diag.js` - Diagnostic complet
- ❌ `message-count.js` - Comptage par plan
- ❌ `message-count-market.js` - Comptage Marketplace
- ✅ `message-status.js` - **Remplace les 3 ci-dessus**

### Recommandation

**Supprimer** les 3 scripts redondants et **utiliser uniquement** `message-status.js` qui:
- Affiche clairement EN ATTENTE vs TRAITÉS
- Regroupe par heure et dimension
- Montre les erreurs
- Affiche le prochain Scheduler

## Conventions de Nommage

- **Verbe d'action**: `check-`, `list-`, `setup-`, `reset-`, `run-`
- **Domaine**: `-subscription`, `-scheduler`, `-plans`, `-messages`, `-market`
- **Suffixe**: `.js` pour tous les scripts Node.js

## Commandes Make Recommandées

```bash
# Diagnostic principal (⭐ recommandé)
make message-status

# Configuration Scheduler
make list-schedulers
make run-scheduler ID=4

# Gestion Subscription
make activate-subscription SUB=heon-net
make setup-playground

# Gestion Plans
make list-plans
make list-plans-market
```

## Améliorations Futures

1. **Créer un module partagé** `lib/db.js` pour la connexion DB
2. **Créer un module partagé** `lib/timezone.js` pour les conversions EST
3. **Créer un module partagé** `lib/queries.js` pour les requêtes SQL communes
4. **Supprimer scripts redondants** après validation de `message-status.js`
5. **Ajouter tests unitaires** pour les fonctions de conversion
6. **Documenter le format RequestJson** pour l'API Marketplace

## Structure de Données Clés

### MeteredAuditLogs (Table principale des messages)

| Colonne | Type | Description |
|---------|------|-------------|
| `Id` | int | Identifiant unique |
| `SubscriptionId` | int | Référence à Subscriptions.Id |
| `RequestJson` | varchar | JSON envoyé au Marketplace (contient dimension, planId, quantity) |
| `ResponseJson` | varchar | Réponse API Marketplace (NULL = en attente) |
| `StatusCode` | varchar | Code HTTP (200, 400, BadRequest, etc.) |
| `CreatedDate` | datetime | Date de création du message |
| `SubscriptionUsageDate` | datetime | Date d'usage (heure pile) |
| `RunBy` | varchar | Qui a généré le message |

### Format RequestJson

```json
{
  "resourceId": "B8C115C2-FEC3-4B75-DDD9-39FF53FEBB38",
  "quantity": 0.01,
  "dimension": "free",
  "effectiveStartTime": "2025-11-03T12:00:00.000Z",
  "planId": "dev-01"
}
```

## Notes

- **ResponseJson NULL** = Message en attente (pas encore envoyé au Marketplace)
- **ResponseJson NOT NULL** = Message traité (envoyé au Marketplace, succès ou erreur)
- **StatusCode "BadRequest"** = Erreur dimension invalide ou autre problème API
- **Timezone**: Tous les timestamps DB sont en UTC, conversion EST = UTC-5
