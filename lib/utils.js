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
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
        if (!success) this.failed++;

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
            const waitTime = this.timeWindow - (now - oldestRequest);

            if (waitTime > 0) {
                await sleep(waitTime);
                return this.waitIfNeeded();
            }
        }

        this.requests.push(now);
    }
}

/**
 * Konfiguration validieren
 */
function validateConfig(config) {
    const errors = [];

    if (!config.login || typeof config.login !== 'string') {
        errors.push('Login ist erforderlich und muss ein String sein');
    }

    if (!config.password || typeof config.password !== 'string') {
        errors.push('Passwort ist erforderlich und muss ein String sein');
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000)) {
        errors.push('Timeout muss eine Zahl >= 1000 sein');
    }

    if (config.retryCount && (typeof config.retryCount !== 'number' || config.retryCount < 0)) {
        errors.push('RetryCount muss eine Zahl >= 0 sein');
    }

    return errors;
}

module.exports = {
    isValidRapidGatorUrl,
    extractFileId,
    formatBytes,
    sleep,
    retry,
    ProgressTracker,
    RateLimiter,
    validateConfig
};