/**
 * Jest Configuration
 * Tests unitaires et d'intégration pour Teams GPT SaaS
 */

module.exports = {
  // Environment de test
  testEnvironment: 'node',

  // Pattern des fichiers de test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // Répertoires à ignorer
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Couverture de code
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!**/node_modules/**'
  ],

  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Format de sortie
  verbose: true,

  // Timeout pour les tests d'intégration
  testTimeout: 30000,

  // Variables d'environnement pour les tests
  setupFiles: ['<rootDir>/tests/setup.js']
};
