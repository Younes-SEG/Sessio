import type { SchoolProfile } from './types';

export const schools = [
  {
    id: 'university-of-ottawa',
    name: 'University of Ottawa',
    nameFr: 'Universit\u00e9 d\u2019Ottawa',
    province: 'Ontario',
    kind: 'university',
    letterScale: [
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
    ],
    roundPercentBeforeLetter: false,
    failLabel: 'F',
    gpa: { max: 10, label: 'CGPA' },
    passPercent: 50,
    credits: { unitLabel: 'units', unitLabelFr: 'cr\u00e9dits', defaultPerCourse: 3 },
    lms: 'brightspace',
    sources: [
      {
        url: 'https://www.uottawa.ca/about-us/leadership-governance/policies-regulations/a-3-grading-system',
        title: 'Academic Regulation A-3 - Grading system',
        checked: '2026-11-14',
      },
    ],
    notes:
      'Undergraduate scale. A faculty, graduate program or individual course may publish different rules.',
  },
] as const satisfies ReadonlyArray<SchoolProfile>;

export type SchoolId = (typeof schools)[number]['id'];
const byId = new Map<string, SchoolProfile>(schools.map((school) => [school.id, school]));

export function schoolById(id: string | null | undefined): SchoolProfile | null {
  return id ? byId.get(id) || null : null;
}

export function isSchoolId(value: string): value is SchoolId {
  return byId.has(value);
}

export function schoolName(school: SchoolProfile, language: string) {
  return language === 'fr' && school.nameFr ? school.nameFr : school.name;
}
