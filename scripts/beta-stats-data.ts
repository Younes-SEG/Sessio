import type { Client } from 'pg';

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
  totals: Record<TotalKey, number>;
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
  chat: 'used Ask Command',
};

const TOTAL_KEYS = ['courses', 'assessments', 'grades', 'ownTasks', 'chats30'] as const;
type TotalKey = (typeof TOTAL_KEYS)[number];

// Activity = something only an open, signed-in app causes: a chat message, a task the student
// wrote, or a Gmail/calendar check (both run only while Command is open).
const SQL = `
WITH ws AS (
  SELECT s."workspaceId" AS id FROM "Settings" s
  LEFT JOIN "AccountLifecycle" l ON l."workspaceId" = s."workspaceId"
  WHERE COALESCE(l."status", 'ACTIVE') = 'ACTIVE'
), course AS (
  SELECT sem."workspaceId" AS ws, c."id", c."syllabusImportedAt"
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
    await client.query('COMMIT');
    const row = rows[0];
    const n = (key: string) => Number(row[key] ?? 0);
    return {
      generatedAt: now.toISOString(),
      workspaces: n('workspaces'),
      funnel: Object.fromEntries(
        FUNNEL_STEPS.map((step) => [step, n(step)]),
      ) as BetaStats['funnel'],
      active: { days7: n('days7'), days30: n('days30') },
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
    `Command beta stats (counts only) - ${stats.generatedAt}`,
    '',
    `Workspaces: ${stats.workspaces} (accounts being deleted are excluded)`,
    `Active in the last 7 days: ${stats.active.days7} - last 30 days: ${stats.active.days30}`,
    '  (active = wrote a task, used Ask Command, or had Gmail/calendar checked while the app was open)',
    '',
    'Setup reached (workspaces, % of all):',
    ...FUNNEL_STEPS.map((step) => line(FUNNEL_LABELS[step], stats.funnel[step])),
    '',
    'Totals:',
    `  courses ${stats.totals.courses}, assessments ${stats.totals.assessments}, recorded grades ${stats.totals.grades}`,
    `  own tasks ${stats.totals.ownTasks}, Ask Command messages in the last 30 days ${stats.totals.chats30}`,
  ].join('\n');
}
