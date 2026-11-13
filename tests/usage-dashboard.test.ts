import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  aggregateAttempts,
  displaySubject,
  estimateAttemptMicros,
  subjectLabels,
  utcPeriods,
  type UsageAttemptRow,
} from '../scripts/usage-dashboard-data';

const pricedUsage = (input: number, output: number) => ({
  pricing: {
    synthetic: {
      provider: 'openai',
      inputCeilingTokens: 10_000,
      outputCeilingTokens: 2_000,
      inputMicrosPerMillion: 2_000_000,
      outputMicrosPerMillion: 8_000_000,
      pricingVersion: 'test-v1',
    },
  },
  maximumAttempts: 2,
  observed: [
    {
      model: 'synthetic',
      provider: 'openai',
      pricingVersion: 'test-v1',
      tokens: { input, output, reasoning: null, cached: null },
      status: 200,
    },
  ],
});

describe('AI usage dashboard aggregation', () => {
  it('prices observed tokens with the attempt snapshot and rejects mismatched pricing', () => {
    expect(estimateAttemptMicros(pricedUsage(250, 100))).toEqual({
      micros: BigInt(1_300),
      complete: true,
    });
    const mismatched = pricedUsage(250, 100);
    mismatched.observed[0].pricingVersion = 'different';
    expect(estimateAttemptMicros(mismatched)).toEqual({ micros: BigInt(0), complete: false });
  });

  it('separates UTC day/month totals and per-subject feature/status counts', () => {
    const now = new Date('2026-11-13T18:00:00.000Z');
    const rows: UsageAttemptRow[] = [
      {
        subject: 'aaa',
        feature: 'chat',
        status: 'FINISHED',
        reservedMicros: BigInt(10_000),
        usage: pricedUsage(250, 100),
        createdAt: '2026-11-13T01:00:00.000Z',
      },
      {
        subject: 'aaa',
        feature: 'syllabus',
        status: 'UNCERTAIN',
        reservedMicros: BigInt(20_000),
        usage: null,
        createdAt: '2026-11-12T23:00:00.000Z',
      },
      {
        subject: 'bbb',
        feature: 'chat',
        status: 'RESERVED',
        reservedMicros: BigInt(10_000),
        usage: null,
        createdAt: '2026-10-31T23:59:59.000Z',
      },
    ];
    const periods = utcPeriods(now);
    const month = aggregateAttempts(rows, periods.monthStart);
    const day = aggregateAttempts(rows, periods.dayStart);

    expect(month.attempts).toBe(2);
    expect(month.counts.chat.FINISHED).toBe(1);
    expect(month.counts.syllabus.UNCERTAIN).toBe(1);
    expect(month.estimatedMicros).toBe(BigInt(1_300));
    expect(month.incompletelyPricedAttempts).toBe(1);
    expect(month.subjects[0].counts.syllabus.UNCERTAIN).toBe(1);
    expect(day.attempts).toBe(1);
    expect(day.counts.chat.FINISHED).toBe(1);
  });

  it('labels only locally matched invited workspace pseudonyms', () => {
    const secret = 'a-local-secret-that-is-at-least-32-characters';
    const subject = createHmac('sha256', secret).update('user:owner').digest('hex');
    const labels = subjectLabels(secret, 'user:owner,user:second');
    expect(displaySubject(subject, labels)).toBe('user:owner');
    expect(displaySubject('abcdef0123456789', new Map())).toBe('abcdef012345...');
    expect(subjectLabels('short', 'user:owner').size).toBe(0);
  });
});
