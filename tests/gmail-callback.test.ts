import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ finish: vi.fn(), hosted: vi.fn() }));
vi.mock('../src/lib/server/gmail-oauth', () => ({ finishGmail: mocks.finish }));
vi.mock('../src/lib/server/hosting', () => ({ isHosted: mocks.hosted }));
vi.mock('../src/lib/server/gmail-client', () => ({
  gmailCookie: 'command-gmail-state',
  requireGmailConfig: () => ({ origin: 'http://127.0.0.1:3000' }),
}));
import { GET } from '../src/app/api/email/callback/route';

beforeEach(() => {
  mocks.finish.mockReset().mockResolvedValue(undefined);
  mocks.hosted.mockReturnValue(false);
});

it.each([true, false])('commits a local document after validated callback outcome %s', async (success) => {
  if (!success) mocks.finish.mockRejectedValue(new Error('invalid state'));
  const response = await GET(new NextRequest(
    'http://127.0.0.1:3000/api/email/callback?code=private-code&state=private-state',
    { headers: { cookie: 'command-gmail-state=private-state' } },
  ));
  expect(mocks.finish).toHaveBeenCalledWith('private-code', 'private-state', 'private-state');
  expect(response.status).toBe(200);
  expect(response.headers.get('location')).toBeNull();
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  const html = await response.text();
  expect(html).toContain(`0;url=/email?connection=${success ? 'connected' : 'failed'}`);
  expect(html).not.toContain('private-code');
  expect(html).not.toContain('private-state');
});

it('retains the normal hosted redirect', async () => {
  mocks.hosted.mockReturnValue(true);
  const response = await GET(new NextRequest('http://127.0.0.1:3000/api/email/callback'));
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe('http://127.0.0.1:3000/email?connection=connected');
});
