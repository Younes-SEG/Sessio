'use client';

import { useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import type { Assessment, Course } from '@/lib/types';
import { resolveGradingRules, type GradingRule } from '@/lib/grading-rules';
import { useT } from './language-provider';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { GradeNumberInput } from './grade-number-input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';

const number = (value: number, locale: string) =>
  value.toLocaleString(locale, { maximumFractionDigits: 2 });

export function GradeList({ assessments, course }: { assessments: Assessment[]; course: Course }) {
  const { data } = useWorkspace();
  const rules = resolveGradingRules(
    course.gradingRules || [],
    data.assessments.filter((a) => a.courseId === course.id),
  );
  return (
    <div className="divide-y divide-border">
      {assessments.map((assessment) => (
        <GradeItem
          key={assessment.id}
          assessment={assessment}
          rule={rules.find((rule) => rule.assessmentIds.includes(assessment.id))}
        />
      ))}
    </div>
  );
}

function GradeItem({ assessment, rule }: { assessment: Assessment; rule?: GradingRule }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const graded = assessment.score !== null && assessment.status === 'GRADED';
  const weight =
    rule && rule.mode !== 'equal'
      ? `${t.percent(rule.weight, 2)} ${t('group weight')}`
      : `${t.percent(assessment.weight, 2)} ${t('weight')}`;
  return (
    <div data-grade-item={assessment.id} className="flex items-center gap-3 px-5 py-4 sm:gap-6">
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-sm font-medium">{assessment.name}</h3>
        <p className="muted mt-1 text-xs">{weight}</p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p className={graded ? 'text-lg font-semibold' : 'muted text-sm'}>
          {graded
            ? `${t.percent((assessment.score! / assessment.maxScore) * 100, 2)}`
            : t('Not graded')}
        </p>
        {graded && (
          <p className="muted text-xs">
            {number(assessment.score!, t.locale)} / {number(assessment.maxScore, t.locale)}
          </p>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={`${t('Edit grade')}: ${assessment.name}`}>
            <Pencil size={14} aria-hidden />
            {t('Edit')}
          </Button>
        </DialogTrigger>
        {open && <GradeEditor assessment={assessment} rule={rule} onClose={() => setOpen(false)} />}
      </Dialog>
    </div>
  );
}

function GradeEditor({
  assessment,
  rule,
  onClose,
}: {
  assessment: Assessment;
  rule?: GradingRule;
  onClose: () => void;
}) {
  const t = useT();
  const { save } = useWorkspace();
  const [name, setName] = useState(assessment.name);
  const [score, setScore] = useState(assessment.score === null ? '' : String(assessment.score));
  const [maximum, setMaximum] = useState(String(assessment.maxScore));
  const [weight, setWeight] = useState(String(assessment.weight));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = `grade-edit-${assessment.id}`;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await save(
        'assessments',
        {
          name: name.trim(),
          score: score.trim() === '' ? null : Number(score),
          maxScore: Number(maximum),
          ...(!rule ? { weight: Number(weight) } : {}),
          status:
            score.trim() !== ''
              ? 'GRADED'
              : assessment.status === 'GRADED'
                ? 'SUBMITTED'
                : assessment.status,
        },
        assessment.id,
      );
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this grade.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <DialogContent
      className="max-w-md"
      onEscapeKeyDown={(event) => {
        if (busy) event.preventDefault();
      }}
      onInteractOutside={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>{t('Edit grade')}</DialogTitle>
        <DialogDescription>{t('Update the name, score, or weight.')}</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-5">
          <div className="field">
            <Label htmlFor={`${id}-name`}>{t('Assessment name')}</Label>
            <Input
              id={`${id}-name`}
              required
              maxLength={200}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="field min-w-0">
              <Label htmlFor={`${id}-score`}>{t('Score received')}</Label>
              <GradeNumberInput
                id={`${id}-score`}
                label={t('Score received')}
                required={false}
                min={0}
                max={Number(maximum) || undefined}
                value={score}
                onChange={setScore}
                placeholder="—"
              />
            </div>
            <div className="field min-w-0">
              <Label htmlFor={`${id}-maximum`}>{t('Out of')}</Label>
              <GradeNumberInput
                id={`${id}-maximum`}
                label={t('Out of')}
                min={0.01}
                max={1000000}
                value={maximum}
                onChange={setMaximum}
              />
            </div>
          </div>
          <p className="muted text-xs">{t('Leave the score blank if it has not been graded.')}</p>
          {rule ? (
            <div className="rounded-sm bg-muted p-3 text-sm">
              <p className="font-medium">
                {rule.name} · {t.percent(rule.weight, 2)} {t('group weight')}
              </p>
              <p className="muted mt-1 text-xs">
                {t('This weight is managed by the course grading rule.')}
              </p>
            </div>
          ) : (
            <div className="field">
              <Label htmlFor={`${id}-weight`}>{t('Course weight (%)')}</Label>
              <Input
                id={`${id}-weight`}
                type="number"
                required
                min={0}
                max={100}
                step="any"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </div>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t(error)}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {t(busy ? 'Saving…' : 'Save changes')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
