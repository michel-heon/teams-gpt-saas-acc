# Changements Phase 1 - Suppression des valeurs hardcodées

## 📋 Résumé

Tous les scripts et fichiers Bicep ont été modifiés pour utiliser les variables d'environnement depuis `env/.env.dev` au lieu de valeurs hardcodées. Cela respecte l'architecture M365 Agents Toolkit.

## ✅ Fichiers modifiés

### 1. Infrastructure Bicep

#### `infra/azure.bicep`
- ✅ Ajout de 6 paramètres SaaS : `saasDbServer`, `saasDbName`, `saasDbUseManagedIdentity`, `saasEnableSubscriptionCheck`, `saasDebugMode`, `saasPermissiveMode`
- ✅ Utilisation des paramètres dans `appSettings` au lieu de valeurs hardcodées
- ❌ Supprimé : `value: 'sac-02-sql.database.windows.net'`
- ✅ Remplacé par : `value: saasDbServer`

#### `infra/azure.parameters.json`
- ✅ Ajout de 6 nouveaux paramètres avec placeholders TeamsFx :
  ```json
  "saasDbServer": { "value": "${{SAAS_DB_SERVER}}" }
  "saasDbName": { "value": "${{SAAS_DB_NAME}}" }
  "saasDbUseManagedIdentity": { "value": "${{SAAS_DB_USE_MANAGED_IDENTITY}}" }
  "saasEnableSubscriptionCheck": { "value": "${{SAAS_ENABLE_SUBSCRIPTION_CHECK}}" }
  "saasDebugMode": { "value": "${{SAAS_DEBUG_MODE}}" }
  "saasPermissiveMode": { "value": "${{SAAS_PERMISSIVE_MODE}}" }
  ```

### 2. Scripts Shell

#### `infra/update-bot-app-settings.sh`
- ✅ Charge automatiquement `env/.env.dev` au démarrage
- ✅ Utilise `${RESOURCE_SUFFIX}` pour construire `bot${RESOURCE_SUFFIX}`
- ✅ Utilise `${AZURE_RESOURCE_GROUP_NAME}` pour le resource group
- ✅ Utilise `${SAAS_DB_SERVER}`, `${SAAS_DB_NAME}`, etc. dans les App Settings
- ❌ Supprimé : `BOT_APP_SERVICE="bot997b9c"` (hardcodé)
- ✅ Remplacé par : `BOT_APP_SERVICE="bot${RESOURCE_SUFFIX}"`

#### `infra/deploy-sql-permissions.sh`
- ✅ Charge automatiquement `env/.env.dev` au démarrage
- ✅ Utilise `${SAAS_RESOURCE_GROUP}` pour le resource group SQL
- ❌ Supprimé : `RESOURCE_GROUP="rg-saasaccel-teams-gpt-02"` (hardcodé)
- ✅ Remplacé par : `RESOURCE_GROUP="${SAAS_RESOURCE_GROUP}"`

#### `infra/generate-sql-parameters.sh` (nouveau)
- ✅ Lit `env/.env.dev`
- ✅ Exécute `az webapp show` et `az identity show` pour obtenir les valeurs dynamiques
- ✅ Génère `azure.parameters.sql-permissions.json` automatiquement
- ✅ Élimine le besoin de maintenir les IPs et Principal ID manuellement

### 3. Makefile

#### `infra/Makefile`
- ✅ Nouvelle target : `check-env` - Vérifie que `env/.env.dev` existe
- ✅ Nouvelle target : `generate-params` - Génère les paramètres SQL depuis env
- ✅ Target `phase1` mise à jour pour inclure `check-env` et `generate-params`
- ❌ Supprimé : Variables Makefile hardcodées (`BOT_NAME`, `SQL_SERVER`, etc.)
- ✅ Remplacé par : Scripts qui lisent `env/.env.dev`

### 4. Documentation

#### `infra/README.md`
- ✅ Nouvelle section "⚙️ Configuration" expliquant M365 Agents Toolkit
- ✅ Liste des variables utilisées depuis `env/.env.dev`
- ✅ Mise à jour des exemples de déploiement
- ✅ Indication des placeholders `${{}}` remplacés par TeamsFx

## 🔄 Workflow mis à jour

### Avant (hardcodé)
```bash
# Valeurs hardcodées dans les scripts
BOT_APP_SERVICE="bot997b9c"
SQL_SERVER="sac-02-sql"
# ❌ Doit modifier manuellement si RESOURCE_SUFFIX change
```

### Après (dynamique)
```bash
# Les scripts lisent env/.env.dev automatiquement
export $(grep -v '^#' ../env/.env.dev | xargs)
BOT_APP_SERVICE="bot${RESOURCE_SUFFIX}"
SQL_SERVER=$(echo "$SAAS_DB_SERVER" | cut -d'.' -f1)
# ✅ Fonctionne pour tout environnement (dev, sandbox, prod)
```

## 🎯 Bénéfices

1. **Conformité M365 Agents Toolkit** : Utilise la même source de vérité (`env/.env.dev`)
2. **Multi-environnement** : Fonctionne pour dev, sandbox, production sans modification
3. **Maintenance réduite** : Changement de `RESOURCE_SUFFIX` → tout s'adapte automatiquement
4. **Pas de drift** : Les paramètres Bicep et les scripts utilisent les mêmes valeurs
5. **Audit trail** : `env/.env.dev` est versionné, on voit l'historique des configs

## 📝 Variables requises dans env/.env.dev

```bash
# Bot Configuration
RESOURCE_SUFFIX=997b9c
AZURE_RESOURCE_GROUP_NAME=rg-saas-test

# SaaS Accelerator Configuration
SAAS_RESOURCE_GROUP=rg-saasaccel-teams-gpt-02
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB
SAAS_DB_USE_MANAGED_IDENTITY=true
SAAS_ENABLE_SUBSCRIPTION_CHECK=false
SAAS_DEBUG_MODE=true
SAAS_PERMISSIVE_MODE=true
```

## ✅ Validation

Pour vérifier que tout fonctionne :

```bash
cd infra/

# 1. Vérifier que env/.env.dev existe
make check-env

# 2. Générer les paramètres SQL (teste la lecture de env)
make generate-params

# 3. Vérifier le contenu généré
cat azure.parameters.sql-permissions.json

# 4. Exécuter Phase 1 complète
make phase1
```

## 🚀 Prochaines étapes

- [ ] Marquer tâche #1 comme complétée
- [ ] Tester le déploiement sur environnement sandbox
- [ ] Vérifier que les paramètres TeamsFx sont correctement remplacés lors du provisioning
- [ ] Documenter dans `doc/guides/saas-integration-setup.md`
