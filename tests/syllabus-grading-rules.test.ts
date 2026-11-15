import { describe, expect, it } from 'vitest';
import { interpretGradingNote, type GradingRule } from '../src/lib/grading-rules';
import {
  detectSyllabusBestOfSuggestions,
  gradingRuleFromSyllabusSuggestion,
} from '../src/lib/syllabus-grading-rules';
import type { SyllabusCategory } from '../src/lib/syllabus-result';

const labs = (n: number, weight = 2) =>
  Array.from({ length: n }, (_, i) => ({ id: `import:${i}`, type: 'LAB' as const, weight }));
const category = (patch: Partial<SyllabusCategory> = {}): SyllabusCategory =>
  ({
    name: 'Lab reports',
    type: 'LAB',
    weight: 10,
    count: 6,
    equalWeights: true,
    source: 'Lab reports (best 5 of 6, 2% each) 10%',
    ...patch,
  }) as SyllabusCategory;
const detect = (input: Partial<Parameters<typeof detectSyllabusBestOfSuggestions>[0]>) =>
  detectSyllabusBestOfSuggestions({
    categories: [],
    items: [],
    warnings: [],
    assessments: labs(6),
    rules: [],
    ...input,
  });

describe('syllabus best-of suggestions', () => {
  it('suggests best 5 of 6 labs at the category total', () => {
    const [s, ...rest] = detect({ categories: [category()] });
    expect(rest).toEqual([]);
    expect(s).toMatchObject({ keep: 5, count: 6, type: 'LAB', weight: 10 });
    expect(s.assessmentIds).toEqual(labs(6).map((a) => a.id));
    const rule = gradingRuleFromSyllabusSuggestion(s, 'r1', 'Labs');
    expect(rule).toMatchObject({ id: 'r1', keep: 5, weight: 10, assessmentIds: s.assessmentIds });
    expect(rule?.mode).toBeUndefined(); // best-of, not an equal split
  });

  it('reads the note from item warnings and falls back to identical item weights', () => {
    const [s] = detect({
      items: [{ source: 'Lab 1', warnings: ['Best 5 of 6 labs count towards the final grade.'] }],
    });
    expect(s).toMatchObject({ keep: 5, count: 6, weight: 10 });
  });

  it('understands French wording', () => {
    expect(
      interpretGradingNote('Les 5 meilleurs rapports de laboratoire sur 6 comptent'),
    ).toMatchObject({ keep: 5, count: 6, type: 'LAB' });
    const [s] = detect({
      categories: [category({ source: 'Les 5 meilleurs laboratoires sur 6 (10 %)' })],
    });
    expect(s).toMatchObject({ keep: 5, count: 6, weight: 10 });
  });

  it('suggests nothing when the evidence is unclear', () => {
    const note = (source: string) => detect({ categories: [category({ source })] });
    expect(note('Labs: all 6 count, except the best 5 of 6 rule does not apply')).toEqual([]);
    expect(note('Lab reports 10%')).toEqual([]);
    // Count in the note does not match the labs found.
    expect(detect({ categories: [category()], assessments: labs(5) })).toEqual([]);
    // Two readings for the same type.
    expect(
      detect({
        categories: [category()],
        warnings: ['Best 4 of 6 labs count'],
      }),
    ).toEqual([]);
    // Category weights disagree.
    expect(
      detect({ categories: [category(), category({ weight: 12, source: 'Labs best 5 of 6' })] }),
    ).toEqual([]);
    // No category and unequal item weights.
    expect(
      detect({
        items: [{ source: 'Best 5 of 6 labs', warnings: [] }],
        assessments: [...labs(5), { id: 'import:x', type: 'LAB', weight: 3 }],
      }),
    ).toEqual([]);
  });

  it('stays quiet once a rule already covers the group', () => {
    const bestOf: GradingRule = {
      id: 'r',
      name: 'Labs',
      keep: 5,
      weight: 10,
      assessmentIds: labs(6).map((a) => a.id),
      source: '',
    };
    const equal: GradingRule = {
      id: 'e',
      name: 'Labs',
      mode: 'equal',
      assessmentType: 'LAB',
      keep: 1,
      weight: 10,
      assessmentIds: [],
      source: '',
    };
    expect(detect({ categories: [category()], rules: [bestOf] })).toEqual([]);
    expect(detect({ categories: [category()], rules: [equal] })).toEqual([]);
  });
});
