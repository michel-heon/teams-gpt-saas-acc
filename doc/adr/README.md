# Architecture Decision Records (ADR)

Ce dossier contient les décisions d'architecture prises pour le projet Teams GPT SaaS Accelerator.

## Format ADR

Chaque ADR suit la structure suivante :
- **Statut** : Proposé, Accepté, Déprécié, Remplacé
- **Contexte** : Problème ou situation nécessitant une décision
- **Décision** : Choix effectué et justification
- **Conséquences** : Impacts positifs et négatifs
- **Alternatives** : Options considérées mais rejetées

## Liste des ADR

| # | Titre | Statut | Date | Description |
|---|-------|--------|------|-------------|
| [001](./001-version-naming-convention.md) | Nomenclature des Versions | Accepté | 2025-11-03 | Format des tags Git avec descripteurs signifiants (v1.3.3-documentation-fixes) |
| [002](./002-no-url-hallucination.md) | Vérification des URLs dans la Documentation | Accepté | 2025-11-06 | Principe de validation stricte des liens pour éviter les URLs inexistantes |

## Créer un Nouveau ADR

### Template

```markdown
# ADR-XXX: [Titre de la Décision]

## Statut
[Proposé | Accepté | Déprécié | Remplacé par ADR-YYY] - [Date]

## Contexte
[Décrire le problème ou la situation]

## Décision
[Décrire la décision et sa justification]

## Conséquences
### Positives
- [Impact positif 1]

### Négatives
- [Impact négatif 1]

## Alternatives Considérées
### Alternative 1
**Description** : ...
**Rejetée pour** : ...

## Références
- [Lien vers issue, commit, documentation]
```

### Numérotation

- **Format** : `XXX-nom-descriptif.md`
- **Numéros** : Séquentiels avec padding (001, 002, 003, ...)
- **Nom** : kebab-case, descriptif du sujet

### Processus

1. **Créer** : Copier le template, remplir le contexte
2. **Proposer** : Statut "Proposé", discussion en PR
3. **Accepter** : Statut "Accepté" après validation
4. **Implémenter** : Appliquer la décision dans le code
5. **Référencer** : Ajouter dans ce README

## Principes Directeurs

### Quand Créer un ADR ?

**✅ OUI** :
- Décision architecturale significative
- Choix de technologie ou pattern
- Modification d'une convention existante
- Résolution d'un problème récurrent

**❌ NON** :
- Changement mineur de code
- Bug fix standard
- Refactoring local
- Configuration temporaire

### Caractéristiques d'un Bon ADR

1. **Clair** : Décision compréhensible sans contexte externe
2. **Justifié** : Explique le "pourquoi" pas seulement le "quoi"
3. **Contextualisé** : Inclut le problème et les contraintes
4. **Complet** : Documente les alternatives et conséquences
5. **Référencé** : Liens vers issues, commits, documentation

## Révision des ADR

### Quand Réviser ?

- Tous les 6 mois (revue générale)
- Lors de changements majeurs d'architecture
- Si un ADR devient obsolète ou problématique

### Processus de Révision

1. **Déprécier** : Changer statut en "Déprécié" + explication
2. **Remplacer** : Créer nouvel ADR avec référence à l'ancien
3. **Mettre à jour** : Section "Révisions" avec date et changement

## Outils

### Rechercher un ADR

```bash
# Par titre
grep -r "Nomenclature" doc/adr/

# Par date
ls -lt doc/adr/*.md

# Par statut
grep "Statut" doc/adr/*.md
```

### Valider Format

```bash
# Vérifier structure
for file in doc/adr/*.md; do
  echo "Checking $file..."
  grep -q "## Statut" "$file" && echo "✅ Statut" || echo "❌ Statut manquant"
  grep -q "## Contexte" "$file" && echo "✅ Contexte" || echo "❌ Contexte manquant"
  grep -q "## Décision" "$file" && echo "✅ Décision" || echo "❌ Décision manquant"
done
```

## Statistiques

**Total ADR** : 2  
**Acceptés** : 2  
**Proposés** : 0  
**Dépréciés** : 0  

**Dernière mise à jour** : 6 novembre 2025

---

## Références

- [ADR GitHub](https://adr.github.io/) - Standard communautaire
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) - Article fondateur
- [ADR Tools](https://github.com/npryce/adr-tools) - Outils CLI pour ADR

---

**Mainteneur** : michel-heon  
**Contact** : Via GitHub Issues ou PRs
