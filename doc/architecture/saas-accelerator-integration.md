# Architecture Teams GPT + SaaS Accelerator

## Vue d'ensemble - Approche révisée

Cette architecture se base sur le **Microsoft Commercial Marketplace SaaS Accelerator** existant plutôt que de recréer tous les composants from scratch. L'objectif est d'intégrer l'agent Teams GPT avec l'infrastructure SaaS Accelerator pour la facturation basée sur les messages.

## Architecture hybride recommandée

### Composants du SaaS Accelerator (à utiliser tel quel)

```
SaaS-Accelerator/
├── CustomerSite/                    # Landing page + customer portal
├── AdminSite/                       # Publisher admin portal  
├── Services/                        # Marketplace APIs integration
├── DataAccess/                      # Database layer + entities
├── WebHook/                         # Webhook handlers
└── MeteredTriggerJob/               # Usage reporting scheduler
```

### Composants Teams GPT (à modifier)

```
teams-gpt-saas-acc/
├── src/
│   ├── app/
│   │   ├── app.js                   # ✏️ MODIFIER - Ajouter usage tracking
│   │   └── instructions.txt         # ✅ Garder tel quel
│   ├── services/                    # 🆕 CRÉER - Services d'intégration
│   │   ├── saasIntegration.js       # Interface avec SaaS Accelerator
│   │   └── messageTracker.js        # Tracking spécifique aux messages
│   └── config.js                    # ✏️ MODIFIER - Config SaaS
```

## Intégration Teams GPT ↔ SaaS Accelerator

### 1. Modification minimale de l'agent Teams

```javascript
// src/services/saasIntegration.js - NOUVEAU FICHIER
class SaaSIntegrationService {
    constructor() {
        this.acceleratorDb = new SaaSAcceleratorDb();
        this.meteringService = new MeteringService();
    }

    async getActiveSubscription(teamsUserId) {
        // Requête vers la DB du SaaS Accelerator
        return await this.acceleratorDb.query(`
            SELECT s.*, p.MonthlyMessageLimit 
            FROM Subscriptions s
            JOIN Plans p ON s.PlanId = p.PlanId
            WHERE s.TeamsUserId = @teamsUserId 
            AND s.SubscriptionStatus = 'Subscribed'
        `, { teamsUserId });
    }

    async trackMessageUsage(subscription, messageData) {
        // Enregistrer dans la table MeteredAuditLogs du SaaS Accelerator
        const usageEvent = {
            SubscriptionId: subscription.Id,
            RequestJson: JSON.stringify({
                messageText: messageData.text,
                timestamp: new Date(),
                dimension: 'messages',
                quantity: 1
            }),
            CreatedDate: new Date(),
            StatusCode: '200'
        };

        await this.acceleratorDb.insert('MeteredAuditLogs', usageEvent);
        
        // Le MeteredTriggerJob du SaaS Accelerator s'occupera du rapportage
    }
}
```

### 2. Modification de l'agent Teams (minimale)

```javascript
// src/app/app.js - MODIFICATIONS
const { SaaSIntegrationService } = require('../services/saasIntegration');

// Ajouter après la création de l'app
const saasIntegration = new SaaSIntegrationService();

// Middleware de vérification d'abonnement (AJOUTER)
app.use(async (context, next) => {
    const teamsUserId = context.activity.from.id;
    
    const subscription = await saasIntegration.getActiveSubscription(teamsUserId);
    
    if (!subscription) {
        await context.sendActivity({
            type: 'message',
            text: 'Vous devez avoir un abonnement actif. Visitez notre page d\'abonnement.',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.hero',
                content: {
                    title: 'Abonnement requis',
                    subtitle: 'Accédez à Teams GPT Assistant',
                    buttons: [{
                        type: 'openUrl',
                        title: 'S\'abonner maintenant',
                        value: process.env.SAAS_LANDING_PAGE_URL
                    }]
                }
            }]
        });
        return;
    }

    context.subscription = subscription;
    await next();
});

// Modifier le handler de messages existant
app.on('message', async ({ send, stream, activity }) => {
    const subscription = activity.subscription; // Ajouté par le middleware
    // ... code existant ...

    try {
        // ... traitement IA existant ...
        
        // AJOUTER après le traitement - Tracker l'usage
        await saasIntegration.trackMessageUsage(subscription, {
            text: activity.text,
            response: responseText,
            tokens: tokenCount
        });
        
    } catch (error) {
        // ... gestion erreur existante ...
    }
});
```

### 3. Configuration base de données (extension du SaaS Accelerator)

```sql
-- Ajouter à la DB du SaaS Accelerator
ALTER TABLE Subscriptions ADD TeamsUserId varchar(255);
ALTER TABLE Subscriptions ADD TeamsConversationId varchar(255);

CREATE INDEX IX_Subscriptions_TeamsUserId ON Subscriptions(TeamsUserId);

-- Table pour tracker les messages détaillés (optionnel)
CREATE TABLE TeamsMessageLogs (
    Id bigint IDENTITY(1,1) PRIMARY KEY,
    SubscriptionId int NOT NULL,
    ConversationId varchar(255),
    MessageText nvarchar(max),
    ResponseText nvarchar(max),
    TokensUsed int,
    ProcessingTime int,
    CreatedDate datetime2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (SubscriptionId) REFERENCES Subscriptions(Id)
);
```

### 4. Configuration des plans dans le SaaS Accelerator

```sql
-- Configurer les plans avec limites de messages
INSERT INTO Plans (PlanId, DisplayName, Description, IsmeteringSupported)
VALUES 
    ('teams-gpt-starter', 'Teams GPT Starter', '1000 messages/mois', 1),
    ('teams-gpt-pro', 'Teams GPT Professional', '10000 messages/mois', 1),
    ('teams-gpt-enterprise', 'Teams GPT Enterprise', '50000 messages/mois', 1);

-- Configurer les dimensions de facturation
INSERT INTO MeteredDimensions (Dimension, PlanId, Description)
VALUES 
    ('messages', 1, 'Nombre de messages traités'),
    ('premium_messages', 2, 'Messages avec fonctionnalités avancées'),
    ('premium_messages', 3, 'Messages avec fonctionnalités avancées');
```

## Déploiement hybride

### Option 1 : Déploiement séparé (Recommandé)

```
Azure Resources:
├── SaaS Accelerator (infrastructure complète)
│   ├── Landing Page App Service
│   ├── Admin Portal App Service  
│   ├── SQL Database
│   └── Webhook Handler
└── Teams GPT Agent (votre app actuelle)
    ├── Bot App Service (existant)
    └── Configuration pointant vers SaaS Accelerator DB
```

### Option 2 : Déploiement intégré

```
Azure Resources:
└── Unified App Service
    ├── SaaS Accelerator (CustomerSite + AdminSite)
    ├── Teams Bot Endpoint (/api/messages)  
    ├── Shared SQL Database
    └── Shared configuration
```

## Plan d'implémentation révisé (4 semaines au lieu de 12)

### Semaine 1 : Setup SaaS Accelerator
- Déployer le SaaS Accelerator sur Azure
- Configurer les plans tarifaires
- Tester le flow d'abonnement de base

### Semaine 2 : Intégration Teams GPT
- Créer le service d'intégration SaaS
- Modifier l'agent Teams avec middleware
- Tester le tracking d'usage

### Semaine 3 : Configuration Marketplace
- Configurer l'offre sur Partner Center
- Mapper les plans et dimensions
- Tests d'intégration end-to-end

### Semaine 4 : Testing et Go-Live
- Tests de charge et performance
- Validation du reporting vers Marketplace
- Déploiement production

## Avantages de cette approche

### ✅ Réutilisation maximale
- 80% du code déjà disponible dans le SaaS Accelerator
- Infrastructure éprouvée et maintenue par Microsoft
- Conformité Marketplace garantie

### ✅ Développement accéléré  
- 4 semaines au lieu de 12
- Risque technique réduit
- Time-to-market plus rapide

### ✅ Maintenance simplifiée
- Updates du SaaS Accelerator automatiquement bénéfiques
- Séparation claire des responsabilités
- Debugging facilité

## Configuration minimale requise

### Variables d'environnement Teams GPT

```bash
# Existing Teams config
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_KEY=...

# New SaaS integration
SAAS_ACCELERATOR_DB_CONNECTION=...
SAAS_LANDING_PAGE_URL=https://your-saas-landing.azurewebsites.net
ENABLE_USAGE_TRACKING=true
```

### Modification du package.json

```json
{
  "dependencies": {
    // ... existing dependencies ...
    "mssql": "^10.0.2",
    "@azure/identity": "^4.11.1"
  }
}
```

Cette approche est **beaucoup plus pragmatique** et exploite au maximum l'investissement Microsoft dans le SaaS Accelerator !