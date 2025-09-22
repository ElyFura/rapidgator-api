// Dateiname: examples/upload-example.js

const { RapidGatorAPI } = require('../index');
const fs = require('fs');
const path = require('path');

async function uploadExample() {
    const api = new RapidGatorAPI('dein_login', 'dein_passwort');

    try {
        console.log('🔐 Einloggen...');
        await api.login();

        // Test-Datei erstellen
        const testFile = path.join(__dirname, 'test-upload.txt');
        fs.writeFileSync(testFile, 'Dies ist eine Test-Datei für den RapidGator Upload!');

        console.log('📤 Datei hochladen...');
        const uploadResult = await api.uploadFileNode(testFile, 'mein-test-upload.txt', null, (progress) => {
            if (progress) {
                console.log(`📊 Upload-Fortschritt: ${progress.progress || 'N/A'}%`);
            }
        });

        console.log('✅ Upload erfolgreich!');
        console.log('🆔 Datei-ID:', uploadResult.fileId);

        // Datei-Info abrufen
        console.log('ℹ️  Datei-Informationen abrufen...');
        const fileInfo = await api.getFileInfo(uploadResult.fileId);
        console.log('📝 Dateiname:', fileInfo.filename);
        console.log('📏 Dateigröße:', api.formatFileSize(fileInfo.size));

        // Download-Link generieren
        console.log('🔗 Download-Link generieren...');
        const downloadInfo = await api.getDownloadUrl(uploadResult.fileId);
        console.log('🌐 Download-URL:', downloadInfo.download_url);

        // Test-Datei löschen
        fs.unlinkSync(testFile);

        console.log('🚪 Ausloggen...');
        await api.logout();

    } catch (error) {
        console.error('❌ Fehler:', error.message);
    }
}

// Nur ausführen wenn direkt aufgerufen
if (require.main === module) {
    uploadExample();
}

module.exports = { uploadExample };