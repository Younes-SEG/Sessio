import { assessmentIdentity, matchSyllabusAssessment } from './syllabus-matching';
import type { AssessmentType } from './types';

/** One graded line read from a pasted grades page (Brightspace and similar tables). */
export interface PastedGrade {
  name: string;
  category: string;
  score: number;
  maxScore: number;
  dropped: boolean;
}

const FRACTION = /^\s*(-|–|—|\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*$/;
const num = (s: string) => Number(s.replace(',', '.'));
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const DROPPED = /\b(dropped|abandonn[ée]e?s?)(?![a-z])\s*!?/gi;
const stripMarks = (s: string) => s.replace(DROPPED, '').trim();
const isFraction = (s: string) => FRACTION.test(stripMarks(s));

/** Splits plain-text clipboard content (tab-separated rows) into cells. */
export function cellsFromText(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split('\t').map(clean))
    .filter((cells) => cells.some(Boolean));
}

/** Reads graded rows. Only explicit "score / max" points count; comments are ignored. */
export function readPastedGrades(rows: string[][]): PastedGrade[] {
  // Headers can span columns, so locate Points from the data: in rows that show both
  // points and weight, Points is the first fraction and always sits in the same column.
  const counts = new Map<number, number>();
  for (const cells of rows) {
    const idx = cells.flatMap((c, i) => (isFraction(c) ? [i] : []));
    if (idx.length >= 2) counts.set(idx[0], (counts.get(idx[0]) || 0) + 1);
  }
  const pointsCol = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;
  if (pointsCol < 0) return [];
  const out: PastedGrade[] = [];
  let category = '';
  for (const cells of rows) {
    const at = cells.findIndex((c) => stripMarks(c) && !isFraction(c));
    const name = cells[at];
    if (!name || name.length > 200 || at >= pointsCol) continue;
    const points = isFraction(cells[pointsCol] || '') ? cells[pointsCol] : null;
    if (!points) {
      // An unindented titled row with only a total (no points) is a category heading.
      if (at === 0 && cells.some(isFraction)) category = clean(name);
      continue;
    }
    const [, scoreText, maxText] = FRACTION.exec(stripMarks(points))!;
    const maxScore = num(maxText);
    if (/^[-–—]$/.test(scoreText) || !(maxScore > 0)) continue;
    const score = num(scoreText);
    if (!Number.isFinite(score) || score < 0 || score > maxScore * 2) continue;
    out.push({
      name: clean(name),
      category,
      score,
      maxScore,
      dropped: cells.some((c) => new RegExp(DROPPED.source, 'i').test(c)),
    });
  }
  return out;
}

type CourseAssessment = {
  id: string;
  name: string;
  type: AssessmentType;
  weight: number;
  score: number | null;
  maxScore: number;
};
export type PasteAction = 'update' | 'skip';
export interface PastePlanRow {
  grade: PastedGrade;
  assessmentId: string;
  action: PasteAction;
  note: 'new' | 'same' | 'different' | 'unmatched' | 'duplicate';
}

/** Matches pasted grades to this course's assessments. Existing different scores are never
 * replaced by default; the student opts in per row. */
export function planPastedGrades(
  grades: readonly PastedGrade[],
  assessments: readonly CourseAssessment[],
): PastePlanRow[] {
  const used = new Set<string>();
  return grades.map((grade) => {
    const type = assessmentIdentity({ name: grade.category || grade.name, type: 'OTHER' }).type;
    const matches = matchSyllabusAssessment({ name: grade.name, type }, assessments);
    const match =
      matches.length === 1 ? assessments.find((a) => a.id === matches[0].id) : undefined;
    if (!match) return { grade, assessmentId: '', action: 'skip', note: 'unmatched' };
    if (used.has(match.id))
      return { grade, assessmentId: match.id, action: 'skip', note: 'duplicate' };
    used.add(match.id);
    return describe(grade, match);
  });
}

export function describe(grade: PastedGrade, a: CourseAssessment): PastePlanRow {
  if (a.score === null) return { grade, assessmentId: a.id, action: 'update', note: 'new' };
  const same = Math.abs(a.score / a.maxScore - grade.score / grade.maxScore) < 1e-6;
  return { grade, assessmentId: a.id, action: 'skip', note: same ? 'same' : 'different' };
}
