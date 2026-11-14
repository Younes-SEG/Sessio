import { describe, expect, it } from 'vitest';
import { semesterStanding } from '../src/lib/semester-standing';
import { schoolById, type SchoolProfile } from '../src/lib/schools';
import type { Workspace } from '../src/lib/types';

type Data = Pick<Workspace, 'courses' | 'semesters' | 'assessments'>;
const term = {
  id: 'term',
  name: 'Fall 2026',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  isActive: true,
};
const course = (id: string, credits: number | null = null) =>
  ({
    id,
    code: id.toUpperCase(),
    name: id,
    semesterId: 'term',
    archived: false,
    notes: '',
    color: '#777777',
    instructor: null,
    credits,
  }) as Data['courses'][number];
/** One fully weighted, graded assessment, so the course grade equals `percent`. */
const graded = (courseId: string, percent: number) =>
  ({
    id: `${courseId}-a`,
    courseId,
    name: 'Final',
    type: 'FINAL_EXAM',
    weight: 100,
    score: percent,
    maxScore: 100,
    dueDate: null,
    status: 'GRADED',
    notes: '',
  }) as Data['assessments'][number];
const data = (grades: Record<string, number>, credits: number | null = null): Data => ({
  semesters: [term],
  courses: Object.keys(grades).map((id) => course(id, credits)),
  assessments: Object.entries(grades).map(([id, percent]) => graded(id, percent)),
});
const school = (id: string) => schoolById(id) as SchoolProfile;

describe('semester standing', () => {
  it('applies the averaging floor to the overview only', () => {
    const result = semesterStanding(data({ a: 20, b: 80 }), school('western-university'));
    // Western: below 40 counts as 40 -> (40 + 80) / 2.
    expect(result.average).toBe(60);
    expect(result.floorApplied).toBe(true);
    expect(result.rows.find((row) => row.course.id === 'a')?.summary.currentGrade).toBe(20);
  });

  it('weights the GPA by credits when the school defines points and a unit', () => {
    const uottawa = school('university-of-ottawa');
    const result = semesterStanding(data({ a: 92, b: 72 }, 3), uottawa);
    expect(result.basis).toBe('weighted');
    expect(result.credits).toBe(6);
    expect(result.average).toBe(82);
    // A+ (10) and B (6) on uOttawa's 10-point scale.
    expect(result.gpa).toBe(8);
  });

  it('falls back to an equal-weight average and says why', () => {
    expect(semesterStanding(data({ a: 70 }), null).basis).toBe('no-profile');
    expect(semesterStanding(data({ a: 70 }), school('western-university')).basis).toBe('no-gpa');
    const missing = semesterStanding(data({ a: 70, b: 90 }), school('university-of-ottawa'));
    expect(missing.basis).toBe('missing-credits');
    expect(missing.gpa).toBeNull();
    expect(missing.average).toBe(80);
  });

  it('has no average before any grade is recorded', () => {
    const empty: Data = { semesters: [term], courses: [course('a')], assessments: [] };
    expect(semesterStanding(empty, null)).toMatchObject({ average: null, graded: 0 });
  });
});
