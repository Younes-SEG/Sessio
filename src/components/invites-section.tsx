'use client';
import { T, useT } from '@/components/language-provider';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

type Invite = { id: string; email: string; createdAt: string; joined: boolean };
type OwnerInvite = Invite & { sentByYou: boolean; sentByStudent: boolean };
type InviteState = {
  owner: boolean;
  limit: number | null;
  remaining: number | null;
  invites: Invite[];
  all: OwnerInvite[] | null;
};

async function readError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === 'string' ? body.error : 'Please try again.';
}

async function fetchInvites(): Promise<InviteState> {
  const response = await fetch('/api/invites', { cache: 'no-store' });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export function InvitesSection() {
  const t = useT();
  const [state, setState] = useState<InviteState | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [copied, setCopied] = useState(false);
  const signUpLink =
    typeof window === 'undefined' ? '/auth/sign-up' : `${window.location.origin}/auth/sign-up`;

  const load = useCallback(async () => setState(await fetchInvites()), []);

  useEffect(() => {
    let active = true;
    fetchInvites().then(
      (next) => active && setState(next),
      (cause) => active && setError(cause instanceof Error ? cause.message : 'Please try again.'),
    );
    return () => {
      active = false;
    };
  }, []);

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSentTo('');
    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setSentTo(email.trim().toLowerCase());
      setEmail('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function takeBack(id: string) {
    setError('');
    const response = await fetch(`/api/invites?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) setError(await readError(response));
    await load().catch(() => {});
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(signUpLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy the link by hand: select it and press Ctrl+C.');
    }
  }

  if (!state)
    return (
      <section className="card p-4 sm:p-5">
        {error ? (
          <p role="alert" className="text-sm text-[var(--destructive)]">
            {t(error)}
          </p>
        ) : (
          <p className="muted flex items-center gap-2 text-sm">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            <T text="Loading your invitations…" />
          </p>
        )}
      </section>
    );

  const out = !state.owner && state.remaining === 0;
  return (
    <div className="space-y-5">
      <section className="card space-y-4 p-4 sm:p-5" aria-labelledby="invite-title">
        <div>
          <h2 id="invite-title" className="section-title">
            <T text="Invite a friend" />
          </h2>
          <p className="muted mt-1 text-sm leading-relaxed">
            {state.owner
              ? t('You can send as many invitations as you like.')
              : t('{remaining} of {limit} invitations left.')
                  .replace('{remaining}', String(state.remaining))
                  .replace('{limit}', String(state.limit))}{' '}
            <T text="Sessio is invite-only for now: only the email you invite can create an account." />
          </p>
        </div>
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <div className="field min-w-[220px] flex-1">
            <Label htmlFor="invite-email">
              <T text="Their email" />
            </Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              disabled={busy || out}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy || out || !email.trim()}>
            {busy && <Loader2 size={15} className="animate-spin" aria-hidden />}
            <T text="Invite" />
          </Button>
        </form>
        {out && (
          <p className="muted text-sm">
            <T text="You have used all your invitations. Taking back an unused one frees it." />
          </p>
        )}
        {sentTo && (
          <div role="status" className="space-y-2 rounded-sm bg-[var(--muted)] p-3 text-sm">
            <p>
              {t(
                'Invitation saved for {email}. Send them this link and ask them to sign up with that email:',
              ).replace('{email}', sentTo)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all">{signUpLink}</code>
              <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copied ? t('Copied') : t('Copy link')}
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-[var(--destructive)]">
            {t(error)}
          </p>
        )}
      </section>

      <section className="card p-4 sm:p-5" aria-labelledby="sent-title">
        <h2 id="sent-title" className="section-title">
          <T text="Your invitations" />
        </h2>
        {state.invites.length === 0 ? (
          <p className="muted mt-2 text-sm">
            <T text="You haven’t invited anyone yet." />
          </p>
        ) : (
          <InviteList invites={state.invites} onTakeBack={takeBack} />
        )}
      </section>

      {state.all && (
        <section className="card p-4 sm:p-5" aria-labelledby="all-title">
          <h2 id="all-title" className="section-title">
            <T text="All invitations (only you can see this)" />
          </h2>
          <p className="muted mt-1 text-sm">
            {t('{joined} joined, {pending} waiting.')
              .replace('{joined}', String(state.all.filter((i) => i.joined).length))
              .replace('{pending}', String(state.all.filter((i) => !i.joined).length))}
          </p>
          {state.all.length > 0 && (
            <InviteList invites={state.all} onTakeBack={takeBack} showSender />
          )}
        </section>
      )}
    </div>
  );
}

function InviteList({
  invites,
  onTakeBack,
  showSender = false,
}: {
  invites: Array<Invite & Partial<Pick<OwnerInvite, 'sentByYou' | 'sentByStudent'>>>;
  onTakeBack: (id: string) => void;
  showSender?: boolean;
}) {
  const t = useT();
  return (
    <ul className="mt-3 divide-y divide-[var(--border)]">
      {invites.map((invite) => (
        <li key={invite.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
          <span className="min-w-0 flex-1 break-all">{invite.email}</span>
          {showSender && (
            <span className="muted text-xs">
              {invite.sentByYou
                ? t('Sent by you')
                : invite.sentByStudent
                  ? t('Sent by a student')
                  : t('Sender’s account removed')}
            </span>
          )}
          <span
            className={
              invite.joined
                ? 'text-xs font-medium text-[var(--success,var(--primary))]'
                : 'muted text-xs'
            }
          >
            {invite.joined ? t('Joined') : t('Waiting to sign up')}
          </span>
          {!invite.joined && (
            <Button type="button" variant="outline" size="sm" onClick={() => onTakeBack(invite.id)}>
              <T text="Take back" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
