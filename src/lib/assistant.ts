import { z } from 'zod';
import type { Workspace } from './types';
import { matchEmailAssessment } from './email-grades';

const shortText = z.string().max(200).nullable();
const queryKind = z.enum(['assessments', 'grades', 'tasks', 'classes', 'events', 'study_sessions']);
const assessmentKind = z.enum([
  'ASSIGNMENT',
  'LAB',
  'QUIZ',
  'MIDTERM',
  'FINAL_EXAM',
  'PROJECT',
  'OTHER',
]);
export const assistantQuerySchema = z.object({
  include: z.array(queryKind).min(1).max(6),
  exclude: z.array(queryKind).max(6),
  assessmentTypes: z.array(assessmentKind).max(7),
  excludeAssessmentTypes: z.array(assessmentKind).max(7),
  completion: z.enum(['open', 'completed', 'all']),
  timing: z.enum(['upcoming', 'overdue', 'range', 'any']),
  selection: z.enum(['all', 'next']),
  text: z.string().max(100).nullable(),
});
export type AssistantQuery = z.infer<typeof assistantQuerySchema>;
export const assistantIntentSchema = z.object({
  kind: z.enum([
    'chat',
    'query',
    'agenda',
    'next_assessment',
    'grade',
    'grade_status',
    'schedule',
    'clarify',
  ]),
  query: assistantQuerySchema.nullable().optional(),
  agendaScope: z
    .enum(['all', 'study_sessions', 'classes', 'events', 'tasks', 'assessments'])
    .nullable()
    .optional(),
  message: z.string().max(900).nullable().optional(),
  assessmentType: z
    .enum(['ASSIGNMENT', 'LAB', 'QUIZ', 'MIDTERM', 'FINAL_EXAM', 'PROJECT', 'OTHER'])
    .nullable()
    .optional(),
  course: shortText,
  assessment: shortText,
  score: z.number().min(0).max(1_000_000).nullable(),
  maxScore: z.number().positive().max(1_000_000).nullable(),
  startLocal: shortText,
  endLocal: shortText,
  fromDate: shortText,
  toDate: shortText,
  question: z.string().max(600).nullable(),
  // grade_status only: a desired final course result, as a letter or a percentage.
  targetLetter: z.string().trim().min(1).max(20).nullable().optional(),
  targetPercent: z.number().min(0).max(100).nullable().optional(),
  targetPass: z.boolean().nullable().optional(),
});
export type AssistantIntent = z.infer<typeof assistantIntentSchema>;
export type AssistantWorkspace = Pick<
  Workspace,
  'courses' | 'semesters' | 'assessments' | 'tasks' | 'events' | 'schedules'
> & { settings?: Pick<Workspace['settings'], 'schoolId'> };
export type AssistantReply = {
  id: string;
  text: string;
  status: 'answer' | 'clarify' | 'confirm' | 'saved' | 'undone' | 'cancelled';
  href?: string;
  items?: { title: string; detail: string; href?: string }[];
  // Conversation and read-query context go back to the model, never full agenda/grade results.
  context?: string;
  actionsExpired?: boolean;
};
export type ChatEntry = {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  reply?: AssistantReply;
  createdAt?: string;
};
export type SavedChat = { id: string; title: string; updatedAt: string; entries: ChatEntry[] };
export type ChatMessage = { role: 'user' | 'model'; text: string };
export const say = (language: string, en: string, fr: string) => (language === 'fr' ? fr : en);

export function localStamp(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function validDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === day
  );
}

/** Format device-local wall times without accidentally applying the server timezone. */
export function friendlyWhen(local: string, language: string, zone: string, now = new Date()) {
  const day = local.slice(0, 10);
  const today = localStamp(now, zone).slice(0, 10);
  const locale = language === 'fr' ? 'fr-CA' : 'en-US';
  const date = new Date(`${local}:00Z`);
  const label =
    day === today
      ? say(language, 'Today', 'Aujourd’hui')
      : day === nextDay(today)
        ? say(language, 'Tomorrow', 'Demain')
        : new Intl.DateTimeFormat(locale, {
            timeZone: 'UTC',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' as const } : {}),
          }).format(date);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${label} ${say(language, 'at', 'à')} ${time}`;
}
export function friendlySession(
  start: string,
  end: string,
  language: string,
  zone: string,
  now = new Date(),
) {
  const finish =
    start.slice(0, 10) === end.slice(0, 10)
      ? new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
          timeZone: 'UTC',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(`${end}:00Z`))
      : friendlyWhen(end, language, zone, now);
  return `${friendlyWhen(start, language, zone, now)} – ${finish}`;
}

export function nextAssessmentAnswer(
  data: AssistantWorkspace,
  intent: AssistantIntent,
  zone: string,
  language: string,
  now = new Date(),
  courseId?: string,
): Pick<AssistantReply, 'text' | 'items' | 'href'> {
  const visible = data.courses.filter((c) => !c.archived && (!courseId || c.id === courseId));
  const ids = new Set(visible.map((c) => c.id));
  const namedIds = intent.assessment
    ? new Set(
        visible.map((c) => matchingAssessment(data, c.id, intent.assessment!)?.id).filter(Boolean),
      )
    : null;
  const candidates = data.assessments.filter(
    (a) =>
      ids.has(a.courseId) &&
      !['SUBMITTED', 'GRADED'].includes(a.status) &&
      (!intent.assessmentType || a.type === intent.assessmentType) &&
      (!namedIds || namedIds.has(a.id)),
  );
  const undated = candidates.filter((a) => !a.dueDate).length;
  const upcoming = candidates
    .filter((a) => {
      if (!a.dueDate || +new Date(a.dueDate) < +now) return false;
      const day = localStamp(new Date(a.dueDate), zone).slice(0, 10);
      return (
        (!intent.fromDate || day >= intent.fromDate) && (!intent.toDate || day <= intent.toDate)
      );
    })
    .sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!));
  const nouns = {
    QUIZ: ['quiz', 'quiz'],
    MIDTERM: ['midterm', 'examen de mi-session'],
    FINAL_EXAM: ['final exam', 'examen final'],
    LAB: ['lab', 'laboratoire'],
    ASSIGNMENT: ['assignment', 'devoir'],
    PROJECT: ['project', 'projet'],
    OTHER: ['assessment', 'évaluation'],
  };
  const noun = nouns[intent.assessmentType || 'OTHER'][language === 'fr' ? 1 : 0];
  const first = upcoming[0];
  const missing = undated
    ? say(
        language,
        ` ${undated === 1 ? 'There is also 1 matching assessment' : `There are also ${undated} matching assessments`} without a date, so I can’t tell where ${undated === 1 ? 'it fits' : 'they fit'} yet.`,
        ` ${undated} évaluation(s) correspondante(s) n’ont pas encore de date ; je ne peux donc pas les situer dans l’horaire.`,
      )
    : '';
  if (!first)
    return {
      text: say(
        language,
        `I couldn’t find an upcoming ${noun}${intent.fromDate || intent.toDate ? ' in that date range' : ' with a saved date'}.${missing} You can check or add its date in your course.`,
        `Je n’ai pas trouvé de ${noun} à venir${intent.fromDate || intent.toDate ? ' pour cette période' : ' avec une date enregistrée'}.${missing} Tu peux vérifier ou ajouter sa date dans ton cours.`,
      ),
      href: courseId ? `/courses/${courseId}` : '/courses',
    };
  const tied = upcoming.filter((a) => a.dueDate === first.dueDate);
  return {
    text: say(
      language,
      tied.length > 1
        ? `You have ${tied.length} matching assessments scheduled at the same time.${missing}`
        : `Here’s your next ${noun}.${missing}`,
      tied.length > 1
        ? `Tu as ${tied.length} évaluations correspondantes prévues en même temps.${missing}`
        : `Voici ton prochain ${noun}.${missing}`,
    ),
    items: tied.map((a) => ({
      title: `${visible.find((c) => c.id === a.courseId)!.code} · ${a.name}`,
      detail: friendlyWhen(localStamp(new Date(a.dueDate!), zone), language, zone, now),
      href: `/courses/${a.courseId}`,
    })),
    href: '/calendar',
  };
}
export function nextDay(day: string) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
}
/** Reject missing/repeated wall times at DST boundaries instead of guessing. */
export function localToInstant(value: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) || !validDay(value.slice(0, 10)))
    return null;
  const wall = new Date(`${value}:00Z`).getTime();
  const offsets = new Set<number>();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const probe = new Date(wall + hours * 3_600_000);
    offsets.add(new Date(`${localStamp(probe, timeZone)}:00Z`).getTime() - probe.getTime());
  }
  const candidates = [...offsets]
    .map((offset) => new Date(wall - offset))
    .filter((date) => localStamp(date, timeZone) === value);
  return candidates.length === 1 ? candidates[0] : null;
}
const key = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
export function matchingCourses(data: AssistantWorkspace, query: string | null) {
  if (!query) return [];
  const q = key(query);
  return data.courses.filter((course) => {
    if (course.archived) return false;
    if (/^\d{4}$/.test(q) && key(course.code).endsWith(q)) return true;
    const term = data.semesters.find((s) => s.id === course.semesterId)?.name || '';
    return [
      course.code,
      course.name,
      `${course.code} ${term}`,
      `${course.name} ${term}`,
      `${course.code} ${course.name} ${term}`,
    ].some((label) => key(label) === q);
  });
}
export function matchingAssessment(data: AssistantWorkspace, courseId: string, query: string) {
  const course = data.courses.find((c) => c.id === courseId)!;
  const candidates = data.assessments.filter((a) => a.courseId === courseId);
  const exact = candidates.filter((a) => key(a.name) === key(query));
  if (exact.length === 1) return exact[0];
  const expanded = query.replace(/^a\s*(\d+)$/i, 'Assignment $1');
  const id = matchEmailAssessment(`${course.code}\n${expanded}`, [course], candidates);
  return candidates.find((a) => a.id === id) ?? null;
}

export type AgendaItem = {
  title: string;
  start: string;
  end: string;
  kind: 'assessment' | 'task' | 'event' | 'class';
  href: string;
};
/** Timezone-explicit calendar projection, independent of the server's local timezone. */
export function assistantAgenda(
  data: AssistantWorkspace,
  from: string,
  to: string,
  zone: string,
  courseId?: string,
) {
  if (
    !validDay(from) ||
    !validDay(to) ||
    to < from ||
    +new Date(to) - +new Date(from) > 31 * 86_400_000
  )
    throw new Error('Choose a range of up to 31 days.');
  const courses = data.courses.filter((c) => !c.archived && (!courseId || c.id === courseId));
  const ids = new Set(courses.map((c) => c.id));
  const visible = (id: string | null) => (id ? ids.has(id) : !courseId);
  const label = (id: string | null, title: string) =>
    `${courses.find((c) => c.id === id)?.code ? `${courses.find((c) => c.id === id)!.code} · ` : ''}${title}`;
  const items: AgendaItem[] = [];
  const add = (
    title: string,
    date: string | null,
    end: string | null,
    kind: AgendaItem['kind'],
    href: string,
  ) => {
    if (!date) return;
    const start = localStamp(new Date(date), zone);
    const finish = localStamp(new Date(end || date), zone);
    if (start.slice(0, 10) <= to && finish.slice(0, 10) >= from)
      items.push({ title, start, end: finish, kind, href });
  };
  for (const a of data.assessments)
    if (ids.has(a.courseId) && !['SUBMITTED', 'GRADED'].includes(a.status))
      add(label(a.courseId, a.name), a.dueDate, null, 'assessment', `/courses/${a.courseId}`);
  for (const t of data.tasks) {
    if (!visible(t.courseId) || t.status === 'COMPLETED' || t.calendarManaged) continue;
    if (
      t.studyTask &&
      data.assessments.some(
        (a) => a.id === t.assessmentId && ['SUBMITTED', 'GRADED'].includes(a.status),
      )
    )
      continue;
    add(label(t.courseId, t.title), t.dueDate, null, 'task', '/tasks');
  }
  for (const e of data.events)
    if (visible(e.courseId))
      add(label(e.courseId, e.title), e.startAt, e.endAt, 'event', '/calendar');
  for (let day = from; day <= to; day = nextDay(day)) {
    for (const s of data.schedules) {
      if (!ids.has(s.courseId) || new Date(`${day}T12:00:00Z`).getUTCDay() !== s.dayOfWeek)
        continue;
      const course = courses.find((c) => c.id === s.courseId)!;
      const semester = data.semesters.find((s) => s.id === course.semesterId);
      if (!semester || day < semester.startDate.slice(0, 10) || day > semester.endDate.slice(0, 10))
        continue;
      items.push({
        title: label(s.courseId, s.title),
        start: `${day}T${s.startTime}`,
        end: `${day}T${s.endTime}`,
        kind: 'class',
        href: '/calendar',
      });
    }
  }
  return items.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}
export function sessionConflicts(
  data: AssistantWorkspace,
  start: string,
  end: string,
  zone: string,
) {
  return assistantAgenda(data, start.slice(0, 10), end.slice(0, 10), zone).filter(
    (item) => ['class', 'event'].includes(item.kind) && item.start < end && item.end > start,
  );
}

/** Study events are separate from assessment deadlines and generated study-task reminders. */
export function isStudySession(event: AssistantWorkspace['events'][number]) {
  const title = event.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /\b(study|studying|revision|revisions|reviser|etude|etudes|etudier)\b|\breview session\b|\bexam prep\b/.test(
    title,
  );
}

export function assistantAgendaForIntent(
  data: AssistantWorkspace,
  intent: AssistantIntent,
  zone: string,
  courseId?: string,
) {
  const scope = intent.assessmentType ? 'assessments' : intent.agendaScope || 'all';
  const scoped = {
    ...data,
    assessments: ['all', 'assessments'].includes(scope)
      ? data.assessments.filter((a) => !intent.assessmentType || a.type === intent.assessmentType)
      : [],
    tasks: ['all', 'tasks'].includes(scope) ? data.tasks : [],
    events:
      scope === 'study_sessions'
        ? data.events.filter(isStudySession)
        : ['all', 'events'].includes(scope)
          ? data.events
          : [],
    schedules: ['all', 'classes'].includes(scope) ? data.schedules : [],
  };
  return assistantAgenda(scoped, intent.fromDate!, intent.toDate!, zone, courseId);
}
