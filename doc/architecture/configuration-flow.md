# Flux de Configuration : env → yaml → localConfigs

## Vue d'ensemble

Le système de configuration suit un flux en 3 étapes pour gérer les variables d'environnement dans différents environnements (local, playground, production).

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  env/.env.*     │ --> │  m365agents.yml  │ --> │  .localConfigs  │
│  (source)       │     │  (injection)     │     │  (runtime)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Étape 1 : Fichiers Source (env/.env.*)

**Localisation** : `env/.env.{environment}`

**Rôle** : Définir les valeurs par défaut et les variables d'environnement pour chaque environnement.

**Fichiers** :
- `env/.env.local` - Développement local
- `env/.env.playground` - Microsoft 365 Agents Playground
- `env/.env.dev` - Environnement de développement
- `env/.env.staging` - Environnement de staging
- `env/.env.prod` - Production

**Exemple** (`env/.env.playground`) :
```bash
# Built-in environment variables
TEAMSFX_ENV=playground

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# SaaS Integration
SAAS_DEBUG_MODE=true
SAAS_PERMISSIVE_MODE=true
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB

# Marketplace Metering
MARKETPLACE_METERING_ENABLED=true
```

**Caractéristiques** :
- ✅ Commité dans Git (pas de secrets)
- 📝 Valeurs par défaut partagées par toute l'équipe
- 🔧 Édité manuellement par les développeurs

---

## Étape 2 : Fichiers d'Injection (m365agents.*.yml)

**Localisation** : `m365agents.{environment}.yml`

**Rôle** : Définir comment les variables sont injectées dans `.localConfigs` lors du déploiement.

**Fichiers** :
- `m365agents.local.yml` - Configuration locale
- `m365agents.playground.yml` - Configuration playground
- `m365agents.yml` - Configuration par défaut

**Exemple** (`m365agents.playground.yml`) :
```yaml
version: v1.9

deploy:
  # Generate runtime environment variables
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: ./.localConfigs.playground
      envs:
        # Secrets (depuis le secret store)
        AZURE_OPENAI_API_KEY: ${{SECRET_AZURE_OPENAI_API_KEY}}
        
        # Variables d'environnement (depuis env/.env.playground)
        AZURE_OPENAI_ENDPOINT: ${{AZURE_OPENAI_ENDPOINT}}
        AZURE_OPENAI_DEPLOYMENT_NAME: ${{AZURE_OPENAI_DEPLOYMENT_NAME}}
        TEAMSFX_NOTIFICATION_STORE_FILENAME: ${{TEAMSFX_NOTIFICATION_STORE_FILENAME}}
        
        # SaaS Configuration
        SAAS_DEBUG_MODE: ${{SAAS_DEBUG_MODE}}
        SAAS_PERMISSIVE_MODE: ${{SAAS_PERMISSIVE_MODE}}
        SAAS_DB_SERVER: ${{SAAS_DB_SERVER}}
        SAAS_DB_NAME: ${{SAAS_DB_NAME}}
        
        # Marketplace Configuration
        MARKETPLACE_METERING_ENABLED: ${{MARKETPLACE_METERING_ENABLED}}
```

**Syntaxe d'injection** :
- `${{VARIABLE_NAME}}` - Injecte depuis `env/.env.{environment}`
- `${{SECRET_NAME}}` - Injecte depuis le secret store (Azure Key Vault, .env.local.user, etc.)

**Caractéristiques** :
- ✅ Commité dans Git
- 🎯 Définit quelles variables sont exposées au runtime
- 🔒 Sépare les secrets des variables publiques

---

## Étape 3 : Fichiers Runtime (.localConfigs.*)

**Localisation** : `.localConfigs.{environment}`

**Rôle** : Fichier final contenant toutes les variables d'environnement au moment de l'exécution.

**Fichiers** :
- `.localConfigs` - Configuration locale par défaut
- `.localConfigs.playground` - Configuration playground
- `.localConfigs.dev` - Configuration dev

**Exemple** (`.localConfigs.playground`) :
```bash
CLIENT_ID=
CLIENT_SECRET=
AZURE_OPENAI_API_KEY=EtHVdlZJg3xA47vWHYcqZ4wwadBKdWs507cOEJJ4WXCNR1ddZfVqJQQJ99BAACREanaXJ3w3AAAAACOGCWSF
AZURE_OPENAI_ENDPOINT=https://heon-m6j4rhmt-canadaeast.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1
TEAMSFX_NOTIFICATION_STORE_FILENAME=.notification.playgroundstore.json
SAAS_DEBUG_MODE=true
SAAS_PERMISSIVE_MODE=true
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB
MARKETPLACE_METERING_ENABLED=true
```

**Caractéristiques** :
- ❌ **NON commité dans Git** (dans `.gitignore`)
- 🔧 Généré automatiquement lors du déploiement
- 🚀 Chargé par l'application au runtime via `dotenv`

---

## Flux Complet d'Exécution

### Commande de démarrage
```bash
# Démarre l'agent dans le Playground
npm run dev:teamsfx:testtool
```

### Ce qui se passe en coulisses

1. **Lecture de l'environnement**
   ```
   TEAMSFX_ENV=playground (défini dans package.json ou .env.playground)
   ```

2. **Chargement de la configuration**
   ```
   env/.env.playground → m365agents.playground.yml
   ```

3. **Action : createOrUpdateEnvironmentFile**
   ```yaml
   - uses: file/createOrUpdateEnvironmentFile
     with:
       target: ./.localConfigs.playground
       envs:
         SAAS_DEBUG_MODE: ${{SAAS_DEBUG_MODE}}
         # ... autres variables
   ```

4. **Génération du fichier runtime**
   ```
   .localConfigs.playground est créé/mis à jour
   ```

5. **Chargement par l'application**
   ```javascript
   // src/index.js
   const path = require('path');
   const ENV_FILE = path.join(__dirname, '..', '.localConfigs');
   require('dotenv').config({ path: ENV_FILE });
   
   // src/config.js
   const config = {
     marketplace: {
       enabled: process.env.MARKETPLACE_METERING_ENABLED === 'true'
     }
   };
   ```

---

## Cas d'Usage Pratique

### Ajouter une nouvelle variable de configuration

**Étape 1** : Ajouter dans `env/.env.playground`
```bash
# Nouvelle fonctionnalité
ENABLE_NEW_FEATURE=true
NEW_FEATURE_TIMEOUT=5000
```

**Étape 2** : Ajouter dans `m365agents.playground.yml`
```yaml
envs:
  # ... variables existantes ...
  ENABLE_NEW_FEATURE: ${{ENABLE_NEW_FEATURE}}
  NEW_FEATURE_TIMEOUT: ${{NEW_FEATURE_TIMEOUT}}
```

**Étape 3** : Utiliser dans `src/config.js`
```javascript
const config = {
  newFeature: {
    enabled: process.env.ENABLE_NEW_FEATURE === 'true',
    timeout: parseInt(process.env.NEW_FEATURE_TIMEOUT) || 5000
  }
};
```

**Étape 4** : Redémarrer l'application
```bash
# Le déploiement va régénérer .localConfigs.playground
npm run dev:teamsfx:testtool
```

---

## Secrets vs Variables Publiques

### Variables Publiques (commitées)
✅ Endpoints (URLs)
✅ Noms de ressources
✅ Feature flags (booléens)
✅ Timeouts, limites
✅ Noms de plans

**Localisation** : `env/.env.{environment}`

### Secrets (NON commitées)
❌ API Keys
❌ Passwords
❌ Connection strings avec credentials
❌ Client Secrets
❌ Tokens

**Localisation** : `.env.{environment}.user` ou Azure Key Vault

**Injection via SECRET prefix** :
```yaml
envs:
  AZURE_OPENAI_API_KEY: ${{SECRET_AZURE_OPENAI_API_KEY}}
```

---

## Avantages de cette Architecture

### 1. Séparation des Préoccupations
```
Développeur    → Modifie env/.env.playground
DevOps         → Configure les secrets dans Azure Key Vault
Application    → Lit .localConfigs.playground (généré)
```

### 2. Environnements Multiples
```
Local      → .env.local       → .localConfigs
Playground → .env.playground  → .localConfigs.playground
Dev        → .env.dev         → .localConfigs.dev
Prod       → .env.prod        → .localConfigs.prod
```

### 3. Sécurité
- Secrets jamais commitées dans Git
- Variables publiques versionnées
- Injection contrôlée via YAML

### 4. Traçabilité
- Changements dans `env/.env.*` → Visible dans Git
- Changements dans `m365agents.*.yml` → Auditable
- `.localConfigs.*` → Généré automatiquement, pas de conflits

---

## Dépannage

### Variable non définie au runtime

**Vérifier 1** : La variable existe dans `env/.env.playground` ?
```bash
grep MARKETPLACE_METERING_ENABLED env/.env.playground
```

**Vérifier 2** : La variable est injectée dans `m365agents.playground.yml` ?
```yaml
envs:
  MARKETPLACE_METERING_ENABLED: ${{MARKETPLACE_METERING_ENABLED}}
```

**Vérifier 3** : Le fichier `.localConfigs.playground` a été régénéré ?
```bash
cat .localConfigs.playground | grep MARKETPLACE_METERING_ENABLED
```

**Solution** : Redémarrer l'application pour forcer la régénération
```bash
npm run dev:teamsfx:testtool
```

### Variable avec mauvaise valeur

**Priorité de chargement** :
1. `.env.{environment}.user` (secrets locaux, priorité haute)
2. `env/.env.{environment}` (valeurs par défaut)
3. Variables d'environnement système

**Vérifier** :
```bash
# Voir la valeur finale dans .localConfigs
cat .localConfigs.playground | grep MA_VARIABLE

# Voir la valeur source dans env
cat env/.env.playground | grep MA_VARIABLE
```

---

## Résumé des Fichiers

| Fichier | Commité Git | Rôle | Édition |
|---------|-------------|------|---------|
| `env/.env.*` | ✅ Oui | Valeurs par défaut | Manuelle |
| `m365agents.*.yml` | ✅ Oui | Définition injection | Manuelle |
| `.env.*.user` | ❌ Non | Secrets locaux | Manuelle |
| `.localConfigs.*` | ❌ Non | Runtime final | Automatique |

---

## Commandes Utiles

```bash
# Voir toutes les variables d'environnement disponibles
cat env/.env.playground

# Voir les variables injectées au runtime
cat .localConfigs.playground

# Forcer la régénération de .localConfigs
rm .localConfigs.playground
npm run dev:teamsfx:testtool

# Vérifier une variable spécifique
grep -r "MARKETPLACE_METERING_ENABLED" env/ m365agents.* .localConfigs*
```

---

## Exemple Complet : Configuration Marketplace

### 1. Définir dans `env/.env.playground`
```bash
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_METERING_TENANT_ID=your-tenant-id
```

### 2. Injecter dans `m365agents.playground.yml`
```yaml
envs:
  MARKETPLACE_METERING_ENABLED: ${{MARKETPLACE_METERING_ENABLED}}
  MARKETPLACE_METERING_TENANT_ID: ${{MARKETPLACE_METERING_TENANT_ID}}
  MARKETPLACE_METERING_CLIENT_SECRET: ${{SECRET_MARKETPLACE_CLIENT_SECRET}}
```

### 3. Résultat dans `.localConfigs.playground`
```bash
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_METERING_TENANT_ID=your-tenant-id
MARKETPLACE_METERING_CLIENT_SECRET=actual-secret-value
```

### 4. Utilisation dans `src/config.js`
```javascript
marketplace: {
  enabled: process.env.MARKETPLACE_METERING_ENABLED === 'true',
  tenantId: process.env.MARKETPLACE_METERING_TENANT_ID,
  clientSecret: process.env.MARKETPLACE_METERING_CLIENT_SECRET
}
```

---

## Documentation Associée

- [Microsoft 365 Agents Toolkit - Environment Variables](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teamsfx-multi-env)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Azure Key Vault Integration](https://learn.microsoft.com/en-us/azure/key-vault/)
