'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  LoaderCircle,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  TriangleAlert,
  ArrowRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useWorkspace } from './workspace-provider';
import { useT } from './language-provider';
import type { EmailOverview, EmailReviewAssessment, EmailReviewUpdate } from '@/lib/email-types';
import { GMAIL_NOTICE, DEFAULT_GMAIL_QUERY } from '@/lib/email-grades';
import { emailMessageText } from '@/lib/email-display';
import { useVisibleRead } from './use-visible-read';

async function requestEmail(body?: Record<string, unknown>, endpoint = '/api/email') {
  // Email deadline changes keep the assessment's local due time, so the server needs the zone.
  if (body?.action === 'sync')
    body = { ...body, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  const response = await fetch(
    endpoint,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { cache: 'no-store' },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load email updates.');
  return data;
}
export function EmailUpdatesLink() {
  const t = useT();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () =>
      void requestEmail()
        .then((v: EmailOverview) => {
          if (active) setCount(v.updates.filter((update) => update.kind === 'GRADE').length);
        })
        .catch(() => {});
    load();
    window.addEventListener('command-email-updated', load);
    return () => {
      active = false;
      window.removeEventListener('command-email-updated', load);
    };
  }, []);
  return (
    <Button asChild variant="outline">
      <Link href="/email">
        <Mail aria-hidden />
        {t('Grade emails')}
        {count > 0 && <span className="badge">{count}</span>}
      </Link>
    </Button>
  );
}

export function SchoolUpdatesBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () =>
      void requestEmail()
        .then((data: EmailOverview) => {
          if (active)
            setCount(
              data.updates.filter((update) => update.kind !== 'GRADE' && !update.read).length,
            );
        })
        .catch(() => {});
    load();
    window.addEventListener('command-email-updated', load);
    return () => {
      active = false;
      window.removeEventListener('command-email-updated', load);
    };
  }, []);
  return count > 0 ? <span className="nav-count">{count}</span> : null;
}

/** Polling runs while Command is open and visible; the server saves clear grades. */
export function EmailAutoSync() {
  const { refresh } = useWorkspace();
  useEffect(() => {
    let stopped = false,
      running = false,
      lastCheck = 0;
    async function check() {
      if (stopped || running || document.hidden || Date.now() - lastCheck < 240000) return;
      running = true;
      lastCheck = Date.now();
      try {
        const status: EmailOverview = await requestEmail();
        if (!stopped && status.configured && status.connection?.autoSync) {
          await requestEmail({ action: 'sync', automatic: true });
          if (!stopped) window.dispatchEvent(new Event('command-email-updated'));
        }
      } catch {
        /* The connection panel displays the stored sync error. */
      } finally {
        if (!stopped) {
          window.dispatchEvent(new Event('command-email-updated'));
          void refresh().catch(() => {});
        }
        running = false;
      }
    }
    void check();
    const timer = setInterval(() => void check(), 300000);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);
  return null;
}

export function EmailUpdates({ announcements = false }: { announcements?: boolean }) {
  const t = useT();
  const { data: workspace, refresh } = useWorkspace();
  const [data, setData] = useState<EmailOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [consent, setConsent] = useState(false);
  const [query, setQuery] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const load = useCallback(async () => {
    const value: EmailOverview = await requestEmail();
    setData(value);
    return value;
  }, []);
  const markRead = useCallback(async (id: string) => {
    await requestEmail({ action: 'read', id });
    setData((current) =>
      current
        ? {
            ...current,
            updates: current.updates.map((update) =>
              update.id === id ? { ...update, read: true } : update,
            ),
          }
        : current,
    );
    window.dispatchEvent(new Event('command-email-updated'));
  }, []);
  useEffect(() => {
    let active = true;
    void requestEmail()
      .then((value: EmailOverview) => {
        if (active) {
          setData(value);
          setQuery(value.connection?.query || '');
          setAutoSync(value.connection?.autoSync ?? true);
          const state = new URLSearchParams(window.location.search).get('connection');
          if (state === 'failed')
            setError('Gmail was not connected. Try again and allow read-only email access.');
          if (state === 'connected')
            setNotice('Gmail connected. Your email updates are ready to check.');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    const update = () => void load().catch(() => {});
    window.addEventListener('command-email-updated', update);
    return () => {
      active = false;
      window.removeEventListener('command-email-updated', update);
    };
  }, [load]);
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await requestEmail(body);
      await load();
      await refresh();
      window.dispatchEvent(new Event('command-email-updated'));
      if (body.action === 'sync')
        setNotice(
          'Email check finished. Clear grades and deadline changes are saved automatically.',
        );
      if (body.action === 'settings') setNotice('Email preferences saved.');
      if (body.action === 'apply') setNotice('Grade saved from your email review.');
      if (body.action === 'apply-deadline')
        setNotice(
          'Assessment deadline updated. Your calendar and study reminders will use the new date.',
        );
      if (body.action === 'disconnect') {
        setDisconnecting(false);
        setConsent(false);
        setNotice(
          result.revoked
            ? 'Gmail disconnected. Imported grades are kept.'
            : 'Gmail disconnected locally. You can also remove Command in your Google account connections.',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load email updates.');
      await load().catch(() => {});
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function connect() {
    setBusy(true);
    setError('');
    try {
      const result = await requestEmail({ consent: GMAIL_NOTICE }, '/api/email/connect');
      window.location.assign(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect Gmail.');
      setBusy(false);
    }
  }
  const updates =
    data?.updates.filter((update) =>
      announcements ? update.kind !== 'GRADE' : update.kind === 'GRADE',
    ) || [];
  const otherCount =
    data?.updates.filter((update) =>
      announcements ? update.kind === 'GRADE' : update.kind !== 'GRADE' && !update.read,
    ).length || 0;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-2">{t('YOUR SCHOOL UPDATES, TOGETHER')}</p>
          <h1>{t(announcements ? 'School updates' : 'Grade emails')}</h1>
          <p>
            {t(
              announcements
                ? 'Important course announcements and assessment changes from your school emails.'
                : 'Only grade results and grade-release notices appear here. Other course messages are in Updates.',
            )}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={announcements ? '/email' : '/updates'}>
            {t(announcements ? 'Grade emails' : 'School updates')}
            {otherCount > 0 && <span className="badge">{otherCount}</span>}
          </Link>
        </Button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-sm border border-destructive/40 p-4 text-sm text-destructive"
        >
          {t(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-sm border border-primary/40 bg-primary/10 p-4 text-sm">
          {t(notice)}
        </p>
      )}
      {!data && !error && (
        <p role="status" className="flex items-center gap-2">
          <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
          {t('Loading email connection…')}
        </p>
      )}
      {!data && error && (
        <Button
          onClick={() => {
            setError('');
            void load().catch((e) => setError(e.message));
          }}
        >
          {t('Try again')}
        </Button>
      )}
      {data && !data.connection && (
        <section className="card space-y-4 p-4 sm:p-5">
          <h2 className="section-title">{t('Connect Gmail')}</h2>
          <p className="muted text-sm">
            {t(
              'Google grants read-only mailbox access. Command searches for matching school notifications, reads their text, and keeps the readable message text for review. It does not send email, change your inbox, download attachments, or send email to AI services.',
            )}
          </p>
          {!data.configured ? (
            <>
              <p
                role="status"
                className="flex items-start gap-3 rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  {t(
                    data.releaseAvailable === false
                      ? 'Gmail connections are not available for this account yet.'
                      : 'Gmail connection setup is not complete.',
                  )}
                </span>
              </p>
              {!workspace.hosted && (
                <Button
                  asChild
                  className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left"
                >
                  <Link href="/guide#email">
                    <span className="min-w-0">{t('Set up Gmail for this local installation')}</span>
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  {t(
                    'Allow Command to read matching emails and check every five minutes while the app is open. Clear assessment and score matches are saved automatically; uncertain results stay for review.',
                  )}
                </span>
              </label>
              <Button disabled={!consent || busy} onClick={() => void connect()}>
                <Mail aria-hidden />
                {busy ? t('Connecting…') : t('Connect Gmail')}
              </Button>
            </>
          )}
        </section>
      )}
      {data?.connection && (
        <section className="card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title">{t('Connected Gmail')}</h2>
              <p className="mt-1 break-all text-sm">{data.connection.email}</p>
            </div>
            <Button
              disabled={busy || !data.configured}
              onClick={() => void action({ action: 'sync' })}
            >
              {busy ? (
                <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
              ) : (
                <RefreshCw aria-hidden />
              )}
              {busy ? t('Checking…') : t('Check emails now')}
            </Button>
          </div>
          <p className="muted text-xs">
            {t('Last completed check:')}{' '}
            {data.connection.lastCheckedAt
              ? new Date(data.connection.lastCheckedAt).toLocaleString(
                  t.locale === 'fr' ? 'fr-CA' : 'en-CA',
                )
              : t('Not checked yet')}
          </p>
          {data.connection.lastError && (
            <p role="alert" className="text-sm text-destructive">
              {t(data.connection.lastError)}
            </p>
          )}
          {data.connection.moreAvailable && (
            <p className="text-sm">
              {t('More matching emails are available. Check again to continue the scan.')}
            </p>
          )}
          <p className="muted text-sm">
            {t(
              'Clear assessment and score matches go straight to Grades. Uncertain results and conflicts with manually entered grades stay for review. Checks cover the last 30 days initially, then recent updates, and stop when Command is closed.',
            )}
          </p>
          <details className="space-y-4">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              {t('Email preferences')}
            </summary>
            <Button asChild variant="outline" size="sm">
              <Link href="/guide#brightspace-notifications">
                {t('Recommended Brightspace notifications')}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <label className="block space-y-2 text-sm">
              <span>{t('Gmail search filter')}</span>
              <Input
                value={query}
                maxLength={500}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy}
              />
            </label>
            <p className="muted text-xs">
              {t(
                'This search is combined with a school-notification filter. Only relevant grade notices, announcements and assessment changes are shown. Google permission still covers your mailbox.',
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setQuery(DEFAULT_GMAIL_QUERY)}
            >
              {t('Use recommended filter')}
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                disabled={busy}
              />
              {t('Check automatically while Command is open')}
            </label>
            <Button
              variant="outline"
              disabled={busy || !query.trim()}
              onClick={() => void action({ action: 'settings', query, autoSync })}
            >
              {t('Save email preferences')}
            </Button>
          </details>
          <div className="border-t border-border pt-4">
            {data.connection.lastError && data.configured && (
              <div className="mb-4 space-y-2">
                <p className="muted text-xs">
                  {t(
                    'Reconnect the same Gmail account to keep your reviews. Disconnect first to switch accounts.',
                  )}
                </p>
                <Button variant="outline" disabled={busy} onClick={() => void connect()}>
                  {t('Reconnect Gmail')}
                </Button>
              </div>
            )}
            {disconnecting ? (
              <div className="space-y-3">
                <p className="text-sm">
                  {t(
                    'Disconnect Gmail and delete its saved email reviews? Grades you already saved will stay.',
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void action({ action: 'disconnect' })}
                  >
                    {t('Disconnect and delete reviews')}
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => setDisconnecting(false)}>
                    {t('Cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" disabled={busy} onClick={() => setDisconnecting(true)}>
                {t('Disconnect Gmail')}
              </Button>
            )}
          </div>
        </section>
      )}
      {data?.connection && (
        <section className="space-y-4" aria-label={t('Email reviews')}>
          <h2 className="section-title">
            {t(announcements ? 'Course notifications' : 'Grades to review')} · {updates.length}
          </h2>
          {announcements && (
            <p className="muted text-sm">
              {t(
                'Notifications are marked as read after two seconds in view. Read messages stay here; assessment changes still need your confirmation.',
              )}
            </p>
          )}
          {updates.length === 0 ? (
            <div className="card p-4 text-sm muted">
              {t(
                announcements
                  ? 'No course announcements or assessment changes to review.'
                  : 'No grade emails to review. Grade-release notices can appear without a score; ordinary emails and lecture notes are excluded.',
              )}
            </div>
          ) : (
            updates.map((update) =>
              update.kind === 'GRADE' ? (
                <EmailReview
                  key={update.id}
                  update={update}
                  assessments={data.assessments}
                  busy={busy}
                  act={action}
                />
              ) : (
                <SchoolAnnouncement
                  key={update.id}
                  update={update}
                  assessments={data.assessments}
                  busy={busy}
                  act={action}
                  markRead={markRead}
                />
              ),
            )
          )}
        </section>
      )}
      {!announcements && Boolean(data?.automaticGrades?.length) && (
        <section className="space-y-3" aria-label={t('Automatic grade updates')}>
          <h2 className="section-title">{t('Automatic grade updates')}</h2>
          <p className="muted text-sm">
            {t(
              'Already in Grades. You can edit any result there. Recent email results are shown below.',
            )}
          </p>
          <div className="card divide-y divide-border">
            {data!.automaticGrades!.map((update) => {
              const assessment = data!.assessments.find((item) => item.id === update.assessmentId);
              return (
                <article
                  key={update.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {assessment ? `${assessment.course} · ${assessment.name}` : update.subject}
                    </p>
                    <p className="muted text-xs">
                      {t(update.alreadyRecorded ? 'Already recorded' : 'Saved automatically')} ·{' '}
                      {new Date(update.receivedAt).toLocaleDateString(t.locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular-nums">
                      {update.score} / {update.maxScore}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <a href={update.gmailUrl} target="_blank" rel="noopener noreferrer">
                        {t('Open in Gmail')}
                        <ExternalLink aria-hidden />
                      </a>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          <Button asChild variant="outline">
            <Link href="/grades">
              {t('View grades')}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}

function SchoolAnnouncement({
  update,
  assessments,
  busy,
  act,
  markRead,
}: {
  update: EmailReviewUpdate;
  assessments: EmailReviewAssessment[];
  busy: boolean;
  act: (body: Record<string, unknown>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
}) {
  const t = useT();
  const onRead = useCallback(() => markRead(update.id), [markRead, update.id]);
  const messageRef = useVisibleRead(Boolean(update.read), onRead);
  const [readError, setReadError] = useState(false);
  const [assessmentId, setAssessmentId] = useState(update.suggestedAssessmentId || '');
  const [date, setDate] = useState(update.proposedDeadline?.date || '');
  const [time, setTime] = useState(update.proposedDeadline?.time || '');
  const [confirmedRevision, setConfirmedRevision] = useState('');
  const selected = assessments.find((assessment) => assessment.id === assessmentId);
  const confirmationKey = selected
    ? `${selected.id}:${selected.deadlineRevision}:${date}:${time}`
    : '';
  const confirmed = Boolean(confirmationKey) && confirmedRevision === confirmationKey;
  const proposed = date && time ? new Date(`${date}T${time}`) : null;
  const valid = proposed && Number.isFinite(proposed.getTime());
  const change = update.kind === 'ASSESSMENT_CHANGE';
  return (
    <article className="card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-2">{t(change ? 'Assessment change' : 'Announcement')}</p>
          <h3 className="font-semibold break-words">{update.subject}</h3>
          <p className="muted mt-1 break-all text-xs">
            {update.sender} · {new Date(update.receivedAt).toLocaleDateString(t.locale)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={update.gmailUrl} target="_blank" rel="noopener noreferrer">
            {t('Open in Gmail')}
            <ExternalLink aria-hidden />
          </a>
        </Button>
      </div>
      <p
        ref={messageRef}
        className="whitespace-pre-wrap break-words rounded-sm bg-muted p-3 text-sm"
      >
        {emailMessageText(update) || t('Open the email in Gmail to read the message.')}
      </p>
      {(update.sourceEmails?.length || 0) > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-primary">
            {t('Matching emails grouped')} · {update.sourceEmails!.length}
          </summary>
          <p className="muted mt-2">
            {t('Same announcement, delivered more than once. The original emails stay in Gmail.')}
          </p>
          <ul className="mt-3 space-y-2">
            {update.sourceEmails!.map((source) => (
              <li key={source.id}>
                <a
                  className="break-words text-primary underline underline-offset-4"
                  href={source.gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {source.sender} · {new Date(source.receivedAt).toLocaleString(t.locale)}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      {update.bodyTruncated && (
        <p
          role="status"
          className="rounded-sm border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-3 text-sm"
        >
          {t(
            'Only part of this message could be imported. Open in Gmail to read the complete email.',
          )}
        </p>
      )}
      {!!update.appliedDeadlines?.length && (
        <div
          role="status"
          className="space-y-2 rounded-sm border border-[var(--border)] p-3 text-sm"
        >
          <p className="font-medium">{t('Deadline updated automatically from this email')}</p>
          <ul className="space-y-1">
            {update.appliedDeadlines.map((id) => {
              const assessment = assessments.find((a) => a.id === id);
              return (
                assessment && (
                  <li key={id}>
                    {assessment.course} · {assessment.name}:{' '}
                    {assessment.dueDate
                      ? new Date(assessment.dueDate).toLocaleString(t.locale, {
                          dateStyle: 'full',
                          timeStyle: 'short',
                        })
                      : t('Not set')}
                  </li>
                )
              );
            })}
          </ul>
          <p className="muted text-xs">
            {t(
              'If this is wrong, open the assessment and change its date. Command will not apply this email again.',
            )}
          </p>
        </div>
      )}
      {change && !update.appliedDeadlines?.length && (
        <details className="space-y-4">
          <summary className="cursor-pointer font-medium text-primary">
            {t('Review an assessment deadline')}
          </summary>
          <p className="muted text-sm">
            {t(
              'Command could not match this change to one assessment and one date, so nothing was changed. Confirm the assessment, new date and time before saving.',
            )}
          </p>
          <label className="block space-y-2 text-sm">
            <span>{t('Assessment to update')}</span>
            <select
              className="input w-full"
              value={assessmentId}
              disabled={busy}
              onChange={(event) => {
                setAssessmentId(event.target.value);
                setConfirmedRevision('');
              }}
            >
              <option value="">{t('Choose an assessment')}</option>
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.course} · {assessment.name}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <p className="text-sm">
              {t('Current deadline:')}{' '}
              {selected.dueDate
                ? new Date(selected.dueDate).toLocaleString(t.locale)
                : t('Not set')}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm">
              <span>{t('New due date')}</span>
              <Input
                type="date"
                value={date}
                disabled={busy}
                onChange={(event) => {
                  setDate(event.target.value);
                  setConfirmedRevision('');
                }}
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>{t('New due time')}</span>
              <Input
                type="time"
                value={time}
                disabled={busy}
                onChange={(event) => {
                  setTime(event.target.value);
                  setConfirmedRevision('');
                }}
              />
            </label>
          </div>
          <p className="muted text-xs">
            {t(
              'Times use your device time zone. Check any time zone stated in the email. Calendar sync can later replace dates linked to a calendar feed.',
            )}
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy || !selected || !valid}
              onChange={(event) =>
                setConfirmedRevision(event.target.checked ? confirmationKey : '')
              }
              className="mt-1"
            />
            <span>{t('I checked the email and confirm this assessment and deadline.')}</span>
          </label>
          <Button
            disabled={busy || !selected || !valid || !confirmed}
            onClick={() => {
              if (selected && proposed && valid)
                void act({
                  action: 'apply-deadline',
                  id: update.id,
                  assessmentId,
                  dueDate: proposed.toISOString(),
                  expectedRevision: selected.deadlineRevision,
                });
            }}
          >
            <Check aria-hidden />
            {t('Save reviewed deadline')}
          </Button>
        </details>
      )}
      {update.read ? (
        <p className="muted flex h-10 items-center gap-2 text-sm">
          <Check aria-hidden className="size-4" />
          {t('Read')}
        </p>
      ) : (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setReadError(false);
            void onRead().catch(() => setReadError(true));
          }}
        >
          <Check aria-hidden />
          {t('Mark as read')}
        </Button>
      )}
      {readError && !update.read && (
        <p role="status" className="text-sm text-destructive">
          {t('Could not mark as read. Please try again.')}
        </p>
      )}
    </article>
  );
}

function EmailReview({
  update,
  assessments,
  busy,
  act,
}: {
  update: EmailReviewUpdate;
  assessments: EmailReviewAssessment[];
  busy: boolean;
  act: (body: Record<string, unknown>) => Promise<void>;
}) {
  const t = useT();
  const [chosenAssessmentId, setAssessmentId] = useState<string | null>(null);
  // New matches from a refreshed source should populate untouched reviews, while
  // preserving any assessment the user has explicitly chosen (including blank).
  const assessmentId = chosenAssessmentId ?? update.suggestedAssessmentId ?? '';
  const [score, setScore] = useState(update.score?.toString() ?? '');
  const [maxScore, setMaxScore] = useState(update.maxScore?.toString() ?? '100');
  const selected = assessments.find((a) => a.id === assessmentId);
  const valid =
    score.trim() !== '' &&
    maxScore.trim() !== '' &&
    Number.isFinite(Number(score)) &&
    Number(score) >= 0 &&
    Number(maxScore) > 0 &&
    Number(score) <= Number(maxScore);
  return (
    <article className="card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold break-words">{update.subject}</h3>
          <p className="muted mt-1 break-all text-xs">
            {update.sender} ·{' '}
            {new Date(update.receivedAt).toLocaleDateString(t.locale === 'fr' ? 'fr-CA' : 'en-CA')}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={update.gmailUrl} target="_blank" rel="noopener noreferrer">
            {t('Open in Gmail')}
            <ExternalLink aria-hidden />
          </a>
        </Button>
      </div>
      {update.excerpt && (
        <details>
          <summary className="cursor-pointer text-sm text-primary">
            {t('Show email message')}
          </summary>
          <p className="mt-3 whitespace-pre-wrap break-words rounded-sm bg-muted p-3 text-sm">
            {emailMessageText(update) || t('Open the email in Gmail to read the message.')}
          </p>
          {update.bodyTruncated && (
            <p
              role="status"
              className="rounded-sm border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-3 text-sm"
            >
              {t(
                'Only part of this message could be imported. Open in Gmail to read the complete email.',
              )}
            </p>
          )}
        </details>
      )}
      {update.score === null && (
        <p className="muted text-sm">
          {t(
            'No clear score found. Open the email or Brightspace, then enter the result if available.',
          )}
        </p>
      )}
      <label className="block space-y-2 text-sm">
        <span>{t('Assessment to update')}</span>
        <select
          className="input w-full"
          value={assessmentId}
          onChange={(e) => setAssessmentId(e.target.value)}
          disabled={busy}
        >
          <option value="">{t('Choose an assessment')}</option>
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.course} · {a.name}
            </option>
          ))}
        </select>
      </label>
      {selected?.score !== null && selected?.score !== undefined && (
        <p className="text-sm">
          {t('Currently recorded:')} {selected.score} / {selected.maxScore}.{' '}
          {t('Saving will replace this score.')}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span>{t('Score received')}</span>
          <Input
            type="number"
            min="0"
            step="any"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>{t('Out of')}</span>
          <Input
            type="number"
            min="0.001"
            step="any"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            disabled={busy}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy || !selected || !valid}
          onClick={() =>
            void act({
              action: 'apply',
              id: update.id,
              assessmentId,
              score: Number(score),
              maxScore: Number(maxScore),
              expectedRevision: selected?.revision,
            })
          }
        >
          <Check aria-hidden />
          {t('Save reviewed grade')}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void act({ action: 'dismiss', id: update.id })}
        >
          <X aria-hidden />
          {t('Dismiss')}
        </Button>
      </div>
    </article>
  );
}
