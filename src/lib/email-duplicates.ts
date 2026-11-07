import { emailMessageText } from './email-display';
import { currentEmailText, type SchoolEmailKind } from './email-classification';

type Notification = {
  id: string;
  subject: string;
  sender: string;
  excerpt: string;
  receivedAt: string | Date;
  kind: SchoolEmailKind;
  bodyTruncated?: boolean;
  contentVersion?: number;
};
const normalize = (text: string) =>
  text
    .normalize('NFKC')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

function notificationKey(message: Notification): string | null {
  // Never conceal scores, proposed changes, clipped messages, replies or digests.
  if (
    message.kind !== 'ANNOUNCEMENT' ||
    message.bodyTruncated ||
    !message.contentVersion ||
    /^(?:re|r[eé]p)\s*:|\b(?:activity summary|summary of activity|r[eé]sum[eé] des activit[eé]s)\b/i.test(
      message.subject,
    )
  )
    return null;
  const codes = [
    ...new Set(
      (`${message.subject}\n${message.excerpt}`.match(/\b[a-z]{2,4}[\s-]*\d{4}\b/gi) || []).map(
        (code) => code.replace(/[\s-]/g, '').toUpperCase(),
      ),
    ),
  ].sort();
  if (codes.length !== 1) return null;
  const subject = message.subject.replace(/^(?:(?:fw|fwd|tr)\s*:\s*)+/i, '');
  const [courseHeading, title] = subject.split(
    /\s+[-–—]\s+(?:announcements?|annonces?|news|nouvelles)\s*:/i,
  );
  const redundant = new Set([subject, courseHeading, title || ''].map(normalize));
  const content = emailMessageText({ ...message, excerpt: currentEmailText(message.excerpt) })
    .split('\n')
    .filter((line) => {
      // Strip only recognizable template links; meaningful URLs remain in the key.
      const withoutLink = line.replace(/\s*\(https?:\/\/[^\s)]+\)\s*$/i, '');
      if (redundant.has(normalize(withoutLink))) return false;
      if (
        /^(?:go to announcements?|go to course|view announcement|notification settings|change notification settings|voir l['’]annonce|acc[eé]der au cours)\s*(?:[>»→]+\s*)?(?:\(https?:\/\/[^\s)]+\))?\s*$/i.test(
          line.trim(),
        )
      )
        return false;
      if (
        /^(?:you are receiving this (?:message|email) because you (?:have )?subscribed|vous recevez ce (?:message|courriel) parce que vous)/i.test(
          line.trim(),
        )
      )
        return false;
      return true;
    })
    .join('\n');
  const body = normalize(content);
  // Short generic notices don't provide enough evidence to merge different subjects.
  if (body.length < 80) return null;
  return `${codes[0]}\n${body}`;
}

/** Presentation grouping keeps every source email. Exact content comparisons retain
 * numbers, punctuation and links so corrections cannot disappear as "duplicates". */
export function schoolNotificationGroups<T extends Notification>(messages: readonly T[]): T[][] {
  const groups: T[][] = [];
  const keyed = new Map<string, T[][]>();
  for (const message of [...messages].sort(
    (a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt) || a.id.localeCompare(b.id),
  )) {
    const key = notificationKey(message);
    const time = +new Date(message.receivedAt);
    const group =
      key && Number.isFinite(time)
        ? keyed.get(key)?.find((items) => +new Date(items[0].receivedAt) - time <= 3 * 86400000)
        : undefined;
    if (group) group.push(message);
    else {
      const items = [message];
      groups.push(items);
      if (key && Number.isFinite(time)) keyed.set(key, [...(keyed.get(key) || []), items]);
    }
  }
  return groups;
}
