import type { Assessment, Task } from './types';

export const STUDY_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;
export const STUDY_TYPES = ['QUIZ', 'MIDTERM', 'FINAL_EXAM'] as const;

/** A rolling ten-day window includes the assessment time, but never past exams. */
export function needsStudy(assessment: Pick<Assessment, 'type' | 'status' | 'dueDate'>, now: Date) {
  if (
    !assessment.dueDate ||
    !STUDY_TYPES.some((type) => type === assessment.type) ||
    ['SUBMITTED', 'GRADED'].includes(assessment.status)
  )
    return false;
  const remaining = new Date(assessment.dueDate).getTime() - now.getTime();
  return remaining >= 0 && remaining <= STUDY_WINDOW_MS;
}

export function studyFocusTasks(tasks: Task[], assessments: Assessment[], now: Date) {
  const eligible = new Set(assessments.filter((a) => needsStudy(a, now)).map((a) => a.id));
  return tasks.filter(
    (task) =>
      task.studyTask &&
      task.status !== 'COMPLETED' &&
      task.assessmentId &&
      eligible.has(task.assessmentId),
  );
}

export function studyTitle(code: string, name: string) {
  return `Study for ${code} — ${name}`;
}

export function displayTaskTitle(task: Task, locale: string) {
  return task.studyTask && locale.startsWith('fr')
    ? task.title.replace(/^Study for /, 'Étudier pour ')
    : task.title;
}
