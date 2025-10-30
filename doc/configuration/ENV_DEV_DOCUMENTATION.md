# Documentation du fichier `.env.dev`

## Vue d'ensemble

Le fichier `env/.env.dev` contient les variables d'environnement pour l'environnement de **développement** du projet Teams GPT SaaS. Ce fichier est versionné dans Git et contient les configurations non-sensibles nécessaires au déploiement et à l'exécution de l'application.

> ⚠️ **Important** : Ce fichier ne doit **PAS** contenir de secrets ou clés sensibles. Les secrets sont stockés dans `env/.env.dev.user` (non versionné).

## Variables d'environnement

### Variables système TeamsFx

#### `TEAMSFX_ENV`
```bash
TEAMSFX_ENV=dev
```
- **Description** : Identifie l'environnement Teams Toolkit actif
- **Valeur** : `dev` pour l'environnement de développement
- **Usage** : Utilisé par Teams Toolkit pour charger les bonnes configurations
- **Modifiable** : ❌ Non (géré automatiquement par Teams Toolkit)

#### `APP_NAME_SUFFIX`
```bash
APP_NAME_SUFFIX=dev
```
- **Description** : Suffixe ajouté au nom de l'application pour différencier les environnements
- **Valeur** : `dev` pour développement, `sandbox` ou `prod` pour autres environnements
- **Usage** : Ajouté aux noms de ressources Azure pour éviter les conflits
- **Exemple** : `teams-gpt-saas-acc-dev`
- **Modifiable** : ✅ Oui (si vous voulez un autre suffixe)

---

### Configuration Azure (à remplir lors du provisioning)

#### `AZURE_SUBSCRIPTION_ID`
```bash
AZURE_SUBSCRIPTION_ID=
```
- **Description** : Identifiant unique de votre abonnement Azure
- **Format** : GUID (ex: `12345678-1234-1234-1234-123456789abc`)
- **Comment l'obtenir** :
  ```bash
  az account show --query id -o tsv
  ```
- **Usage** : Identifie l'abonnement Azure où les ressources seront déployées
- **Requis pour** : Provisioning infrastructure Azure
- **Modifiable** : ⚠️ Avec précaution (nécessite re-provisioning)

#### `AZURE_RESOURCE_GROUP_NAME`
```bash
AZURE_RESOURCE_GROUP_NAME=
```
- **Description** : Nom du groupe de ressources Azure qui contiendra tous les services
- **Format** : Alphanumeric + tirets (ex: `rg-teams-gpt-saas-dev`)
- **Conventions** : 
  - Préfixe `rg-` recommandé
  - Inclure l'environnement dans le nom
- **Usage** : Regroupe logiquement toutes les ressources Azure du projet
- **Exemple** : `rg-teams-gpt-saas-dev`
- **Modifiable** : ⚠️ Avec précaution (nécessite re-provisioning)

#### `RESOURCE_SUFFIX`
```bash
RESOURCE_SUFFIX=
```
- **Description** : Suffixe unique ajouté aux noms de ressources Azure pour garantir l'unicité globale
- **Format** : String courte et unique (ex: `abc123`, `dev001`)
- **Usage** : Certains services Azure (Storage, App Service) nécessitent des noms globalement uniques
- **Génération** : 
  - Automatique lors du premier provisioning
  - Basé sur un hash de la subscription + resource group
- **Exemple de ressource** : `bot-teams-gpt-abc123`
- **Modifiable** : ⚠️ Non recommandé après provisioning

---

### Variables générées automatiquement

> ℹ️ Ces variables sont automatiquement remplies lors du provisioning via Teams Toolkit

#### `BOT_ID`
```bash
BOT_ID=
```
- **Description** : Identifiant unique du Bot Azure (Microsoft App ID)
- **Format** : GUID
- **Généré par** : Teams Toolkit lors de la création du Bot Registration
- **Usage** : 
  - Authentification du bot
  - Configuration du manifest Teams
- **Lié à** : Azure Bot Service Registration
- **Modifiable** : ❌ Non (géré automatiquement)

#### `TEAMS_APP_ID`
```bash
TEAMS_APP_ID=
```
- **Description** : Identifiant unique de l'application Teams
- **Format** : GUID
- **Généré par** : Teams Toolkit lors de la création de l'app Teams
- **Usage** : 
  - Identification de l'app dans Teams
  - Deep linking
  - Installation de l'app
- **Visible dans** : Teams Admin Center, manifest Teams
- **Modifiable** : ❌ Non (géré automatiquement)

#### `BOT_AZURE_APP_SERVICE_RESOURCE_ID`
```bash
BOT_AZURE_APP_SERVICE_RESOURCE_ID=
```
- **Description** : ID complet de la ressource Azure App Service hébergeant le bot
- **Format** : ARM Resource ID
- **Exemple** : 
  ```
  /subscriptions/{subscription-id}/resourceGroups/{rg-name}/providers/Microsoft.Web/sites/{app-name}
  ```
- **Usage** : 
  - Référencement de la ressource dans les scripts
  - Configuration des déploiements
- **Généré lors de** : Provisioning de l'App Service
- **Modifiable** : ❌ Non (géré automatiquement)

#### `BOT_DOMAIN`
```bash
BOT_DOMAIN=
```
- **Description** : Nom de domaine public de l'App Service hébergeant le bot
- **Format** : URL sans protocole (ex: `bot-teams-gpt-abc123.azurewebsites.net`)
- **Usage** : 
  - Endpoint des webhooks Teams
  - Configuration du Bot Registration
  - Messages endpoint : `https://{BOT_DOMAIN}/api/messages`
- **Généré lors de** : Provisioning de l'App Service
- **Type** : Sous-domaine `.azurewebsites.net` (ou custom domain si configuré)
- **Modifiable** : ⚠️ Possible (si vous configurez un custom domain)

---

## Workflow de configuration

### 1. Provisioning initial

Lors du premier provisioning avec Teams Toolkit :

```bash
# 1. Créer le fichier avec les valeurs de base
cp env/.env.dev.sample env/.env.dev

# 2. Configurer manuellement (si nécessaire)
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP_NAME=rg-teams-gpt-saas-dev

# 3. Lancer le provisioning
# Teams Toolkit génère automatiquement les autres variables
```

### 2. Variables automatiquement remplies

Après le provisioning, le fichier ressemble à :

```bash
TEAMSFX_ENV=dev
APP_NAME_SUFFIX=dev

AZURE_SUBSCRIPTION_ID=12345678-1234-1234-1234-123456789abc
AZURE_RESOURCE_GROUP_NAME=rg-teams-gpt-saas-dev
RESOURCE_SUFFIX=abc123

BOT_ID=87654321-4321-4321-4321-abcdef123456
TEAMS_APP_ID=11111111-2222-3333-4444-555555555555
BOT_AZURE_APP_SERVICE_RESOURCE_ID=/subscriptions/12345678.../sites/bot-teams-gpt-abc123
BOT_DOMAIN=bot-teams-gpt-abc123.azurewebsites.net
```

---

## Variables d'environnement additionnelles (à ajouter pour SaaS)

> 🆕 Pour la transformation en solution SaaS Marketplace, ces variables supplémentaires seront nécessaires :

### Configuration SaaS Accelerator

```bash
# SaaS Accelerator Database Connection
SAAS_ACCELERATOR_DB_CONNECTION=Server=tcp:saas-sql-server.database.windows.net,1433;Database=saas-accelerator-db;

# SaaS Accelerator URLs
SAAS_LANDING_PAGE_URL=https://your-saas-landing.azurewebsites.net
SAAS_ADMIN_PORTAL_URL=https://your-saas-admin.azurewebsites.net

# Feature Flags
ENABLE_USAGE_TRACKING=true
ENABLE_SUBSCRIPTION_CHECK=true
```

### Configuration Azure OpenAI

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

> ⚠️ **Important** : Les clés sensibles (`AZURE_OPENAI_KEY`, `DB_PASSWORD`) doivent être dans `env/.env.dev.user` (non versionné)

---

## Gestion des secrets

### Fichiers d'environnement

| Fichier | Usage | Versionné | Contenu |
|---------|-------|-----------|---------|
| `.env.dev` | Configuration de base | ✅ Oui | IDs, URLs, noms de ressources |
| `.env.dev.user` | Secrets utilisateur | ❌ Non | Clés API, mots de passe, tokens |
| `.env.local` | Variables locales | ❌ Non | Configuration machine spécifique |

### Secrets à ne JAMAIS versioner

- ❌ `AZURE_OPENAI_KEY`
- ❌ `BOT_PASSWORD` / `BOT_SECRET`
- ❌ Database passwords
- ❌ API keys
- ❌ Connection strings avec credentials

### Bonnes pratiques

1. **Utiliser Azure Key Vault** pour les secrets en production
2. **Variables sensibles dans `.env.dev.user`** pour le développement local
3. **Managed Identity** pour l'authentification Azure quand possible
4. **Ne jamais commit** les fichiers `.env.*.user`

---

## Validation de la configuration

### Vérifier que toutes les variables sont remplies

```bash
# Dans le terminal
cd env
cat .env.dev | grep "^[A-Z]" | grep "=$"
```

Si des lignes s'affichent avec `=` sans valeur, ces variables doivent être configurées.

### Tester la configuration

```bash
# Tester l'accès Azure
az account show --subscription $AZURE_SUBSCRIPTION_ID

# Vérifier le resource group
az group show --name $AZURE_RESOURCE_GROUP_NAME

# Tester l'app service
curl https://$BOT_DOMAIN/api/messages
```

---

## Troubleshooting

### Problème : Variables vides après provisioning

**Cause** : Le provisioning a échoué ou n'est pas terminé

**Solution** :
```bash
# Re-lancer le provisioning via Teams Toolkit
# Ou manuellement :
teamsfx provision --env dev
```

### Problème : RESOURCE_SUFFIX change après re-provisioning

**Cause** : La subscription ou resource group a changé

**Solution** :
- Si intentionnel : Accepter le nouveau suffixe et re-déployer
- Si non intentionnel : Restaurer les anciennes valeurs de `AZURE_SUBSCRIPTION_ID` et `AZURE_RESOURCE_GROUP_NAME`

### Problème : BOT_DOMAIN ne fonctionne pas

**Cause** : L'App Service n'est pas encore déployé ou l'URL a changé

**Solution** :
```bash
# Vérifier l'App Service
az webapp show --ids $BOT_AZURE_APP_SERVICE_RESOURCE_ID --query defaultHostName -o tsv

# Mettre à jour BOT_DOMAIN si nécessaire
```

---

## Migration vers production

Pour créer un environnement de production :

```bash
# 1. Copier la structure
cp env/.env.dev env/.env.prod

# 2. Modifier les valeurs spécifiques
TEAMSFX_ENV=prod
APP_NAME_SUFFIX=prod
AZURE_RESOURCE_GROUP_NAME=rg-teams-gpt-saas-prod
# ... autres variables ...

# 3. Provisionner l'environnement prod
teamsfx provision --env prod
```

---

## Références

- [Teams Toolkit Environment Variables](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teamsfx-multi-env)
- [Azure Resource Naming Conventions](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
- [Managing Secrets in Teams Apps](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teamsfx-multi-env#manage-sensitive-environment-variables)

---

**Dernière mise à jour** : Octobre 2025  
**Version du document** : 1.0
