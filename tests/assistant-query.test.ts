import { expect, it } from 'vitest';
import { answerAssistantQuery } from '../src/lib/assistant-query';
import {
  assistantIntentSchema,
  type AssistantQuery,
  type AssistantWorkspace,
} from '../src/lib/assistant';
const now = new Date('2026-11-06T15:00:00Z');
const assessment = {
  id: 'a',
  courseId: 'c',
  name: 'Assignment 1',
  type: 'ASSIGNMENT' as const,
  dueDate: '2026-11-08T20:00:00Z',
  weight: 10,
  score: null,
  maxScore: 10,
  status: 'NOT_STARTED' as const,
  notes: '',
};
const event = {
  id: 's',
  courseId: 'c',
  title: 'Study session',
  description: '',
  startAt: '2026-11-07T23:00:00Z',
  endAt: '2026-11-08T00:00:00Z',
  allDay: false,
  location: '',
  color: '#999999',
};
const data: AssistantWorkspace = {
  semesters: [
    { id: 'term', name: 'Fall', startDate: '2026-09-01', endDate: '2026-12-31', isActive: true },
  ],
  courses: [
    {
      id: 'c',
      semesterId: 'term',
      code: 'SEG3102',
      name: 'Design',
      archived: false,
      color: '#999999',
      notes: '',
      instructor: null,
    },
  ],
  assessments: [
    assessment,
    { ...assessment, id: 'lab', type: 'LAB', name: 'Lab 1' },
    { ...assessment, id: 'mt', type: 'MIDTERM', name: 'Midterm', dueDate: '2026-11-20T20:00:00Z' },
    {
      ...assessment,
      id: 'final',
      type: 'FINAL_EXAM',
      name: 'Final exam',
      dueDate: '2026-12-12T20:00:00Z',
    },
    { ...assessment, id: 'late', name: 'Late assignment', dueDate: '2026-11-01T20:00:00Z' },
    { ...assessment, id: 'done', name: 'Graded assignment', score: 0, status: 'GRADED' },
    { ...assessment, id: 'unknown', name: 'Unknown quiz', type: 'QUIZ', dueDate: null },
  ],
  events: [event, { ...event, id: 'meeting', title: 'Project meeting' }],
  tasks: [],
  schedules: [
    {
      id: 'lecture',
      courseId: 'c',
      title: 'Lecture',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:00',
      location: '',
    },
  ],
};
const query = (values: Partial<AssistantQuery> = {}) => ({
  include: ['assessments'],
  exclude: [],
  assessmentTypes: [],
  excludeAssessmentTypes: [],
  completion: 'open',
  timing: 'any',
  selection: 'all',
  text: null,
  ...values,
});
function answer(values: Partial<AssistantQuery>, extra = {}) {
  return answerAssistantQuery(
    data,
    assistantIntentSchema.parse({
      kind: 'query',
      query: query(values),
      course: null,
      assessment: null,
      score: null,
      maxScore: null,
      startLocal: null,
      endLocal: null,
      fromDate: null,
      toDate: null,
      question: null,
      ...extra,
    }),
    'America/Toronto',
    'en',
    now,
  );
}
it('combines exams and study sessions, with no unrelated labs or assignments', () => {
  expect(
    answer({
      include: ['assessments', 'study_sessions'],
      assessmentTypes: ['MIDTERM', 'FINAL_EXAM'],
      timing: 'upcoming',
    }).items?.map((i) => i.title),
  ).toEqual(['SEG3102 · Study session', 'SEG3102 · Midterm', 'SEG3102 · Final exam']);
});
it('applies exclusions to general queries and does not duplicate study events', () => {
  const result = answer({
    include: ['events', 'study_sessions', 'assessments'],
    exclude: ['study_sessions'],
    excludeAssessmentTypes: ['LAB'],
    timing: 'upcoming',
  });
  expect(result.items?.some((i) => /Lab 1|Study session/.test(i.title))).toBe(false);
  expect(result.items?.some((i) => i.title.includes('Project meeting'))).toBe(true);
  expect(answer({ include: ['events', 'study_sessions'] }).items).toHaveLength(2);
});
it('separates overdue work, finished work and recorded grades including zero', () => {
  expect(answer({ timing: 'overdue' }).items?.map((i) => i.title)).toEqual([
    'SEG3102 · Late assignment',
  ]);
  expect(answer({ completion: 'completed' }).items?.map((i) => i.title)).toEqual([
    'SEG3102 · Graded assignment',
  ]);
  expect(answer({ include: ['grades'], completion: 'all' }).items?.[0].detail).toContain(
    '0/10 (0%)',
  );
  expect(
    answer({ completion: 'all', exclude: ['grades'] }).items?.some((i) =>
      i.title.includes('Graded assignment'),
    ),
  ).toBe(false);
});
it('finds the next class or exam beyond a default weekly window and reports unknown dates', () => {
  expect(
    answer({ include: ['classes'], selection: 'next', timing: 'upcoming' }).items?.[0].detail,
  ).toContain('Nov 9');
  expect(
    answer({ assessmentTypes: ['MIDTERM'], selection: 'next', timing: 'upcoming' }).items?.[0]
      .title,
  ).toContain('Midterm');
  const missing = answer({ assessmentTypes: ['QUIZ'], selection: 'next', timing: 'upcoming' });
  expect(missing.items).toEqual([]);
  expect(missing.text).toContain('no saved date');
});
it('applies exact assessment names and requested periods instead of silently broadening', () => {
  expect(
    answer({ include: ['grades'], completion: 'all' }, { assessment: 'Graded assignment' }).items,
  ).toHaveLength(1);
  expect(
    answer({ include: ['grades'], completion: 'all' }, { assessment: 'Missing assignment' }).items,
  ).toEqual([]);
  expect(
    answer(
      {
        include: ['assessments', 'study_sessions'],
        assessmentTypes: ['MIDTERM', 'FINAL_EXAM'],
        timing: 'range',
      },
      { fromDate: '2026-11-06', toDate: '2026-11-08' },
    ).items?.map((i) => i.title),
  ).toEqual(['SEG3102 · Study session']);
  expect(() => answer({ timing: 'range' })).toThrow();
});
