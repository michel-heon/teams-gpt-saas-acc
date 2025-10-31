/**
 * Tests unitaires pour MessageClassifier
 * Validation de la classification des messages et extraction de métadonnées
 */

const classifier = require('../../../src/services/messageClassifier');
const config = require('../../../src/config');

describe('MessageClassifier', () => {
  // Le module exporte déjà une instance singleton
  
  beforeEach(() => {
    // Pas besoin de réinitialiser - instance singleton partagée
  });

  describe('Singleton Pattern', () => {
    test('Le module exporte une instance singleton', () => {
      const instance1 = require('../../../src/services/messageClassifier');
      const instance2 = require('../../../src/services/messageClassifier');
      expect(instance1).toBe(instance2);
    });
  });

  describe('classifyMessage()', () => {
    test('Plan development retourne dimension free', () => {
      const subscription = { PlanId: 'development' };
      const messageData = { text: 'Test message' };
      
      const dimension = classifier.classifyMessage(messageData, subscription);
      
      expect(dimension).toBe(config.saas.dimensions.free);
    });

    test('Plan starter retourne dimension free', () => {
      const subscription = { PlanId: 'starter' };
      const messageData = { text: 'Test message' };
      
      const dimension = classifier.classifyMessage(messageData, subscription);
      
      expect(dimension).toBe(config.saas.dimensions.free);
    });

    test('Plan professional retourne dimension pro', () => {
      const subscription = { PlanId: 'professional' };
      const messageData = { text: 'Test message' };
      
      const dimension = classifier.classifyMessage(messageData, subscription);
      
      expect(dimension).toBe(config.saas.dimensions.pro);
    });

    test('Plan pro-plus retourne dimension pro-plus', () => {
      const subscription = { PlanId: 'pro-plus' };
      const messageData = { text: 'Test message' };
      
      const dimension = classifier.classifyMessage(messageData, subscription);
      
      expect(dimension).toBe(config.saas.dimensions.proPlus);
    });

    test('Plan inconnu retourne dimension free par défaut', () => {
      const subscription = { PlanId: 'unknown-plan' };
      const messageData = { text: 'Test message' };
      
      const dimension = classifier.classifyMessage(messageData, subscription);
      
      expect(dimension).toBe(config.saas.dimensions.free);
    });

    test('Pas de subscription retourne dimension free', () => {
      const dimension = classifier.classifyMessage({ text: 'Test' }, { PlanId: null });
      
      expect(dimension).toBe(config.saas.dimensions.free);
    });
  });

  describe('getMessageMetadata()', () => {
    test('Extrait correctement les métadonnées basiques', () => {
      const messageData = {
        text: 'Bonjour, ceci est un test',
        tokens: 10,
        conversationId: 'conv-123'
      };

      const metadata = classifier.getMessageMetadata(messageData);

      expect(metadata.hasAttachments).toBe(false);
      expect(metadata.messageLength).toBe(25);
      expect(metadata.conversationType).toBe('1:1');
      expect(metadata.tokenCount).toBe(10);
      expect(metadata.isLongMessage).toBe(false);
    });

    test('Détecte les pièces jointes', () => {
      const messageData = {
        text: 'Message avec fichier',
        attachments: [
          { contentType: 'application/pdf', name: 'document.pdf' }
        ]
      };

      const metadata = classifier.getMessageMetadata(messageData);

      expect(metadata.hasAttachments).toBe(true);
    });

    test('Gère les messages sans texte', () => {
      const messageData = {
        tokens: 0
      };

      const metadata = classifier.getMessageMetadata(messageData);

      expect(metadata.messageLength).toBe(0);
      expect(metadata.tokenCount).toBe(0);
    });

    test('Détecte les messages longs', () => {
      const longText = 'A'.repeat(1500);
      const messageData = { text: longText };

      const metadata = classifier.getMessageMetadata(messageData);

      expect(metadata.isLongMessage).toBe(true);
      expect(metadata.messageLength).toBe(1500);
    });

    test('Détecte les conversations de groupe', () => {
      const messageData = {
        text: 'Message',
        conversationId: 'group-channel-123'
      };

      const metadata = classifier.getMessageMetadata(messageData);

      expect(metadata.conversationType).toBe('group');
    });
  });

  describe('isPremiumMessage()', () => {
    test('Retourne false pour messages standards', () => {
      const messageData = { text: 'Message standard' };
      
      const isPremium = classifier.isPremiumMessage(messageData);
      
      expect(isPremium).toBe(false);
    });

    test('Détecte les messages avec pièces jointes multiples', () => {
      const messageData = {
        text: 'Message avec fichiers',
        attachments: [
          { contentType: 'application/pdf' },
          { contentType: 'image/png' },
          { contentType: 'application/json' }
        ]
      };

      const isPremium = classifier.isPremiumMessage(messageData);

      expect(isPremium).toBe(true);
    });

    test('Détecte les messages très longs', () => {
      const longText = 'A'.repeat(2500);
      const messageData = { text: longText };

      const isPremium = classifier.isPremiumMessage(messageData);

      expect(isPremium).toBe(true);
    });
  });

  describe('getMessageCost()', () => {
    test('Retourne le coût correct pour dimension free', () => {
      const cost = classifier.getMessageCost(config.saas.dimensions.free);
      expect(cost).toBe(config.saas.costs.free);
    });

    test('Retourne le coût correct pour dimension pro', () => {
      const cost = classifier.getMessageCost(config.saas.dimensions.pro);
      expect(cost).toBe(config.saas.costs.pro);
    });

    test('Retourne le coût correct pour dimension pro-plus', () => {
      const cost = classifier.getMessageCost(config.saas.dimensions.proPlus);
      expect(cost).toBe(config.saas.costs.proPlus);
    });

    test('Retourne 0 pour dimension inconnue', () => {
      const cost = classifier.getMessageCost('unknown-dimension');
      expect(cost).toBe(0);
    });
  });

  describe('getDimensionInfo()', () => {
    test('Retourne les informations complètes pour dimension free', () => {
      const info = classifier.getDimensionInfo(config.saas.dimensions.free);

      expect(info).toBeDefined();
      expect(info.name).toBe('Free Tier');
      expect(info.description).toContain('Starter');
      expect(info.limit).toBe(config.saas.limits.free);
      expect(info.cost).toBe(config.saas.costs.free);
    });

    test('Retourne les informations complètes pour dimension pro', () => {
      const info = classifier.getDimensionInfo(config.saas.dimensions.pro);

      expect(info).toBeDefined();
      expect(info.name).toBe('Professional');
      expect(info.description).toContain('Professional');
      expect(info.limit).toBe(config.saas.limits.pro);
      expect(info.cost).toBe(config.saas.costs.pro);
    });

    test('Retourne info free pour dimension inconnue', () => {
      const info = classifier.getDimensionInfo('unknown');
      expect(info).toBeDefined();
      expect(info.name).toBe('Free Tier');
    });
  });
});
