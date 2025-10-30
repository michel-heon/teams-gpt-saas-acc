# Spécifications techniques SaaS Marketplace (Approche alternative)

> 🚨 **IMPORTANT - DOCUMENT DE RÉFÉRENCE SEULEMENT**
> 
> Ce document décrit l'approche technique "from scratch" à des fins de **référence et documentation technique complète**.
>
> ✅ **APPROCHE RETENUE POUR CE PROJET** : [SaaS Accelerator Microsoft](./saas-accelerator-integration.md)
> - Réduction du temps de développement : 6+ mois → 4 semaines  
> - Réutilisation de 80% de l'infrastructure Microsoft existante
> - Maintenance et updates automatiques
> - Certification Marketplace garantie
>
> ⚠️ Les spécifications ci-dessous sont conservées pour documentation technique et comparaison des approches.

## Vue d'ensemble technique (approche "from scratch")

Ce document détaille les spécifications techniques complètes si le projet était développé entièrement from scratch, sans utiliser le SaaS Accelerator Microsoft.

## Architecture technique détaillée

### Composants principaux

#### 1. Teams Bot Agent (Modifié)

**Fichiers modifiés :**

- `src/app/app.js` - Agent principal avec tracking d'usage
- `src/middleware/subscriptionCheck.js` - Vérification d'abonnement
- `src/services/usageTracker.js` - Comptabilisation des messages

**Nouvelles dépendances :**

```json
{
  "dependencies": {
    "@azure/service-bus": "^7.9.4",
    "@azure/identity": "^4.11.1",
    "mssql": "^10.0.2",
    "axios": "^1.6.8",
    "@azure/keyvault-secrets": "^4.8.0"
  }
}
```

#### 2. Landing Page SaaS

**Structure :**

```
marketplace-integration/
├── landing-page/
│   ├── app.js                    # Express server
│   ├── package.json
│   ├── views/
│   │   ├── landing.hbs          # Page d'atterrissage
│   │   ├── activate.hbs         # Activation d'abonnement
│   │   ├── success.hbs          # Confirmation
│   │   └── error.hbs            # Gestion d'erreurs
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── services/
│       ├── marketplaceService.js
│       └── subscriptionService.js
```

**Configuration requise :**

```javascript
// Configuration environment
const config = {
    port: process.env.PORT || 3000,
    database: {
        connectionString: process.env.SQL_CONNECTION_STRING
    },
    azureAd: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        tenantId: process.env.AZURE_TENANT_ID
    },
    marketplace: {
        fulfillmentApiUrl: 'https://marketplaceapi.microsoft.com/api',
        meteringApiUrl: 'https://marketplaceapi.microsoft.com/api',
        apiVersion: '2018-08-31'
    }
};
```

#### 3. Webhook Handler

**Endpoints requis :**

- `POST /webhook` - Réception des événements Marketplace
- `POST /webhook/unsubscribe` - Gestion désabonnement
- `POST /webhook/changeplan` - Changement de plan
- `POST /webhook/suspend` - Suspension d'abonnement
- `POST /webhook/reinstate` - Réactivation d'abonnement

#### 4. Admin Portal

**Fonctionnalités :**

- Dashboard d'usage par abonnement
- Gestion des plans tarifaires
- Monitoring des revenus
- Support client intégré
- Analytics d'utilisation

### Base de données - Schéma détaillé

#### Tables principales

```sql
-- Subscriptions - Abonnements Marketplace
CREATE TABLE Subscriptions (
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    AMPSubscriptionId uniqueidentifier UNIQUE NOT NULL,
    PlanId varchar(100) NOT NULL,
    OfferId varchar(100) NOT NULL,
    SubscriptionName varchar(255),
    SubscriptionStatus varchar(50) NOT NULL DEFAULT 'PendingFulfillmentStart',
    
    -- Informations client
    PurchaserEmail varchar(255),
    PurchaserTenantId uniqueidentifier,
    BeneficiaryEmail varchar(255),
    BeneficiaryTenantId uniqueidentifier,
    
    -- Mapping Teams
    TeamsUserId varchar(255),
    TeamsUserPrincipalName varchar(255),
    TeamsTenantId uniqueidentifier,
    
    -- Gestion usage
    MonthlyMessageLimit int NOT NULL,
    UsedMessages int DEFAULT 0,
    LastResetDate datetime2 DEFAULT GETUTCDATE(),
    CurrentBillingPeriodStart datetime2,
    CurrentBillingPeriodEnd datetime2,
    
    -- Audit
    CreatedDate datetime2 NOT NULL DEFAULT GETUTCDATE(),
    ModifiedDate datetime2,
    ActivatedDate datetime2,
    IsActive bit DEFAULT 1,
    
    INDEX IX_Subscriptions_AMPSubscriptionId (AMPSubscriptionId),
    INDEX IX_Subscriptions_TeamsUserId (TeamsUserId),
    INDEX IX_Subscriptions_Status (SubscriptionStatus)
);

-- UsageEvents - Événements d'utilisation détaillés
CREATE TABLE UsageEvents (
    Id bigint IDENTITY(1,1) PRIMARY KEY,
    SubscriptionId uniqueidentifier NOT NULL,
    
    -- Contexte Teams
    ConversationId varchar(255) NOT NULL,
    MessageId varchar(255),
    ActivityId varchar(255),
    
    -- Contenu message
    MessageText nvarchar(max),
    MessageType varchar(100) DEFAULT 'text',
    HasAttachments bit DEFAULT 0,
    AttachmentCount int DEFAULT 0,
    
    -- Réponse IA
    ResponseText nvarchar(max),
    ResponseType varchar(100) DEFAULT 'text',
    TokensUsed int,
    ProcessingTimeMs int,
    
    -- Facturation
    Dimension varchar(100) NOT NULL DEFAULT 'messages',
    UnitPrice decimal(10,4),
    ProcessedForBilling bit DEFAULT 0,
    BillingDate datetime2,
    
    -- Métadonnées
    Timestamp datetime2 NOT NULL DEFAULT GETUTCDATE(),
    UserAgent varchar(500),
    ClientVersion varchar(100),
    
    FOREIGN KEY (SubscriptionId) REFERENCES Subscriptions(Id),
    INDEX IX_UsageEvents_SubscriptionId (SubscriptionId),
    INDEX IX_UsageEvents_Timestamp (Timestamp),
    INDEX IX_UsageEvents_ProcessedForBilling (ProcessedForBilling)
);

-- MeteredUsageReports - Rapports vers Marketplace
CREATE TABLE MeteredUsageReports (
    Id bigint IDENTITY(1,1) PRIMARY KEY,
    SubscriptionId uniqueidentifier NOT NULL,
    
    -- Période de rapportage
    ReportingPeriod date NOT NULL,
    PeriodStart datetime2 NOT NULL,
    PeriodEnd datetime2 NOT NULL,
    
    -- Détails facturation
    Dimension varchar(100) NOT NULL,
    Quantity decimal(18,2) NOT NULL,
    UnitPrice decimal(10,4),
    TotalAmount decimal(18,2),
    
    -- Interaction Marketplace
    MarketplaceRequestId varchar(255),
    MarketplaceCorrelationId varchar(255),
    SubmittedDate datetime2,
    Status varchar(50) NOT NULL DEFAULT 'Pending',
    
    -- Réponse Marketplace
    ResponseStatus int,
    ResponseBody nvarchar(max),
    ErrorCode varchar(100),
    ErrorMessage nvarchar(max),
    
    -- Retry logic
    RetryCount int DEFAULT 0,
    NextRetryDate datetime2,
    MaxRetries int DEFAULT 3,
    
    CreatedDate datetime2 DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (SubscriptionId) REFERENCES Subscriptions(Id),
    INDEX IX_MeteredUsageReports_SubscriptionId (SubscriptionId),
    INDEX IX_MeteredUsageReports_Status (Status),
    INDEX IX_MeteredUsageReports_ReportingPeriod (ReportingPeriod)
);

-- Plans - Définition des plans tarifaires
CREATE TABLE Plans (
    Id int IDENTITY(1,1) PRIMARY KEY,
    PlanId varchar(100) UNIQUE NOT NULL,
    OfferId varchar(100) NOT NULL,
    DisplayName varchar(255) NOT NULL,
    Description nvarchar(max),
    
    -- Limites et tarification
    MonthlyMessageLimit int NOT NULL,
    BasePrice decimal(10,2) NOT NULL,
    Currency varchar(3) DEFAULT 'EUR',
    
    -- Facturation à l'usage
    HasOverage bit DEFAULT 1,
    OveragePrice decimal(10,4),
    OverageDimension varchar(100) DEFAULT 'messages',
    
    -- Fonctionnalités
    HasPremiumFeatures bit DEFAULT 0,
    HasPrioritySupport bit DEFAULT 0,
    HasAnalytics bit DEFAULT 0,
    
    -- Statut
    IsActive bit DEFAULT 1,
    CreatedDate datetime2 DEFAULT GETUTCDATE(),
    
    INDEX IX_Plans_PlanId (PlanId),
    INDEX IX_Plans_OfferId (OfferId)
);

-- SubscriptionOperations - Historique des opérations
CREATE TABLE SubscriptionOperations (
    Id bigint IDENTITY(1,1) PRIMARY KEY,
    SubscriptionId uniqueidentifier NOT NULL,
    OperationId varchar(255),
    
    -- Type d'opération
    OperationType varchar(100) NOT NULL, -- Activate, ChangeQuantity, ChangePlan, Suspend, Unsubscribe
    FromStatus varchar(50),
    ToStatus varchar(50),
    FromPlanId varchar(100),
    ToPlanId varchar(100),
    
    -- Détails
    RequestBody nvarchar(max),
    ResponseBody nvarchar(max),
    ErrorMessage nvarchar(max),
    
    -- Statut
    Status varchar(50) NOT NULL DEFAULT 'Pending', -- Pending, InProgress, Succeeded, Failed
    ProcessedDate datetime2,
    CreatedDate datetime2 DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (SubscriptionId) REFERENCES Subscriptions(Id),
    INDEX IX_SubscriptionOperations_SubscriptionId (SubscriptionId),
    INDEX IX_SubscriptionOperations_OperationType (OperationType)
);
```

### APIs et Services

#### 1. Marketplace Fulfillment Service

```javascript
// src/services/marketplaceFulfillmentService.js
class MarketplaceFulfillmentService {
    constructor(config) {
        this.baseUrl = config.marketplace.fulfillmentApiUrl;
        this.apiVersion = config.marketplace.apiVersion;
        this.credentials = new ClientSecretCredential(
            config.azureAd.tenantId,
            config.azureAd.clientId,
            config.azureAd.clientSecret
        );
    }

    async resolveSubscription(marketplaceToken) {
        const token = await this.getAccessToken();
        const response = await axios.post(`${this.baseUrl}/saas/subscriptions/resolve`, null, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-ms-marketplace-token': marketplaceToken,
                'x-ms-requestid': uuidv4(),
                'x-ms-correlationid': uuidv4()
            },
            params: { 'api-version': this.apiVersion }
        });
        
        return response.data;
    }

    async activateSubscription(subscriptionId, planId) {
        const token = await this.getAccessToken();
        const activationData = {
            planId: planId,
            quantity: 1
        };

        const response = await axios.post(
            `${this.baseUrl}/saas/subscriptions/${subscriptionId}/activate`,
            activationData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-ms-requestid': uuidv4(),
                    'x-ms-correlationid': uuidv4()
                },
                params: { 'api-version': this.apiVersion }
            }
        );

        return response.data;
    }

    async getSubscription(subscriptionId) {
        const token = await this.getAccessToken();
        const response = await axios.get(
            `${this.baseUrl}/saas/subscriptions/${subscriptionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-ms-requestid': uuidv4()
                },
                params: { 'api-version': this.apiVersion }
            }
        );

        return response.data;
    }

    async getAccessToken() {
        const tokenResponse = await this.credentials.getToken([
            'https://marketplaceapi.microsoft.com/.default'
        ]);
        return tokenResponse.token;
    }
}
```

#### 2. Marketplace Metering Service

```javascript
// src/services/marketplaceMeteringService.js
class MarketplaceMeteringService {
    constructor(config) {
        this.baseUrl = config.marketplace.meteringApiUrl;
        this.apiVersion = config.marketplace.apiVersion;
        this.credentials = new ClientSecretCredential(
            config.azureAd.tenantId,
            config.azureAd.clientId,
            config.azureAd.clientSecret
        );
    }

    async submitUsageEvent(usageEvent) {
        const token = await this.getAccessToken();
        
        const meteringData = {
            resourceId: usageEvent.subscriptionId,
            quantity: usageEvent.quantity,
            dimension: usageEvent.dimension,
            effectiveStartTime: usageEvent.timestamp,
            planId: usageEvent.planId
        };

        const response = await axios.post(
            `${this.baseUrl}/metered/usage-event`,
            meteringData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-ms-requestid': uuidv4(),
                    'x-ms-correlationid': uuidv4()
                },
                params: { 'api-version': this.apiVersion }
            }
        );

        return response.data;
    }

    async submitBatchUsageEvents(usageEvents) {
        const token = await this.getAccessToken();
        
        const batchData = {
            request: usageEvents.map(event => ({
                resourceId: event.subscriptionId,
                quantity: event.quantity,
                dimension: event.dimension,
                effectiveStartTime: event.timestamp,
                planId: event.planId
            }))
        };

        const response = await axios.post(
            `${this.baseUrl}/metered/usage-events`,
            batchData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-ms-requestid': uuidv4(),
                    'x-ms-correlationid': uuidv4()
                },
                params: { 'api-version': this.apiVersion }
            }
        );

        return response.data;
    }

    async getAccessToken() {
        const tokenResponse = await this.credentials.getToken([
            'https://marketplaceapi.microsoft.com/.default'
        ]);
        return tokenResponse.token;
    }
}
```

#### 3. Usage Tracking Service avancé

```javascript
// src/services/advancedUsageTracker.js
class AdvancedUsageTracker {
    constructor(database, meteringService, serviceBusClient) {
        this.db = database;
        this.meteringService = meteringService;
        this.serviceBus = serviceBusClient;
    }

    async trackConversationUsage(context, messageData, responseData) {
        const subscription = context.subscription;
        
        // Analyser le type de message pour la facturation
        const usageAnalysis = await this.analyzeMessageForBilling(messageData, responseData);
        
        // Créer l'événement d'usage
        const usageEvent = {
            SubscriptionId: subscription.Id,
            ConversationId: context.activity.conversation.id,
            MessageId: context.activity.id,
            ActivityId: context.activity.channelData?.eventId,
            
            // Contenu
            MessageText: messageData.text,
            MessageType: messageData.type || 'text',
            HasAttachments: messageData.attachments?.length > 0,
            AttachmentCount: messageData.attachments?.length || 0,
            
            // Réponse
            ResponseText: responseData.content,
            ResponseType: responseData.type || 'text',
            TokensUsed: responseData.usage?.total_tokens || 0,
            ProcessingTimeMs: responseData.processingTime,
            
            // Facturation
            Dimension: usageAnalysis.dimension,
            UnitPrice: usageAnalysis.unitPrice,
            
            // Métadonnées
            UserAgent: context.activity.channelData?.clientInfo?.userAgent,
            ClientVersion: context.activity.channelData?.clientInfo?.version
        };

        // Enregistrer en base
        await this.saveUsageEvent(usageEvent);
        
        // Mettre à jour le compteur d'abonnement
        await this.updateSubscriptionUsage(subscription.Id, usageAnalysis.quantity);
        
        // Programmer le rapportage asynchrone
        await this.scheduleUsageReporting(usageEvent, usageAnalysis.quantity);
        
        return usageEvent;
    }

    async analyzeMessageForBilling(messageData, responseData) {
        let dimension = 'messages';
        let quantity = 1;
        let unitPrice = 0.01; // Prix de base par message

        // Logique de classification avancée
        if (messageData.attachments?.length > 0) {
            dimension = 'premium_messages';
            unitPrice = 0.02;
        } else if (messageData.text?.length > 1000) {
            dimension = 'premium_messages';
            unitPrice = 0.015;
        } else if (responseData.usage?.total_tokens > 2000) {
            dimension = 'premium_messages';
            unitPrice = 0.015;
        }

        // Messages complexes avec beaucoup de tokens
        if (responseData.usage?.total_tokens > 5000) {
            quantity = Math.ceil(responseData.usage.total_tokens / 2000);
        }

        return {
            dimension,
            quantity,
            unitPrice,
            complexity: this.calculateComplexity(messageData, responseData)
        };
    }

    async scheduleUsageReporting(usageEvent, quantity) {
        const reportingMessage = {
            subscriptionId: usageEvent.SubscriptionId,
            dimension: usageEvent.Dimension,
            quantity: quantity,
            timestamp: new Date().toISOString(),
            usageEventId: usageEvent.Id,
            planId: await this.getPlanId(usageEvent.SubscriptionId)
        };

        // Envoyer vers Service Bus pour traitement asynchrone
        await this.serviceBus.sendMessage('usage-reporting-queue', reportingMessage);
    }

    async processUsageReporting(message) {
        try {
            // Grouper les événements par heure pour optimiser les appels API
            const hourlyUsage = await this.aggregateHourlyUsage(
                message.subscriptionId,
                message.dimension,
                new Date(message.timestamp)
            );

            if (hourlyUsage.quantity >= 10) { // Seuil pour rapportage
                await this.meteringService.submitUsageEvent({
                    subscriptionId: message.subscriptionId,
                    dimension: message.dimension,
                    quantity: hourlyUsage.quantity,
                    timestamp: hourlyUsage.periodStart,
                    planId: message.planId
                });

                // Marquer comme rapporté
                await this.markUsageAsReported(hourlyUsage.eventIds);
            }
        } catch (error) {
            console.error('Usage reporting failed:', error);
            throw error;
        }
    }
}
```

### Configuration Infrastructure

#### Azure Resources (ARM Template)

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "projectName": {
            "type": "string",
            "defaultValue": "teams-gpt-saas"
        },
        "environment": {
            "type": "string",
            "defaultValue": "prod",
            "allowedValues": ["dev", "staging", "prod"]
        }
    },
    "variables": {
        "resourcePrefix": "[concat(parameters('projectName'), '-', parameters('environment'))]",
        "sqlServerName": "[concat(variables('resourcePrefix'), '-sql')]",
        "sqlDatabaseName": "[concat(variables('resourcePrefix'), '-db')]",
        "appServicePlanName": "[concat(variables('resourcePrefix'), '-asp')]",
        "webAppName": "[concat(variables('resourcePrefix'), '-web')]",
        "landingPageAppName": "[concat(variables('resourcePrefix'), '-landing')]",
        "adminAppName": "[concat(variables('resourcePrefix'), '-admin')]",
        "keyVaultName": "[concat(variables('resourcePrefix'), '-kv')]",
        "serviceBusNamespace": "[concat(variables('resourcePrefix'), '-sb')]",
        "applicationInsightsName": "[concat(variables('resourcePrefix'), '-ai')]"
    },
    "resources": [
        {
            "type": "Microsoft.Sql/servers",
            "apiVersion": "2021-02-01-preview",
            "name": "[variables('sqlServerName')]",
            "location": "[resourceGroup().location]",
            "properties": {
                "administratorLogin": "dbadmin",
                "administratorLoginPassword": "[parameters('sqlAdminPassword')]"
            }
        },
        {
            "type": "Microsoft.Web/serverfarms",
            "apiVersion": "2021-02-01",
            "name": "[variables('appServicePlanName')]",
            "location": "[resourceGroup().location]",
            "sku": {
                "name": "P1v3",
                "tier": "PremiumV3",
                "size": "P1v3",
                "family": "Pv3",
                "capacity": 1
            },
            "kind": "linux",
            "properties": {
                "reserved": true
            }
        }
    ]
}
```

### Monitoring et Alertes

#### Application Insights Configuration

```javascript
// src/monitoring/telemetry.js
const appInsights = require('applicationinsights');

class TelemetryService {
    constructor(instrumentationKey) {
        appInsights.setup(instrumentationKey)
            .setAutoDependencyCorrelation(true)
            .setAutoCollectRequests(true)
            .setAutoCollectPerformance(true, true)
            .setAutoCollectExceptions(true)
            .setAutoCollectDependencies(true)
            .setAutoCollectConsole(true)
            .setUseDiskRetryCaching(true)
            .start();
            
        this.client = appInsights.defaultClient;
    }

    trackSubscriptionEvent(eventName, subscription, properties = {}) {
        this.client.trackEvent({
            name: eventName,
            properties: {
                subscriptionId: subscription.Id,
                planId: subscription.PlanId,
                subscriptionStatus: subscription.SubscriptionStatus,
                ...properties
            }
        });
    }

    trackUsageEvent(usage) {
        this.client.trackEvent({
            name: 'MessageProcessed',
            properties: {
                subscriptionId: usage.SubscriptionId,
                dimension: usage.Dimension,
                tokensUsed: usage.TokensUsed.toString(),
                processingTime: usage.ProcessingTimeMs.toString()
            },
            measurements: {
                tokensUsed: usage.TokensUsed,
                processingTime: usage.ProcessingTimeMs
            }
        });
    }

    trackMarketplaceCall(operation, success, responseTime, error = null) {
        this.client.trackDependency({
            name: 'MarketplaceAPI',
            data: operation,
            duration: responseTime,
            success: success,
            resultCode: success ? 200 : 500
        });

        if (error) {
            this.client.trackException({
                exception: error,
                properties: {
                    operation: operation
                }
            });
        }
    }
}
```

### Sécurité et Conformité

#### Configuration Key Vault

```javascript
// src/security/secretsManager.js
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

class SecretsManager {
    constructor(keyVaultUrl) {
        const credential = new DefaultAzureCredential();
        this.client = new SecretClient(keyVaultUrl, credential);
        this.cache = new Map();
        this.cacheExpiry = new Map();
    }

    async getSecret(secretName) {
        // Vérifier le cache
        if (this.cache.has(secretName)) {
            const expiry = this.cacheExpiry.get(secretName);
            if (Date.now() < expiry) {
                return this.cache.get(secretName);
            }
        }

        // Récupérer du Key Vault
        const secret = await this.client.getSecret(secretName);
        
        // Mettre en cache pour 5 minutes
        this.cache.set(secretName, secret.value);
        this.cacheExpiry.set(secretName, Date.now() + (5 * 60 * 1000));
        
        return secret.value;
    }

    async getMarketplaceCredentials() {
        return {
            clientId: await this.getSecret('marketplace-client-id'),
            clientSecret: await this.getSecret('marketplace-client-secret'),
            tenantId: await this.getSecret('marketplace-tenant-id')
        };
    }
}
```

Cette spécification technique couvre tous les aspects nécessaires pour implémenter une solution SaaS Marketplace robuste avec facturation basée sur l'usage des messages.