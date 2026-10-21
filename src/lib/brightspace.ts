/** Only expose actual Brightspace page links, never calendar subscription URLs. */
export function brightspaceUrl(...sources: (string | null | undefined)[]): string | null {
  for (const source of sources) {
    for (const match of (source || '').matchAll(/https:\/\/[^\s<>"']+/gi)) {
      try {
        const url = new URL(match[0].replace(/[),.;\]]+$/, ''));
        if (
          url.protocol === 'https:' &&
          url.hostname.endsWith('.brightspace.com') &&
          !url.username &&
          !url.password &&
          !url.port &&
          url.pathname.startsWith('/d2l/') &&
          !/feed|subscribe|subscription|\.ics/i.test(url.pathname + url.search)
        )
          return url.href;
      } catch {
        /* Ignore malformed links in imported notes. */
      }
    }
  }
  return null;
}
