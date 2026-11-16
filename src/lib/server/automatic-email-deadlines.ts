import type { Prisma } from '@/generated/prisma/client';
import { localStamp, localToInstant } from '../assistant';
import { classifySchoolEmail } from '../email-classification';
import { EMAIL_CONTENT_VERSION } from '../email-content';
import { emailDeadlineChanges } from '../email-deadlines';

export const AUTO_DEADLINE = 'AUTO_DEADLINE';
export const AUTO_DEADLINE_READ = 'AUTO_DEADLINE_READ';
export const DEFAULT_TIME_ZONE = 'America/Toronto';

export function safeTimeZone(value: unknown) {
  if (typeof value !== 'string' || value.length > 64) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Run inside the sync transaction. Applies clear deadline changes from course emails
 * ("Assignment 2 is now due November 17, 2026") once per email, oldest first so the newest
 * wins. A date without a time keeps the assessment's current due time (else 23:59) in the
 * student's time zone. The email stays in Updates, marked as applied; it is never reapplied,
 * so a later manual edit is not overwritten. */
export async function applyPendingEmailDeadlines(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  connectionId: string,
  timeZone: string,
) {
  const messages = await tx.emailUpdate.findMany({
    where: {
      connectionId,
      connection: { workspaceId },
      status: { in: ['PENDING', 'READ'] },
      bodyTruncated: false,
      contentVersion: { gte: EMAIL_CONTENT_VERSION },
    },
    orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
  });
  if (!messages.length) return 0;
  const courses = await tx.course.findMany({
    where: { semester: { workspaceId }, archived: false, deletedAt: null },
    select: {
      id: true,
      code: true,
      archived: true,
      semester: { select: { isActive: true, startDate: true, endDate: true } },
    },
  });
  const assessments = await tx.assessment.findMany({
    where: { courseId: { in: courses.map((course) => course.id) } },
  });
  let applied = 0;
  for (const message of messages) {
    const email = { subject: message.subject, sender: message.sender, text: message.excerpt };
    if (classifySchoolEmail(email, courses) !== 'ASSESSMENT_CHANGE') continue;
    const changes = emailDeadlineChanges(
      { subject: message.subject, text: message.excerpt, receivedAt: message.receivedAt },
      courses,
      assessments,
    );
    let handled = false;
    for (const change of changes) {
      const assessment = assessments.find((a) => a.id === change.assessmentId)!;
      const time =
        change.time ??
        (assessment.dueDate ? localStamp(assessment.dueDate, timeZone).slice(11) : '23:59');
      const dueDate = localToInstant(`${change.date}T${time}`, timeZone);
      // Ignore a date already behind the email itself: likely a quoted old deadline.
      if (!dueDate || dueDate.getTime() < message.receivedAt.getTime() - 86400000) continue;
      handled = true;
      if (assessment.dueDate?.getTime() === dueDate.getTime()) continue;
      await tx.assessment.update({ where: { id: assessment.id }, data: { dueDate } });
      assessment.dueDate = dueDate;
      applied++;
    }
    if (handled)
      await tx.emailUpdate.update({
        where: { id: message.id },
        data: {
          status: message.status === 'READ' ? AUTO_DEADLINE_READ : AUTO_DEADLINE,
          reviewedAt: new Date(),
        },
      });
  }
  return applied;
}
