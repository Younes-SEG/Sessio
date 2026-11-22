import { requireWorkspaceId } from '@/lib/server/auth';
import { ApiError } from '@/lib/server/errors';
import { isHosted } from '@/lib/server/hosting';
import { apiError, mutationBody, validateDeleteOrigin } from '@/lib/server/http';
import { createInvite, listAllInvites, listInvites, revokeInvite } from '@/lib/server/invitations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };

function hostedOnly() {
  if (!isHosted()) throw new ApiError(404, 'Invitations are part of the online edition.');
}

export async function GET() {
  try {
    hostedOnly();
    const workspaceId = await requireWorkspaceId();
    const mine = await listInvites(workspaceId);
    return Response.json(
      { ...mine, all: mine.owner ? await listAllInvites(workspaceId) : null },
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    hostedOnly();
    const workspaceId = await requireWorkspaceId();
    const body = await mutationBody(request);
    const invite = await createInvite(workspaceId, body.email);
    return Response.json(invite, { status: 201, headers: noStore });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    hostedOnly();
    const workspaceId = await requireWorkspaceId();
    validateDeleteOrigin(request);
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id || id.length > 100) throw new ApiError(400, 'Choose an invitation.');
    await revokeInvite(workspaceId, id);
    return new Response(null, { status: 204, headers: noStore });
  } catch (error) {
    return apiError(error);
  }
}
