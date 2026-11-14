export type AccessDenialReason = 'unverified' | 'not-invited' | 'account-deleting' | 'cross-origin';

export function accessDeniedDestination(status: number, reason: unknown) {
  if (status === 401) return '/auth/sign-in';
  if (status !== 403) return null;
  if (reason === 'unverified') return '/auth/verify-email';
  if (reason === 'not-invited') return '/auth/invitation-only';
  if (reason === 'account-deleting') return '/auth/account-deleting';
  return '/auth/access-denied';
}
