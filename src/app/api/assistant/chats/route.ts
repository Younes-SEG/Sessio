import {
  createAssistantChat,
  deleteAssistantChat,
  listAssistantChats,
  readAssistantChat,
} from '@/lib/server/assistant-history';
import { apiError, mutationBody } from '@/lib/server/http';
import { z } from 'zod';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    const language = new URL(request.url).searchParams.get('language') === 'fr' ? 'fr' : 'en';
    return Response.json(
      id ? await readAssistantChat(id, language) : { chats: await listAssistantChats() },
      {
        headers,
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const input = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('create') }),
        z.object({ action: z.literal('delete'), id: z.string().uuid() }),
      ])
      .parse(await mutationBody(request));
    if (input.action === 'create') return Response.json(await createAssistantChat(), { headers });
    await deleteAssistantChat(input.id);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return apiError(error);
  }
}
