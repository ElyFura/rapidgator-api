/**
 * RapidGator API Utilities
 * Dateiname: lib/utils.js
 */

/**
 * URL-Validierung für RapidGator Links
 */
function isValidRapidGatorUrl(url) {
    const pattern = /^https?:\/\/(?:www\.)?rapidgator\.net\/file\/[a-zA-Z0-9]+/;
    return pattern.test(url);
}

/**
 * Datei-ID aus URL extrahieren
 */
function extractFileId(url) {
    const match = url.match(/rapidgator\.net\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

/**
 * Dateigröße formatieren
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) {return '0 Bytes';}

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))  } ${  sizes[i]}`;
}

/**
 * Sleep/Delay Funktion
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry-Wrapper für asynchrone Funktionen
 */
async function retry(fn, retries = 3, delay = 1000) {
    let lastError;

    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (i < retries) {
                await sleep(delay * (i + 1));
            }
        }
    }

    throw lastError;
}

/**
 * Progress-Tracker für Batch-Operationen
 */
class ProgressTracker {
    constructor(total, onUpdate = null) {
        this.total = total;
        this.completed = 0;
        this.failed = 0;
        this.onUpdate = onUpdate;
        this.startTime = Date.now();
    }

    update(success = true) {
        this.completed++;
        if (!success) {this.failed++;}

        const progress = {
            completed: this.completed,
            failed: this.failed,
            remaining: this.total - this.completed,
            percentage: (this.completed / this.total) * 100,
            elapsedTime: Date.now() - this.startTime
        };

        if (this.onUpdate) {
            this.onUpdate(progress);
        }

        return progress;
    }

    isComplete() {
        return this.completed >= this.total;
    }

    getStats() {
        return {
            total: this.total,
            completed: this.completed,
            failed: this.failed,
            success: this.completed - this.failed,
            percentage: (this.completed / this.total) * 100,
            elapsedTime: Date.now() - this.startTime
        };
    }
}

/**
 * Rate Limiter
 */
class RateLimiter {
    constructor(maxRequests = 10, timeWindow = 60000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }

    async waitIfNeeded() {
        const now = Date.now();

        // Alte Requests entfernen
        this.requests = this.requests.filter(time => now - time < this.timeWindow);

        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = this.timeWindow - (now - oldestRequest) + 10; // +10ms Puffer

            if (waitTime > 0) {
                await sleep(waitTime);
            }
        }

        this.requests.push(now);
    }
}

/**
 * Config Validation
 */
function validateConfig(config) {
    const errors = [];

    if (!config.login || config.login.trim() === '') {
        errors.push('Login ist erforderlich');
    }

    if (!config.password || config.password.length < 6) {
        errors.push('Passwort muss mindestens 6 Zeichen lang sein');
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000)) {
        errors.push('Timeout muss eine Zahl >= 1000 sein');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Hash-Generator für Datei-IDs
 */
function generateHash(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * URL Builder für API-Endpunkte
 */
function buildApiUrl(baseUrl, endpoint, params = {}) {
    let url = `${baseUrl.replace(/\/$/, '')  }/${  endpoint.replace(/^\//, '')}`;

    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            queryParams.append(key, params[key]);
        }
    });

    const queryString = queryParams.toString();
    if (queryString) {
        url += `?${  queryString}`;
    }

    return url;
}

/**
 * Error Handler für API-Responses
 */
function handleApiError(error, context = '') {
    if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.response_details || error.message;

        switch (status) {
        case 401:
            return new Error(`Authentifizierung fehlgeschlagen${context ? ` bei ${  context}` : ''}: ${message}`);
        case 403:
            return new Error(`Zugriff verweigert${context ? ` bei ${  context}` : ''}: ${message}`);
        case 404:
            return new Error(`Ressource nicht gefunden${context ? ` bei ${  context}` : ''}: ${message}`);
        case 429:
            return new Error(`Rate-Limit erreicht${context ? ` bei ${  context}` : ''}: ${message}`);
        case 500:
            return new Error(`Server-Fehler${context ? ` bei ${  context}` : ''}: ${message}`);
        default:
            return new Error(`API-Fehler (${status})${context ? ` bei ${  context}` : ''}: ${message}`);
        }
    }

    return new Error(`Netzwerk-Fehler${context ? ` bei ${  context}` : ''}: ${error.message}`);
}

/**
 * File Type Detection
 */
function detectFileType(filename) {
    const extension = filename.split('.').pop().toLowerCase();

    const types = {
        // Bilder
        'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'bmp': 'image', 'webp': 'image',
        // Videos
        'mp4': 'video', 'avi': 'video', 'mov': 'video', 'mkv': 'video', 'flv': 'video', 'wmv': 'video',
        // Audio
        'mp3': 'audio', 'wav': 'audio', 'flac': 'audio', 'aac': 'audio', 'ogg': 'audio',
        // Archive
        'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive', 'gz': 'archive',
        // Dokumente
        'pdf': 'document', 'doc': 'document', 'docx': 'document', 'txt': 'document', 'rtf': 'document',
        // Code
        'js': 'code', 'html': 'code', 'css': 'code', 'php': 'code', 'py': 'code', 'java': 'code'
    };

    return types[extension] || 'unknown';
}

module.exports = {
    isValidRapidGatorUrl,
    extractFileId,
    formatBytes,
    sleep,
    retry,
    ProgressTracker,
    RateLimiter,
    validateConfig,
    generateHash,
    buildApiUrl,
    handleApiError,
    detectFileType
};
