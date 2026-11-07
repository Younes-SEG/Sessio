'use client';

import { useState } from 'react';
import { BookOpen, Check, ChevronDown, Search } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { useT } from './language-provider';
import { calculateGrades } from '@/lib/grades';
import type { Course } from '@/lib/types';

export function GradeCoursePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const { data } = useWorkspace();
  const [query, setQuery] = useState('');
  const active = data.semesters.find((term) => term.isActive)?.id;
  const current = data.courses.filter(
    (course) => !course.archived && (!active || course.semesterId === active),
  );
  const others = data.courses.filter((course) => !current.some((item) => item.id === course.id));
  const matches = data.courses.filter((course) =>
    `${course.code} ${course.name} ${data.semesters.find((term) => term.id === course.semesterId)?.name || ''}`
      .toLocaleLowerCase(t.locale)
      .includes(query.trim().toLocaleLowerCase(t.locale)),
  );

  function cards(courses: Course[]) {
    return (
      <div className="grade-course-options grid gap-0">
        {courses.map((course) => {
          const grade = calculateGrades(
            data.assessments.filter((a) => a.courseId === course.id),
            course.gradingRules,
          );
          const selected = selectedId === course.id;
          return (
            <button
              key={course.id}
              type="button"
              data-grade-course={course.id}
              aria-pressed={selected}
              onClick={() => onSelect(course.id)}
              className={`grade-course-option rounded-sm border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none ${selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/60 hover:bg-primary/5'}`}
            >
              <span className="flex items-center gap-2">
                <BookOpen size={16} aria-hidden className="text-primary" />
                <span className="flex-1 text-sm font-semibold">{course.code}</span>
                {selected && <Check size={16} aria-hidden className="text-primary" />}
              </span>
              <span className="grade-course-name block truncate text-sm" title={course.name}>
                {course.name}
              </span>
              <span className="grade-course-summary muted flex items-end justify-between gap-2 text-xs">
                <span>
                  {data.semesters.find((term) => term.id === course.semesterId)?.name}
                  {course.archived ? ` · ${t('Archived')}` : ''}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {grade.currentGrade === null
                    ? '—'
                    : `${grade.currentGrade.toLocaleString(t.locale, { maximumFractionDigits: 1 })}%`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section data-tour="grades-filters" aria-label={t('Choose a course')} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">{t('Choose a course')}</h2>
        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted"
          />
          <input
            className="input input-with-icon"
            aria-label={t('Search courses')}
            placeholder={t('Find a course…')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      {query.trim() ? (
        matches.length ? (
          cards(matches)
        ) : (
          <p className="muted text-sm">{t('No courses match this view')}</p>
        )
      ) : (
        <>
          {cards(current)}
          {others.length > 0 && (
            <details className="group/courses">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-sm py-2 text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                <ChevronDown
                  size={15}
                  aria-hidden
                  className="transition-transform group-open/courses:rotate-180"
                />
                {t('Other courses')} <span className="muted">{others.length}</span>
              </summary>
              <div className="pt-3">{cards(others)}</div>
            </details>
          )}
          {!data.courses.length && (
            <p className="muted text-sm">{t('Add a course to start tracking your grades.')}</p>
          )}
        </>
      )}
    </section>
  );
}
