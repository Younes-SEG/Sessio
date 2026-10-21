'use client';
import { T, useT } from '@/components/language-provider';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { scopeWorkspace } from '@/lib/workspace-scope';
import { SemesterFilter } from './semester-filter';
import { Check, GraduationCap, Plus } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { GradeNumberInput } from './grade-number-input';
import { Label } from './ui/label';
import { calculateGrades } from '@/lib/grades';
import { resolveGradingRules } from '@/lib/grading-rules';
import type { Assessment } from '@/lib/types';
import { statusLabel } from './editors/fields';
import { EmailUpdatesLink } from './email-updates';

export function GradesView() {
  const t = useT();
  const { data: workspace, openEditor } = useWorkspace();
  const [semesterId, setSemesterId] = useState('active');
  const [courseId, setCourseId] = useState('');
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const data = scopeWorkspace(workspace, { semesterId, includeArchived: archived });
  const [view, setView] = useState('all');
  const courses = data.courses.filter((course) => archived || !course.archived);
  const available = data.assessments.filter(
    (assessment) =>
      courses.some((course) => course.id === assessment.courseId) &&
      (!courseId || assessment.courseId === courseId),
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
            <T text="Enter scores whenever they arrive. Completed work stays on your awaiting-grades list." />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EmailUpdatesLink />
          <Button data-tour="grades-add" onClick={() => openEditor('assessments')}>
            <Plus />
            <T text="Add assessment" />
          </Button>
        </div>
      </header>
      <div
        data-tour="grades-awaiting"
        className="card flex flex-wrap items-center justify-between gap-4 p-5"
      >
        <div>
          <h2 className="section-title">
            {awaiting} {awaiting === 1 ? t('assessment awaiting') : t('assessments awaiting')}{' '}
            <T text="a grade" />
          </h2>
          <p className="muted mt-2 text-sm">
            <T text="Mark work Completed in its editor to keep it here until a score is recorded. This list does not check whether your school has released a grade." />
          </p>
        </div>
        <Button variant="outline" onClick={() => setView('awaiting')}>
          <T text="Review awaiting grades" />
        </Button>
      </div>
      <div data-tour="grades-filters" className="flex flex-wrap items-end gap-4">
        <SemesterFilter
          semesters={workspace.semesters}
          value={semesterId}
          onChange={(value) => {
            setSemesterId(value);
            setCourseId('');
          }}
        />
        <div className="field min-w-48 flex-1">
          <Label htmlFor="grades-search">
            <T text="Find an assessment" />
          </Label>
          <Input
            id="grades-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('Assignment, lab, exam…')}
          />
        </div>
        <div className="field min-w-48 flex-1">
          <Label htmlFor="grades-course">
            <T text="Course" />
          </Label>
          <select
            className="input"
            id="grades-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">
              <T text="All courses" />
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} · {data.semesters.find((s) => s.id === course.semesterId)?.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 py-2 text-sm">
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => {
              setArchived(event.target.checked);
              setCourseId('');
            }}
          />
          <T text="Include archived courses" />
        </label>
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
        {courses.map((course) => {
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
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
                  </p>
                </div>
                <GraduationCap aria-hidden className="text-primary" size={20} />
              </div>
              <div className="divide-y divide-[var(--border)]">
                {Boolean(course.gradingRules?.length) && (
                  <div className="p-4 text-sm">
                    {resolveGradingRules(
                      course.gradingRules!,
                      data.assessments.filter((a) => a.courseId === course.id),
                    ).map((r) => (
                      <p key={r.id}>
                        {r.name}:{' '}
                        {r.mode === 'equal'
                          ? t('Automatic equal split')
                          : `${t('Best')} ${r.keep}/${r.assessmentIds.length}`}{' '}
                        · {r.weight}%
                      </p>
                    ))}
                    <p className="muted mt-1">
                      <T text="Equal splits adjust as assessments are added. Best-of groups count the highest scores. Manage rules in the course Grades tab." />
                    </p>
                  </div>
                )}
                {rows.map((a) => (
                  <GradeRow
                    key={`${a.id}:${a.score}:${a.maxScore}:${a.status}`}
                    assessment={a}
                    autoSplit={Boolean(
                      course.gradingRules?.some(
                        (r) => r.mode === 'equal' && r.assessmentType === a.type,
                      ),
                    )}
                    ruleName={
                      course.gradingRules?.find((r) =>
                        r.mode === 'equal'
                          ? r.assessmentType === a.type
                          : r.assessmentIds.includes(a.id),
                      )?.name
                    }
                  />
                ))}
              </div>
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
        <T text="A blank score means ungraded, not zero. Imported assessments start at 0% weight; use Edit details to enter the course weight so they count toward your average." />{' '}
        <Link href="/guide#grades" className="underline">
          <T text="Grade-entry guide" />
        </Link>
        .
      </p>
    </div>
  );
}

function GradeRow({
  assessment,
  ruleName,
  autoSplit,
}: {
  assessment: Assessment;
  ruleName?: string;
  autoSplit?: boolean;
}) {
  const t = useT();
  const { save, openEditor } = useWorkspace();
  const [score, setScore] = useState(assessment.score === null ? '' : String(assessment.score));
  const [maximum, setMaximum] = useState(String(assessment.maxScore));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!score.trim() || !maximum.trim()) throw new Error('Enter a score and its maximum.');
      await save(
        'assessments',
        { score: Number(score), maxScore: Number(maximum), status: 'GRADED' },
        assessment.id,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this grade.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3 p-5" aria-label={`Grade for ${assessment.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{assessment.name}</h3>
          <p className="muted mt-1 text-xs">
            {t(statusLabel(assessment.type))} ·{' '}
            {autoSplit
              ? `${ruleName} · ${Number(assessment.weight.toFixed(4))}%`
              : ruleName || `${assessment.weight}%`}{' '}
            ·{' '}
            {assessment.status === 'SUBMITTED'
              ? t('Completed · Awaiting grade')
              : statusLabel(assessment.status)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => openEditor('assessments', assessment.id)}
        >
          <T text="Edit details" />
        </Button>
      </div>
      <fieldset disabled={busy} className="flex min-w-0 flex-wrap items-end gap-3">
        <div className="field w-28">
          <Label htmlFor={`grade-score-${assessment.id}`}>
            <T text="Score received" />
          </Label>
          <GradeNumberInput
            id={`grade-score-${assessment.id}`}
            label={t('Score received')}
            min={0}
            max={Number(maximum) || undefined}
            value={score}
            onChange={setScore}
            placeholder={t('e.g. 18')}
          />
        </div>
        <div className="field w-28">
          <Label htmlFor={`grade-max-${assessment.id}`}>
            <T text="Out of" />
          </Label>
          <GradeNumberInput
            id={`grade-max-${assessment.id}`}
            label={t('Out of')}
            min={0.01}
            max={1000000}
            value={maximum}
            onChange={setMaximum}
          />
        </div>
        <Button type="submit" disabled={busy || !score.trim()}>
          <Check />
          {busy ? t('Saving…') : t('Save grade')}
        </Button>
        {assessment.status === 'GRADED' && assessment.score !== null && (
          <p className="muted py-3 text-sm">
            <T text="Recorded:" /> {((assessment.score / assessment.maxScore) * 100).toFixed(1)}%
          </p>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      )}
    </form>
  );
}
