import { db } from './db';
import { ApiError } from './errors';
import { isHosted } from './hosting';

// Google's Gemini API terms allow use only by people 18 or older, so hosted AI
// features (Ask Sessio, syllabus reading) require a one-time confirmation.
// 428, not 403: a 403 would route the browser to the access-denied pages.
export const AI_AGE_MESSAGE =
  'Confirm that you are 18 or older to use Ask Sessio and syllabus reading.';

export async function assertAiAgeConfirmed(workspaceId: string) {
  if (!isHosted()) return;
  const settings = await db.settings.findUnique({
    where: { workspaceId },
    select: { aiAgeConfirmedAt: true },
  });
  if (!settings?.aiAgeConfirmedAt) throw new ApiError(428, AI_AGE_MESSAGE);
}

/** Records the first confirmation; repeating it keeps the original time. */
export async function confirmAiAge(workspaceId: string) {
  const existing = await db.settings.findUnique({
    where: { workspaceId },
    select: { aiAgeConfirmedAt: true },
  });
  if (existing?.aiAgeConfirmedAt) return existing.aiAgeConfirmedAt;
  const saved = await db.settings.upsert({
    where: { workspaceId },
    create: {
      id: workspaceId === 'local' ? 'preferences' : `preferences:${workspaceId}`,
      workspaceId,
      aiAgeConfirmedAt: new Date(),
    },
    update: { aiAgeConfirmedAt: new Date() },
    select: { aiAgeConfirmedAt: true },
  });
  return saved.aiAgeConfirmedAt!;
}
