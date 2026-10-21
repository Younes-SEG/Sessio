'use client';
import { T, useT } from './language-provider';
import { Button } from './ui/button';
import type { SyllabusCategory } from '@/lib/syllabus-result';
import type { GradingRule } from '@/lib/grading-rules';
import type { ExistingAssessment } from '@/lib/syllabus-matching';

export function SyllabusCategoryWeights({
  category,
  assessments,
  rules,
  onApply,
}: {
  category: SyllabusCategory;
  assessments: ExistingAssessment[];
  rules: GradingRule[];
  onApply: (category: SyllabusCategory) => void;
}) {
  const t = useT();
  const members = assessments.filter((a) => a.type === category.type);
  const active = rules.find((r) => r.mode === 'equal' && r.assessmentType === category.type);
  const conflict = rules.some(
    (r) => r.mode !== 'equal' && r.assessmentIds.some((id) => members.some((a) => a.id === id)),
  );
  const same = active?.weight === category.weight;
  return (
    <section
      className="card space-y-4 p-5 sm:p-6"
      aria-label={`${t('Category weight')}: ${category.name}`}
    >
      <h3 className="section-title">
        {category.name} · {category.weight}% <T text="combined" />
      </h3>
      <p className="text-sm">
        <T text="Keep this category total fixed and share it equally across all current and future assessments of this type in this course." />
      </p>
      <p className="text-sm text-primary">
        {members.length} <T text="currently known" />
        {members.length > 0 && (
          <>
            {' '}
            · {Number((category.weight / members.length).toFixed(4))}% <T text="each for now" />
          </>
        )}
      </p>
      <p className="text-sm muted">
        <T text="When calendar sync or a manual import adds another assessment, every share adjusts automatically. Scores stay unchanged. All future assessments must use the same type." />
      </p>
      <details className="text-sm muted">
        <summary className="cursor-pointer text-primary">
          <T text="View matching assessments and syllabus source" />
        </summary>
        <ul className="mt-3 space-y-1">
          {members.map((a) => (
            <li key={a.id}>{a.name}</li>
          ))}
        </ul>
        <p className="mt-3">
          {category.source}
          {category.page ? ` · ${t('Page')} ${category.page}` : ''}
        </p>
      </details>
      {conflict ? (
        <p role="status" className="text-sm">
          <T text="This category overlaps a best-of group. Keep that rule, or remove it before choosing an equal split." />
        </p>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 max-w-full whitespace-normal py-2"
            disabled={same}
            onClick={() => onApply(category)}
          >
            <T
              text={
                same
                  ? 'Automatic equal split enabled'
                  : active
                    ? 'Update automatic equal split'
                    : 'Use automatic equal split'
              }
            />
          </Button>
          <p className="muted text-xs">
            <T
              text={
                same
                  ? 'Rule added to this review. Save your changes to keep it.'
                  : 'Choose this only if every assessment in this category counts equally. Best-of grading is a separate rule.'
              }
            />
          </p>
        </>
      )}
    </section>
  );
}
