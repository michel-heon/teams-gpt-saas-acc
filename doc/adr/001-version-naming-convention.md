# ADR-001: Nomenclature des Versions

## Statut
Accepté - 3 novembre 2025

## Contexte
Le projet nécessite une nomenclature claire et descriptive pour les versions afin de :
- Faciliter l'identification rapide du contenu d'une version
- Améliorer la traçabilité des fonctionnalités
- Permettre une meilleure communication entre les membres de l'équipe
- Faciliter la recherche et la navigation dans l'historique Git

Auparavant, les tags utilisaient uniquement un numéro de version (ex: `v1.2.8`), ce qui ne permettait pas d'identifier rapidement le contenu de la version sans consulter les détails du tag.

## Décision
Nous adoptons la nomenclature suivante pour les tags de version :

```
v{MAJOR}.{MINOR}.{PATCH}-{descripteur-signifiant}
```

### Format
- **v** : Préfixe obligatoire pour tous les tags de version
- **{MAJOR}.{MINOR}.{PATCH}** : Numéro de version sémantique
- **-** : Séparateur entre le numéro et le descripteur
- **{descripteur-signifiant}** : Texte court décrivant les principales fonctionnalités de la version

### Règles pour le descripteur
1. **Langue** : Anglais (pour cohérence avec le code et Git)
2. **Format** : kebab-case (mots en minuscules séparés par des tirets)
3. **Longueur** : 2-4 mots maximum pour rester concis
4. **Contenu** : Focus sur les fonctionnalités majeures ou le thème de la version
5. **Exemples valides** :
   - `scheduler-playground`
   - `marketplace-integration`
   - `auth-improvements`
   - `database-migration`
   - `api-refactor`

### Versioning Sémantique
Nous suivons les principes du [Semantic Versioning 2.0.0](https://semver.org/) :

- **MAJOR** (X.0.0) : Changements incompatibles avec les versions précédentes (breaking changes)
- **MINOR** (0.X.0) : Ajout de fonctionnalités rétrocompatibles
- **PATCH** (0.0.X) : Corrections de bugs rétrocompatibles

### Message du Tag
Chaque tag annoté doit inclure un descriptif structuré :

```markdown
Version {VERSION} - {Titre Descriptif}

Description courte de la release.

## New Features
- Liste des nouvelles fonctionnalités
- Organisées par catégories si nécessaire

## Technical Improvements
- Améliorations techniques
- Refactoring
- Optimisations

## Files Added/Modified
- Liste des principaux fichiers modifiés
- Focus sur les fichiers importants

## Breaking Changes
- Liste des changements incompatibles
- Instructions de migration si nécessaire
- "None" si aucun changement incompatible

## Dependencies
- Changements de dépendances
- Nouvelles dépendances ajoutées
- "No dependency changes" si aucun changement
```

## Exemples

### Exemple 1: Version avec nouvelles fonctionnalités
```bash
git tag -a v1.2.9-scheduler-playground -m "Version 1.2.9 - Manual Scheduler & Playground Testing Infrastructure

This release adds critical operational tools and testing infrastructure:

## New Features

### Scheduler Management
- Manual scheduler execution capability
- SQL-based scheduler configuration
- Subscription activation for stuck states

### Testing Infrastructure
- Playground v1.0.0 implementation
- Comprehensive test scripts inventory

## Technical Improvements
- Clear distinction between pending and processed messages
- Enhanced Makefile with new commands

## Files Added/Modified
- test-saas-playground/scripts/message-status.js
- test-saas-playground/scripts/configure-scheduler.js
- src/services/usageAggregationService.js

## Breaking Changes
None

## Dependencies
No dependency changes"
```

### Exemple 2: Version de correctifs
```bash
git tag -a v1.2.10-bugfixes -m "Version 1.2.10 - Critical Bug Fixes

Bug fixes for scheduler and database issues.

## Fixed Issues
- Fix scheduler timezone handling
- Correct SQL query performance issues
- Resolve authentication token expiration

## Breaking Changes
None

## Dependencies
No dependency changes"
```

### Exemple 3: Version majeure avec breaking changes
```bash
git tag -a v2.0.0-api-v2 -m "Version 2.0.0 - API v2 Migration

Major rewrite of the API layer with breaking changes.

## New Features
- RESTful API v2 with improved endpoints
- OpenAPI 3.0 documentation
- Enhanced authentication with OAuth2

## Breaking Changes
- API v1 endpoints removed (use /api/v2/ prefix)
- Authentication now requires OAuth2 tokens
- Configuration format changed (see migration guide)

## Migration Guide
1. Update all API calls to use /api/v2/ prefix
2. Migrate authentication to OAuth2
3. Update configuration files (see docs/migration-v2.md)

## Dependencies
- Upgraded @microsoft/teams.ai to ^3.0.0
- Added oauth2-client ^2.1.0"
```

## Workflow de Création de Tags

1. **Compléter le travail** : S'assurer que tous les commits sont faits
2. **Vérifier l'état Git** : `git status` doit être propre
3. **Déterminer le numéro de version** : Suivre le versioning sémantique
4. **Choisir le descripteur** : 2-4 mots décrivant les fonctionnalités
5. **Créer le message** : Utiliser le template structuré
6. **Créer le tag annoté** : `git tag -a v{VERSION}-{descripteur} -F message.txt`
7. **Vérifier le tag** : `git show v{VERSION}-{descripteur}`
8. **Pousser le tag** : `git push origin v{VERSION}-{descripteur}`

## Commandes Utiles

```bash
# Lister les tags avec leurs messages
git tag -n3

# Afficher les détails d'un tag
git show v1.2.9-scheduler-playground

# Lister les derniers tags
git tag -l | tail -5

# Supprimer un tag local (si erreur)
git tag -d v1.2.9-scheduler-playground

# Supprimer un tag distant (si nécessaire)
git push origin --delete v1.2.9-scheduler-playground
```

## Conséquences

### Avantages
- **Lisibilité améliorée** : Identification rapide du contenu d'une version
- **Communication facilitée** : Partage plus clair entre les équipes
- **Documentation intégrée** : L'historique Git devient auto-documenté
- **Recherche simplifiée** : Trouver facilement une version par fonctionnalité
- **Professionnalisme** : Apparence plus mature du projet

### Inconvénients
- **Tags plus longs** : Nécessite plus de caractères lors des références
- **Effort supplémentaire** : Réflexion nécessaire pour choisir le descripteur
- **Discipline requise** : L'équipe doit suivre la convention systématiquement

### Atténuation des Inconvénients
- Utiliser des descripteurs courts (2-4 mots max)
- Documenter des exemples dans cet ADR
- Réviser la nomenclature en code review

## Historique des Tags

### Avant ADR-001 (Format numérique simple)
- v1.2.1 à v1.2.8 : Format `v{MAJOR}.{MINOR}.{PATCH}`

### Après ADR-001 (Format descriptif)
- v1.2.9-scheduler-playground : Première version avec descripteur
- Toutes les versions futures suivront ce format

## Références
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Git Tagging Best Practices](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)

## Notes
- Cette nomenclature s'applique uniquement aux **tags Git** (releases)
- Les **branches** suivent une nomenclature différente (feature/, bugfix/, hotfix/)
- Les **commits** suivent les Conventional Commits (feat:, fix:, docs:, etc.)
- Le descripteur peut être omis pour les versions de patch mineurs si le message du tag est suffisamment explicite
