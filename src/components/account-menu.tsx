'use client';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { LogOut, Settings2, UserRound } from 'lucide-react';
import { useT } from '@/components/language-provider';
import { useAccount } from './account-provider';
import { useWorkspace } from './workspace-provider';

const item =
  'flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-[var(--muted)]';

/** Top-bar account button: shows who is signed in (hosted) or that this is a local workspace. */
export function AccountMenu() {
  const t = useT();
  const account = useAccount();
  const { data } = useWorkspace();
  const label = account?.name || data.settings.displayName || account?.email || '';
  const initial = (label || 'Y')[0]!.toUpperCase();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex size-8 items-center justify-center rounded-sm bg-[var(--accent)] text-xs font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        aria-label={account ? `${t('Account')}: ${account.email}` : t('Account')}
      >
        {initial}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-sm border border-[var(--border)] bg-[var(--card)] p-1 text-[var(--foreground)] shadow-lg"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="muted text-[11px]">
              {account ? t('Signed in as') : t('Local workspace')}
            </p>
            {account ? (
              <>
                {account.name && <p className="truncate text-sm font-medium">{account.name}</p>}
                <p className="truncate text-sm" title={account.email}>
                  {account.email}
                </p>
              </>
            ) : (
              <p className="text-sm">{t('Stored on this computer; no account needed.')}</p>
            )}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          {account && (
            <DropdownMenu.Item asChild className={item}>
              <Link href="/settings/account">
                <UserRound size={15} />
                {t('Account')}
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild className={item}>
            <Link href="/settings">
              <Settings2 size={15} />
              {t('Settings')}
            </Link>
          </DropdownMenu.Item>
          {account && (
            <DropdownMenu.Item asChild className={item}>
              <Link href="/auth/sign-out">
                <LogOut size={15} />
                {t('Sign out')}
              </Link>
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
