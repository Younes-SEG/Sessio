import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertSameOrigin } from '../src/lib/server/origin';

const post = (url: string, origin?: string) =>
  new Request(url, { method: 'POST', headers: origin ? { origin } : {} });

afterEach(() => vi.unstubAllEnvs());

describe('same-origin check', () => {
  it('uses the request URL when no public origin is configured (Vercel)', () => {
    vi.stubEnv('COMMAND_HOSTED', 'true');
    vi.stubEnv('RENDER_EXTERNAL_URL', '');
    vi.stubEnv('COMMAND_PUBLIC_ORIGINS', '');
    expect(() =>
      assertSameOrigin(post('https://app.example/api/x', 'https://app.example')),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(post('https://app.example/api/x', 'https://evil.example')),
    ).toThrow();
  });

  it('accepts Render’s public address although Next sees the bind address', () => {
    vi.stubEnv('COMMAND_HOSTED', 'true');
    vi.stubEnv('RENDER_EXTERNAL_URL', 'https://command.onrender.com');
    const behindProxy = 'https://0.0.0.0:10000/api/auth/sign-in/email';
    expect(() => assertSameOrigin(post(behindProxy, 'https://command.onrender.com'))).not.toThrow();
    expect(() => assertSameOrigin(post(behindProxy, 'https://0.0.0.0:10000'))).toThrow();
    expect(() => assertSameOrigin(post(behindProxy, 'https://evil.example'))).toThrow();
    expect(() => assertSameOrigin(post(behindProxy))).toThrow();
  });

  it('adds custom domains and ignores non-HTTPS or malformed entries', () => {
    vi.stubEnv('COMMAND_HOSTED', 'true');
    vi.stubEnv('RENDER_EXTERNAL_URL', 'https://command.onrender.com');
    vi.stubEnv('COMMAND_PUBLIC_ORIGINS', 'https://command.ca, http://insecure.example, not a url');
    const url = 'https://0.0.0.0:10000/api/x';
    expect(() => assertSameOrigin(post(url, 'https://command.ca'))).not.toThrow();
    expect(() => assertSameOrigin(post(url, 'https://command.onrender.com'))).not.toThrow();
    expect(() => assertSameOrigin(post(url, 'http://insecure.example'))).toThrow();
  });

  it('never applies configured origins to the local edition', () => {
    vi.stubEnv('COMMAND_HOSTED', 'false');
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('RENDER_EXTERNAL_URL', 'https://command.onrender.com');
    expect(() =>
      assertSameOrigin(post('http://localhost:3000/api/x', 'https://command.onrender.com')),
    ).toThrow();
  });
});
