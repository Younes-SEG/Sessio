import type { Prisma } from '@/generated/prisma/client';

/** Shared erasure implementation. Usage ceilings and account barriers deliberately survive. */
export async function eraseWorkspaceRecords(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  resetPreferences: boolean,
) {
  await tx.calendarSubscription.deleteMany({ where: { workspaceId } });
  await tx.gmailOAuthState.deleteMany({ where: { workspaceId } });
  await tx.gmailConnection.deleteMany({ where: { workspaceId } });
  await tx.assistantRequest.deleteMany({ where: { workspaceId } });
  await tx.assistantConversation.deleteMany({ where: { workspaceId } });
  await tx.task.deleteMany({ where: { workspaceId } });
  await tx.calendarEvent.deleteMany({ where: { workspaceId } });
  await tx.course.deleteMany({ where: { semester: { workspaceId } } });
  await tx.semester.deleteMany({ where: { workspaceId } });
  await tx.settings.deleteMany({ where: { workspaceId } });
  // Invitations: unused ones this workspace sent hold friends' emails, so they go. Friends who
  // already joined keep their access; only the link to this workspace is removed.
  await tx.invitation.deleteMany({ where: { invitedBy: workspaceId, workspaceId: null } });
  await tx.invitation.updateMany({ where: { invitedBy: workspaceId }, data: { invitedBy: null } });
  // Deleting the whole account (not just erasing the workspace) also ends its own invitation.
  if (!resetPreferences) await tx.invitation.deleteMany({ where: { workspaceId } });
  if (resetPreferences)
    await tx.settings.create({
      data: {
        id: workspaceId === 'local' ? 'preferences' : `preferences:${workspaceId}`,
        workspaceId,
      },
    });
}
