'use client';
import { useId, useState } from 'react';
import { T, useT } from './language-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  gradingRuleSchema,
  interpretGradingNote,
  resolveGradingRules,
  splitGradingNotes,
  type GradingRule,
} from '@/lib/grading-rules';
import type { AssessmentType } from '@/lib/types';

export interface RuleAssessment {
  id: string;
  name: string;
  type: AssessmentType;
  weight: number;
}
export function GradingRulesEditor({
  rules,
  notes,
  assessments,
  onChange,
}: {
  rules: GradingRule[];
  notes: string;
  assessments: RuleAssessment[];
  onChange: (rules: GradingRule[], notes: string) => void;
}) {
  const t = useT();
  const prefix = useId();
  const [draft, setDraft] = useState<{
    name: string;
    keep: string;
    count: number;
    weight: string;
    ids: string[];
  } | null>(null);
  const [message, setMessage] = useState('');
  const [equalDraft, setEqualDraft] = useState<{ type: AssessmentType; weight: string } | null>(
    null,
  );
  const resolved = resolveGradingRules(rules, assessments);
  const used = new Set(resolved.flatMap((r) => r.assessmentIds));
  const { instructions, references } = splitGradingNotes(notes);
  const categoryNames = {
    LAB: 'Labs',
    ASSIGNMENT: 'Assignments',
    PROJECT: 'Project deliverables',
    QUIZ: 'Quizzes',
    MIDTERM: 'Midterms',
    FINAL_EXAM: 'Final exams',
    OTHER: 'Other assessments',
  } as const;
  function addEqual() {
    if (!equalDraft) return;
    const current = rules.find((r) => r.mode === 'equal' && r.assessmentType === equalDraft.type);
    const members = assessments.filter((a) => a.type === equalDraft.type);
    const conflict = rules.some(
      (r) => r.mode !== 'equal' && r.assessmentIds.some((id) => members.some((a) => a.id === id)),
    );
    const result = gradingRuleSchema.safeParse({
      id: current?.id || crypto.randomUUID(),
      name: t(categoryNames[equalDraft.type as keyof typeof categoryNames]),
      mode: 'equal',
      assessmentType: equalDraft.type,
      keep: 1,
      weight: Number(equalDraft.weight),
      assessmentIds: [],
      source: current?.source || 'Equal split confirmed by user.',
    });
    if (!result.success || conflict) {
      setMessage(
        conflict
          ? 'This category overlaps a best-of group. Keep that rule, or remove it before choosing an equal split.'
          : 'Enter a combined weight above 0% and at most 100%.',
      );
      return;
    }
    onChange([...rules.filter((r) => r.id !== current?.id), result.data], notes);
    setEqualDraft(null);
    setMessage('Rule added to this review. Save your changes to keep it.');
  }
  function interpret() {
    const suggestion = interpretGradingNote(instructions);
    if (!suggestion) {
      setMessage(
        'I could not turn that note into a best-of rule. Use the fields below, or keep it as a note. Other instructions do not change calculations automatically.',
      );
      setDraft({ name: t('Best-of group'), keep: '', count: 0, weight: '', ids: [] });
      return;
    }
    const members = assessments.filter((a) => a.type === suggestion.type && !used.has(a.id));
    setDraft({
      name: t(
        suggestion.type === 'QUIZ' ? 'Quizzes' : suggestion.type === 'LAB' ? 'Labs' : 'Assignments',
      ),
      keep: String(suggestion.keep),
      count: suggestion.count,
      weight: '',
      ids: members.length === suggestion.count ? members.map((a) => a.id) : [],
    });
    setMessage(
      'Review the assessments, combined weight and equal-weight calculation below. Nothing is applied until you add the rule.',
    );
  }
  function add() {
    if (!draft) return;
    const result = gradingRuleSchema.safeParse({
      id: crypto.randomUUID(),
      name: draft.name,
      keep: Number(draft.keep),
      weight: Number(draft.weight),
      assessmentIds: draft.ids,
      source: instructions.slice(0, 2000),
    });
    if (
      !result.success ||
      (draft.count && draft.ids.length !== draft.count) ||
      draft.ids.some((id) => used.has(id) || !assessments.some((a) => a.id === id))
    ) {
      setMessage(
        'Choose the full assessment group, a smaller number to count, and a combined weight above 0%.',
      );
      return;
    }
    onChange([...rules, result.data], notes);
    setDraft(null);
    setMessage('Rule added to this review. Save your changes to keep it.');
  }
  return (
    <section
      className="card space-y-4 p-4 sm:p-5"
      aria-label={t('Instructor instructions and grading rules')}
    >
      <h2 className="section-title">
        <T text="Grading rules" />
      </h2>
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-10 max-w-full whitespace-normal py-2"
        onClick={() => setEqualDraft({ type: 'LAB', weight: '' })}
      >
        <T text="Add automatic equal split" />
      </Button>
      {equalDraft && (
        <div className="space-y-4 rounded-sm border border-[var(--border)] p-4">
          <label className="grid gap-2 text-sm">
            <T text="Category" />
            <select
              className="input"
              value={equalDraft.type}
              onChange={(e) =>
                setEqualDraft({ ...equalDraft, type: e.target.value as AssessmentType })
              }
            >
              {Object.entries(categoryNames).map(([type, name]) => (
                <option value={type} key={type}>
                  {t(name)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <T text="Combined course weight (%)" />
            <Input
              type="number"
              min={0.01}
              max={100}
              step="any"
              value={equalDraft.weight}
              onChange={(e) => setEqualDraft({ ...equalDraft, weight: e.target.value })}
            />
          </label>
          <p className="muted text-sm">
            <T text="Keep this category total fixed and share it equally across all current and future assessments of this type in this course." />
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={addEqual}>
              <T text="Confirm equal split" />
            </Button>
            <Button type="button" variant="outline" onClick={() => setEqualDraft(null)}>
              <T text="Cancel" />
            </Button>
          </div>
        </div>
      )}
      {references && (
        <details className="text-sm muted">
          <summary className="cursor-pointer text-primary">
            <T text="Reference notes from earlier syllabus imports" />
          </summary>
          <p className="mt-3 whitespace-pre-wrap">{references}</p>
          <p className="mt-2">
            <T text="These are reference notes, not active calculation rules." />
          </p>
        </details>
      )}
      <p className="muted text-sm">
        <T text="Add something your instructor said that is missing from the syllabus. Best-of rules are interpreted on this device; your note is not sent to an AI service." />
      </p>
      <label className="block text-sm font-medium" htmlFor={prefix + '-note'}>
        <T text="Extra instructor instructions" />
      </label>
      <Textarea
        id={prefix + '-note'}
        maxLength={5000}
        value={instructions}
        placeholder={t('Example: Best 4 of 5 quizzes count. Quizzes are worth 20% combined.')}
        onChange={(e) => {
          onChange(rules, [e.target.value, references].filter(Boolean).join('\n'));
          setDraft(null);
          setMessage('');
        }}
      />
      <p className="muted text-xs">
        <T text="A saved note alone does not change grades. Add and confirm a rule below to change calculations." />
      </p>
      <Button type="button" variant="outline" onClick={interpret}>
        <T text="Review a best-of rule" />
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {t(message)}
        </p>
      )}
      {draft && (
        <div className="space-y-4 rounded-sm border border-[var(--border)] bg-[var(--muted)]/30 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <T text="Group name" />
              <Input
                value={draft.name}
                maxLength={200}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <T text="Number of best scores to count" />
              <Input
                type="number"
                min={1}
                max={99}
                value={draft.keep}
                onChange={(e) => setDraft({ ...draft, keep: e.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <T text="Combined course weight (%)" />
              <Input
                type="number"
                min={0.01}
                max={100}
                step="any"
                value={draft.weight}
                placeholder="20"
                onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
              />
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              <T text="Assessments in this group" />{' '}
              {draft.count ? `(${draft.ids.length}/${draft.count})` : `(${draft.ids.length})`}
            </legend>
            {assessments
              .filter((a) => !used.has(a.id))
              .map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-3 rounded-sm p-2 text-sm hover:bg-[var(--muted)]"
                >
                  <input
                    type="checkbox"
                    checked={draft.ids.includes(a.id)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ids: e.target.checked
                          ? [...draft.ids, a.id]
                          : draft.ids.filter((id) => id !== a.id),
                      })
                    }
                  />
                  {a.name}
                </label>
              ))}
          </fieldset>
          <p className="text-sm">
            <T text="This rule averages the highest score percentages equally and gives the group its combined weight. It replaces the individual weights for these assessments. Ungraded scores stay unknown; enter 0 only for a confirmed zero." />
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={add}>
              <T text="Confirm and add rule" />
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              <T text="Cancel" />
            </Button>
          </div>
        </div>
      )}
      {resolved.map((r) => (
        <div key={r.id} className="rounded-sm border border-[var(--border)] p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong>
              {r.name}:{' '}
              {r.mode === 'equal'
                ? t('Automatic equal split')
                : `${t('Best')} ${r.keep} / ${r.assessmentIds.length}`}{' '}
              · {t.percent(r.weight, 2)}
            </strong>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange(
                  rules.filter((x) => x.id !== r.id),
                  notes,
                )
              }
            >
              <T text="Remove rule" />
            </Button>
          </div>
          {r.mode === 'equal' && (
            <>
              <p className="mt-2">
                {r.assessmentIds.length} <T text="currently known" />
                {r.assessmentIds.length > 0 && (
                  <>
                    {' '}
                    · {t.percent(r.weight / r.assessmentIds.length, 2)} <T text="each for now" />
                  </>
                )}
              </p>
              <p className="muted mt-2">
                <T text="New assessments join automatically. The category total stays fixed; individual shares and averages can change." />
              </p>
              <Button
                className="mt-3"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEqualDraft({ type: r.assessmentType!, weight: String(r.weight) })}
              >
                <T text="Edit category total" />
              </Button>
            </>
          )}
          {r.source && (
            <details className="mt-3 muted">
              <summary className="cursor-pointer">
                <T text="Rule source" />
              </summary>
              <p className="mt-2 whitespace-pre-wrap">{r.source}</p>
            </details>
          )}
          <p className="muted mt-2">
            {r.assessmentIds
              .map((id) => assessments.find((a) => a.id === id)?.name || t('Missing assessment'))
              .join(' · ')}
          </p>
          <p className="muted mt-2">
            <T text="Individual assessment weights are ignored while this rule is active. Removing it restores those weights." />
          </p>
        </div>
      ))}
    </section>
  );
}
