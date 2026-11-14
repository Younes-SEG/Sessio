import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { ApiError } from './errors';
import { assertSameOrigin } from './origin';

export async function mutationBody(request: Request): Promise<Record<string, unknown>> {
  assertSameOrigin(request);
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new ApiError(415, 'Send application/json.');
  const limit = 100_000;
  const tooLarge = () => new ApiError(413, 'This entry is too large. Keep it under 100 KB.');
  if (Number(request.headers.get('content-length')) > limit) throw tooLarge();
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel().catch(() => {});
          throw tooLarge();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(bytes);
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new ApiError(400, 'The request is not valid JSON.');
  }
  if (!data || Array.isArray(data) || typeof data !== 'object')
    throw new ApiError(400, 'Send a JSON object.');
  return data as Record<string, unknown>;
}

export function validateDeleteOrigin(request: Request) {
  assertSameOrigin(request);
}

export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: error.message, ...(error.reason ? { reason: error.reason } : {}) },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? 'Check your entry.',
        fields: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025')
      return NextResponse.json(
        { error: 'This entry no longer exists. Refresh and try again.' },
        { status: 404 },
      );
    if (error.code === 'P2002')
      return NextResponse.json(
        { error: 'That entry already exists. Course codes must be unique within a semester.' },
        { status: 409 },
      );
    if (error.code === 'P2003')
      return NextResponse.json(
        { error: 'A linked entry is missing or still in use. Refresh and try again.' },
        { status: 409 },
      );
    if (error.code === 'P2034')
      return NextResponse.json(
        { error: 'Another change happened at the same time. Please try again.' },
        { status: 409 },
      );
  }
  // Error objects may contain SQL parameters, notes, grades, or private feed URLs.
  console.error('Workspace request failed. Details omitted to protect personal data.');
  return NextResponse.json(
    { error: 'The database is unavailable or the change could not be saved. Please try again.' },
    { status: 500 },
  );
}
