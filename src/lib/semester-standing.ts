import { calculateGrades, type GradeSummary } from './grades';
import { readGradingRules } from './grading-rules';
import { pointsFor } from './grade-scale';
import type { SchoolProfile } from './schools';
import type { Workspace } from './types';

type StandingWorkspace = Pick<Workspace, 'courses' | 'semesters' | 'assessments'>;
type Course = Workspace['courses'][number];

/** Why the overview is (or isn't) credit-weighted with a GPA; drives the explanation shown. */
export type StandingBasis =
  'weighted' | 'no-profile' | 'no-gpa' | 'no-credit-unit' | 'missing-credits' | 'missing-points';

export type SemesterStanding = {
  rows: { course: Course; summary: GradeSummary }[];
  /** Number of courses with at least one recorded grade. */
  graded: number;
  average: number | null;
  gpa: number | null;
  credits: number;
  basis: StandingBasis;
  /** True when at least one course grade was raised to the school's averaging floor. */
  floorApplied: boolean;
};

/** Courses for "this semester": the active term, otherwise every current course. */
export function semesterCourses(data: StandingWorkspace) {
  const active = new Set(data.semesters.filter((s) => s.isActive).map((s) => s.id));
  const current = data.courses.filter((c) => !c.archived);
  const inActive = current.filter((c) => active.has(c.semesterId));
  return inActive.length ? inActive : current;
}

export function courseSummary(data: Pick<Workspace, 'assessments'>, course: Course) {
  return calculateGrades(
    data.assessments.filter((a) => a.courseId === course.id),
    readGradingRules(course.gradingRules),
  );
}

/**
 * The multi-course semester overview shared by the Grades page and Ask Sessio. A school's
 * averaging floor applies here only; each course keeps its own grade. The GPA is credit-weighted
 * only when the school defines a GPA scale, a credit unit, points for every grade, and every
 * graded course has credits; otherwise courses count equally and no GPA is shown.
 */
export function semesterStanding(
  data: StandingWorkspace,
  profile: SchoolProfile | null,
): SemesterStanding {
  const rows = semesterCourses(data).map((course) => ({
    course,
    summary: courseSummary(data, course),
  }));
  const graded = rows.filter((row) => row.summary.currentGrade !== null);
  const floor = profile?.averageFloor;
  const grades = graded.map(({ summary }) =>
    floor === undefined ? summary.currentGrade! : Math.max(summary.currentGrade!, floor),
  );
  const floorApplied =
    floor !== undefined && graded.some(({ summary }) => summary.currentGrade! < floor);
  const creditsReady = graded.every(
    ({ course }) => Number.isFinite(course.credits) && Number(course.credits) > 0,
  );
  const points = grades.map((grade) => pointsFor(grade, profile));
  const basis: StandingBasis = !profile
    ? 'no-profile'
    : !profile.gpa
      ? 'no-gpa'
      : !profile.credits
        ? 'no-credit-unit'
        : !creditsReady
          ? 'missing-credits'
          : points.some((value) => value === null)
            ? 'missing-points'
            : 'weighted';
  if (!graded.length)
    return { rows, graded: 0, average: null, gpa: null, credits: 0, basis, floorApplied };
  if (basis !== 'weighted')
    return {
      rows,
      graded: graded.length,
      average: grades.reduce((sum, grade) => sum + grade, 0) / graded.length,
      gpa: null,
      credits: 0,
      basis,
      floorApplied,
    };
  const weights = graded.map(({ course }) => Number(course.credits));
  const credits = weights.reduce((sum, weight) => sum + weight, 0);
  return {
    rows,
    graded: graded.length,
    average: grades.reduce((sum, grade, index) => sum + grade * weights[index]!, 0) / credits,
    gpa: points.reduce((sum, value, index) => sum! + value! * weights[index]!, 0)! / credits,
    credits,
    basis,
    floorApplied,
  };
}
