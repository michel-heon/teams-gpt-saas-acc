// ============================================================================
// SQL Permissions Configuration for Bot Managed Identity
// ============================================================================
// This Bicep file must be deployed to the SaaS Accelerator resource group
// (rg-saasaccel-teams-gpt-02) where the SQL Server resides
//
// Deployment command:
//   az deployment group create \
//     --resource-group rg-saasaccel-teams-gpt-02 \
//     --template-file infra/sql-permissions.bicep \
//     --parameters infra/azure.parameters.sql-permissions.json
//
// GAP Resolution:
// - GAP #1: Adds firewall rules for Bot App Service outbound IPs
// - GAP #3: Prepares infrastructure for Managed Identity SQL permissions
//
// Note: SQL user creation requires T-SQL execution (see ../db/migrations/003-bot-managed-identity.sql)
// ============================================================================

targetScope = 'resourceGroup'

@description('Name of the existing SQL Server in this resource group')
param sqlServerName string

@description('Bot outbound IP addresses (comma-separated, from Bot App Service)')
param botOutboundIpAddresses string

@description('Bot Managed Identity Principal ID')
param botManagedIdentityPrincipalId string

@description('Bot Managed Identity Name (for reference)')
param botManagedIdentityName string

// Reference existing SQL Server in current resource group
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' existing = {
  name: sqlServerName
}

// ============================================================================
// Firewall Rules for Bot App Service Outbound IPs
// ============================================================================

// Parse IP addresses from parameter
var ipList = split(botOutboundIpAddresses, ',')

// Create firewall rules for each Bot IP
resource botFirewallRules 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = [for (ip, index) in ipList: {
  parent: sqlServer
  name: 'AllowBotAppService-IP-${index}'
  properties: {
    startIpAddress: trim(ip)
    endIpAddress: trim(ip)
  }
}]

// ============================================================================
// Azure Services Access (ensure it exists)
// ============================================================================

resource allowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAllWindowsAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ============================================================================
// Outputs
// ============================================================================

output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlServerName string = sqlServer.name
output botManagedIdentityPrincipalId string = botManagedIdentityPrincipalId
output botManagedIdentityName string = botManagedIdentityName
output firewallRulesCreated int = length(ipList)
output nextSteps string = 'Execute db/migrations/003-bot-managed-identity.sql to create SQL user'
