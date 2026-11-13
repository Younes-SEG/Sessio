import type { ModelPolicy } from './ai-policy';
import { usageMetadata } from './ai-policy';
import { ApiError } from './errors';

export type ProviderUsage = {
  model: string;
  provider: 'gemini' | 'openai';
  pricingVersion: string;
  tokens: ReturnType<typeof usageMetadata>;
  status: number | null;
};
export function providerMeter(models: Record<string, ModelPolicy>, maximumAttempts: number) {
  const usage: ProviderUsage[] = [];
  return {
    usage,
    fetch: async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const provider = url.startsWith('https://generativelanguage.googleapis.com/')
        ? 'gemini'
        : 'openai';
      const model =
        provider === 'gemini'
          ? decodeURIComponent(new URL(url).pathname.split('/models/')[1].split(':')[0])
          : body.model;
      const policy = models[model];
      const output =
        provider === 'gemini' ? body.generationConfig?.maxOutputTokens : body.max_output_tokens;
      if (
        !policy ||
        policy.provider !== provider ||
        !Number.isSafeInteger(output) ||
        output > policy.outputCeilingTokens ||
        usage.length >= maximumAttempts
      )
        throw new ApiError(503, 'This AI request exceeds its configured allowance.');
      const entry: ProviderUsage = {
        model,
        provider,
        pricingVersion: policy.pricingVersion,
        tokens: null,
        status: null,
      };
      usage.push(entry);
      const response = await fetch(url, init);
      entry.status = response.status;
      if (response.ok) {
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          if (reader)
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              size += value.length;
              if (size > 2_000_000) {
                await reader.cancel();
                throw new ApiError(502, 'The AI response was too large.');
              }
              chunks.push(value);
            }
        } finally {
          reader?.releaseLock();
        }
        const bytes = Buffer.concat(chunks);
        try {
          entry.tokens = usageMetadata(JSON.parse(bytes.toString()), provider);
        } catch {
          /* Unknown billing retains the full reservation. */
        }
        return new Response(bytes, { status: response.status, headers: response.headers });
      }
      return response;
    },
  };
}
