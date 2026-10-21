import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from './db';
import { requireWorkspaceId } from './auth';
import { ApiError } from './errors';
import { DEFAULT_GMAIL_QUERY, GMAIL_NOTICE } from '../email-grades';
import {
  GMAIL_SCOPE,
  gmailHash,
  sealGmail,
  openGmail,
  requireGmailConfig,
  gmailTokens,
  gmailGet,
} from './gmail-client';

export async function beginGmail(body: unknown, origin: string | null) {
  const workspaceId = await requireWorkspaceId();
  z.object({ consent: z.literal(GMAIL_NOTICE) }).parse(body);
  const config = requireGmailConfig();
  if (origin !== config.origin)
    throw new ApiError(400, 'Open Command at the address configured for Gmail before connecting.');
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  await db.gmailOAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.gmailOAuthState.upsert({
    where: { workspaceId },
    create: {
      id: gmailHash(state),
      workspaceId,
      verifier: sealGmail(verifier, workspaceId),
      expiresAt: new Date(Date.now() + 600000),
    },
    update: {
      claimed: false,
      id: gmailHash(state),
      verifier: sealGmail(verifier, workspaceId),
      expiresAt: new Date(Date.now() + 600000),
    },
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirect,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent select_account',
    state,
    code_challenge: gmailHash(verifier),
    code_challenge_method: 'S256',
  }).toString();
  return { state, url: url.href };
}
export async function finishGmail(
  code: string | null,
  state: string | null,
  cookie: string | undefined,
) {
  const workspaceId = await requireWorkspaceId();
  const config = requireGmailConfig();
  if (!code || code.length > 5000 || !state || state.length > 200 || state !== cookie)
    throw new ApiError(400, 'Gmail connection expired. Please connect again.');
  const pending = await db.gmailOAuthState.findUnique({
    where: { id: gmailHash(state), workspaceId },
  });
  if (!pending || pending.expiresAt < new Date())
    throw new ApiError(400, 'Gmail connection expired. Please connect again.');
  const consumed = await db.gmailOAuthState.updateMany({
    where: { id: pending.id, workspaceId, claimed: false, expiresAt: { gt: new Date() } },
    data: { claimed: true },
  });
  if (consumed.count !== 1)
    throw new ApiError(400, 'Gmail connection expired. Please connect again.');
  const token = await gmailTokens({
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirect,
    code_verifier: openGmail(pending.verifier, workspaceId),
  });
  if (!token.refresh_token || !token.scope?.split(' ').includes(GMAIL_SCOPE))
    throw new ApiError(400, 'Allow read-only Gmail access and connect again.');
  const profile = z
    .object({ emailAddress: z.email() })
    .parse(await gmailGet('profile', token.access_token));
  // Reauthorization of the same mailbox keeps pending reviews and invalidates old syncs.
  await db.$transaction(async (tx) => {
    const active = await tx.gmailOAuthState.deleteMany({
      where: { id: pending.id, workspaceId, claimed: true, expiresAt: { gt: new Date() } },
    });
    if (active.count !== 1)
      throw new ApiError(400, 'Gmail connection expired. Please connect again.');
    const previous = await tx.gmailConnection.findUnique({ where: { workspaceId } });
    if (previous) {
      if (previous.email.toLowerCase() !== profile.emailAddress.toLowerCase())
        throw new ApiError(409, 'Disconnect the current Gmail account before switching accounts.');
      await tx.gmailConnection.update({
        where: { id: previous.id },
        data: {
          refreshToken: sealGmail(token.refresh_token!, workspaceId),
          connectedAt: new Date(),
          consentVersion: GMAIL_NOTICE,
          lastError: null,
          lastAttemptAt: null,
          syncToken: null,
          syncStartedAt: null,
        },
      });
      return;
    }
    await tx.gmailConnection.create({
      data: {
        workspaceId,
        email: profile.emailAddress,
        consentVersion: GMAIL_NOTICE,
        refreshToken: sealGmail(token.refresh_token!, workspaceId),
        query: DEFAULT_GMAIL_QUERY,
      },
    });
  });
}
