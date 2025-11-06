# Makefile pour Déploiement Teams GPT Assistant
# Encapsule les workflows Microsoft 365 Agents Toolkit

.PHONY: help clean provision-local provision-playground provision-dev deploy-local deploy-playground deploy-dev start-local start-playground validate-manifest check-package

# Couleurs pour les messages
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

##@ Aide

.PHONY: partner-center-info
partner-center-info: ## Afficher les informations pour Partner Center
	@echo ""
	@echo "🏢 Informations Partner Center - Teams GPT"
	@echo "=========================================="
	@echo ""
	@echo "📦 Package à uploader :"
	@if [ -f "../appPackage/build/appPackage.dev.zip" ]; then \
		echo "   ✓ appPackage.dev.zip ($(shell ls -lh ../appPackage/build/appPackage.dev.zip | awk '{print $$5}'))"; \
		echo "   📍 Chemin : $(shell pwd)/../appPackage/build/appPackage.dev.zip"; \
	else \
		echo "   ✗ Package manquant - Exécuter 'make provision-dev' d'abord"; \
	fi
	@echo ""
	@echo "🆔 Identifiants Teams :"
	@if [ -f "../env/.env.dev" ]; then \
		echo "   Teams App ID : $(shell grep TEAMS_APP_ID ../env/.env.dev | cut -d= -f2)"; \
		echo "   Bot ID       : $(shell grep BOT_ID ../env/.env.dev | cut -d= -f2)"; \
	else \
		echo "   ⚠️  Fichier .env.dev manquant"; \
	fi
	@echo ""
	@echo "🔗 Offre SaaS à lier :"
	@echo "   Nom          : Teams GPT"
	@echo "   Éditeur      : Cotechnoe Inc."
	@echo "   Plans        : dev-01, pay-as-you-go, Plan de test"
	@echo ""
	@echo "📋 Documentation :"
	@echo "   Guide        : $(shell pwd)/../doc/guides/partner-center-teams-configuration.md"
	@echo "   Plans SaaS   : $(shell pwd)/../doc/plans/PARTNER-CENTER-PLANS-CONFIG.md"
	@echo ""
	@echo "🌐 URLs à configurer dans Partner Center :"
	@if [ -f "../env/.env.dev" ]; then \
		echo "   Support      : https://sac-02-portal.azurewebsites.net/support"; \
		echo "   Aide         : https://sac-02-portal.azurewebsites.net/help"; \
		echo "   Confidentialité : https://sac-02-portal.azurewebsites.net/privacy"; \
		echo "   Conditions   : https://sac-02-portal.azurewebsites.net/terms"; \
	fi
	@echo ""
	@echo "⚠️  À préparer (Todo 8) :"
	@echo "   - Screenshots (3-5 images, 1280x720 ou 1920x1080)"
	@echo "   - Vidéo de démonstration (2-3 minutes)"
	@echo ""

.PHONY: help
help: ## Afficher l'aide
	@echo ""
	@echo "📦 Microsoft 365 Agents Toolkit - Commandes de Déploiement"
	@echo "=========================================================="
	@echo ""
	@echo "📖 Documentation : ./README.md"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "💡 Exemples d'utilisation :"
	@echo "   make check-prereqs          # Valider les prérequis"
	@echo "   make provision-playground   # Provisionner l'environnement Playground"
	@echo "   make deploy-dev             # Déployer en environnement Dev (Azure)"
	@echo "   make info                   # Afficher le statut de tous les environnements"
	@echo "   make partner-center-info    # Informations pour configuration Partner Center"
	@echo "   make inspect-package ENV=dev # Inspecter le contenu du package Dev"
	@echo ""

##@ Nettoyage

clean: ## Nettoyer les artefacts générés
	@echo "$(YELLOW)Nettoyage des artefacts...$(NC)"
	@rm -rf ../appPackage/build
	@rm -rf ../.localConfigs*
	@echo "$(GREEN)✓ Nettoyage terminé$(NC)"

##@ Provision (Création des packages)

provision-playground: ## Provision environnement playground (via Toolkit)
	@echo "$(BLUE)Provision de l'environnement playground...$(NC)"
	@cd .. && npx atk provision --env playground
	@echo "$(GREEN)✓ Package créé : appPackage/build/appPackage.playground.zip$(NC)"

provision-local: ## Provision environnement local (via Toolkit)
	@echo "$(BLUE)Provision de l'environnement local...$(NC)"
	@cd .. && npx atk provision --env local
	@echo "$(GREEN)✓ Package créé : appPackage/build/appPackage.local.zip$(NC)"

provision-dev: ## Provision environnement dev Azure (via Toolkit)
	@echo "$(BLUE)Provision de l'environnement dev...$(NC)"
	@cd .. && npx atk provision --env dev
	@echo "$(GREEN)✓ Package créé : appPackage/build/appPackage.dev.zip$(NC)"

##@ Deploy (Déploiement du code)

deploy-playground: ## Deploy code vers environnement playground (via Toolkit)
	@echo "$(BLUE)Déploiement vers playground...$(NC)"
	@cd .. && npx atk deploy --env playground
	@echo "$(GREEN)✓ Déploiement playground terminé$(NC)"

deploy-local: ## Deploy code vers environnement local (via Toolkit)
	@echo "$(BLUE)Déploiement vers local...$(NC)"
	@cd .. && npx atk deploy --env local
	@echo "$(GREEN)✓ Déploiement local terminé$(NC)"

deploy-dev: ## Deploy code vers environnement dev Azure (via Toolkit)
	@echo "$(BLUE)Déploiement vers dev Azure...$(NC)"
	@cd .. && npx atk deploy --env dev
	@echo "$(GREEN)✓ Déploiement dev terminé$(NC)"

##@ Lancement de l'application

start-playground: ## Lancer l'application en mode playground
	@echo "$(BLUE)Lancement de l'application en mode playground...$(NC)"
	@cd .. && npm run dev:teamsfx:testtool

start-local: ## Lancer l'application en mode local
	@echo "$(BLUE)Lancement de l'application en mode local...$(NC)"
	@cd .. && npm run dev:teamsfx

##@ Workflows complets

full-playground: clean provision-playground deploy-playground ## Workflow complet : Provision + Deploy playground
	@echo "$(GREEN)✓ Workflow playground terminé$(NC)"
	@echo "$(YELLOW)Lancer l'app avec : make start-playground$(NC)"

full-local: clean provision-local deploy-local ## Workflow complet : Provision + Deploy local
	@echo "$(GREEN)✓ Workflow local terminé$(NC)"
	@echo "$(YELLOW)Lancer l'app avec : make start-local$(NC)"

full-dev: clean provision-dev deploy-dev ## Workflow complet : Provision + Deploy dev
	@echo "$(GREEN)✓ Workflow dev Azure terminé$(NC)"

##@ Validation

validate-manifest: ## Valider le manifest source
	@echo "$(BLUE)Validation du manifest source...$(NC)"
	@cat ../appPackage/manifest.json | jq '.' > /dev/null
	@echo "$(GREEN)✓ Manifest JSON valide$(NC)"

check-package: ## Vérifier les packages générés
	@echo "$(BLUE)Vérification des packages...$(NC)"
	@if [ -d "../appPackage/build" ]; then \
		ls -lh ../appPackage/build/*.zip 2>/dev/null || echo "$(YELLOW)⚠ Aucun package trouvé dans appPackage/build/$(NC)"; \
	else \
		echo "$(YELLOW)⚠ Le répertoire appPackage/build/ n'existe pas$(NC)"; \
		echo "$(YELLOW)  Exécuter: make provision-playground ou make provision-local$(NC)"; \
	fi

inspect-package: ## Inspecter le contenu d'un package (usage: make inspect-package ENV=playground)
	@if [ -z "$(ENV)" ]; then \
		echo "$(RED)Erreur: Spécifier ENV=playground|local|dev$(NC)"; \
		exit 1; \
	fi
	@if [ -f "../appPackage/build/appPackage.$(ENV).zip" ]; then \
		echo "$(BLUE)Contenu de appPackage.$(ENV).zip :$(NC)"; \
		unzip -l ../appPackage/build/appPackage.$(ENV).zip; \
	else \
		echo "$(RED)Package non trouvé : appPackage/build/appPackage.$(ENV).zip$(NC)"; \
		echo "$(YELLOW)Exécuter: make provision-$(ENV)$(NC)"; \
	fi

##@ Informations

info: ## Afficher les informations sur les environnements
	@echo "$(BLUE)=== Informations sur les environnements ===$(NC)"
	@echo ""
	@echo "$(YELLOW)Playground :$(NC)"
	@echo "  - Config  : m365agents.playground.yml"
	@echo "  - Env     : env/.env.playground"
	@echo "  - Package : appPackage/build/appPackage.playground.zip"
	@if [ -f "../appPackage/build/appPackage.playground.zip" ]; then echo "  $(GREEN)✓ Package créé$(NC)"; else echo "  $(RED)✗ Package manquant$(NC)"; fi
	@echo ""
	@echo "$(YELLOW)Local :$(NC)"
	@echo "  - Config  : m365agents.local.yml"
	@echo "  - Env     : env/.env.local"
	@echo "  - Package : appPackage/build/appPackage.local.zip"
	@if [ -f "../appPackage/build/appPackage.local.zip" ]; then echo "  $(GREEN)✓ Package créé$(NC)"; else echo "  $(RED)✗ Package manquant$(NC)"; fi
	@echo ""
	@echo "$(YELLOW)Dev (Azure) :$(NC)"
	@echo "  - Config  : m365agents.yml"
	@echo "  - Env     : env/.env.dev"
	@echo "  - Package : appPackage/build/appPackage.dev.zip"
	@if [ -f "../appPackage/build/appPackage.dev.zip" ]; then \
		echo "  $(GREEN)✓ Package créé$(NC)"; \
		if [ -f "../env/.env.dev" ]; then \
			TEAMS_APP_ID=$$(grep "^TEAMS_APP_ID=" ../env/.env.dev | cut -d'=' -f2); \
			BOT_ID=$$(grep "^BOT_ID=" ../env/.env.dev | cut -d'=' -f2); \
			RG=$$(grep "^AZURE_RESOURCE_GROUP_NAME=" ../env/.env.dev | cut -d'=' -f2); \
			echo "  - Teams App ID : $$TEAMS_APP_ID"; \
			echo "  - Bot ID       : $$BOT_ID"; \
			echo "  - Resource Group : $$RG"; \
		fi \
	else \
		echo "  $(RED)✗ Package manquant$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Distribution (Assistant-GPT-Teams) :$(NC)"
	@echo "  - Snapshot : appPackage/distribution-snapshot/"
	@echo "  - Cible    : /media/psf/Developpement/00-GIT/Assistant-GPT-Teams"
	@if [ -d "/media/psf/Developpement/00-GIT/Assistant-GPT-Teams" ]; then \
		echo "  $(GREEN)✓ Repository cible trouvé$(NC)"; \
	else \
		echo "  $(RED)✗ Repository cible introuvable$(NC)"; \
	fi
	@if [ -f "../appPackage/distribution-snapshot/INSTALLATION.md" ]; then \
		echo "  $(GREEN)✓ Snapshot prêt pour distribution$(NC)"; \
	else \
		echo "  $(YELLOW)⚠ Snapshot incomplet$(NC)"; \
	fi
	@echo "  $(BLUE)💡 Commandes :$(NC)"
	@echo "     make update-distribution-snapshot  # Mettre à jour le snapshot"
	@echo "     make sync-distribution            # Synchroniser vers GitHub"

logs: ## Afficher les logs du Toolkit
	@echo "$(BLUE)Derniers logs Microsoft 365 Agents Toolkit :$(NC)"
	@if [ -d "../.teamsfx/log" ]; then \
		ls -lt ../.teamsfx/log/ | head -5; \
	else \
		echo "$(YELLOW)Aucun log trouvé$(NC)"; \
	fi

##@ Tâches VS Code (recommandé)

vscode-provision-dev: ## Provisionner via VS Code (Command Palette > Teams: Provision)
	@echo "$(BLUE)Pour provisionner les ressources Azure :$(NC)"
	@echo "1. Ouvrir Command Palette (Ctrl+Shift+P / Cmd+Shift+P)"
	@echo "2. Taper 'Teams: Provision'"
	@echo "3. Sélectionner l'environnement 'dev'"
	@echo ""
	@echo "$(YELLOW)Ou utiliser : make check-package pour vérifier si déjà provisionné$(NC)"

vscode-deploy-dev: ## Déployer via VS Code (Command Palette > Teams: Deploy)
	@echo "$(BLUE)Pour déployer l'application sur Azure :$(NC)"
	@echo "1. Ouvrir Command Palette (Ctrl+Shift+P / Cmd+Shift+P)"
	@echo "2. Taper 'Teams: Deploy'"
	@echo "3. Sélectionner l'environnement 'dev'"
	@echo ""
	@echo "$(YELLOW)Les ressources doivent être provisionnées au préalable$(NC)"

task-playground: ## Lancer la tâche VS Code pour playground
	@echo "$(BLUE)Lancer la tâche 'Start Agent in Microsoft 365 Agents Playground'$(NC)"
	@echo "$(YELLOW)Cette commande doit être exécutée depuis VS Code :$(NC)"
	@echo "  Terminal > Run Task > Start Agent in Microsoft 365 Agents Playground"

task-local: ## Lancer la tâche VS Code pour local
	@echo "$(BLUE)Lancer la tâche 'Start Agent Locally'$(NC)"
	@echo "$(YELLOW)Cette commande doit être exécutée depuis VS Code :$(NC)"
	@echo "  Terminal > Run Task > Start Agent Locally"

task-dev: ## Voir le statut du déploiement Azure
	@echo "$(BLUE)Application déployée sur Azure :$(NC)"
	@if [ -f "../env/.env.dev" ]; then \
		echo "$(GREEN)✓ Environnement dev provisionné$(NC)"; \
		grep "BOT_AZURE_APP_SERVICE_RESOURCE_ID" ../env/.env.dev | cut -d'=' -f2 || echo "Resource ID non trouvé"; \
	else \
		echo "$(YELLOW)⚠ Environnement dev non provisionné$(NC)"; \
	fi

##@ Prérequis

check-prereqs: ## Vérifier les prérequis d'installation
	@echo "$(BLUE)Vérification des prérequis...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)✗ Node.js non installé$(NC)"; exit 1; }
	@echo "$(GREEN)✓ Node.js : $$(node --version)$(NC)"
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)✗ npm non installé$(NC)"; exit 1; }
	@echo "$(GREEN)✓ npm : $$(npm --version)$(NC)"
	@command -v jq >/dev/null 2>&1 || { echo "$(YELLOW)⚠ jq non installé (optionnel)$(NC)"; }
	@if command -v jq >/dev/null 2>&1; then echo "$(GREEN)✓ jq installé$(NC)"; fi
	@if [ -f "../package.json" ]; then echo "$(GREEN)✓ package.json trouvé$(NC)"; fi
	@if [ -f "../m365agents.yml" ]; then echo "$(GREEN)✓ m365agents.yml trouvé$(NC)"; fi
	@echo "$(GREEN)✓ Tous les prérequis sont satisfaits$(NC)"

##@ Distribution

sync-distribution: ## Synchroniser le répertoire de distribution vers Assistant-GPT-Teams
	@echo "$(BLUE)Synchronisation vers Assistant-GPT-Teams...$(NC)"
	@if [ ! -d "/media/psf/Developpement/00-GIT/Assistant-GPT-Teams" ]; then \
		echo "$(RED)✗ Dépôt Assistant-GPT-Teams introuvable$(NC)"; \
		echo "$(YELLOW)  Chemin attendu: /media/psf/Developpement/00-GIT/Assistant-GPT-Teams$(NC)"; \
		exit 1; \
	fi
	@if [ ! -f "../appPackage/build/appPackage.dev.zip" ]; then \
		echo "$(RED)✗ Package Teams introuvable$(NC)"; \
		echo "$(YELLOW)  Chemin attendu: appPackage/build/appPackage.dev.zip$(NC)"; \
		echo "$(YELLOW)  Exécutez d'abord: make provision-dev$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)→ Copie du contenu du répertoire distribution-snapshot...$(NC)"
	@rsync -av --exclude='appPackage.dev.zip' ../appPackage/distribution-snapshot/ /media/psf/Developpement/00-GIT/Assistant-GPT-Teams/
	@echo "$(YELLOW)→ Copie du package Teams (renommé en appPackage.zip)...$(NC)"
	@cp -v ../appPackage/build/appPackage.dev.zip /media/psf/Developpement/00-GIT/Assistant-GPT-Teams/appPackage.zip
	@echo "$(GREEN)✓ Fichiers copiés$(NC)"
	@echo ""
	@echo "$(YELLOW)→ Commit et push vers GitHub...$(NC)"
	@cd /media/psf/Developpement/00-GIT/Assistant-GPT-Teams && \
		git add . && \
		git status --short && \
		git commit -m "chore: Sync distribution files from teams-gpt-saas-acc" && \
		git push origin main
	@echo "$(GREEN)✓ Synchronisation terminée$(NC)"
	@echo ""
	@echo "$(BLUE)📦 Distribution mise à jour :$(NC)"
	@echo "   https://github.com/Cotechnoe/Assistant-GPT-Teams"

update-distribution-snapshot: ## Mettre à jour le snapshot avec le package Teams actuel
	@echo "$(BLUE)Mise à jour du snapshot de distribution...$(NC)"
	@if [ ! -f "../appPackage/build/appPackage.dev.zip" ]; then \
		echo "$(RED)✗ Package appPackage.dev.zip manquant$(NC)"; \
		echo "$(YELLOW)  Exécuter d'abord: make provision-dev$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)→ Copie du package Teams...$(NC)"
	@cp -v ../appPackage/build/appPackage.dev.zip ../appPackage/distribution-snapshot/
	@echo "$(GREEN)✓ Snapshot mis à jour$(NC)"
	@echo ""
	@echo "$(YELLOW)💡 Prochaine étape: make sync-distribution$(NC)"

.DEFAULT_GOAL := help
