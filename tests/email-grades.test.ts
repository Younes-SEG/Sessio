import { describe, it, expect } from 'vitest';
import { emailScore, gmailBody, matchEmailAssessment } from '../src/lib/email-grades';
describe('grade notification reader', () => {
  it.each([
    ['Score: 18/20', 18, 20],
    ['Your grade is 85%', 85, 100],
    ['Note : 17,5 sur 20', 17.5, 20],
    ['Résultat : 0 / 10', 0, 10],
    ['You received 9 out of 10', 9, 10],
    ['Grade for Lab 1: 8/10', 8, 10],
  ])('reads %s', (text, score, maxScore) =>
    expect(emailScore(text)).toMatchObject({ score, maxScore }),
  );
  it.each([
    'Your grade is available on Brightspace.',
    'Lab weight: 20%',
    'Class average score: 80%',
    'Grade released on 09/10/2026',
    'Score: 18/20\nScore: 12/20',
    'Score: 5/0',
    'Score: 120%',
    'Meeting 14:30; quiz 2 is worth 10%',
  ])('does not invent a grade from %s', (text) => expect(emailScore(text)).toBeNull());
  it('deduplicates repeated quoted scores', () =>
    expect(emailScore('Score: 18/20\nScore: 18/20')).toMatchObject({ score: 18, maxScore: 20 }));
  const courses = [{ id: 'c', code: 'SEG3102', archived: false }];
  const assessments = [
    { id: 'lab1', courseId: 'c', name: 'Lab 1', type: 'LAB' as const },
    { id: 'lab10', courseId: 'c', name: 'Lab 10', type: 'LAB' as const },
  ];
  it('matches bilingual numbered assessments without matching lab 1 to lab 10', () => {
    expect(
      matchEmailAssessment('SEG 3102 Laboratoire 1 - Note : 18/20', courses, assessments),
    ).toBe('lab1');
    expect(matchEmailAssessment('SEG3102 Lab 10 score: 5/10', courses, assessments)).toBe('lab10');
  });
  it('does not choose between duplicate course terms, archived courses or multiple assessments', () => {
    expect(
      matchEmailAssessment(
        'SEG3102 Lab 1',
        [...courses, { ...courses[0], id: 'other-term' }],
        assessments,
      ),
    ).toBeNull();
    expect(
      matchEmailAssessment('SEG3102 Lab 1', [{ ...courses[0], archived: true }], assessments),
    ).toBeNull();
    expect(matchEmailAssessment('SEG3102 Lab 1 and Lab 10', courses, assessments)).toBeNull();
    expect(matchEmailAssessment('Grade for Lab 1', courses, assessments)).toBeNull();
  });
  const quizCourses = [{ id: 'gng', code: 'GNG1505', archived: false }];
  const testCourses = [{ id: 'sta', code: 'STA2791', archived: false }];
  const courseTests = [1, 2, 10].map((n) => ({
    id: `test${n}`,
    courseId: 'sta',
    name: `Examen Test ${n}`,
    type: 'MIDTERM' as const,
  }));
  it.each(['Test1', 'Test 1', 'Test-1', 'Test #1', 'Test n° 1', 'Test 01', 'Examen Test 1'])(
    'matches %s to the named test in a digest or standalone notice',
    (label) => {
      const digest = `Activity summary for STA2791 B00\nCourse Grades (1)\nUpdated - ${label}\nYour grade: 17 / 25, C+, 17 / 25% of final grade\nGo to Grades>>`;
      expect(emailScore(digest)).toMatchObject({ score: 17, maxScore: 25 });
      expect(matchEmailAssessment(digest, testCourses, courseTests)).toBe('test1');
      expect(
        matchEmailAssessment(
          `STA2791 Test 2 due tomorrow\n${label}\nYour grade: 17/25`,
          testCourses,
          courseTests,
        ),
      ).toBe('test1');
    },
  );
  it('matches explicit test names regardless of the stored assessment category', () => {
    for (const type of ['MIDTERM', 'QUIZ', 'OTHER'] as const)
      expect(
        matchEmailAssessment('STA2791 Test1 score: 17/25', testCourses, [
          { ...courseTests[0], type },
        ]),
      ).toBe('test1');
    expect(
      matchEmailAssessment('STA2791 Examen Test 1 score: 17/25', testCourses, [
        { ...courseTests[0], name: 'Test1' },
      ]),
    ).toBe('test1');
  });
  it('keeps test numbers, parts, courses and ambiguous results distinct', () => {
    expect(matchEmailAssessment('STA2791 Test10 score: 17/25', testCourses, courseTests)).toBe(
      'test10',
    );
    for (const label of ['Test3', 'Test1 and Test3', 'Test1 and Quiz2', 'Test1 Part A', 'Test'])
      expect(
        matchEmailAssessment(`STA2791 ${label} score: 17/25`, testCourses, courseTests),
      ).toBeNull();
    expect(
      matchEmailAssessment('STA2791 Test1 score: 17/25', testCourses, [
        ...courseTests,
        { ...courseTests[0], id: 'duplicate', name: 'Test 1' },
      ]),
    ).toBeNull();
    expect(
      matchEmailAssessment('STA2791 Test1 score: 17/25', testCourses, [
        { ...courseTests[0], courseId: 'another-course' },
        { ...courseTests[0], id: 'quiz1', name: 'Quiz 1', type: 'QUIZ' },
        { ...courseTests[0], id: 'midterm1', name: 'Midterm 1' },
      ]),
    ).toBeNull();
    expect(
      matchEmailAssessment('STA2791 Test1 Part A score: 17/25', testCourses, [
        ...courseTests,
        { ...courseTests[0], id: 'part-a', name: 'Examen Test 1 Partie A' },
      ]),
    ).toBe('part-a');
  });
  const quizzes = [1, 2, 3, 12].map((n) => ({
    id: `quiz${n}`,
    courseId: 'gng',
    name: `Quiz ${n}`,
    type: 'QUIZ' as const,
  }));
  const exams = [
    {
      id: 'midterm',
      courseId: 'gng',
      name: 'Midterm Exam / Examen de mi-session',
      type: 'MIDTERM' as const,
    },
    {
      id: 'final',
      courseId: 'gng',
      name: 'Final Exam / Examen final',
      type: 'FINAL_EXAM' as const,
    },
  ];
  it.each([
    'MT-Exam',
    'MT Exam',
    'MTExam',
    'M.T. Exam',
    'Mid-term examination',
    'Examen intra',
    'Intra',
    'Examen de mi-session',
  ])('matches the midterm label %s in summaries and standalone notices', (label) => {
    const digest = `Activity summary for GNG1505 A00\nAssignment (1)\nQuiz 3 due soon\nCourse Grades (1)\nUpdated - ${label}\nYour grade: 16 / 30, D, 13.33 / 25% of final grade\nGo to Grades>>\nContent Updates (2)`;
    expect(emailScore(digest)).toMatchObject({ score: 16, maxScore: 30 });
    expect(matchEmailAssessment(digest, quizCourses, [...quizzes, ...exams])).toBe('midterm');
    expect(
      matchEmailAssessment(`GNG1505 Quiz 3 due soon\n${label}\nYour grade: 16/30`, quizCourses, [
        ...quizzes,
        ...exams,
      ]),
    ).toBe('midterm');
  });
  it('preserves exam numbers and leaves duplicate or unspecified midterms unassigned', () => {
    const numberedExams = [1, 2].map((n) => ({
      id: `midterm${n}`,
      courseId: 'gng',
      name: `Midterm Exam ${n}`,
      type: 'MIDTERM' as const,
    }));
    expect(matchEmailAssessment('GNG1505 MT-Exam2 score: 16/30', quizCourses, numberedExams)).toBe(
      'midterm2',
    );
    expect(
      matchEmailAssessment('GNG1505 MT-Exam score: 16/30', quizCourses, numberedExams),
    ).toBeNull();
    expect(matchEmailAssessment('GNG1505 MT-Exam2 score: 16/30', quizCourses, exams)).toBeNull();
    expect(
      matchEmailAssessment('GNG1505 MT-Exam score: 16/30', quizCourses, [
        ...exams,
        { ...exams[0], id: 'duplicate' },
      ]),
    ).toBeNull();
    expect(
      matchEmailAssessment(
        'GNG1505 Course update\nMeeting at 8 MT\nYour grade: 16/30',
        quizCourses,
        exams,
      ),
    ).toBeNull();
    expect(
      matchEmailAssessment(
        'GNG1505 Quiz 2\nYour grade: 16/30, 13.33/25% of final grade',
        quizCourses,
        [...quizzes, ...exams],
      ),
    ).toBe('quiz2');
  });
  it.each(['Quiz-2', 'Quiz–2', 'Quiz_2', 'Quiz2', 'Quiz #2', 'Quiz n° 2', 'Questionnaire 02'])(
    'matches name variation %s in both digests and individual grade notices',
    (label) => {
      for (const content of [
        `Activity summary for GNG1505\nCourse Grades (1)\nUpdated -\n${label}\nYour grade: 10/10\nGo to Grades>>`,
        `GNG1505 - Updated Grade: Your grade for "${label}" has been updated\nYour grade is: 10/10`,
      ])
        expect(matchEmailAssessment(content, quizCourses, quizzes)).toBe('quiz2');
    },
  );
  it('does not confuse numbers, parts, unknown items, or duplicate matching assessments', () => {
    expect(matchEmailAssessment('GNG1505 Quiz-12 score: 10/10', quizCourses, quizzes)).toBe(
      'quiz12',
    );
    expect(
      matchEmailAssessment('GNG1505 Quiz-2 and Quiz-8 score: 10/10', quizCourses, quizzes),
    ).toBeNull();
    expect(
      matchEmailAssessment('GNG1505 Quiz-2 Part A score: 10/10', quizCourses, quizzes),
    ).toBeNull();
    expect(
      matchEmailAssessment('GNG1505 Quiz-2 score: 10/10', quizCourses, [
        ...quizzes,
        { ...quizzes[1], id: 'duplicate' },
      ]),
    ).toBeNull();
  });
  it('resolves duplicate codes by the message term and active term without assigning historical grades to the current course', () => {
    const semester = { startDate: '2026-09-01', endDate: '2026-12-31', isActive: true };
    const terms = [
      { id: 'current', code: 'SEG3101', archived: false, semester },
      {
        id: 'old-copy',
        code: 'SEG3101',
        archived: false,
        semester: { ...semester, isActive: false },
      },
      {
        id: 'last-year',
        code: 'SEG3101',
        archived: false,
        semester: { isActive: false, startDate: '2025-09-01', endDate: '2025-12-31' },
      },
    ];
    const items = terms.map((c) => ({
      id: c.id + '-quiz',
      courseId: c.id,
      name: 'Quiz 3',
      type: 'QUIZ' as const,
    }));
    const text = 'SEG3101\nCourse Grades (1)\nUpdated -\nQuiz 3\nYour grade: 9.5/10';
    expect(matchEmailAssessment(text, terms, items, '2026-10-18')).toBe('current-quiz');
    expect(matchEmailAssessment(text, terms, items, '2025-10-18')).toBe('last-year-quiz');
    expect(matchEmailAssessment(text, terms, items, '2027-10-18')).toBeNull();
    expect(
      matchEmailAssessment(
        text,
        terms.map((c) => ({ ...c, semester: { ...c.semester, isActive: false } })),
        items,
        '2026-10-18',
      ),
    ).toBeNull();
    expect(
      matchEmailAssessment(
        text,
        [...terms, { ...terms[0], id: 'another-current' }],
        items,
        '2026-10-18',
      ),
    ).toBeNull();
  });
  const digest = `Activity summary for SEG3102 A00 Software Design & Architecture 20269
Course Updates (11)
1 Assignments with Unread Feedback
Assignment (1)
Lab 6 - Due date is in 5 days, 9 hours
Friday, October 23, 2026 11:59 PM EDT
Go to Assignments >>
Course Grades (1)
Updated - Lab 3
Your grade: 9 / 10, A+, 4.5 / 5% of final grade
Go to Grades >>
Content Updates (3)
3 Pages of Content Updated`;
  const labs = [
    { id: 'lab3', courseId: 'c', name: 'Lab 3 - Due', type: 'LAB' as const },
    { id: 'lab6', courseId: 'c', name: 'Lab 6', type: 'LAB' as const },
  ];
  it('associates the screenshot summary grade with Lab 3, not the Lab 6 deadline or grade contribution', () => {
    expect(emailScore(digest)).toMatchObject({ score: 9, maxScore: 10 });
    expect(matchEmailAssessment(digest, courses, labs)).toBe('lab3');
    expect(matchEmailAssessment(digest, courses, [labs[1]])).toBeNull();
    expect(
      matchEmailAssessment(digest, courses, [...labs, { ...labs[0], id: 'duplicate' }]),
    ).toBeNull();
  });
  it('reads French grade sections and grade headings without mixing unrelated assessments', () => {
    expect(
      matchEmailAssessment(
        'SEG3102\nDevoir (1)\nLaboratoire 6\nNotes du cours (1)\nMis à jour - Laboratoire 3\nVotre note : 9 / 10\nAller aux notes',
        courses,
        labs,
      ),
    ).toBe('lab3');
    expect(
      matchEmailAssessment(
        'SEG3102 Lab 6 deadline\nUpdated - Lab 3\nYour grade: 9/10',
        courses,
        labs,
      ),
    ).toBe('lab3');
    expect(
      matchEmailAssessment('SEG3102 Lab 6 deadline\nGrade for Lab 3: 9/10', courses, labs),
    ).toBe('lab3');
  });
  it('does not pick one assessment from a digest containing multiple grades, even with equal scores', () => {
    expect(
      matchEmailAssessment(
        digest
          .replace('Course Grades (1)', 'Course Grades (2)')
          .replace('Go to Grades >>', 'Updated - Lab 6\nYour grade: 9/10\nGo to Grades >>'),
        courses,
        labs,
      ),
    ).toBeNull();
  });
  it('extracts plain or HTML text without executing markup or reading attachments', () => {
    const body = (text: string) => ({ data: Buffer.from(text).toString('base64url') });
    expect(
      gmailBody({
        mimeType: 'text/html',
        body: body('<script>Score:1/20</script><p>Note : 18&nbsp;/&nbsp;20</p>'),
      }),
    ).toContain('Note : 18 / 20');
    expect(
      gmailBody({
        mimeType: 'multipart/alternative',
        parts: [
          { mimeType: 'text/plain', body: body('Score: 18/20') },
          { mimeType: 'text/html', body: body('Score: 1/20') },
        ],
      }),
    ).toBe('Score: 18/20');
    expect(
      gmailBody({ filename: 'private.txt', mimeType: 'text/plain', body: body('Score: 1/20') }),
    ).toBe('');
  });
});
