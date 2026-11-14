export const RESTORE_FIXTURE_TABLES = [
  'semesters',
  'courses',
  'assessments',
  'tasks',
  'chats',
] as const;

export type RestoreFixtureTable = (typeof RESTORE_FIXTURE_TABLES)[number];

export type RestoreFixtureAggregate = {
  count: number | string;
  latestCreatedAt?: Date | string | null;
  latestUpdatedAt?: Date | string | null;
};

function count(value: number | string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0)
    throw new Error('Restore fixture summary returned an invalid count.');
  return parsed;
}

function timestamp(value: Date | string | null | undefined) {
  if (value == null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error('Restore fixture summary returned an invalid timestamp.');
  return parsed.toISOString();
}

export function buildRestoreFixtureSummary(
  aggregates: Record<RestoreFixtureTable, RestoreFixtureAggregate>,
) {
  return {
    version: 1,
    tables: Object.fromEntries(
      RESTORE_FIXTURE_TABLES.map((table) => [
        table,
        {
          count: count(aggregates[table].count),
          latestCreatedAt: timestamp(aggregates[table].latestCreatedAt),
          latestUpdatedAt: timestamp(aggregates[table].latestUpdatedAt),
        },
      ]),
    ) as Record<
      RestoreFixtureTable,
      { count: number; latestCreatedAt: string | null; latestUpdatedAt: string | null }
    >,
  };
}
