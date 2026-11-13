import { z } from 'zod';
import { createHmac, randomUUID } from 'node:crypto';
import { db } from './db';
import { transaction } from './mutations';
import { ApiError } from './errors';
import { isHosted } from './hosting';
import { ceilingMicros, modelPolicies } from './ai-policy';
import { Prisma } from '@/generated/prisma/client';

export type AiFeature = 'chat' | 'syllabus';
function setting(name: string) {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000_000)
    throw new ApiError(503, 'AI allowances are not configured.');
  return BigInt(value);
}
export function usageSubject(workspaceId: string) {
  const salt = process.env.COMMAND_AI_USAGE_SECRET || '';
  if (salt.length < 32) throw new ApiError(503, 'AI allowances are not configured.');
  return createHmac('sha256', salt).update(workspaceId).digest('hex');
}
export async function reserveAi(
  workspaceId: string,
  feature: AiFeature,
  models: string[],
  attempts = 1,
) {
  if (!isHosted() && process.env.COMMAND_AI_ENFORCE_LOCAL !== 'true') return null;
  if (isHosted() && !workspaceId.startsWith('user:')) throw new ApiError(403, 'Sign in to use AI.');
  const policies = modelPolicies();
  const allowed = models.map((m) => policies[m]);
  if (!allowed.length || allowed.some((p) => !p))
    throw new ApiError(503, 'This AI model is not enabled.');
  const maximum =
    allowed.reduce((a, p) => {
      const b = ceilingMicros(p);
      return a > b ? a : b;
    }, BigInt(0)) * BigInt(attempts);
  const subject = usageSubject(workspaceId);
  const now = new Date(),
    day = now.toISOString().slice(0, 10),
    month = day.slice(0, 7);
  const expiresAt = new Date(Date.now() + 180_000);
  const retention = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));
  const items = [
    { id: `global:${day}`, limit: setting('COMMAND_AI_DAILY_MICROS'), value: maximum },
    { id: `global:${month}`, limit: setting('COMMAND_AI_MONTHLY_MICROS'), value: maximum },
    {
      id: `${subject}:${feature}:${day}`,
      limit: setting(`COMMAND_AI_${feature.toUpperCase()}_DAILY`),
      value: BigInt(1),
    },
    {
      id: `${subject}:${feature}:${month}`,
      limit: setting(`COMMAND_AI_${feature.toUpperCase()}_MONTHLY`),
      value: BigInt(1),
    },
  ];
  const concurrency = setting('COMMAND_AI_CONCURRENCY');
  const id = randomUUID();
  await transaction(async (tx) => {
    // A singleton row lock protects all global/account buckets across app instances.
    const locks = await tx.$queryRaw<
      Array<{ enabled: boolean }>
    >`SELECT "enabled" FROM "AiControl" WHERE "id" = 'all' FOR UPDATE`;
    const control = await tx.aiControl.findUnique({ where: { id: feature } });
    if (!locks[0]?.enabled || !control?.enabled)
      throw new ApiError(503, 'AI is paused. Your planner is still available.');
    const account = await tx.accountLifecycle.findUnique({ where: { workspaceId } });
    if (account && account.status !== 'ACTIVE')
      throw new ApiError(403, 'This account is being deleted.');
    if (
      BigInt(await tx.aiAttempt.count({ where: { status: 'RESERVED', expiresAt: { gt: now } } })) >=
      concurrency
    )
      throw new ApiError(429, 'AI is busy. Please try again shortly.');
    for (const item of items) {
      const bucket = await tx.aiBucket.findUnique({ where: { id: item.id } });
      if ((bucket?.value || BigInt(0)) + item.value > item.limit)
        throw new ApiError(
          429,
          'AI allowance reached. Daily allowances reset at 00:00 UTC; monthly allowances reset on the first.',
        );
      await tx.aiBucket.upsert({
        where: { id: item.id },
        create: { id: item.id, value: item.value, expiresAt: retention },
        update: { value: { increment: item.value } },
      });
    }
    await tx.aiAttempt.create({
      data: {
        id,
        subject,
        feature,
        model: models.join(','),
        reservedMicros: maximum,
        expiresAt,
        usage: {
          pricing: Object.fromEntries(models.map((m) => [m, policies[m]])),
          maximumAttempts: attempts,
        },
      },
    });
  });
  return {
    id,
    models: Object.fromEntries(models.map((m) => [m, policies[m]])),
    maximumAttempts: attempts,
    subject,
  };
}
export async function finishAi(id: string | undefined, usage: unknown, succeeded: boolean) {
  if (!id) return;
  // Conservative ceilings are never refunded: uncertainty cannot reopen spending capacity.
  const tokens = z.object({
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative(),
    reasoning: z.number().int().nonnegative().nullable(),
    cached: z.number().int().nonnegative().nullable(),
  });
  const parsed = z
    .array(
      z
        .object({
          model: z.string().max(120),
          provider: z.enum(['gemini', 'openai']),
          pricingVersion: z.string().max(80),
          tokens: tokens.nullable(),
          status: z.number().int().min(100).max(599).nullable(),
        })
        .strict(),
    )
    .max(3)
    .safeParse(usage);
  const original = await db.aiAttempt.findUnique({ where: { id } });
  const safe = JSON.parse(
    JSON.stringify({
      ...((original?.usage as object) || {}),
      observed: parsed.success ? parsed.data : null,
    }),
  ) as Prisma.InputJsonValue;
  await db.aiAttempt.updateMany({
    where: { id, status: 'RESERVED' },
    data: { status: succeeded ? 'FINISHED' : 'UNCERTAIN', usage: safe },
  });
}
export async function assertAiRunning(feature: AiFeature) {
  if (!isHosted() && process.env.COMMAND_AI_ENFORCE_LOCAL !== 'true') return;
  const controls = await db.aiControl.findMany({
    where: { id: { in: ['all', feature] }, enabled: true },
  });
  if (controls.length !== 2)
    throw new ApiError(503, 'AI is paused. Your planner is still available.');
}
