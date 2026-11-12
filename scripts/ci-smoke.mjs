import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Client } from 'pg';

// Reproduce CI locally without touching the owner's database or active dev build.
const source = new URL(process.env.DATABASE_URL || 'http://invalid');
if (
  !['127.0.0.1', 'localhost'].includes(source.hostname) ||
  !['postgres:', 'postgresql:'].includes(source.protocol)
)
  throw new Error('Smoke verification requires local PostgreSQL.');
const name = `command_ci_${randomBytes(8).toString('hex')}`;
const admin = new Client({ connectionString: source.toString() });
const target = new URL(source);
target.pathname = `/${name}`;
const env = {
  ...process.env,
  DATABASE_URL: target.toString(),
  DATABASE_URL_UNPOOLED: '',
  COMMAND_HOSTED: 'false',
  VERCEL: '',
  CI: 'true',
  COMMAND_CI_BUILD: 'true',
  COMMAND_AI_ENFORCE_LOCAL: 'false',
};
for (const key of Object.keys(env)) {
  if (
    /^(GEMINI_|OPENAI_|GOOGLE_GMAIL_|GMAIL_|NEON_AUTH_|COMMAND_AUTH_|COMMAND_READER_|COMMAND_AI_|COMMAND_SYLLABUS_)/.test(
      key,
    )
  )
    env[key] = '';
}
for (const key of [
  'GOOGLE_GMAIL_CLIENT_ID',
  'GOOGLE_GMAIL_CLIENT_SECRET',
  'GMAIL_TOKEN_ENCRYPTION_KEY',
  'GOOGLE_GMAIL_REDIRECT_URI',
  'COMMAND_SYLLABUS_SERVICE_URL',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'NEON_AUTH_BASE_URL',
  'COMMAND_AUTH_BASE_URL',
  'NEON_AUTH_COOKIE_SECRET',
  'COMMAND_AI_USAGE_SECRET',
  'COMMAND_READER_SIGNING_SECRET',
])
  env[key] = '';
env.COMMAND_AI_ENFORCE_LOCAL = 'false';
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('Isolated smoke step failed.')),
    );
  });
let created = false;
try {
  await admin.connect();
  await admin.query(
    `CREATE DATABASE "${name}" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
  );
  created = true;
  await run(['node_modules/prisma/build/index.js', 'generate']);
  await run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  await run(['scripts/next.mjs', 'build']);
  await run(['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.ci.config.ts']);
} finally {
  if (created && /^command_ci_[a-f0-9]{16}$/.test(name))
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
