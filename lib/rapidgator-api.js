/**
 * RapidGator API JavaScript-Bibliothek
 * Dateiname: lib/rapidgator-api.js
 */

// Node.js und Browser Kompatibilität
const fetch = (typeof window !== 'undefined') ? window.fetch : require('node-fetch');
const FormDataImpl = (typeof window !== 'undefined') ? window.FormData : require('form-data');
const { md5 } = require('./utils');

// Upload-Status-Codes der RapidGator API v2
const UPLOAD_STATE = {
    UPLOADING: 0,
    PROCESSING: 1,
    DONE: 2,
    FAIL: 3
};

class RapidGatorAPI {
    constructor(username = null, password = null, options = {}) {
        this.baseURL = options.baseURL || 'https://rapidgator.net/api/v2';
        this.username = username;  // Verwende username statt login
        this.password = password;
        this.token = null;
        this.sessionId = null;
        this.timeout = options.timeout || 30000;
        this.retryCount = options.retryCount || 3;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * HTTP-Request Helper mit Retry-Logik
     */
    async makeRequest(endpoint, method = 'GET', data = null, retryCount = null) {
        const maxRetries = retryCount !== null ? retryCount : this.retryCount;
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this._makeRequestAttempt(endpoint, method, data);
            } catch (error) {
                lastError = error;

                if (attempt < maxRetries) {
                    await this._sleep(this.retryDelay * (attempt + 1));
                }
            }
        }

        throw lastError;
    }

    async _makeRequestAttempt(endpoint, method, data) {
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
                options.url = `${url}?${params.toString()}`;
            } else {
                options.body = new URLSearchParams(data);
            }
        }

        const targetUrl = options.url || url;
        const response = await fetch(targetUrl, options);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // API v2 liefert 'status'/'details'; ältere Aufrufer/Mocks nutzen
        // 'response_status'/'response_details' — beide Varianten akzeptieren.
        const apiStatus = (result.status !== undefined) ? result.status : result.response_status;
        const apiDetails = result.details || result.response_details;

        if (apiStatus !== 200) {
            throw new Error(`API Error: ${apiDetails || 'Unknown error'} (Code: ${apiStatus})`);
        }

        return result.response;
    }

    /**
     * Sleep Helper
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Benutzer-Authentifizierung
     */
    async login(username = null, password = null) {
        const loginData = {
            login: username || this.username,  // API erwartet 'login' field
            password: password || this.password
        };

        if (!loginData.login || !loginData.password) {
            throw new Error('Login und Passwort sind erforderlich');
        }

        const response = await this.makeRequest('/user/login', 'POST', loginData);

        this.token = response.token;
        this.sessionId = response.session_id;

        return {
            token: this.token,
            sessionId: this.sessionId,
            user: response
        };
    }

    /**
     * Token-basierte Authentifizierung
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * Benutzerinformationen abrufen
     */
    async getUserInfo() {
        this.ensureAuthenticated();

        const response = await this.makeRequest('/user/info', 'POST', {
            token: this.token
        });

        // API kapselt die Daten in response.user
        return response.user || response;
    }

    /**
     * Premium-Status prüfen
     */
    async isPremium() {
        const userInfo = await this.getUserInfo();
        return userInfo.is_premium === true;
    }

    /**
     * Logout
     */
    async logout() {
        if (this.token) {
            try {
                await this.makeRequest('/user/logout', 'POST', {
                    token: this.token
                });
            } catch (error) {
                // Ignore logout errors
            }
            this.token = null;
            this.sessionId = null;
        }
    }

    /**
     * API Health Check
     */
    async healthCheck() {
        try {
            await this.makeRequest('/user/info', 'GET');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Datei-Informationen abrufen
     */
    async getFileInfo(fileId) {
        this.ensureAuthenticated();

        const response = await this.makeRequest('/file/info', 'POST', {
            token: this.token,
            file_id: fileId
        });

        // API kapselt die Daten in response.file
        return response.file || response;
    }

    /**
     * Download-Link generieren
     */
    async getDownloadUrl(fileId) {
        this.ensureAuthenticated();

        return await this.makeRequest('/file/download', 'POST', {
            token: this.token,
            file_id: fileId
        });
    }

    /**
     * Datei löschen
     */
    async deleteFile(fileId) {
        this.ensureAuthenticated();

        return await this.makeRequest('/file/delete', 'POST', {
            token: this.token,
            file_id: fileId
        });
    }

    /**
     * Upload-Prozess initialisieren.
     * Registriert eine Upload-Session bei der API. Bei bekanntem Hash kann die
     * API einen Instant-Upload melden (state === DONE).
     */
    async initUpload(filename, filesize, folderId = null, hash = null) {
        this.ensureAuthenticated();

        const data = {
            token: this.token,
            name: filename,
            size: filesize
        };

        if (hash) { data.hash = hash; }
        if (folderId) { data.folder_id = folderId; }

        const response = await this.makeRequest('/file/upload', 'POST', data);
        const upload = response.upload || response;

        // Normalisierter Rückgabewert inkl. upload_url-Alias (siehe types)
        return Object.assign({}, upload, {
            upload_url: upload.url || upload.upload_url || null,
            upload_id: upload.upload_id
        });
    }

    /**
     * Datei-Bytes an die Upload-URL senden (multipart/form-data, Feld "file").
     */
    async _uploadBytes(uploadUrl, content, filename) {
        const form = new FormDataImpl();
        form.append('file', content, filename);

        const options = { method: 'POST', body: form };

        // form-data (Node) liefert die Header inkl. Boundary; im Browser setzt
        // fetch den Content-Type mit Boundary selbst.
        if (typeof form.getHeaders === 'function') {
            options.headers = form.getHeaders();
        }

        const response = await fetch(uploadUrl, options);

        if (!response.ok) {
            throw new Error(`Upload HTTP Error: ${response.status} ${response.statusText}`);
        }

        // Antwort ist optional/JSON; Parse-Fehler ignorieren.
        try {
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    /**
     * Auf Abschluss einer Upload-Session warten (Polling von /file/upload_info).
     */
    async _waitForUpload(uploadId, onProgress = null, maxAttempts = 60, interval = 2000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const info = await this.makeRequest('/file/upload_info', 'GET', {
                token: this.token,
                upload_id: uploadId
            });

            const upload = info.upload || info;

            if (upload.state === UPLOAD_STATE.DONE) {
                if (onProgress) { onProgress(100); }
                return upload.file || upload;
            }

            if (upload.state === UPLOAD_STATE.FAIL) {
                throw new Error('Upload fehlgeschlagen (state: fail)');
            }

            await this._sleep(interval);
        }

        throw new Error('Upload-Timeout: Datei wurde nicht rechtzeitig verarbeitet');
    }

    /**
     * Datei aus Node.js hochladen (Dateipfad).
     */
    async uploadFileNode(filePath, filename = null, folderId = null, onProgress = null) {
        this.ensureAuthenticated();

        // fs/path nur in Node.js benötigt
        const fs = require('fs');
        const path = require('path');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Datei nicht gefunden: ${filePath}`);
        }

        const buffer = fs.readFileSync(filePath);
        const name = filename || path.basename(filePath);
        const size = buffer.length;
        const hash = md5(buffer);

        if (onProgress) { onProgress(0); }

        const uploadInfo = await this.initUpload(name, size, folderId, hash);

        // Instant-Upload: Datei existiert bereits serverseitig (Hash-Treffer)
        if (uploadInfo.state === UPLOAD_STATE.DONE && uploadInfo.file) {
            if (onProgress) { onProgress(100); }
            return {
                uploadInfo,
                uploadResult: null,
                fileId: (uploadInfo.file && uploadInfo.file.file_id) || null
            };
        }

        const uploadResult = await this._uploadBytes(uploadInfo.upload_url, buffer, name);
        const file = await this._waitForUpload(uploadInfo.upload_id, onProgress);

        return {
            uploadInfo,
            uploadResult,
            fileId: (file && file.file_id) || null
        };
    }

    /**
     * Datei aus dem Browser hochladen (File-/Blob-Objekt).
     */
    async uploadFile(file, folderId = null, onProgress = null) {
        this.ensureAuthenticated();

        const name = file.name;
        const size = file.size;
        const buffer = new Uint8Array(await file.arrayBuffer());
        const hash = md5(buffer);

        if (onProgress) { onProgress(0); }

        const uploadInfo = await this.initUpload(name, size, folderId, hash);

        if (uploadInfo.state === UPLOAD_STATE.DONE && uploadInfo.file) {
            if (onProgress) { onProgress(100); }
            return {
                uploadInfo,
                uploadResult: null,
                fileId: (uploadInfo.file && uploadInfo.file.file_id) || null
            };
        }

        const uploadResult = await this._uploadBytes(uploadInfo.upload_url, file, name);
        const uploaded = await this._waitForUpload(uploadInfo.upload_id, onProgress);

        return {
            uploadInfo,
            uploadResult,
            fileId: (uploaded && uploaded.file_id) || null
        };
    }

    /**
     * Neuen Ordner erstellen.
     */
    async createFolder(name, parentId = null) {
        this.ensureAuthenticated();

        const data = { token: this.token, name };
        if (parentId) { data.parent_folder_id = parentId; }

        return await this.makeRequest('/folder/create', 'POST', data);
    }

    /**
     * Ordner-Inhalt abrufen (Dateien + Unterordner).
     */
    async getFolderContent(folderId = null) {
        this.ensureAuthenticated();

        const data = { token: this.token };
        if (folderId) { data.folder_id = folderId; }

        const response = await this.makeRequest('/folder/content', 'GET', data);
        const folder = response.folder || response;

        return {
            folder,
            files: folder.files || [],
            folders: folder.folders || [],
            pager: response.pager || null
        };
    }

    /**
     * Ordner löschen.
     */
    async deleteFolder(folderId) {
        this.ensureAuthenticated();

        // Die API akzeptiert mehrere, kommagetrennte folder_id-Werte
        const ids = Array.isArray(folderId) ? folderId.join(',') : folderId;

        return await this.makeRequest('/folder/delete', 'POST', {
            token: this.token,
            folder_id: ids
        });
    }

    /**
     * Dateien auflisten (mit Paginierung). Nutzt /folder/content.
     */
    async getFileList(page = 1, perPage = 100, folderId = null) {
        this.ensureAuthenticated();

        const data = { token: this.token, page, per_page: perPage };
        if (folderId) { data.folder_id = folderId; }

        const response = await this.makeRequest('/folder/content', 'GET', data);
        const folder = response.folder || response;

        return {
            folder,
            files: folder.files || [],
            folders: folder.folders || [],
            pager: response.pager || null
        };
    }

    /**
     * Alle Dateien abrufen (automatische Paginierung über getFileList).
     */
    async getAllFiles(folderId = null, onProgress = null) {
        this.ensureAuthenticated();

        const allFiles = [];
        const perPage = 500; // API-Default
        let page = 1;
        const maxPages = 10000; // Sicherheitslimit gegen Endlosschleifen

        while (page <= maxPages) {
            const result = await this.getFileList(page, perPage, folderId);

            if (result.files.length > 0) {
                allFiles.push(...result.files);
            }

            if (onProgress) {
                onProgress({ currentPage: page, totalFiles: allFiles.length });
            }

            // pager = { current, total } — total ist die Anzahl der SEITEN
            const pager = result.pager;
            let hasMore;
            if (pager && typeof pager.current === 'number' && typeof pager.total === 'number') {
                hasMore = pager.current < pager.total;
            } else {
                hasMore = result.files.length === perPage;
            }

            if (!hasMore || result.files.length === 0) { break; }
            page++;
        }

        return allFiles;
    }

    /**
     * Mehrere Dateien löschen (Batch mit Fortschritt).
     */
    async batchDeleteFiles(fileIds, onProgress = null) {
        this.ensureAuthenticated();

        const results = [];
        const total = fileIds.length;
        const startTime = Date.now();

        for (let i = 0; i < total; i++) {
            const fileId = fileIds[i];

            try {
                const result = await this.deleteFile(fileId);
                results.push({ fileId, success: true, result });
            } catch (error) {
                results.push({ fileId, success: false, error: error.message });
            }

            if (onProgress) {
                const completed = i + 1;
                onProgress({
                    completed,
                    total,
                    current: fileId,
                    progress: (completed / total) * 100,
                    elapsedTime: Date.now() - startTime
                });
            }
        }

        return results;
    }

    /**
     * Download-Links für mehrere Dateien generieren (Batch mit Fortschritt).
     */
    async batchGetDownloadUrls(fileIds, onProgress = null) {
        this.ensureAuthenticated();

        const results = [];
        const total = fileIds.length;
        const startTime = Date.now();

        for (let i = 0; i < total; i++) {
            const fileId = fileIds[i];

            try {
                const result = await this.getDownloadUrl(fileId);
                results.push({
                    fileId,
                    success: true,
                    downloadUrl: result.download_url || result.url || null,
                    result
                });
            } catch (error) {
                results.push({ fileId, success: false, error: error.message });
            }

            if (onProgress) {
                const completed = i + 1;
                onProgress({
                    completed,
                    total,
                    current: fileId,
                    progress: (completed / total) * 100,
                    elapsedTime: Date.now() - startTime
                });
            }
        }

        return results;
    }

    /**
     * Session erneuern (Re-Login mit gespeicherten Zugangsdaten).
     */
    async refreshSession() {
        this.token = null;
        this.sessionId = null;
        return await this.login();
    }

    /**
     * URL-Helpers
     */
    extractFileIdFromUrl(url) {
        const match = url.match(/rapidgator\.net\/file\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    async getFileInfoFromUrl(url) {
        const fileId = this.extractFileIdFromUrl(url);

        if (!fileId) {
            throw new Error('Ungültige RapidGator URL');
        }

        return await this.getFileInfo(fileId);
    }

    /**
     * Hilfsfunktionen
     */
    ensureAuthenticated() {
        if (!this.token) {
            throw new Error('Nicht authentifiziert. Bitte zuerst login() aufrufen oder setToken() verwenden.');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) {return '0 Bytes';}

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
    }

    isValidFileId(fileId) {
        if (!fileId || typeof fileId !== 'string') {
            return false;
        }

        // RapidGator File-IDs sind typischerweise alphanumerisch und mindestens 8 Zeichen
        return /^[a-zA-Z0-9]{8,}$/.test(fileId);
    }
}

module.exports = RapidGatorAPI;
