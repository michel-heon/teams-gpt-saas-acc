/**
 * Azure Marketplace Metering Service API Client
 * 
 * This service handles communication with the Azure Marketplace Metering Service API
 * to report usage events for metered billing. The app PUSHES usage events via API,
 * and Azure Marketplace calculates billing based on these events.
 * 
 * MeteredAuditLogs table is used ONLY for local audit/history, NOT as billing source.
 * 
 * @see https://learn.microsoft.com/en-us/azure/marketplace/marketplace-metering-service-apis
 * @see https://learn.microsoft.com/en-us/azure/marketplace/marketplace-metering-service-authentication
 */

const axios = require('axios');
const sql = require('mssql');
const config = require('../config');

class MeteringApiService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.isInitialized = false;
        
        // API endpoints
        this.authUrl = `https://login.microsoftonline.com/${config.marketplace.tenantId}/oauth2/token`;
        this.meteringApiUrl = config.marketplace.meteringApiUrl || 'https://marketplaceapi.microsoft.com/api/usageEvent?api-version=2018-08-31';
        
        // Retry configuration
        this.maxRetries = config.marketplace.retryMax || 3;
        this.retryDelay = config.marketplace.retryDelay || 1000; // ms
        
        // Plan to dimension mapping
        this.dimensionMap = {
            'development': null,      // No tracking for development plan
            'starter': 'free',        // Free tier dimension
            'professional': 'pro',    // Pro tier dimension
            'pro-plus': 'pro-plus'    // Pro Plus tier dimension
        };
    }

    /**
     * Initialize the service (validate configuration)
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('[MeteringApiService] Initializing...');

        // Check if metering is enabled in the database (SaaS Accelerator pattern)
        const saasIntegration = require('./saasIntegration');
        const isEnabledInDB = await saasIntegration.getApplicationConfig('IsMeteredBillingEnabled');
        
        if (isEnabledInDB) {
            const enabled = isEnabledInDB.toLowerCase() === 'true';
            console.log(`[MeteringApiService] IsMeteredBillingEnabled from DB: ${isEnabledInDB} → ${enabled}`);
            
            if (!enabled) {
                console.log('[MeteringApiService] Marketplace metering is DISABLED in database (ApplicationConfiguration)');
                this.isInitialized = true;
                return;
            }
        } else {
            // Fallback to environment variable if DB config not found
            console.log('[MeteringApiService] IsMeteredBillingEnabled not found in DB, using environment variable');
            if (!config.marketplace.enabled) {
                console.log('[MeteringApiService] Marketplace metering is DISABLED via config');
                this.isInitialized = true;
                return;
            }
        }

        console.log('[MeteringApiService] ✅ Marketplace metering is ENABLED');

        const requiredConfig = [
            'tenantId',
            'clientId',
            'clientSecret'
        ];

        const missingConfig = requiredConfig.filter(key => !config.marketplace[key]);
        
        if (missingConfig.length > 0) {
            throw new Error(`[MeteringApiService] Missing required configuration: ${missingConfig.join(', ')}`);
        }

        console.log('[MeteringApiService] Configuration validated');
        console.log(`[MeteringApiService] Auth URL: ${this.authUrl}`);
        console.log(`[MeteringApiService] Metering API URL: ${this.meteringApiUrl}`);
        
        this.isInitialized = true;
    }

    /**
     * Get Azure AD access token using client credentials flow
     * Tokens are cached and refreshed when expired
     */
    async getAccessToken() {
        // Check if we have a valid cached token
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            if (config.saas.debugMode) {
                console.log('[MeteringApiService] Using cached access token');
            }
            return this.accessToken;
        }

        console.log('[MeteringApiService] Requesting new access token...');

        try {
            const response = await axios.post(
                this.authUrl,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: config.marketplace.clientId,
                    client_secret: config.marketplace.clientSecret,
                    resource: '20e940b3-4c77-4b0b-9a53-9e16a1b010a7' // Marketplace API resource ID
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            const expiresIn = parseInt(response.data.expires_in) || 3600;
            // Set expiry with 5 minute buffer
            this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);

            console.log(`[MeteringApiService] Access token obtained (expires in ${expiresIn}s)`);
            return this.accessToken;
            
        } catch (error) {
            console.error('[MeteringApiService] Failed to get access token:', error.message);
            if (error.response) {
                console.error('[MeteringApiService] Auth error response:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }
            throw new Error(`Failed to authenticate with Azure AD: ${error.message}`);
        }
    }

    /**
     * Map plan ID to dimension for metering
     */
    getDimensionForPlan(planId) {
        if (!planId) {
            return null;
        }
        
        const dimension = this.dimensionMap[planId.toLowerCase()];
        
        if (config.saas.debugMode) {
            console.log(`[MeteringApiService] Plan "${planId}" maps to dimension "${dimension || 'null (no tracking)'}"`);
        }
        
        return dimension;
    }

    /**
     * Validate usage event data before sending
     */
    validateUsageData(usageData) {
        const required = ['resourceId', 'quantity', 'dimension', 'effectiveStartTime', 'planId'];
        const missing = required.filter(field => !usageData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Validate resourceId is a GUID
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!guidRegex.test(usageData.resourceId)) {
            throw new Error(`Invalid resourceId format: ${usageData.resourceId}`);
        }

        // Validate quantity is positive
        if (usageData.quantity <= 0) {
            throw new Error(`Quantity must be greater than 0: ${usageData.quantity}`);
        }

        // Validate effectiveStartTime is not too old (max 24 hours)
        const eventTime = new Date(usageData.effectiveStartTime);
        const now = new Date();
        const hoursDiff = (now - eventTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            throw new Error(`effectiveStartTime is more than 24 hours in the past: ${usageData.effectiveStartTime}`);
        }

        return true;
    }

    /**
     * Emit usage event to Azure Marketplace Metering Service API
     * 
     * @param {Object} usageData - Usage event data
     * @param {string} usageData.resourceId - AMPSubscriptionId (GUID)
     * @param {number} usageData.quantity - Number of units consumed (always 1 for message)
     * @param {string} usageData.dimension - Dimension identifier (free, pro, pro-plus)
     * @param {string} usageData.effectiveStartTime - ISO 8601 timestamp when usage occurred
     * @param {string} usageData.planId - Plan identifier (starter, professional, pro-plus)
     * @param {Object} context - Additional context for logging
     * @returns {Object} API response with usageEventId, status, etc.
     */
    async emitUsageEvent(usageData, context = {}) {
        await this.initialize();

        // Check if metering is enabled
        if (!config.marketplace.enabled) {
            if (config.saas.debugMode) {
                console.log('[MeteringApiService] Metering disabled, skipping API call');
            }
            return { skipped: true, reason: 'metering_disabled' };
        }

        // Validate usage data
        try {
            this.validateUsageData(usageData);
        } catch (error) {
            console.error('[MeteringApiService] Validation error:', error.message);
            throw error;
        }

        console.log('[MeteringApiService] Emitting usage event:', {
            resourceId: usageData.resourceId,
            dimension: usageData.dimension,
            planId: usageData.planId,
            quantity: usageData.quantity,
            effectiveStartTime: usageData.effectiveStartTime
        });

        let lastError = null;
        let attempt = 0;

        // Retry loop with exponential backoff
        while (attempt < this.maxRetries) {
            attempt++;
            
            try {
                const token = await this.getAccessToken();

                const response = await axios.post(
                    this.meteringApiUrl,
                    usageData,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'x-ms-requestid': context.requestId || this.generateRequestId(),
                            'x-ms-correlationid': context.correlationId || this.generateCorrelationId()
                        },
                        timeout: 30000 // 30 second timeout
                    }
                );

                console.log('[MeteringApiService] Usage event accepted:', {
                    usageEventId: response.data.usageEventId,
                    status: response.data.status,
                    dimension: response.data.dimension,
                    quantity: response.data.quantity
                });

                // Audit successful emission
                await this.auditUsageEvent(usageData, response.data, 200, 'API');

                return response.data;

            } catch (error) {
                lastError = error;
                const shouldRetry = await this.handleApiError(error, attempt, usageData);
                
                if (!shouldRetry) {
                    // Audit failed emission
                    await this.auditUsageEvent(
                        usageData,
                        error.response?.data || { error: error.message },
                        error.response?.status || 0,
                        'API'
                    );
                    throw error;
                }

                // Exponential backoff: 1s, 2s, 4s, etc.
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                console.log(`[MeteringApiService] Retrying in ${delay}ms... (attempt ${attempt}/${this.maxRetries})`);
                await this.sleep(delay);
            }
        }

        // All retries exhausted
        console.error(`[MeteringApiService] All ${this.maxRetries} retry attempts exhausted`);
        
        // Audit final failure
        await this.auditUsageEvent(
            usageData,
            lastError.response?.data || { error: lastError.message },
            lastError.response?.status || 0,
            'API'
        );
        
        throw lastError;
    }

    /**
     * Handle API errors and determine if retry is appropriate
     * @returns {boolean} true if should retry, false otherwise
     */
    async handleApiError(error, attempt, usageData) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        console.error(`[MeteringApiService] API error (attempt ${attempt}):`, {
            status,
            message: error.message,
            data: errorData
        });

        // 400 Bad Request - Don't retry, invalid data
        if (status === 400) {
            console.error('[MeteringApiService] Bad request - invalid usage data:', errorData);
            return false;
        }

        // 401 Unauthorized - Clear token and retry
        if (status === 401) {
            console.log('[MeteringApiService] Unauthorized - clearing cached token');
            this.accessToken = null;
            this.tokenExpiry = null;
            return true;
        }

        // 403 Forbidden - Don't retry, insufficient permissions
        if (status === 403) {
            console.error('[MeteringApiService] Forbidden - insufficient permissions');
            return false;
        }

        // 409 Conflict - Duplicate event, consider as success
        if (status === 409) {
            console.warn('[MeteringApiService] Duplicate usage event detected:', {
                resourceId: usageData.resourceId,
                dimension: usageData.dimension,
                effectiveStartTime: usageData.effectiveStartTime
            });
            
            // Extract accepted message from error if available
            const acceptedMessage = errorData?.additionalInfo?.acceptedMessage;
            if (acceptedMessage) {
                console.log('[MeteringApiService] Original event was accepted:', acceptedMessage);
            }
            
            // Don't retry, but treat as success
            return false;
        }

        // 429 Rate Limit - Retry with backoff
        if (status === 429) {
            console.warn('[MeteringApiService] Rate limit exceeded - will retry');
            return true;
        }

        // 5xx Server Error - Retry
        if (status >= 500) {
            console.warn('[MeteringApiService] Server error - will retry');
            return true;
        }

        // Network errors - Retry
        if (!status) {
            console.warn('[MeteringApiService] Network error - will retry');
            return true;
        }

        // Unknown error - Don't retry
        return false;
    }

    /**
     * Audit usage event to MeteredAuditLogs table (for local history only)
     */
    async auditUsageEvent(requestData, responseData, statusCode, runBy = 'API') {
        // Skip audit if database not configured
        if (!config.saas.enableUsageTracking) {
            return;
        }

        try {
            const pool = await sql.connect(config.database);

            await pool.request()
                .input('SubscriptionId', sql.Int, null) // Will be set by FK lookup if needed
                .input('RequestJson', sql.NVarChar, JSON.stringify(requestData))
                .input('ResponseJson', sql.NVarChar, JSON.stringify(responseData))
                .input('StatusCode', sql.VarChar, statusCode.toString())
                .input('RunBy', sql.VarChar, runBy)
                .input('CreatedDate', sql.DateTime, new Date())
                .input('CreatedBy', sql.Int, 0) // System-generated
                .input('SubscriptionUsageDate', sql.DateTime, new Date())
                .query(`
                    INSERT INTO MeteredAuditLogs (
                        SubscriptionId, RequestJson, ResponseJson, StatusCode,
                        RunBy, CreatedDate, CreatedBy, SubscriptionUsageDate
                    ) VALUES (
                        @SubscriptionId, @RequestJson, @ResponseJson, @StatusCode,
                        @RunBy, @CreatedDate, @CreatedBy, @SubscriptionUsageDate
                    )
                `);

            if (config.saas.debugMode) {
                console.log('[MeteringApiService] Usage event audited to MeteredAuditLogs');
            }

        } catch (error) {
            // Log error but don't throw - audit failure shouldn't break usage tracking
            console.error('[MeteringApiService] Failed to audit usage event:', error.message);
        }
    }

    /**
     * Helper: Generate request ID (GUID)
     */
    generateRequestId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Helper: Generate correlation ID (GUID)
     */
    generateCorrelationId() {
        return this.generateRequestId();
    }

    /**
     * Helper: Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test connection to Marketplace Metering API
     * This does NOT emit actual usage, just validates auth
     */
    async testConnection() {
        console.log('[MeteringApiService] Testing connection...');

        try {
            await this.initialize();
            const token = await this.getAccessToken();
            
            console.log('[MeteringApiService] ✓ Authentication successful');
            console.log(`[MeteringApiService] ✓ Token obtained (length: ${token.length})`);
            console.log('[MeteringApiService] ✓ Connection test passed');
            
            return true;
        } catch (error) {
            console.error('[MeteringApiService] ✗ Connection test failed:', error.message);
            throw error;
        }
    }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of MeteringApiService
 */
function getInstance() {
    if (!instance) {
        instance = new MeteringApiService();
    }
    return instance;
}

module.exports = {
    MeteringApiService,
    getInstance
};
