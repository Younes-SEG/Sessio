import { expect, it } from 'vitest';
import {
  needsStudy,
  studyFocusTasks,
  STUDY_WINDOW_MS,
  displayTaskTitle,
} from '../src/lib/study-tasks';
import { assessment, task } from './fixtures';
const now = new Date('2026-10-15T16:00:00Z');
const quiz = assessment({
  id: 'quiz',
  type: 'QUIZ',
  dueDate: new Date(now.getTime() + STUDY_WINDOW_MS).toISOString(),
});
it('includes exactly ten days and the exam instant, excluding missing, past, completed and non-exam assessments', () => {
  expect(needsStudy(quiz, now)).toBe(true);
  expect(
    needsStudy(
      { ...quiz, dueDate: new Date(now.getTime() + STUDY_WINDOW_MS + 1).toISOString() },
      now,
    ),
  ).toBe(false);
  expect(needsStudy({ ...quiz, dueDate: now.toISOString() }, now)).toBe(true);
  expect(needsStudy({ ...quiz, dueDate: new Date(now.getTime() - 1).toISOString() }, now)).toBe(
    false,
  );
  for (const type of ['MIDTERM', 'FINAL_EXAM'] as const)
    expect(needsStudy({ ...quiz, type }, now)).toBe(true);
  for (const type of ['ASSIGNMENT', 'LAB', 'PROJECT', 'OTHER'] as const)
    expect(needsStudy({ ...quiz, type }, now)).toBe(false);
  for (const status of ['SUBMITTED', 'GRADED'] as const)
    expect(needsStudy({ ...quiz, status }, now)).toBe(false);
  expect(needsStudy({ ...quiz, dueDate: null }, now)).toBe(false);
});
it('keeps completed, removed, rescheduled and unrelated tasks out of Study ahead', () => {
  const study = task({ id: 'study', studyTask: true, assessmentId: 'quiz' });
  expect(
    studyFocusTasks([study, { ...study, id: 'done', status: 'COMPLETED' }, task()], [quiz], now),
  ).toEqual([study]);
  expect(studyFocusTasks([study], [], now)).toEqual([]);
  expect(studyFocusTasks([study], [quiz], new Date(now.getTime() - 1))).toEqual([]);
});
it('translates the generated study prefix without translating the course or assessment name', () => {
  expect(
    displayTaskTitle(task({ studyTask: true, title: 'Study for GNG1505 — Quiz 2' }), 'fr-CA'),
  ).toBe('Étudier pour GNG1505 — Quiz 2');
});
