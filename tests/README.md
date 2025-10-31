# Tests - Teams GPT SaaS Accelerator

Tests unitaires et d'intégration pour les services SaaS (Phase 2.1).

## Structure

```
tests/
├── setup.js                    # Configuration globale Jest
├── unit/                       # Tests unitaires
│   └── services/
│       ├── messageClassifier.test.js    # 21 tests
│       ├── usageReporter.test.js        # 23 tests
│       └── saasIntegration.test.js      # 4 tests
└── integration/                # Tests d'intégration
    └── saasDatabase.test.js    # Tests contre DB réelle
```

## Commandes

### Via Makefile (recommandé)

```bash
# Afficher l'aide
make help

# Tous les tests
make test

# Tests unitaires uniquement
make unit

# Tests d'intégration uniquement
make integration

# Mode watch (re-exécute automatiquement)
make watch

# Couverture de code
make coverage

# Résumé des tests
make summary

# Vérifier les credentials Azure
make check-credentials

# Nettoyer les fichiers générés
make clean
```

### Via npm directement

```bash
# Tous les tests
npm test

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration uniquement
npm run test:integration

# Mode watch (re-exécute automatiquement)
npm run test:watch

# Couverture de code
npm run test:coverage
```

## Tests Unitaires (48 tests)

### MessageClassifier (21 tests)
- ✅ Singleton pattern
- ✅ Classification des messages par plan (development/starter → free, professional → pro, proPlus → pro-plus)
- ✅ Extraction des métadonnées (longueur, pièces jointes, tokens, type de conversation)
- ✅ Détection des messages premium (multiples pièces jointes, messages très longs)
- ✅ Calcul des coûts par dimension (free: 0.02, pro: 0.015, pro-plus: 0.01)
- ✅ Informations des dimensions (nom, description, limite, coût)

### UsageReporter (23 tests)
- ✅ Singleton pattern
- ✅ Validation des paramètres (subscriptionId, dimension, quantity)
- ✅ Formatage RGPD-compliant (hashing userId, pas de contenu de message)
- ✅ Rapport d'usage principal (validation + formatage + métadonnées)
- ✅ Traitement par batch (multi-événements, filtrage des invalides)
- ✅ Calcul des statistiques d'usage (totaux par dimension, coûts, moyennes)

### SaaSIntegrationService (4 tests)
- ✅ Singleton pattern
- ✅ Chargement de la configuration SaaS
- ✅ Définition des dimensions (free, pro, pro-plus)
- ✅ Limites correspondant aux plans (50, 300, 1500)

## Tests d'Intégration

Les tests d'intégration se connectent à la **vraie base de données Azure SQL** :
- Serveur : `sac-02-sql.database.windows.net`
- Database : `sac-02AMPSaaSDB`

### Prérequis

Les variables d'environnement suivantes doivent être configurées dans `env/.env.dev` :

```env
SAAS_DB_SERVER=sac-02-sql.database.windows.net
SAAS_DB_NAME=sac-02AMPSaaSDB
SAAS_DB_USER=<votre-utilisateur-sql>
SAAS_DB_PASSWORD=<votre-mot-de-passe-sql>
```

**⚠️ Important** : Le serveur SQL utilise **Azure AD Only Authentication** par défaut. Consultez le guide détaillé dans [`AZURE-SQL-CONFIG.md`](./AZURE-SQL-CONFIG.md) pour configurer l'authentification (Azure AD ou SQL).

Options de configuration :
- **Option 1 (Recommandée)** : Authentification Azure AD - nécessite `az login` et modification du code pour utiliser `azure-active-directory-default`
- **Option 2** : Authentification SQL - nécessite de désactiver Azure AD Only Authentication et configurer username/password

### Scénarios testés

1. **Connexion database** : Vérification de la configuration et connexion
2. **getActiveSubscription()** : Requêtes de subscription par TeamsUserId
3. **trackMessageUsage()** : Insertion de logs dans MeteredAuditLogs
4. **checkMessageLimit()** : Comptage des messages utilisés et calcul des limites
5. **Performance** : Temps de réponse < 10s, support des appels concurrents
6. **Intégrité** : Persistance des données, timestamps corrects

## Couverture de code

Seuil minimum : **70%** (branches, functions, lines, statements)

Fichiers exclus de la couverture :
- `src/index.js` (point d'entrée)
- `src/app/app.js` (configuration Bot Framework)

## Exécution locale

### Avec Makefile (recommandé)

```bash
# 1. Installer les dépendances
make install

# 2. Configurer les variables d'environnement (dans le dossier racine)
cp env/.env.dev.example env/.env.dev
# Éditer env/.env.dev avec vos valeurs

# 3. Afficher les commandes disponibles
make help

# 4. Lancer les tests unitaires
make unit

# 5. Lancer les tests d'intégration (nécessite connexion DB)
make integration

# 6. Vérifier la couverture
make coverage

# 7. Voir le résumé des tests
make summary
```

### Sans Makefile (npm direct)

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp env/.env.dev.example env/.env.dev
# Éditer env/.env.dev avec vos valeurs

# 3. Lancer les tests unitaires
npm run test:unit

# 4. Lancer les tests d'intégration (nécessite connexion DB)
npm run test:integration

# 5. Vérifier la couverture
npm run test:coverage
```

## CI/CD

Les tests unitaires s'exécutent automatiquement dans la pipeline CI.

Les tests d'intégration nécessitent une connexion à Azure SQL et s'exécutent :
- Manuellement en local avec les credentials configurés
- Dans les environnements de staging/production avec Azure Managed Identity

## Debugging

Pour voir les logs pendant les tests :

```bash
DEBUG=true npm test
```

## Contribution

Lors de l'ajout de nouvelles fonctionnalités :

1. **Écrire les tests d'abord** (TDD)
2. **Tests unitaires** : Pour la logique métier isolée
3. **Tests d'intégration** : Pour les interactions avec Azure SQL
4. **Maintenir la couverture** : ≥ 70% sur tous les fichiers
5. **Nommer clairement** : Tests descriptifs en français

## Dépendances de test

- `jest` : Framework de test
- `@types/jest` : Types TypeScript pour Jest
- `dotenv` : Chargement des variables d'environnement

Toutes les dépendances sont en `devDependencies` et ne sont pas déployées en production.
