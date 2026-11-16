'use client';
import { useT } from '@/components/language-provider';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EditorKind, EditorState, EntityKind, Workspace } from '@/lib/types';
import { EmailAutoSync } from './email-updates';
import { applyThemePreference, themePreference } from '@/lib/theme';
import { accessDeniedDestination } from '@/lib/access-denial';
interface WorkspaceContextValue {
  data: Workspace;
  now: Date;
  editor: EditorState | null;
  /** Resolves with the saved record as the API returned it (e.g. a new course's id). */
  save: (kind: EntityKind, input: Record<string, unknown>, id?: string) => Promise<unknown>;
  remove: (kind: EntityKind, id: string) => Promise<unknown>;
  refresh: () => Promise<void>;
  openEditor: (kind: EditorKind, id?: string, defaults?: Record<string, unknown>) => void;
  closeEditor: () => void;
}
const Context = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({
  initialData,
  initialNow,
  children,
}: {
  initialData: Workspace;
  initialNow: number;
  children: ReactNode;
}) {
  const t = useT();
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(() => new Date(initialNow));
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notice, setNotice] = useState('');
  const requestNumber = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyThemePreference(data.settings.theme);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [data.settings.theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const refresh = useCallback(async () => {
    const number = ++requestNumber.current;
    const response = await fetch('/api/workspace', { cache: 'no-store' });
    const result: unknown = await response.json().catch(() => null);
    const reason =
      result && typeof result === 'object' && 'reason' in result ? result.reason : undefined;
    const destination = accessDeniedDestination(response.status, reason);
    if (destination) {
      window.location.replace(destination);
      return;
    }
    if (!response.ok) throw new Error('Unable to refresh your workspace. Please retry.');
    if (number === requestNumber.current) {
      setData(result as Workspace);
      setNow(new Date());
    }
  }, []);
  useEffect(() => {
    const update = () => {
      if (!document.hidden) void refresh().catch(() => {});
    };
    const timer = setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, [refresh]);
  const mutate = useCallback(
    async (kind: EntityKind, method: string, input?: Record<string, unknown>, id?: string) => {
      const response = await fetch(`/api/${kind}${id ? `/${encodeURIComponent(id)}` : ''}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: input ? JSON.stringify(input) : undefined,
      });
      const result = await response.json().catch(() => ({}));
      const reason =
        result && typeof result === 'object' && 'reason' in result ? result.reason : undefined;
      const destination = accessDeniedDestination(response.status, reason);
      if (destination) {
        window.location.replace(destination);
        return;
      }
      if (!response.ok)
        throw new Error(result.error || 'This change could not be saved. Please try again.');
      if (kind === 'settings' && input?.theme !== undefined)
        applyThemePreference(themePreference(input.theme));
      try {
        await refresh();
      } catch {
        window.location.reload();
        return;
      }
      setNotice(method === 'DELETE' ? 'Deleted from your workspace' : 'Saved to your workspace');
      return result as unknown;
    },
    [refresh],
  );
  const save = useCallback(
    (kind: EntityKind, input: Record<string, unknown>, id?: string) =>
      mutate(kind, id ? 'PATCH' : 'POST', input, id),
    [mutate],
  );
  const remove = useCallback(
    (kind: EntityKind, id: string) => mutate(kind, 'DELETE', undefined, id),
    [mutate],
  );
  const openEditor = useCallback(
    (kind: EditorKind, id?: string, defaults?: Record<string, unknown>) =>
      setEditor({ kind, id, defaults }),
    [],
  );
  const closeEditor = useCallback(() => setEditor(null), []);
  return (
    <Context.Provider value={{ data, now, editor, save, remove, refresh, openEditor, closeEditor }}>
      <EmailAutoSync />
      {children}
      <div role="status" aria-live="polite" className={notice ? 'toast visible' : 'toast'}>
        {notice && (
          <>
            <span className="toast-check">✓</span>
            {t(notice)}
          </>
        )}
      </div>
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkspaceProvider is required');
  return value;
}
