import type { Assessment, Prisma } from '@/generated/prisma/client';
import { brightspaceEventIdentity } from '@/lib/calendar-identity';
import { readGradingRules } from '@/lib/grading-rules';

type Tx = Prisma.TransactionClient;
const progress = { NOT_STARTED: 0, IN_PROGRESS: 1, SUBMITTED: 2, GRADED: 3 };

/** Only merge proven source identities; conflicting grades/weights need manual review. */
export async function reconcileCalendarAssessments(tx: Tx, workspaceId: string) {
  const rows = await tx.assessment.findMany({
    where: { course: { semester: { workspaceId } } },
    include: { calendarImport: { select: { sourceKey: true } } },
  });
  const groups = new Map<string, Assessment[]>();
  for (const row of rows) {
    // Recurrences share a provider event link but represent separate deadlines.
    if (row.calendarImport.some((item) => item.sourceKey.includes('::'))) continue;
    const identity = brightspaceEventIdentity(row.notes);
    if (!identity) continue;
    const key = `${row.courseId}:${identity}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  let merged = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const course = await tx.course.findUniqueOrThrow({ where: { id: group[0].courseId } });
    const protectedIds = new Set(
      readGradingRules(course.gradingRules)
        .filter((r) => r.mode !== 'equal')
        .flatMap((r) => r.assessmentIds),
    );
    // Preserve confirmed group membership when reconciling language duplicates.
    if (group.filter((a) => protectedIds.has(a.id)).length > 1) continue;
    const scores = new Set(
      group.filter((a) => a.score !== null).map((a) => `${a.score}/${a.maxScore}`),
    );
    const weights = new Set(group.filter((a) => a.weight !== 0).map((a) => a.weight));
    if (scores.size > 1 || weights.size > 1) continue;
    group.sort(
      (a, b) =>
        Number(protectedIds.has(b.id)) - Number(protectedIds.has(a.id)) ||
        progress[b.status] - progress[a.status] ||
        a.id.localeCompare(b.id),
    );
    const [keep, ...duplicates] = group;
    const ids = duplicates.map((a) => a.id);
    const graded = group.find((a) => a.score !== null);
    await tx.assessment.update({
      where: { id: keep.id },
      data: {
        score: graded?.score ?? null,
        maxScore: graded?.maxScore ?? keep.maxScore,
        weight: group.find((a) => a.weight !== 0)?.weight ?? 0,
        notes: [...new Set(group.map((a) => a.notes).filter(Boolean))].join('\n\n'),
        calendarTaskCreated: group.some((a) => a.calendarTaskCreated),
      },
    });
    // Keep all user tasks/subtasks and associate every subscription with the survivor.
    await tx.task.updateMany({
      where: { workspaceId, assessmentId: { in: ids } },
      data: { assessmentId: keep.id },
    });
    await tx.importedCalendarItem.updateMany({
      where: { subscription: { workspaceId }, assessmentId: { in: ids } },
      data: { assessmentId: keep.id },
    });
    await tx.assessment.deleteMany({
      where: { id: { in: ids }, course: { semester: { workspaceId } } },
    });
    merged += ids.length;
  }
  return merged;
}

/** Retire only unchanged legacy task mirrors; user edits become independent planning tasks. */
export async function retireCalendarTasks(tx: Tx, workspaceId: string) {
  const tasks = await tx.task.findMany({
    where: { workspaceId, calendarManaged: true },
    include: {
      assessment: { include: { course: { include: { semester: true } } } },
      subtasks: true,
    },
  });
  let removed = 0;
  let preserved = 0;
  for (const task of tasks) {
    const assessment = task.assessment;
    const expectedStatus =
      assessment &&
      (['SUBMITTED', 'GRADED'].includes(assessment.status)
        ? 'COMPLETED'
        : assessment.status === 'IN_PROGRESS'
          ? 'IN_PROGRESS'
          : 'NOT_STARTED');
    const unchanged =
      assessment &&
      assessment.course.semester.workspaceId === workspaceId &&
      task.courseId === assessment.courseId &&
      task.title === assessment.name &&
      task.description === assessment.notes &&
      task.dueDate?.getTime() === assessment.dueDate?.getTime() &&
      task.status === expectedStatus &&
      task.priority === 'MEDIUM' &&
      task.estimatedMinutes === null &&
      task.subtasks.length === 0;
    if (unchanged) {
      await tx.task.delete({ where: { id: task.id, workspaceId } });
      removed++;
    } else {
      await tx.task.update({
        where: { id: task.id, workspaceId },
        data: { calendarManaged: false },
      });
      preserved++;
    }
  }
  return { removed, preserved };
}

export async function updateCalendarAssessment(
  tx: Tx,
  id: string,
  name: string,
  dueDate: Date | null,
  workspaceId: string,
) {
  await tx.assessment.update({
    where: { id, course: { semester: { workspaceId } } },
    data: { name, dueDate },
  });
}
