import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { modelPolicySchema } from './ai-policy';
import { ApiError } from './errors';

const claimsSchema = z
  .object({
    audience: z.literal('command-syllabus-v1'),
    id: z.string().uuid(),
    subject: z.string().min(1).max(128),
    issued: z.number().int(),
    expires: z.number().int(),
    digest: z.string().length(64),
    maximumAttempts: z.number().int().min(1).max(3),
    models: z.record(z.string().regex(/^[a-zA-Z0-9._-]{1,120}$/), modelPolicySchema),
  })
  .strict();
export type ReaderClaims = z.infer<typeof claimsSchema>;
export const readerDigest = (body: string | Buffer) =>
  createHash('sha256').update(body).digest('hex');
function secret() {
  const value = process.env.COMMAND_READER_SIGNING_SECRET || '';
  if (value.length < 32)
    throw new ApiError(503, 'The syllabus reader connection is not configured.');
  return value;
}
export function signReader(claims: ReaderClaims) {
  const payload = Buffer.from(JSON.stringify(claimsSchema.parse(claims))).toString('base64url');
  const signature = createHmac('sha256', secret())
    .update(`POST\n/v1/syllabus\n${payload}`)
    .digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyReader(value: string | undefined, now = Date.now()) {
  try {
    if (!value || value.length > 8000) throw new Error();
    const [payload, signature, extra] = value.split('.');
    if (extra || !signature) throw new Error();
    const expected = createHmac('sha256', secret())
      .update(`POST\n/v1/syllabus\n${payload}`)
      .digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const claims = claimsSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString()));
    const seconds = Math.floor(now / 1000);
    if (
      claims.issued > seconds + 15 ||
      claims.expires <= seconds ||
      claims.expires - claims.issued > 180 ||
      claims.expires <= claims.issued
    )
      throw new Error();
    return claims;
  } catch {
    throw new ApiError(401, 'The syllabus reader request is not authorized.');
  }
}
