import { setTimeout as delay } from 'node:timers/promises';

/** Retry only explicit transient HTTP failures, never quotas, refusals or ambiguous network failures. */
export async function fetchSyllabusWithRetry(
  request: (useBackup: boolean) => Promise<Response>,
  signal: AbortSignal,
  beforeRetry?: () => void,
) {
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    const response = await request(attempt === 2);
    if (![500, 502, 503, 504].includes(response.status) || attempt === 2) return response;
    const value = response.headers.get('retry-after');
    const seconds = value !== null && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) * 1000 : null;
    const date = value !== null && seconds === null ? Date.parse(value) : NaN;
    const requested = seconds ?? (Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0);
    const wait = Math.max(requested, 1000 * 2 ** attempt + Math.floor(Math.random() * 500));
    // Do not retry earlier than the provider requests, or begin a retry near the total deadline.
    if (wait > 15_000 || Date.now() - started + wait > 90_000) return response;
    await response.body?.cancel();
    await delay(wait, undefined, { signal });
    signal.throwIfAborted();
    beforeRetry?.();
  }
}
