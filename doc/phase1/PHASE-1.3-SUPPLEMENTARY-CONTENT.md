# 📝 Configuration du contenu supplémentaire - Partner Center

## 🎯 Guide complet pour la section "Contenu supplémentaire"

Cette section contient des informations critiques pour valider votre offre SaaS sur Azure Marketplace.

---

## 📋 Section 1 : Scénario SaaS

### Question posée

*"Sélectionnez la description appropriée pour la structure de votre solution SaaS"*

### ✅ Configuration correcte pour Teams GPT Assistant

**Sélection requise** :

```
☑️ La solution SaaS est entièrement hébergée dans votre système Azure 
   (celui de votre fournisseur de logiciel indépendant) : déployé 
   complètement dans votre environnement Azure ; aucun composant 
   n'est déployé en dehors de l'infrastructure Azure.
```

### Pourquoi ce choix ?

- ✅ Le SaaS Accelerator est 100% hébergé sur Azure
- ✅ Resource Group : `rg-saasaccel-teams-gpt-02` dans Azure Canada Central
- ✅ Tous les composants sont Azure natifs :
  - App Services (Portal + Admin)
  - SQL Database
  - Key Vault
  - Application Insights
  - Storage Account

### ❌ Options à NE PAS sélectionner

```
❌ La solution SaaS est partiellement hébergée dans votre infrastructure Azure
   → Ne s'applique pas : nous n'avons pas de composants externes

❌ La solution SaaS n'est pas hébergée dans Azure
   → Incorrect : tout est sur Azure
```

---

## 🆔 Section 2 : ID d'abonnement Azure

### Informations requises

**Champ** : ID d'abonnement Azure et/ou ID de groupe d'administration

**Description** : Entrez votre ou vos ID d'abonnement Azure et/ou les ID de groupe d'administration pour localiser l'emplacement d'hébergement de votre solution SaaS.

### ⚠️ Remarque importante

L'évaluation de l'utilisation d'Azure, telle qu'elle apparaît dans votre ou vos abonnements, sera effectuée afin de confirmer que la solution est hébergée sur une plateforme Azure.

---

## 🔍 Comment trouver votre ID d'abonnement

### Méthode 1 : Via Azure Portal

1. Ouvrir [Azure Portal](https://portal.azure.com)
2. Rechercher **"Subscriptions"** dans la barre de recherche
3. Localiser l'abonnement qui contient `rg-saasaccel-teams-gpt-02`
4. Copier le **Subscription ID** (format UUID)

### Méthode 2 : Via Azure CLI (Cloud Shell)

```bash
# Lister tous les abonnements
az account list --output table

# Ou afficher l'abonnement actuel
az account show --query id -o tsv
```

### Méthode 3 : Via le Resource Group

```bash
# Obtenir l'ID d'abonnement du Resource Group déployé
az group show --name rg-saasaccel-teams-gpt-02 --query id -o tsv
```

Le résultat sera au format :
```
/subscriptions/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/resourceGroups/rg-saasaccel-teams-gpt-02
```

L'ID d'abonnement est la partie après `/subscriptions/`

---

## 📝 Configuration dans Partner Center

### Étapes de configuration

#### 1. Vérifier le Scénario SaaS

- ✅ Cochez : **"La solution SaaS est entièrement hébergée dans votre système Azure"**
- ✅ Cochez la case de confirmation : **"J'accepte"**

#### 2. Ajouter l'ID d'abonnement

1. Cliquez sur **"+ Ajouter un ID d'abonnement"**
2. Collez votre **Subscription ID** (format : `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)
3. **Important** : Assurez-vous que c'est l'abonnement qui contient votre déploiement SaaS Accelerator

#### 3. (Optionnel) Ajouter un ID de groupe d'administration

Si votre organisation utilise des Management Groups :

1. Cliquez sur **"+ Ajouter un ID de groupe d'administration"**
2. Collez le Management Group ID

---

## ✅ Checklist de validation

Avant de cliquer sur **"Enregistrer le brouillon"** :

- [ ] Option "Entièrement hébergée dans Azure" cochée
- [ ] Case de confirmation cochée
- [ ] ID d'abonnement correct ajouté (celui qui contient `rg-saasaccel-teams-gpt-02`)
- [ ] ID vérifié dans Azure Portal ou via CLI
- [ ] Le Resource Group est bien dans cet abonnement

---

## 🔐 Vérification de l'ID d'abonnement actuel

### Script de vérification rapide

```bash
#!/bin/bash

echo "🔍 Vérification de l'abonnement Azure..."
echo ""

# Afficher l'abonnement actuel
echo "📋 Abonnement actuel :"
az account show --output table

echo ""
echo "🎯 Resource Group du SaaS Accelerator :"
az group show --name rg-saasaccel-teams-gpt-02 --query "{Name:name, Location:location, SubscriptionId:id}" -o table

echo ""
echo "✅ Utilisez le Subscription ID visible ci-dessus dans Partner Center"
```

### Résultat attendu

```
Name                          Location        SubscriptionId
----------------------------  --------------  ----------------------------------------------------------------
rg-saasaccel-teams-gpt-02    canadacentral   /subscriptions/0f1323ea-0f29-4187-9872-e1cf15d677de/resourceGroups/...
```

**L'ID à copier** : `0f1323ea-0f29-4187-9872-e1cf15d677de` (exemple)

---

## 🎯 Exemple de configuration complète

### Configuration correcte attendue

```
Scénario SaaS
  ☑️ La solution SaaS est entièrement hébergée dans votre système Azure
  ☑️ J'accepte

ID d'abonnement
  ┌─────────────────────────────────────────┐
  │ 0f1323ea-0f29-4187-9872-e1cf15d677de   │  ← Votre Subscription ID
  └─────────────────────────────────────────┘
  
ID de groupe d'administration (optionnel)
  ┌─────────────────────────────────────────┐
  │ [Vide ou Management Group ID si existe] │
  └─────────────────────────────────────────┘
```

---

## ⚠️ Erreurs courantes à éviter

### ❌ Erreur 1 : Mauvais ID d'abonnement

**Problème** : Utiliser l'ID d'un autre abonnement Azure

**Impact** : Microsoft ne pourra pas valider que votre solution est hébergée sur Azure

**Solution** : Toujours vérifier avec `az group show --name rg-saasaccel-teams-gpt-02`

### ❌ Erreur 2 : Mauvais scénario sélectionné

**Problème** : Sélectionner "Partiellement hébergé" alors que tout est sur Azure

**Impact** : Questions supplémentaires de Microsoft, retard de certification

**Solution** : Choisir "Entièrement hébergé dans Azure"

### ❌ Erreur 3 : Oublier la case de confirmation

**Problème** : Ne pas cocher "J'accepte"

**Impact** : Impossible de sauvegarder

**Solution** : Toujours cocher la case de confirmation

---

## 🔄 Validation post-configuration

### Que va vérifier Microsoft ?

1. ✅ **Validation de l'abonnement** : Vérifier que l'ID existe et vous appartient
2. ✅ **Validation de l'hébergement** : Confirmer que des ressources Azure existent dans cet abonnement
3. ✅ **Validation de la cohérence** : Vérifier que le Tenant ID correspond

### Temps de validation

- **Validation automatique** : 1-2 minutes après sauvegarde
- **Validation manuelle Microsoft** : Lors de la soumission pour certification

---

## 📚 Informations contextuelles

### Pourquoi Microsoft demande ces informations ?

**Objectif** : S'assurer que votre offre SaaS respecte les critères Azure Marketplace :

1. **Hébergement Azure** : Pour les offres SaaS "Azure-hosted", Microsoft veut confirmer l'utilisation réelle d'Azure
2. **Facturation Azure** : Permet de valider la consommation Azure du client final
3. **Conformité** : Garantir que les ressources sont dans des régions conformes

### Sécurité des données

- ✅ Microsoft vérifie uniquement l'**existence** des ressources
- ✅ Aucun accès aux **données** de votre application
- ✅ Validation **lecture seule** de la structure Azure

---

## 🎯 Actions post-configuration

### Après avoir cliqué sur "Enregistrer le brouillon"

1. ✅ Vérifier qu'aucune erreur de validation n'apparaît
2. ✅ Passer à la section suivante : **"Revendre via les CSP"**
3. ✅ Continuer vers **"Configuration technique"** (déjà fait)
4. ✅ Finaliser **"Vue d'ensemble du plan"** (dimensions metered)

---

## 📋 Récapitulatif des informations à renseigner

| Champ | Valeur | Status |
|-------|--------|--------|
| **Scénario SaaS** | Entièrement hébergé dans Azure | ✅ Obligatoire |
| **Confirmation** | Case cochée "J'accepte" | ✅ Obligatoire |
| **ID d'abonnement** | `0f1323ea-0f29-4187-9872-e1cf15d677de` | ✅ À vérifier |
| **ID groupe d'admin** | (Optionnel) | ⚪ Facultatif |

---

## 🔗 Commandes utiles

### Vérifier l'abonnement actuel

```bash
az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" -o table
```

### Vérifier le Resource Group

```bash
az group show --name rg-saasaccel-teams-gpt-02 --query "{RG:name, Location:location, SubId:id}" -o json
```

### Lister toutes les ressources du Resource Group

```bash
az resource list --resource-group rg-saasaccel-teams-gpt-02 --output table
```

---

## 📞 Support

Si vous rencontrez des erreurs lors de la validation :

1. **Erreur "Subscription not found"**
   - Vérifier que l'ID est correct
   - Vérifier que vous avez les permissions sur l'abonnement

2. **Erreur "No resources found"**
   - Vérifier que le Resource Group existe bien
   - Vérifier que les ressources sont déployées

3. **Erreur "Tenant mismatch"**
   - Vérifier que l'abonnement est dans le même Tenant que votre compte Partner Center

---

**Date de création** : 2025-10-30  
**Dernière mise à jour** : 2025-10-30  
**Section Partner Center** : Contenu supplémentaire  
**Statut** : Configuration initiale
