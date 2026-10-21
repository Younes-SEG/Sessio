import { assessmentNameKey, type SyllabusSuggestion } from './syllabus';
import type { AssessmentType } from './types';
import type { SyllabusCategory, SyllabusPreview } from './syllabus-result';
import { prepareExamWeights } from './syllabus-exam-weights';

type Named = { name: string; type: AssessmentType };
export type ExistingAssessment = Named & { id: string; weight: number };

export function assessmentIdentity(item: Named) {
  const name = assessmentNameKey(item.name)
    .replace(/\b[a-z]{2,4}\s*\d{4}\b/g, '')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/\b(due|deadline|submission|submit|remise|echeance|date limite)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let type = item.type;
  if (/\b(final exam|examen final|examens finaux)\b/.test(name) || name === 'final')
    type = 'FINAL_EXAM';
  else if (/\b(midterm|mid term|mi session|intra)\b/.test(name)) type = 'MIDTERM';
  else if (/\b(lab\w*|laboratoire\w*|tp)\b/.test(name)) type = 'LAB';
  else if (/\b(quiz\w*|questionnaire\w*)\b/.test(name)) type = 'QUIZ';
  else if (/\b(assignment\w*|devoir\w*)\b/.test(name)) type = 'ASSIGNMENT';
  else if (/\b(project\w*|projet\w*|deliverable\w*|livrable\w*)\b/.test(name)) type = 'PROJECT';
  const numbers = [...new Set((name.match(/\b\d{1,3}\b/g) || []).map(Number))].join(':');
  const part = /\b(?:part|partie|phase)\s+([a-z]|\d+)\b/.exec(name)?.[1] || '';
  return { name, type, numbers, part };
}

/** Only call with assessments from the selected course. Dates alone never establish identity. */
export function matchSyllabusAssessment(item: Named, existing: readonly ExistingAssessment[]) {
  const key = assessmentIdentity(item);
  const sameType = existing.filter((a) => assessmentIdentity(a).type === key.type);
  const exact = sameType.filter((a) => assessmentIdentity(a).name === key.name);
  if (exact.length) return exact;
  if (key.numbers)
    return sameType.filter((a) => {
      const other = assessmentIdentity(a);
      return other.numbers === key.numbers && other.part === key.part;
    });
  if (key.type === 'MIDTERM' || key.type === 'FINAL_EXAM') return sameType;
  return [];
}

export function genericCategory(item: Named) {
  return /^(lab(?:oratory)?(?:oratoire)?s?(?: exercises?)?|exercices? (?:de )?laboratoire|assignments?|devoirs?|projects?|projets?|project deliverables?|livrables?|quizzes|questionnaires)$/.test(
    assessmentIdentity(item).name,
  );
}

export function reconcileSyllabusPreview(
  result: SyllabusPreview,
  existing: readonly ExistingAssessment[],
) {
  result = prepareExamWeights(result, existing, matchSyllabusAssessment);
  const categories: SyllabusCategory[] = [...(result.categories || [])];
  const items: Array<SyllabusSuggestion & { existingId: string; selected: boolean }> = [];
  const claimed = new Set<string>();
  for (const item of result.items) {
    const identity = assessmentIdentity(item);
    const category = categories.find(
      (c) =>
        assessmentIdentity(c).type === identity.type &&
        (genericCategory(item) || assessmentNameKey(c.name) === assessmentNameKey(item.name)),
    );
    // A category subtotal must enrich its members, never become another assignment.
    if (
      item.grouped ||
      category ||
      (genericCategory(item) && existing.some((a) => assessmentIdentity(a).type === identity.type))
    ) {
      if (
        !category &&
        item.weight &&
        !categories.some((c) => assessmentNameKey(c.name) === assessmentNameKey(item.name))
      )
        categories.push({
          name: item.name,
          type: identity.type,
          weight: item.weight,
          count: null,
          equalWeights: false,
          source: item.source,
          page: item.page ?? null,
        });
      if (category || item.weight) continue;
      // Unweighted grouped rows can remain as unselected evidence, never automatic additions.
    }
    const matches = matchSyllabusAssessment(item, existing);
    const match = matches.length === 1 && !claimed.has(matches[0].id) ? matches[0] : undefined;
    if (match) claimed.add(match.id);
    items.push({
      ...item,
      existingId: match?.id || '',
      selected: !item.grouped && (matches.length === 0 || Boolean(match)),
      weight: match?.weight ? null : item.weight,
      // Calendar dates are more specific and may have changed since the syllabus.
      ...(match ? { date: '', time: '', name: match.name, type: match.type } : {}),
      warnings: [
        ...item.warnings,
        ...(match
          ? [
              'Matched to an existing assessment. Its current date and any existing weight are kept.',
            ]
          : []),
        ...(matches.length && !match
          ? [
              'More than one possible match, or another row already uses this assessment. Choose a match before including it.',
            ]
          : []),
      ],
    });
  }
  return { items, categories, warnings: result.warnings };
}

/** Keep known weights; divide only the remainder, after the user confirms the members/equality. */
export function allocateCategoryWeight(total: number, members: readonly ExistingAssessment[]) {
  const missing = members.filter((a) => a.weight === 0);
  const remainder = total - members.reduce((sum, a) => sum + a.weight, 0);
  if (
    !missing.length ||
    remainder <= 0 ||
    new Set(members.map((a) => a.id)).size !== members.length
  )
    return null;
  // Four decimals keep the sum exact without assigning all rounding error to every member.
  const units = Math.round(remainder * 10000);
  const base = Math.floor(units / missing.length);
  return missing.map((a, i) => ({
    id: a.id,
    weight: (base + (i < units % missing.length ? 1 : 0)) / 10000,
  }));
}
