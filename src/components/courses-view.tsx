'use client';
import { T, useT } from '@/components/language-provider';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { CourseCard } from './course-card';
import { Button } from './ui/button';
export function CoursesView() {
  const t = useT();
  const { data, openEditor } = useWorkspace();
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState(
    () => data.semesters.find((s) => s.isActive)?.id || 'all',
  );
  const [archived, setArchived] = useState(false);
  const courses = data.courses.filter(
    (c) =>
      (semester === 'all' || c.semesterId === semester) &&
      (!c.archived || archived) &&
      `${c.code} ${c.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div data-tour="courses" className="page-header">
        <div>
          <div className="eyebrow">
            <T text="A place for every subject" />
          </div>
          <h1>
            <T text="Your courses" />
          </h1>
          <p>
            <T text="Keep the big picture in view, and the details in their place." />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link data-tour="course-terms" href="/settings#terms">
              <T text="Manage terms" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link data-tour="course-import" href="/syllabus">
              <T text="Import syllabus" />
            </Link>
          </Button>
          <Button
            data-tour="course-add"
            onClick={() =>
              openEditor(
                'courses',
                undefined,
                semester !== 'all' ? { semesterId: semester } : undefined,
              )
            }
          >
            <Plus />
            <T text="Add course" />
          </Button>
        </div>
      </div>
      <div data-tour="course-filters" className="flex flex-wrap items-center gap-3 mb-7">
        <div className="relative max-w-xs flex-1 min-w-44">
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
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="input w-auto min-w-40"
          aria-label={t('Filter by semester')}
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        >
          <option value="all">
            <T text="All semesters" />
          </option>
          {data.semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-xs muted cursor-pointer">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          <SlidersHorizontal size={13} />
          <T text="Show archived" />
        </label>
      </div>
      {courses.length ? (
        <>
          <div className="eyebrow mb-4">
            {courses.length} {courses.length === 1 ? t('course') : t('courses')}{' '}
            <T text="in your workspace" />
          </div>
          <div data-tour="course-list" className="course-grid">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <p className="text-[10px] muted mt-6 flex gap-2 items-center">
            <span className="size-1 rounded-full bg-primary mt-1" />
            <T text="Current grades reflect only graded work, weighted by its contribution to the course." />
          </p>
        </>
      ) : (
        <div data-tour="course-list" className="card empty-state py-20">
          <BookOpen size={30} strokeWidth={1.2} />
          <h2 className="text-lg font-semibold text-foreground">
            {data.courses.length ? t('No courses match this view') : t('Your semester starts here')}
          </h2>
          <p>
            {data.courses.length
              ? t('Try another semester or clear your search.')
              : t('Add a course to bring your assessments, grades, and schedule together.')}
          </p>
          <Button
            className="mt-3"
            onClick={() => openEditor(data.semesters.length ? 'courses' : 'semesters')}
          >
            <Plus />
            {data.semesters.length ? t('Add your first course') : t('Set up your semester')}
          </Button>
        </div>
      )}
    </>
  );
}
