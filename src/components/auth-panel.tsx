'use client';
import { LanguageSwitch, T, useT } from '@/components/language-provider';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { AlertDialog } from 'radix-ui';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui/button';
import { Input } from './ui/input';

function passwordError(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  if (error.code === 'PASSWORD_TOO_SHORT') return 'Choose a longer password.';
  if (error.code === 'PASSWORD_TOO_LONG') return 'Choose a shorter password.';
  // Neon normalizes both length errors to this code and throws them from the SDK.
  if (error.code === 'weak_password')
    return 'The sign-in service could not accept that password. Try a password between 8 and 128 characters.';
  return null;
}

export function SignOutButton({ className }: { className?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      // Full navigation discards all in-memory workspace data and router caches.
      window.location.replace('/auth/sign-in');
    } catch {
      setError('Could not sign out. Please try again.');
      setBusy(false);
    }
  }

  return (
    <AlertDialog.Root
      open={confirmOpen}
      onOpenChange={(open) => {
        if (!busy) {
          setConfirmOpen(open);
          setError('');
        }
      }}
    >
      <AlertDialog.Trigger asChild>
        <button type="button" className={className || 'button button-outline'} disabled={busy}>
          {busy ? t('Signing out…') : t('Sign out')}
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content
          className="dialog-content"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <LogOut className="mb-3 text-muted-foreground" size={24} aria-hidden="true" />
          <AlertDialog.Title className="text-xl font-semibold">
            {t('Sign out of Command?')}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(
              'Your saved work will stay here. You’ll need to sign in again to open your workspace.',
            )}
          </AlertDialog.Description>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {t(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-5">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" disabled={busy}>
                {t('Stay signed in')}
              </Button>
            </AlertDialog.Cancel>
            <Button type="button" variant="destructive" disabled={busy} onClick={signOut}>
              {busy ? t('Signing out…') : t('Sign out')}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function AccessDeniedPanel({
  mode,
  supportEmail,
}: {
  mode: 'invitation-only' | 'account-deleting' | 'access-denied';
  supportEmail: string;
}) {
  const t = useT();
  const content = {
    'invitation-only': {
      title: 'Command is invitation only',
      description:
        'Your email is verified, but this account has not been invited to Command. Contact support if you believe you should have access.',
    },
    'account-deleting': {
      title: 'Your account is being deleted',
      description:
        'This workspace is unavailable while your account is being deleted. Contact support if you need help.',
    },
    'access-denied': {
      title: 'Access denied',
      description:
        'Command could not confirm access to this workspace. Sign out and try again, or contact support if the problem continues.',
    },
  }[mode];
  return (
    <>
      <div className="mb-5 flex justify-end">
        <LanguageSwitch />
      </div>
      <ShieldAlert className="mb-3 text-muted-foreground" size={28} aria-hidden="true" />
      <h1 className="text-3xl font-semibold tracking-tight">{t(content.title)}</h1>
      <p className="muted mt-3 leading-relaxed">{t(content.description)}</p>
      {supportEmail && (
        <p className="mt-4 text-sm">
          <a className="underline" href={`mailto:${supportEmail}`}>
            {t('Contact support')}
          </a>
        </p>
      )}
      <div className="mt-6">
        <SignOutButton />
      </div>
    </>
  );
}

function PasswordField({
  signIn,
  reset,
  busy,
}: {
  signIn: boolean;
  reset: boolean;
  busy: boolean;
}) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2 text-sm font-medium">
      <label htmlFor="auth-password">{reset ? t('New password') : t('Password')}</label>
      <div className="relative">
        <Input
          id="auth-password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={signIn ? 'current-password' : 'new-password'}
          required
          disabled={busy}
          className="pr-28"
        />
        <button
          type="button"
          className="password-toggle"
          disabled={busy}
          aria-label={visible ? t('Hide password') : t('Show password')}
          aria-controls="auth-password"
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          {visible ? t('Hide') : t('Show')}
        </button>
      </div>
    </div>
  );
}

export function AuthPanel({ mode, token }: { mode: string; token?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const signUp = mode === 'sign-up';
  const signIn = mode === 'sign-in';
  const reset = mode === 'reset-password';
  const verify = mode === 'verify-email';
  const passwordNeeded = signIn || signUp || reset;
  const titles: Record<string, string> = {
    'sign-in': 'Welcome back',
    'sign-up': 'Your space to study',
    'forgot-password': 'Reset your password',
    'reset-password': 'Choose a new password',
    'verify-email': 'Check your email',
    'sign-out': 'Sign out of Command',
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email') || '').trim();
    const password = String(values.get('password') || '');
    const origin = window.location.origin;
    try {
      if (signIn) {
        const result = await authClient.signIn.email({ email, password });
        if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
          window.location.replace('/auth/verify-email');
          return;
        }
        if (result.error)
          throw new Error(
            'Unable to sign in. Check your email and password, or reset your password.',
          );
        window.location.replace('/');
        return;
      }
      if (signUp) {
        const result = await authClient.signUp.email({
          email,
          password,
          name: String(values.get('name') || '').trim() || 'Student',
          callbackURL: `${origin}/`,
        });
        if (result.error)
          throw new Error(
            passwordError(result.error) ||
              'Unable to create this account. Try signing in or resetting your password if you already have an account.',
          );
        setNotice(
          'Check your inbox for a verification link, then sign in. Your workspace will start empty.',
        );
      } else if (reset) {
        if (!token) throw new Error('This reset link is incomplete. Request a new one.');
        const result = await authClient.resetPassword({ newPassword: password, token });
        if (result.error)
          throw new Error(
            passwordError(result.error) ||
              'This reset link is invalid or expired. Request a new one.',
          );
        setNotice('Password updated. You can now sign in with your new password.');
      } else if (verify) {
        const result = await authClient.sendVerificationEmail({ email, callbackURL: `${origin}/` });
        if (result.error && result.error.status >= 500)
          throw new Error('Email is temporarily unavailable. Please try again later.');
        setNotice(
          'If your account needs verification, a new link is on its way. Check your inbox and spam folder.',
        );
      } else {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${origin}/auth/reset-password`,
        });
        if (result.error && result.error.status >= 500)
          throw new Error('Email is temporarily unavailable. Please try again later.');
        setNotice(
          'If an account uses that email, you will receive a password-reset link. Check your inbox and spam folder.',
        );
      }
    } catch (failure) {
      setError(
        passwordError(failure) ||
          (failure instanceof Error ? failure.message : 'Please try again later.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <LanguageSwitch />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{t(titles[mode])}</h1>
      <p className="muted mt-3 leading-relaxed">
        {verify
          ? t(
              'Verify your email before opening your private workspace. You can request another link below.',
            )
          : signUp
            ? t('Keep your courses, grades and plans together in your own private workspace.')
            : signIn
              ? t('Sign in to pick up where you left off.')
              : t('Manage access to your private workspace.')}
      </p>
      {mode === 'sign-out' ? (
        <div className="mt-6">
          <SignOutButton />
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-5">
          {signUp && (
            <label className="block space-y-2 text-sm font-medium">
              <span>
                <T text="Name" />{' '}
                <span className="muted">
                  <T text="(optional)" />
                </span>
              </span>
              <Input name="name" autoComplete="nickname" maxLength={80} disabled={busy} />
            </label>
          )}
          {!reset && (
            <label className="block space-y-2 text-sm font-medium">
              <span>
                <T text="Email" />
              </span>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                disabled={busy}
              />
            </label>
          )}
          {passwordNeeded && <PasswordField key={mode} signIn={signIn} reset={reset} busy={busy} />}
          {signUp && (
            <p className="muted text-xs leading-relaxed">
              <T text="Creating an account uses Neon Auth to handle your email and password. Read our" />{' '}
              <Link href="/legal/terms" className="policy-link">
                <T text="Terms" />
              </Link>{' '}
              <T text="and" />{' '}
              <Link href="/legal/privacy" className="policy-link">
                <T text="Privacy policy" />
              </Link>
              .
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {t(error)}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-sm bg-muted p-4 text-sm leading-relaxed">
              {t(notice)}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy || (reset && !token)}>
            {busy
              ? t('Please wait…')
              : signIn
                ? t('Sign in')
                : signUp
                  ? t('Create account')
                  : reset
                    ? t('Update password')
                    : verify
                      ? t('Resend verification email')
                      : t('Send reset link')}
          </Button>
          {signIn && (
            <div className="flex justify-center">
              <Link href="/auth/forgot-password" className="auth-action auth-action-recovery">
                <KeyRound size={16} aria-hidden="true" />
                <T text="Forgot your password?" />
              </Link>
            </div>
          )}
        </form>
      )}
      <div className="mt-7 border-t border-border pt-5 text-sm">
        {signIn ? (
          <div className="auth-signup">
            <p className="muted text-center">
              <T text="New to Command?" />
            </p>
            <Link href="/auth/sign-up" className="auth-action auth-action-signup">
              <UserPlus size={18} aria-hidden="true" />
              <span>
                <T text="Create an account" />
              </span>
              <ArrowRight size={18} aria-hidden="true" className="auth-action-arrow ml-auto" />
            </Link>
          </div>
        ) : (
          <Link href="/auth/sign-in" className="auth-action auth-action-recovery">
            <ArrowLeft size={16} aria-hidden="true" />
            <T text="Back to sign in" />
          </Link>
        )}
      </div>
    </>
  );
}
