import { describe, expect, it } from 'vitest';
import { interpretGradingNote, gradingRuleError, type GradingRule } from '../src/lib/grading-rules';
import {
  calculateGrades,
  calculateTarget,
  ruleContributions,
  currentCategoryGrade,
} from '../src/lib/grades';
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
  it('shows three perfect results as 100% and 15 of 15 graded course points in best four of five', () => {
    const partial = quizzes.map((a, i) => ({
      ...a,
      score: i < 3 ? 100 : null,
      status: i < 3 ? ('GRADED' as const) : ('NOT_STARTED' as const),
    }));
    const course = [...partial, assessment({ id: 'final', type: 'FINAL_EXAM', weight: 80 })];
    expect(calculateGrades(course, [rule])).toMatchObject({
      currentGrade: 100,
      earnedPoints: 15,
      completedWeight: 15,
    });
    expect(currentCategoryGrade(course, 'QUIZ', [rule])).toBe(100);
    expect(currentCategoryGrade(course, 'FINAL_EXAM', [rule])).toBeNull();
    expect(calculateTarget(course, 100, [rule])).toMatchObject({
      status: 'possible',
      projection: 'best-of',
    });
    expect(calculateTarget(course, 100, [rule]).requiredAverage).toBeCloseTo(100);
    expect(calculateTarget(course, 80, [rule]).requiredAverage).toBeCloseTo((65 / 85) * 100);
    expect(calculateTarget(course, 15, [rule]).status).toBe('secured');
    expect(calculateTarget(course, 101, [rule]).status).toBe('invalid');
  });
  it('lets a future quiz replace a low recorded score even when all four slots already have scores', () => {
    const partial = quizzes.map((a, i) => ({
      ...a,
      score: i === 4 ? null : i === 0 ? 0 : 100,
      status: i === 4 ? ('NOT_STARTED' as const) : ('GRADED' as const),
    }));
    const course = [
      ...partial,
      assessment({ id: 'final', type: 'FINAL_EXAM', weight: 80, status: 'GRADED', score: 100 }),
    ];
    expect(calculateGrades(course, [rule]).remainingWeight).toBe(0);
    expect(currentCategoryGrade(course, 'QUIZ', [rule])).toBe(75);
    expect(calculateTarget(course, 100, [rule])).toMatchObject({
      status: 'possible',
      projection: 'best-of',
    });
    expect(calculateTarget(course, 100, [rule]).requiredAverage).toBeCloseTo(100);
    const finished = course.map((a) =>
      a.id === 'q4' ? { ...a, score: 100, status: 'GRADED' as const } : a,
    );
    expect(currentCategoryGrade(finished, 'QUIZ', [rule])).toBe(100);
    expect(calculateTarget(finished, 100, [rule]).status).toBe('secured');
  });
  it('handles unstarted best-of groups and genuinely unreachable targets', () => {
    const pending = quizzes.map((a) => ({ ...a, score: null, status: 'NOT_STARTED' as const }));
    expect(currentCategoryGrade(pending, 'QUIZ', [rule])).toBeNull();
    expect(calculateTarget(pending, 80, [rule]).requiredAverage).toBeCloseTo(80);
    const course = [
      ...pending,
      assessment({ id: 'final', weight: 80, status: 'GRADED', score: 50 }),
    ];
    expect(calculateTarget(course, 80, [rule])).toMatchObject({
      status: 'impossible',
      requiredAverage: null,
    });
    expect(calculateTarget(course, 40, [rule]).status).toBe('secured');
    expect(calculateTarget(course, 60, [rule]).requiredAverage).toBeCloseTo(100);
  });
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
  it('keeps unknown grades out of the average and labels the equal-score target scenario', () => {
    const pending = quizzes.map((a, i) =>
      i > 1 ? { ...a, status: 'NOT_STARTED' as const, score: null } : a,
    );
    expect(calculateGrades(pending, [rule])).toMatchObject({
      completedWeight: 10,
      earnedPoints: 5.5,
    });
    expect(calculateGrades(pending, [rule]).currentGrade).toBeCloseTo(55);
    expect(calculateTarget(pending, 80, [rule])).toMatchObject({
      status: 'possible',
      projection: 'best-of',
    });
    expect(calculateTarget(pending, 80, [rule]).requiredAverage).toBeCloseTo((77 / 95) * 100);
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
