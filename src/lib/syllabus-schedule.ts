import { z } from 'zod';

export const sessionKinds = ['LECTURE', 'TUTORIAL', 'LAB'] as const;
export const sessionKindSchema = z.enum(sessionKinds);
const page = z.number().int().min(1).max(60).nullable();
export const syllabusSessionSchema = z
  .object({
    id: z.string().min(1).max(100),
    courseCode: z.string().min(1).max(30),
    section: z.string().min(1).max(80),
    kind: sessionKindSchema,
    ordinal: z.number().int().min(1).max(10).nullable(),
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().max(5).nullable(),
    source: z.string().max(1200),
    page,
  })
  .strict();
export const syllabusTimingSchema = z
  .object({
    label: z.string().min(1).max(300),
    startDate: z.string().max(10).nullable(),
    endDate: z.string().max(10).nullable(),
    kind: sessionKindSchema.nullable(),
    ordinal: z.number().int().min(1).max(10).nullable(),
    source: z.string().max(1200),
    page,
  })
  .strict();
export const syllabusExceptionSchema = z
  .object({
    startDate: z.string().max(10),
    endDate: z.string().max(10),
    label: z.string().min(1).max(200),
  })
  .strict();
export type SyllabusSession = z.infer<typeof syllabusSessionSchema>;
export type SyllabusTiming = z.infer<typeof syllabusTimingSchema>;
export type SyllabusException = z.infer<typeof syllabusExceptionSchema>;
export type SessionKind = (typeof sessionKinds)[number];

export function validDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const validTime = (value: string | null | undefined): value is string =>
  Boolean(value && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));

/** Recover a missed start only from one explicit 24-hour range in this row's evidence. */
export function sessionStartTime(session: Pick<SyllabusSession, 'startTime' | 'source'>) {
  if (validTime(session.startTime)) return session.startTime;
  const source = session.source;
  // Multiple ranges, AM/PM and uncertainty require review, not an inferred repair.
  if (
    /\b(?:a\.?m\.?|p\.?m\.?|TBD|TBA|unknown|unclear|conflict\w*|inconnu\w*|incertain\w*)\b/i.test(
      source,
    )
  )
    return null;
  const times = [...source.matchAll(/(?<!\d)([01]?\d|2[0-3])\s*[:h]\s*([0-5]\d)(?!\d)/gi)];
  if (times.length !== 2) return null;
  const [start, end] = times;
  const separator = source.slice(start.index! + start[0].length, end.index);
  if (!/^\s*(?:[-–—]|to|à)\s*$/i.test(separator)) return null;
  const from = `${start[1].padStart(2, '0')}:${start[2]}`;
  const to = `${end[1].padStart(2, '0')}:${end[2]}`;
  return from < to ? from : null;
}
export const courseCodeKey = (value: string) => value.replace(/\s+/g, '').toUpperCase();
export const sessionGroup = (session: SyllabusSession) =>
  `${courseCodeKey(session.courseCode)}|${session.section}`;

export interface SessionDateChoice {
  key: string;
  session: SyllabusSession;
  date: string;
  time: string;
  conflicts: string[];
}

/** Resolve only explicit date windows and known weekdays; never invent an academic week. */
export function sessionDateChoices(
  timing: SyllabusTiming | null | undefined,
  sessions: SyllabusSession[],
  courseCode: string,
  exceptions: SyllabusException[] = [],
): SessionDateChoice[] {
  if (!timing?.kind || !validDate(timing.startDate) || !validDate(timing.endDate)) return [];
  const start = Date.parse(`${timing.startDate}T00:00:00Z`);
  const end = Date.parse(`${timing.endDate}T00:00:00Z`);
  if (end < start || end - start > 13 * 86400000) return [];
  const choices: SessionDateChoice[] = [];
  const seen = new Set<string>();
  for (const session of sessions) {
    if (
      courseCodeKey(session.courseCode) !== courseCodeKey(courseCode) ||
      session.kind !== timing.kind
    )
      continue;
    if (timing.ordinal !== null && session.ordinal !== timing.ordinal) continue;
    for (let day = start; day <= end; day += 86400000) {
      const date = new Date(day);
      if (date.getUTCDay() !== session.weekday) continue;
      const key = `${session.id}|${date.toISOString().slice(0, 10)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const dateString = date.toISOString().slice(0, 10);
      choices.push({
        key,
        session,
        date: dateString,
        time: validTime(session.startTime) ? session.startTime : '',
        conflicts: exceptions
          .filter(
            (e) =>
              validDate(e.startDate) &&
              validDate(e.endDate) &&
              dateString >= e.startDate &&
              dateString <= e.endDate,
          )
          .map((e) => e.label),
      });
    }
  }
  return choices;
}
