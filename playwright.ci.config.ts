import { defineConfig } from '@playwright/test';

const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (
  !['127.0.0.1', 'localhost'].includes(url.hostname) ||
  !/^\/command_ci_[a-z0-9_]+$/.test(url.pathname)
)
  throw new Error('CI browser tests require a disposable local command_ci_ database.');
if (
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.VERCEL === '1' ||
  process.env.COMMAND_HOSTED === 'true'
)
  throw new Error('CI browser tests cannot use hosted or alternate migration configuration.');

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/ci-setup.ts',
  testMatch: [
    'workspace.spec.ts',
    'assistant-history.spec.ts',
    'assistant-accessibility.spec.ts',
    'privacy-accessibility.spec.ts',
    'first-run-setup.spec.ts',
    'syllabus-best-of.spec.ts',
    'paste-grades.spec.ts',
  ],
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'America/Toronto',
    trace: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
