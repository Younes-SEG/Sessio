'use client';

import { useId, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useLanguage, useT } from './language-provider';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { schoolById, schoolName, schools, searchSchools, type SchoolProfile } from '@/lib/schools';

/**
 * Compact school search. Nothing is listed until the student types; then up to six slim,
 * ranked results appear (short forms like "uoft" and small typos still match). The chosen
 * school stays visible as one line. Results are a native radio group, so arrow keys and
 * screen readers work without custom key handling.
 */
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
  const resultsId = useId();
  const groupName = useId();
  const [query, setQuery] = useState('');
  const { results, approximate } = useMemo(
    () => searchSchools(query, schools as readonly SchoolProfile[]),
    [query],
  );
  const selected = schoolById(value);
  const searching = query.trim().length > 0;

  return (
    <div className="space-y-2">
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
            placeholder={t('School name or short form, e.g. uOttawa')}
            className="input-with-icon"
            autoComplete="off"
            aria-controls={resultsId}
            autoFocus={autoFocus}
          />
        </div>
      </div>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      {selected && !searching && (
        <p className="flex items-center gap-2 text-sm">
          <Check aria-hidden size={16} className="text-[var(--primary)]" />
          <span>
            <strong>{schoolName(selected, language)}</strong>
            <span className="muted"> · {selected.province}</span>
          </span>
        </p>
      )}
      <div id={resultsId} aria-live="polite">
        {searching && results.length > 0 && (
          <>
            {approximate && (
              <p className="muted mb-1 text-xs">{t('No exact match. Closest schools:')}</p>
            )}
            <div
              role="radiogroup"
              aria-label={t('Matching schools')}
              className="overflow-hidden rounded-sm border border-[var(--border)]"
            >
              {results.map((school) => (
                <label
                  key={school.id}
                  className="block cursor-pointer border-b border-[var(--border)] last:border-b-0"
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={school.id}
                    checked={value === school.id}
                    onChange={() => onChange(school.id)}
                    className="peer sr-only"
                  />
                  <span className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)] peer-checked:bg-[var(--muted)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-[var(--primary)]">
                    <span className="min-w-0 truncate">
                      {schoolName(school, language)}
                      <span className="muted text-xs"> · {school.province}</span>
                    </span>
                    {value === school.id && (
                      <Check
                        aria-label={t('Selected')}
                        size={16}
                        className="shrink-0 text-[var(--primary)]"
                      />
                    )}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
        {searching && !results.length && (
          <p className="muted text-sm" role="status">
            {t('No listed school matches your search.')}
          </p>
        )}
      </div>
    </div>
  );
}
