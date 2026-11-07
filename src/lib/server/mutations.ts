import { Prisma } from '@/generated/prisma/client';
import { db } from './db';
import { ApiError } from './errors';
import { requireWorkspaceId } from './auth';
import { gradingRuleError, readGradingRules, configuredCourseWeight } from '../grading-rules';
import {
  assessmentSchema,
  courseSchema,
  eventSchema,
  scheduleSchema,
  semesterSchema,
  settingsSchema,
  taskSchema,
} from './validation';

type Transaction = Prisma.TransactionClient;
const visibleEvent = {
  OR: [{ courseId: null }, { course: { deletedAt: null } }],
} satisfies Prisma.CalendarEventWhereInput;
const visibleTask = {
  AND: [
    { OR: [{ courseId: null }, { course: { deletedAt: null } }] },
    { OR: [{ assessmentId: null }, { assessment: { course: { deletedAt: null } } }] },
  ],
} satisfies Prisma.TaskWhereInput;

function exists<T>(record: T | null, name = 'Entry'): T {
  if (!record) throw new ApiError(404, `${name} no longer exists. Refresh and try again.`);
  return record;
}

async function requireCourse(tx: Transaction, id: string | null, workspaceId: string) {
  if (id)
    exists(
      await tx.course.findUnique({
        where: { id, semester: { workspaceId }, deletedAt: null },
        select: { id: true },
      }),
      'Course',
    );
}

/** Serializability prevents concurrent edits from over-allocating assessment weights. */
export async function transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: 'Serializable', timeout: 15_000 });
    } catch (error) {
      if (!(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < 2
      ))
        throw error;
    }
  }
}

export async function saveEntity(entity: string, body: Record<string, unknown>, id?: string) {
  const workspaceId = await requireWorkspaceId();
  return transaction(async (tx) => {
    switch (entity) {
      case 'semesters': {
        const current = id
          ? exists(await tx.semester.findUnique({ where: { id, workspaceId } }))
          : {};
        const data = semesterSchema.parse({ ...current, ...body });
        if (data.isActive)
          await tx.semester.updateMany({
            where: { workspaceId, isActive: true, ...(id ? { id: { not: id } } : {}) },
            data: { isActive: false },
          });
        return id
          ? tx.semester.update({ where: { id, workspaceId }, data })
          : tx.semester.create({ data: { ...data, workspaceId } });
      }
      case 'courses': {
        const current = id
          ? exists(
              await tx.course.findUnique({
                where: { id, semester: { workspaceId }, deletedAt: null },
              }),
            )
          : {};
        const data = courseSchema.parse({ ...current, ...body });
        const members = id ? await tx.assessment.findMany({ where: { courseId: id } }) : [];
        const ruleError = gradingRuleError(data.gradingRules, members);
        if (ruleError && data.gradingRules.length) throw new ApiError(400, ruleError);
        exists(
          await tx.semester.findUnique({ where: { id: data.semesterId, workspaceId } }),
          'Semester',
        );
        return id ? tx.course.update({ where: { id }, data }) : tx.course.create({ data });
      }
      case 'assessments': {
        const current = id
          ? exists(
              await tx.assessment.findUnique({
                where: { id, course: { semester: { workspaceId }, deletedAt: null } },
              }),
            )
          : null;
        const data = assessmentSchema.parse({ ...current, ...body });
        await requireCourse(tx, data.courseId, workspaceId);
        const destination = await tx.course.findUniqueOrThrow({ where: { id: data.courseId } });
        const rules = readGradingRules(destination.gradingRules);
        if (rules.some((r) => r.mode === 'equal' && r.assessmentType === data.type))
          data.weight = current?.weight ?? 0;
        if (current && current.courseId !== data.courseId) {
          const origin = await tx.course.findUniqueOrThrow({ where: { id: current.courseId } });
          if (
            readGradingRules(origin.gradingRules).some(
              (r) => r.mode !== 'equal' && r.assessmentIds.includes(current.id),
            )
          )
            throw new ApiError(
              400,
              'Remove this assessment from its grading rule before moving it to another course.',
            );
        }
        const siblings = await tx.assessment.findMany({
          where: { courseId: data.courseId, ...(id ? { id: { not: id } } : {}) },
        });
        const allocated = configuredCourseWeight(siblings, rules);
        const ruleError = gradingRuleError(rules, [
          ...siblings,
          { id: id || '__new__', weight: data.weight, type: data.type },
        ]);
        if (rules.length && ruleError) throw new ApiError(400, ruleError);
        if (
          configuredCourseWeight(
            [...siblings, { id: id || '__new__', weight: data.weight, type: data.type }],
            rules,
          ) >
          100 + 0.000001
        ) {
          throw new ApiError(
            400,
            `Assessment weights cannot exceed 100%. There is ${Math.max(0, 100 - allocated).toFixed(2)}% available in this course.`,
          );
        }
        if (current && current.courseId !== data.courseId)
          await tx.task.updateMany({
            where: { assessmentId: id, workspaceId },
            data: { courseId: data.courseId },
          });
        return id ? tx.assessment.update({ where: { id }, data }) : tx.assessment.create({ data });
      }
      case 'tasks': {
        const current = id
          ? exists(
              await tx.task.findUnique({
                where: { id, workspaceId, ...visibleTask },
                include: { subtasks: { orderBy: { position: 'asc' } } },
              }),
            )
          : null;
        const { subtasks, ...data } = taskSchema.parse({ ...current, ...body });
        if (data.assessmentId) {
          const assessment = exists(
            await tx.assessment.findUnique({
              where: {
                id: data.assessmentId,
                course: { semester: { workspaceId }, deletedAt: null },
              },
              select: { courseId: true },
            }),
            'Assessment',
          );
          if (data.courseId && data.courseId !== assessment.courseId)
            throw new ApiError(400, 'The assessment must belong to the selected course.');
          data.courseId = assessment.courseId;
        }
        await requireCourse(tx, data.courseId, workspaceId);
        const completedAt =
          data.status === 'COMPLETED' ? (current?.completedAt ?? new Date()) : null;
        const existingIds = new Set(current?.subtasks.map((s) => s.id) ?? []);
        const usedIds = new Set<string>();
        const children = subtasks.map((subtask, position) => {
          const preservedId =
            subtask.id && existingIds.has(subtask.id) && !usedIds.has(subtask.id)
              ? subtask.id
              : undefined;
          if (preservedId) usedIds.add(preservedId);
          return {
            ...(preservedId ? { id: preservedId } : {}),
            title: subtask.title,
            completed: subtask.completed,
            position,
          };
        });
        return id
          ? tx.task.update({
              where: { id },
              data: {
                ...data,
                completedAt,
                // Changing the generated title/date/link makes this a personal task.
                ...(current?.studyTask &&
                (data.title !== current.title ||
                  data.dueDate?.getTime() !== current.dueDate?.getTime() ||
                  data.assessmentId !== current.assessmentId ||
                  data.courseId !== current.courseId)
                  ? { studyTask: false }
                  : {}),
                ...(body.subtasks !== undefined
                  ? { subtasks: { deleteMany: {}, create: children } }
                  : {}),
              },
              include: { subtasks: { orderBy: { position: 'asc' } } },
            })
          : tx.task.create({
              data: { ...data, workspaceId, completedAt, subtasks: { create: children } },
              include: { subtasks: { orderBy: { position: 'asc' } } },
            });
      }
      case 'events': {
        const current = id
          ? exists(
              await tx.calendarEvent.findUnique({ where: { id, workspaceId, ...visibleEvent } }),
            )
          : {};
        const data = eventSchema.parse({ ...current, ...body });
        await requireCourse(tx, data.courseId, workspaceId);
        return id
          ? tx.calendarEvent.update({ where: { id }, data })
          : tx.calendarEvent.create({ data: { ...data, workspaceId } });
      }
      case 'schedules': {
        const current = id
          ? exists(
              await tx.scheduleEntry.findUnique({
                where: { id, course: { semester: { workspaceId }, deletedAt: null } },
              }),
            )
          : {};
        const data = scheduleSchema.parse({ ...current, ...body });
        await requireCourse(tx, data.courseId, workspaceId);
        return id
          ? tx.scheduleEntry.update({ where: { id }, data })
          : tx.scheduleEntry.create({ data });
      }
      case 'settings': {
        if (id !== 'preferences') throw new ApiError(404, 'Settings were not found.');
        const current = await tx.settings.findUnique({ where: { workspaceId } });
        const data = settingsSchema.parse({ ...current, ...body });
        const saved = await tx.settings.upsert({
          where: { workspaceId },
          create: {
            ...data,
            workspaceId,
            id: workspaceId === 'local' ? 'preferences' : `preferences:${workspaceId}`,
          },
          update: data,
        });
        return { ...saved, id: 'preferences' };
      }
      default:
        throw new ApiError(404, 'This type of entry does not exist.');
    }
  });
}

export async function deleteEntity(entity: string, id: string, permanent = false) {
  const workspaceId = await requireWorkspaceId();
  return transaction(async (tx) => {
    switch (entity) {
      case 'semesters': {
        const semester = exists(await tx.semester.findUnique({ where: { id, workspaceId } }));
        await tx.task.deleteMany({
          where: {
            workspaceId,
            OR: [{ course: { semesterId: id } }, { assessment: { course: { semesterId: id } } }],
          },
        });
        await tx.calendarEvent.deleteMany({ where: { workspaceId, course: { semesterId: id } } });
        await tx.course.deleteMany({ where: { semesterId: id, semester: { workspaceId } } });
        await tx.semester.delete({ where: { id, workspaceId } });
        if (semester.isActive) {
          const next = await tx.semester.findFirst({
            where: { workspaceId },
            orderBy: { startDate: 'desc' },
          });
          if (next)
            await tx.semester.update({
              where: { id: next.id, workspaceId },
              data: { isActive: true },
            });
        }
        break;
      }
      case 'courses': {
        const course = exists(
          await tx.course.findUnique({ where: { id, semester: { workspaceId } } }),
        );
        if (!permanent) {
          if (!course.deletedAt)
            await tx.course.update({ where: { id }, data: { deletedAt: new Date() } });
          break;
        }
        if (!course.deletedAt)
          throw new ApiError(
            409,
            'Move this course to Deleted courses before deleting it permanently.',
          );
        await tx.task.deleteMany({
          where: { workspaceId, OR: [{ courseId: id }, { assessment: { courseId: id } }] },
        });
        await tx.calendarEvent.deleteMany({ where: { workspaceId, courseId: id } });
        await tx.course.delete({ where: { id, semester: { workspaceId } } });
        break;
      }
      case 'assessments': {
        const member = exists(
          await tx.assessment.findUnique({
            where: { id, course: { semester: { workspaceId }, deletedAt: null } },
            include: { course: true },
          }),
        );
        if (
          readGradingRules(member.course.gradingRules).some(
            (r) => r.mode !== 'equal' && r.assessmentIds.includes(id),
          )
        )
          throw new ApiError(
            400,
            'Remove this assessment from its grading rule in the course Grades tab before deleting it.',
          );
        await tx.task.deleteMany({ where: { workspaceId, assessmentId: id, studyTask: true } });
        await tx.assessment.delete({
          where: { id, course: { semester: { workspaceId }, deletedAt: null } },
        });
        break;
      }
      case 'tasks':
        await tx.task.delete({ where: { id, workspaceId, ...visibleTask } });
        break;
      case 'events':
        await tx.calendarEvent.delete({ where: { id, workspaceId, ...visibleEvent } });
        break;
      case 'schedules':
        await tx.scheduleEntry.delete({
          where: { id, course: { semester: { workspaceId }, deletedAt: null } },
        });
        break;
      default:
        throw new ApiError(404, 'This type of entry cannot be deleted.');
    }
    return {};
  });
}

export async function restoreCourse(id: string) {
  const workspaceId = await requireWorkspaceId();
  return transaction(async (tx) => {
    exists(await tx.course.findUnique({ where: { id, semester: { workspaceId } } }));
    await tx.course.update({ where: { id }, data: { deletedAt: null } });
    return {};
  });
}
