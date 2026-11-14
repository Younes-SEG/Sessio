import { calculateGrades, calculateTarget } from './grades';
import { readGradingRules } from './grading-rules';
import { letterFor, minimumFor, pointsFor } from './grade-scale';
import { schoolById, schoolName, type SchoolProfile } from './schools';
import {
  matchingAssessment,
  say,
  type AssistantIntent,
  type AssistantReply,
  type AssistantWorkspace,
} from './assistant';

type Answer = Pick<AssistantReply, 'text' | 'items' | 'href'>;
type Course = AssistantWorkspace['courses'][number];
type Goal = { value: number; label: string; letter: boolean };

const EPSILON = 0.000001;
/** Round requirements up so a student is never told a slightly-too-low score. */
const up = (value: number) => Math.ceil(value * 10 - EPSILON) / 10;
const fmt = (value: number, language: string) =>
  new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { maximumFractionDigits: 1 }).format(
    value,
  );
const pct = (value: number, language: string) =>
  language === 'fr' ? `${fmt(value, language)} %` : `${fmt(value, language)}%`;

function courseData(data: AssistantWorkspace, course: Course) {
  return {
    assessments: data.assessments.filter((a) => a.courseId === course.id),
    rules: readGradingRules(course.gradingRules),
  };
}

/** Courses for "this semester": the active term, otherwise every current course. */
function semesterCourses(data: AssistantWorkspace) {
  const active = new Set(data.semesters.filter((s) => s.isActive).map((s) => s.id));
  const current = data.courses.filter((c) => !c.archived);
  const inActive = current.filter((c) => active.has(c.semesterId));
  return inActive.length ? inActive : current;
}

function profileFor(data: AssistantWorkspace) {
  return schoolById(data.settings?.schoolId);
}

function gradeSuffix(percent: number, profile: SchoolProfile | null) {
  const letter = letterFor(percent, profile?.letterScale ?? null);
  return letter ? ` (${letter})` : '';
}

function scaleNote(profile: SchoolProfile | null, language: string) {
  if (!profile?.letterScale) return '';
  return say(
    language,
    ` Letters use the ${profile.name} profile; your course outline is the final word.`,
    ` Les lettres suivent le profil de ${schoolName(profile, 'fr')} ; ton plan de cours a le dernier mot.`,
  );
}

function target(data: AssistantWorkspace, intent: AssistantIntent, language: string) {
  const profile = profileFor(data);
  if (intent.targetLetter) {
    const grade = minimumFor(intent.targetLetter, profile?.letterScale ?? null);
    return grade
      ? { goal: { value: grade.min, label: grade.letter, letter: true } satisfies Goal }
      : { goal: null, unsupported: intent.targetLetter };
  }
  if (intent.targetPass) {
    return profile?.passPercent !== null && profile?.passPercent !== undefined
      ? {
          goal: {
            value: profile.passPercent,
            label: say(
              language,
              `a pass (${pct(profile.passPercent, language)})`,
              `la note de passage (${pct(profile.passPercent, language)})`,
            ),
            letter: false,
          } satisfies Goal,
        }
      : { goal: null, unsupported: 'pass' };
  }
  if (intent.targetPercent !== null && intent.targetPercent !== undefined)
    return {
      goal: {
        value: intent.targetPercent,
        label: pct(intent.targetPercent, language),
        letter: false,
      } satisfies Goal,
    };
  return { goal: null };
}

function overview(data: AssistantWorkspace, language: string): Answer {
  const s = (en: string, fr: string) => say(language, en, fr);
  const profile = profileFor(data);
  const rows = semesterCourses(data).map((course) => {
    const { assessments, rules } = courseData(data, course);
    return { course, summary: calculateGrades(assessments, rules) };
  });
  const graded = rows.filter((r) => r.summary.currentGrade !== null);
  if (!graded.length)
    return {
      text: s(
        'You don’t have any recorded grades in your current courses yet, so there’s no average to show.',
        'Tu n’as encore aucune note enregistrée dans tes cours actuels, donc pas de moyenne à afficher.',
      ),
      href: '/grades',
    };
  const creditsReady = graded.every(
    ({ course }) => Number.isFinite(course.credits) && Number(course.credits) > 0,
  );
  const points = graded.map(({ summary }) =>
    pointsFor(summary.currentGrade!, profile?.letterScale ?? null),
  );
  const pointsReady = points.every((value) => value !== null);
  const weighted = Boolean(profile?.gpa && creditsReady && pointsReady);
  const credits = weighted ? graded.reduce((sum, row) => sum + Number(row.course.credits), 0) : 0;
  const average = weighted
    ? graded.reduce((sum, row) => sum + row.summary.currentGrade! * Number(row.course.credits), 0) /
      credits
    : graded.reduce((sum, row) => sum + row.summary.currentGrade!, 0) / graded.length;
  const gpa = weighted
    ? graded.reduce((sum, row, index) => sum + points[index]! * Number(row.course.credits), 0) /
      credits
    : null;
  let explanation: string;
  if (weighted)
    explanation = s(
      `This credit-weighted result uses ${graded.length} course${graded.length === 1 ? '' : 's'} with recorded grades and ${fmt(credits, language)} total credits. Every course grade is based only on work graded so far.`,
      `Ce résultat pondéré utilise ${graded.length} cours notés et ${fmt(credits, language)} crédits au total. Chaque note de cours repose seulement sur les travaux déjà corrigés.`,
    );
  else if (!profile)
    explanation = s(
      'Each course counts equally because no school profile is selected. Percentages are shown without guessing a letter or GPA scale, and each course grade is based only on work graded so far.',
      'Chaque cours compte également, car aucun profil d’établissement n’est sélectionné. Les pourcentages sont affichés sans supposer de barème, et chaque note repose seulement sur les travaux déjà corrigés.',
    );
  else if (!profile.gpa)
    explanation = s(
      `Each course counts equally because the ${profile.name} profile does not define a GPA scale. Each course grade is based only on work graded so far.`,
      `Chaque cours compte également, car le profil de ${schoolName(profile, 'fr')} ne définit pas d’échelle de MPC. Chaque note repose seulement sur les travaux déjà corrigés.`,
    );
  else if (!creditsReady)
    explanation = s(
      'Each course counts equally because one or more graded courses is missing credits. Each course grade is based only on work graded so far.',
      'Chaque cours compte également, car il manque les crédits d’au moins un cours noté. Chaque note repose seulement sur les travaux déjà corrigés.',
    );
  else
    explanation = s(
      `Each course counts equally because the ${profile.name} profile does not provide grade points for every letter. Each course grade is based only on work graded so far.`,
      `Chaque cours compte également, car le profil de ${schoolName(profile, 'fr')} ne fournit pas de points pour chaque lettre. Chaque note repose seulement sur les travaux déjà corrigés.`,
    );
  return {
    text:
      (weighted
        ? s(
            `Your credit-weighted semester average is ${pct(average, language)}${gradeSuffix(average, profile)}, with an estimated ${profile!.gpa!.label} of ${fmt(gpa!, language)}/${fmt(profile!.gpa!.max, language)}. `,
            `Ta moyenne de session pondérée selon les crédits est de ${pct(average, language)}${gradeSuffix(average, profile)}, avec une ${profile!.gpa!.label} estimée de ${fmt(gpa!, language)}/${fmt(profile!.gpa!.max, language)}. `,
          )
        : s(
            `Your equal-weight average across ${graded.length} course${graded.length === 1 ? '' : 's'} with grades is ${pct(average, language)}${gradeSuffix(average, profile)}. `,
            `Ta moyenne non pondérée sur ${graded.length} cours notés est de ${pct(average, language)}${gradeSuffix(average, profile)}. `,
          )) + explanation,
    href: '/grades',
    items: rows.map(({ course, summary }) => ({
      title: `${course.code} · ${course.name}`,
      detail:
        summary.currentGrade === null
          ? s('No grades yet', 'Aucune note pour l’instant')
          : s(
              `${pct(summary.currentGrade, language)}${gradeSuffix(summary.currentGrade, profile)} · ${pct(summary.completedWeight, language)} of the course graded`,
              `${pct(summary.currentGrade, language)}${gradeSuffix(summary.currentGrade, profile)} · ${pct(summary.completedWeight, language)} du cours corrigé`,
            ),
      href: `/courses/${course.id}`,
    })),
  };
}

function current(data: AssistantWorkspace, course: Course, language: string): Answer {
  const s = (en: string, fr: string) => say(language, en, fr);
  const profile = profileFor(data);
  const { assessments, rules } = courseData(data, course);
  const summary = calculateGrades(assessments, rules);
  if (summary.currentGrade === null)
    return {
      text: s(
        `${course.code} has no recorded grades yet. Once a weighted assessment is graded, I can work out your standing.`,
        `${course.code} n’a encore aucune note enregistrée. Dès qu’une évaluation pondérée est corrigée, je peux calculer où tu en es.`,
      ),
      href: `/courses/${course.id}`,
    };
  const warning = summary.warnings[0]
    ? s(` Note: ${summary.warnings[0]}`, ` Remarque : ${summary.warnings[0]}`)
    : '';
  return {
    text:
      s(
        `You’re at ${pct(summary.currentGrade, language)}${gradeSuffix(summary.currentGrade, profile)} in ${course.code}, based on the ${pct(summary.completedWeight, language)} of the course graded so far. You’ve locked in ${fmt(summary.earnedPoints, language)} of 100 course points, with ${pct(summary.remainingWeight, language)} still to come.`,
        `Tu as ${pct(summary.currentGrade, language)}${gradeSuffix(summary.currentGrade, profile)} en ${course.code}, selon les ${pct(summary.completedWeight, language)} du cours déjà corrigés. Tu as obtenu ${fmt(summary.earnedPoints, language)} points sur 100, et il reste ${pct(summary.remainingWeight, language)} du cours.`,
      ) +
      warning +
      scaleNote(profile, language),
    href: `/courses/${course.id}`,
  };
}

function invalid(course: Course, language: string, reason?: string): Answer {
  return {
    text: say(
      language,
      `I can’t calculate a reliable target for ${course.code} yet.${reason ? ` ${reason}` : ''} Check its weights and scores on the course page.`,
      `Je ne peux pas encore calculer d’objectif fiable pour ${course.code}.${reason ? ` ${reason}` : ''} Vérifie les pondérations et les notes sur la page du cours.`,
    ),
    href: `/courses/${course.id}`,
  };
}

/** Required average across everything still ungraded (the Grades page calculation). */
function overall(data: AssistantWorkspace, course: Course, goal: Goal, language: string): Answer {
  const s = (en: string, fr: string) => say(language, en, fr);
  const { assessments, rules } = courseData(data, course);
  const result = calculateTarget(assessments, goal.value, rules);
  const goalText = goal.letter ? `${goal.label} (${pct(goal.value, language)})` : goal.label;
  const href = `/courses/${course.id}`;
  if (result.status === 'invalid') return invalid(course, language, result.assumption);
  if (result.status === 'secured')
    return {
      text: s(
        `Good news: you’ve already secured ${goalText} in ${course.code}. Even with zero on everything left, you’d finish at or above it.`,
        `Bonne nouvelle : tu as déjà obtenu ${goalText} en ${course.code}. Même avec zéro sur ce qui reste, tu finirais au-dessus.`,
      ),
      href,
    };
  if (result.status === 'impossible')
    return {
      text: s(
        `${goalText} is out of reach in ${course.code}: even 100% on everything remaining wouldn’t get you there. ${result.assumption}`,
        `${goalText} n’est plus atteignable en ${course.code} : même 100 % sur tout ce qui reste ne suffirait pas. ${result.assumption}`,
      ),
      href,
    };
  return {
    text:
      s(
        `To finish ${course.code} with ${goalText}, you need an average of ${pct(up(result.requiredAverage!), language)} on the remaining ${pct(result.remainingWeight, language)} of the course. ${result.assumption}`,
        `Pour terminer ${course.code} avec ${goalText}, il te faut une moyenne de ${pct(up(result.requiredAverage!), language)} sur les ${pct(result.remainingWeight, language)} du cours qui restent. ${result.assumption}`,
      ) + (goal.letter ? scaleNote(profileFor(data), language) : ''),
    href,
  };
}

/** Score needed on one assessment; other ungraded work is assumed at the current grade. */
function onAssessment(
  data: AssistantWorkspace,
  course: Course,
  goal: Goal,
  name: string,
  language: string,
): Answer {
  const s = (en: string, fr: string) => say(language, en, fr);
  const href = `/courses/${course.id}`;
  const focus = matchingAssessment(data, course.id, name);
  if (!focus)
    return {
      text: s(
        `I couldn’t find “${name}” in ${course.code}. Which assessment do you mean?`,
        `Je n’ai pas trouvé « ${name} » dans ${course.code}. De quelle évaluation parles-tu ?`,
      ),
      href,
    };
  const { assessments, rules } = courseData(data, course);
  if (focus.status === 'GRADED')
    return {
      text:
        s(
          `${focus.name} is already graded in ${course.code}, so there’s nothing left to aim for on it. `,
          `${focus.name} est déjà corrigé en ${course.code} ; il n’y a donc plus d’objectif à viser dessus. `,
        ) + overall(data, course, goal, language).text,
      href,
    };
  const check = calculateTarget(assessments, goal.value, rules);
  if (check.status === 'invalid') return invalid(course, language, check.assumption);
  const summary = calculateGrades(assessments, rules);
  const others = assessments.filter((a) => a.id !== focus.id && a.status !== 'GRADED');
  const missing = Math.max(0, 100 - summary.configuredWeight);
  if ((others.length || missing > EPSILON) && summary.currentGrade === null)
    return overall(data, course, goal, language);
  const assumed = summary.currentGrade ?? 0;
  const finalAt = (percent: number) =>
    calculateGrades(
      assessments.map((a) =>
        a.status === 'GRADED'
          ? a
          : {
              ...a,
              status: 'GRADED' as const,
              score: (a.maxScore * (a.id === focus.id ? percent : assumed)) / 100,
            },
      ),
      rules,
    ).earnedPoints +
    (missing * assumed) / 100;
  const goalText = goal.letter ? `${goal.label} (${pct(goal.value, language)})` : goal.label;
  const assumption =
    others.length || missing > EPSILON
      ? s(
          ` This assumes you keep your current ${pct(assumed, language)} on the other remaining work.`,
          ` On suppose que tu gardes ton ${pct(assumed, language)} actuel sur les autres travaux restants.`,
        )
      : '';
  if (finalAt(0) >= goal.value - EPSILON)
    return {
      text:
        s(
          `You’d finish ${course.code} with at least ${goalText} even with zero on ${focus.name}.`,
          `Tu finirais ${course.code} avec au moins ${goalText} même avec zéro à ${focus.name}.`,
        ) + assumption,
      href,
    };
  if (finalAt(100) < goal.value - EPSILON)
    return {
      text:
        s(
          `Even 100% on ${focus.name} wouldn’t be enough for ${goalText} in ${course.code}.`,
          `Même 100 % à ${focus.name} ne suffirait pas pour obtenir ${goalText} en ${course.code}.`,
        ) +
        assumption +
        s(
          ` Doing better than that on the other remaining work could still change this.`,
          ` Faire mieux sur les autres travaux restants pourrait encore changer la donne.`,
        ),
      href,
    };
  let low = 0;
  let high = 100;
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2;
    if (finalAt(middle) >= goal.value - EPSILON) high = middle;
    else low = middle;
  }
  const needed = up(high);
  const raw =
    focus.maxScore !== 100
      ? s(
          ` (${fmt(up((needed * focus.maxScore) / 100), language)}/${fmt(focus.maxScore, language)})`,
          ` (${fmt(up((needed * focus.maxScore) / 100), language)}/${fmt(focus.maxScore, language)})`,
        )
      : '';
  return {
    text:
      s(
        `To finish ${course.code} with ${goalText}, you need at least ${pct(needed, language)}${raw} on ${focus.name}.`,
        `Pour terminer ${course.code} avec ${goalText}, il te faut au moins ${pct(needed, language)}${raw} à ${focus.name}.`,
      ) +
      assumption +
      (goal.letter ? scaleNote(profileFor(data), language) : ''),
    href,
  };
}

/** Read-only grade answers. Every number comes from the Grades page calculator, never the model. */
export function gradeStatusAnswer(
  data: AssistantWorkspace,
  intent: AssistantIntent,
  language: string,
  course?: Course,
): Answer {
  const requested = target(data, intent, language);
  if (!course) return overview(data, language);
  if (requested.unsupported) {
    const profile = profileFor(data);
    return {
      text: say(
        language,
        profile
          ? `“${requested.unsupported}” is not defined as a target in the ${profile.name} profile. What final percentage do you want to aim for in ${course.code}?`
          : `I don’t have a letter or pass scale for your school. What final percentage do you want to aim for in ${course.code}?`,
        profile
          ? `« ${requested.unsupported} » n’est pas défini comme objectif dans le profil de ${schoolName(profile, 'fr')}. Quel pourcentage final veux-tu viser en ${course.code} ?`
          : `Je n’ai pas de barème de lettres ou de réussite pour ton établissement. Quel pourcentage final veux-tu viser en ${course.code} ?`,
      ),
      href: `/courses/${course.id}`,
    };
  }
  if (!requested.goal) return current(data, course, language);
  if (intent.assessment)
    return onAssessment(data, course, requested.goal, intent.assessment, language);
  return overall(data, course, requested.goal, language);
}
