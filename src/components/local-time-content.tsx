'use client';
import { useSyncExternalStore, type ReactNode } from 'react';
import { T } from '@/components/language-provider';

const subscribe = () => () => {};

/**
 * Workspace pages compute "today", due labels and calendar days in the viewer's
 * time zone. The server cannot know that zone (hosted servers run in UTC), so
 * these pages render only in the browser to avoid hydration mismatches.
 */
export function LocalTimeContent({ children }: { children: ReactNode }) {
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (inBrowser) return children;
  return (
    <p role="status" className="muted p-6 text-sm">
      <T text="Loading your workspace…" />
    </p>
  );
}
