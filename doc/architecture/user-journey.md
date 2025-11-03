# Parcours utilisateur - Teams GPT SaaS

Ce document décrit le parcours complet d'une entreprise depuis l'achat sur Azure Marketplace jusqu'à l'utilisation quotidienne de l'assistant GPT dans Microsoft Teams.

---

## 1. Achat sur Azure Marketplace

**Acteur** : Administrateur de l'entreprise

**Étapes :**
1. L'entreprise accède à Azure Marketplace (marketplace.azure.com)
2. Recherche "Teams GPT Assistant"
3. Sélectionne un plan tarifaire :
   - **Starter** : $0/mois, 50 messages inclus, $0.02/msg de dépassement
   - **Professional** : $9.99/mois, 300 messages inclus, $0.015/msg de dépassement
   - **Pro Plus** : $49.99/mois, 1500 messages inclus, $0.01/msg de dépassement
4. Clique sur "Get It Now" ou "Subscribe"
5. Remplit les informations de facturation Azure

**Résultat :**
- Une transaction est créée dans Azure Marketplace
- L'utilisateur est redirigé vers la Landing Page du SaaS Accelerator

---

## 2. Activation automatique

**Acteur** : SaaS Accelerator (automatique)

**Flux technique :**
```
Azure Marketplace 
  ↓ POST /api/AzureWebhook (Subscription Created)
SaaS Accelerator Portal
  ↓ INSERT INTO Subscriptions
SQL Database (sac-02AMPSaaSDB)
```

**Étapes automatiques :**
1. Azure Marketplace envoie un webhook vers `https://sac-02-portal.azurewebsites.net/api/AzureWebhook`
2. Le SaaS Accelerator reçoit la notification de création d'abonnement
3. Création d'un enregistrement dans la table `Subscriptions` :
   ```sql
   INSERT INTO Subscriptions (
       AmpsubscriptionId,
       SubscriptionStatus,
       PlanId,
       Quantity,
       ...
   ) VALUES (
       '<marketplace-subscription-id>',
       'PendingActivation',
       'pro',  -- Plan choisi
       1,
       ...
   )
   ```
4. L'administrateur est redirigé vers la Landing Page pour finaliser l'activation
5. Après confirmation, le webhook `SubscriptionActivated` est envoyé à Azure Marketplace

**Résultat :**
- Abonnement actif dans le système
- L'entreprise est prête à installer l'application Teams

---

## 3. Installation dans Microsoft Teams

**Acteur** : Administrateur IT de l'entreprise

**Étapes :**
1. L'administrateur reçoit un email avec les instructions d'installation
2. Il télécharge le package d'application Teams (fichier `.zip` contenant le manifest)
3. **Option A - Installation via Teams Admin Center** (recommandé pour entreprises) :
   - Se connecte à Teams Admin Center (admin.teams.microsoft.com)
   - Va dans "Teams apps" → "Manage apps"
   - Clique sur "Upload" → "Upload an app to your org's app catalog"
   - Sélectionne le fichier `.zip`
   - Configure les permissions et policies
   - Approuve l'installation pour l'organisation
4. **Option B - Sideloading** (développement/test) :
   - Ouvre Microsoft Teams
   - Va dans "Apps"
   - Clique sur "Upload a custom app"
   - Sélectionne le fichier `.zip`

**Manifest Teams (appPackage/manifest.json) :**
```json
{
  "manifestVersion": "1.16",
  "id": "<teams-app-id>",
  "packageName": "com.example.teamsgpt",
  "name": {
    "short": "Teams GPT Assistant",
    "full": "Teams GPT AI Assistant for Enterprise"
  },
  "description": {
    "short": "AI-powered assistant for Microsoft Teams",
    "full": "Intelligent conversational AI assistant..."
  },
  "bots": [
    {
      "botId": "<bot-id>",
      "scopes": ["personal", "team", "groupchat"],
      "supportsFiles": true,
      "isNotificationOnly": false
    }
  ]
}
```

**Architecture technique :**
- **Bot Framework** : Gère les messages Teams
- **Azure Bot Service** : Infrastructure de communication
- **App Service** : Héberge le code Node.js du bot (src/app/app.js)
- **Azure OpenAI** : Génère les réponses intelligentes (GPT-4)

**Résultat :**
- L'application Teams GPT Assistant apparaît dans le catalogue d'applications de l'organisation
- Les employés peuvent maintenant l'ajouter à leurs conversations

---

## 4. Liaison utilisateur (First-time setup)

**Acteur** : Employé de l'entreprise

**Étapes :**
1. L'employé ouvre Microsoft Teams
2. Va dans "Apps" ou "Chat"
3. Recherche "Teams GPT Assistant"
4. Clique sur "Add" pour démarrer une conversation
5. Le bot envoie un message de bienvenue :
   ```
   👋 Bonjour ! Je suis votre assistant GPT.
   
   Je peux vous aider avec :
   - Répondre à vos questions
   - Analyser des documents
   - Générer du contenu
   - Et bien plus encore !
   
   Posez-moi votre première question pour commencer.
   ```

**Flux technique de liaison :**
```
Teams Client
  ↓ Message utilisateur
Bot Framework (reçoit TeamsUserId)
  ↓ Middleware: subscriptionCheck.js
Vérification dans SQL Database
  ↓ SELECT * FROM Subscriptions WHERE TeamsUserId = ?
Si non lié:
  ↓ UPDATE Subscriptions SET TeamsUserId = ? WHERE AmpsubscriptionId = ?
Liaison automatique effectuée
```

**Code de liaison (src/middleware/subscriptionCheck.js) :**
```javascript
// Vérifier si l'utilisateur est déjà lié
const subscription = await getSubscriptionByTeamsUserId(teamsUserId);

if (!subscription) {
  // Trouver un abonnement actif sans utilisateur lié
  const activeSubscription = await getActiveUnlinkedSubscription();
  
  if (activeSubscription) {
    // Lier automatiquement
    await linkUserToSubscription(teamsUserId, activeSubscription.Id);
  }
}
```

**Résultat :**
- Le `TeamsUserId` de l'employé est enregistré dans la table `Subscriptions`
- L'employé peut immédiatement utiliser l'assistant
- Tous ses messages seront comptabilisés pour la facturation

---

## 5. Utilisation quotidienne

**Acteur** : Employé (utilisateur final)

**Interface utilisateur :**
- L'employé discute avec le bot comme avec n'importe quel collègue dans Teams
- Conversation en langage naturel
- Support des attachments, fichiers, images (messages premium)

**Exemples de conversations :**

### Exemple 1 : Question simple
```
👤 Utilisateur:
Qu'est-ce que le RGPD ?

🤖 Assistant GPT:
Le RGPD (Règlement Général sur la Protection des Données) est...
[Réponse détaillée générée par GPT-4]
```

### Exemple 2 : Analyse de document
```
👤 Utilisateur:
[📎 rapport_financier.pdf]
Peux-tu résumer ce rapport ?

🤖 Assistant GPT:
Voici un résumé du rapport financier...
[Analyse du contenu avec GPT-4 Vision]
```

### Exemple 3 : Génération de contenu
```
👤 Utilisateur:
Rédige un email pour annoncer notre nouvelle fonctionnalité

🤖 Assistant GPT:
Voici un exemple d'email professionnel :

Objet : Découvrez notre nouvelle fonctionnalité...
[Email généré]
```

**Flux technique complet :**
```
1. Teams Client
   ↓ Message utilisateur
   
2. Bot Framework (Azure Bot Service)
   ↓ POST /api/messages
   
3. Express App (src/index.js)
   ↓ app.post('/api/messages', ...)
   
4. Middleware: subscriptionCheck.js
   ↓ Vérifier abonnement actif
   
5. Middleware: usageTracking.js
   ↓ Enregistrer le message
   INSERT INTO MeteredAuditLogs (
       SubscriptionId,
       RequestJson,
       CreatedDate,
       RunBy: 'TeamsGPT'
   )
   
6. Teams AI App (src/app/app.js)
   ↓ app.message(...) handler
   
7. Azure OpenAI Service
   ↓ POST https://<endpoint>.openai.azure.com/openai/deployments/gpt-4/chat/completions
   ↓ Génération de la réponse
   
8. Retour au Bot Framework
   ↓ Envoi de la réponse à l'utilisateur
   
9. Teams Client
   ↓ Affichage de la réponse
```

**Code simplifié (src/app/app.js) :**
```javascript
// Handler de messages
app.message(async (context, state) => {
  // Le message est automatiquement tracké par usageTracking.js middleware
  
  // Appel à Azure OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "Tu es un assistant professionnel..." },
      { role: "user", content: context.activity.text }
    ]
  });
  
  // Retourner la réponse
  await context.sendActivity(completion.choices[0].message.content);
});
```

**Résultat :**
- L'utilisateur obtient une réponse intelligente en quelques secondes
- Le message est enregistré dans `MeteredAuditLogs` pour facturation
- Expérience transparente, aucune interruption

---

## 6. Facturation automatique

**Acteur** : SaaS Accelerator Metered Scheduler (automatique)

**Processus de facturation (toutes les heures) :**

### 6.1 Agrégation horaire
```
Scheduler Job (MeteredTriggerJob)
  ↓ Toutes les heures
SELECT 
    SubscriptionId,
    PlanId,
    COUNT(*) as MessageCount
FROM MeteredAuditLogs
WHERE CreatedDate >= DATEADD(hour, -1, GETUTCDATE())
  AND ResponseJson IS NULL
GROUP BY SubscriptionId, PlanId
```

### 6.2 Émission vers Marketplace API
```
Pour chaque abonnement:
  ↓ POST https://marketplaceapi.microsoft.com/api/usageEvent?api-version=2018-08-31
  Body: {
    "resourceId": "<subscription-id>",
    "quantity": 6,  // 6 messages dans l'heure
    "dimension": "pro",  // Plan Professional
    "effectiveStartTime": "2025-11-03T12:00:00Z",
    "planId": "pro"
  }
  
  ↓ Réponse 200 OK
  {
    "usageEventId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "Accepted",
    "messageTime": "2025-11-03T13:05:00Z",
    "resourceId": "<subscription-id>",
    "quantity": 6,
    "dimension": "pro"
  }
  
  ↓ UPDATE MeteredAuditLogs
  SET ResponseJson = '<réponse API>'
  WHERE ...
```

### 6.3 Calcul de la facture mensuelle (Azure Marketplace)
```
Plan Professional: $9.99/mois (300 messages inclus)

Messages du mois: 450
Messages facturables: 450 - 300 = 150
Coût dépassement: 150 × $0.015 = $2.25

Facture totale: $9.99 + $2.25 = $12.24
```

**Résultat :**
- L'entreprise reçoit une facture mensuelle Azure consolidée
- Facturation automatique, aucune intervention manuelle
- Transparence totale sur l'usage dans le portail Azure

---

## 7. Gestion de l'abonnement

**Acteur** : Administrateur de l'entreprise

**Portails disponibles :**

### 7.1 Customer Portal (SaaS Accelerator)
- URL : `https://sac-02-portal.azurewebsites.net/`
- Fonctionnalités :
  - Voir les détails de l'abonnement
  - Changer de plan (upgrade/downgrade)
  - Voir l'historique d'usage
  - Gérer les utilisateurs liés

### 7.2 Azure Portal
- Voir toutes les ressources Azure
- Consulter les factures mensuelles
- Annuler l'abonnement
- Configurer les alertes de coût

### 7.3 Admin Portal (SaaS Accelerator)
- URL : `https://sac-02-admin.azurewebsites.net/`
- Fonctionnalités (pour le fournisseur) :
  - Vue de tous les abonnements
  - Statistiques d'usage globales
  - Gestion des plans et dimensions
  - Configuration du Scheduler

**Actions possibles :**

#### Upgrade de plan
```
1. Admin clique "Change Plan" dans Customer Portal
2. Sélectionne "Pro Plus"
3. Confirmation immédiate
4. Webhook envoyé à Azure Marketplace
5. Nouveau plan actif instantanément
6. Prorata appliqué automatiquement
```

#### Annulation d'abonnement
```
1. Admin clique "Cancel Subscription" dans Azure Portal
2. Confirmation de l'annulation
3. Webhook envoyé au SaaS Accelerator
4. UPDATE Subscriptions SET SubscriptionStatus = 'Unsubscribed'
5. Bot Teams désactivé pour cette entreprise
6. Remboursement prorata si applicable
```

---

## Résumé du parcours

| Étape | Acteur | Durée | Résultat |
|-------|--------|-------|----------|
| 1. Achat Marketplace | Admin entreprise | 5 min | Transaction créée |
| 2. Activation | SaaS Accelerator | Automatique | Abonnement actif |
| 3. Installation Teams | Admin IT | 10 min | Bot disponible |
| 4. Liaison utilisateur | Employé | 30 sec | Première conversation |
| 5. Utilisation | Employé | Quotidien | Conversations intelligentes |
| 6. Facturation | Scheduler | Horaire | Émission vers API |
| 7. Gestion | Admin | À la demande | Contrôle et monitoring |

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARCOURS UTILISATEUR COMPLET                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│   1. ACHAT                  │
│   Azure Marketplace         │
│   - Choisir plan            │
│   - Paiement                │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   2. ACTIVATION             │
│   SaaS Accelerator Portal   │
│   - Webhook reçu            │
│   - Abonnement créé         │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   3. INSTALLATION           │
│   Teams Admin Center        │
│   - Upload manifest         │
│   - Deploy to org           │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   4. LIAISON                │
│   First conversation        │
│   - TeamsUserId linked      │
│   - Subscription active     │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   5. UTILISATION            │
│   Teams conversations       │
│   - Messages → GPT-4        │
│   - Réponses intelligentes  │
│   - Usage tracké            │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   6. FACTURATION            │
│   Scheduler hourly          │
│   - Agrégation messages     │
│   - Émission API            │
│   - Facture mensuelle       │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   7. GESTION                │
│   Portails admin            │
│   - Monitoring usage        │
│   - Change plan             │
│   - Cancel subscription     │
└─────────────────────────────┘
```

---

**Document créé** : 3 novembre 2025  
**Auteur** : GitHub Copilot  
**Version** : 1.0  
**Référence** : doc/PROJECT-STATUS-NOV-2025.md
