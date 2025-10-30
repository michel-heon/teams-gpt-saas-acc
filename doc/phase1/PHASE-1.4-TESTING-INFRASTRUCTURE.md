# 🧪 Phase 1.4 - Test de l'infrastructure SaaS Accelerator

## 🎯 Objectif

Valider que l'infrastructure SaaS Accelerator déployée est opérationnelle avant d'intégrer avec l'agent Teams.

---

## 📋 Checklist des tests

### ✅ Tests à effectuer

- [ ] **Test 1**: Accéder au portail administrateur
- [ ] **Test 2**: Vérifier la connexion à la base de données
- [ ] **Test 3**: Tester la landing page
- [ ] **Test 4**: Vérifier le webhook endpoint
- [ ] **Test 5**: Consulter les logs Application Insights
- [ ] **Test 6**: Tester un abonnement mock (optionnel)

---

## 🔐 Informations de connexion

### URLs déployées

| Service | URL |
|---------|-----|
| **Portail Admin** | https://sac-02-portal.azurewebsites.net/ |
| **Landing Page** | https://sac-02-portal.azurewebsites.net/ |
| **Webhook** | https://sac-02-portal.azurewebsites.net/api/AzureWebhook |

### Identifiants Azure

| Paramètre | Valeur |
|-----------|--------|
| **Groupe de ressources** | rg-saasaccel-teams-gpt-02 |
| **Région** | Canada Central |
| **Tenant ID** | aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2 |
| **App ID** | d3b2710f-1be9-4f89-8834-6273619bd838 |
| **Subscription ID** | 0f1323ea-0f29-4fd4-9ae5-0a45d7efc9d2 |

### Email administrateur

**Publisher Admin** : heon@cotechnoe.net

---

## 🧪 Test 1 : Accéder au portail administrateur

### Objectif
Vérifier que le portail web est accessible et que l'authentification fonctionne.

### Étapes

1. **Ouvrir le portail** dans un navigateur :
   ```
   https://sac-02-portal.azurewebsites.net/
   ```

2. **Se connecter** avec le compte administrateur (heon@cotechnoe.net)

3. **Vérifier l'affichage** :
   - ✅ Page de connexion s'affiche
   - ✅ Redirection vers Microsoft Login
   - ✅ Authentification réussie
   - ✅ Dashboard admin accessible

### Résultats attendus

- Le portail charge sans erreur
- L'authentification Azure AD fonctionne
- Le dashboard affiche "No subscriptions yet" (normal au début)

### En cas d'erreur

**Erreur 503 - Service Unavailable** :
- L'App Service est peut-être en train de démarrer (attendre 2-3 minutes)
- Vérifier que l'App Service est bien démarré dans Azure Portal

**Erreur 500 - Internal Server Error** :
- Vérifier les logs dans Application Insights
- Vérifier la connexion à la base de données SQL

**Erreur d'authentification** :
- Vérifier que le Tenant ID et App ID sont corrects dans la configuration
- Vérifier que l'utilisateur heon@cotechnoe.net est bien Publisher Admin

---

## 🗄️ Test 2 : Vérifier la connexion à la base de données

### Objectif
S'assurer que l'App Service peut se connecter à la base de données SQL.

### Via Azure Portal

1. **Ouvrir Azure Portal** : https://portal.azure.com
2. **Naviguer vers** : Resource Group `rg-saasaccel-teams-gpt-02`
3. **Ouvrir la base de données SQL** (nom : `sac-02-db` ou similaire)
4. **Query Editor** : Tester une requête simple

### Via Azure CLI

```bash
# Lister les bases de données dans le groupe de ressources
az sql db list \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --output table

# Vérifier l'état de la base de données
az sql db show \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server <nom-du-serveur> \
  --name <nom-de-la-db> \
  --query "{Name:name, Status:status, Tier:currentServiceObjectiveName}"
```

### Vérifier les tables

Les tables suivantes doivent exister dans la base de données :

- `Subscriptions` - Abonnements SaaS
- `Plans` - Plans configurés
- `MeteredDimensions` - Dimensions de facturation
- `MeteredAuditLogs` - Logs d'usage metered
- `ApplicationConfiguration` - Configuration de l'app
- `Users` - Utilisateurs du portail admin
- `KnownUsers` - Utilisateurs autorisés

### Résultats attendus

- ✅ Base de données existe et est en ligne
- ✅ Les tables sont créées (via Entity Framework migrations)
- ✅ Connection string est valide dans App Service Configuration

---

## 🌐 Test 3 : Tester la landing page

### Objectif
Vérifier que la landing page (point d'entrée des abonnements Marketplace) est accessible.

### Étapes

1. **Accéder à la landing page** avec un token de test :
   ```
   https://sac-02-portal.azurewebsites.net/?token=test-token
   ```

2. **Observer le comportement** :
   - La page devrait charger (même avec un token invalide)
   - Message d'erreur attendu : "Invalid token" ou "Token expired"
   - **C'est normal !** Cela signifie que le endpoint fonctionne

### Résultats attendus

- ✅ La landing page charge sans erreur 500
- ✅ Le système valide le token (même si invalide)
- ✅ Message d'erreur approprié s'affiche

### Page de résolution d'abonnement

La landing page sert à :
1. Recevoir le token depuis Azure Marketplace
2. Résoudre le token pour obtenir les détails de l'abonnement
3. Activer l'abonnement SaaS
4. Rediriger l'utilisateur vers le portail

---

## 🔗 Test 4 : Vérifier le webhook endpoint

### Objectif
S'assurer que l'endpoint webhook est accessible et répond correctement.

### Test de santé (Health Check)

```bash
# Test simple du endpoint webhook
curl -I https://sac-02-portal.azurewebsites.net/api/AzureWebhook
```

**Réponse attendue** :
- HTTP 405 Method Not Allowed (car on fait un HEAD au lieu de POST)
- Ou HTTP 401 Unauthorized (car pas de token)
- **Ces deux réponses sont correctes** : elles prouvent que l'endpoint existe

**Réponse incorrecte** :
- HTTP 404 Not Found → Le endpoint n'existe pas (problème de déploiement)
- HTTP 500 Server Error → Erreur serveur (vérifier les logs)

### Via Azure CLI

```bash
# Tester l'accessibilité du webhook
az rest \
  --method get \
  --url "https://sac-02-portal.azurewebsites.net/api/AzureWebhook" \
  || echo "Endpoint existe (erreur 401 ou 405 attendue)"
```

### Webhooks Marketplace

Le webhook reçoit les événements suivants depuis Azure Marketplace :
- `Activate` - Activation d'un nouvel abonnement
- `ChangePlan` - Changement de plan
- `ChangeQuantity` - Changement de quantité (si applicable)
- `Suspend` - Suspension de l'abonnement
- `Unsubscribe` - Annulation de l'abonnement
- `Reinstate` - Réactivation après suspension

---

## 📊 Test 5 : Consulter les logs Application Insights

### Objectif
Vérifier que le monitoring fonctionne et consulter les logs.

### Via Azure Portal

1. **Ouvrir Azure Portal**
2. **Naviguer vers** : Resource Group `rg-saasaccel-teams-gpt-02`
3. **Ouvrir Application Insights** (nom : `sac-02-appinsights` ou similaire)
4. **Consulter les logs** :
   - Onglet "Logs"
   - Onglet "Failures" (erreurs)
   - Onglet "Performance"

### Requêtes KQL utiles

#### Voir toutes les requêtes récentes
```kql
requests
| where timestamp > ago(1h)
| project timestamp, name, url, resultCode, duration
| order by timestamp desc
| take 50
```

#### Voir les erreurs
```kql
exceptions
| where timestamp > ago(1h)
| project timestamp, type, outerMessage, innermostMessage
| order by timestamp desc
```

#### Voir les dépendances (DB, API calls)
```kql
dependencies
| where timestamp > ago(1h)
| project timestamp, name, type, resultCode, duration
| order by timestamp desc
| take 50
```

### Via Azure CLI

```bash
# Lister les ressources Application Insights
az monitor app-insights component show \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --output table
```

### Résultats attendus

- ✅ Application Insights est configuré
- ✅ Les requêtes HTTP sont loggées
- ✅ Pas d'erreurs critiques dans les 24 dernières heures

---

## 🧪 Test 6 : Créer un abonnement de test (Optionnel)

### Objectif
Tester le cycle de vie complet d'un abonnement sans passer par Marketplace.

### ⚠️ Important

Ce test nécessite :
- Accès admin au portail
- Manipulation directe de la base de données
- **OU** utilisation d'un outil de test fourni par SaaS Accelerator

### Option 1 : Via le portail admin

1. **Se connecter au portail admin**
2. **Chercher** : Section "Subscriptions" ou "Test"
3. **Créer un mock subscription** (si l'option existe)

### Option 2 : Via la base de données (pour développeurs)

```sql
-- Insérer un abonnement de test (ATTENTION : à adapter selon votre schéma)
INSERT INTO Subscriptions (
    SubscriptionId,
    Name,
    PlanId,
    IsTest,
    SubscriptionStatus,
    CreatedDate
) VALUES (
    'test-subscription-001',
    'Test Subscription',
    'starter',
    1, -- IsTest = true
    'Active',
    GETDATE()
);
```

### Option 3 : Attendre la certification

Pour un véritable test end-to-end :
1. Soumettre l'offre en certification (mode Preview)
2. Acheter un abonnement test depuis Marketplace Preview
3. Tester le flux complet

**Recommandation** : Attendre Phase 3 pour ce test complet.

---

## 📝 Résultats des tests

### Tableau de bord des tests

| # | Test | Statut | Notes |
|---|------|--------|-------|
| 1 | Portail Admin | ⏳ En attente | |
| 2 | Base de données | ⏳ En attente | |
| 3 | Landing Page | ⏳ En attente | |
| 4 | Webhook | ⏳ En attente | |
| 5 | Application Insights | ⏳ En attente | |
| 6 | Abonnement test | ⏳ En attente | Optionnel |

### Statuts possibles

- ⏳ En attente
- ✅ Passé
- ❌ Échoué
- ⏭️ Ignoré

---

## 🔧 Troubleshooting

### Problème : App Service ne démarre pas

**Symptômes** : Erreur 503, timeout, ou page blanche

**Solutions** :
1. Vérifier les logs dans Azure Portal → App Service → Log stream
2. Redémarrer l'App Service
3. Vérifier la configuration (connection strings, app settings)

### Problème : Erreur de connexion à la base de données

**Symptômes** : Erreur 500, "Cannot connect to database"

**Solutions** :
1. Vérifier que le firewall SQL autorise Azure Services
2. Vérifier la connection string dans App Service Configuration
3. Tester la connexion depuis Azure Portal Query Editor

### Problème : Erreur d'authentification

**Symptômes** : Impossible de se connecter au portail admin

**Solutions** :
1. Vérifier que le Tenant ID est correct
2. Vérifier que l'App ID (Client ID) est correct
3. Vérifier que l'utilisateur est dans la liste des Publisher Admins
4. Vérifier les permissions de l'App Registration dans Azure AD

### Problème : Webhook ne répond pas

**Symptômes** : 404 Not Found sur l'endpoint webhook

**Solutions** :
1. Vérifier le déploiement du code (Web Deploy réussi?)
2. Vérifier la route dans le code : `/api/AzureWebhook`
3. Redéployer l'application si nécessaire

---

## ✅ Validation finale

### Critères de succès pour Phase 1.4

Pour considérer Phase 1.4 comme terminée :

- ✅ **Portail admin accessible** et authentification fonctionne
- ✅ **Base de données connectée** et tables créées
- ✅ **Landing page répond** (même avec token invalide)
- ✅ **Webhook endpoint existe** (401/405 acceptables)
- ✅ **Application Insights logge** les requêtes

### Critères optionnels

- ⭐ Abonnement de test créé et fonctionnel
- ⭐ Aucune erreur dans Application Insights
- ⭐ Performance acceptable (<3s de réponse)

---

## 🚀 Prochaines étapes

Une fois Phase 1.4 validée :

1. **Phase 2.1** : Créer le service d'intégration SaaS
   - Connexion à la base de données SaaS Accelerator
   - Méthodes de vérification d'abonnement
   - Tracking d'usage des messages

2. **Phase 2.2** : Modifier l'agent Teams GPT
   - Middleware de vérification d'abonnement
   - Handler de messages avec tracking
   - Gestion des limites par plan

3. **Phase 2.3** : Étendre le modèle de données
   - Colonnes TeamsUserId et TeamsConversationId
   - Table de logs de messages (optionnel)

---

**Date** : 30 octobre 2025  
**Phase** : 1.4 - Test de l'infrastructure  
**Statut** : 🟡 En cours
