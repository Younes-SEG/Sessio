import { describe, expect, it } from 'vitest';
import {
  assistantAgenda,
  assistantAgendaForIntent,
  friendlyWhen,
  friendlySession,
  nextAssessmentAnswer,
  assistantIntentSchema,
  localToInstant,
  matchingAssessment,
  matchingCourses,
  sessionConflicts,
  type AssistantWorkspace,
} from '../src/lib/assistant';

const data: AssistantWorkspace = {
  semesters: [
    {
      id: 'term',
      name: 'Fall 2026',
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      isActive: true,
    },
  ],
  courses: [
    {
      id: 'course',
      code: 'SEG3102',
      name: 'Design',
      semesterId: 'term',
      archived: false,
      notes: '',
      color: '#777777',
      instructor: null,
    },
  ],
  assessments: [
    {
      id: 'a1',
      courseId: 'course',
      name: 'Assignment 1 - Submission - Due',
      type: 'ASSIGNMENT',
      score: null,
      maxScore: 100,
      weight: 10,
      dueDate: '2026-11-06T04:59:00Z',
      status: 'NOT_STARTED',
      notes: '',
    },
  ],
  tasks: [],
  events: [],
  schedules: [
    {
      id: 'class',
      courseId: 'course',
      title: 'Lecture',
      dayOfWeek: 4,
      startTime: '14:30',
      endTime: '15:50',
      location: '',
    },
  ],
};
describe('assistant resolves actual records and device-local times', () => {
  it('separates study sessions from deadlines, classes, other events and study reminders', () => {
    const event = {
      id: 'study',
      title: 'Study session',
      description: '',
      startAt: '2026-11-05T23:00:00Z',
      endAt: '2026-11-06T00:00:00Z',
      allDay: false,
      courseId: 'course',
      location: '',
      color: '#777777',
    };
    const workspace = {
      ...data,
      events: [
        event,
        { ...event, id: 'french', title: 'Séance de révision' },
        { ...event, id: 'other', title: 'Career fair' },
      ],
    };
    const base = assistantIntentSchema.parse({
      kind: 'agenda',
      agendaScope: 'study_sessions',
      assessmentType: null,
      course: null,
      assessment: null,
      score: null,
      maxScore: null,
      startLocal: null,
      endLocal: null,
      fromDate: '2026-11-05',
      toDate: '2026-11-05',
      question: null,
    });
    const studies = assistantAgendaForIntent(workspace, base, 'America/Toronto');
    expect(studies.map((item) => item.title).sort()).toEqual(
      ['SEG3102 · Study session', 'SEG3102 · Séance de révision'].sort(),
    );
    expect(
      assistantAgendaForIntent(
        workspace,
        { ...base, agendaScope: 'classes' },
        'America/Toronto',
      ).map((item) => item.kind),
    ).toEqual(['class']);
    expect(
      assistantAgendaForIntent(workspace, { ...base, agendaScope: 'events' }, 'America/Toronto'),
    ).toHaveLength(3);
    expect(
      assistantAgendaForIntent(
        workspace,
        { ...base, agendaScope: 'assessments' },
        'America/Toronto',
      ).map((item) => item.kind),
    ).toEqual(['assessment']);
    expect(
      assistantAgendaForIntent(workspace, { ...base, agendaScope: 'tasks' }, 'America/Toronto'),
    ).toEqual([]);
    expect(assistantAgendaForIntent(workspace, base, 'America/Toronto', 'another-course')).toEqual(
      [],
    );
  });
  it('answers the next quiz beyond a week without including labs or study events', () => {
    const query = assistantIntentSchema.parse({
      kind: 'next_assessment',
      assessmentType: 'QUIZ',
      course: null,
      assessment: null,
      score: null,
      maxScore: null,
      startLocal: null,
      endLocal: null,
      fromDate: null,
      toDate: null,
      question: null,
    });
    const quizData = {
      ...data,
      assessments: [
        data.assessments[0],
        {
          ...data.assessments[0],
          id: 'q1',
          name: 'Quiz 1',
          type: 'QUIZ' as const,
          dueDate: '2026-11-20T22:30:00Z',
        },
        {
          ...data.assessments[0],
          id: 'q0',
          name: 'Old quiz',
          type: 'QUIZ' as const,
          dueDate: '2026-11-05T22:30:00Z',
        },
        {
          ...data.assessments[0],
          id: 'q2',
          name: 'Completed quiz',
          type: 'QUIZ' as const,
          dueDate: '2026-11-09T22:30:00Z',
          status: 'GRADED' as const,
          score: 100,
        },
      ],
    };
    const result = nextAssessmentAnswer(
      quizData,
      query,
      'America/Toronto',
      'en',
      new Date('2026-11-06T15:00:00Z'),
    );
    expect(result.text).toContain('next quiz');
    expect(result.items).toHaveLength(1);
    expect(result.items?.[0].title).toBe('SEG3102 · Quiz 1');
    expect(result.items?.[0].detail).toContain('Nov 20');
    expect(result.items?.[0].detail).toContain('5:30 PM');
    expect(
      nextAssessmentAnswer(
        { ...data, assessments: [{ ...quizData.assessments[1], dueDate: null }] },
        query,
        'America/Toronto',
        'en',
      ).text,
    ).toContain('without a date');
    expect(nextAssessmentAnswer(data, query, 'America/Toronto', 'en').items).toBeUndefined();
    expect(
      nextAssessmentAnswer(
        quizData,
        query,
        'America/Toronto',
        'en',
        new Date('2026-11-06T15:00:00Z'),
        'another-course',
      ).items,
    ).toBeUndefined();
  });
  it('formats friendly dates in English and French without exposing machine timestamps', () => {
    const now = new Date('2026-11-06T15:00:00Z');
    expect(friendlyWhen('2026-11-07T18:00', 'en', 'America/Toronto', now)).toBe(
      'Tomorrow at 6:00 PM',
    );
    expect(
      friendlySession('2026-11-07T18:00', '2026-11-07T19:00', 'en', 'America/Toronto', now),
    ).toBe('Tomorrow at 6:00 PM – 7:00 PM');
    expect(friendlyWhen('2026-11-07T18:00', 'fr', 'America/Toronto', now)).toMatch(/^Demain à 18/);
    expect(friendlyWhen('2027-01-07T18:00', 'en', 'America/Toronto', now)).toContain('2027');
  });
  it('matches A1 only in the selected course and refuses duplicates', () => {
    expect(matchingCourses(data, 'SEG 3102')).toHaveLength(1);
    expect(matchingAssessment(data, 'course', 'A1')?.id).toBe('a1');
    expect(matchingAssessment(data, 'course', 'A2')).toBeNull();
    const duplicate = {
      ...data,
      assessments: [...data.assessments, { ...data.assessments[0], id: 'copy' }],
    };
    expect(matchingAssessment(duplicate, 'course', 'A1')).toBeNull();
  });
  it('requires a term when a course repeats and supports that clarification', () => {
    const repeated = {
      ...data,
      semesters: [...data.semesters, { ...data.semesters[0], id: 'next', name: 'Fall 2027' }],
      courses: [...data.courses, { ...data.courses[0], id: 'copy', semesterId: 'next' }],
    };
    expect(matchingCourses(repeated, 'SEG3102')).toHaveLength(2);
    expect(matchingCourses(repeated, 'SEG3102 Fall 2026').map((c) => c.id)).toEqual(['course']);
  });
  it('converts winter/summer and fractional-offset zones without relying on server TZ', () => {
    expect(localToInstant('2026-11-05T18:00', 'America/Toronto')?.toISOString()).toBe(
      '2026-11-05T23:00:00.000Z',
    );
    expect(localToInstant('2026-07-05T18:00', 'America/Toronto')?.toISOString()).toBe(
      '2026-07-05T22:00:00.000Z',
    );
    expect(localToInstant('2026-11-05T18:00', 'Asia/Kathmandu')?.toISOString()).toBe(
      '2026-11-05T12:15:00.000Z',
    );
  });
  it('rejects nonexistent dates and missing/repeated DST times', () => {
    expect(localToInstant('2026-02-30T18:00', 'America/Toronto')).toBeNull();
    expect(localToInstant('2026-03-08T02:30', 'America/Toronto')).toBeNull();
    expect(localToInstant('2026-11-01T01:30', 'America/Toronto')).toBeNull();
  });
  it('includes local deadlines and recurring classes but excludes completed work and old-term classes', () => {
    const agenda = assistantAgenda(data, '2026-11-05', '2026-11-05', 'America/Toronto');
    expect(agenda.map((i) => [i.kind, i.start])).toEqual([
      ['class', '2026-11-05T14:30'],
      ['assessment', '2026-11-05T23:59'],
    ]);
    expect(
      assistantAgenda(
        { ...data, assessments: [{ ...data.assessments[0], status: 'SUBMITTED' }] },
        '2026-11-05',
        '2026-11-05',
        'America/Toronto',
      ),
    ).toHaveLength(1);
    expect(assistantAgenda(data, '2027-01-07', '2027-01-07', 'America/Toronto')).toHaveLength(0);
    expect(() => assistantAgenda(data, '2026-11-01', '2027-12-01', 'America/Toronto')).toThrow();
  });
  it('finds overlapping classes but allows adjacent study sessions', () => {
    expect(
      sessionConflicts(data, '2026-11-05T15:00', '2026-11-05T16:00', 'America/Toronto'),
    ).toHaveLength(1);
    expect(
      sessionConflicts(data, '2026-11-05T15:50', '2026-11-05T16:50', 'America/Toronto'),
    ).toHaveLength(0);
  });
});
