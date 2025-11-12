# ============================================================================
# Makefile: Phase 1 - Configuration Bot → SaaS Accelerator
# ============================================================================
# Simplifie l'exécution des scripts de déploiement pour Issue #11 Phase 1
#
# Usage:
#   make help              # Afficher l'aide
#   make phase1            # Exécuter toute la Phase 1 (étapes 1-4)
#   make deploy-firewall   # Étape 1 uniquement
#   make create-sql-user   # Étape 2 uniquement

# Shell configuration
SHELL := /bin/bash
AZ := $(shell which az 2>/dev/null || echo /usr/bin/az)
#   make update-bot-config # Étape 3 uniquement
#   make test-connection   # Étape 4 uniquement
# ============================================================================

.PHONY: help phase1 generate-params deploy-firewall create-sql-user update-bot-config test-connection check-azure check-env status clean

# Variables chargées depuis env/.env.dev
# Note: Le Makefile utilise les scripts qui chargent automatiquement env/.env.dev
# Pas besoin de définir BOT_NAME, SQL_SERVER, etc. ici

# ============================================================================
# Cibles principales
# ============================================================================

help: ## Afficher l'aide
	@echo "════════════════════════════════════════════════════════════"
	@echo "  Phase 1 - Configuration Bot → SaaS Accelerator (Issue #11)"
	@echo "════════════════════════════════════════════════════════════"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "Séquence complète:"
	@echo "  1. make check-azure         # Vérifier authentification Azure"
	@echo "  2. make phase1              # Exécuter Phase 1 complète"
	@echo "  3. make status              # Vérifier état final"

phase1: check-env check-azure generate-params deploy-firewall create-sql-user update-bot-config test-connection ## Exécuter toute la Phase 1
	@echo ""
	@echo "════════════════════════════════════════════════════════════"
	@echo "  ✓ Phase 1 complétée avec succès"
	@echo "════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Prochaines étapes:"
	@echo "  - Vérifier les logs du bot: make logs"
	@echo "  - Voir le statut: make status"
	@echo "  - Passer à la Phase 2 (OAuth Teams)"

check-env: ## Vérifier que le fichier env/.env.dev existe
	@echo "Vérification du fichier de configuration..."
	@if [ ! -f ../env/.env.dev ]; then \
		echo "✗ Fichier env/.env.dev introuvable"; \
		exit 1; \
	fi
	@echo "✓ Fichier env/.env.dev trouvé"

generate-params: check-env ## Générer azure.parameters.sql-permissions.json depuis env/.env.dev
	@echo ""
	@echo "════════════════════════════════════════════════════════════"
	@echo "  Génération des paramètres SQL depuis env/.env.dev"
	@echo "════════════════════════════════════════════════════════════"
	@./scripts/generate-sql-parameters.sh

check-azure: ## Vérifier l'authentification Azure
	@echo "Vérification de l'authentification Azure..."
	@if [ ! -x "$(AZ)" ]; then \
		echo "✗ Azure CLI non trouvé"; \
		echo "  Installer avec: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"; \
		exit 1; \
	fi
	@if ! $(AZ) account show > /dev/null 2>&1; then \
		echo "✗ Non authentifié"; \
		echo "  Exécutez: az login"; \
		exit 1; \
	fi
	@echo "✓ Authentifié comme: $$($(AZ) account show --query user.name -o tsv)"

# ============================================================================
# Étapes de la Phase 1
# ============================================================================

deploy-firewall: check-azure generate-params ## Étape 1: Déployer règles firewall SQL
	@echo ""
	@echo "════════════════════════════════════════════════════════════"
	@echo "  Étape 1/4: Déploiement règles firewall SQL"
	@echo "════════════════════════════════════════════════════════════"
	@./scripts/deploy-sql-permissions.sh

create-sql-user: ## Étape 2: Créer utilisateur SQL pour Managed Identity (semi-automatisé)
	@./scripts/create-sql-user-helper.sh

update-bot-config: check-azure check-env ## Étape 3: Configurer variables d'environnement Bot
	@echo ""
	@echo "════════════════════════════════════════════════════════════"
	@echo "  Étape 3/4: Configuration variables d'environnement"
	@echo "════════════════════════════════════════════════════════════"
	@./scripts/update-bot-app-settings.sh

test-connection: ## Étape 4: Tester connexion Bot → SQL
	@echo ""
	@echo "════════════════════════════════════════════════════════════"
	@echo "  Étape 4/4: Test de connexion"
	@echo "════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Installation dépendances si nécessaire..."
	@cd .. && npm list mssql @azure/identity > /dev/null 2>&1 || npm install mssql @azure/identity
	@echo ""
	@cd .. && node scripts/test-sql-connection.js

# ============================================================================
# Utilitaires de diagnostic
# ============================================================================

status: check-azure ## Vérifier l'état de l'infrastructure
	@echo ""
	@echo "════════════════════════════════════════════════════════════"
	@echo "  État de l'infrastructure Phase 1"
	@echo "════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Bot App Service:"
	@az webapp show --name $(BOT_NAME) --resource-group $(BOT_RG) \
		--query "{name:name, state:state, location:location, identity:identity.type}" -o table
	@echo ""
	@echo "Variables SAAS configurées:"
	@az webapp config appsettings list --name $(BOT_NAME) --resource-group $(BOT_RG) \
		--query "[?contains(name, 'SAAS')].{Name:name, Value:value}" -o table
	@echo ""
	@echo "Règles firewall SQL:"
	@az sql server firewall-rule list --server $(SQL_SERVER) --resource-group $(SQL_RG) \
		--query "[?contains(name, 'AllowBotAppService')].{Name:name, StartIP:startIpAddress, EndIP:endIpAddress}" -o table
	@echo ""

logs: check-azure ## Afficher les logs du bot en temps réel
	@echo "Logs du bot $(BOT_NAME)..."
	@echo "Appuyez sur Ctrl+C pour arrêter"
	@az webapp log tail --name $(BOT_NAME) --resource-group $(BOT_RG)

restart: check-azure ## Redémarrer le bot
	@echo "Redémarrage du bot..."
	@az webapp restart --name $(BOT_NAME) --resource-group $(BOT_RG)
	@echo "✓ Bot redémarré"

ips: check-azure ## Afficher les IPs sortantes du bot
	@echo "IPs sortantes actuelles:"
	@az webapp show --name $(BOT_NAME) --resource-group $(BOT_RG) \
		--query "outboundIpAddresses" -o tsv | tr ',' '\n'

firewall-list: check-azure ## Lister toutes les règles firewall SQL
	@az sql server firewall-rule list --server $(SQL_SERVER) --resource-group $(SQL_RG) -o table

clean: ## Nettoyer les fichiers temporaires
	@echo "Nettoyage..."
	@rm -f /tmp/deployment-output.json
	@echo "✓ Nettoyage terminé"

# ============================================================================
# Documentation
# ============================================================================

docs: ## Ouvrir la documentation Phase 1
	@if command -v code &> /dev/null; then \
		code doc/guides/phase1-sql-setup.md; \
	else \
		cat doc/guides/phase1-sql-setup.md; \
	fi

readme: ## Ouvrir le README infrastructure
	@if command -v code &> /dev/null; then \
		code infra/README.md; \
	else \
		cat infra/README.md; \
	fi

.DEFAULT_GOAL := help
