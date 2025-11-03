# Configuration du Scheduler SaaS Accelerator

## Date: 3 novembre 2025

## Problème initial

La subscription `heon-net` était en statut `PendingFulfillmentStart` et aucun Scheduler n'était configuré.

## Actions réalisées

### 1. Activation de la subscription ✅

**État initial**: `PendingFulfillmentStart`  
**État final**: `Subscribed`

### 2. Configuration des dimensions ✅

**Problème découvert**: Décalage entre Partner Center et la base de données

- **Partner Center** (dimensions valides): free, pro, pro-plus, starter
- **Base de données** (plan dev-01): dev ❌

**Solution**: Ajout de la dimension "free" au plan dev-01

```sql
INSERT INTO MeteredDimensions (Dimension, Description, PlanId, CreatedDate)
VALUES ('free', 'Free tier', 6, GETUTCDATE())
```

### 3. Création du Scheduler ✅

**Configuration**:
```
Scheduler ID: 4
Nom: heon-net-free-hourly
Subscription: heon-net (ID: 3)
Plan: dev-01 (ID: 6)
Dimension: free (ID: 9)
Fréquence: Hourly (ID: 1)
Quantité: 0.01
Date début: 2025-11-03 10:47:46 UTC
```

**Requête SQL**:
```sql
INSERT INTO MeteredPlanSchedulerManagement 
(SchedulerName, SubscriptionId, PlanId, DimensionId, FrequencyId, Quantity, StartDate)
VALUES (
  'heon-net-free-hourly',
  3,  -- heon-net
  6,  -- dev-01
  9,  -- free
  1,  -- Hourly
  0.01,
  GETUTCDATE()
);
```

## Résultat

✅ **Scheduler actif et prêt à émettre**

Le Scheduler s'exécutera automatiquement chaque heure et enverra:
- 0.01 unité de la dimension "free"
- Vers l'API Azure Marketplace
- Pour la subscription heon-net (B8C115C2-FEC3-4B75-DDD9-39FF53FEBB38)

## Commandes utiles

```bash
# Lister les Schedulers
make list-schedulers

# Voir les messages émis
make message-diag

# Compter les messages Marketplace
make message-count-market

# Activer une subscription
make activate-subscription SUB=<nom>
```

## Prochaines étapes

1. ⏳ Attendre la prochaine heure (ex: 11:00 UTC) pour voir la première émission
2. 🔍 Vérifier avec `make message-diag` que les messages sont émis
3. ✅ Valider que l'API Marketplace accepte les messages (200 OK + usageEventId)
4. 📝 Fermer l'Issue #6 une fois la validation complète

## Scripts créés

1. **configure-scheduler.js** (380 lignes)
   - Modes: create, update, delete, list
   - Usage SQL direct pour configuration Scheduler

2. **activate-subscription.js** (110 lignes)
   - Active une subscription PendingFulfillmentStart → Subscribed
   - Commande: `make activate-subscription SUB=<nom>`

## Références

- Tables SaaS Accelerator:
  - `MeteredPlanSchedulerManagement` (table principale)
  - `SchedulerManagerView` (vue de lecture)
  - `MeteredDimensions` (dimensions par plan)
  - `SchedulerFrequency` (fréquences disponibles)
  - `Subscriptions` (subscriptions actives)
  - `Plans` (plans configurés)
