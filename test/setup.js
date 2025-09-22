// Dateiname: test/setup.js

// Global Test-Setup für Jest

// Mock für fetch in Node.js-Umgebung - muss vor allen anderen Mocks sein
if (!global.fetch) {
    global.fetch = jest.fn();
}

// Mock für FormData
if (!global.FormData) {
    global.FormData = jest.fn(() => ({
        append: jest.fn(),
        get: jest.fn(),
        getAll: jest.fn(),
        has: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        keys: jest.fn(),
        values: jest.fn(),
        entries: jest.fn()
    }));
}

// Mock für XMLHttpRequest (für Browser-Upload-Tests)
if (!global.XMLHttpRequest) {
    global.XMLHttpRequest = jest.fn(() => ({
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        addEventListener: jest.fn(),
        upload: {
            addEventListener: jest.fn()
        },
        status: 200,
        responseText: JSON.stringify({ success: true }),
        response: JSON.stringify({ success: true }),
        readyState: 4
    }));
}

// Mock für window.fs (für File-API Tests)
global.window = global.window || {};
global.window.fs = {
    readFile: jest.fn()
};

// Mock für node-fetch vor allen anderen Importen
jest.mock('node-fetch', () => {
    const mockFetch = jest.fn();
    mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response_status: 200, response: {} }),
        text: () => Promise.resolve('')
    });
    return mockFetch;
});

// Module-level Mock für die gesamte rapidgator-api
jest.mock('../lib/rapidgator-api', () => {
    const originalModule = jest.requireActual('../lib/rapidgator-api');

    // Überschreibung der _makeRequestAttempt Methode
    class MockedRapidGatorAPI extends originalModule {
        async _makeRequestAttempt(endpoint, method, data) {
            // Verwende die globale gemockte fetch Funktion
            const url = `${this.baseURL}${endpoint}`;
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'RapidGator-JS-API/1.0'
                },
                timeout: this.timeout
            };

            if (data) {
                if (method === 'GET') {
                    const params = new URLSearchParams(data);
                    const fullUrl = `${url  }?${  params.toString()}`;
                    options.url = fullUrl;
                } else {
                    options.body = new URLSearchParams(data);
                }
            }

            const targetUrl = options.url || url;
            const response = await global.fetch(targetUrl, options);

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.response_status !== 200) {
                throw new Error(`API Error: ${result.response_details || 'Unknown error'} (Code: ${result.response_status})`);
            }

            return result.response;
        }
    }

    return MockedRapidGatorAPI;
});

// Mock für form-data
jest.mock('form-data', () => {
    return jest.fn(() => ({
        append: jest.fn(),
        getHeaders: jest.fn(() => ({ 'content-type': 'multipart/form-data' })),
        submit: jest.fn(),
        pipe: jest.fn()
    }));
});

// Console-Logs in Tests reduzieren
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Globale Test-Utilities
global.testUtils = {
    createMockFile: (name = 'test.txt', size = 1024, type = 'text/plain') => {
        const file = new Blob(['test content'], { type });
        file.name = name;
        file.size = size;
        file.lastModified = Date.now();
        return file;
    },

    createMockResponse: (data, status = 200) => ({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        json: () => Promise.resolve({
            response_status: status,
            response: data,
            response_details: status !== 200 ? 'Test error' : undefined
        }),
        text: () => Promise.resolve(JSON.stringify(data))
    }),

    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // Mock für erfolgreiche API-Response
    mockSuccessResponse: (data = {}) => ({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
            response_status: 200,
            response: data
        })
    }),

    // Mock für API-Error-Response
    mockErrorResponse: (message = 'Test error', code = 400) => ({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
            response_status: code,
            response_details: message
        })
    }),

    // Mock für HTTP-Error-Response
    mockHttpErrorResponse: (status = 500, statusText = 'Internal Server Error') => ({
        ok: false,
        status,
        statusText
    })
};

// Jest Setup/Teardown
beforeEach(() => {
    // Alle Mocks vor jedem Test zurücksetzen
    jest.clearAllMocks();

    // Fresh fetch mock für jeden Test
    global.fetch = jest.fn();

    // Console logs unterdrücken (optional)
    if (process.env.NODE_ENV === 'test') {
        console.log = jest.fn();
        console.error = jest.fn();
        console.warn = jest.fn();
    }
});

afterEach(() => {
    // Cleanup nach jedem Test
    jest.restoreAllMocks();
});

// After all tests
afterAll(() => {
    // Console logs wiederherstellen
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});

// Unhandled Promise Rejection Handler für Tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Jest global timeout
jest.setTimeout(30000);
