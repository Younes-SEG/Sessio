export const RESTORE_TARGET_ERROR =
  'Select the isolated restored database and its synthetic fixture workspace.';

export function restoreSelection(env: NodeJS.ProcessEnv = process.env) {
  const url = new URL(env.DATABASE_URL || 'http://invalid');
  if (
    env.COMMAND_RESTORE_TARGET !== `${url.hostname}${url.pathname}` ||
    !env.COMMAND_RESTORE_FIXTURE_WORKSPACE?.startsWith('user:')
  )
    throw new Error(RESTORE_TARGET_ERROR);
  return {
    connectionString: env.DATABASE_URL as string,
    workspaceId: env.COMMAND_RESTORE_FIXTURE_WORKSPACE,
  };
}
