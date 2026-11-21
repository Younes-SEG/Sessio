import { randomUUID } from 'node:crypto';
import { reserveAi, finishAi, assertAiRunning } from './ai-usage';
import { signReader, readerDigest } from './reader-auth';
import { SYLLABUS_SERVICE_URL } from '../syllabus-service-config';
import { syllabusPreviewSchema } from '../syllabus-result';
import type { SyllabusAiInput } from './syllabus-ai';
import { isHosted } from './hosting';
import { ApiError } from './errors';

const unavailable =
  'Syllabus reading is unavailable right now. Please try again later. Your courses and grades are still available.';

function serviceUrl(path: string) {
  const value = process.env.COMMAND_SYLLABUS_SERVICE_URL?.trim() || SYLLABUS_SERVICE_URL;
  if (!value) throw new ApiError(503, unavailable);
  try {
    const url = new URL(value);
    const local =
      !isHosted() &&
      url.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (
      (!local && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error();
    return new URL(path, url);
  } catch {
    throw new ApiError(503, unavailable);
  }
}

export async function isSyllabusServiceAvailable() {
  try {
    const response = await fetch(serviceUrl('/health'), {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    const ok = response.ok;
    await response.body?.cancel();
    return ok;
  } catch {
    return false;
  }
}

let reading = false;
export async function readSyllabusThroughService(
  input: SyllabusAiInput,
  signal?: AbortSignal,
  workspaceId = 'local',
) {
  const url = serviceUrl('/v1/syllabus');
  if (reading) throw new ApiError(429, 'A syllabus is already being read. Wait for it to finish.');
  reading = true;
  let reservation: Awaited<ReturnType<typeof reserveAi>> = null;
  let usage: unknown = null;
  const timeout = AbortSignal.timeout(140_000);
  try {
    const body = JSON.stringify({
      kind: input.kind,
      document: Buffer.from(input.bytes).toString('base64'),
      course: input.course,
    });
    const models = (process.env.COMMAND_SYLLABUS_MODELS || '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    reservation = await reserveAi(workspaceId, 'syllabus', models, 3);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.COMMAND_READER_SIGNING_SECRET) {
      const issued = Math.floor(Date.now() / 1000);
      headers['X-Command-Authorization'] = signReader({
        audience: 'command-syllabus-v1',
        id: reservation?.id || randomUUID(),
        subject: reservation?.subject || 'local-owner',
        issued,
        expires: issued + 180,
        digest: readerDigest(body),
        maximumAttempts: 3,
        models: reservation?.models || {},
      });
    } else if (isHosted() || url.protocol === 'https:') {
      await finishAi(reservation?.id, null, false);
      throw new ApiError(503, 'The syllabus reader connection is not configured.');
    }
    await assertAiRunning('syllabus');
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      headers,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      body,
    });
    try {
      const encoded = response.headers.get('X-Command-Usage');
      if (encoded && encoded.length < 6000)
        usage = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    } catch {
      /* Uncertain usage keeps the reservation. */
    }
    if (!response.ok) {
      await response.body?.cancel();
      // Never echo upstream HTML, credentials, document content or arbitrary error strings.
      if (
        response.status === 503 &&
        response.headers.get('X-Command-Reader-Error') === 'provider_unavailable'
      )
        throw new ApiError(
          503,
          'The AI provider is temporarily unavailable or busy. Please try again later. Nothing was saved.',
        );
      if (response.status === 429)
        throw new ApiError(
          429,
          'The syllabus reader is busy or its usage allowance has been reached. Please try again later. Nothing was saved.',
        );
      if (response.status === 413)
        throw new ApiError(413, 'This syllabus is too large. Try fewer pages or a smaller file.');
      if (response.status === 400 || response.status === 422)
        throw new ApiError(
          422,
          'The syllabus could not be read. Try an unlocked PDF/DOCX, a clearer JPG/PNG, or paste the text.',
        );
      if (response.status === 502)
        throw new ApiError(
          502,
          'The AI reader could not finish this request. Please try again later. Nothing was saved.',
        );
      if (response.status === 504)
        throw new ApiError(
          504,
          'Reading took too long. Try a shorter syllabus. Nothing was saved.',
        );
      throw new ApiError(503, unavailable);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new Error();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const preview = syllabusPreviewSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    await finishAi(reservation?.id, usage, true);
    return preview;
  } catch (error) {
    await finishAi(reservation?.id, usage, false);
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw new ApiError(499, 'Syllabus reading was cancelled.');
    if (timeout.aborted)
      throw new ApiError(504, 'Reading took too long. Try a shorter syllabus. Nothing was saved.');
    throw new ApiError(
      502,
      'Sessio could not reach the syllabus reader or received an incomplete response. Check your connection and try again. Nothing was saved.',
    );
  } finally {
    reading = false;
  }
}
