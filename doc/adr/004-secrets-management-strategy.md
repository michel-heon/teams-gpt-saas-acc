# ADR-004: Secrets Management Strategy

**Date:** 12 novembre 2025  
**Statut:** ✅ Accepté  
**Décideurs:** michel-heon, GitHub Copilot  
**Contexte:** Incident de sécurité - credentials Azure exposés publiquement (12 novembre 2025)

---

## Contexte et problème

Le 12 novembre 2025, un scan automatisé (leakscanner@mailbox.org) a détecté des credentials Azure exposés publiquement dans notre repository GitHub :

- **App Registration:** sac-02-FulfillmentAppReg
- **Client Secret:** XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu (compromis)
- **Fichiers affectés:**
  - `doc/phase2/marketplace-credentials-extraction.md` (documentation avec exemple réel)
  - `env/.env.playground` (credentials hardcodés)

**Root cause:**
1. Documentation créée avec credentials réels au lieu de placeholders
2. Configuration de test commitée avec secrets réels
3. Manque de compréhension de la convention M365 Agents Toolkit (`.user` files)

**Impact:**
- 10 jours d'exposition publique
- Révocation/rotation urgente requise
- Risque d'utilisation non autorisée de l'API Marketplace

---

## Décision

**Adopter une politique stricte de gestion des secrets basée sur la convention M365 Agents Toolkit:**

### Règle #1: Séparation des fichiers d'environnement

```
env/
├── .env.{env}           → Variables NON sensibles (commités)
└── .env.{env}.user      → Variables SENSIBLES (gitignorés)
```

**Fichiers commitables (`.env.{env}`):**
- IDs publics (Tenant ID, Client ID, App ID)
- URLs publiques (endpoints Azure)
- Configuration non sensible (feature flags, limites)
- Resource names (SQL server, resource groups)

**Fichiers secrets (`.env.{env}.user`):**
- Secrets (CLIENT_SECRET, API keys)
- Tokens (OpenAI API key)
- Emails personnels
- Toute information permettant l'authentification

### Règle #2: Préfixe SECRET_ obligatoire

**Tous les secrets dans `.user` files DOIVENT utiliser le préfixe `SECRET_`:**

```bash
# ✅ CORRECT - sera masqué dans les logs M365 Agents Toolkit
SECRET_AZURE_OPENAI_API_KEY=sk-...
SECRET_MARKETPLACE_METERING_CLIENT_SECRET=XNi8Q~...

# ❌ INCORRECT - risque d'exposition dans logs
AZURE_OPENAI_API_KEY=sk-...
MARKETPLACE_METERING_CLIENT_SECRET=XNi8Q~...
```

**Avantages:**
- Masquage automatique dans logs M365 Agents Toolkit
- Identification visuelle immédiate des secrets
- Prévention des fuites accidentelles via console.log

### Règle #3: Redirection explicite dans fichiers principaux

**Les fichiers `.env.{env}` DOIVENT rediriger vers `.user` pour secrets:**

```bash
# Dans .env.dev
MARKETPLACE_METERING_TENANT_ID=aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2  # ✅ Public
MARKETPLACE_METERING_CLIENT_ID=d3b2710f-1be9-4f89-8834-6273619bd838  # ✅ Public

# ⚠️ SECRET requis - défini dans .env.dev.user
# SECRET_MARKETPLACE_METERING_CLIENT_SECRET=<votre_secret_ici>
```

### Règle #4: Templates pour onboarding

**Fournir `.env.*.user.template` avec structure requise:**

```bash
# .env.dev.user.template
# Copier vers .env.dev.user et remplir avec vos vraies valeurs

# OpenAI API Key
SECRET_AZURE_OPENAI_API_KEY=<votre_clé_openai>

# Marketplace Metering API
SECRET_MARKETPLACE_METERING_CLIENT_SECRET=<votre_client_secret>

# Admin Email
SAAS_ADMIN_EMAIL=<votre_email>
```

### Règle #5: Zero Tolerance pour documentation

**Documentation et exemples DOIVENT utiliser placeholders:**

```bash
# ✅ CORRECT
{
  "appId": "<YOUR_CLIENT_ID>",
  "password": "<YOUR_CLIENT_SECRET>",
  "tenant": "<YOUR_TENANT_ID>"
}

# ❌ INCORRECT - Ne JAMAIS montrer de vraies valeurs
{
  "appId": "d3b2710f-1be9-4f89-8834-6273619bd838",
  "password": "XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu",
  "tenant": "aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2"
}
```

---

## Conséquences

### Positives

✅ **Conformité M365 Agents Toolkit**
- Utilise la convention standard `.user` files
- Masquage automatique secrets avec préfixe `SECRET_`
- Intégration native CI/CD Teams Toolkit

✅ **Prévention d'exposition**
- `.gitignore` standard exclut déjà `env/.env.*.user`
- Impossible de commiter secrets accidentellement
- Documentation toujours avec placeholders

✅ **Onboarding simplifié**
- Templates `.template` montrent structure requise
- Commentaires explicites dans fichiers principaux
- Séparation claire public/privé

✅ **Audit et rotation**
- Secrets centralisés dans fichiers spécifiques
- Rotation = mise à jour `.user` file uniquement
- Historique git propre (pas de secrets à purger)

### Négatives

⚠️ **Configuration multi-fichiers**
- Développeurs doivent maintenir 2 fichiers par environnement
- Risque d'oubli de mise à jour `.user` file

⚠️ **Synchronisation manuelle**
- Pas de validation automatique `.env` ↔ `.user`
- Secrets manquants découverts au runtime

⚠️ **Migration existante**
- Déplacer secrets existants des fichiers principaux
- Mettre à jour documentation existante

---

## Implémentation

### Phase 1: Nettoyage immédiat ✅ (Fait)

- [x] Révoquer secret compromis
- [x] Générer nouveau secret
- [x] Nettoyer fichiers commités (placeholders)
- [x] Renforcer .gitignore

### Phase 2: Restructuration (En cours)

- [ ] Retirer tous secrets de `env/.env.dev` → commentaires redirection
- [ ] Retirer tous secrets de `env/.env.playground` → commentaires redirection
- [ ] Créer `env/.env.dev.user.template`
- [ ] Créer `env/.env.playground.user.template`
- [ ] Mettre à jour documentation avec nouvelle convention

### Phase 3: Prévention (Court terme)

- [ ] Pre-commit hook détection secrets (git-secrets)
- [ ] CI/CD secret scanning (TruffleHog/Gitleaks)
- [ ] Checklist code review incluant vérification secrets
- [ ] Documentation sécurité dans CONTRIBUTING.md

### Phase 4: Long terme (Optionnel)

- [ ] Migration vers Azure Key Vault
- [ ] Managed Identity pour tous services Azure
- [ ] Automated secret rotation via Azure DevOps
- [ ] Security training pour développeurs

---

## Structure des fichiers cible

```
env/
├── .env.dev                     # Commité - IDs publics, URLs, config
├── .env.dev.user                # Gitignoré - Secrets réels
├── .env.dev.user.template       # Commité - Template pour secrets
├── .env.playground              # Commité - IDs publics, URLs, config
├── .env.playground.user         # Gitignoré - Secrets réels
├── .env.playground.user.template # Commité - Template pour secrets
├── .env.local                   # Commité - IDs publics, URLs, config
└── .env.local.user              # Gitignoré - Secrets réels
```

---

## Checklist de sécurité pour commits

**Avant chaque commit, vérifier:**

- [ ] Aucun fichier `env/.env.*.user` dans staging
- [ ] Aucun secret visible dans fichiers `.env.{env}`
- [ ] Documentation utilise placeholders (`<YOUR_*>`)
- [ ] Nouveaux secrets ajoutés avec préfixe `SECRET_`
- [ ] Commentaires redirection vers `.user` présents
- [ ] Templates `.template` à jour si nouvelle variable

---

## Références

### Standards et conventions

- [M365 Agents Toolkit Environment Variables](https://learn.microsoft.com/microsoftteams/platform/toolkit/teamsfx-multi-env)
- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

### Outils recommandés

- **Pre-commit hooks:** [git-secrets](https://github.com/awslabs/git-secrets)
- **Secret scanning:** [TruffleHog](https://github.com/trufflesecurity/trufflehog), [Gitleaks](https://github.com/gitleaks/gitleaks)
- **Azure:** [Azure Key Vault](https://learn.microsoft.com/azure/key-vault/general/overview)

### Documentation interne

- [SECURITY-INCIDENT-2025-11-12.md](../SECURITY-INCIDENT-2025-11-12.md) - Incident qui a motivé cette ADR
- [.gitignore](.gitignore) - Patterns exclusion secrets
- [infra/README.md](infra/README.md) - Security best practices

---

## Historique des révisions

| Date | Version | Changements | Auteur |
|------|---------|-------------|--------|
| 2025-11-12 | 1.0 | Création initiale suite incident sécurité | GitHub Copilot |

---

**Statut:** ✅ ACCEPTÉ  
**Implémentation:** En cours (Phase 2)  
**Prochaine revue:** 1 mois après implémentation complète
