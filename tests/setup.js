/**
 * Configuration globale pour les tests Jest
 * Charge les variables d'environnement de test
 */

const path = require('path');

// Charger les variables d'environnement de test
process.env.NODE_ENV = 'test';

// Charger les variables d'environnement depuis .env.dev pour les tests
require('dotenv').config({ path: path.join(__dirname, '../env/.env.dev') });

// Configuration de test par défaut
process.env.SAAS_DEBUG_MODE = 'true';
process.env.SAAS_PERMISSIVE_MODE = 'true';

// Désactiver les logs pendant les tests (sauf si DEBUG=true)
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}
