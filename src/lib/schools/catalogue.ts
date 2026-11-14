import { ontarioSchools } from './ontario';
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
    // A-3.2: the final course grade is rounded half up on the first decimal (69.5 -> 70 = B).
    roundPercentBeforeLetter: true,
    failLabel: 'F',
    gpa: { max: 10, label: 'CGPA' },
    passPercent: 50,
    passRules: [
      {
        label: 'Faculty of Education, MED/CLI, and PHA',
        labelFr: 'Faculté d’éducation, MED/CLI et PHA',
        passPercent: 60,
      },
      { label: 'Nursing (NSG)', labelFr: 'Sciences infirmières (NSG)', passPercent: 65 },
    ],
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
  {
    id: 'university-of-toronto',
    name: 'University of Toronto',
    province: 'Ontario',
    kind: 'university',
    letterScale: [
      { letter: 'A+', min: 90, points: 4 },
      { letter: 'A', min: 85, points: 4 },
      { letter: 'A-', min: 80, points: 3.7 },
      { letter: 'B+', min: 77, points: 3.3 },
      { letter: 'B', min: 73, points: 3 },
      { letter: 'B-', min: 70, points: 2.7 },
      { letter: 'C+', min: 67, points: 2.3 },
      { letter: 'C', min: 63, points: 2 },
      { letter: 'C-', min: 60, points: 1.7 },
      { letter: 'D+', min: 57, points: 1.3 },
      { letter: 'D', min: 53, points: 1 },
      { letter: 'D-', min: 50, points: 0.7 },
      { letter: 'F', min: 0, points: 0 },
    ],
    // Divisional handbooks (UTM, Arts & Science): no policy or practice of automatic rounding up.
    roundPercentBeforeLetter: false,
    failLabel: 'F',
    gpa: { max: 4, label: 'GPA' },
    passPercent: 50,
    credits: { unitLabel: 'credits', unitLabelFr: 'crédits', defaultPerCourse: 0.5 },
    lms: 'canvas',
    sources: [
      {
        url: 'https://governingcouncil.utoronto.ca/secretariat/policies/grading-practices-policy-university-assessment-and',
        title: 'Grading Practices Policy, University Assessment and',
        checked: '2026-11-14',
      },
    ],
    notes:
      'Undergraduate scale. Final marks are submitted as whole percentages; some courses use CR/NCR or H/P/F instead.',
  },
  ...ontarioSchools,
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
