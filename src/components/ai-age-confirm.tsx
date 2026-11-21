'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useT } from './language-provider';
import { useWorkspace } from './workspace-provider';

/** True when hosted AI features still need the one-time 18+ confirmation. */
export function useAiAgeRequired() {
  const { data } = useWorkspace();
  return Boolean(data.hosted && !data.settings.aiAgeConfirmedAt);
}

/**
 * One-time confirmation before hosted AI features. Google's Gemini API terms
 * allow use only by people 18 or older; the server enforces the same rule.
 */
export function AiAgeConfirm() {
  const t = useT();
  const { refresh } = useWorkspace();
  const required = useAiAgeRequired();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!required) return null;
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/ai-age', { method: 'POST' });
      if (!response.ok) throw new Error();
      await refresh();
    } catch {
      setError('Could not save your confirmation. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="card space-y-3 p-4"
      aria-labelledby="ai-age-title"
      data-testid="ai-age-confirm"
    >
      <h2 id="ai-age-title" className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck size={16} aria-hidden />
        {t('AI features are for people 18 or older')}
      </h2>
      <p className="muted text-sm leading-relaxed">
        {t(
          'Ask Sessio and syllabus reading use Google Gemini, which may only be used by people 18 or older. Everything else in Sessio works at any age.',
        )}{' '}
        <Link className="underline" href="/legal/terms">
          {t('Terms')}
        </Link>
      </p>
      <Button onClick={() => void confirm()} disabled={busy}>
        {busy ? t('Saving…') : t('I’m 18 or older')}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-[var(--destructive)]">
          {t(error)}
        </p>
      )}
    </section>
  );
}
