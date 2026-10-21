/** Brightspace event links contain language-independent course + event IDs.
 * Never use a translated title or date alone to decide two assignments are the same.
 * Query strings (including possible access tokens) are deliberately excluded.
 */
export function brightspaceEventIdentity(description: string): string | null {
  const identities = new Set<string>();
  for (const match of description.matchAll(/https:\/\/[^\s<>"']+/gi)) {
    try {
      const url = new URL(match[0]);
      if (!url.hostname.endsWith('.brightspace.com')) continue;
      const path = /^\/d2l\/le\/calendar\/(\d+)\/event\/(\d+)\/detailsview\/?$/i.exec(url.pathname);
      if (path) identities.add(`${url.hostname.toLowerCase()}:${path[1]}:${path[2]}`);
    } catch {
      /* Not an event URL. */
    }
  }
  return identities.size === 1 ? [...identities][0] : null;
}
