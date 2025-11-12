# ADR-002: Vérification des URLs dans la Documentation

## Statut
Accepté - 6 novembre 2025

## Contexte

Lors de la création et mise à jour des issues GitHub (notamment Issue #8 - Phase 2.3), nous avons constaté la présence de **liens inexistants** vers des fichiers de documentation :

### Problèmes identifiés

**URLs hallucinées dans Issue #8** :
```markdown
- [Architecture SaaS](../doc/architecture/saas-marketplace-architecture.md)
- [Phase 2 - Architecture](../doc/phase2/ARCHITECTURE.md)
- [SaaS Accelerator Scheduler](../doc/phase2/saas-accelerator-metered-scheduler.md)
- [User Journey](../doc/architecture/user-journey.md)
```

**Vérification réelle** :
```bash
$ ls doc/architecture/
PHASE-2.3-PLAN.md
README.md
configuration-flow.md
distribution-repository.md
implementation-plan.md
manifest-finalization-report.md
phase2-teams-integration.md
saas-accelerator-integration.md
saas-marketplace-architecture.md  ✅ (existe)
technical-specifications.md
user-journey.md  ✅ (existe)

$ ls doc/phase2/
ARCHITECTURE-CHANGES-NOV-2025.md
ARCHITECTURE.md  ✅ (existe)
configuration-saas.md
marketplace-credentials-extraction.md
saas-accelerator-metered-scheduler.md  ✅ (existe)
TEST-PLAN-AGGREGATION.md
TEST-PLAN-PLAYGROUND.md
```

### Impact

**Conséquences des liens inexistants** :
1. **Expérience utilisateur dégradée** : Liens cassés (404) lors de la navigation
2. **Perte de crédibilité** : Documentation qui paraît non maintenue
3. **Confusion** : Références à des contenus inexistants créent de fausses attentes
4. **Maintenance difficile** : Impossible de savoir quels liens sont valides
5. **Duplication d'effort** : Temps perdu à rechercher des documents qui n'existent pas

### Cause racine

**LLM (Large Language Model) peut "halluciner" des chemins de fichiers** :
- Génération de liens plausibles mais inexistants
- Confusion entre repositories (Commercial-Marketplace-SaaS-Accelerator vs teams-gpt-saas-acc)
- Inférence de structure de documentation standard qui n'existe pas encore
- Pas de validation automatique des URLs avant publication

---

## Décision

Nous adoptons le **principe de vérification stricte des URLs** dans toute la documentation du projet.

### Règle 1 : Vérification Obligatoire

**Avant de créer ou mettre à jour une issue GitHub, documentation ou ADR** :

```bash
# Vérifier l'existence d'un fichier
test -f doc/architecture/saas-marketplace-architecture.md && echo "✅ Existe" || echo "❌ N'existe pas"

# Lister le contenu d'un dossier
ls doc/architecture/

# Rechercher un fichier
find doc/ -name "*.md" | grep architecture
```

### Règle 2 : Format des Liens Relatifs

**Dans les issues GitHub** :
```markdown
❌ MAUVAIS : [Architecture](../doc/architecture/saas-marketplace-architecture.md)
✅ BON : Voir doc/architecture/saas-marketplace-architecture.md dans le repository
✅ BON : [Architecture](https://github.com/michel-heon/teams-gpt-saas-acc/blob/main/doc/architecture/saas-marketplace-architecture.md)
```

**Dans les fichiers Markdown du repository** :
```markdown
✅ BON : [Architecture](../architecture/saas-marketplace-architecture.md)
✅ BON : Voir `doc/architecture/saas-marketplace-architecture.md`
```

### Règle 3 : Principe "Moins de Liens, Plus de Précision"

**Privilégier** :
- Description textuelle claire
- Chemin de fichier en code (`doc/architecture/file.md`)
- Sections dans le même document
- Liens vérifiés vers des URLs absolues (GitHub)

**Éviter** :
- Liens multiples vers des fichiers non vérifiés
- Références implicites ("voir la documentation")
- Liens vers des repositories externes non confirmés

### Règle 4 : Documentation Externe

**Pour les repositories externes** :
```markdown
❌ MAUVAIS : [Documentation](https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/INSTALLATION.md)
           (sans vérifier que le repository ou le fichier existe)

✅ BON : Vérifier d'abord :
1. Le repository existe-t-il ? (vérifier sur GitHub)
2. Le fichier existe-t-il dans main/master ?
3. Le lien est-il accessible publiquement ?

Si incertain : "Documentation disponible dans le repository public (à créer/vérifier)"
```

### Règle 5 : Checklist de Révision

**Avant de publier une issue/PR avec documentation** :

- [ ] Vérifier tous les liens relatifs (`../doc/...`)
- [ ] Tester les liens GitHub absolues (ouvrir dans navigateur)
- [ ] Confirmer que les fichiers référencés existent (`ls`, `find`)
- [ ] Si le fichier n'existe pas : supprimer le lien ou marquer "⏸️ À créer"
- [ ] Préférer les chemins en code (backticks) aux liens markdown

---

## Conséquences

### Positives

1. **Qualité de documentation** : Liens fiables et vérifiables
2. **Maintenance facilitée** : Pas de liens cassés à corriger ultérieurement
3. **Crédibilité** : Documentation professionnelle et maintenue
4. **Traçabilité** : Savoir exactement quels documents existent
5. **Gain de temps** : Pas de recherche inutile de fichiers inexistants

### Négatives

1. **Effort initial** : Vérification manuelle nécessaire avant publication
2. **Ralentissement** : 2-3 minutes supplémentaires pour valider les URLs
3. **Moins de liens** : Documentation peut sembler moins interconnectée

### Mitigations

**Pour réduire l'effort** :
```bash
# Script de vérification rapide
alias check-doc="find doc/ -name '*.md' | sort"

# Dans un Makefile
validate-links:
	@echo "Validation des liens dans les fichiers Markdown..."
	@find . -name "*.md" -exec grep -H "\[.*\](.*/doc/.*)" {} \; || true
```

**Pour les LLM (Copilot, ChatGPT)** :
- Toujours utiliser `ls`, `find`, `test -f` avant de créer un lien
- Privilégier les chemins en code plutôt que les liens markdown
- Marquer explicitement les fichiers "À créer" avec ⏸️

---

## Alternatives Considérées

### Alternative 1 : Validation Automatique

**Utiliser un linter de liens Markdown** :
```bash
npm install -g markdown-link-check
markdown-link-check doc/**/*.md
```

**Rejetée pour** : 
- Complexité d'installation
- Nécessite CI/CD configuré
- Overkill pour un projet avec peu de documentation externe

### Alternative 2 : Pas de Liens du Tout

**N'utiliser que du texte en code** :
```markdown
Voir le fichier `doc/architecture/saas-marketplace-architecture.md`
```

**Rejetée pour** :
- Moins convivial (pas de navigation directe)
- Perd l'avantage des liens cliquables dans GitHub

### Alternative 3 : "Trust but Verify"

**Faire confiance aux LLM, corriger après coup** :

**Rejetée pour** :
- Génère de la dette technique (liens cassés)
- Mauvaise expérience utilisateur immédiate
- Perte de crédibilité

---

## Exemples d'Application

### Exemple 1 : Issue GitHub

**Avant (avec hallucinations)** :
```markdown
## Références
- [Architecture SaaS](../doc/architecture/saas-marketplace-architecture.md)
- [SaaS Accelerator Scheduler](../doc/phase2/saas-accelerator-metered-scheduler.md)
- [User Journey](../doc/architecture/user-journey.md)
- [Deployment Guide](../doc/guides/production-deployment.md) ❌ N'existe pas
```

**Après (vérifié)** :
```markdown
## Références

### Documentation technique (teams-gpt-saas-acc)
- Architecture SaaS : `doc/architecture/saas-marketplace-architecture.md`
- User Journey : `doc/architecture/user-journey.md`
- Configuration SaaS : `doc/phase2/configuration-saas.md`

### Guides (à créer)
- ⏸️ Production Deployment Guide (`doc/guides/production-deployment.md`) - À créer Phase 3
```

### Exemple 2 : Liens Externes

**Avant (non vérifié)** :
```markdown
Documentation disponible sur :
- [INSTALLATION.md](https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/INSTALLATION.md)
- [SUPPORT.md](https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main/SUPPORT.md)
```

**Après (vérifié)** :
```markdown
Documentation dans `appPackage/distribution-snapshot/` :
- INSTALLATION.md v1.3.2
- SUPPORT.md (FAQ mis à jour)
- PRIVACY.md
- TERMS.md

À publier vers repository public avec : `make sync-distribution`
```

### Exemple 3 : Documentation Interne

**Avant (liens relatifs cassés dans issue)** :
```markdown
Voir [la documentation](../doc/architecture/PHASE-2.3-PLAN.md)
```

**Après (chemin absolu GitHub)** :
```markdown
Voir le plan Phase 2.3 dans le repository :
https://github.com/michel-heon/teams-gpt-saas-acc/blob/main/doc/architecture/PHASE-2.3-PLAN.md
```

---

## Outils de Support

### Script de Vérification

**Créer `scripts/validate-doc-links.sh`** :
```bash
#!/bin/bash
# Valider les liens dans la documentation

echo "🔍 Vérification des fichiers doc/ existants..."
find doc/ -name "*.md" | sort

echo ""
echo "⚠️  Recherche de liens potentiellement cassés dans les issues..."
echo "   (À vérifier manuellement sur GitHub)"

echo ""
echo "✅ Fichiers de documentation trouvés : $(find doc/ -name '*.md' | wc -l)"
```

### Commandes Utiles

```bash
# Lister toute la documentation
make list-docs  # À créer dans Makefile

# Vérifier un fichier spécifique
test -f doc/architecture/file.md && echo "✅" || echo "❌"

# Rechercher un fichier par nom
find doc/ -name "*architecture*"

# Voir la structure complète
tree doc/
```

---

## Métriques de Succès

**Indicateurs de conformité** :
- [ ] 0 lien cassé dans les issues créées après le 6 nov 2025
- [ ] 100% des liens externes vérifiés avant publication
- [ ] Temps de vérification \u003c 3 minutes par issue
- [ ] 0 plainte utilisateur pour lien 404

**Suivi** :
- Revue manuelle des issues créées chaque semaine
- Tag "documentation" sur les issues avec liens vérifiés
- Note dans les PR reviews : "Liens vérifiés ✅"

---

## Références

### Issues Affectées
- **Issue #8** : Phase 2.3 - Custom Landing Page (corrigée le 6 nov 2025)

### Commits Liés
- `53e121e` : Documentation v1.3.3 fixes
- Issue #8 mise à jour : Suppression des URLs hallucinées

### Documentation Connexe
- ADR-001 : Nomenclature des versions
- GitHub Best Practices : [Linking to Files](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#relative-links)

---

## Révisions

| Date | Auteur | Changement |
|------|--------|------------|
| 2025-11-06 | GitHub Copilot | Création initiale suite à correction Issue #8 |

---

**Approuvé par** : michel-heon  
**Date d'application** : 6 novembre 2025  
**Prochaine révision** : Décembre 2025 (après Phase 3 complétée)
