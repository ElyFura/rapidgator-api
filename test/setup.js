// Dateiname: test/setup.js

// Global Test-Setup

// Mock für fetch in Node.js-Umgebung
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
        responseText: JSON.stringify({ success: true })
    }));
}

// Mock für window.fs (für File-API Tests)
global.window = global.window || {};
global.window.fs = {
    readFile: jest.fn()
};

// Console-Logs in Tests reduzieren
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
});

afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});

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
        json: () => Promise.resolve({
            response_status: status,
            response: data,
            response_details: status !== 200 ? 'Test error' : undefined
        })
    }),

    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};