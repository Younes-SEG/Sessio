import { describe, expect, it } from 'vitest';
import { interpretGradingNote, gradingRuleError, type GradingRule } from '../src/lib/grading-rules';
import { calculateGrades, calculateTarget, ruleContributions } from '../src/lib/grades';
import { assessment } from './fixtures';

const quizzes = [50, 60, 70, 80, 90].map((score, i) =>
  assessment({
    id: `q${i}`,
    name: `Quiz ${i + 1}`,
    type: 'QUIZ',
    weight: 4,
    score,
    status: 'GRADED',
  }),
);
const rule: GradingRule = {
  id: 'quizzes',
  name: 'Quizzes',
  keep: 4,
  weight: 20,
  assessmentIds: quizzes.map((a) => a.id),
  source: 'Best 4 of 5 quizzes count.',
};
describe('instructor grading instructions', () => {
  it.each([
    'Best 4 of 5 quizzes count',
    'Only the highest 4 out of 5 quizzes count.',
    'Les 4 meilleurs quiz sur 5 comptent.',
  ])('interprets %s as a reviewable rule', (note) => {
    expect(interpretGradingNote(note)).toEqual({ keep: 4, count: 5, type: 'QUIZ', weight: null });
  });
  it.each([
    'The best 4 of 5 quizzes do not count',
    'best 5 of 5 quizzes',
    'best 4 of 5 quizzes and labs',
    'best 4 of 5 quizzes, best 2 of 3 labs',
    'The midterm moved to Friday',
  ])('does not silently interpret %s', (note) => {
    expect(interpretGradingNote(note)).toBeNull();
  });
  it('counts the best four equally within the 20% category without double counting weights', () => {
    const result = calculateGrades([...quizzes, assessment({ id: 'exam', weight: 80 })], [rule]);
    expect(result).toMatchObject({
      configuredWeight: 100,
      completedWeight: 20,
      earnedPoints: 15,
      currentGrade: 75,
      remainingWeight: 80,
    });
    expect(ruleContributions(quizzes, [rule]).get('q0')?.counted).toBe(false);
    expect(
      calculateTarget([...quizzes, assessment({ id: 'exam', weight: 80 })], 80, [rule])
        .requiredAverage,
    ).toBeCloseTo(81.25);
  });
  it('ranks percentages instead of raw marks and handles ties deterministically', () => {
    const changed = quizzes.map((a, i) => ({
      ...a,
      score: i === 0 ? 19 : 80,
      maxScore: i === 0 ? 20 : 100,
    }));
    expect(calculateGrades(changed, [rule]).earnedPoints).toBeCloseTo(16.75);
    expect(ruleContributions(changed, [rule]).get('q0')?.counted).toBe(true);
  });
  it('does not turn unknown grades into zero and avoids misleading targets before the group is complete', () => {
    const pending = quizzes.map((a, i) =>
      i > 1 ? { ...a, status: 'NOT_STARTED' as const, score: null } : a,
    );
    expect(calculateGrades(pending, [rule])).toMatchObject({
      completedWeight: 10,
      earnedPoints: 5.5,
    });
    expect(calculateGrades(pending, [rule]).currentGrade).toBeCloseTo(55);
    expect(calculateTarget(pending, 80, [rule])).toMatchObject({
      status: 'invalid',
      requiredAverage: null,
    });
    expect(
      calculateGrades(
        quizzes.map((a) => ({ ...a, status: 'NOT_STARTED' as const, score: null })),
        [rule],
      ).currentGrade,
    ).toBeNull();
  });
  it('keeps genuine zeros and reversibly restores individual weights without touching scores', () => {
    const zero = quizzes.map((a) => ({ ...a, score: 0 }));
    expect(calculateGrades(zero, [rule]).currentGrade).toBe(0);
    expect(calculateGrades(quizzes).earnedPoints).toBe(14);
    expect(quizzes.map((a) => a.score)).toEqual([50, 60, 70, 80, 90]);
  });
  it('rejects overlapping groups, foreign/missing members and overallocated course weights', () => {
    expect(gradingRuleError([rule, { ...rule, id: 'other' }], quizzes)).toBeTruthy();
    expect(
      gradingRuleError(
        [{ ...rule, assessmentIds: ['foreign', ...rule.assessmentIds.slice(1)] }],
        quizzes,
      ),
    ).toBeTruthy();
    expect(
      gradingRuleError([rule], [...quizzes, assessment({ id: 'exam', weight: 90 })]),
    ).toBeTruthy();
    expect(
      gradingRuleError([rule], [...quizzes, assessment({ id: 'exam', weight: 80 })]),
    ).toBeNull();
  });
});
