import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSyllabusAiConfigured, readSyllabusWithAi } from '../src/lib/server/syllabus-ai';
import { syllabusPdf } from './fixtures/syllabus-pdf';
import { syllabusModelResult } from './fixtures/syllabus-result';
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn(async () => undefined) }));

const input = {
  bytes: syllabusPdf(['Synthetic syllabus']),
  kind: 'pdf' as const,
  pages: 1,
  course: { code: 'TEST101', name: 'Test course', startDate: '2090-09-01', endDate: '2090-12-31' },
};
const geminiResult = (finishReason = 'STOP', text = JSON.stringify(syllabusModelResult)) => ({
  candidates: [{ finishReason, content: { parts: [{ text }] } }],
});
function setup() {
  vi.stubEnv('SYLLABUS_AI_PROVIDER', 'gemini');
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
  vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
  vi.stubEnv('GEMINI_SYLLABUS_MODEL', 'gemini-3.8-flash');
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('syllabus AI provider selection', () => {
  it('sends the original PDF inline to Gemini, with the key only in a header', async () => {
    setup();
    const fetcher = vi.fn().mockResolvedValue(Response.json(geminiResult()));
    vi.stubGlobal('fetch', fetcher);
    const result = await readSyllabusWithAi(input);
    expect(result.items).toHaveLength(4);
    expect(result.items[0]).toMatchObject({ date: '2090-10-20', weight: 25, page: 1 });
    expect(result.items[2]).toMatchObject({ date: '', weight: null, grouped: true });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
    );
    expect(options.headers['x-goog-api-key']).toBe('test-gemini-key');
    expect(options.redirect).toBe('error');
    expect(options.body).not.toContain('test-gemini-key');
    expect(options.body).not.toContain('test-openai-key');
    const body = JSON.parse(options.body);
    expect(body.contents[0].parts[1]).toEqual({
      inlineData: { mimeType: 'application/pdf', data: input.bytes.toString('base64') },
    });
    expect(body.generationConfig.responseFormat.text.schema.required).toEqual([
      'categories',
      'sessions',
      'exceptions',
      'course',
      'items',
      'warnings',
    ]);
    // Live Gemini rejected maxItems on the nested array schema; local validation still caps it.
    expect(JSON.stringify(body.generationConfig.responseFormat.text.schema)).not.toContain(
      'maxItems',
    );
    expect(body.generationConfig.responseFormat.text.schema.additionalProperties).toBe(false);
  });
  it('uses the verified Flash-Lite default when no model override is set', async () => {
    setup();
    vi.stubEnv('GEMINI_SYLLABUS_MODEL', '');
    const fetcher = vi.fn().mockResolvedValue(Response.json(geminiResult()));
    vi.stubGlobal('fetch', fetcher);
    await readSyllabusWithAi(input);
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    );
  });
  it.each(['items', 'warnings', 'item-warnings'])(
    'still rejects oversized %s from Gemini',
    async (field) => {
      setup();
      const result = structuredClone(syllabusModelResult);
      if (field === 'items') result.items = Array.from({ length: 101 }, () => result.items[0]);
      else if (field === 'warnings') result.warnings = Array(21).fill('Warning');
      else result.items[0].warnings = Array(11).fill('Warning');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json(geminiResult('STOP', JSON.stringify(result)))),
      );
      await expect(readSyllabusWithAi(input)).rejects.toMatchObject({ status: 502 });
    },
  );
  it('handles pasted text without creating a file upload', async () => {
    setup();
    const fetcher = vi.fn().mockResolvedValue(Response.json(geminiResult()));
    vi.stubGlobal('fetch', fetcher);
    const result = await readSyllabusWithAi({
      ...input,
      kind: 'text',
      text: 'Midterm October 20',
      pages: null,
    });
    expect(result.items[0].page).toBeNull();
    expect(JSON.parse(fetcher.mock.calls[0][1].body).contents[0].parts[1]).toEqual({
      text: 'Midterm October 20',
    });
  });
  it.each([400, 401, 403, 404, 429])(
    'does not retry or fall back to OpenAI on %s',
    async (status) => {
      setup();
      const fetcher = vi
        .fn()
        .mockResolvedValue(new Response('private provider details test-gemini-key', { status }));
      vi.stubGlobal('fetch', fetcher);
      await expect(readSyllabusWithAi(input)).rejects.toThrow(/syllabus|provider/i);
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it('retries transient failures, then uses only the configured Gemini backup', async () => {
    setup();
    vi.stubEnv('GEMINI_SYLLABUS_FALLBACK_MODEL', 'gemini-3.1-flash-lite');
    const reserve = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json(geminiResult()));
    vi.stubGlobal('fetch', fetcher);
    expect((await readSyllabusWithAi(input, undefined, reserve)).items).toHaveLength(4);
    expect(reserve).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
    ]);
    expect(fetcher.mock.calls[2][1].body).toBe(fetcher.mock.calls[0][1].body);
  });
  it('stops after three transient failures and keeps a safe provider-unavailable error', async () => {
    setup();
    const fetcher = vi.fn(async () => new Response('private details', { status: 503 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(readSyllabusWithAi(input)).rejects.toMatchObject({
      status: 503,
      code: 'provider_unavailable',
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it.each(['MAX_TOKENS', 'SAFETY', 'RECITATION'])(
    'rejects incomplete or refused output: %s',
    async (reason) => {
      setup();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(geminiResult(reason))));
      await expect(readSyllabusWithAi(input)).rejects.toMatchObject({
        status: reason === 'MAX_TOKENS' ? 502 : 422,
      });
    },
  );
  it('rejects blocked prompts, malformed envelopes and invalid assessment output', async () => {
    setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ promptFeedback: { blockReason: 'SAFETY' } }))
        .mockResolvedValueOnce(Response.json({ candidates: 'invalid' }))
        .mockResolvedValueOnce(
          Response.json(geminiResult('STOP', '{"items": [{"name":"invalid"}]}')),
        ),
    );
    await expect(readSyllabusWithAi(input)).rejects.toMatchObject({ status: 422 });
    await expect(readSyllabusWithAi(input)).rejects.toMatchObject({ status: 502 });
    await expect(readSyllabusWithAi(input)).rejects.toMatchObject({ status: 502 });
  });
  it('fails closed for a missing selected key or invalid provider', async () => {
    setup();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    vi.stubEnv('GEMINI_API_KEY', '');
    expect(isSyllabusAiConfigured()).toBe(false);
    await expect(readSyllabusWithAi(input)).rejects.toMatchObject({ status: 503 });
    vi.stubEnv('SYLLABUS_AI_PROVIDER', 'typo');
    expect(isSyllabusAiConfigured()).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('preserves OpenAI behavior when no provider is selected', async () => {
    setup();
    vi.stubEnv('SYLLABUS_AI_PROVIDER', '');
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: JSON.stringify(syllabusModelResult) }],
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    expect((await readSyllabusWithAi(input)).items).toHaveLength(4);
    expect(fetcher.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses');
    expect(JSON.parse(fetcher.mock.calls[0][1].body).store).toBe(false);
    expect(
      JSON.parse(fetcher.mock.calls[0][1].body).text.format.schema.properties.items.maxItems,
    ).toBe(100);
  });
});

it.each(['gemini', 'openai'])(
  'sends DOCX text and embedded images as vision inputs to %s',
  async (provider) => {
    setup();
    vi.stubEnv('SYLLABUS_AI_PROVIDER', provider);
    const response =
      provider === 'gemini'
        ? geminiResult()
        : {
            status: 'completed',
            output: [
              {
                type: 'message',
                content: [{ type: 'output_text', text: JSON.stringify(syllabusModelResult) }],
              },
            ],
          };
    const fetcher = vi.fn().mockResolvedValue(Response.json(response));
    vi.stubGlobal('fetch', fetcher);
    const result = await readSyllabusWithAi({
      ...input,
      kind: 'docx',
      pages: null,
      text: 'Quiz 1, October 20, 10%',
      images: [{ bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg' }],
      warnings: ['Word layout needs review.'],
    });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    if (provider === 'gemini') {
      expect(body.contents[0].parts[1].text).toContain('Quiz 1');
      expect(body.contents[0].parts[2]).toEqual({
        inlineData: { mimeType: 'image/jpeg', data: 'AQID' },
      });
    } else {
      expect(body.input[0].content[1].text).toContain('Quiz 1');
      expect(body.input[0].content[2]).toEqual({
        type: 'input_image',
        image_url: 'data:image/jpeg;base64,AQID',
        detail: 'high',
      });
    }
    expect(result.warnings).toContain('Word layout needs review.');
    expect(result.items[0].page).toBeNull();
  },
);
