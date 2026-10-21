'use client';
import { T, useT } from '@/components/language-provider';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { Assessment, Course, Subtask, Task } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/dates';

export function TaskFields({
  initial,
  courses,
  assessments,
  timeFormat = '12',
}: {
  initial: Partial<Task>;
  courses: Course[];
  assessments: Assessment[];
  timeFormat?: '12' | '24';
}) {
  const t = useT();
  const [status, setStatus] = useState(initial.status ?? 'NOT_STARTED');
  const [courseId, setCourseId] = useState(
    initial.courseId ??
      assessments.find((assessment) => assessment.id === initial.assessmentId)?.courseId ??
      '',
  );
  const [assessmentId, setAssessmentId] = useState(initial.assessmentId ?? '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(initial.subtasks ?? []);
  function updateSubtask(id: string, change: Partial<Subtask>) {
    setSubtasks((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }
  return (
    <div className="form-grid">
      <TextField
        name="title"
        label={t('Task title')}
        value={initial.title}
        placeholder={t('What needs to get done?')}
        required
        wide
      />
      <CourseField
        courses={courses}
        value={courseId}
        onChange={(value) => {
          setCourseId(value);
          setAssessmentId('');
        }}
      />
      <SelectField
        name="assessmentId"
        label={t('Assessment (optional)')}
        value={assessmentId}
        onChange={setAssessmentId}
        required={false}
        options={[
          { value: '', label: courseId ? 'No assessment' : 'Select a course first' },
          ...assessments
            .filter((assessment) => assessment.courseId === courseId)
            .map((assessment) => ({ value: assessment.id, label: assessment.name })),
        ]}
      />
      <TextField
        name="dueDate"
        label={t('Due date & time (optional)')}
        type="datetime-local"
        value={localDateTime(initial.dueDate)}
      />
      <TextField
        name="estimatedMinutes"
        label={t('Estimated duration (minutes)')}
        type="number"
        value={initial.estimatedMinutes}
        min={1}
        max={10080}
        step={1}
        placeholder="e.g. 45"
      />
      <SelectField
        name="priority"
        label={t('Priority')}
        value={initial.priority ?? 'MEDIUM'}
        options={optionsFor(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])}
      />
      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--control-border)] p-3">
          <input
            type="checkbox"
            checked={status === 'COMPLETED'}
            onChange={(event) => setStatus(event.target.checked ? 'COMPLETED' : 'IN_PROGRESS')}
            aria-describedby="task-completed-help"
          />
          <span className="text-sm font-medium">
            <T text="Completed" />
          </span>
        </label>
        <p id="task-completed-help" className="muted text-xs leading-relaxed">
          <T text="Check this when the task is finished, then save your changes. Uncheck it to put the task back in progress." />
        </p>
        <SelectField
          name="status"
          label={t('Status')}
          value={status}
          onChange={(value) => setStatus(value as Task['status'])}
          options={optionsFor(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])}
        />
      </div>
      <NotesField
        name="description"
        label={t('Description')}
        value={initial.description}
        placeholder={t('Add context, links, or a little extra detail…')}
      />
      <Field name="subtasks" label={t('Subtasks')} wide>
        <input
          type="hidden"
          name="subtasks"
          value={JSON.stringify(subtasks.filter((item) => item.title.trim()))}
        />
        <div className="space-y-2" id="editor-subtasks" role="group" aria-label={t('Subtasks')}>
          {subtasks.map((subtask, index) => (
            <div className="flex items-center gap-2" key={subtask.id}>
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={(event) => updateSubtask(subtask.id, { completed: event.target.checked })}
                aria-label={`Complete subtask ${index + 1}`}
                className="size-4 shrink-0 accent-[var(--primary)]"
              />
              <Input
                value={subtask.title}
                onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })}
                aria-label={`Subtask ${index + 1}`}
                placeholder={t('A smaller step')}
                maxLength={200}
                className={subtask.completed ? 'line-through text-[var(--muted-foreground)]' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove subtask ${index + 1}`}
                onClick={() =>
                  setSubtasks((items) => items.filter((item) => item.id !== subtask.id))
                }
              >
                <X size={15} />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={subtasks.length >= 100}
            onClick={() =>
              setSubtasks((items) => [
                ...items,
                { id: crypto.randomUUID(), title: '', completed: false },
              ])
            }
          >
            <Plus size={15} />
            <T text="Add a subtask" />
          </Button>
        </div>
      </Field>
      {initial.createdAt && (
        <div className="muted space-y-1 text-xs sm:col-span-2">
          <p>
            <T text="Created" />{' '}
            <time dateTime={initial.createdAt}>
              {formatDate(
                initial.createdAt,
                { month: 'short', day: 'numeric', year: 'numeric' },
                t.locale,
              )}{' '}
              <T text="at" /> {formatTime(initial.createdAt, timeFormat, t.locale)}
            </time>
          </p>
          {initial.completedAt && (
            <p>
              <T text="Completed" />{' '}
              <time dateTime={initial.completedAt}>
                {formatDate(
                  initial.completedAt,
                  {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  },
                  t.locale,
                )}{' '}
                <T text="at" /> {formatTime(initial.completedAt, timeFormat, t.locale)}
              </time>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
