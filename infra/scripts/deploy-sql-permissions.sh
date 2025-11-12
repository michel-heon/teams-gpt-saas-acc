#!/bin/bash
# ============================================================================
# Deployment Script: Configure SQL Firewall and Prepare Managed Identity
# ============================================================================
# This script deploys the sql-permissions.bicep file to configure Azure SQL
# firewall rules for the Bot App Service
#
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Contributor or Owner role on rg-saasaccel-teams-gpt-02
#
# Usage:
#   ./infra/deploy-sql-permissions.sh
#
# Related files:
#   - infra/sql-permissions.bicep
#   - infra/azure.parameters.sql-permissions.json
#   - db/migrations/003-bot-managed-identity.sql (execute after this script)
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
RESOURCE_GROUP="${SAAS_RESOURCE_GROUP}"
TEMPLATE_FILE="$INFRA_DIR/sql-permissions.bicep"
PARAMETERS_FILE="$INFRA_DIR/azure.parameters.sql-permissions.json"
DEPLOYMENT_NAME="sql-permissions-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SQL Permissions Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verify Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    echo "Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
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

# Verify resource group exists
echo -e "${YELLOW}Verifying resource group exists...${NC}"
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${RED}Error: Resource group '$RESOURCE_GROUP' not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Resource group found${NC}"
echo ""

# Verify template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
    exit 1
fi

# Verify parameters file exists
if [ ! -f "$PARAMETERS_FILE" ]; then
    echo -e "${RED}Error: Parameters file not found: $PARAMETERS_FILE${NC}"
    exit 1
fi

# Display deployment details
echo -e "${BLUE}Deployment Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Template File:  $TEMPLATE_FILE"
echo "  Parameters:     $PARAMETERS_FILE"
echo "  Deployment:     $DEPLOYMENT_NAME"
echo ""

# Validate template
echo -e "${YELLOW}Validating Bicep template...${NC}"
if az deployment group validate \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$TEMPLATE_FILE" \
    --parameters "@$PARAMETERS_FILE" \
    --output none; then
    echo -e "${GREEN}✓ Template validation successful${NC}"
else
    echo -e "${RED}✗ Template validation failed${NC}"
    exit 1
fi
echo ""

# Prompt for confirmation
echo -e "${YELLOW}This deployment will:${NC}"
echo "  1. Add firewall rules for Bot outbound IPs"
echo "  2. Ensure Azure Services access is enabled"
echo ""
read -p "Continue with deployment? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Deploy
echo -e "${BLUE}Starting deployment...${NC}"
if az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$TEMPLATE_FILE" \
    --parameters "@$PARAMETERS_FILE" \
    --name "$DEPLOYMENT_NAME" \
    --output json > /tmp/deployment-output.json; then
    
    echo -e "${GREEN}✓ Deployment successful${NC}"
    echo ""
    
    # Display outputs
    echo -e "${BLUE}Deployment Outputs:${NC}"
    cat /tmp/deployment-output.json | jq -r '.properties.outputs | to_entries[] | "  \(.key): \(.value.value)"'
    echo ""
    
    # Display next steps
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Next Steps:${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}1. Execute SQL migration to create Managed Identity user:${NC}"
    echo "   sqlcmd -S sac-02-sql.database.windows.net -d sac-02AMPSaaSDB -G -U heon@cotechnoe.net -i db/migrations/003-bot-managed-identity.sql"
    echo ""
    echo -e "${YELLOW}2. Update Bot App Service environment variables (Task #3):${NC}"
    echo "   az webapp config appsettings set --name bot997b9c --resource-group rg-saas-test --settings \\"
    echo "     SAAS_DB_SERVER=sac-02-sql.database.windows.net \\"
    echo "     SAAS_DB_NAME=sac-02AMPSaaSDB \\"
    echo "     SAAS_DB_USE_MANAGED_IDENTITY=true \\"
    echo "     SAAS_ENABLE_SUBSCRIPTION_CHECK=true \\"
    echo "     SAAS_DEBUG_MODE=true \\"
    echo "     SAAS_PERMISSIVE_MODE=false"
    echo ""
    echo -e "${YELLOW}3. Test the connection (Task #4):${NC}"
    echo "   Restart the bot and check Application Insights logs"
    echo ""
    
else
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "Check deployment logs:"
    echo "  az deployment group show --resource-group $RESOURCE_GROUP --name $DEPLOYMENT_NAME"
    exit 1
fi
