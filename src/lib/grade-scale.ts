import { schoolById } from './schools';
import type { SchoolProfile } from './schools';

export type LetterScale = NonNullable<SchoolProfile['letterScale']>;

/** Compatibility export whose source of truth is the school catalogue. */
export const UOTTAWA_SCALE = schoolById('university-of-ottawa')!.letterScale!;

/**
 * Letter for a percentage using the selected school's published policy.
 * Schools that round apply it before both the pass mark and the letter cut-offs
 * (uOttawa: 49.5 rounds to 50 and passes). When the fail label is itself part of
 * the letter scale (uOttawa's E and F), those letters already describe failing
 * grades. Otherwise (La Cité's EC) the fail label replaces any letter below the pass mark.
 */
export function letterFor(percent: number, profile: SchoolProfile | null): string | null {
  if (!profile?.letterScale || !Number.isFinite(percent)) return null;
  if (replacedByFailLabel(percent, profile)) return profile.failLabel;
  return matchedGrade(percent, profile)?.letter ?? null;
}

/** Minimum percentage for a profile letter, or null when the profile does not define it. */
export function minimumFor(
  letter: string,
  profile: SchoolProfile | null,
): { letter: string; min: number; published: number } | null {
  if (!profile?.letterScale) return null;
  const normalized = letter.trim().toLocaleUpperCase('en-CA');
  const grade = profile.letterScale.find(
    (entry) => entry.letter.toLocaleUpperCase('en-CA') === normalized,
  );
  if (!grade) return null;
  // Letters below the pass mark are real failing grades only when the fail label is part of
  // the scale (uOttawa's E). Otherwise (La Cité) they are recorded as the fail label, so a
  // target for them still needs the pass mark.
  const failLetterInScale = profile.letterScale.some((entry) =>
    sameLetter(entry.letter, profile.failLabel),
  );
  const failing =
    sameLetter(grade.letter, profile.failLabel) ||
    (failLetterInScale && profile.passPercent !== null && grade.min < profile.passPercent);
  const floor = failing ? 0 : (profile.passPercent ?? 0);
  return {
    letter: grade.letter,
    // Lowest unrounded percentage that earns the letter; used for the math.
    min: Math.max(0, lowestQualifying(floor, grade.min, profile)),
    // The cut-off the school publishes; used when showing the target to the student.
    published: Math.max(floor, grade.min),
  };
}

/** Lowest unrounded percentage that the school records at or above both cut-offs. */
function lowestQualifying(floor: number, letterMin: number, profile: SchoolProfile) {
  const cutOff = Math.max(floor, letterMin);
  return profile.roundPercentBeforeLetter ? cutOff - 0.5 : cutOff;
}

/** Lowest unrounded percentage that passes at this school, or null when it has no pass mark. */
export function passMinimum(profile: SchoolProfile | null): number | null {
  if (profile?.passPercent === null || profile?.passPercent === undefined) return null;
  return lowestQualifying(profile.passPercent, 0, profile);
}

/** Grade points matching a percentage, when the matched profile entry provides them. */
export function pointsFor(percent: number, profile: SchoolProfile | null): number | null {
  if (!profile?.letterScale || !Number.isFinite(percent)) return null;
  // A grade replaced by a non-scale fail label (e.g. EC) carries no points.
  if (replacedByFailLabel(percent, profile)) return 0;
  return matchedGrade(percent, profile)?.points ?? null;
}

/** The percentage the school actually grades on: rounded half up when its policy says so. */
function effectivePercent(percent: number, profile: SchoolProfile) {
  return profile.roundPercentBeforeLetter ? Math.floor(percent + 0.5 + 1e-9) : percent;
}

const sameLetter = (a: string, b: string) =>
  a.toLocaleUpperCase('en-CA') === b.toLocaleUpperCase('en-CA');

function replacedByFailLabel(percent: number, profile: SchoolProfile) {
  if (profile.passPercent === null) return false;
  if (effectivePercent(percent, profile) >= profile.passPercent - 1e-9) return false;
  return !profile.letterScale?.some((grade) => sameLetter(grade.letter, profile.failLabel));
}

function matchedGrade(percent: number, profile: SchoolProfile) {
  const value = effectivePercent(percent, profile);
  return (
    profile.letterScale?.find((grade) => value >= grade.min - 1e-9) ?? profile.letterScale?.at(-1)
  );
}
