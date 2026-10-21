import type { SyllabusPreview, SyllabusCategory } from './syllabus-result';
import type { SyllabusSuggestion } from './syllabus';

type Existing = { id: string; name: string; type: SyllabusSuggestion['type']; weight: number };
const isExam = (type: string) => type === 'MIDTERM' || type === 'FINAL_EXAM';

/** Exam totals become ordinary review rows, not an equal-split setup question. */
export function prepareExamWeights(
  preview: SyllabusPreview,
  existing: readonly Existing[],
  match: (item: SyllabusSuggestion, existing: readonly Existing[]) => readonly Existing[],
): SyllabusPreview {
  const items = preview.items.map((item) => ({ ...item, warnings: [...item.warnings] }));
  const warnings = [...preview.warnings];
  const categories: SyllabusCategory[] = [];
  for (const category of preview.categories || []) {
    if (!isExam(category.type)) {
      categories.push(category);
      continue;
    }
    const otherGroups = (preview.categories || []).filter((c) => c.type === category.type);
    if (otherGroups.length > 1) {
      // Separate exam groups can have different weights; retain their names and explicit totals.
      const row = items.find(
        (item) => item.type === category.type && item.name === category.name && !item.grouped,
      );
      if (row) {
        if (row.weight === null && category.count === 1) row.weight = category.weight;
        continue;
      }
      items.push({
        name: category.name,
        type: category.type,
        weight: category.count === 1 ? category.weight : null,
        date: '',
        time: '',
        source: category.source,
        page: category.page,
        grouped: false,
        warnings: [
          `${category.name}: ${category.weight}% combined. Separate exam groups need their individual weights checked.`,
        ],
      });
      continue;
    }
    // Remove a legacy aggregate placeholder, which must not become a second exam.
    for (let i = items.length - 1; i >= 0; i--) {
      if (
        items[i].type === category.type &&
        (items[i].grouped ||
          (category.count !== 1 && category.count !== null && items[i].name === category.name))
      )
        items.splice(i, 1);
    }
    const members = items.filter((item) => item.type === category.type && !item.grouped);
    const current = existing.filter((a) => a.type === category.type);
    if (category.count === 1 && members.length === 1 && current.length === 1)
      members[0].name = current[0].name;
    const matched = new Set(members.flatMap((item) => match(item, current).map((a) => a.id)));
    const missing = current.filter((a) => !matched.has(a.id));
    const count =
      category.count ??
      (members.length + missing.length ||
        (category.type === 'FINAL_EXAM' ||
        !/\b(midterms|exams|examens|intras)\b/i.test(category.name)
          ? 1
          : 0));
    if (!count || members.length + missing.length > count) {
      warnings.push(
        `${category.name}: ${category.weight}% combined. The exam count is unclear or conflicts with existing assessments; check the individual weights.`,
      );
      continue;
    }
    const makeRow = (name: string): SyllabusSuggestion => ({
      name,
      type: category.type,
      weight: null,
      date: '',
      time: '',
      source: category.source,
      page: category.page,
      grouped: false,
      warnings: [],
    });
    for (const assessment of missing) {
      const row = makeRow(assessment.name);
      members.push(row);
      items.push(row);
    }
    while (members.length < count) {
      let index = members.every((m) => /\b\d+\b/.test(m.name)) ? 1 : members.length + 1;
      while (members.some((m) => new RegExp(`\\b${index}\\b`).test(m.name))) index++;
      const row = makeRow(
        count === 1
          ? category.name
          : `${category.type === 'MIDTERM' ? 'Midterm' : 'Final exam'} ${index}`,
      );
      members.push(row);
      items.push(row);
    }
    const known = members.map((item) => {
      const matches = match(item, current);
      return matches.length === 1 && matches[0].weight > 0 ? matches[0].weight : item.weight;
    });
    const remaining =
      category.weight - known.reduce<number>((sum, weight) => sum + (weight ?? 0), 0);
    const unknown = members.filter((_, index) => known[index] === null);
    if (remaining < -0.000001 || (!unknown.length && Math.abs(remaining) > 0.000001)) {
      warnings.push(
        `${category.name}: individual weights do not match the ${category.weight}% total. Existing and explicitly stated weights were kept.`,
      );
      continue;
    }
    // Preserve explicit unequal weights. Only the unspecified remainder is divided.
    for (const row of unknown) {
      row.weight = Math.max(0, remaining) / unknown.length;
      row.warnings = row.warnings.filter((w) => !w.startsWith('No definite weight.'));
      row.warnings.push(
        count === 1
          ? 'Exam weight filled from the syllabus total.'
          : 'Unspecified exam weights were split equally from the remaining exam total. You can edit these weights before saving.',
      );
    }
  }
  return { ...preview, categories, items, warnings };
}
