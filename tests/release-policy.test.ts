import { afterEach, expect, it, vi } from 'vitest';
import {
  assertHostedAccess,
  hostedAccessAllowed,
  gmailAllowed,
  signupAllowed,
} from '../src/lib/server/release-policy';
afterEach(() => vi.unstubAllEnvs());
it('keeps the local edition account-free but defaults hosted integrations closed', () => {
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('COMMAND_HOSTED', 'false');
  expect(hostedAccessAllowed('local')).toBe(true);
  expect(gmailAllowed('local')).toBe(true);
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('COMMAND_HOSTED_ACCESS', '');
  vi.stubEnv('COMMAND_INVITED_WORKSPACES', '');
  vi.stubEnv('COMMAND_GMAIL_RELEASE', '');
  vi.stubEnv('COMMAND_ALLOW_SIGNUP', '');
  expect(hostedAccessAllowed('local')).toBe(false);
  expect(gmailAllowed('user:a')).toBe(false);
  expect(signupAllowed()).toBe(false);
});
it('requires exact server-owned identities and separate Gmail approval', () => {
  vi.stubEnv('COMMAND_HOSTED', 'true');
  vi.stubEnv('COMMAND_HOSTED_ACCESS', '');
  vi.stubEnv('COMMAND_INVITED_WORKSPACES', 'user:alice');
  expect(hostedAccessAllowed('user:alice')).toBe(true);
  expect(hostedAccessAllowed('user:ali')).toBe(false);
  vi.stubEnv('COMMAND_GMAIL_RELEASE', 'testers');
  vi.stubEnv('COMMAND_GMAIL_TESTERS', 'user:bob');
  expect(gmailAllowed('user:alice')).toBe(false);
  expect(gmailAllowed('user:bob')).toBe(true);
});

it('labels a rejected hosted account without changing the invitation decision', () => {
  vi.stubEnv('COMMAND_HOSTED', 'true');
  vi.stubEnv('COMMAND_HOSTED_ACCESS', 'restricted');
  vi.stubEnv('COMMAND_INVITED_WORKSPACES', 'user:alice');
  expect(() => assertHostedAccess('user:bob')).toThrow(
    expect.objectContaining({ status: 403, reason: 'not-invited' }),
  );
});
