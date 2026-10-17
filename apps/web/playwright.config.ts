import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
/** The game server the web build talks to (same host, port 3001 — see lib/server-url.ts). */
const SERVER_PORT = 3001;

/** A mid-range Android at the design size (§5): 360×740, touch, DPR 2. */
const phone = {
  ...devices['Galaxy S9+'],
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 2,
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    // E2E_BASE_URL runs the suite against another server, e.g. `pnpm dev` on this machine's LAN
    // address — the way phones on the same Wi-Fi reach it.
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  // Run against production builds: `pnpm build` first.
  webServer: [
    {
      command: 'node ../server/dist/main.js',
      url: `http://localhost:${SERVER_PORT}/health`,
      env: { PORT: String(SERVER_PORT), HOST: '0.0.0.0', ADMIN_SECRET: 'e2e-admin-secret' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `pnpm exec next start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'audit',
      testIgnore: [/screenshots\.spec\.ts/, /game\.spec\.ts/],
      use: phone,
    },
    {
      // Whole games with four phones and a TV in one room (§10 M6).
      name: 'game',
      testMatch: /game\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'screenshots',
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
