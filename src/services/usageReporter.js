const config = require('../config');

/**
 * Service de rapportage d'usage pour la facturation metered
 * Formate et envoie les données d'usage vers MeteredAuditLogs
 */
class UsageReporter {
    /**
     * Enregistre un événement d'usage dans MeteredAuditLogs
     * 
     * @param {string} subscriptionId - ID de l'abonnement
     * @param {string} dimension - Dimension metered (free, pro, pro-plus)
     * @param {number} quantity - Quantité (toujours 1 pour les messages)
     * @param {Object} metadata - Métadonnées additionnelles
     * @returns {Object} Données formatées pour insertion
     */
    async reportUsage(subscriptionId, dimension, quantity, metadata) {
        try {
            // Valider les paramètres
            this.validateUsageParams(subscriptionId, dimension, quantity);

            // Formatter les données selon le schéma MeteredAuditLogs
            const usageLog = this.formatUsageLog({
                subscriptionId,
                dimension,
                quantity,
                timestamp: metadata.timestamp || new Date(),
                teamsUserId: metadata.teamsUserId,
                conversationId: metadata.conversationId,
                messageLength: metadata.messageLength,
                hasAttachments: metadata.hasAttachments,
                tokenCount: metadata.tokenCount,
                conversationType: metadata.conversationType,
                processingTimeMs: metadata.processingTimeMs
            });

            if (config.saas.debugMode) {
                console.log('[UsageReporter] Usage log formatted:', JSON.stringify({
                    subscriptionId,
                    dimension,
                    quantity
                }));
            }

            return usageLog;
        } catch (error) {
            console.error('[UsageReporter] Error reporting usage:', error);
            throw error;
        }
    }

    /**
     * Formate les données pour MeteredAuditLogs selon le schéma SaaS Accelerator
     * 
     * @param {Object} params - Paramètres d'usage
     * @returns {Object} Objet formatté pour insertion
     */
    formatUsageLog(params) {
        // Anonymiser l'ID utilisateur pour RGPD
        const userIdHash = this.hashUserId(params.teamsUserId);

        // Structure conforme au schéma MeteredAuditLogs
        const requestJson = {
            dimension: params.dimension,
            quantity: params.quantity,
            effectiveStartTime: params.timestamp.toISOString(),
            // Données anonymisées pour RGPD
            teamsUserIdHash: userIdHash,
            messageLength: params.messageLength || 0,
            hasAttachments: params.hasAttachments || false,
            tokenCount: params.tokenCount || 0,
            conversationType: params.conversationType || '1:1',
            timestamp: params.timestamp.toISOString()
            // PAS de contenu de message pour respecter la confidentialité
        };

        return {
            subscriptionId: params.subscriptionId,
            requestJson: JSON.stringify(requestJson),
            statusCode: '200',
            createdDate: new Date(),
            // Le champ ResponseJson sera peuplé par MeteredTriggerJob après rapportage
            teamsUserId: params.teamsUserId, // Pour TeamsMessageLogs si activé
            conversationId: params.conversationId,
            dimension: params.dimension,
            timestamp: params.timestamp,
            processingTimeMs: params.processingTimeMs,
            hasAttachments: params.hasAttachments,
            messageLength: params.messageLength,
            tokenCount: params.tokenCount,
            conversationType: params.conversationType
        };
    }

    /**
     * Valide les paramètres d'usage avant traitement
     * 
     * @param {string} subscriptionId - ID de l'abonnement
     * @param {string} dimension - Dimension metered
     * @param {number} quantity - Quantité
     * @throws {Error} Si les paramètres sont invalides
     * @private
     */
    validateUsageParams(subscriptionId, dimension, quantity) {
        if (!subscriptionId) {
            throw new Error('subscriptionId is required');
        }

        if (!dimension) {
            throw new Error('dimension is required');
        }

        // Vérifier que la dimension est valide
        const validDimensions = [
            config.saas.dimensions.free,
            config.saas.dimensions.pro,
            config.saas.dimensions.proPlus
        ];

        if (!validDimensions.includes(dimension)) {
            throw new Error(`Invalid dimension: ${dimension}. Valid dimensions are: ${validDimensions.join(', ')}`);
        }

        if (typeof quantity !== 'number' || quantity <= 0) {
            throw new Error('quantity must be a positive number');
        }
    }

    /**
     * Hash un ID utilisateur pour anonymisation (RGPD)
     * 
     * @param {string} userId - ID utilisateur Teams
     * @returns {string} Hash SHA256 de l'ID (16 premiers caractères)
     * @private
     */
    hashUserId(userId) {
        if (!userId) {
            return 'anonymous';
        }

        const crypto = require('crypto');
        return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
    }

    /**
     * Crée un rapport d'usage pour plusieurs messages (batch)
     * Utile pour les tests ou le rapportage groupé
     * 
     * @param {Array} usageEvents - Tableau d'événements d'usage
     * @returns {Array} Tableau de logs formatés
     */
    async reportBatchUsage(usageEvents) {
        const formattedLogs = [];

        for (const event of usageEvents) {
            try {
                const log = await this.reportUsage(
                    event.subscriptionId,
                    event.dimension,
                    event.quantity,
                    event.metadata
                );
                formattedLogs.push(log);
            } catch (error) {
                console.error('[UsageReporter] Error in batch item:', error);
                // Continuer avec les autres événements même si un échoue
            }
        }

        if (config.saas.debugMode) {
            console.log(`[UsageReporter] Batch processed: ${formattedLogs.length}/${usageEvents.length} events`);
        }

        return formattedLogs;
    }

    /**
     * Calcule les statistiques d'usage à partir d'un tableau de logs
     * 
     * @param {Array} usageLogs - Tableau de logs d'usage
     * @returns {Object} Statistiques agrégées
     */
    calculateUsageStats(usageLogs) {
        const stats = {
            totalMessages: 0,
            byDimension: {
                [config.saas.dimensions.free]: 0,
                [config.saas.dimensions.pro]: 0,
                [config.saas.dimensions.proPlus]: 0
            },
            totalCost: 0,
            averageMessageLength: 0,
            averageTokenCount: 0,
            messagesWithAttachments: 0,
            conversationTypes: {
                '1:1': 0,
                'group': 0
            }
        };

        let totalMessageLength = 0;
        let totalTokenCount = 0;

        for (const log of usageLogs) {
            stats.totalMessages++;

            // Extraire les données du requestJson
            const requestData = typeof log.requestJson === 'string' 
                ? JSON.parse(log.requestJson) 
                : log.requestJson;

            // Compter par dimension
            if (stats.byDimension.hasOwnProperty(requestData.dimension)) {
                stats.byDimension[requestData.dimension]++;
            }

            // Calculer le coût total
            const dimensionCost = this.getDimensionCost(requestData.dimension);
            stats.totalCost += dimensionCost;

            // Statistiques de message
            totalMessageLength += requestData.messageLength || 0;
            totalTokenCount += requestData.tokenCount || 0;

            if (requestData.hasAttachments) {
                stats.messagesWithAttachments++;
            }

            // Type de conversation
            const convType = requestData.conversationType || '1:1';
            if (stats.conversationTypes.hasOwnProperty(convType)) {
                stats.conversationTypes[convType]++;
            }
        }

        // Calculer les moyennes
        if (stats.totalMessages > 0) {
            stats.averageMessageLength = Math.round(totalMessageLength / stats.totalMessages);
            stats.averageTokenCount = Math.round(totalTokenCount / stats.totalMessages);
        }

        return stats;
    }

    /**
     * Récupère le coût pour une dimension donnée
     * 
     * @param {string} dimension - Dimension metered
     * @returns {number} Coût en dollars
     * @private
     */
    getDimensionCost(dimension) {
        const costs = {
            [config.saas.dimensions.free]: config.saas.costs.free,
            [config.saas.dimensions.pro]: config.saas.costs.pro,
            [config.saas.dimensions.proPlus]: config.saas.costs.proPlus
        };

        return costs[dimension] || 0;
    }
}

// Export une instance singleton
module.exports = new UsageReporter();
