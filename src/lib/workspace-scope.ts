import type { Workspace } from './types';

/** Personal entries remain visible; course-linked entries follow the selected semester. */
export function scopeWorkspace(
  workspace: Workspace,
  { semesterId = 'active', includeArchived = false } = {},
): Workspace {
  const selected =
    semesterId === 'active'
      ? workspace.semesters.find((semester) => semester.isActive)?.id
      : semesterId === 'all'
        ? undefined
        : semesterId;
  const courses = workspace.courses.filter(
    (course) =>
      (!selected || course.semesterId === selected) && (includeArchived || !course.archived),
  );
  const ids = new Set(courses.map((course) => course.id));
  const visible = (courseId: string | null) => courseId === null || ids.has(courseId);
  return {
    ...workspace,
    courses,
    assessments: workspace.assessments.filter((item) => ids.has(item.courseId)),
    schedules: workspace.schedules.filter((item) => ids.has(item.courseId)),
    tasks: workspace.tasks.filter((item) => visible(item.courseId)),
    events: workspace.events.filter((item) => visible(item.courseId)),
  };
}
