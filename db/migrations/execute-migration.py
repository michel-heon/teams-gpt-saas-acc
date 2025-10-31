#!/usr/bin/env python3
"""
Exécution de la migration SQL via Azure REST API
Utilise l'authentification Azure CLI existante
"""

import json
import subprocess
import sys
from pathlib import Path

def get_access_token():
    """Obtient un token d'accès Azure via az cli"""
    try:
        result = subprocess.run(
            ['az', 'account', 'get-access-token', '--resource', 'https://database.windows.net/', '--output', 'json'],
            capture_output=True,
            text=True,
            check=True
        )
        token_data = json.loads(result.stdout)
        return token_data['accessToken']
    except Exception as e:
        print(f"❌ Erreur lors de l'obtention du token: {e}")
        sys.exit(1)

def execute_sql_batch(sql_script, connection_string):
    """Exécute le script SQL en utilisant Azure REST API"""
    
    print("=" * 80)
    print("EXÉCUTION MIGRATION via Azure Portal Query Editor")
    print("=" * 80)
    print()
    print("🔐 Obtention token d'accès Azure...")
    
    token = get_access_token()
    print("✅ Token obtenu")
    print()
    
    # Préparer le script
    migration_file = Path(__file__).parent / "002-teams-integration.sql"
    
    if not migration_file.exists():
        print(f"❌ Fichier introuvable: {migration_file}")
        sys.exit(1)
    
    print(f"📄 Lecture du script: {migration_file.name}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📊 Taille du script: {len(sql_content)} caractères")
    print()
    
    # Informations pour exécution manuelle
    print("⚠️  L'API REST Azure SQL n'est pas disponible via CLI")
    print("=" * 80)
    print()
    print("MÉTHODE RECOMMANDÉE: Azure Portal Query Editor")
    print("-" * 80)
    print()
    print("1. Ouvrir le portail Azure:")
    print("   https://portal.azure.com/#@cotechnoe.net/resource/subscriptions/0f1323ea-0f29-4187-9872-e1cf15d677de/resourceGroups/rg-saasaccel-teams-gpt-02/providers/Microsoft.Sql/servers/sac-02-sql/databases/sac-02AMPSaaSDB/queryEditor")
    print()
    print("2. Le script est prêt dans le presse-papier (si pbcopy disponible)")
    print()
    print("3. Coller le script dans Query Editor et cliquer 'Run'")
    print()
    print("4. Vérifier les messages de confirmation:")
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
    print("=" * 80)
    
    # Essayer de copier dans le presse-papier (si disponible)
    try:
        subprocess.run(['pbcopy'], input=sql_content.encode('utf-8'), check=True)
        print("✅ Script copié dans le presse-papier!")
    except:
        try:
            subprocess.run(['xclip', '-selection', 'clipboard'], input=sql_content.encode('utf-8'), check=True)
            print("✅ Script copié dans le presse-papier!")
        except:
            print("ℹ️  Presse-papier non disponible - copier manuellement le fichier")
    
    print()
    print(f"📂 Fichier source: {migration_file.absolute()}")
    print()

if __name__ == "__main__":
    connection_string = "sac-02-sql.database.windows.net/sac-02AMPSaaSDB"
    execute_sql_batch(None, connection_string)
