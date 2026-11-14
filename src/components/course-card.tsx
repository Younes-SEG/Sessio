'use client';
import { T, useT } from '@/components/language-provider';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, CalendarClock } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import type { Course } from '@/lib/types';
import { calculateGrades } from '@/lib/grades';
import { dueLabel } from '@/lib/dates';
import { CourseSyllabusStatus } from './course-syllabus-status';
import { GradeLetter } from './school-grade';
export function CourseCard({ course }: { course: Course }) {
  const t = useT();
  const { data, now } = useWorkspace();
  const assessments = data.assessments.filter((a) => a.courseId === course.id);
  const grade = calculateGrades(assessments, course.gradingRules);
  const deadlines = assessments
    .filter((a) => a.dueDate && !['GRADED', 'SUBMITTED'].includes(a.status))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  const next = deadlines[0];
  const exam = deadlines.find((a) => ['MIDTERM', 'FINAL_EXAM', 'QUIZ'].includes(a.type));
  return (
    <Link
      className="card course-card block"
      href={`/courses/${course.id}`}
      style={{ '--course-color': course.color } as CSSProperties}
    >
      <div className="course-card-mark flex justify-between items-start">
        <div className="course-icon">
          <BookOpen size={18} />
        </div>
        <ArrowUpRight size={15} className="muted" />
      </div>
      <div
        className="course-card-code text-xs font-semibold tracking-wide"
        style={{ color: 'var(--foreground)' }}
      >
        {course.code}
        {course.archived && (
          <span className="badge ml-2">
            <T text="Archived" />
          </span>
        )}
      </div>
      <h2 className="course-card-title text-base leading-snug">{course.name}</h2>
      <CourseSyllabusStatus course={course} compact />
      <div className="course-card-score flex items-end justify-between">
        <div>
          <div className="text-[10px] muted mb-1">
            <T text="Current grade" />
          </div>
          <span className="course-grade">
            {grade.currentGrade === null ? '—' : `${grade.currentGrade.toFixed(1)}%`}
            <GradeLetter percent={grade.currentGrade} className="text-sm" />
          </span>
        </div>
        <span className="text-[10px] muted mb-1">
          {Math.round(grade.completedWeight)}
          <T text="% graded" />
        </span>
      </div>
      <div className="progress-track course-card-progress">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, grade.completedWeight)}%` }}
        />
      </div>
      <div className="course-card-deadline flex items-center gap-2 text-xs muted">
        <CalendarClock size={12} />
        <span className="truncate flex-1">{next?.name || t('No pending assessments')}</span>
        {next && <span className="shrink-0">{dueLabel(next.dueDate, now, t.locale)}</span>}
      </div>
      {exam && exam.id !== next?.id && (
        <p className="course-card-exam text-xs muted truncate">
          <T text="Next assessment:" /> {exam.name} · {dueLabel(exam.dueDate, now, t.locale)}
        </p>
      )}
    </Link>
  );
}
