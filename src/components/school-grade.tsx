'use client';
import Link from 'next/link';
import { useT } from '@/components/language-provider';
import { useWorkspace } from './workspace-provider';
import { letterFor } from '@/lib/grade-scale';
import { schoolById, schoolName, type SchoolProfile } from '@/lib/schools';
import { semesterStanding, type StandingBasis } from '@/lib/semester-standing';

/** The student's selected school profile, or null when none is chosen. */
export function useSchool(): SchoolProfile | null {
  const { data } = useWorkspace();
  return schoolById(data.settings?.schoolId);
}

/** Translated template with {name} placeholders filled after translation. */
function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

function usePercent() {
  const t = useT();
  return (value: number) => {
    const number = value.toLocaleString(t.locale, { maximumFractionDigits: 1 });
    return t.locale === 'fr-CA' ? `${number} %` : `${number}%`;
  };
}

/** The school's letter for a percentage, as a small muted suffix; nothing without a scale. */
export function GradeLetter({
  percent,
  className = '',
}: {
  percent: number | null;
  className?: string;
}) {
  const school = useSchool();
  const letter = percent === null ? null : letterFor(percent, school);
  if (!letter) return null;
  return <span className={`ml-1.5 font-medium ${className}`}>{letter}</span>;
}

/** Pass mark and letter caveat for one course, from the selected school's profile. */
export function SchoolGradeNotes() {
  const t = useT();
  const school = useSchool();
  const pct = usePercent();
  if (!school) return null;
  const notes: string[] = [];
  if (school.passPercent !== null)
    notes.push(
      fill(
        t(
          school.passRules?.length
            ? 'Usual pass mark: {pass}; some programs differ.'
            : 'Pass mark: {pass}.',
        ),
        {
          pass: pct(school.passPercent),
        },
      ),
    );
  if (school.letterScale && school.lettersAreGuidelines)
    notes.push(t('Letters are estimates; your instructor decides.'));
  if (!notes.length) return null;
  return <p className="muted mt-2 text-xs">{notes.join(' ')}</p>;
}

const basisCopy: Record<Exclude<StandingBasis, 'weighted'>, string> = {
  'no-profile': 'Courses count equally; no school is selected, so no letters or GPA are shown.',
  'no-gpa': 'Courses count equally; {school} reports averages, not a GPA.',
  'no-credit-unit': 'Courses count equally because {school} has no standard course weight.',
  'missing-credits': 'Courses count equally. Add credits to every graded course to see your GPA.',
  'missing-points':
    'Courses count equally because {school} doesn’t publish grade points for every letter.',
};

/** Semester average (and GPA when the school defines one), shared with Ask Command. */
export function SemesterStandingCard() {
  const t = useT();
  const { data } = useWorkspace();
  const school = useSchool();
  const pct = usePercent();
  const standing = semesterStanding(data, school);
  if (standing.average === null) return null;
  const name = school ? schoolName(school, t.locale === 'fr-CA' ? 'fr' : 'en') : '';
  const letter = letterFor(standing.average, school);
  const unit = t.locale === 'fr-CA' ? school?.credits?.unitLabelFr : school?.credits?.unitLabel;
  const courses = fill(
    t(standing.graded === 1 ? '{count} course with grades' : '{count} courses with grades'),
    {
      count: String(standing.graded),
    },
  );
  const basis =
    standing.basis === 'weighted'
      ? fill(t('Weighted by {unit}.'), { unit: unit ?? '' })
      : fill(t(basisCopy[standing.basis]), { school: name });
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="semester-standing-title">
      <h2 id="semester-standing-title" className="muted text-sm">
        {t('This term')}
      </h2>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {pct(standing.average)}
          {letter && <span className="ml-2 text-lg font-medium">{letter}</span>}
          <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
            {t('average')}
          </span>
        </p>
        {standing.gpa !== null && school?.gpa && (
          <p className="text-xl font-semibold tabular-nums">
            {standing.gpa.toLocaleString(t.locale, { maximumFractionDigits: 2 })}
            <span className="text-sm font-normal text-[var(--muted-foreground)]">
              {' '}
              / {school.gpa.max.toLocaleString(t.locale)} {school.gpa.label}
            </span>
          </p>
        )}
      </div>
      <p className="muted mt-3 text-xs">
        {basis}{' '}
        {standing.floorApplied &&
          school?.averageFloor !== undefined &&
          `${fill(
            t(
              'Grades below {floor} count as {floor} here, as {school} does; course grades don’t change.',
            ),
            {
              floor: pct(school.averageFloor),
              school: name,
            },
          )} `}
        {school?.letterScale &&
          school.lettersAreGuidelines &&
          `${t('Letters are estimates; your instructor decides.')} `}
        {fill(t('{courses}, using only work graded so far.'), { courses })}{' '}
        {standing.basis === 'no-profile' && (
          <Link className="underline" href="/settings/profile">
            {t('Choose your school')}
          </Link>
        )}
      </p>
    </section>
  );
}
