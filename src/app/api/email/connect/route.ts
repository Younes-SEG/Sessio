import { NextResponse } from 'next/server';
import { apiError, mutationBody } from '@/lib/server/http';
import { beginGmail } from '@/lib/server/gmail-oauth';
import { gmailCookie, requireGmailConfig } from '@/lib/server/gmail-client';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const result = await beginGmail(await mutationBody(request), request.headers.get('origin'));
    const response = NextResponse.json(
      { url: result.url },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(gmailCookie, result.state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: requireGmailConfig().origin.startsWith('https:'),
      path: '/api/email',
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
