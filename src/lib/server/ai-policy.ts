import { z } from 'zod';
import { ApiError } from './errors';

export const modelPolicySchema = z
  .object({
    provider: z.enum(['gemini', 'openai']),
    // Owner verifies the entire model context ceiling, not a guessed prompt size.
    inputCeilingTokens: z.number().int().min(1).max(10_000_000),
    outputCeilingTokens: z.number().int().min(1).max(1_000_000),
    inputMicrosPerMillion: z.number().int().min(1).max(1_000_000_000),
    outputMicrosPerMillion: z.number().int().min(1).max(1_000_000_000),
    pricingVersion: z.string().min(1).max(80),
  })
  .strict();
export type ModelPolicy = z.infer<typeof modelPolicySchema>;
export function modelPolicies() {
  try {
    return z
      .record(z.string().regex(/^[a-zA-Z0-9._-]{1,120}$/), modelPolicySchema)
      .parse(JSON.parse(process.env.COMMAND_AI_MODELS_JSON || '{}'));
  } catch {
    throw new ApiError(503, 'AI allowances are not configured.');
  }
}
export function ceilingMicros(policy: ModelPolicy) {
  return (
    (BigInt(policy.inputCeilingTokens) * BigInt(policy.inputMicrosPerMillion) +
      BigInt(policy.outputCeilingTokens) * BigInt(policy.outputMicrosPerMillion) +
      BigInt(999999)) /
    BigInt(1000000)
  );
}
export function usageMetadata(body: unknown, provider: 'gemini' | 'openai') {
  const root = body as Record<string, unknown> | null;
  const raw = (provider === 'gemini' ? root?.usageMetadata : root?.usage) as
    Record<string, unknown> | undefined;
  if (!raw) return null;
  const count = (value: unknown) =>
    Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
  const input = count(provider === 'gemini' ? raw.promptTokenCount : raw.input_tokens);
  const output = count(provider === 'gemini' ? raw.candidatesTokenCount : raw.output_tokens);
  if (input === null || output === null) return null;
  const detail = raw.output_tokens_details as Record<string, unknown> | undefined;
  return {
    input,
    output,
    reasoning: count(provider === 'gemini' ? raw.thoughtsTokenCount : detail?.reasoning_tokens),
    cached: count(
      provider === 'gemini'
        ? raw.cachedContentTokenCount
        : (raw.input_tokens_details as Record<string, unknown> | undefined)?.cached_tokens,
    ),
  };
}
