import { assistantConfigured } from '@/lib/server/assistant-ai';
import { assistantRequest } from '@/lib/server/assistant';
import { requireWorkspaceId } from '@/lib/server/auth';
import { apiError, mutationBody } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET() {
  try {
    await requireWorkspaceId();
    return Response.json(
      { configured: assistantConfigured() },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    return Response.json(await assistantRequest(await mutationBody(request)), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
