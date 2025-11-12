# Phase 1 - Configuration Réseau et Permissions SQL

## 📋 Vue d'ensemble

Cette phase configure l'infrastructure réseau et les permissions nécessaires pour permettre au Bot Teams de se connecter à la base de données SaaS Accelerator via Managed Identity.

## 🎯 Objectifs

- ✅ Corriger **GAP #1** : Configurer le pare-feu Azure SQL pour autoriser le Bot
- ✅ Corriger **GAP #2** : Ajouter les variables d'environnement SQL au Bot
- ✅ Corriger **GAP #3** : Créer l'utilisateur Managed Identity avec permissions SQL

## 📂 Fichiers créés

```
infra/
├── sql-permissions.bicep                    # Template Bicep pour règles firewall
├── azure.parameters.sql-permissions.json    # Paramètres (IPs, identités)
├── deploy-sql-permissions.sh                # Script déploiement Bicep
└── update-bot-app-settings.sh               # Script configuration App Service

db/migrations/
└── 003-bot-managed-identity.sql             # Script SQL pour permissions

scripts/
└── test-sql-connection.js                   # Script test de connexion
```

## 🚀 Procédure d'installation

### Étape 1 : Déployer les règles de pare-feu SQL

```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc

# Vérifier les paramètres
cat infra/azure.parameters.sql-permissions.json

# Déployer (avec confirmation interactive)
./infra/deploy-sql-permissions.sh
```

**Ce que fait ce script :**
- Valide le template Bicep
- Ajoute 7 règles de pare-feu pour les IPs sortantes du bot
- Assure que "AllowAzureServices" est activé
- Affiche les outputs de déploiement

**Durée estimée :** 2-3 minutes

---

### Étape 2 : Créer l'utilisateur SQL Managed Identity

**Prérequis :**
- Être connecté en tant qu'administrateur Azure AD (`heon@cotechnoe.net`)
- Avoir `sqlcmd` installé ou utiliser Azure Data Studio / Cloud Shell

**Option A : Utiliser sqlcmd**

```bash
sqlcmd -S sac-02-sql.database.windows.net \
       -d sac-02AMPSaaSDB \
       -G \
       -U heon@cotechnoe.net \
       -i db/migrations/003-bot-managed-identity.sql
```

**Option B : Utiliser Azure Cloud Shell**

```bash
# Uploader le fichier 003-bot-managed-identity.sql dans Cloud Shell

az sql db show --name sac-02AMPSaaSDB --server sac-02-sql --resource-group rg-saasaccel-teams-gpt-02

# Exécuter le script
Invoke-Sqlcmd -ServerInstance "sac-02-sql.database.windows.net" `
              -Database "sac-02AMPSaaSDB" `
              -InputFile "003-bot-managed-identity.sql" `
              -AccessToken (Get-AzAccessToken -ResourceUrl https://database.windows.net).Token
```

**Option C : Azure Data Studio**

1. Connecter à `sac-02-sql.database.windows.net`
2. Sélectionner DB : `sac-02AMPSaaSDB`
3. Authentification : Azure Active Directory
4. Ouvrir `db/migrations/003-bot-managed-identity.sql`
5. Exécuter le script (F5)

**Vérification :**

Le script affiche :
```
=== Migration 003 Completed Successfully ===
Bot Managed Identity "bot997b9c" has been granted:
  - db_datareader role
  - db_datawriter role
  - SELECT on Subscriptions, Plans, MeteredDimensions
  - INSERT on MeteredAuditLogs, TeamsMessageLogs
```

**Durée estimée :** 5 minutes

---

### Étape 3 : Configurer les variables d'environnement du Bot

```bash
# Vérifier les paramètres
./infra/update-bot-app-settings.sh
```

**Ce que fait ce script :**
- Affiche les settings actuels
- Demande confirmation
- Ajoute/met à jour 8 variables d'environnement :
  ```
  SAAS_DB_SERVER=sac-02-sql.database.windows.net
  SAAS_DB_NAME=sac-02AMPSaaSDB
  SAAS_DB_USE_MANAGED_IDENTITY=true
  SAAS_ENABLE_SUBSCRIPTION_CHECK=true
  SAAS_DEBUG_MODE=true
  SAAS_PERMISSIVE_MODE=false
  SAAS_ENABLE_USAGE_TRACKING=true
  SAAS_BLOCK_NO_SUBSCRIPTION=false
  ```
- Propose de redémarrer l'App Service

**⚠️ Important :** Répondre "y" au prompt de redémarrage pour appliquer les changements

**Durée estimée :** 2 minutes + 30s redémarrage

---

### Étape 4 : Tester la connexion

**Option A : Script de test local (simule Managed Identity via Azure AD)**

```bash
# Installer dépendances si nécessaire
npm install mssql @azure/identity

# Exécuter test
node scripts/test-sql-connection.js
```

**Tests effectués :**
1. ✅ Connexion à la base de données
2. ✅ Authentification Azure AD
3. ✅ Permissions SELECT (db_datareader)
4. ✅ Permissions INSERT (db_datawriter)
5. ✅ Requête sur Subscriptions avec TeamsUserId
6. ✅ Vérification des rôles SQL

**Durée estimée :** 1 minute

---

**Option B : Vérifier les logs du Bot en production**

```bash
# Logs en temps réel
az webapp log tail --name bot997b9c --resource-group rg-saas-test

# Rechercher les logs de connexion
az webapp log tail --name bot997b9c --resource-group rg-saas-test | grep -i "saas\|database\|connection"
```

**Logs attendus (succès) :**
```
Successfully connected to SaaS Accelerator database
Database connection initialized with Managed Identity
```

**Logs d'erreur possibles :**
```
Failed to connect to database: Login failed for user 'bot997b9c'
  → Étape 2 non complétée ou permissions manquantes

Connection timeout
  → Étape 1 non complétée ou firewall incorrect

Cannot find database: sac-02AMPSaaSDB
  → Variables d'environnement incorrectes (Étape 3)
```

**Durée estimée :** 5 minutes (attendre propagation logs)

---

## ✅ Critères de validation

### Phase 1 complète si :

- [ ] Script `deploy-sql-permissions.sh` exécuté avec succès (✓ Deployment successful)
- [ ] Script SQL `003-bot-managed-identity.sql` exécuté (Migration 003 Completed Successfully)
- [ ] Script `update-bot-app-settings.sh` exécuté (✓ App Settings updated successfully)
- [ ] Bot App Service redémarré
- [ ] Test `test-sql-connection.js` affiche "✓ ALL TESTS PASSED" **OU**
- [ ] Logs du bot montrent "Successfully connected to SaaS Accelerator database"

---

## 🐛 Dépannage

### Problème : Firewall règles non appliquées

**Symptôme :** Connection timeout lors du test

**Solution :**
```bash
# Vérifier les règles actuelles
az sql server firewall-rule list \
  --server sac-02-sql \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --output table

# Devrait afficher 8+ règles incluant "AllowBotAppService-IP-*"
```

---

### Problème : Login failed for user 'bot997b9c'

**Symptôme :** Authentication error

**Solution :**
```sql
-- Vérifier que l'utilisateur existe
SELECT name, type_desc, authentication_type_desc 
FROM sys.database_principals 
WHERE name = 'bot997b9c';

-- Si vide, re-exécuter 003-bot-managed-identity.sql
```

---

### Problème : Variables d'environnement non prises en compte

**Symptôme :** Bot utilise encore les anciennes valeurs

**Solution :**
```bash
# Forcer redémarrage
az webapp restart --name bot997b9c --resource-group rg-saas-test

# Vérifier variables actuelles
az webapp config appsettings list \
  --name bot997b9c \
  --resource-group rg-saas-test \
  --query "[?contains(name, 'SAAS')]" \
  --output table
```

---

## 📊 État après Phase 1

| Composant | Avant | Après |
|-----------|-------|-------|
| Firewall SQL | 3 règles (aucune pour bot) | 10+ règles (bot autorisé) |
| Utilisateur SQL bot | ❌ N'existe pas | ✅ Créé avec db_datareader/datawriter |
| Variables env bot | ❌ Aucune config SQL | ✅ 8 variables SAAS_* configurées |
| Connexion bot → SQL | 🔴 Impossible | 🟢 Fonctionnelle |
| Mode permissif | 🟡 Actif (ignore erreurs) | 🟢 Désactivé (connexion réelle) |

---

## 🎯 Prochaines étapes (Phase 2)

Une fois la Phase 1 validée, passer à la **Phase 2 : Workflow OAuth Teams**

```bash
# Marquer tâche #1 comme complétée
# Marquer tâche #2 comme complétée (si SQL OK)
# Marquer tâche #3 comme complétée (si App Settings OK)
# Marquer tâche #4 comme complétée (si tests passent)

# Commencer Phase 2
# Tâche #5 : Développer le flow OAuth Teams
```

**Objectif Phase 2 :** Permettre aux utilisateurs de lier leur compte Microsoft 365 Marketplace à leur identité Teams pour remplir la colonne `TeamsUserId` dans la table `Subscriptions`.

---

## 📚 Références

- [Azure SQL Firewall Rules](https://learn.microsoft.com/azure/azure-sql/database/firewall-configure)
- [Managed Identity pour Azure SQL](https://learn.microsoft.com/azure/azure-sql/database/authentication-aad-configure?view=azuresql#azure-ad-authentication-with-managed-identity)
- [Bicep Deployment](https://learn.microsoft.com/azure/azure-resource-manager/bicep/deploy-cli)
- [App Service App Settings](https://learn.microsoft.com/azure/app-service/configure-common)

---

**Version :** 1.0  
**Date :** 12 novembre 2025  
**Auteur :** GitHub Copilot (Issue #11 - Phase 1)
