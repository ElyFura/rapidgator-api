/**
 * RapidGator API JavaScript-Bibliothek
 * Dateiname: lib/rapidgator-api.js
 */

// Node.js und Browser Kompatibilität
const fetch = (typeof window !== 'undefined') ? window.fetch : require('node-fetch');
(typeof window !== 'undefined') ? window.FormData : require('form-data');
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

        if (result.response_status !== 200) {
            throw new Error(`API Error: ${result.response_details || 'Unknown error'} (Code: ${result.response_status})`);
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
