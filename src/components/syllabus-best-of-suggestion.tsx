'use client';
import { T, useT } from './language-provider';
import { Button } from './ui/button';
import type { SyllabusBestOfSuggestion as Suggestion } from '@/lib/syllabus-grading-rules';

const typeNames = { QUIZ: 'Quizzes', LAB: 'Labs', ASSIGNMENT: 'Assignments' } as const;
export const bestOfRuleName = (type: Suggestion['type']) =>
  typeNames[type as keyof typeof typeNames] || 'Best-of group';

/** Review-only proposal: nothing changes until the student applies it. */
export function SyllabusBestOfSuggestion({
  suggestion,
  names,
  onApply,
  onDismiss,
}: {
  suggestion: Suggestion;
  names: string[];
  onApply: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  const label = t(bestOfRuleName(suggestion.type));
  return (
    <section className="card space-y-3 p-4 sm:p-5" aria-label={t('Suggested grading rule')}>
      <h3 className="section-title">
        <T text="Suggested grading rule" />: {label}
      </h3>
      <p className="text-sm font-medium">
        <T text="Counted" />: {suggestion.keep} / {suggestion.count} ·{' '}
        <T text="Combined course weight" />: {suggestion.weight}%
      </p>
      <p className="text-sm">
        <T text="Your syllabus says only the best results in this group count. Applying this keeps the highest scores and drops the lowest, instead of adding up every one." />
      </p>
      <details className="text-sm muted">
        <summary className="cursor-pointer text-primary">
          <T text="View matching assessments and syllabus source" />
        </summary>
        <ul className="mt-3 space-y-1">
          {names.map((name, i) => (
            <li key={suggestion.assessmentIds[i]}>{name}</li>
          ))}
        </ul>
        <p className="mt-3">{suggestion.source}</p>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-10 max-w-full whitespace-normal py-2"
          onClick={onApply}
        >
          <T text="Apply best-of rule" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-10 max-w-full whitespace-normal py-2"
          onClick={onDismiss}
        >
          <T text="Dismiss" />
        </Button>
      </div>
    </section>
  );
}
