export type SchoolKind = 'university' | 'college' | 'cegep';
export type SchoolLms = 'brightspace' | 'canvas' | 'moodle' | 'other';
export type SchoolSource = {
  url: string;
  title: string;
  checked: `${number}-${number}-${number}`;
};

export type SchoolProfile = {
  id: string;
  name: string;
  nameFr?: string;
  province: string;
  kind: SchoolKind;
  letterScale: ReadonlyArray<{ letter: string; min: number; points?: number }> | null;
  roundPercentBeforeLetter: boolean;
  failLabel: string;
  gpa: { max: number; label: string } | null;
  passPercent: number | null;
  credits: { unitLabel: string; unitLabelFr: string; defaultPerCourse: number } | null;
  lms: SchoolLms | null;
  sources: readonly [SchoolSource, ...SchoolSource[]];
  notes?: string;
};
