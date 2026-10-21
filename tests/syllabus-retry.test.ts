import { afterEach, expect, it, vi } from 'vitest';
import { setTimeout } from 'node:timers/promises';
import { fetchSyllabusWithRetry } from '../src/lib/server/syllabus-retry';
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn(async () => undefined) }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(setTimeout).mockReset();
});
it('honours Retry-After and uses bounded exponential backoff', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 503, headers: { 'Retry-After': '4' } }))
    .mockResolvedValueOnce(new Response('', { status: 502 }))
    .mockResolvedValueOnce(new Response('ok'));
  const reserve = vi.fn();
  const result = await fetchSyllabusWithRetry(request, new AbortController().signal, reserve);
  expect(result.status).toBe(200);
  expect(vi.mocked(setTimeout).mock.calls.map((c) => c[0])).toEqual([4000, 2000]);
  expect(reserve).toHaveBeenCalledTimes(2);
});
it('does not retry a quota response, credential error, or long retry-after', async () => {
  for (const status of [400, 401, 403, 404, 429, 503]) {
    const request = vi.fn(
      async () => new Response('', { status, headers: { 'Retry-After': '60' } }),
    );
    expect((await fetchSyllabusWithRetry(request, new AbortController().signal)).status).toBe(
      status,
    );
    expect(request).toHaveBeenCalledTimes(1);
  }
});
it('stops on cancellation during the wait, before another provider request', async () => {
  const controller = new AbortController();
  vi.mocked(setTimeout).mockImplementationOnce(async () => {
    controller.abort();
  });
  const request = vi.fn(async () => new Response('', { status: 503 }));
  const reserve = vi.fn();
  await expect(fetchSyllabusWithRetry(request, controller.signal, reserve)).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  expect(reserve).not.toHaveBeenCalled();
});
it('cannot bypass the service quota on retries', async () => {
  const request = vi.fn(async () => new Response('', { status: 503 }));
  await expect(
    fetchSyllabusWithRetry(request, new AbortController().signal, () => {
      throw new Error('quota');
    }),
  ).rejects.toThrow('quota');
  expect(request).toHaveBeenCalledTimes(1);
});
it('does not restart the overall time budget or retry uncertain network failures', async () => {
  let now = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  const request = vi.fn(async () => {
    now = 95_000;
    return new Response('', { status: 503 });
  });
  expect((await fetchSyllabusWithRetry(request, new AbortController().signal)).status).toBe(503);
  expect(request).toHaveBeenCalledTimes(1);
  const network = vi.fn(async () => {
    throw new Error('network');
  });
  await expect(fetchSyllabusWithRetry(network, new AbortController().signal)).rejects.toThrow(
    'network',
  );
  expect(network).toHaveBeenCalledTimes(1);
});
