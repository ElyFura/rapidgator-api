/**
 * RapidGator API JavaScript-Bibliothek
 * Dateiname: lib/rapidgator-api.js
 */

// Node.js und Browser Kompatibilität
const fetch = (typeof window !== 'undefined') ? window.fetch : require('node-fetch');
const FormData = (typeof window !== 'undefined') ? window.FormData : require('form-data');

class RapidGatorAPI {
    constructor(login = null, password = null, options = {}) {
        this.baseURL = options.baseURL || 'https://rapidgator.net/api/v2';
        this.login = login;
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
                    continue;
                }
            }
        }

        throw lastError;
    }

    async _makeRequestAttempt(endpoint, method, data) {
        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'RapidGator-JS-API/1.0'
            },
            timeout: this.timeout
        };

        if (data) {
            if (method === 'GET') {
                const params = new URLSearchParams(data);
                const fullUrl = url + '?' + params.toString();
                options.url = fullUrl;
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

        if (result.response_status !== 200) {
            throw new Error(`API Error: ${result.response_details || 'Unknown error'} (Code: ${result.response_status})`);
        }

        return result.response;
    }

    /**
     * Benutzer-Authentifizierung
     */
    async login(login = null, password = null) {
        const loginData = {
            login: login || this.login,
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

        return await this.makeRequest('/user/info', 'POST', {
            token: this.token
        });
    }

    /**
     * Premium-Status prüfen
     */
    async isPremium() {
        const userInfo = await this.getUserInfo();
        return userInfo.is_premium === true;
    }

    /**
     * Datei-Upload (Node.js Version)
     */
    async uploadFileNode(filePath, filename = null, folderId = null, onProgress = null) {
        if (typeof window !== 'undefined') {
            throw new Error('uploadFileNode() ist nur in Node.js verfügbar. Verwenden Sie uploadFile() im Browser.');
        }

        const fs = require('fs');
        const path = require('path');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Datei nicht gefunden: ${filePath}`);
        }

        const stats = fs.statSync(filePath);
        const actualFilename = filename || path.basename(filePath);

        // Upload initialisieren
        const uploadInfo = await this.initUpload(actualFilename, stats.size, folderId);

        // FormData erstellen
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        // Upload durchführen
        const response = await fetch(uploadInfo.upload_url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload fehlgeschlagen: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        return {
            uploadInfo,
            uploadResult: result,
            fileId: result.file_id || uploadInfo.file_id
        };
    }

    /**
     * Datei-Upload initialisieren
     */
    async initUpload(filename, filesize, folderId = null) {
        this.ensureAuthenticated();

        const data = {
            token: this.token,
            filename: filename,
            size: filesize
        };

        if (folderId) {
            data.folder_id = folderId;
        }

        return await this.makeRequest('/file/upload', 'POST', data);
    }

    /**
     * Browser-Datei-Upload
     */
    async uploadFile(file, folderId = null, onProgress = null) {
        if (!(file instanceof File)) {
            throw new Error('Parameter muss eine File-Instanz sein');
        }

        const uploadInfo = await this.initUpload(file.name, file.size, folderId);

        const formData = new FormData();
        formData.append('file', file);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            uploadInfo,
                            uploadResult: response,
                            fileId: response.file_id || uploadInfo.file_id
                        });
                    } catch (e) {
                        reject(new Error('Fehler beim Parsen der Server-Antwort'));
                    }
                } else {
                    reject(new Error(`Upload fehlgeschlagen: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload-Fehler aufgetreten'));
            });

            xhr.open('POST', uploadInfo.upload_url);
            xhr.send(formData);
        });
    }

    /**
     * Datei-Informationen abrufen
     */
    async getFileInfo(fileId) {
        return await this.makeRequest('/file/info', 'POST', {
            file_id: fileId
        });
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
     * Ordner erstellen
     */
    async createFolder(name, parentId = null) {
        this.ensureAuthenticated();

        const data = {
            token: this.token,
            name: name
        };

        if (parentId) {
            data.parent_id = parentId;
        }

        return await this.makeRequest('/folder/create', 'POST', data);
    }

    /**
     * Ordner-Inhalt abrufen
     */
    async getFolderContent(folderId = null) {
        this.ensureAuthenticated();

        const data = {
            token: this.token
        };

        if (folderId) {
            data.folder_id = folderId;
        }

        return await this.makeRequest('/folder/content', 'POST', data);
    }

    /**
     * Ordner löschen
     */
    async deleteFolder(folderId) {
        this.ensureAuthenticated();

        return await this.makeRequest('/folder/delete', 'POST', {
            token: this.token,
            folder_id: folderId
        });
    }

    /**
     * Alle Dateien des Benutzers abrufen
     */
    async getFileList(page = 1, perPage = 50, folderId = null) {
        this.ensureAuthenticated();

        const data = {
            token: this.token,
            page: page,
            per_page: perPage
        };

        if (folderId) {
            data.folder_id = folderId;
        }

        return await this.makeRequest('/file/list', 'POST', data);
    }

    /**
     * Alle Dateien mit Paginierung abrufen
     */
    async getAllFiles(folderId = null, onProgress = null) {
        this.ensureAuthenticated();

        const allFiles = [];
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        while (hasMore) {
            const response = await this.getFileList(page, perPage, folderId);

            if (response.files && response.files.length > 0) {
                allFiles.push(...response.files);

                if (onProgress) {
                    onProgress({
                        currentPage: page,
                        totalFiles: allFiles.length,
                        hasMore: response.files.length === perPage
                    });
                }

                hasMore = response.files.length === perPage;
                page++;
            } else {
                hasMore = false;
            }
        }

        return allFiles;
    }

    /**
     * Batch-Operationen für mehrere Dateien
     */
    async batchDeleteFiles(fileIds, onProgress = null) {
        this.ensureAuthenticated();

        const results = [];
        const total = fileIds.length;

        for (let i = 0; i < total; i++) {
            const fileId = fileIds[i];

            try {
                const result = await this.deleteFile(fileId);
                results.push({ fileId, success: true, result });
            } catch (error) {
                results.push({ fileId, success: false, error: error.message });
            }

            if (onProgress) {
                onProgress({
                    completed: i + 1,
                    total: total,
                    progress: ((i + 1) / total) * 100,
                    current: fileId
                });
            }
        }

        return results;
    }

    /**
     * Download-Links für mehrere Dateien generieren
     */
    async batchGetDownloadUrls(fileIds, onProgress = null) {
        this.ensureAuthenticated();

        const results = [];
        const total = fileIds.length;

        for (let i = 0; i < total; i++) {
            const fileId = fileIds[i];

            try {
                const result = await this.getDownloadUrl(fileId);
                results.push({
                    fileId,
                    success: true,
                    downloadUrl: result.download_url,
                    result
                });
            } catch (error) {
                results.push({ fileId, success: false, error: error.message });
            }

            if (onProgress) {
                onProgress({
                    completed: i + 1,
                    total: total,
                    progress: ((i + 1) / total) * 100,
                    current: fileId
                });
            }
        }

        return results;
    }

    /**
     * Datei-URL aus Link extrahieren
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
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';

        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    isValidFileId(fileId) {
        return /^[a-zA-Z0-9]{8,}$/.test(fileId);
    }

    async _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Session-Management
     */
    async refreshSession() {
        if (!this.login || !this.password) {
            throw new Error('Kann Session nicht erneuern: Login-Daten nicht verfügbar');
        }

        return await this.login();
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
                // Logout-Fehler ignorieren
                console.warn('Logout-Warnung:', error.message);
            }
        }

        this.token = null;
        this.sessionId = null;
    }

    /**
     * Health Check
     */
    async healthCheck() {
        try {
            const response = await fetch(this.baseURL + '/user/info', {
                method: 'HEAD',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

module.exports = RapidGatorAPI;