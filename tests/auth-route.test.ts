import { afterEach, expect, it, vi } from 'vitest';
const handler = vi.hoisted(() => vi.fn());
const invited = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/server/auth', () => ({ getAuth: async () => ({ handler }) }));
vi.mock('../src/lib/server/invitations', () => ({ hasOpenInvite: invited }));
import { GET, POST } from '../src/app/api/auth/[...path]/route';
afterEach(() => {
  vi.unstubAllEnvs();
  handler.mockReset();
  invited.mockReset();
});
const INVITE_ONLY =
  'Sessio is invite-only for now. Ask someone who uses Sessio to invite this email address.';
const signUp = (email?: string) =>
  POST(
    new Request('https://command.test/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://command.test' },
      body: JSON.stringify({ email, password: 'a-long-password' }),
    }),
    { params: Promise.resolve({ path: ['sign-up', 'email'] }) },
  );
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
  expect(body.message).toBe(INVITE_ONLY);
  expect(body.error.message).toBe(body.message);
});
it('refuses sign-up for an email without an open invitation', async () => {
  vi.stubEnv('COMMAND_HOSTED', 'true');
  vi.stubEnv('COMMAND_ALLOW_SIGNUP', '');
  invited.mockResolvedValue(false);
  const result = await signUp('stranger@example.com');
  expect(result.status).toBe(403);
  expect(invited).toHaveBeenCalledWith('stranger@example.com');
  expect(handler).not.toHaveBeenCalled();
  expect((await signUp()).status).toBe(403);
});
it('lets an invited email create an account while sign-up is closed', async () => {
  vi.stubEnv('COMMAND_HOSTED', 'true');
  vi.stubEnv('COMMAND_ALLOW_SIGNUP', '');
  invited.mockResolvedValue(true);
  const post = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  handler.mockReturnValue({ POST: post });
  const result = await signUp('friend@example.com');
  expect(result.status).toBe(200);
  const forwarded: Request = post.mock.calls[0][0];
  expect(await forwarded.json()).toMatchObject({ email: 'friend@example.com' });
});
