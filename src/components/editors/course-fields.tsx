'use client';
import { T, useT } from '@/components/language-provider';
import { Field, NotesField, SelectField, TextField } from './fields';
import { Input } from '@/components/ui/input';
import type { Course, Semester } from '@/lib/types';
import { schoolById } from '@/lib/schools';

export function CourseFields({
  initial,
  semesters,
  schoolId,
}: {
  initial: Partial<Course>;
  semesters: Semester[];
  schoolId?: string | null;
}) {
  const t = useT();
  const defaultCredits = schoolById(schoolId)?.credits?.defaultPerCourse;
  return (
    <div className="form-grid">
      <TextField
        name="code"
        label={t('Course code')}
        value={initial.code}
        placeholder="e.g. SEG3101"
        maxLength={30}
        required
      />
      <SelectField
        name="semesterId"
        label={t('Semester')}
        value={initial.semesterId ?? semesters.find((semester) => semester.isActive)?.id ?? ''}
        options={[
          { value: '', label: 'Select a semester' },
          ...semesters.map((semester) => ({ value: semester.id, label: semester.name })),
        ]}
      />
      <TextField
        name="name"
        label={t('Course name')}
        value={initial.name}
        placeholder="e.g. Software Requirements Analysis"
        required
        wide
      />
      <TextField
        name="instructor"
        label={t('Instructor (optional)')}
        value={initial.instructor}
        placeholder={t('Professor’s name')}
      />
      <TextField
        name="credits"
        label={t('Credits (optional)')}
        type="number"
        min={0.01}
        max={1000}
        step="any"
        value={initial.credits ?? (!initial.id ? defaultCredits : undefined)}
        hint={t('Used for credit-weighted semester averages.')}
      />
      <Field
        name="color"
        label={t('Course color')}
        hint={t('Used across your courses and calendar.')}
      >
        <Input
          id="editor-color"
          name="color"
          type="color"
          className="h-10 w-full cursor-pointer p-1"
          defaultValue={initial.color ?? '#8273d5'}
        />
      </Field>
      <NotesField value={initial.notes} placeholder={t('Office hours, links, room numbers…')} />
      {initial.id && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="archived"
            defaultChecked={initial.archived}
            className="size-4 accent-[var(--primary)]"
          />
          <T text="Archive course (hide from active courses)" />
        </label>
      )}
      {!semesters.length && (
        <p className="text-sm text-[var(--destructive)] sm:col-span-2">
          <T text="Add a semester in Settings before creating a course." />
        </p>
      )}
    </div>
  );
}

export function SemesterFields({ initial }: { initial: Partial<Semester> }) {
  const t = useT();
  return (
    <div className="form-grid">
      <TextField
        name="name"
        label={t('Semester name')}
        value={initial.name}
        placeholder={t('e.g. Fall 2026')}
        maxLength={80}
        required
        wide
      />
      <TextField
        name="startDate"
        label={t('Start date')}
        type="date"
        value={initial.startDate?.slice(0, 10)}
        required
      />
      <TextField
        name="endDate"
        label={t('End date')}
        type="date"
        value={initial.endDate?.slice(0, 10)}
        required
      />
      <label className="flex items-start gap-3 rounded-sm border border-[var(--border)] p-4 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial.isActive ?? true}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span>
          <span className="font-medium">
            <T text="Make this the active semester" />
          </span>
          <span className="muted mt-1 block">
            <T text="Your default semester for new courses. This replaces the current active semester." />
          </span>
        </span>
      </label>
    </div>
  );
}
