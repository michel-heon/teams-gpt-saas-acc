# URLs de Distribution - Assistant GPT Teams

## 📦 Dépôt Public GitHub

**Dépôt** : [Cotechnoe/Assistant-GPT-Teams](https://github.com/Cotechnoe/Assistant-GPT-Teams)

---

## 🔗 URLs Publiques pour Partner Center

### Package Teams

```
https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/appPackage.zip
```

**Téléchargement direct** :
```
https://github.com/Cotechnoe/Assistant-GPT-Teams/raw/main/appPackage.zip
```

### Documentation

#### Guide d'Installation Complet
```
https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/INSTALLATION.md
```

#### Support et FAQ
```
https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/SUPPORT.md
```

#### Guide Rapide (README)
```
https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/README.md
```

### Documents Légaux

#### Politique de Confidentialité
```
https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/PRIVACY.md
```

**Usage** : À utiliser dans `manifest.json` → `developer.privacyUrl`

#### Conditions d'Utilisation
```
https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/TERMS.md
```

**Usage** : À utiliser dans `manifest.json` → `developer.termsOfUseUrl`

---

## ⚙️ Configuration Partner Center

### Section "App details" → "Availability"

| Champ | URL |
|-------|-----|
| **Help URL** | `https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/INSTALLATION.md` |
| **Support URL** | `https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/SUPPORT.md` |
| **Privacy Policy** | `https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/PRIVACY.md` |
| **Terms of Use** | `https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/TERMS.md` |

### Section "Properties" → "App information"

| Champ | URL |
|-------|-----|
| **Support Link** | `https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/SUPPORT.md` |
| **Documentation Link** | `https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/INSTALLATION.md` |
| **Website** | `https://www.cotechnoe.com` |

---

## 📧 Configuration du Manifest Teams

Le fichier `appPackage/manifest.json` doit contenir :

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

**⚠️ Important** : Ces URLs sont déjà configurées dans le manifest actuel.

---

## 🔄 Workflow de Mise à Jour

### 1. Modifier les Documents

Éditer les fichiers dans `appPackage/distribution-snapshot/` :

```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc
nano appPackage/distribution-snapshot/SUPPORT.md
nano appPackage/distribution-snapshot/INSTALLATION.md
# etc.
```

### 2. Synchroniser vers GitHub

```bash
cd deployment
make sync-distribution
```

Cette commande :
- ✅ Copie tout le contenu de `distribution-snapshot/`
- ✅ Renomme `appPackage.dev.zip` → `appPackage.zip`
- ✅ Commit et push automatiquement vers GitHub

### 3. Vérification

Les URLs sont immédiatement accessibles sur GitHub (pas de délai).

---

## 📊 Contenu du Dépôt Public

| Fichier | Taille | Description |
|---------|--------|-------------|
| `appPackage.zip` | 6.7 KB | Package Teams (manifest + icônes) |
| `README.md` | 2.2 KB | Guide rapide d'installation |
| `PRIVACY.md` | 7.3 KB | Politique de confidentialité complète |
| `TERMS.md` | 13 KB | Conditions d'utilisation détaillées |
| `SUPPORT.md` | 5.9 KB | Documentation support et FAQ |
| `INSTALLATION.md` | 17 KB | Guide d'installation complet pas-à-pas |

**Total** : ~52 KB de documentation publique

---

## 🎯 Points Clés

### ✅ Avantages de cette Structure

1. **URLs stables** : Les URLs GitHub ne changent jamais (sauf renommage de repo)
2. **Pas d'hosting** : Pas besoin de serveur web pour héberger la doc
3. **Versionning Git** : Historique complet des modifications
4. **Markdown natif** : GitHub rend parfaitement les fichiers .md
5. **Accessible publiquement** : Aucune authentification requise

### ⚠️ Considérations

- **Cache GitHub** : Les modifications peuvent prendre 1-2 minutes pour s'afficher
- **Pas de stats** : GitHub ne fournit pas de statistiques de téléchargement publiques
- **Pas de CDN** : Pour des milliers d'utilisateurs, envisager GitHub Releases

### 🚀 Alternative Future : GitHub Releases

Pour une distribution plus professionnelle :

```bash
# Créer un tag de version
git tag -a v1.0.0 -m "Release 1.0.0 - Initial public release"
git push origin v1.0.0

# Créer une release sur GitHub avec le package en asset
# URL stable : https://github.com/Cotechnoe/Assistant-GPT-Teams/releases/download/v1.0.0/appPackage.zip
```

---

## 📞 Support

Pour toute question sur la distribution :
- **Email** : support@cotechnoe.com
- **Documentation interne** : `doc/architecture/distribution-repository.md`

---

**Dernière mise à jour** : 4 novembre 2025  
**Version** : 1.0.0
