/**
 * Tests unitaires pour UsageReporter
 * Validation du formatage et de la validation des données d'usage
 */

const reporter = require('../../../src/services/usageReporter');
const config = require('../../../src/config');

describe('UsageReporter', () => {
  // Le module exporte déjà une instance singleton

  beforeEach(() => {
    // Pas besoin de réinitialiser - instance singleton partagée
  });

  describe('Singleton Pattern', () => {
    test('Le module exporte une instance singleton', () => {
      const instance1 = require('../../../src/services/usageReporter');
      const instance2 = require('../../../src/services/usageReporter');
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateUsageParams()', () => {
    test('Valide des paramètres corrects', () => {
      const subscriptionId = 'sub-123';
      const dimension = config.saas.dimensions.free;
      const quantity = 1;

      expect(() => reporter.validateUsageParams(subscriptionId, dimension, quantity)).not.toThrow();
    });

    test('Rejette subscriptionId manquant', () => {
      const dimension = config.saas.dimensions.free;
      const quantity = 1;

      expect(() => reporter.validateUsageParams('', dimension, quantity)).toThrow('subscriptionId is required');
    });

    test('Rejette dimension manquante', () => {
      const subscriptionId = 'sub-123';
      const quantity = 1;

      expect(() => reporter.validateUsageParams(subscriptionId, '', quantity)).toThrow('dimension is required');
    });

    test('Rejette dimension invalide', () => {
      const subscriptionId = 'sub-123';
      const dimension = 'invalid-dimension';
      const quantity = 1;

      expect(() => reporter.validateUsageParams(subscriptionId, dimension, quantity)).toThrow('Invalid dimension');
    });

    test('Rejette quantity négative', () => {
      const subscriptionId = 'sub-123';
      const dimension = config.saas.dimensions.free;
      const quantity = -1;

      expect(() => reporter.validateUsageParams(subscriptionId, dimension, quantity)).toThrow('quantity must be');
    });

    test('Accepte quantity 0', () => {
      const subscriptionId = 'sub-123';
      const dimension = config.saas.dimensions.free;
      const quantity = 0;

      expect(() => reporter.validateUsageParams(subscriptionId, dimension, quantity)).not.toThrow();
    });
  });

  describe('formatUsageLog()', () => {
    test('Formate correctement un log d\'usage basique', () => {
      const params = {
        subscriptionId: 'sub-123',
        dimension: config.saas.dimensions.pro,
        quantity: 1,
        timestamp: new Date('2025-10-31T10:00:00Z'),
        teamsUserId: 'user-456'
      };

      const formatted = reporter.formatUsageLog(params);

      expect(formatted.subscriptionId).toBe('sub-123');
      expect(formatted.dimension).toBe(config.saas.dimensions.pro);
      expect(formatted.requestJson).toBeDefined();
      expect(formatted.createdDate).toBeInstanceOf(Date);
      
      // Vérifier le JSON du request
      const requestJson = JSON.parse(formatted.requestJson);
      expect(requestJson.dimension).toBe(config.saas.dimensions.pro);
      expect(requestJson.quantity).toBe(1);
    });

    test('Hash le userId pour RGPD', () => {
      const params = {
        subscriptionId: 'sub-123',
        dimension: config.saas.dimensions.free,
        quantity: 1,
        timestamp: new Date(),
        teamsUserId: 'user-456'
      };

      const formatted = reporter.formatUsageLog(params);
      const requestJson = JSON.parse(formatted.requestJson);

      expect(requestJson.teamsUserIdHash).toBeDefined();
      expect(requestJson.teamsUserIdHash).not.toBe('user-456');
      expect(requestJson.teamsUserIdHash.length).toBeGreaterThan(0);
    });

    test('Inclut les métadonnées fournies', () => {
      const params = {
        subscriptionId: 'sub-123',
        dimension: config.saas.dimensions.pro,
        quantity: 1,
        timestamp: new Date(),
        conversationType: '1:1',
        hasAttachments: true,
        messageLength: 150
      };

      const formatted = reporter.formatUsageLog(params);

      expect(formatted.conversationType).toBe('1:1');
      expect(formatted.hasAttachments).toBe(true);
      expect(formatted.messageLength).toBe(150);
    });

    test('Gère l\'absence de métadonnées', () => {
      const params = {
        subscriptionId: 'sub-123',
        dimension: config.saas.dimensions.free,
        quantity: 1,
        timestamp: new Date()
      };

      const formatted = reporter.formatUsageLog(params);

      expect(formatted.subscriptionId).toBe('sub-123');
      expect(formatted.messageLength).toBeUndefined();
    });

    test('N\'inclut jamais le contenu du message', () => {
      const params = {
        subscriptionId: 'sub-123',
        dimension: config.saas.dimensions.pro,
        quantity: 1,
        timestamp: new Date(),
        messageContent: 'This should not be included',
        messageText: 'Neither should this'
      };

      const formatted = reporter.formatUsageLog(params);
      const requestJson = JSON.parse(formatted.requestJson);

      expect(requestJson.messageContent).toBeUndefined();
      expect(requestJson.messageText).toBeUndefined();
      expect(formatted.messageContent).toBeUndefined();
    });
  });

  describe('reportUsage()', () => {
    test('Retourne un log formaté pour usage valide', async () => {
      const metadata = { 
        timestamp: new Date(),
        conversationType: '1:1' 
      };
      
      const result = await reporter.reportUsage(
        'sub-123',
        config.saas.dimensions.free,
        1,
        metadata
      );

      expect(result).toBeDefined();
      expect(result.subscriptionId).toBe('sub-123');
      expect(result.dimension).toBe(config.saas.dimensions.free);
      expect(result.conversationType).toBe('1:1');
    });

    test('Lance une erreur pour paramètres invalides', async () => {
      await expect(reporter.reportUsage('', config.saas.dimensions.free, 1)).rejects.toThrow();
    });

    test('Accepte metadata optionnel', async () => {
      const result = await reporter.reportUsage(
        'sub-123',
        config.saas.dimensions.pro,
        1
      );

      expect(result).toBeDefined();
      expect(result.subscriptionId).toBe('sub-123');
    });
  });

  describe('reportBatchUsage()', () => {
    test('Formate un batch d\'événements d\'usage', async () => {
      const events = [
        {
          subscriptionId: 'sub-123',
          dimension: config.saas.dimensions.free,
          quantity: 1,
          metadata: { timestamp: new Date(), teamsUserId: 'user-1' }
        },
        {
          subscriptionId: 'sub-456',
          dimension: config.saas.dimensions.pro,
          quantity: 1,
          metadata: { timestamp: new Date(), teamsUserId: 'user-2' }
        }
      ];

      const results = await reporter.reportBatchUsage(events);

      expect(results).toHaveLength(2);
      expect(results[0].subscriptionId).toBe('sub-123');
      expect(results[1].subscriptionId).toBe('sub-456');
    });

    test('Filtre les événements invalides', async () => {
      const events = [
        {
          subscriptionId: 'sub-123',
          dimension: config.saas.dimensions.free,
          quantity: 1,
          metadata: { timestamp: new Date() }
        },
        {
          // Event invalide - pas de subscriptionId
          dimension: config.saas.dimensions.pro,
          quantity: 1,
          metadata: { timestamp: new Date() }
        },
        {
          subscriptionId: 'sub-789',
          dimension: config.saas.dimensions.proPlus,
          quantity: 1,
          metadata: { timestamp: new Date() }
        }
      ];

      const results = await reporter.reportBatchUsage(events);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.subscriptionId)).toEqual(['sub-123', 'sub-789']);
    });

    test('Retourne tableau vide pour batch vide', async () => {
      const results = await reporter.reportBatchUsage([]);
      expect(results).toEqual([]);
    });
  });

  describe('calculateUsageStats()', () => {
    test('Calcule les statistiques d\'usage correctement', () => {
      const usageLogs = [
        {
          subscriptionId: 'sub-123',
          requestJson: JSON.stringify({
            dimension: config.saas.dimensions.free,
            quantity: 1,
            messageLength: 100,
            tokenCount: 20
          })
        },
        {
          subscriptionId: 'sub-123',
          requestJson: JSON.stringify({
            dimension: config.saas.dimensions.free,
            quantity: 1,
            messageLength: 200,
            tokenCount: 40
          })
        },
        {
          subscriptionId: 'sub-123',
          requestJson: JSON.stringify({
            dimension: config.saas.dimensions.pro,
            quantity: 1,
            messageLength: 150,
            tokenCount: 30
          })
        }
      ];

      const stats = reporter.calculateUsageStats(usageLogs);

      expect(stats.totalMessages).toBe(3);
      expect(stats.byDimension[config.saas.dimensions.free]).toBe(2);
      expect(stats.byDimension[config.saas.dimensions.pro]).toBe(1);
      expect(stats.averageMessageLength).toBeGreaterThan(0);
    });

    test('Calcule le coût total estimé', () => {
      const usageLogs = [
        {
          subscriptionId: 'sub-123',
          requestJson: JSON.stringify({
            dimension: config.saas.dimensions.free,
            quantity: 1
          })
        },
        {
          subscriptionId: 'sub-123',
          requestJson: JSON.stringify({
            dimension: config.saas.dimensions.pro,
            quantity: 1
          })
        }
      ];

      const stats = reporter.calculateUsageStats(usageLogs);

      const expectedCost = config.saas.costs.free + config.saas.costs.pro;
      expect(stats.totalCost).toBeCloseTo(expectedCost, 2);
    });

    test('Gère les logs vides', () => {
      const stats = reporter.calculateUsageStats([]);

      expect(stats.totalMessages).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.averageMessageLength).toBe(0);
    });

    test('Gère les dimensions inconnues', () => {
      const usageLogs = [
        {
          subscriptionId: 'sub-123',
          requestJson: JSON.stringify({
            dimension: 'unknown-dimension',
            quantity: 1
          })
        }
      ];

      const stats = reporter.calculateUsageStats(usageLogs);

      expect(stats.totalMessages).toBe(1);
      // Le coût devrait être 0 pour dimension inconnue
      expect(stats.totalCost).toBe(0);
    });
  });
});
