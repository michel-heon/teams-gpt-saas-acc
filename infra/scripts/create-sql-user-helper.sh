#!/bin/bash
# ============================================================================
# Script: Helper pour créer l'utilisateur SQL Managed Identity
# ============================================================================
# Ce script facilite l'exécution de 003-bot-managed-identity.sql
# en ouvrant automatiquement Azure Portal Query Editor avec instructions
#
# Usage:
#   ./infra/scripts/create-sql-user-helper.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$INFRA_DIR")"

# Charger les variables d'environnement
ENV_FILE="$PROJECT_ROOT/env/.env.dev"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

SQL_SCRIPT="$PROJECT_ROOT/db/migrations/003-bot-managed-identity.sql"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Création utilisateur SQL Managed Identity"
echo "════════════════════════════════════════════════════════════"
echo ""

# Vérifier que le script SQL existe
if [ ! -f "$SQL_SCRIPT" ]; then
  echo "❌ Fichier SQL introuvable: $SQL_SCRIPT"
  exit 1
fi

echo "📋 Configuration détectée:"
echo "  SQL Server:  ${SAAS_DB_SERVER}"
echo "  Database:    ${SAAS_DB_NAME}"
echo "  Bot Identity: bot${RESOURCE_SUFFIX}"
echo ""

# Construire l'URL Azure Portal
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID}"
RESOURCE_GROUP="rg-saasaccel-teams-gpt-02"
SQL_SERVER="sac-02-sql"
DATABASE="sac-02AMPSaaSDB"

PORTAL_URL="https://portal.azure.com/#view/Microsoft_Azure_Sql/DatabaseMenuBlade/~/QueryEditor/resourceId/%2Fsubscriptions%2F${SUBSCRIPTION_ID}%2FresourceGroups%2F${RESOURCE_GROUP}%2Fproviders%2FMicrosoft.Sql%2Fservers%2F${SQL_SERVER}%2Fdatabases%2F${DATABASE}"

echo "🔗 ÉTAPE 1: Ouvrir Azure Portal Query Editor"
echo ""
echo "URL générée (copiée dans le presse-papier si xclip/pbcopy disponible):"
echo "$PORTAL_URL"
echo ""

# Essayer de copier dans le presse-papier
if command -v xclip &> /dev/null; then
  echo "$PORTAL_URL" | xclip -selection clipboard
  echo "✅ URL copiée dans le presse-papier (Ctrl+V pour coller)"
elif command -v pbcopy &> /dev/null; then
  echo "$PORTAL_URL" | pbcopy
  echo "✅ URL copiée dans le presse-papier (Cmd+V pour coller)"
elif command -v xdg-open &> /dev/null; then
  read -p "Voulez-vous ouvrir automatiquement dans le navigateur? (y/N) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    xdg-open "$PORTAL_URL" 2>/dev/null || echo "⚠️  Impossible d'ouvrir automatiquement"
  fi
fi

echo ""
echo "📝 ÉTAPE 2: Copier le script SQL"
echo ""
echo "Le script SQL complet est ci-dessous. Copiez TOUT (du premier au dernier ---):"
echo ""
echo "════════════════════════════════════════════════════════════"
cat "$SQL_SCRIPT"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "✅ ÉTAPE 3: Dans Azure Portal Query Editor"
echo "   1. Authentifiez-vous avec Azure AD (heon@cotechnoe.net)"
echo "   2. Collez le script SQL dans l'éditeur"
echo "   3. Cliquez sur 'Run'"
echo "   4. Vérifiez les messages 'Successfully' dans les résultats"
echo ""

echo "⏱️  Temps estimé: 1-2 minutes"
echo ""

read -p "Appuyez sur Entrée quand c'est terminé pour continuer avec update-bot-config..."
echo ""

# Vérifier si on doit continuer
read -p "Voulez-vous exécuter 'make update-bot-config' maintenant? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Exécution de make update-bot-config..."
  cd "$INFRA_DIR"
  make update-bot-config
else
  echo "Pour continuer manuellement:"
  echo "  cd infra"
  echo "  make update-bot-config"
  echo "  make test-connection"
fi

echo ""
