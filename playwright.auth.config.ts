import { defineConfig } from '@playwright/test';

// Auth controls only: synthetic provider configuration, no workspace database.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'auth-controls.spec.ts',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:3101',
    browserName: 'chromium',
    trace: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101/auth/sign-in',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      COMMAND_CI_BUILD: 'true',
      COMMAND_HOSTED: 'true',
      COMMAND_AUTH_BASE_URL: 'https://auth.example.test',
      NEON_AUTH_BASE_URL: 'https://auth.example.test',
      NEON_AUTH_COOKIE_SECRET: 'synthetic-auth-controls-secret-32-characters',
      DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:1/no_database',
      DATABASE_URL_UNPOOLED: '',
    },
  },
});
