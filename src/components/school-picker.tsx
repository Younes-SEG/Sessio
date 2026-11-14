'use client';

import { useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useLanguage, useT } from './language-provider';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { schoolName, schools } from '@/lib/schools';

export function SchoolPicker({
  value,
  onChange,
  name,
  autoFocus = false,
}: {
  value: string | null;
  onChange: (value: string) => void;
  name?: string;
  autoFocus?: boolean;
}) {
  const t = useT();
  const { language } = useLanguage();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(t.locale);
    if (!term) return schools;
    return schools.filter((school) =>
      [school.name, school.nameFr, school.province]
        .filter(Boolean)
        .some((part) => part!.toLocaleLowerCase(t.locale).includes(term)),
    );
  }, [query, t.locale]);

  return (
    <div className="space-y-3">
      <div className="field">
        <Label htmlFor={searchId}>{t('Search for your school')}</Label>
        <div className="relative mt-2">
          <Search
            aria-hidden
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('School name or province')}
            className="input-with-icon"
            autoFocus={autoFocus}
          />
        </div>
      </div>
      <div role="radiogroup" aria-label={t('Schools')} className="space-y-2">
        {matches.map((school) => (
          <label key={school.id} className="block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={school.id}
              checked={value === school.id}
              onChange={() => onChange(school.id)}
              className="peer sr-only"
            />
            <span className="flex items-center justify-between gap-4 rounded-sm border-2 border-[var(--border)] bg-[var(--card)] p-4 transition-colors peer-checked:border-[var(--primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)] peer-focus-visible:ring-offset-2">
              <span>
                <strong className="block text-sm">{schoolName(school, language)}</strong>
                <span className="muted mt-1 block text-xs">{school.province}</span>
              </span>
              {value === school.id && (
                <span className="badge text-[var(--primary)]">{t('Selected')}</span>
              )}
            </span>
          </label>
        ))}
        {!matches.length && (
          <p className="muted rounded-sm border border-[var(--border)] p-4 text-sm" role="status">
            {t('No listed school matches your search.')}
          </p>
        )}
      </div>
    </div>
  );
}
