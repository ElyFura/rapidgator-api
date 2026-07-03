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
 * MD5-Hash (reine JS-Implementierung, funktioniert in Node.js und Browser)
 * Akzeptiert einen String (wird als UTF-8 kodiert) oder ein Byte-Array
 * (Buffer / Uint8Array / Array<number>) und liefert den Hex-Hash zurück.
 * Wird für den RapidGator-Upload benötigt (Datei-Hash), da die Web Crypto API
 * kein MD5 unterstützt.
 */
function md5(input) {
    let bytes;

    if (typeof input === 'string') {
        bytes = [];
        for (let i = 0; i < input.length; i++) {
            const c = input.charCodeAt(i);
            if (c < 128) {
                bytes.push(c);
            } else if (c < 2048) {
                bytes.push(192 | (c >> 6), 128 | (c & 63));
            } else if (c < 55296 || c >= 57344) {
                bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
            } else {
                // Surrogate-Paar
                i++;
                const cp = 65536 + (((c & 1023) << 10) | (input.charCodeAt(i) & 1023));
                bytes.push(240 | (cp >> 18), 128 | ((cp >> 12) & 63), 128 | ((cp >> 6) & 63), 128 | (cp & 63));
            }
        }
    } else {
        bytes = input;
    }

    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

    function cycle(state, blk) {
        let a = state[0], b = state[1], c = state[2], d = state[3];

        a = ff(a, b, c, d, blk[0], 7, -680876936);
        d = ff(d, a, b, c, blk[1], 12, -389564586);
        c = ff(c, d, a, b, blk[2], 17, 606105819);
        b = ff(b, c, d, a, blk[3], 22, -1044525330);
        a = ff(a, b, c, d, blk[4], 7, -176418897);
        d = ff(d, a, b, c, blk[5], 12, 1200080426);
        c = ff(c, d, a, b, blk[6], 17, -1473231341);
        b = ff(b, c, d, a, blk[7], 22, -45705983);
        a = ff(a, b, c, d, blk[8], 7, 1770035416);
        d = ff(d, a, b, c, blk[9], 12, -1958414417);
        c = ff(c, d, a, b, blk[10], 17, -42063);
        b = ff(b, c, d, a, blk[11], 22, -1990404162);
        a = ff(a, b, c, d, blk[12], 7, 1804603682);
        d = ff(d, a, b, c, blk[13], 12, -40341101);
        c = ff(c, d, a, b, blk[14], 17, -1502002290);
        b = ff(b, c, d, a, blk[15], 22, 1236535329);

        a = gg(a, b, c, d, blk[1], 5, -165796510);
        d = gg(d, a, b, c, blk[6], 9, -1069501632);
        c = gg(c, d, a, b, blk[11], 14, 643717713);
        b = gg(b, c, d, a, blk[0], 20, -373897302);
        a = gg(a, b, c, d, blk[5], 5, -701558691);
        d = gg(d, a, b, c, blk[10], 9, 38016083);
        c = gg(c, d, a, b, blk[15], 14, -660478335);
        b = gg(b, c, d, a, blk[4], 20, -405537848);
        a = gg(a, b, c, d, blk[9], 5, 568446438);
        d = gg(d, a, b, c, blk[14], 9, -1019803690);
        c = gg(c, d, a, b, blk[3], 14, -187363961);
        b = gg(b, c, d, a, blk[8], 20, 1163531501);
        a = gg(a, b, c, d, blk[13], 5, -1444681467);
        d = gg(d, a, b, c, blk[2], 9, -51403784);
        c = gg(c, d, a, b, blk[7], 14, 1735328473);
        b = gg(b, c, d, a, blk[12], 20, -1926607734);

        a = hh(a, b, c, d, blk[5], 4, -378558);
        d = hh(d, a, b, c, blk[8], 11, -2022574463);
        c = hh(c, d, a, b, blk[11], 16, 1839030562);
        b = hh(b, c, d, a, blk[14], 23, -35309556);
        a = hh(a, b, c, d, blk[1], 4, -1530992060);
        d = hh(d, a, b, c, blk[4], 11, 1272893353);
        c = hh(c, d, a, b, blk[7], 16, -155497632);
        b = hh(b, c, d, a, blk[10], 23, -1094730640);
        a = hh(a, b, c, d, blk[13], 4, 681279174);
        d = hh(d, a, b, c, blk[0], 11, -358537222);
        c = hh(c, d, a, b, blk[3], 16, -722521979);
        b = hh(b, c, d, a, blk[6], 23, 76029189);
        a = hh(a, b, c, d, blk[9], 4, -640364487);
        d = hh(d, a, b, c, blk[12], 11, -421815835);
        c = hh(c, d, a, b, blk[15], 16, 530742520);
        b = hh(b, c, d, a, blk[2], 23, -995338651);

        a = ii(a, b, c, d, blk[0], 6, -198630844);
        d = ii(d, a, b, c, blk[7], 10, 1126891415);
        c = ii(c, d, a, b, blk[14], 15, -1416354905);
        b = ii(b, c, d, a, blk[5], 21, -57434055);
        a = ii(a, b, c, d, blk[12], 6, 1700485571);
        d = ii(d, a, b, c, blk[3], 10, -1894986606);
        c = ii(c, d, a, b, blk[10], 15, -1051523);
        b = ii(b, c, d, a, blk[1], 21, -2054922799);
        a = ii(a, b, c, d, blk[8], 6, 1873313359);
        d = ii(d, a, b, c, blk[15], 10, -30611744);
        c = ii(c, d, a, b, blk[6], 15, -1560198380);
        b = ii(b, c, d, a, blk[13], 21, 1309151649);
        a = ii(a, b, c, d, blk[4], 6, -145523070);
        d = ii(d, a, b, c, blk[11], 10, -1120210379);
        c = ii(c, d, a, b, blk[2], 15, 718787259);
        b = ii(b, c, d, a, blk[9], 21, -343485551);

        state[0] = add32(a, state[0]);
        state[1] = add32(b, state[1]);
        state[2] = add32(c, state[2]);
        state[3] = add32(d, state[3]);
    }

    function md5blk(off) {
        const blk = new Array(16);
        for (let j = 0; j < 16; j++) {
            const p = off + j * 4;
            blk[j] = bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24);
        }
        return blk;
    }

    const n = bytes.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];

    let i;
    for (i = 64; i <= n; i += 64) {
        cycle(state, md5blk(i - 64));
    }

    // Rest (letzter, unvollständiger Block) inkl. Padding
    const tailStart = n - (n % 64);
    const tail = new Array(16).fill(0);
    for (i = tailStart; i < n; i++) {
        tail[(i - tailStart) >> 2] |= bytes[i] << (((i - tailStart) % 4) << 3);
    }
    const rem = n % 64;
    tail[rem >> 2] |= 0x80 << ((rem % 4) << 3);
    if (rem > 55) {
        cycle(state, tail);
        for (let j = 0; j < 16; j++) { tail[j] = 0; }
    }
    tail[14] = (n * 8) >>> 0;
    tail[15] = Math.floor(n / 0x20000000) >>> 0;
    cycle(state, tail);

    function rhex(x) {
        let s = '';
        for (let j = 0; j < 4; j++) {
            s += ((x >> (j * 8)) & 0xFF).toString(16).padStart(2, '0');
        }
        return s;
    }

    return rhex(state[0]) + rhex(state[1]) + rhex(state[2]) + rhex(state[3]);
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
    detectFileType,
    md5
};
