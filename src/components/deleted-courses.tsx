'use client';

import { useState } from 'react';
import { Trash2, RotateCcw, ChevronDown } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { useT } from './language-provider';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';

export function DeletedCourses() {
  const { data, refresh } = useWorkspace();
  const t = useT();
  const courses = data.deletedCourses || [];
  const [confirmId, setConfirmId] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = courses.find((c) => c.id === confirmId);
  async function change(id: string, permanent: boolean) {
    setBusy(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/deleted-courses/${encodeURIComponent(id)}`, {
        method: permanent ? 'DELETE' : 'POST',
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'This change could not be saved. Please try again.');
      setConfirmId('');
      await refresh();
      setNotice(
        permanent ? 'Course permanently deleted.' : 'Course restored to its original term.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'This change could not be saved. Please try again.',
      );
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="mt-10" aria-label={t('Deleted courses')}>
      <details className="card group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-semibold [&::-webkit-details-marker]:hidden">
          <Trash2 size={18} aria-hidden /> {t('Deleted courses')}{' '}
          <span className="muted text-sm">{courses.length}</span>
          <ChevronDown
            size={18}
            aria-hidden
            className="ml-auto transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-[var(--border)] p-4 space-y-4">
          <p className="muted text-sm">
            {t(
              'Deleted courses keep their grades, assessments and linked work until you restore them or delete them permanently. They do not appear in your calendar, tasks or grades.',
            )}
          </p>
          {!courses.length && <p className="text-sm">{t('No deleted courses.')}</p>}
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-[var(--border)] p-4"
            >
              <div>
                <p className="font-semibold">
                  {course.code} · {course.name}
                </p>
                <p className="muted text-sm">
                  {data.semesters.find((s) => s.id === course.semesterId)?.name}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={Boolean(busy)}
                  onClick={() => change(course.id, false)}
                >
                  <RotateCcw size={16} />
                  {t('Restore')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    setConfirmId(course.id);
                    setError('');
                  }}
                >
                  <Trash2 size={16} />
                  {t('Delete permanently')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </details>
      {notice && (
        <p role="status" className="mt-3 text-sm">
          {t(notice)}
        </p>
      )}
      {error && !selected && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t(error)}
        </p>
      )}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmId('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete permanently')}?</DialogTitle>
            <DialogDescription>
              {t(
                'This permanently removes this course and its assessments, grades, class schedule, linked tasks and calendar events. This cannot be undone.',
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-sm bg-muted p-4 font-semibold">
            {selected?.code} · {selected?.name}
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {t(error)}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => setConfirmId('')}>
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(busy)}
              onClick={() => change(confirmId, true)}
            >
              {t(busy ? 'Deleting…' : 'Delete permanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
