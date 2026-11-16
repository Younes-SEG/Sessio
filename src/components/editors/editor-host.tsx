'use client';
import { T, useT } from '@/components/language-provider';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/components/workspace-provider';
import { brightspaceUrl } from '@/lib/brightspace';
import { scopeWorkspace } from '@/lib/workspace-scope';
import type { EditorKind, EditorState } from '@/lib/types';
import { CourseFields, SemesterFields } from './course-fields';
import { AssessmentFields } from './assessment-fields';
import { TaskFields } from './task-fields';
import { EventFields, ScheduleFields } from './calendar-fields';

const labels: Record<EditorKind, string> = {
  courses: 'course',
  semesters: 'semester',
  assessments: 'assessment',
  tasks: 'task',
  events: 'event',
  schedules: 'class session',
};
const descriptions: Record<EditorKind, string> = {
  courses: 'A dedicated space for your course, assessments, and progress.',
  semesters: 'Keep your university life organized, one term at a time.',
  assessments: 'Keep deadlines, course weights, and grades in one place.',
  tasks: 'Turn something on your mind into a clear next step.',
  events: 'Make room in your calendar for what matters.',
  schedules: 'Add a recurring class to your weekly rhythm.',
};

function serialize(kind: EditorKind, form: FormData): Record<string, unknown> {
  const text = (key: string) => String(form.get(key) ?? '').trim();
  const optional = (key: string) => text(key) || null;
  const number = (key: string) => Number(text(key));
  const checked = (key: string) => form.get(key) === 'on';
  const datetime = (key: string) => (text(key) ? new Date(text(key)).toISOString() : null);
  switch (kind) {
    case 'courses':
      return {
        code: text('code'),
        name: text('name'),
        semesterId: text('semesterId'),
        instructor: optional('instructor'),
        credits: text('credits') ? number('credits') : null,
        color: text('color'),
        notes: text('notes'),
        archived: checked('archived'),
      };
    case 'semesters': {
      if (text('endDate') < text('startDate'))
        throw new Error('The semester end date must be on or after its start date.');
      return {
        name: text('name'),
        startDate: text('startDate'),
        endDate: text('endDate'),
        isActive: checked('isActive'),
      };
    }
    case 'assessments': {
      const score = text('score') ? number('score') : null;
      if (score !== null && score > number('maxScore'))
        throw new Error('Score received cannot exceed the maximum score.');
      return {
        name: text('name'),
        courseId: text('courseId'),
        type: text('type'),
        dueDate: datetime('dueDate'),
        weight: number('weight'),
        maxScore: number('maxScore'),
        score,
        status: score !== null ? 'GRADED' : text('status'),
        notes: text('notes'),
      };
    }
    case 'tasks':
      return {
        title: text('title'),
        description: text('description'),
        dueDate: datetime('dueDate'),
        priority: text('priority'),
        status: text('status'),
        estimatedMinutes: text('estimatedMinutes') ? number('estimatedMinutes') : null,
        courseId: optional('courseId'),
        assessmentId: optional('assessmentId'),
        subtasks: JSON.parse(text('subtasks') || '[]'),
      };
    case 'events': {
      const allDay = checked('allDay');
      const start = new Date(allDay ? `${text('startAt')}T00:00:00` : text('startAt'));
      const end = new Date(allDay ? `${text('endAt')}T00:00:00` : text('endAt'));
      if (allDay) end.setDate(end.getDate() + 1);
      if (end <= start) throw new Error('The event must end after it starts.');
      return {
        title: text('title'),
        description: text('description'),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        allDay,
        courseId: optional('courseId'),
        location: text('location'),
        color: text('color'),
      };
    }
    case 'schedules': {
      if (text('endTime') <= text('startTime'))
        throw new Error('The class must end after it starts, on the same day.');
      return {
        title: text('title'),
        courseId: text('courseId'),
        dayOfWeek: number('dayOfWeek'),
        startTime: text('startTime'),
        endTime: text('endTime'),
        location: text('location'),
      };
    }
  }
}

function EntityDialog({ editor }: { editor: EditorState }) {
  const t = useT();
  const { data, save, remove, closeEditor, openEditor } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const router = useRouter();
  const record = editor.id ? data[editor.kind].find((item) => item.id === editor.id) : undefined;
  const initial = { ...editor.defaults, ...record };
  const linkedAssessment =
    record && 'assessmentId' in record
      ? data.assessments.find((item) => item.id === record.assessmentId)
      : undefined;
  const sourceUrl =
    record && ['tasks', 'assessments', 'events'].includes(editor.kind)
      ? brightspaceUrl(
          'notes' in record ? record.notes : 'description' in record ? record.description : '',
          linkedAssessment?.notes,
        )
      : null;
  const initialCourseId = 'courseId' in initial ? initial.courseId : undefined;
  const activeCourseIds = new Set(scopeWorkspace(data).courses.map((course) => course.id));
  const editorCourses = data.courses.filter(
    (course) => activeCourseIds.has(course.id) || course.id === initialCourseId,
  );
  const label = labels[editor.kind];
  const missing = Boolean(editor.id && !record);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // A student's first course is empty; point them at the next useful step instead of closing.
    const firstCourse = editor.kind === 'courses' && !editor.id && data.courses.length === 0;
    setBusy(true);
    setError('');
    try {
      const saved = await save(editor.kind, serialize(editor.kind, form), editor.id);
      const id =
        saved && typeof saved === 'object' && 'id' in saved && typeof saved.id === 'string'
          ? saved.id
          : '';
      if (firstCourse && id) {
        setCreated({ id, code: String(form.get('code') ?? '').trim() });
        return;
      }
      closeEditor();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntity() {
    if (!editor.id) return;
    setBusy(true);
    setError('');
    try {
      await remove(editor.kind, editor.id);
      closeEditor();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const go = (href: string) => {
      closeEditor();
      router.push(href);
    };
    return (
      <Dialog open onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="sm:max-w-[480px]" data-testid="course-next-step">
          <DialogHeader>
            <DialogTitle>
              {t('{code} is ready').replace('{code}', created.code || t('Your course'))}
            </DialogTitle>
            <DialogDescription>
              {t(
                'Next, bring in its assessments: import the syllabus to fill in dates and weights, or add them yourself.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={() => go(`/syllabus?course=${encodeURIComponent(created.id)}`)}>
              <FileText aria-hidden />
              {t('Import its syllabus')}
            </Button>
            <Button
              variant="outline"
              onClick={() => openEditor('assessments', undefined, { courseId: created.id })}
            >
              <Plus aria-hidden />
              {t('Add an assessment')}
            </Button>
          </div>
          <DialogFooter className="mt-2 gap-2 border-t border-[var(--border)] pt-4 sm:flex-row">
            <Button
              variant="ghost"
              className="sm:mr-auto"
              onClick={() => go(`/courses/${encodeURIComponent(created.id)}`)}
            >
              {t('Open course')}
            </Button>
            <Button variant="ghost" onClick={closeEditor}>
              {t('Later')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) closeEditor();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>
            {confirmDelete ? t(`Delete ${label}?`) : t(`${editor.id ? 'Edit' : 'New'} ${label}`)}
          </DialogTitle>
          <DialogDescription>
            {confirmDelete
              ? t(
                  editor.kind === 'courses'
                    ? 'This moves the course and its linked work to Deleted courses. It will disappear from your workspace, but you can restore it from the Courses page.'
                    : 'This action is permanent and cannot be undone.',
                )
              : t(descriptions[editor.kind])}
          </DialogDescription>
        </DialogHeader>
        {sourceUrl && !confirmDelete && (
          <Button
            asChild
            variant="outline"
            className="mb-5 w-fit border-[var(--primary)] text-primary"
          >
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              <ExternalLink aria-hidden /> <T text="Open in Brightspace" />
              <span className="sr-only">
                <T text="(opens in a new tab)" />
              </span>
            </a>
          </Button>
        )}
        {missing ? (
          <div className="py-6">
            <p>
              <T text="This" /> {t(label)} <T text="no longer exists." />
            </p>
            <Button variant="outline" onClick={closeEditor} className="mt-4">
              <T text="Close" />
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className={confirmDelete ? 'hidden' : 'form-stack'}>
              <fieldset disabled={busy} className="min-w-0">
                {editor.kind === 'courses' && (
                  <CourseFields
                    initial={initial}
                    semesters={data.semesters}
                    schoolId={data.settings.schoolId}
                  />
                )}
                {editor.kind === 'semesters' && <SemesterFields initial={initial} />}
                {editor.kind === 'assessments' && (
                  <AssessmentFields initial={initial} courses={editorCourses} />
                )}
                {editor.kind === 'tasks' && (
                  <TaskFields
                    initial={initial}
                    courses={editorCourses}
                    assessments={data.assessments}
                    timeFormat={data.settings.timeFormat}
                  />
                )}
                {editor.kind === 'events' && (
                  <EventFields initial={initial} courses={editorCourses} />
                )}
                {editor.kind === 'schedules' && (
                  <ScheduleFields initial={initial} courses={editorCourses} />
                )}
              </fieldset>
              {error && (
                <p
                  role="alert"
                  className="rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-[var(--destructive)]"
                >
                  {t(error)}
                </p>
              )}
              <DialogFooter className="mt-2 flex-col-reverse gap-2 border-t border-[var(--border)] pt-5 sm:flex-row">
                {editor.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--destructive)] sm:mr-auto"
                    disabled={busy}
                    onClick={() => {
                      setError('');
                      setConfirmDelete(true);
                    }}
                  >
                    <Trash2 size={15} />
                    <T text="Delete" />
                  </Button>
                )}
                <Button type="button" variant="outline" disabled={busy} onClick={closeEditor}>
                  <T text="Cancel" />
                </Button>
                <Button
                  type="submit"
                  disabled={busy || (editor.kind === 'courses' && !data.semesters.length)}
                >
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  {busy ? t('Saving…') : editor.id ? t('Save changes') : t(`Create ${label}`)}
                </Button>
              </DialogFooter>
            </form>
            {confirmDelete && (
              <div className="form-stack">
                <p className="text-sm leading-relaxed">
                  {editor.kind === 'courses'
                    ? t(
                        'This permanently deletes the course and all its assessments, grades, recurring classes, linked tasks, and linked calendar events. Unlinked personal items are kept. To keep your records, cancel and archive the course instead.',
                      )
                    : editor.kind === 'semesters'
                      ? `This permanently deletes this term and its ${data.courses.filter((course) => course.semesterId === editor.id).length} courses, including their assessments, grades, recurring classes, linked tasks and linked calendar events. Unlinked personal items and other terms are kept. Move any courses you want to keep into another term before deleting.`
                      : `This ${label} will be removed from your workspace.`}
                </p>
                {error && (
                  <p role="alert" className="text-sm text-[var(--destructive)]">
                    {t(error)}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    autoFocus
                    onClick={() => {
                      setError('');
                      setConfirmDelete(false);
                    }}
                  >
                    <T text="Keep" /> {t(label)}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy}
                    onClick={deleteEntity}
                  >
                    {busy && <Loader2 size={15} className="animate-spin" />}
                    <T text="Delete" /> {t(label)}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditorHost() {
  const { editor } = useWorkspace();
  return editor ? (
    <EntityDialog
      key={`${editor.kind}:${editor.id ?? 'new'}:${JSON.stringify(editor.defaults ?? {})}`}
      editor={editor}
    />
  ) : null;
}
