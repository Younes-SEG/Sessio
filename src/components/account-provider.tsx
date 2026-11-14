'use client';
import { createContext, useContext, type ReactNode } from 'react';

export type Account = { email: string; name: string } | null;

const AccountContext = createContext<Account>(null);

/** The signed-in account (hosted only), resolved on the server from the verified session. */
export function AccountProvider({ account, children }: { account: Account; children: ReactNode }) {
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  return useContext(AccountContext);
}
