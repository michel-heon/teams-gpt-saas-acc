#!/bin/bash
# ============================================================================
# Script: Generate SQL Permissions Parameters from Environment
# ============================================================================
# Reads env/.env.dev and generates azure.parameters.sql-permissions.json
# This ensures no hardcoded values in deployment
#
# Usage:
#   ./infra/generate-sql-parameters.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$INFRA_DIR")"

# Charger les variables d'environnement depuis env/.env.dev
ENV_FILE="$PROJECT_ROOT/env/.env.dev"
if [ -f "$ENV_FILE" ]; then
  echo "🔧 Chargement des variables depuis $ENV_FILE..."
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
else
  echo "❌ Fichier $ENV_FILE introuvable"
  exit 1
fi

# Configuration
BOT_APP_SERVICE="bot${RESOURCE_SUFFIX}"
BOT_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP_NAME}"
SQL_SERVER=$(echo "$SAAS_DB_SERVER" | cut -d'.' -f1)

echo "📋 Récupération des informations Azure..."

# Récupérer l'identité managée du bot
echo "  - Bot Managed Identity Principal ID..."
BOT_PRINCIPAL_ID=$(az identity show \
  --name "$BOT_APP_SERVICE" \
  --resource-group "$BOT_RESOURCE_GROUP" \
  --query "principalId" \
  --output tsv)

if [ -z "$BOT_PRINCIPAL_ID" ]; then
  echo "❌ Impossible de récupérer le Principal ID du bot"
  exit 1
fi

echo "    ✓ Principal ID: $BOT_PRINCIPAL_ID"

# Récupérer les IPs sortantes du bot
echo "  - Bot Outbound IP Addresses..."
BOT_OUTBOUND_IPS=$(az webapp show \
  --name "$BOT_APP_SERVICE" \
  --resource-group "$BOT_RESOURCE_GROUP" \
  --query "outboundIpAddresses" \
  --output tsv)

if [ -z "$BOT_OUTBOUND_IPS" ]; then
  echo "❌ Impossible de récupérer les IPs sortantes du bot"
  exit 1
fi

echo "    ✓ IPs: $BOT_OUTBOUND_IPS"

# Générer le fichier de paramètres
OUTPUT_FILE="$INFRA_DIR/azure.parameters.sql-permissions.json"

echo ""
echo "📝 Génération du fichier $OUTPUT_FILE..."

cat > "$OUTPUT_FILE" <<EOF
{
  "\$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "sqlServerName": {
      "value": "$SQL_SERVER"
    },
    "botOutboundIpAddresses": {
      "value": "$BOT_OUTBOUND_IPS"
    },
    "botManagedIdentityPrincipalId": {
      "value": "$BOT_PRINCIPAL_ID"
    },
    "botManagedIdentityName": {
      "value": "$BOT_APP_SERVICE"
    }
  }
}
EOF

echo "✅ Fichier généré avec succès"
echo ""
echo "📋 Résumé:"
echo "  SQL Server: $SQL_SERVER"
echo "  Bot Identity: $BOT_APP_SERVICE"
echo "  Principal ID: $BOT_PRINCIPAL_ID"
echo "  IPs: $(echo $BOT_OUTBOUND_IPS | tr ',' '\n' | wc -l) addresses"
echo ""
echo "▶️  Prochaine étape: ./infra/deploy-sql-permissions.sh"
