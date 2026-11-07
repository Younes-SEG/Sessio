'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useT } from './language-provider';
import type { Assessment, AssessmentType } from '@/lib/types';
import { currentCategoryGrade } from '@/lib/grades';
import type { GradingRule } from '@/lib/grading-rules';

const groups: { type: AssessmentType; label: string }[] = [
  { type: 'QUIZ', label: 'Quizzes' },
  { type: 'LAB', label: 'Labs' },
  { type: 'ASSIGNMENT', label: 'Assignments' },
  { type: 'PROJECT', label: 'Projects' },
  { type: 'MIDTERM', label: 'Midterms' },
  { type: 'FINAL_EXAM', label: 'Final exams' },
  { type: 'OTHER', label: 'Other assessments' },
];

/** Native disclosures keep grade forms mounted and keyboard-accessible while collapsed. */
export function GradeGroups({
  assessments,
  children,
  courseAssessments = assessments,
  rules = [],
}: {
  assessments: Assessment[];
  courseAssessments?: Assessment[];
  rules?: GradingRule[];
  children: (rows: Assessment[]) => ReactNode;
}) {
  const t = useT();
  return (
    <div className="divide-y divide-border">
      {groups.map(({ type, label }) => {
        const rows = assessments.filter((assessment) => assessment.type === type);
        if (!rows.length) return null;
        const recorded = rows.filter((assessment) => assessment.status === 'GRADED').length;
        const current = currentCategoryGrade(courseAssessments, type, rules);
        return (
          <details key={type} className="group/grades" data-grade-group={type}>
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              <ChevronDown
                aria-hidden
                size={18}
                className="shrink-0 text-primary transition-transform duration-100 group-open/grades:rotate-180 motion-reduce:transition-none"
              />
              <span className="flex-1 font-semibold">{t(label)}</span>
              <span className="shrink-0 text-right">
                {current !== null && (
                  <span className="block text-sm font-semibold tabular-nums">
                    {current.toLocaleString(t.locale, { maximumFractionDigits: 1 })}%{' '}
                    <span className="muted text-xs font-normal">{t('so far')}</span>
                  </span>
                )}
                <span className="muted text-xs">
                  {recorded}/{rows.length} {t('Recorded').toLocaleLowerCase(t.locale)}
                </span>
              </span>
            </summary>
            <div className="border-t border-border">{children(rows)}</div>
          </details>
        );
      })}
    </div>
  );
}
