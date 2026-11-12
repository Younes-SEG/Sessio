import 'dotenv/config';
import { Client } from 'pg';
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (
  process.env.COMMAND_RESTORE_TARGET !== `${url.hostname}${url.pathname}` ||
  !process.env.COMMAND_RESTORE_FIXTURE_WORKSPACE?.startsWith('user:')
)
  throw new Error('Select the isolated restored database and its synthetic fixture workspace.');
const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const controls = await client.query(
    'SELECT count(*)::int AS count FROM "AiControl" WHERE "enabled" = true',
  );
  if (controls.rows[0].count)
    throw new Error('AI must be paused on the restore target before verification.');
  const fixture = await client.query(
    'SELECT count(*)::int AS count FROM "Semester" WHERE "workspaceId" = $1',
    [process.env.COMMAND_RESTORE_FIXTURE_WORKSPACE],
  );
  if (!fixture.rows[0].count) throw new Error('Expected synthetic restore fixture is missing.');
  const orphans = await client.query(
    'SELECT count(*)::int AS count FROM "Assessment" a LEFT JOIN "Course" c ON c."id" = a."courseId" WHERE c."id" IS NULL',
  );
  if (orphans.rows[0].count) throw new Error('Restored assessment relationships are incomplete.');
  const guards = await client.query(
    "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname = 'account_write_guard' AND tgenabled = 'O'",
  );
  if (guards.rows[0].count !== 15) throw new Error('Account deletion write barriers are missing.');
  await client.query('ROLLBACK');
  console.log(
    'Read-only restore structure checks passed. Live auth, keys, deletions and integrations still require the runbook checks.',
  );
} finally {
  await client.end();
}
