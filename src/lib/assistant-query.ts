import type { AssessmentType } from './types';
import {
  assistantAgenda,
  friendlySession,
  friendlyWhen,
  isStudySession,
  localStamp,
  matchingAssessment,
  nextDay,
  say,
  validDay,
  type AssistantIntent,
  type AssistantReply,
  type AssistantWorkspace,
} from './assistant';

type Row = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  href: string;
  category: 'assessments' | 'grades' | 'tasks' | 'events' | 'classes';
  assessmentType?: AssessmentType;
  completed: boolean;
  study: boolean;
  score?: number | null;
  maxScore?: number;
};
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const afterDays = (date: string, days: number) =>
  new Date(+new Date(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** One composable, read-only query over owned workspace data; exclusions always win. */
export function answerAssistantQuery(
  data: AssistantWorkspace,
  intent: AssistantIntent,
  zone: string,
  language: string,
  now = new Date(),
  courseId?: string,
): Pick<AssistantReply, 'text' | 'items' | 'href'> {
  const query = intent.query;
  if (!query) throw new Error('missing-query');
  const s = (en: string, fr: string) => say(language, en, fr);
  const today = localStamp(now, zone).slice(0, 10);
  const nowLocal = localStamp(now, zone);
  const { fromDate: from, toDate: to } = intent;
  if (
    (from && !validDay(from)) ||
    (to && !validDay(to)) ||
    (from && to && (from > to || +new Date(to) - +new Date(from) > 366 * 86_400_000))
  )
    throw new Error('invalid-query-dates');
  if (query.timing === 'range' && (!from || !to)) throw new Error('missing-query-dates');
  const courses = data.courses.filter((c) => !c.archived && (!courseId || c.id === courseId));
  const courseIds = new Set(courses.map((c) => c.id));
  const visible = (id: string | null) => (id ? courseIds.has(id) : !courseId);
  const title = (id: string | null, name: string) =>
    `${courses.find((c) => c.id === id)?.code ? `${courses.find((c) => c.id === id)!.code} · ` : ''}${name}`;
  const stamp = (date: string | null) => (date ? localStamp(new Date(date), zone) : null);
  const rows: Row[] = [];
  const named = intent.assessment
    ? new Set(
        courses.map((c) => matchingAssessment(data, c.id, intent.assessment!)?.id).filter(Boolean),
      )
    : null;
  for (const a of data.assessments) {
    if (!courseIds.has(a.courseId) || (named && !named.has(a.id))) continue;
    rows.push({
      id: a.id,
      title: title(a.courseId, a.name),
      start: stamp(a.dueDate),
      end: stamp(a.dueDate),
      href: `/courses/${a.courseId}`,
      category:
        query.include.includes('grades') && a.status === 'GRADED' && a.score !== null
          ? 'grades'
          : 'assessments',
      assessmentType: a.type,
      completed: ['SUBMITTED', 'GRADED'].includes(a.status),
      study: false,
      score: a.score,
      maxScore: a.maxScore,
    });
  }
  for (const task of data.tasks) {
    if (
      !visible(task.courseId) ||
      task.calendarManaged ||
      (task.assessmentId &&
        !data.assessments.some((a) => a.id === task.assessmentId && courseIds.has(a.courseId)))
    )
      continue;
    if (
      task.studyTask &&
      task.status !== 'COMPLETED' &&
      data.assessments.some(
        (a) => a.id === task.assessmentId && ['SUBMITTED', 'GRADED'].includes(a.status),
      )
    )
      continue;
    rows.push({
      id: task.id,
      title: title(task.courseId, task.title),
      start: stamp(task.dueDate),
      end: stamp(task.dueDate),
      href: '/tasks',
      category: 'tasks',
      completed: task.status === 'COMPLETED',
      study: false,
    });
  }
  for (const event of data.events) {
    if (!visible(event.courseId)) continue;
    rows.push({
      id: event.id,
      title: title(event.courseId, event.title),
      start: stamp(event.startAt),
      end: stamp(event.endAt),
      href: '/calendar',
      category: 'events',
      completed: false,
      study: isStudySession(event),
    });
  }
  const wantsClasses = query.include.includes('classes') && !query.exclude.includes('classes');
  if (wantsClasses) {
    // Recurring classes are bounded to their semester and at most one year per query.
    const begin = from || today;
    const finish = to || afterDays(begin, query.selection === 'next' ? 366 : 29);
    if (finish < begin || +new Date(finish) - +new Date(begin) > 366 * 86_400_000)
      throw new Error('invalid-query-dates');
    for (let day = begin; day <= finish;) {
      const end = afterDays(day, 30) < finish ? afterDays(day, 30) : finish;
      const classes = assistantAgenda(
        { ...data, assessments: [], events: [], tasks: [] },
        day,
        end,
        zone,
        courseId,
      );
      rows.push(
        ...classes.map((item, index) => ({
          id: `class:${item.start}:${index}`,
          title: item.title,
          start: item.start,
          end: item.end,
          href: item.href,
          category: 'classes' as const,
          completed: false,
          study: false,
        })),
      );
      day = nextDay(end);
    }
  }
  const filtered = rows.filter((row) => {
    const categories = [
      row.category,
      ...(row.study ? ['study_sessions'] : []),
      ...(row.category === 'grades' ? ['assessments'] : []),
      ...(row.score !== null && row.score !== undefined && row.completed ? ['grades'] : []),
    ];
    if (
      !query.include.some((kind) => categories.includes(kind)) ||
      query.exclude.some((kind) => categories.includes(kind))
    )
      return false;
    if (
      row.assessmentType &&
      ((query.assessmentTypes.length && !query.assessmentTypes.includes(row.assessmentType)) ||
        query.excludeAssessmentTypes.includes(row.assessmentType))
    )
      return false;
    if (query.completion === 'open' && row.completed) return false;
    if (query.completion === 'completed' && !row.completed) return false;
    if (
      query.text &&
      !normalize(query.text)
        .split(' ')
        .every((word) => normalize(row.title).split(' ').includes(word))
    )
      return false;
    if (
      (from || to) &&
      (!row.start ||
        (from && (row.end || row.start).slice(0, 10) < from) ||
        (to && row.start.slice(0, 10) > to))
    )
      return false;
    if (
      query.timing === 'overdue' &&
      (!row.start ||
        row.start >= nowLocal ||
        row.completed ||
        !['tasks', 'assessments'].includes(row.category))
    )
      return false;
    if (
      (query.timing === 'upcoming' || query.selection === 'next') &&
      row.start &&
      (query.selection === 'next' ? row.start : row.end || row.start) < nowLocal
    )
      return false;
    return true;
  });
  const undated = filtered.filter((row) => !row.start).length;
  const dated = filtered
    .filter((row) => row.start)
    .sort((a, b) => a.start!.localeCompare(b.start!) || a.title.localeCompare(b.title));
  const chosen =
    query.selection === 'next'
      ? dated.filter((row) => row.start === dated[0]?.start)
      : [...dated, ...filtered.filter((row) => !row.start)];
  const labels =
    language === 'fr'
      ? {
          assessments: 'Évaluations',
          grades: 'Notes',
          tasks: 'Tâches',
          classes: 'Cours',
          events: 'Événements',
          study_sessions: 'Séances d’étude',
        }
      : {
          assessments: 'Assessments',
          grades: 'Grades',
          tasks: 'Tasks',
          classes: 'Classes',
          events: 'Events',
          study_sessions: 'Study sessions',
        };
  const typeLabels =
    language === 'fr'
      ? {
          ASSIGNMENT: 'Devoirs',
          LAB: 'Laboratoires',
          QUIZ: 'Quiz',
          MIDTERM: 'Examens de mi-session',
          FINAL_EXAM: 'Examens finaux',
          PROJECT: 'Projets',
          OTHER: 'Autres évaluations',
        }
      : {
          ASSIGNMENT: 'Assignments',
          LAB: 'Labs',
          QUIZ: 'Quizzes',
          MIDTERM: 'Midterms',
          FINAL_EXAM: 'Final exams',
          PROJECT: 'Projects',
          OTHER: 'Other assessments',
        };
  const selectionLabels = query.include
    .filter((kind) => !query.exclude.includes(kind))
    .flatMap((kind) =>
      kind === 'assessments' && query.assessmentTypes.length
        ? query.assessmentTypes.map((type) => typeLabels[type])
        : [labels[kind]],
    );
  const exclusions = [
    ...query.exclude.map((kind) => labels[kind]),
    ...query.excludeAssessmentTypes.map((type) => typeLabels[type]),
  ];
  const formatDay = (day: string) =>
    new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${day}T12:00:00Z`));
  const period =
    from && to
      ? `${formatDay(from)} – ${formatDay(to)}`
      : from
        ? `${s('From', 'À partir du')} ${formatDay(from)}`
        : to
          ? `${s('Through', 'Jusqu’au')} ${formatDay(to)}`
          : '';
  const summary = `${selectionLabels.join(' + ')}${exclusions.length ? ` · ${s('excluding', 'sans')} ${exclusions.join(', ')}` : ''}${period ? `\n${period}` : ''}`;
  const missing =
    undated && (query.selection === 'next' || query.timing === 'upcoming')
      ? s(
          ` ${undated} matching item(s) have no saved date, so I can’t place them in time yet.`,
          ` ${undated} élément(s) correspondant(s) n’ont pas encore de date enregistrée.`,
        )
      : '';
  const text = chosen.length
    ? s(
        `${query.selection === 'next' ? 'Here’s the next match' : `I found ${chosen.length} matching ${chosen.length === 1 ? 'item' : 'items'}`}${courseId ? ` for ${courses[0]?.code}` : ''}.\n${summary}${chosen.length > 12 ? '\nShowing the first 12.' : ''}${missing}`,
        `${query.selection === 'next' ? 'Voici le prochain résultat' : `J’ai trouvé ${chosen.length} résultat(s)`}${courseId ? ` pour ${courses[0]?.code}` : ''}.\n${summary}${chosen.length > 12 ? '\nVoici les 12 premiers.' : ''}${missing}`,
      )
    : s(
        `I couldn’t find a match for that request.\n${summary}.${missing}`,
        `Je n’ai trouvé aucun résultat pour cette demande.\n${summary}.${missing}`,
      );
  return {
    text,
    href: query.include.length === 1 && query.include[0] === 'grades' ? '/grades' : '/calendar',
    items: chosen.slice(0, 12).map((row) => ({
      title: row.title,
      detail:
        row.category === 'grades'
          ? `${row.score}/${row.maxScore} (${Math.round((row.score! / row.maxScore!) * 1000) / 10}%)${row.start ? ` · ${friendlyWhen(row.start, language, zone, now)}` : ''}`
          : `${row.completed ? `${s('Completed', 'Terminé')} · ` : ''}${row.start ? (row.end && row.end !== row.start ? friendlySession(row.start, row.end, language, zone, now) : friendlyWhen(row.start, language, zone, now)) : s('No date saved yet', 'Date non renseignée')}`,
      href: row.category === 'grades' ? '/grades' : row.href,
    })),
  };
}
