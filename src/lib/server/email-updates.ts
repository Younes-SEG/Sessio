import { assertGmailAllowed, gmailAllowed } from './release-policy';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { db } from './db';
import { requireWorkspaceId } from './auth';
import { ApiError } from './errors';
import { transaction } from './mutations';
import {
  gmailConfig,
  gmailTokens,
  gmailGet,
  openGmail,
  sealGmail,
  revokeGmail,
} from './gmail-client';
import {
  emailScore,
  gmailContent,
  matchEmailAssessment,
  effectiveGmailQuery,
  scopedGmailQuery,
  SCHOOL_GMAIL_SCOPE,
  type GmailPart,
} from '../email-grades';
import { EMAIL_CONTENT_VERSION } from '../email-content';
import { schoolNotificationGroups } from '../email-duplicates';
import { applyPendingEmailGrades } from './automatic-email-grades';
import {
  AUTO_DEADLINE,
  AUTO_DEADLINE_READ,
  applyPendingEmailDeadlines,
  safeTimeZone,
} from './automatic-email-deadlines';
import { emailDeadlineChanges } from '../email-deadlines';
import {
  currentEmailText,
  classifySchoolEmail,
  emailDeadline,
  schoolEmailExcerpt,
} from '../email-classification';

export const deadlineRevision = (assessment: { dueDate: Date | null }) =>
  createHash('sha256')
    .update(assessment.dueDate?.toISOString() ?? 'none')
    .digest('hex');

export const gradeRevision = (assessment: {
  score: number | null;
  maxScore: number;
  status: string;
}) =>
  createHash('sha256')
    .update(JSON.stringify([assessment.score, assessment.maxScore, assessment.status]))
    .digest('hex');

export async function exportEmailData() {
  const workspaceId = await requireWorkspaceId();
  return db.gmailConnection.findUnique({
    where: { workspaceId },
    select: {
      email: true,
      query: true,
      autoSync: true,
      connectedAt: true,
      consentVersion: true,
      lastCheckedAt: true,
      lastError: true,
      messages: {
        where: { status: { not: 'IGNORED' } },
        select: {
          subject: true,
          sender: true,
          receivedAt: true,
          excerpt: true,
          contentVersion: true,
          bodyTruncated: true,
          score: true,
          maxScore: true,
          suggestedAssessmentId: true,
          status: true,
          reviewedAt: true,
        },
      },
    },
  });
}
export async function emailOverview() {
  const workspaceId = await requireWorkspaceId();
  const courses = await db.course.findMany({
    where: { semester: { workspaceId }, archived: false, deletedAt: null },
    select: {
      id: true,
      code: true,
      archived: true,
      semester: { select: { isActive: true, startDate: true, endDate: true } },
    },
  });
  const assessments = await db.assessment.findMany({
    where: { course: { semester: { workspaceId }, archived: false, deletedAt: null } },
    select: { id: true, courseId: true, name: true, type: true },
  });
  const connection = await db.gmailConnection.findUnique({
    where: { workspaceId },
    select: {
      email: true,
      autoSync: true,
      query: true,
      connectedAt: true,
      consentVersion: true,
      lastCheckedAt: true,
      lastAttemptAt: true,
      lastError: true,
      pageToken: true,
      messages: {
        where: {
          status: {
            in: [
              'PENDING',
              'READ',
              'AUTO_APPLIED',
              'AUTO_MATCHED',
              AUTO_DEADLINE,
              AUTO_DEADLINE_READ,
            ],
          },
        },
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true,
          messageId: true,
          subject: true,
          sender: true,
          receivedAt: true,
          excerpt: true,
          contentVersion: true,
          bodyTruncated: true,
          score: true,
          maxScore: true,
          suggestedAssessmentId: true,
          status: true,
        },
      },
    },
  });
  // Reclassify previously imported messages too, so broad-filter results disappear
  // immediately without deleting any saved grade or changing the user's mailbox.
  const updates =
    connection?.messages.flatMap((m) => {
      if (m.status === 'AUTO_APPLIED' || m.status === 'AUTO_MATCHED') return [];
      const kind = classifySchoolEmail(
        { subject: m.subject, sender: m.sender, text: m.excerpt },
        courses,
      );
      if (kind === 'IGNORE') return [];
      return [
        {
          ...m,
          // Re-evaluate stored grade notices too: no Gmail reimport or new row needed.
          suggestedAssessmentId:
            kind === 'GRADE'
              ? matchEmailAssessment(
                  currentEmailText(`${m.subject}\n${m.excerpt}`),
                  courses,
                  assessments,
                  m.receivedAt,
                )
              : m.suggestedAssessmentId,
          read: m.status === 'READ' || m.status === AUTO_DEADLINE_READ,
          kind,
          proposedDeadline: kind === 'ASSESSMENT_CHANGE' ? emailDeadline(m.excerpt) : null,
          // Deadlines this email already changed automatically (shown instead of the review form).
          appliedDeadlines:
            m.status === AUTO_DEADLINE || m.status === AUTO_DEADLINE_READ
              ? emailDeadlineChanges(
                  { subject: m.subject, text: m.excerpt, receivedAt: m.receivedAt },
                  courses,
                  assessments,
                ).map((change) => change.assessmentId)
              : [],
          receivedAt: m.receivedAt.toISOString(),
          gmailUrl: `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(connection.email)}#all/${encodeURIComponent(m.messageId)}`,
        },
      ];
    }) || [];
  return {
    configured: Boolean(gmailConfig()) && gmailAllowed(workspaceId),
    releaseAvailable: gmailAllowed(workspaceId),
    connection: connection
      ? {
          email: connection.email,
          autoSync: connection.autoSync,
          query: effectiveGmailQuery(connection.query),
          connectedAt: connection.connectedAt.toISOString(),
          consentVersion: connection.consentVersion,
          lastCheckedAt: connection.lastCheckedAt?.toISOString() ?? null,
          lastError: connection.lastError,
          moreAvailable: Boolean(connection.pageToken),
        }
      : null,
    updates: schoolNotificationGroups(updates).map((copies) => ({
      ...copies[0],
      read: copies.some((copy) => copy.read),
      sourceEmails: copies.map((copy) => ({
        id: copy.id,
        sender: copy.sender,
        gmailUrl: copy.gmailUrl,
        receivedAt: copy.receivedAt,
      })),
    })),
    automaticGrades:
      connection?.messages
        .filter((m) => m.status === 'AUTO_APPLIED' || m.status === 'AUTO_MATCHED')
        .slice(0, 50)
        .map((m) => ({
          id: m.id,
          assessmentId: m.suggestedAssessmentId,
          score: m.score,
          maxScore: m.maxScore,
          receivedAt: m.receivedAt.toISOString(),
          subject: m.subject,
          alreadyRecorded: m.status === 'AUTO_MATCHED',
          gmailUrl: `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(connection!.email)}#all/${encodeURIComponent(m.messageId)}`,
        })) || [],
  };
}

export async function syncEmail(automatic = false, requestedTimeZone?: unknown) {
  const timeZone = safeTimeZone(requestedTimeZone);
  const workspaceId = await requireWorkspaceId();
  assertGmailAllowed(workspaceId);
  const connection = await db.gmailConnection.findUnique({ where: { workspaceId } });
  if (!connection || (automatic && !connection.autoSync)) return { checked: 0 };
  if (!gmailConfig()) throw new ApiError(503, 'Gmail connection setup is not complete.');
  const now = new Date();
  const token = randomUUID();
  const claimed = await db.gmailConnection.updateMany({
    where: {
      id: connection.id,
      workspaceId,
      AND: [
        {
          OR: [
            { syncStartedAt: null },
            { syncStartedAt: { lt: new Date(now.getTime() - 120000) } },
          ],
        },
        ...(automatic
          ? [
              {
                autoSync: true,
                OR: [
                  { lastAttemptAt: null },
                  { lastAttemptAt: { lt: new Date(now.getTime() - 240000) } },
                ],
              },
            ]
          : []),
      ],
    },
    data: { syncToken: token, syncStartedAt: now, lastAttemptAt: now },
  });
  if (!claimed.count) return { checked: 0 };
  try {
    // Retry existing clear matches even if Gmail is temporarily offline.
    let applied = await transaction(
      async (tx) =>
        (await applyPendingEmailGrades(tx, workspaceId, connection.id)) +
        (await applyPendingEmailDeadlines(tx, workspaceId, connection.id, timeZone)),
    );
    const tokens = await gmailTokens({
      grant_type: 'refresh_token',
      refresh_token: openGmail(connection.refreshToken, workspaceId),
    });
    if (tokens.refresh_token)
      await db.gmailConnection.updateMany({
        where: { id: connection.id, workspaceId, syncToken: token },
        data: { refreshToken: sealGmail(tokens.refresh_token, workspaceId) },
      });
    const after = Math.floor(
      Math.max(
        now.getTime() - 30 * 86400000,
        (effectiveGmailQuery(connection.query) !== connection.query
          ? 0
          : connection.lastCheckedAt?.getTime() || 0) -
          2 * 86400000,
      ) / 1000,
    );
    const resume = connection.pageQuery?.startsWith(`(${SCHOOL_GMAIL_SCOPE}) `);
    const query =
      (resume ? connection.pageQuery : null) ||
      `${scopedGmailQuery(connection.query)} after:${after} before:${Math.floor(now.getTime() / 1000) + 1}`;
    // Finish at the original scan cutoff, even if the user resumes pagination days later.
    const cutoff = / before:(\d+)$/.exec(query);
    const checkedThrough = cutoff
      ? new Date(Math.min(now.getTime(), Number(cutoff[1]) * 1000))
      : now;
    const listed = z
      .object({
        messages: z
          .array(
            z.object({
              id: z
                .string()
                .regex(/^[a-zA-Z0-9_-]+$/)
                .max(200),
            }),
          )
          .max(20)
          .optional(),
        nextPageToken: z.string().max(2000).optional(),
      })
      .parse(
        await gmailGet('messages', tokens.access_token, {
          q: query,
          maxResults: '20',
          ...(resume && connection.pageToken ? { pageToken: connection.pageToken } : {}),
        }),
      );
    const courses = await db.course.findMany({
      where: { semester: { workspaceId }, archived: false, deletedAt: null },
      select: {
        id: true,
        code: true,
        archived: true,
        semester: { select: { isActive: true, startDate: true, endDate: true } },
      },
    });
    const assessments = await db.assessment.findMany({
      where: { course: { semester: { workspaceId }, archived: false, deletedAt: null } },
      select: { id: true, courseId: true, name: true, type: true },
    });
    const known = await db.emailUpdate.findMany({
      where: {
        connectionId: connection.id,
        messageId: { in: (listed.messages || []).map((m) => m.id) },
      },
      select: { messageId: true },
    });
    const seen = new Set(known.map((m) => m.messageId));
    // Refresh old short excerpts once, including notifications already marked read.
    const legacy = await db.emailUpdate.findMany({
      where: {
        connectionId: connection.id,
        status: { in: ['PENDING', 'READ'] },
        contentVersion: { lt: EMAIL_CONTENT_VERSION },
      },
      orderBy: { receivedAt: 'desc' },
      select: { messageId: true },
      take: 20,
    });
    const repairIds = new Set(legacy.map((m) => m.messageId));
    const ids = [
      ...(listed.messages || []).filter((m) => !seen.has(m.id)),
      ...legacy.map((m) => ({ id: m.messageId })),
    ];
    const updates: Prisma.EmailUpdateCreateManyInput[] = [];
    for (let i = 0; i < ids.length; i += 4) {
      if (Date.now() - now.getTime() > 45000)
        throw new ApiError(503, 'Gmail took too long. Please check again.');
      const batch = await Promise.all(
        ids.slice(i, i + 4).map(async ({ id }) => {
          const raw = await gmailGet(`messages/${id}`, tokens.access_token, {
            format: 'full',
            fields: 'id,internalDate,payload',
          });
          const message = z
            .object({
              internalDate: z.string(),
              payload: z.custom<GmailPart>((v) => Boolean(v && typeof v === 'object')),
            })
            .parse(raw);
          const headers = message.payload.headers || [];
          const subject = (
            headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No subject)'
          ).slice(0, 300);
          const sender = (headers.find((h) => h.name.toLowerCase() === 'from')?.value || '').slice(
            0,
            300,
          );
          const content = gmailContent(message.payload);
          const body = content.text;
          const excerpt = schoolEmailExcerpt(subject, body);
          const kind = classifySchoolEmail({ subject, sender, text: excerpt }, courses);
          if (kind === 'IGNORE')
            return {
              connectionId: connection.id,
              messageId: id,
              subject: '',
              sender: '',
              receivedAt: now,
              excerpt: '',
              contentVersion: EMAIL_CONTENT_VERSION,
              bodyTruncated: content.truncated,
              status: 'IGNORED',
              reviewedAt: now,
              score: null,
              maxScore: null,
              suggestedAssessmentId: null,
            };
          const text = currentEmailText(`${subject}\n${body}`);
          const score = kind === 'GRADE' ? emailScore(currentEmailText(excerpt)) : null;
          const receivedAt = new Date(Number(message.internalDate));
          if (!Number.isFinite(receivedAt.getTime()))
            throw new ApiError(502, 'Gmail returned an unreadable response.');
          return {
            connectionId: connection.id,
            messageId: id,
            subject,
            sender,
            receivedAt,
            excerpt,
            contentVersion: EMAIL_CONTENT_VERSION,
            bodyTruncated: content.truncated,
            score: score?.score ?? null,
            maxScore: score?.maxScore ?? null,
            suggestedAssessmentId: matchEmailAssessment(text, courses, assessments, receivedAt),
          };
        }),
      );
      updates.push(...batch);
    }
    applied += await transaction(async (tx) => {
      const current = await tx.gmailConnection.findUnique({
        where: { id: connection.id, workspaceId, syncToken: token },
      });
      if (!current) return 0;
      if (updates.length) {
        await tx.emailUpdate.createMany({
          data: updates.filter((m) => !repairIds.has(m.messageId)),
          skipDuplicates: true,
        });
        for (const update of updates.filter((m) => repairIds.has(m.messageId))) {
          const { connectionId, messageId, ...data } = update;
          // A review may have been saved while Gmail was responding. Never reopen it.
          await tx.emailUpdate.updateMany({
            where: { connectionId, messageId, status: { in: ['PENDING', 'READ'] } },
            data,
          });
        }
      }
      await tx.gmailConnection.update({
        where: { id: current.id },
        data: {
          lastError: null,
          query: effectiveGmailQuery(connection.query),
          pageToken: listed.nextPageToken || null,
          pageQuery: listed.nextPageToken ? query : null,
          ...(!listed.nextPageToken ? { lastCheckedAt: checkedThrough } : {}),
        },
      });
      await tx.emailUpdate.deleteMany({
        where: {
          connectionId: current.id,
          status: { not: 'PENDING' },
          reviewedAt: { lt: new Date(now.getTime() - 90 * 86400000) },
        },
      });
      return (
        (await applyPendingEmailGrades(tx, workspaceId, connection.id)) +
        (await applyPendingEmailDeadlines(tx, workspaceId, connection.id, timeZone))
      );
    });
    return { checked: listed.messages?.length || 0, applied };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : 'Unable to read Gmail. Please try again.';
    await db.gmailConnection.updateMany({
      where: { id: connection.id, workspaceId, syncToken: token },
      data: {
        lastError: message,
        ...(error instanceof ApiError && error.status === 409
          ? { pageToken: null, pageQuery: null }
          : {}),
      },
    });
    throw new ApiError(error instanceof ApiError ? error.status : 503, message);
  } finally {
    await db.gmailConnection.updateMany({
      where: { id: connection.id, workspaceId, syncToken: token },
      data: { syncToken: null, syncStartedAt: null },
    });
  }
}

export async function configureEmail(input: unknown) {
  const workspaceId = await requireWorkspaceId();
  const data = z
    .object({ autoSync: z.boolean(), query: z.string().trim().min(1).max(500) })
    .parse(input);
  const result = await db.gmailConnection.updateMany({
    where: { workspaceId },
    data: {
      ...data,
      pageToken: null,
      pageQuery: null,
      lastCheckedAt: null,
      syncToken: null,
      syncStartedAt: null,
    },
  });
  if (!result.count) throw new ApiError(404, 'Connect Gmail first.');
}
export async function disconnectEmail() {
  const workspaceId = await requireWorkspaceId();
  const connection = await db.gmailConnection.findUnique({ where: { workspaceId } });
  await transaction(async (tx) => {
    await tx.gmailOAuthState.deleteMany({ where: { workspaceId } });
    await tx.gmailConnection.deleteMany({ where: { workspaceId } });
  });
  let revoked = false;
  if (connection) {
    try {
      revoked = await revokeGmail(openGmail(connection.refreshToken, workspaceId));
    } catch {
      /* Local deletion still completes if credentials have changed. */
    }
  }
  return { revoked };
}

const reviewSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), id: z.string().min(1).max(200) }),
  z.object({ action: z.literal('read-all') }),
  z.object({ action: z.literal('dismiss'), id: z.string().min(1).max(200) }),
  z.object({
    action: z.literal('apply-deadline'),
    id: z.string().min(1).max(200),
    assessmentId: z.string().min(1).max(200),
    dueDate: z.iso.datetime({ offset: true }),
    expectedRevision: z.string().length(64),
  }),
  z
    .object({
      action: z.literal('apply'),
      id: z.string().min(1).max(200),
      assessmentId: z.string().min(1).max(200),
      score: z.number().finite().min(0).max(100000),
      maxScore: z.number().finite().positive().max(100000),
      expectedRevision: z.string().length(64),
    })
    .refine((v) => v.score <= v.maxScore, 'Score cannot exceed the maximum.'),
]);
export async function reviewEmail(input: unknown) {
  const workspaceId = await requireWorkspaceId();
  const data = reviewSchema.parse(input);
  return transaction(async (tx) => {
    if (data.action === 'read-all') {
      // Marks course notifications read only; grade reviews and pending decisions are untouched.
      const courses = await tx.course.findMany({
        where: { semester: { workspaceId }, archived: false, deletedAt: null },
        select: { code: true, archived: true },
      });
      const unread = await tx.emailUpdate.findMany({
        where: { connection: { workspaceId }, status: { in: ['PENDING', AUTO_DEADLINE] } },
        select: { id: true, status: true, subject: true, sender: true, excerpt: true },
      });
      const notices = unread.filter((m) => {
        const kind = classifySchoolEmail(
          { subject: m.subject, sender: m.sender, text: m.excerpt },
          courses,
        );
        return kind === 'ANNOUNCEMENT' || kind === 'ASSESSMENT_CHANGE';
      });
      const ids = (status: string) => notices.filter((m) => m.status === status).map((m) => m.id);
      await tx.emailUpdate.updateMany({
        where: { id: { in: ids('PENDING') }, connection: { workspaceId }, status: 'PENDING' },
        data: { status: 'READ', reviewedAt: new Date() },
      });
      await tx.emailUpdate.updateMany({
        where: {
          id: { in: ids(AUTO_DEADLINE) },
          connection: { workspaceId },
          status: AUTO_DEADLINE,
        },
        data: { status: AUTO_DEADLINE_READ },
      });
      return;
    }
    const message = await tx.emailUpdate.findUnique({
      where: { id: data.id, connection: { workspaceId } },
    });
    if (!message) throw new ApiError(404, 'This email update no longer exists.');
    if (data.action === 'read') {
      // Reading a notification is independent of approving its proposed change.
      // Idempotent across tabs, and never clears the source or edits an assessment.
      if (message.status === AUTO_DEADLINE) {
        await tx.emailUpdate.updateMany({
          where: { id: message.id, connection: { workspaceId }, status: AUTO_DEADLINE },
          data: { status: AUTO_DEADLINE_READ },
        });
        return;
      }
      if (message.status !== 'PENDING' && message.status !== 'READ') return;
      const courses = await tx.course.findMany({
        where: { semester: { workspaceId }, archived: false, deletedAt: null },
        select: { code: true, archived: true },
      });
      const kind = classifySchoolEmail(
        { subject: message.subject, sender: message.sender, text: message.excerpt },
        courses,
      );
      if (kind !== 'ANNOUNCEMENT' && kind !== 'ASSESSMENT_CHANGE')
        throw new ApiError(400, 'This email does not support that update.');
      let ids = [message.id];
      if (kind === 'ANNOUNCEMENT') {
        const candidates = await tx.emailUpdate.findMany({
          where: {
            connectionId: message.connectionId,
            connection: { workspaceId },
            status: { in: ['PENDING', 'READ'] },
          },
        });
        const groups = schoolNotificationGroups(
          candidates.map((candidate) => ({
            ...candidate,
            kind: classifySchoolEmail(
              { subject: candidate.subject, sender: candidate.sender, text: candidate.excerpt },
              courses,
            ),
          })),
        );
        ids =
          groups
            .find((group) => group.some((candidate) => candidate.id === message.id))
            ?.map((candidate) => candidate.id) || ids;
      }
      await tx.emailUpdate.updateMany({
        where: { id: { in: ids }, connection: { workspaceId }, status: 'PENDING' },
        data: { status: 'READ', reviewedAt: new Date() },
      });
      return;
    }
    const autoApplied = message.status === AUTO_DEADLINE || message.status === AUTO_DEADLINE_READ;
    if (
      (message.status !== 'PENDING' && message.status !== 'READ' && !autoApplied) ||
      (autoApplied && data.action !== 'dismiss')
    )
      throw new ApiError(409, 'This email update was already reviewed.');
    if (data.action !== 'dismiss') {
      const courses = await tx.course.findMany({
        where: { semester: { workspaceId }, archived: false, deletedAt: null },
        select: { code: true, archived: true },
      });
      const kind = classifySchoolEmail(
        { subject: message.subject, sender: message.sender, text: message.excerpt },
        courses,
      );
      if (
        (data.action === 'apply' && kind !== 'GRADE') ||
        (data.action === 'apply-deadline' && kind !== 'ASSESSMENT_CHANGE')
      )
        throw new ApiError(400, 'This email does not support that update.');
      const assessment = await tx.assessment.findUnique({
        where: {
          id: data.assessmentId,
          course: { semester: { workspaceId }, archived: false, deletedAt: null },
        },
      });
      if (!assessment) throw new ApiError(404, 'Choose an assessment from your active courses.');
      if (data.action === 'apply-deadline') {
        if (deadlineRevision(assessment) !== data.expectedRevision)
          throw new ApiError(
            409,
            'This deadline changed since you opened the review. Refresh and check it again.',
          );
        await tx.assessment.update({
          where: { id: assessment.id },
          data: { dueDate: new Date(data.dueDate) },
        });
      } else {
        if (gradeRevision(assessment) !== data.expectedRevision)
          throw new ApiError(
            409,
            'This grade changed since you opened the review. Refresh and check it again.',
          );
        await tx.assessment.update({
          where: { id: assessment.id },
          data: { score: data.score, maxScore: data.maxScore, status: 'GRADED' },
        });
      }
    }
    await tx.emailUpdate.update({
      where: { id: message.id },
      data: {
        status: data.action !== 'dismiss' ? 'APPLIED' : 'DISMISSED',
        reviewedAt: new Date(),
        excerpt: '',
        ...(data.action !== 'dismiss' ? { suggestedAssessmentId: data.assessmentId } : {}),
        ...(data.action === 'apply' ? { score: data.score, maxScore: data.maxScore } : {}),
      },
    });
  });
}

export async function emailAssessmentRevisions() {
  const workspaceId = await requireWorkspaceId();
  const rows = await db.assessment.findMany({
    where: { course: { semester: { workspaceId }, archived: false, deletedAt: null } },
    select: {
      id: true,
      name: true,
      score: true,
      maxScore: true,
      status: true,
      dueDate: true,
      course: { select: { code: true, semester: { select: { name: true } } } },
    },
    orderBy: { name: 'asc' },
  });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    score: a.score,
    maxScore: a.maxScore,
    status: a.status,
    course: `${a.course.code} · ${a.course.semester.name}`,
    revision: gradeRevision(a),
    dueDate: a.dueDate?.toISOString() ?? null,
    deadlineRevision: deadlineRevision(a),
  }));
}
