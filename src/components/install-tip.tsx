'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Smartphone, X } from 'lucide-react';
import { useT } from './language-provider';
import { useWorkspace } from './workspace-provider';
import { schoolPromptDismissed } from './school-prompt';
import { Button } from './ui/button';

const DISMISSED = 'command-install-tip-dismissed-v1';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Chromium fires beforeinstallprompt once, possibly before the workspace shell mounts,
// so the root layout captures it here and the tip reads it later.
let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
function setDeferredPrompt(event: InstallPromptEvent | null) {
  deferredPrompt = event;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Registers /sw.js, which caches nothing but a static offline page (see public/sw.js).
 * Rendered once in the root layout so sign-in pages can be installed too.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };
    const installed = () => setDeferredPrompt(null);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {
          // The site works the same without it; only installing and the offline notice need it.
        });
    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  return null;
}

export function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isAppleMobile() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** A dismissible "Add to Home Screen" tip for phones and tablets, hidden once installed. */
export function InstallTip() {
  const t = useT();
  const { data } = useWorkspace();
  const prompt = useSyncExternalStore(
    subscribe,
    () => deferredPrompt,
    () => null,
  );
  const [visible, setVisible] = useState(false);
  const [apple, setApple] = useState(false);

  useEffect(() => {
    // Waits for hydration; shows on touch devices only and never next to the school question.
    const timer = window.setTimeout(() => {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISSED) === 'true';
      } catch {
        // Without storage the tip still shows and can be closed for this visit.
      }
      setApple(isAppleMobile());
      setVisible(
        !dismissed &&
          !isInstalled() &&
          window.matchMedia('(pointer: coarse)').matches &&
          Boolean(data.settings.schoolId || schoolPromptDismissed()),
      );
    });
    return () => window.clearTimeout(timer);
  }, [data.settings.schoolId]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED, 'true');
    } catch {
      // Closing still works for this visit.
    }
    setVisible(false);
  }

  async function install() {
    if (!prompt) return;
    setDeferredPrompt(null);
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === 'accepted') dismiss();
  }

  if (!visible || !data.settings.onboardingCompleted) return null;
  return (
    <aside
      className="mx-4 mt-4 rounded-sm border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:mx-8"
      aria-labelledby="install-tip-title"
      data-testid="install-tip"
    >
      <div className="flex items-start gap-3">
        <Smartphone aria-hidden className="mt-0.5 shrink-0 text-[var(--primary)]" size={20} />
        <div className="min-w-0 flex-1">
          <h2 id="install-tip-title" className="text-sm font-semibold">
            {t('Add Command to your home screen')}
          </h2>
          <p className="muted mt-1 text-xs leading-relaxed">
            {prompt
              ? t('Open it like an app, without the browser bars.')
              : apple
                ? t('Tap Share, then Add to Home Screen.')
                : t('Open your browser menu, then choose Add to Home Screen or Install app.')}
          </p>
          {prompt && (
            <Button size="sm" variant="outline" className="mt-3" onClick={install}>
              {t('Install')}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label={t('Dismiss home screen tip')}
        >
          <X aria-hidden size={16} />
        </Button>
      </div>
    </aside>
  );
}
