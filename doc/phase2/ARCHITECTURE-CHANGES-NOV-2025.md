# Changements d'architecture - Novembre 2025

## Vue d'ensemble

Ce document décrit les changements architecturaux majeurs apportés au système de facturation Marketplace en novembre 2025.

## Problème identifié

L'implémentation initiale avait placé la logique d'agrégation et d'émission vers l'API Marketplace dans l'application Teams elle-même, via un service `usageAggregationService.js`. Cette approche était **incorrecte** car:

1. ❌ **Duplication de logique** : Le SaaS Accelerator possède déjà un Metered Scheduler intégré
2. ❌ **Complexité inutile** : L'application Teams n'a pas besoin de gérer l'émission
3. ❌ **Couplage fort** : L'app Teams devait rester en ligne pour émettre les événements
4. ❌ **Non conforme à l'architecture Microsoft** : Le SaaS Accelerator est conçu pour cette tâche

## Découverte clé

**Question posée par l'utilisateur** (qui a révélé le problème):
> "en fait, le cron ne devrait-il pas tourner dans l'une des ressources du resource group de rg-saasaccel-teams-gpt-02 ?"

Cette question a mené à l'analyse de l'architecture du SaaS Accelerator et à la découverte du composant `MeteredTriggerJob` existant.

## Ancienne architecture (INCORRECTE)

```
┌─────────────────────────────┐
│   Application Teams (Node)  │
│                             │
│  1. usageTrackingMiddleware │
│       ↓                     │
│  2. saasIntegration         │
│       ↓                     │
│  3. usageAggregationService │  ❌ INCORRECT
│       - accumulate()        │
│       - buffer local        │
│       - cron job            │
│       ↓                     │
│  4. meteringApiService      │  ❌ INCORRECT
│       - emitUsageEvent()    │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│     Marketplace API         │
└─────────────────────────────┘
```

**Fichiers impliqués (SUPPRIMÉS):**
- `src/services/usageAggregationService.js` (335 lignes)
- `src/services/meteringApiService.js` (orphelin)
- `data/usage-buffer.json`
- `test-saas-playground/diagnostic-marketplace.js`
- `test-saas-playground/scripts/force-emit-pending.js`

## Nouvelle architecture (CORRECTE)

```
┌─────────────────────────────┐
│   Application Teams (Node)  │
│                             │
│  1. usageTrackingMiddleware │
│       ↓                     │
│  2. saasIntegration         │
│       - recordMessageUsage()│  ✅ SIMPLIFIÉ
│       ↓                     │
└─────────────────────────────┘
         │
         │ INSERT INTO MeteredAuditLogs
         ▼
┌─────────────────────────────┐
│   SQL Database              │
│   MeteredAuditLogs          │
│   (ResponseJson = NULL)     │
└─────────────────────────────┘
         │
         │ Lit les messages
         ▼
┌─────────────────────────────┐
│   SaaS Accelerator (C#)     │
│   Admin Portal              │
│   (sac-02-admin)            │
│                             │
│  - MeteredTriggerJob        │  ✅ CORRECT
│  - Scheduler Manager        │
│  - Agrégation horaire       │
│  - Émission vers API        │
└─────────────────────────────┘
         │
         │ POST /api/usageEvent
         ▼
┌─────────────────────────────┐
│     Marketplace API         │
└─────────────────────────────┘
         │
         │ Response (usageEventId)
         ▼
┌─────────────────────────────┐
│   SQL Database              │
│   MeteredAuditLogs          │
│   (ResponseJson = data)     │  ✅ MIS À JOUR
└─────────────────────────────┘
```

## Modifications effectuées

### 1. Suppression de fichiers

```bash
# Services d'agrégation (incorrects)
rm src/services/usageAggregationService.js
rm data/usage-buffer.json

# Scripts de diagnostic obsolètes
rm test-saas-playground/diagnostic-marketplace.js
rm test-saas-playground/scripts/force-emit-pending.js
```

### 2. Simplification du code

#### `src/app/app.js`
**Avant:**
```javascript
const usageAggregationService = require('../services/usageAggregationService');

(async () => {
  const aggregationService = usageAggregationService.getInstance();
  await aggregationService.initialize();
  console.log('[App] Usage aggregation service initialized');
})();
```

**Après:**
```javascript
// Note: Marketplace metering emission is handled by the SaaS Accelerator Scheduler
// The Teams app only records usage in MeteredAuditLogs
```

#### `src/services/saasIntegration.js`
**Avant:**
```javascript
const usageAggregationService = require('./usageAggregationService');

async recordMessageUsage(...) {
  // ÉTAPE 1: Accumuler dans le service d'agrégation
  const aggregationService = usageAggregationService.getInstance();
  await aggregationService.accumulate(...);
  
  // ÉTAPE 2: Insérer dans MeteredAuditLogs
  await pool.request().query`INSERT INTO MeteredAuditLogs ...`;
}
```

**Après:**
```javascript
// Note: Marketplace emission is handled by SaaS Accelerator Metered Scheduler
// This service only records usage in MeteredAuditLogs

async recordMessageUsage(...) {
  // Enregistrer dans MeteredAuditLogs uniquement
  await pool.request().query`INSERT INTO MeteredAuditLogs ...`;
}
```

### 3. Nouveaux outils de diagnostic

#### `make message-diag` (NOUVEAU)
Script complet de diagnostic montrant:
- Messages dans la BD
- Messages en transit (non émis)
- Prochaine transmission du Scheduler
- Messages enregistrés dans Marketplace
- Configuration du Metered Billing

### 4. Documentation mise à jour

- ✅ `doc/phase2/saas-accelerator-metered-scheduler.md` (NOUVEAU)
- ✅ `doc/phase2/ARCHITECTURE.md` (MIS À JOUR)
- ✅ `doc/phase2/TEST-PLAN-PLAYGROUND.md` (MIS À JOUR)
- ✅ `test-saas-playground/README.md` (MIS À JOUR)
- ✅ `test-saas-playground/scripts/README.md` (NOUVEAU)

## Avantages de la nouvelle architecture

### Séparation des responsabilités

| Composant | Responsabilité |
|-----------|----------------|
| **Teams App** | Enregistrer l'usage uniquement |
| **SaaS Accelerator** | Agréger et émettre vers Marketplace |
| **Marketplace API** | Recevoir et facturer |

### Simplicité

- ✅ Teams app: ~50 lignes de code en moins
- ✅ Pas de gestion de buffer local
- ✅ Pas de cron job à maintenir
- ✅ Pas de retry logic à implémenter

### Fiabilité

- ✅ Service centralisé (SaaS Accelerator)
- ✅ Gestion professionnelle des erreurs
- ✅ Monitoring intégré
- ✅ Dashboard d'administration

### Conformité Microsoft

- ✅ Utilise les composants SaaS Accelerator comme prévu
- ✅ Architecture standard pour Marketplace
- ✅ Support et documentation Microsoft disponibles

## Configuration requise

### 1. Activer le Metered Billing

```sql
UPDATE [dbo].[ApplicationConfiguration]
SET [Value] = 'true'
WHERE [Name] = 'IsMeteredBillingEnabled'
```

### 2. Créer un Scheduler dans le portail admin

Accéder à: `https://sac-02-admin.azurewebsites.net`

1. Naviguer vers **Scheduler Manager**
2. Cliquer sur **Add New Scheduled Metered Trigger**
3. Configurer:
   - Subscription: Playground Subscription
   - Plan: dev-01
   - Dimension: dev
   - Frequency: Hourly
   - Start Date: Date/heure de début

### 3. Vérifier l'état

```bash
cd test-saas-playground
make message-diag
```

## Contraintes Marketplace API

**Règle Microsoft:**
> Only one usage event can be emitted for each hour of a calendar day per resource and dimension.

Le SaaS Accelerator gère automatiquement:
- ✅ Agrégation des messages par heure
- ✅ Une seule émission par heure/dimension
- ✅ Gestion des erreurs 409 (duplicate)
- ✅ Retry automatique en cas d'échec

## Migration des données

**Aucune migration nécessaire!**

Les messages déjà enregistrés dans `MeteredAuditLogs` avec `ResponseJson = NULL` seront automatiquement traités par le Scheduler lors de sa première exécution.

**Exemple:**
- 9 messages enregistrés (heures 11h et 12h UTC)
- Scheduler configuré pour démarrer à 19h UTC
- À 19h: Le Scheduler lira ces 9 messages, agrégera par heure, et émettra 2 événements vers Marketplace
- Résultat: `ResponseJson` sera rempli pour les 9 messages

## Tests de validation

### Test 1: Vérifier les messages en transit
```bash
make message-diag
```
**Attendu:** Affiche le nombre de messages avec `ResponseJson = NULL`

### Test 2: Vérifier le Scheduler
```bash
make message-diag
```
**Attendu:** Affiche "Prochaine transmission prévue" avec date/heure

### Test 3: Attendre l'émission automatique
```bash
# Attendre l'heure du Scheduler
# Puis vérifier
make message-diag
```
**Attendu:** Messages en transit = 0, Messages émis augmente

### Test 4: Vérifier les réponses API
```bash
make message-count-market
```
**Attendu:** Tous les messages ont un `ResponseJson` avec `usageEventId`

## Références

- [SaaS Accelerator Metered Scheduler Documentation](./saas-accelerator-metered-scheduler.md)
- [Microsoft Marketplace Metering Service APIs](https://learn.microsoft.com/en-us/partner-center/marketplace/marketplace-metering-service-apis)
- [Commercial Marketplace SaaS Accelerator GitHub](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator)

## Conclusion

Cette refactorisation majeure aligne notre implémentation avec l'architecture standard du SaaS Accelerator Microsoft. Elle simplifie considérablement le code de l'application Teams tout en assurant une émission fiable vers l'API Marketplace.

**Bénéfices:**
- ✅ Code plus simple et maintenable
- ✅ Architecture conforme aux standards Microsoft
- ✅ Meilleure séparation des responsabilités
- ✅ Service d'émission centralisé et fiable
