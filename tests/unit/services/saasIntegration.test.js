/**
 * Tests unitaires pour SaaSIntegrationService
 * Tests de la logique sans DB réelle (tests d'intégration DB séparés)
 */

const config = require('../../../src/config');

// Mock mssql avant de charger le service
jest.mock('mssql', () => {
  const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn().mockResolvedValue({ recordset: [], rowsAffected: [1] }),
    execute: jest.fn().mockResolvedValue({ recordset: [], rowsAffected: [1] })
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(true),
    request: jest.fn(() => mockRequest),
    close: jest.fn().mockResolvedValue(true),
    connected: true
  };

  return {
    ConnectionPool: jest.fn(() => mockPool),
    Int: jest.fn(val => val),
    VarChar: jest.fn(val => val),
    DateTime: jest.fn(val => val),
    Decimal: jest.fn(val => val),
    __mockPool: mockPool,
    __mockRequest: mockRequest
  };
});

const service = require('../../../src/services/saasIntegration');
const sql = require('mssql');

describe('SaaSIntegrationService', () => {
  let mockPool;
  let mockRequest;

  beforeEach(() => {
    // Récupérer les mocks
    mockPool = sql.__mockPool;
    mockRequest = sql.__mockRequest;
    
    // Réinitialiser les mocks
    jest.clearAllMocks();
    mockPool.connected = true;
    mockRequest.query.mockResolvedValue({ recordset: [], rowsAffected: [1] });
  });

  describe('Singleton Pattern', () => {
    test('Le module exporte une instance singleton', () => {
      const instance1 = require('../../../src/services/saasIntegration');
      const instance2 = require('../../../src/services/saasIntegration');
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration', () => {
    test('La configuration SaaS est chargée', () => {
      expect(config.saas).toBeDefined();
      expect(config.saas.dimensions).toBeDefined();
      expect(config.saas.limits).toBeDefined();
      expect(config.saas.costs).toBeDefined();
    });

    test('Les dimensions sont correctement définies', () => {
      expect(config.saas.dimensions.free).toBeDefined();
      expect(config.saas.dimensions.pro).toBeDefined();
      expect(config.saas.dimensions.proPlus).toBeDefined();
    });

    test('Les limites correspondent aux plans', () => {
      expect(config.saas.limits.free).toBe(50);
      expect(config.saas.limits.pro).toBe(300);
      expect(config.saas.limits.proPlus).toBe(1500);
    });
  });
});
