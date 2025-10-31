const config = require('../config');

/**
 * Service de classification des messages pour déterminer la dimension metered
 */
class MessageClassifier {
    /**
     * Détermine la dimension de facturation pour un message
     * Basé sur le plan de l'abonnement et les règles métier
     * 
     * @param {Object} messageData - Données du message
     * @param {Object} subscription - Abonnement de l'utilisateur
     * @returns {string} Dimension metered ('free', 'pro', ou 'pro-plus')
     */
    classifyMessage(messageData, subscription) {
        // Mapping des plans vers les dimensions configurées dans Partner Center
        const planDimensions = {
            [config.saas.plans.development]: config.saas.dimensions.free,
            [config.saas.plans.starter]: config.saas.dimensions.free,
            [config.saas.plans.professional]: config.saas.dimensions.pro,
            [config.saas.plans.proPlus]: config.saas.dimensions.proPlus
        };

        const dimension = planDimensions[subscription.PlanId] || config.saas.dimensions.free;

        if (config.saas.debugMode) {
            console.log(`[MessageClassifier] Plan ${subscription.PlanId} → Dimension: ${dimension}`);
        }

        return dimension;
    }

    /**
     * Récupère les métadonnées d'un message pour analyse
     * 
     * @param {Object} messageData - Données du message
     * @returns {Object} Métadonnées de classification
     */
    getMessageMetadata(messageData) {
        const hasAttachments = (messageData.attachments && messageData.attachments.length > 0) || false;
        const messageLength = messageData.text ? messageData.text.length : 0;
        const isLongMessage = messageLength > 1000;
        const tokenCount = messageData.tokens || 0;
        
        // Déterminer le type de conversation
        let conversationType = '1:1';
        if (messageData.conversationId) {
            if (messageData.conversationId.includes('group') || 
                messageData.conversationId.includes('meeting') ||
                messageData.conversationId.includes('channel')) {
                conversationType = 'group';
            }
        }

        const metadata = {
            hasAttachments,
            isLongMessage,
            messageLength,
            tokenCount,
            conversationType
        };

        if (config.saas.debugMode) {
            console.log('[MessageClassifier] Message metadata:', JSON.stringify(metadata));
        }

        return metadata;
    }

    /**
     * Vérifie si un message nécessite un traitement premium
     * (pour extension future si on veut des dimensions différentes par type de message)
     * 
     * @param {Object} messageData - Données du message
     * @returns {boolean} True si le message est considéré premium
     */
    isPremiumMessage(messageData) {
        // Critères pour message premium (extension future)
        const metadata = this.getMessageMetadata(messageData);
        
        // Pour l'instant, tous les messages sont traités selon leur plan
        // Mais on pourrait ajouter des règles comme:
        // - Messages avec pièces jointes = premium
        // - Messages > 1000 caractères = premium
        // - etc.
        
        return metadata.hasAttachments || metadata.isLongMessage;
    }

    /**
     * Calcule le coût estimé d'un message basé sur la dimension
     * (pour affichage à l'utilisateur)
     * 
     * @param {string} dimension - Dimension metered
     * @returns {number} Coût en dollars
     */
    getMessageCost(dimension) {
        const costs = {
            [config.saas.dimensions.free]: config.saas.costs.free,
            [config.saas.dimensions.pro]: config.saas.costs.pro,
            [config.saas.dimensions.proPlus]: config.saas.costs.proPlus
        };

        return costs[dimension] || 0;
    }

    /**
     * Obtient les informations détaillées sur une dimension
     * 
     * @param {string} dimension - Dimension metered
     * @returns {Object} Informations sur la dimension
     */
    getDimensionInfo(dimension) {
        const info = {
            [config.saas.dimensions.free]: {
                name: 'Free Tier',
                description: 'Plan Starter - 50 messages inclus',
                limit: config.saas.limits.free,
                cost: config.saas.costs.free
            },
            [config.saas.dimensions.pro]: {
                name: 'Professional',
                description: 'Plan Professional - 300 messages inclus',
                limit: config.saas.limits.pro,
                cost: config.saas.costs.pro
            },
            [config.saas.dimensions.proPlus]: {
                name: 'Pro Plus',
                description: 'Plan Pro Plus - 1500 messages inclus',
                limit: config.saas.limits.proPlus,
                cost: config.saas.costs.proPlus
            }
        };

        return info[dimension] || info[config.saas.dimensions.free];
    }
}

// Export une instance singleton
module.exports = new MessageClassifier();
