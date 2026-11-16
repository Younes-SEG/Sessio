import {
  currentEmailText,
  describesDeadlineChange,
  emailDeadline,
  explicitDates,
  explicitTimes,
} from './email-classification';
import { matchEmailAssessment } from './email-grades';
import type { Assessment } from './types';

type EmailCourse = Parameters<typeof matchEmailAssessment>[1][number];
type EmailAssessment = Pick<Assessment, 'id' | 'courseId' | 'name' | 'type'>;
export interface EmailDeadlineChange {
  assessmentId: string;
  date: string;
  time: string | null;
}

/** Clear deadline changes in a course email: each line that names exactly one assessment of
 * that course and exactly one explicit date. "Assignment 2 is now due November 17, 2026" and
 * "Deliverable 2 is now due November 17, 2026" give two changes. Anything ambiguous gives none. */
export function emailDeadlineChanges(
  message: { subject: string; text: string; receivedAt?: Date | string },
  courses: EmailCourse[],
  assessments: EmailAssessment[],
): EmailDeadlineChange[] {
  const content = currentEmailText(message.text);
  const whole = `${message.subject}\n${content}`;
  if (!describesDeadlineChange(whole)) return [];
  // Course context comes from the student's own course codes in the email (room numbers such as
  // "STE 2052" are ignored); each line then names its own assessment.
  const key = (code: string) => code.toLowerCase().replace(/[\s-]/g, '');
  const mentioned = new Set(
    (whole.toLowerCase().match(/\b[a-z]{2,4}[\s-]*\d{4}\b/g) || []).map(key),
  );
  const codes = [
    ...new Set(
      courses.filter((c) => !c.archived && mentioned.has(key(c.code))).map((c) => key(c.code)),
    ),
  ];
  if (codes.length !== 1) return [];
  const found = new Map<string, EmailDeadlineChange | null>();
  for (const line of content.split(/[\r\n]+/)) {
    const dates = explicitDates(line);
    if (dates.length !== 1) continue;
    const assessmentId = matchEmailAssessment(
      `${codes[0]}\n${line}`,
      courses,
      assessments,
      message.receivedAt,
    );
    if (!assessmentId) continue;
    const times = explicitTimes(line);
    const change = { assessmentId, date: dates[0], time: times.length === 1 ? times[0] : null };
    const previous = found.get(assessmentId);
    // The same assessment with two different dates is contradictory: change nothing.
    if (previous === undefined) found.set(assessmentId, change);
    else if (previous && (previous.date !== change.date || previous.time !== change.time))
      found.set(assessmentId, null);
  }
  const changes = [...found.values()].filter((c): c is EmailDeadlineChange => c !== null);
  if (changes.length || found.size) return changes;
  // One assessment named in the subject and one date in the body.
  const single = emailDeadline(whole);
  const assessmentId = single
    ? matchEmailAssessment(whole, courses, assessments, message.receivedAt)
    : null;
  return single && assessmentId ? [{ assessmentId, ...single }] : [];
}
