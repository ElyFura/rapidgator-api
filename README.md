# RapidGator API

![NPM Version](https://img.shields.io/npm/v/rapidgator-api)
![NPM License](https://img.shields.io/npm/l/rapidgator-api)
![NPM Downloads](https://img.shields.io/npm/dm/rapidgator-api)

Eine vollständige JavaScript-Bibliothek für die RapidGator API v2. Unterstützt sowohl Node.js als auch Browser-Umgebungen mit TypeScript-Support.

## 🚀 Features

- ✅ **Vollständige API-Abdeckung** - Alle RapidGator API v2 Endpunkte
- ✅ **Node.js & Browser** - Funktioniert überall
- ✅ **TypeScript-Support** - Vollständige Typdefinitionen
- ✅ **Progress-Tracking** - Upload- und Batch-Fortschritt
- ✅ **Retry-Logik** - Automatische Wiederholung bei Fehlern
- ✅ **Rate-Limiting** - Schutz vor API-Limits
- ✅ **Batch-Operationen** - Mehrere Dateien gleichzeitig verarbeiten
- ✅ **Session-Management** - Automatische Token-Verwaltung
- ✅ **Umfangreiche Dokumentation** - Mit Beispielen und Tests

## 📦 Installation

```bash
npm install rapidgator-api
```

**Yarn:**
```bash
yarn add rapidgator-api
```

**CDN (Browser):**
```html
<script src="https://unpkg.com/rapidgator-api/dist/rapidgator-api.min.js"></script>
```

## 🏃 Schnellstart

### Node.js

```javascript
const { RapidGatorAPI } = require('rapidgator-api');

// API-Instanz erstellen
const api = new RapidGatorAPI('dein_login', 'dein_passwort');

async function quickExample() {
    try {
        // Einloggen
        await api.login();
        console.log('✅ Erfolgreich eingeloggt!');

        // Datei hochladen
        const uploadResult = await api.uploadFileNode('./meine-datei.pdf');
        console.log('📤 Datei hochgeladen:', uploadResult.fileId);

        // Download-Link generieren
        const downloadInfo = await api.getDownloadUrl(uploadResult.fileId);
        console.log('🔗 Download-URL:', downloadInfo.download_url);

        // Benutzer-Info
        const userInfo = await api.getUserInfo();
        console.log('👤 Premium:', userInfo.is_premium ? 'Ja' : 'Nein');

    } catch (error) {
        console.error('❌ Fehler:', error.message);
    }
}

quickExample();
```

### Browser

```html
<!DOCTYPE html>
<html>
<head>
    <title>RapidGator Upload</title>
</head>
<body>
    <input type="file" id="fileInput" />
    <div id="progress"></div>
    <div id="result"></div>

    <script src="https://unpkg.com/rapidgator-api/dist/rapidgator-api.min.js"></script>
    <script>
        const api = new RapidGatorAPI('dein_login', 'dein_passwort');

        document.getElementById('fileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                await api.login();

                const result = await api.uploadFile(file, null, (progress) => {
                    document.getElementById('progress').textContent = `Upload: ${progress.toFixed(1)}%`;
                });

                document.getElementById('result').innerHTML = `
                    <p>✅ Upload erfolgreich!</p>
                    <p>Datei-ID: ${result.fileId}</p>
                `;

            } catch (error) {
                document.getElementById('result').innerHTML = `❌ Fehler: ${error.message}`;
            }
        });
    </script>
</body>
</html>
```

### TypeScript

```typescript
import { RapidGatorAPI, RapidGatorOptions, UploadResult } from 'rapidgator-api';

const options: RapidGatorOptions = {
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000
};

const api = new RapidGatorAPI('login', 'password', options);

async function typedExample(): Promise<void> {
    const loginResult = await api.login();
    console.log('Token:', loginResult.token);

    const uploadResult: UploadResult = await api.uploadFileNode('./test.txt');
    console.log('Upload ID:', uploadResult.fileId);
}
```

## 📚 API-Referenz

### Konstruktor

```javascript
const api = new RapidGatorAPI(login, password, options);
```

**Parameter:**
- `login` (string, optional) - RapidGator Benutzername
- `password` (string, optional) - RapidGator Passwort
- `options` (object, optional) - Konfigurationsoptionen

**Options:**
```javascript
{
    baseURL: 'https://rapidgator.net/api/v2',  // API Base URL
    timeout: 30000,                           // Request Timeout (ms)
    retryCount: 3,                           // Anzahl Wiederholungen
    retryDelay: 1000                         // Verzögerung zwischen Wiederholungen (ms)
}
```

### 🔐 Authentifizierung

#### `login(login?, password?)`
Benutzer einloggen und Token erhalten.

```javascript
const loginResult = await api.login();
console.log('Token:', loginResult.token);
console.log('Session ID:', loginResult.sessionId);
```

#### `setToken(token)`
Token direkt setzen (ohne Login).

```javascript
api.setToken('dein_gespeicherter_token');
```

#### `logout()`
Benutzer ausloggen und Session beenden.

```javascript
await api.logout();
```

### 👤 Benutzer-Informationen

#### `getUserInfo()`
Benutzerinformationen abrufen.

```javascript
const userInfo = await api.getUserInfo();
console.log('Premium:', userInfo.is_premium);
console.log('Email:', userInfo.email);
console.log('Traffic übrig:', userInfo.traffic.left);
```

#### `isPremium()`
Premium-Status prüfen.

```javascript
const isPremium = await api.isPremium();
console.log('Premium-Benutzer:', isPremium);
```

### 📤 Datei-Upload

#### `uploadFileNode(filePath, filename?, folderId?, onProgress?)`
Datei aus Node.js hochladen.

```javascript
const result = await api.uploadFileNode(
    './meine-datei.pdf',           // Dateipfad
    'custom-name.pdf',             // Optionaler Name
    'folder123'
);

console.log('Datei-ID:', result.fileId);
```

#### `uploadFile(file, folderId?, onProgress?)`
Datei aus Browser hochladen.

```javascript
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];

const result = await api.uploadFile(file, null, (progress) => {
    document.getElementById('progress').textContent = `${progress}%`;
});
```

#### `initUpload(filename, filesize, folderId?)`
Upload-Prozess initialisieren (für custom Upload-Logik).

```javascript
const uploadInfo = await api.initUpload('test.txt', 1024, 'folder123');
console.log('Upload URL:', uploadInfo.upload_url);
```

### 📁 Datei-Management

#### `getFileInfo(fileId)`
Informationen zu einer Datei abrufen.

```javascript
const fileInfo = await api.getFileInfo('abc123xyz');
console.log('Dateiname:', fileInfo.name);
console.log('Größe:', api.formatFileSize(fileInfo.size));
console.log('Upload-Datum:', new Date(fileInfo.created * 1000).toISOString());
```

#### `getDownloadUrl(fileId)`
Download-Link für eine Datei generieren.

```javascript
const downloadInfo = await api.getDownloadUrl('abc123xyz');
console.log('Download URL:', downloadInfo.download_url);
console.log('Wartezeit (Sek.):', downloadInfo.delay);
```

#### `deleteFile(fileId)`
Datei löschen.

```javascript
await api.deleteFile('abc123xyz');
console.log('✅ Datei gelöscht');
```

#### `getFileList(page?, perPage?, folderId?)`
Dateien auflisten (mit Paginierung).

```javascript
const files = await api.getFileList(1, 50, 'folder123');
console.log(`Gefundene Dateien: ${files.files.length}`);

files.files.forEach(file => {
    console.log(`- ${file.name} (${api.formatFileSize(file.size)})`);
});
```

#### `getAllFiles(folderId?, onProgress?)`
Alle Dateien abrufen (automatische Paginierung).

```javascript
const allFiles = await api.getAllFiles(null, (progress) => {
    console.log(`Seite ${progress.currentPage}, ${progress.totalFiles} Dateien geladen`);
});

console.log(`Insgesamt: ${allFiles.length} Dateien`);
```

### 📂 Ordner-Management

#### `createFolder(name, parentId?)`
Neuen Ordner erstellen.

```javascript
const folder = await api.createFolder('Mein Ordner', 'parent123');
console.log('Ordner-ID:', folder.folder_id);
```

#### `getFolderContent(folderId?)`
Ordner-Inhalt abrufen.

```javascript
const content = await api.getFolderContent('folder123');
console.log('Dateien:', content.files.length);
console.log('Unterordner:', content.folders.length);
```

#### `deleteFolder(folderId)`
Ordner löschen.

```javascript
await api.deleteFolder('folder123');
console.log('✅ Ordner gelöscht');
```

### 🔄 Batch-Operationen

#### `batchDeleteFiles(fileIds, onProgress?)`
Mehrere Dateien löschen.

```javascript
const fileIds = ['file1', 'file2', 'file3'];

const results = await api.batchDeleteFiles(fileIds, (progress) => {
    console.log(`${progress.completed}/${progress.total} - ${progress.progress.toFixed(1)}%`);
});

// Ergebnisse prüfen
results.forEach(result => {
    if (result.success) {
        console.log(`✅ ${result.fileId} gelöscht`);
    } else {
        console.log(`❌ ${result.fileId}: ${result.error}`);
    }
});
```

#### `batchGetDownloadUrls(fileIds, onProgress?)`
Download-Links für mehrere Dateien generieren.

```javascript
const fileIds = ['file1', 'file2', 'file3'];

const results = await api.batchGetDownloadUrls(fileIds, (progress) => {
    console.log(`Fortschritt: ${progress.progress.toFixed(1)}%`);
});

results.forEach(result => {
    if (result.success) {
        console.log(`🔗 ${result.fileId}: ${result.downloadUrl}`);
    } else {
        console.log(`❌ ${result.fileId}: ${result.error}`);
    }
});
```

### 🛠 Hilfsfunktionen

#### `formatFileSize(bytes)`
Dateigröße in lesbare Form formatieren.

```javascript
console.log(api.formatFileSize(1024));       // "1 KB"
console.log(api.formatFileSize(1048576));    // "1 MB"
console.log(api.formatFileSize(1073741824)); // "1 GB"
```

#### `extractFileIdFromUrl(url)`
File-ID aus RapidGator URL extrahieren.

```javascript
const url = 'https://rapidgator.net/file/abc123xyz/filename.zip';
const fileId = api.extractFileIdFromUrl(url);
console.log('File-ID:', fileId); // "abc123xyz"
```

#### `getFileInfoFromUrl(url)`
Datei-Informationen direkt aus URL abrufen.

```javascript
const url = 'https://rapidgator.net/file/abc123xyz/test.zip';
const fileInfo = await api.getFileInfoFromUrl(url);
console.log('Dateiname:', fileInfo.name);
```

#### `isValidFileId(fileId)`
File-ID auf Gültigkeit prüfen.

```javascript
console.log(api.isValidFileId('abc123xyz')); // true
console.log(api.isValidFileId('invalid'));   // false
```

#### `healthCheck()`
API-Verfügbarkeit prüfen.

```javascript
const isOnline = await api.healthCheck();
console.log('API erreichbar:', isOnline);
```

## 🧰 Utilities

Die Bibliothek enthält zusätzliche Hilfsfunktionen:

```javascript
const { utils } = require('rapidgator-api');

// URL-Validierung
const isValid = utils.isValidRapidGatorUrl('https://rapidgator.net/file/abc123/test.zip');

// Dateigröße formatieren
const formatted = utils.formatBytes(1024, 2); // "1.00 KB"

// Retry-Wrapper
await utils.retry(async () => {
    // Deine Funktion die wiederholt werden soll
    return await someUnstableOperation();
}, 3, 1000); // 3 Versuche, 1s Pause

// Progress-Tracker
const tracker = new utils.ProgressTracker(100, (progress) => {
    console.log(`${progress.percentage}% abgeschlossen`);
});

// Rate-Limiter
const limiter = new utils.RateLimiter(10, 60000); // 10 Requests pro Minute
await limiter.waitIfNeeded();
```

## 📊 Progress-Tracking

Alle Upload- und Batch-Operationen unterstützen Progress-Callbacks:

### Upload-Progress

```javascript
const result = await api.uploadFileNode('./large-file.zip', null, null);
```

### Batch-Progress

```javascript
const results = await api.batchDeleteFiles(fileIds, (progress) => {
    console.log(`🗑️  Lösche ${progress.current}`);
    console.log(`📊 Fortschritt: ${progress.completed}/${progress.total} (${progress.progress}%)`);

    // Geschätzte verbleibende Zeit
    const timePerItem = progress.elapsedTime / progress.completed;
    const remaining = (progress.total - progress.completed) * timePerItem;
    console.log(`⏱️  Verbleibend: ${Math.round(remaining/1000)}s`);
});
```

## ⚠️ Fehlerbehandlung

Die Bibliothek wirft aussagekräftige Fehler:

```javascript
try {
    await api.uploadFileNode('./nonexistent.txt');
} catch (error) {
    if (error.message.includes('nicht gefunden')) {
        console.error('❌ Datei existiert nicht');
    } else if (error.message.includes('API Error')) {
        console.error('❌ RapidGator API Fehler:', error.message);
    } else if (error.message.includes('Nicht authentifiziert')) {
        console.error('❌ Bitte zuerst einloggen');
        await api.login();
    } else {
        console.error('❌ Unbekannter Fehler:', error.message);
    }
}
```

**Häufige Fehlercodes:**
- `401` - Authentifizierung fehlgeschlagen
- `403` - Keine Berechtigung / Premium erforderlich
- `404` - Datei/Ordner nicht gefunden
- `413` - Datei zu groß
- `429` - Rate-Limit erreicht
- `500` - Server-Fehler

## 🔧 Erweiterte Konfiguration

### Retry-Verhalten anpassen

```javascript
const api = new RapidGatorAPI('login', 'password', {
    retryCount: 5,      // 5 Wiederholungsversuche
    retryDelay: 2000,   // 2 Sekunden Pause zwischen Versuchen
    timeout: 60000      // 60 Sekunden Timeout
});
```

### Custom Base-URL

```javascript
const api = new RapidGatorAPI('login', 'password', {
    baseURL: 'https://custom-rapidgator-proxy.com/api/v2'
});
```

### Token persistent speichern

```javascript
// Token speichern
localStorage.setItem('rapidgator_token', api.token);

// Token laden
const savedToken = localStorage.getItem('rapidgator_token');
if (savedToken) {
    api.setToken(savedToken);
}
```

## 🎯 Vollständige Beispiele

### Kompletter Upload-Workflow

```javascript
const { RapidGatorAPI } = require('rapidgator-api');

async function completeUploadWorkflow() {
    const api = new RapidGatorAPI('login', 'password');

    try {
        // 1. Einloggen
        console.log('🔐 Authentifizierung...');
        await api.login();

        // 2. Premium prüfen
        const isPremium = await api.isPremium();
        if (!isPremium) {
            console.warn('⚠️  Kein Premium-Account - limitierte Features');
        }

        // 3. Ordner für Upload erstellen
        console.log('📁 Ordner erstellen...');
        const folder = await api.createFolder('Upload ' + new Date().toISOString().split('T')[0]);

        // 4. Datei hochladen
        console.log('📤 Upload starten...');
        const uploadResult = await api.uploadFileNode('./wichtige-datei.pdf', null, folder.folder_id, (progress) => {
            process.stdout.write(`\r📊 Upload: ${progress}%`);
        });
        console.log('\n✅ Upload abgeschlossen:', uploadResult.fileId);

        // 5. Download-Link generieren
        console.log('🔗 Download-Link erstellen...');
        const downloadInfo = await api.getDownloadUrl(uploadResult.fileId);
        console.log('📎 Share-Link:', downloadInfo.download_url);

        // 6. Datei-Informationen anzeigen
        const fileInfo = await api.getFileInfo(uploadResult.fileId);
        console.log('📋 Datei-Details:');
        console.log(`   Name: ${fileInfo.name}`);
        console.log(`   Größe: ${api.formatFileSize(fileInfo.size)}`);
        console.log(`   Upload: ${new Date(fileInfo.created * 1000).toISOString()}`);

        return {
            fileId: uploadResult.fileId,
            downloadUrl: downloadInfo.download_url,
            folderId: folder.folder_id
        };

    } catch (error) {
        console.error('❌ Workflow-Fehler:', error.message);
        throw error;
    }
}

completeUploadWorkflow();
```

### Batch-Upload mit Ordner-Organisation

```javascript
async function batchUploadOrganized(files, folderName) {
    const api = new RapidGatorAPI(process.env.RG_LOGIN, process.env.RG_PASSWORD);

    try {
        await api.login();

        // Haupt-Ordner erstellen
        const mainFolder = await api.createFolder(folderName);
        console.log(`📁 Hauptordner erstellt: ${mainFolder.folder_id}`);

        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`\n📤 Upload ${i+1}/${files.length}: ${file}`);

            try {
                const uploadResult = await api.uploadFileNode(file, null, mainFolder.folder_id, (progress) => {
                    process.stdout.write(`\r   📊 ${progress.toFixed(1)}%`);
                });

                console.log(`\n   ✅ Erfolgreich: ${uploadResult.fileId}`);
                results.push({ file, success: true, fileId: uploadResult.fileId });

            } catch (error) {
                console.log(`\n   ❌ Fehlgeschlagen: ${error.message}`);
                results.push({ file, success: false, error: error.message });
            }

            // Pause zwischen Uploads
            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Zusammenfassung
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`\n📊 Upload-Zusammenfassung:`);
        console.log(`   ✅ Erfolgreich: ${successful}`);
        console.log(`   ❌ Fehlgeschlagen: ${failed}`);
        console.log(`   📁 Ordner-ID: ${mainFolder.folder_id}`);

        return { results, folderId: mainFolder.folder_id };

    } catch (error) {
        console.error('❌ Batch-Upload-Fehler:', error.message);
        throw error;
    }
}

// Verwendung
const filesToUpload = [
    './dokument1.pdf',
    './bild1.jpg',
    './video1.mp4'
];

batchUploadOrganized(filesToUpload, 'Projekt Alpha');
```

### Download-Manager

```javascript
class RapidGatorDownloadManager {
    constructor(login, password) {
        this.api = new RapidGatorAPI(login, password);
        this.downloadQueue = [];
        this.isProcessing = false;
    }

    async init() {
        await this.api.login();
        console.log('✅ Download-Manager initialisiert');
    }

    addDownload(fileIdOrUrl, localPath) {
        const fileId = fileIdOrUrl.includes('rapidgator.net')
            ? this.api.extractFileIdFromUrl(fileIdOrUrl)
            : fileIdOrUrl;

        this.downloadQueue.push({ fileId, localPath });
        console.log(`➕ Download zur Warteschlange hinzugefügt: ${fileId}`);
    }

    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        console.log(`🚀 Verarbeite ${this.downloadQueue.length} Downloads...`);

        for (let i = 0; i < this.downloadQueue.length; i++) {
            const download = this.downloadQueue[i];

            try {
                console.log(`\n📥 Download ${i+1}/${this.downloadQueue.length}: ${download.fileId}`);

                // Download-Link generieren
                const downloadInfo = await this.api.getDownloadUrl(download.fileId);
                console.log(`🔗 Download-URL erhalten: ${downloadInfo.download_url}`);

                // Hier würdest du den tatsächlichen Download implementieren
                // z.B. mit fetch() oder http-Client
                console.log(`💾 Speichere nach: ${download.localPath}`);

                // Simulation des Downloads
                await this.simulateDownload(downloadInfo.download_url, download.localPath);
                console.log(`✅ Download abgeschlossen: ${download.fileId}`);

            } catch (error) {
                console.log(`❌ Download fehlgeschlagen: ${error.message}`);
            }

            // Pause zwischen Downloads
            if (i < this.downloadQueue.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        this.downloadQueue = [];
        this.isProcessing = false;
        console.log('\n🎉 Alle Downloads abgeschlossen!');
    }

    async simulateDownload(url, localPath) {
        // Hier würde der echte Download stattfinden
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Verwendung
const downloadManager = new RapidGatorDownloadManager('login', 'password');
await downloadManager.init();

downloadManager.addDownload('https://rapidgator.net/file/abc123/video.mp4', './downloads/video.mp4');
downloadManager.addDownload('def456', './downloads/document.pdf');

await downloadManager.processQueue();
```

## 🧪 Testing

Das Package enthält ein umfangreiches Test-Suite:

```bash
# Alle Tests ausführen
npm test

# Tests mit Coverage
npm run test:coverage

# Einzelne Tests
npm run test -- --grep "upload"
```

**Test-Beispiel:**
```javascript
// test/rapidgator-api.test.js
const { RapidGatorAPI } = require('../index');

describe('RapidGatorAPI', () => {
    let api;

    beforeEach(() => {
        api = new RapidGatorAPI('test_login', 'test_password');
    });

    test('should initialize with correct default options', () => {
        expect(api.baseURL).toBe('https://rapidgator.net/api/v2');
        expect(api.username).toBe('test_login');
        expect(api.password).toBe('test_password');
    });

    test('should format file size correctly', () => {
        expect(api.formatFileSize(1024)).toBe('1 KB');
        expect(api.formatFileSize(1048576)).toBe('1 MB');
    });

    test('should extract file ID from URL', () => {
        const url = 'https://rapidgator.net/file/abc123xyz/test.zip';
        expect(api.extractFileIdFromUrl(url)).toBe('abc123xyz');
    });
});
```

## 🚦 Limits & Best Practices

### API-Limits beachten
- **Free-Benutzer**: Begrenzte Downloads pro Tag
- **Premium-Benutzer**: Höhere Limits, parallele Downloads
- **Upload-Limits**: Abhängig vom Account-Typ

### Empfehlungen
```javascript
// ✅ Gut: Rate-Limiting verwenden
const { utils } = require('rapidgator-api');
const rateLimiter = new utils.RateLimiter(5, 60000); // 5 Requests/Minute

for (const fileId of fileIds) {
    await rateLimiter.waitIfNeeded();
    await api.getFileInfo(fileId);
}

// ✅ Gut: Retry mit exponential backoff
await utils.retry(async () => {
    return await api.uploadFileNode('./large-file.zip');
}, 3, 1000);

// ❌ Schlecht: Zu viele parallele Requests
await Promise.all(fileIds.map(id => api.getFileInfo(id))); // Kann zu Blockierung führen
```

## 🔒 Sicherheit

### Credentials sicher speichern
```javascript
// ✅ Environment Variables verwenden
const api = new RapidGatorAPI(
    process.env.RAPIDGATOR_LOGIN,
    process.env.RAPIDGATOR_PASSWORD
);

// ✅ Token-basierte Auth (sicherer)
api.setToken(process.env.RAPIDGATOR_TOKEN);

// ❌ Niemals Credentials im Code
const api = new RapidGatorAPI('meinlogin', 'meinpasswort'); // Nicht machen!
```

### HTTPS immer verwenden
```javascript
const api = new RapidGatorAPI('login', 'password', {
    baseURL: 'https://rapidgator.net/api/v2' // HTTPS!
});
```

## 📱 Browser-Kompatibilität

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Opera 47+

**Polyfills für ältere Browser:**
```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=fetch,Promise"></script>
<script src="rapidgator-api.min.js"></script>
```

## 🔄 Migration

### Von v0.x zu v1.x

```javascript
// Alte Version (v0.x)
const api = new RapidGatorAPI();
api.setCredentials('login', 'password');
await api.authenticate();

// Neue Version (v1.x)
const api = new RapidGatorAPI('login', 'password');
await api.login();
```

## 📞 Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/elyfura/rapidgator-api/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/elyfura/rapidgator-api/discussions)

## 📄 Changelog

### v1.1.0
- ✨ Upload implementiert: `uploadFileNode`, `uploadFile`, `initUpload` (inkl. MD5-Hash & Instant-Upload)
- ✨ Ordner-Management: `createFolder`, `getFolderContent`, `deleteFolder`
- ✨ Datei-Listing: `getFileList`, `getAllFiles` (automatische Paginierung)
- ✨ Batch-Operationen: `batchDeleteFiles`, `batchGetDownloadUrls`
- ✨ `refreshSession` (Re-Login mit gespeicherten Zugangsdaten)
- 🐛 Fix: FormData-Import (wurde nie einer Variable zugewiesen)

### v1.0.0
- ✨ Initiales Release
- ✅ Vollständige API v2 Unterstützung
- ✅ Node.js und Browser Support
- ✅ TypeScript Definitionen
- ✅ Progress-Tracking
- ✅ Batch-Operationen

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## 🤝 Contributing

Beiträge sind willkommen! Bitte lese die [CONTRIBUTING.md](CONTRIBUTING.md) für Guidelines.

```bash
# Development Setup
git clone https://github.com/elyfura/rapidgator-api.git
cd rapidgator-api
npm install
npm run dev

# Tests ausführen
npm test

# Build erstellen
npm run build
```

## ⭐ Show your support

Gib dem Projekt einen ⭐ wenn es dir hilft!

---

**Erstellt mit ❤️ für die JavaScript-Community**