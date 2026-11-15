import { gradingRuleSchema, interpretGradingNote, type GradingRule } from './grading-rules';
import type { SyllabusCategory } from './syllabus-result';
import type { AssessmentType } from './types';

type ReviewAssessment = { id: string; type?: AssessmentType; weight: number };
type NoteSource = { source: string; warnings: readonly string[] };

export interface SyllabusBestOfSuggestion {
  key: string;
  keep: number;
  count: number;
  type: AssessmentType;
  weight: number;
  assessmentIds: string[];
  source: string;
}

function sameInterpretation(
  note: string,
  s: { keep: number; count: number; type: AssessmentType },
) {
  const parsed = interpretGradingNote(note);
  return parsed?.keep === s.keep && parsed.count === s.count && parsed.type === s.type;
}

/** Turns reader evidence into review-only best-of proposals. All wording is parsed by
 * interpretGradingNote; weights come from the category total or identical item weights,
 * never from a second prose parser. Anything ambiguous produces no suggestion. */
export function detectSyllabusBestOfSuggestions({
  categories,
  items,
  warnings,
  assessments,
  rules,
}: {
  categories: readonly SyllabusCategory[];
  items: readonly NoteSource[];
  warnings: readonly string[];
  assessments: readonly ReviewAssessment[];
  rules: readonly GradingRule[];
}): SyllabusBestOfSuggestion[] {
  const notes = [
    ...categories.map((c) => c.source),
    ...items.flatMap((i) => [i.source, ...i.warnings]),
    ...warnings,
  ]
    .map((n) => n.trim())
    .filter(Boolean);
  const found = new Map<
    string,
    { keep: number; count: number; type: AssessmentType; source: string }
  >();
  for (const note of notes) {
    const parsed = interpretGradingNote(note);
    if (!parsed) continue;
    const key = `${parsed.type}:${parsed.keep}:${parsed.count}`;
    if (!found.has(key)) found.set(key, { ...parsed, source: note });
  }
  // Two different readings for one type (e.g. best 5 of 6 and best 4 of 6) are ambiguous.
  const perType = new Map<AssessmentType, number>();
  for (const s of found.values()) perType.set(s.type, (perType.get(s.type) || 0) + 1);
  const covered = new Set(rules.flatMap((r) => (r.mode === 'equal' ? [] : r.assessmentIds)));
  const equalTypes = new Set(rules.filter((r) => r.mode === 'equal').map((r) => r.assessmentType));

  return [...found.values()].flatMap((s) => {
    if (perType.get(s.type) !== 1 || equalTypes.has(s.type)) return [];
    const members = assessments.filter((a) => a.type === s.type);
    if (members.length !== s.count || members.some((m) => covered.has(m.id))) return [];
    const pool = categories.filter(
      (c) => c.type === s.type && (c.count === null || c.count === s.count),
    );
    const evidenced = pool.filter((c) => sameInterpretation(c.source, s));
    const weights = [...new Set((evidenced.length ? evidenced : pool).map((c) => c.weight))];
    let weight = weights.length === 1 ? weights[0] : null;
    if (weight === null && pool.length === 0) {
      const each = [...new Set(members.map((m) => m.weight))];
      if (each.length === 1 && each[0] > 0) weight = Number((each[0] * s.keep).toFixed(4));
    }
    if (weight === null) return [];
    const assessmentIds = members.map((m) => m.id);
    const candidate: SyllabusBestOfSuggestion = {
      key: `${s.type}:${s.keep}:${s.count}:${weight}:${[...assessmentIds].sort().join(',')}`,
      ...s,
      weight,
      assessmentIds,
    };
    return gradingRuleFromSyllabusSuggestion(candidate, 'check', 'check') ? [candidate] : [];
  });
}

export function gradingRuleFromSyllabusSuggestion(
  s: SyllabusBestOfSuggestion,
  id: string,
  name: string,
): GradingRule | null {
  const result = gradingRuleSchema.safeParse({
    id,
    name,
    keep: s.keep,
    weight: s.weight,
    assessmentIds: s.assessmentIds,
    source: s.source.slice(0, 2000),
  });
  return result.success ? result.data : null;
}
