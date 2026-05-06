// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',           // ← Solo carpeta E2E
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Puedes descomentar más browsers cuando todo funcione
        // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],

    // Inicia automáticamente los servicios antes de las pruebas
    webServer: [
        {
            command: 'node start-all.js',
            url: 'http://localhost:5173',
            timeout: 120_000,
            reuseExistingServer: !process.env.CI,
            env: { NODE_ENV: 'test' }
        }
    ],
});