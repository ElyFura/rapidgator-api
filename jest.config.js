// Dateiname: jest.config.js

module.exports = {
    // Test-Environment
    testEnvironment: 'node',

    // Test-Dateien finden
    testMatch: [
        '**/test/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // Setup-Dateien - ENTFERNT, da wir Mocking direkt in Tests machen
    // setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

    // Coverage-Konfiguration
    collectCoverage: false, // Aktivieren mit --coverage Flag
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'lib/**/*.js',
        'index.js',
        '!test/**',
        '!coverage/**',
        '!node_modules/**'
    ],

    // Timeouts
    testTimeout: 10000,

    // Verbose Output
    verbose: true,

    // Transform
    transform: {},

    // Module-Pfade
    moduleDirectories: ['node_modules', '<rootDir>'],

    // Ignore-Patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
        '/dist/'
    ],

    // Module-Mocking
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,

    // Coverage-Thresholds (optional)
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        }
    }
};