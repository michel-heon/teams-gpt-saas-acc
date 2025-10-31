# Configuration SaaS Accelerator - Phase 2.4

## Vue d'ensemble

Cette documentation décrit la configuration nécessaire pour l'intégration entre l'agent Teams GPT et le SaaS Accelerator Microsoft. L'intégration utilise **Azure AD Managed Identity** pour l'authentification à la base de données Azure SQL, ce qui élimine le besoin de stocker des mots de passe dans les fichiers de configuration.

## Architecture d'authentification

### Managed Identity vs SQL Authentication

Le SaaS Accelerator utilise **Azure AD Managed Identity** pour l'authentification à la base de données. Cette approche présente plusieurs avantages :

- ✅ **Aucun mot de passe à gérer** : Les identités managées sont gérées automatiquement par Azure
- ✅ **Sécurité renforcée** : Pas de credentials stockés dans le code ou les fichiers de configuration
- ✅ **Rotation automatique** : Les tokens d'authentification sont renouvelés automatiquement
- ✅ **Audit simplifié** : Traçabilité des accès via Azure AD

### Comment ça fonctionne

1. L'application s'exécute dans Azure (App Service, Azure Functions, etc.)
2. Azure assigne automatiquement une Managed Identity à l'application
3. Cette identité est ajoutée à la base de données SQL via la commande SQL :
   ```sql
   CREATE USER [nom-app-service] FROM EXTERNAL PROVIDER
   ```
4. L'application se connecte avec le connection string :
   ```
   Server=tcp:<server>;Database=<db>;TrustServerCertificate=True;Authentication=Active Directory Default;
   ```

## Variables d'environnement

### Configuration de base

```bash
# Serveur et base de données
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB

# Authentification Managed Identity (recommandé pour production)
SAAS_DB_USE_MANAGED_IDENTITY=true

# Authentification SQL (fallback pour développement local)
# Si SAAS_DB_USE_MANAGED_IDENTITY=false, ces variables sont nécessaires :
SAAS_DB_USER=
SAAS_DB_PASSWORD=
```

### Ressources Azure SaaS Accelerator

```bash
# Groupe de ressources et localisation
SAAS_RESOURCE_GROUP=rg-saasaccel-teams-gpt-02
SAAS_LOCATION=canadacentral

# Applications web
SAAS_PORTAL_NAME=sac-02-portal
SAAS_ADMIN_NAME=sac-02-admin
SAAS_PORTAL_URL=https://sac-02-portal.azurewebsites.net
SAAS_ADMIN_URL=https://sac-02-admin.azurewebsites.net

# Webhook pour les notifications d'abonnement
SAAS_WEBHOOK_URL=https://sac-02-portal.azurewebsites.net/api/AzureWebhook

# Azure AD
SAAS_TENANT_ID=aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2
SAAS_APP_ID=d3b2710f-1be9-4f89-8834-6273619bd838
SAAS_SUBSCRIPTION_ID=0f1323ea-0f29-4fd4-9ae5-0a45d7efc9d2

# Contact administrateur
SAAS_ADMIN_EMAIL=heon@cotechnoe.net
```

### Dimensions métrées (Partner Center)

```bash
# IDs des dimensions (doivent correspondre aux IDs dans Partner Center)
SAAS_DIMENSION_FREE=free
SAAS_DIMENSION_PRO=pro
SAAS_DIMENSION_PRO_PLUS=pro-plus
```

### Limites mensuelles de messages

```bash
# Nombre de messages inclus par mois pour chaque plan
SAAS_LIMIT_FREE=50
SAAS_LIMIT_PRO=300
SAAS_LIMIT_PRO_PLUS=1500
```

### Coûts par message

```bash
# Coût unitaire par message (pour affichage uniquement)
SAAS_COST_FREE=0.02
SAAS_COST_PRO=0.015
SAAS_COST_PRO_PLUS=0.01
```

### Plans d'abonnement

```bash
# IDs des plans (doivent correspondre aux IDs dans Partner Center)
SAAS_PLAN_DEVELOPMENT=development
SAAS_PLAN_STARTER=starter
SAAS_PLAN_PROFESSIONAL=professional
SAAS_PLAN_PRO_PLUS=pro-plus
```

### Feature Flags

```bash
# Activer le logging détaillé des messages dans TeamsMessageLogs
SAAS_ENABLE_MESSAGE_LOGS=false

# Mode debug : logs verbeux dans la console
SAAS_DEBUG_MODE=true

# Mode permissif : l'application continue même si la DB est indisponible
SAAS_PERMISSIVE_MODE=true

# Activer la vérification d'abonnement (false pour dev, true pour prod)
SAAS_ENABLE_SUBSCRIPTION_CHECK=false

# Activer le tracking d'usage vers MeteredAuditLogs
SAAS_ENABLE_USAGE_TRACKING=false

# Bloquer l'utilisation si pas d'abonnement (false pour dev, true pour prod)
SAAS_BLOCK_NO_SUBSCRIPTION=false
```

## Schéma de la base de données

### Table `Subscriptions`

Colonnes principales utilisées par l'intégration Teams :

| Colonne | Type | Description |
|---------|------|-------------|
| `Id` | int | ID interne de l'abonnement |
| `AMPSubscriptionId` | uniqueidentifier | GUID de l'abonnement Azure Marketplace |
| `AMPPlanId` | varchar(100) | ID du plan (doit correspondre aux SAAS_PLAN_*) |
| `AMPQuantity` | int | Quantité d'unités achetées |
| `SubscriptionStatus` | varchar(50) | Statut : `Subscribed`, `PendingActivation`, `Unsubscribed`, etc. |
| `IsActive` | bit | Indicateur d'activation |
| `TeamsUserId` | nvarchar(255) | ID utilisateur Teams (format: `29:...`) |
| `TeamsConversationId` | nvarchar(255) | ID conversation Teams (format: `19:...`) |
| `TenantId` | nvarchar(255) | ID du tenant Azure AD |
| `Name` | varchar(100) | Nom de l'abonnement |
| `CreateDate` | datetime | Date de création |
| `ModifyDate` | datetime | Date de dernière modification |

### Table `MeteredAuditLogs`

Logs d'utilisation pour la facturation métrée :

| Colonne | Type | Description |
|---------|------|-------------|
| `SubscriptionId` | uniqueidentifier | ID de l'abonnement |
| `RequestJson` | nvarchar(MAX) | JSON avec détails de l'usage |
| `StatusCode` | nvarchar(50) | Code de statut (200 = succès) |
| `CreatedDate` | datetime2 | Timestamp de l'événement |

Format du `RequestJson` :
```json
{
  "dimension": "pro",
  "quantity": 1,
  "effectiveStartTime": "2025-10-31T10:00:00Z",
  "teamsUserIdHash": "a1b2c3d4...",
  "messageLength": 150,
  "hasAttachments": false,
  "tokenCount": 250,
  "conversationType": "1:1",
  "timestamp": "2025-10-31T10:00:00Z"
}
```

### Table `TeamsMessageLogs` (optionnelle)

Logs détaillés des messages Teams (activée par `SAAS_ENABLE_MESSAGE_LOGS=true`) :

| Colonne | Type | Description |
|---------|------|-------------|
| `SubscriptionId` | int | ID de l'abonnement |
| `TeamsUserId` | nvarchar(255) | ID utilisateur Teams |
| `MessageText` | nvarchar(MAX) | Contenu du message (anonymisé si nécessaire) |
| `TokenCount` | int | Nombre de tokens utilisés |
| `Dimension` | varchar(50) | Dimension de facturation |
| `Timestamp` | datetime2 | Horodatage |

### Procédure stockée `sp_LinkTeamsUserToSubscription`

Lie un utilisateur Teams à un abonnement existant.

**Paramètres** :
- `@AmpSubscriptionId` (uniqueidentifier) : GUID de l'abonnement
- `@TeamsUserId` (nvarchar(255)) : ID utilisateur Teams
- `@TenantId` (nvarchar(255)) : ID tenant Azure AD
- `@ConversationId` (nvarchar(255)) : ID conversation Teams

**Comportement** :
1. Vérifie que l'abonnement existe
2. Met à jour les colonnes `TeamsUserId`, `TenantId`, `TeamsConversationId`
3. Lance une erreur si l'abonnement n'existe pas

**Exemple d'utilisation** :
```sql
EXEC sp_LinkTeamsUserToSubscription 
  @AmpSubscriptionId = 'FC4A0055-D1D7-464B-C64E-8E862AD4C1B1',
  @TeamsUserId = '29:1234567890abcdef',
  @TenantId = 'aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2',
  @ConversationId = '19:meeting_MjdhNjM4YzUtYzExZi00OTQ3LTkzMzQtOTU2YmE3MDI3YzE3@thread.v2'
```

## Utilisation du service `saasIntegration.js`

### Initialisation

```javascript
const saasIntegration = require('./services/saasIntegration');

// L'initialisation est automatique lors du premier appel
await saasIntegration.initialize();
```

### Tester la connexion

```javascript
const result = await saasIntegration.testConnection();

if (result.success) {
  console.log(`Connected as: ${result.currentUser}`);
  console.log(`Auth method: ${result.authMethod}`);
} else {
  console.error(`Connection failed: ${result.error}`);
}
```

### Récupérer l'abonnement d'un utilisateur

```javascript
const subscription = await saasIntegration.getActiveSubscription(
  '29:user-id-from-teams',
  'tenant-id-from-azure-ad'
);

if (subscription) {
  console.log(`Plan: ${subscription.AMPPlanId}`);
  console.log(`Status: ${subscription.SubscriptionStatus}`);
} else {
  console.log('No active subscription found');
}
```

### Lier un utilisateur Teams à un abonnement

```javascript
const result = await saasIntegration.testLinkTeamsUser(
  'FC4A0055-D1D7-464B-C64E-8E862AD4C1B1', // AMP Subscription ID
  '29:user-id-from-teams',
  '19:conversation-id-from-teams',
  'tenant-id-from-azure-ad'
);

if (result.success) {
  console.log('User linked successfully');
}
```

### Enregistrer l'usage d'un message

```javascript
await saasIntegration.trackMessageUsage(subscription, {
  dimension: 'pro',
  teamsUserId: '29:user-id',
  messageLength: 150,
  hasAttachments: false,
  tokenCount: 250,
  conversationType: '1:1',
  timestamp: new Date()
});
```

## Tests

Trois scripts de test sont disponibles :

### 1. Test de connexion et procédure stockée

```bash
node src/tests/test-saas-connection.js
```

Vérifie :
- ✅ Connexion à Azure SQL avec Managed Identity
- ✅ Exécution de la procédure `sp_LinkTeamsUserToSubscription`
- ✅ Requête pour récupérer un abonnement

### 2. Interrogation du schéma

```bash
node src/tests/query-schema.js
```

Affiche :
- Structure de la table `Subscriptions`
- Paramètres de la procédure `sp_LinkTeamsUserToSubscription`

### 3. Liste des abonnements

```bash
node src/tests/list-subscriptions.js
```

Affiche :
- Les 10 derniers abonnements créés
- Leurs statuts et informations principales

## Déploiement

### Prérequis Azure

Pour que l'authentification Managed Identity fonctionne :

1. **Créer une Managed Identity** pour votre App Service :
   ```bash
   az webapp identity assign --name <app-name> --resource-group <rg-name>
   ```

2. **Ajouter l'identité à la base de données** :
   ```sql
   CREATE USER [<app-name>] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_datareader ADD MEMBER [<app-name>];
   ALTER ROLE db_datawriter ADD MEMBER [<app-name>];
   GRANT EXECUTE TO [<app-name>];
   ```

3. **Configurer l'App Service** :
   - Définir `SAAS_DB_USE_MANAGED_IDENTITY=true` dans les App Settings

### Développement local

Pour le développement local sans Managed Identity :

1. Installer Azure CLI : `az login`
2. S'authentifier : `az login`
3. Vérifier l'accès : `az account show`
4. L'authentification `Active Directory Default` utilisera automatiquement votre identité Azure CLI

**Alternative** : Utiliser SQL Authentication (non recommandé pour la production)
```bash
SAAS_DB_USE_MANAGED_IDENTITY=false
SAAS_DB_USER=mon-utilisateur-sql
SAAS_DB_PASSWORD=mon-mot-de-passe-secret
```

## Sécurité

### Bonnes pratiques

- ✅ Utiliser **Managed Identity** en production (jamais de mots de passe)
- ✅ Activer `SAAS_ENABLE_MESSAGE_LOGS=false` en production (RGPD)
- ✅ Passer `SAAS_PERMISSIVE_MODE=false` en production
- ✅ Activer les vérifications : `SAAS_ENABLE_SUBSCRIPTION_CHECK=true`
- ✅ Bloquer les utilisateurs sans abonnement : `SAAS_BLOCK_NO_SUBSCRIPTION=true`
- ✅ Ne jamais committer les fichiers `.env.*.user`

### Anonymisation

Le service hache les IDs utilisateurs avant de les stocker dans `MeteredAuditLogs` :

```javascript
// Fonction interne de hashage (SHA256, 16 premiers caractères)
hashUserId(userId) {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(userId)
    .digest('hex')
    .substring(0, 16);
}
```

## Troubleshooting

### Erreur : "Database connection not initialized"

**Cause** : La connexion à la base de données a échoué

**Solution** :
1. Vérifier que `SAAS_DB_SERVER` et `SAAS_DB_NAME` sont corrects
2. Vérifier que l'App Service a une Managed Identity assignée
3. Vérifier que l'identité est ajoutée à la base de données SQL
4. Consulter les logs : `SAAS_DEBUG_MODE=true`

### Erreur : "Login failed for user 'NT AUTHORITY\\ANONYMOUS LOGON'"

**Cause** : Managed Identity non configurée ou permissions insuffisantes

**Solution** :
```bash
# 1. Vérifier l'identité
az webapp identity show --name <app-name> --resource-group <rg-name>

# 2. Re-créer l'utilisateur dans SQL
CREATE USER [<app-name>] FROM EXTERNAL PROVIDER;
GRANT EXECUTE TO [<app-name>];
```

### Erreur : "Invalid column name 'PlanId'"

**Cause** : Le code utilise des noms de colonnes incorrects

**Solution** : Les colonnes correctes sont préfixées par `AMP` :
- ✅ `AMPPlanId` (pas `PlanId`)
- ✅ `AMPQuantity` (pas `Quantity`)
- ✅ `AMPSubscriptionId` (pas `AmpSubscriptionId`)

### Abonnement non trouvé

**Cause** : L'utilisateur Teams n'est pas lié à un abonnement

**Solution** :
1. Vérifier qu'un abonnement existe : `node src/tests/list-subscriptions.js`
2. Lier l'utilisateur : Appeler `sp_LinkTeamsUserToSubscription`
3. Vérifier le statut : `SubscriptionStatus = 'Subscribed'` et `IsActive = 1`

## Références

- [Commercial Marketplace SaaS Accelerator](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator)
- [Azure AD Managed Identity](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/)
- [Azure SQL avec Managed Identity](https://learn.microsoft.com/azure/azure-sql/database/authentication-aad-configure)
- [mssql Node.js driver](https://www.npmjs.com/package/mssql)

---

**Version** : Phase 2.4 (v1.2.4)  
**Date** : 31 octobre 2025  
**Auteur** : GitHub Copilot
