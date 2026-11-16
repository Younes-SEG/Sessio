import { NextResponse } from 'next/server';
import { apiError, mutationBody } from '@/lib/server/http';
import {
  configureEmail,
  disconnectEmail,
  emailOverview,
  emailAssessmentRevisions,
  reviewEmail,
  syncEmail,
} from '@/lib/server/email-updates';
import { ApiError } from '@/lib/server/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET() {
  try {
    return NextResponse.json(
      { ...(await emailOverview()), assessments: await emailAssessmentRevisions() },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await mutationBody(request);
    switch (body.action) {
      case 'sync':
        return NextResponse.json(await syncEmail(body.automatic === true, body.timeZone));
      case 'settings':
        await configureEmail(body);
        break;
      case 'disconnect':
        return NextResponse.json(await disconnectEmail());
      case 'apply':
      case 'read':
      case 'read-all':
      case 'apply-deadline':
      case 'dismiss':
        await reviewEmail(body);
        break;
      default:
        throw new ApiError(400, 'Choose a valid email action.');
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
