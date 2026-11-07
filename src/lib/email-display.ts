const comparable = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Presentation only: retain the stored source for classification and deadline review. */
export function emailMessageText(message: {
  subject: string;
  sender: string;
  excerpt: string;
  contentVersion?: number;
}) {
  const subject = message.subject.replace(/^(?:(?:re|fw|fwd|tr)\s*:\s*)+/i, '');
  const courseHeading = subject.split(
    /\s+[-–—]\s+(?:announcements?|annonces?|news|nouvelles)\s*:/i,
  )[0];
  const redundant = new Set(
    [subject, message.subject, message.sender, courseHeading].map(comparable),
  );
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const raw of message.excerpt.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\t \u00a0]+/g, ' ')
      .trim();
    const key = comparable(line);
    if (!key) {
      if (lines.length && lines.at(-1) !== '') lines.push('');
      continue;
    }
    if (redundant.has(key)) continue;
    if (/^(?:subject|objet)\s*:/i.test(line)) continue;
    if (/^(?:from|to|cc|de|a|à|exp[eé]diteur|destinataire)\s*:/i.test(line) && /@/.test(line))
      continue;
    if (
      /^(?:posted|published|publi[eé](?:e)?(?: le)?|affich[eé](?:e)?(?: le)?|sent|envoy[eé](?:e)?)\s*:?(?:\s+|$)/i.test(
        line,
      ) &&
      /\b(?:19|20|21)\d{2}\b/.test(line) &&
      /(?:\b\d{1,2}[:h]\d{2}\b|\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)/i.test(
        line,
      ) &&
      !/\b(deadline|due|echeance|échéance|limite|report|extended)\b/i.test(line)
    )
      continue;
    if (
      /^(?:dear (?:students|class|all)|hello (?:everyone|all)|hi (?:everyone|all)|bonjour(?: [aà] (?:tous|toutes))?|chers? [eé]tudiants?(?: et [eé]tudiantes?)?)[,!:.]?$/i.test(
        line,
      )
    )
      continue;
    if (
      /^(?:go to (?:an(?:nouncement)?|announcements?|course)|view (?:announcement|in browser)|manage (?:notifications|notification settings)|notification settings|unsubscribe|se d[eé]sabonner|g[eé]rer les notifications|voir l['’]annonce|acc[eé]der (?:au cours|[aà] l['’]annonce))\s*[.!:→»]?$/i.test(
        line,
      )
    )
      continue;
    if (/^[-_]{3,}\s*(?:forwarded message|message transf[eé]r[eé])\s*[-_]{3,}$/i.test(line))
      continue;
    // The importer may append relevant source lines after the body. Show each once.
    if (!message.contentVersion && key.length >= 35 && seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
