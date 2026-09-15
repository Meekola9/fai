import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Retained for the separate Film Room rebuild; its route is retired in the active app.
  testIgnore: ['**/film-room-smoke.spec.ts', '**/film-scrubbing.spec.ts', '**/film-tracking.spec.ts', '**/film-throw-analysis.spec.ts', '**/film-formation-builder.spec.ts', '**/football-cv-import.spec.ts'],
  fullyParallel: false,
  retries: 1,
  reporter: [['line']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
