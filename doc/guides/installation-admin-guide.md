# Guide d'Installation - Teams GPT Assistant IA

## 📋 Guide pour Administrateurs IT

**Version** : 1.3.0  
**Date** : 3 novembre 2025  
**Public cible** : Administrateurs Microsoft 365 et IT  
**Temps d'installation** : 15-30 minutes

---

## 🎯 Objectif

Ce guide vous accompagne dans l'installation de **Teams GPT - Assistant IA** dans votre organisation Microsoft 365. L'application fournit un assistant conversationnel intelligent propulsé par GPT-4 directement dans Microsoft Teams.

## 📦 Prérequis

### Prérequis Organisationnels

- ✅ **Abonnement Azure actif** avec un plan Teams GPT souscrit via Azure Marketplace
- ✅ **Permissions administrateur** :
  - Administrateur Microsoft 365 Global ou
  - Administrateur Teams ou
  - Permissions de gestion des applications Teams
- ✅ **Politique d'applications Teams** permettant les applications personnalisées (si sideloading)

### Prérequis Techniques

- ✅ **Microsoft 365 tenant** avec Microsoft Teams activé
- ✅ **Navigateur web moderne** : Edge, Chrome, Firefox (version récente)
- ✅ **Accès au portail** :
  - [Teams Admin Center](https://admin.teams.microsoft.com)
  - [Customer Portal Teams GPT](https://sac-02-portal.azurewebsites.net)

### Validation des Permissions

Vérifiez vos permissions avant de commencer :

1. Connectez-vous à [Teams Admin Center](https://admin.teams.microsoft.com)
2. Naviguez vers **Teams apps** → **Manage apps**
3. Si vous voyez la liste des applications et le bouton **Upload**, vous avez les permissions nécessaires

## 🔐 Étape 0 : Activation de l'Abonnement SaaS

Avant d'installer l'application Teams, vous devez avoir un abonnement actif.

### 0.1 Achat via Azure Marketplace

1. **Accéder au Azure Marketplace** :
   - Connectez-vous au [portail Azure](https://portal.azure.com)
   - Recherchez "Teams GPT" dans le Marketplace
   - Cliquez sur **Get It Now**

2. **Choisir un plan** :
   - **Development** : $0/mois (tests uniquement, privé)
   - **Starter** : $0/mois + 50 messages inclus ($0.02/message additionnel)
   - **Professional** : $9.99/mois + 300 messages inclus ($0.015/message additionnel)
   - **Pro Plus** : Plan personnalisé avec support prioritaire

3. **Compléter l'achat** :
   - Sélectionnez votre plan
   - Cliquez sur **Subscribe**
   - Remplissez les informations requises
   - Validez la souscription

4. **Attendre l'activation** :
   - Azure redirige vers le Customer Portal (https://sac-02-portal.azurewebsites.net)
   - Un webhook active automatiquement votre abonnement (quelques secondes)
   - Vous recevez un email de confirmation avec les instructions

### 0.2 Vérification de l'Activation

Une fois l'abonnement activé :

1. Connectez-vous au [Customer Portal](https://sac-02-portal.azurewebsites.net)
2. Vérifiez que votre abonnement apparaît avec le statut **Subscribed**
3. Téléchargez le package d'installation Teams (fichier .zip)

---

## 📥 Méthode 1 : Installation via Teams Admin Center (Recommandée)

Cette méthode est recommandée pour les organisations avec plusieurs utilisateurs.

### Étape 1.1 : Télécharger le Package

1. **Accéder au Customer Portal** :
   - URL : https://sac-02-portal.azurewebsites.net
   - Connectez-vous avec votre compte Microsoft 365

2. **Télécharger le package** :
   - Naviguez vers **Ma Souscription** ou **Installation**
   - Cliquez sur **Télécharger le package Teams** (fichier `appPackage.zip`)
   - Sauvegardez le fichier sur votre ordinateur

### Étape 1.2 : Upload dans Teams Admin Center

1. **Ouvrir Teams Admin Center** :
   - Accédez à https://admin.teams.microsoft.com
   - Connectez-vous avec votre compte administrateur

2. **Naviguer vers les applications** :
   - Menu de gauche → **Teams apps** → **Manage apps**

3. **Uploader le package** :
   - Cliquez sur **Upload** (en haut de la page)
   - Sélectionnez **Upload an app to your org's app catalog**
   - Sélectionnez le fichier `appPackage.zip` téléchargé précédemment
   - Cliquez sur **Open**

4. **Attendre la validation** :
   - Le système valide automatiquement le package (10-30 secondes)
   - Vérifiez qu'aucune erreur n'apparaît

### Étape 1.3 : Configurer les Permissions

1. **Localiser l'application** :
   - Dans **Manage apps**, recherchez "Assistant GPT Teams" ou "Teams GPT"
   - Cliquez sur le nom de l'application

2. **Définir les permissions** :
   - Onglet **Permissions** : Vérifier que les permissions sont acceptables
   - L'application demande :
     - **identity** : Accès à l'identité utilisateur (pour personnalisation)
     - **messageTeamMembers** : Envoi de messages (pour conversations)

3. **Configurer les politiques d'autorisation** :
   - Onglet **Status** : Vérifier que l'app est **Allowed**
   - Si bloquée, cliquer sur **Allow** ou **Unblock**

### Étape 1.4 : Créer une Politique de Configuration

1. **Naviguer vers les politiques** :
   - Menu de gauche → **Teams apps** → **Setup policies**

2. **Modifier une politique existante ou créer** :
   - Option A : Modifier **Global (Org-wide default)**
   - Option B : Créer une nouvelle politique pour un groupe spécifique

3. **Ajouter l'application** :
   - Section **Installed apps** → Cliquez sur **Add apps**
   - Recherchez "Assistant GPT Teams"
   - Cliquez sur **Add** puis **Add** à nouveau

4. **Configurer l'épinglage (optionnel)** :
   - Section **Pinned apps** → Cliquez sur **Add apps**
   - Recherchez "Assistant GPT Teams"
   - Définissez l'ordre d'affichage
   - Cliquez sur **Add** puis **Save**

### Étape 1.5 : Assigner aux Utilisateurs

1. **Assigner la politique** :
   - Si politique Global : Tous les utilisateurs ont accès automatiquement
   - Si politique personnalisée :
     - Onglet **Manage users**
     - Cliquez sur **Add users**
     - Sélectionnez les utilisateurs ou groupes
     - Cliquez sur **Apply**

2. **Attendre la propagation** :
   - Délai : 4-48 heures (généralement 4-6 heures)
   - Les utilisateurs verront l'app dans leur Teams automatiquement

---

## 🔧 Méthode 2 : Installation par Sideloading (Test/Développement)

Cette méthode permet aux utilisateurs d'installer l'application individuellement. Utile pour les tests ou organisations de petite taille.

### Prérequis Sideloading

1. **Vérifier la politique de sideloading** :
   - Teams Admin Center → **Teams apps** → **Setup policies**
   - Vérifier que **Upload custom apps** est activé

2. **Si désactivé, l'activer** :
   - Modifier la politique appropriée
   - Basculer **Upload custom apps** sur **On**
   - Cliquer sur **Save**
   - Attendre la propagation (quelques heures)

### Étape 2.1 : Télécharger le Package

Même procédure que Méthode 1, Étape 1.1 :
- Télécharger `appPackage.zip` depuis le Customer Portal

### Étape 2.2 : Distribuer aux Utilisateurs

**Option A : Email** :
```
Objet : Installation de l'Assistant GPT Teams

Bonjour,

Veuillez installer l'Assistant GPT Teams en suivant ces étapes :

1. Téléchargez le package : [lien vers Customer Portal ou fichier joint]
2. Ouvrez Microsoft Teams (application desktop ou web)
3. Cliquez sur "Apps" dans la barre latérale gauche
4. Cliquez sur "Manage your apps" (en bas à gauche)
5. Cliquez sur "Upload an app" puis "Upload a custom app"
6. Sélectionnez le fichier téléchargé (appPackage.zip)
7. Cliquez sur "Add" dans la fenêtre qui apparaît

L'application sera disponible dans votre liste d'applications Teams.

Support : support@cotechnoe.net
```

**Option B : Sharepoint/OneDrive** :
- Uploadez le fichier `appPackage.zip` sur un Sharepoint ou OneDrive partagé
- Envoyez le lien avec les instructions

### Étape 2.3 : Installation par l'Utilisateur

1. **Ouvrir Microsoft Teams** :
   - Application desktop (recommandé) ou web (teams.microsoft.com)

2. **Accéder aux applications** :
   - Cliquez sur **Apps** (icône dans la barre latérale gauche)

3. **Uploader l'application** :
   - En bas à gauche, cliquez sur **Manage your apps**
   - Cliquez sur **Upload an app**
   - Sélectionnez **Upload a custom app**
   - Naviguez vers le fichier `appPackage.zip`
   - Cliquez sur **Open**

4. **Confirmer l'installation** :
   - Une fenêtre affiche les détails de l'application
   - Vérifiez les permissions demandées
   - Cliquez sur **Add** (ou **Ajouter**)

5. **Accéder à l'application** :
   - L'application apparaît dans **Apps** → **Built for your org**
   - Cliquez sur l'icône pour ouvrir le chat

---

## ✅ Validation de l'Installation

### Test 1 : Vérification de l'Apparition

**Pour les utilisateurs** :
1. Ouvrir Microsoft Teams
2. Cliquer sur **Apps** (barre latérale gauche)
3. Rechercher "Assistant GPT Teams" ou "Teams GPT"
4. L'application doit apparaître dans les résultats

**Pour les admins** :
1. Teams Admin Center → **Teams apps** → **Manage apps**
2. Rechercher "Assistant GPT Teams"
3. Vérifier le statut : **Allowed** et **Available in store**

### Test 2 : Premier Message

1. **Ouvrir l'application** :
   - Cliquer sur l'icône de l'application Teams GPT
   - Une fenêtre de chat s'ouvre

2. **Envoyer un message test** :
   ```
   Bonjour, peux-tu te présenter ?
   ```

3. **Vérifier la réponse** :
   - Le bot doit répondre en quelques secondes
   - Réponse attendue : Présentation de l'assistant GPT-4

4. **Tester une question** :
   ```
   Quelle est la capitale de la France ?
   ```
   - Réponse attendue : "Paris" avec contexte

### Test 3 : Upload de Fichier (Optionnel)

1. **Uploader un document** :
   - Cliquer sur l'icône de trombone (📎)
   - Sélectionner un fichier PDF ou Word
   - Envoyer le fichier avec un message :
     ```
     Peux-tu résumer ce document ?
     ```

2. **Vérifier l'analyse** :
   - Le bot analyse le contenu
   - Fournit un résumé ou répond aux questions

---

## 🔍 Surveillance et Gestion

### Tableau de Bord Admin (Teams Admin Center)

1. **Voir les statistiques d'utilisation** :
   - **Teams apps** → **Manage apps**
   - Cliquer sur "Assistant GPT Teams"
   - Onglet **Analytics** : Voir le nombre d'utilisateurs, messages

2. **Gérer les permissions** :
   - Onglet **Permissions** : Revoir/modifier les permissions
   - Onglet **Settings** : Configurer les paramètres

### Customer Portal (Cotechnoe)

1. **Accéder au portail** :
   - URL : https://sac-02-portal.azurewebsites.net
   - Connectez-vous avec votre compte administrateur

2. **Consulter l'utilisation** :
   - Dashboard : Voir le nombre de messages consommés
   - Facturation : Voir les coûts par période
   - Utilisateurs : Voir la liste des utilisateurs actifs

3. **Gérer l'abonnement** :
   - Modifier le plan (upgrade/downgrade)
   - Voir les factures
   - Gérer les utilisateurs

---

## 🚨 Troubleshooting

### Problème 1 : L'application n'apparaît pas dans Teams

**Symptôme** : Les utilisateurs ne voient pas l'application dans la liste des apps.

**Solutions** :

1. **Vérifier le délai de propagation** :
   - Attendre 4-6 heures après la configuration de la politique
   - Demander aux utilisateurs de redémarrer Teams

2. **Vérifier la politique d'installation** :
   - Teams Admin Center → **Setup policies**
   - Confirmer que l'app est dans **Installed apps**
   - Confirmer que la politique est assignée aux bons utilisateurs

3. **Vérifier le statut de l'app** :
   - **Manage apps** → Rechercher "Assistant GPT Teams"
   - Statut doit être **Allowed** (pas Blocked)

4. **Forcer la synchronisation** :
   - Demander aux utilisateurs de :
     - Se déconnecter de Teams
     - Vider le cache (Settings → Clear cache)
     - Se reconnecter

### Problème 2 : Erreur lors de l'upload du package

**Symptôme** : Message d'erreur lors de l'upload dans Teams Admin Center ou par sideloading.

**Solutions** :

1. **Erreur "Invalid package"** :
   - Vérifier que le fichier téléchargé est bien un `.zip`
   - Télécharger à nouveau le package depuis le Customer Portal
   - Ne pas extraire/recompresser le fichier manuellement

2. **Erreur "Manifest validation failed"** :
   - Le package est corrompu ou incompatible
   - Contacter le support : support@cotechnoe.net
   - Fournir la capture d'écran de l'erreur

3. **Erreur "Already exists"** :
   - L'application existe déjà dans votre org
   - **Manage apps** → Rechercher l'app → Supprimer
   - Réessayer l'upload

### Problème 3 : Le bot ne répond pas

**Symptôme** : Le bot ne répond pas aux messages ou affiche une erreur.

**Solutions** :

1. **Vérifier l'abonnement SaaS** :
   - Connectez-vous au [Customer Portal](https://sac-02-portal.azurewebsites.net)
   - Vérifier que le statut est **Subscribed** (pas Pending ou Suspended)
   - Vérifier le quota de messages (si plan avec limite)

2. **Vérifier la connectivité Azure** :
   - Le service backend doit être opérationnel
   - Status page : https://sac-02-portal.azurewebsites.net/status (si disponible)

3. **Erreur "No subscription found"** :
   - L'utilisateur n'est pas lié à l'abonnement SaaS
   - Solution temporaire : Désactiver `SAAS_ENABLE_SUBSCRIPTION_CHECK` (environnement dev uniquement)
   - Solution production : Contacter le support pour lier l'utilisateur

4. **Erreur "Quota exceeded"** :
   - Le quota mensuel de messages est atteint
   - Options :
     - Attendre le renouvellement mensuel
     - Upgrader vers un plan supérieur (Customer Portal)
     - Acheter des messages additionnels (si disponible)

### Problème 4 : "Upload custom apps" est grisé

**Symptôme** : Impossible d'activer le sideloading dans la politique.

**Solutions** :

1. **Vérifier les permissions organisationnelles** :
   - Certaines organisations désactivent le sideloading par politique de sécurité
   - Contacter votre administrateur Microsoft 365 Global

2. **Utiliser la méthode Admin Center** :
   - Le sideloading n'est pas nécessaire si vous installez via Admin Center (Méthode 1)

3. **Demande d'exception** :
   - Documenter la raison (test, développement)
   - Soumettre une demande à l'équipe sécurité/compliance

---

## 📞 Support

### Ressources en Ligne

- **Documentation officielle** : https://sac-02-portal.azurewebsites.net/help
- **FAQ** : https://sac-02-portal.azurewebsites.net/faq
- **Vidéos de démonstration** : [À venir - Todo 8]

### Contact Support Cotechnoe

- **Email** : support@cotechnoe.net
- **Portail de support** : https://sac-02-portal.azurewebsites.net/support
- **Heures d'ouverture** : Lundi-Vendredi, 9h-17h (EST)

### Informations à Fournir

Lors d'une demande de support, merci de fournir :

1. **Informations sur l'abonnement** :
   - Nom de l'organisation
   - Plan SaaS (Development, Starter, Professional, Pro Plus)
   - Subscription ID (disponible dans Customer Portal)

2. **Détails du problème** :
   - Description précise du problème
   - Étape où le problème survient
   - Message d'erreur exact (capture d'écran si possible)

3. **Environnement** :
   - Application Teams (desktop, web, mobile)
   - Version de Teams (Help → About)
   - Navigateur (si web)

---

## 📚 Annexes

### Annexe A : Checklist d'Installation

```
☐ Prérequis vérifiés (permissions, abonnement SaaS)
☐ Package téléchargé depuis Customer Portal
☐ Package uploadé dans Teams Admin Center (Méthode 1) ou distribué (Méthode 2)
☐ Politique de configuration créée/modifiée
☐ Utilisateurs assignés à la politique
☐ Délai de propagation respecté (4-6 heures)
☐ Test de premier message effectué
☐ Utilisateurs notifiés de la disponibilité
☐ Monitoring configuré (Customer Portal)
```

### Annexe B : Permissions Teams Requises

L'application **Teams GPT** demande les permissions suivantes :

| Permission | Scope | Justification |
|------------|-------|---------------|
| `identity` | User | Accès à l'identité utilisateur pour personnalisation et facturation SaaS |
| `messageTeamMembers` | Team | Envoi de messages dans les canaux et chats (conversations bot) |

Ces permissions sont **en lecture seule** et respectent les politiques de confidentialité Microsoft 365.

### Annexe C : Plans et Quotas

| Plan | Prix/mois | Messages inclus | Prix additionnel | Support |
|------|-----------|-----------------|------------------|---------|
| Development | $0 | Illimité | N/A | Email (48h) |
| Starter | $0 | 50 | $0.02/message | Email (24h) |
| Professional | $9.99 | 300 | $0.015/message | Email (12h) |
| Pro Plus | Sur devis | 1500+ | $0.01/message | Prioritaire (4h) |

**Note** : Les quotas se renouvellent le 1er jour de chaque mois.

### Annexe D : URLs Importantes

- **Customer Portal** : https://sac-02-portal.azurewebsites.net
- **Teams Admin Center** : https://admin.teams.microsoft.com
- **Azure Portal** : https://portal.azure.com
- **Microsoft 365 Admin** : https://admin.microsoft.com
- **Support Cotechnoe** : support@cotechnoe.net

---

## 📄 Informations Légales

- **Politique de confidentialité** : https://sac-02-portal.azurewebsites.net/privacy
- **Conditions d'utilisation** : https://sac-02-portal.azurewebsites.net/terms
- **Conformité** : RGPD, SOC 2, Azure Canada Central

---

**Version du document** : 1.3.0  
**Dernière mise à jour** : 3 novembre 2025  
**Auteur** : Cotechnoe Inc.  
**Copyright** © 2025 Cotechnoe Inc. Tous droits réservés.
