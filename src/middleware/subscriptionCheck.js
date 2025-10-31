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
    // Vérifier si le check d'abonnement est activé
    if (!config.saas.enableSubscriptionCheck) {
      if (config.saas.debugMode) {
        console.log('[SubscriptionCheck] Subscription check disabled, skipping...');
      }
      context.subscription = null;
      return await next();
    }
    
    // Extraction du TeamsUserId
    const teamsUserId = extractTeamsUserId(activity);
    const tenantId = activity.conversation?.tenantId || null;
    
    if (config.saas.debugMode) {
      console.log(`[SubscriptionCheck] Checking subscription for user: ${teamsUserId}, tenant: ${tenantId}`);
    }
    
    // Vérification de l'abonnement actif
    const subscription = await saasIntegration.getActiveSubscription(teamsUserId, tenantId);
    
    if (!subscription) {
      // Pas d'abonnement actif
      if (config.saas.permissiveMode || !config.saas.blockNoSubscription) {
        // Mode permissif ou blocage désactivé: continuer avec avertissement
        console.warn(`[SubscriptionCheck] No subscription for user ${teamsUserId}, but permissive mode or blocking disabled`);
        context.subscription = null;
        return await next();
      } else {
        // Mode strict avec blocage activé: bloquer l'accès
        await send(
          "❌ **Aucun abonnement actif trouvé**\n\n" +
          "Vous n'avez pas d'abonnement actif pour utiliser cet assistant IA.\n\n" +
          "Pour commencer:\n" +
          "1. Visitez [Azure Marketplace](https://azuremarketplace.microsoft.com/)\n" +
          "2. Recherchez 'Teams GPT Agent'\n" +
          "3. Choisissez un plan adapté à vos besoins\n\n" +
          "Les plans commencent à 0€/mois avec 50 messages inclus (plan Starter)."
        );
        return; // Stopper le pipeline
      }
    }
    
    // Vérification du statut de l'abonnement
    if (subscription.saasSubscriptionStatus !== 'Subscribed') {
      if (config.saas.permissiveMode) {
        console.warn(`[SubscriptionCheck] Subscription status is ${subscription.saasSubscriptionStatus}, but permissive mode enabled`);
        context.subscription = subscription; // Attacher quand même pour le tracking
        return await next();
      } else {
        await send(
          `⚠️ **Statut de l'abonnement: ${subscription.saasSubscriptionStatus}**\n\n` +
          "Votre abonnement n'est pas actif. Veuillez vérifier le statut de votre abonnement dans le portail Azure.\n\n" +
          "Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support."
        );
        return; // Stopper le pipeline
      }
    }
    
    // Abonnement valide: attacher au contexte pour les middlewares suivants
    context.subscription = subscription;
    
    if (config.saas.debugMode) {
      console.log(`[SubscriptionCheck] ✅ Valid subscription found:`, {
        subscriptionId: subscription.id,
        ampSubscriptionId: subscription.ampSubscriptionId,
        planId: subscription.planId,
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
