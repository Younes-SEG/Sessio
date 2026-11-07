'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import type { Course } from '@/lib/types';
import { useWorkspace } from './workspace-provider';
import { useT } from './language-provider';
import { Button } from './ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';

export function DeleteCourse({ course }: { course: Course }) {
  const t = useT();
  const router = useRouter();
  const { remove, data } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await remove('courses', course.id);
      router.replace('/courses');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this course.');
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          setError('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 size={14} aria-hidden />
          {t('Delete course')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Delete course')}?</DialogTitle>
          <DialogDescription>
            {t(
              'This moves the course and its linked work to Deleted courses. It will disappear from your workspace, but you can restore it from the Courses page.',
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-sm bg-muted p-4">
          <p className="font-semibold">
            {course.code} · {course.name}
          </p>
          <p className="muted mt-1 text-sm">
            {data.semesters.find((term) => term.id === course.semesterId)?.name}
          </p>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t(error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={confirm}>
            {t(busy ? 'Deleting…' : 'Delete course')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
