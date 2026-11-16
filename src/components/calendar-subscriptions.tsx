'use client';
import { T, useT } from '@/components/language-provider';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CalendarDays, Link2, Loader2, RefreshCw, Unplug } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useWorkspace } from './workspace-provider';
import { currentTerm, type FeedPreview } from '@/lib/calendar-feed';
import { calendarNoticeVersion } from '@/lib/legal';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';

interface Subscription {
  id: string;
  enabled: boolean;
  name: string;
  fromDate: string;
  throughDate: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  itemCount: number;
}

/** `onConnected` lets first-run setup continue in place instead of linking away. */
export function CalendarSubscriptions({ onConnected }: { onConnected?: () => void } = {}) {
  const t = useT();
  const { now, refresh, data } = useWorkspace();
  const [options, setOptions] = useState(() => currentTerm(now));
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<FeedPreview | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/calendar-subscriptions', { cache: 'no-store' });
        if (!response.ok)
          throw new Error('Unable to load calendar connections. Please reload the page.');
        const rows: Subscription[] = await response.json();
        if (!cancelled) setSubscriptions(rows);
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : 'Unable to load calendars.');
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function perform(action: string, id?: string) {
    setBusy(id || action);
    setError('');
    setMessage('');
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/calendar-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          id,
          url,
          ...options,
          timeZone,
          consentVersion: calendarNoticeVersion,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to connect this calendar.');
      if (action === 'preview') setPreview(result);
      else {
        setSubscriptions(result);
        if (action === 'connect') {
          setUrl('');
          setPreview(null);
          onConnected?.();
        }
        await refresh();
        setMessage(
          action === 'forget'
            ? 'Saved link forgotten. Your imported entries are still here.'
            : action === 'disconnect'
              ? 'Disconnected. Your imported entries are still here.'
              : action === 'connect'
                ? 'Calendar connected. Your courses, assessments and events are ready.'
                : 'Calendar is up to date.',
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy('');
    }
  }

  function onConnect(event: FormEvent) {
    event.preventDefault();
    void perform('connect');
  }
  const deadlines =
    preview?.items.filter((item) => item.course && item.deadline && !item.cancelled).length || 0;
  const count = preview?.items.filter((item) => !item.cancelled).length || 0;
  const courses = [
    ...new Map(
      preview?.items
        .filter((item) => item.course && !item.cancelled)
        .map((item) => [item.course!.code, item.course!]),
    ).values(),
  ];

  const setup = Boolean(onConnected);
  const fullNotice = (
    <p id={setup ? undefined : 'calendar-preview-notice'} className="muted text-xs leading-relaxed">
      <T text="Save calendar stores this private link, imports the selected dates and enables refresh every 15 minutes while Command is running. Preview checks the feed without saving. Your calendar provider receives the request. Use only a link you are authorized to access." />{' '}
      {data.hosted &&
        t(
          'Your private link is stored in your online workspace and fetched by the hosted server. ',
        )}
      <Link className="underline" href="/legal/privacy">
        <T text="Calendar privacy details" />
      </Link>
      .
    </p>
  );
  const syncNotice = (
    <p className="muted text-xs leading-relaxed">
      {data.hosted
        ? t(
            'Checks for updates while you use Command, at most every 15 minutes per feed. Use Sync now for an immediate check. ',
          )
        : t(
            'Checks every 15 minutes while the Command server is running, even if you close this tab. Catches up after restart. ',
          )}
      <T text="Grades and notes stay yours. Entries that disappear from the feed are kept for review; explicit cancellations are labelled. Disconnecting keeps imported entries and remembers this feed for reconnection." />
    </p>
  );

  return (
    <section className="card overflow-hidden" id="calendar-connections">
      <div className="flex items-center gap-3 border-b border-[var(--border)] p-4 sm:px-5">
        <div className="flex size-9 items-center justify-center rounded-sm bg-[var(--muted)] text-[var(--primary)]">
          <Link2 size={18} />
        </div>
        <div>
          <h2 className="section-title">
            <T text="Connect your calendar" />
          </h2>
          <p className="muted mt-1 text-xs">
            <T text="Paste your Brightspace subscription link. Course deadlines become assessments, without duplicating translated entries." />
          </p>
        </div>
      </div>
      <div className="space-y-5 p-4 sm:px-5">
        <form onSubmit={onConnect} className="space-y-4">
          <fieldset disabled={!!busy} className="min-w-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="calendar-link">
                <T text="Calendar subscription link" />
              </Label>
              <Input
                id="calendar-link"
                type="password"
                autoComplete="off"
                spellCheck={false}
                required
                aria-describedby="calendar-link-help calendar-preview-notice"
                value={url}
                placeholder="https://… or webcal://…"
                onChange={(e) => {
                  setUrl(e.target.value);
                  setPreview(null);
                  setMessage('');
                }}
              />
              <p id="calendar-link-help" className="muted text-xs leading-relaxed">
                <T text="In Brightspace: Calendar → Settings → Enable Calendar Feeds, then Subscribe → copy the link. Choose all calendars to include all your courses." />
              </p>
              {setup ? (
                // First-run setup keeps one short notice visible; the full text sits in
                // "How this works" below, and Settings → Calendar still shows everything.
                <p id="calendar-preview-notice" className="muted text-xs leading-relaxed">
                  <T text="Command keeps this private link to refresh your deadlines. Use only a link you are authorized to access." />{' '}
                  <Link className="underline" href="/legal/privacy">
                    <T text="Calendar privacy details" />
                  </Link>
                  .
                </p>
              ) : (
                fullNotice
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={!url.trim() || !!busy}
                  aria-describedby="calendar-preview-notice"
                >
                  {busy === 'connect' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Link2 size={15} />
                  )}
                  {busy === 'connect' ? t('Saving calendar…') : t('Save calendar')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!url.trim() || !!busy}
                  onClick={() => void perform('preview')}
                >
                  {busy === 'preview' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CalendarDays size={15} />
                  )}
                  <T text="Preview calendar" />
                </Button>
              </div>
              {setup ? (
                <details className="text-xs" data-testid="calendar-how-it-works">
                  <summary className="text-primary cursor-pointer underline underline-offset-4">
                    <T text="How this works" />
                  </summary>
                  <div className="mt-2 space-y-2">
                    {fullNotice}
                    {syncNotice}
                  </div>
                </details>
              ) : (
                <p className="muted text-xs">
                  <T text="Calendar changes save here separately from your preferences." />
                </p>
              )}
            </div>
            <details className="rounded-sm border border-[var(--border)] p-3">
              <summary className="cursor-pointer text-sm">
                <T text="Import dates:" /> {options.fromDate} <T text="to" /> {options.throughDate}
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="calendar-from">
                    <T text="From" />
                  </Label>
                  <Input
                    id="calendar-from"
                    type="date"
                    required
                    value={options.fromDate}
                    onChange={(e) => {
                      setOptions({ ...options, fromDate: e.target.value });
                      setPreview(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendar-through">
                    <T text="Through" />
                  </Label>
                  <Input
                    id="calendar-through"
                    type="date"
                    required
                    value={options.throughDate}
                    onChange={(e) => {
                      setOptions({ ...options, throughDate: e.target.value });
                      setPreview(null);
                    }}
                  />
                </div>
              </div>
              <p className="muted mt-3 text-xs">
                <T text="Starts with the current term so old courses stay out. Sync uses this range until you reconnect with different dates." />
              </p>
            </details>
          </fieldset>
        </form>
        {preview && (
          <div className="space-y-4 rounded-sm border border-[var(--border)] bg-[var(--muted)]/40 p-4">
            <div>
              <h3 className="font-medium break-words">{preview.name}</h3>
              <p className="muted mt-1 text-sm">
                {courses.length} <T text="courses ·" /> {deadlines} <T text="deadlines ·" />{' '}
                {count - deadlines} <T text="other events in this date range" />
              </p>
            </div>
            {courses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => (
                  <span key={course.code} className="badge" title={course.name}>
                    {course.code}
                  </span>
                ))}
              </div>
            )}
            {!count ? (
              <p className="text-sm">
                <T text="No events in these dates. Expand the import dates and preview again." />
              </p>
            ) : (
              <>
                <ul
                  className="max-h-64 space-y-3 overflow-y-auto text-sm"
                  aria-label={t('Calendar import preview')}
                >
                  {preview.items
                    .filter((item) => !item.cancelled)
                    .slice(0, 100)
                    .map((item) => (
                      <li
                        key={item.key}
                        className="flex flex-wrap justify-between gap-1 border-b border-[var(--border)] pb-2"
                      >
                        <span className="min-w-0 break-words">
                          {item.title}
                          <span className="muted ml-2 text-xs">
                            {item.course?.code || 'Calendar event'}
                          </span>
                        </span>
                        <span className="muted text-xs">
                          {new Date(item.startAt).toLocaleDateString(t.locale, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </li>
                    ))}
                </ul>
                {count > 100 && (
                  <p className="muted text-xs">
                    <T text="Showing the first 100 of" /> {count} <T text="entries." />
                  </p>
                )}
                <p className="muted text-xs leading-relaxed">
                  <T text="Matching courses are reused; missing courses are created. Deadlines become assessments with no grade and 0% weight until you fill those in. Availability notices stay calendar events." />
                </p>
                <p id="calendar-connect-notice" className="text-sm leading-relaxed">
                  <T text="By choosing Connect and import, you authorize Command to store this private link and import and refresh its calendar data every 15 minutes while running. You can disconnect or forget it below at any time." />
                  {data.hosted && ' Hosted automatic checks depend on using the app.'}
                </p>
                <Button
                  aria-describedby="calendar-connect-notice"
                  disabled={!!busy}
                  onClick={() => void perform('connect')}
                >
                  {busy === 'connect' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Link2 size={15} />
                  )}
                  <T text="Connect and import" />
                </Button>
              </>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-[var(--destructive)]">
            {t(error)}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-[var(--primary)]">
            {t(message)}{' '}
            {message.startsWith('Calendar connected') && !onConnected && (
              <Link href="/calendar" className="underline">
                <T text="View calendar" />
              </Link>
            )}
          </p>
        )}
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="space-y-3 border-t border-[var(--border)] pt-4">
            <div>
              <h3 className="text-sm font-medium break-words">{subscription.name}</h3>
              {!subscription.enabled && (
                <p className="mt-1 text-sm">
                  <T text="Disconnected · Saved link retained" />
                </p>
              )}
              <p className="muted mt-1 text-xs">
                {subscription.itemCount} <T text="imported entries ·" /> {subscription.fromDate}{' '}
                <T text="to" /> {subscription.throughDate}
              </p>
              <p className="muted mt-1 text-xs">
                {subscription.lastSyncedAt
                  ? `Last synced ${new Date(subscription.lastSyncedAt).toLocaleString()}`
                  : t('Waiting for first sync')}
              </p>
            </div>
            {subscription.lastError && (
              <p role="alert" className="text-sm text-[var(--destructive)]">
                {subscription.lastError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!!busy || !subscription.enabled}
                onClick={() => void perform('sync', subscription.id)}
              >
                {busy === subscription.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                <T text="Sync now" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!!busy || !subscription.enabled}
                onClick={() => void perform('disconnect', subscription.id)}
              >
                <Unplug size={14} />
                <T text="Disconnect" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={!!busy}>
                    <T text="Forget link" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      <T text="Forget this calendar link?" />
                    </DialogTitle>
                    <DialogDescription>
                      <T text="The saved private URL and sync mapping for" /> {subscription.name}{' '}
                      <T text="will be deleted. Imported courses and entries stay in your workspace. Reconnecting after this may create duplicates." />
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">
                        <T text="Cancel" />
                      </Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button onClick={() => void perform('forget', subscription.id)}>
                        <T text="Forget saved link" />
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
        {!setup && syncNotice}
      </div>
    </section>
  );
}
