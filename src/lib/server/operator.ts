/** Public contact information only. Never use secret/service credentials here. */
export function publicOperator() {
  const name = (process.env.COMMAND_PUBLIC_OPERATOR || '').trim().slice(0, 120);
  const email = (process.env.COMMAND_PUBLIC_SUPPORT_EMAIL || '').trim();
  return { name, email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : '' };
}
