const sql = require('mssql');
const config = require('../config');

/**
 * Service d'intégration avec le SaaS Accelerator
 * Gère la connexion à la base de données et les opérations liées aux abonnements
 * 
 * Note: L'émission vers Marketplace API est gérée par le SaaS Accelerator Metered Scheduler,
 * pas par ce service. Nous enregistrons seulement l'usage dans MeteredAuditLogs.
 */
class SaaSIntegrationService {
    constructor() {
        this.pool = null;
        this.isInitialized = false;
    }

    /**
     * Initialise la connexion à la base de données SaaS Accelerator
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            const dbConfig = {
                server: config.saas.dbServer,
                database: config.saas.dbName,
                options: {
                    encrypt: true,
                    trustServerCertificate: true, // Required for Azure SQL with Managed Identity
                    enableArithAbort: true,
                    connectTimeout: 30000,
                    requestTimeout: 30000
                },
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30000
                }
            };

            // Support for Managed Identity authentication
            // En mode développement/Playground sans credentials, utiliser Azure AD par défaut
            const hasCredentials = config.saas.dbUser && config.saas.dbPassword;
            const useAzureAD = config.saas.useManagedIdentity || !hasCredentials;
            
            if (useAzureAD) {
                // Use Azure AD Managed Identity authentication
                dbConfig.authentication = {
                    type: 'azure-active-directory-default'
                };
                if (config.saas.debugMode) {
                    console.log('[SaaSIntegration] Using Azure AD authentication (passwordless)');
                }
            } else {
                // Fallback to SQL authentication
                dbConfig.user = config.saas.dbUser;
                dbConfig.password = config.saas.dbPassword;
                if (config.saas.debugMode) {
                    console.log('[SaaSIntegration] Using SQL authentication');
                }
            }

            this.pool = await sql.connect(dbConfig);
            this.isInitialized = true;

            if (config.saas.debugMode) {
                console.log('[SaaSIntegration] Successfully connected to SaaS Accelerator database');
            }
        } catch (error) {
            console.error('[SaaSIntegration] Failed to initialize database connection:', error);
            
            // En mode permissif, ne pas bloquer l'initialisation
            if (config.saas.permissiveMode) {
                console.warn('[SaaSIntegration] Running in permissive mode - continuing without database connection');
                this.isInitialized = false; // Marquer comme non initialisé
                return; // Ne pas lancer l'erreur
            }
            
            throw error;
        }
    }

    /**
     * Récupère une valeur de configuration depuis ApplicationConfiguration
     * @param {string} name - Nom de la configuration
     * @returns {Promise<string|null>} Valeur de la configuration ou null si non trouvée
     */
    async getApplicationConfig(name) {
        try {
            await this.initialize();

            if (!this.isInitialized || !this.pool) {
                console.warn(`[SaaSIntegration] Cannot read config '${name}' - database not initialized`);
                return null;
            }

            const result = await this.pool.request()
                .input('name', sql.NVarChar(50), name)
                .query(`
                    SELECT [Value]
                    FROM [dbo].[ApplicationConfiguration]
                    WHERE [Name] = @name
                `);

            if (result.recordset.length > 0) {
                return result.recordset[0].Value;
            }

            return null;
        } catch (error) {
            console.error(`[SaaSIntegration] Error reading config '${name}':`, error.message);
            return null;
        }
    }

    /**
     * Teste la connexion à la base de données
     * @returns {Promise<Object>} Résultat du test avec version et statut
     */
    async testConnection() {
        try {
            await this.initialize();

            if (!this.isInitialized || !this.pool) {
                return {
                    success: false,
                    error: 'Database connection not initialized',
                    permissiveMode: config.saas.permissiveMode
                };
            }

            const result = await this.pool.request().query('SELECT @@VERSION as Version, CURRENT_USER as CurrentUser');
            
            return {
                success: true,
                version: result.recordset[0].Version,
                currentUser: result.recordset[0].CurrentUser,
                server: config.saas.dbServer,
                database: config.saas.dbName,
                authMethod: config.saas.useManagedIdentity ? 'Managed Identity' : 'SQL Authentication'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stack: config.saas.debugMode ? error.stack : undefined
            };
        }
    }

    /**
     * Récupère l'abonnement actif pour un utilisateur Teams
     * @param {string} teamsUserId - ID utilisateur Teams (activity.from.id)
     * @param {string} tenantId - ID tenant Azure AD (optionnel)
     * @returns {Promise<Object|null>} Abonnement actif ou null si non trouvé
     */
    async getActiveSubscription(teamsUserId, tenantId = null) {
        await this.initialize();

        // Si pas de connexion DB en mode permissif
        if (!this.isInitialized || !this.pool) {
            if (config.saas.permissiveMode) {
                if (config.saas.debugMode) {
                    console.log('[SaaSIntegration] No DB connection - returning null (permissive mode)');
                }
                return null;
            }
            throw new Error('Database connection not initialized');
        }

        try {
            const request = this.pool.request();
            request.input('teamsUserId', sql.NVarChar(255), teamsUserId);

            let query = `
                SELECT 
                    s.Id,
                    s.AMPSubscriptionId,
                    s.Name,
                    s.AMPPlanId,
                    s.AMPQuantity,
                    s.SubscriptionStatus,
                    s.TeamsUserId,
                    s.TenantId,
                    s.TeamsConversationId,
                    s.CreateDate,
                    s.ModifyDate,
                    s.IsActive
                FROM [dbo].[Subscriptions] s
                WHERE s.TeamsUserId = @teamsUserId
                AND s.SubscriptionStatus = 'Subscribed'
                AND s.IsActive = 1
            `;

            if (tenantId) {
                query += ' AND s.TenantId = @tenantId';
                request.input('tenantId', sql.NVarChar(255), tenantId);
            }

            const result = await request.query(query);

            if (result.recordset.length === 0) {
                if (config.saas.debugMode) {
                    console.log(`[SaaSIntegration] No active subscription found for user: ${teamsUserId}`);
                }
                return null;
            }

            const subscription = result.recordset[0];

            if (config.saas.debugMode) {
                console.log(`[SaaSIntegration] Found active subscription: ${subscription.Id} (Plan: ${subscription.AMPPlanId})`);
            }

            // Mapper les noms de colonnes SQL vers camelCase pour compatibilité avec le reste du code
            return {
                id: subscription.Id,
                ampSubscriptionId: subscription.AMPSubscriptionId,
                name: subscription.Name,
                planId: subscription.AMPPlanId,
                quantity: subscription.AMPQuantity,
                saasSubscriptionStatus: subscription.SubscriptionStatus,
                teamsUserId: subscription.TeamsUserId,
                tenantId: subscription.TenantId,
                teamsConversationId: subscription.TeamsConversationId,
                createDate: subscription.CreateDate,
                modifyDate: subscription.ModifyDate,
                isActive: subscription.IsActive
            };
        } catch (error) {
            console.error('[SaaSIntegration] Error getting active subscription:', error);
            throw error;
        }
    }

    /**
     * Enregistre un événement d'usage de message pour facturation metered
     * AVEC AGRÉGATION : Accumule localement, émission groupée horaire
     * 
     * @param {Object} subscription - Abonnement associé
     * @param {Object} messageData - Données du message
     * @returns {Promise<void>}
     */
    async trackMessageUsage(subscription, messageData) {
        await this.initialize();

        // Si pas de connexion DB en mode permissif
        if (!this.isInitialized || !this.pool) {
            if (config.saas.permissiveMode) {
                if (config.saas.debugMode) {
                    console.log('[SaaSIntegration] No DB connection - skipping usage tracking (permissive mode)');
                }
                return; // Ne rien faire en mode permissif
            }
            throw new Error('Database connection not initialized');
        }

        try {
            // Enregistrer l'usage dans MeteredAuditLogs
            // Note: L'émission vers Marketplace API sera faite par le SaaS Accelerator Scheduler
            const request = this.pool.request();

            // Préparer les données pour MeteredAuditLogs
            const requestJson = {
                dimension: messageData.dimension,
                quantity: 1,
                effectiveStartTime: new Date().toISOString(),
                teamsUserIdHash: this.hashUserId(messageData.teamsUserId),
                messageLength: messageData.messageLength || 0,
                hasAttachments: messageData.hasAttachments || false,
                tokenCount: messageData.tokenCount || 0,
                conversationType: messageData.conversationType || '1:1',
                timestamp: messageData.timestamp.toISOString()
            };

            request.input('subscriptionId', sql.Int, subscription.id); // subscription.id est un INT
            request.input('requestJson', sql.NVarChar(sql.MAX), JSON.stringify(requestJson));
            request.input('statusCode', sql.NVarChar(50), '200');
            request.input('createdDate', sql.DateTime2, new Date());
            request.input('createdBy', sql.Int, 0); // 0 = système automatique (pas d'utilisateur KnownUsers)
            request.input('runBy', sql.NVarChar(255), 'Auto-Agent'); // Identifier que c'est l'agent automatique

            const query = `
                INSERT INTO [dbo].[MeteredAuditLogs] 
                (SubscriptionId, RequestJson, StatusCode, CreatedDate, CreatedBy, RunBy)
                VALUES 
                (@subscriptionId, @requestJson, @statusCode, @createdDate, @createdBy, @runBy)
            `;

            await request.query(query);

            if (config.saas.debugMode) {
                console.log(`[SaaSIntegration] Tracked message usage for subscription ${subscription.Id}, dimension: ${messageData.dimension}`);
            }

            // Optionnel: Insertion dans TeamsMessageLogs si activé
            if (config.saas.enableMessageLogs) {
                await this.insertMessageLog(subscription, messageData);
            }
        } catch (error) {
            console.error('[SaaSIntegration] Error tracking message usage:', error);
            // Ne pas propager l'erreur pour ne pas bloquer l'utilisateur
            // L'erreur est loggée mais l'utilisateur a déjà reçu sa réponse
        }
    }

    /**
     * Insère un log détaillé dans TeamsMessageLogs (optionnel)
     * @param {Object} subscription - Abonnement
     * @param {Object} messageData - Données du message
     * @returns {Promise<void>}
     * @private
     */
    async insertMessageLog(subscription, messageData) {
        try {
            const request = this.pool.request();

            request.input('subscriptionId', sql.Int, subscription.id); // subscription.id est un INT
            request.input('teamsUserId', sql.NVarChar(255), messageData.teamsUserId);
            request.input('conversationId', sql.NVarChar(255), messageData.conversationId);
            request.input('tokenCount', sql.Int, messageData.tokenCount || null);
            request.input('dimension', sql.NVarChar(50), messageData.dimension);
            request.input('timestamp', sql.DateTime2, messageData.timestamp);
            request.input('processingTimeMs', sql.Int, messageData.processingTimeMs || null);
            request.input('conversationType', sql.NVarChar(20), messageData.conversationType || '1:1');
            request.input('hasAttachments', sql.Bit, messageData.hasAttachments || false);
            request.input('messageLength', sql.Int, messageData.messageLength || null);

            const query = `
                INSERT INTO [dbo].[TeamsMessageLogs] 
                (SubscriptionId, TeamsUserId, ConversationId, TokenCount, Dimension, 
                 Timestamp, ProcessingTimeMs, ConversationType, HasAttachments, MessageLength)
                VALUES 
                (@subscriptionId, @teamsUserId, @conversationId, @tokenCount, @dimension,
                 @timestamp, @processingTimeMs, @conversationType, @hasAttachments, @messageLength)
            `;

            await request.query(query);

            if (config.saas.debugMode) {
                console.log(`[SaaSIntegration] Inserted detailed message log for subscription ${subscription.Id}`);
            }
        } catch (error) {
            // Si la table n'existe pas encore, logger mais ne pas planter
            console.warn('[SaaSIntegration] Failed to insert message log (table may not exist yet):', error.message);
        }
    }

    /**
     * Vérifie si l'utilisateur a atteint sa limite de messages
     * @param {string} subscriptionId - ID de l'abonnement
     * @param {string} planId - ID du plan
     * @returns {Promise<Object>} Statut des limites
     */
    async checkMessageLimit(subscriptionId, planId) {
        await this.initialize();

        // Si pas de connexion DB en mode permissif
        if (!this.isInitialized || !this.pool) {
            if (config.saas.permissiveMode) {
                if (config.saas.debugMode) {
                    console.log('[SaaSIntegration] No DB connection - allowing message (permissive mode)');
                }
                // Retourner des limites permissives par défaut
                return {
                    allowed: true,
                    used: 0,
                    limit: 10000,
                    remaining: 10000,
                    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
                };
            }
            throw new Error('Database connection not initialized');
        }

        try {
            const monthlyLimit = this.getMonthlyLimitForPlan(planId);

            // Calculer le début du mois actuel
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const request = this.pool.request();
            request.input('subscriptionId', sql.Int, subscriptionId); // subscriptionId est un INT
            request.input('periodStart', sql.DateTime2, periodStart);

            // Compter les messages ce mois via MeteredAuditLogs
            const query = `
                SELECT COUNT(*) as MessageCount
                FROM [dbo].[MeteredAuditLogs]
                WHERE SubscriptionId = @subscriptionId
                AND CreatedDate >= @periodStart
                AND StatusCode = '200'
            `;

            const result = await request.query(query);
            const currentUsage = result.recordset[0].MessageCount;

            const isWithinLimit = monthlyLimit === -1 || currentUsage < monthlyLimit; // -1 = unlimited
            const remaining = monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - currentUsage);

            if (config.saas.debugMode) {
                console.log(`[SaaSIntegration] Limit check: ${currentUsage}/${monthlyLimit} messages used (remaining: ${remaining})`);
            }

            return {
                isWithinLimit,
                currentUsage,
                monthlyLimit,
                remaining,
                planId
            };
        } catch (error) {
            console.error('[SaaSIntegration] Error checking message limit:', error);
            // En cas d'erreur, on assume qu'il est dans sa limite pour ne pas bloquer
            return {
                isWithinLimit: true,
                currentUsage: 0,
                monthlyLimit: -1,
                remaining: -1,
                planId
            };
        }
    }

    /**
     * Récupère les statistiques d'usage pour un abonnement
     * @param {string} subscriptionId - ID de l'abonnement
     * @returns {Promise<Object>} Statistiques d'usage
     */
    async getUsageStats(subscriptionId) {
        await this.initialize();

        try {
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const request = this.pool.request();
            request.input('subscriptionId', sql.Int, subscriptionId); // subscriptionId est un INT
            request.input('periodStart', sql.DateTime2, periodStart);

            const query = `
                SELECT 
                    COUNT(*) as TotalMessages,
                    SUM(CASE WHEN JSON_VALUE(RequestJson, '$.dimension') = 'free' THEN 1 ELSE 0 END) as FreeMessages,
                    SUM(CASE WHEN JSON_VALUE(RequestJson, '$.dimension') = 'pro' THEN 1 ELSE 0 END) as ProMessages,
                    SUM(CASE WHEN JSON_VALUE(RequestJson, '$.dimension') = 'pro-plus' THEN 1 ELSE 0 END) as ProPlusMessages,
                    MAX(CreatedDate) as LastMessageDate
                FROM [dbo].[MeteredAuditLogs]
                WHERE SubscriptionId = @subscriptionId
                AND CreatedDate >= @periodStart
                AND StatusCode = '200'
            `;

            const result = await request.query(query);
            const stats = result.recordset[0];

            return {
                totalMessages: stats.TotalMessages || 0,
                freeMessages: stats.FreeMessages || 0,
                proMessages: stats.ProMessages || 0,
                proPlusMessages: stats.ProPlusMessages || 0,
                periodStart: periodStart,
                lastMessageDate: stats.LastMessageDate
            };
        } catch (error) {
            console.error('[SaaSIntegration] Error getting usage stats:', error);
            throw error;
        }
    }

    /**
     * Récupère la limite mensuelle pour un plan donné
     * @param {string} planId - ID du plan
     * @returns {number} Limite mensuelle (-1 = illimité)
     * @private
     */
    getMonthlyLimitForPlan(planId) {
        const limits = {
            [config.saas.plans.development]: -1, // Illimité
            [config.saas.plans.starter]: config.saas.limits.free,
            [config.saas.plans.professional]: config.saas.limits.pro,
            [config.saas.plans.proPlus]: config.saas.limits.proPlus
        };

        return limits[planId] || config.saas.limits.free; // Par défaut: limite free
    }

    /**
     * Hash un ID utilisateur pour anonymisation (RGPD)
     * @param {string} userId - ID utilisateur Teams
     * @returns {string} Hash SHA256 de l'ID (16 premiers caractères)
     * @private
     */
    hashUserId(userId) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
    }

    /**
     * Teste la procédure stockée sp_LinkTeamsUserToSubscription
     * @param {string} ampSubscriptionId - GUID de l'abonnement AMP
     * @param {string} teamsUserId - ID utilisateur Teams
     * @param {string} conversationId - ID de la conversation Teams
     * @param {string} tenantId - ID du tenant Azure AD
     * @returns {Promise<Object>} Résultat du test
     */
    async testLinkTeamsUser(ampSubscriptionId, teamsUserId, conversationId, tenantId) {
        try {
            await this.initialize();

            if (!this.isInitialized || !this.pool) {
                return {
                    success: false,
                    error: 'Database connection not initialized',
                    permissiveMode: config.saas.permissiveMode
                };
            }

            const request = this.pool.request();
            request.input('AmpSubscriptionId', sql.UniqueIdentifier, ampSubscriptionId);
            request.input('TeamsUserId', sql.NVarChar(255), teamsUserId);
            request.input('ConversationId', sql.NVarChar(255), conversationId);
            request.input('TenantId', sql.NVarChar(255), tenantId);

            await request.execute('sp_LinkTeamsUserToSubscription');

            if (config.saas.debugMode) {
                console.log(`[SaaSIntegration] sp_LinkTeamsUserToSubscription executed successfully`);
            }

            return {
                success: true,
                message: 'Teams user successfully linked to subscription',
                ampSubscriptionId,
                teamsUserId,
                conversationId,
                tenantId
            };
        } catch (error) {
            console.error('[SaaSIntegration] Error testing sp_LinkTeamsUserToSubscription:', error);
            return {
                success: false,
                error: error.message,
                stack: config.saas.debugMode ? error.stack : undefined
            };
        }
    }

    /**
     * Ferme la connexion à la base de données
     * @returns {Promise<void>}
     */
    async close() {
        if (this.pool) {
            await this.pool.close();
            this.isInitialized = false;
            if (config.saas.debugMode) {
                console.log('[SaaSIntegration] Database connection closed');
            }
        }
    }
}

// Export une instance singleton
module.exports = new SaaSIntegrationService();
