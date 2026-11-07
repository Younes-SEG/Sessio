import type { Prisma } from '@/generated/prisma/client';
import { STUDY_TYPES, STUDY_WINDOW_MS, studyTitle } from '@/lib/study-tasks';

/** The assessment claim and task insert commit together, including concurrent refreshes. */
export async function ensureStudyTasks(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  now = new Date(),
) {
  const assessments = await tx.assessment.findMany({
    where: {
      course: { archived: false, deletedAt: null, semester: { workspaceId, isActive: true } },
      type: { in: [...STUDY_TYPES] },
      status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      dueDate: { gte: now, lte: new Date(now.getTime() + STUDY_WINDOW_MS) },
    },
    include: { course: true },
    orderBy: { id: 'asc' },
  });
  for (const assessment of assessments) {
    const data = {
      title: studyTitle(assessment.course.code, assessment.name),
      dueDate: assessment.dueDate,
      courseId: assessment.courseId,
    };
    if (!assessment.studyTaskCreated) {
      const claim = await tx.assessment.updateMany({
        where: {
          id: assessment.id,
          studyTaskCreated: false,
          course: { semester: { workspaceId } },
        },
        data: { studyTaskCreated: true },
      });
      if (claim.count)
        await tx.task.create({
          data: { ...data, workspaceId, assessmentId: assessment.id, studyTask: true },
        });
    }
    // Follow revised exam names/dates, preserving completion, notes and subtasks.
    await tx.task.updateMany({
      where: {
        workspaceId,
        assessmentId: assessment.id,
        studyTask: true,
        OR: [
          { title: { not: data.title } },
          { dueDate: { not: data.dueDate } },
          { courseId: { not: data.courseId } },
        ],
      },
      data,
    });
  }
}
