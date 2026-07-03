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

    describe('Upload', () => {
        const os = require('os');
        const fs = require('fs');
        const path = require('path');

        beforeEach(() => {
            api.setToken('test_token');
        });

        test('initUpload should register a session and normalize upload_url', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: { upload: { upload_id: 'u1', url: 'http://up.example/x', state: 0 } }
                })
            });

            const info = await api.initUpload('a.txt', 100, null, 'deadbeef');
            expect(info.upload_id).toBe('u1');
            expect(info.upload_url).toBe('http://up.example/x');
            expect(info.state).toBe(0);
        });

        test('uploadFileNode should short-circuit on instant upload (state DONE)', async () => {
            const tmpFile = path.join(os.tmpdir(), `rg-test-${process.pid}.txt`);
            fs.writeFileSync(tmpFile, 'hello rapidgator');

            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: { upload: { upload_id: 'u2', state: 2, file: { file_id: 'abc123' } } }
                })
            });

            const progress = [];
            const result = await api.uploadFileNode(tmpFile, null, null, (p) => progress.push(p));

            expect(result.fileId).toBe('abc123');
            expect(result.uploadResult).toBeNull();
            expect(progress).toContain(100);
            // Nur der initUpload-Request, kein Byte-Upload / Polling
            expect(mockFetch).toHaveBeenCalledTimes(1);

            fs.unlinkSync(tmpFile);
        });

        test('uploadFileNode should throw for missing file', async () => {
            await expect(api.uploadFileNode('/does/not/exist.txt')).rejects.toThrow('Datei nicht gefunden');
        });
    });

    describe('Folders & Listing', () => {
        beforeEach(() => {
            api.setToken('test_token');
        });

        test('createFolder should call folder/create', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: { folder_id: 'f1' }
                })
            });

            const folder = await api.createFolder('Neuer Ordner', 'parent1');
            expect(folder.folder_id).toBe('f1');

            // Parent muss als parent_folder_id gesendet werden (offizielle API-Doku)
            const body = mockFetch.mock.calls[0][1].body.toString();
            expect(body).toContain('parent_folder_id=parent1');
        });

        test('getFolderContent should normalize files/folders', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: {
                        folder: { files: [{ file_id: 'a' }, { file_id: 'b' }], folders: [{ folder_id: 'x' }] },
                        pager: { current: 1, total: 1 }
                    }
                })
            });

            const content = await api.getFolderContent('f1');
            expect(content.files).toHaveLength(2);
            expect(content.folders).toHaveLength(1);
            expect(content.pager.current).toBe(1);
        });

        test('getAllFiles should stop after the last page', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: {
                        folder: { files: [{ file_id: 'a' }], folders: [] },
                        pager: { current: 1, total: 1 }
                    }
                })
            });

            const all = await api.getAllFiles();
            expect(all).toHaveLength(1);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        test('getAllFiles should follow multiple pages (pager.current < pager.total)', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        status: 200,
                        response: { folder: { files: [{ file_id: 'a' }], folders: [] }, pager: { current: 1, total: 2 } }
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        status: 200,
                        response: { folder: { files: [{ file_id: 'b' }], folders: [] }, pager: { current: 2, total: 2 } }
                    })
                });

            const all = await api.getAllFiles();
            expect(all.map(f => f.file_id)).toEqual(['a', 'b']);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Batch Operations', () => {
        beforeEach(() => {
            api.setToken('test_token');
        });

        test('batchDeleteFiles should report per-file success and failure', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({ response_status: 200, response: {} })
                })
                .mockResolvedValue({
                    ok: true,
                    json: jest.fn().mockResolvedValue({ response_status: 404, response_details: 'not found' })
                });

            const progress = [];
            const results = await api.batchDeleteFiles(['ok', 'bad'], (p) => progress.push(p));

            expect(results[0]).toMatchObject({ fileId: 'ok', success: true });
            expect(results[1].success).toBe(false);
            expect(results[1].error).toContain('not found');
            expect(progress[progress.length - 1].progress).toBe(100);
        });

        test('batchGetDownloadUrls should extract download_url', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: { download_url: 'http://dl/1' }
                })
            });

            const results = await api.batchGetDownloadUrls(['f1']);
            expect(results[0].success).toBe(true);
            expect(results[0].downloadUrl).toBe('http://dl/1');
        });
    });

    describe('Session', () => {
        test('refreshSession should re-login with stored credentials', async () => {
            api.setToken('old_token');
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response_status: 200,
                    response: { token: 'new_token', session_id: 's2' }
                })
            });

            const result = await api.refreshSession();
            expect(result.token).toBe('new_token');
            expect(api.token).toBe('new_token');
        });
    });

    describe('Response envelope & unwrapping', () => {
        beforeEach(() => api.setToken('test_token'));

        test('makeRequest should accept the official status/details envelope', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ status: 200, response: { ok: 1 }, details: null })
            });

            const result = await api.makeRequest('/test', 'GET');
            expect(result).toEqual({ ok: 1 });
        });

        test('makeRequest should surface the official error envelope', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ status: 401, details: 'Bad token' })
            });

            // retryCount 0, damit der Test nicht durch Retries verzögert wird
            await expect(api.makeRequest('/test', 'GET', null, 0)).rejects.toThrow('API Error: Bad token');
        });

        test('getUserInfo should unwrap response.user', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ status: 200, response: { user: { email: 'a@b.c', is_premium: true } } })
            });

            const info = await api.getUserInfo();
            expect(info.email).toBe('a@b.c');
            expect(info.is_premium).toBe(true);
        });

        test('isPremium should read the unwrapped user object', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ status: 200, response: { user: { is_premium: true } } })
            });

            expect(await api.isPremium()).toBe(true);
        });

        test('getFileInfo should send token and unwrap response.file', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ status: 200, response: { file: { file_id: 'x', name: 'a.exe', size: 10 } } })
            });

            const file = await api.getFileInfo('x');
            expect(file.name).toBe('a.exe');
            expect(file.size).toBe(10);

            const body = mockFetch.mock.calls[0][1].body.toString();
            expect(body).toContain('token=test_token');
            expect(body).toContain('file_id=x');
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

        test('md5 should match known vectors (string input)', () => {
            expect(utils.md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
            expect(utils.md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
            expect(utils.md5('The quick brown fox jumps over the lazy dog'))
                .toBe('9e107d9d372bb6826bd81d3542a419d6');
        });

        test('md5 should accept byte arrays and match Node crypto', () => {
            const crypto = require('crypto');
            const buf = Buffer.from('hello rapidgator upload test', 'utf8');
            const expected = crypto.createHash('md5').update(buf).digest('hex');
            expect(utils.md5(buf)).toBe(expected);
            expect(utils.md5(new Uint8Array(buf))).toBe(expected);
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
