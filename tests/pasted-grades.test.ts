import { describe, expect, it } from 'vitest';
import { cellsFromText, planPastedGrades, readPastedGrades } from '../src/lib/pasted-grades';

// Shape of a Brightspace grades page (synthetic values), as cells after expanding colspans.
const page: string[][] = [
  ['Grade Item', '', 'Points', 'Weight Achieved', 'Grade', 'Comments and Assessments'],
  ['Quiz', '', '', '19.33 / 20', 'A+', ''],
  ['', 'Quiz 1', '5.5 / 10 Dropped!', '0 / 0 Dropped!', 'D+', 'Overall Feedback Q3: -0.5'],
  ['', 'Quiz 2', '9.5 / 10', '6.33 / 6.67', 'A+', ''],
  ['', 'Quiz 5', '- / 10', '- / -', '-', ''],
  ['Assignment', '', '', '9.7 / 10', 'A+', ''],
  ['', 'Assignment 1', '97 / 100', '9.7 / 10', 'A+', ''],
  ['Project', '', '', '24.5 / 25', 'A+', ''],
  ['', 'Deliverable 1', '98 / 100', '24.5 / 25', 'A+', 'Requirements quality: 45/50.'],
  ['Lab', '', '', '10 / 10', 'A+', ''],
  ['', 'Lab 01', '2 / 2', '3.33 / 3.33', 'A+', ''],
  ['', 'Lab 04', '- / 2', '- / -', '-', ''],
  ['Final Exam', '', '- / 100', '- / 35', '-', ''],
];

describe('pasted grades', () => {
  it('reads graded rows only, with categories and dropped marks', () => {
    expect(readPastedGrades(page)).toEqual([
      { name: 'Quiz 1', category: 'Quiz', score: 5.5, maxScore: 10, dropped: true },
      { name: 'Quiz 2', category: 'Quiz', score: 9.5, maxScore: 10, dropped: false },
      { name: 'Assignment 1', category: 'Assignment', score: 97, maxScore: 100, dropped: false },
      { name: 'Deliverable 1', category: 'Project', score: 98, maxScore: 100, dropped: false },
      { name: 'Lab 01', category: 'Lab', score: 2, maxScore: 2, dropped: false },
    ]);
  });

  it('copes with a header that spans columns and French decimals', () => {
    const rows = [
      ['Élément de note', 'Points', 'Poids obtenu'],
      ['Quiz', '', '', '9 / 10'],
      ['', 'Quiz 2', '8,5 / 10', '4,25 / 5'],
    ];
    expect(readPastedGrades(rows)).toEqual([
      { name: 'Quiz 2', category: 'Quiz', score: 8.5, maxScore: 10, dropped: false },
    ]);
  });

  it('reads tab-separated text and ignores pages without points', () => {
    const text = 'Grade Item\tPoints\tWeight\n\tQuiz 2\t9.5 / 10\t6.33 / 6.67\n';
    expect(readPastedGrades(cellsFromText(text))).toMatchObject([{ name: 'Quiz 2', score: 9.5 }]);
    expect(readPastedGrades(cellsFromText('Hello\nNo grades here'))).toEqual([]);
  });

  it('matches assessments and never replaces a different existing grade by default', () => {
    const grades = readPastedGrades(page);
    const a = (
      id: string,
      name: string,
      type: 'QUIZ' | 'LAB' | 'ASSIGNMENT' | 'PROJECT',
      score: number | null = null,
      maxScore = 10,
    ) => ({
      id,
      name,
      type,
      weight: 5,
      score,
      maxScore,
    });
    const plan = planPastedGrades(grades, [
      a('q1', 'Quiz 1', 'QUIZ'),
      a('q2', 'Quiz 2', 'QUIZ', 7),
      a('as1', 'Assignment 1', 'ASSIGNMENT', 97, 100),
      a('l1', 'Lab 1', 'LAB', null, 2),
    ]);
    expect(plan.map((p) => [p.grade.name, p.assessmentId, p.action, p.note])).toEqual([
      ['Quiz 1', 'q1', 'update', 'new'],
      ['Quiz 2', 'q2', 'skip', 'different'],
      ['Assignment 1', 'as1', 'skip', 'same'],
      ['Deliverable 1', '', 'skip', 'unmatched'],
      ['Lab 01', 'l1', 'update', 'new'],
    ]);
  });

  it('does not map two pasted rows onto one assessment', () => {
    const plan = planPastedGrades(
      [
        { name: 'Quiz 2', category: 'Quiz', score: 9, maxScore: 10, dropped: false },
        { name: 'Quiz 2', category: 'Quiz', score: 8, maxScore: 10, dropped: false },
      ],
      [{ id: 'q2', name: 'Quiz 2', type: 'QUIZ', weight: 5, score: null, maxScore: 10 }],
    );
    expect(plan.map((p) => p.note)).toEqual(['new', 'duplicate']);
  });
});
