import { calculateGrades, calculateTarget } from './grades';
import { readGradingRules } from './grading-rules';
import { letterFor, minimumFor, passMinimum } from './grade-scale';
import { gradeAssistantFrench } from './i18n/fr';
import { semesterStanding } from './semester-standing';
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
type Goal = { value: number; label: string; letter: boolean; shown?: number };

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

function profileFor(data: AssistantWorkspace) {
  return schoolById(data.settings?.schoolId);
}

function gradeSuffix(percent: number, profile: SchoolProfile | null) {
  const letter = letterFor(percent, profile);
  return letter ? ` (${letter})` : '';
}

function weightUnit(profile: SchoolProfile, language: string) {
  return language === 'fr' ? profile.credits?.unitLabelFr : profile.credits?.unitLabel;
}

function scaleNote(profile: SchoolProfile | null, language: string) {
  if (!profile?.letterScale) return '';
  if (profile.lettersAreGuidelines)
    return say(
      language,
      ` The ${profile.name} letter conversions are guidelines; the instructor decides, so this result is an estimate.`,
      gradeAssistantFrench.guidelineNote(schoolName(profile, 'fr')),
    );
  return say(
    language,
    ` Letters use the ${profile.name} profile; your course outline is the final word.`,
    ` Les lettres suivent le profil de ${schoolName(profile, 'fr')} ; votre plan de cours a le dernier mot.`,
  );
}

function passRulesNote(profile: SchoolProfile | null, language: string) {
  if (!profile?.passRules?.length || profile.passPercent === null) return '';
  const variants = profile.passRules
    .map((rule) => {
      const label = language === 'fr' ? rule.labelFr : rule.label;
      const separator = language === 'fr' ? ' : ' : ': ';
      return `${label}${separator}${pct(rule.passPercent, language)}`;
    })
    .join('; ');
  return say(
    language,
    ` The default pass mark is ${pct(profile.passPercent, language)}. Program/course variants: ${variants}. Check which one applies; Sessio does not guess.`,
    gradeAssistantFrench.passRulesNote(pct(profile.passPercent, language), variants),
  );
}

function target(intent: AssistantIntent, language: string, profile: SchoolProfile | null) {
  if (intent.targetLetter) {
    const grade = minimumFor(intent.targetLetter, profile);
    return grade
      ? {
          goal: {
            value: grade.min,
            shown: grade.published,
            label: grade.letter,
            letter: true,
          } satisfies Goal,
        }
      : { goal: null, unsupported: intent.targetLetter };
  }
  if (intent.targetPass) {
    return profile?.passPercent !== null && profile?.passPercent !== undefined
      ? {
          goal: {
            value: passMinimum(profile)!,
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

function overview(
  data: AssistantWorkspace,
  language: string,
  profile: SchoolProfile | null,
): Answer {
  const s = (en: string, fr: string) => say(language, en, fr);
  const standing = semesterStanding(data, profile);
  const { rows, credits, basis, floorApplied } = standing;
  if (standing.average === null)
    return {
      text: s(
        'You don’t have any recorded grades in your current courses yet, so there’s no average to show.',
        'Vous n’avez encore aucune note enregistrée dans vos cours actuels, donc pas de moyenne à afficher.',
      ),
      href: '/grades',
    };
  const average = standing.average;
  const gpa = standing.gpa;
  const weighted = basis === 'weighted';
  let explanation: string;
  if (weighted) {
    const unit = weightUnit(profile!, language)!;
    explanation = s(
      `This ${unit}-weighted result uses ${standing.graded} course${standing.graded === 1 ? '' : 's'} with recorded grades and ${fmt(credits, language)} total ${unit}. Every course grade is based only on work graded so far.`,
      `Ce résultat pondéré selon les ${unit} utilise ${standing.graded} cours notés et ${fmt(credits, language)} ${unit} au total. Chaque note de cours repose seulement sur les travaux déjà corrigés.`,
    );
  } else if (!profile)
    explanation = s(
      'Each course counts equally because no school profile is selected. Percentages are shown without guessing a letter or GPA scale, and each course grade is based only on work graded so far.',
      'Chaque cours compte également, car aucun profil d’établissement n’est sélectionné. Les pourcentages sont affichés sans supposer de barème, et chaque note repose seulement sur les travaux déjà corrigés.',
    );
  else if (!profile.gpa)
    explanation = s(
      `Each course counts equally because the ${profile.name} profile does not define a GPA scale. Each course grade is based only on work graded so far.`,
      `Chaque cours compte également, car le profil de ${schoolName(profile, 'fr')} ne définit pas d’échelle de MPC. Chaque note repose seulement sur les travaux déjà corrigés.`,
    );
  else if (!profile.credits)
    explanation = s(
      `Each course counts equally because the ${profile.name} profile does not define a course-weight unit. Each course grade is based only on work graded so far.`,
      `Chaque cours compte également, car le profil de ${schoolName(profile, 'fr')} ne définit pas d’unité de pondération. Chaque note repose seulement sur les travaux déjà corrigés.`,
    );
  else if (basis === 'missing-credits')
    explanation = s(
      `Each course counts equally because one or more graded courses is missing its ${weightUnit(profile, 'en') ?? 'course weight'}. Each course grade is based only on work graded so far.`,
      `Chaque cours compte également, car il manque les ${weightUnit(profile, 'fr') ?? 'pondérations'} d’au moins un cours noté. Chaque note repose seulement sur les travaux déjà corrigés.`,
    );
  else
    explanation = s(
      `Each course counts equally because the ${profile.name} profile does not provide grade points for every letter. Each course grade is based only on work graded so far.`,
      `Chaque cours compte également, car le profil de ${schoolName(profile, 'fr')} ne fournit pas de points pour chaque lettre. Chaque note repose seulement sur les travaux déjà corrigés.`,
    );
  const floorNote = floorApplied
    ? say(
        language,
        ` For this overview only, course grades below ${pct(profile!.averageFloor!, language)} count as ${pct(profile!.averageFloor!, language)}; individual course grades do not change.`,
        gradeAssistantFrench.averageFloorNote(pct(profile!.averageFloor!, language)),
      )
    : '';
  const overviewGuidelineNote = profile?.lettersAreGuidelines ? scaleNote(profile, language) : '';
  return {
    text:
      (weighted
        ? s(
            `Your ${weightUnit(profile!, 'en')}-weighted semester average is ${pct(average, language)}${gradeSuffix(average, profile)}, with an estimated ${profile!.gpa!.label} of ${fmt(gpa!, language)}/${fmt(profile!.gpa!.max, language)}. `,
            `Votre moyenne de session pondérée selon les ${weightUnit(profile!, 'fr')} est de ${pct(average, language)}${gradeSuffix(average, profile)}, avec une ${profile!.gpa!.label} estimée de ${fmt(gpa!, language)}/${fmt(profile!.gpa!.max, language)}. `,
          )
        : s(
            `Your equal-weight average across ${standing.graded} course${standing.graded === 1 ? '' : 's'} with grades is ${pct(average, language)}${gradeSuffix(average, profile)}. `,
            `Votre moyenne non pondérée sur ${standing.graded} cours notés est de ${pct(average, language)}${gradeSuffix(average, profile)}. `,
          )) +
      explanation +
      floorNote +
      overviewGuidelineNote,
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

function current(
  data: AssistantWorkspace,
  course: Course,
  language: string,
  profile: SchoolProfile | null,
): Answer {
  const s = (en: string, fr: string) => say(language, en, fr);
  const { assessments, rules } = courseData(data, course);
  const summary = calculateGrades(assessments, rules);
  if (summary.currentGrade === null)
    return {
      text: s(
        `${course.code} has no recorded grades yet. Once a weighted assessment is graded, I can work out your standing.`,
        `${course.code} n’a encore aucune note enregistrée. Dès qu’une évaluation pondérée est corrigée, je peux calculer où vous en êtes.`,
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
        `Vous avez ${pct(summary.currentGrade, language)}${gradeSuffix(summary.currentGrade, profile)} en ${course.code}, selon les ${pct(summary.completedWeight, language)} du cours déjà corrigés. Vous avez obtenu ${fmt(summary.earnedPoints, language)} points sur 100, et il reste ${pct(summary.remainingWeight, language)} du cours.`,
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
      `Je ne peux pas encore calculer d’objectif fiable pour ${course.code}.${reason ? ` ${reason}` : ''} Vérifiez les pondérations et les notes sur la page du cours.`,
    ),
    href: `/courses/${course.id}`,
  };
}

/** Required average across everything still ungraded (the Grades page calculation). */
function overall(data: AssistantWorkspace, course: Course, goal: Goal, language: string): Answer {
  const s = (en: string, fr: string) => say(language, en, fr);
  const { assessments, rules } = courseData(data, course);
  const result = calculateTarget(assessments, goal.value, rules);
  const goalText = goal.letter
    ? `${goal.label} (${pct(goal.shown ?? goal.value, language)})`
    : goal.label;
  const href = `/courses/${course.id}`;
  if (result.status === 'invalid') return invalid(course, language, result.assumption);
  if (result.status === 'secured')
    return {
      text: s(
        `Good news: you’ve already secured ${goalText} in ${course.code}. Even with zero on everything left, you’d finish at or above it.`,
        `Bonne nouvelle : vous avez déjà obtenu ${goalText} en ${course.code}. Même avec zéro sur ce qui reste, vous finiriez au-dessus.`,
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
    text: s(
      `To finish ${course.code} with ${goalText}, you need an average of ${pct(up(result.requiredAverage!), language)} on the remaining ${pct(result.remainingWeight, language)} of the course. ${result.assumption}`,
      `Pour terminer ${course.code} avec ${goalText}, il vous faut une moyenne de ${pct(up(result.requiredAverage!), language)} sur les ${pct(result.remainingWeight, language)} du cours qui restent. ${result.assumption}`,
    ),
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
        `Je n’ai pas trouvé « ${name} » dans ${course.code}. De quelle évaluation parlez-vous ?`,
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
  const goalText = goal.letter
    ? `${goal.label} (${pct(goal.shown ?? goal.value, language)})`
    : goal.label;
  const assumption =
    others.length || missing > EPSILON
      ? s(
          ` This assumes you keep your current ${pct(assumed, language)} on the other remaining work.`,
          ` On suppose que vous gardez votre ${pct(assumed, language)} actuel sur les autres travaux restants.`,
        )
      : '';
  if (finalAt(0) >= goal.value - EPSILON)
    return {
      text:
        s(
          `You’d finish ${course.code} with at least ${goalText} even with zero on ${focus.name}.`,
          `Vous finiriez ${course.code} avec au moins ${goalText} même avec zéro à ${focus.name}.`,
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
        `Pour terminer ${course.code} avec ${goalText}, il vous faut au moins ${pct(needed, language)}${raw} à ${focus.name}.`,
      ) + assumption,
    href,
  };
}

/** Read-only grade answers. Every number comes from the Grades page calculator, never the model. */
export function gradeStatusAnswer(
  data: AssistantWorkspace,
  intent: AssistantIntent,
  language: string,
  course?: Course,
  profileOverride?: SchoolProfile | null,
): Answer {
  const profile = profileOverride === undefined ? profileFor(data) : profileOverride;
  const requested = target(intent, language, profile);
  if (!course) return overview(data, language, profile);
  if (requested.unsupported) {
    return {
      text: say(
        language,
        profile
          ? `“${requested.unsupported}” is not defined as a target in the ${profile.name} profile. What final percentage do you want to aim for in ${course.code}?`
          : `I don’t have a letter or pass scale for your school. What final percentage do you want to aim for in ${course.code}?`,
        profile
          ? `« ${requested.unsupported} » n’est pas défini comme objectif dans le profil de ${schoolName(profile, 'fr')}. Quel pourcentage final voulez-vous viser en ${course.code} ?`
          : `Je n’ai pas de barème de lettres ou de réussite pour votre établissement. Quel pourcentage final voulez-vous viser en ${course.code} ?`,
      ),
      href: `/courses/${course.id}`,
    };
  }
  if (!requested.goal) return current(data, course, language, profile);
  const answer = intent.assessment
    ? onAssessment(data, course, requested.goal, intent.assessment, language)
    : overall(data, course, requested.goal, language);
  return {
    ...answer,
    text:
      answer.text +
      (requested.goal.letter ? scaleNote(profile, language) : '') +
      (intent.targetPass ? passRulesNote(profile, language) : ''),
  };
}
