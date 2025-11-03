# Répertoire de Déploiement - Teams GPT Assistant

Ce répertoire contient les outils et la documentation pour le déploiement de l'application Teams GPT Assistant dans différents environnements en utilisant **Microsoft 365 Agents Toolkit**.

## ⚠️ Note Importante

Ce projet utilise **Microsoft 365 Agents Toolkit** (anciennement Teams Toolkit) intégré à VS Code. Les packages Teams sont automatiquement générés par le Toolkit dans `appPackage/build/` selon les bonnes pratiques Microsoft.

**Structure générée automatiquement par le Toolkit :**
```
appPackage/
├── manifest.json           # Manifest source avec variables
├── color.png              # Icône 192x192px
├── outline.png            # Icône 32x32px
└── build/                 # ⚠️ Généré automatiquement - NE PAS committer
    ├── appPackage.local.zip        # Package environnement local
    ├── appPackage.playground.zip   # Package environnement playground
    └── appPackage.dev.zip          # Package environnement dev
```

## Structure du Répertoire

```
deployment/
├── README.md                    # Ce fichier - documentation principale
├── Makefile                     # Automatisation des workflows Toolkit
├── scripts/                     # Scripts complémentaires
│   └── validate-package.sh     # Validation supplémentaire du package
└── docs/                        # Documentation de déploiement
    ├── deployment-checklist.md # Checklist avant déploiement
    ├── environments.md         # Description des environnements
    └── troubleshooting.md      # Guide de dépannage
```


## Environnements de Déploiement

Les environnements sont définis par **Microsoft 365 Agents Toolkit** via les fichiers de configuration `m365agents.*.yml` et les fichiers d'environnement dans `env/`.

### 1. Local (`local`)

- **Usage** : Développement avec compte M365 réel
- **Fichier config** : `m365agents.local.yml`
- **Variables env** : `env/.env.local`
- **Base de données** : Azure SQL (sac-02AMPSaaSDB)
- **Bot endpoint** : dev-tunnel local (https://*.devtunnels.ms)
- **Authentification** : M365 complète
- **SaaS Mode** : Non permissif (validation stricte)
- **Package généré** : `appPackage/build/appPackage.local.zip`

### 2. Playground (`playground`)

- **Usage** : Tests sans compte M365
- **Fichier config** : `m365agents.playground.yml`
- **Variables env** : `env/.env.playground`
- **Base de données** : Aucune (mode permissif)
- **Bot endpoint** : localhost:3978
- **Authentification** : Simulée
- **SaaS Mode** : Permissif (pas de validation)
- **Package généré** : `appPackage/build/appPackage.playground.zip`

### 3. Dev (`dev`)

- **Usage** : Déploiement Azure pour tests
- **Fichier config** : `m365agents.yml`
- **Variables env** : `env/.env.dev`
- **Base de données** : Azure SQL
- **Bot endpoint** : Azure Bot Service
- **Authentification** : M365
- **SaaS Mode** : Non permissif
- **Package généré** : `appPackage/build/appPackage.dev.zip`




## Prérequis

### Outils Requis

- Node.js v20+ LTS
- Microsoft 365 Agents Toolkit extension dans VS Code
- Azure CLI (pour déploiement Azure)
- Compte M365 (pour local/dev)
- Accès Partner Center (pour distribution production)

### Variables d'Environnement

Les variables sont gérées dans le dossier `env/` :

- `env/.env.local` - Variables pour environnement local
- `env/.env.playground` - Variables pour playground
- `env/.env.dev` - Variables pour dev Azure

## Lifecycles Microsoft 365 Agents Toolkit

Le Toolkit utilise trois lifecycles principaux définis dans les fichiers `m365agents*.yml` :

### 1. Provision

Prépare l'environnement cible :

- Crée l'app Teams dans Developer Portal
- Crée l'Azure AD App (Bot)
- Enregistre le bot sur Bot Framework
- **Valide le manifest** (`teamsApp/validateManifest`)
- **Crée le package zip** (`teamsApp/zipAppPackage`) → `appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip`
- **Valide le package** (`teamsApp/validateAppPackage`)
- Met à jour l'app dans Developer Portal (`teamsApp/update`)

### 2. Deploy

Déploie le code de l'application :

- Installe les dépendances npm
- Build l'application
- Déploie sur Azure App Service (si configuré)

### 3. Publish

Publie l'application Teams :

- Soumet l'app pour approbation dans l'organisation
- Ou publie vers Teams Store / Partner Center




## Utilisation du Makefile

Le Makefile encapsule les commandes Microsoft 365 Agents Toolkit pour simplifier les déploiements.

### Commandes Principales

```bash
# Afficher l'aide
make help

# Provision + Deploy pour playground (via Toolkit)
make provision-playground
make deploy-playground

# Provision + Deploy pour local (via Toolkit)
make provision-local
make deploy-local

# Provision + Deploy pour dev Azure (via Toolkit)
make provision-dev
make deploy-dev

# Nettoyer les artefacts générés
make clean

# Lancer l'application localement
make start-local
make start-playground
```

### Workflow de Déploiement Standard

#### Pour Tests (Playground)

```bash
make clean
make provision-playground
make deploy-playground
make start-playground
```

#### Pour Développement (Local)

```bash
make clean
make provision-local
make deploy-local
make start-local
```

#### Pour Dev Azure

```bash
make clean
make provision-dev
make deploy-dev
```

## Packages Générés Automatiquement

### Localisation des Packages

Les packages sont **automatiquement créés** par Microsoft 365 Agents Toolkit dans `appPackage/build/` lors du lifecycle **provision** :

- `appPackage/build/appPackage.local.zip`
- `appPackage/build/appPackage.playground.zip`
- `appPackage/build/appPackage.dev.zip`

⚠️ **Ce répertoire `appPackage/build/` est exclu du contrôle de version** (voir `.gitignore`).

### Contenu des Packages

Chaque package contient :

- `manifest.json` - Manifest avec variables résolues (${{TEAMS_APP_ID}}, ${{BOT_ID}}, etc.)
- `color.png` - Icône couleur 192x192px
- `outline.png` - Icône outline 32x32px




## Validation Automatique

Chaque package passe par des validations automatiques lors du lifecycle **provision** :

1. ✅ Validation syntaxe JSON (`teamsApp/validateManifest`)
2. ✅ Validation schéma Teams v1.23 (`teamsApp/validateManifest`)
3. ✅ Validation des icônes (dimensions, format)
4. ✅ Validation Teams Store guidelines (`teamsApp/validateAppPackage`)
5. ✅ Mise à jour dans Developer Portal (`teamsApp/update`)

## Distribution vers Partner Center (Production)

Pour la distribution client via Azure Marketplace, le package doit être uploadé manuellement :

### Étapes

1. Exécuter le provision pour générer le package : `make provision-dev`
2. Récupérer le package : `appPackage/build/appPackage.dev.zip`
3. Se connecter à [Partner Center](https://partner.microsoft.com/dashboard)
4. Naviguer vers l'offre "Teams GPT"
5. Section "Technical configuration"
6. Uploader le package
7. Lier au plan SaaS (dev-01, pay-as-you-go)
8. Soumettre pour certification

## Troubleshooting

### Package manquant

Si `appPackage/build/` est vide, exécuter le lifecycle provision :

```bash
# Pour playground
make provision-playground

# Pour local
make provision-local
```

### Variables non résolues

Si le manifest contient encore des variables `${{...}}`, vérifier les fichiers d'environnement :

```bash
# Vérifier les variables
cat env/.env.local
cat env/.env.playground
```

### Erreur de provision

Consulter les logs détaillés :

```bash
# Logs dans
.teamsfx/log/
```

## Sécurité

### Fichiers à NE PAS Committer

- `appPackage/build/*.zip` (packages générés - déjà dans `.gitignore`)
- `env/.env.*` (variables sensibles - déjà dans `.gitignore`)
- `.localConfigs*` (config locale - déjà dans `.gitignore`)

### Fichiers à Committer

- `appPackage/manifest.json` (source avec variables)
- `appPackage/*.png` (icônes)
- `m365agents*.yml` (configuration Toolkit)
- `deployment/Makefile` (automatisation)
- `deployment/README.md` (ce fichier)

## Références

- [Microsoft 365 Agents Toolkit Documentation](https://aka.ms/teams-toolkit)
- [Teams App Manifest Schema v1.23](https://aka.ms/teams-manifest-schema)
- [Lifecycles Guide](https://aka.ms/teamsfx-v5.0-guide)
- [Partner Center Teams Apps](https://docs.microsoft.com/partner-center/marketplace/teams-apps)

## Support

Pour toute question ou problème :

1. Consulter les logs dans `.teamsfx/log/`
2. Vérifier la documentation du projet dans `doc/`
3. Consulter les issues GitHub

**Dernière mise à jour** : 3 novembre 2025
**Version** : v1.2.9-scheduler-playground

