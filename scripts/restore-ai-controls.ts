export const RESTORE_AI_PAUSED_ERROR =
  'AI must be paused on the restore target before verification.';

export function requirePausedRestoreAi(enabledCount: unknown, drillOptIn: string | undefined) {
  const count = Number(enabledCount);
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error('Restore verification returned an invalid AI control count.');
  if (count > 0 && drillOptIn !== 'yes') throw new Error(RESTORE_AI_PAUSED_ERROR);
  return count;
}
