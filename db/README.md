# Guide des Migrations de Base de Données

Ce dossier contient les scripts de migration SQL pour étendre le schéma de la base de données SaaS Accelerator afin de supporter l'intégration Teams GPT.

## 📁 Structure

```
db/
├── README.md                                    # Ce fichier
└── migrations/
    ├── 002-teams-integration.sql                # Script de migration Phase 2.3
    └── 002-teams-integration-test.sql           # Script de validation
```

## 🎯 Objectif des migrations

Les migrations étendent le modèle de données SaaS Accelerator (version 8.2.1+) pour :

1. **Relier les abonnements Marketplace aux utilisateurs Teams**
   - Ajout de colonnes : `TeamsUserId`, `TeamsConversationId`, `TenantId`

2. **Tracker l'usage détaillé (optionnel)**
   - Table `TeamsMessageLogs` pour audit et analytics

3. **Optimiser les performances**
   - Index sur `TeamsUserId` et `TenantId`

4. **Faciliter l'administration**
   - Vue `vw_SubscriptionUsageStats` pour analytics
   - Procédure `sp_LinkTeamsUserToSubscription` pour liaison manuelle

## 📊 Base de données cible

**Serveur Azure SQL :**
- **Serveur** : `sac-02-sql.database.windows.net`
- **Database** : `sac-02AMPSaaSDB`
- **Édition** : Standard S0 (250 GB)
- **Authentification** : Azure AD Only
- **Resource Group** : `rg-saasaccel-teams-gpt-02`
- **Localisation** : Canada Central

## 🔐 Prérequis

### 1. Authentification Azure

Vous devez être authentifié avec Azure CLI :

```bash
# Se connecter à Azure
az login

# Sélectionner la subscription
az account set --subscription 0f1323ea-0f29-4187-9872-e1cf15d677de

# Vérifier la connexion
az account show
```

### 2. Permissions base de données

Permissions requises pour exécuter les migrations :
- `db_owner` (recommandé) ✅
- Ou permissions spécifiques :
  - `ALTER TABLE`
  - `CREATE TABLE`
  - `CREATE INDEX`
  - `CREATE VIEW`
  - `CREATE PROCEDURE`

### 3. Règle firewall

Votre IP doit être autorisée sur le serveur SQL :

```bash
# Ajouter votre IP au firewall
az sql server firewall-rule create \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --name "Dev-IP-$(date +%Y%m%d)" \
  --start-ip-address $(curl -s ifconfig.me) \
  --end-ip-address $(curl -s ifconfig.me)

# Vérifier les règles existantes
az sql server firewall-rule list \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --output table
```

### 4. Outils de connexion

**Option A : Azure Data Studio (recommandé)**
- Télécharger : https://aka.ms/azuredatastudio
- Authentification : Azure Active Directory

**Option B : Azure Portal Query Editor**
- URL : https://portal.azure.com → SQL Database → Query Editor
- Authentification automatique

**Option C : sqlcmd (CLI)**
```bash
# Installer sqlcmd (si nécessaire)
sudo apt-get install mssql-tools unixodbc-dev  # Linux
brew install sqlcmd                             # macOS

# Se connecter
sqlcmd -S sac-02-sql.database.windows.net \
       -d sac-02AMPSaaSDB \
       -G \
       -U heon@cotechnoe.net
```

## 🚀 Exécution des migrations

### Étape 1 : Backup de la base de données (OBLIGATOIRE)

**⚠️ TOUJOURS créer un backup avant toute migration !**

```bash
# Créer une copie de la base de données
az sql db copy \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --name sac-02AMPSaaSDB \
  --dest-name sac-02AMPSaaSDB-backup-$(date +%Y%m%d-%H%M%S) \
  --dest-server sac-02-sql

# Vérifier que la copie existe
az sql db list \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --output table
```

### Étape 2 : Exécuter le script de migration

#### Option A : Azure Data Studio

1. Ouvrir Azure Data Studio
2. Se connecter au serveur :
   - Server : `sac-02-sql.database.windows.net`
   - Authentication : `Azure Active Directory - Universal with MFA`
   - Database : `sac-02AMPSaaSDB`
3. Ouvrir le fichier `db/migrations/002-teams-integration.sql`
4. Vérifier la première ligne : `USE [sac-02AMPSaaSDB];`
5. Exécuter le script (F5 ou bouton "Run")
6. Vérifier les messages dans l'output :
   ```
   ✓ Colonne TeamsUserId ajoutée
   ✓ Colonne TeamsConversationId ajoutée
   ✓ Colonne TenantId ajoutée
   ✓ Index IX_Subscriptions_TeamsUserId créé
   ...
   Migration Phase 2.3 TERMINÉE
   ```

#### Option B : Azure Portal Query Editor

1. Ouvrir https://portal.azure.com
2. Naviguer vers : SQL databases → sac-02AMPSaaSDB → Query editor
3. S'authentifier avec Azure AD
4. Copier-coller le contenu de `002-teams-integration.sql`
5. Cliquer sur "Run"
6. Vérifier les résultats dans les messages

#### Option C : sqlcmd (CLI)

```bash
# Se positionner dans le dossier du projet
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc

# Exécuter le script
sqlcmd -S sac-02-sql.database.windows.net \
       -d sac-02AMPSaaSDB \
       -G \
       -U heon@cotechnoe.net \
       -i db/migrations/002-teams-integration.sql \
       -o db/migrations/002-teams-integration.log

# Vérifier les logs
cat db/migrations/002-teams-integration.log
```

### Étape 3 : Valider la migration avec le script de test

```bash
# Avec sqlcmd
sqlcmd -S sac-02-sql.database.windows.net \
       -d sac-02AMPSaaSDB \
       -G \
       -U heon@cotechnoe.net \
       -i db/migrations/002-teams-integration-test.sql \
       -o db/migrations/002-teams-integration-test.log

# Vérifier les résultats
cat db/migrations/002-teams-integration-test.log | grep -E "(PASSED|FAILED|RÉSUMÉ)"
```

**Résultat attendu :**
```
✓ PASSED : 3 colonnes Teams présentes dans Subscriptions
✓ PASSED : Types NVARCHAR(255) NULL corrects
✓ PASSED : 2 index Teams présents
✓ PASSED : Colonnes essentielles présentes (6/6)
✓ PASSED : Vue vw_SubscriptionUsageStats créée
✓ PASSED : Procédure sp_LinkTeamsUserToSubscription créée
✓ PASSED : Procédure sp_LinkTeamsUserToSubscription fonctionne
✓ PASSED : Version 8.30 enregistrée dans DatabaseVersionHistory

========================================================================
✓✓✓ TOUS LES TESTS SONT PASSÉS ✓✓✓
========================================================================
```

## 📋 Détail des modifications

### Migration 002-teams-integration.sql

#### 1. Extensions table `Subscriptions`

Ajoute 3 colonnes pour lier abonnements Marketplace ↔ utilisateurs Teams :

| Colonne | Type | Description |
|---------|------|-------------|
| `TeamsUserId` | NVARCHAR(255) NULL | ID utilisateur Teams (from.aadObjectId) |
| `TeamsConversationId` | NVARCHAR(255) NULL | ID conversation Teams (optionnel) |
| `TenantId` | NVARCHAR(255) NULL | ID tenant Azure AD |

**Compatibilité :** Colonnes NULL, aucun impact sur abonnements existants ✅

#### 2. Index de performance

- `IX_Subscriptions_TeamsUserId` : Optimise recherche par utilisateur Teams
- `IX_Subscriptions_TenantId` : Permet liste abonnements par tenant

**Performance attendue :** Recherche O(log n) au lieu de O(n)

#### 3. Table `TeamsMessageLogs` (optionnelle)

Audit détaillé des messages (métadonnées uniquement pour RGPD) :

| Colonne | Type | Description |
|---------|------|-------------|
| `Id` | BIGINT IDENTITY | Primary Key |
| `SubscriptionId` | UNIQUEIDENTIFIER | FK → Subscriptions |
| `TeamsUserId` | NVARCHAR(255) | Utilisateur Teams |
| `ConversationId` | NVARCHAR(255) | ID conversation |
| `MessageText` | NVARCHAR(MAX) NULL | ⚠️ NULL pour privacy |
| `ResponseText` | NVARCHAR(MAX) NULL | ⚠️ NULL pour privacy |
| `TokenCount` | INT | Tokens consommés |
| `Dimension` | NVARCHAR(50) | free/pro/pro-plus |
| `Timestamp` | DATETIME2 | Date/heure UTC |
| `ProcessingTimeMs` | INT | Temps traitement |
| `ConversationType` | NVARCHAR(20) | 1:1 ou group |
| `HasAttachments` | BIT | Présence pièces jointes |
| `MessageLength` | INT | Longueur message |

**Index :**
- `IX_TeamsMessageLogs_SubscriptionId_Timestamp`
- `IX_TeamsMessageLogs_TeamsUserId_Timestamp`

#### 4. Vue `vw_SubscriptionUsageStats`

Vue analytique agrégée par abonnement (mois en cours) :

```sql
SELECT * FROM vw_SubscriptionUsageStats
WHERE SubscriptionStatus = 'Subscribed'
ORDER BY TotalMessages DESC;
```

Colonnes retournées :
- `SubscriptionId`, `AmpSubscriptionId`, `SubscriptionName`
- `PlanId`, `SubscriptionStatus`, `TeamsUserId`
- `TotalMessages`, `FreeMessages`, `ProMessages`, `ProPlusMessages`
- `LastMessageDate`

#### 5. Procédure `sp_LinkTeamsUserToSubscription`

Liaison manuelle utilisateur Teams ↔ abonnement Marketplace :

```sql
EXEC sp_LinkTeamsUserToSubscription
    @AmpSubscriptionId = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
    @TeamsUserId = '29:1AbCdEfGhIjKlMnOpQrStUvWxYz',
    @TenantId = 'aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2',
    @ConversationId = '19:meeting_XXXXX@thread.v2';  -- Optionnel
```

Retour :
```
RowsAffected | AmpSubscriptionId | TeamsUserId | TenantId | Status
-------------|-------------------|-------------|----------|--------
1            | GUID              | 29:xxx      | tenant   | SUCCESS
```

## ✅ Validation post-migration

### 1. Vérifier les colonnes ajoutées

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Subscriptions'
AND COLUMN_NAME IN ('TeamsUserId', 'TeamsConversationId', 'TenantId');
```

### 2. Vérifier les index créés

```sql
SELECT name, type_desc, is_unique
FROM sys.indexes
WHERE object_id = OBJECT_ID('Subscriptions')
AND name LIKE 'IX_%Teams%';
```

### 3. Tester la procédure de liaison

```sql
-- Récupérer un abonnement existant
SELECT TOP 1 AmpsubscriptionId, Name, SubscriptionStatus
FROM Subscriptions
WHERE SubscriptionStatus = 'Subscribed';

-- Lier à un utilisateur test
EXEC sp_LinkTeamsUserToSubscription
    @AmpSubscriptionId = '<GUID-from-query>',
    @TeamsUserId = '29:test-user-123',
    @TenantId = 'test-tenant-id';

-- Vérifier la liaison
SELECT AmpsubscriptionId, Name, TeamsUserId, TenantId
FROM Subscriptions
WHERE TeamsUserId = '29:test-user-123';
```

### 4. Vérifier la vue d'analytics

```sql
SELECT TOP 10 * FROM vw_SubscriptionUsageStats
ORDER BY TotalMessages DESC;
```

## 🔄 Rollback (en cas de problème)

Si la migration échoue ou cause des problèmes :

### Option 1 : Restaurer le backup

```bash
# Supprimer la DB problématique
az sql db delete \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --name sac-02AMPSaaSDB \
  --yes

# Copier le backup vers le nom original
az sql db copy \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --name sac-02AMPSaaSDB-backup-YYYYMMDD-HHMMSS \
  --dest-name sac-02AMPSaaSDB \
  --dest-server sac-02-sql
```

### Option 2 : Rollback manuel (si backup pas disponible)

```sql
-- Supprimer les objets créés (ordre inverse de création)
DROP PROCEDURE IF EXISTS [dbo].[sp_LinkTeamsUserToSubscription];
DROP VIEW IF EXISTS [dbo].[vw_SubscriptionUsageStats];
DROP TABLE IF EXISTS [dbo].[TeamsMessageLogs];
DROP INDEX IF EXISTS [IX_Subscriptions_TenantId] ON [dbo].[Subscriptions];
DROP INDEX IF EXISTS [IX_Subscriptions_TeamsUserId] ON [dbo].[Subscriptions];

-- Supprimer les colonnes (⚠️ PERTE DE DONNÉES si déjà remplies)
ALTER TABLE [dbo].[Subscriptions] DROP COLUMN [TenantId];
ALTER TABLE [dbo].[Subscriptions] DROP COLUMN [TeamsConversationId];
ALTER TABLE [dbo].[Subscriptions] DROP COLUMN [TeamsUserId];

-- Supprimer l'entrée version
DELETE FROM [dbo].[DatabaseVersionHistory] WHERE VersionNumber = 8.30;
```

## 🔒 Sécurité et RGPD

### Données personnelles

La migration respecte le RGPD :

✅ **Colonnes `MessageText` et `ResponseText` sont NULL par défaut**
- Pas de stockage du contenu des messages
- Uniquement métadonnées (longueur, dimension, timestamp)

✅ **Possibilité d'activer le stockage plus tard avec consentement**

### Droit à l'effacement

Pour supprimer les données d'un utilisateur (RGPD) :

```sql
-- Supprimer les logs d'un utilisateur
DELETE FROM TeamsMessageLogs WHERE TeamsUserId = '29:xxx';

-- Anonymiser l'abonnement
UPDATE Subscriptions 
SET TeamsUserId = NULL, 
    TeamsConversationId = NULL,
    TenantId = NULL
WHERE TeamsUserId = '29:xxx';
```

### Politique de rétention (à implémenter)

```sql
-- Nettoyage automatique logs > 90 jours
DELETE FROM TeamsMessageLogs
WHERE Timestamp < DATEADD(DAY, -90, GETUTCDATE());
```

## 📚 Références

### Documentation interne

- [Plan détaillé Phase 2.3](../doc/architecture/PHASE-2.3-PLAN.md)
- [Architecture Phase 2](../doc/architecture/phase2-teams-integration.md)
- [Configuration Azure SQL](../tests/AZURE-SQL-CONFIG.md)

### Documentation SaaS Accelerator

- [GitHub Repository](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator)
- [Installation Instructions](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator/blob/main/docs/Installation-Instructions.md)
- [Database Migrations](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator/blob/main/src/DataAccess/readme.md)

### Documentation Azure SQL

- [ALTER TABLE](https://learn.microsoft.com/sql/t-sql/statements/alter-table-transact-sql)
- [CREATE INDEX](https://learn.microsoft.com/sql/t-sql/statements/create-index-transact-sql)
- [Performance Best Practices](https://learn.microsoft.com/azure/azure-sql/database/performance-guidance)

## 🆘 Dépannage

### Erreur : "Login failed for user"

**Cause :** Authentification Azure AD non configurée

**Solution :**
```bash
az login
az account set --subscription 0f1323ea-0f29-4187-9872-e1cf15d677de
```

### Erreur : "Cannot open server 'sac-02-sql'"

**Cause :** IP non autorisée dans le firewall

**Solution :**
```bash
az sql server firewall-rule create \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --name "MyIP" \
  --start-ip-address $(curl -s ifconfig.me) \
  --end-ip-address $(curl -s ifconfig.me)
```

### Erreur : "Permission denied"

**Cause :** Permissions insuffisantes

**Solution :**
- Vérifier que vous êtes bien `db_owner` de la base
- Ou demander les permissions : `ALTER TABLE`, `CREATE TABLE`, etc.

### Script bloqué / timeout

**Cause :** Locks sur les tables

**Solution :**
```sql
-- Vérifier les locks actifs
SELECT 
    request_session_id,
    resource_type,
    resource_database_id,
    DB_NAME(resource_database_id) AS DatabaseName,
    request_mode,
    request_status
FROM sys.dm_tran_locks
WHERE resource_database_id = DB_ID('sac-02AMPSaaSDB');

-- Si nécessaire, tuer les sessions bloquantes
KILL <session_id>;
```

## 📝 Notes de version

### Version 8.30 (Phase 2.3) - 31 octobre 2025

**Ajouté :**
- Colonnes Teams dans `Subscriptions` (TeamsUserId, TeamsConversationId, TenantId)
- Index de performance sur TeamsUserId et TenantId
- Table `TeamsMessageLogs` pour audit (optionnelle)
- Vue `vw_SubscriptionUsageStats` pour analytics
- Procédure `sp_LinkTeamsUserToSubscription` pour liaison manuelle

**Compatibilité :**
- ✅ Rétrocompatible avec SaaS Accelerator 8.2.1+
- ✅ Aucun impact sur abonnements existants
- ✅ Aucune modification code SaaS Accelerator requise

---

**Dernière mise à jour :** 31 octobre 2025  
**Auteur :** michel-heon  
**Version :** 1.0
