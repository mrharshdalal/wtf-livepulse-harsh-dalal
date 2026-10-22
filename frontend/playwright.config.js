import { defineConfig, devices } from '@playwright/test';

// These tests assume the stack is already running via `docker compose up`
// (they do not start a dev server themselves).
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  // All tests hit the same live docker-compose stack and share mutable
  // backend state (one simulator singleton, one anomaly detector, one DB) --
  // parallel workers racing /api/simulator/start|stop or reading each
  // other's fixtures causes cross-test interference. Run serially.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
