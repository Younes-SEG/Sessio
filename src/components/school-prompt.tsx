'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, X } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { useT } from './language-provider';
import { SchoolPicker } from './school-picker';
import { Button } from './ui/button';

const DISMISSED = 'command-school-prompt-dismissed-v1';

export function dismissSchoolPrompt() {
  try {
    localStorage.setItem(DISMISSED, 'true');
  } catch {
    // A blocked storage preference should not block onboarding or saving.
  }
}

export function SchoolPrompt() {
  const t = useT();
  const { data, save } = useWorkspace();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setVisible(!data.settings.schoolId && localStorage.getItem(DISMISSED) !== 'true');
      } catch {
        setVisible(!data.settings.schoolId);
      }
    });
    return () => window.clearTimeout(timer);
  }, [data.settings.schoolId]);

  function dismiss() {
    dismissSchoolPrompt();
    setVisible(false);
  }

  async function choose() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      await save('settings', { schoolId: selected }, 'preferences');
      dismiss();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save your school. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!visible || !data.settings.onboardingCompleted) return null;
  return (
    <aside
      className="mx-4 mt-4 rounded-sm border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:mx-8"
      aria-labelledby="school-prompt-title"
    >
      <div className="flex items-start gap-3">
        <GraduationCap aria-hidden className="mt-0.5 shrink-0 text-[var(--primary)]" size={20} />
        <div className="min-w-0 flex-1">
          <h2 id="school-prompt-title" className="text-sm font-semibold">
            {t('Which school do you attend?')}
          </h2>
          <p className="muted mt-1 text-xs leading-relaxed">
            {t('Your school helps Command use the right grade scale and course weights.')}
          </p>
          {expanded ? (
            <div className="mt-4 max-w-xl space-y-3">
              <SchoolPicker value={selected} onChange={setSelected} autoFocus />
              {error && (
                <p role="alert" className="text-sm text-[var(--destructive)]">
                  {t(error)}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={choose} disabled={!selected || busy}>
                  {busy ? t('Saving...') : t('Save school')}
                </Button>
                <Button size="sm" variant="outline" onClick={dismiss} disabled={busy}>
                  {t("My school isn't listed")}
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setExpanded(true)}>
              {t('Choose school')}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label={t('Dismiss school question')}
        >
          <X aria-hidden size={16} />
        </Button>
      </div>
    </aside>
  );
}
