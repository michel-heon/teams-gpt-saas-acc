# Plan de tests : Agrégation d'usage Azure Marketplace

## Vue d'ensemble

Ce document décrit la stratégie de test pour valider le système d'agrégation d'usage horaire qui émet les événements de facturation vers Azure Marketplace Metering Service API.

## Objectifs des tests

### 1. **Validation de l'agrégation locale**
   - Vérifier que les messages sont correctement accumulés dans le buffer
   - Confirmer que la clé d'agrégation est unique par `subscriptionId:planId:dimension:hour`
   - Valider que la quantité s'incrémente correctement (1 → 2 → 3 → ... → N)

### 2. **Validation de l'émission horaire**
   - Vérifier que la tâche cron s'exécute à la bonne fréquence (toutes les heures)
   - Confirmer que seules les heures complètes sont émises
   - Valider que le buffer est vidé après émission réussie

3. Supprimer abonnement immédiatement après tests

### Niveau 4 : Tests Playground (Tests interactifs) - 🎮 Environnement réel Teams

**Objectif** : Tester le système complet dans Microsoft 365 Agents Playground avec diagnostic interactif

**Approche** :
- Tests interactifs via interface Teams réelle
- Commandes de diagnostic en temps réel (Makefile + scripts JS)
- Observation du buffer et des événements Marketplace
- Validation complète end-to-end avec utilisateur réel

**Répertoire de travail** :
```
test-saas-playground/
├── Makefile                    # Commandes diagnostic
├── scripts/                    # Scripts JS pour monitoring
└── test-scenarios/             # Scénarios pré-définis
```

**Commandes disponibles** :
```bash
make get-subscription           # Voir la subscription Playground
make get-plan                   # Voir le plan actuel
make set-plan PLAN=<name>       # Changer le plan
make list-plans                 # Lister plans disponibles
make count-marketplace-messages # Compter messages API
make count-buffer-messages      # Compter messages buffer
make show-buffer                # Afficher contenu buffer
make show-audit-logs            # Afficher audit logs
```

**Scénarios interactifs** :
1. **Message unique** : Valider accumulation d'un message
2. **Burst messages** : Envoyer 20 messages en 5 minutes
3. **Émission horaire** : Observer l'émission automatique
4. **Changement de plan** : Tester transition entre plans

**Avantages** :
- ✅ Tests en conditions réelles (Teams UI)
- ✅ Observation temps réel du buffer
- ✅ Debugging interactif facile
- ✅ Validation comportement utilisateur
- ✅ Commandes make simples

**Inconvénients** :
- ⚠️ Nécessite environnement Teams configuré
- ⚠️ Tests manuels (non automatisés)
- ⚠️ Plus lent que niveaux 1-2

**Documentation complète** : Voir [TEST-PLAN-PLAYGROUND.md](./TEST-PLAN-PLAYGROUND.md)

## 📋 Scripts de test
   - Vérifier l'authentification Azure AD (client credentials)
   - Confirmer que les requêtes POST sont correctement formatées
   - Valider la gestion des réponses API (200, 409, 400, 401, 403, 500)

### 4. **Validation de la persistance**
   - Vérifier que le buffer est sauvegardé au shutdown
   - Confirmer que le buffer est restauré au démarrage
   - Valider l'intégrité des données après restart

### 5. **Validation de la résilience**
   - Vérifier le comportement lors d'échecs API
   - Confirmer que les erreurs ne bloquent pas l'utilisateur
   - Valider la stratégie de retry

## Scénarios de test détaillés

### Scénario 1 : Accumulation simple (1 message)

**Objectif** : Valider l'accumulation d'un seul message dans le buffer

**Étapes** :
1. Démarrer service d'agrégation
2. Émettre 1 message : `accumulate('sub-123', 'professional', 'pro', 1)`
3. Inspecter buffer

**Résultat attendu** :
```javascript
{
  "sub-123:professional:pro:1730383200000": {
    subscriptionId: "sub-123",
    planId: "professional",
    dimension: "pro",
    quantity: 1,
    hour: 1730383200000,  // Arrondi à l'heure (ex: 10:00:00)
    firstSeen: 1730383245678  // Timestamp exact du premier message
  }
}
```

**Métriques mesurées** :
- ✅ Buffer contient 1 entrée
- ✅ Clé format correct : `subscriptionId:planId:dimension:hourTimestamp`
- ✅ Quantity = 1
- ✅ Hour arrondi à la minute 0


### Scénario 2 : Accumulation multiple (20 messages dans même heure)

**Objectif** : Valider l'incrémentation de quantity pour messages dans la même heure

**Étapes** :
1. Démarrer service d'agrégation
2. Émettre 20 messages avec même subscription+dimension dans 10:00-10:59
3. Inspecter buffer après chaque message

**Résultat attendu** :
```javascript
// Après message 1 (10:05)
{ "sub-123:professional:pro:1730383200000": { quantity: 1 } }

// Après message 5 (10:15)
{ "sub-123:professional:pro:1730383200000": { quantity: 5 } }

// Après message 20 (10:58)
{ "sub-123:professional:pro:1730383200000": { quantity: 20 } }
```

**Métriques mesurées** :
- ✅ Buffer contient toujours 1 seule entrée (pas de duplication)
- ✅ Quantity incrémente : 1 → 2 → 3 → ... → 20
- ✅ Hour reste identique (1730383200000 = 10:00:00)
- ✅ firstSeen reste celui du 1er message (10:05)


### Scénario 3 : Accumulation multi-heures (20 messages sur 2 heures)

**Objectif** : Valider la séparation des événements par tranche horaire

**Étapes** :
1. Démarrer service d'agrégation
2. Émettre 10 messages à 10:00-10:59
3. Avancer l'horloge à 11:00
4. Émettre 10 messages à 11:00-11:59
5. Inspecter buffer

**Résultat attendu** :
```javascript
{
  "sub-123:professional:pro:1730383200000": { quantity: 10, hour: 1730383200000 },  // 10:00
  "sub-123:professional:pro:1730386800000": { quantity: 10, hour: 1730386800000 }   // 11:00
}
```

**Métriques mesurées** :
- ✅ Buffer contient 2 entrées distinctes
- ✅ Chaque entrée a son propre compteur (10 + 10, pas 20)
- ✅ Hours différentes (10:00 vs 11:00)


### Scénario 4 : Accumulation multi-subscriptions

**Objectif** : Valider la séparation par subscription/plan/dimension

**Étapes** :
1. Démarrer service d'agrégation
2. Émettre 5 messages : subscription A, plan professional, dimension pro
3. Émettre 3 messages : subscription B, plan starter, dimension free
4. Émettre 2 messages : subscription A, plan professional, dimension pro (même que #2)
5. Inspecter buffer

**Résultat attendu** :
```javascript
{
  "sub-A:professional:pro:1730383200000": { quantity: 7 },  // 5 + 2
  "sub-B:starter:free:1730383200000": { quantity: 3 }
}
```

**Métriques mesurées** :
- ✅ Buffer contient 2 entrées (séparées par subscription+plan+dimension)
- ✅ Sub-A : 7 messages (5 + 2)
- ✅ Sub-B : 3 messages


### Scénario 5 : Émission horaire automatique (tâche cron)

**Objectif** : Valider l'émission automatique toutes les heures via cron

**Étapes** :
1. Démarrer service d'agrégation (initialise cron)
2. Accumuler 15 messages entre 10:00-10:59
3. Attendre émission cron à 11:00 (minute 0)
4. Vérifier appel API Marketplace
5. Vérifier buffer vidé

**Résultat attendu** :
- ⏰ Cron s'exécute à 11:00:00
- 📤 POST vers API Marketplace :
  ```json
  {
    "resourceId": "sub-123",
    "planId": "professional",
    "dimension": "pro",
    "quantity": 15,
    "effectiveStartTime": "2024-10-31T10:00:00.000Z"
  }
  ```
- ✅ API répond 200 OK avec `usageEventId`
- 🗑️ Entrée supprimée du buffer

**Métriques mesurées** :
- ✅ Cron exécuté à la bonne heure (11:00:00 ±5 secondes)
- ✅ Appel API avec quantity agrégée (15)
- ✅ effectiveStartTime = début de l'heure (10:00:00)
- ✅ Buffer.size = 0 après émission


### Scénario 6 : Émission avec heure incomplète (skip)

**Objectif** : Valider que l'heure en cours n'est PAS émise (attendre qu'elle soit complète)

**Étapes** :
1. Accumuler 10 messages à 11:00-11:30
2. Déclencher émission manuellement à 11:35
3. Vérifier que l'entrée 11:00 n'est PAS émise
4. Avancer à 12:05
5. Déclencher émission
6. Vérifier que l'entrée 11:00 est maintenant émise

**Résultat attendu** :
- ⏸️ À 11:35 : Aucune émission (heure 11:00 pas encore complète)
- ✅ À 12:05 : Émission de l'heure 11:00 (complète depuis 12:00)

**Métriques mesurées** :
- ✅ Heure en cours ignorée
- ✅ Heure complète émise
- ✅ Condition : `Date.now() >= hourEnd` (hourEnd = hour + 3600000ms)


### Scénario 7 : Authentification Azure AD

**Objectif** : Valider l'obtention et le cache du token Azure AD

**Étapes** :
1. Initialiser meteringApiService
2. Appeler `getAccessToken()` première fois
3. Mesurer temps de réponse (doit appeler Azure AD)
4. Appeler `getAccessToken()` seconde fois (dans les 3300s)
5. Mesurer temps de réponse (doit utiliser cache)
6. Vérifier format token

**Résultat attendu** :
- 🔑 Premier appel : Token obtenu depuis Azure AD (200-500ms)
- ⚡ Second appel : Token depuis cache (<1ms)
- ✅ Token format : `Bearer eyJ0eXAiOiJKV1QiLC...`
- ⏱️ Token valide pendant 3300s (3600s - 300s buffer)

**Métriques mesurées** :
- ✅ Premier appel : temps > 100ms (appel réseau)
- ✅ Second appel : temps < 5ms (cache)
- ✅ Token stocké dans `meteringApiService.accessToken`
- ✅ Expiry : `Date.now() + 3300000ms`


### Scénario 8 : API Marketplace - Succès (200 OK)

**Objectif** : Valider la gestion d'une réponse API réussie

**Étapes** :
1. Accumuler 10 messages
2. Émettre manuellement
3. Vérifier requête POST
4. Vérifier réponse API
5. Vérifier audit dans MeteredAuditLogs

**Résultat attendu** :

**Requête POST** :
```http
POST https://marketplaceapi.microsoft.com/api/usageEvent?api-version=2018-08-31
Authorization: Bearer eyJ0eXAi...
Content-Type: application/json

{
  "resourceId": "12345678-1234-1234-1234-123456789abc",
  "planId": "professional",
  "dimension": "pro",
  "quantity": 10,
  "effectiveStartTime": "2024-10-31T10:00:00.000Z"
}
```

**Réponse API (200 OK)** :
```json
{
  "usageEventId": "87654321-4321-4321-4321-cba987654321",
  "status": "Accepted",
  "messageTime": "2024-10-31T11:00:05.234Z",
  "resourceId": "12345678-1234-1234-1234-123456789abc",
  "quantity": 10,
  "dimension": "pro",
  "effectiveStartTime": "2024-10-31T10:00:00.000Z",
  "planId": "professional"
}
```

**Audit dans MeteredAuditLogs** :
```sql
INSERT INTO MeteredAuditLogs (
  SubscriptionId, 
  RequestJson, 
  ResponseJson, 
  StatusCode, 
  CreatedDate
) VALUES (
  '12345678-1234-1234-1234-123456789abc',
  '{"dimension":"pro","quantity":10,...}',
  '{"usageEventId":"87654321-...","status":"Accepted",...}',
  200,
  '2024-10-31T11:00:05.456Z'
)
```

**Métriques mesurées** :
- ✅ HTTP POST vers endpoint correct
- ✅ Headers : Authorization + Content-Type
- ✅ Body JSON valide
- ✅ Réponse 200 avec usageEventId
- ✅ Entrée MeteredAuditLogs créée
- ✅ Buffer vidé (entrée supprimée)


### Scénario 9 : API Marketplace - Erreur 409 (Duplicate)

**Objectif** : Valider la gestion des événements dupliqués (déjà émis cette heure)

**Étapes** :
1. Émettre événement avec quantity=10 à 11:00
2. Réessayer émission avec même resourceId+dimension+hour
3. Vérifier réponse 409
4. Vérifier que buffer est quand même vidé (événement déjà comptabilisé)

**Résultat attendu** :

**Réponse API (409 Conflict)** :
```json
{
  "message": "Duplicate usage event. This usage event has already been reported for this resource, for the hour starting at 2024-10-31T10:00:00Z",
  "additionalInfo": {
    "acceptedMessage": {
      "usageEventId": "original-event-guid",
      "status": "Accepted"
    }
  }
}
```

**Comportement** :
- ⚠️ Logger warning : "Duplicate event detected (409), already counted by Azure"
- ✅ Traiter comme succès (ne pas réessayer)
- 🗑️ Supprimer entrée du buffer
- 📝 Audit dans MeteredAuditLogs avec StatusCode=409

**Métriques mesurées** :
- ✅ Réponse 409 détectée
- ✅ Log warning (pas error)
- ✅ Buffer vidé (pas de retry)
- ✅ Audit créé avec StatusCode=409


### Scénario 10 : API Marketplace - Erreur 401 (Unauthorized)

**Objectif** : Valider la gestion d'erreurs d'authentification

**Étapes** :
1. Invalider token Azure AD (modifier clientSecret)
2. Tenter émission
3. Vérifier réponse 401
4. Vérifier que buffer conserve l'entrée (pour retry)
5. Restaurer credentials
6. Retry émission
7. Vérifier succès

**Résultat attendu** :

**Réponse API (401 Unauthorized)** :
```json
{
  "message": "The token is invalid or expired",
  "code": "Unauthorized"
}
```

**Comportement** :
- ❌ Logger error : "Authentication failed (401)"
- 🔄 Conserver entrée dans buffer pour retry
- 🔑 Invalider cache token (forcer renouvellement)
- 📝 Audit dans MeteredAuditLogs avec StatusCode=401
- ⏱️ Retry à la prochaine heure (12:00)

**Métriques mesurées** :
- ✅ Réponse 401 détectée
- ✅ Log error avec détails
- ✅ Buffer conservé (size = 1)
- ✅ Token cache invalidé
- ✅ Audit créé avec StatusCode=401
- ✅ Retry réussit après fix credentials


### Scénario 11 : API Marketplace - Erreur 400 (Bad Request)

**Objectif** : Valider la gestion d'erreurs de validation

**Étapes** :
1. Tenter émission avec quantity=0 (invalide)
2. Vérifier réponse 400
3. Vérifier comportement

**Résultat attendu** :

**Réponse API (400 Bad Request)** :
```json
{
  "message": "The usage event is invalid",
  "details": [
    {
      "target": "Quantity",
      "message": "Quantity must be greater than 0"
    }
  ]
}
```

**Comportement** :
- ❌ Logger error : "Invalid usage event (400): Quantity must be greater than 0"
- 🗑️ Supprimer entrée du buffer (données invalides, pas de retry)
- 📝 Audit dans MeteredAuditLogs avec StatusCode=400

**Métriques mesurées** :
- ✅ Réponse 400 détectée
- ✅ Log error avec détails de validation
- ✅ Buffer vidé (pas de retry pour données invalides)
- ✅ Audit créé avec StatusCode=400


### Scénario 12 : API Marketplace - Erreur 500 (Server Error)

**Objectif** : Valider la gestion d'erreurs serveur Azure

**Étapes** :
1. Simuler erreur 500 (mock)
2. Vérifier que buffer conserve l'entrée
3. Vérifier retry à la prochaine heure

**Résultat attendu** :

**Réponse API (500 Internal Server Error)** :
```json
{
  "message": "An internal server error occurred",
  "code": "InternalServerError"
}
```

**Comportement** :
- ❌ Logger error : "Marketplace API error (500): Internal Server Error"
- 🔄 Conserver entrée dans buffer pour retry
- 📝 Audit dans MeteredAuditLogs avec StatusCode=500
- ⏱️ Retry automatique à 12:00 (prochaine heure)

**Métriques mesurées** :
- ✅ Réponse 500 détectée
- ✅ Log error
- ✅ Buffer conservé (size = 1)
- ✅ Audit créé avec StatusCode=500
- ✅ Retry à la prochaine émission cron


### Scénario 13 : Persistance du buffer (shutdown)

**Objectif** : Valider la sauvegarde du buffer au shutdown

**Étapes** :
1. Accumuler 25 messages dans buffer (3 subscriptions différentes)
2. Envoyer signal SIGTERM (shutdown)
3. Vérifier sauvegarde dans `data/usage-buffer.json`
4. Redémarrer service
5. Vérifier restauration du buffer

**Résultat attendu** :

**Fichier `data/usage-buffer.json`** :
```json
[
  {
    "key": "sub-A:professional:pro:1730383200000",
    "subscriptionId": "sub-A",
    "planId": "professional",
    "dimension": "pro",
    "quantity": 15,
    "hour": 1730383200000,
    "firstSeen": 1730383245678
  },
  {
    "key": "sub-B:starter:free:1730383200000",
    "subscriptionId": "sub-B",
    "planId": "starter",
    "dimension": "free",
    "quantity": 7,
    "hour": 1730383200000,
    "firstSeen": 1730383267890
  },
  {
    "key": "sub-C:pro-plus:pro-plus:1730383200000",
    "subscriptionId": "sub-C",
    "planId": "pro-plus",
    "dimension": "pro-plus",
    "quantity": 3,
    "hour": 1730383200000,
    "firstSeen": 1730383289012
  }
]
```

**Après restart** :
- 📂 Fichier lu automatiquement
- 🔄 Buffer restauré avec 3 entrées
- ✅ Données identiques (subscriptionId, quantity, hour, firstSeen)

**Métriques mesurées** :
- ✅ Signal SIGTERM capturé
- ✅ Fichier créé dans `data/usage-buffer.json`
- ✅ JSON valide
- ✅ 3 entrées sauvegardées
- ✅ Buffer.size = 3 après restart
- ✅ Quantités conservées (15, 7, 3)


### Scénario 14 : Monitoring - Endpoint stats

**Objectif** : Valider l'endpoint de monitoring du buffer

**Étapes** :
1. Accumuler des messages dans buffer
2. Appeler `usageAggregationService.getStats()`
3. Vérifier format de réponse

**Résultat attendu** :
```javascript
{
  totalEntries: 3,
  entries: [
    {
      key: "sub-A:professional:pro:1730383200000",
      subscriptionId: "sub-A",
      planId: "professional",
      dimension: "pro",
      quantity: 15,
      hour: "2024-10-31T10:00:00.000Z",  // ISO 8601
      firstSeen: "2024-10-31T10:04:05.678Z"
    },
    {
      key: "sub-B:starter:free:1730383200000",
      subscriptionId: "sub-B",
      planId: "starter",
      dimension: "free",
      quantity: 7,
      hour: "2024-10-31T10:00:00.000Z",
      firstSeen: "2024-10-31T10:07:47.890Z"
    },
    {
      key: "sub-C:pro-plus:pro-plus:1730383200000",
      subscriptionId: "sub-C",
      planId: "pro-plus",
      dimension: "pro-plus",
      quantity: 3,
      hour: "2024-10-31T10:00:00.000Z",
      firstSeen: "2024-10-31T10:09:49.012Z"
    }
  ]
}
```

**Métriques mesurées** :
- ✅ totalEntries = nombre d'entrées dans buffer
- ✅ Chaque entrée contient : key, subscriptionId, planId, dimension, quantity, hour (ISO), firstSeen (ISO)
- ✅ Format JSON valide


### Scénario 15 : Test de charge (100 messages en 1 minute)

**Objectif** : Valider les performances sous charge

**Étapes** :
1. Émettre 100 messages en 60 secondes (même subscription+dimension)
2. Mesurer temps d'accumulation moyen
3. Vérifier buffer final
4. Émettre vers API
5. Mesurer temps total

**Résultat attendu** :
- ⚡ Temps d'accumulation moyen : < 1ms par message
- ✅ Buffer contient 1 entrée avec quantity=100
- 📤 Émission API : 1 requête avec quantity=100
- ⏱️ Temps total émission : < 1 seconde

**Métriques mesurées** :
- ✅ Temps accumulation : < 100ms pour 100 messages
- ✅ Mémoire buffer : < 1KB pour 100 messages
- ✅ 1 seule requête API (pas 100)
- ✅ Pas de perte de données


## Métriques de succès globales

### Performance
- ✅ Accumulation : < 1ms par message
- ✅ Émission API : < 2 secondes pour 100 messages agrégés
- ✅ Mémoire buffer : < 1KB par 1000 messages

### Fiabilité
- ✅ 100% des messages accumulés correctement
- ✅ 0% de perte de données après restart
- ✅ Gestion gracieuse de 100% des erreurs API

### Conformité
- ✅ Respect de la limite "1 événement/heure" de l'API Marketplace
- ✅ Format requête conforme à API version 2018-08-31
- ✅ Token Azure AD valide et renouvelé automatiquement

## Outils et environnement de test

### ⚠️ IMPORTANT : Éviter les risques de facturation

**ATTENTION** : Tester avec un abonnement Pro Plus ou Starter **réel** peut entraîner des frais !
- Plan **Pro Plus** ($49.99/mois) : 1500 messages inclus, messages supplémentaires facturés à $0.01/message
- Plan **Starter** ($0/mois) : 50 messages inclus, messages supplémentaires facturés à $0.02/message

**Solution recommandée** : Utiliser une **stratégie de test en 3 niveaux** pour éviter tout coût.

## 🎯 Stratégie de test en 4 niveaux

Cette stratégie offre une couverture complète, du mock local aux tests interactifs en environnement réel.

### Niveau 1 : Tests unitaires (Mock API) - 0% risque facturation

**Objectif** : Tester la logique d'agrégation sans connectivité Azure

**Approche** :
- Mock complet de l'API Marketplace
- Simulation de toutes les réponses (200, 409, 400, 401, 500)
- Tests rapides (< 1 seconde par scénario)

**Commande** :
```bash
npm run test:aggregation:unit
```

**Configuration** :
```javascript
// scripts/mocks/mockMarketplaceAPI.js
class MockMarketplaceAPI {
  constructor() {
    this.emittedEvents = [];
  }

  async emitUsageEvent(subscriptionId, planId, dimension, quantity, effectiveStartTime) {
    // Simuler délai réseau
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simuler validation
    if (quantity === 0) {
      return { success: false, status: 400, error: 'Quantity must be > 0' };
    }

    // Simuler duplicate detection
    const hourKey = new Date(effectiveStartTime).toISOString().substring(0, 13);
    if (this.emittedEvents.some(e => 
      e.subscriptionId === subscriptionId && 
      e.dimension === dimension && 
      e.hourKey === hourKey
    )) {
      return { success: false, status: 409, error: 'Duplicate event' };
    }

    // Simuler succès
    const event = {
      usageEventId: `mock-${Date.now()}`,
      status: 'Accepted',
      subscriptionId,
      planId,
      dimension,
      quantity,
      effectiveStartTime,
      hourKey
    };

    this.emittedEvents.push(event);
    return { success: true, status: 200, data: event };
  }
}
```

**Scénarios couverts** :
- ✅ Accumulation locale (scénarios 1-4)
- ✅ Émission horaire (scénarios 5-6)
- ✅ Gestion erreurs API (scénarios 8-12)
- ✅ Persistance buffer (scénario 13)
- ✅ Test de charge (scénario 15)

**Avantages** :
- ✅ **0% risque de facturation**
- ✅ Tests ultra-rapides (pas de réseau)
- ✅ Contrôle total des scénarios d'erreur
- ✅ Pas besoin de credentials Azure
- ✅ Reproductible à 100%

---

### Niveau 2 : Tests d'intégration (Plan Development + Mode Test) - 0% risque facturation

**Objectif** : Tester avec la vraie API Marketplace sans risque de facturation

**⚠️ PRÉREQUIS** : Modifier `src/services/meteringApiService.js` pour supporter `MARKETPLACE_TEST_MODE` (voir section "Modification code requise" ci-dessous)

**Approche** :
- Utiliser plan **development** (gratuit, illimité)
- Activer dimension de test `dev-test` via `MARKETPLACE_TEST_MODE=true`
- Vraie authentification Azure AD
- Vraies requêtes POST vers Marketplace API
- Azure accepte les événements mais **ne facture RIEN** (plan gratuit)

**Commande** :
```bash
MARKETPLACE_TEST_MODE=true npm run test:aggregation:integration
```

**Configuration** :
```bash
# .env.test
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_TEST_MODE=true  # ← Active dimension 'dev-test' pour plan development
MARKETPLACE_TENANT_ID=your-tenant-id
MARKETPLACE_CLIENT_ID=your-client-id
MARKETPLACE_CLIENT_SECRET=your-secret
```

**⚠️ Modification code requise (À IMPLÉMENTER)** :

Avant d'exécuter les tests de niveau 2, vous DEVEZ modifier le fichier `src/services/meteringApiService.js` :

```javascript
// src/services/meteringApiService.js - Ligne ~33
// AVANT (code actuel) :
this.dimensionMap = {
    'development': null,  // Pas de tracking
    'starter': 'free',
    'professional': 'pro',
    'pro-plus': 'pro-plus'
};

// APRÈS (modification requise) :
this.dimensionMap = {
    'development': process.env.MARKETPLACE_TEST_MODE === 'true' ? 'dev-test' : null,
    'starter': 'free',
    'professional': 'pro',
    'pro-plus': 'pro-plus'
};
```

Cette modification permet d'activer le tracking avec dimension `dev-test` pour le plan development uniquement en mode test.

**Scénarios couverts** :
- ✅ Authentification Azure AD réelle (scénario 7)
- ✅ Format requête API conforme (scénario 8)
- ✅ Gestion vraies réponses 409, 400, 401 (scénarios 9-11)
- ✅ Détection problèmes connectivité

**Avantages** :
- ✅ **0% risque de facturation** (plan development gratuit)
- ✅ Valide authentification Azure AD
- ✅ Valide format requête conforme
- ✅ Détecte problèmes réseau/connectivité
- ✅ Événements visibles dans Azure Marketplace Portal (pour monitoring)

**Inconvénients** :
- ⚠️ Nécessite credentials Azure valides
- ⚠️ Tests plus lents (délai réseau ~200-500ms)

### Niveau 3 : Tests E2E (Sandbox avec abonnement test) - ⚠️ Risque facturation contrôlé

**Objectif** : Valider comportement production exact avant release

**Approche** :
- Créer abonnement `starter` dédié aux tests (50 messages inclus)
- Tester avec dimension `free` (facturation réelle)
- Monitorer usage dans Azure Marketplace Portal
- **IMPORTANT** : Limiter à 20-30 messages MAX pour rester dans quota gratuit

**Commande** :
```bash
# ⚠️ ATTENTION : Peut entraîner des frais si > 50 messages !
npm run test:aggregation:e2e
```

**Configuration** :
```bash
# .env.e2e
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_TEST_MODE=false  # ← Utiliser dimension réelle
# Utiliser subscription avec plan 'starter'
# Quota inclus : 50 messages gratuits
# Dépassement : $0.02 par message
```

**Scénarios couverts** :
- ✅ Facturation réelle Azure Marketplace
- ✅ Validation quota et dépassement
- ✅ Comportement production exact

**Avantages** :
- ✅ Valide comportement production exact
- ✅ Détecte problèmes spécifiques à facturation réelle

**Inconvénients** :
- ⚠️ **Risque de facturation** si > 50 messages
- ⚠️ Nécessite abonnement test dédié
- ⚠️ Coût potentiel : $0.02 par message au-delà de 50

**Précautions** :
1. Créer abonnement `starter` dédié aux tests
2. Limiter à 30 messages maximum (buffer sécurité)
3. Monitorer usage dans Azure Portal
4. Supprimer abonnement immédiatement après tests

## 📋 Scripts de test

### 1. `scripts/test-aggregation-unit.js` (Niveau 1)
Tests unitaires avec mock API :
- Accumulation dans buffer (scénarios 1-4)
- Émission horaire (scénarios 5-6)
- Gestion erreurs simulées (scénarios 8-12)
- Persistance buffer (scénario 13)

### 2. `scripts/test-aggregation-integration.js` (Niveau 2)
Tests d'intégration avec vraie API (plan development) :
- Authentification Azure AD (scénario 7)
- Émission vers vraie API Marketplace (scénario 8)
- Gestion vraies erreurs 409, 401 (scénarios 9-10)

### 3. `scripts/test-aggregation-e2e.js` (Niveau 3)
Tests end-to-end avec facturation réelle (⚠️ utiliser avec précaution) :
- Facturation réelle testée
- Validation quota et dépassement
- **Limité à 30 messages maximum**

### 4. `test-saas-playground/` (Niveau 4)
Tests interactifs en environnement Playground :
- Commandes de diagnostic (Makefile)
- Monitoring en temps réel (buffer, audit logs, API)
- Scénarios utilisateur pré-définis
- **Documentation complète** : [TEST-PLAN-PLAYGROUND.md](./TEST-PLAN-PLAYGROUND.md)

## 🏃 Exécution des tests

### Tests recommandés en développement
```bash
# 1. Tests unitaires (rapides, 0% coût)
npm run test:aggregation:unit

# 2. Tests d'intégration (vraie API, 0% coût avec plan development)
MARKETPLACE_TEST_MODE=true npm run test:aggregation:integration

# 3. Tests Playground (interactifs, environment Teams réel)
cd test-saas-playground
make start-playground
make get-subscription
make count-buffer-messages
# Envoyer messages via Teams...
make show-audit-logs
```

### Tests avant release production
```bash
# 4. Tests E2E (⚠️ risque facturation, max 30 messages)
npm run test:aggregation:e2e -- --max-messages=30
```

## 🌍 Environnement

### Prérequis
- **Node.js** : v20 ou v22
- **Azure AD** : App registration avec credentials valides (pour niveaux 2 et 3)
- **Azure SQL** : Base SaaS Accelerator avec tables Subscriptions + MeteredAuditLogs

### Variables d'environnement

#### Niveau 1 (Mock)
```bash
MARKETPLACE_METERING_ENABLED=false  # Pas d'appel API
```

#### Niveau 2 (Integration - Plan Development)
```bash
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_TEST_MODE=true  # ← Active dimension 'dev-test'
MARKETPLACE_TENANT_ID=your-tenant-id
MARKETPLACE_CLIENT_ID=your-client-id
MARKETPLACE_CLIENT_SECRET=your-secret
```

#### Niveau 3 (E2E - Plan Starter)
```bash
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_TEST_MODE=false  # Dimension réelle 'free'
MARKETPLACE_TENANT_ID=your-tenant-id
MARKETPLACE_CLIENT_ID=your-client-id
MARKETPLACE_CLIENT_SECRET=your-secret
# ⚠️ Utiliser subscription avec plan 'starter' (50 messages gratuits)
```

## Critères d'acceptation

### ✅ Tests passés
- Tous les 15 scénarios ci-dessus doivent passer
- Aucune régression des fonctionnalités existantes (subscription check, usage tracking)

### ✅ Documentation
- README.md mis à jour avec section "Agrégation d'usage"
- ARCHITECTURE.md reflète le flux avec agrégation
- configuration-saas.md documente variables MARKETPLACE_*

### ✅ Monitoring
- Logs clairs pour chaque étape (accumulation, émission, erreurs)
- Endpoint stats accessible pour monitoring production

### ✅ Résilience
- Aucun crash lors d'erreurs API
- Buffer persisté et restauré après restart
- Utilisateurs jamais bloqués par erreurs de facturation

## Prochaines étapes

1. ✅ **Implémenter UsageAggregationService** (FAIT)
2. ✅ **Mettre à jour ARCHITECTURE.md** (FAIT)
3. ✅ **Créer documentation Playground niveau 4** (FAIT)
4. 🔜 **Modifier meteringApiService pour supporter MARKETPLACE_TEST_MODE** (REQUIS pour niveau 2)
5. �� **Créer script de test niveau 1** (`test-aggregation-unit.js`)
6. 🔜 **Créer script de test niveau 2** (`test-aggregation-integration.js`) - après étape 4
7. 🔜 **Créer script de test niveau 3** (`test-aggregation-e2e.js`)
8. 🔜 **Créer infrastructure Playground niveau 4** (`test-saas-playground/`)
9. 🔜 **Exécuter tests et valider tous les scénarios** (niveaux 1-4)
10. 🔜 **Documenter résultats dans rapport de test**
11. 🔜 **Commit final et tag v1.2.7**

---

## ❓ FAQ : Questions fréquentes sur les tests

### Q1 : "Est-ce que je risque d'être facturé si je teste avec plan Pro Plus ?"

**Réponse : OUI, absolument !** ⚠️

Si vous avez un abonnement Pro Plus actif dans Azure Marketplace et que vous émettez des événements d'usage via l'API, Azure Marketplace facturera réellement ces événements.

**Exemple de facturation** :
- Plan Pro Plus : $49.99/mois + 1500 messages inclus
- Test avec 20 messages → 20 messages comptabilisés
- Si vous avez déjà utilisé 1490 messages ce mois-ci → 10 messages × $0.01 = **$0.10 facturés**

**Solution** : Utilisez la **stratégie de test niveau 2** (plan development avec `MARKETPLACE_TEST_MODE=true`) pour 0% de risque.

### Q2 : "Est-ce que les tests utilisent le vrai Marketplace ou un mock ?"

**Réponse : Les deux, selon le niveau de test.**

- **Niveau 1 (Mock API)** : Mock complet, aucun appel réel à Azure
  - Simuler toutes les réponses (200, 409, 400, 500)
  - Tests ultra-rapides (< 1s)
  - 0% coût, 0% réseau

- **Niveau 2 (Integration)** : Vraie API Marketplace avec plan development
  - Vraies requêtes POST vers `https://marketplaceapi.microsoft.com/api/usageEvent`
  - Vraie authentification Azure AD
  - Azure accepte les événements mais ne facture rien (plan gratuit)

- **Niveau 3 (E2E)** : Vraie API avec facturation réelle (⚠️ utiliser avec précaution)

**Recommandation** : Utiliser niveaux 1+2 en développement quotidien, niveau 3 seulement avant release production.

### Q3 : "Pourquoi ne pas utiliser le plan development qui est gratuit ?"

**Réponse : Excellente question ! C'est exactement ce qu'on fait au niveau 2.**

Le problème actuel dans le code est que le plan `development` **skip complètement** le tracking :

```javascript
// Code actuel (src/services/meteringApiService.js)
this.dimensionMap = {
    'development': null,  // ← Pas de tracking !
    'starter': 'free',
    'professional': 'pro',
    'pro-plus': 'pro-plus'
};
```

**Solution proposée** : Mode test avec dimension `dev-test` (⚠️ modification code requise) :

```javascript
// Code à implémenter dans src/services/meteringApiService.js
this.dimensionMap = {
    'development': process.env.MARKETPLACE_TEST_MODE === 'true' ? 'dev-test' : null,
    'starter': 'free',
    'professional': 'pro',
    'pro-plus': 'pro-plus'
};
```

Avec `MARKETPLACE_TEST_MODE=true` :
- ✅ Plan development émet événements avec dimension `dev-test`
- ✅ Azure Marketplace accepte les événements
- ✅ **Aucune facturation** (plan development gratuit)
- ✅ Événements visibles dans Azure Portal pour monitoring

### Q4 : "Faudrait-il adapter le plan development pour faire des tests plus significatifs ?"

**Réponse : Oui, c'est exactement ce que fait `MARKETPLACE_TEST_MODE=true`.**

**Modification requise** :
```javascript
// src/services/meteringApiService.js - Ligne 33
this.dimensionMap = {
    'development': process.env.MARKETPLACE_TEST_MODE === 'true' ? 'dev-test' : null,
    // ...
};
```

**Usage** :
```bash
# Mode production (pas de tracking pour development)
MARKETPLACE_TEST_MODE=false
# → Plan development ne track rien (comportement actuel)

# Mode test (tracking avec dimension dev-test)
MARKETPLACE_TEST_MODE=true
# → Plan development track avec dimension 'dev-test'
# → Événements émis vers Azure Marketplace
# → Aucune facturation (plan gratuit)
```

**Avantages** :
- ✅ Teste flux complet (accumulation → émission → API → audit)
- ✅ Valide authentification Azure AD
- ✅ Valide format requête conforme
- ✅ Détecte erreurs 409 (duplicate), 400 (validation)
- ✅ **0% risque de facturation**

**Alternative sans modification code** : Utiliser mock API (niveau 1) pour tests unitaires sans connectivité Azure.

### Q5 : "Comment monitorer les événements de test dans Azure ?"

**Réponse : Via Azure Marketplace Portal.**

Lorsque vous utilisez le niveau 2 (integration) avec plan development :
1. Connectez-vous à [Azure Portal](https://portal.azure.com)
2. Naviguez vers **Azure Marketplace** → **Usage Reports**
3. Filtrez par subscription avec plan `development`
4. Vous verrez les événements avec dimension `dev-test`

**Exemple d'événements visibles** :
```
Date                  | Subscription ID | Plan        | Dimension | Quantity | Status
2024-10-31 10:00:00  | abc-123         | development | dev-test  | 20       | Accepted
2024-10-31 11:00:00  | abc-123         | development | dev-test  | 15       | Accepted
```

**Note** : Ces événements sont acceptés par Azure mais **ne génèrent aucune facturation**.

### Q6 : "Combien coûte le niveau 3 (E2E) avec plan starter ?"

**Réponse : Potentiellement $0 si < 50 messages, sinon $0.02 par message supplémentaire.**

**Calcul** :
- Plan Starter : $0/mois (gratuit)
- Quota inclus : 50 messages/mois
- Dépassement : $0.02 par message

**Exemples** :
- Test avec 30 messages → **$0** (dans quota gratuit)
- Test avec 60 messages → **$0.20** (10 messages × $0.02)
- Test avec 100 messages → **$1.00** (50 messages × $0.02)

**Recommandation** : Limiter à 30 messages maximum pour rester dans quota gratuit + buffer sécurité.

### Q7 : "Puis-je tester sans avoir Azure AD credentials ?"

**Réponse : Oui, avec le niveau 1 (mock API).**

Le niveau 1 (tests unitaires) ne nécessite **aucune connectivité Azure** :
- Pas de credentials requis
- Pas d'authentification Azure AD
- Mock complet de l'API Marketplace
- Tests 100% en local

**Commande** :
```bash
npm run test:aggregation:unit
```

**Cas d'usage** :
- Développement hors connexion
- Tests sur CI/CD sans secrets Azure
- Validation logique d'agrégation pure
- Tests rapides en développement quotidien

Pour niveaux 2 et 3, vous avez besoin de :
- `MARKETPLACE_TENANT_ID`
- `MARKETPLACE_CLIENT_ID`
- `MARKETPLACE_CLIENT_SECRET`

**Document rédigé le** : 2024-10-31  
**Version** : 1.1  
**Dernière mise à jour** : 2024-11-01  
**Auteur** : GitHub Copilot  
**Statut** : ✅ Approuvé pour implémentation
