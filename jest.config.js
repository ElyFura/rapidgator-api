// Dateiname: jest.config.js

module.exports = {
    // Test-Environment
    testEnvironment: 'node',

    // Test-Dateien finden
    testMatch: [
        '**/test/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // Coverage-Konfiguration
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'lib/**/*.js',
        'index.js',
        '!test/**',
        '!coverage/**',
        '!node_modules/**'
    ],

    // Setup-Dateien
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

    // Timeouts
    testTimeout: 30000,

    // Verbose Output
    verbose: true,

    // Transform (falls du ES6 verwenden möchtest)
    transform: {},

    // Module-Pfade
    moduleDirectories: ['node_modules', '<rootDir>'],

    // Ignore-Patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
        '/dist/'
    ],

    // Coverage-Thresholds (optional)
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    }
};