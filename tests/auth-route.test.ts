import { afterEach, expect, it, vi } from 'vitest';
const handler = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/server/auth', () => ({ getAuth: async () => ({ handler }) }));
import { GET, POST } from '../src/app/api/auth/[...path]/route';
afterEach(() => {
  vi.unstubAllEnvs();
  handler.mockReset();
});
it.each(['sign-in/social', 'sign-in/magic-link', 'device/code', 'admin/delete-user'])(
  'does not proxy unsupported endpoint %s',
  async (path) => {
    vi.stubEnv('COMMAND_HOSTED', 'true');
    const result = await GET(new Request('https://command.test/api/auth/' + path), {
      params: Promise.resolve({ path: path.split('/') }),
    });
    expect(result.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  },
);
it('blocks direct signup POSTs independently of the UI', async () => {
  vi.stubEnv('COMMAND_HOSTED', 'true');
  vi.stubEnv('COMMAND_ALLOW_SIGNUP', '');
  const result = await POST(
    new Request('https://command.test/api/auth/sign-up/email', { method: 'POST' }),
    { params: Promise.resolve({ path: ['sign-up', 'email'] }) },
  );
  expect(result.status).toBe(403);
  expect(handler).not.toHaveBeenCalled();
  // The auth SDK shows a top-level message; without it students saw "HTTP 403".
  const body = await result.json();
  expect(body.message).toBe('New accounts are currently available by invitation only.');
  expect(body.error.message).toBe(body.message);
});
