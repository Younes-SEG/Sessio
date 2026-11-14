import { expect, it } from 'vitest';
import { accessDeniedDestination } from '../src/lib/access-denial';

it.each([
  ['unverified', '/auth/verify-email'],
  ['not-invited', '/auth/invitation-only'],
  ['account-deleting', '/auth/account-deleting'],
  ['cross-origin', '/auth/access-denied'],
] as const)('routes the %s denial without exposing the workspace', (reason, destination) => {
  expect(accessDeniedDestination(403, reason)).toBe(destination);
});

it.each([undefined, null, 'unexpected', { reason: 'unverified' }])(
  'routes an unknown 403 reason to generic access denied',
  (reason) => {
    expect(accessDeniedDestination(403, reason)).toBe('/auth/access-denied');
  },
);

it('routes 401 to sign-in regardless of any supplied reason', () => {
  expect(accessDeniedDestination(401, 'unverified')).toBe('/auth/sign-in');
  expect(accessDeniedDestination(401, undefined)).toBe('/auth/sign-in');
});

it('does not route unrelated statuses', () => {
  expect(accessDeniedDestination(500, 'not-invited')).toBeNull();
});
