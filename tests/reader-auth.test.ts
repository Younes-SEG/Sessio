import { afterEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readerDigest, signReader, verifyReader } from '../src/lib/server/reader-auth';
import { ceilingMicros, usageMetadata } from '../src/lib/server/ai-policy';
import { providerMeter } from '../src/lib/server/provider-meter';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const policy = {
  provider: 'gemini' as const,
  inputCeilingTokens: 1000,
  outputCeilingTokens: 100,
  inputMicrosPerMillion: 1000000,
  outputMicrosPerMillion: 2000000,
  pricingVersion: 'synthetic',
};
it('binds reader permissions to a signed request and rejects expiry and tampering', () => {
  vi.stubEnv('COMMAND_READER_SIGNING_SECRET', 'a-private-test-secret-at-least-32-characters');
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    audience: 'command-syllabus-v1' as const,
    id: randomUUID(),
    subject: 'opaque',
    issued: now,
    expires: now + 180,
    digest: readerDigest('body'),
    maximumAttempts: 3,
    models: { test: policy },
  };
  const signed = signReader(claims);
  expect(verifyReader(signed)).toEqual(claims);
  expect(() => verifyReader(signed + 'bad')).toThrow();
  expect(() => verifyReader(signed, (now + 181) * 1000)).toThrow();
  expect(() => verifyReader(undefined)).toThrow();
  expect(readerDigest('different')).not.toBe(claims.digest);
});
it('uses integer conservative cost ceilings and stores numeric provider metadata only', () => {
  expect(ceilingMicros(policy)).toBe(BigInt(1200));
  expect(
    usageMetadata(
      {
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 4,
          thoughtsTokenCount: 5,
          confidential: 'do not log',
        },
      },
      'gemini',
    ),
  ).toEqual({ input: 12, output: 4, reasoning: 5, cached: null });
});
it('denies unapproved models, excess output and attempts before fetch', async () => {
  const call = vi
    .fn()
    .mockResolvedValue(
      Response.json({ usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2 } }),
    );
  vi.stubGlobal('fetch', call);
  const meter = providerMeter({ test: policy }, 1);
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/test:generateContent';
  await expect(
    meter.fetch(url, { body: JSON.stringify({ generationConfig: { maxOutputTokens: 101 } }) }),
  ).rejects.toThrow();
  expect(call).not.toHaveBeenCalled();
  await meter.fetch(url, { body: JSON.stringify({ generationConfig: { maxOutputTokens: 100 } }) });
  await expect(meter.fetch(url, { body: '{}' })).rejects.toThrow();
  expect(call).toHaveBeenCalledTimes(1);
  expect(meter.usage[0].tokens?.input).toBe(1);
});
