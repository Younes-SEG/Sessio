import { describe, expect, it } from 'vitest';
import { gradeStatusAnswer } from '../src/lib/assistant-grades';
import {
  assistantIntentSchema,
  type AssistantIntent,
  type AssistantWorkspace,
} from '../src/lib/assistant';
import { letterFor, minimumFor } from '../src/lib/grade-scale';
import { schoolById, type SchoolProfile } from '../src/lib/schools';

type Assessment = AssistantWorkspace['assessments'][number];
const assessment = (values: Partial<Assessment> & Pick<Assessment, 'id' | 'name' | 'weight'>) =>
  ({
    courseId: 'seg',
    type: 'ASSIGNMENT',
    score: null,
    maxScore: 100,
    dueDate: null,
    status: 'NOT_STARTED',
    notes: '',
    ...values,
  }) as Assessment;
const course = (id: string, code: string, semesterId = 'term') =>
  ({
    id,
    code,
    name: `${code} course`,
    semesterId,
    archived: false,
    notes: '',
    color: '#777777',
    instructor: null,
  }) as AssistantWorkspace['courses'][number];

// SEG3102: A1 20% at 80%, Midterm 30% at 60% -> 34 of 50 graded points (68%); Final 50% left.
const base: AssistantWorkspace = {
  settings: { schoolId: 'university-of-ottawa' },
  semesters: [
    {
      id: 'term',
      name: 'Fall 2026',
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      isActive: true,
    },
    {
      id: 'old',
      name: 'Winter 2026',
      startDate: '2026-01-01',
      endDate: '2026-04-30',
      isActive: false,
    },
  ] as AssistantWorkspace['semesters'],
  courses: [
    course('seg', 'SEG3102'),
    course('csi', 'CSI2110'),
    course('mat', 'MAT1341'),
    course('his', 'HIS1101', 'old'),
  ],
  assessments: [
    assessment({ id: 'a1', name: 'Assignment 1', weight: 20, score: 80, status: 'GRADED' }),
    assessment({
      id: 'mid',
      name: 'Midterm',
      type: 'MIDTERM',
      weight: 30,
      score: 60,
      status: 'GRADED',
    }),
    assessment({ id: 'final', name: 'Final Exam', type: 'FINAL_EXAM', weight: 50 }),
    assessment({
      id: 'c1',
      courseId: 'csi',
      name: 'Quiz 1',
      weight: 100,
      score: 90,
      status: 'GRADED',
    }),
    assessment({ id: 'm1', courseId: 'mat', name: 'Quiz 1', weight: 10 }),
    assessment({
      id: 'h1',
      courseId: 'his',
      name: 'Essay',
      weight: 100,
      score: 10,
      status: 'GRADED',
    }),
  ],
  tasks: [],
  events: [],
  schedules: [],
};
const seg = base.courses[0];
const uOttawa = schoolById('university-of-ottawa')!;
const syntheticProfile = (overrides: Partial<SchoolProfile>): SchoolProfile => ({
  ...uOttawa,
  id: 'synthetic-school',
  name: 'Synthetic School',
  ...overrides,
});
const intent = (values: Partial<AssistantIntent>): AssistantIntent => ({
  kind: 'grade_status',
  course: null,
  assessment: null,
  score: null,
  maxScore: null,
  startLocal: null,
  endLocal: null,
  fromDate: null,
  toDate: null,
  question: null,
  ...values,
});

describe('uOttawa letter scale', () => {
  it('rounds the final course grade half up as Academic Regulation A-3.2 requires', () => {
    expect(minimumFor('B', uOttawa)).toEqual({ letter: 'B', min: 69.5, published: 70 });
    expect(minimumFor('A+', uOttawa)?.min).toBe(89.5);
    expect(letterFor(69.4, uOttawa)).toBe('C+');
    expect(letterFor(69.5, uOttawa)).toBe('B');
    expect(letterFor(84.99, uOttawa)).toBe('A');
    expect(letterFor(39, uOttawa)).toBe('F');
  });
  it('rounds to the nearest whole percent before assigning a letter when configured', () => {
    const profile = syntheticProfile({ roundPercentBeforeLetter: true });
    expect(letterFor(79.49, profile)).toBe('B+');
    expect(letterFor(79.5, profile)).toBe('A-');
    expect(minimumFor('A-', profile)?.min).toBe(79.5);
    // 49.5 rounds to 50, which passes.
    expect(minimumFor('D', profile)?.min).toBe(49.5);
  });
  it('uses a custom failure label below the exact school pass mark', () => {
    const profile = syntheticProfile({
      passPercent: 60,
      failLabel: 'EC',
      roundPercentBeforeLetter: false,
    });
    expect(letterFor(59.9, profile)).toBe('EC');
    expect(letterFor(60, profile)).toBe('C');
  });
  it('keeps model letter targets bounded for server-side profile validation', () => {
    expect(assistantIntentSchema.parse(intent({ targetLetter: 'B+' })).targetLetter).toBe('B+');
    expect(assistantIntentSchema.parse(intent({ targetLetter: 'Z' })).targetLetter).toBe('Z');
    expect(() => assistantIntentSchema.parse(intent({ targetLetter: 'x'.repeat(21) }))).toThrow();
    expect(() => assistantIntentSchema.parse(intent({ targetPercent: 120 }))).toThrow();
    expect(assistantIntentSchema.parse(intent({ targetPass: true })).targetPass).toBe(true);
  });
});

describe('grade answers are calculated by the app, never the model', () => {
  it('averages current-semester courses equally and skips courses without grades', () => {
    const answer = gradeStatusAnswer(base, intent({}), 'en');
    // (68 + 90) / 2 = 79 -> B+; the inactive Winter course (10%) is excluded.
    expect(answer.text).toContain('79%');
    expect(answer.text).toContain('(B+)');
    expect(answer.text).toContain('equal-weight');
    expect(answer.text).toContain('missing its units');
    expect(answer.text).toContain('2 courses');
    expect(answer.items?.map((i) => i.title.split(' ·')[0])).toEqual([
      'SEG3102',
      'CSI2110',
      'MAT1341',
    ]);
    expect(answer.items?.[2].detail).toBe('No grades yet');
  });

  it('uses course weights for the school average and GPA when every graded course has them', () => {
    const data: AssistantWorkspace = {
      ...base,
      courses: base.courses.map((item) =>
        item.id === 'seg'
          ? { ...item, credits: 3 }
          : item.id === 'csi'
            ? { ...item, credits: 6 }
            : item,
      ),
    };
    const answer = gradeStatusAnswer(data, intent({}), 'en');
    // Percentage: (68*3 + 90*6)/9 = 82.7. GPA: (5*3 + 10*6)/9 = 8.3.
    expect(answer.text).toContain('units-weighted semester average is 82.7% (A-)');
    expect(answer.text).toContain('estimated CGPA of 8.3/10');
    expect(answer.text).toContain('based only on work graded so far');
  });

  it('uses normative instructional hours as the school-defined GPA weight', () => {
    const profile = syntheticProfile({
      credits: { unitLabel: 'hours', unitLabelFr: 'heures', defaultPerCourse: 45 },
    });
    const data: AssistantWorkspace = {
      ...base,
      courses: base.courses.map((item) =>
        item.id === 'seg'
          ? { ...item, credits: 45 }
          : item.id === 'csi'
            ? { ...item, credits: 90 }
            : item,
      ),
    };
    const answer = gradeStatusAnswer(data, intent({}), 'en', undefined, profile);
    expect(answer.text).toContain('hours-weighted semester average is 82.7% (A-)');
    expect(answer.text).toContain('estimated CGPA of 8.3/10');
    expect(answer.text).toContain('135 total hours');
  });

  it('applies an average floor only in the multi-course overview and GPA', () => {
    const profile = syntheticProfile({ averageFloor: 40, roundPercentBeforeLetter: false });
    const data: AssistantWorkspace = {
      ...base,
      courses: base.courses.map((item) =>
        item.id === 'seg'
          ? { ...item, credits: 3 }
          : item.id === 'csi'
            ? { ...item, credits: 6 }
            : item,
      ),
      assessments: [
        assessment({
          id: 'low',
          courseId: 'seg',
          name: 'Course total',
          weight: 100,
          score: 10,
          status: 'GRADED',
        }),
        assessment({
          id: 'high',
          courseId: 'csi',
          name: 'Course total',
          weight: 100,
          score: 90,
          status: 'GRADED',
        }),
      ],
    };
    const overview = gradeStatusAnswer(data, intent({}), 'en', undefined, profile);
    // The overview uses 40 instead of 10: (40*3 + 90*6)/9 = 73.3;
    // GPA = (1*3 + 10*6)/9 = 7.0. The course itself remains 10% (F).
    expect(overview.text).toContain('73.3% (B)');
    expect(overview.text).toContain('estimated CGPA of 7/10');
    expect(overview.text).toContain('For this overview only');
    expect(overview.items?.[0].detail).toContain('10% (F)');
    const standing = gradeStatusAnswer(
      data,
      intent({ course: 'SEG3102' }),
      'en',
      data.courses[0],
      profile,
    );
    expect(standing.text).toContain('10% (F)');
    expect(standing.text).not.toContain('40%');
  });

  it('uses percentages only and asks for a percentage target without a school scale', () => {
    const data: AssistantWorkspace = { ...base, settings: { schoolId: null } };
    const overview = gradeStatusAnswer(data, intent({}), 'en');
    expect(overview.text).toContain('79%');
    expect(overview.text).not.toContain('(B+)');
    expect(overview.text).toContain('no school profile is selected');

    const standing = gradeStatusAnswer(data, intent({ course: 'SEG3102' }), 'en', seg);
    expect(standing.text).toContain('68%');
    expect(standing.text).not.toContain('(C+)');
    const target = gradeStatusAnswer(data, intent({ targetLetter: 'B' }), 'en', seg);
    expect(target.text).toContain('What final percentage');
    expect(target.text).not.toContain('average of 71%');
  });

  it('asks for a percentage when a letter is absent from the selected school profile', () => {
    const answer = gradeStatusAnswer(base, intent({ targetLetter: 'Z' }), 'en', seg);
    expect(answer.text).toContain('not defined as a target');
    expect(answer.text).toContain('What final percentage');
  });

  it('reports one course’s current standing', () => {
    const answer = gradeStatusAnswer(base, intent({ course: 'SEG3102' }), 'en', seg);
    expect(answer.text).toContain('68% (C+)');
    expect(answer.text).toContain('50% of the course graded');
    expect(answer.text).toContain('34 of 100 course points');
  });

  it('works out the average needed on remaining work for a letter', () => {
    // uOttawa rounds half up, so a B needs 69.5: (69.5 - 34) / 50 = 71%
    const answer = gradeStatusAnswer(base, intent({ targetLetter: 'B' }), 'en', seg);
    expect(answer.text).toContain('B (70%)');
    expect(answer.text).toContain('average of 71%');
  });

  it('uses the selected school pass threshold without asking the model to infer a letter', () => {
    const answer = gradeStatusAnswer(base, intent({ targetPass: true }), 'en', seg);
    expect(answer.text).toContain('a pass (50%)');
    expect(answer.text).toContain('average of 31%');
  });

  it('uses a 60% school pass mark for pass targets', () => {
    const profile = syntheticProfile({
      passPercent: 60,
      failLabel: 'EC',
      roundPercentBeforeLetter: false,
    });
    const answer = gradeStatusAnswer(base, intent({ targetPass: true }), 'en', seg, profile);
    expect(answer.text).toContain('a pass (60%)');
    expect(answer.text).toContain('average of 52%');
  });

  it('lists pass-rule variants without guessing which program applies', () => {
    const conestoga = schoolById('conestoga-college')!;
    const answer = gradeStatusAnswer(base, intent({ targetPass: true }), 'en', seg, conestoga);
    expect(answer.text).toContain('a pass (55%)');
    expect(answer.text).toContain('The default pass mark is 55%');
    expect(answer.text).toContain('Health sciences: 65%');
    expect(answer.text).toContain('Gas technician: 75%');
    expect(answer.text).toContain('Sessio does not guess');

    const french = gradeStatusAnswer(base, intent({ targetPass: true }), 'fr', seg, conestoga);
    expect(french.text).toContain('Sciences de la santé : 65 %');
    expect(french.text).toContain('Sessio ne la devine pas');
  });

  it('marks York letter conversions as estimates but not uOttawa conversions', () => {
    const york = schoolById('york-university')!;
    const yorkStanding = gradeStatusAnswer(base, intent({ course: 'SEG3102' }), 'en', seg, york);
    expect(yorkStanding.text).toContain('letter conversions are guidelines');
    expect(yorkStanding.text).toContain('the instructor decides');
    expect(yorkStanding.text).toContain('an estimate');

    const yorkTarget = gradeStatusAnswer(base, intent({ targetLetter: 'B' }), 'en', seg, york);
    expect(yorkTarget.text).toContain('letter conversions are guidelines');
    const yorkOverview = gradeStatusAnswer(base, intent({}), 'fr', undefined, york);
    expect(yorkOverview.text).toContain('sont des lignes directrices');
    expect(yorkOverview.text).toContain('une estimation');

    const uOttawaStanding = gradeStatusAnswer(base, intent({ course: 'SEG3102' }), 'en', seg);
    expect(uOttawaStanding.text).not.toContain('letter conversions are guidelines');
    expect(uOttawaStanding.text).not.toContain('an estimate');
  });

  it('works out the score needed on the final when it is the only work left', () => {
    const answer = gradeStatusAnswer(
      base,
      intent({ targetLetter: 'B', assessment: 'Final Exam' }),
      'en',
      seg,
    );
    expect(answer.text).toContain('at least 71% on Final Exam');
    expect(answer.text).not.toContain('assumes');
  });

  it('shows the raw score when the final is not out of 100', () => {
    const data = {
      ...base,
      assessments: base.assessments.map((a) => (a.id === 'final' ? { ...a, maxScore: 60 } : a)),
    };
    const answer = gradeStatusAnswer(
      data,
      intent({ targetLetter: 'B', assessment: 'final exam' }),
      'en',
      seg,
    );
    expect(answer.text).toContain('71% (42.6/60)');
  });

  it('assumes the current grade on other remaining work and says so', () => {
    // A2 10% left besides a 40% final: A2 at 68% -> 6.8 points; (69.5 - 34 - 6.8) / 40 = 71.75% -> 71.8%.
    const data = {
      ...base,
      assessments: [
        ...base.assessments.map((a) => (a.id === 'final' ? { ...a, weight: 40 } : a)),
        assessment({ id: 'a2', name: 'Assignment 2', weight: 10 }),
      ],
    };
    const answer = gradeStatusAnswer(
      data,
      intent({ targetLetter: 'B', assessment: 'Final Exam' }),
      'en',
      seg,
    );
    expect(answer.text).toContain('at least 71.8% on Final Exam');
    expect(answer.text).toContain('keep your current 68%');
  });

  it('says when a target is impossible or already secured', () => {
    expect(gradeStatusAnswer(base, intent({ targetLetter: 'A+' }), 'en', seg).text).toContain(
      'out of reach',
    );
    expect(gradeStatusAnswer(base, intent({ targetPercent: 30 }), 'en', seg).text).toContain(
      'already secured',
    );
    expect(
      gradeStatusAnswer(base, intent({ targetLetter: 'A+', assessment: 'Final Exam' }), 'en', seg)
        .text,
    ).toContain('Even 100% on Final Exam');
  });

  it('respects best-of grading rules from the Grades page calculator', () => {
    // Best 1 of 2 quizzes worth 20%: the 50% quiz is dropped, so 20 points earned at 100%.
    const data: AssistantWorkspace = {
      ...base,
      courses: [
        {
          ...seg,
          gradingRules: [
            {
              id: 'r',
              name: 'Quizzes',
              keep: 1,
              weight: 20,
              assessmentIds: ['q1', 'q2'],
              source: '',
            },
          ],
        } as never,
      ],
      assessments: [
        assessment({
          id: 'q1',
          name: 'Quiz 1',
          type: 'QUIZ',
          weight: 10,
          score: 100,
          status: 'GRADED',
        }),
        assessment({
          id: 'q2',
          name: 'Quiz 2',
          type: 'QUIZ',
          weight: 10,
          score: 50,
          status: 'GRADED',
        }),
        assessment({ id: 'final', name: 'Final Exam', type: 'FINAL_EXAM', weight: 80 }),
      ],
    };
    const course = data.courses[0];
    expect(gradeStatusAnswer(data, intent({}), 'en', course).text).toContain('100% (A+)');
    // (69.5 - 20) / 80 = 61.875% -> 61.9%
    expect(
      gradeStatusAnswer(data, intent({ targetLetter: 'B', assessment: 'Final Exam' }), 'en', course)
        .text,
    ).toContain('at least 61.9% on Final Exam');
  });

  it('answers in French with French number formatting', () => {
    const answer = gradeStatusAnswer(
      base,
      intent({ targetLetter: 'B', assessment: 'Final Exam' }),
      'fr',
      seg,
    );
    expect(answer.text).toContain('71 %');
    expect(answer.text).toContain('Pour terminer SEG3102');
  });

  it('asks which assessment when the name does not match', () => {
    expect(
      gradeStatusAnswer(base, intent({ targetLetter: 'B', assessment: 'Lab 9' }), 'en', seg).text,
    ).toContain('couldn’t find “Lab 9”');
  });
});
