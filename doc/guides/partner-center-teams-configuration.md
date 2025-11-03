# Guide de Configuration Partner Center - Teams GPT Assistant

## 📋 Objectif

Configurer la distribution de l'application Teams dans Partner Center et la lier à l'offre SaaS "Teams GPT" pour permettre l'installation par les clients via Azure Marketplace.

## 🎯 Prérequis

- ✅ Package Teams créé : `appPackage/build/appPackage.dev.zip`
- ✅ Teams App ID : `89adcba4-c8b4-4005-a751-9df0d01a6e04`
- ✅ Bot ID : `79ab6e4d-5563-428c-858c-954107e5e61f`
- ✅ Offre SaaS "Teams GPT" existante dans Partner Center
- ✅ Plans configurés : dev-01, pay-as-you-go, Plan de test
- 🔑 Accès Partner Center avec rôle approprié

## 📦 Étape 1 : Upload du Package Teams dans Partner Center

### 1.1 Accéder à l'offre SaaS

1. Se connecter à [Partner Center](https://partner.microsoft.com/dashboard/marketplace-offers/overview)
2. Naviguer vers **Marketplace offers** → **Overview**
3. Cliquer sur l'offre **"Teams GPT"**

### 1.2 Ajouter la Configuration Teams

1. Dans le menu de gauche, cliquer sur **"Microsoft Teams"** (ou **"Teams Configuration"**)
2. Si cette section n'existe pas, cliquer sur **"Add product"** → **"Microsoft Teams app"**

### 1.3 Upload du Package

1. Dans la section **"Teams app package"** :
   - Cliquer sur **"Upload new app package"**
   - Sélectionner le fichier : `/media/psf/Developpement/00-GIT/teams-gpt-saas-acc/appPackage/build/appPackage.dev.zip`
   - Attendre la validation automatique

2. **Validation du package** :
   Le système vérifie automatiquement :
   - ✅ Syntaxe JSON du manifest
   - ✅ Schéma Teams v1.23
   - ✅ Présence des icônes (192x192, 32x32)
   - ✅ URLs de confidentialité et conditions d'utilisation
   - ✅ Informations développeur (Cotechnoe Inc.)

3. Si des erreurs apparaissent :
   - Corriger le manifest source : `appPackage/manifest.json`
   - Re-provisionner : Command Palette → Teams: Provision (dev)
   - Re-uploader le nouveau package

## 🔗 Étape 2 : Lier l'Application Teams à l'Offre SaaS

### 2.1 Configuration du Lien SaaS

1. Dans la section **"SaaS offer"** (même page Teams) :
   - Cocher **"Enable SaaS offer integration"**
   - Sélectionner l'offre SaaS : **"Teams GPT"**
   - Le système récupère automatiquement les plans configurés

### 2.2 Associer les Plans

Lier chaque plan SaaS à la configuration Teams :

| Plan SaaS | Plan ID | Action |
|-----------|---------|--------|
| dev-01 (Développement) | `dev-01` | ✅ Activer pour tests |
| pay-as-you-go | `pay-as-you-go` | ✅ Activer |
| Plan de test | `plan-test` | ✅ Activer |

**Configuration recommandée** :
- **dev-01** : Visible uniquement via lien privé (pour développeurs)
- **pay-as-you-go** : Public, visible dans Marketplace
- **Plan de test** : Privé (tests internes uniquement)

## 📝 Étape 3 : Compléter les Informations de Distribution

### 3.1 Listing Information (Informations d'annonce)

1. **Nom de l'application** :
   - Nom court : `Assistant GPT Teams`
   - Nom complet : `Teams GPT - Assistant IA pour Microsoft Teams`

2. **Description** :
   - **Description courte** (100 caractères max) :
     ```
     Assistant IA intelligent propulsé par GPT-4 pour vos conversations d'équipe
     ```
   
   - **Description complète** (4000 caractères max) :
     ```
     L'Assistant GPT Teams est une IA conversationnelle intelligente propulsée par Azure OpenAI GPT-4.
     
     Fonctionnalités principales :
     • Réponses instantanées à vos questions
     • Analyse de documents (PDF, Word, Excel)
     • Génération de contenu (courriels, rapports, résumés)
     • Support multilingue (français, anglais, etc.)
     • Intégration transparente dans Microsoft Teams
     
     Disponible avec des plans tarifaires SaaS flexibles :
     - Plan gratuit avec 50 messages inclus
     - Plans professionnels avec messages inclus et facturation à l'usage
     - Support prioritaire pour les plans payants
     
     Sécurisé et conforme :
     • Hébergé sur Azure Canada Central
     • Conformité RGPD et SOC 2
     • Authentification Microsoft 365
     • Facturation transparente via Azure Marketplace
     ```

3. **Mots-clés de recherche** (5 max) :
   - `GPT`
   - `IA`
   - `Assistant`
   - `Azure OpenAI`
   - `Productivité`

### 3.2 Screenshots et Vidéos

**⚠️ TODO : Créer les assets (Todo 8)**

À préparer :
- 3-5 screenshots (1280x720 ou 1920x1080)
- 1 vidéo de démonstration (2-3 min, YouTube ou Azure Media Services)

### 3.3 Liens et Support

1. **URL de support** : 
   ```
   https://sac-02-portal.azurewebsites.net/support
   ```

2. **URL d'aide** :
   ```
   https://sac-02-portal.azurewebsites.net/help
   ```

3. **URL de confidentialité** (déjà dans manifest) :
   ```
   https://sac-02-portal.azurewebsites.net/privacy
   ```

4. **URL des conditions d'utilisation** (déjà dans manifest) :
   ```
   https://sac-02-portal.azurewebsites.net/terms
   ```

5. **Contact support** :
   - Email : `support@cotechnoe.net`
   - Téléphone : (optionnel)

## 🔐 Étape 4 : Configuration Technique Avancée

### 4.1 Permissions et Scopes

Le manifest définit déjà les permissions :
- ✅ `identity` : Accès à l'identité utilisateur
- ✅ `messageTeamMembers` : Envoi de messages aux membres

**Aucune action requise** - Validées automatiquement lors de l'upload du package.

### 4.2 Domaines Valides

Déjà configurés dans le manifest :
- `sac-02-portal.azurewebsites.net` (Customer Portal)
- `*.azurewebsites.net` (Services Azure)

### 4.3 Bot Configuration

Le Bot Framework est automatiquement configuré :
- Bot ID : `79ab6e4d-5563-428c-858c-954107e5e61f`
- Endpoint : `https://bot997b9c.azurewebsites.net/api/messages`
- Scopes : `personal`, `team`, `groupChat`
- Support de fichiers : ✅ Activé

## 📋 Étape 5 : Configuration des Plans pour l'Installation

### 5.1 Plan dev-01 (Développement)

**Configuration Partner Center** :
- Nom : "Plan de Développement"
- Prix : $0.00 USD/mois
- Visibilité : **Privé** (accessible uniquement via URL directe)
- Installation Teams : ✅ Activée
- Messages inclus : Illimités (dimension `dev-message` à $0)

**URL d'activation privée** :
```
https://aka.ms/teamsapp/<TEAMS_APP_ID>?plan=dev-01
```

### 5.2 Plan pay-as-you-go

**Configuration Partner Center** :
- Nom : "Pay-as-you-go"
- Prix : Variable selon utilisation
- Visibilité : **Public**
- Installation Teams : ✅ Activée
- Dimension : `free`, `pro`, ou `pro-plus` selon choix client

### 5.3 Plan de test

**Configuration Partner Center** :
- Nom : "Plan de Test"
- Prix : $0.00 USD/mois
- Visibilité : **Privé**
- Installation Teams : ✅ Activée
- Durée limitée : 30 jours

## ✅ Étape 6 : Validation et Tests

### 6.1 Validation Partner Center

Avant de soumettre, vérifier :
- [ ] Package Teams uploadé et validé
- [ ] Lien SaaS configuré
- [ ] Plans associés correctement
- [ ] Informations de listing complètes
- [ ] URLs de support/privacy/terms fonctionnelles
- [ ] Screenshots uploadés (TODO)
- [ ] Vidéo de démo uploadée (TODO)

### 6.2 Test d'Installation (Plan dev-01)

**Test en environnement privé** :

1. Récupérer l'URL d'installation privée dans Partner Center
2. Ouvrir l'URL dans un navigateur connecté à M365
3. Cliquer sur "Obtenir" ou "Add"
4. Suivre le workflow d'achat dans Azure Portal
5. Vérifier la redirection vers Customer Portal (sac-02-portal)
6. Confirmer l'activation du webhook
7. Télécharger le package Teams depuis Customer Portal
8. Installer via Teams Admin Center ou sideloading
9. Tester le premier message au bot

### 6.3 Validation Azure Portal

Après installation test :
- Vérifier l'abonnement SaaS dans Azure Portal
- Confirmer le statut "Subscribed"
- Vérifier les données dans `sac-02AMPSaaSDB` :
  - Table `Subscriptions` : 1 entrée
  - Table `Users` : 1 entrée avec TeamsUserId
  - Table `MeteredAuditLogs` : Prêt pour messages

## 🚀 Étape 7 : Soumission pour Certification

### 7.1 Checklist Pré-soumission

- [ ] Tests d'installation réussis (dev-01)
- [ ] Workflow SaaS complet validé
- [ ] Customer Portal fonctionnel
- [ ] Webhooks actifs et testés
- [ ] Metered billing configuré
- [ ] Documentation complète
- [ ] Screenshots et vidéo ajoutés

### 7.2 Soumettre pour Révision

1. Dans Partner Center, cliquer sur **"Review and publish"**
2. Vérifier tous les onglets (aucune erreur rouge)
3. Cliquer sur **"Submit"**
4. Attendre la révision Microsoft (3-5 jours ouvrables)

### 7.3 Réponses aux Retours de Certification

Si Microsoft demande des modifications :
1. Lire attentivement les commentaires dans Partner Center
2. Corriger les problèmes identifiés
3. Re-uploader le package si nécessaire
4. Soumettre à nouveau

## 📚 Liens de Référence

- [Partner Center - SaaS Offers](https://docs.microsoft.com/partner-center/marketplace/create-new-saas-offer)
- [Teams Apps in Partner Center](https://docs.microsoft.com/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/submission-checklist)
- [Metered Billing API](https://docs.microsoft.com/azure/marketplace/marketplace-metering-service-apis)
- [Teams App Certification](https://docs.microsoft.com/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/teams-store-validation-guidelines)

## 🔧 Troubleshooting

### Erreur : "Package validation failed"

**Solution** :
```bash
cd /media/psf/Developpement/00-GIT/teams-gpt-saas-acc
make validate-manifest
make inspect-package ENV=dev
```

### Erreur : "SaaS offer not found"

**Solution** : Vérifier que l'offre SaaS "Teams GPT" est publiée et active dans Partner Center.

### Erreur : "Bot endpoint unreachable"

**Solution** : Vérifier que l'App Service `bot997b9c` est démarré :
```bash
az webapp show --resource-group rg-saas-test --name bot997b9c --query state
```

---

**Dernière mise à jour** : 3 novembre 2025  
**Version** : v1.2.9-scheduler-playground  
**Status** : Todo 4 - En cours
