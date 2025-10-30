# Architecture SaaS Marketplace - Teams GPT Agent

> ⚠️ **Note importante** : Ce document décrit l'architecture complète "from scratch". **L'approche recommandée** est l'utilisation du [SaaS Accelerator Microsoft](./saas-accelerator-integration.md) qui simplifie grandement l'implémentation.

## Vue d'ensemble

Ce document décrit l'architecture complète pour transformer le projet Teams GPT SaaS Agent en solution SaaS transactionnelle sur l'Azure Marketplace. La facturation sera basée sur le nombre de messages échangés avec l'agent IA.

## Architecture actuelle

### Composants existants
- **Teams App** : Application Microsoft Teams avec agent IA
- **Bot Service** : Bot Framework pour les interactions Teams
- **OpenAI Integration** : Intégration Azure OpenAI pour le traitement des messages
- **Storage** : Stockage local pour l'historique des conversations

### Technologies utilisées
- Node.js 20/22
- Microsoft Teams AI Library 2.0
- Azure OpenAI
- Azure Identity (Managed Identity)

## Architecture cible SaaS Marketplace

### 1. Composants principaux

#### 1.1 Application Teams GPT (existante - à étendre)
```
teams-gpt-saas-acc/
├── src/
│   ├── app/
│   │   ├── app.js                    # Agent principal (à modifier)
│   │   └── instructions.txt          # Instructions IA
│   ├── services/                     # Nouveaux services
│   │   ├── meteringService.js        # Service de comptabilisation
│   │   ├── subscriptionService.js    # Gestion des abonnements
│   │   └── usageTracker.js          # Tracker d'utilisation
│   ├── middleware/                   # Nouveaux middlewares
│   │   ├── subscriptionCheck.js     # Vérification d'abonnement
│   │   └── usageLimit.js           # Contrôle des limites
│   └── config.js                    # Configuration (à étendre)
```

#### 1.2 Marketplace Components (à créer)
```
marketplace-integration/
├── landing-page/                     # Page d'atterrissage
│   ├── app.js                       # Application Express
│   ├── views/                       # Templates HTML
│   └── public/                      # Assets statiques
├── admin-portal/                    # Portail administrateur
│   ├── app.js                       # Application Express
│   ├── views/                       # Interface admin
│   └── controllers/                 # Contrôleurs admin
└── webhook-handler/                 # Gestionnaire de webhooks
    ├── app.js                       # Service webhook
    └── handlers/                    # Handlers spécifiques
```

### 2. Intégration Azure Marketplace

#### 2.1 SaaS Fulfillment API Integration
- **Subscription Management** : Gestion des cycles de vie des abonnements
- **Plan Management** : Gestion des différents plans tarifaires
- **Webhook Processing** : Traitement des événements marketplace

#### 2.2 Marketplace Metering API Integration
- **Usage Reporting** : Rapport d'utilisation basé sur les messages
- **Billing Dimensions** : Dimensions de facturation personnalisées
- **Batch Processing** : Traitement par lots des événements d'usage

### 3. Modèle de données

#### 3.1 Tables principales
```sql
-- Subscriptions
CREATE TABLE Subscriptions (
    Id uniqueidentifier PRIMARY KEY,
    AMPSubscriptionId uniqueidentifier NOT NULL,
    PlanId varchar(100) NOT NULL,
    SubscriptionStatus varchar(50) NOT NULL,
    TeamsUserPrincipalName varchar(255),
    TenantId uniqueidentifier,
    CreatedDate datetime NOT NULL,
    ModifiedDate datetime,
    MonthlyMessageLimit int,
    UsedMessages int DEFAULT 0,
    BillingPeriodStart datetime,
    BillingPeriodEnd datetime
);

-- Usage Events
CREATE TABLE UsageEvents (
    Id bigint IDENTITY(1,1) PRIMARY KEY,
    SubscriptionId uniqueidentifier NOT NULL,
    MessageId uniqueidentifier NOT NULL,
    MessageText nvarchar(max),
    ResponseText nvarchar(max),
    TokenCount int,
    Timestamp datetime NOT NULL,
    ProcessedForBilling bit DEFAULT 0,
    MeterDimension varchar(100) NOT NULL,
    FOREIGN KEY (SubscriptionId) REFERENCES Subscriptions(Id)
);

-- Metered Usage Logs
CREATE TABLE MeteredUsageLogs (
    Id bigint IDENTITY(1,1) PRIMARY KEY,
    SubscriptionId uniqueidentifier NOT NULL,
    UsageDate datetime NOT NULL,
    Dimension varchar(100) NOT NULL,
    Quantity decimal(18,2) NOT NULL,
    MarketplaceRequestId varchar(255),
    Status varchar(50) NOT NULL,
    ErrorMessage nvarchar(max),
    CreatedDate datetime DEFAULT GETDATE()
);
```

#### 3.2 Dimensions de facturation
- **Messages** : Nombre de messages traités (dimension principale)
- **Premium_Messages** : Messages avec fonctionnalités avancées
- **API_Calls** : Appels API externes supplémentaires

### 4. Plans tarifaires proposés

#### 4.1 Plan Starter
- **Prix** : 9.99€/mois
- **Messages inclus** : 1,000 messages/mois
- **Messages supplémentaires** : 0.01€/message
- **Support** : Email

#### 4.2 Plan Professional
- **Prix** : 49.99€/mois
- **Messages inclus** : 10,000 messages/mois
- **Messages supplémentaires** : 0.008€/message
- **Support** : Email + Chat

#### 4.3 Plan Enterprise
- **Prix** : 199.99€/mois
- **Messages inclus** : 50,000 messages/mois
- **Messages supplémentaires** : 0.005€/message
- **Support** : Premium
- **Fonctionnalités** : Analytics avancées

### 5. Workflow de facturation

#### 5.1 Comptabilisation des messages
```javascript
// Middleware de comptabilisation
async function trackMessageUsage(context, next) {
    const subscription = await getActiveSubscription(context.activity.from.id);
    
    if (!subscription) {
        await context.sendActivity('Aucun abonnement actif trouvé.');
        return;
    }

    // Vérifier les limites
    if (subscription.usedMessages >= subscription.monthlyMessageLimit) {
        const overageAllowed = await checkOveragePolicy(subscription);
        if (!overageAllowed) {
            await context.sendActivity('Limite de messages atteinte pour ce mois.');
            return;
        }
    }

    // Traitement du message
    await next();

    // Enregistrer l'usage
    await recordMessageUsage(subscription.id, {
        messageText: context.activity.text,
        timestamp: new Date(),
        dimension: 'messages'
    });
}
```

#### 5.2 Rapportage vers Azure Marketplace
```javascript
// Service de rapportage d'usage
class MarketplaceMeteringService {
    async reportUsage(subscriptionId, dimension, quantity, timestamp) {
        const usageEvent = {
            resourceId: subscriptionId,
            dimension: dimension,
            quantity: quantity,
            effectiveStartTime: timestamp,
            planId: await this.getPlanId(subscriptionId)
        };

        return await this.marketplaceClient.submitUsageEvent(usageEvent);
    }

    async batchReportUsage() {
        const pendingUsage = await this.getPendingUsageEvents();
        const batches = this.createBatches(pendingUsage, 25);

        for (const batch of batches) {
            await this.marketplaceClient.submitBatchUsageEvents(batch);
        }
    }
}
```

### 6. Infrastructure Azure

#### 6.1 Composants requis
- **App Service Plan** : Hébergement des applications web
- **SQL Database** : Base de données des abonnements et usage
- **Key Vault** : Stockage sécurisé des secrets
- **Application Insights** : Monitoring et télémétrie
- **Service Bus** : Queue pour le traitement asynchrone
- **Azure Functions** : Traitement des tâches programmées

#### 6.2 Configuration sécurisée
```json
{
    "AzureAd": {
        "Instance": "https://login.microsoftonline.com/",
        "TenantId": "[TENANT_ID]",
        "ClientId": "[CLIENT_ID]",
        "ClientSecret": "[CLIENT_SECRET]"
    },
    "MarketplaceApi": {
        "FulfillmentApiBaseUrl": "https://marketplaceapi.microsoft.com/api",
        "MeteringApiBaseUrl": "https://marketplaceapi.microsoft.com/api",
        "ApiVersion": "2018-08-31"
    },
    "Database": {
        "ConnectionString": "[SQL_CONNECTION_STRING]"
    },
    "TeamsBot": {
        "MicrosoftAppId": "[BOT_APP_ID]",
        "MicrosoftAppPassword": "[BOT_APP_PASSWORD]"
    }
}
```

### 7. Flux de données

#### 7.1 Cycle de vie d'une conversation
1. **Message reçu** dans Teams
2. **Vérification d'abonnement** via middleware
3. **Contrôle des limites** d'usage
4. **Traitement IA** du message
5. **Enregistrement de l'usage** en base
6. **Rapportage asynchrone** vers Marketplace

#### 7.2 Gestion des abonnements
1. **Customer lands** sur la page d'atterrissage
2. **Subscription activation** via Fulfillment API
3. **Teams app installation** avec configuration
4. **Usage tracking** démarré automatiquement
5. **Monthly billing** via Metering API

### 8. Monitoring et observabilité

#### 8.1 Métriques clés
- Nombre de messages traités par abonnement
- Latence de réponse de l'agent IA
- Taux d'erreur des appels Marketplace
- Usage par dimension de facturation
- Revenus générés par plan

#### 8.2 Alertes configurées
- Échec de rapportage d'usage
- Abonnements approchant des limites
- Erreurs critiques dans l'agent
- Performance dégradée

### 9. Plan de déploiement

#### 9.1 Phase 1 - Infrastructure de base
- Création des ressources Azure
- Configuration de la base de données
- Déploiement des APIs Marketplace

#### 9.2 Phase 2 - Intégration Teams
- Modification de l'agent existant
- Implémentation du tracking d'usage
- Tests d'intégration

#### 9.3 Phase 3 - Marketplace
- Configuration de l'offre Marketplace
- Tests de bout en bout
- Déploiement en production

### 10. Considérations de sécurité

#### 10.1 Protection des données
- Chiffrement des données sensibles
- Conformité RGPD pour les données utilisateur
- Audit trail des actions critiques

#### 10.2 Authentification et autorisation
- Azure AD pour l'authentification
- RBAC pour l'accès aux ressources
- Secrets management via Key Vault

### 11. Estimation des coûts

#### 11.1 Infrastructure mensuelle (estimation)
- App Service Plan (P1v3) : ~75€
- SQL Database (S2) : ~30€
- Application Insights : ~15€
- Service Bus : ~5€
- **Total infrastructure** : ~125€/mois

#### 11.2 Coûts variables
- Azure OpenAI : basé sur l'usage réel
- Stockage : négligeable pour ce cas d'usage

Cette architecture garantit une solution SaaS robuste, évolutive et conforme aux exigences d'Azure Marketplace, avec une facturation transparente basée sur l'usage réel des messages.