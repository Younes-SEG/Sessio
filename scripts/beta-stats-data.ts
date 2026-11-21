import type { Client } from 'pg';
import { estimateAttemptMicros } from './usage-dashboard-data';

/**
 * Beta measurement, counts only. Every number is an aggregate computed in SQL; no row
 * identifies a workspace, and no names, emails, course titles, grades or messages leave
 * the database. Accounts being deleted or erased are excluded.
 */
export type BetaStats = {
  generatedAt: string;
  workspaces: number;
  funnel: Record<FunnelStep, number>;
  active: { days7: number; days30: number };
  /**
   * Cohorts from `Settings.createdAt` (first open; workspaces from before 2026-11-16 use their
   * earliest stored timestamp). Activity uses the same signals as `active`, so it undercounts.
   */
  retention: {
    new7: number;
    new30: number;
    /** Workspaces at least 28 days old, and those active in their days 22–28. */
    week4Eligible: number;
    week4Returned: number;
    /** Workspaces with courses in 2+ terms, and those active after their later term began. */
    secondTerm: number;
    secondTermReturned: number;
  };
  totals: Record<TotalKey, number>;
  /**
   * Last 30 days of AI (chat + syllabus), from content-free accounting. Includes accounts
   * since erased, because their spend still happened. Estimated from each attempt's stored
   * pricing snapshot, like `npm run usage`; not a provider invoice.
   */
  ai30: {
    attempts: number;
    estimatedMicros: number;
    incomplete: number;
    perActiveMicros: number | null;
  };
};

export const FUNNEL_STEPS = [
  'onboarded',
  'school',
  'semester',
  'course',
  'assessment',
  'weights',
  'grade',
  'syllabus',
  'calendar',
  'gmail',
  'ownTask',
  'chat',
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_LABELS: Record<FunnelStep, string> = {
  onboarded: 'finished or skipped the welcome',
  school: 'chose a school',
  semester: 'have a semester',
  course: 'have a course',
  assessment: 'have an assessment',
  weights: 'entered a grade weight',
  grade: 'recorded a grade',
  syllabus: 'imported a syllabus',
  calendar: 'connected a calendar',
  gmail: 'connected Gmail',
  ownTask: 'created their own task',
  chat: 'used Ask Sessio',
};

const TOTAL_KEYS = ['courses', 'assessments', 'grades', 'ownTasks', 'chats30'] as const;
type TotalKey = (typeof TOTAL_KEYS)[number];

// Activity = something only an open, signed-in app causes: a chat message, a task the student
// wrote, or a Gmail/calendar check (both run only while Sessio is open).
const SQL = `
WITH ws AS (
  SELECT s."workspaceId" AS id, s."createdAt" FROM "Settings" s
  LEFT JOIN "AccountLifecycle" l ON l."workspaceId" = s."workspaceId"
  WHERE COALESCE(l."status", 'ACTIVE') = 'ACTIVE'
), course AS (
  SELECT sem."workspaceId" AS ws, c."id", c."syllabusImportedAt", sem."startDate"
  FROM "Course" c JOIN "Semester" sem ON sem."id" = c."semesterId"
  WHERE c."deletedAt" IS NULL AND sem."workspaceId" IN (SELECT id FROM ws)
), assess AS (
  SELECT course.ws, a."weight", a."score"
  FROM "Assessment" a JOIN course ON course."id" = a."courseId"
), own_task AS (
  SELECT t."workspaceId" AS ws, t."createdAt" FROM "Task" t
  WHERE NOT t."studyTask" AND NOT t."calendarManaged" AND t."workspaceId" IN (SELECT id FROM ws)
), chat AS (
  SELECT r."workspaceId" AS ws, r."createdAt" FROM "AssistantRequest" r
  WHERE r."workspaceId" IN (SELECT id FROM ws)
), signal AS (
  SELECT ws, "createdAt" AS at FROM own_task
  UNION ALL SELECT ws, "createdAt" FROM chat
  UNION ALL SELECT g."workspaceId", g."lastCheckedAt" FROM "GmailConnection" g
    WHERE g."lastCheckedAt" IS NOT NULL AND g."workspaceId" IN (SELECT id FROM ws)
  UNION ALL SELECT cs."workspaceId", cs."lastSyncedAt" FROM "CalendarSubscription" cs
    WHERE cs."lastSyncedAt" IS NOT NULL AND cs."workspaceId" IN (SELECT id FROM ws)
), later_term AS (
  SELECT DISTINCT c.ws, c."startDate" FROM course c
  WHERE c."startDate" > (SELECT MIN(c2."startDate") FROM course c2 WHERE c2.ws = c.ws)
)
SELECT
  (SELECT count(*) FROM ws) AS workspaces,
  (SELECT count(*) FROM "Settings" s WHERE s."workspaceId" IN (SELECT id FROM ws) AND s."onboardingCompleted") AS onboarded,
  (SELECT count(*) FROM "Settings" s WHERE s."workspaceId" IN (SELECT id FROM ws) AND s."schoolId" IS NOT NULL) AS school,
  (SELECT count(DISTINCT sem."workspaceId") FROM "Semester" sem WHERE sem."workspaceId" IN (SELECT id FROM ws)) AS semester,
  (SELECT count(DISTINCT ws) FROM course) AS course,
  (SELECT count(DISTINCT ws) FROM assess) AS assessment,
  (SELECT count(DISTINCT ws) FROM assess WHERE "weight" > 0) AS weights,
  (SELECT count(DISTINCT ws) FROM assess WHERE "score" IS NOT NULL) AS grade,
  (SELECT count(DISTINCT ws) FROM course WHERE "syllabusImportedAt" IS NOT NULL) AS syllabus,
  (SELECT count(DISTINCT cs."workspaceId") FROM "CalendarSubscription" cs WHERE cs."workspaceId" IN (SELECT id FROM ws)) AS calendar,
  (SELECT count(*) FROM "GmailConnection" g WHERE g."workspaceId" IN (SELECT id FROM ws)) AS gmail,
  (SELECT count(DISTINCT ws) FROM own_task) AS "ownTask",
  (SELECT count(DISTINCT ws) FROM chat) AS chat,
  (SELECT count(DISTINCT ws) FROM signal WHERE at >= $1::timestamptz - interval '7 days') AS days7,
  (SELECT count(DISTINCT ws) FROM signal WHERE at >= $1::timestamptz - interval '30 days') AS days30,
  (SELECT count(*) FROM ws WHERE "createdAt" >= $1::timestamptz - interval '7 days') AS new7,
  (SELECT count(*) FROM ws WHERE "createdAt" >= $1::timestamptz - interval '30 days') AS new30,
  (SELECT count(*) FROM ws WHERE "createdAt" <= $1::timestamptz - interval '28 days') AS "week4Eligible",
  (SELECT count(*) FROM ws WHERE "createdAt" <= $1::timestamptz - interval '28 days'
    AND EXISTS (SELECT 1 FROM signal sg WHERE sg.ws = ws.id
      AND sg.at > ws."createdAt" + interval '21 days' AND sg.at <= ws."createdAt" + interval '28 days')) AS "week4Returned",
  (SELECT count(DISTINCT ws) FROM later_term) AS "secondTerm",
  (SELECT count(DISTINCT lt.ws) FROM later_term lt
    WHERE EXISTS (SELECT 1 FROM signal sg WHERE sg.ws = lt.ws AND sg.at >= lt."startDate")) AS "secondTermReturned",
  (SELECT count(*) FROM course) AS courses,
  (SELECT count(*) FROM assess) AS assessments,
  (SELECT count(*) FROM assess WHERE "score" IS NOT NULL) AS grades,
  (SELECT count(*) FROM own_task) AS "ownTasks",
  (SELECT count(*) FROM chat WHERE "createdAt" >= $1::timestamptz - interval '30 days') AS chats30
`;

export async function readBetaStats(client: Client, now = new Date()): Promise<BetaStats> {
  await client.query('BEGIN TRANSACTION READ ONLY');
  try {
    const { rows } = await client.query<Record<string, string>>(SQL, [now.toISOString()]);
    const attempts = await client.query<{ usage: unknown }>(
      `SELECT "usage" FROM "AiAttempt" WHERE "createdAt" >= $1::timestamptz - interval '30 days'`,
      [now.toISOString()],
    );
    await client.query('COMMIT');
    const row = rows[0];
    const n = (key: string) => Number(row[key] ?? 0);
    let micros = BigInt(0);
    let incomplete = 0;
    for (const attempt of attempts.rows) {
      const estimate = estimateAttemptMicros(attempt.usage);
      micros += estimate.micros;
      if (!estimate.complete) incomplete++;
    }
    const estimatedMicros = Number(micros);
    const active30 = n('days30');
    return {
      ai30: {
        attempts: attempts.rows.length,
        estimatedMicros,
        incomplete,
        perActiveMicros: active30 ? Math.round(estimatedMicros / active30) : null,
      },
      generatedAt: now.toISOString(),
      workspaces: n('workspaces'),
      funnel: Object.fromEntries(
        FUNNEL_STEPS.map((step) => [step, n(step)]),
      ) as BetaStats['funnel'],
      active: { days7: n('days7'), days30: n('days30') },
      retention: {
        new7: n('new7'),
        new30: n('new30'),
        week4Eligible: n('week4Eligible'),
        week4Returned: n('week4Returned'),
        secondTerm: n('secondTerm'),
        secondTermReturned: n('secondTermReturned'),
      },
      totals: Object.fromEntries(TOTAL_KEYS.map((key) => [key, n(key)])) as BetaStats['totals'],
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Keep the original failure; never log connection details.
    }
    throw error;
  }
}

function percent(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : '-';
}

export function formatBetaStats(stats: BetaStats) {
  const width = Math.max(...Object.values(FUNNEL_LABELS).map((label) => label.length));
  const line = (label: string, value: number, of = stats.workspaces) =>
    `  ${label.padEnd(width)}  ${String(value).padStart(5)}  ${percent(value, of).padStart(4)}`;
  return [
    `Sessio beta stats (counts only) - ${stats.generatedAt}`,
    '',
    `Workspaces: ${stats.workspaces} (accounts being deleted are excluded)`,
    `Active in the last 7 days: ${stats.active.days7} - last 30 days: ${stats.active.days30}`,
    '  (active = wrote a task, used Ask Sessio, or had Gmail/calendar checked while the app was open)',
    '',
    `New workspaces: ${stats.retention.new7} in the last 7 days, ${stats.retention.new30} in the last 30 days`,
    `Week-4 return: ${stats.retention.week4Returned} of ${stats.retention.week4Eligible} workspaces at least 28 days old ` +
      `(${percent(stats.retention.week4Returned, stats.retention.week4Eligible)}) were active in days 22-28`,
    `Next-term return: ${stats.retention.secondTermReturned} of ${stats.retention.secondTerm} workspaces with courses in 2+ terms ` +
      `(${percent(stats.retention.secondTermReturned, stats.retention.secondTerm)}) were active after their later term began`,
    '',
    'Setup reached (workspaces, % of all):',
    ...FUNNEL_STEPS.map((step) => line(FUNNEL_LABELS[step], stats.funnel[step])),
    '',
    'Totals:',
    `  courses ${stats.totals.courses}, assessments ${stats.totals.assessments}, recorded grades ${stats.totals.grades}`,
    `  own tasks ${stats.totals.ownTasks}, Ask Sessio messages in the last 30 days ${stats.totals.chats30}`,
    '',
    'AI in the last 30 days (estimate from stored pricing, not an invoice):',
    `  ${stats.ai30.attempts} requests, ${usd(stats.ai30.estimatedMicros)} total, ` +
      `${stats.ai30.perActiveMicros === null ? 'no active users' : `${usd(stats.ai30.perActiveMicros)} per active user`}`,
    ...(stats.ai30.incomplete
      ? [`  ${stats.ai30.incomplete} request(s) lack complete usage data; the estimate is partial.`]
      : []),
  ].join('\n');
}

function usd(micros: number) {
  return `US$${(micros / 1_000_000).toFixed(micros && micros < 10_000 ? 4 : 2)}`;
}
