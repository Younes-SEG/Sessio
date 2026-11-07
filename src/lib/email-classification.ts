import { emailScore } from './email-grades';

export type SchoolEmailKind = 'GRADE' | 'ANNOUNCEMENT' | 'ASSESSMENT_CHANGE' | 'IGNORE';
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const assessmentWords =
  /\b(assignment|lab|laboratoire|devoir|quiz|test|questionnaire|midterm|final exam|exam|examen|deliverable|livrable|project|projet|evaluation)(?=\b|\d)/;
const changeWords =
  /\b(deadline|due date|now due|extended|extension|rescheduled|postponed|cancelled|canceled|date limite|echeance|reporte|reportee|prolonge|prolongee|annule|annulee|nouvelle date)\b/;

export function currentEmailText(text: string) {
  // Replies often quote an old grade below an unrelated new message. Forwarded
  // school notifications are retained; ordinary reply quotations are excluded.
  return text
    .split(/\n(?:On .{1,200} wrote:|Le .{1,200} a ecrit\s*:)/i)[0]
    .split('\n')
    .filter((line) => !/^\s*>/.test(line))
    .join('\n');
}

/** Relevance is a content filter, not sender authentication or permission to change data. */
export function classifySchoolEmail(
  message: { subject: string; sender: string; text: string },
  courses: { code: string; archived: boolean }[],
): SchoolEmailKind {
  const subject = normalize(message.subject);
  const text = normalize(currentEmailText(`${message.subject}\n${message.text}`));
  const codes = new Set(
    (text.match(/\b[a-z]{2,4}\s*\d{4}\b/g) || []).map((code) => code.replace(/\s/g, '')),
  );
  const activeCourse = courses.some(
    (course) => !course.archived && codes.has(normalize(course.code).replace(/\s/g, '')),
  );
  const platform = /\b(brightspace|d2l)\b/.test(`${normalize(message.sender)} ${text}`);
  if (!activeCourse && !platform) return 'IGNORE';
  // A footer mentioning Brightspace does not make promotions or account notices academic updates.
  if (
    /\b(unsubscribe|sale|discount|promotion|newsletter|password reset|verification code|security alert|mot de passe|code de verification)\b/.test(
      subject,
    )
  )
    return 'IGNORE';
  if (/\b(lecture notes|class notes|course notes|notes de cours|notes du cours)\b/.test(subject))
    return 'IGNORE';
  if (/\b(grade weights?|grading scheme|bareme|ponderation)\b/.test(subject)) return 'ANNOUNCEMENT';

  // Brightspace activity digests include ordinary upcoming due dates alongside
  // results. A populated grade section belongs in grade review, not deadline review.
  if (
    /^\s*(?:course grades|grades du cours|notes du cours|resultats du cours)\s*\([1-9]\d*\)/m.test(
      text,
    )
  )
    return 'GRADE';
  if (assessmentWords.test(text) && changeWords.test(text)) return 'ASSESSMENT_CHANGE';
  // English "please note ... published" describes an announcement, not a mark.
  // Only pair the ambiguous French noun "note" with French grade-release wording;
  // remove non-grade French note phrases before checking that wording.
  const frenchGradeText = text.replace(/\bnotes?\s+(?:de cours|de reunion|importantes?)\b/g, '');
  const gradeNotice =
    /\b(grades?|marks?|scores?|results?|resultats?)\b.{0,65}\b(released|published|posted|available|updated|received|graded|disponibles?|publiee?s?|affichee?s?|mise?s? a jour|obtenue?s?)\b/.test(
      text,
    ) ||
    /\bnotes?\b.{0,65}\b(disponibles?|publiee?s?|affichee?s?|mise?s? a jour|obtenue?s?)\b/.test(
      frenchGradeText,
    ) ||
    /\b(new|updated)\s+(grades?|marks?|scores?|results?)\b/.test(text) ||
    /\b(nouvelle|nouveau)\s+(note|resultat)\b/.test(frenchGradeText) ||
    /\b(has been graded|was graded|a ete (note|notee|corrige|corrigee))\b/.test(text);
  // Bare "note", lecture notes, grade weights and class averages aren't grade notifications.
  if (gradeNotice || emailScore(text)) return 'GRADE';
  if (
    /\b(announcement|announcements|annonce|annonces|feedback|retroaction|commentaires?|cancellation|cancelled|canceled|annule|annulee|rescheduled|postponed|room change|changement de salle|important update|avis important)\b/.test(
      text,
    )
  )
    return 'ANNOUNCEMENT';
  // Brightspace's Email tool sends plain professor messages, without an
  // "Announcements" label. A course-coded message from its direct-mail sender
  // is useful even when it says "test1 demain" rather than a fixed keyword.
  const address = (/<([^<>]+)>/.exec(message.sender)?.[1] || message.sender).trim().toLowerCase();
  const directLmsMail = /^email@(?:[a-z0-9-]+\.)*(?:brightspace|d2l)\.com$/.test(address);
  const subjectHasCourse = /\b[a-z]{2,4}[\s-]*\d{4}\b/.test(subject);
  if (directLmsMail && subjectHasCourse && currentEmailText(message.text).trim())
    return 'ANNOUNCEMENT';
  return 'IGNORE';
}

/** Only explicit, unambiguous calendar dates are suggested; never infer "next Friday" or a year. */
export function emailDeadline(text: string): { date: string; time: string | null } | null {
  const content = normalize(currentEmailText(text));
  if (!changeWords.test(content)) return null;
  if (/\b(cancelled|canceled|annule|annulee)\b/.test(content)) return null;
  const months: Record<string, number> = {
    january: 1,
    janvier: 1,
    february: 2,
    fevrier: 2,
    march: 3,
    mars: 3,
    april: 4,
    avril: 4,
    may: 5,
    mai: 5,
    june: 6,
    juin: 6,
    july: 7,
    juillet: 7,
    august: 8,
    aout: 8,
    september: 9,
    septembre: 9,
    october: 10,
    octobre: 10,
    november: 11,
    novembre: 11,
    december: 12,
    decembre: 12,
  };
  const candidates: string[] = [];
  const add = (year: number, month: number, day: number) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      year >= 2000 &&
      year <= 2200 &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
      candidates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };
  // Ignore message headers/footers: date must appear on a deadline-related line.
  const lines = content.split(/[\r\n]+/).filter((line) => changeWords.test(line));
  for (const line of lines) {
    for (const match of line.matchAll(/\b(20\d{2}|21\d{2}|2200)-(\d{2})-(\d{2})\b/g))
      add(+match[1], +match[2], +match[3]);
    for (const match of line.matchAll(
      /\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2}|21\d{2}|2200)\b/g,
    )) {
      if (months[match[1]]) add(+match[3], months[match[1]], +match[2]);
    }
    for (const match of line.matchAll(
      /\b(\d{1,2})(?:er)?\s+([a-z]+)[,]?\s+(20\d{2}|21\d{2}|2200)\b/g,
    )) {
      if (months[match[2]]) add(+match[3], months[match[2]], +match[1]);
    }
  }
  const dates = [...new Set(candidates)];
  if (dates.length !== 1) return null;
  const times = new Set<string>();
  for (const match of lines.join('\n').matchAll(/\b(\d{1,2})[:h](\d{2})\s*(am|pm)?\b/g)) {
    let hour = +match[1];
    if (+match[2] > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) continue;
    if (match[3]) hour = (hour % 12) + (match[3] === 'pm' ? 12 : 0);
    times.add(`${String(hour).padStart(2, '0')}:${match[2]}`);
  }
  return { date: dates[0], time: times.size === 1 ? [...times][0] : null };
}

/** Keep the readable message, not a keyword-selected summary. Limits are applied by gmailContent. */
export function schoolEmailExcerpt(subject: string, body: string) {
  const text = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  return `${subject}\n${text}`.trim();
}
