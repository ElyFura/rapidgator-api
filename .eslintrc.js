// Dateiname: .eslintrc.js

module.exports = {
    env: {
        browser: true,
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    rules: {
        // Code Style
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],

        // Best Practices
        'no-console': 'warn',
        'no-unused-vars': 'error',
        'no-undef': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'eqeqeq': 'error',
        'curly': 'error',

        // ES6+
        'arrow-spacing': 'error',
        'no-duplicate-imports': 'error',
        'object-shorthand': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-template': 'error',

        // Async/Await
        'no-async-promise-executor': 'error',
        'require-await': 'off', // Erlaubt async Funktionen ohne await

        // Error Prevention
        'no-throw-literal': 'error',
        'no-unneeded-ternary': 'error',
        'no-useless-return': 'error',
        'no-multiple-empty-lines': ['error', { 'max': 2 }],
        'comma-dangle': ['error', 'never'],

        // Spacing
        'space-before-blocks': 'error',
        'space-in-parens': 'error',
        'space-infix-ops': 'error',
        'keyword-spacing': 'error',
        'comma-spacing': 'error',
        'key-spacing': 'error',

        // Function Rules
        'func-call-spacing': 'error',
        'no-trailing-spaces': 'error',
        'eol-last': 'error'
    },
    overrides: [
        {
            // Test-spezifische Regeln
            files: ['test/**/*.js', '**/*.test.js'],
            rules: {
                'no-console': 'off', // Console.log in Tests erlauben
                'no-unused-expressions': 'off' // Für expect() statements
            }
        },
        {
            // Beispiel-Dateien
            files: ['examples/**/*.js'],
            rules: {
                'no-console': 'off' // Console.log in Beispielen erwünscht
            }
        }
    ],
    globals: {
        // Globale Variablen für verschiedene Umgebungen
        'window': 'readonly',
        'document': 'readonly',
        'global': 'readonly',
        'process': 'readonly',
        'Buffer': 'readonly',
        '__dirname': 'readonly',
        '__filename': 'readonly',
        'module': 'readonly',
        'require': 'readonly',
        'exports': 'readonly',

        // Test globals
        'describe': 'readonly',
        'it': 'readonly',
        'test': 'readonly',
        'expect': 'readonly',
        'beforeEach': 'readonly',
        'afterEach': 'readonly',
        'beforeAll': 'readonly',
        'afterAll': 'readonly',
        'jest': 'readonly'
    }
};