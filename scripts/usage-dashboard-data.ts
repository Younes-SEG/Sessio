import { createHmac } from 'node:crypto';

export const AI_FEATURES = ['chat', 'syllabus'] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export type UsageAttemptRow = {
  subject: string;
  feature: string;
  status: string;
  reservedMicros: bigint | string | number;
  usage: unknown;
  createdAt: Date | string;
};

type Counts = Record<AiFeature, Record<string, number>>;

export type UsageSummary = {
  attempts: number;
  counts: Counts;
  estimatedMicros: bigint;
  incompletelyPricedAttempts: number;
  subjects: Array<{
    subject: string;
    counts: Counts;
    estimatedMicros: bigint;
    incompletelyPricedAttempts: number;
  }>;
};

function emptyCounts(): Counts {
  return { chat: {}, syllabus: {} };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonnegativeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

/** Uses the immutable pricing snapshot stored with the attempt, never current settings. */
export function estimateAttemptMicros(usage: unknown) {
  const root = record(usage);
  const pricing = record(root?.pricing);
  const observed = root?.observed;
  if (!pricing || !Array.isArray(observed) || observed.length === 0)
    return { micros: BigInt(0), complete: false };

  let micros = BigInt(0);
  let complete = true;
  for (const raw of observed) {
    const item = record(raw);
    const tokens = record(item?.tokens);
    const policy = typeof item?.model === 'string' ? record(pricing[item.model]) : null;
    const input = nonnegativeInteger(tokens?.input);
    const output = nonnegativeInteger(tokens?.output);
    const inputRate = nonnegativeInteger(policy?.inputMicrosPerMillion);
    const outputRate = nonnegativeInteger(policy?.outputMicrosPerMillion);
    if (
      !policy ||
      input === null ||
      output === null ||
      inputRate === null ||
      outputRate === null ||
      typeof item?.pricingVersion !== 'string' ||
      item.pricingVersion !== policy.pricingVersion
    ) {
      complete = false;
      continue;
    }
    const numerator = BigInt(input) * BigInt(inputRate) + BigInt(output) * BigInt(outputRate);
    micros += (numerator + BigInt(999_999)) / BigInt(1_000_000);
  }
  return { micros, complete };
}

export function aggregateAttempts(rows: UsageAttemptRow[], since: Date): UsageSummary {
  const counts = emptyCounts();
  const subjects = new Map<
    string,
    {
      subject: string;
      counts: Counts;
      estimatedMicros: bigint;
      incompletelyPricedAttempts: number;
    }
  >();
  let attempts = 0;
  let estimatedMicros = BigInt(0);
  let incompletelyPricedAttempts = 0;

  for (const row of rows) {
    if (!AI_FEATURES.includes(row.feature as AiFeature) || new Date(row.createdAt) < since)
      continue;
    const feature = row.feature as AiFeature;
    const status = row.status || 'UNKNOWN';
    const subject = subjects.get(row.subject) || {
      subject: row.subject,
      counts: emptyCounts(),
      estimatedMicros: BigInt(0),
      incompletelyPricedAttempts: 0,
    };
    counts[feature][status] = (counts[feature][status] || 0) + 1;
    subject.counts[feature][status] = (subject.counts[feature][status] || 0) + 1;
    const estimate = estimateAttemptMicros(row.usage);
    estimatedMicros += estimate.micros;
    subject.estimatedMicros += estimate.micros;
    if (!estimate.complete) {
      incompletelyPricedAttempts += 1;
      subject.incompletelyPricedAttempts += 1;
    }
    subjects.set(row.subject, subject);
    attempts += 1;
  }

  return {
    attempts,
    counts,
    estimatedMicros,
    incompletelyPricedAttempts,
    subjects: [...subjects.values()].sort((a, b) => a.subject.localeCompare(b.subject)),
  };
}

export function subjectLabels(secret: string | undefined, invited: string | undefined) {
  const labels = new Map<string, string>();
  if (!secret || secret.length < 32 || !invited) return labels;
  for (const workspaceId of invited
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)) {
    // Keep this identical to usageSubject in src/lib/server/ai-usage.ts.
    labels.set(createHmac('sha256', secret).update(workspaceId).digest('hex'), workspaceId);
  }
  return labels;
}

export function displaySubject(subject: string, labels: Map<string, string>) {
  return labels.get(subject) || `${subject.slice(0, 12)}...`;
}

export function utcPeriods(now: Date) {
  const day = now.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  return {
    day,
    month,
    dayStart: new Date(`${day}T00:00:00.000Z`),
    monthStart: new Date(`${month}-01T00:00:00.000Z`),
  };
}

export function parseOptionalCap(value: string | undefined) {
  if (value === undefined || value === '') return { value: null, valid: true };
  if (!/^\d+$/.test(value)) return { value: null, valid: false };
  const parsed = BigInt(value);
  return parsed >= BigInt(1) && parsed <= BigInt(1_000_000_000)
    ? { value: parsed, valid: true }
    : { value: null, valid: false };
}
