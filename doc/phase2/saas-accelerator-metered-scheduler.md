# Configuration du SaaS Accelerator Metered Scheduler

## Vue d'ensemble

Le **Metered Scheduler Manager** du SaaS Accelerator est responsable de:
- Lire les messages enregistrés dans `MeteredAuditLogs`
- Agréger les messages par heure (conformément aux contraintes Marketplace API)
- Émettre les événements vers l'API Azure Marketplace Metering

Notre application Teams **enregistre seulement** l'usage dans la base de données. L'émission vers Marketplace est gérée par le SaaS Accelerator.

## Architecture

```
┌─────────────────────┐
│  Application Teams  │
│                     │
│  1. Enregistre      │──────┐
│     messages dans   │      │
│     MeteredAuditLogs│      │
└─────────────────────┘      │
                             │
                             ▼
                    ┌────────────────────┐
                    │  SQL Database      │
                    │  MeteredAuditLogs  │
                    └────────────────────┘
                             │
                             │ Lit & agrège
                             ▼
                    ┌────────────────────┐
                    │  SaaS Accelerator  │
                    │  Metered Scheduler │
                    │                    │
                    │  - Agrégation/heure│
                    │  - Émission API    │
                    └────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │  Marketplace API   │
                    └────────────────────┘
```

## Prérequis

1. ✅ SaaS Accelerator déployé dans Azure (groupe: `rg-saasaccel-teams-gpt-02`)
2. ✅ Base de données configurée avec `IsMeteredBillingEnabled=true`
3. ✅ Credentials Azure AD configurés pour l'App Registration

## Configuration

### 1. Activer le Metered Billing dans la base de données

Vérifier que `IsMeteredBillingEnabled` est activé:

```sql
SELECT [Name], [Value] 
FROM [dbo].[ApplicationConfiguration]
WHERE [Name] = 'IsMeteredBillingEnabled'
```

Si non activé, mettre à jour:

```sql
UPDATE [dbo].[ApplicationConfiguration]
SET [Value] = 'true'
WHERE [Name] = 'IsMeteredBillingEnabled'
```

### 2. Activer les fréquences du Scheduler

Depuis l'interface Admin Portal (`https://sac-02-admin.azurewebsites.net`):

1. Naviguer vers **App Config**
2. Activer la fréquence **Hourly** (nécessaire pour l'agrégation horaire)
3. Sauvegarder

![Scheduler Configuration](../../Commercial-Marketplace-SaaS-Accelerator/docs/images/scheduler-appconfig.png)

### 3. Créer une tâche de Scheduler

Depuis le **Scheduler Manager Dashboard**:

1. Cliquer sur **Add New Scheduled Metered Trigger**
2. Configurer:
   - **Subscription**: Sélectionner la subscription playground
   - **Plan**: `dev-01`
   - **Dimension**: `free`
   - **Quantity**: 1 (sera agrégé automatiquement)
   - **Frequency**: Hourly
3. Sauvegarder la tâche

**Note**: Le scheduler agrégera automatiquement tous les messages de la même heure avant d'émettre vers Marketplace API.

## Vérification

### Vérifier que les messages sont enregistrés

```bash
cd test-saas-playground
make message-count
```

Résultat attendu:
```
📊 Messages enregistrés: 9 total
```

### Vérifier les émissions vers Marketplace

```bash
make message-count-market
```

Résultat attendu (après activation du scheduler):
```
📡 Messages émis vers API: X avec réponse
```

### Consulter les logs du Scheduler

Depuis le portail Azure:

1. Aller à **Resource Group** → `rg-saasaccel-teams-gpt-02`
2. Sélectionner **App Service** → `sac-02-admin`
3. Dans le menu, **Monitoring** → **Log stream**
4. Rechercher les logs contenant `[MeteredScheduler]` ou `[MeteredTrigger]`

## Contraintes Marketplace API

Selon la [documentation Microsoft](https://learn.microsoft.com/en-us/partner-center/marketplace/marketplace-metering-service-apis):

> **"Only one usage event can be emitted for each hour of a calendar day per resource and dimension."**

Le Scheduler du SaaS Accelerator gère automatiquement:
- ✅ Agrégation des messages par heure
- ✅ Une seule émission par heure
- ✅ Retry en cas d'erreur
- ✅ Détection des duplicatas (409 Conflict)

## Troubleshooting

### Problème: Aucune émission vers Marketplace

**Causes possibles:**
1. Scheduler pas activé dans App Config
2. Pas de tâche créée pour la subscription/plan/dimension
3. Credentials Azure AD manquants ou invalides

**Solution:**
1. Vérifier la configuration (étape 2 ci-dessus)
2. Créer une tâche de scheduler (étape 3 ci-dessus)
3. Vérifier les App Settings de `sac-02-admin`:
   ```bash
   az webapp config appsettings list \
     --name sac-02-admin \
     --resource-group rg-saasaccel-teams-gpt-02 \
     --query "[?contains(name, 'MARKETPLACE')].{Name:name, Value:value}" \
     -o table
   ```

### Problème: Erreur 409 Conflict

**Cause**: Un événement a déjà été émis pour cette heure.

**Solution**: C'est normal! Marketplace API accepte un seul événement par heure. Le Scheduler gère automatiquement les duplicatas.

### Problème: Erreur 401 Unauthorized

**Cause**: Credentials Azure AD invalides ou expirés.

**Solution**:
1. Vérifier le Client Secret dans App Registration
2. Générer un nouveau secret si expiré
3. Mettre à jour les App Settings du SaaS Accelerator

## Références

- [SaaS Accelerator Metered Scheduler Documentation](../../Commercial-Marketplace-SaaS-Accelerator/docs/Metered-Scheduler-Manager-Instruction.md)
- [Microsoft Marketplace Metered Billing APIs](https://learn.microsoft.com/en-us/partner-center/marketplace/marketplace-metering-service-apis)
- [Marketplace Credentials Extraction Guide](./marketplace-credentials-extraction.md)

## Notes importantes

⚠️ **Architecture modifiée (Nov 2025)**

Anciennement, nous avions créé un `usageAggregationService.js` dans l'application Teams pour gérer l'émission. Cette approche était incorrecte car:
- ❌ Dupliquait la logique déjà présente dans SaaS Accelerator
- ❌ Nécessitait que l'app Teams tourne en continu
- ❌ Compliquait le déploiement et la maintenance

La nouvelle architecture est plus simple:
- ✅ Teams app = Enregistrement dans DB uniquement
- ✅ SaaS Accelerator = Émission vers Marketplace (comme prévu)
- ✅ Séparation claire des responsabilités
