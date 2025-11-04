# Référence de Distribution - Assistant GPT Teams

## 📦 Contenu du Package Teams

Ce document sert de référence pour la distribution du package Teams via le dépôt public **Cotechnoe/Assistant-GPT-Teams**.

---

## 🗂️ Fichiers du Package

### 1. `manifest.json`
**Chemin source** : `/appPackage/manifest.json`  
**Taille** : ~3 KB  
**Description** : Manifeste Teams avec configuration complète de l'application

**Points clés** :
- Schema version: `1.23`
- App version: `1.0.0`
- Teams App ID: `${{TEAMS_APP_ID}}` (variable d'environnement)
- Bot ID: `${{BOT_ID}}` (variable d'environnement)
- URLs Privacy/Terms pointent vers GitHub

**Contenu actuel** :
```json
{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
    "manifestVersion": "1.23",
    "version": "1.0.0",
    "id": "${{TEAMS_APP_ID}}",
    "developer": {
        "name": "Cotechnoe Inc.",
        "websiteUrl": "https://www.cotechnoe.com",
        "privacyUrl": "https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/PRIVACY.md",
        "termsOfUseUrl": "https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/TERMS.md"
    },
    "icons": {
        "color": "color.png",
        "outline": "outline.png"
    },
    "name": {
        "short": "Assistant GPT Teams",
        "full": "Teams GPT - Assistant IA pour Microsoft Teams"
    },
    "description": {
        "short": "Assistant IA intelligent propulsé par GPT-4 pour vos conversations d'équipe",
        "full": "L'Assistant GPT Teams est une IA conversationnelle intelligente propulsée par Azure OpenAI GPT-4. Obtenez des réponses instantanées à vos questions, analysez des documents, générez du contenu et boostez la productivité de votre équipe directement dans Microsoft Teams. Disponible avec des plans tarifaires SaaS flexibles sur Azure Marketplace avec facturation à l'usage."
    },
    "accentColor": "#FFFFFF",
    "bots": [
        {
            "botId": "${{BOT_ID}}",
            "scopes": ["personal", "team", "groupChat"],
            "supportsFiles": true,
            "isNotificationOnly": false,
            "commandLists": [
                {
                    "scopes": ["personal", "team", "groupChat"],
                    "commands": [
                        {
                            "title": "Aide",
                            "description": "Obtenir de l'aide sur l'utilisation de l'Assistant GPT Teams"
                        },
                        {
                            "title": "Poser une question",
                            "description": "Posez-moi n'importe quelle question - je suis propulsé par GPT-4"
                        },
                        {
                            "title": "Analyser un document",
                            "description": "Téléversez un document pour une analyse IA"
                        },
                        {
                            "title": "Générer du contenu",
                            "description": "Générez des courriels, rapports ou tout contenu dont vous avez besoin"
                        }
                    ]
                }
            ]
        }
    ],
    "composeExtensions": [],
    "configurableTabs": [],
    "staticTabs": [],
    "permissions": ["identity", "messageTeamMembers"],
    "validDomains": [
        "sac-02-portal.azurewebsites.net",
        "*.azurewebsites.net"
    ]
}
```

### 2. `color.png`
**Chemin source** : `/appPackage/color.png`  
**Taille** : 5.1 KB (5117 bytes)  
**Dimensions** : 192x192 pixels (requis par Teams)  
**Format** : PNG avec transparence  
**Description** : Icône couleur de l'application Teams

**Spécifications** :
- Doit être exactement 192x192 px
- Format PNG
- Fond transparent recommandé
- Représente l'identité visuelle de l'Assistant GPT

### 3. `outline.png`
**Chemin source** : `/appPackage/outline.png`  
**Taille** : 492 bytes  
**Dimensions** : 32x32 pixels (requis par Teams)  
**Format** : PNG monochrome  
**Description** : Icône outline pour l'affichage compact dans Teams

**Spécifications** :
- Doit être exactement 32x32 px
- Format PNG
- Monochrome (blanc sur transparent recommandé)
- Utilisé dans la barre latérale Teams

---

## 📋 Package ZIP Généré

### `appPackage.dev.zip`
**Chemin** : `/appPackage/build/appPackage.dev.zip`  
**Taille** : ~6.7 KB  
**Contenu** :
```
appPackage.dev.zip
├── manifest.json (compressé ~1 KB)
├── color.png (compressé ~4.8 KB)
└── outline.png (compressé ~0.5 KB)
```

**Commande de génération** :
```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc/appPackage
zip build/appPackage.dev.zip manifest.json color.png outline.png
```

**Alternative avec M365 Toolkit** :
```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc/deployment
make provision-dev
```

---

## 🔄 Workflow de Distribution

### 1. **Modification du Manifest**
Lorsque le manifest est modifié :
```bash
# 1. Éditer le manifest
nano appPackage/manifest.json

# 2. Régénérer le package
cd appPackage
zip build/appPackage.dev.zip manifest.json color.png outline.png

# 3. Copier vers le dépôt de distribution
cp build/appPackage.dev.zip /media/psf/Developpement/00-GIT/Assistant-GPT-Teams/

# 4. Committer les changements
cd /media/psf/Developpement/00-GIT/Assistant-GPT-Teams
git add appPackage.dev.zip
git commit -m "chore: Update Teams package"
git push origin main
```

### 2. **Mise à Jour des Icônes**
Si les icônes changent :
```bash
# 1. Remplacer color.png et/ou outline.png
cp nouvelles-icones/color.png appPackage/
cp nouvelles-icones/outline.png appPackage/

# 2. Régénérer le package (même commande que ci-dessus)
cd appPackage
zip build/appPackage.dev.zip manifest.json color.png outline.png

# 3. Copier et committer
cp build/appPackage.dev.zip /media/psf/Developpement/00-GIT/Assistant-GPT-Teams/
cd /media/psf/Developpement/00-GIT/Assistant-GPT-Teams
git add appPackage.dev.zip
git commit -m "chore: Update Teams package icons"
git push origin main
```

### 3. **Validation Avant Distribution**
Avant de pousser vers le dépôt public :
```bash
# Valider le manifest JSON
cat appPackage/manifest.json | jq '.' > /dev/null && echo "✓ Manifest valide"

# Vérifier les dimensions des icônes
identify appPackage/color.png   # Doit afficher 192x192
identify appPackage/outline.png # Doit afficher 32x32

# Inspecter le contenu du ZIP
unzip -l appPackage/build/appPackage.dev.zip
```

---

## 🎯 Dépôt de Distribution

### Localisation
**GitHub** : https://github.com/Cotechnoe/Assistant-GPT-Teams

### Structure Cible
```
Assistant-GPT-Teams/
├── appPackage.dev.zip      ← Copié depuis /appPackage/build/
├── README.md               ← Guide d'installation client
├── PRIVACY.md              ← Politique de confidentialité
└── TERMS.md                ← Conditions d'utilisation
```

### URLs Publiques
- **Package** : https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/appPackage.dev.zip
- **Privacy** : https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/PRIVACY.md
- **Terms** : https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/TERMS.md

---

## 📊 Changelog du Package

### Version Actuelle (4 novembre 2025)
- ✅ Manifest v1.23 avec branding Cotechnoe
- ✅ URLs Privacy/Terms pointant vers GitHub
- ✅ Descriptions françaises complètes
- ✅ Commandes bot configurées (Aide, Question, Document, Contenu)
- ✅ Icônes color (192x192) et outline (32x32)
- ✅ Domaines valides : sac-02-portal.azurewebsites.net

### Modifications à Venir
- [ ] Screenshots dans le manifest (Todo 8)
- [ ] Vidéo de démonstration (Todo 8)
- [ ] Version 1.1.0 pour production (Todo 9)

---

## 🔐 Sécurité

### Variables d'Environnement
Le manifest contient des variables qui sont remplacées lors du provisioning :
- `${{TEAMS_APP_ID}}` → ID réel de l'app Teams (dans env/.env.dev)
- `${{BOT_ID}}` → ID réel du bot Azure (dans env/.env.dev)

**⚠️ Important** : Le package distribué doit avoir ces IDs réels, pas les variables.

### Fichiers à NE PAS Distribuer
- ❌ Code source (`/src/*`)
- ❌ Fichiers .env (`/env/.env*`)
- ❌ Secrets (`SECRET_BOT_PASSWORD`, `AZURE_OPENAI_API_KEY`)
- ❌ Configuration infrastructure (`/infra/*`)
- ❌ Base de données (`/db/*`)

---

## 📞 Support

Pour toute question sur la distribution :
- **Développement** : michel-heon/teams-gpt-saas-acc (privé)
- **Distribution** : Cotechnoe/Assistant-GPT-Teams (public)
- **Contact** : support@cotechnoe.com

---

**Dernière mise à jour** : 4 novembre 2025  
**Version du package** : 1.0.0  
**Environnement** : dev
