'use client';
import { T, useT } from '@/components/language-provider';

import { useState } from 'react';
import Link from 'next/link';
import { GradeCoursePicker } from './grade-course-picker';
import { GraduationCap, Plus } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { calculateGrades } from '@/lib/grades';
import { resolveGradingRules } from '@/lib/grading-rules';
import { EmailUpdatesLink } from './email-updates';
import { GradeGroups } from './grade-groups';
import { GradeList } from './grade-list';
import { GradeLetter, SemesterStandingCard } from './school-grade';

export function GradesView() {
  const t = useT();
  const { data: workspace, openEditor } = useWorkspace();
  const [courseId, setCourseId] = useState('');
  const [search, setSearch] = useState('');
  const data = workspace;
  const [view, setView] = useState('all');
  const courses = data.courses;
  const activeTerm = data.semesters.find((term) => term.isActive)?.id;
  const defaultCourse =
    courses.find(
      (course) => !course.archived && (!activeTerm || course.semesterId === activeTerm),
    ) || courses.find((course) => !course.archived);
  const selectedCourseId = courses.some((course) => course.id === courseId)
    ? courseId
    : defaultCourse?.id || '';
  const available = data.assessments.filter(
    (assessment) =>
      courses.some((course) => course.id === assessment.courseId) &&
      assessment.courseId === selectedCourseId,
  );
  const awaiting = available.filter((a) => a.status === 'SUBMITTED').length;
  const recorded = available.filter((a) => a.status === 'GRADED').length;
  const visible = available.filter(
    (a) =>
      (view === 'all' ||
        (view === 'awaiting' ? a.status === 'SUBMITTED' : a.status === 'GRADED')) &&
      a.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <header data-tour="grades" className="page-header">
        <div>
          <p className="eyebrow mb-2">
            <T text="EVERY COURSE, ONE PLACE" />
          </p>
          <h1>
            <T text="Grades" />
          </h1>
          <p>
            <T text="Your results, course by course." />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EmailUpdatesLink />
          <Button
            data-tour="grades-add"
            onClick={() =>
              openEditor(
                'assessments',
                undefined,
                selectedCourseId ? { courseId: selectedCourseId } : undefined,
              )
            }
          >
            <Plus />
            <T text="Add assessment" />
          </Button>
        </div>
      </header>
      <SemesterStandingCard />
      <GradeCoursePicker
        selectedId={selectedCourseId}
        onSelect={(id) => {
          setCourseId(id);
          setSearch('');
          setView('all');
        }}
      />
      <div
        data-tour="grades-awaiting"
        className="card flex flex-wrap items-center justify-between gap-4 p-4"
      >
        <div>
          <h2 className="section-title">
            {awaiting} {awaiting === 1 ? t('assessment awaiting') : t('assessments awaiting')}{' '}
            <T text="a grade" />
          </h2>
        </div>
        <Button variant="outline" onClick={() => setView('awaiting')}>
          <T text="Review awaiting grades" />
        </Button>
      </div>
      <div className="field max-w-sm">
        <Label htmlFor="grades-search">{t('Find an assessment')}</Label>
        <Input
          id="grades-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Assignment, lab, exam…')}
        />
      </div>
      <div data-tour="grades-views" className="tabs" aria-label={t('Grade views')}>
        {[
          { id: 'all', label: 'All assessments', count: available.length },
          { id: 'awaiting', label: 'Awaiting grades', count: awaiting },
          { id: 'recorded', label: 'Recorded', count: recorded },
        ].map((item) => (
          <button
            key={item.id}
            className={`tab ${view === item.id ? 'active' : ''}`}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {t(item.label)} <span className="ml-2">{item.count}</span>
          </button>
        ))}
      </div>
      <div data-tour="grades-results" className="space-y-6">
        {courses
          .filter((course) => course.id === selectedCourseId)
          .map((course) => {
            const rows = visible
              .filter((a) => a.courseId === course.id)
              .sort(
                (a, b) =>
                  Number(b.status === 'SUBMITTED') - Number(a.status === 'SUBMITTED') ||
                  (a.dueDate || '').localeCompare(b.dueDate || ''),
              );
            if (!rows.length) return null;
            const summary = calculateGrades(
              data.assessments.filter((a) => a.courseId === course.id),
              course.gradingRules,
            );
            return (
              <section
                className="card overflow-hidden"
                key={course.id}
                aria-label={`${course.code} grades`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
                  <div>
                    <h2 className="section-title">
                      <Link className="underline" href={`/courses/${course.id}`}>
                        {course.code} · {course.name}
                      </Link>
                    </h2>
                    <p className="muted mt-1 text-xs">
                      {data.semesters.find((s) => s.id === course.semesterId)?.name}{' '}
                      <T text="· Current weighted grade:" />{' '}
                      {summary.currentGrade === null
                        ? t('Not available yet')
                        : `${summary.currentGrade.toFixed(1)}%`}
                      <GradeLetter percent={summary.currentGrade} />
                    </p>
                  </div>
                  <GraduationCap aria-hidden className="text-primary" size={20} />
                </div>
                <p className="muted border-b border-border px-5 py-3 text-sm">
                  {t('Expand a group to view its grades.')}
                </p>
                <GradeGroups
                  assessments={rows}
                  courseAssessments={data.assessments.filter((a) => a.courseId === course.id)}
                  rules={course.gradingRules}
                >
                  {(groupRows) => {
                    const rules = resolveGradingRules(
                      course.gradingRules || [],
                      data.assessments.filter((a) => a.courseId === course.id),
                    ).filter((rule) => groupRows.some((a) => rule.assessmentIds.includes(a.id)));
                    return (
                      <div className="divide-y divide-border">
                        {Boolean(rules.length) && (
                          <div className="p-4 text-sm">
                            {rules.map((r) => (
                              <p key={r.id}>
                                {r.name}:{' '}
                                {r.mode === 'equal'
                                  ? t('Automatic equal split')
                                  : `${t('Best')} ${r.keep}/${r.assessmentIds.length}`}{' '}
                                · {r.weight}%
                              </p>
                            ))}
                          </div>
                        )}
                        <GradeList assessments={groupRows} course={course} />
                      </div>
                    );
                  }}
                </GradeGroups>
              </section>
            );
          })}
        {!visible.length && (
          <div className="card empty-state">
            <GraduationCap aria-hidden size={28} />
            <h2 className="font-semibold">
              {view === 'awaiting'
                ? t('No grades waiting to be entered')
                : t('No matching assessments')}
            </h2>
            <p>
              {view === 'awaiting'
                ? t('Completed assessments appear here until you save their grades.')
                : t('Choose another filter or add an assessment to get started.')}
            </p>
            {view !== 'all' && (
              <Button variant="outline" onClick={() => setView('all')}>
                <T text="Show all assessments" />
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="muted text-sm">
        <T text="Use Edit to update a grade. A blank score means ungraded, not zero." />{' '}
        <Link href="/guide#grades" className="underline">
          <T text="Grade-entry guide" />
        </Link>
        .
      </p>
    </div>
  );
}
