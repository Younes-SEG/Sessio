import { z } from 'zod';
import type { SyllabusSuggestion } from './syllabus';
import {
  syllabusSessionSchema,
  syllabusTimingSchema,
  syllabusExceptionSchema,
  validDate,
  sessionStartTime,
  type SyllabusSession,
  type SyllabusException,
} from './syllabus-schedule';

export const syllabusCategorySchema = z
  .object({
    name: z.string().min(1).max(200),
    type: z.enum(['ASSIGNMENT', 'LAB', 'QUIZ', 'MIDTERM', 'FINAL_EXAM', 'PROJECT', 'OTHER']),
    weight: z.number().positive().max(100),
    count: z.number().int().min(1).max(100).nullable(),
    equalWeights: z.boolean(),
    source: z.string().max(1200),
    page: z.number().int().min(1).max(60).nullable(),
  })
  .strict();
export type SyllabusCategory = z.infer<typeof syllabusCategorySchema>;

export const syllabusResultSchema = z
  .object({
    categories: z.array(syllabusCategorySchema).max(30).optional(),
    sessions: z.array(syllabusSessionSchema).max(60).optional(),
    exceptions: z.array(syllabusExceptionSchema).max(30).optional(),
    course: z
      .object({
        code: z.string().max(30).nullable(),
        name: z.string().max(200).nullable(),
        source: z.string().max(1200),
        page: z.number().int().min(1).max(60).nullable(),
      })
      .strict()
      .nullable()
      .optional(),
    items: z
      .array(
        z
          .object({
            name: z.string().min(1).max(200),
            type: z.enum([
              'ASSIGNMENT',
              'LAB',
              'QUIZ',
              'MIDTERM',
              'FINAL_EXAM',
              'PROJECT',
              'OTHER',
            ]),
            date: z.string().max(10).nullable(),
            time: z.string().max(5).nullable(),
            weight: z.number().min(0).max(100).nullable(),
            source: z.string().max(1200),
            page: z.number().int().min(1).max(60).nullable(),
            warnings: z.array(z.string().max(400)).max(10),
            grouped: z.boolean(),
            timing: syllabusTimingSchema.nullable().optional(),
            durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
            tentative: z.boolean().optional(),
          })
          .strict(),
      )
      .max(100),
    warnings: z.array(z.string().max(400)).max(20),
  })
  .strict();

export interface SyllabusPreview {
  categories?: SyllabusCategory[];
  sessions?: SyllabusSession[];
  exceptions?: SyllabusException[];
  course?: z.infer<typeof syllabusResultSchema>['course'];
  items: SyllabusSuggestion[];
  warnings: string[];
}

// The service adds validation warnings and normalizes unknown dates/times to empty strings.
export const syllabusPreviewSchema = syllabusResultSchema.extend({
  items: z
    .array(
      syllabusResultSchema.shape.items.element.extend({
        date: z.string().regex(/^(?:\d{4}-\d{2}-\d{2})?$/),
        time: z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d)?$/),
        warnings: z.array(z.string().max(400)).max(20),
      }),
    )
    .max(100),
});

export function validateSyllabusResult(
  raw: unknown,
  context: { startDate: string; endDate: string; pages: number | null },
): SyllabusPreview {
  const result = syllabusResultSchema.parse(raw);
  const checkedPage = (page: number | null) =>
    page !== null && context.pages !== null && page <= context.pages ? page : null;
  // Older readers may return a category as one grouped row. Preserve its
  // combined weight separately instead of erasing it or counting it twice.
  const categories = [...(result.categories || [])];
  for (const item of result.items) {
    if (
      item.grouped &&
      item.weight &&
      !categories.some(
        (c) => c.type === item.type && c.name.toLowerCase() === item.name.toLowerCase(),
      )
    )
      categories.push({
        name: item.name,
        type: item.type,
        weight: item.weight,
        count: null,
        equalWeights: false,
        source: item.source,
        page: item.page,
      });
  }
  return {
    categories: categories.map((category) => ({ ...category, page: checkedPage(category.page) })),
    ...(result.sessions
      ? {
          sessions: result.sessions.map((session) => ({
            ...session,
            startTime: sessionStartTime(session),
            page: checkedPage(session.page),
          })),
        }
      : {}),
    ...(result.exceptions
      ? {
          exceptions: result.exceptions.filter(
            (e) => validDate(e.startDate) && validDate(e.endDate) && e.startDate <= e.endDate,
          ),
        }
      : {}),
    ...(result.course !== undefined
      ? {
          course: result.course
            ? {
                ...result.course,
                code: result.course.code?.trim() || null,
                name: result.course.name?.trim() || null,
                page:
                  result.course.page !== null &&
                  context.pages !== null &&
                  result.course.page <= context.pages
                    ? result.course.page
                    : null,
              }
            : null,
        }
      : {}),
    warnings: result.warnings,
    items: result.items.map((item) => {
      const warnings = [...item.warnings];
      let date = item.date || '';
      let time = item.time || '';
      let timing = item.timing ? { ...item.timing, page: checkedPage(item.timing.page) } : null;
      if (
        timing &&
        (!validDate(timing.startDate) ||
          !validDate(timing.endDate) ||
          timing.startDate > timing.endDate)
      ) {
        timing = { ...timing, startDate: null, endDate: null };
        warnings.push('The session is known, but its calendar week needs confirmation.');
      }
      // A session reference is not a confirmed deadline, even if the model filled one in.
      if (timing) {
        date = '';
        time = '';
      }
      if (date) {
        const parsed = new Date(`${date}T00:00:00Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== date
        ) {
          date = '';
          warnings.push(
            'The suggested date was invalid. Enter the correct date from your syllabus.',
          );
        } else if (date < context.startDate || date > context.endDate)
          warnings.push('Date falls outside the selected course semester.');
      }
      if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        time = '';
        warnings.push('The suggested time was invalid. Check the source.');
      }
      if (!date && timing)
        warnings.push('Choose your session below to confirm a date, or leave it undated.');
      else if (!date)
        warnings.push('No definite due date. Add one when your instructor confirms it.');
      else if (!time)
        warnings.push('No time found. A date without a time uses 23:59 in your device time zone.');
      const weight = item.grouped ? null : item.weight;
      if (item.grouped)
        warnings.push(
          'Grouped or conditional grading: review individual weights before including this row.',
        );
      else if (weight === null)
        warnings.push('No definite weight. Blank weight means 0% for a new assessment.');
      let page = item.page;
      if (page !== null && (context.pages === null || page > context.pages)) {
        page = null;
        warnings.push('The source page could not be verified. Check the original document.');
      }
      if (!item.source.trim())
        warnings.push('No supporting excerpt returned. Verify this assessment in the original.');
      return {
        ...item,
        name: item.name.trim(),
        date,
        time,
        ...(item.timing !== undefined ? { timing } : {}),
        weight,
        page,
        warnings: [...new Set(warnings)],
      };
    }),
  };
}
