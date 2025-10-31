# Configuration et Modes de Démarrage

Ce document décrit les différents modes de démarrage et configurations disponibles pour l'application Teams GPT SaaS Accelerator.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Environnements disponibles](#environnements-disponibles)
- [Variables d'environnement](#variables-denvironnement)
- [Modes de fonctionnement SaaS](#modes-de-fonctionnement-saas)
- [Configuration par environnement](#configuration-par-environnement)
- [Démarrage rapide](#démarrage-rapide)

## Vue d'ensemble

L'application supporte trois environnements principaux, chacun avec sa propre configuration et son propre comportement :

| Environnement | Fichier config | Mode SaaS | Base de données | Usage |
|---------------|----------------|-----------|-----------------|-------|
| **Playground** | `env/.env.playground` | Permissif | ❌ Optionnelle | Tests locaux rapides, développement UI |
| **Local** | `env/.env.local` | Permissif | ✅ Recommandée | Développement complet avec DB |
| **Sandbox** | `env/.env.sandbox` | Strict | ✅ Requise | Tests pré-production |

## Environnements disponibles

### 🎮 Playground (Microsoft 365 Agents Playground)

**Objectif :** Développement et tests rapides sans infrastructure complète

**Caractéristiques :**
- ✅ Démarre sans base de données
- ✅ Pas besoin de credentials Azure SQL
- ✅ Interface de test intégrée (Test Tool)
- ⚠️ Les fonctionnalités SaaS sont simulées (pas de vérification d'abonnement)
- ⚠️ Pas de tracking d'usage réel

**Tâche VS Code :** `Start Agent in Microsoft 365 Agents Playground`

**Logs typiques au démarrage :**
```
[SaaSIntegration] Failed to initialize database connection: ConnectionError: Login failed for user ''.
[SaaSIntegration] Running in permissive mode - continuing without database connection
[SubscriptionCheck] No subscription found, but permissive mode enabled
[UsageTracking] No subscription found, skipping usage tracking
```

**Quand l'utiliser :**
- 🔧 Développement de nouvelles fonctionnalités UI/UX
- 🧪 Tests de conversation et prompts
- 🚀 Démos rapides
- 📝 Validation de l'intégration Teams

### 💻 Local (Développement avec DB)

**Objectif :** Développement complet avec toutes les fonctionnalités SaaS

**Caractéristiques :**
- ✅ Connexion à une base de données Azure SQL (dev ou locale)
- ✅ Vérification des abonnements
- ✅ Tracking d'usage réel
- ⚠️ Mode permissif par défaut (peut être strict)
- 🔍 Logs détaillés avec `SAAS_DEBUG_MODE=true`

**Tâche VS Code :** `Start Agent Locally`

**Logs typiques au démarrage :**
```
[SaaSIntegration] Database connection initialized successfully
[SubscriptionCheck] Checking subscription for user: xxx
[SubscriptionCheck] Active subscription found: xxx
[UsageTracking] Current usage: 150/10000 messages
```

**Quand l'utiliser :**
- 💾 Développement des fonctionnalités SaaS
- 🧪 Tests d'intégration avec DB
- 📊 Validation du tracking d'usage
- 🔐 Tests des scénarios d'abonnement

### 🏖️ Sandbox (Pré-production)

**Objectif :** Environnement de test proche de la production

**Caractéristiques :**
- ✅ Connexion DB requise (mode strict)
- ✅ Vérification stricte des abonnements
- ✅ Tracking d'usage complet
- ❌ Bloque les messages sans abonnement valide
- 📈 Comportement identique à la production

**Tâche VS Code :** `Start Agent (Sandbox)`

**Logs typiques au démarrage :**
```
[SaaSIntegration] Database connection initialized successfully
[SubscriptionCheck] Strict mode enabled - subscription required
```

**Quand l'utiliser :**
- 🧪 Tests avant déploiement production
- ✅ Validation des scénarios d'abonnement
- 🚫 Tests des cas d'erreur (limite atteinte, abonnement expiré)
- 📊 Validation du comportement production

## Variables d'environnement

### Variables communes (tous environnements)

```bash
# Azure OpenAI (requis)
AZURE_OPENAI_API_KEY=sk-...
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Bot Framework (généré automatiquement)
CLIENT_ID=xxx
CLIENT_SECRET=xxx
BOT_ID=xxx
BOT_DOMAIN=xxx.devtunnels.ms
```

### Variables SaaS (optionnelles selon mode)

```bash
# Base de données Azure SQL (optionnelle en playground, requise en sandbox)
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB
SAAS_DB_USER=CloudSAdd5b00f1
SAAS_DB_PASSWORD=***

# Modes de fonctionnement
SAAS_PERMISSIVE_MODE=true   # true = dev, false = prod
SAAS_DEBUG_MODE=true        # true = logs détaillés, false = logs minimaux
```

## Modes de fonctionnement SaaS

### 🔓 Mode Permissif (`SAAS_PERMISSIVE_MODE=true`)

**Comportement :**
- ✅ Continue même si la DB n'est pas disponible
- ✅ Autorise les messages sans abonnement (avec warning)
- ✅ Continue en cas d'erreur de tracking
- 📝 Logs détaillés des erreurs
- ⚠️ Messages d'avertissement dans la console

**Configuration :**
```bash
SAAS_PERMISSIVE_MODE=true
SAAS_DEBUG_MODE=true
```

**Cas d'usage :**
- Développement local sans DB
- Tests playground
- Démos
- Développement UI/UX

**Messages utilisateur :**
Aucun blocage, l'utilisateur peut toujours envoyer des messages.

### 🔒 Mode Strict (`SAAS_PERMISSIVE_MODE=false`)

**Comportement :**
- ❌ Bloque le démarrage si la DB n'est pas disponible
- ❌ Bloque les messages sans abonnement actif
- ❌ Bloque les messages si limite atteinte
- 🚫 Arrête le traitement en cas d'erreur DB
- 📊 Tracking d'usage obligatoire

**Configuration :**
```bash
SAAS_PERMISSIVE_MODE=false
SAAS_DEBUG_MODE=false
```

**Cas d'usage :**
- Production
- Sandbox/Staging
- Tests pré-production
- Validation comportement final

**Messages utilisateur :**
```
❌ No Active Subscription

You don't have an active subscription to use this service.
Please visit Azure Marketplace to subscribe:
https://azuremarketplace.microsoft.com/...
```

```
⚠️ Message Limit Reached

You've reached your message limit for this billing period.

Current usage: 10,000 / 10,000 messages
Limit reset: 2025-11-01

To continue using the service, please upgrade your plan or wait for the next billing period.
```

## Configuration par environnement

### 📁 Fichiers de configuration

Chaque environnement a ses propres fichiers :

```
env/
├── .env.playground          # Variables playground (commité)
├── .env.playground.user     # Secrets playground (gitignored)
├── .env.local               # Variables local (commité)
├── .env.local.user          # Secrets local (gitignored)
├── .env.sandbox             # Variables sandbox (commité)
└── .env.sandbox.user        # Secrets sandbox (gitignored)

.localConfigs.playground     # Généré (gitignored)
.localConfigs.local          # Généré (gitignored)
```

### 🎮 Configuration Playground

**Fichier :** `env/.env.playground`

```bash
# Mode permissif activé (pas de DB requise)
SAAS_PERMISSIVE_MODE=true
SAAS_DEBUG_MODE=true

# Azure OpenAI (à configurer dans .env.playground.user)
# AZURE_OPENAI_API_KEY=<voir .env.playground.user>
# AZURE_OPENAI_ENDPOINT=<voir .env.playground.user>
# AZURE_OPENAI_DEPLOYMENT_NAME=<voir .env.playground.user>

# Base de données (optionnelle, commentée par défaut)
# SAAS_DB_SERVER=sac-02-sql.database.windows.net
# SAAS_DB_NAME=sac-02AMPSaaSDB
# SAAS_DB_USER=CloudSAdd5b00f1
# SAAS_DB_PASSWORD=***
```

**Fichier :** `env/.env.playground.user` (à créer)

```bash
SECRET_AZURE_OPENAI_API_KEY=sk-your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

### 💻 Configuration Local

**Fichier :** `env/.env.local`

```bash
# Mode permissif avec DB
SAAS_PERMISSIVE_MODE=true
SAAS_DEBUG_MODE=true

# Azure OpenAI (à configurer dans .env.local.user)
# AZURE_OPENAI_API_KEY=<voir .env.local.user>

# Base de données Azure SQL (recommandé)
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB
SAAS_DB_USER=CloudSAdd5b00f1
SAAS_DB_PASSWORD=***  # À mettre dans .env.local.user
```

**Fichier :** `env/.env.local.user` (à créer)

```bash
SECRET_AZURE_OPENAI_API_KEY=sk-your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Credentials DB (si différents)
SAAS_DB_PASSWORD=your-db-password
```

### 🏖️ Configuration Sandbox

**Fichier :** `env/.env.sandbox`

```bash
# Mode strict (production-like)
SAAS_PERMISSIVE_MODE=false
SAAS_DEBUG_MODE=false

# Azure OpenAI
# AZURE_OPENAI_API_KEY=<voir .env.sandbox.user>

# Base de données Azure SQL (requis)
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB
SAAS_DB_USER=CloudSAdd5b00f1
SAAS_DB_PASSWORD=***  # À mettre dans .env.sandbox.user
```

## Démarrage rapide

### 🚀 Démarrage Playground (sans DB)

**1. Configurer Azure OpenAI**

Créer `env/.env.playground.user` :
```bash
SECRET_AZURE_OPENAI_API_KEY=sk-your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

**2. Démarrer l'agent**

- Dans VS Code : `F5` → Sélectionner `Debug in Microsoft 365 Agents Playground`
- Ou via tâche : `Start Agent in Microsoft 365 Agents Playground`

**3. Tester**

- Le playground s'ouvre automatiquement dans le navigateur
- Envoyer un message : "Bonjour, comment vas-tu ?"
- Le bot répond sans vérification d'abonnement

### 🚀 Démarrage Local (avec DB)

**1. Configurer Azure OpenAI et DB**

Créer `env/.env.local.user` :
```bash
SECRET_AZURE_OPENAI_API_KEY=sk-your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

SAAS_DB_PASSWORD=your-db-password
```

**2. Vérifier la connexion DB**

```bash
npm run test:integration:db
```

**3. Démarrer l'agent**

- Dans VS Code : Tâche `Start Agent Locally`
- Ou CLI : `npm run dev:teamsfx`

**4. Tester avec Teams**

- L'application s'ouvre dans Teams Desktop
- Les abonnements et limites sont vérifiés

### 🚀 Démarrage Sandbox

**1. Configurer tous les credentials**

Créer `env/.env.sandbox.user` avec toutes les variables requises.

**2. Démarrer**

Tâche : `Start Agent (Sandbox)`

**3. Tester les scénarios d'erreur**

- Message sans abonnement → Bloqué
- Message avec limite atteinte → Bloqué
- Message avec abonnement valide → OK

## Dépannage

### ❌ Erreur : "Login failed for user ''" en playground

**Cause :** Normal, pas de DB configurée en playground

**Solution :** Aucune action requise, vérifier que :
```bash
SAAS_PERMISSIVE_MODE=true
```

Le message suivant doit apparaître :
```
[SaaSIntegration] Running in permissive mode - continuing without database connection
```

### ❌ Erreur : "No Active Subscription" en local

**Cause :** Base de données vide ou utilisateur Teams non enregistré

**Solution :** 
1. Activer le mode permissif temporairement :
   ```bash
   SAAS_PERMISSIVE_MODE=true
   ```

2. Ou créer un abonnement de test dans la DB :
   ```bash
   npm run db:seed-test-subscriptions
   ```

### ❌ Erreur : Application ne démarre pas

**Vérifier :**
1. Node.js version 20 ou 22 installée
2. Variables Azure OpenAI configurées dans `.env.*.user`
3. Port 3978 disponible
4. Microsoft 365 Agents Toolkit installé

**Debug :**
```bash
# Vérifier la config chargée
SAAS_DEBUG_MODE=true npm run dev:teamsfx:testtool
```

## Ressources

- **Documentation middlewares :** [src/middleware/README.md](src/middleware/README.md)
- **Documentation tests :** [tests/README.md](tests/README.md)
- **Configuration Azure SQL :** [tests/AZURE-SQL-CONFIG.md](tests/AZURE-SQL-CONFIG.md)
- **Architecture Phase 2 :** [doc/architecture/phase2-teams-integration.md](doc/architecture/phase2-teams-integration.md)

## Support

Pour toute question ou problème :
1. Consulter les logs avec `SAAS_DEBUG_MODE=true`
2. Vérifier la section [Dépannage](#dépannage)
3. Consulter [src/middleware/README.md](src/middleware/README.md) section "Troubleshooting"
