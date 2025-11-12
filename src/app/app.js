const { ManagedIdentityCredential } = require("@azure/identity");
const { App } = require("@microsoft/teams.apps");
const { ChatPrompt } = require("@microsoft/teams.ai");
const { LocalStorage } = require("@microsoft/teams.common");
const { OpenAIChatModel } = require("@microsoft/teams.openai");
const { MessageActivity } = require('@microsoft/teams.api');
const fs = require('fs');
const path = require('path');
const config = require("../config");

// Import SaaS middlewares
const { subscriptionCheckMiddleware } = require('../middleware/subscriptionCheck');
const { usageTrackingMiddleware } = require('../middleware/usageTracking');

// Note: Marketplace metering emission is handled by the SaaS Accelerator Scheduler,
// not by this application. We only record usage in MeteredAuditLogs.

// Create storage for conversation history
const storage = new LocalStorage();

// Load instructions from file on initialization
function loadInstructions() {
  const instructionsFilePath = path.join(__dirname, "instructions.txt");
  return fs.readFileSync(instructionsFilePath, 'utf-8').trim();
}

// Load instructions once at startup
const instructions = loadInstructions();

const createTokenFactory = () => {
  return async (scope, tenantId) => {
    const managedIdentityCredential = new ManagedIdentityCredential({
        clientId: process.env.CLIENT_ID
      });
    const scopes = Array.isArray(scope) ? scope : [scope];
    const tokenResponse = await managedIdentityCredential.getToken(scopes, {
      tenantId: tenantId
    });
   
    return tokenResponse.token;
  };
};

// Configure authentication using TokenCredentials
const tokenCredentials = {
  clientId: process.env.CLIENT_ID || '',
  token: createTokenFactory()
};

const credentialOptions = config.MicrosoftAppType === "UserAssignedMsi" ? { ...tokenCredentials } : undefined;

// Create the app with storage
const app = new App({
  ...credentialOptions,
  storage
});

// Handle incoming messages
app.on('message', async ({ send, stream, activity }) => {
  // Create middleware context
  const context = { send, stream, activity };
  
  // Define the actual message handler
  const messageHandler = async () => {
    //Get conversation history
    const conversationKey = `${activity.conversation.id}/${activity.from.id}`;
    const messages = storage.get(conversationKey) || [];

    try {
      const prompt = new ChatPrompt({
        messages,
        instructions,
        model: new OpenAIChatModel({
          model: config.azureOpenAIDeploymentName,
          apiKey: config.azureOpenAIKey,
          endpoint: config.azureOpenAIEndpoint,
          apiVersion: "2024-10-21"
        })
      });

      if (activity.conversation.isGroup) {
        // If the conversation is a group chat, we need to send the final response
        // back to the group chat
        const response = await prompt.send(activity.text);
        const responseActivity = new MessageActivity(response.content).addAiGenerated().addFeedback();
        await send(responseActivity);
      } else {
          await prompt.send(activity.text, {
            onChunk: (chunk) => {
              stream.emit(chunk);
            },
          });
        // We wrap the final response with an AI Generated indicator
        stream.emit(new MessageActivity().addAiGenerated().addFeedback());
      }
      storage.set(conversationKey, messages);
    } catch (error) {
      console.error(error);
      await send("The agent encountered an error or bug.");
      await send("To continue to run this agent, please fix the agent source code.");
    }
  };
  
  // Execute middleware chain: subscriptionCheck -> usageTracking -> messageHandler
  try {
    // Court-circuiter le subscriptionCheck si désactivé (évite l'init DB)
    if (config.saas.enableSubscriptionCheck) {
      await subscriptionCheckMiddleware(context, async () => {
        await usageTrackingMiddleware(context, messageHandler);
      });
    } else {
      // Bypass subscription check - appeler directement usageTracking
      context.subscription = null; // Pas d'abonnement vérifié
      await usageTrackingMiddleware(context, messageHandler);
    }
  } catch (error) {
    console.error('[Middleware] Unexpected error in middleware chain:', error);
    await send(
      "⚠️ **Service Error**\n\n" +
      "An unexpected error occurred. Please try again.\n\n" +
      "If the problem persists, please contact support."
    );
  }
});

app.on('message.submit.feedback', async ({ activity }) => {
  //add custom feedback process logic here
  console.log("Your feedback is " + JSON.stringify(activity.value));
});

module.exports = app;