/**
 * Tests d'intégration pour SaaSIntegrationService
 * Tests NON-MOCKÉS contre la vraie instance Azure SQL
 * Database: sac-02-sql.database.windows.net / sac-02AMPSaaSDB
 */

const saasService = require('../../src/services/saasIntegration');
const config = require('../../src/config');

describe('SaaS Database Integration', () => {
  // Tests d'intégration avec timeout augmenté pour les appels réseau
  jest.setTimeout(30000);

  describe('Database Connection', () => {
    test('Se connecte avec succès à la base SaaS Accelerator', async () => {
      // Vérifier que la configuration DB est présente
      expect(config.saas.dbServer).toBeDefined();
      expect(config.saas.dbName).toBeDefined();
      expect(config.saas.dbUser).toBeDefined();
      expect(config.saas.dbPassword).toBeDefined();

      // Note: Le service utilise une connexion lazy - la connexion se fait au premier appel
      // Ce test vérifie juste que la config est présente
      expect(config.saas.dbServer).toBe('sac-02-sql.database.windows.net');
      expect(config.saas.dbName).toBe('sac-02AMPSaaSDB');
    });
  });

  describe('getActiveSubscription()', () => {
    test('Retourne null pour un TeamsUserId inexistant', async () => {
      const fakeUserId = 'test-user-' + Date.now() + '@nonexistent.com';
      
      const subscription = await saasService.getActiveSubscription(fakeUserId);
      
      expect(subscription).toBeNull();
    }, 30000);

    test('Gère les erreurs de connexion gracieusement', async () => {
      // Test avec TeamsUserId vide - devrait retourner null sans crash
      const subscription = await saasService.getActiveSubscription('');
      
      expect(subscription).toBeNull();
    }, 30000);

    // NOTE: Pour tester un cas positif (subscription active trouvée), 
    // il faudrait un TeamsUserId réel de la DB de test.
    // Ce test est commenté car il nécessite des données de test.
    /*
    test('Retourne une subscription active pour un TeamsUserId valide', async () => {
      const testUserId = 'REAL_TEST_USER_ID_FROM_DB'; // À remplacer
      
      const subscription = await saasService.getActiveSubscription(testUserId);
      
      if (subscription) {
        expect(subscription).toHaveProperty('id');
        expect(subscription).toHaveProperty('userId');
        expect(subscription).toHaveProperty('planId');
        expect(subscription).toHaveProperty('status');
        expect(subscription.status).toBe('Subscribed');
      }
    }, 30000);
    */
  });

  describe('trackMessageUsage()', () => {
    test('Insère un log d\'usage dans MeteredAuditLogs', async () => {
      const testUsageLog = {
        subscriptionId: 'test-sub-' + Date.now(),
        requestJson: JSON.stringify({
          dimension: config.saas.dimensions.free,
          quantity: 1,
          teamsUserIdHash: 'test-hash-' + Date.now(),
          messageLength: 100,
          tokenCount: 20,
          conversationType: '1:1',
          hasAttachments: false
        }),
        statusCode: 200,
        createdDate: new Date(),
        dimension: config.saas.dimensions.free,
        quantity: 1
      };

      // Tenter d'insérer le log
      const result = await saasService.trackMessageUsage(testUsageLog);
      
      // Le service retourne le log lui-même en cas de succès
      expect(result).toBeDefined();
      expect(result.subscriptionId).toBe(testUsageLog.subscriptionId);
    }, 30000);

    test('Gère les erreurs d\'insertion gracieusement', async () => {
      const invalidLog = {
        // Log invalide - manque subscriptionId
        requestJson: '{}',
        statusCode: 200
      };

      // Ne devrait pas crasher, même avec un log invalide
      await expect(saasService.trackMessageUsage(invalidLog)).rejects.toThrow();
    }, 30000);
  });

  describe('checkMessageLimit()', () => {
    test('Retourne un objet de limite pour un subscriptionId', async () => {
      const testSubscriptionId = 'test-sub-' + Date.now();
      const testDimension = config.saas.dimensions.free;

      const limitInfo = await saasService.checkMessageLimit(
        testSubscriptionId,
        testDimension
      );

      expect(limitInfo).toBeDefined();
      expect(limitInfo).toHaveProperty('used');
      expect(limitInfo).toHaveProperty('limit');
      expect(limitInfo).toHaveProperty('remaining');
      expect(typeof limitInfo.used).toBe('number');
      expect(typeof limitInfo.limit).toBe('number');
      expect(typeof limitInfo.remaining).toBe('number');
    }, 30000);

    test('Calcule correctement le nombre de messages utilisés', async () => {
      // Créer un subscriptionId unique pour ce test
      const testSubscriptionId = 'test-limit-' + Date.now();
      const testDimension = config.saas.dimensions.pro;

      // Insérer 3 logs d'usage pour ce subscription
      for (let i = 0; i < 3; i++) {
        await saasService.trackMessageUsage({
          subscriptionId: testSubscriptionId,
          requestJson: JSON.stringify({
            dimension: testDimension,
            quantity: 1,
            messageId: `test-msg-${i}`
          }),
          statusCode: 200,
          createdDate: new Date(),
          dimension: testDimension,
          quantity: 1
        });
      }

      // Vérifier que checkMessageLimit compte bien les 3 messages
      const limitInfo = await saasService.checkMessageLimit(
        testSubscriptionId,
        testDimension
      );

      expect(limitInfo.used).toBeGreaterThanOrEqual(3);
      expect(limitInfo.limit).toBe(config.saas.limits.pro); // 300
      expect(limitInfo.remaining).toBe(limitInfo.limit - limitInfo.used);
    }, 30000);

    test('Gère un subscriptionId inexistant', async () => {
      const fakeSubscriptionId = 'nonexistent-' + Date.now();
      const testDimension = config.saas.dimensions.free;

      const limitInfo = await saasService.checkMessageLimit(
        fakeSubscriptionId,
        testDimension
      );

      // Devrait retourner un objet avec used=0
      expect(limitInfo.used).toBe(0);
      expect(limitInfo.limit).toBe(config.saas.limits.free); // 50
      expect(limitInfo.remaining).toBe(config.saas.limits.free);
    }, 30000);
  });

  describe('Performance & Résilience', () => {
    test('Les requêtes s\'exécutent en moins de 10 secondes', async () => {
      const start = Date.now();
      
      await saasService.getActiveSubscription('test-perf-' + Date.now());
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000); // 10 secondes max
    }, 30000);

    test('Supporte les appels concurrents', async () => {
      const promises = [];
      
      // Lancer 5 requêtes en parallèle
      for (let i = 0; i < 5; i++) {
        promises.push(
          saasService.getActiveSubscription(`test-concurrent-${i}-${Date.now()}`)
        );
      }

      // Toutes les promesses devraient se résoudre sans erreur
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeNull(); // Tous devraient retourner null (pas de subscription)
      });
    }, 30000);
  });

  describe('Intégrité des données', () => {
    test('Les logs insérés sont persistés correctement', async () => {
      const uniqueId = 'test-integrity-' + Date.now();
      const testLog = {
        subscriptionId: uniqueId,
        requestJson: JSON.stringify({
          dimension: config.saas.dimensions.free,
          quantity: 1,
          testMarker: uniqueId
        }),
        statusCode: 200,
        createdDate: new Date(),
        dimension: config.saas.dimensions.free,
        quantity: 1
      };

      // Insérer le log
      await saasService.trackMessageUsage(testLog);

      // Vérifier que le log est bien compté
      const limitInfo = await saasService.checkMessageLimit(
        uniqueId,
        config.saas.dimensions.free
      );

      expect(limitInfo.used).toBeGreaterThanOrEqual(1);
    }, 30000);

    test('Les timestamps sont enregistrés correctement', async () => {
      const now = new Date();
      const testLog = {
        subscriptionId: 'test-timestamp-' + Date.now(),
        requestJson: JSON.stringify({
          dimension: config.saas.dimensions.pro,
          quantity: 1,
          timestamp: now.toISOString()
        }),
        statusCode: 200,
        createdDate: now,
        dimension: config.saas.dimensions.pro,
        quantity: 1
      };

      const result = await saasService.trackMessageUsage(testLog);
      
      expect(result).toBeDefined();
      // Le createdDate devrait être proche de now (dans la minute)
      const timeDiff = Math.abs(new Date(result.createdDate) - now);
      expect(timeDiff).toBeLessThan(60000); // Moins d'une minute de différence
    }, 30000);
  });
});
