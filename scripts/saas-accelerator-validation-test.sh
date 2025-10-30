#!/bin/bash

################################################################################
# Script de test automatisé - Validation SaaS Accelerator
# Nom: saas-accelerator-validation-test.sh
# Phase: 1.4 - Test de l'infrastructure
# Description: Vérifie que tous les composants SaaS Accelerator sont déployés
#              et opérationnels (App Services, SQL, Key Vault, Webhook)
################################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Chemin du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Charger les variables d'environnement depuis ./env/.env.dev
ENV_FILE="$PROJECT_ROOT/env/.env.dev"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Erreur: Fichier env/.env.dev introuvable${NC}"
    echo "Attendu: $ENV_FILE"
    exit 1
fi

# Charger les variables en supprimant les commentaires et lignes vides
while IFS= read -r line || [ -n "$line" ]; do
    # Ignorer les commentaires et lignes vides
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        continue
    fi
    # Exporter la variable
    export "$line"
done < "$ENV_FILE"

# Configuration (chargée depuis ./env/.env.dev)
RESOURCE_GROUP="${SAAS_RESOURCE_GROUP}"
PORTAL_NAME="${SAAS_PORTAL_NAME}"
ADMIN_NAME="${SAAS_ADMIN_NAME}"
SQL_SERVER="${SAAS_SQL_SERVER}"
DB_NAME="${SAAS_DB_NAME}"
LOCATION="${SAAS_LOCATION}"

# URLs
PORTAL_URL="${SAAS_PORTAL_URL}"
ADMIN_URL="${SAAS_ADMIN_URL}"
WEBHOOK_URL="${SAAS_WEBHOOK_URL}"

# Vérifier que les variables essentielles sont chargées
if [ -z "$RESOURCE_GROUP" ] || [ -z "$PORTAL_NAME" ] || [ -z "$ADMIN_NAME" ]; then
    echo -e "${RED}❌ Erreur: Variables manquantes dans env/.env.dev${NC}"
    echo "Vérifiez que SAAS_RESOURCE_GROUP, SAAS_PORTAL_NAME et SAAS_ADMIN_NAME sont définis"
    exit 1
fi

# Compteurs
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

################################################################################
# Fonctions utilitaires
################################################################################

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_test() {
    echo -e "${YELLOW}▶ Test $TESTS_TOTAL: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

test_result() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if [ $1 -eq 0 ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        print_success "$2"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        print_error "$2"
    fi
}

################################################################################
# Tests
################################################################################

print_header "Tests d'infrastructure SaaS Accelerator - Phase 1.4"
echo "Date: $(date)"
echo "Configuration chargée depuis: env/.env.dev"
echo "Groupe de ressources: $RESOURCE_GROUP"
echo "Région: $LOCATION"
echo ""

# Test 1: Vérifier que le groupe de ressources existe
print_test "Vérifier l'existence du groupe de ressources"
if az group show --name "$RESOURCE_GROUP" --query "name" -o tsv &>/dev/null; then
    RG_STATE=$(az group show --name "$RESOURCE_GROUP" --query "properties.provisioningState" -o tsv)
    if [ "$RG_STATE" = "Succeeded" ]; then
        test_result 0 "Groupe de ressources '$RESOURCE_GROUP' existe et est provisionné"
    else
        test_result 1 "Groupe de ressources existe mais état: $RG_STATE"
    fi
else
    test_result 1 "Groupe de ressources '$RESOURCE_GROUP' introuvable"
    exit 1
fi

# Test 2: Compter les ressources déployées
print_test "Vérifier les ressources déployées"
RESOURCE_COUNT=$(az resource list --resource-group "$RESOURCE_GROUP" --query "length(@)" -o tsv)
if [ "$RESOURCE_COUNT" -ge 10 ]; then
    test_result 0 "Nombre de ressources déployées: $RESOURCE_COUNT"
    print_info "Liste des ressources principales:"
    az resource list --resource-group "$RESOURCE_GROUP" \
        --query "[?type=='Microsoft.Web/sites' || type=='Microsoft.Sql/servers' || type=='Microsoft.Sql/servers/databases' || type=='Microsoft.KeyVault/vaults'].{Name:name, Type:type}" \
        -o table
else
    test_result 1 "Nombre insuffisant de ressources: $RESOURCE_COUNT (attendu: >= 10)"
fi

# Test 3: Vérifier l'état de l'App Service (Portal)
print_test "Vérifier l'état de l'App Service Portal"
PORTAL_STATE=$(az webapp show --name "$PORTAL_NAME" --resource-group "$RESOURCE_GROUP" --query "state" -o tsv 2>/dev/null)
if [ "$PORTAL_STATE" = "Running" ]; then
    test_result 0 "App Service '$PORTAL_NAME' est en cours d'exécution"
else
    test_result 1 "App Service '$PORTAL_NAME' état: $PORTAL_STATE"
fi

# Test 4: Vérifier l'état de l'App Service (Admin)
print_test "Vérifier l'état de l'App Service Admin"
ADMIN_STATE=$(az webapp show --name "$ADMIN_NAME" --resource-group "$RESOURCE_GROUP" --query "state" -o tsv 2>/dev/null)
if [ "$ADMIN_STATE" = "Running" ]; then
    test_result 0 "App Service '$ADMIN_NAME' est en cours d'exécution"
else
    test_result 1 "App Service '$ADMIN_NAME' état: $ADMIN_STATE"
fi

# Test 5: Vérifier l'accessibilité du portail principal
print_test "Tester l'accessibilité du portail principal"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "$PORTAL_URL" --max-time 30)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    test_result 0 "Portail principal accessible (HTTP $HTTP_CODE)"
else
    test_result 1 "Portail principal non accessible (HTTP $HTTP_CODE)"
fi

# Test 6: Vérifier l'accessibilité du webhook
print_test "Tester l'accessibilité du webhook endpoint"
WEBHOOK_CODE=$(curl -s -o /dev/null -w "%{http_code}" -I "$WEBHOOK_URL" --max-time 30)
# 415 = Unsupported Media Type (normal, le endpoint attend du JSON POST)
# 401 = Unauthorized (normal, pas de token)
# 405 = Method Not Allowed (normal, on fait un HEAD au lieu de POST)
if [ "$WEBHOOK_CODE" = "415" ] || [ "$WEBHOOK_CODE" = "401" ] || [ "$WEBHOOK_CODE" = "405" ]; then
    test_result 0 "Webhook endpoint accessible et fonctionnel (HTTP $WEBHOOK_CODE)"
    print_info "Code $WEBHOOK_CODE est normal (endpoint attend POST avec JSON de Marketplace)"
elif [ "$WEBHOOK_CODE" = "200" ]; then
    test_result 0 "Webhook endpoint accessible (HTTP $WEBHOOK_CODE)"
else
    test_result 1 "Webhook endpoint problématique (HTTP $WEBHOOK_CODE)"
fi

# Test 7: Vérifier l'accessibilité du portail admin
print_test "Tester l'accessibilité du portail admin"
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "$ADMIN_URL" --max-time 30)
if [ "$ADMIN_CODE" = "200" ] || [ "$ADMIN_CODE" = "302" ]; then
    test_result 0 "Portail admin accessible (HTTP $ADMIN_CODE)"
    if [ "$ADMIN_CODE" = "302" ]; then
        print_info "Redirection vers la page de connexion (comportement attendu)"
    fi
else
    test_result 1 "Portail admin non accessible (HTTP $ADMIN_CODE)"
fi

# Test 8: Vérifier l'état de la base de données SQL
print_test "Vérifier l'état de la base de données SQL"
DB_STATUS=$(az sql db show --name "$DB_NAME" --server "$SQL_SERVER" --resource-group "$RESOURCE_GROUP" --query "status" -o tsv 2>/dev/null)
if [ "$DB_STATUS" = "Online" ]; then
    test_result 0 "Base de données '$DB_NAME' est en ligne"
    DB_EDITION=$(az sql db show --name "$DB_NAME" --server "$SQL_SERVER" --resource-group "$RESOURCE_GROUP" --query "edition" -o tsv)
    DB_SIZE=$(az sql db show --name "$DB_NAME" --server "$SQL_SERVER" --resource-group "$RESOURCE_GROUP" --query "maxSizeBytes" -o tsv)
    DB_SIZE_GB=$((DB_SIZE / 1024 / 1024 / 1024))
    print_info "Édition: $DB_EDITION, Taille max: ${DB_SIZE_GB} Go"
else
    test_result 1 "Base de données '$DB_NAME' état: $DB_STATUS"
fi

# Test 9: Vérifier le Key Vault
print_test "Vérifier l'existence du Key Vault"
KV_NAME=$(az keyvault list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null)
if [ -n "$KV_NAME" ]; then
    test_result 0 "Key Vault '$KV_NAME' existe"
else
    test_result 1 "Key Vault introuvable dans le groupe de ressources"
fi

# Test 10: Vérifier le Virtual Network
print_test "Vérifier l'existence du Virtual Network"
VNET_NAME=$(az network vnet list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null)
if [ -n "$VNET_NAME" ]; then
    test_result 0 "Virtual Network '$VNET_NAME' existe"
else
    test_result 1 "Virtual Network introuvable dans le groupe de ressources"
fi

# Test 11: Vérifier les Private Endpoints
print_test "Vérifier les Private Endpoints"
PE_COUNT=$(az network private-endpoint list --resource-group "$RESOURCE_GROUP" --query "length(@)" -o tsv 2>/dev/null)
if [ "$PE_COUNT" -ge 2 ]; then
    test_result 0 "Private Endpoints configurés: $PE_COUNT"
    print_info "Private Endpoints trouvés:"
    az network private-endpoint list --resource-group "$RESOURCE_GROUP" --query "[].{Name:name, Location:location}" -o table
else
    test_result 1 "Private Endpoints insuffisants: $PE_COUNT (attendu: >= 2)"
fi

# Test 12: Vérifier la configuration HTTPS des App Services
print_test "Vérifier la configuration HTTPS"
HTTPS_PORTAL=$(az webapp show --name "$PORTAL_NAME" --resource-group "$RESOURCE_GROUP" --query "httpsOnly" -o tsv)
HTTPS_ADMIN=$(az webapp show --name "$ADMIN_NAME" --resource-group "$RESOURCE_GROUP" --query "httpsOnly" -o tsv)
if [ "$HTTPS_PORTAL" = "true" ] && [ "$HTTPS_ADMIN" = "true" ]; then
    test_result 0 "HTTPS activé sur les deux App Services"
else
    test_result 1 "HTTPS non activé sur tous les App Services (Portal: $HTTPS_PORTAL, Admin: $HTTPS_ADMIN)"
fi

################################################################################
# Résumé
################################################################################

print_header "Résumé des tests"

echo "Total de tests exécutés: $TESTS_TOTAL"
echo -e "${GREEN}Tests réussis: $TESTS_PASSED${NC}"
echo -e "${RED}Tests échoués: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    print_success "🎉 Tous les tests sont passés avec succès!"
    echo ""
    print_info "Infrastructure SaaS Accelerator est opérationnelle"
    print_info "Vous pouvez passer à la Phase 2 (Intégration Teams)"
    echo ""
    print_info "URLs importantes:"
    echo "  - Portail principal: $PORTAL_URL"
    echo "  - Portail admin: $ADMIN_URL"
    echo "  - Webhook: $WEBHOOK_URL"
    echo ""
    exit 0
else
    echo ""
    print_error "⚠️  Certains tests ont échoué"
    echo ""
    print_info "Actions recommandées:"
    echo "  1. Vérifier les logs dans Azure Portal"
    echo "  2. Redémarrer les App Services si nécessaire"
    echo "  3. Vérifier la configuration des services"
    echo ""
    exit 1
fi
