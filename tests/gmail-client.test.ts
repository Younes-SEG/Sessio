import { afterEach, it, expect, vi } from 'vitest';
import {
  gmailConfig,
  sealGmail,
  openGmail,
  gmailTokens,
  gmailGet,
} from '../src/lib/server/gmail-client';
const configure = () => {
  vi.stubEnv('GOOGLE_GMAIL_CLIENT_ID', 'test-client');
  vi.stubEnv('GOOGLE_GMAIL_CLIENT_SECRET', 'test-secret');
  vi.stubEnv('GMAIL_TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 3).toString('base64'));
  vi.stubEnv('GOOGLE_GMAIL_REDIRECT_URI', 'http://127.0.0.1:3000/api/email/callback');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('COMMAND_HOSTED', 'false');
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('encrypts tokens with authenticated encryption bound to the workspace', () => {
  configure();
  const encrypted = sealGmail('refresh-token', 'owner');
  expect(encrypted).not.toContain('refresh-token');
  expect(openGmail(encrypted, 'owner')).toBe('refresh-token');
  expect(() => openGmail(encrypted, 'other')).toThrow();
  expect(() => openGmail(encrypted.slice(0, -4) + 'AAAA', 'owner')).toThrow();
});
it('rejects insecure hosted redirects and invalid encryption keys', () => {
  configure();
  expect(gmailConfig()).not.toBeNull();
  vi.stubEnv('VERCEL', '1');
  expect(gmailConfig()).toBeNull();
  vi.stubEnv('GOOGLE_GMAIL_REDIRECT_URI', 'https://command.example/api/email/callback');
  expect(gmailConfig()).not.toBeNull();
  vi.stubEnv('GMAIL_TOKEN_ENCRYPTION_KEY', 'short');
  expect(gmailConfig()).toBeNull();
});
it('keeps upstream error bodies and tokens out of errors', async () => {
  configure();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('private-provider-error-and-token', { status: 401 })),
  );
  await expect(
    gmailTokens({ refresh_token: 'secret', grant_type: 'refresh_token' }),
  ).rejects.toThrow('Reconnect Gmail');
  await expect(gmailGet('profile', 'access-secret')).rejects.not.toThrow('private-provider');
});
