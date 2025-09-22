// Dateiname: test/rapidgator-api.test.js

// Mock node-fetch BEVOR wir das Modul importieren
const mockFetch = jest.fn();
jest.mock('node-fetch', () => mockFetch);

const RapidGatorAPI = require('../lib/rapidgator-api');
const { utils } = require('../index');

describe('RapidGatorAPI', () => {
    let api;

    beforeEach(() => {
        api = new RapidGatorAPI('test_login', 'test_password');
        jest.clearAllMocks();
        mockFetch.mockClear();
    });

    describe('Constructor', () => {
        test('should initialize with correct default options', () => {
            expect(api.baseURL).toBe('https://rapidgator.net/api/v2');
            expect(api.username).toBe('test_login');  // Jetzt username statt login
            expect(api.password).toBe('test_password');
            expect(api.token).toBeNull();
            expect(api.timeout).toBe(30000);
        });

        test('should initialize with custom options', () => {
            const customAPI = new RapidGatorAPI('user', 'pass', {
                timeout: 60000,
                retryCount: 5,
                baseURL: 'https://custom.api.com'
            });

            expect(customAPI.timeout).toBe(60000);
            expect(customAPI.retryCount).toBe(5);
            expect(customAPI.baseURL).toBe('https://custom.api.com');
        });
    });

    describe('Authentication', () => {
        test('setToken should set token correctly', () => {
            const testToken = 'test_token_123';
            api.setToken(testToken);
            expect(api.token).toBe(testToken);
        });

        test('ensureAuthenticated should throw when not authenticated', () => {
            expect(() => api.ensureAuthenticated()).toThrow('Nicht authentifiziert');
        });

        test('ensureAuthenticated should not throw when authenticated', () => {
            api.setToken('test_token');
            expect(() => api.ensureAuthenticated()).not.toThrow();
        });

        test('should have login method', () => {
            console.log('api.login type:', typeof api.login);
            console.log('api.login value:', api.login);
            console.log('api.username value:', api.username);
            expect(typeof api.login).toBe('function');
        });

        test('login should authenticate user', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: {
                        token: 'test_token_123',
                        session_id: 'session_123'
                    }
                })
            };

            mockFetch.mockResolvedValue(mockResponse);

            const result = await api.login();
            expect(result.token).toBe('test_token_123');
            expect(result.sessionId).toBe('session_123');
            expect(api.token).toBe('test_token_123');
        });

        test('login should throw error without credentials', async () => {
            const apiWithoutCreds = new RapidGatorAPI();
            await expect(apiWithoutCreds.login()).rejects.toThrow('Login und Passwort sind erforderlich');
        });
    });

    describe('Utility Functions', () => {
        test('formatFileSize should format bytes correctly', () => {
            expect(api.formatFileSize(0)).toBe('0 Bytes');
            expect(api.formatFileSize(1024)).toBe('1 KB');
            expect(api.formatFileSize(1048576)).toBe('1 MB');
            expect(api.formatFileSize(1073741824)).toBe('1 GB');
            expect(api.formatFileSize(1099511627776)).toBe('1 TB');
        });

        test('isValidFileId should validate file IDs correctly', () => {
            expect(api.isValidFileId('abc123xyz')).toBe(true);
            expect(api.isValidFileId('ABC123XYZ')).toBe(true);
            expect(api.isValidFileId('abcdef123456')).toBe(true);
            expect(api.isValidFileId('short')).toBe(false);
            expect(api.isValidFileId('with-dash')).toBe(false);
            expect(api.isValidFileId('with space')).toBe(false);
            expect(api.isValidFileId('')).toBe(false);
        });

        test('extractFileIdFromUrl should extract file ID from URL', () => {
            const url = 'https://rapidgator.net/file/abc123xyz/filename.zip';
            expect(api.extractFileIdFromUrl(url)).toBe('abc123xyz');

            const invalidUrl = 'https://example.com/invalid';
            expect(api.extractFileIdFromUrl(invalidUrl)).toBeNull();
        });
    });

    describe('API Requests', () => {
        test('makeRequest should handle successful response', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: { test: 'data' }
                })
            };

            mockFetch.mockResolvedValue(mockResponse);

            const result = await api.makeRequest('/test', 'GET');
            expect(result).toEqual({ test: 'data' });
        });

        test('makeRequest should handle API error', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 400,
                    response_details: 'Test error'
                })
            };

            mockFetch.mockResolvedValue(mockResponse);

            await expect(api.makeRequest('/test', 'GET')).rejects.toThrow('API Error: Test error');
        });

        test('makeRequest should handle HTTP error', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };

            mockFetch.mockResolvedValue(mockResponse);

            await expect(api.makeRequest('/test', 'GET')).rejects.toThrow('HTTP Error: 500 Internal Server Error');
        });
    });
});

describe('Utils', () => {
    describe('URL Validation', () => {
        test('isValidRapidGatorUrl should validate URLs correctly', () => {
            expect(utils.isValidRapidGatorUrl('https://rapidgator.net/file/abc123/test.zip')).toBe(true);
            expect(utils.isValidRapidGatorUrl('http://www.rapidgator.net/file/xyz789/doc.pdf')).toBe(true);
            expect(utils.isValidRapidGatorUrl('https://example.com/file/abc123')).toBe(false);
            expect(utils.isValidRapidGatorUrl('invalid-url')).toBe(false);
        });

        test('extractFileId should extract ID from URLs', () => {
            const url = 'https://rapidgator.net/file/abc123xyz/filename.zip';
            expect(utils.extractFileId(url)).toBe('abc123xyz');

            const invalidUrl = 'https://example.com/invalid';
            expect(utils.extractFileId(invalidUrl)).toBeNull();
        });
    });

    describe('File Size Formatting', () => {
        test('formatBytes should format file sizes correctly', () => {
            expect(utils.formatBytes(0)).toBe('0 Bytes');
            expect(utils.formatBytes(1024)).toBe('1 KB');
            expect(utils.formatBytes(1048576)).toBe('1 MB');
            expect(utils.formatBytes(1073741824)).toBe('1 GB');
        });
    });

    describe('Progress Tracker', () => {
        test('should track progress correctly', () => {
            const tracker = new utils.ProgressTracker(10);

            expect(tracker.completed).toBe(0);
            expect(tracker.total).toBe(10);

            const progress = tracker.update(true);
            expect(progress.completed).toBe(1);
            expect(progress.percentage).toBe(10);
            expect(tracker.failed).toBe(0);

            tracker.update(false);
            expect(tracker.failed).toBe(1);
            expect(tracker.completed).toBe(2);
        });
    });

    describe('Rate Limiter', () => {
        test('should allow requests within limit', async () => {
            const limiter = new utils.RateLimiter(5, 1000);

            const start = Date.now();
            await limiter.waitIfNeeded();
            const end = Date.now();

            expect(end - start).toBeLessThan(100);
        });

        test('should delay requests when limit exceeded', async () => {
            const limiter = new utils.RateLimiter(2, 1000);

            await limiter.waitIfNeeded();
            await limiter.waitIfNeeded();

            const start = Date.now();
            await limiter.waitIfNeeded();
            const end = Date.now();

            expect(end - start).toBeGreaterThan(900);
        });
    });

    describe('Retry Function', () => {
        test('should succeed on first try', async () => {
            const successFn = jest.fn().mockResolvedValue('success');
            const result = await utils.retry(successFn, 3, 100);

            expect(result).toBe('success');
            expect(successFn).toHaveBeenCalledTimes(1);
        });

        test('should retry on failure and eventually succeed', async () => {
            const retryFn = jest.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValueOnce('success');

            const result = await utils.retry(retryFn, 3, 10);

            expect(result).toBe('success');
            expect(retryFn).toHaveBeenCalledTimes(2);
        });

        test('should fail after max retries', async () => {
            const failFn = jest.fn().mockRejectedValue(new Error('always fail'));

            await expect(utils.retry(failFn, 2, 10)).rejects.toThrow('always fail');
            expect(failFn).toHaveBeenCalledTimes(3);
        });
    });

    describe('Config Validation', () => {
        test('should validate correct config', () => {
            const validConfig = {
                login: 'testuser',
                password: 'testpassword',
                timeout: 30000
            };

            const result = utils.validateConfig(validConfig);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should return errors for invalid config', () => {
            const invalidConfig = {
                login: '',
                password: 'short',
                timeout: 'invalid'
            };

            const result = utils.validateConfig(invalidConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('Additional Utils', () => {
        test('generateHash should generate random hash', () => {
            const hash1 = utils.generateHash(8);
            const hash2 = utils.generateHash(8);

            expect(hash1).toHaveLength(8);
            expect(hash2).toHaveLength(8);
            expect(hash1).not.toBe(hash2);
        });

        test('buildApiUrl should build correct URLs', () => {
            const url = utils.buildApiUrl('https://api.test.com', '/endpoint', {
                param1: 'value1',
                param2: 'value2'
            });

            expect(url).toBe('https://api.test.com/endpoint?param1=value1&param2=value2');
        });

        test('detectFileType should detect file types', () => {
            expect(utils.detectFileType('test.jpg')).toBe('image');
            expect(utils.detectFileType('video.mp4')).toBe('video');
            expect(utils.detectFileType('audio.mp3')).toBe('audio');
            expect(utils.detectFileType('archive.zip')).toBe('archive');
            expect(utils.detectFileType('doc.pdf')).toBe('document');
            expect(utils.detectFileType('script.js')).toBe('code');
            expect(utils.detectFileType('unknown.xyz')).toBe('unknown');
        });
    });
});
