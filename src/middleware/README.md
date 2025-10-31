# Middlewares SaaS

Ce dossier contient les middlewares pour l'intégration SaaS Accelerator avec Teams GPT Agent.

## Architecture

Les middlewares sont exécutés dans l'ordre suivant pour chaque message :

```
Message Teams
    ↓
subscriptionCheck.js ──→ Vérifie l'abonnement actif
    ↓
usageTracking.js ──→ Vérifie les limites et track l'usage
    ↓
Message Handler (OpenAI) ──→ Traite le message avec GPT
    ↓
usageTracking.js ──→ Enregistre l'usage dans la DB
    ↓
Réponse envoyée
```

## subscriptionCheck.js

**Rôle :** Vérifier que l'utilisateur a un abonnement actif avant de traiter le message.

**Fonctionnalités :**
- Extraction du `TeamsUserId` depuis l'activité Teams (priorité : `aadObjectId` puis `id`)
- Vérification de l'existence d'un abonnement dans la DB SaaS Accelerator
- Vérification du statut de l'abonnement (`Subscribed`)
- Messages d'erreur utilisateur si pas d'abonnement ou statut invalide
- Support du **mode permissif** (`SAAS_PERMISSIVE_MODE=true`) pour continuer sans abonnement
- Attache l'objet `subscription` au contexte pour les middlewares suivants

**Exports :**
```javascript
const { subscriptionCheckMiddleware, hasActiveSubscription, extractTeamsUserId } = require('./subscriptionCheck');
```

**Exemple de message d'erreur :**
```
❌ No Active Subscription

You don't have an active subscription to use this AI assistant.

To get started:
1. Visit Azure Marketplace
2. Search for 'Teams GPT Agent'
3. Choose a plan that fits your needs

Plans start at €9.99/month with 1,000 messages included.
```

## usageTracking.js

**Rôle :** Tracker l'usage des messages, vérifier les limites du plan, et enregistrer dans la DB.

**Fonctionnalités :**
- Classification du message (standard/premium) via `MessageClassifier`
- Extraction des métadonnées (tokens, pièces jointes, longueur)
- Vérification des limites AVANT traitement (`checkMessageLimit`)
- Blocage si limite atteinte avec message d'erreur détaillé
- Enregistrement de l'usage APRÈS traitement réussi
- Double enregistrement : DB SaaS Accelerator + logs formatés (RGPD)
- Avertissement si proche de la limite (10% restant)
- Support du **mode permissif** pour continuer en cas d'erreur

**Exports :**
```javascript
const { usageTrackingMiddleware, getUsageStats, resetUsageCounters } = require('./usageTracking');
```

**Exemple de message de limite atteinte :**
```
⚠️ Message Limit Reached

You've reached your monthly limit of 1000 messages for the starter plan.

Current usage: 1000 / 1000 messages

Options:
• Upgrade to a higher plan for more messages
• Wait until next month (resets on billing date)
• Pay 0.01€ per additional message (overage billing)

Visit the Azure Portal to manage your subscription.
```

**Exemple d'avertissement proche limite :**
```
⚠️ Usage Warning: You have 87 messages remaining this month.
Consider upgrading your plan or additional messages will be billed at 0.01€ each.
```

## Intégration dans app.js

Les middlewares sont intégrés dans le handler `app.on('message')` :

```javascript
const { subscriptionCheckMiddleware } = require('../middleware/subscriptionCheck');
const { usageTrackingMiddleware } = require('../middleware/usageTracking');

app.on('message', async ({ send, stream, activity }) => {
  const context = { send, stream, activity };
  
  const messageHandler = async () => {
    // Logique OpenAI ici
  };
  
  // Chaîne de middlewares
  await subscriptionCheckMiddleware(context, async () => {
    await usageTrackingMiddleware(context, messageHandler);
  });
});
```

## Flux de données

### Contexte enrichi

Le contexte est enrichi par les middlewares :

```javascript
context = {
  send,           // Fonction pour envoyer des messages
  stream,         // Stream pour les réponses en temps réel
  activity,       // Activité Teams originale
  
  // Ajouté par subscriptionCheck
  subscription: {
    id: "sub-123",
    planId: "professional",
    saasSubscriptionStatus: "Subscribed",
    ...
  },
  
  // Ajouté par usageTracking
  usageTracking: {
    subscriptionId: "sub-123",
    dimension: "pro",
    metadata: {
      tokenCount: 150,
      conversationType: "one-on-one",
      hasAttachments: false,
      isLongMessage: false
    },
    isPremium: false,
    startTime: 1698765432000
  }
}
```

### Classification des messages

Les messages sont classifiés en 3 dimensions :

| Dimension | Plan | Inclus | Coût overage |
|-----------|------|--------|--------------|
| `free` | Starter / Development | 1,000 / mois | 0.02€ |
| `pro` | Professional | 10,000 / mois | 0.015€ |
| `pro-plus` | Professional Plus | 50,000 / mois | 0.01€ |

**Messages Premium :**
- Messages avec pièces jointes (≥ 1 fichier)
- Messages longs (> 1000 caractères)
- Coût supplémentaire : +0.01€

## Modes de fonctionnement

### Mode Strict (Production)

```bash
SAAS_PERMISSIVE_MODE=false
SAAS_DEBUG_MODE=false
```

- Bloque les messages si pas d'abonnement
- Bloque les messages si limite atteinte
- Arrête le traitement en cas d'erreur DB

### Mode Permissif (Développement)

```bash
SAAS_PERMISSIVE_MODE=true
SAAS_DEBUG_MODE=true
```

- Autorise les messages sans abonnement (avec warning)
- Autorise les messages même si limite atteinte (avec warning)
- Continue le traitement en cas d'erreur DB
- Logs détaillés dans la console

## Variables d'environnement

Les middlewares utilisent les variables suivantes (définies dans `src/config.js`) :

```bash
# Base de données SaaS Accelerator
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB
SAAS_DB_USER=CloudSAdd5b00f1
SAAS_DB_PASSWORD=***

# Modes de fonctionnement
SAAS_PERMISSIVE_MODE=false  # true pour dev, false pour prod
SAAS_DEBUG_MODE=false       # true pour logs détaillés
```

## Gestion des erreurs

### Erreurs gérées par subscriptionCheck

| Erreur | Mode Strict | Mode Permissif |
|--------|-------------|----------------|
| Pas d'abonnement | Bloque + message | Continue + warning |
| Statut invalide | Bloque + message | Continue + warning |
| Erreur DB | Bloque + message | Continue + warning |
| TeamsUserId manquant | Bloque + erreur | Continue + warning |

### Erreurs gérées par usageTracking

| Erreur | Mode Strict | Mode Permissif |
|--------|-------------|----------------|
| Limite atteinte | Bloque + message détaillé | Bloque + message détaillé |
| Erreur classification | Bloque + message | Continue + warning |
| Erreur tracking | Continue + note utilisateur | Continue silencieusement |
| Erreur DB | Bloque + message | Continue + warning |

## Tests

Les middlewares sont testés dans :
- `tests/unit/middleware/subscriptionCheck.test.js`
- `tests/unit/middleware/usageTracking.test.js`
- `tests/integration/middleware.test.js`

Pour exécuter les tests :
```bash
cd tests
make unit              # Tests unitaires
make integration       # Tests d'intégration (nécessite DB)
make test              # Tous les tests
```

## Logging et monitoring

### Logs en mode debug

```javascript
[SubscriptionCheck] Checking subscription for user: 7b1f2192-069e-41c0-846d-765936e6ba9c
[SubscriptionCheck] ✅ Valid subscription found: {
  subscriptionId: 'sub-123',
  plan: 'professional',
  status: 'Subscribed'
}

[UsageTracking] Processing message for subscription: sub-123
[UsageTracking] Message classified: {
  dimension: 'pro',
  isPremium: false,
  tokenCount: 150,
  conversationType: 'one-on-one'
}
[UsageTracking] Limit check passed: {
  used: 847,
  limit: 10000,
  remaining: 9153
}
[UsageTracking] ✅ Usage tracked successfully: {
  subscriptionId: 'sub-123',
  dimension: 'pro',
  processingTime: '1234ms',
  newUsed: 848,
  remaining: 9152
}
```

### Métriques Application Insights

Les middlewares envoient les métriques suivantes :
- Nombre de messages par plan
- Taux de blocage (pas d'abonnement)
- Taux de limite atteinte
- Temps de traitement par message
- Erreurs de tracking

## Sécurité et RGPD

### Données sensibles

Les middlewares respectent le RGPD :
- ✅ **UserId hashé** dans les logs formatés (SHA256, 16 premiers chars)
- ✅ **Pas de contenu de message** enregistré
- ✅ **Métadonnées uniquement** (tokens, longueur, type)
- ✅ **Timestamps** pour audit trail
- ✅ **ConversationId** pour tracking (pas de contenu)

### Exemple de log RGPD-compliant

```json
{
  "subscriptionId": "sub-123",
  "dimension": "pro",
  "quantity": 1,
  "requestJson": "{\"userId\":\"a1b2c3d4e5f6g7h8\",\"tokenCount\":150,\"conversationType\":\"one-on-one\"}",
  "statusCode": 200,
  "createdDate": "2025-10-31T10:30:00Z"
}
```

**Note :** `userId` est hashé, pas de `messageContent`.

## Maintenance

### Réinitialisation des compteurs

```javascript
const { resetUsageCounters } = require('./middleware/usageTracking');

// Réinitialiser les compteurs d'un abonnement (admin)
await resetUsageCounters('sub-123');
```

### Statistiques d'usage

```javascript
const { getUsageStats } = require('./middleware/usageTracking');

// Obtenir les stats pour toutes les dimensions
const stats = await getUsageStats('sub-123');
// {
//   free: { used: 0, limit: 1000, remaining: 1000, allowed: true },
//   pro: { used: 847, limit: 10000, remaining: 9153, allowed: true },
//   'pro-plus': { used: 0, limit: 50000, remaining: 50000, allowed: true }
// }

// Obtenir les stats pour une dimension spécifique
const proStats = await getUsageStats('sub-123', 'pro');
// { used: 847, limit: 10000, remaining: 9153, allowed: true }
```

## Dépannage

### Problème : Messages bloqués en dev

**Solution :** Activer le mode permissif
```bash
SAAS_PERMISSIVE_MODE=true
SAAS_DEBUG_MODE=true
```

### Problème : Erreur "Login failed for user"

**Solution :** Configurer les credentials Azure SQL (voir `tests/AZURE-SQL-CONFIG.md`)

### Problème : Limite atteinte immédiatement

**Solution :** Vérifier la DB et réinitialiser les compteurs si nécessaire

### Problème : Pas de tracking d'usage

**Vérifier :**
1. Middleware `usageTracking` est bien appelé APRÈS `subscriptionCheck`
2. Connexion DB fonctionne
3. Logs en mode debug activé

---

**Dernière mise à jour :** 31 octobre 2025
