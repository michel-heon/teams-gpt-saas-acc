# Architecture du Dépôt de Distribution

## Vue d'Ensemble

Le projet **teams-gpt-saas-acc** utilise une architecture de distribution séparée pour isoler les fichiers clients du code source de développement. Cette séparation permet une distribution publique et transparente tout en protégeant les éléments sensibles du projet.

## Architecture

```
teams-gpt-saas-acc (Développement - Privé)
│
├── src/                          # Code source de l'application
├── appPackage/                   # Package Teams
│   ├── manifest.json             # Manifest source
│   ├── color.png                 # Icône couleur 192x192
│   ├── outline.png               # Icône outline 32x32
│   ├── build/
│   │   └── appPackage.dev.zip    # Package généré
│   └── distribution-snapshot/    # ← SNAPSHOT DE DISTRIBUTION
│       ├── README.md             # Guide client
│       ├── PRIVACY.md            # Politique de confidentialité
│       ├── TERMS.md              # Conditions d'utilisation
│       └── appPackage.dev.zip    # Package Teams
│
└── deployment/
    └── Makefile                  # Commandes de synchronisation

                    ↓ sync-distribution

Assistant-GPT-Teams (Distribution - Public)
│
├── README.md                     # Guide d'installation client
├── PRIVACY.md                    # Politique de confidentialité
├── TERMS.md                      # Conditions d'utilisation
├── SUPPORT.md                    # Documentation support et FAQ
├── INSTALLATION.md               # Guide d'installation complet
└── appPackage.zip                # Package Teams à télécharger
```

## Répertoire `appPackage/distribution-snapshot/`

### Objectif

Le répertoire `appPackage/distribution-snapshot/` sert de **source de vérité** pour les fichiers à distribuer publiquement. Il contient une copie exacte de ce qui doit être publié dans le dépôt `Assistant-GPT-Teams`.

### Contenu

| Fichier | Source | Description |
|---------|--------|-------------|
| `README.md` | Créé manuellement | Guide rapide d'installation pour les admins IT |
| `PRIVACY.md` | Créé manuellement | Politique de confidentialité complète (7.3 KB) |
| `TERMS.md` | Créé manuellement | Conditions d'utilisation détaillées (13 KB) |
| `SUPPORT.md` | Créé manuellement | Documentation support et FAQ (5.9 KB) |
| `INSTALLATION.md` | Copié depuis `doc/guides/installation-admin-guide.md` | Guide d'installation complet (17 KB) |
| `appPackage.dev.zip` | Copié depuis `build/` | Package Teams avec manifest et icônes (6.7 KB) |

### Avantages

1. **Isolation** : Sépare clairement les fichiers publics du code privé
2. **Versionning** : Permet de tracker les changements des fichiers de distribution dans Git
3. **Validation** : Possibilité de réviser les fichiers avant publication
4. **Simplicité** : Source unique pour synchroniser vers le dépôt public

## Dépôt Public `Assistant-GPT-Teams`

### URL
**GitHub** : https://github.com/Cotechnoe/Assistant-GPT-Teams

### Objectif

Dépôt public hébergé sous l'organisation **Cotechnoe** qui sert de point de téléchargement pour les clients finaux.

### Utilisation

1. **Téléchargement du package** : Les clients téléchargent `appPackage.dev.zip`
2. **Documentation légale** : URLs publiques pour Privacy Policy et Terms of Service
3. **Guide d'installation** : Instructions claires pour les administrateurs IT
4. **Transparence** : Démontre l'engagement envers la confidentialité et la sécurité

### Ce qu'il NE contient PAS

- ❌ Code source de l'application (`/src/*`)
- ❌ Variables d'environnement (`.env*`)
- ❌ Secrets Azure (clés API, mots de passe bot)
- ❌ Configuration infrastructure (`/infra/*`)
- ❌ Base de données et migrations (`/db/*`)
- ❌ Tests et outils de développement

## Workflow de Distribution

### 1. Mise à Jour du Package Teams

Lorsque le manifest ou les icônes changent :

```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc

# Option A : Générer le package via Makefile
cd deployment
make provision-dev

# Option B : Générer manuellement
cd ../appPackage
zip build/appPackage.dev.zip manifest.json color.png outline.png

# Copier le nouveau package dans le snapshot
cd deployment
make update-distribution-snapshot
```

### 2. Mise à Jour des Documents

Lorsque README, PRIVACY ou TERMS changent :

```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc

# Éditer les fichiers dans distribution-snapshot/
nano appPackage/distribution-snapshot/README.md
nano appPackage/distribution-snapshot/PRIVACY.md
nano appPackage/distribution-snapshot/TERMS.md

# Committer les changements
git add appPackage/distribution-snapshot/
git commit -m "docs: Update distribution documentation"
git push origin main
```

### 3. Synchronisation vers le Dépôt Public

Une fois les fichiers validés dans `distribution-snapshot/` :

```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc/deployment

# Synchroniser automatiquement
make sync-distribution
```

**Cette commande** :
1. ✅ Copie les 4 fichiers depuis `distribution-snapshot/` vers `Assistant-GPT-Teams/`
2. ✅ Ajoute les fichiers au staging Git
3. ✅ Crée un commit avec message standard
4. ✅ Pousse vers GitHub (`main` branch)

### 4. Vérification

Après synchronisation, vérifier :

```bash
# URLs publiques accessibles :
# - https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/README.md
# - https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/PRIVACY.md
# - https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/TERMS.md
# - https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/appPackage.dev.zip
```

## Commandes Makefile

### `make update-distribution-snapshot`

**Usage** : Mettre à jour le snapshot avec le dernier package Teams généré

```bash
cd deployment
make update-distribution-snapshot
```

**Effet** :
- Copie `appPackage/build/appPackage.dev.zip` → `appPackage/distribution-snapshot/`
- Vérifie que le package existe avant de copier

**Quand l'utiliser** :
- Après avoir modifié `manifest.json`
- Après avoir changé les icônes (`color.png`, `outline.png`)
- Après avoir exécuté `make provision-dev`

### `make sync-distribution`

**Usage** : Synchroniser le snapshot vers le dépôt public GitHub

```bash
cd deployment
make sync-distribution
```

**Effet** :
1. Copie tous les fichiers de `distribution-snapshot/` vers `/media/psf/Developpement/00-GIT/Assistant-GPT-Teams/`
2. Exécute `git add`, `git commit`, `git push` automatiquement
3. Affiche l'URL du dépôt public

**Quand l'utiliser** :
- Après avoir mis à jour le snapshot
- Après avoir modifié README, PRIVACY ou TERMS
- Avant de communiquer de nouvelles URLs aux clients

**Prérequis** :
- Le dépôt `Assistant-GPT-Teams` doit exister à `/media/psf/Developpement/00-GIT/Assistant-GPT-Teams`
- L'utilisateur doit avoir les droits de push sur `Cotechnoe/Assistant-GPT-Teams`

## Intégration avec le Workflow

### Manifest.json et URLs

Le manifest référence les documents légaux depuis le dépôt public :

```json
{
  "developer": {
    "name": "Cotechnoe Inc.",
    "websiteUrl": "https://www.cotechnoe.com",
    "privacyUrl": "https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/PRIVACY.md",
    "termsOfUseUrl": "https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/TERMS.md"
  }
}
```

### Customer Portal (Todo 6)

Le Customer Portal devra pointer vers le dépôt pour le téléchargement :

```html
<a href="https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/appPackage.dev.zip">
  Télécharger le package Teams
</a>
```

### Partner Center

Dans Partner Center, les URLs à configurer :

- **Support** : https://sac-02-portal.azurewebsites.net/support
- **Help** : https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/README.md
- **Privacy Policy** : https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/PRIVACY.md
- **Terms of Use** : https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/TERMS.md

## Sécurité et Bonnes Pratiques

### ✅ Ce qui DOIT être dans distribution-snapshot/

- Documents légaux (PRIVACY.md, TERMS.md)
- Guide d'installation client (INSTALLATION.md)
- Documentation support (SUPPORT.md)
- Guide rapide (README.md)
- Package Teams compilé (appPackage.dev.zip)
- Screenshots et vidéos de démonstration (Todo 8)

### ❌ Ce qui NE DOIT JAMAIS être dans distribution-snapshot/

- Code source JavaScript/TypeScript
- Fichiers `.env` ou secrets
- Clés API ou tokens
- Configuration Azure (Bicep, ARM templates)
- Scripts de migration de base de données
- Logs ou données de test

### Validation Avant Synchronisation

Toujours vérifier avant `make sync-distribution` :

```bash
# Vérifier qu'il n'y a pas de secrets
grep -r "SECRET" appPackage/distribution-snapshot/
grep -r "API_KEY" appPackage/distribution-snapshot/
grep -r "PASSWORD" appPackage/distribution-snapshot/

# Vérifier le contenu du package
unzip -l appPackage/distribution-snapshot/appPackage.dev.zip

# Doit contenir UNIQUEMENT :
# - manifest.json
# - color.png
# - outline.png
```

## Versioning et Releases

### Git Tags (Recommandé)

Pour créer des releases versionnées :

```bash
cd /media/psf/Developpement/00-GIT/Assistant-GPT-Teams

# Créer un tag
git tag -a v1.0.0 -m "Release 1.0.0 - Initial public release"
git push origin v1.0.0

# Créer une release GitHub avec appPackage.dev.zip comme asset
```

### Avantages des Releases

- URLs stables pour téléchargement (ex: `/releases/download/v1.0.0/appPackage.dev.zip`)
- Historique clair des versions distribuées
- Possibilité de retour en arrière si nécessaire
- Communication claire avec les clients sur les nouvelles versions

## Troubleshooting

### Erreur : "Dépôt Assistant-GPT-Teams introuvable"

**Cause** : Le chemin `/media/psf/Developpement/00-GIT/Assistant-GPT-Teams` n'existe pas

**Solution** :
```bash
cd /media/psf/Developpement/00-GIT
git clone git@github.com:Cotechnoe/Assistant-GPT-Teams.git
```

### Erreur : "Permission denied (publickey)"

**Cause** : Pas d'accès SSH au dépôt Cotechnoe

**Solution** :
1. Vérifier les clés SSH : `ssh -T git@github.com`
2. Demander l'accès à l'organisation Cotechnoe sur GitHub
3. Utiliser HTTPS si SSH non disponible

### Les fichiers ne se synchronisent pas

**Cause** : Aucun changement détecté par Git

**Vérification** :
```bash
cd /media/psf/Developpement/00-GIT/Assistant-GPT-Teams
git status
```

**Solution** :
- S'assurer que les fichiers ont réellement changé
- Vérifier que `.gitignore` n'exclut pas les fichiers

## Maintenance

### Révision Régulière

- **Mensuel** : Vérifier que les documents légaux sont à jour
- **Avant chaque release** : Valider le contenu du snapshot
- **Après changements majeurs** : Mettre à jour README avec nouvelles fonctionnalités

### Checklist de Distribution

- [ ] Le manifest.json est validé (pas d'erreurs JSON)
- [ ] Les icônes respectent les dimensions (192x192 et 32x32)
- [ ] Le package se zip sans erreur
- [ ] PRIVACY.md et TERMS.md sont à jour avec les bonnes URLs
- [ ] README.md mentionne les bons plans et prix
- [ ] Aucun secret n'est présent dans les fichiers
- [ ] Le snapshot a été testé localement
- [ ] La synchronisation s'est effectuée sans erreur
- [ ] Les URLs GitHub sont accessibles publiquement

## Références

- **Dépôt de développement** : https://github.com/michel-heon/teams-gpt-saas-acc
- **Dépôt de distribution** : https://github.com/Cotechnoe/Assistant-GPT-Teams
- **Guide Partner Center** : `doc/guides/partner-center-teams-configuration.md`
- **Guide d'installation** : `doc/guides/installation-admin-guide.md`

---

**Dernière mise à jour** : 4 novembre 2025  
**Version** : 1.0
