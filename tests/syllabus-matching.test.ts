import { describe, expect, it } from 'vitest';
import {
  allocateCategoryWeight,
  matchSyllabusAssessment,
  reconcileSyllabusPreview,
} from '../src/lib/syllabus-matching';
import { validateSyllabusResult } from '../src/lib/syllabus-result';
import type { SyllabusSuggestion } from '../src/lib/syllabus';

const labs = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `lab-${n}`,
  name: `Lab ${n} - Due`,
  type: 'LAB' as const,
  weight: 0,
}));
const item = (patch: Partial<SyllabusSuggestion> = {}): SyllabusSuggestion => ({
  name: 'Lab 1',
  type: 'LAB',
  date: '',
  time: '',
  weight: 2,
  source: 'Lab 1: 2%',
  page: 1,
  grouped: false,
  warnings: [],
  ...patch,
});
describe('syllabus enrichment of calendar assessments', () => {
  it.each(['Lab 1', 'Laboratoire 1', 'TP 1 - remise', 'Lab01', 'SEG3102 Lab 1 exercises'])(
    'matches %s to the same existing numbered lab',
    (name) => {
      expect(matchSyllabusAssessment({ name, type: 'LAB' }, labs).map((a) => a.id)).toEqual([
        'lab-1',
      ]);
    },
  );
  it('does not merge different numbers or different parts', () => {
    expect(matchSyllabusAssessment({ name: 'Lab 7', type: 'LAB' }, labs)).toEqual([]);
    expect(
      matchSyllabusAssessment({ name: 'Lab 1 part B', type: 'LAB' }, [
        { ...labs[0], name: 'Lab 1 part A' },
      ]),
    ).toEqual([]);
  });
  it('matches translated exams only when unambiguous', () => {
    const exam = {
      id: 'mid',
      name: 'Examen de mi-session - Due',
      type: 'MIDTERM' as const,
      weight: 0,
    };
    expect(matchSyllabusAssessment({ name: 'Mid-term exam', type: 'MIDTERM' }, [exam])).toEqual([
      exam,
    ]);
    const result = reconcileSyllabusPreview(
      { items: [item({ name: 'Midterm exam', type: 'MIDTERM' })], warnings: [] },
      [exam, { ...exam, id: 'other' }],
    );
    expect(result.items[0]).toMatchObject({ selected: false, existingId: '' });
  });
  it('keeps known weights and dates and prevents two rows claiming one record', () => {
    const result = reconcileSyllabusPreview(
      { items: [item({ date: '2026-10-01' }), item({ name: 'TP 1' })], warnings: [] },
      [{ ...labs[0], weight: 3 }],
    );
    expect(result.items[0]).toMatchObject({
      existingId: 'lab-1',
      weight: null,
      date: '',
      selected: true,
    });
    expect(result.items[1].selected).toBe(false);
  });
  it('preserves the SEG3102 grading table without creating category assessments', () => {
    const result = validateSyllabusResult(
      {
        items: [
          { ...item({ name: 'Lab exercises', weight: 10, grouped: true }), date: null, time: null },
          {
            ...item({ name: 'Assignments', type: 'ASSIGNMENT', weight: 10, grouped: true }),
            date: null,
            time: null,
          },
          { ...item({ name: 'Project', type: 'PROJECT', weight: 25 }), date: null, time: null },
          {
            ...item({ name: 'Mid-term exam', type: 'MIDTERM', weight: 15 }),
            date: '2026-10-22',
            time: null,
          },
          {
            ...item({ name: 'Final exam', type: 'FINAL_EXAM', weight: 40 }),
            date: null,
            time: null,
          },
        ],
        warnings: [],
      },
      { startDate: '2026-09-01', endDate: '2026-12-31', pages: 5 },
    );
    const review = reconcileSyllabusPreview(result, [
      ...labs,
      { id: 'deliverable', name: 'Deliverable 1 - Due', type: 'PROJECT', weight: 0 },
    ]);
    expect(review.categories.map((c) => c.weight)).toEqual([10, 10, 25]);
    expect(review.categories.every((c) => c.count === null && !c.equalWeights)).toBe(true);
    expect(review.items.map((a) => [a.type, a.weight])).toEqual([
      ['MIDTERM', 15],
      ['FINAL_EXAM', 40],
    ]);
    // No guessed equal weights or extra lab, assignment, or project placeholder.
    expect(labs.every((a) => a.weight === 0)).toBe(true);
  });
  it('keeps individually identified members alongside a category', () => {
    const preview = {
      categories: [
        {
          name: 'Labs',
          type: 'LAB' as const,
          weight: 10,
          count: 6,
          equalWeights: false,
          source: '6 labs, 10% combined',
          page: 1,
        },
      ],
      items: [item({ weight: null })],
      warnings: [],
    };
    expect(reconcileSyllabusPreview(preview, labs).items[0]).toMatchObject({
      existingId: 'lab-1',
      selected: true,
      weight: null,
    });
  });
  it('allocates only missing weights and preserves the exact combined total', () => {
    const allocated = allocateCategoryWeight(10, labs)!;
    expect(allocated).toHaveLength(6);
    expect(allocated.reduce((sum, a) => sum + a.weight, 0)).toBeCloseTo(10, 8);
    const partial = allocateCategoryWeight(10, [{ ...labs[0], weight: 4 }, ...labs.slice(1)])!;
    expect(partial.some((a) => a.id === labs[0].id)).toBe(false);
    expect(partial.reduce((sum, a) => sum + a.weight, 0)).toBeCloseTo(6, 8);
    expect(allocateCategoryWeight(2, [{ ...labs[0], weight: 4 }, labs[1]])).toBeNull();
  });
});
