/**
 * University of Ottawa undergraduate letter grades (Academic Regulation A-3).
 * Graduate programs and some faculties use different cut-offs; answers that use
 * this scale say so rather than presenting it as universal.
 */
export const UOTTAWA_SCALE = [
  { letter: 'A+', min: 90, points: 10 },
  { letter: 'A', min: 85, points: 9 },
  { letter: 'A-', min: 80, points: 8 },
  { letter: 'B+', min: 75, points: 7 },
  { letter: 'B', min: 70, points: 6 },
  { letter: 'C+', min: 65, points: 5 },
  { letter: 'C', min: 60, points: 4 },
  { letter: 'D+', min: 55, points: 3 },
  { letter: 'D', min: 50, points: 2 },
  { letter: 'E', min: 40, points: 1 },
  { letter: 'F', min: 0, points: 0 },
] as const;

export type LetterGrade = (typeof UOTTAWA_SCALE)[number]['letter'];
export const LETTER_GRADES = UOTTAWA_SCALE.map((g) => g.letter) as [LetterGrade, ...LetterGrade[]];

/**
 * Letter for a percentage using exact cut-offs. Rounding practices vary by
 * course, so targets are never lowered by assuming a professor rounds up.
 */
export function letterFor(percent: number): LetterGrade {
  return (UOTTAWA_SCALE.find((g) => percent >= g.min - 1e-9) ?? UOTTAWA_SCALE.at(-1)!).letter;
}

/** Minimum percentage that earns a letter. */
export function minimumFor(letter: LetterGrade): number {
  return UOTTAWA_SCALE.find((g) => g.letter === letter)!.min;
}
