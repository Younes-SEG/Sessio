import { describe, expect, it } from 'vitest';
import { buildRestoreFixtureSummary } from '../scripts/restore-fixture-summary-data';
import { RESTORE_TARGET_ERROR, restoreSelection } from '../scripts/restore-target';

describe('restore fixture selection guard', () => {
  const valid = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://private:secret@restore.example/neondb?sslmode=require',
    COMMAND_RESTORE_TARGET: 'restore.example/neondb',
    COMMAND_RESTORE_FIXTURE_WORKSPACE: 'user:synthetic-fixture',
  } as NodeJS.ProcessEnv;

  it('accepts only a matching target and hosted fixture workspace', () => {
    expect(restoreSelection(valid)).toEqual({
      connectionString: valid.DATABASE_URL,
      workspaceId: valid.COMMAND_RESTORE_FIXTURE_WORKSPACE,
    });
    expect(() =>
      restoreSelection({ ...valid, COMMAND_RESTORE_TARGET: 'main.example/neondb' }),
    ).toThrow(RESTORE_TARGET_ERROR);
    expect(() =>
      restoreSelection({ ...valid, COMMAND_RESTORE_FIXTURE_WORKSPACE: 'local' }),
    ).toThrow(RESTORE_TARGET_ERROR);
  });
});

it('prints only the fixed count and timestamp summary shape', () => {
  const summary = buildRestoreFixtureSummary({
    semesters: { count: '2' },
    courses: { count: 3 },
    assessments: { count: 4 },
    tasks: { count: 5, latestCreatedAt: new Date('2026-11-14T15:00:00.000Z') },
    chats: {
      count: 1,
      latestCreatedAt: '2026-11-14T14:00:00.000Z',
      latestUpdatedAt: new Date('2026-11-14T16:00:00.000Z'),
    },
  });

  expect(summary).toEqual({
    version: 1,
    tables: {
      semesters: { count: 2, latestCreatedAt: null, latestUpdatedAt: null },
      courses: { count: 3, latestCreatedAt: null, latestUpdatedAt: null },
      assessments: { count: 4, latestCreatedAt: null, latestUpdatedAt: null },
      tasks: {
        count: 5,
        latestCreatedAt: '2026-11-14T15:00:00.000Z',
        latestUpdatedAt: null,
      },
      chats: {
        count: 1,
        latestCreatedAt: '2026-11-14T14:00:00.000Z',
        latestUpdatedAt: '2026-11-14T16:00:00.000Z',
      },
    },
  });
  expect(JSON.stringify(summary)).not.toMatch(/workspace|id|name|content/i);
});
