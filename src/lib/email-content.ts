export const EMAIL_CONTENT_VERSION = 1;
export const EMAIL_TEXT_LIMIT = 100_000;

export interface GmailPart {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}

function entities(text: string): string {
  return text
    .replace(
      /&(?:nbsp|amp|lt|gt|quot|apos);/g,
      (e) =>
        ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[
          e
        ]!,
    )
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, n: string) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    });
}

/** Read text only: never render source HTML, fetch remote images, or download attachments. */
export function gmailContent(part: GmailPart, depth = 0): { text: string; truncated: boolean } {
  if (part.filename) return { text: '', truncated: false };
  if (depth > 12) return { text: '', truncated: true };
  if (part.parts?.length) {
    const children = part.parts.slice(0, 50);
    if (part.mimeType === 'multipart/alternative') {
      const preferred = [...children].sort(
        (a, b) => Number(b.mimeType === 'text/plain') - Number(a.mimeType === 'text/plain'),
      );
      for (const child of preferred) {
        const content = gmailContent(child, depth + 1);
        if (content.text.trim() && !content.truncated) return content;
      }
      const fallback = preferred
        .map((child) => gmailContent(child, depth + 1))
        .find((content) => content.text.trim());
      return fallback || { text: '', truncated: true };
    }
    const contents = children.map((child) => gmailContent(child, depth + 1));
    const text = contents
      .map((content) => content.text)
      .filter(Boolean)
      .join('\n');
    return {
      text: text.slice(0, EMAIL_TEXT_LIMIT),
      truncated:
        part.parts.length > 50 ||
        text.length > EMAIL_TEXT_LIMIT ||
        contents.some((c) => c.truncated),
    };
  }
  if (!['text/plain', 'text/html'].includes(part.mimeType || ''))
    return { text: '', truncated: false };
  if (!part.body?.data)
    return { text: '', truncated: Boolean(part.body?.attachmentId || part.body?.size) };
  // The Gmail client also bounds the complete API response. Keep parsing bounded here.
  const encodedLimit = 1_600_000;
  let text = Buffer.from(part.body.data.slice(0, encodedLimit), 'base64url').toString('utf8');
  if (part.mimeType === 'text/html') {
    text = text
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attributes: string, label: string) => {
        const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);
        const url = entities(href?.[1] || href?.[2] || href?.[3] || '').trim();
        return /^https?:\/\//i.test(url) && entities(label.replace(/<[^>]*>/g, '')).trim() !== url
          ? `${label} (${url.replace(/</g, '&lt;').replace(/>/g, '&gt;')})`
          : label;
      })
      .replace(/<(?:br|\/?(?:p|div|tr|li|h[1-6]|blockquote))\b[^>]*>/gi, '\n')
      .replace(/<\/(?:td|th)>/gi, '\t')
      .replace(/<[^>]*>/g, ' ');
    text = entities(text);
  }
  return {
    text: text.slice(0, EMAIL_TEXT_LIMIT),
    truncated:
      part.body.data.length > encodedLimit || text.length > EMAIL_TEXT_LIMIT || !text.trim(),
  };
}

export function gmailBody(part: GmailPart, depth = 0): string {
  return gmailContent(part, depth).text;
}
