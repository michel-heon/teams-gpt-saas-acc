# 📋 Plan détaillé Phase 2.3 : Extension schéma base de données

**Date :** 31 octobre 2025  
**Phase :** 2.3 - Extension du modèle de données  
**Statut :** 📝 Planification

---

## 🎯 Objectif

Étendre le schéma de la base de données SaaS Accelerator pour supporter l'intégration Teams :
- Relier les abonnements Marketplace aux utilisateurs Teams
- Permettre le tracking détaillé des messages (optionnel)
- Optimiser les requêtes par index
- Créer des vues et procédures stockées pour faciliter l'administration

---

## 📦 Livrables

### 1. Script SQL principal
**Fichier :** `db/migrations/002-teams-integration.sql`

**Contenu :**
- Extensions table `Subscriptions`
- Table `TeamsMessageLogs` (optionnelle)
- Index de performance
- Vue `vw_SubscriptionUsageStats`
- Procédure `sp_LinkTeamsUserToSubscription`

### 2. Documentation
**Fichier :** `db/README.md`

**Contenu :**
- Instructions d'exécution
- Description des modifications
- Guide d'administration

### 3. Scripts de test
**Fichier :** `db/migrations/002-teams-integration-test.sql`

**Contenu :**
- Vérification des modifications
- Insertion de données de test

---

## � État actuel de la base de données

### Informations serveur Azure SQL

**Serveur :** `sac-02-sql.database.windows.net`
- **Nom :** sac-02-sql
- **Localisation :** Canada Central (canadacentral)
- **Version :** SQL Server 12.0
- **État :** Ready ✅
- **Accès réseau public :** Enabled
- **Admin SQL :** CloudSAdd5b00f1

**Base de données :** `sac-02AMPSaaSDB`
- **Nom :** sac-02AMPSaaSDB
- **Statut :** Online ✅
- **Édition :** Standard S0
- **Taille max :** 250 GB (268435456000 bytes)
- **Collation :** SQL_Latin1_General_CP1_CI_AS
- **Date de création :** 30 octobre 2025, 19:46:20 UTC
- **Resource Group :** rg-saasaccel-teams-gpt-02

### Version SaaS Accelerator déployée

**Référentiel :** Azure/Commercial-Marketplace-SaaS-Accelerator
- **Version actuelle :** 8.2.1-6-gc9e5d9e
- **Tag de base :** 8.2.1
- **Commits après tag :** 6 commits
- **Dernier commit :** c9e5d9e
- **Message :** "Fix: Use userPrincipalName instead of displayName for SQL Server admin to handle special characters"
- **Branche :** main

**Fonctionnalités version 8.2.x :**
- ✅ Support des termes de facturation 4 ans et 5 ans
- ✅ Authentification Azure AD Only
- ✅ Migrations Entity Framework automatiques
- ✅ Landing Page, Admin Portal, Customer Portal
- ✅ Webhook pour événements Marketplace

### Schéma actuel de la table `Subscriptions`

**Structure (version SaaS Accelerator 8.2.1) :**

| Colonne | Type | Longueur | Nullable | Description |
|---------|------|----------|----------|-------------|
| `Id` | int | - | NO | Primary Key (IDENTITY) |
| `AmpSubscriptionId` | uniqueidentifier | - | NO | **ID unique Marketplace** (GUID) |
| `AmpOfferId` | nvarchar | max | YES | ID de l'offre Marketplace |
| `AmpplanId` | varchar | 100 | YES | **ID du plan** (ex: teams-gpt-starter) |
| `Ampquantity` | int | - | NO | Quantité souscrite |
| `Name` | varchar | 100 | YES | Nom de l'abonnement |
| `SubscriptionStatus` | varchar | 50 | YES | **Statut** (Subscribed, Suspended, Unsubscribed) |
| `IsActive` | bit | - | YES | Abonnement actif ? |
| `UserId` | int | - | YES | Foreign Key → Users.Id |
| `PurchaserEmail` | varchar | 225 | YES | Email de l'acheteur |
| `PurchaserTenantId` | uniqueidentifier | - | YES | Tenant Azure AD de l'acheteur |
| `CreateBy` | int | - | YES | Créateur (User ID) |
| `CreateDate` | datetime | - | YES | Date de création |
| `ModifyDate` | datetime | - | YES | Date de modification |
| `StartDate` | datetime2 | - | YES | Date de début abonnement |
| `EndDate` | datetime2 | - | YES | Date de fin abonnement |
| `Term` | nvarchar | max | YES | Terme (P1M, P1Y, P4Y, P5Y) |

**Index existants :**
- `PK_Subscriptions` (PRIMARY KEY CLUSTERED) sur `Id`
- `IX_Subscriptions_UserId` (NONCLUSTERED) sur `UserId`

**Relations :**
- Foreign Key : `FK_Subscriptions_Users_UserId` → `Users.Id`
- Référencée par : `MeteredAuditLogs`, `SubscriptionAuditLogs`, `SubscriptionUsageLogs`, `WebJobSubscriptionStatus`

### Tables principales existantes (SaaS Accelerator)

| Table | Rôle | Nb colonnes approx. |
|-------|------|---------------------|
| `Subscriptions` | **Table centrale** - Abonnements Marketplace | 17 |
| `Users` | Utilisateurs ayant accès au portail Admin | 9 |
| `Plans` | Plans tarifaires disponibles pour les offres | 8 |
| `MeteredDimensions` | Dimensions de facturation à l'usage | 7 |
| `MeteredAuditLogs` | Logs des appels API Metering | 10 |
| `SubscriptionAuditLogs` | Historique des événements abonnement | 8 |
| `SubscriptionUsageLogs` | Suivi de l'utilisation par abonnement | 6 |
| `ApplicationConfiguration` | Configuration globale application | 4 |
| `ApplicationLog` | Logs applicatifs généraux | 3 |
| `DatabaseVersionHistory` | Historique migrations DB | 5 |
| `EmailTemplate` | Templates emails transactionnels | 5 |
| `WebJobSubscriptionStatus` | État des webhooks traités | 6 |

**Vues existantes :**
- ❌ Aucune vue personnalisée actuellement

**Procédures stockées existantes :**
- ❌ Aucune procédure personnalisée actuellement

### Authentification

**Mode actuel :** Azure AD Only Authentication ✅

**Implications :**
- Authentification SQL classique (username/password) **désactivée**
- Connexion requiert Azure CLI authentifié : `az login`
- Configuration connection string :
  ```javascript
  authentication: {
      type: 'azure-active-directory-default'
  }
  ```

**Pour exécution des scripts Phase 2.3 :**
```bash
# Se connecter à Azure
az login
az account set --subscription 0f1323ea-0f29-4187-9872-e1cf15d677de

# Ajouter IP au firewall si nécessaire
az sql server firewall-rule create \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --name "Dev-IP-$(date +%Y%m%d)" \
  --start-ip-address $(curl -s ifconfig.me) \
  --end-ip-address $(curl -s ifconfig.me)
```

---

## 🔄 Redéploiement du SaaS Accelerator (si nécessaire)

### Contexte

La Phase 2.3 ajoute **uniquement des colonnes NULL** à la table `Subscriptions` et crée de **nouvelles tables indépendantes** (`TeamsMessageLogs`). Par conséquent :

✅ **AUCUN redéploiement du SaaS Accelerator n'est nécessaire**

Les modifications sont **rétrocompatibles** et n'affectent pas le code existant du SaaS Accelerator.

### Cas où un redéploiement serait requis

Un redéploiement du SaaS Accelerator serait nécessaire **seulement si** :

1. ❌ Modification de colonnes existantes (type, contraintes)
2. ❌ Suppression de colonnes utilisées par le code
3. ❌ Modification de clés primaires ou foreign keys
4. ❌ Changement de la logique métier Landing Page ou Webhook

**Aucun de ces cas ne s'applique à Phase 2.3** ✅

### Validation de compatibilité

**Test de non-régression :**

```bash
# Après exécution du script Phase 2.3, vérifier que le SaaS Accelerator fonctionne toujours

# 1. Vérifier Landing Page
curl https://sac-02-admin.azurewebsites.net/health

# 2. Vérifier Admin Portal
curl https://sac-02-admin.azurewebsites.net/

# 3. Vérifier Webhook Handler
curl https://sac-02-webhook.azurewebsites.net/api/AzureWebhook/ActivatedMessage

# 4. Vérifier abonnements existants intacts
az sql db query \
  --server sac-02-sql \
  --database sac-02AMPSaaSDB \
  --auth-type ADIntegrated \
  -Q "SELECT COUNT(*) AS TotalSubscriptions FROM Subscriptions WHERE SubscriptionStatus = 'Subscribed';"
```

### Si un redéploiement était nécessaire (procédure de référence)

**Étapes pour un redéploiement complet (NON REQUIS pour Phase 2.3) :**

#### Étape 1 : Mise à jour du code source

```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc/Commercial-Marketplace-SaaS-Accelerator

# Fetch latest changes
git fetch origin

# Checkout desired version (exemple: 8.3.0 si disponible)
git checkout tags/8.3.0

# Ou rester sur main pour dernière version
git pull origin main
```

#### Étape 2 : Backup de la base de données (OBLIGATOIRE)

```bash
# Créer une copie de la DB avant modifications
az sql db copy \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --name sac-02AMPSaaSDB \
  --dest-name sac-02AMPSaaSDB-backup-$(date +%Y%m%d-%H%M%S) \
  --dest-server sac-02-sql
```

#### Étape 3 : Exécuter les migrations Entity Framework

```bash
cd Commercial-Marketplace-SaaS-Accelerator/deployment

# Option A : Via script PowerShell (Windows/PowerShell Core)
pwsh -File Deploy.ps1 \
  -WebAppNamePrefix "sac-02" \
  -ResourceGroupForDeployment "rg-saasaccel-teams-gpt-02" \
  -Location "canadacentral" \
  -UpdateExisting

# Option B : Via dotnet CLI (migrations uniquement)
cd ../src/DataAccess
dotnet ef database update \
  --connection "Server=tcp:sac-02-sql.database.windows.net,1433;Database=sac-02AMPSaaSDB;Authentication=Active Directory Default;"
```

#### Étape 4 : Redéployer les Azure App Services

```bash
# Admin Portal
az webapp deployment source sync \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --name sac-02-admin

# Landing Page
az webapp deployment source sync \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --name sac-02-portal

# Webhook Handler
az webapp deployment source sync \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --name sac-02-webhook
```

#### Étape 5 : Vérifier les services

```bash
# Vérifier les logs Azure App Service
az webapp log tail \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --name sac-02-admin

# Tester les endpoints
curl https://sac-02-admin.azurewebsites.net/
curl https://sac-02-portal.azurewebsites.net/
```

#### Étape 6 : Tests de régression

```bash
# Tester un abonnement existant dans Admin Portal
# Tester l'activation d'un nouvel abonnement via Landing Page
# Tester la réception d'un webhook Marketplace
```

### Documentation SaaS Accelerator

**Références officielles :**
- [Installation Instructions](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator/blob/main/docs/Installation-Instructions.md)
- [Update to a newer version](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator/blob/main/docs/Installation-Instructions.md#update-to-a-newer-version-of-the-saas-accelerator)
- [Release Notes](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator/releases)
- [Database Migrations](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator/blob/main/src/DataAccess/readme.md)

---

## �🔧 Détail des modifications

### Étape 1 : Extensions table `Subscriptions`

**Colonnes ajoutées :**

```sql
ALTER TABLE [dbo].[Subscriptions] 
ADD [TeamsUserId] NVARCHAR(255) NULL;          -- ID utilisateur Teams (aadObjectId)

ALTER TABLE [dbo].[Subscriptions] 
ADD [TeamsConversationId] NVARCHAR(255) NULL;  -- ID conversation Teams (optionnel)

ALTER TABLE [dbo].[Subscriptions] 
ADD [TenantId] NVARCHAR(255) NULL;             -- ID tenant Azure AD
```

**Raison :** Permet de lier un abonnement Marketplace à un utilisateur Teams spécifique.

**Impact :**
- ✅ Aucun impact sur les abonnements existants (colonnes `NULL` par défaut)
- ✅ Pas de modification des procédures existantes du SaaS Accelerator
- ✅ Rétrocompatible

---

### Étape 2 : Index de performance

#### Index 1 - Recherche par TeamsUserId

```sql
CREATE NONCLUSTERED INDEX [IX_Subscriptions_TeamsUserId] 
ON [dbo].[Subscriptions] ([TeamsUserId])
INCLUDE ([Id], [SubscriptionStatus], [PlanId]);
```

**Utilisation :** Optimise `saasIntegration.getActiveSubscription(teamsUserId)`

**Performance attendue :**
- Recherche : O(log n) au lieu de O(n)
- Scan évité sur table `Subscriptions`

#### Index 2 - Recherche par TenantId

```sql
CREATE NONCLUSTERED INDEX [IX_Subscriptions_TenantId] 
ON [dbo].[Subscriptions] ([TenantId])
INCLUDE ([Id], [SubscriptionStatus]);
```

**Utilisation :** Permet de lister tous les abonnements d'un tenant

**Cas d'usage :**
- Admin Portal : Vue par tenant
- Analytics multi-utilisateurs

---

### Étape 3 : Table `TeamsMessageLogs` (OPTIONNELLE)

#### Structure

```sql
CREATE TABLE [dbo].[TeamsMessageLogs] (
    [Id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [SubscriptionId] UNIQUEIDENTIFIER NOT NULL,
    [TeamsUserId] NVARCHAR(255) NOT NULL,
    [ConversationId] NVARCHAR(255) NOT NULL,
    [MessageText] NVARCHAR(MAX) NULL,          -- Privacy: peut être NULL
    [ResponseText] NVARCHAR(MAX) NULL,          -- Privacy: peut être NULL
    [TokenCount] INT NULL,
    [Dimension] NVARCHAR(50) NOT NULL,          -- 'free', 'pro', 'pro-plus'
    [Timestamp] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [ProcessingTimeMs] INT NULL,
    [ConversationType] NVARCHAR(20) NULL,       -- '1:1' ou 'group'
    [HasAttachments] BIT NOT NULL DEFAULT 0,
    [MessageLength] INT NULL,
    
    CONSTRAINT [FK_TeamsMessageLogs_Subscriptions] 
        FOREIGN KEY ([SubscriptionId]) 
        REFERENCES [dbo].[Subscriptions]([Id])
        ON DELETE CASCADE
);
```

#### Index associés

```sql
CREATE NONCLUSTERED INDEX [IX_TeamsMessageLogs_SubscriptionId_Timestamp] 
ON [dbo].[TeamsMessageLogs] ([SubscriptionId], [Timestamp] DESC);

CREATE NONCLUSTERED INDEX [IX_TeamsMessageLogs_TeamsUserId_Timestamp] 
ON [dbo].[TeamsMessageLogs] ([TeamsUserId], [Timestamp] DESC);
```

#### Considérations

**Avantages :**
- ✅ Audit complet des messages
- ✅ Analytics détaillés (temps de traitement, patterns d'usage)
- ✅ Support client (historique des conversations)
- ✅ Détection d'anomalies (usage suspect)

**Inconvénients :**
- ⚠️ Coûts de stockage (croissance linéaire avec usage)
- ⚠️ Problématiques RGPD/Privacy
- ⚠️ Requiert politique de rétention et nettoyage

**Recommandation pour Phase 2.3 :**
- ✅ Créer la table **SANS** stocker `MessageText` et `ResponseText`
- ✅ Stocker uniquement métadonnées (longueur, dimension, timestamp)
- ✅ Activation stockage texte plus tard si besoin (avec consentement utilisateur explicite)

**Politique de rétention suggérée :**
```sql
-- À implémenter plus tard (Phase 3)
-- Nettoyage automatique des logs > 90 jours
DELETE FROM [dbo].[TeamsMessageLogs]
WHERE [Timestamp] < DATEADD(DAY, -90, GETUTCDATE());
```

---

### Étape 4 : Vue `vw_SubscriptionUsageStats`

#### Objectif

Fournir des statistiques d'usage agrégées par abonnement pour le mois en cours.

#### Définition

```sql
CREATE VIEW [dbo].[vw_SubscriptionUsageStats] AS
SELECT 
    s.Id AS SubscriptionId,
    s.AmpSubscriptionId,
    s.Name AS SubscriptionName,
    s.PlanId,
    s.SubscriptionStatus,
    s.TeamsUserId,
    COALESCE(COUNT(tml.Id), 0) AS TotalMessages,
    COALESCE(SUM(CASE WHEN tml.Dimension = 'free' THEN 1 ELSE 0 END), 0) AS FreeMessages,
    COALESCE(SUM(CASE WHEN tml.Dimension = 'pro' THEN 1 ELSE 0 END), 0) AS ProMessages,
    COALESCE(SUM(CASE WHEN tml.Dimension = 'pro-plus' THEN 1 ELSE 0 END), 0) AS ProPlusMessages,
    MAX(tml.Timestamp) AS LastMessageDate
FROM 
    [dbo].[Subscriptions] s
    LEFT JOIN [dbo].[TeamsMessageLogs] tml ON s.Id = tml.SubscriptionId
WHERE
    tml.Timestamp >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETUTCDATE()), 0) -- Mois actuel
    OR tml.Id IS NULL
GROUP BY 
    s.Id, s.AmpSubscriptionId, s.Name, s.PlanId, s.SubscriptionStatus, s.TeamsUserId;
```

#### Utilisation

**Admin Portal :**
```sql
-- Dashboard : Usage du mois en cours
SELECT * FROM vw_SubscriptionUsageStats
WHERE SubscriptionStatus = 'Subscribed'
ORDER BY TotalMessages DESC;

-- Alertes : Abonnements approchant limite
SELECT * FROM vw_SubscriptionUsageStats
WHERE TotalMessages > (CASE 
    WHEN PlanId = 'teams-gpt-starter' THEN 800  -- 80% de 1000
    WHEN PlanId = 'teams-gpt-pro' THEN 8000     -- 80% de 10000
    ELSE 40000                                  -- 80% de 50000
END);
```

**API Analytics :**
```javascript
// src/services/analytics.js
async getSubscriptionStats(subscriptionId) {
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, subscriptionId)
        .query(`
            SELECT * FROM vw_SubscriptionUsageStats
            WHERE SubscriptionId = @id
        `);
    return result.recordset[0];
}
```

---

### Étape 5 : Procédure `sp_LinkTeamsUserToSubscription`

#### Objectif

Faciliter la liaison manuelle entre un utilisateur Teams et un abonnement Marketplace.

#### Définition

```sql
CREATE OR ALTER PROCEDURE [dbo].[sp_LinkTeamsUserToSubscription]
    @AmpSubscriptionId UNIQUEIDENTIFIER,
    @TeamsUserId NVARCHAR(255),
    @TenantId NVARCHAR(255),
    @ConversationId NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Mettre à jour l'abonnement avec les informations Teams
    UPDATE [dbo].[Subscriptions]
    SET 
        [TeamsUserId] = @TeamsUserId,
        [TenantId] = @TenantId,
        [TeamsConversationId] = @ConversationId,
        [ModifyDate] = GETUTCDATE()
    WHERE 
        [AmpSubscriptionId] = @AmpSubscriptionId;
    
    -- Retourner le nombre de lignes affectées
    SELECT @@ROWCOUNT AS RowsAffected;
END
GO
```

#### Utilisation

**Scénario 1 : Admin Portal (interface graphique)**

Interface web avec formulaire :
- Sélection abonnement (dropdown)
- Saisie TeamsUserId (input)
- Saisie TenantId (input)
- Bouton "Lier l'utilisateur"

**Scénario 2 : SQL Management Studio (manuel)**

```sql
-- Lier un utilisateur Teams à son abonnement
EXEC sp_LinkTeamsUserToSubscription
    @AmpSubscriptionId = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',  -- GUID de l'abonnement
    @TeamsUserId = '29:1AbCdEfGhIjKlMnOpQrStUvWxYz',              -- ID Teams (from.aadObjectId)
    @TenantId = 'aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2';           -- Tenant Azure AD
```

**Scénario 3 : Script PowerShell (batch)**

```powershell
# Liaison en masse depuis un CSV
$subscriptions = Import-Csv "subscriptions-mapping.csv"

foreach ($sub in $subscriptions) {
    Invoke-Sqlcmd -Query @"
        EXEC sp_LinkTeamsUserToSubscription
            @AmpSubscriptionId = '$($sub.AmpSubscriptionId)',
            @TeamsUserId = '$($sub.TeamsUserId)',
            @TenantId = '$($sub.TenantId)';
"@ -ServerInstance "sac-02-sql.database.windows.net" -Database "sac-02AMPSaaSDB"
}
```

**Vérification :**

```sql
-- Vérifier la liaison
SELECT 
    AmpSubscriptionId,
    Name,
    PlanId,
    TeamsUserId,
    TenantId,
    SubscriptionStatus
FROM [dbo].[Subscriptions]
WHERE TeamsUserId = '29:1AbCdEfGhIjKlMnOpQrStUvWxYz';
```

---

## 🚀 Ordre d'exécution

### Phase 1 : Préparation (sans accès DB)

**Tâches :**

1. ✅ Créer dossier `db/migrations/`
2. ✅ Créer script `db/migrations/002-teams-integration.sql`
3. ✅ Créer script de test `db/migrations/002-teams-integration-test.sql`
4. ✅ Créer documentation `db/README.md`
5. ✅ Committer les fichiers

**Livrables Phase 1 :**
- Scripts SQL prêts à exécuter
- Documentation complète
- Tests de validation préparés

---

### Phase 2 : Exécution (nécessite accès Azure SQL)

**Prérequis :**
- Accès Azure Portal (propriétaire de la resource group)
- Credentials Azure SQL (`sqladmin` ou `db_owner`)
- Azure Data Studio ou SQL Management Studio

**Tâches :**

6. ⏳ Connexion à Azure SQL Database
   ```bash
   # Connection string
   Server=tcp:sac-02-sql.database.windows.net,1433;
   Initial Catalog=sac-02AMPSaaSDB;
   User ID=sqladmin;
   Password=***;
   ```

7. ⏳ Backup de la base de données
   ```sql
   -- Via Azure Portal ou CLI
   az sql db copy --name sac-02AMPSaaSDB \
       --dest-name sac-02AMPSaaSDB-backup-$(date +%Y%m%d) \
       --resource-group sac-02 \
       --server sac-02-sql
   ```

8. ⏳ Exécution du script principal
   ```sql
   -- Ouvrir 002-teams-integration.sql dans Azure Data Studio
   -- Vérifier USE [sac-02AMPSaaSDB]
   -- Exécuter (F5)
   ```

9. ⏳ Vérification avec script de test
   ```sql
   -- Exécuter 002-teams-integration-test.sql
   -- Vérifier tous les tests PASSED
   ```

**Livrables Phase 2 :**
- Base de données étendue
- Backup disponible
- Tests validés

---

### Phase 3 : Validation (vérification fonctionnelle)

**Tâches :**

10. ⏳ Vérifier les colonnes ajoutées

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Subscriptions'
AND COLUMN_NAME IN ('TeamsUserId', 'TeamsConversationId', 'TenantId');

-- Résultat attendu :
-- TeamsUserId         | NVARCHAR(255) | YES
-- TeamsConversationId | NVARCHAR(255) | YES
-- TenantId            | NVARCHAR(255) | YES
```

11. ⏳ Vérifier les index créés

```sql
SELECT 
    name AS IndexName,
    type_desc AS IndexType,
    is_unique AS IsUnique
FROM sys.indexes
WHERE object_id = OBJECT_ID('Subscriptions')
AND name LIKE 'IX_%Teams%';

-- Résultat attendu :
-- IX_Subscriptions_TeamsUserId | NONCLUSTERED | 0
-- IX_Subscriptions_TenantId    | NONCLUSTERED | 0
```

12. ⏳ Tester la vue

```sql
SELECT TOP 5 * FROM vw_SubscriptionUsageStats;

-- Doit retourner stats (même avec 0 messages)
```

13. ⏳ Tester la procédure stockée

```sql
-- Créer un abonnement de test
DECLARE @testSubId UNIQUEIDENTIFIER = NEWID();
INSERT INTO Subscriptions (AmpSubscriptionId, Name, PlanId, SubscriptionStatus)
VALUES (@testSubId, 'Test Subscription', 'teams-gpt-pro', 'Subscribed');

-- Lier à un utilisateur Teams
EXEC sp_LinkTeamsUserToSubscription
    @AmpSubscriptionId = @testSubId,
    @TeamsUserId = '29:test-user-123',
    @TenantId = 'test-tenant-id';

-- Vérifier (doit retourner RowsAffected = 1)
SELECT TeamsUserId, TenantId 
FROM Subscriptions 
WHERE AmpSubscriptionId = @testSubId;

-- Nettoyer
DELETE FROM Subscriptions WHERE AmpSubscriptionId = @testSubId;
```

14. ⏳ Tester l'intégration avec le code existant

```bash
# Lancer les tests d'intégration
npm run test:integration:saas
```

**Livrables Phase 3 :**
- Tous les tests passent ✅
- Code `saasIntegration.js` fonctionne avec nouveau schéma
- Procédure de liaison testée

---

## ⚠️ Considérations importantes

### 1. Table `TeamsMessageLogs` - Décision d'implémentation

**Question :** Créer la table maintenant ou plus tard ?

**Option A : Créer maintenant (RECOMMANDÉ)**
- ✅ Schéma complet dès Phase 2.3
- ✅ Possibilité d'activer le logging plus tard sans migration
- ✅ Tests peuvent utiliser la table
- ⚠️ Ajoute ~50 lignes au script SQL
- ⚠️ Une table vide dans la DB (coût négligeable)

**Option B : Reporter à Phase 3**
- ✅ Script Phase 2.3 plus court
- ✅ Évite table inutilisée temporairement
- ⚠️ Requiert migration SQL supplémentaire plus tard
- ⚠️ Tests middleware devront être modifiés

**Recommandation :** **Option A** - Créer maintenant, activer plus tard

---

### 2. Liaison utilisateur ↔ abonnement

**Stratégies possibles :**

#### Option 1 : Liaison manuelle via Admin Portal (Phase 2.3) ✅

**Flux :**
1. Client achète sur Azure Marketplace
2. SaaS Accelerator crée l'abonnement
3. Admin ouvre le portail Admin (`sac-02-admin`)
4. Admin saisit le `TeamsUserId` de l'utilisateur
5. Procédure `sp_LinkTeamsUserToSubscription` fait la liaison

**Avantages :**
- ✅ Simple à implémenter
- ✅ Contrôle manuel par l'admin
- ✅ Pas de modification du flow Marketplace

**Inconvénients :**
- ❌ Liaison manuelle requise (friction utilisateur)
- ❌ Pas automatique pour l'utilisateur final

#### Option 2 : Liaison automatique via Landing Page (Phase 3 - Future)

**Flux :**
1. Client achète sur Azure Marketplace
2. Redirection vers Landing Page SaaS Accelerator
3. Landing Page demande authentification Microsoft Teams
4. Récupération automatique du `TeamsUserId`
5. Liaison automatique dans la DB
6. Redirection vers Teams avec abonnement actif

**Avantages :**
- ✅ Expérience utilisateur fluide
- ✅ Pas d'intervention admin nécessaire
- ✅ Activation immédiate

**Inconvénients :**
- ❌ Requiert modification Landing Page (complexe)
- ❌ Authentification Teams dans web app (OAuth)
- ❌ Gestion des erreurs d'authentification

**Recommandation pour Phase 2.3 :** **Option 1** (manuel)  
**Évolution Phase 3 :** **Option 2** (automatique)

---

### 3. Sécurité et confidentialité (RGPD)

#### Données personnelles dans `TeamsMessageLogs`

**Colonnes sensibles :**
- `MessageText` - Contenu message utilisateur
- `ResponseText` - Réponse du bot
- `TeamsUserId` - Identifiant utilisateur

**Obligations RGPD :**
- ✅ Consentement explicite pour stockage texte
- ✅ Droit à l'effacement (suppression données utilisateur)
- ✅ Politique de rétention claire (ex: 90 jours)
- ✅ Chiffrement au repos (Azure SQL TDE activé par défaut)

**Recommandations Phase 2.3 :**

1. **Ne PAS stocker le texte des messages**
   ```javascript
   // src/services/usageReporter.js
   async reportUsage(params) {
       await pool.request()
           .input('messageText', sql.NVarChar, null)      // NULL au lieu du texte
           .input('responseText', sql.NVarChar, null)     // NULL au lieu du texte
           .input('messageLength', sql.Int, params.messageText.length)  // Longueur seulement
           .query(`INSERT INTO TeamsMessageLogs (...) VALUES (...)`);
   }
   ```

2. **Anonymiser les identifiants si nécessaire**
   ```javascript
   // Option : hasher le TeamsUserId pour analytics
   const crypto = require('crypto');
   const hashedUserId = crypto.createHash('sha256')
       .update(teamsUserId)
       .digest('hex')
       .substring(0, 16);
   ```

3. **Implémenter droit à l'effacement**
   ```sql
   -- Procédure pour supprimer les données d'un utilisateur (RGPD)
   CREATE PROCEDURE sp_DeleteUserData
       @TeamsUserId NVARCHAR(255)
   AS
   BEGIN
       DELETE FROM TeamsMessageLogs WHERE TeamsUserId = @TeamsUserId;
       UPDATE Subscriptions SET TeamsUserId = NULL WHERE TeamsUserId = @TeamsUserId;
   END
   ```

---

### 4. Permissions et sécurité Azure SQL

#### Permissions requises pour exécution script

**Niveau database :**
- `ALTER TABLE` (pour extensions `Subscriptions`)
- `CREATE TABLE` (pour `TeamsMessageLogs`)
- `CREATE INDEX`
- `CREATE VIEW`
- `CREATE PROCEDURE`

**Rôles recommandés :**
- `db_owner` (accès complet) ✅ RECOMMANDÉ pour migration
- `db_ddladmin` (DDL uniquement, pas de données)

**Connexion recommandée :**
```bash
# Option 1 : SQL Authentication (sqladmin)
Server=tcp:sac-02-sql.database.windows.net,1433;
User ID=sqladmin;
Password=***;

# Option 2 : Azure AD Authentication (propriétaire resource group)
Server=tcp:sac-02-sql.database.windows.net,1433;
Authentication=Active Directory Integrated;
```

#### Sécurité réseau

**Firewall Azure SQL :**
- Ajouter IP locale pour exécution depuis machine dev
- Ou utiliser Azure Portal Query Editor (dans le navigateur)

```bash
# Ajouter IP au firewall
az sql server firewall-rule create \
    --resource-group sac-02 \
    --server sac-02-sql \
    --name "Dev-Machine" \
    --start-ip-address $(curl -s ifconfig.me) \
    --end-ip-address $(curl -s ifconfig.me)
```

---

## 📊 Impact et tests

### Impact sur le code existant

**✅ AUCUN impact sur SaaS Accelerator existant :**

1. **Tables existantes intactes**
   - Pas de modification de colonnes existantes
   - Pas de suppression de données
   - Colonnes ajoutées `NULL` par défaut

2. **Procédures existantes fonctionnelles**
   - Aucune procédure SaaS Accelerator modifiée
   - Nouveaux objets DB indépendants

3. **Rétrocompatibilité garantie**
   - Abonnements existants continuent de fonctionner
   - Landing Page fonctionne normalement
   - Webhook Handler fonctionne normalement

**✅ Impact positif sur notre code :**

1. **`src/services/saasIntegration.js`**
   - Peut maintenant utiliser `TeamsUserId` dans requêtes
   - Performance améliorée grâce aux index

2. **`src/middleware/subscriptionCheck.js`**
   - Requêtes `getActiveSubscription()` plus rapides
   - Possibilité de gérer multi-utilisateurs par tenant

3. **`tests/integration/saas.test.js`**
   - Peut créer abonnements de test avec `TeamsUserId`
   - Tests plus proches de la réalité production

---

### Tests à effectuer

#### Test 1 : Vérification structure DB

```sql
-- Test 1.1 : Vérifier colonnes Subscriptions
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Subscriptions'
AND COLUMN_NAME IN ('TeamsUserId', 'TeamsConversationId', 'TenantId');
-- ATTENDU : 3 lignes

-- Test 1.2 : Vérifier index
SELECT name, type_desc
FROM sys.indexes
WHERE object_id = OBJECT_ID('Subscriptions')
AND name LIKE 'IX_%Teams%';
-- ATTENDU : 2 index (TeamsUserId, TenantId)

-- Test 1.3 : Vérifier table TeamsMessageLogs (si créée)
SELECT COUNT(*) AS TableExists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'TeamsMessageLogs';
-- ATTENDU : 1 (ou 0 si table non créée)

-- Test 1.4 : Vérifier vue
SELECT COUNT(*) AS ViewExists
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_NAME = 'vw_SubscriptionUsageStats';
-- ATTENDU : 1

-- Test 1.5 : Vérifier procédure
SELECT COUNT(*) AS ProcExists
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_NAME = 'sp_LinkTeamsUserToSubscription'
AND ROUTINE_TYPE = 'PROCEDURE';
-- ATTENDU : 1
```

#### Test 2 : Fonctionnalité liaison

```sql
-- Test 2.1 : Créer abonnement test
DECLARE @testSubId UNIQUEIDENTIFIER = NEWID();
DECLARE @rowsAffected INT;

INSERT INTO Subscriptions (AmpSubscriptionId, Name, PlanId, SubscriptionStatus, CreateDate)
VALUES (@testSubId, 'Test Phase 2.3', 'teams-gpt-pro', 'Subscribed', GETUTCDATE());

-- Test 2.2 : Lier utilisateur
EXEC sp_LinkTeamsUserToSubscription
    @AmpSubscriptionId = @testSubId,
    @TeamsUserId = '29:test-phase-2-3',
    @TenantId = 'test-tenant-123';

-- Test 2.3 : Vérifier liaison
SELECT @rowsAffected = COUNT(*)
FROM Subscriptions
WHERE AmpSubscriptionId = @testSubId
AND TeamsUserId = '29:test-phase-2-3'
AND TenantId = 'test-tenant-123';

IF @rowsAffected = 1
    PRINT 'TEST 2 PASSED: Liaison réussie'
ELSE
    PRINT 'TEST 2 FAILED: Liaison échouée'

-- Test 2.4 : Nettoyer
DELETE FROM Subscriptions WHERE AmpSubscriptionId = @testSubId;
```

#### Test 3 : Performance index

```sql
-- Test 3.1 : Recherche sans index (simulation)
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- Désactiver temporairement l'index
ALTER INDEX IX_Subscriptions_TeamsUserId ON Subscriptions DISABLE;

-- Requête sans index
SELECT Id, Name, PlanId, SubscriptionStatus
FROM Subscriptions
WHERE TeamsUserId = '29:test-user';

-- Réactiver l'index
ALTER INDEX IX_Subscriptions_TeamsUserId ON Subscriptions REBUILD;

-- Requête avec index
SELECT Id, Name, PlanId, SubscriptionStatus
FROM Subscriptions
WHERE TeamsUserId = '29:test-user';

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;

-- Comparer les résultats :
-- Logical reads : devrait diminuer avec index
-- CPU time : devrait diminuer avec index
```

#### Test 4 : Vue statistiques

```sql
-- Test 4.1 : Vue retourne données (même vide)
SELECT COUNT(*) AS RowCount
FROM vw_SubscriptionUsageStats;
-- ATTENDU : >= 0 (nombre d'abonnements)

-- Test 4.2 : Colonnes présentes
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.VIEW_COLUMN_USAGE
WHERE VIEW_NAME = 'vw_SubscriptionUsageStats';
-- ATTENDU : 11 colonnes
```

#### Test 5 : Intégration code existant

```bash
# Test 5.1 : Tests unitaires existants
npm run test:unit

# Test 5.2 : Tests intégration SaaS
npm run test:integration:saas

# Test 5.3 : Vérifier aucune régression
npm test
```

---

## ✅ Checklist de validation

### Avant exécution (Phase 1)

- [ ] Script `002-teams-integration.sql` créé et reviewé
- [ ] Script `002-teams-integration-test.sql` créé
- [ ] Documentation `db/README.md` complète
- [ ] Fichiers commités sur Git
- [ ] Backup strategy définie

### Pendant exécution (Phase 2)

- [ ] Connexion Azure SQL établie
- [ ] Backup DB effectué
- [ ] Script SQL exécuté sans erreur
- [ ] Messages de confirmation affichés
- [ ] Script de test exécuté avec succès

### Après exécution (Phase 3)

- [ ] Colonnes `TeamsUserId`, `TenantId`, `TeamsConversationId` présentes
- [ ] Index `IX_Subscriptions_TeamsUserId` créé
- [ ] Index `IX_Subscriptions_TenantId` créé
- [ ] Table `TeamsMessageLogs` créée (si activée)
- [ ] Vue `vw_SubscriptionUsageStats` accessible
- [ ] Procédure `sp_LinkTeamsUserToSubscription` fonctionnelle
- [ ] Tests de liaison réussis
- [ ] Performance index validée
- [ ] Tests unitaires existants passent
- [ ] Tests intégration passent
- [ ] Aucune régression détectée

### Documentation

- [ ] README.md mis à jour avec instructions
- [ ] Commit Phase 2.3 créé
- [ ] Tag Git créé (si release)
- [ ] Todo list mise à jour

---

## 🎯 Résumé des fichiers à créer

### Arborescence finale

```
teams-gpt-saas-acc/
├── db/
│   ├── README.md                                      [NOUVEAU - 150 lignes]
│   └── migrations/
│       ├── 002-teams-integration.sql                  [NOUVEAU - 280 lignes]
│       └── 002-teams-integration-test.sql             [NOUVEAU - 80 lignes]
│
├── doc/
│   └── architecture/
│       └── PHASE-2.3-PLAN.md                          [CE FICHIER - 850 lignes]
│
└── tests/
    └── integration/
        └── saas-database.test.js                      [MODIFIER - tests DB]
```

### Taille estimée

| Fichier | Lignes | Contenu |
|---------|--------|---------|
| `002-teams-integration.sql` | ~280 | Script SQL complet |
| `002-teams-integration-test.sql` | ~80 | Tests de validation |
| `db/README.md` | ~150 | Documentation |
| `PHASE-2.3-PLAN.md` | ~850 | Ce document |
| **TOTAL** | **~1360** | **4 fichiers** |

---

## 📅 Estimation temporelle

### Phase 1 : Préparation (1-2 heures)

- Création scripts SQL : 45 min
- Création tests : 20 min
- Documentation README : 30 min
- Review et commit : 15 min

### Phase 2 : Exécution (30 min - 1 heure)

- Connexion Azure SQL : 10 min
- Backup DB : 5 min
- Exécution script : 5 min
- Tests de validation : 10 min

### Phase 3 : Validation (30 min)

- Tests fonctionnels : 15 min
- Tests intégration code : 10 min
- Documentation finale : 5 min

**TOTAL estimé : 2-4 heures**

---

## 🚀 Prochaines étapes après Phase 2.3

Une fois Phase 2.3 validée :

### Phase 2.4 : Configuration et déploiement

- Configurer variables d'environnement production
- Déployer sur Azure App Service
- Configurer CI/CD pipeline

### Phase 2.6 : Tests Phase 2 complets

- Tests middleware end-to-end avec DB réelle
- Tests de charge (performance)
- Tests de sécurité (RGPD, encryption)
- Validation complète intégration

### Phase 3 : Configuration Azure Marketplace

- Création offre sur Partner Center
- Configuration plans tarifaires
- Configuration dimensions metered
- Certification Microsoft

---

## 📚 Références

### Documentation interne

- [Phase 2 - Intégration Teams GPT](./phase2-teams-integration.md)
- [Architecture SaaS Accelerator](./saas-accelerator-integration.md)
- [README Tests](../../tests/README.md)
- [Configuration Azure SQL](../../tests/AZURE-SQL-CONFIG.md)

### Documentation externe

- [Azure SQL Database - ALTER TABLE](https://learn.microsoft.com/sql/t-sql/statements/alter-table-transact-sql)
- [Azure SQL Database - CREATE INDEX](https://learn.microsoft.com/sql/t-sql/statements/create-index-transact-sql)
- [Best practices for indexes](https://learn.microsoft.com/azure/azure-sql/database/performance-guidance)
- [RGPD et Azure SQL](https://learn.microsoft.com/azure/compliance/offerings/offering-gdpr)

---

**Document créé le :** 31 octobre 2025  
**Auteur :** GitHub Copilot + michel-heon  
**Version :** 1.0  
**Statut :** ✅ Prêt pour revue et exécution
