import { expect, it } from 'vitest';
import { calculateGrades } from '../src/lib/grades';
import { french } from '../src/lib/i18n/fr';
import { translateGradeWarning } from '../src/lib/i18n/grade-warnings';

it('keeps Grades and personal Notes distinct in French', () => {
  expect(french.Grades).not.toBe(french.Notes);
});

it('translates the course page copy found in the first-run review', () => {
  for (const text of ['Your course workspace', '1 open task for', '{count} open tasks for'])
    expect(french[text], text).toBeTruthy();
  expect(french['Add assessment']).toBe('Ajouter une évaluation');
});

it('translates every grade warning template', () => {
  const warnings = [
    'Assessment weights total 10%. Add the remaining 90% for a complete course plan.',
    'Assessment weights total 120%, exceeding 100%. Correct the weights before using the target calculator.',
    'Quizzes: 20% shared equally across 4 current assessments. Weights and averages adjust when assessments are added or removed. Ungraded work is not zero.',
    'Quizzes: best 4 of 5, 20% combined. Current grade uses the best recorded percentages so far; it can change as more scores arrive. Ungraded work is not zero.',
    '“Lab 1” has an invalid weight and was excluded.',
    '“Lab 1” needs a valid score and maximum score before it counts as graded.',
  ];
  for (const warning of warnings) {
    const fr = translateGradeWarning(warning, 'fr');
    expect(fr, warning).not.toBe(warning);
    expect(translateGradeWarning(warning, 'en')).toBe(warning);
  }
  expect(translateGradeWarning(warnings[0], 'fr')).toContain('10 %');
});

it('matches the warning text grades.ts actually produces', () => {
  const { warnings } = calculateGrades(
    [
      {
        id: 'a',
        name: 'A1',
        weight: 10,
        score: 85,
        maxScore: 100,
        status: 'GRADED',
      } as never,
    ],
    [],
  );
  expect(warnings.length).toBeGreaterThan(0);
  for (const warning of warnings) expect(translateGradeWarning(warning, 'fr')).not.toBe(warning);
});
