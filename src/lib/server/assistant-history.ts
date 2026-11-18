import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import type { AssistantReply, ChatEntry, ChatMessage } from '@/lib/assistant';
import { say } from '@/lib/assistant';
import { db } from './db';
import { requireWorkspaceId } from './auth';
import { ApiError } from './errors';
import { transaction } from './mutations';

const key = (workspaceId: string, id: string) => ({ workspaceId_id: { workspaceId, id } });
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function listAssistantChats() {
  return db.assistantConversation.findMany({
    where: { workspaceId: await requireWorkspaceId() },
    select: { id: true, title: true, updatedAt: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
}
export async function createAssistantChat() {
  const workspaceId = await requireWorkspaceId();
  return transaction(async (tx) => {
    const recent = await tx.assistantConversation.count({
      where: { workspaceId, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recent >= 12) throw new ApiError(429, 'Please wait a minute before starting another chat.');
    return tx.assistantConversation.create({
      data: { id: randomUUID(), workspaceId, title: '' },
      select: { id: true, title: true, updatedAt: true },
    });
  });
}
export async function readAssistantChat(id: string, language = 'en') {
  z.string().uuid().parse(id);
  const workspaceId = await requireWorkspaceId();
  const chat = await db.assistantConversation.findUnique({ where: key(workspaceId, id) });
  if (!chat) throw new ApiError(404, 'This chat no longer exists.');
  const entries = chat.entries as ChatEntry[];
  const receipts = await db.assistantRequest.findMany({
    where: { workspaceId, conversationId: id },
    select: { id: true, createdAt: true, status: true },
  });
  const visibleEntries = entries.flatMap((entry) => {
    if (
      entry.role !== 'user' ||
      entries.some((other) => other.key === entry.key.replace(/^user:/, ''))
    )
      return [entry];
    const receipt = receipts.find((row) => `user:${row.id}` === entry.key);
    if (receipt?.status !== 'FAILED' && receipt?.status !== 'PROCESSING') return [entry];
    return [
      entry,
      {
        key: `notice:${receipt.id}`,
        role: 'assistant' as const,
        text:
          receipt.status === 'FAILED' || Date.now() - +receipt.createdAt > 120_000
            ? say(
                language,
                'This request could not finish. You can send it again.',
                'Cette demande n’a pas abouti. Vous pouvez la renvoyer.',
              )
            : say(
                language,
                'This request is still processing. Reopen this chat in a moment to see the result.',
                'Cette demande est en cours. Rouvre la conversation dans un instant pour voir le résultat.',
              ),
      },
    ];
  });
  return {
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updatedAt,
    entries: visibleEntries.map((entry) => {
      if (!entry.reply) return entry;
      const receipt = receipts.find((row) => row.id === entry.reply!.id);
      const expired = !receipt || Date.now() - +receipt.createdAt > 86400_000;
      return { ...entry, reply: { ...entry.reply, actionsExpired: expired } };
    }),
  };
}
export async function deleteAssistantChat(id: string) {
  z.string().uuid().parse(id);
  const workspaceId = await requireWorkspaceId();
  await transaction(async (tx) => {
    const removed = await tx.assistantConversation.deleteMany({ where: { workspaceId, id } });
    if (!removed.count) throw new ApiError(404, 'This chat no longer exists.');
    // Keep only content-free idempotency/rate-limit tombstones, never the transcript or Undo data.
    await tx.assistantRequest.updateMany({
      where: { workspaceId, conversationId: id },
      data: { status: 'DELETED', plan: Prisma.DbNull, result: Prisma.DbNull },
    });
  });
}
export async function recordAssistantReply(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  conversationId: string | null,
  reply: AssistantReply,
  userText?: string,
  messages?: ChatMessage[],
) {
  if (!conversationId) return;
  const chat = await tx.assistantConversation.findUnique({
    where: key(workspaceId, conversationId),
  });
  if (!chat) throw new ApiError(409, 'This chat was deleted. Nothing new was saved.');
  const entries = chat.entries as ChatEntry[];
  const index = entries.findIndex((entry) => entry.key === reply.id);
  const entry: ChatEntry = {
    key: reply.id,
    role: 'assistant',
    text: reply.text,
    reply,
    createdAt: index >= 0 ? entries[index].createdAt : new Date().toISOString(),
  };
  if (index >= 0) entries[index] = entry;
  else {
    if (userText && !entries.some((item) => item.key === `user:${reply.id}`))
      entries.push({
        key: `user:${reply.id}`,
        role: 'user',
        text: userText,
        createdAt: entry.createdAt,
      });
    entries.push(entry);
  }
  const context =
    messages && (reply.context || reply.status === 'clarify')
      ? [...messages, { role: 'model', text: (reply.context || reply.text).slice(0, 2000) }].slice(
          -10,
        )
      : [];
  await tx.assistantConversation.update({
    where: key(workspaceId, conversationId),
    data: {
      entries: json(entries),
      context: json(context),
      ...(userText && !chat.title ? { title: userText.replace(/\s+/g, ' ').slice(0, 80) } : {}),
    },
  });
}
