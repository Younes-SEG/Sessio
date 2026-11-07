import type { Workspace } from '@/lib/types';
import { db } from './db';
import { requireWorkspaceId } from './auth';
import { isHosted } from './hosting';
import { ensureStudyTasks } from './study-tasks';
import { readGradingRules, withEqualWeights } from '../grading-rules';

/** Read one consistent snapshot; all view-specific calculations happen outside persistence. */
export async function getWorkspace(includeDeleted = false): Promise<Workspace> {
  const workspaceId = await requireWorkspaceId();
  // Each authenticated identity starts empty; never seed demo data or copy another workspace.
  await db.settings.upsert({
    where: { workspaceId },
    create: {
      id: workspaceId === 'local' ? 'preferences' : `preferences:${workspaceId}`,
      workspaceId,
    },
    update: {},
  });
  await db.$transaction((tx) => ensureStudyTasks(tx, workspaceId));
  const activeCourse = includeDeleted ? {} : { deletedAt: null };
  const visibleTask = includeDeleted
    ? {}
    : {
        AND: [
          { OR: [{ courseId: null }, { course: { deletedAt: null } }] },
          { OR: [{ assessmentId: null }, { assessment: { course: { deletedAt: null } } }] },
        ],
      };
  const [semesters, courses, assessments, tasks, events, schedules, settings, deletedCourses] =
    await db.$transaction(
      [
        db.semester.findMany({ where: { workspaceId }, orderBy: { startDate: 'desc' } }),
        db.course.findMany({
          where: { semester: { workspaceId }, ...activeCourse },
          orderBy: { code: 'asc' },
        }),
        db.assessment.findMany({
          where: { course: { semester: { workspaceId }, ...activeCourse } },
          orderBy: { dueDate: 'asc' },
        }),
        db.task.findMany({
          where: { workspaceId, ...visibleTask },
          include: { subtasks: { orderBy: { position: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        }),
        db.calendarEvent.findMany({
          where: {
            workspaceId,
            ...(includeDeleted
              ? {}
              : { OR: [{ courseId: null }, { course: { deletedAt: null } }] }),
          },
          orderBy: { startAt: 'asc' },
        }),
        db.scheduleEntry.findMany({
          where: { course: { semester: { workspaceId }, ...activeCourse } },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
        db.settings.findUniqueOrThrow({ where: { workspaceId } }),
        db.course.findMany({
          where: { semester: { workspaceId }, deletedAt: { not: null } },
          select: { id: true, code: true, name: true, semesterId: true, deletedAt: true },
          orderBy: { deletedAt: 'desc' },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );

  const effectiveAssessments = courses.flatMap((c) =>
    withEqualWeights(
      assessments.filter((a) => a.courseId === c.id),
      readGradingRules(c.gradingRules),
    ),
  );
  const weights = new Map(effectiveAssessments.map((a) => [a.id, a.weight]));
  return {
    deletedCourses: deletedCourses.map((course) => ({
      ...course,
      deletedAt: course.deletedAt!.toISOString(),
    })),
    hosted: isHosted(),
    semesters: semesters.map((s) => ({
      ...s,
      startDate: s.startDate.toISOString().slice(0, 10),
      endDate: s.endDate.toISOString().slice(0, 10),
    })),
    courses: courses.map((c) => ({
      ...c,
      deletedAt: c.deletedAt?.toISOString() ?? null,
      syllabusImportedAt: c.syllabusImportedAt?.toISOString() ?? null,
      // Older imports saved provenance in assessment notes, but no import date.
      syllabusImportDetected: assessments.some(
        (a) =>
          a.courseId === c.id &&
          a.notes.startsWith('Imported from syllabus. Verify against the course outline.'),
      ),
      gradingRules: readGradingRules(c.gradingRules),
    })),
    assessments: assessments.map((a) => ({
      ...a,
      weight: weights.get(a.id) ?? a.weight,
      dueDate: a.dueDate?.toISOString() ?? null,
    })),
    tasks: tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
      subtasks: t.subtasks.map(({ id, title, completed }) => ({ id, title, completed })),
    })),
    events: events.map((e) => ({
      ...e,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
    })),
    schedules,
    settings: {
      ...settings,
      id: 'preferences',
      timeFormat: settings.timeFormat as '12' | '24',
      weekStartsOn: settings.weekStartsOn as 0 | 1,
      studyBuddy: settings.studyBuddy as Workspace['settings']['studyBuddy'],
    },
  };
}
