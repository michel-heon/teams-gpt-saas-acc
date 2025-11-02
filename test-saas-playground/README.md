# 🧪 Test SaaS Playground

Infrastructure de test et de diagnostic pour le système d'agrégation d'usage et de metering du Teams GPT SaaS Accelerator.

## 📋 Vue d'ensemble

Ce dossier contient des scripts interactifs pour :
- 🔍 Inspecter les plans et configurations
- 📊 Analyser les messages et l'utilisation
- 🐛 Diagnostiquer les problèmes
- ✅ Valider le système d'agrégation

## 🚀 Prérequis

### Authentification Azure
Les scripts utilisent **Azure AD Default Authentication** (sans mot de passe) :

```bash
# Se connecter à Azure CLI
az login

# Vérifier le compte actif
az account show
```

**Compte requis** : `heon@cotechnoe.net` (ou compte avec accès à la BD)

### Base de données
- **Serveur** : `sac-02-sql.database.windows.net`
- **Base** : `sac-02AMPSaaSDB`
- **Authentification** : Azure AD (via Azure CLI token)

### Dépendances Node.js
```bash
# Installer les dépendances (depuis la racine du projet)
npm install
```

Packages requis :
- `mssql` : Connexion SQL Server
- Configuration depuis `src/config.js`

## 📦 Structure

```
test-saas-playground/
├── scripts/              # Scripts de diagnostic
│   ├── list-plans.js     # Liste les plans depuis la BD
│   ├── list-plans-market.js  # Plans avec config Marketplace
│   ├── message-count.js  # Compte messages dans audit logs
│   ├── message-count-market.js  # Messages émis vers Marketplace
│   ├── message-diag.js   # ⭐ Diagnostic complet
│   ├── setup-playground-subscription.js  # Configure subscription
│   ├── link-teams-user.js  # Lie TeamsUserId à subscription
│   ├── reset-playground.js  # Reset subscriptions (destructif)
│   ├── check-schema.js   # Utilitaire: inspect schéma BD
│   ├── check-tables.js   # Utilitaire: liste tables BD
│   └── README.md         # Documentation des scripts
├── Makefile              # Commandes make
└── README.md             # Cette documentation
```

## 🛠️ Commandes disponibles

### Afficher l'aide
```bash
make help
```

### 📋 Gestion des plans

#### Liste des plans (Base de données)
```bash
make list-plans
```

**Affiche** :
- ID et nom du plan
- Description
- Type (IsPerUser)
- Metering activé
- Dimensions associées
- Nombre de subscriptions actives

**Exemple de sortie** :
```
┌────────┬──────────────┬─────────────────┬──────────┬────────────┐
│ Plan   │ Nom          │ Dimensions      │ Metering │ Actives    │
├────────┼──────────────┼─────────────────┼──────────┼────────────┤
│ dev-01 │ Development  │ free            │ ✅       │ 0          │
│ pro    │ Professional │ pro             │ ✅       │ 2          │
└────────┴──────────────┴─────────────────┴──────────┴────────────┘
```

#### Plans avec configuration Marketplace
```bash
make list-plans-market
```

**Affiche en plus** :
- Limite mensuelle de messages
- Coût par message
- Configuration Marketplace complète
- Mapping dimension → plan

**Exemple de sortie** :
```
┌────────┬────────────┬────────────┬────────────┬──────────┬────────┐
│ Plan   │ Dimension  │ Limit/mois │ Coût/msg   │ Metering │ Actifs │
├────────┼────────────┼────────────┼────────────┼──────────┼────────┤
│ dev-01 │ free       │ 50         │ $0.020     │ ✅       │ 0      │
│ pro    │ pro        │ 300        │ $0.015     │ ✅       │ 2      │
└────────┴────────────┴────────────┴────────────┴──────────┴────────┘
```

### 📊 Comptage des messages

#### Messages dans l'audit log (SaaS Accelerator)
```bash
make message-count
```

**Analyse** :
- Tous les messages enregistrés dans `MeteredAuditLogs`
- Groupés par plan et code de statut HTTP
- Statistiques de succès/erreurs
- Période d'activité (première/dernière émission)
- Détails par plan avec taux de réussite

**Exemple de sortie** :
```
┌──────────────────┬──────────────┬──────────┬──────────┬──────────┐
│ Plan ID          │ Nom          │ Succès ✅ │ Échecs ❌ │ Total    │
├──────────────────┼──────────────┼──────────┼──────────┼──────────┤
│ pro              │ Professional │ 245      │ 5        │ 250      │
│ pro-plus         │ Pro Plus     │ 180      │ 2        │ 182      │
├──────────────────┴──────────────┼──────────┼──────────┼──────────┤
│ TOTAL                           │ 425      │ 7        │ 432      │
└─────────────────────────────────┴──────────┴──────────┴──────────┘

📈 Statistiques globales:
║ Total messages:     432
║ Taux de succès:     98.4%
║ Subscriptions:      4
║ Période:            2024-10-15 → 2024-10-31 (16j 8h)
```

#### Messages émis vers Marketplace API
```bash
make message-count-market
```

**Analyse** :
- Messages avec ResponseJson NOT NULL (émis vers API)
- Messages avec StatusCode 200/201/202 (succès)
- Messages avec StatusCode 400/409/500 (erreurs)
- Détails des réponses API
- Taux d'émission réussi vers Marketplace

**Différence avec message-count** :
- `message-count` : **TOUS** les messages dans l'audit log
- `message-count-market` : **SEULEMENT** les messages avec réponse API Marketplace

#### ⭐ Diagnostic complet (NOUVEAU)
```bash
make message-diag
```

**Affiche un diagnostic complet** :
- � Nombre total de messages dans la BD
- ⏳ Nombre de messages en transit (ResponseJson = NULL)
- ✅ Nombre de messages enregistrés dans Marketplace (avec réponse API)
- 📋 Détail des messages en transit par heure
- ⏰ Heure de la prochaine transmission (via SaaS Accelerator Scheduler)
- ⚙️ Configuration du Metered Billing (IsMeteredBillingEnabled)
- 📅 Informations du Scheduler (StartDate, NextRunTime, Frequency)
- 📈 Dernières émissions réussies

**Exemple de sortie** :
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
   📦 Subscription: Playground Subscription
   📋 Plan: dev-01
   🏷️  Dimension: dev
   🔁 Fréquence: Hourly
   📅 Date de début: 2025-11-02 19:00:00 UTC
   ⏱️  Démarrage dans: 53 minute(s)

⚙️  Configuration:
   Metered Billing: ✅ Activé

📊 RÉSUMÉ:
   Total messages: 9
   En transit: 9 (100.0%)
   Émis: 0 (0.0%)

✅ Les messages en transit seront émis lors de la prochaine exécution du scheduler
```

**⚠️ Note importante** : Ce script montre l'état réel du système. Si des messages sont en transit, c'est normal - ils seront émis par le SaaS Accelerator Metered Scheduler selon la fréquence configurée.

## 🔍 Utilitaires de diagnostic

### Inspecter le schéma d'une table
```bash
node scripts/check-schema.js
```
Affiche toutes les colonnes de la table `Plans` avec leurs types.

### Lister toutes les tables
```bash
node scripts/check-tables.js
```
Liste toutes les tables de la base de données et cherche celles liées au metering.

## 📊 Tables de la base de données

### Plans
Contient tous les plans disponibles :
- `Id`, `PlanId`, `DisplayName`, `Description`
- `IsPerUser`, `IsmeteringSupported`
- `PlanGUID`, `OfferID`

### MeteredDimensions
Dimensions de metering pour chaque plan :
- `Id`, `Dimension`, `PlanId`, `Description`

### Subscriptions
Subscriptions actives des clients :
- `Id`, `AmpPlanId`, `SubscriptionStatus`
- `TeamsUserId`, `TenantId`

### MeteredAuditLogs
Audit trail de toutes les émissions de metering :
- `Id`, `SubscriptionId`, `RequestJson`, `ResponseJson`
- `StatusCode`, `CreatedDate`

## ⚙️ Configuration Marketplace

La configuration Marketplace est définie dans `src/config.js` :

```javascript
marketplace: {
  enabled: false,  // État du metering
  meteringApiUrl: 'https://marketplaceapi.microsoft.com/api/usageEvent',
  dimensions: {
    free: { limit: 50, cost: 0.020 },
    pro: { limit: 300, cost: 0.015 },
    'pro-plus': { limit: 1500, cost: 0.010 }
  }
}
```

**Mapping Plan → Dimension** :
- `dev-01` → `free`
- `professional` → `pro`
- `pro-plus` → `pro-plus`

## 🎯 Cas d'usage

### 1. Vérifier les plans disponibles
```bash
make list-plans
```
→ Voir tous les plans dans la BD avec leurs dimensions

### 2. Vérifier la configuration Marketplace
```bash
make list-plans-market
```
→ Valider les limites et coûts configurés

### 3. Analyser l'utilisation historique
```bash
make message-count
```
→ Voir combien de messages ont été traités par plan

### 4. Vérifier les émissions Marketplace
```bash
make message-count-market
```
→ Identifier les erreurs d'émission vers l'API

### 5. Diagnostiquer un problème de metering
```bash
# 1. Vérifier que le plan existe
make list-plans

# 2. Vérifier la config Marketplace
make list-plans-market

# 3. Vérifier les messages émis
make message-count-market

# 4. Analyser les erreurs
# (le script affiche automatiquement le top 5 des erreurs)
```

## 🐛 Dépannage

### Erreur de connexion à la base de données
```
❌ Failed to connect to sac-02-sql.database.windows.net:1433
```

**Solution** :
1. Vérifier Azure CLI : `az login`
2. Vérifier le compte : `az account show`
3. Vérifier les permissions sur la BD

### Aucun message trouvé
```
⚠️  Aucun message trouvé dans les audit logs
```

**Raisons possibles** :
1. Aucun message n'a encore été traité
2. La table `MeteredAuditLogs` est vide
3. Aucun metering n'a été effectué

**Pour générer des données** :
1. Lancer l'agent dans le Playground
2. Envoyer des messages pour créer des usages
3. Activer le metering : `config.marketplace.enabled = true`
4. Attendre l'agrégation horaire

### Metering désactivé
```
📡 État: ⚠️  Désactivé
```

**Solution** :
Modifier `src/config.js` :
```javascript
marketplace: {
  enabled: true,  // ← Changer false → true
  ...
}
```

## 📚 Documentation complète

Pour plus de détails sur le plan de test et les scénarios :
- **TEST-PLAN-PLAYGROUND.md** : Plan de test complet Phase 2.5
- **IMPLEMENTATION-V1.2.8.md** : Détails de l'implémentation v1.2.8

## 🔗 Ressources

- **Base de données** : Azure SQL Database (sac-02-sql)
- **API Marketplace** : [Azure Marketplace Metering API](https://learn.microsoft.com/en-us/partner-center/marketplace/marketplace-metering-service-apis)
- **Azure CLI** : [Documentation az login](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli)

## 📝 Notes

- Les scripts utilisent l'authentification Azure AD (pas de mot de passe stocké)
- Les requêtes SQL sont en lecture seule (sauf scripts futurs set-plan)
- Les données affichées sont en temps réel depuis la base de données
- Le metering Marketplace peut être désactivé pour les tests

---

**Version** : 1.0.0  
**Date** : Novembre 2025  
**Phase** : 2.5 - Playground Testing Infrastructure
