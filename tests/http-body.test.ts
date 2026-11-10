import { expect, it, vi } from 'vitest';
vi.mock('../src/lib/server/origin', () => ({ assertSameOrigin: vi.fn() }));
import { mutationBody } from '../src/lib/server/http';

const request = (body: BodyInit, extra: Record<string, string> = {}) =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extra },
    body,
    duplex: 'half',
  } as RequestInit);
it('accepts bounded UTF-8 JSON split across chunks', async () => {
  const bytes = new TextEncoder().encode('{"text":"étude"}');
  const body = new ReadableStream({
    start(c) {
      c.enqueue(bytes.slice(0, 10));
      c.enqueue(bytes.slice(10));
      c.close();
    },
  });
  expect(await mutationBody(request(body))).toEqual({ text: 'étude' });
});
it('rejects an oversized streamed body without reading the rest', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(c) {
      c.enqueue(new Uint8Array(60_000));
    },
    cancel() {
      cancelled = true;
    },
  });
  await expect(mutationBody(request(body))).rejects.toMatchObject({ status: 413 });
  expect(cancelled).toBe(true);
});
it('counts bytes rather than characters and rejects excessive declared lengths', async () => {
  await expect(
    mutationBody(request(JSON.stringify({ text: 'é'.repeat(55_000) }))),
  ).rejects.toMatchObject({ status: 413 });
  await expect(mutationBody(request('{}', { 'Content-Length': '100001' }))).rejects.toMatchObject({
    status: 413,
  });
});
it('still rejects malformed JSON and non-object JSON', async () => {
  await expect(mutationBody(request('{'))).rejects.toMatchObject({ status: 400 });
  await expect(mutationBody(request('[]'))).rejects.toMatchObject({ status: 400 });
});
