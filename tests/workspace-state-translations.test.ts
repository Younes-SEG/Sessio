import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { french } from '../src/lib/i18n/fr';

const workspaceStateCopy = [
  'Something interrupted your workspace.',
  'Your saved data is safe. Please try loading this page again.',
  'Try again',
  'Loading workspace',
  'Sessio · Personal workspace',
  'Let’s get your workspace ready.',
  'Your workspace is temporarily unavailable. Please try again shortly.',
  'Sessio could not connect to your database. Start your local database, then return here to pick up where you left off.',
  'Keep it running in its own terminal. Your app server is already running, so you do not need to run setup again.',
  'For an existing PostgreSQL server, check DATABASE_URL in .env. Your data stays in your database.',
];

it('translates the workspace error, loading and offline screens', () => {
  for (const text of workspaceStateCopy) expect(french[text], text).toBeTruthy();
});

it('never suggests the demo-seeding setup command on the offline screen', () => {
  const layout = readFileSync('src/app/(workspace)/layout.tsx', 'utf8');
  expect(layout).not.toMatch(/<p>npm run setup/);
});
