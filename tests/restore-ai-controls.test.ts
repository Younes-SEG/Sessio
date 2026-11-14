import { describe, expect, it } from 'vitest';
import { requirePausedRestoreAi, RESTORE_AI_PAUSED_ERROR } from '../scripts/restore-ai-controls';

describe('restored AI control gate', () => {
  it('fails closed when any AI control is enabled', () => {
    expect(() => requirePausedRestoreAi(1, undefined)).toThrow(RESTORE_AI_PAUSED_ERROR);
    expect(() => requirePausedRestoreAi(2, 'YES')).toThrow(RESTORE_AI_PAUSED_ERROR);
    expect(() => requirePausedRestoreAi(3, ' yes')).toThrow(RESTORE_AI_PAUSED_ERROR);
  });

  it('allows enabled controls only with the exact drill opt-in', () => {
    expect(requirePausedRestoreAi('2', 'yes')).toBe(2);
    expect(requirePausedRestoreAi(0, undefined)).toBe(0);
  });
});
