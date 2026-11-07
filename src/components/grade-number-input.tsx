'use client';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from './ui/input';
import { useT } from './language-provider';

/** Whole-point arrows with unrestricted decimal entry (native step=1 rejects decimals). */
export function GradeNumberInput({
  id,
  value,
  onChange,
  label,
  min = 0,
  max,
  placeholder,
  required = true,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  min?: number;
  max?: number;
  placeholder?: string;
  required?: boolean;
}) {
  const t = useT();
  function adjust(delta: number) {
    const next = Math.max(min, Math.min(max ?? Infinity, (Number(value) || 0) + delta));
    onChange(String(Math.round(next * 1000000) / 1000000));
  }
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        step="any"
        min={min}
        max={max}
        required={required}
        value={value}
        className="grade-number-input min-h-14 pr-8"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            adjust(e.key === 'ArrowUp' ? 1 : -1);
          }
        }}
      />
      <div className="absolute right-1 top-1 bottom-1 grid w-6 grid-rows-2">
        <button
          type="button"
          className="rounded-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={`${t('Increase by 1')}: ${label}`}
          onClick={() => adjust(1)}
        >
          <ChevronUp size={14} className="mx-auto" aria-hidden />
        </button>
        <button
          type="button"
          className="rounded-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={`${t('Decrease by 1')}: ${label}`}
          onClick={() => adjust(-1)}
        >
          <ChevronDown size={14} className="mx-auto" aria-hidden />
        </button>
      </div>
    </div>
  );
}
