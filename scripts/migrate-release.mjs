import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const value = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL;
const url = new URL(value || 'http://invalid');
if (
  !['postgres:', 'postgresql:'].includes(url.protocol) ||
  process.env.COMMAND_MIGRATION_TARGET !== `${url.hostname}${url.pathname}` ||
  !process.env.COMMAND_RECOVERY_POINT_CONFIRMED ||
  process.argv[2] !== '--apply'
) {
  throw new Error(
    'Confirm the exact migration target and recovery point using the release runbook.',
  );
}
// Do not print credentials or database contents. Serialize promotions in the hosting platform.
const result = spawnSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  { stdio: 'inherit', env: process.env },
);
process.exitCode = result.status ?? 1;
