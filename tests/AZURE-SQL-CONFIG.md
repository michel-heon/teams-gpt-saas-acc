# Guide de Configuration - Tests d'Intégration Azure SQL

## Serveur SQL SaaS Accelerator

Les tests d'intégration se connectent à la base de données Azure SQL réelle déployée pour le SaaS Accelerator.

### Informations du Serveur

- **Serveur**: `sac-02-sql.database.windows.net`
- **Database**: `sac-02AMPSaaSDB`
- **Resource Group**: `rg-saasaccel-teams-gpt-02`
- **Location**: Canada Central
- **Admin SQL**: `CloudSAdd5b00f1`
- **Azure AD Admin**: `heon@cotechnoe.net`

### Authentification

Le serveur est configuré avec **Azure AD Only Authentication** activée. Cela signifie que l'authentification SQL classique (username/password) est désactivée.

#### Option 1 : Authentification Azure AD (Recommandé)

Pour utiliser l'authentification Azure AD, vous devez :

1. Être connecté à Azure CLI :
   ```bash
   az login
   az account set --subscription 0f1323ea-0f29-4187-9872-e1cf15d677de
   ```

2. Modifier `src/services/saasIntegration.js` pour utiliser l'authentification Azure AD :
   ```javascript
   const config = {
       server: process.env.SAAS_DB_SERVER,
       database: process.env.SAAS_DB_NAME,
       authentication: {
           type: 'azure-active-directory-default' // ou 'azure-active-directory-access-token'
       },
       options: {
           encrypt: true,
           trustServerCertificate: false
       }
   };
   ```

3. Dans `env/.env.dev`, laissez `SAAS_DB_USER` et `SAAS_DB_PASSWORD` vides :
   ```bash
   SAAS_DB_SERVER=sac-02-sql.database.windows.net
   SAAS_DB_NAME=sac-02AMPSaaSDB
   SAAS_DB_USER=
   SAAS_DB_PASSWORD=
   ```

#### Option 2 : Activer l'Authentification SQL (Nécessite Admin Azure)

Si vous préférez utiliser username/password, un administrateur Azure doit :

1. Désactiver "Azure AD Only Authentication" sur le serveur SQL :
   ```bash
   az sql server ad-only-auth disable \
     --resource-group rg-saasaccel-teams-gpt-02 \
     --name sac-02-sql
   ```

2. Réinitialiser ou créer un mot de passe pour l'admin SQL :
   ```bash
   az sql server update \
     --resource-group rg-saasaccel-teams-gpt-02 \
     --name sac-02-sql \
     --admin-password "VotreMotDePasseSécurisé123!"
   ```

3. Puis configurer dans `env/.env.dev` :
   ```bash
   SAAS_DB_USER=CloudSAdd5b00f1
   SAAS_DB_PASSWORD=VotreMotDePasseSécurisé123!
   ```

### Règles Firewall

Le serveur a **Public Network Access** activé mais utilise un **Private Endpoint**. Vérifiez que votre IP est autorisée :

```bash
# Lister les règles firewall existantes
az sql server firewall-rule list \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql

# Ajouter votre IP si nécessaire
az sql server firewall-rule create \
  --resource-group rg-saasaccel-teams-gpt-02 \
  --server sac-02-sql \
  --name "AllowMyIP" \
  --start-ip-address $(curl -s ifconfig.me) \
  --end-ip-address $(curl -s ifconfig.me)
```

### Tester la Connexion

#### Avec Azure AD (recommandé)

```bash
# Se connecter avec Azure CLI
az login

# Obtenir un access token
az account get-access-token --resource https://database.windows.net/

# Tester la connexion
sqlcmd -S sac-02-sql.database.windows.net \
  -d sac-02AMPSaaSDB \
  -G \
  -U heon@cotechnoe.net
```

#### Avec SQL Authentication (si activée)

```bash
sqlcmd -S sac-02-sql.database.windows.net \
  -d sac-02AMPSaaSDB \
  -U CloudSAdd5b00f1 \
  -P "VotreMotDePasse"
```

### Tests d'Intégration

Une fois les credentials configurés, lancez les tests :

```bash
# Via Makefile
cd tests
make integration

# Ou via npm
npm run test:integration
```

### Dépannage

#### Erreur "Login failed for user ''"

→ Les variables `SAAS_DB_USER` et `SAAS_DB_PASSWORD` sont vides. Utilisez l'authentification Azure AD ou configurez l'authentification SQL.

#### Erreur "Cannot open server ... requested by the login"

→ Votre IP n'est pas dans les règles firewall. Ajoutez-la avec la commande ci-dessus.

#### Erreur "Azure AD authentication required"

→ Le serveur n'accepte que l'authentification Azure AD. Utilisez Option 1 ci-dessus.

### Ressources

- [Documentation mssql npm package](https://www.npmjs.com/package/mssql)
- [Azure AD Authentication for SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview)
- [Connection String Samples](https://learn.microsoft.com/en-us/azure/azure-sql/database/connect-query-nodejs)

### Contacts

- **Azure AD Admin**: heon@cotechnoe.net
- **Tenant ID**: aba0984a-85a2-4fd4-9ae5-0a45d7efc9d2
- **Subscription ID**: 0f1323ea-0f29-4187-9872-e1cf15d677de
