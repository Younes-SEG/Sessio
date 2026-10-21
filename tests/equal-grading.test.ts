import { describe, expect, it } from 'vitest';
import {
  gradingRuleError,
  readGradingRules,
  configuredCourseWeight,
  withEqualWeights,
  splitGradingNotes,
  type GradingRule,
} from '../src/lib/grading-rules';
import { calculateGrades, calculateTarget } from '../src/lib/grades';
import { assessment } from './fixtures';

const rule: GradingRule = {
  id: 'labs',
  name: 'Labs',
  mode: 'equal',
  assessmentType: 'LAB',
  keep: 1,
  weight: 10,
  assessmentIds: [],
  source: 'Labs 10%',
};
const labs = Array.from({ length: 6 }, (_, i) =>
  assessment({ id: `lab${i}`, type: 'LAB', weight: 0, status: 'GRADED', score: 80 }),
);

describe('persistent equal category weights', () => {
  it.each(['LAB', 'ASSIGNMENT', 'PROJECT'] as const)(
    'automatically includes new %s members without double counting',
    (type) => {
      const category = { ...rule, assessmentType: type };
      const six = labs.map((a) => ({ ...a, type }));
      const eight = [
        ...six,
        assessment({ id: 'new1', type, weight: 0 }),
        assessment({ id: 'new2', type, weight: 0 }),
      ];
      expect(
        withEqualWeights(six, [category]).every((a) => Math.abs(a.weight - 10 / 6) < 1e-10),
      ).toBe(true);
      expect(withEqualWeights(eight, [category]).map((a) => a.weight)).toEqual(Array(8).fill(1.25));
      expect(calculateGrades(eight, [category])).toMatchObject({
        configuredWeight: 10,
        completedWeight: 7.5,
        earnedPoints: 6,
        currentGrade: 80,
      });
      expect(six.map((a) => a.weight)).toEqual(Array(6).fill(0));
      expect(withEqualWeights(eight, [category]).map((a) => a.score)).toEqual(
        eight.map((a) => a.score),
      );
      expect(
        configuredCourseWeight(
          [...eight, assessment({ id: 'final', type: 'FINAL_EXAM', weight: 90 })],
          [category],
        ),
      ).toBe(100);
    },
  );
  it('reserves the category total before any members exist and recalculates after removal', () => {
    expect(readGradingRules([rule])).toHaveLength(1);
    expect(gradingRuleError([rule], [])).toBeNull();
    expect(calculateGrades([], [rule])).toMatchObject({ configuredWeight: 10, currentGrade: null });
    expect(withEqualWeights(labs.slice(0, 5), [rule]).every((a) => a.weight === 2)).toBe(true);
  });
  it('does not treat ungraded work as zero or block projections for equal groups', () => {
    const pending = labs.map((a) => ({ ...a, score: null, status: 'NOT_STARTED' as const }));
    expect(calculateGrades(pending, [rule]).currentGrade).toBeNull();
    expect(calculateTarget(pending, 80, [rule]).status).toBe('possible');
  });
  it('rejects overlapping equal and best-of rules, duplicate categories and over-allocation', () => {
    const best = {
      id: 'best',
      name: 'Best labs',
      keep: 4,
      weight: 10,
      assessmentIds: labs.map((a) => a.id),
      source: '',
    };
    expect(gradingRuleError([rule, best], labs)).toBeTruthy();
    expect(gradingRuleError([rule, { ...rule, id: 'duplicate' }], labs)).toBeTruthy();
    expect(
      gradingRuleError(
        [rule],
        [...labs, assessment({ id: 'exam', type: 'FINAL_EXAM', weight: 95 })],
      ),
    ).toBeTruthy();
    expect(gradingRuleError([best], labs)).toBeNull();
  });
  it('keeps user instructions separate from legacy machine-generated references', () => {
    expect(splitGradingNotes('My instructions\n').instructions).toBe('My instructions\n');
    const generated = 'Lab exercises: 10% combined. Lab exercises | 10%';
    const log =
      'Lab exercises: user confirmed equal allocation of the remaining category weight across 6 assessments with missing weights.';
    expect(splitGradingNotes(`${generated}\nBest 4 of 5 quizzes count.\n${log}`)).toEqual({
      instructions: 'Best 4 of 5 quizzes count.',
      references: `${generated}\n${log}`,
    });
  });
});
