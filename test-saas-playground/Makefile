# Makefile for SaaS Accelerator Playground Testing

NODE = node

.PHONY: help setup-playground link-teams-user reset-playground \
        list-plans list-plans-market message-count message-count-market message-diag

help:
	@echo "📋 Commandes disponibles:"
	@echo ""
	@echo "  🔧 Configuration Playground:"
	@echo "  make setup-playground    - Configure la subscription Playground (interactif)"
	@echo "  make link-teams-user     - Lie un TeamsUserId à une subscription existante"
	@echo "  make reset-playground    - Supprime les subscriptions Playground (⚠️  destructif)"
	@echo ""
	@echo "  📋 Gestion des plans:"
	@echo "  make list-plans          - Liste tous les plans depuis la base de données SaaS Accelerator"
	@echo "  make list-plans-market   - Liste les plans avec la configuration Marketplace (limites, coûts)"
	@echo ""
	@echo "  📊 Comptage des messages:"
	@echo "  make message-count       - Compte les messages enregistrés dans le SaaS Accelerator (audit logs)"
	@echo "  make message-count-market- Compte les messages émis vers l'API Azure Marketplace"
	@echo "  make message-diag        - Diagnostic complet (BD, transit, prochaine transmission, Marketplace)"
	@echo ""
	@echo "  � Note: L'émission vers Marketplace API est gérée par le SaaS Accelerator Metered Scheduler"
	@echo "           Voir doc/phase2/saas-accelerator-metered-scheduler.md pour la configuration"
	@echo ""

# Configuration Playground
setup-playground:
	@$(NODE) scripts/setup-playground-subscription.js

link-teams-user:
	@$(NODE) scripts/link-teams-user.js

reset-playground:
	@$(NODE) scripts/reset-playground.js

# Gestion des plans
list-plans:
	@$(NODE) scripts/list-plans.js

list-plans-market:
	@$(NODE) scripts/list-plans-market.js

# Comptage des messages
message-count:
	@$(NODE) scripts/message-count.js

message-count-market:
	@$(NODE) scripts/message-count-market.js

message-diag:
	@$(NODE) scripts/message-diag.js
