import 'dotenv/config';
import { db } from '../src/lib/server/db';
import {
  blockAccount,
  eraseBlockedAccount,
  confirmProviderDeletion,
} from '../src/lib/server/account-lifecycle';

// Deliberate operator CLI; credentials stay in the private process environment.
const [command, target, confirmation] = process.argv.slice(2);
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (
  process.env.COMMAND_OPERATIONS_TARGET !== `${url.hostname}${url.pathname}` ||
  !['postgres:', 'postgresql:'].includes(url.protocol)
)
  throw new Error(
    'Set COMMAND_OPERATIONS_TARGET to the verified database hostname/database before running operator commands.',
  );
try {
  if (command === 'ai-pause' && ['all', 'chat', 'syllabus'].includes(target)) {
    await db.aiControl.upsert({
      where: { id: target },
      create: { id: target, enabled: false },
      update: { enabled: false },
    });
  } else if (
    command === 'ai-enable' &&
    ['all', 'chat', 'syllabus'].includes(target) &&
    confirmation === 'CONFIRM'
  ) {
    await db.aiControl.upsert({
      where: { id: target },
      create: { id: target, enabled: true },
      update: { enabled: true },
    });
  } else if (command === 'ai-prune' && target === 'CONFIRM') {
    const before = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1));
    await db.aiAttempt.deleteMany({ where: { createdAt: { lt: before } } });
    await db.aiBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } else if (confirmation === target && target?.startsWith('user:')) {
    if (command === 'account-block') await blockAccount(target);
    else if (command === 'account-erase')
      await eraseBlockedAccount(target, process.env.COMMAND_GOOGLE_REVOCATION_CONFIRMED === 'true');
    else if (
      command === 'account-confirm-provider-deletion' &&
      process.env.COMMAND_PROVIDER_DELETION_VERIFIED === 'true'
    )
      await confirmProviderDeletion(target);
    else throw new Error('Unknown or unconfirmed account operation.');
  } else
    throw new Error('Invalid command or missing explicit confirmation. See docs/p0-operations.md.');
  console.log('Operation completed. No account content was logged.');
} finally {
  await db.$disconnect();
}
