# Makefile pour les tests Teams GPT SaaS Accelerator
# Encapsule les commandes npm test pour une utilisation simplifiée

.PHONY: help test unit integration watch coverage clean install

# Couleurs pour l'affichage
GREEN  := \033[0;32m
YELLOW := \033[0;33m
NC     := \033[0m # No Color

# Afficher l'aide par défaut
help:
	@echo "$(GREEN)Tests Teams GPT SaaS Accelerator$(NC)"
	@echo ""
	@echo "$(YELLOW)Commandes disponibles:$(NC)"
	@echo "  make test          - Exécuter tous les tests (unitaires + intégration)"
	@echo "  make unit          - Exécuter uniquement les tests unitaires"
	@echo "  make integration   - Exécuter uniquement les tests d'intégration"
	@echo "  make watch         - Exécuter les tests en mode watch (auto-reload)"
	@echo "  make coverage      - Générer le rapport de couverture de code"
	@echo "  make clean         - Nettoyer les fichiers de couverture"
	@echo "  make install       - Installer les dépendances de test"
	@echo ""
	@echo "$(YELLOW)Exemples:$(NC)"
	@echo "  make unit          # Tests rapides (48 tests)"
	@echo "  make integration   # Tests contre DB Azure SQL (nécessite credentials)"
	@echo "  make coverage      # Vérifier le seuil de couverture (70%)"
	@echo ""

# Exécuter tous les tests
test:
	@echo "$(GREEN)▶ Exécution de tous les tests...$(NC)"
	@cd .. && npm test

# Exécuter uniquement les tests unitaires
unit:
	@echo "$(GREEN)▶ Exécution des tests unitaires...$(NC)"
	@cd .. && npm run test:unit

# Exécuter uniquement les tests d'intégration
integration:
	@echo "$(GREEN)▶ Exécution des tests d'intégration...$(NC)"
	@echo "$(YELLOW)⚠ Nécessite les credentials Azure SQL dans env/.env.dev$(NC)"
	@cd .. && npm run test:integration

# Exécuter les tests en mode watch
watch:
	@echo "$(GREEN)▶ Mode watch activé (Ctrl+C pour arrêter)...$(NC)"
	@cd .. && npm run test:watch

# Générer le rapport de couverture
coverage:
	@echo "$(GREEN)▶ Génération du rapport de couverture...$(NC)"
	@cd .. && npm run test:coverage
	@echo ""
	@echo "$(YELLOW)Rapport de couverture généré dans: coverage/$(NC)"
	@echo "$(YELLOW)Ouvrir coverage/lcov-report/index.html pour voir le détail$(NC)"

# Nettoyer les fichiers générés
clean:
	@echo "$(GREEN)▶ Nettoyage des fichiers de test...$(NC)"
	@cd .. && rm -rf coverage
	@cd .. && rm -rf .jest-cache
	@echo "$(GREEN)✓ Nettoyage terminé$(NC)"

# Installer les dépendances de test
install:
	@echo "$(GREEN)▶ Installation des dépendances de test...$(NC)"
	@cd .. && npm install --save-dev jest @types/jest dotenv
	@echo "$(GREEN)✓ Dépendances installées$(NC)"

# Exécuter les tests unitaires avec verbose
unit-verbose:
	@echo "$(GREEN)▶ Exécution des tests unitaires (mode verbose)...$(NC)"
	@cd .. && npm run test:unit -- --verbose

# Exécuter les tests d'intégration avec verbose
integration-verbose:
	@echo "$(GREEN)▶ Exécution des tests d'intégration (mode verbose)...$(NC)"
	@cd .. && npm run test:integration -- --verbose

# Exécuter un test spécifique
# Usage: make test-file FILE=messageClassifier
test-file:
	@echo "$(GREEN)▶ Exécution du test: $(FILE)$(NC)"
	@cd .. && npm test -- tests/unit/services/$(FILE).test.js

# Vérifier que les credentials Azure sont configurés
check-credentials:
	@echo "$(GREEN)▶ Vérification des credentials Azure SQL...$(NC)"
	@if [ -f ../env/.env.dev ]; then \
		if grep -q "SAAS_DB_USER=" ../env/.env.dev && grep -q "SAAS_DB_PASSWORD=" ../env/.env.dev; then \
			echo "$(GREEN)✓ Credentials trouvés dans env/.env.dev$(NC)"; \
		else \
			echo "$(YELLOW)⚠ Credentials Azure SQL manquants dans env/.env.dev$(NC)"; \
			echo "$(YELLOW)  Ajoutez: SAAS_DB_USER et SAAS_DB_PASSWORD$(NC)"; \
		fi \
	else \
		echo "$(YELLOW)⚠ Fichier env/.env.dev non trouvé$(NC)"; \
	fi

# Afficher un résumé des tests
summary:
	@echo "$(GREEN)▶ Résumé des tests disponibles:$(NC)"
	@echo ""
	@echo "$(YELLOW)Tests Unitaires (48 tests):$(NC)"
	@echo "  - MessageClassifier: 21 tests"
	@echo "  - UsageReporter: 23 tests"
	@echo "  - SaaSIntegration: 4 tests"
	@echo ""
	@echo "$(YELLOW)Tests d'Intégration (12 tests):$(NC)"
	@echo "  - Database Connection: 1 test"
	@echo "  - getActiveSubscription: 2 tests"
	@echo "  - trackMessageUsage: 2 tests"
	@echo "  - checkMessageLimit: 3 tests"
	@echo "  - Performance & Résilience: 2 tests"
	@echo "  - Intégrité des données: 2 tests"
	@echo ""
	@echo "$(GREEN)Total: 60 tests$(NC)"

# Exécuter les tests avec debugger
debug:
	@echo "$(GREEN)▶ Exécution des tests en mode debug...$(NC)"
	@cd .. && DEBUG=true npm test

# Lancer les tests CI (sans couleurs, format machine)
ci:
	@echo "Running tests in CI mode..."
	@cd .. && npm test -- --ci --coverage --maxWorkers=2

# Valider que tous les tests passent avant commit
pre-commit: clean unit
	@echo "$(GREEN)✓ Tests unitaires OK - Prêt pour commit$(NC)"
