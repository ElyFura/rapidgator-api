// Dateiname: test/integration.test.js

const RapidGatorAPI = require('../lib/rapidgator-api');

// Integration-Tests (nur ausführen wenn Credentials vorhanden)
describe('RapidGator Integration Tests', () => {
    let api;

    beforeAll(() => {
        // Nur ausführen wenn Test-Credentials gesetzt sind
        if (!process.env.RAPIDGATOR_TEST_LOGIN || !process.env.RAPIDGATOR_TEST_PASSWORD) {
            console.log('⚠️  Integration-Tests übersprungen: Keine Test-Credentials gefunden');
            console.log('   Setze RAPIDGATOR_TEST_LOGIN und RAPIDGATOR_TEST_PASSWORD um Tests zu aktivieren');
            return;
        }

        api = new RapidGatorAPI(
            process.env.RAPIDGATOR_TEST_LOGIN,
            process.env.RAPIDGATOR_TEST_PASSWORD
        );
    });

    beforeEach(() => {
        if (!api) {
            pending('Integration-Tests übersprungen');
        }
    });

    test('should login successfully', async () => {
        const result = await api.login();
        expect(result.token).toBeDefined();
        expect(typeof result.token).toBe('string');
    }, 10000);

    test('should get user info after login', async () => {
        await api.login();
        const userInfo = await api.getUserInfo();

        expect(userInfo).toBeDefined();
        expect(userInfo.login).toBe(process.env.RAPIDGATOR_TEST_LOGIN);
        expect(typeof userInfo.is_premium).toBe('boolean');
    }, 10000);

    test('should check API health', async () => {
        const isHealthy = await api.healthCheck();
        expect(typeof isHealthy).toBe('boolean');
    }, 5000);

    afterAll(async () => {
        if (api && api.token) {
            await api.logout();
        }
    });
});