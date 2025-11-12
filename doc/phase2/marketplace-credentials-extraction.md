# Extraction des Credentials Azure AD pour Marketplace Metering API

## Vue d'ensemble

Pour activer les appels vers l'API Azure Marketplace Metering Service (Phase 2.5), l'application Teams Agent nécessite des credentials Azure AD provenant du déploiement SaaS Accelerator existant.

## Prérequis

- Azure CLI installé et configuré (`az login`)
- Accès au subscription Azure contenant le SaaS Accelerator (`sac-02`)
- Permissions suffisantes pour:
  - Lire les App Registrations
  - Créer des Client Secrets
  - Lire les configurations des App Services

## Architecture des App Registrations

Le SaaS Accelerator crée **3 App Registrations** distinctes:

| App Registration | Usage | Requis pour Teams Agent |
|-----------------|-------|------------------------|
| `sac-02-AdminPortalAppReg` | Portail d'administration | ❌ Non |
| `sac-02-LandingpageAppReg` | Page d'atterrissage SaaS | ❌ Non |
| **`sac-02-FulfillmentAppReg`** | **API Marketplace (Fulfillment + Metering)** | ✅ **OUI** |

Pour l'intégration Marketplace Metering, nous utilisons **uniquement** `sac-02-FulfillmentAppReg`.

## Étape 1: Identification des App Registrations

### Via Azure CLI

```bash
# Lister toutes les App Registrations du SaaS Accelerator
az ad app list --display-name "sac-02" \
  --query "[].{Name:displayName, AppId:appId, PublisherDomain:publisherDomain}" \
  -o table
```

**Résultat attendu:**

```
Name                      AppId                                 PublisherDomain
------------------------  ------------------------------------  -----------------
sac-02-AdminPortalAppReg  7fc5664a-1c6c-46ce-bfc8-3a7aed5a31c1  cotechnoe.net
sac-02-FulfillmentAppReg  d3b2710f-1be9-4f89-8834-6273619bd838  cotechnoe.net  ← CELUI-CI
sac-02-LandingpageAppReg  9eecb51f-1b92-4227-8a48-924fb946e118  cotechnoe.net
```

**Note importante:** Copier l'`AppId` de `sac-02-FulfillmentAppReg` → Ce sera votre **CLIENT_ID**.

### Via Azure Portal

1. Accéder à [Azure Portal](https://portal.azure.com)
2. Rechercher "App registrations"
3. Filtrer par "All applications"
4. Chercher `sac-02-FulfillmentAppReg`
5. Cliquer dessus
6. Dans l'onglet "Overview":
   - **Application (client) ID** → CLIENT_ID
   - **Directory (tenant) ID** → TENANT_ID

## Étape 2: Extraction du Tenant ID

Le Tenant ID est commun à toutes les App Registrations de votre organisation.

### Via Azure CLI

```bash
# Récupérer le Tenant ID du compte Azure connecté
az account show --query tenantId -o tsv
```

**Exemple de résultat:**

```
aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2
```

### Via Azure Portal

- Même emplacement que CLIENT_ID (voir Étape 1)
- Ou: Azure Active Directory → Properties → Tenant ID

## Étape 3: Création d'un Client Secret

⚠️ **Important:** On ne peut pas récupérer un Client Secret existant (ils sont masqués pour des raisons de sécurité). Il faut en créer un nouveau.

### Via Azure CLI (Recommandé)

```bash
# Créer un nouveau secret (valide 1 an)
az ad app credential reset \
  --id d3b2710f-1be9-4f89-8834-6273619bd838 \
  --append \
  --display-name "marketplace-metering-api-teams-agent" \
  --years 1
```

**Résultat:**

```json
{
  "appId": "<YOUR_CLIENT_ID>",
  "password": "<YOUR_CLIENT_SECRET>",  ← CLIENT_SECRET
  "tenant": "<YOUR_TENANT_ID>"
}
```

⚠️ **Copier immédiatement le `password`** → Ce sera votre **CLIENT_SECRET**.
⚠️ **SÉCURITÉ:** Ne JAMAIS commiter ces credentials dans Git. Stocker dans `env/.env.dev` (gitignored).

**Options:**
- `--append`: Ajoute un nouveau secret sans supprimer les existants (n'affecte pas le SaaS Accelerator)
- `--years 1`: Durée de validité (alternatives: `--months 6`, `--years 2`)
- `--display-name`: Nom descriptif pour identifier le secret

### Via Azure Portal

1. Azure Portal → App registrations → `sac-02-FulfillmentAppReg`
2. Menu de gauche: "Certificates & secrets"
3. Onglet "Client secrets"
4. Cliquer "+ New client secret"
5. Remplir:
   - **Description:** `marketplace-metering-api-teams-agent`
   - **Expires:** Recommandé: 180 days ou 1 year
6. Cliquer "Add"
7. ⚠️ **COPIER IMMÉDIATEMENT** la colonne "Value" (ne sera plus visible après!)

## Étape 4: Configuration dans le projet Teams Agent

### 4.1 Ajouter dans `env/.env.playground`

```bash
# Azure AD credentials pour l'API Marketplace (requis pour émettre des événements de facturation)
# Ces valeurs viennent de l'App Registration Azure AD du SaaS Accelerator
# App Registration: sac-02-FulfillmentAppReg
MARKETPLACE_METERING_TENANT_ID=aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2
MARKETPLACE_METERING_CLIENT_ID=d3b2710f-1be9-4f89-8834-6273619bd838
MARKETPLACE_METERING_CLIENT_SECRET=XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu
```

### 4.2 Ajouter dans `m365agents.playground.yml`

Dans la section `writeToEnvironmentFile`, ajouter les lignes suivantes:

```yaml
writeToEnvironmentFile:
  targetFilePath: ./.localConfigs.playground
  envs:
    # ... autres variables existantes ...
    MARKETPLACE_METERING_ENABLED: ${{MARKETPLACE_METERING_ENABLED}}
    MARKETPLACE_METERING_TENANT_ID: ${{MARKETPLACE_METERING_TENANT_ID}}
    MARKETPLACE_METERING_CLIENT_ID: ${{MARKETPLACE_METERING_CLIENT_ID}}
    MARKETPLACE_METERING_CLIENT_SECRET: ${{MARKETPLACE_METERING_CLIENT_SECRET}}
```

### 4.3 Vérifier `.localConfigs.playground`

Après modification de `m365agents.playground.yml`, redémarrer l'agent via F5 ou:

```bash
npm run dev:teamsfx:testtool
```

Le fichier `.localConfigs.playground` doit maintenant contenir:

```bash
MARKETPLACE_METERING_ENABLED=true
MARKETPLACE_METERING_TENANT_ID=aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2
MARKETPLACE_METERING_CLIENT_ID=d3b2710f-1be9-4f89-8834-6273619bd838
MARKETPLACE_METERING_CLIENT_SECRET=XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu
```

## Étape 5: Vérification de la configuration

### Test automatique avec script de diagnostic

```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc
npx env-cmd --silent -f .localConfigs.playground \
  node test-saas-playground/test-metering-init.js
```

**Résultat attendu (succès):**

```
🔍 Test d'initialisation du service Marketplace Metering

1️⃣  Connexion à la base de données...
   ✅ Connecté

2️⃣  Lecture de IsMeteredBillingEnabled depuis ApplicationConfiguration...
   ✅ Configuration trouvée:
      Name: IsMeteredBillingEnabled
      Value: true
      Enabled: true

3️⃣  Vérification des variables d'environnement...
   Variables d'environnement:
      MARKETPLACE_METERING_ENABLED: true
      TENANT_ID: ✅ Défini
      CLIENT_ID: ✅ Défini
      CLIENT_SECRET: ✅ Défini

4️⃣  Simulation de la logique d'initialisation...
   [MeteringApiService] IsMeteredBillingEnabled from DB: true → true
   [MeteringApiService] ✅ Marketplace metering is ENABLED
   [MeteringApiService] Configuration validated
   ✅ Le service SERA initialisé et pourra émettre vers l'API

═══════════════════════════════════════════════════
✅ Tous les tests ont réussi
═══════════════════════════════════════════════════
```

### Test manuel avec message dans le playground

1. Démarrer l'agent: F5 ou "Start Agent in Microsoft 365 Agents Playground"
2. Envoyer un message dans le chat
3. Vérifier les logs serveur:

```bash
# Logs attendus dans le terminal VS Code
[MeteringApiService] Initializing...
[MeteringApiService] IsMeteredBillingEnabled from DB: true → true
[MeteringApiService] ✅ Marketplace metering is ENABLED
[MeteringApiService] Configuration validated
[MeteringApiService] Emitting usage event: { resourceId, planId, dimension, quantity }
[MeteringApiService] Requesting new access token...
[MeteringApiService] Access token obtained (expires in 3599s)
[MeteringApiService] Usage event accepted: { usageEventId: "...", status: "Accepted" }
```

4. Vérifier les compteurs:

```bash
cd test-saas-playground
make message-count-market
```

**Résultat attendu:**

```
État: ✅ Activé
Avec réponse API: 1+  (pas 0!)
ResponseJson: {"usageEventId":"...","status":"Accepted",...}
```

## Dépannage

### Problème: "invalid_client" lors de l'authentification

**Cause:** Client ID ou Client Secret incorrect

**Solution:**
1. Vérifier qu'il n'y a pas d'espaces avant/après les valeurs dans `.env.playground`
2. Vérifier que le Client ID correspond bien à `sac-02-FulfillmentAppReg`
3. Regénérer un nouveau Client Secret (Étape 3)
4. Redémarrer le serveur après modification

### Problème: "unauthorized_client"

**Cause:** L'App Registration n'a pas les permissions pour l'API Marketplace

**Solution:**
1. Azure Portal → App registrations → `sac-02-FulfillmentAppReg`
2. Menu "API permissions"
3. Vérifier la présence de:
   - **Microsoft Partner Center** (avec scope `user_impersonation`)
4. Si absent, cliquer "+ Add a permission" → "APIs my organization uses"
5. Chercher "Microsoft Partner Center" ou "Marketplace"
6. Sélectionner les permissions déléguées
7. Cliquer "Grant admin consent"

### Problème: 401 Unauthorized lors de l'appel API

**Cause:** Token valide mais pas de droits sur l'offre Marketplace

**Solution:**
- Vérifier que l'offre SaaS est publiée dans Partner Center
- Vérifier que le Tenant ID correspond au Publisher de l'offre
- Vérifier que les dimensions de facturation sont définies dans Partner Center

### Problème: 403 Forbidden

**Cause:** L'offre SaaS n'est pas configurée pour la facturation mesurée

**Solution:**
1. Partner Center → Offers → Votre offre SaaS
2. Technical configuration:
   - Vérifier "Landing page URL"
   - Vérifier "Connection webhook"
3. Plan overview:
   - Vérifier que les dimensions sont définies (ex: "messages", "tokens")
   - Vérifier que "Metered billing" est activé

## Récapitulatif des valeurs extraites

Pour référence future, voici les valeurs extraites pour le projet `sac-02`:

| Variable | Valeur | Source |
|----------|--------|--------|
| **MARKETPLACE_METERING_TENANT_ID** | `aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2` | `az account show --query tenantId` |
| **MARKETPLACE_METERING_CLIENT_ID** | `d3b2710f-1be9-4f89-8834-6273619bd838` | sac-02-FulfillmentAppReg → Application (client) ID |
| **MARKETPLACE_METERING_CLIENT_SECRET** | `XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu` | Nouveau secret créé (valide 1 an) |

⚠️ **Sécurité:** Ces valeurs sont sensibles et ne doivent **jamais** être commitées dans Git. Les fichiers `.localConfigs.*` sont déjà dans `.gitignore`.

## Références

- [Azure Marketplace Metering Service APIs](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/marketplace-metering-service-apis)
- [SaaS Fulfillment APIs - Authentication](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/partner-center-portal/pc-saas-registration)
- [Azure CLI - App Registration](https://learn.microsoft.com/en-us/cli/azure/ad/app)
- [Commercial Marketplace SaaS Accelerator](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator)

## Historique

- **2025-11-02**: Extraction initiale des credentials depuis sac-02-FulfillmentAppReg
- **Client Secret expiration**: 2026-11-02 (renouveler avant cette date)
