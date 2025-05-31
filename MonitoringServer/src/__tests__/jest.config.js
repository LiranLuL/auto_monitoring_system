module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.js',
      '!src/tests/**',
      '!src/db/migration.js',
      '!src/server.js'
    ],
    testMatch: [
      '**/__tests__/**/*.test.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  };