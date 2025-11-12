#!/bin/bash
# ==============================================================================
# Script: scan-git-history-secrets.sh
# Description: Scan entire git history for exposed secrets
# Date: 2025-11-12
# Reference: SECURITY-INCIDENT-2025-11-12.md, ADR-004
# ==============================================================================

set -e

echo "=================================================="
echo "Git History Secret Scanner"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Patterns to search
declare -a PATTERNS=(
    # Azure Client Secrets (format: XXX~...)
    "[A-Za-z0-9._-]{1,}~[A-Za-z0-9._~-]{34,}"
    
    # Azure API Keys (64 chars base64-like)
    "[A-Za-z0-9]{64,}"
    
    # Generic secrets with = assignment
    "CLIENT_SECRET=[^<][A-Za-z0-9~._-]{20,}"
    "API_KEY=[^<][A-Za-z0-9]{32,}"
    "PASSWORD=[^<][A-Za-z0-9!@#$%^&*()_+-]{8,}"
    "SECRET=[^<][A-Za-z0-9~._-]{20,}"
    
    # Email addresses (potential PII)
    "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
)

# Files to exclude from search
EXCLUDE_PATTERNS="crypto_|SECRET_|template|votre_|<YOUR_|placeholder|example\.com|\.md$|\.txt$"

echo "🔍 Scanning patterns:"
for pattern in "${PATTERNS[@]}"; do
    echo "   - $pattern"
done
echo ""

# Create temp file for results
RESULTS_FILE=$(mktemp)

echo "📊 Scanning git history (this may take a while)..."
echo ""

# Scan each pattern
for pattern in "${PATTERNS[@]}"; do
    echo -e "${YELLOW}Checking pattern: $pattern${NC}"
    
    # Search in git log
    git log -p --all | grep -E "$pattern" | grep -v -E "$EXCLUDE_PATTERNS" >> "$RESULTS_FILE" 2>/dev/null || true
done

echo ""
echo "=================================================="
echo "Results Summary"
echo "=================================================="

# Count and display results
TOTAL_MATCHES=$(wc -l < "$RESULTS_FILE")

if [ "$TOTAL_MATCHES" -eq 0 ]; then
    echo -e "${GREEN}✅ No secrets found in git history!${NC}"
else
    echo -e "${RED}⚠️  Found $TOTAL_MATCHES potential secret matches${NC}"
    echo ""
    echo "Detailed results:"
    echo "=================================================="
    
    # Group by type
    echo ""
    echo "1. CLIENT_SECRET matches:"
    grep "CLIENT_SECRET" "$RESULTS_FILE" | head -5 || echo "   None"
    
    echo ""
    echo "2. API_KEY matches:"
    grep "API_KEY" "$RESULTS_FILE" | head -5 || echo "   None"
    
    echo ""
    echo "3. Azure Secret patterns (~...):"
    grep -E "~[A-Za-z0-9._~-]{34,}" "$RESULTS_FILE" | head -5 || echo "   None"
    
    echo ""
    echo "4. Email addresses:"
    grep -E "@" "$RESULTS_FILE" | grep -v "example.com" | head -5 || echo "   None"
fi

echo ""
echo "=================================================="
echo "Commits with potential secrets:"
echo "=================================================="

# Find commits containing known compromised secrets
echo ""
echo "1. Compromised CLIENT_SECRET (XNi8Q~...):"
git log --all --oneline -S "XNi8Q~OpiQPQbPTxEa6dIP2GYjcJ9RsA3ql4Bcyu" 2>/dev/null || echo "   Not found"

echo ""
echo "2. Compromised AZURE_OPENAI_API_KEY (EtHVdl...):"
git log --all --oneline -S "EtHVdlZJg3xA47vWHYcqZ4wwadBKdWs507cOEJJ4WXCNR1ddZfVqJQQJ99BAACREanaXJ3w3AAAAACOGCWSF" 2>/dev/null || echo "   Not found"

echo ""
echo "=================================================="
echo "Recommendations"
echo "=================================================="

if [ "$TOTAL_MATCHES" -gt 0 ]; then
    echo ""
    echo -e "${RED}⚠️  ACTION REQUIRED:${NC}"
    echo ""
    echo "1. Review all matches above"
    echo "2. Rotate any exposed credentials immediately"
    echo "3. Consider git history rewrite (git filter-repo)"
    echo "4. Enable GitHub Secret Scanning"
    echo "5. Implement pre-commit hooks (git-secrets)"
    echo ""
    echo "Reference:"
    echo "  - SECURITY-INCIDENT-2025-11-12.md"
    echo "  - doc/adr/004-secrets-management-strategy.md"
else
    echo ""
    echo -e "${GREEN}✅ Repository appears clean${NC}"
    echo ""
    echo "Continue monitoring:"
    echo "  - Enable GitHub Push Protection"
    echo "  - Implement pre-commit hooks"
    echo "  - Regular secret scanning in CI/CD"
fi

echo ""

# Cleanup
rm -f "$RESULTS_FILE"
