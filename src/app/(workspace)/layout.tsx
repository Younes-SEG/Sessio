import { getWorkspace } from '@/lib/server/workspace';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { AppShell } from '@/components/app-shell';
import { LocalTimeContent } from '@/components/local-time-content';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { french as frenchCopy } from '@/lib/i18n/fr';
import { ApiError } from '@/lib/server/errors';
import { isHosted } from '@/lib/server/hosting';
import { accessDeniedDestination } from '@/lib/access-denial';
import { currentAccount } from '@/lib/server/auth';
import { AccountProvider, type Account } from '@/components/account-provider';
export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // A per-request server timestamp keeps the first client render identical to its HTML.
  // eslint-disable-next-line react-hooks/purity
  const initialNow = Date.now();
  let data;
  let account: Account = null;
  try {
    data = await getWorkspace();
    // Same request-scoped verified session that authorized the workspace above.
    account = await currentAccount();
  } catch (error) {
    if (isHosted() && error instanceof ApiError) {
      const destination = accessDeniedDestination(error.status, error.reason);
      if (destination) redirect(destination);
      if (error.status === 503) redirect('/auth/sign-in');
    }
    /* The setup screen gives a recoverable path when PostgreSQL is offline. */
  }
  // Same functional language cookie the root layout reads; only fixed app copy is translated.
  const french = (await cookies()).get('command-language')?.value === 'fr';
  const t = (text: string) => (french ? (frenchCopy[text] ?? text) : text);
  return (
    <>
      {data ? (
        <AccountProvider account={account}>
          <WorkspaceProvider initialData={data} initialNow={initialNow}>
            <AppShell>
              <LocalTimeContent>{children}</LocalTimeContent>
            </AppShell>
          </WorkspaceProvider>
        </AccountProvider>
      ) : (
        <main className="min-h-screen grid place-items-center p-4">
          <div className="card p-9 max-w-lg">
            <div className="eyebrow mb-4">{t('Sessio · Personal workspace')}</div>
            <h1 className="text-2xl font-semibold tracking-tight mb-3">
              {t('Let’s get your workspace ready.')}
            </h1>
            <p className="muted leading-relaxed mb-6">
              {isHosted()
                ? t('Your workspace is temporarily unavailable. Please try again shortly.')
                : t(
                    'Sessio could not connect to your database. Start your local database, then return here to pick up where you left off.',
                  )}
            </p>
            {!isHosted() && (
              <>
                {/* Not `npm run setup`: it seeds demo records into an existing workspace. */}
                <div className="bg-muted rounded-sm p-4 text-xs font-mono">
                  <p>npm run db:local</p>
                </div>
                <p className="muted text-xs mt-3">
                  {t(
                    'Keep it running in its own terminal. Your app server is already running, so you do not need to run setup again.',
                  )}
                </p>
                <p className="muted text-xs my-5">
                  {t(
                    'For an existing PostgreSQL server, check DATABASE_URL in .env. Your data stays in your database.',
                  )}
                </p>
              </>
            )}
            <form action="/" method="get">
              <button className="button button-primary inline-flex px-4 py-2 text-sm">
                {t('Try again')}
              </button>
            </form>
          </div>
        </main>
      )}
    </>
  );
}
