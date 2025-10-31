/**
 * Middleware de tracking d'usage des messages
 * Enregistre chaque message pour facturation Azure Marketplace (metered billing)
 * 
 * IMPORTANT: Ce middleware ne BLOQUE JAMAIS les messages.
 * Il enregistre uniquement l'usage pour facturation via l'API Azure Marketplace.
 * La limite de messages est gérée par Azure Marketplace, pas par l'application.
 */

const saasIntegration = require('../services/saasIntegration');
const messageClassifier = require('../services/messageClassifier');
const usageReporter = require('../services/usageReporter');
const config = require('../config');

/**
 * Middleware qui track l'usage des messages pour facturation Azure Marketplace
 * Doit être appelé APRÈS subscriptionCheckMiddleware
 * @param {Object} context - Le contexte du middleware {send, activity, subscription, ...}
 * @param {Function} next - La fonction next pour continuer le pipeline
 */
async function usageTrackingMiddleware(context, next) {
  const { activity, subscription } = context;
  
  try {
    // Si pas d'abonnement ou tracking désactivé, continuer sans tracking
    if (!subscription || !config.saas.enableUsageTracking) {
      if (config.saas.debugMode) {
        console.log('[UsageTracking] No subscription or tracking disabled, skipping usage tracking');
      }
      return await next();
    }
    
    const subscriptionId = subscription.id;
    
    if (config.saas.debugMode) {
      console.log(`[UsageTracking] Processing message for subscription: ${subscriptionId}`);
    }
    
    // 1. Classifier le message (free, pro, pro-plus)
    const dimension = messageClassifier.classifyMessage(activity, subscription);
    const metadata = messageClassifier.getMessageMetadata(activity);
    const isPremium = messageClassifier.isPremiumMessage(activity);
    
    if (config.saas.debugMode) {
      console.log(`[UsageTracking] Message classified:`, {
        dimension,
        isPremium,
        tokenCount: metadata.tokenCount,
        conversationType: metadata.conversationType
      });
    }
    
    // 2. Attacher les informations de tracking au contexte
    context.usageTracking = {
      subscriptionId,
      dimension,
      metadata,
      isPremium,
      startTime: Date.now()
    };
    
    // 3. Continuer vers le handler du message (traitement OpenAI)
    // IMPORTANT: On ne bloque JAMAIS avant le traitement
    await next();
    
    // 4. APRÈS le traitement réussi, enregistrer l'usage
    const processingTime = Date.now() - context.usageTracking.startTime;
    
    try {
      // Track dans la base de données et émettre vers Azure Marketplace API
      await saasIntegration.trackMessageUsage(
        subscriptionId,
        dimension,
        1, // quantity = 1 message
        {
          ...metadata,
          processingTime,
          conversationId: activity.conversation.id,
          userId: activity.from.aadObjectId || activity.from.id,
          timestamp: new Date()
        }
      );
      
      // Report pour les logs formatés (RGPD-compliant)
      await usageReporter.reportUsage(
        subscriptionId,
        dimension,
        1,
        {
          ...metadata,
          processingTime,
          userId: activity.from.aadObjectId || activity.from.id
        }
      );
      
      if (config.saas.debugMode) {
        console.log(`[UsageTracking] ✅ Usage tracked successfully:`, {
          subscriptionId,
          dimension,
          processingTime: `${processingTime}ms`
        });
      }
      
    } catch (trackingError) {
      // Erreur lors du tracking: logger mais ne JAMAIS bloquer l'utilisateur
      console.error('[UsageTracking] Error tracking usage (non-blocking):', trackingError);
      
      // Ne pas informer l'utilisateur - le tracking est transparent
      // L'admin sera alerté via les logs centralisés
    }
    
  } catch (error) {
    console.error('[UsageTracking] Critical error:', error);
    
    // Toujours continuer en mode permissif - le tracking ne doit jamais bloquer
    console.warn('[UsageTracking] Error occurred but continuing (usage tracking is non-blocking)...');
    
    // Si next() n'a pas encore été appelé (erreur avant le traitement)
    if (!context.usageTracking || !context.usageTracking.startTime) {
      await next();
    }
  }
}


/**
 * Fonction helper pour obtenir les statistiques d'usage d'un utilisateur
 * @param {string} subscriptionId - L'ID de l'abonnement
 * @param {string} dimension - La dimension à vérifier (optionnel)
 * @returns {Promise<Object>} Statistiques d'usage depuis MeteredAuditLogs
 */
async function getUsageStats(subscriptionId, dimension = null) {
  try {
    // Cette fonction interroge seulement les logs d'audit locaux
    // Elle ne représente PAS les limites ou la facturation réelle
    // Pour la facturation réelle, consulter Azure Marketplace Portal
    
    if (dimension) {
      // Obtenir les stats pour une dimension spécifique depuis les logs
      const stats = await saasIntegration.getUsageStatsFromLogs(subscriptionId, dimension);
      return stats;
    }
    
    // Obtenir les stats pour toutes les dimensions
    const dimensions = ['free', 'pro', 'pro-plus'];
    const stats = {};
    
    for (const dim of dimensions) {
      stats[dim] = await saasIntegration.getUsageStatsFromLogs(subscriptionId, dim);
    }
    
    return stats;
  } catch (error) {
    console.error('[UsageTracking] Error getting usage stats:', error);
    throw error;
  }
}

module.exports = {
  usageTrackingMiddleware,
  getUsageStats
};

