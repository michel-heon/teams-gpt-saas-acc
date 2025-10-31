/**
 * Middleware de tracking d'usage des messages
 * Enregistre chaque message, vérifie les limites du plan, et gère la facturation
 */

const saasIntegration = require('../services/saasIntegration');
const messageClassifier = require('../services/messageClassifier');
const usageReporter = require('../services/usageReporter');
const config = require('../config');

/**
 * Middleware qui track l'usage des messages et vérifie les limites
 * Doit être appelé APRÈS subscriptionCheckMiddleware
 * @param {Object} context - Le contexte du middleware {send, activity, subscription, ...}
 * @param {Function} next - La fonction next pour continuer le pipeline
 */
async function usageTrackingMiddleware(context, next) {
  const { send, activity, subscription } = context;
  
  try {
    // Si pas d'abonnement (mode permissif), continuer sans tracking
    if (!subscription) {
      if (config.saas.debugMode) {
        console.log('[UsageTracking] No subscription found, skipping usage tracking');
      }
      return await next();
    }
    
    const subscriptionId = subscription.id;
    
    if (config.saas.debugMode) {
      console.log(`[UsageTracking] Processing message for subscription: ${subscriptionId}`);
    }
    
    // 1. Classifier le message (standard ou premium)
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
    
    // 2. Vérifier les limites AVANT de traiter le message
    const limitCheck = await saasIntegration.checkMessageLimit(subscriptionId, dimension);
    
    if (!limitCheck.allowed) {
      // Limite atteinte
      const dimensionInfo = messageClassifier.getDimensionInfo(dimension);
      const cost = dimensionInfo.cost;
      
      await send(
        `⚠️ **Message Limit Reached**\n\n` +
        `You've reached your monthly limit of **${limitCheck.limit} messages** for the **${subscription.planId}** plan.\n\n` +
        `**Current usage:** ${limitCheck.used} / ${limitCheck.limit} messages\n\n` +
        `**Options:**\n` +
        `• Upgrade to a higher plan for more messages\n` +
        `• Wait until next month (resets on ${limitCheck.resetDate || 'billing date'})\n` +
        `• Pay ${cost.toFixed(2)}€ per additional ${isPremium ? 'premium ' : ''}message (overage billing)\n\n` +
        `Visit the [Azure Portal](https://portal.azure.com/) to manage your subscription.`
      );
      
      // Logger le refus (pour analytics)
      console.warn(`[UsageTracking] Message blocked - limit reached:`, {
        subscriptionId,
        dimension,
        used: limitCheck.used,
        limit: limitCheck.limit
      });
      
      return; // Stopper le pipeline
    }
    
    if (config.saas.debugMode) {
      console.log(`[UsageTracking] Limit check passed:`, {
        used: limitCheck.used,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining
      });
    }
    
    // 3. Attacher les informations de tracking au contexte
    context.usageTracking = {
      subscriptionId,
      dimension,
      metadata,
      isPremium,
      startTime: Date.now()
    };
    
    // 4. Continuer vers le handler du message (traitement OpenAI)
    await next();
    
    // 5. APRÈS le traitement réussi, enregistrer l'usage
    const processingTime = Date.now() - context.usageTracking.startTime;
    
    try {
      // Track dans la base de données SaaS Accelerator
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
          processingTime: `${processingTime}ms`,
          newUsed: limitCheck.used + 1,
          remaining: limitCheck.remaining - 1
        });
      }
      
      // Avertissement si proche de la limite
      const remaining = limitCheck.remaining - 1;
      const warningThreshold = limitCheck.limit * 0.1; // 10% de la limite
      
      if (remaining <= warningThreshold && remaining > 0) {
        const dimensionInfo = messageClassifier.getDimensionInfo(dimension);
        await send(
          `\n\n---\n` +
          `⚠️ **Usage Warning:** You have **${remaining}** messages remaining this month.\n` +
          `Consider upgrading your plan or additional messages will be billed at ${dimensionInfo.cost.toFixed(2)}€ each.`
        );
      }
      
    } catch (trackingError) {
      // Erreur lors du tracking: logger mais ne pas bloquer l'utilisateur
      console.error('[UsageTracking] Error tracking usage:', trackingError);
      
      if (!config.saas.permissiveMode) {
        // En mode strict, informer l'utilisateur
        await send(
          `\n\n---\n` +
          `⚠️ **Note:** Your message was processed but usage tracking failed. ` +
          `Please contact support if this persists.`
        );
      }
    }
    
  } catch (error) {
    console.error('[UsageTracking] Critical error:', error);
    
    if (config.saas.permissiveMode) {
      // En mode permissif, continuer même en cas d'erreur
      console.warn('[UsageTracking] Error occurred but permissive mode enabled, continuing...');
      await next();
    } else {
      // En mode strict, bloquer
      await send(
        "⚠️ **Service Temporarily Unavailable**\n\n" +
        "We're having trouble processing your request. Please try again in a few moments.\n\n" +
        "If the problem persists, please contact support."
      );
    }
  }
}

/**
 * Fonction helper pour obtenir les statistiques d'usage d'un utilisateur
 * @param {string} subscriptionId - L'ID de l'abonnement
 * @param {string} dimension - La dimension à vérifier (optionnel)
 * @returns {Promise<Object>} Statistiques d'usage
 */
async function getUsageStats(subscriptionId, dimension = null) {
  try {
    if (dimension) {
      return await saasIntegration.checkMessageLimit(subscriptionId, dimension);
    }
    
    // Obtenir les stats pour toutes les dimensions
    const dimensions = ['free', 'pro', 'pro-plus'];
    const stats = {};
    
    for (const dim of dimensions) {
      stats[dim] = await saasIntegration.checkMessageLimit(subscriptionId, dim);
    }
    
    return stats;
  } catch (error) {
    console.error('[UsageTracking] Error getting usage stats:', error);
    throw error;
  }
}

/**
 * Fonction helper pour réinitialiser les compteurs d'usage (admin)
 * @param {string} subscriptionId - L'ID de l'abonnement
 * @returns {Promise<void>}
 */
async function resetUsageCounters(subscriptionId) {
  try {
    // Cette fonction devra être implémentée dans saasIntegration
    // Pour l'instant, logger seulement
    console.log(`[UsageTracking] Reset usage counters for subscription: ${subscriptionId}`);
    // TODO: Implémenter la réinitialisation dans la DB
  } catch (error) {
    console.error('[UsageTracking] Error resetting usage counters:', error);
    throw error;
  }
}

module.exports = {
  usageTrackingMiddleware,
  getUsageStats,
  resetUsageCounters
};
