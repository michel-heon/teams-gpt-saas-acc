# Plan d'implémentation SaaS Marketplace

## Transformation Teams GPT Agent avec SaaS Accelerator

**Approche** : Utilisation du Microsoft Commercial Marketplace SaaS Accelerator pour réduire le temps de développement de 12 semaines à 4 semaines.

**Architecture** : Intégration hybride entre Teams GPT Agent existant et SaaS Accelerator Microsoft.

## Timeline de 4 semaines

Correspond aux issues GitHub #2, #3, #4, #5.

### Phase 1 : Déploiement SaaS Accelerator (Semaine 1)

**Référence** : [Issue GitHub #2](https://github.com/michel-heon/teams-gpt-saas-acc/issues/2)

**Objectif** : Déployer et configurer le Microsoft Commercial Marketplace SaaS Accelerator.

#### 1.1 Configuration Azure

```bash
# Création du groupe de ressources principal
az group create --name rg-teams-gpt-saas --location "West Europe"

# Configuration pour SaaS Accelerator
az group create --name rg-saas-accelerator --location "West Europe"
```

#### 1.2 Déploiement SaaS Accelerator

- **Clonage du repository Microsoft**

```bash
git clone https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator.git
cd Commercial-Marketplace-SaaS-Accelerator
```

- **Déploiement via ARM templates**
  - Configuration des paramètres dans `deploy/Parameters.json`
  - Déploiement de l'infrastructure complète
  - Configuration des services Azure (SQL Database, App Services, Key Vault)

#### 1.3 Configuration de base

- **Base de données SaaS Accelerator**
  - Schéma automatiquement créé
  - Configuration des plans de pricing
  - Setup des dimensions de mesure

- **Applications Web**
  - Landing page (CustomerSite)
  - Portail admin (AdminSite)
  - API Webhook pour Marketplace

#### 1.4 Tests de connectivité

- Vérification du déploiement
- Test des endpoints web
- Validation de la configuration

### Phase 2 : Intégration Teams GPT avec SaaS Accelerator (Semaine 2)

**Référence** : [Issue GitHub #3](https://github.com/michel-heon/teams-gpt-saas-acc/issues/3)

**Objectif** : Modifier l'agent Teams GPT existant pour intégrer le tracking d'usage et se connecter au SaaS Accelerator.

#### 2.1 Création du service d'intégration SaaS

```javascript
// src/services/saasIntegration.js - NOUVEAU FICHIER
class SaaSIntegrationService {
    constructor() {
        this.connectionString = process.env.SAAS_ACCELERATOR_DB_CONNECTION;
        this.meteringApiUrl = process.env.MARKETPLACE_METERING_API_URL;
    }

    async getActiveSubscription(teamsUserId) {
        const query = `
            SELECT s.*, p.MonthlyQuota, p.PricePerMessage 
            FROM Subscriptions s
            JOIN Plans p ON s.PlanId = p.PlanId
            WHERE s.TeamsUserId = @teamsUserId 
            AND s.SubscriptionStatus = 'Subscribed'
            AND s.IsActive = 1`;
        
        return await this.executeQuery(query, { teamsUserId });
    }

    async trackMessageUsage(subscriptionId, messageData) {
        const messageType = this.classifyMessage(messageData);
        const dimension = messageType === 'premium' ? 'premium-message' : 'standard-message';
        
        await this.logUsageEvent(subscriptionId, dimension, 1, messageData);
        return await this.checkMessageLimit(subscriptionId);
    }

    classifyMessage(messageData) {
        if (messageData.attachments?.length > 0 || messageData.text?.length > 1000) {
            return 'premium';
        }
        return 'standard';
    }
}
```

#### 2.2 Modification de l'agent Teams

```javascript
// src/app/app.js - MODIFICATIONS
const { SaaSIntegrationService } = require('../services/saasIntegration');

// Middleware de vérification d'abonnement
app.use(async (context, next) => {
    const saasService = new SaaSIntegrationService();
    const teamsUserId = context.activity.from.id;
    
    const subscription = await saasService.getActiveSubscription(teamsUserId);
    
    if (!subscription) {
        await context.sendActivity("🚫 Abonnement requis. Rendez-vous sur Azure Marketplace.");
        return;
    }
    
    const limitCheck = await saasService.checkMessageLimit(subscription.Id);
    if (limitCheck.limitExceeded) {
        await context.sendActivity(`⚠️ Limite mensuelle atteinte (${subscription.MonthlyQuota} messages).`);
        return;
    }
    
    context.subscription = subscription;
    await next();
});

// Handler de messages modifié
app.message(async (context, state) => {
    try {
        const saasService = new SaaSIntegrationService();
        
        const response = await processGPTMessage(context.activity.text);
        
        await saasService.trackMessageUsage(context.subscription.Id, {
            text: context.activity.text,
            attachments: context.activity.attachments,
            response: response,
            timestamp: new Date()
        });
        
        await context.sendActivity(response);
        
    } catch (error) {
        console.error('Error processing message:', error);
        await context.sendActivity("Désolé, une erreur est survenue.");
    }
});
```

#### 2.3 Extension du modèle de données

```sql
-- Ajouts à la table Subscriptions du SaaS Accelerator
ALTER TABLE Subscriptions ADD TeamsUserId NVARCHAR(255);
ALTER TABLE Subscriptions ADD TeamsConversationId NVARCHAR(255);
CREATE INDEX IX_Subscriptions_TeamsUserId ON Subscriptions(TeamsUserId);

-- Table optionnelle pour logs détaillés
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

#### 2.4 Configuration et secrets

- Ajout des variables d'environnement
- Configuration de la connection string SaaS Accelerator
- Test de connectivité entre composants

### Phase 3 : Configuration Azure Marketplace et Certification (Semaine 3)

**Référence** : [Issue GitHub #4](https://github.com/michel-heon/teams-gpt-saas-acc/issues/4)

**Objectif** : Configurer l'offre sur Azure Marketplace, obtenir la certification et préparer le go-live.

#### 3.1 Configuration de l'offre Marketplace

- **Création dans Partner Center**
  - Nom : "Teams GPT Agent - AI Assistant for Microsoft Teams"
  - Description courte et détaillée
  - Captures d'écran et vidéos
  - Logo et assets marketing

#### 3.2 Configuration des plans et prix

| Plan | Prix mensuel | Messages inclus | Overage |
|------|-------------|------------------|---------|
| Starter | 9.99€ | 1,000 | 0.01€ |
| Professional | 49.99€ | 10,000 | 0.008€ |
| Enterprise | 199.99€ | 50,000 | 0.005€ |

#### 3.3 Configuration technique

```json
{
  "offer_type": "SaaS",
  "billing_model": "per_usage",
  "pricing_model": "flat_rate_with_overage",
  "webhook_url": "https://your-saas-app.azurewebsites.net/api/AzureWebhook",
  "landing_page_url": "https://your-saas-app.azurewebsites.net/",
  "dimensions": [
    {
      "id": "standard-message",
      "display_name": "Message standard",
      "price_per_unit": 0.01
    },
    {
      "id": "premium-message", 
      "display_name": "Message premium",
      "price_per_unit": 0.02
    }
  ]
}
```

#### 3.4 Certification et validation

- Soumission pour révision Microsoft
- Tests fonctionnels complets
- Correction des feedbacks
- Validation finale

### Phase 4 : Testing, Validation et Go-Live (Semaine 4)

**Référence** : [Issue GitHub #5](https://github.com/michel-heon/teams-gpt-saas-acc/issues/5)

**Objectif** : Tests finaux, validation complète et lancement en production.

#### 4.1 Tests d'intégration complets

- **Tests end-to-end**
  - Achat depuis Azure Marketplace
  - Activation automatique dans Teams
  - Utilisation de l'agent GPT
  - Facturation des messages
  - Gestion des limites par plan

- **Tests de performance**
  - 100+ utilisateurs simultanés
  - Temps de réponse < 3 secondes
  - Montée en charge automatique

#### 4.2 Tests utilisateur (UAT)

- Recrutement de 5-10 beta testeurs
- Test des différents plans d'abonnement
- Feedback utilisateur
- Corrections mineures

#### 4.3 Tests de facturation

- Validation du calcul des messages
- Tests de tous les scénarios de facturation
- Dépassement de quota
- Changement de plan
- Annulation d'abonnement

#### 4.4 Monitoring et alertes

```javascript
// Configuration Application Insights
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);
appInsights.start();

// Métriques personnalisées
appInsights.defaultClient.trackMetric({
    name: 'MessagesProcessed',
    value: 1,
    properties: {
        subscriptionId: subscription.Id,
        messageType: messageType,
        planId: subscription.PlanId
    }
});
```

#### 4.5 Go-Live

- Déploiement final en production
- Mise en ligne sur Azure Marketplace
- Communications marketing
- Monitoring intensif première semaine

## Critères de succès

- [ ] Solution déployée sur Azure Marketplace
- [ ] Facturation automatique basée sur les messages
- [ ] Expérience utilisateur transparente dans Teams
- [ ] Monitoring et analytics opérationnels
- [ ] Support client fonctionnel
- [ ] Taux de conversion > 5%
- [ ] Temps de réponse < 3 secondes
- [ ] Disponibilité > 99.9%

## Technologies utilisées

- **Microsoft Commercial Marketplace SaaS Accelerator**
- **Azure App Services** (hébergement)
- **Azure SQL Database** (données)
- **Azure Key Vault** (secrets)
- **Microsoft Teams AI Library 2.0**
- **Azure OpenAI** (traitement IA)
- **Application Insights** (monitoring)

## Livrables par phase

### Phase 1
- Infrastructure SaaS Accelerator déployée
- Landing page et portail admin opérationnels
- Base de données configurée

### Phase 2
- Service d'intégration SaaS fonctionnel
- Agent Teams modifié avec tracking d'usage
- Extension de base de données validée

### Phase 3
- Offre configurée sur Azure Marketplace
- Certification Microsoft obtenue
- Documentation utilisateur complète

### Phase 4
- Solution testée et validée
- Go-live sur Azure Marketplace
- Monitoring opérationnel

Cette approche avec SaaS Accelerator permet un déploiement rapide et fiable en 4 semaines, avec une maintenance simplifiée et des mises à jour automatiques de l'infrastructure Marketplace.