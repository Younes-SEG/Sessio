import { confirmAiAge } from '@/lib/server/ai-age';
import { requireWorkspaceId } from '@/lib/server/auth';
import { apiError } from '@/lib/server/http';
import { assertSameOrigin } from '@/lib/server/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspaceId();
    assertSameOrigin(request);
    const confirmedAt = await confirmAiAge(workspaceId);
    return Response.json(
      { confirmedAt: confirmedAt.toISOString() },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
