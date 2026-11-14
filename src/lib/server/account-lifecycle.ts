import { db } from './db';
import { ApiError } from './errors';
import { openGmail, revokeGmail } from './gmail-client';
import { eraseWorkspaceRecords } from './privacy-records';

export async function assertAccountActive(workspaceId: string) {
  const state = await db.accountLifecycle.findUnique({ where: { workspaceId } });
  if (state && state.status !== 'ACTIVE')
    throw ApiError.accessDenied(
      'account-deleting',
      'This account is being deleted. Contact support if you need help.',
    );
}
function accountId(workspaceId: string) {
  if (!/^user:[a-zA-Z0-9_-]{1,180}$/.test(workspaceId))
    throw new Error('A hosted account ID is required.');
}
// Operator-only functions; no public route accepts a target workspace.
export async function blockAccount(workspaceId: string) {
  accountId(workspaceId);
  await db.accountLifecycle.upsert({
    where: { workspaceId },
    create: { workspaceId, status: 'PENDING', blockedAt: new Date() },
    update: { status: 'PENDING', blockedAt: new Date() },
  });
}
export async function eraseBlockedAccount(workspaceId: string, googleRevocationConfirmed = false) {
  accountId(workspaceId);
  const state = await db.accountLifecycle.findUnique({ where: { workspaceId } });
  if (!state || state.status !== 'PENDING') throw new Error('Block this account before erasure.');
  const connection = await db.gmailConnection.findUnique({ where: { workspaceId } });
  if (connection && !googleRevocationConfirmed) {
    let revoked = false;
    try {
      revoked = await revokeGmail(openGmail(connection.refreshToken, workspaceId));
    } catch {
      /* Keep token available for a retry. */
    }
    if (!revoked)
      throw new Error(
        'Google revocation could not be confirmed. Retry or confirm manual grant removal before erasure.',
      );
  }
  await db.$transaction(
    async (tx) => {
      const states = await tx.$queryRaw<
        Array<{ status: string }>
      >`SELECT "status" FROM "AccountLifecycle" WHERE "workspaceId" = ${workspaceId} FOR UPDATE`;
      if (states[0]?.status !== 'PENDING') throw new Error('The account deletion state changed.');
      await eraseWorkspaceRecords(tx, workspaceId, false);
      await tx.accountLifecycle.update({ where: { workspaceId }, data: { erasedAt: new Date() } });
    },
    { isolationLevel: 'Serializable', timeout: 30_000 },
  );
}
export async function confirmProviderDeletion(workspaceId: string) {
  accountId(workspaceId);
  const result = await db.accountLifecycle.updateMany({
    where: { workspaceId, status: 'PENDING', erasedAt: { not: null } },
    data: { status: 'DELETED', authDeletedAt: new Date() },
  });
  if (!result.count) throw new Error('Erase application records first.');
}
