#!/bin/bash
# ============================================================================
# Script: Update Bot App Service Configuration (Environment Variables)
# ============================================================================
# Adds SaaS database connection variables to Bot App Service
#
# GAP Resolution: GAP #2 - Configure environment variables for SQL connection
#
# Prerequisites:
#   - infra/deploy-sql-permissions.sh executed successfully
#   - db/migrations/003-bot-managed-identity.sql executed successfully
#
# Usage:
#   ./infra/update-bot-app-settings.sh
# ============================================================================

set -e  # Exit on error

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

# Configuration depuis les variables d'environnement
BOT_APP_SERVICE="bot${RESOURCE_SUFFIX}"
BOT_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Bot App Service Configuration Update${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verify Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    exit 1
fi

# Verify authentication
echo -e "${YELLOW}Verifying Azure authentication...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with Azure${NC}"
    echo "Run: az login"
    exit 1
fi

CURRENT_ACCOUNT=$(az account show --query name -o tsv)
echo -e "${GREEN}✓ Authenticated as: $CURRENT_ACCOUNT${NC}"
echo ""

# Verify App Service exists
echo -e "${YELLOW}Verifying Bot App Service exists...${NC}"
if ! az webapp show --name "$BOT_APP_SERVICE" --resource-group "$BOT_RESOURCE_GROUP" &> /dev/null; then
    echo -e "${RED}Error: App Service '$BOT_APP_SERVICE' not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ App Service found${NC}"
echo ""

# Display current SAAS-related settings
echo -e "${BLUE}Current SAAS-related App Settings:${NC}"
az webapp config appsettings list \
    --name "$BOT_APP_SERVICE" \
    --resource-group "$BOT_RESOURCE_GROUP" \
    --query "[?contains(name, 'SAAS')].{Name:name, Value:value}" \
    --output table
echo ""

# Prompt for confirmation
echo -e "${YELLOW}This script will add/update the following settings:${NC}"
cat <<EOF
  SAAS_DB_SERVER=${SAAS_DB_SERVER}
  SAAS_DB_NAME=${SAAS_DB_NAME}
  SAAS_DB_USE_MANAGED_IDENTITY=${SAAS_DB_USE_MANAGED_IDENTITY}
  SAAS_ENABLE_SUBSCRIPTION_CHECK=${SAAS_ENABLE_SUBSCRIPTION_CHECK}
  SAAS_DEBUG_MODE=${SAAS_DEBUG_MODE}
  SAAS_PERMISSIVE_MODE=${SAAS_PERMISSIVE_MODE}
  SAAS_ENABLE_USAGE_TRACKING=${SAAS_ENABLE_USAGE_TRACKING:-false}
  SAAS_BLOCK_NO_SUBSCRIPTION=${SAAS_BLOCK_NO_SUBSCRIPTION:-false}
EOF
echo ""
read -p "Continue with update? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Update cancelled${NC}"
    exit 0
fi

# Update App Settings
echo -e "${BLUE}Updating App Settings...${NC}"
if az webapp config appsettings set \
    --name "$BOT_APP_SERVICE" \
    --resource-group "$BOT_RESOURCE_GROUP" \
    --settings \
        SAAS_DB_SERVER="$SAAS_DB_SERVER" \
        SAAS_DB_NAME="$SAAS_DB_NAME" \
        SAAS_DB_USE_MANAGED_IDENTITY="$SAAS_DB_USE_MANAGED_IDENTITY" \
        SAAS_ENABLE_SUBSCRIPTION_CHECK="$SAAS_ENABLE_SUBSCRIPTION_CHECK" \
        SAAS_DEBUG_MODE="$SAAS_DEBUG_MODE" \
        SAAS_PERMISSIVE_MODE="$SAAS_PERMISSIVE_MODE" \
        SAAS_ENABLE_USAGE_TRACKING="${SAAS_ENABLE_USAGE_TRACKING:-false}" \
        SAAS_BLOCK_NO_SUBSCRIPTION="${SAAS_BLOCK_NO_SUBSCRIPTION:-false}" \
    --output none; then
    
    echo -e "${GREEN}✓ App Settings updated successfully${NC}"
else
    echo -e "${RED}✗ Failed to update App Settings${NC}"
    exit 1
fi
echo ""

# Display updated settings
echo -e "${BLUE}Updated SAAS-related App Settings:${NC}"
az webapp config appsettings list \
    --name "$BOT_APP_SERVICE" \
    --resource-group "$BOT_RESOURCE_GROUP" \
    --query "[?contains(name, 'SAAS')].{Name:name, Value:value}" \
    --output table
echo ""

# Restart App Service
echo -e "${YELLOW}Restarting App Service to apply changes...${NC}"
read -p "Restart now? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if az webapp restart \
        --name "$BOT_APP_SERVICE" \
        --resource-group "$BOT_RESOURCE_GROUP" \
        --output none; then
        echo -e "${GREEN}✓ App Service restarted${NC}"
    else
        echo -e "${RED}✗ Failed to restart App Service${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ App Service NOT restarted - changes will apply on next restart${NC}"
fi
echo ""

# Display next steps
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Configuration Update Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Monitor Application Insights logs for connection status"
echo "2. Test connection via bot message (if SAAS_DEBUG_MODE=true)"
echo "3. Check logs for: 'Successfully connected to SaaS Accelerator database'"
echo ""
echo -e "${BLUE}View logs:${NC}"
echo "  az webapp log tail --name $BOT_APP_SERVICE --resource-group $BOT_RESOURCE_GROUP"
echo ""
