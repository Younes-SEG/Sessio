import { expect, it } from 'vitest';
import { reconcileSyllabusPreview } from '../src/lib/syllabus-matching';
import type { SyllabusCategory } from '../src/lib/syllabus-result';
import type { SyllabusSuggestion } from '../src/lib/syllabus';

const category = (patch: Partial<SyllabusCategory> = {}): SyllabusCategory => ({
  name: 'Midterms',
  type: 'MIDTERM',
  weight: 30,
  count: 2,
  equalWeights: false,
  source: 'Two midterms: 30%',
  page: 2,
  ...patch,
});
const item = (name: string, weight: number | null = null): SyllabusSuggestion => ({
  name,
  weight,
  type: 'MIDTERM',
  date: '',
  time: '',
  grouped: false,
  source: 'Exam schedule',
  warnings: [],
});
it('automatically splits two midterms worth 30% into editable 15% assessments', () => {
  const result = reconcileSyllabusPreview(
    { categories: [category()], items: [], warnings: [] },
    [],
  );
  expect(result.categories).toHaveLength(0);
  expect(result.items.map((i) => [i.name, i.weight, i.selected])).toEqual([
    ['Midterm 1', 15, true],
    ['Midterm 2', 15, true],
  ]);
});
it.each(['MIDTERM', 'FINAL_EXAM'] as const)(
  'assigns a single %s its full 20%, without a split prompt',
  (type) => {
    const result = reconcileSyllabusPreview(
      {
        categories: [
          category({
            name: type === 'MIDTERM' ? 'Midterm' : 'Final exam',
            type,
            count: null,
            weight: 20,
          }),
        ],
        items: [],
        warnings: [],
      },
      [],
    );
    expect(result.categories).toHaveLength(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ type, weight: 20, selected: true });
  },
);
it('fills the existing Brightspace exams without creating extra rows', () => {
  const existing = [1, 2].map((n) => ({
    id: String(n),
    name: `Midterm ${n} - Due`,
    type: 'MIDTERM' as const,
    weight: 0,
  }));
  const result = reconcileSyllabusPreview(
    { categories: [category()], items: [], warnings: [] },
    existing,
  );
  expect(result.items.map((i) => [i.existingId, i.weight])).toEqual([
    ['1', 15],
    ['2', 15],
  ]);
});
it('uses scheduled exams, preserves their dates, and keeps explicitly unequal weights', () => {
  const first = { ...item('Midterm 1', 10), date: '2026-10-22' };
  const result = reconcileSyllabusPreview(
    { categories: [category()], items: [first, item('Midterm 2', 20)], warnings: [] },
    [],
  );
  expect(result.items.map((i) => i.weight)).toEqual([10, 20]);
  expect(result.items[0].date).toBe('2026-10-22');
});
it('creates the second exam when only the first is in the calendar, without allocating the whole total to the first', () => {
  const result = reconcileSyllabusPreview({ categories: [category()], items: [], warnings: [] }, [
    { id: 'one', name: 'Midterm', type: 'MIDTERM', weight: 0 },
  ]);
  expect(result.items.map((i) => [i.name, i.existingId, i.weight])).toEqual([
    ['Midterm', 'one', 15],
    ['Midterm 2', '', 15],
  ]);
});
it('preserves an existing individual weight and only fills the remainder', () => {
  const result = reconcileSyllabusPreview({ categories: [category()], items: [], warnings: [] }, [
    { id: 'one', name: 'Midterm 1', type: 'MIDTERM', weight: 10 },
  ]);
  expect(result.items.map((i) => i.weight)).toEqual([null, 20]);
});
it('does not duplicate a standalone item with its category', () => {
  const result = reconcileSyllabusPreview(
    {
      categories: [category({ name: 'Midterm', count: 1, weight: 20 })],
      items: [item('Midterm 1')],
      warnings: [],
    },
    [{ id: 'one', name: 'Midterm', type: 'MIDTERM', weight: 0 }],
  );
  expect(result.items).toHaveLength(1);
  expect(result.items[0]).toMatchObject({ existingId: 'one', weight: 20 });
});
it('keeps labs on the persistent-category flow and does not invent an unknown midterm count', () => {
  const result = reconcileSyllabusPreview(
    {
      categories: [
        category({ count: null }),
        category({ name: 'Labs', type: 'LAB', weight: 10, count: null }),
      ],
      items: [],
      warnings: [],
    },
    [],
  );
  expect(result.categories.map((c) => c.type)).toEqual(['LAB']);
  expect(result.items).toHaveLength(0);
  expect(result.warnings.join(' ')).toContain('exam count is unclear');
});
