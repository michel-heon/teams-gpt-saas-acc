# Gestion des Icônes et Packages Microsoft Teams

Ce répertoire contient les ressources nécessaires pour générer et gérer les icônes et packages Microsoft Teams de l'application **Assistant GPT Teams**.

## 📁 Fichiers

```
appPackage/
├── Makefile                    # Commandes pour générer icônes/packages
├── generate-icons.py           # Script Python de génération d'icônes
├── manifest.json               # Manifest Teams (avec placeholders)
├── color.png                   # Icône couleur 192x192 px
├── outline.png                 # Icône outline 32x32 px
└── build/
    ├── appPackage.dev.zip      # Package pour environnement dev
    └── appPackage.playground.zip # Package pour playground
```

## 🚀 Utilisation rapide

### Générer les icônes et packages

```bash
cd appPackage
make package
```

Cette commande :
1. Génère les icônes `color.png` et `outline.png`
2. Crée les packages `appPackage.dev.zip` et `appPackage.playground.zip`

### Voir toutes les commandes disponibles

```bash
make help
```

## 📋 Commandes Makefile

| Commande | Description |
|----------|-------------|
| `make icons` | Générer uniquement les icônes (color.png, outline.png) |
| `make package` | Générer les icônes ET les packages .zip |
| `make validate` | Valider les dimensions et formats des icônes |
| `make info` | Afficher les spécifications et état des fichiers |
| `make backup` | Sauvegarder les icônes actuelles (.backup) |
| `make restore` | Restaurer les icônes depuis les backups |
| `make clean` | Nettoyer les fichiers générés |

## 🎨 Spécifications des Icônes

### Color Icon (color.png)

- **Dimensions** : 256×256 pixels (recommandé Microsoft : 216-350px)
- **Symbole** : 160×160 pixels maximum (centré)
- **Padding** : 48 pixels autour du symbole
- **Format** : PNG avec transparence (RGBA)
- **Design actuel** : Bulle de conversation avec étoile IA
- **Couleurs** :
  - Fond : Bleu Microsoft `#0078D4`
  - Accent : Bleu clair `#50E6FF`
  - Texte "GPT" : Blanc

> **Note** : Microsoft Teams recommande entre 216×216 et 350×350 pixels. Notre 256×256 est optimal (puissance de 2). Teams applique automatiquement des coins arrondis et une forme hexagonale pour les bots.

### Outline Icon (outline.png)

- **Dimensions** : 32×32 pixels
- **Couleur** : Blanc pur RGB(255, 255, 255) **uniquement**
- **Fond** : Transparent (canal alpha = 0)
- **Pas de padding** : Le symbole peut aller jusqu'aux bords
- **Design actuel** : Version simplifiée du color icon

> **Utilisation** : App bar Teams (gauche), indicateur d'app en cours d'utilisation.

## 🔧 Personnalisation des Icônes

### Modifier le design

1. Éditer `generate-icons.py`
2. Ajuster les paramètres :
   ```python
   PRIMARY_COLOR = "#0078D4"  # Couleur principale
   ACCENT_COLOR = "#50E6FF"   # Couleur accent
   ```
3. Régénérer : `make package`

### Utiliser des icônes externes

```bash
# Sauvegarder les actuelles
make backup

# Remplacer par vos fichiers
cp /path/to/your/color.png .
cp /path/to/your/outline.png .

# Valider les dimensions
make validate

# Générer les packages
make package
```

## 📦 Génération Manuelle des Packages

Si vous préférez créer les packages manuellement :

```bash
cd appPackage

# Créer le package
zip build/appPackage.dev.zip manifest.json color.png outline.png

# Copier pour playground
cp build/appPackage.dev.zip build/appPackage.playground.zip

# Vérifier le contenu
unzip -l build/appPackage.dev.zip
```

## ✅ Validation

### Vérifier la conformité

```bash
make validate
```

**Checklist de validation** :
- ✅ `color.png` : 192×192 pixels, PNG RGBA
- ✅ `outline.png` : 32×32 pixels, PNG RGBA
- ✅ Outline utilise uniquement blanc pur RGB(255,255,255)
- ✅ Packages `.zip` contiennent 3 fichiers (manifest.json, color.png, outline.png)

### Validation approfondie (avec ImageMagick)

```bash
# Installer ImageMagick
sudo apt-get install imagemagick

# Vérifier les détails
identify -verbose color.png | grep -E "(Geometry|Colorspace|Alpha)"
identify -verbose outline.png | grep -E "(Geometry|Colorspace|Alpha)"
```

## 🔗 Références Microsoft

- **Guide officiel** : [Teams App Package](https://learn.microsoft.com/microsoftteams/platform/concepts/build-and-test/apps-package#app-icons)
- **Design guidelines** : [App Icon Design](https://learn.microsoft.com/microsoftteams/platform/concepts/design/design-teams-app-fundamentals#icons)
- **Teams Store validation** : [Store Guidelines](https://learn.microsoft.com/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/teams-store-validation-guidelines)

## 🛠️ Dépannage

### Problème : "Pillow not found"

```bash
pip3 install Pillow
```

### Problème : Icônes trop grandes

Les packages sont optimisés automatiquement. Si nécessaire :

```bash
# Optimiser avec pngquant
pngquant --quality=65-80 color.png -o color.png
pngquant --quality=65-80 outline.png -o outline.png
```

### Problème : Outline icon n'est pas blanc pur

Vérifier avec ImageMagick :

```bash
identify -format "%[pixel:p{0,0}]" outline.png
# Doit retourner: srgba(255,255,255,1) ou similar
```

## 📝 Notes de Développement

### Workflow de mise à jour

1. Modifier le design dans `generate-icons.py`
2. `make package` - Générer icônes et packages
3. `make validate` - Vérifier conformité
4. Tester dans Teams (voir `doc/guides/installation-admin-guide.md`)
5. Commit et sync vers distribution

### Sauvegarde avant modification

```bash
make backup    # Crée .backup
# ... modifications ...
make restore   # Restaure si besoin
```

### Intégration avec distribution

Les packages générés sont synchronisés vers le dépôt public via :

```bash
cd ../deployment
make sync-distribution
```

Cela copie `appPackage.dev.zip` → `appPackage.zip` dans le dépôt public Cotechnoe/Assistant-GPT-Teams.

## 🎯 Prochaines Étapes

Après génération des icônes/packages :

1. **Valider visuellement** : Ouvrir `color.png` et `outline.png`
2. **Tester dans Teams** : Installer via sideloading (voir guide d'installation)
3. **Uploader dans Partner Center** : Mettre à jour l'offre Teams GPT
4. **Synchroniser distribution** : `cd ../deployment && make sync-distribution`

---

**Version** : 1.0.0  
**Dernière mise à jour** : 4 novembre 2025  
**Maintenu par** : Cotechnoe Inc.
