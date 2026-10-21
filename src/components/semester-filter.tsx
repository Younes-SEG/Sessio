'use client';
import { T, useT } from '@/components/language-provider';
import type { Semester } from '@/lib/types';

export function SemesterFilter({
  semesters,
  value,
  onChange,
}: {
  semesters: Semester[];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <T text="Semester" />
      <select
        className="input w-auto max-w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="active">
          <T text="Active semester" />
        </option>
        <option value="all">
          <T text="All semesters" />
        </option>
        {semesters.map((semester) => (
          <option key={semester.id} value={semester.id}>
            {semester.name}
            {semester.isActive ? t(' (active)') : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
