import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Terminal } from 'lucide-react';
import {
  AccessDeniedPanel,
  AuthPageFooter,
  AuthPanel,
  AuthUnavailablePanel,
} from '@/components/auth-panel';
import { isAuthConfigured } from '@/lib/server/auth';
import { isHosted } from '@/lib/server/hosting';
import { publicOperator } from '@/lib/server/operator';

export const dynamic = 'force-dynamic';
const views = new Set([
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
  'verify-email',
  'sign-out',
  'invitation-only',
  'account-deleting',
  'access-denied',
]);
const accessViews = new Set(['invitation-only', 'account-deleting', 'access-denied']);
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  if (!isHosted()) redirect('/');
  const { path } = await params;
  if (!views.has(path)) notFound();
  const { token } = await searchParams;
  const accessView = accessViews.has(path);
  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="w-full max-w-md">
        <Link
          href="/auth/sign-in"
          className="mb-8 inline-flex items-center gap-3 text-xl font-semibold"
        >
          <span className="grid size-10 place-items-center rounded-sm bg-primary text-primary-foreground">
            <Terminal aria-hidden size={24} />
          </span>
          Command
        </Link>
        <section className="card p-4 sm:p-9">
          {accessView ? (
            <AccessDeniedPanel
              mode={path as 'invitation-only' | 'account-deleting' | 'access-denied'}
              supportEmail={publicOperator().email}
            />
          ) : isAuthConfigured() ? (
            <AuthPanel mode={path} token={typeof token === 'string' ? token : undefined} />
          ) : (
            <AuthUnavailablePanel />
          )}
        </section>
        <AuthPageFooter />
      </div>
    </main>
  );
}
