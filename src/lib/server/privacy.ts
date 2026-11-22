import { usageSubject } from './ai-usage';
import { eraseWorkspaceRecords } from './privacy-records';
import { db } from './db';
import { getWorkspace } from './workspace';
import { listSubscriptions } from './calendar-subscriptions';
import { requireWorkspaceId } from './auth';
import { exportEmailData } from './email-updates';
import { listInvites } from './invitations';

export async function exportWorkspace() {
  const workspaceId = await requireWorkspaceId();
  const usage = process.env.COMMAND_AI_USAGE_SECRET
    ? await db.aiAttempt.findMany({
        where: { subject: usageSubject(workspaceId) },
        select: {
          id: true,
          feature: true,
          model: true,
          reservedMicros: true,
          usage: true,
          status: true,
          createdAt: true,
        },
      })
    : [];
  return {
    aiUsage: usage.map(({ reservedMicros, ...entry }) => ({
      ...entry,
      reservedMicros: reservedMicros.toString(),
    })),
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    workspace: await getWorkspace(true),
    // Explicit projection excludes feed URLs and provider source identifiers.
    calendarConnections: await listSubscriptions(),
    emailUpdates: await exportEmailData(),
    assistantActions: await db.assistantRequest.findMany({
      where: { workspaceId: await requireWorkspaceId() },
    }),
    assistantChats: await db.assistantConversation.findMany({
      where: { workspaceId: await requireWorkspaceId() },
    }),
    // Invitations this account sent (the invited emails and whether each person joined).
    invitationsSent: (await listInvites(workspaceId)).invites,
  };
}

export async function eraseWorkspace() {
  const workspaceId = await requireWorkspaceId();
  await db.$transaction((tx) => eraseWorkspaceRecords(tx, workspaceId, true), {
    isolationLevel: 'Serializable',
    timeout: 30000,
  });
}
