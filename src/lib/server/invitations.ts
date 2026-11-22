import { z } from 'zod';
import { db } from './db';
import { ApiError } from './errors';
import { isHosted } from './hosting';

/** How many people each student can invite. The owner has no limit. */
export const INVITE_LIMIT = 5;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const emailSchema = z
  .string()
  .trim()
  .min(3, 'Enter an email address.')
  .max(254, 'This email address is too long.')
  .email('Enter a valid email address.');

/** Owner accounts come from deployment settings, never from browser input. */
export function isOwner(workspaceId: string) {
  if (!isHosted()) return false;
  return (process.env.COMMAND_OWNER_WORKSPACES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(workspaceId);
}

export type InviteSummary = {
  id: string;
  email: string;
  createdAt: string;
  joined: boolean;
};

const toSummary = (invite: {
  id: string;
  email: string;
  createdAt: Date;
  workspaceId: string | null;
}): InviteSummary => ({
  id: invite.id,
  email: invite.email,
  createdAt: invite.createdAt.toISOString(),
  joined: invite.workspaceId !== null,
});

/** Invitations this workspace sent, plus how many it may still send. */
export async function listInvites(workspaceId: string) {
  const owner = isOwner(workspaceId);
  const sent = await db.invitation.findMany({
    where: { invitedBy: workspaceId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, createdAt: true, workspaceId: true },
  });
  return {
    owner,
    limit: owner ? null : INVITE_LIMIT,
    remaining: owner ? null : Math.max(0, INVITE_LIMIT - sent.length),
    invites: sent.map(toSummary),
  };
}

/** Owner-only: every invitation, with who sent it (their workspace, or "erased"). */
export async function listAllInvites(workspaceId: string) {
  if (!isOwner(workspaceId)) throw new ApiError(404, 'Not found.');
  const all = await db.invitation.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, createdAt: true, workspaceId: true, invitedBy: true },
  });
  return all.map((invite) => ({
    ...toSummary(invite),
    sentByYou: invite.invitedBy === workspaceId,
    sentByStudent: invite.invitedBy !== null && invite.invitedBy !== workspaceId,
  }));
}

export async function createInvite(workspaceId: string, input: unknown) {
  if (!isHosted()) throw new ApiError(404, 'Invitations are part of the online edition.');
  const email = normalizeEmail(emailSchema.parse(input));
  const owner = isOwner(workspaceId);
  return db.$transaction(
    async (tx) => {
      if (!owner) {
        const sent = await tx.invitation.count({ where: { invitedBy: workspaceId } });
        if (sent >= INVITE_LIMIT)
          throw new ApiError(409, `You have used all ${INVITE_LIMIT} of your invitations.`);
      }
      const existing = await tx.invitation.findUnique({ where: { email }, select: { id: true } });
      // Never reveals who invited someone, only that they are already invited.
      if (existing) throw new ApiError(409, 'This person has already been invited.');
      const invite = await tx.invitation.create({
        data: { email, invitedBy: workspaceId },
        select: { id: true, email: true, createdAt: true, workspaceId: true },
      });
      return toSummary(invite);
    },
    { isolationLevel: 'Serializable' },
  );
}

/** A pending invitation can be taken back by whoever sent it (or the owner); a used one can't. */
export async function revokeInvite(workspaceId: string, id: string) {
  const owner = isOwner(workspaceId);
  const removed = await db.invitation.deleteMany({
    where: { id, workspaceId: null, ...(owner ? {} : { invitedBy: workspaceId }) },
  });
  if (!removed.count)
    throw new ApiError(404, 'This invitation was already used or no longer exists.');
}

/** Sign-up is open to an email that has an unused invitation. */
export async function hasOpenInvite(email: string) {
  const invite = await db.invitation.findUnique({
    where: { email: normalizeEmail(email) },
    select: { workspaceId: true },
  });
  return invite !== null && invite.workspaceId === null;
}

/**
 * Grants access through an invitation for this verified email. The first sign-in claims it for
 * the workspace; afterwards only that workspace can use it.
 */
export async function claimInvitation(workspaceId: string, email: string) {
  const normalized = normalizeEmail(email);
  await db.invitation.updateMany({
    where: { email: normalized, workspaceId: null },
    data: { workspaceId, acceptedAt: new Date() },
  });
  const invite = await db.invitation.findUnique({
    where: { email: normalized },
    select: { workspaceId: true },
  });
  return invite?.workspaceId === workspaceId;
}
