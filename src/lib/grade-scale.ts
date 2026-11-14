import { schoolById } from './schools';
import type { SchoolProfile } from './schools';

export type LetterScale = NonNullable<SchoolProfile['letterScale']>;

/** Compatibility export whose source of truth is the school catalogue. */
export const UOTTAWA_SCALE = schoolById('university-of-ottawa')!.letterScale!;

/**
 * Letter for a percentage using the selected school's published policy.
 * A fail label applies below the exact pass mark; schools that round do so only
 * when choosing among the letter-scale cut-offs.
 */
export function letterFor(percent: number, profile: SchoolProfile | null): string | null {
  if (!profile?.letterScale || !Number.isFinite(percent)) return null;
  if (profile.passPercent !== null && percent < profile.passPercent - 1e-9)
    return profile.failLabel;
  return matchedGrade(percent, profile)?.letter ?? null;
}

/** Minimum percentage for a profile letter, or null when the profile does not define it. */
export function minimumFor(
  letter: string,
  profile: SchoolProfile | null,
): { letter: string; min: number } | null {
  if (!profile?.letterScale) return null;
  const normalized = letter.trim().toLocaleUpperCase('en-CA');
  const grade = profile.letterScale.find(
    (entry) => entry.letter.toLocaleUpperCase('en-CA') === normalized,
  );
  if (!grade) return null;
  const roundedMinimum = profile.roundPercentBeforeLetter ? grade.min - 0.5 : grade.min;
  const isFailure =
    grade.letter.toLocaleUpperCase('en-CA') === profile.failLabel.toLocaleUpperCase('en-CA');
  const passMinimum = isFailure ? 0 : (profile.passPercent ?? 0);
  return { letter: grade.letter, min: Math.max(0, passMinimum, roundedMinimum) };
}

/** Grade points matching a percentage, when the matched profile entry provides them. */
export function pointsFor(percent: number, profile: SchoolProfile | null): number | null {
  if (!profile?.letterScale || !Number.isFinite(percent)) return null;
  if (profile.passPercent !== null && percent < profile.passPercent - 1e-9) {
    const failure = profile.letterScale.find(
      (entry) =>
        entry.letter.toLocaleUpperCase('en-CA') === profile.failLabel.toLocaleUpperCase('en-CA'),
    );
    return (failure ?? profile.letterScale.at(-1))?.points ?? null;
  }
  return matchedGrade(percent, profile)?.points ?? null;
}

function matchedGrade(percent: number, profile: SchoolProfile) {
  const value = profile.roundPercentBeforeLetter ? Math.floor(percent + 0.5 + 1e-9) : percent;
  return (
    profile.letterScale?.find((grade) => value >= grade.min - 1e-9) ?? profile.letterScale?.at(-1)
  );
}
