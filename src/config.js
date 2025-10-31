const config = {
  MicrosoftAppId: process.env.CLIENT_ID,
  MicrosoftAppType: process.env.BOT_TYPE,
  MicrosoftAppTenantId: process.env.TENANT_ID,
  MicrosoftAppPassword: process.env.CLIENT_SECRET,
  azureOpenAIKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,

  // SaaS Accelerator Integration - Phase 2
  saas: {
    // Database configuration
    dbServer: process.env.SAAS_DB_SERVER || 'sac-02-sql.database.windows.net',
    dbName: process.env.SAAS_DB_NAME || 'sac-02AMPSaaSDB',
    dbUser: process.env.SAAS_DB_USER,
    dbPassword: process.env.SAAS_DB_PASSWORD,
    useManagedIdentity: process.env.SAAS_DB_USE_MANAGED_IDENTITY === 'true',
    
    // Metered dimensions (aligned with Partner Center)
    dimensions: {
      free: process.env.SAAS_DIMENSION_FREE || 'free',
      pro: process.env.SAAS_DIMENSION_PRO || 'pro',
      proPlus: process.env.SAAS_DIMENSION_PRO_PLUS || 'pro-plus'
    },
    
    // Monthly message limits per plan
    limits: {
      free: parseInt(process.env.SAAS_LIMIT_FREE) || 50,
      pro: parseInt(process.env.SAAS_LIMIT_PRO) || 300,
      proPlus: parseInt(process.env.SAAS_LIMIT_PRO_PLUS) || 1500
    },
    
    // Cost per message by dimension (for display purposes)
    costs: {
      free: parseFloat(process.env.SAAS_COST_FREE) || 0.02,
      pro: parseFloat(process.env.SAAS_COST_PRO) || 0.015,
      proPlus: parseFloat(process.env.SAAS_COST_PRO_PLUS) || 0.01
    },
    
    // Plan IDs (must match Partner Center configuration)
    plans: {
      development: process.env.SAAS_PLAN_DEVELOPMENT || 'development',
      starter: process.env.SAAS_PLAN_STARTER || 'starter',
      professional: process.env.SAAS_PLAN_PROFESSIONAL || 'professional',
      proPlus: process.env.SAAS_PLAN_PRO_PLUS || 'pro-plus'
    },
    
    // Feature flags
    enableMessageLogs: process.env.SAAS_ENABLE_MESSAGE_LOGS === 'true',
    debugMode: process.env.SAAS_DEBUG_MODE === 'true',
    permissiveMode: process.env.SAAS_PERMISSIVE_MODE === 'true',
    enableSubscriptionCheck: process.env.SAAS_ENABLE_SUBSCRIPTION_CHECK !== 'false', // Enabled by default
    enableUsageTracking: process.env.SAAS_ENABLE_USAGE_TRACKING !== 'false', // Enabled by default
    blockNoSubscription: process.env.SAAS_BLOCK_NO_SUBSCRIPTION === 'true',
    
    // URLs
    portalUrl: process.env.SAAS_PORTAL_URL || 'https://sac-02-portal.azurewebsites.net',
    adminUrl: process.env.SAAS_ADMIN_URL || 'https://sac-02-admin.azurewebsites.net'
  },

  // Azure Marketplace Metering Service API - Phase 2.5
  marketplace: {
    // Enable/disable metering API calls (set to false for development/testing)
    enabled: process.env.MARKETPLACE_METERING_ENABLED === 'true',
    
    // Azure AD authentication for Marketplace API
    tenantId: process.env.MARKETPLACE_METERING_TENANT_ID || process.env.TENANT_ID,
    clientId: process.env.MARKETPLACE_METERING_CLIENT_ID || process.env.CLIENT_ID,
    clientSecret: process.env.MARKETPLACE_METERING_CLIENT_SECRET || process.env.CLIENT_SECRET,
    
    // Marketplace Metering Service API endpoint
    meteringApiUrl: process.env.MARKETPLACE_METERING_API_URL || 'https://marketplaceapi.microsoft.com/api/usageEvent?api-version=2018-08-31',
    
    // Retry configuration
    retryMax: parseInt(process.env.MARKETPLACE_METERING_RETRY_MAX) || 3,
    retryDelay: parseInt(process.env.MARKETPLACE_METERING_RETRY_DELAY) || 1000, // ms
    
    // Resource ID scope (default to Marketplace API)
    resourceId: process.env.MARKETPLACE_METERING_RESOURCE_ID || '20e940b3-4c77-4b0b-9a53-9e16a1b010a7'
  }
};

module.exports = config;
