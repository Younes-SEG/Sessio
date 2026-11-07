import type { Prisma } from '@/generated/prisma/client';
import { classifySchoolEmail, currentEmailText } from '../email-classification';
import { EMAIL_CONTENT_VERSION } from '../email-content';
import { emailScore, matchEmailAssessment } from '../email-grades';

/** Run inside the serializable sync transaction: applying a grade and consuming
 * its source must succeed together, including when two tabs sync concurrently. */
export async function applyPendingEmailGrades(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  connectionId: string,
) {
  const scope = { connectionId, connection: { workspaceId } };
  const messages = await tx.emailUpdate.findMany({
    where: {
      ...scope,
      status: 'PENDING',
      bodyTruncated: false,
      contentVersion: { gte: EMAIL_CONTENT_VERSION },
    },
    orderBy: [{ receivedAt: 'desc' }, { id: 'asc' }],
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
  const history = await tx.emailUpdate.findMany({
    where: {
      ...scope,
      status: { in: ['APPLIED', 'AUTO_APPLIED', 'AUTO_MATCHED'] },
      suggestedAssessmentId: { not: null },
    },
    orderBy: [{ receivedAt: 'desc' }, { reviewedAt: 'desc' }],
  });
  const latest = new Map<string, (typeof history)[number]>();
  for (const message of history)
    if (!latest.has(message.suggestedAssessmentId!))
      latest.set(message.suggestedAssessmentId!, message);

  const candidates = messages.flatMap((message) => {
    if (
      classifySchoolEmail(
        { subject: message.subject, sender: message.sender, text: message.excerpt },
        courses,
      ) !== 'GRADE'
    )
      return [];
    // Re-read the source rather than trusting a previously suggested ID or score.
    const score = emailScore(currentEmailText(message.excerpt));
    const assessmentId = matchEmailAssessment(
      currentEmailText(`${message.subject}\n${message.excerpt}`),
      courses,
      assessments,
      message.receivedAt,
    );
    return score && assessmentId ? [{ message, assessmentId, ...score }] : [];
  });
  let applied = 0;
  for (const candidate of candidates) {
    const { message, assessmentId, score, maxScore } = candidate;
    const assessment = assessments.find((item) => item.id === assessmentId)!;
    const previous = latest.get(assessmentId);
    if (previous && previous.receivedAt > message.receivedAt) {
      await tx.emailUpdate.update({
        where: { id: message.id },
        data: {
          status: 'SUPERSEDED',
          reviewedAt: new Date(),
          suggestedAssessmentId: assessmentId,
          excerpt: '',
        },
      });
      continue;
    }
    // Equal timestamps with contradictory scores have no reliable ordering.
    if (
      candidates.some(
        (other) =>
          other.assessmentId === assessmentId &&
          +other.message.receivedAt === +message.receivedAt &&
          (other.score !== score || other.maxScore !== maxScore),
      )
    )
      continue;
    if (
      previous &&
      +previous.receivedAt === +message.receivedAt &&
      (previous.score !== score || previous.maxScore !== maxScore)
    )
      continue;
    const sameGrade =
      assessment.score === score &&
      assessment.maxScore === maxScore &&
      assessment.status === 'GRADED';
    const unchangedAutomaticGrade =
      previous?.status === 'AUTO_APPLIED' &&
      assessment.status === 'GRADED' &&
      assessment.score === previous.score &&
      assessment.maxScore === previous.maxScore;
    // Preserve a user's entered/edited grade. A new email can update a grade
    // previously imported automatically only while that grade remains untouched.
    if (!sameGrade && (assessment.score !== null || previous) && !unchangedAutomaticGrade) continue;
    if (!sameGrade) {
      await tx.assessment.update({
        where: { id: assessmentId },
        data: { score, maxScore, status: 'GRADED' },
      });
      Object.assign(assessment, { score, maxScore, status: 'GRADED' });
    }
    const status = sameGrade && !unchangedAutomaticGrade ? 'AUTO_MATCHED' : 'AUTO_APPLIED';
    const saved = await tx.emailUpdate.update({
      where: { id: message.id },
      data: {
        status,
        score,
        maxScore,
        suggestedAssessmentId: assessmentId,
        reviewedAt: new Date(),
        excerpt: '',
      },
    });
    latest.set(assessmentId, saved);
    applied++;
  }
  return applied;
}
