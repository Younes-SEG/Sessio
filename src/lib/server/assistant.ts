import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import {
  assistantAgendaForIntent,
  friendlyWhen,
  friendlySession,
  nextAssessmentAnswer,
  validDay,
  localToInstant,
  matchingAssessment,
  matchingCourses,
  say,
  sessionConflicts,
  type AssistantIntent,
  type AssistantReply,
  type AssistantWorkspace,
  type ChatMessage,
  type ChatEntry,
} from '@/lib/assistant';
import { recordAssistantReply } from './assistant-history';
import { requireWorkspaceId } from './auth';
import { db } from './db';
import { transaction } from './mutations';
import { ApiError } from './errors';
import { assessmentSchema, eventSchema } from './validation';
import { interpretAssistant } from './assistant-ai';
import { answerAssistantQuery } from '@/lib/assistant-query';
import { gradeStatusAnswer } from '@/lib/assistant-grades';
import { assertAiAgeConfirmed } from './ai-age';

type Tx = Prisma.TransactionClient;
type Plan = {
  kind: 'grade' | 'schedule';
  language: string;
  zone: string;
  targetId: string;
  courseId: string | null;
  revision: string;
  text: string;
  score?: number;
  maxScore?: number;
  before?: {
    score: number | null;
    maxScore: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  };
  startLocal?: string;
  endLocal?: string;
  startAt?: string;
  endAt?: string;
  title?: string;
  conflicts?: string;
};
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const revision = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const receiptKey = (workspaceId: string, id: string) => ({ workspaceId_id: { workspaceId, id } });
const changed = () =>
  new ApiError(
    409,
    'This entry changed since the request. Ask again so Command can use the latest information.',
  );

async function snapshot(tx: Tx, workspaceId: string): Promise<AssistantWorkspace> {
  const courses = await tx.course.findMany({
    where: { semester: { workspaceId }, deletedAt: null, archived: false },
  });
  const courseIds = courses.map((c) => c.id);
  const [semesters, assessments, tasks, events, schedules, settings] = await Promise.all([
    tx.semester.findMany({ where: { workspaceId } }),
    tx.assessment.findMany({ where: { courseId: { in: courseIds } } }),
    tx.task.findMany({
      where: { workspaceId, OR: [{ courseId: null }, { courseId: { in: courseIds } }] },
      include: { subtasks: true },
    }),
    tx.calendarEvent.findMany({
      where: { workspaceId, OR: [{ courseId: null }, { courseId: { in: courseIds } }] },
    }),
    tx.scheduleEntry.findMany({ where: { courseId: { in: courseIds } } }),
    tx.settings.findUnique({ where: { workspaceId }, select: { schoolId: true } }),
  ]);
  return JSON.parse(
    JSON.stringify({
      courses,
      semesters,
      assessments,
      tasks,
      events,
      schedules,
      settings: settings ?? { schoolId: null },
    }),
  );
}

function clarify(id: string, text: string): AssistantReply {
  return { id, status: 'clarify', text, context: text };
}

async function prepare(
  tx: Tx,
  workspaceId: string,
  id: string,
  intent: AssistantIntent,
  zone: string,
  language: string,
): Promise<{ reply: AssistantReply; plan?: Plan }> {
  const s = (en: string, fr: string) => say(language, en, fr);
  if (intent.kind === 'chat') {
    const text =
      intent.message?.trim() ||
      s(
        'Hey! How’s your day going? What can I help you with?',
        'Salut ! Comment se passe ta journée ? Comment puis-je t’aider ?',
      );
    return { reply: { id, status: 'answer', text, context: text } };
  }
  if (intent.kind === 'clarify')
    return {
      reply: clarify(
        id,
        intent.question ||
          s(
            'What would you like to plan or record?',
            'Que souhaites-tu planifier ou enregistrer ?',
          ),
      ),
    };
  const data = await snapshot(tx, workspaceId);
  const courses = matchingCourses(data, intent.course);
  if ((intent.course || intent.kind === 'grade') && courses.length !== 1) {
    const options = (courses.length ? courses : data.courses)
      .slice(0, 12)
      .map(
        (c) => `${c.code} — ${c.name} (${data.semesters.find((t) => t.id === c.semesterId)?.name})`,
      )
      .join('\n');
    return {
      reply: clarify(
        id,
        `${s('Which course do you mean? Use its full code or name.', 'De quel cours parles-tu ? Indique son code complet ou son nom.')}\n${options}`,
      ),
    };
  }
  const course = courses[0];
  if (intent.kind === 'grade_status') {
    const hasTarget =
      Boolean(intent.targetLetter) ||
      Boolean(intent.targetPass) ||
      (intent.targetPercent !== null && intent.targetPercent !== undefined);
    if (!course && (hasTarget || intent.assessment))
      return {
        reply: clarify(
          id,
          s(
            'Which course is this for? Use its code or name, like SEG3102.',
            'C’est pour quel cours ? Indique son code ou son nom, par exemple SEG3102.',
          ),
        ),
      };
    return {
      reply: {
        id,
        status: 'answer',
        ...gradeStatusAnswer(data, intent, language, course),
        // Only the question goes back to the model, never the calculated grades.
        context: `Completed read-only grade question: ${JSON.stringify({ kind: intent.kind, course: course?.code ?? null, assessment: intent.assessment, targetLetter: intent.targetLetter ?? null, targetPercent: intent.targetPercent ?? null, targetPass: intent.targetPass ?? null })}. No changes were made.`,
      },
    };
  }
  if (intent.kind === 'query') {
    try {
      return {
        reply: {
          id,
          status: 'answer',
          ...answerAssistantQuery(data, intent, zone, language, new Date(), course?.id),
          context: `Completed read-only question: ${JSON.stringify(intent)}. Keep relevant filters for follow-ups; no changes were made.`,
        },
      };
    } catch {
      return {
        reply: clarify(
          id,
          s(
            'Could you clarify what you want to see and the dates? I can check assessments, grades, tasks, classes, events or study sessions.',
            'Peux-tu préciser ce que tu veux voir et les dates ? Je peux consulter les évaluations, notes, tâches, cours, événements et séances d’étude.',
          ),
        ),
      };
    }
  }
  if (intent.kind === 'next_assessment') {
    if (
      (intent.fromDate && !validDay(intent.fromDate)) ||
      (intent.toDate && !validDay(intent.toDate)) ||
      (intent.fromDate && intent.toDate && intent.fromDate > intent.toDate)
    )
      return {
        reply: clarify(id, s('Which dates should I check?', 'Quelles dates dois-je vérifier ?')),
      };
    return {
      reply: {
        id,
        status: 'answer',
        ...nextAssessmentAnswer(data, intent, zone, language, new Date(), course?.id),
        context: `Completed read-only question: ${JSON.stringify(intent)}. Use only to understand a new follow-up; no changes were made.`,
      },
    };
  }
  if (intent.kind === 'agenda') {
    if (!intent.fromDate || !intent.toDate)
      return {
        reply: clarify(id, s('Which dates should I check?', 'Quelles dates dois-je vérifier ?')),
      };
    let items;
    try {
      items = assistantAgendaForIntent(data, intent, zone, course?.id);
    } catch {
      return {
        reply: clarify(
          id,
          s('Choose a date range of up to 31 days.', 'Choisis une période de 31 jours maximum.'),
        ),
      };
    }
    const labels =
      language === 'fr'
        ? { class: 'Cours', event: 'Événement', task: 'Tâche', assessment: 'À remettre' }
        : { class: 'Class', event: 'Event', task: 'Task', assessment: 'Due' };
    const scope = intent.assessmentType ? 'assessments' : intent.agendaScope || 'all';
    const scopeNames = {
      study_sessions: ['study session', 'séance d’étude'],
      classes: ['class', 'cours'],
      events: ['event', 'événement'],
      tasks: ['task', 'tâche'],
      assessments: ['assessment', 'évaluation'],
      all: ['item', 'élément'],
    };
    const noun = scopeNames[scope][language === 'fr' ? 1 : 0];
    const frenchPlural = {
      study_sessions: 'séances d’étude',
      classes: 'cours',
      events: 'événements',
      tasks: 'tâches',
      assessments: 'évaluations',
      all: 'éléments',
    }[scope];
    const range = new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
    });
    const dates = `${range.format(new Date(`${intent.fromDate}T12:00:00Z`))} – ${range.format(new Date(`${intent.toDate}T12:00:00Z`))}`;
    const text =
      scope !== 'all'
        ? items.length
          ? s(
              `Yes — you have ${items.length} ${noun}${items.length === 1 ? '' : scope === 'classes' ? 'es' : 's'} planned${course ? ` for ${course.code}` : ''} (${dates}).${items.length > 12 ? ' Here are the first 12; the rest are in Calendar.' : ''}`,
              `J’ai trouvé ${items.length} ${items.length === 1 ? noun : frenchPlural} dans ton planning${course ? ` pour ${course.code}` : ''} (${dates}).${items.length > 12 ? ' Voici les 12 premiers ; le reste figure dans le calendrier.' : ''}`,
            )
          : s(
              `I couldn’t find any ${noun}${scope === 'classes' ? 'es' : 's'} with saved dates${course ? ` for ${course.code}` : ''} in that period (${dates}).${scope === 'study_sessions' ? ' Want to plan one? Tell me a day, time and how long you’d like to study.' : ''}`,
              `Je n’ai trouvé aucun élément de type « ${noun} » avec une date${course ? ` pour ${course.code}` : ''} pour cette période (${dates}).${scope === 'study_sessions' ? ' On en planifie une ? Indique le jour, l’heure et la durée.' : ''}`,
            )
        : items.length
          ? s(
              `Here’s what’s planned${course ? ` for ${course.code}` : ''}. ${items.length === 1 ? 'There’s 1 item' : `There are ${items.length} items`} in that period.${items.length > 12 ? ' Here are the first 12; the rest are in Calendar.' : ''}`,
              `Voici ce qui est prévu${course ? ` pour ${course.code}` : ''} : ${items.length} élément(s) pour cette période.${items.length > 12 ? ' Voici les 12 premiers ; le reste figure dans le calendrier.' : ''}`,
            )
          : s(
              intent.assessmentType
                ? 'I couldn’t find any matching assessments with saved dates in that period.'
                : 'You have no scheduled classes, events or unfinished work in that period. A little breathing room!',
              intent.assessmentType
                ? 'Je n’ai trouvé aucune évaluation correspondante avec une date pour cette période.'
                : 'Aucun cours, événement ou travail à terminer n’est prévu pour cette période. Un peu de répit !',
            );
    return {
      reply: {
        id,
        status: 'answer',
        text,
        href: '/calendar',
        context: `Completed read-only question: ${JSON.stringify(intent)}. Use only to understand a new follow-up; no changes were made.`,
        items: items.slice(0, 12).map((item) => ({
          title: item.title,
          detail: `${labels[item.kind]} · ${item.start === item.end ? friendlyWhen(item.start, language, zone) : friendlySession(item.start, item.end, language, zone)}`,
          href: item.href,
        })),
      },
    };
  }
  if (intent.kind === 'grade') {
    const assessment = intent.assessment && matchingAssessment(data, course.id, intent.assessment);
    if (!assessment)
      return {
        reply: clarify(
          id,
          `${s('Which assessment? Choose its exact name:', 'Quelle évaluation ? Indique son nom exact :')}\n${data.assessments
            .filter((a) => a.courseId === course.id)
            .slice(0, 25)
            .map((a) => a.name)
            .join('\n')}`,
        ),
      };
    if (intent.score === null || intent.maxScore === null || intent.score > intent.maxScore)
      return {
        reply: clarify(
          id,
          s(
            'What score did you receive, and out of how many points? For example, 9/10.',
            'Quelle note as-tu obtenue et sur combien ? Par exemple, 9/10.',
          ),
        ),
      };
    if (
      assessment.score === intent.score &&
      assessment.maxScore === intent.maxScore &&
      assessment.status === 'GRADED'
    )
      return {
        reply: {
          id,
          status: 'answer',
          text: s('That grade is already recorded.', 'Cette note est déjà enregistrée.'),
          href: '/grades',
        },
      };
    const current = await tx.assessment.findUniqueOrThrow({
      where: { id: assessment.id, course: { semester: { workspaceId }, deletedAt: null } },
    });
    const percentage = Math.round((intent.score / intent.maxScore) * 1000) / 10;
    const text = s(
      `I recorded ${intent.score}/${intent.maxScore} (${percentage}%) for ${assessment.name} in ${course.code}.`,
      `J’ai enregistré ${intent.score}/${intent.maxScore} (${percentage} %) pour ${assessment.name} en ${course.code}.`,
    );
    const plan: Plan = {
      kind: 'grade',
      language,
      zone,
      targetId: assessment.id,
      courseId: course.id,
      revision: revision(current),
      text,
      score: intent.score,
      maxScore: intent.maxScore,
      before: { score: current.score, maxScore: current.maxScore, status: current.status },
    };
    return {
      plan,
      reply: {
        id,
        status: current.score === null ? 'saved' : 'confirm',
        text:
          current.score === null
            ? text
            : `${s('Replace the existing grade?', 'Remplacer la note existante ?')} ${current.score}/${current.maxScore} → ${intent.score}/${intent.maxScore}\n${course.code} · ${assessment.name}`,
        href: '/grades',
      },
    };
  }
  const start = intent.startLocal && localToInstant(intent.startLocal, zone);
  const end = intent.endLocal && localToInstant(intent.endLocal, zone);
  if (!start || !end || end <= start || +end - +start > 12 * 3_600_000 || +start < Date.now())
    return {
      reply: clarify(
        id,
        s(
          'Choose a future date, a clear start time and an end time (up to 12 hours). Times during a daylight-saving clock change need a different time.',
          'Choisis une date future, une heure de début précise et une heure de fin (12 heures maximum). Évite les heures ambiguës lors du changement d’heure.',
        ),
      ),
    };
  const title = course
    ? s(`Study for ${course.code}`, `Étudier pour ${course.code}`)
    : s('Study session', 'Séance d’étude');
  const existing = data.events.find(
    (e) =>
      e.courseId === (course?.id || null) &&
      e.title === title &&
      +new Date(e.startAt) === +start &&
      +new Date(e.endAt) === +end,
  );
  if (existing)
    return {
      reply: {
        id,
        status: 'answer',
        text: s(
          'That study session is already on your calendar.',
          'Cette séance d’étude figure déjà dans ton calendrier.',
        ),
        href: '/calendar',
      },
    };
  const conflicts = sessionConflicts(data, intent.startLocal!, intent.endLocal!, zone);
  const text = s(
    'You’re all set — your study session is on the calendar.',
    'C’est prêt — ta séance d’étude est dans le calendrier.',
  );
  const sessionDetails = friendlySession(intent.startLocal!, intent.endLocal!, language, zone);
  const plan: Plan = {
    kind: 'schedule',
    language,
    zone,
    targetId: randomUUID(),
    courseId: course?.id || null,
    revision: '',
    title,
    text,
    startLocal: intent.startLocal!,
    endLocal: intent.endLocal!,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    conflicts: revision(conflicts),
  };
  return {
    plan,
    reply: {
      id,
      status: conflicts.length ? 'confirm' : 'saved',
      text: conflicts.length
        ? `${s('You already have something planned at that time. Add this study session anyway?', 'Tu as déjà quelque chose de prévu à cette heure. Ajouter cette séance quand même ?')}\n\n${conflicts.map((c) => `${c.title} · ${friendlySession(c.start, c.end, language, zone)}`).join('\n')}`
        : text,
      items: [{ title, detail: sessionDetails, href: '/calendar' }],
      href: '/calendar',
    },
  };
}

async function apply(tx: Tx, workspaceId: string, plan: Plan) {
  if (plan.kind === 'grade') {
    const current = await tx.assessment.findFirst({
      where: {
        id: plan.targetId,
        course: { semester: { workspaceId }, deletedAt: null, archived: false },
      },
    });
    if (!current || revision(current) !== plan.revision) throw changed();
    assessmentSchema.parse({
      ...current,
      score: plan.score,
      maxScore: plan.maxScore,
      status: 'GRADED',
    });
    const saved = await tx.assessment.update({
      where: { id: current.id },
      data: { score: plan.score, maxScore: plan.maxScore, status: 'GRADED' },
    });
    plan.revision = revision(saved);
  } else {
    if (+new Date(plan.startAt!) < Date.now()) throw changed();
    const data = await snapshot(tx, workspaceId);
    if (plan.courseId && !data.courses.some((c) => c.id === plan.courseId)) throw changed();
    const conflicts = sessionConflicts(data, plan.startLocal!, plan.endLocal!, plan.zone);
    if (revision(conflicts) !== plan.conflicts) throw changed();
    const value = eventSchema.parse({
      title: plan.title,
      courseId: plan.courseId,
      startAt: plan.startAt,
      endAt: plan.endAt,
      color: '#7b8b9d',
    });
    const saved = await tx.calendarEvent.create({
      data: { ...value, id: plan.targetId, workspaceId },
    });
    plan.revision = revision(saved);
  }
}

const requestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('message'),
    id: z.string().uuid(),
    conversationId: z.string().uuid().optional(),
    language: z.enum(['en', 'fr']),
    timeZone: z
      .string()
      .max(80)
      .refine((zone) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: zone });
          return true;
        } catch {
          return false;
        }
      }, 'Choose a valid time zone.'),
    messages: z
      .array(
        z.object({ role: z.enum(['user', 'model']), text: z.string().trim().min(1).max(2000) }),
      )
      .min(1)
      .max(12),
  }),
  z.object({ action: z.enum(['confirm', 'cancel', 'undo']), id: z.string().uuid() }),
]);

export async function assistantRequest(raw: unknown): Promise<AssistantReply> {
  const input = requestSchema.parse(raw);
  const workspaceId = await requireWorkspaceId();
  // New messages reach Gemini; confirming/undoing a saved action does not.
  if (input.action === 'message') await assertAiAgeConfirmed(workspaceId);
  if (input.action !== 'message')
    return transaction(async (tx) => {
      const row = await tx.assistantRequest.findUnique({
        where: receiptKey(workspaceId, input.id),
      });
      if (!row) throw new ApiError(404, 'This chat action is no longer available.');
      if (Date.now() - +row.createdAt > 86_400_000)
        throw new ApiError(409, 'This chat action expired. Open the entry to make changes.');
      const result = row.result as AssistantReply | null;
      const plan = row.plan as Plan | null;
      if (input.action === 'confirm' && row.status === 'APPLIED') return result!;
      if (input.action === 'undo' && row.status === 'UNDONE') return result!;
      if (input.action === 'cancel' && row.status === 'CANCELLED') return result!;
      if (!plan || !result) throw changed();
      if (input.action === 'cancel' && row.status === 'READY') {
        const reply: AssistantReply = {
          id: row.id,
          status: 'cancelled',
          text: say(
            plan.language,
            'Cancelled. Nothing was changed.',
            'Annulé. Aucune modification.',
          ),
        };
        await tx.assistantRequest.update({
          where: receiptKey(workspaceId, row.id),
          data: { status: 'CANCELLED', result: json(reply) },
        });
        await recordAssistantReply(tx, workspaceId, row.conversationId, reply);
        return reply;
      }
      if (input.action === 'confirm' && row.status === 'READY') {
        await apply(tx, workspaceId, plan);
        const reply: AssistantReply = {
          ...result,
          status: 'saved',
          text: plan.text,
        };
        await tx.assistantRequest.update({
          where: receiptKey(workspaceId, row.id),
          data: { status: 'APPLIED', plan: json(plan), result: json(reply) },
        });
        await recordAssistantReply(tx, workspaceId, row.conversationId, reply);
        return reply;
      }
      if (input.action !== 'undo' || row.status !== 'APPLIED') throw changed();
      if (plan.kind === 'grade') {
        const current = await tx.assessment.findFirst({
          where: { id: plan.targetId, course: { semester: { workspaceId }, deletedAt: null } },
        });
        if (!current || revision(current) !== plan.revision) throw changed();
        await tx.assessment.update({ where: { id: current.id }, data: plan.before! });
      } else {
        const current = await tx.calendarEvent.findFirst({
          where: { id: plan.targetId, workspaceId },
        });
        if (!current || revision(current) !== plan.revision) throw changed();
        await tx.calendarEvent.delete({ where: { id: current.id } });
      }
      const reply: AssistantReply = {
        id: row.id,
        status: 'undone',
        text: say(
          plan.language,
          'Undone. The previous state has been restored.',
          'Annulé. L’état précédent a été rétabli.',
        ),
        href: result.href,
      };
      await tx.assistantRequest.update({
        where: receiptKey(workspaceId, row.id),
        data: { status: 'UNDONE', result: json(reply) },
      });
      await recordAssistantReply(tx, workspaceId, row.conversationId, reply);
      return reply;
    });
  if (input.messages.at(-1)?.role !== 'user') throw new ApiError(400, 'Send a message to Command.');
  let modelMessages = input.messages;
  const previous = await transaction(async (tx) => {
    const chat = input.conversationId
      ? await tx.assistantConversation.findUnique({
          where: receiptKey(workspaceId, input.conversationId),
        })
      : null;
    if (input.conversationId && !chat)
      throw new ApiError(404, 'This chat no longer exists. Start a new chat.');
    const row = await tx.assistantRequest.findUnique({ where: receiptKey(workspaceId, input.id) });
    if (row) {
      if (row.status === 'DELETED' || row.conversationId !== (input.conversationId || null))
        throw new ApiError(409, 'This request is no longer available in this chat.');
      if (row.result) return row.result as AssistantReply;
      if (row.status !== 'FAILED')
        throw new ApiError(409, 'This request is still being processed. Wait a moment and retry.');
      if (Date.now() - +row.createdAt < 60_000)
        throw new ApiError(429, 'Wait a minute before retrying this failed chat request.');
    }
    const count = await tx.assistantRequest.count({
      where: { workspaceId, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (count >= 12)
      throw new ApiError(429, 'Too many chat requests. Wait a minute before trying again.');
    if (chat) {
      // A crashed server must not leave a conversation locked forever. The model request times out after 30 seconds.
      await tx.assistantRequest.updateMany({
        where: {
          workspaceId,
          conversationId: chat.id,
          status: 'PROCESSING',
          createdAt: { lt: new Date(Date.now() - 120_000) },
        },
        data: { status: 'FAILED' },
      });
      if ((chat.entries as ChatEntry[]).length >= 400)
        throw new ApiError(
          400,
          'This conversation is full. Start a new chat; this one stays in Recent chats.',
        );
      const pending = await tx.assistantRequest.count({
        where: {
          workspaceId,
          conversationId: chat.id,
          id: { not: input.id },
          OR: [
            { status: 'PROCESSING' },
            { status: 'READY', createdAt: { gte: new Date(Date.now() - 86400_000) } },
          ],
        },
      });
      if (pending)
        throw new ApiError(
          409,
          'This chat has a pending request. Reopen it to review the result before continuing.',
        );
      // Only the latest user message comes from the browser. Prior context belongs to this chat.
      modelMessages = [...(chat.context as ChatMessage[]), input.messages.at(-1)!].slice(-11);
    }
    await tx.assistantRequest.deleteMany({
      where: {
        workspaceId,
        id: { not: input.id },
        createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) },
      },
    });
    if (row)
      await tx.assistantRequest.update({
        where: receiptKey(workspaceId, input.id),
        data: { status: 'PROCESSING', createdAt: new Date() },
      });
    else
      await tx.assistantRequest.create({
        data: { id: input.id, workspaceId, conversationId: input.conversationId || null },
      });
    if (chat) {
      const entries = chat.entries as ChatEntry[];
      const text = input.messages.at(-1)!.text;
      if (!entries.some((entry) => entry.key === `user:${input.id}`)) {
        entries.push({
          key: `user:${input.id}`,
          role: 'user',
          text,
          createdAt: new Date().toISOString(),
        });
        await tx.assistantConversation.update({
          where: receiptKey(workspaceId, chat.id),
          data: {
            entries: json(entries),
            ...(!chat.title ? { title: text.replace(/\s+/g, ' ').slice(0, 80) } : {}),
          },
        });
      }
    }
    return null;
  });
  if (previous) return previous;
  try {
    const intent = await interpretAssistant(
      modelMessages,
      input.timeZone,
      input.language,
      new Date(),
      workspaceId,
    );
    return await transaction(async (tx) => {
      // A workspace erase during the AI request removes this receipt, cancelling the action.
      const row = await tx.assistantRequest.findUnique({
        where: receiptKey(workspaceId, input.id),
      });
      if (!row || row.status !== 'PROCESSING') throw changed();
      const { reply, plan } = await prepare(
        tx,
        workspaceId,
        input.id,
        intent,
        input.timeZone,
        input.language,
      );
      if (plan && reply.status === 'saved') {
        await apply(tx, workspaceId, plan);
        reply.text = plan.text;
      }
      await tx.assistantRequest.update({
        where: receiptKey(workspaceId, input.id),
        data: {
          status:
            reply.status === 'saved' ? 'APPLIED' : reply.status === 'confirm' ? 'READY' : 'DONE',
          ...(plan ? { plan: json(plan) } : {}),
          result: json(reply),
        },
      });
      await recordAssistantReply(
        tx,
        workspaceId,
        row.conversationId,
        reply,
        input.messages.at(-1)!.text,
        modelMessages,
      );
      return reply;
    });
  } catch (error) {
    // Keep a content-free failure receipt so provider failures cannot bypass the rate limit.
    await db.assistantRequest.updateMany({
      where: { workspaceId, id: input.id, status: 'PROCESSING' },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}
