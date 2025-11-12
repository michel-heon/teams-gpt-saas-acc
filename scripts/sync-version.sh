#!/bin/bash
# Synchroniser la version du manifest.json avec le dernier tag Git

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Répertoires
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST_FILE="$PROJECT_ROOT/appPackage/manifest.json"

# Récupérer le dernier tag Git
cd "$PROJECT_ROOT"
LATEST_TAG=$(git tag --sort=-version:refname | head -1)

if [ -z "$LATEST_TAG" ]; then
    echo -e "${YELLOW}⚠️  Aucun tag Git trouvé. Utilisation de la version par défaut 1.0.0${NC}"
    VERSION="1.0.0"
else
    # Extraire la version du tag (enlever le 'v' au début si présent)
    VERSION=$(echo "$LATEST_TAG" | sed 's/^v//' | sed 's/-.*//')
    echo -e "${GREEN}📌 Tag Git: $LATEST_TAG${NC}"
fi

# Mettre à jour la version dans manifest.json
if [ -f "$MANIFEST_FILE" ]; then
    sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$MANIFEST_FILE"
    rm -f "$MANIFEST_FILE.bak"
    echo -e "${GREEN}✅ Version du manifest mise à jour: $VERSION${NC}"
    echo -e "${YELLOW}ℹ️  Les fichiers build/manifest.*.json seront régénérés par ATK lors du déploiement${NC}"
else
    echo -e "${YELLOW}⚠️  Fichier manifest.json non trouvé: $MANIFEST_FILE${NC}"
    exit 1
fi
