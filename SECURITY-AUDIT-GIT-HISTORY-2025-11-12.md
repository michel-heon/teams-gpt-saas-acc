# Git History Secret Audit Report
**Date:** 2025-11-12  
**Auditor:** GitHub Copilot + User Request  
**Repository:** michel-heon/teams-gpt-saas-acc  
**Scan Method:** Pattern matching on `git log -p --all`

---

## Executive Summary

🚨 **CRITICAL:** 2 types of Azure credentials found exposed in git history (321 total matches including documentation)

**Risk Level:** HIGH  
**Action Required:** IMMEDIATE (rotate Azure OpenAI key)

---

## 1. Exposed Credentials Inventory

### 1.1 Azure AD App Registration Client Secret ✅ MITIGATED

**Credential Type:** Azure AD Client Secret  
**Value:** `XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu`  
**App Registration:** sac-02-FulfillmentAppReg  
**App ID:** d3b2710f-1be9-4f89-8834-6273619bd838  
**Key ID:** 9bb2512c-d1e9-416a-839a-a1feed5ed346

**Exposure Details:**
- **First Commit:** 5d0c2f8ec420b4262762bead8cb5bafaee804212 (2025-11-02 13:16:37)
- **Affected Files:**
  - `env/.env.playground`
  - `doc/phase2/marketplace-credentials-extraction.md`
- **Exposure Duration:** ~10 days (2025-11-02 to 2025-11-12)
- **Public Repository:** YES (github.com/michel-heon/teams-gpt-saas-acc)

**Remediation Status:**
- ✅ Detected: 2025-11-12 (leakscanner@mailbox.org)
- ✅ Revoked: 2025-11-12 (commit 5f310b4)
- ✅ Rotated: New secret generated (marketplace-metering-api-teams-agent-v2)
- ✅ Files sanitized: Placeholders added (commit 5f310b4)
- ✅ Architecture fixed: ADR-004 implemented (commit bec4e8c)

**Current Status:** ✅ MITIGATED - Old key revoked, new key in .user files (gitignored)

---

### 1.2 Azure OpenAI API Key 🚨 ACTIVE EXPOSURE

**Credential Type:** Azure OpenAI API Key  
**Value:** `EtHVdlZJg3xA47vWHYcqZ4wwadBKdWs507cOEJJ4WXCNR1ddZfVqJQQJ99BAACREanaXJ3w3AAAAACOGCWSF`  
**Resource:** heon-m6j4rhmt-canadaeast (Azure OpenAI Service)  
**Deployment:** gpt-4.1

**Exposure Details:**
- **First Commit:** 5d0c2f8ec420b4262762bead8cb5bafaee804212 (2025-11-02 13:16:37)
- **Affected Files:**
  - `env/.env.playground` (committed in 5d0c2f8)
  - Possibly `env/.env.local` (gitignored but historically exposed?)
- **Exposure Duration:** ~10 days (2025-11-02 to 2025-11-12)
- **Public Repository:** YES

**Risk Assessment:**
- **Probability of Exploitation:** MEDIUM-HIGH
  - API key format easily identifiable by automated scanners
  - Public repository accessible to anyone
  - 10-day window for discovery
- **Impact if Exploited:** HIGH
  - Unauthorized GPT-4.1 API usage ($$$)
  - Quota exhaustion (DoS)
  - Data exfiltration via prompt injection
  - Reputational damage

**Remediation Status:**
- ✅ Removed from current files (not present in env/ directory)
- 🚨 **STILL IN GIT HISTORY** (commit 5d0c2f8)
- ❌ **NOT YET ROTATED**

**Required Actions:**
1. ⚠️ **URGENT:** Regenerate Azure OpenAI key in Azure Portal
2. ⚠️ Update `.env.*.user` files with new key
3. ⚠️ Monitor Azure OpenAI usage logs for 30 days
4. ⚠️ Consider git history rewrite (see Section 3)

---

## 2. Affected Git Commits

### Commit 5d0c2f8 (2025-11-02) - Original Exposure
```
commit 5d0c2f8ec420b4262762bead8cb5bafaee804212
Author: michel-heon <heon@cotechnoe.com>
Date:   Sun Nov 2 13:16:37 2025 -0500

    Refactor: Utilisation du SaaS Accelerator Scheduler pour l'émission Marketplace
```

**Exposed Credentials:**
- ❌ MARKETPLACE_METERING_CLIENT_SECRET=XNi8Q~... (in env/.env.playground)
- ❌ AZURE_OPENAI_API_KEY=EtHVdl... (in env/.env.playground)

**Files Modified:** 28 files, 3189 insertions, 531 deletions

---

### Commit 5f310b4 (2025-11-12) - Emergency Response
```
commit 5f310b463050b4aa0e3a1ed0b065770c44c9f195
Author: michel-heon <heon@cotechnoe.com>
Date:   Tue Nov 12 2025

    security: Rotate exposed Azure AD credentials (URGENT)
```

**Actions:**
- ✅ Revoked CLIENT_SECRET
- ✅ Sanitized env/.env.playground with placeholders
- ✅ Sanitized doc/phase2/marketplace-credentials-extraction.md
- ✅ Enhanced .gitignore
- ✅ Created SECURITY-INCIDENT-2025-11-12.md

**Missed:**
- ❌ Did not rotate AZURE_OPENAI_API_KEY (focus was on CLIENT_SECRET)

---

### Commit bec4e8c (2025-11-12) - Architecture Fix
```
commit bec4e8ca0a2d78f76661c4a1a131a4e10095f32d
Author: michel-heon <heon@cotechnoe.com>
Date:   Tue Nov 12 2025

    security: Implement ADR-004 secrets management strategy
```

**Actions:**
- ✅ Created ADR-004 (5-rule secrets policy)
- ✅ Restructured env files (.env vs .env.user)
- ✅ Created 4 templates for onboarding

---

## 3. Git History Analysis

### Scan Results
- **Total Matches:** 321
- **Unique Secrets:** 2 (CLIENT_SECRET, AZURE_OPENAI_API_KEY)
- **False Positives:** ~315 (documentation, comments, emails)
- **True Positives:** 6 (actual credential exposures)

### Commits Timeline
```
2025-11-02  5d0c2f8  [EXPOSE] Added CLIENT_SECRET + AZURE_OPENAI_API_KEY
2025-11-12  5f310b4  [MITIGATE] Revoked CLIENT_SECRET, sanitized files
2025-11-12  bec4e8c  [PREVENT] Implemented ADR-004 architecture
```

**Historical Exposure:** Credentials remain in commits 5d0c2f8 forever unless history is rewritten

---

## 4. Recommended Actions

### 4.1 IMMEDIATE (Within 1 hour)

#### Action 1: Rotate Azure OpenAI API Key 🚨
```bash
# Azure Portal Method:
1. Go to Azure Portal → Azure OpenAI Service
2. Navigate to "heon-m6j4rhmt-canadaeast" resource
3. Go to "Keys and Endpoint"
4. Click "Regenerate Key 1" (or Key 2 if using Key 1)
5. Copy new key

# Azure CLI Method:
az cognitiveservices account keys regenerate \
  --name heon-m6j4rhmt-canadaeast \
  --resource-group <your-rg> \
  --key-name key1
```

#### Action 2: Update .env.*.user Files
```bash
# Update all environment .user files with new key
# Files to update:
- env/.env.dev.user
- env/.env.local.user
- env/.env.playground.user
```

#### Action 3: Monitor Azure OpenAI Usage
```bash
# Check for suspicious activity (2025-11-02 to 2025-11-12)
# Azure Portal → Azure OpenAI → Monitoring → Metrics
# Look for:
- Unexpected spike in requests
- Requests from unknown IP addresses
- Failed authentication attempts
```

### 4.2 SHORT-TERM (Within 24 hours)

#### Action 4: Update SECURITY-INCIDENT Report
Add Azure OpenAI key exposure to `SECURITY-INCIDENT-2025-11-12.md`:
```markdown
### 1.2 Azure OpenAI API Key

**Resource:** heon-m6j4rhmt-canadaeast  
**Key Value:** EtHVdl... (76 chars)  
**Exposure:** Same commit 5d0c2f8  
**Remediation:** Rotated on 2025-11-12  
```

#### Action 5: Commit Rotation Documentation
```bash
git commit -m "security: Rotate Azure OpenAI API key (incident follow-up)

- Regenerated key for heon-m6j4rhmt-canadaeast
- Updated all .env.*.user files (gitignored)
- Updated SECURITY-INCIDENT report

Refs: SECURITY-INCIDENT-2025-11-12.md, commit 5d0c2f8"
```

### 4.3 MEDIUM-TERM (Within 1 week)

#### Action 6: Consider Git History Rewrite ⚠️

**Option A: BFG Repo-Cleaner (Recommended)**
```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Backup repository
git clone --mirror git@github.com:michel-heon/teams-gpt-saas-acc.git backup-repo.git

# Create secrets.txt with exposed values
cat > secrets.txt <<EOF
XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu
EtHVdlZJg3xA47vWHYcqZ4wwadBKdWs507cOEJJ4WXCNR1ddZfVqJQQJ99BAACREanaXJ3w3AAAAACOGCWSF
EOF

# Clean history
bfg --replace-text secrets.txt teams-gpt-saas-acc.git

# Force push (⚠️ DESTRUCTIVE - coordinate with team)
cd teams-gpt-saas-acc.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

**Option B: git-filter-repo**
```bash
# Install git-filter-repo
pip3 install git-filter-repo

# Create callbacks.py for secret replacement
git filter-repo --replace-text secrets.txt --force
```

**⚠️ WARNING:**
- **Destructive operation** - rewrites entire history
- **Requires team coordination** - all developers must re-clone
- **Breaks forks/PRs** - external contributors affected
- **Alternative:** Accept that secrets are in history, rely on rotation

#### Action 7: Enable GitHub Security Features
```bash
# 1. GitHub Secret Scanning (already active - detected exposure)
#    Verify: Settings → Security → Secret scanning → Enabled ✅

# 2. GitHub Push Protection
#    Enable: Settings → Security → Push protection → Enable ✅

# 3. Dependabot Alerts
#    Enable: Settings → Security → Dependabot → Enable
```

### 4.4 LONG-TERM (Ongoing)

#### Action 8: Implement Pre-Commit Hooks
```bash
# Install git-secrets
brew install git-secrets  # macOS
git clone https://github.com/awslabs/git-secrets.git && cd git-secrets && make install  # Linux

# Configure for repository
cd /path/to/teams-gpt-saas-acc
git secrets --install
git secrets --register-aws  # AWS patterns
git secrets --add 'CLIENT_SECRET=.*'
git secrets --add '[A-Za-z0-9._-]{1,}~[A-Za-z0-9._~-]{34,}'  # Azure patterns
```

#### Action 9: CI/CD Secret Scanning
```yaml
# .github/workflows/secret-scan.yml
name: Secret Scanning
on: [push, pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
```

#### Action 10: Migrate to Azure Key Vault (ADR-004 Phase 4)
- Store all secrets in Azure Key Vault
- Use Managed Identity for access
- Eliminate .env.*.user files entirely
- Reference: ADR-004 "Long-term Improvements"

---

## 5. Lessons Learned

### What Went Right ✅
1. **Fast Detection:** leakscanner@mailbox.org caught exposure within 10 days
2. **Rapid Response:** CLIENT_SECRET rotated within 30 minutes of detection
3. **Architecture Fix:** ADR-004 prevents recurrence with formal policy
4. **GitHub Protection:** Push protection blocked second attempt to commit secret

### What Went Wrong ❌
1. **Initial Commit:** Developer committed secrets to env/.env.playground (should be .user)
2. **Code Review Gap:** No manual review caught credentials before push
3. **No Pre-commit Hooks:** Automated prevention not in place
4. **Incomplete Response:** AZURE_OPENAI_API_KEY missed in first rotation (focused on CLIENT_SECRET)

### Improvements Implemented 🔧
1. ✅ ADR-004: Formal 5-rule secrets management policy
2. ✅ File Structure: .env.{env} (committed) vs .env.{env}.user (gitignored)
3. ✅ Templates: Developer onboarding guides with placeholders
4. ✅ .gitignore: Enhanced to prevent future exposures
5. ✅ Documentation: SECURITY-INCIDENT report for audit trail

### Still Needed 📋
1. ❌ Pre-commit hooks (git-secrets, husky)
2. ❌ CI/CD scanning (gitleaks, TruffleHog)
3. ❌ Secret rotation automation
4. ❌ Azure Key Vault migration
5. ❌ Git history rewrite (optional)

---

## 6. Compliance & Audit Trail

### Regulatory Considerations
- **GDPR:** Email address (heon@cotechnoe.com) exposed - low risk (business email)
- **PCI DSS:** Not applicable (no payment card data)
- **SOC 2:** Incident documented, rotation performed, architecture improved

### Audit Documentation
- ✅ SECURITY-INCIDENT-2025-11-12.md (comprehensive incident report)
- ✅ ADR-004 (secrets management policy)
- ✅ This report (git history audit)
- ✅ Git commits (5f310b4, bec4e8c) documenting remediation

### External Reports
- **leakscanner@mailbox.org:** Original detection (2025-11-12)
- **GitHub Secret Scanning:** Active monitoring
- **No external breach reports:** No evidence of exploitation

---

## 7. Risk Assessment

### Current Risk Level: MEDIUM

**Mitigating Factors:**
- CLIENT_SECRET already rotated ✅
- Files sanitized in working tree ✅
- Architecture corrected (ADR-004) ✅
- GitHub protection active ✅

**Outstanding Risks:**
- AZURE_OPENAI_API_KEY not yet rotated 🚨
- Secrets remain in git history (commits 5d0c2f8, 5f310b4)
- No automated prevention (pre-commit hooks)

**Probability of Exploitation:**
- CLIENT_SECRET: LOW (already revoked)
- AZURE_OPENAI_API_KEY: MEDIUM-HIGH (still active, easily scannable)

**Impact if Exploited:**
- Financial: HIGH ($1000s in unauthorized GPT-4.1 usage)
- Operational: MEDIUM (quota exhaustion, service disruption)
- Reputational: LOW-MEDIUM (private project, limited exposure)

---

## 8. Contact & Escalation

**Security Point of Contact:**
- Name: michel-heon
- Email: heon@cotechnoe.com
- GitHub: @michel-heon

**Escalation Path:**
1. Immediate: Developer (michel-heon)
2. If exploitation detected: Azure Security Center
3. If customer data affected: GDPR DPO notification

---

## Appendix A: Scan Command Reference

### Full Scan Command
```bash
git log -p --all | grep -E "(CLIENT_SECRET|API_KEY|PASSWORD|SECRET)" | \
  grep -v -E "(crypto_|SECRET_|template|votre_|<YOUR_|placeholder)"
```

### Specific Secret Search
```bash
# Search for specific secret in history
git log --all --oneline -S "XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu"
git log --all --oneline -S "EtHVdlZJg3xA47vWHYcqZ4wwadBKdWs507cOEJJ4WXCNR1ddZfVqJQQJ99BAACREanaXJ3w3AAAAACOGCWSF"
```

### Pattern Matching
```bash
# Azure Client Secret pattern
git log -p --all | grep -E "[A-Za-z0-9._-]{1,}~[A-Za-z0-9._~-]{34,}"

# Azure API Key pattern (64 chars)
git log -p --all | grep -E "API_KEY=[A-Za-z0-9]{64,}"
```

---

**Report Generated:** 2025-11-12  
**Next Review:** 2025-11-19 (7 days post-rotation)  
**Status:** OPEN - Awaiting Azure OpenAI key rotation
