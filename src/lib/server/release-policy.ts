import { ApiError } from './errors';
import { isHosted } from './hosting';

function listed(name: string, workspaceId: string) {
  return (process.env[name] || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .includes(workspaceId);
}

/** Deployment policy, never controlled by browser input. Local installations need no account. */
export function hostedAccessAllowed(workspaceId: string) {
  if (!isHosted()) return true;
  return (
    process.env.COMMAND_HOSTED_ACCESS === 'public' ||
    listed('COMMAND_INVITED_WORKSPACES', workspaceId)
  );
}
export function assertHostedAccess(workspaceId: string) {
  if (!hostedAccessAllowed(workspaceId))
    throw ApiError.accessDenied(
      'not-invited',
      'Sessio is currently available to invited accounts only.',
    );
}
export function signupAllowed() {
  return !isHosted() || process.env.COMMAND_ALLOW_SIGNUP === 'true';
}
export function gmailAllowed(workspaceId: string) {
  if (!isHosted()) return true;
  return (
    process.env.COMMAND_GMAIL_RELEASE === 'public' ||
    (process.env.COMMAND_GMAIL_RELEASE === 'testers' &&
      listed('COMMAND_GMAIL_TESTERS', workspaceId))
  );
}
export function assertGmailAllowed(workspaceId: string) {
  if (!gmailAllowed(workspaceId))
    throw new ApiError(403, 'Gmail connections are not available for this account yet.');
}
