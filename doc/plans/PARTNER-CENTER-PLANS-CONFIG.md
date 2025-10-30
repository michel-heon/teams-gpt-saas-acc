# 📋 Configuration des Plans - Partner Center

## 🎯 Vue d'ensemble

Ce document explique comment configurer les **4 plans tarifaires** dans Partner Center pour l'offre "Teams GPT Assistant" avec un modèle **forfait + quota de messages inclus + dépassement**.

---

## 📊 Modèle de tarification

### Type de facturation
- **Tarification à la disponibilité (Metered billing)**
- Prix de base mensuel + messages inclus + frais de dépassement

### Dimensions metered (déjà créées)

Vous avez déjà créé 3 dimensions correctes :

| Dimension ID | Usage | Quota inclus | Prix dépassement |
|--------------|-------|--------------|------------------|
| `free` | Plan Starter | 50 messages | $0.02 / message |
| `pro` | Plan Professional | 300 messages | $0.015 / message |
| `pro-plus` | Plan Pro Plus | 1500 messages | $0.01 / message |

---

## 📦 Configuration des 4 plans

### Plan 1 : Development

**Usage** : Plan pour développeurs et tests

| Paramètre | Valeur |
|-----------|--------|
| **Plan ID** | `development` |
| **Nom d'affichage** | `Development` |
| **Description** | Plan gratuit pour développeurs avec messages illimités pour tests et développement |
| **Type de facturation** | Tarification à la disponibilité (Metered) |
| **Prix de base** | $0.00 USD / mois |
| **Dimensions liées** | Aucune (ou créer dimension `dev-message` à $0) |
| **Visibilité** | Privé (visible uniquement via lien direct) |
| **Période d'essai gratuit** | Non |

**Configuration spécifique** :
- ⚠️ Plan réservé aux développeurs uniquement
- Messages illimités pour faciliter les tests
- Accès via lien privé dans Partner Center

---

### Plan 2 : Starter

**Usage** : Plan d'entrée gratuit avec quota limité

| Paramètre | Valeur |
|-----------|--------|
| **Plan ID** | `starter` |
| **Nom d'affichage** | `Starter` |
| **Description** | Plan gratuit avec 50 messages inclus par mois, idéal pour essayer le service |
| **Type de facturation** | Tarification à la disponibilité (Metered) |
| **Prix de base** | $0.00 USD / mois |
| **Dimension liée** | `free` |
| **Quantité incluse** | `50` messages |
| **Prix dépassement** | $0.02 USD / message supplémentaire |
| **Visibilité** | Public |
| **Période d'essai gratuit** | Oui - 30 jours |

**Exemple de facturation** :
- Utilisation : 75 messages
- Coût : $0.00 (base) + (75 - 50) × $0.02 = $0.50 USD

---

### Plan 3 : Professional

**Usage** : Plan pour utilisation professionnelle régulière

| Paramètre | Valeur |
|-----------|--------|
| **Plan ID** | `professional` |
| **Nom d'affichage** | `Professional` |
| **Description** | Plan professionnel avec 300 messages inclus par mois, support prioritaire |
| **Type de facturation** | Tarification à la disponibilité (Metered) |
| **Prix de base** | $9.99 USD / mois |
| **Dimension liée** | `pro` |
| **Quantité incluse** | `300` messages |
| **Prix dépassement** | $0.015 USD / message supplémentaire |
| **Visibilité** | Public |
| **Période d'essai gratuit** | Oui - 30 jours |

**Exemple de facturation** :
- Utilisation : 450 messages
- Coût : $9.99 (base) + (450 - 300) × $0.015 = $9.99 + $2.25 = $12.24 USD

---

### Plan 4 : Pro Plus

**Usage** : Plan pour équipes avec utilisation intensive

| Paramètre | Valeur |
|-----------|--------|
| **Plan ID** | `pro-plus` |
| **Nom d'affichage** | `Pro Plus` |
| **Description** | Plan premium avec 1500 messages inclus par mois, support dédié et dépassement réduit |
| **Type de facturation** | Tarification à la disponibilité (Metered) |
| **Prix de base** | $49.99 USD / mois |
| **Dimension liée** | `pro-plus` |
| **Quantité incluse** | `1500` messages |
| **Prix dépassement** | $0.01 USD / message supplémentaire |
| **Visibilité** | Public |
| **Période d'essai gratuit** | Oui - 30 jours |

**Exemple de facturation** :
- Utilisation : 2000 messages
- Coût : $49.99 (base) + (2000 - 1500) × $0.01 = $49.99 + $5.00 = $54.99 USD

---

## 🛠️ Étapes de configuration dans Partner Center

### Étape 1 : Accéder à la section Plans

1. Connectez-vous à Partner Center
2. Naviguez vers votre offre "Teams GPT"
3. Cliquez sur l'onglet **"Plans"** dans le menu gauche
4. Cliquez sur **"+ Créer un nouveau plan"**

---

### Étape 2 : Créer le plan "Development"

#### Configuration de base
1. **ID du plan** : `development`
2. **Nom du plan** : `Development`
3. **Description** : `Plan gratuit pour développeurs avec messages illimités pour tests et développement`

#### Configuration des prix
1. **Marchés** : Sélectionnez les marchés (USA, Canada, Europe)
2. **Type de tarification** : Sélectionnez **"Tarification à la disponibilité"**
3. **Prix de base** :
   - Durée : Mensuel
   - Prix : $0.00 USD
4. **Dimensions** : Ne lier aucune dimension (ou créer `dev-message` à $0)

#### Visibilité
1. **Visibilité du plan** : Sélectionnez **"Privé"**
2. Ajoutez les Tenant IDs autorisés pour les développeurs

#### Enregistrer
- Cliquez sur **"Enregistrer le brouillon"**

---

### Étape 3 : Créer le plan "Starter"

#### Configuration de base
1. **ID du plan** : `starter`
2. **Nom du plan** : `Starter`
3. **Description** : `Plan gratuit avec 50 messages inclus par mois, idéal pour essayer le service`

#### Configuration des prix
1. **Marchés** : Sélectionnez les marchés
2. **Type de tarification** : **"Tarification à la disponibilité"**
3. **Prix de base** :
   - Durée : Mensuel
   - Prix : $0.00 USD

#### Configuration de la dimension
1. **Ajouter une dimension** : Sélectionnez `free`
2. **Quantité incluse dans le prix de base** : `50`
   - ⚠️ **Important** : Ce champ indique que les 50 premiers messages sont inclus gratuitement
3. **Prix par unité supplémentaire** : `0.02` USD
   - Les messages au-delà de 50 seront facturés $0.02 chacun

#### Essai gratuit
1. **Activer l'essai gratuit** : Oui
2. **Durée de l'essai** : 1 mois (30 jours)

#### Visibilité
1. **Visibilité du plan** : **"Public"**

#### Enregistrer
- Cliquez sur **"Enregistrer le brouillon"**

---

### Étape 4 : Créer le plan "Professional"

#### Configuration de base
1. **ID du plan** : `professional`
2. **Nom du plan** : `Professional`
3. **Description** : `Plan professionnel avec 300 messages inclus par mois, support prioritaire`

#### Configuration des prix
1. **Marchés** : Sélectionnez les marchés
2. **Type de tarification** : **"Tarification à la disponibilité"**
3. **Prix de base** :
   - Durée : Mensuel
   - Prix : $9.99 USD

#### Configuration de la dimension
1. **Ajouter une dimension** : Sélectionnez `pro`
2. **Quantité incluse dans le prix de base** : `300`
3. **Prix par unité supplémentaire** : `0.015` USD

#### Essai gratuit
1. **Activer l'essai gratuit** : Oui
2. **Durée de l'essai** : 1 mois

#### Visibilité
1. **Visibilité du plan** : **"Public"**

#### Enregistrer
- Cliquez sur **"Enregistrer le brouillon"**

---

### Étape 5 : Créer le plan "Pro Plus"

#### Configuration de base
1. **ID du plan** : `pro-plus`
2. **Nom du plan** : `Pro Plus`
3. **Description** : `Plan premium avec 1500 messages inclus par mois, support dédié et dépassement réduit`

#### Configuration des prix
1. **Marchés** : Sélectionnez les marchés
2. **Type de tarification** : **"Tarification à la disponibilité"**
3. **Prix de base** :
   - Durée : Mensuel
   - Prix : $49.99 USD

#### Configuration de la dimension
1. **Ajouter une dimension** : Sélectionnez `pro-plus`
2. **Quantité incluse dans le prix de base** : `1500`
3. **Prix par unité supplémentaire** : `0.01` USD

#### Essai gratuit
1. **Activer l'essai gratuit** : Oui
2. **Durée de l'essai** : 1 mois

#### Visibilité
1. **Visibilité du plan** : **"Public"**

#### Enregistrer
- Cliquez sur **"Enregistrer le brouillon"**

---

## 🔍 Vérification de la configuration

### Checklist de validation

- [ ] **Plan Development** : Prix de base $0, aucune dimension, visibilité privée
- [ ] **Plan Starter** : Prix de base $0, dimension `free` avec 50 inclus à $0.02 dépassement
- [ ] **Plan Professional** : Prix de base $9.99, dimension `pro` avec 300 inclus à $0.015 dépassement
- [ ] **Plan Pro Plus** : Prix de base $49.99, dimension `pro-plus` avec 1500 inclus à $0.01 dépassement
- [ ] Tous les plans publics ont l'essai gratuit activé (30 jours)
- [ ] Les marchés sont correctement sélectionnés
- [ ] Les descriptions sont claires et complètes

---

## 💡 Points clés à retenir

### Champ "Quantité incluse dans le prix de base"

Ce champ est **essentiel** pour votre modèle forfait + quota :

- Il indique le nombre d'unités **incluses gratuitement** dans le prix de base mensuel
- **Starter** : 50 messages inclus dans les $0.00
- **Professional** : 300 messages inclus dans les $9.99
- **Pro Plus** : 1500 messages inclus dans les $49.99

### Facturation des dépassements

Après épuisement du quota :
- Chaque message supplémentaire est facturé au "Prix par unité supplémentaire"
- Les dépassements sont cumulés sur le mois
- La facturation totale = Prix de base + (Messages au-delà du quota × Prix dépassement)

### Période d'essai

- Pendant l'essai gratuit : Le client ne paie **ni** le prix de base **ni** les dépassements
- Après l'essai : Facturation normale (base + dépassements éventuels)

---

## 📈 Exemples de facturation mensuelle

### Scénario 1 : Starter avec 30 messages
- Prix de base : $0.00
- Messages utilisés : 30 (< 50 inclus)
- Dépassement : 0
- **Total : $0.00**

### Scénario 2 : Starter avec 100 messages
- Prix de base : $0.00
- Messages utilisés : 100
- Dépassement : 100 - 50 = 50 messages × $0.02 = $1.00
- **Total : $1.00**

### Scénario 3 : Professional avec 250 messages
- Prix de base : $9.99
- Messages utilisés : 250 (< 300 inclus)
- Dépassement : 0
- **Total : $9.99**

### Scénario 4 : Professional avec 500 messages
- Prix de base : $9.99
- Messages utilisés : 500
- Dépassement : 500 - 300 = 200 messages × $0.015 = $3.00
- **Total : $12.99**

### Scénario 5 : Pro Plus avec 1200 messages
- Prix de base : $49.99
- Messages utilisés : 1200 (< 1500 inclus)
- Dépassement : 0
- **Total : $49.99**

### Scénario 6 : Pro Plus avec 2500 messages
- Prix de base : $49.99
- Messages utilisés : 2500
- Dépassement : 2500 - 1500 = 1000 messages × $0.01 = $10.00
- **Total : $59.99**

---

## 🚀 Prochaines étapes

1. ✅ **Dimensions créées** : Vous avez déjà `free`, `pro`, `pro-plus`
2. ⏭️ **Créer les 4 plans** : Suivez les étapes ci-dessus
3. ⏭️ **Tester** : Créez un abonnement de test pour chaque plan
4. ⏭️ **Publier** : Soumettez l'offre pour certification Microsoft

---

## 📞 Support

Si vous avez des questions lors de la configuration :
- Consultez la documentation Microsoft Partner Center
- Vérifiez que les dimensions sont bien liées aux plans
- Testez avec un abonnement privé avant publication

---

**Date de création** : 30 octobre 2025
**Version** : 1.0
**Auteur** : Configuration pour Teams GPT SaaS
