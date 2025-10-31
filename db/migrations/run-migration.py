#!/usr/bin/env python3
"""
Script pour exécuter la migration SQL sur Azure SQL Database
Utilise azure-identity pour l'authentification Azure AD
"""

import sys
import subprocess
from pathlib import Path

def run_migration():
    """Exécute la migration via Azure Portal Query Editor ou alternative"""
    
    migration_file = Path(__file__).parent / "002-teams-integration.sql"
    
    if not migration_file.exists():
        print(f"❌ Fichier migration introuvable: {migration_file}")
        sys.exit(1)
    
    print("=" * 80)
    print("EXÉCUTION MIGRATION PHASE 2.3 - Azure SQL Database")
    print("=" * 80)
    print()
    print(f"📄 Script: {migration_file.name}")
    print(f"🎯 Serveur: sac-02-sql.database.windows.net")
    print(f"💾 Database: sac-02AMPSaaSDB")
    print()
    print("⚠️  INSTRUCTIONS MANUELLES (Azure CLI query non disponible)")
    print("-" * 80)
    print()
    print("Option 1: Azure Portal Query Editor (RECOMMANDÉ)")
    print("1. Ouvrir: https://portal.azure.com")
    print("2. Naviguer: SQL databases → sac-02AMPSaaSDB → Query editor")
    print("3. S'authentifier avec Azure AD")
    print("4. Copier-coller le contenu de:")
    print(f"   {migration_file.absolute()}")
    print("5. Cliquer 'Run'")
    print("6. Vérifier les messages de confirmation")
    print()
    print("Option 2: Azure Data Studio")
    print("1. Télécharger: https://aka.ms/azuredatastudio")
    print("2. Connexion:")
    print("   - Server: sac-02-sql.database.windows.net")
    print("   - Auth: Azure Active Directory - Universal with MFA")
    print("   - Database: sac-02AMPSaaSDB")
    print("3. Ouvrir le fichier SQL")
    print("4. Exécuter (F5)")
    print()
    print("Option 3: Afficher le contenu du script")
    print("-" * 80)
    
    user_input = input("\n🔍 Voulez-vous afficher le contenu du script? (o/N): ").strip().lower()
    
    if user_input in ['o', 'oui', 'y', 'yes']:
        print()
        print("=" * 80)
        print(f"CONTENU: {migration_file.name}")
        print("=" * 80)
        print()
        with open(migration_file, 'r', encoding='utf-8') as f:
            print(f.read())
        print()
        print("=" * 80)
        print("FIN DU SCRIPT")
        print("=" * 80)
    
    print()
    print("📋 APRÈS EXÉCUTION:")
    print("-" * 80)
    print("1. Vérifier les messages de confirmation dans l'output:")
    print("   ✓ Colonne TeamsUserId ajoutée")
    print("   ✓ Colonne TeamsConversationId ajoutée")
    print("   ✓ Colonne TenantId ajoutée")
    print("   ✓ Index IX_Subscriptions_TeamsUserId créé")
    print("   ✓ Index IX_Subscriptions_TenantId créé")
    print("   ✓ Table TeamsMessageLogs créée")
    print("   ✓ Vue vw_SubscriptionUsageStats créée")
    print("   ✓ Procédure sp_LinkTeamsUserToSubscription créée")
    print("   ✓ Version 8.30 enregistrée")
    print()
    print("2. Exécuter le script de validation:")
    print(f"   python3 {Path(__file__).parent / 'run-tests.py'}")
    print()
    print("=" * 80)

if __name__ == "__main__":
    run_migration()
