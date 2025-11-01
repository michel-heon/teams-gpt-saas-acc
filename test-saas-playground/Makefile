# Makefile for SaaS Accelerator Playground Testing

NODE = node

.PHONY: help list-plans list-plans-market message-count message-count-market

help:
	@echo "📋 Commandes disponibles:"
	@echo ""
	@echo "  make list-plans          - Liste tous les plans depuis la base de données SaaS Accelerator"
	@echo "  make list-plans-market   - Liste les plans avec la configuration Marketplace (limites, coûts)"
	@echo ""
	@echo "  make message-count       - Compte les messages enregistrés dans le SaaS Accelerator (audit logs)"
	@echo "  make message-count-market- Compte les messages émis vers l'API Azure Marketplace"
	@echo ""

list-plans:
	@$(NODE) scripts/list-plans.js

list-plans-market:
	@$(NODE) scripts/list-plans-market.js

message-count:
	@$(NODE) scripts/message-count.js

message-count-market:
	@$(NODE) scripts/message-count-market.js
