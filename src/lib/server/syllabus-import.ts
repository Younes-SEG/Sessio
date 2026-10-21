import { z } from 'zod';
import { assessmentSchema, courseSchema } from './validation';
import { transaction } from './mutations';
import { ApiError } from './errors';
import { assessmentNameKey } from '../syllabus';
import { matchSyllabusAssessment, genericCategory, assessmentIdentity } from '../syllabus-matching';
import { requireWorkspaceId } from './auth';
import { randomUUID } from 'node:crypto';
import { gradingRulesSchema, readGradingRules, gradingRuleError } from '../grading-rules';

const schema = z
  .object({
    courseId: z.string().min(1).max(200).optional(),
    newCourse: courseSchema.pick({ code: true, name: true, semesterId: true }).optional(),
    reviewed: z.literal(true, 'Review the suggestions before saving.'),
    gradingRules: gradingRulesSchema.optional(),
    gradingNotes: z.string().max(5000).optional(),
    items: z
      .array(
        z.object({
          clientId: z.string().min(1).max(200).optional(),
          existingId: z.string().min(1).max(200).nullable(),
          name: z.string().trim().min(1).max(200),
          type: z.enum(['ASSIGNMENT', 'LAB', 'QUIZ', 'MIDTERM', 'FINAL_EXAM', 'PROJECT', 'OTHER']),
          dueDate: z.string().datetime({ offset: true }).nullable(),
          weight: z.number().finite().min(0).max(100).nullable(),
          source: z.string().max(2000),
        }),
      )
      .max(100),
  })
  .refine(
    (value) => Boolean(value.courseId) !== Boolean(value.newCourse),
    'Choose an existing course or create a new one.',
  )
  .refine(
    (value) =>
      Boolean(value.newCourse) || value.items.length > 0 || Boolean(value.gradingRules?.length),
    'Select at least one assessment.',
  );

export async function importSyllabus(body: unknown) {
  const workspaceId = await requireWorkspaceId();
  const {
    courseId: existingCourseId,
    newCourse,
    items,
    gradingRules,
    gradingNotes,
  } = schema.parse(body);
  return transaction(async (tx) => {
    let course;
    if (newCourse) {
      const semester = await tx.semester.findUnique({
        where: { id: newCourse.semesterId, workspaceId },
      });
      if (!semester) throw new ApiError(404, 'This term no longer exists.');
      if (
        await tx.course.findFirst({
          where: { semesterId: semester.id, code: { equals: newCourse.code, mode: 'insensitive' } },
        })
      )
        throw new ApiError(
          409,
          'This course code already exists in this term. Choose Existing course to add assessments to it.',
        );
      if (items.some((item) => item.existingId))
        throw new ApiError(400, 'A new course cannot update assessments from another course.');
      course = await tx.course.create({ data: courseSchema.parse(newCourse) });
    } else {
      course = await tx.course.findUnique({
        where: { id: existingCourseId!, semester: { workspaceId } },
      });
    }
    if (!course) throw new ApiError(404, 'This course no longer exists.');
    const courseId = course.id;
    const current = await tx.assessment.findMany({ where: { courseId } });
    const usedIds = new Set<string>();
    const names = new Set(current.map((item) => assessmentNameKey(item.name)));
    const clientIds = new Set<string>();
    const idMap = new Map<string, string>();
    const changes = items.map((item) => {
      if (item.clientId && clientIds.has(item.clientId))
        throw new ApiError(400, 'Duplicate import row.');
      if (item.clientId) clientIds.add(item.clientId);
      if (
        !item.existingId &&
        genericCategory(item) &&
        current.some((a) => assessmentIdentity(a).type === assessmentIdentity(item).type)
      )
        throw new ApiError(
          409,
          'This is a category total for existing assessments. Apply its weight to the category members instead of creating another assessment.',
        );
      const matches = item.existingId ? [] : matchSyllabusAssessment(item, current);
      if (matches.length > 1)
        throw new ApiError(
          409,
          'Several existing assessments could match this row. Review the match before saving.',
        );
      const existing = item.existingId
        ? current.find((a) => a.id === item.existingId)
        : current.find((a) => a.id === matches[0]?.id);
      if (item.existingId && !existing)
        throw new ApiError(
          409,
          'A matched assessment is missing or belongs to another course. Review the matches again.',
        );
      if (existing) {
        if (usedIds.has(existing.id))
          throw new ApiError(400, 'Match each existing assessment only once.');
        usedIds.add(existing.id);
      } else {
        const key = assessmentNameKey(item.name);
        if (!key) throw new ApiError(400, 'Give each assessment a descriptive name.');
        if (names.has(key))
          throw new ApiError(
            409,
            `“${item.name}” already exists or appears twice. Match it to the existing assessment, deselect it, or give it a distinct name.`,
          );
        names.add(key);
      }
      const weight =
        existing?.weight && !item.existingId
          ? existing.weight
          : (item.weight ?? existing?.weight ?? 0);
      const id = existing?.id || randomUUID();
      if (item.clientId) idMap.set(item.clientId, id);
      const dueDate =
        existing?.dueDate && !item.existingId
          ? existing.dueDate
          : item.dueDate
            ? new Date(item.dueDate)
            : (existing?.dueDate ?? null);
      const data = assessmentSchema.parse({
        ...(existing ?? {}),
        courseId,
        name: existing?.name ?? item.name,
        type: existing?.type ?? item.type,
        weight,
        dueDate,
        notes:
          existing?.notes ??
          (item.source
            ? `Imported from syllabus. Verify against the course outline.\n\n${item.source}`
            : ''),
      });
      return { existing, data, id };
    });
    const rules = gradingRules
      ? gradingRules.map((r) => ({
          ...r,
          assessmentIds: r.assessmentIds.map((id) => idMap.get(id) || id),
        }))
      : readGradingRules(course.gradingRules);
    const projected = [
      ...current.filter((a) => !usedIds.has(a.id)),
      ...changes.map((c) => ({ ...c.data, id: c.id })),
    ];
    const ruleError = gradingRuleError(rules, projected);
    if (ruleError) throw new ApiError(400, ruleError);
    for (const { existing, data, id } of changes) {
      if (existing)
        await tx.assessment.update({
          where: { id: existing.id },
          data: { dueDate: data.dueDate, weight: data.weight },
        });
      else await tx.assessment.create({ data: { ...data, id } });
    }
    await tx.course.update({
      where: { id: courseId },
      data: {
        syllabusImportedAt: new Date(),
        ...(gradingRules !== undefined ? { gradingRules: rules } : {}),
        ...(gradingNotes !== undefined ? { gradingNotes } : {}),
      },
    });
    return {
      courseId,
      courseCreated: Boolean(newCourse),
      created: changes.filter((item) => !item.existing).length,
      updated: usedIds.size,
    };
  });
}
