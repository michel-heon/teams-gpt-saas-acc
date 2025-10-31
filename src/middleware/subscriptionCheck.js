/**
 * Middleware de vérification d'abonnement SaaS
 * Vérifie si l'utilisateur Teams a un abonnement actif avant de traiter les messages
 */

const saasIntegration = require('../services/saasIntegration');
const config = require('../config');

/**
 * Extrait le TeamsUserId depuis l'activité Teams
 * @param {Object} activity - L'activité Teams
 * @returns {string} Le TeamsUserId (format: aadObjectId)
 */
function extractTeamsUserId(activity) {
  // Priorité 1: from.aadObjectId (Microsoft Entra ID)
  if (activity.from && activity.from.aadObjectId) {
    return activity.from.aadObjectId;
  }
  
  // Priorité 2: from.id (fallback)
  if (activity.from && activity.from.id) {
    return activity.from.id;
  }
  
  throw new Error('Unable to extract TeamsUserId from activity');
}

/**
 * Middleware qui vérifie l'abonnement SaaS de l'utilisateur
 * @param {Object} context - Le contexte du middleware {send, activity, ...}
 * @param {Function} next - La fonction next pour continuer le pipeline
 */
async function subscriptionCheckMiddleware(context, next) {
  const { send, activity } = context;
  
  try {
    // Extraction du TeamsUserId
    const teamsUserId = extractTeamsUserId(activity);
    
    if (config.saas.debugMode) {
      console.log(`[SubscriptionCheck] Checking subscription for user: ${teamsUserId}`);
    }
    
    // Vérification de l'abonnement actif
    const subscription = await saasIntegration.getActiveSubscription(teamsUserId);
    
    if (!subscription) {
      // Pas d'abonnement actif
      if (config.saas.permissiveMode) {
        // Mode permissif: continuer avec avertissement
        console.warn(`[SubscriptionCheck] No subscription for user ${teamsUserId}, but permissive mode enabled`);
        context.subscription = null;
        return await next();
      } else {
        // Mode strict: bloquer l'accès
        await send(
          "❌ **No Active Subscription**\n\n" +
          "You don't have an active subscription to use this AI assistant.\n\n" +
          "To get started:\n" +
          "1. Visit [Azure Marketplace](https://azuremarketplace.microsoft.com/)\n" +
          "2. Search for 'Teams GPT Agent'\n" +
          "3. Choose a plan that fits your needs\n\n" +
          "Plans start at €9.99/month with 1,000 messages included."
        );
        return; // Stopper le pipeline
      }
    }
    
    // Vérification du statut de l'abonnement
    if (subscription.saasSubscriptionStatus !== 'Subscribed') {
      await send(
        `⚠️ **Subscription Status: ${subscription.saasSubscriptionStatus}**\n\n` +
        "Your subscription is not active. Please check your subscription status in the Azure portal.\n\n" +
        "If you believe this is an error, please contact support."
      );
      return; // Stopper le pipeline
    }
    
    // Abonnement valide: attacher au contexte pour les middlewares suivants
    context.subscription = subscription;
    
    if (config.saas.debugMode) {
      console.log(`[SubscriptionCheck] ✅ Valid subscription found:`, {
        subscriptionId: subscription.id,
        plan: subscription.planId,
        status: subscription.saasSubscriptionStatus
      });
    }
    
    // Continuer vers le prochain middleware
    await next();
    
  } catch (error) {
    console.error('[SubscriptionCheck] Error:', error);
    
    if (config.saas.permissiveMode) {
      // En mode permissif, continuer même en cas d'erreur
      console.warn('[SubscriptionCheck] Error occurred but permissive mode enabled, continuing...');
      context.subscription = null;
      await next();
    } else {
      // En mode strict, bloquer en cas d'erreur
      await send(
        "⚠️ **Service Temporarily Unavailable**\n\n" +
        "We're having trouble verifying your subscription. Please try again in a few moments.\n\n" +
        "If the problem persists, please contact support."
      );
    }
  }
}

/**
 * Fonction helper pour vérifier si un utilisateur a un abonnement actif
 * Utilisée pour les tests et autres vérifications
 * @param {string} teamsUserId - L'identifiant Teams de l'utilisateur
 * @returns {Promise<boolean>} True si l'utilisateur a un abonnement actif
 */
async function hasActiveSubscription(teamsUserId) {
  try {
    const subscription = await saasIntegration.getActiveSubscription(teamsUserId);
    return subscription && subscription.saasSubscriptionStatus === 'Subscribed';
  } catch (error) {
    console.error('[SubscriptionCheck] Error in hasActiveSubscription:', error);
    return config.saas.permissiveMode; // En mode permissif, retourner true
  }
}

module.exports = {
  subscriptionCheckMiddleware,
  hasActiveSubscription,
  extractTeamsUserId
};
