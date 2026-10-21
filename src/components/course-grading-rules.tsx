'use client';
import { useState } from 'react';
import type { Assessment, Course } from '@/lib/types';
import { gradingRuleError } from '@/lib/grading-rules';
import { GradingRulesEditor } from './grading-rules-editor';
import { Button } from './ui/button';
import { T, useT } from './language-provider';
import { useWorkspace } from './workspace-provider';

export function CourseGradingRules({
  course,
  assessments,
}: {
  course: Course;
  assessments: Assessment[];
}) {
  const { save } = useWorkspace();
  const t = useT();
  const [rules, setRules] = useState(course.gradingRules || []);
  const [notes, setNotes] = useState(course.gradingNotes || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function persist() {
    const error = gradingRuleError(rules, assessments);
    if (error) {
      setMessage(error);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await save('courses', { gradingRules: rules, gradingNotes: notes }, course.id);
      setMessage('Grading rules saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save grading rules.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <fieldset disabled={busy}>
        <GradingRulesEditor
          rules={rules}
          notes={notes}
          assessments={assessments}
          onChange={(r, n) => {
            setRules(r);
            setNotes(n);
            setMessage('');
          }}
        />
      </fieldset>
      <Button type="button" disabled={busy} onClick={persist}>
        <T text="Save grading rules" />
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {t(message)}
        </p>
      )}
    </div>
  );
}
