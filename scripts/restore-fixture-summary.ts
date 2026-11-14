import 'dotenv/config';
import { Client } from 'pg';
import {
  buildRestoreFixtureSummary,
  type RestoreFixtureAggregate,
} from './restore-fixture-summary-data';
import { restoreUtcTypes } from './restore-pg-types';
import { restoreSelection } from './restore-target';

const { connectionString, workspaceId } = restoreSelection();
const client = new Client({ connectionString, types: restoreUtcTypes() });
let transactionOpen = false;

async function aggregate(sql: string): Promise<RestoreFixtureAggregate> {
  const result = await client.query<RestoreFixtureAggregate>(sql, [workspaceId]);
  if (!result.rows[0]) throw new Error('Restore fixture summary returned no aggregate row.');
  return result.rows[0];
}

try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  transactionOpen = true;
  const aggregates = {
    semesters: await aggregate(
      'SELECT count(*)::int AS count, NULL::timestamp AS "latestCreatedAt", NULL::timestamp AS "latestUpdatedAt" FROM "Semester" WHERE "workspaceId" = $1',
    ),
    courses: await aggregate(
      'SELECT count(*)::int AS count, NULL::timestamp AS "latestCreatedAt", NULL::timestamp AS "latestUpdatedAt" FROM "Course" c INNER JOIN "Semester" s ON s."id" = c."semesterId" WHERE s."workspaceId" = $1',
    ),
    assessments: await aggregate(
      'SELECT count(*)::int AS count, NULL::timestamp AS "latestCreatedAt", NULL::timestamp AS "latestUpdatedAt" FROM "Assessment" a INNER JOIN "Course" c ON c."id" = a."courseId" INNER JOIN "Semester" s ON s."id" = c."semesterId" WHERE s."workspaceId" = $1',
    ),
    tasks: await aggregate(
      'SELECT count(*)::int AS count, max("createdAt") AS "latestCreatedAt", NULL::timestamp AS "latestUpdatedAt" FROM "Task" WHERE "workspaceId" = $1',
    ),
    chats: await aggregate(
      'SELECT count(*)::int AS count, max("createdAt") AS "latestCreatedAt", max("updatedAt") AS "latestUpdatedAt" FROM "AssistantConversation" WHERE "workspaceId" = $1',
    ),
  };
  await client.query('ROLLBACK');
  transactionOpen = false;
  console.log(JSON.stringify(buildRestoreFixtureSummary(aggregates), null, 2));
} catch (error) {
  if (transactionOpen) await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end();
}
