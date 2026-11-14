import { schoolById } from './schools';
import type { SchoolProfile } from './schools';

export type LetterScale = NonNullable<SchoolProfile['letterScale']>;

/** Compatibility export whose source of truth is the school catalogue. */
export const UOTTAWA_SCALE = schoolById('university-of-ottawa')!.letterScale!;

/**
 * Letter for a percentage using exact profile cut-offs. Rounding practices vary
 * by course, so targets are never lowered by assuming a professor rounds up.
 */
export function letterFor(percent: number, scale: SchoolProfile['letterScale']): string | null {
  if (!scale || !Number.isFinite(percent)) return null;
  return (scale.find((grade) => percent >= grade.min - 1e-9) ?? scale.at(-1))?.letter ?? null;
}

/** Minimum percentage for a profile letter, or null when the profile does not define it. */
export function minimumFor(
  letter: string,
  scale: SchoolProfile['letterScale'],
): { letter: string; min: number } | null {
  if (!scale) return null;
  const normalized = letter.trim().toLocaleUpperCase('en-CA');
  const grade = scale.find((entry) => entry.letter.toLocaleUpperCase('en-CA') === normalized);
  return grade ? { letter: grade.letter, min: grade.min } : null;
}

/** Grade points matching a percentage, when the matched profile entry provides them. */
export function pointsFor(percent: number, scale: SchoolProfile['letterScale']): number | null {
  if (!scale) return null;
  const grade = scale.find((entry) => percent >= entry.min - 1e-9) ?? scale.at(-1);
  return grade?.points ?? null;
}
