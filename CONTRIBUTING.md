# Contributing to rapidgator-api

Beiträge sind willkommen! Danke, dass du dieses Projekt verbessern möchtest.

## Voraussetzungen

- Node.js >= 14
- npm

## Entwicklungs-Setup

```bash
git clone https://github.com/ElyFura/rapidgator-api.git
cd rapidgator-api
npm install
```

## Workflow

1. **Fork** das Repository und erstelle einen Feature-Branch:
   ```bash
   git checkout -b feature/meine-aenderung
   ```
2. Nimm deine Änderungen vor und halte dich an den bestehenden Code-Stil
   (ESLint-Konfiguration liegt bei).
3. Stelle sicher, dass Lint und Tests durchlaufen:
   ```bash
   npm run lint:check
   npm run test:unit
   ```
4. Füge für neue Funktionalität passende Tests hinzu (`test/`).
5. Committe mit einer aussagekräftigen Nachricht und öffne einen Pull Request
   gegen den `main`-Branch.

## Tests

```bash
npm test                # alle Tests
npm run test:unit       # nur Unit-Tests (ohne Integration)
npm run test:coverage   # mit Coverage-Report
```

Integrationstests (`test/integration.test.js`) werden nur ausgeführt, wenn die
Umgebungsvariablen `RAPIDGATOR_TEST_LOGIN` und `RAPIDGATOR_TEST_PASSWORD`
gesetzt sind; ansonsten werden sie übersprungen.

## Code-Stil

- Bestehende Konventionen und Formatierung beibehalten.
- `npm run lint:fix` behebt viele Stilprobleme automatisch.
- Öffentliche Methoden mit einem kurzen JSDoc-Kommentar dokumentieren.

## API-Referenz

Die offizielle RapidGator API v2 ist dokumentiert unter
<https://rapidgator.net/article/api>. Neue Endpunkte bitte gegen diese
Dokumentation implementieren (Methode, Parameter- und Response-Feldnamen).

## Bug Reports & Feature Requests

- 🐛 Bugs: <https://github.com/ElyFura/rapidgator-api/issues>
- 💡 Ideen: <https://github.com/ElyFura/rapidgator-api/discussions>

## Lizenz

Mit deinem Beitrag stimmst du zu, dass er unter der [MIT-Lizenz](LICENSE)
veröffentlicht wird.
