import { describe, expect, it } from 'vitest';
import { scopeWorkspace } from '../src/lib/workspace-scope';
import { getCalendarOccurrences } from '../src/lib/calendar';
import { assessment, task, workspace } from './fixtures';

function mixedWorkspace() {
  const data = workspace();
  data.semesters.push({ ...data.semesters[0], id: 'old-term', isActive: false });
  data.courses.push(
    { ...data.courses[0], id: 'old-course', semesterId: 'old-term' },
    { ...data.courses[0], id: 'archived-course', archived: true },
  );
  data.tasks = [null, 'course-1', 'old-course', 'archived-course', 'missing-course'].map(
    (courseId, i) => task({ id: `task-${i}`, courseId, dueDate: '2026-01-12T12:00:00Z' }),
  );
  data.assessments = data.courses.map((course) =>
    assessment({
      id: course.id,
      courseId: course.id,
      dueDate: '2026-01-12T12:00:00Z',
    }),
  );
  data.events = data.tasks.map((item) => ({
    id: item.id,
    title: 'Event',
    description: '',
    startAt: item.dueDate!,
    endAt: '2026-01-12T13:00:00Z',
    allDay: false,
    location: '',
    courseId: item.courseId,
    color: '#6950c4',
  }));
  data.schedules = data.courses.map((course) => ({
    id: course.id,
    courseId: course.id,
    title: 'Class',
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '11:00',
    location: '',
  }));
  return data;
}

describe('consistent semester views', () => {
  it('uses active semester IDs even when two terms and course codes have identical names', () => {
    const original = mixedWorkspace();
    const data = scopeWorkspace(original);
    expect(data.courses.map((c) => c.id)).toEqual(['course-1']);
    expect(data.tasks.map((t) => t.courseId)).toEqual([null, 'course-1']);
    expect(data.events.map((e) => e.courseId)).toEqual([null, 'course-1']);
    expect(data.assessments.map((a) => a.courseId)).toEqual(['course-1']);
    expect(data.schedules.map((s) => s.courseId)).toEqual(['course-1']);
    const calendar = getCalendarOccurrences(data, new Date('2026-01-12'), new Date('2026-01-13'));
    expect(calendar.some((item) => item.kind === 'schedules')).toBe(true);
    expect(calendar.every((item) => item.courseId === null || item.courseId === 'course-1')).toBe(
      true,
    );
    expect(original.courses).toHaveLength(3);
  });

  it('keeps history accessible explicitly and never treats missing course IDs as personal', () => {
    const original = mixedWorkspace();
    expect(scopeWorkspace(original, { semesterId: 'old-term' }).courses.map((c) => c.id)).toEqual([
      'old-course',
    ]);
    expect(scopeWorkspace(original, { semesterId: 'all' }).courses).toHaveLength(2);
    const all = scopeWorkspace(original, { semesterId: 'all', includeArchived: true });
    expect(all.courses).toHaveLength(3);
    expect(all.tasks).toHaveLength(4);
    const calendar = getCalendarOccurrences(
      original,
      new Date('2026-01-12'),
      new Date('2026-01-13'),
      { includeArchived: true },
    );
    expect(calendar.some((item) => item.courseId === 'missing-course')).toBe(false);
  });

  it('supports no active semester and immediately reflects archives and removals', () => {
    const original = mixedWorkspace();
    original.semesters.forEach((s) => {
      s.isActive = false;
    });
    expect(scopeWorkspace(original).courses).toHaveLength(2);
    original.semesters[0].isActive = true;
    original.courses[0].archived = true;
    expect(scopeWorkspace(original).tasks.map((t) => t.courseId)).toEqual([null]);
    original.courses = [];
    expect(scopeWorkspace(original).assessments).toEqual([]);
    expect(scopeWorkspace(original).events.map((e) => e.courseId)).toEqual([null]);
  });
});
