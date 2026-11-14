import 'dotenv/config';
import { Client } from 'pg';
import { requirePausedRestoreAi } from './restore-ai-controls';
import { restoreSelection } from './restore-target';

const { connectionString, workspaceId } = restoreSelection();
const client = new Client({ connectionString });
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const controls = await client.query(
    'SELECT count(*)::int AS count FROM "AiControl" WHERE "enabled" = true',
  );
  const enabledAiControls = requirePausedRestoreAi(
    controls.rows[0]?.count,
    process.env.COMMAND_RESTORE_DRILL_ALLOW_ENABLED_AI,
  );
  const fixture = await client.query(
    'SELECT count(*)::int AS count FROM "Semester" WHERE "workspaceId" = $1',
    [workspaceId],
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
    `Read-only restore structure checks passed. Restored AI controls enabled: ${enabledAiControls}. Do not attach an app until the runbook's AI checks are complete.`,
  );
} finally {
  await client.end();
}
