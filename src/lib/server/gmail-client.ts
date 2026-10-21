import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ApiError } from './errors';
import { isHosted } from './hosting';

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
export const gmailCookie = 'command-gmail-state';
export function gmailConfig() {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET?.trim();
  const key = process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.trim();
  const redirect =
    process.env.GOOGLE_GMAIL_REDIRECT_URI?.trim() ||
    (!isHosted() ? 'http://127.0.0.1:3000/api/email/callback' : '');
  try {
    const uri = new URL(redirect);
    if (
      !clientId ||
      !clientSecret ||
      !key ||
      Buffer.from(key, 'base64').length !== 32 ||
      uri.username ||
      uri.password ||
      uri.search ||
      uri.hash ||
      uri.pathname !== '/api/email/callback'
    )
      return null;
    if (
      uri.protocol !== 'https:' &&
      !(
        uri.protocol === 'http:' &&
        !isHosted() &&
        ['127.0.0.1', 'localhost'].includes(uri.hostname)
      )
    )
      return null;
    return {
      clientId,
      clientSecret,
      key: Buffer.from(key, 'base64'),
      redirect: uri.href,
      origin: uri.origin,
    };
  } catch {
    return null;
  }
}
export function requireGmailConfig() {
  const config = gmailConfig();
  if (!config) throw new ApiError(503, 'Gmail connection setup is not complete.');
  return config;
}
export function sealGmail(value: string, workspaceId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', requireGmailConfig().key, iv);
  cipher.setAAD(Buffer.from(workspaceId));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}
export function openGmail(value: string, workspaceId: string) {
  try {
    const [version, iv, tag, ciphertext, ...extra] = value.split('.');
    if (version !== 'v1' || extra.length) throw new Error();
    const cipher = createDecipheriv(
      'aes-256-gcm',
      requireGmailConfig().key,
      Buffer.from(iv, 'base64url'),
    );
    cipher.setAAD(Buffer.from(workspaceId));
    cipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      cipher.update(Buffer.from(ciphertext, 'base64url')),
      cipher.final(),
    ]).toString('utf8');
  } catch {
    throw new ApiError(409, 'Reconnect Gmail to continue checking emails.');
  }
}
export const gmailHash = (value: string) => createHash('sha256').update(value).digest('base64url');

async function googleJson(url: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(503, 'Gmail is unavailable. Please try again later.');
  }
  if (!response.ok) {
    if ([400, 401, 403].includes(response.status))
      throw new ApiError(409, 'Reconnect Gmail or check that Gmail API access is enabled.');
    throw new ApiError(503, 'Gmail is unavailable. Please try again later.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(502, 'Gmail returned an unreadable response.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new ApiError(
          502,
          'An email is too large to read. Narrow the email search and try again.',
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(502, 'Gmail returned an unreadable response.');
  }
}
const tokens = z.object({
  access_token: z.string().min(1).max(10000),
  refresh_token: z.string().min(1).max(10000).optional(),
  scope: z.string().optional(),
});
export async function gmailTokens(parameters: Record<string, string>) {
  const config = requireGmailConfig();
  return tokens.parse(
    await googleJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        ...parameters,
      }),
    }),
  );
}
export async function gmailGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`);
  url.search = new URLSearchParams(params).toString();
  return googleJson(url.href, { headers: { Authorization: `Bearer ${token}` } });
}
export async function revokeGmail(token: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    return response.ok;
  } catch {
    return false;
  }
}
