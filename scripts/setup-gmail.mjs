import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const path = '.env.local';
let content = existsSync(path) ? readFileSync(path, 'utf8') : '';
const entries = {
  GOOGLE_GMAIL_CLIENT_ID: '',
  GOOGLE_GMAIL_CLIENT_SECRET: '',
  GOOGLE_GMAIL_REDIRECT_URI: 'http://127.0.0.1:3000/api/email/callback',
  GMAIL_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
};
for (const [key, value] of Object.entries(entries))
  if (!new RegExp(`^${key}=`, 'm').test(content)) content += `\n${key}=${value}\n`;
writeFileSync(path, content, { mode: 0o600 });
console.log(
  'Prepared .env.local. Enter the Google Gmail client ID and secret there. Existing settings were preserved; secrets were not printed.',
);
