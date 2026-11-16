import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from '../src/app/api/email/route';
import { reviewEmail } from '../src/lib/server/email-updates';

vi.mock('../src/lib/server/email-updates', () => ({
  configureEmail: vi.fn(),
  disconnectEmail: vi.fn(),
  emailOverview: vi.fn(),
  emailAssessmentRevisions: vi.fn(),
  reviewEmail: vi.fn(),
  syncEmail: vi.fn(),
}));
const url = 'http://127.0.0.1:3000/api/email';
const post = (body: unknown) =>
  POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => vi.clearAllMocks());

it('routes every review action the Updates page sends', async () => {
  for (const action of ['read', 'read-all', 'dismiss', 'apply', 'apply-deadline']) {
    const response = await post({ action, id: 'x' });
    expect(response.status, action).toBe(200);
  }
  expect(reviewEmail).toHaveBeenCalledTimes(5);
  expect((await post({ action: 'unknown' })).status).toBe(400);
});
