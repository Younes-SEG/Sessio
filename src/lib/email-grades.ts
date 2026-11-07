import { assessmentIdentity } from './syllabus-matching';
import { assessmentNameKey } from './syllabus';
import type { Assessment, Course } from './types';

export const LEGACY_GMAIL_QUERY =
  '{brightspace uottawa.ca} {grade grades graded score marks note notes résultat résultats}';
export const LEGACY_SCHOOL_GMAIL_QUERY =
  '{brightspace d2l from:uottawa.ca} {grade grades graded score marks "note publiée" "nouvelle note" résultat résultats announcement announcements annonce annonces deadline "due date" extended rescheduled cancelled canceled échéance reporté prolongée "date limite"} -category:promotions -category:social';
// Direct course messages need not contain the template words used by notifications.
// Fetch LMS senders broadly; the content classifier still removes routine noise.
export const SCHOOL_GMAIL_SCOPE = `({from:brightspace.com from:d2l.com} OR (${LEGACY_SCHOOL_GMAIL_QUERY})) -category:promotions -category:social`;
export const DEFAULT_GMAIL_QUERY = SCHOOL_GMAIL_SCOPE;
export const effectiveGmailQuery = (query: string) =>
  query === LEGACY_GMAIL_QUERY || query === LEGACY_SCHOOL_GMAIL_QUERY ? DEFAULT_GMAIL_QUERY : query;
export function scopedGmailQuery(query: string) {
  const effective = effectiveGmailQuery(query);
  return effective === DEFAULT_GMAIL_QUERY
    ? `(${SCHOOL_GMAIL_SCOPE})`
    : `(${SCHOOL_GMAIL_SCOPE}) (${effective})`;
}
export const GMAIL_NOTICE = '2026-10-19';
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Names from Brightspace and syllabus imports use different punctuation/spacing.
const assessmentTextKey = (value: string) =>
  assessmentNameKey(value)
    .replace(/([a-z])(\d)/g, '$1 $2')
    // Normalize labels on both sides, keeping assessment numbers and parts intact.
    // Require "exam" after MT so a timezone or unrelated abbreviation is not a midterm.
    .replace(/\b(?:mt|m t)\s*exam(?:ination)?\b/g, 'midterm')
    .replace(/\bmid\s*term(?:\s+exam(?:ination)?)?\b/g, 'midterm')
    .replace(/\b(?:examen\s+(?:de\s+)?mi\s+session|(?:examen\s+)?intra)\b/g, 'midterm')
    .replace(/\b(?:examen|exam)\s+(?=test\b)/g, '');
const assessmentMention =
  /\b(?:lab(?:oratory|oratoire)?|tp|quiz|questionnaire|test|assignment|devoir|deliverable|livrable|midterm|mid term|examen de mi session|final exam|final examination|examen final)\s*(?:(?:no|n|numero|number)\s*)?\d*\b(?:\s+(?:part|partie|phase)\s+(?:[a-z]|\d+)\b)?/g;

function emailAssessmentIdentity(item: Pick<Assessment, 'name' | 'type'>) {
  const name = assessmentTextKey(item.name);
  const identity = assessmentIdentity({ ...item, name });
  // A named "Test 1" may be stored as a midterm, quiz or other assessment.
  // Match the explicit test label on both sides without assuming every test is a quiz
  // or confusing it with a differently named midterm that happens to share its number.
  const namedType = assessmentIdentity({ name, type: 'OTHER' }).type;
  return namedType === 'OTHER' && /\btest\b/.test(name)
    ? { ...identity, type: 'TEST' as const }
    : identity;
}

type EmailCourse = Pick<Course, 'id' | 'code' | 'archived'> & {
  semester?: { isActive: boolean; startDate: Date | string; endDate: Date | string };
};

/** Extract explicit score statements only. Dates, category weights and release notices are not grades. */
export function emailScore(
  text: string,
): { score: number; maxScore: number; evidence: string } | null {
  const candidates: Array<{ score: number; maxScore: number; evidence: string }> = [];
  for (const line of text.split(/[\n\r]+/)) {
    const normalized = normalize(line);
    if (
      !/\b(grade|score|mark|result|note|resultat|received|obtained|obtenu|obtenue)\b/.test(
        normalized,
      )
    )
      continue;
    if (
      /\b(weight|worth|ponderation|poids|moyenne|average|class mean|out of date)\b/.test(normalized)
    )
      continue;
    const matches = [
      ...normalized.matchAll(
        /\b(\d{1,5}(?:[.,]\d{1,3})?)\s*(?:\/|out of|sur)\s*(\d{1,5}(?:[.,]\d{1,3})?)\b|\b(\d{1,3}(?:[.,]\d{1,3})?)\s*%/g,
      ),
    ];
    for (const match of matches) {
      const prefix = normalized.slice(0, match.index);
      if (
        !/(?:\b(?:grade|score|mark|result|note|resultat)\s*(?:(?:is|was|est|de)\s*)?[:=]?\s*$|\b(?:received|obtained|obtenu|obtenue)\s*[:=]?\s*$|\b(?:grade|score|mark|result|note|resultat)\b[^:\n]{0,60}:\s*$)/.test(
          prefix,
        )
      )
        continue;
      const score = Number((match[1] || match[3]).replace(',', '.'));
      const maxScore = match[2] ? Number(match[2].replace(',', '.')) : 100;
      if (maxScore > 0 && score >= 0 && score <= maxScore)
        candidates.push({ score, maxScore, evidence: line.trim().slice(0, 1000) });
    }
  }
  const unique = new Map(candidates.map((c) => [`${c.score}/${c.maxScore}`, c]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

/** Summaries mix upcoming work with results. Match inside the grade section first. */
function assessmentContext(text: string) {
  const lines = normalize(text)
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: string[] = [];
  let inGrades = false;
  for (const line of lines) {
    const heading =
      /^(?:course grades|grades du cours|notes du cours|resultats du cours)\s*(?:\((\d+)\))?\s*:?$/.exec(
        line,
      );
    if (heading) {
      // One review row cannot represent several independently graded items.
      if (heading[1] && Number(heading[1]) > 1) return '';
      inGrades = true;
      continue;
    }
    if (
      /^(?:go to|acceder|aller aux?|content updates|course updates|assignment\s*\(|mises a jour)/.test(
        line,
      )
    )
      inGrades = false;
    if (inGrades) sections.push(line);
  }
  if (sections.length) return sections.join('\n');

  // Individual notifications often put the assessment in a heading immediately
  // before "Your grade". Only use a standalone title, never a nearby due-date line.
  const contexts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!emailScore(lines[i])) continue;
    if (new RegExp(assessmentMention.source).test(assessmentTextKey(lines[i]))) {
      contexts.push(lines[i]);
      continue;
    }
    const previous = lines[i - 1] || '';
    if (
      /^(?:updated|graded|mis(?:e)? a jour|note publiee)\s*[-:–—]/.test(previous) ||
      new RegExp(`^(?:${assessmentMention.source})$`).test(assessmentTextKey(previous))
    )
      contexts.push(previous, lines[i]);
  }
  return contexts.length ? contexts.join('\n') : text;
}

/** A suggestion needs one course and one assessment; ambiguous terms or multiple assessments stay unassigned. */
export function matchEmailAssessment(
  text: string,
  courses: EmailCourse[],
  assessments: Pick<Assessment, 'id' | 'courseId' | 'name' | 'type'>[],
  receivedAt?: Date | string,
) {
  const wholeMessage = normalize(text);
  const codes = new Set(
    (wholeMessage.match(/\b[a-z]{2,4}[\s-]*\d{4}\b/g) || []).map((c) => c.replace(/[\s-]/g, '')),
  );
  let matchingCourses = courses.filter(
    (c) => !c.archived && codes.has(normalize(c.code).replace(/[\s-]/g, '')),
  );
  // Resolve repeated course codes using the message's term, not unrelated old
  // copies. Distinct course codes or genuinely competing current courses stay ambiguous.
  if (new Set(matchingCourses.map((c) => normalize(c.code).replace(/[\s-]/g, ''))).size > 1)
    return null;
  if (matchingCourses.length > 1 && receivedAt) {
    const day = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
    const received = new Date(receivedAt);
    if (Number.isFinite(received.getTime())) {
      const date = day(received);
      const dated = matchingCourses.filter(
        (c) => c.semester && day(c.semester.startDate) <= date && day(c.semester.endDate) >= date,
      );
      if (dated.length) {
        matchingCourses = dated;
        if (dated.length > 1) {
          const active = dated.filter((c) => c.semester?.isActive);
          if (active.length === 1) matchingCourses = active;
        }
      }
    }
  }
  if (matchingCourses.length !== 1) return null;
  const content = assessmentTextKey(assessmentContext(text));
  const candidates = assessments.filter((a) => a.courseId === matchingCourses[0].id);
  const mentions = [...content.matchAll(assessmentMention)].map((m) =>
    emailAssessmentIdentity({ name: m[0], type: 'OTHER' }),
  );
  // Do not let a known item hide a second, unknown numbered assessment in the email.
  const numbered = new Set(
    mentions.filter((m) => m.numbers).map((m) => `${m.type}:${m.numbers}:${m.part}`),
  );
  if (numbered.size > 1) return null;
  const exact = candidates.filter((a) => {
    const name = assessmentTextKey(a.name);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const identity = emailAssessmentIdentity(a);
    return (
      name.length >= 4 &&
      new RegExp(`\\b${escaped}\\b`).test(content) &&
      (!numbered.size ||
        mentions.some(
          (m) =>
            m.type === identity.type && m.numbers === identity.numbers && m.part === identity.part,
        ))
    );
  });
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;
  const matches = candidates.filter((a) => {
    const identity = emailAssessmentIdentity(a);
    return mentions.some(
      (m) => m.type === identity.type && m.numbers === identity.numbers && m.part === identity.part,
    );
  });
  return matches.length === 1 ? matches[0].id : null;
}

export { gmailBody, gmailContent, type GmailPart } from './email-content';
