'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Loader2, Plus } from 'lucide-react';
import type { Assessment, Course } from '@/lib/types';
import {
  addDays,
  dueLabel,
  formatTime,
  isOverdue,
  isSameDay,
  startOfDay,
  toDate,
} from '@/lib/dates';
import { useWorkspace } from './workspace-provider';
import { useT } from './language-provider';
import { statusLabel } from './editors/fields';
import { Button } from './ui/button';
import { Input } from './ui/input';

const views = [
  ['today', 'Today'],
  ['upcoming', 'Upcoming'],
  ['overdue', 'Overdue'],
  ['completed', 'Completed'],
  ['all', 'All assessments'],
] as const;
type View = (typeof views)[number][0];

export function AssessmentWork({
  assessments,
  courses,
}: {
  assessments: Assessment[];
  courses: Course[];
}) {
  const t = useT();
  const { now, data, save, openEditor } = useWorkspace();
  const [view, setView] = useState<View>('today');
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('all');
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const selectedCourse = courses.some((course) => course.id === courseId) ? courseId : 'all';
  const inView = (assessment: Assessment, selected: View) => {
    const complete = assessment.status === 'SUBMITTED' || assessment.status === 'GRADED';
    if (selected === 'all') return true;
    if (selected === 'completed') return complete;
    if (complete) return false;
    if (selected === 'today') return isSameDay(assessment.dueDate, now);
    if (selected === 'overdue') return isOverdue(assessment.dueDate, assessment.status, now);
    const date = toDate(assessment.dueDate);
    return Boolean(date && date >= addDays(startOfDay(now), 1));
  };
  const query = search.trim().toLocaleLowerCase();
  const filtered = assessments.filter((assessment) => {
    const course = courses.find((item) => item.id === assessment.courseId);
    return (
      (selectedCourse === 'all' || assessment.courseId === selectedCourse) &&
      (!query ||
        `${assessment.name} ${course?.code} ${course?.name}`.toLocaleLowerCase().includes(query))
    );
  });
  const shown = filtered
    .filter((assessment) => inView(assessment, view))
    .sort(
      (a, b) =>
        (toDate(a.dueDate)?.getTime() ?? Infinity) - (toDate(b.dueDate)?.getTime() ?? Infinity) ||
        a.name.localeCompare(b.name),
    );

  async function toggle(assessment: Assessment) {
    if (pending.has(assessment.id) || assessment.status === 'GRADED') return;
    setPending((ids) => new Set(ids).add(assessment.id));
    setError('');
    try {
      await save(
        'assessments',
        { status: assessment.status === 'SUBMITTED' ? 'IN_PROGRESS' : 'SUBMITTED' },
        assessment.id,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to update this assessment. Please try again.',
      );
    } finally {
      setPending((ids) => {
        const next = new Set(ids);
        next.delete(assessment.id);
        return next;
      });
    }
  }

  return (
    <section aria-labelledby="assessment-work-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="assessment-work-title" className="section-title">
            {t('Assessments')}
          </h2>
          <p className="muted text-sm">
            {t('Labs, assignments and exams. Check off finished work; grades stay in Grades.')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => openEditor('assessments')}>
          <Plus size={15} aria-hidden />
          {t('Add assessment')}
        </Button>
      </div>
      <div className="tabs overflow-x-auto" aria-label={t('Assessment views')}>
        {views.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab whitespace-nowrap ${view === id ? 'active' : ''}`}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            {t(label)}{' '}
            <span className="muted ml-2 text-xs">
              {filtered.filter((assessment) => inView(assessment, id)).length}
            </span>
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <Input
            className="min-w-0 flex-1 basis-48"
            aria-label={t('Search assessments')}
            placeholder={t('Search assessments…')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="input w-full sm:w-auto sm:max-w-64"
            aria-label={t('Assessment course')}
            value={selectedCourse}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="all">{t('All courses')}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="p-4 text-sm text-destructive">
            {t(error)}
          </p>
        )}
        {shown.length ? (
          <ul className="divide-y divide-border">
            {shown.map((assessment) => {
              const course = courses.find((item) => item.id === assessment.courseId);
              const complete = assessment.status === 'SUBMITTED' || assessment.status === 'GRADED';
              const graded = assessment.status === 'GRADED';
              const busy = pending.has(assessment.id);
              const overdue = isOverdue(assessment.dueDate, assessment.status, now);
              return (
                <li
                  key={assessment.id}
                  className="flex items-start gap-3 p-4"
                  data-assessment-work={assessment.id}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={complete}
                    aria-label={`${t(graded ? 'Graded' : complete ? 'Reopen' : 'Complete')}: ${assessment.name}`}
                    disabled={busy || graded}
                    onClick={() => void toggle(assessment)}
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-50 ${complete ? 'border-primary bg-primary text-primary-foreground' : 'border-[var(--control-border)]'}`}
                  >
                    {busy ? (
                      <Loader2 size={13} className="animate-spin" aria-hidden />
                    ) : complete ? (
                      <Check size={14} aria-hidden />
                    ) : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className={`break-words text-left text-sm font-medium hover:text-primary ${complete ? 'muted' : ''}`}
                      onClick={() => openEditor('assessments', assessment.id)}
                    >
                      {assessment.name}
                    </button>
                    <p className="muted mt-1 text-xs">
                      {course?.code} · {t(statusLabel(assessment.type))}
                      {complete ? ` · ${t(graded ? 'Graded' : 'Completed · Awaiting grade')}` : ''}
                    </p>
                    <p className={`mt-1 text-xs ${overdue ? 'text-destructive' : 'muted'}`}>
                      {overdue ? t('Overdue · ') : ''}
                      {dueLabel(assessment.dueDate, now, t.locale)}
                      {assessment.dueDate
                        ? ` · ${formatTime(assessment.dueDate, data.settings.timeFormat, t.locale)}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${t('Edit assessment')}: ${assessment.name}`}
                    onClick={() => openEditor('assessments', assessment.id)}
                  >
                    <ArrowUpRight size={16} aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-2 p-5 text-sm">
            <p className="muted">{t('No assessments in this view.')}</p>
            {view !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setView('all')}>
                {t('All assessments')}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
