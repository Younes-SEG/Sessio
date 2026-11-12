import { afterEach, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import {
  createAuthServer,
  NEON_AUTH_SESSION_COOKIE_NAME,
  NEON_AUTH_SESSION_DATA_COOKIE_NAME,
} from '@neon/auth/server';

afterEach(() => vi.unstubAllGlobals());
it('checks revocation upstream even when the SDK has a valid signed session cache', async () => {
  const secret = 'test-only-signing-secret-at-least-32-characters';
  const now = new Date().toISOString();
  const cached = {
    user: {
      id: 'alice',
      email: 'alice@example.test',
      name: 'Alice',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: 'session',
      userId: 'alice',
      token: 'synthetic-session-token',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    },
  };
  const cookie = await new SignJWT(cached)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));
  const upstream = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ message: 'Revoked' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', upstream);
  const auth = createAuthServer({
    baseUrl: 'https://auth.example.test',
    cookieSecret: secret,
    context: async () => ({
      getCookies: () =>
        `${NEON_AUTH_SESSION_COOKIE_NAME}=test-session; ${NEON_AUTH_SESSION_DATA_COOKIE_NAME}=${cookie}`,
      getOrigin: () => 'https://command.example.test',
      getFramework: () => 'nextjs',
      getHeader: () => null,
      setCookie: () => {},
    }),
  });
  // Prove this is a usable cache, rather than a malformed fixture that would
  // force an upstream lookup even if our explicit bypass stopped working.
  expect((await auth.getSession()).data?.user.id).toBe('alice');
  expect(upstream).not.toHaveBeenCalled();
  const result = await auth.getSession({
    query: { disableCookieCache: 'true', disableRefresh: true },
  });
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(String(upstream.mock.calls[0][0])).toContain('disableCookieCache=true');
  expect(result.data).toBeNull();
  expect(result.error?.status).toBe(401);
});

it.each([
  ['sign-in/email', 'signIn'],
  ['sign-up/email', 'signUp'],
  ['request-password-reset', 'requestPasswordReset'],
  ['reset-password', 'resetPassword'],
  ['send-verification-email', 'sendVerificationEmail'],
] as const)('preserves the SDK request contract for %s', async (path, operation) => {
  const upstream = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: true }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', upstream);
  const auth = createAuthServer({
    baseUrl: 'https://auth.example.test/neondb/auth',
    cookieSecret: 'test-only-signing-secret-at-least-32-characters',
    context: async () => ({
      getCookies: () => '',
      getOrigin: () => 'https://command.example.test',
      getFramework: () => 'nextjs',
      getHeader: () => null,
      setCookie: () => {},
    }),
  });
  const email = 'synthetic@example.test';
  const password = 'synthetic-password';
  const callbackURL = 'https://command.example.test/';
  let body: Record<string, string>;
  if (operation === 'signIn') {
    body = { email, password };
    await auth.signIn.email({ email, password });
  } else if (operation === 'signUp') {
    body = { email, password, name: 'Synthetic', callbackURL };
    await auth.signUp.email({ email, password, name: 'Synthetic', callbackURL });
  } else if (operation === 'requestPasswordReset') {
    body = { email, redirectTo: callbackURL + 'auth/reset-password' };
    await auth.requestPasswordReset({ email, redirectTo: body.redirectTo });
  } else if (operation === 'resetPassword') {
    body = { newPassword: password, token: 'synthetic-token' };
    await auth.resetPassword({ newPassword: password, token: body.token });
  } else {
    body = { email, callbackURL };
    await auth.sendVerificationEmail({ email, callbackURL });
  }
  expect(upstream).toHaveBeenCalledTimes(1);
  const [url, options] = upstream.mock.calls[0];
  expect(String(url)).toBe('https://auth.example.test/neondb/auth/' + path);
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual(body);
});
