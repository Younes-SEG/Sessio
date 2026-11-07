'use client';

import { FileCheck2, FileText } from 'lucide-react';
import { useT } from './language-provider';
import type { Course } from '@/lib/types';

export function CourseSyllabusStatus({
  course,
  compact = false,
}: {
  course: Course;
  compact?: boolean;
}) {
  const t = useT();
  const imported = Boolean(course.syllabusImportedAt || course.syllabusImportDetected);
  const Icon = imported ? FileCheck2 : FileText;
  const label = imported ? t('Syllabus imported') : t('No saved syllabus import');
  return (
    <div
      className={
        compact
          ? 'course-card-source flex items-center gap-1.5 text-xs muted'
          : 'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-border px-4 py-3 text-sm'
      }
    >
      <span className={`inline-flex items-center gap-2 ${imported ? 'text-primary' : 'muted'}`}>
        <Icon size={compact ? 14 : 17} aria-hidden />
        <span>{label}</span>
      </span>
      {!compact && imported && (
        <span className="muted text-xs">
          {course.syllabusImportedAt ? (
            <>
              {t('Last saved:')}{' '}
              <time dateTime={course.syllabusImportedAt}>
                {new Date(course.syllabusImportedAt).toLocaleString(
                  t.locale === 'fr' ? 'fr-CA' : 'en-CA',
                  { dateStyle: 'medium', timeStyle: 'short' },
                )}
              </time>
            </>
          ) : (
            t('Earlier import detected; date not recorded.')
          )}
        </span>
      )}
    </div>
  );
}
