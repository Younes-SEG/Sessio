'use client';
import { T, useT } from '@/components/language-provider';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  CourseField,
  Field,
  localDateTime,
  NotesField,
  optionsFor,
  SelectField,
  TextField,
} from './fields';
import type { Assessment, Course } from '@/lib/types';

export function AssessmentFields({
  initial,
  courses,
}: {
  initial: Partial<Assessment>;
  courses: Course[];
}) {
  const t = useT();
  const rule = courses
    .find((c) => c.id === initial.courseId)
    ?.gradingRules?.find((r) =>
      r.mode === 'equal'
        ? r.assessmentType === initial.type
        : r.assessmentIds.includes(initial.id || ''),
    );
  const [status, setStatus] = useState(initial.status ?? 'NOT_STARTED');
  const [score, setScore] = useState(
    initial.score === null || initial.score === undefined ? '' : String(initial.score),
  );
  function changeStatus(value: string) {
    setStatus(value as Assessment['status']);
    if (value !== 'GRADED') setScore('');
  }
  function changeScore(value: string) {
    setScore(value);
    if (value !== '') setStatus('GRADED');
    else if (status === 'GRADED') setStatus('SUBMITTED');
  }
  return (
    <div className="form-grid">
      <TextField
        name="name"
        label={t('Assessment name')}
        value={initial.name}
        placeholder="e.g. Assignment 1 · Requirements document"
        required
        wide
      />
      <CourseField courses={courses} value={initial.courseId} required />
      <SelectField
        name="type"
        label={t('Type')}
        value={initial.type ?? 'ASSIGNMENT'}
        options={optionsFor([
          'ASSIGNMENT',
          'LAB',
          'QUIZ',
          'MIDTERM',
          'FINAL_EXAM',
          'PROJECT',
          'OTHER',
        ])}
      />
      <TextField
        name="dueDate"
        label={t('Due date & time (optional)')}
        type="datetime-local"
        value={localDateTime(initial.dueDate)}
      />
      <TextField
        name="weight"
        label={t('Course weight (%)')}
        type="number"
        value={initial.weight ?? 10}
        min={0}
        max={100}
        step="any"
        required
      />
      {rule && (
        <p className="muted text-sm">
          <T
            text={
              rule.mode === 'equal'
                ? 'This weight is managed by an automatic equal split. Manual weight changes are ignored while it is active. Manage the category total in the course Grades tab.'
                : 'This assessment uses a best-of group. Its individual weight is ignored while that rule is active. Manage it in the course Grades tab.'
            }
          />{' '}
          ({rule.name})
        </p>
      )}
      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-[var(--control-border)] p-3">
          <input
            type="checkbox"
            checked={status === 'SUBMITTED' || status === 'GRADED'}
            disabled={status === 'GRADED'}
            onChange={(event) => changeStatus(event.target.checked ? 'SUBMITTED' : 'IN_PROGRESS')}
            aria-describedby="assessment-completed-help"
          />
          <span className="text-sm font-medium">
            <T text="Completed" />
          </span>
        </label>
        <p id="assessment-completed-help" className="muted text-xs leading-relaxed">
          {status === 'GRADED'
            ? t('A recorded grade already marks this work complete.')
            : t(
                'Marks this as submitted and keeps it in Grades → Awaiting grades until you receive a score.',
              )}
        </p>
        <SelectField
          name="status"
          label={t('Status')}
          value={status}
          onChange={changeStatus}
          options={optionsFor(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED'])}
        />
      </div>
      <TextField
        name="maxScore"
        label={t('Maximum score')}
        type="number"
        value={initial.maxScore ?? 100}
        min="0.01"
        max={1000000}
        step="0.01"
        required
      />
      <Field
        name="score"
        label={status === 'GRADED' ? 'Score received' : 'Score received (optional)'}
        hint={t('Entering a score marks this as graded. An ungraded status clears the score.')}
      >
        <Input
          id="editor-score"
          name="score"
          type="number"
          value={score}
          onChange={(event) => changeScore(event.target.value)}
          min={0}
          step="0.01"
          required={status === 'GRADED'}
        />
      </Field>
      <NotesField value={initial.notes} />
    </div>
  );
}
