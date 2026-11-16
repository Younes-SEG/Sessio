import { Client } from 'pg';
import { formatBetaStats, readBetaStats } from './beta-stats-data';

// Read-only beta measurement. Requires DATABASE_URL and the matching
// COMMAND_OPERATIONS_TARGET=hostname/database, like the other operator commands.
function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  let url: URL;
  try {
    url = new URL(raw || 'invalid:');
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    process.env.COMMAND_OPERATIONS_TARGET !== `${url.hostname}${url.pathname}`
  )
    throw new Error(
      'Set COMMAND_OPERATIONS_TARGET to the verified database hostname/database before reading stats.',
    );
  return raw as string;
}

async function main() {
  const client = new Client({ connectionString: databaseUrl(), connectionTimeoutMillis: 5_000 });
  await client.connect();
  try {
    const stats = await readBetaStats(client);
    console.log(
      process.argv.includes('--json') ? JSON.stringify(stats, null, 2) : formatBetaStats(stats),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error && error.message.startsWith('Set COMMAND_OPERATIONS_TARGET')
      ? error.message
      : 'Beta stats query failed. No connection details were logged.',
  );
  process.exitCode = 1;
});
