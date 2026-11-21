import { NextRequest, NextResponse } from 'next/server';
import { finishGmail } from '@/lib/server/gmail-oauth';
import { gmailCookie, requireGmailConfig } from '@/lib/server/gmail-client';
import { apiError } from '@/lib/server/http';
import { isHosted } from '@/lib/server/hosting';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  let origin: string;
  try {
    origin = requireGmailConfig().origin;
  } catch (error) {
    return apiError(error);
  }
  let success = false;
  try {
    await finishGmail(
      request.nextUrl.searchParams.get('code'),
      request.nextUrl.searchParams.get('state'),
      request.cookies.get(gmailCookie)?.value,
    );
    success = true;
  } catch {
    /* Never reflect authorization codes, tokens or upstream errors into URLs or logs. */
  }
  const destination = `/email?connection=${success ? 'connected' : 'failed'}`;
  // A redirect chain from Google retains Sec-Fetch-Site: cross-site. Commit a
  // local document first so the next navigation is same-origin, without opening
  // the workspace or other APIs to cross-site requests. No OAuth data is echoed.
  const response = isHosted()
    ? NextResponse.redirect(new URL(destination, origin))
    : new NextResponse(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=${destination}"><title>Returning to Sessio</title></head><body><p>Returning to Sessio… <a href="${destination}">Continue</a></p></body></html>`,
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
            'X-Content-Type-Options': 'nosniff',
          },
        },
      );
  response.cookies.set(gmailCookie, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https:'),
    path: '/api/email',
    maxAge: 0,
  });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
