# Makefile pour la gestion des icônes et packages Microsoft Teams
# Assistant GPT Teams - Cotechnoe Inc.

.PHONY: help icons clean backup restore package validate info

# Couleurs pour l'affichage
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Afficher cette aide
	@echo "$(BLUE)═══════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Makefile - Assistant GPT Teams (Cotechnoe)$(NC)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)Commandes disponibles:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

icons: ## Générer les icônes Teams (color.png, outline.png)
	@echo "$(BLUE)🎨 Génération des icônes Microsoft Teams...$(NC)"
	@python3 generate-icons.py
	@echo "$(GREEN)✅ Icônes générées avec succès!$(NC)"
	@echo ""
	@echo "$(YELLOW)📝 Prochaines étapes:$(NC)"
	@echo "  1. Vérifier visuellement les icônes: color.png et outline.png"
	@echo "  2. Regénérer les packages: make package"
	@echo "  3. Tester dans Teams: make validate"

package: icons ## Générer les packages Teams (.zip) avec les nouvelles icônes
	@echo "$(BLUE)📦 Génération des packages Microsoft Teams...$(NC)"
	@rm -f build/appPackage.dev.zip build/appPackage.playground.zip
	@mkdir -p build
	@zip -q build/appPackage.dev.zip manifest.json color.png outline.png
	@cp build/appPackage.dev.zip build/appPackage.playground.zip
	@echo "$(GREEN)✅ Packages générés:$(NC)"
	@ls -lh build/appPackage.*.zip | awk '{printf "  - %s (%s)\n", $$9, $$5}'
	@echo ""
	@unzip -l build/appPackage.dev.zip | grep -E '(Length|color|outline|manifest)' || true

validate: ## Valider les icônes (dimensions, format, conformité)
	@echo "$(BLUE)🔍 Validation des icônes...$(NC)"
	@echo ""
	@echo "$(YELLOW)Spécifications Microsoft Teams:$(NC)"
	@echo "  Color icon:   256x256 px (recommandé 216-350px), symbole 160x160 px, padding 48 px"
	@echo "  Outline icon: 32x32 px, blanc RGB(255,255,255), transparent"
	@echo ""
	@echo "$(YELLOW)Fichiers actuels:$(NC)"
	@file color.png outline.png 2>/dev/null || echo "  $(RED)❌ Icônes non trouvées$(NC)"
	@echo ""
	@if command -v identify >/dev/null 2>&1; then \
		echo "$(YELLOW)Détails (ImageMagick):$(NC)"; \
		identify -format "  color.png:   %wx%h px, %[channels], %[colorspace], %b\n" color.png 2>/dev/null || true; \
		identify -format "  outline.png: %wx%h px, %[channels], %[colorspace], %b\n" outline.png 2>/dev/null || true; \
	else \
		echo "$(YELLOW)ℹ️  Installer ImageMagick pour validation détaillée:$(NC)"; \
		echo "  sudo apt-get install imagemagick"; \
	fi
	@echo ""
	@if [ -f build/appPackage.dev.zip ]; then \
		echo "$(GREEN)✅ Package Teams trouvé:$(NC)"; \
		ls -lh build/appPackage.dev.zip | awk '{printf "  %s (%s)\n", $$9, $$5}'; \
	else \
		echo "$(YELLOW)⚠️  Package non généré. Exécuter: make package$(NC)"; \
	fi

backup: ## Sauvegarder les icônes actuelles (.backup)
	@echo "$(BLUE)📦 Sauvegarde des icônes...$(NC)"
	@if [ -f color.png ]; then \
		cp color.png color.png.backup; \
		echo "$(GREEN)✅ color.png → color.png.backup$(NC)"; \
	fi
	@if [ -f outline.png ]; then \
		cp outline.png outline.png.backup; \
		echo "$(GREEN)✅ outline.png → outline.png.backup$(NC)"; \
	fi

restore: ## Restaurer les anciennes icônes depuis backup
	@echo "$(YELLOW)🔄 Restauration des icônes depuis backup...$(NC)"
	@if [ -f color.png.backup ]; then \
		mv color.png.backup color.png; \
		echo "$(GREEN)✅ color.png restaurée$(NC)"; \
	else \
		echo "$(RED)❌ color.png.backup non trouvée$(NC)"; \
	fi
	@if [ -f outline.png.backup ]; then \
		mv outline.png.backup outline.png; \
		echo "$(GREEN)✅ outline.png restaurée$(NC)"; \
	else \
		echo "$(RED)❌ outline.png.backup non trouvée$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)💡 Regénérer les packages: make package$(NC)"

clean: ## Nettoyer les fichiers générés (packages, backups)
	@echo "$(BLUE)🧹 Nettoyage des fichiers générés...$(NC)"
	@rm -f build/appPackage.dev.zip build/appPackage.playground.zip
	@rm -f *.backup
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

info: ## Afficher les informations sur les icônes et packages
	@echo "$(BLUE)═══════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Informations - Assistant GPT Teams$(NC)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)📐 Spécifications Microsoft Teams:$(NC)"
	@echo "  Color icon (color.png):"
	@echo "    - Dimensions: 256x256 pixels (recommandé: 216-350px)"
	@echo "    - Symbole: 160x160 pixels max (centré)"
	@echo "    - Padding: 48 pixels autour du symbole"
	@echo "    - Format: PNG RGBA (avec transparence)"
	@echo "    - Teams applique: coins arrondis, forme hexagonale (bots)"
	@echo ""
	@echo "  Outline icon (outline.png):"
	@echo "    - Dimensions: 32x32 pixels"
	@echo "    - Couleur: Blanc pur RGB(255, 255, 255) uniquement"
	@echo "    - Fond: Transparent (canal alpha = 0)"
	@echo "    - Pas de padding (symbole peut aller aux bords)"
	@echo "    - Utilisation: App bar Teams, indicateur 'en cours'"
	@echo ""
	@echo "$(YELLOW)📁 Fichiers:$(NC)"
	@ls -lh color.png outline.png 2>/dev/null | awk '{printf "  %s: %s (%s)\n", $$9, $$6" "$$7" "$$8, $$5}' || echo "  $(RED)❌ Icônes non trouvées$(NC)"
	@echo ""
	@if [ -d build ]; then \
		echo "$(YELLOW)📦 Packages Teams:$(NC)"; \
		ls -lh build/appPackage.*.zip 2>/dev/null | awk '{printf "  %s: %s (%s)\n", $$9, $$6" "$$7" "$$8, $$5}' || echo "  $(YELLOW)⚠️  Aucun package généré$(NC)"; \
	else \
		echo "$(YELLOW)📦 Packages Teams:$(NC)"; \
		echo "  $(YELLOW)⚠️  Répertoire build/ non trouvé$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)🔗 Référence:$(NC)"
	@echo "  https://learn.microsoft.com/microsoftteams/platform/concepts/build-and-test/apps-package#app-icons"
	@echo ""

# Cibles par défaut
.DEFAULT_GOAL := help
