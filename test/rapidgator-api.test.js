// Dateiname: test/rapidgator-api.test.js

const RapidGatorAPI = require('../lib/rapidgator-api');
const { utils } = require('../index');

// Mock fetch für Tests
global.fetch = jest.fn();

describe('RapidGatorAPI', () => {
    let api;

    beforeEach(() => {
        api = new RapidGatorAPI('test_login', 'test_password');
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with correct default options', () => {
            expect(api.baseURL).toBe('https://rapidgator.net/api/v2');
            expect(api.login).toBe('test_login');
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
                json: () => Promise.resolve({
                    response_status: 200,
                    response: { test: 'data' }
                })
            };

            global.fetch.mockResolvedValueOnce(mockResponse);

            const result = await api.makeRequest('/test', 'GET');
            expect(result).toEqual({ test: 'data' });
        });

        test('makeRequest should handle API error', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    response_status: 400,
                    response_details: 'Test error'
                })
            };

            global.fetch.mockResolvedValueOnce(mockResponse);

            await expect(api.makeRequest('/test', 'GET')).rejects.toThrow('API Error: Test error');
        });

        test('makeRequest should handle HTTP error', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };

            global.fetch.mockResolvedValueOnce(mockResponse);

            await expect(api.makeRequest('/test', 'GET')).rejects.toThrow('HTTP Error: 500 Internal Server Error');
        });
    });

    describe('File Operations', () => {
        beforeEach(() => {
            api.setToken('test_token');
        });

        test('getFileInfo should make correct API call', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    response_status: 200,
                    response: {
                        file_id: 'test123',
                        filename: 'test.txt',
                        size: 1024
                    }
                })
            };

            global.fetch.mockResolvedValueOnce(mockResponse);

            const result = await api.getFileInfo('test123');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://rapidgator.net/api/v2/file/info',
                expect.objectContaining({
                    method: 'POST',
                    body: new URLSearchParams({ file_id: 'test123' })
                })
            );

            expect(result).toEqual({
                file_id: 'test123',
                filename: 'test.txt',
                size: 1024
            });
        });

        test('deleteFile should make correct API call', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    response_status: 200,
                    response: { success: true }
                })
            };

            global.fetch.mockResolvedValueOnce(mockResponse);

            const result = await api.deleteFile('test123');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://rapidgator.net/api/v2/file/delete',
                expect.objectContaining({
                    method: 'POST',
                    body: new URLSearchParams({
                        token: 'test_token',
                        file_id: 'test123'
                    })
                })
            );
        });
    });

    describe('Batch Operations', () => {
        beforeEach(() => {
            api.setToken('test_token');
        });

        test('batchDeleteFiles should handle mixed results', async () => {
            // Mock für ersten erfolgreichen Delete
            const successResponse = {
                ok: true,
                json: () => Promise.resolve({
                    response_status: 200,
                    response: { success: true }
                })
            };

            // Mock für zweiten fehlgeschlagenen Delete
            const errorResponse = {
                ok: true,
                json: () => Promise.resolve({
                    response_status: 404,
                    response_details: 'File not found'
                })
            };

            global.fetch
                .mockResolvedValueOnce(successResponse)
                .mockResolvedValueOnce(errorResponse);

            const results = await api.batchDeleteFiles(['file1', 'file2']);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[0].fileId).toBe('file1');
            expect(results[1].success).toBe(false);
            expect(results[1].fileId).toBe('file2');
            expect(results[1].error).toContain('File not found');
        });
    });
});

describe('Utils', () => {
    describe('URL Validation', () => {
        test('isValidRapidGatorUrl should validate URLs correctly', () => {
            expect(utils.isValidRapidGatorUrl('https://rapidgator.net/file/abc123/test.zip')).toBe(true);
            expect(utils.isValidRapidGatorUrl('http://rapidgator.net/file/abc123/test.zip')).toBe(true);
            expect(utils.isValidRapidGatorUrl('https://www.rapidgator.net/file/abc123/test.zip')).toBe(true);
            expect(utils.isValidRapidGatorUrl('https://example.com/file/abc123/test.zip')).toBe(false);
            expect(utils.isValidRapidGatorUrl('invalid-url')).toBe(false);
        });

        test('extractFileId should extract ID from URLs', () => {
            expect(utils.extractFileId('https://rapidgator.net/file/abc123xyz/test.zip')).toBe('abc123xyz');
            expect(utils.extractFileId('invalid-url')).toBeNull();
        });
    });

    describe('File Size Formatting', () => {
        test('formatBytes should format file sizes correctly', () => {
            expect(utils.formatBytes(0)).toBe('0 Bytes');
            expect(utils.formatBytes(1024)).toBe('1 KB');
            expect(utils.formatBytes(1048576)).toBe('1 MB');
            expect(utils.formatBytes(1048576, 0)).toBe('1 MB');
            expect(utils.formatBytes(1536, 1)).toBe('1.5 KB');
        });
    });

    describe('Progress Tracker', () => {
        test('should track progress correctly', () => {
            const tracker = new utils.ProgressTracker(10);

            expect(tracker.completed).toBe(0);
            expect(tracker.total).toBe(10);
            expect(tracker.isComplete()).toBe(false);

            const progress1 = tracker.update(true);
            expect(progress1.completed).toBe(1);
            expect(progress1.percentage).toBe(10);

            const progress2 = tracker.update(false); // Failed
            expect(progress2.completed).toBe(2);
            expect(progress2.failed).toBe(1);
            expect(progress2.percentage).toBe(20);

            // Complete remaining
            for (let i = 0; i < 8; i++) {
                tracker.update(true);
            }

            expect(tracker.isComplete()).toBe(true);

            const stats = tracker.getStats();
            expect(stats.success).toBe(9);
            expect(stats.failed).toBe(1);
            expect(stats.percentage).toBe(100);
        });
    });

    describe('Rate Limiter', () => {
        test('should allow requests within limit', async () => {
            const limiter = new utils.RateLimiter(2, 1000); // 2 requests per second

            const start = Date.now();

            await limiter.waitIfNeeded();
            await limiter.waitIfNeeded();

            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(100); // Should be immediate
        });

        test('should delay requests when limit exceeded', async () => {
            const limiter = new utils.RateLimiter(1, 1000); // 1 request per second

            await limiter.waitIfNeeded();

            const start = Date.now();
            await limiter.waitIfNeeded();
            const elapsed = Date.now() - start;

            expect(elapsed).toBeGreaterThan(900); // Should wait ~1 second
        }, 10000);
    });

    describe('Retry Function', () => {
        test('should succeed on first try', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');

            const result = await utils.retry(mockFn, 3, 100);

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        test('should retry on failure and eventually succeed', async () => {
            const mockFn = jest.fn()
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockRejectedValueOnce(new Error('fail 2'))
                .mockResolvedValue('success');

            const result = await utils.retry(mockFn, 3, 10);

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(3);
        });

        test('should fail after max retries', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('always fail'));

            await expect(utils.retry(mockFn, 2, 10)).rejects.toThrow('always fail');
            expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
        });
    });

    describe('Config Validation', () => {
        test('should validate correct config', () => {
            const config = {
                login: 'testuser',
                password: 'testpass',
                timeout: 5000,
                retryCount: 3
            };

            const errors = utils.validateConfig(config);
            expect(errors).toHaveLength(0);
        });

        test('should return errors for invalid config', () => {
            const config = {
                login: '',
                password: 123,
                timeout: 500,
                retryCount: -1
            };

            const errors = utils.validateConfig(config);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.includes('Login'))).toBe(true);
            expect(errors.some(e => e.includes('Passwort'))).toBe(true);
            expect(errors.some(e => e.includes('Timeout'))).toBe(true);
            expect(errors.some(e => e.includes('RetryCount'))).toBe(true);
        });
    });
});