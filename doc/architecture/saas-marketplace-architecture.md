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

#### 1.2 SaaS Accelerator Components (fournis par Microsoft)

> ✅ **Avec SaaS Accelerator** : Ces composants sont automatiquement déployés, **aucun développement requis**

```
Commercial-Marketplace-SaaS-Accelerator/
├── CustomerSite/                    # Landing page (✅ Fournie)
│   ├── Controllers/                 # Contrôleurs MVC
│   ├── Views/                       # Pages Razor
│   └── wwwroot/                    # Assets statiques
├── AdminSite/                      # Portail admin (✅ Fourni)
│   ├── Controllers/                 # Gestion abonnements
│   ├── Views/                       # Interface administration
│   └── Services/                    # Services métier
├── Services/                        # APIs Marketplace (✅ Fournies)
│   ├── SaaSFulfillmentAPIService/   # Fulfillment API
│   └── MeteredBillingAPIService/    # Metering API
└── WebHook/                        # Webhooks handlers (✅ Fournis)
    ├── Controllers/                 # Gestionnaires d'événements
    └── Handlers/                   # Logique métier
```

**🔧 Seule modification nécessaire** : Intégration avec l'agent Teams GPT existant

### 2. Intégration Azure Marketplace (via SaaS Accelerator)

> ✅ **Avec SaaS Accelerator** : Toute l'intégration Marketplace est **automatiquement gérée**

#### 2.1 SaaS Fulfillment API (✅ Intégrée dans SaaS Accelerator)
- **Subscription Management** : Cycles de vie automatiquement gérés
- **Plan Management** : Plans configurés via Partner Center  
- **Webhook Processing** : Événements traités automatiquement

#### 2.2 Marketplace Metering API (✅ Intégrée dans SaaS Accelerator)  
- **Usage Reporting** : Rapportage automatique via MeteredTriggerJob
- **Billing Dimensions** : Dimensions configurées (`standard-message`, `premium-message`)
- **Batch Processing** : Traitement automatique des événements d'usage

**🔧 Seule action requise** : Envoyer les données d'usage à la table `MeteredAuditLogs` du SaaS Accelerator

### 3. Modèle de données (SaaS Accelerator)

> ✅ **Avec SaaS Accelerator** : Schéma de base déjà créé, **extensions minimales requises**

#### 3.1 Tables SaaS Accelerator existantes (à utiliser)

**Table `Subscriptions` (existante)** - Gestion des abonnements
```sql
-- Déjà créée par SaaS Accelerator
-- Extensions nécessaires :
ALTER TABLE Subscriptions ADD TeamsUserId NVARCHAR(255);
ALTER TABLE Subscriptions ADD TeamsConversationId NVARCHAR(255);
CREATE INDEX IX_Subscriptions_TeamsUserId ON Subscriptions(TeamsUserId);
```

**Table `MeteredAuditLogs` (existante)** - Logs d'usage pour facturation
```sql
-- Déjà créée par SaaS Accelerator, utilisée pour tracking d'usage
-- Structure existante :
-- Id, SubscriptionId, RequestJson, ResponseJson, 
-- StatusCode, CreatedDate, etc.
```

#### 3.2 Table optionnelle (si logs détaillés nécessaires)

```sql  
-- Table optionnelle pour logs détaillés des conversations Teams
CREATE TABLE TeamsMessageLogs (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    SubscriptionId UNIQUEIDENTIFIER NOT NULL,
    TeamsUserId NVARCHAR(255) NOT NULL,
    MessageText NVARCHAR(MAX),
    ResponseText NVARCHAR(MAX),
    MessageType VARCHAR(50) NOT NULL, -- 'standard' ou 'premium'
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ProcessingTimeMs INT,
    FOREIGN KEY (SubscriptionId) REFERENCES Subscriptions(Id)
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

### 5. Workflow de facturation (simplifié avec SaaS Accelerator)

> ✅ **Avec SaaS Accelerator** : Rapportage automatique vers Marketplace via `MeteredTriggerJob`

#### 5.1 Tracking d'usage Teams GPT (seule partie à implémenter)

```javascript
// src/services/saasIntegration.js
class SaaSIntegrationService {
    async trackMessageUsage(subscriptionId, messageData) {
        const messageType = this.classifyMessage(messageData);
        const dimension = messageType === 'premium' ? 'premium-message' : 'standard-message';
        
        // Enregistrer dans la table SaaS Accelerator pour rapportage automatique
        const usageLog = {
            SubscriptionId: subscriptionId,
            RequestJson: JSON.stringify({
                dimension: dimension,
                quantity: 1,
                effectiveStartTime: new Date().toISOString(),
                messageText: messageData.text?.substring(0, 100), // Truncated for privacy
                timestamp: new Date().toISOString()
            }),
            StatusCode: '200',
            CreatedDate: new Date()
        };
        
        // Insertion dans MeteredAuditLogs - le SaaS Accelerator se charge du reste
        await this.db.insert('MeteredAuditLogs', usageLog);
    }
    
    classifyMessage(messageData) {
        if (messageData.attachments?.length > 0 || messageData.text?.length > 1000) {
            return 'premium';
        }
        return 'standard';
    }
}
```

#### 5.2 Rapportage automatique (géré par SaaS Accelerator)

Le **MeteredTriggerJob** du SaaS Accelerator se charge automatiquement de :

- ✅ Lire les entrées de `MeteredAuditLogs`
- ✅ Agréger les données par dimension et période  
- ✅ Appeler l'API Marketplace Metering
- ✅ Gérer les erreurs et retry automatique
- ✅ Marquer les entrées comme traitées

**🎯 Résultat** : Facturation automatique sans code additionnel

### 6. Infrastructure Azure (simplifiée avec SaaS Accelerator)

> ✅ **Avec SaaS Accelerator** : Infrastructure automatiquement provisionnée

#### 6.1 Composants fournis par SaaS Accelerator

- ✅ **App Service Plans** - CustomerSite, AdminSite, WebHook
- ✅ **SQL Database** - Schema complet avec tables marketplace
- ✅ **Key Vault** - Gestion automatique des secrets  
- ✅ **Application Insights** - Monitoring intégré
- ✅ **Service Bus** - Queue pour traitement asynchrone
- ✅ **Azure Functions** - MeteredTriggerJob pour facturation

#### 6.2 Configuration Teams GPT (seule extension requise)

```json
{
    "SaaSAccelerator": {
        "DatabaseConnection": "[SAAS_ACCELERATOR_DB_CONNECTION_STRING]",
        "ApiBaseUrl": "https://your-saas-accelerator.azurewebsites.net"
    },
    "TeamsBot": {
        "MicrosoftAppId": "[BOT_APP_ID]",
        "MicrosoftAppPassword": "[BOT_APP_PASSWORD]"
    },
    "AzureOpenAI": {
        "Endpoint": "[AZURE_OPENAI_ENDPOINT]",
        "ApiKey": "[AZURE_OPENAI_KEY]"
    }
}
```

### 7. Flux de données avec SaaS Accelerator

> ✅ **Avantage SaaS Accelerator** : Gestion automatique des abonnements et facturation

#### 7.1 Cycle de conversation Teams GPT

1. **Message reçu** dans Teams
2. **API call** vers SaaS Accelerator pour vérifier l'abonnement
3. **Traitement IA** du message (Azure OpenAI)
4. **Usage logging** dans la base SaaS Accelerator
5. **Facturation automatique** via MeteredTriggerJob

#### 7.2 Gestion des abonnements (automatisée)

✅ **Fourni par SaaS Accelerator** :

- Landing page avec activation automatique
- Webhooks Marketplace configurés
- API Fulfillment intégrée
- Metering API avec rapportage automatique

### 8. Monitoring (intégré SaaS Accelerator)

#### 8.1 Métriques disponibles

- ✅ **Dashboard admin** : Abonnements actifs, revenus, usage
- ✅ **Application Insights** : Performance et erreurs
- 🆕 **Teams GPT** : Messages traités, tokens consommés

#### 8.2 Alertes configurées

- ✅ **SaaS Accelerator** : Échecs de facturation, webhook errors
- 🆕 **Teams GPT** : Quotas dépassés, erreurs OpenAI

### 9. Plan de déploiement simplifié

#### 9.1 Phase 1 - Déploiement SaaS Accelerator (1 semaine)

- ✅ Installation automatisée via template
- ✅ Infrastructure Azure complète provisionnée

#### 9.2 Phase 2 - Intégration Teams GPT (1 semaine)

- 🆕 Connexion à la base SaaS Accelerator
- 🆕 Middleware de vérification d'abonnement
- 🆕 API logging d'usage

#### 9.3 Phase 3 - Configuration Marketplace (2 semaines)

- ✅ Offre configurée avec SaaS Accelerator
- 🆕 Tests end-to-end avec Teams

### 10. Sécurité (héritée du SaaS Accelerator)

#### 10.1 Protection des données

- ✅ **Chiffrement** : TLS/SSL + Azure Key Vault
- ✅ **Conformité RGPD** : Templates inclus
- ✅ **Audit trail** : Logs automatiques

#### 10.2 Authentification

- ✅ **Azure AD** : Intégration native
- ✅ **RBAC** : Rôles prédéfinis (Admin, Customer)
- 🆕 **Teams Auth** : Microsoft Graph API

### 11. Coûts optimisés avec SaaS Accelerator

#### 11.1 Infrastructure mensuelle

- ✅ **SaaS Accelerator** : ~100€/mois (3 App Services + SQL + Key Vault)
- 🆕 **Teams GPT** : ~50€/mois (App Service + Application Insights)
- **Total infrastructure** : ~150€/mois

#### 11.2 Coûts variables

- **Azure OpenAI** : 0,002€ per 1K tokens (~5€ pour 1000 messages)
- **Revenus potentiels** : 10-50€/utilisateur/mois selon le plan

## Conclusion

Cette architecture, basée sur le **Microsoft Commercial Marketplace SaaS Accelerator**, garantit :

- ✅ **Développement accéléré** : 80% du code déjà fourni
- ✅ **Conformité marketplace** : Templates certifiés Microsoft
- ✅ **Facturation automatique** : Metering API intégré
- ✅ **Sécurité enterprise** : Azure AD + Key Vault
- 🆕 **Focus métier** : Concentration sur la valeur ajoutée Teams GPT

**Temps de mise sur le marché** : 4 semaines au lieu de 6+ mois de développement from scratch.
