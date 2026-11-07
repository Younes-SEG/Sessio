import type { Assessment, AssessmentType } from './types';
import {
  configuredCourseWeight,
  gradingRuleError,
  resolveGradingRules,
  type GradingRule,
} from './grading-rules';

export interface GradeSummary {
  /** Weighted average on graded work only; null when no weighted work is graded. */
  currentGrade: number | null;
  /** Percentage points of the full course that have a valid recorded grade. */
  completedWeight: number;
  /** Percentage points earned toward the final course grade. */
  earnedPoints: number;
  remainingWeight: number;
  configuredWeight: number;
  warnings: string[];
}

export interface TargetResult extends GradeSummary {
  target: number;
  requiredAverage: number | null;
  status: 'possible' | 'impossible' | 'secured' | 'invalid';
  assumption: string;
  projection?: 'best-of';
}

const EPSILON = 0.000001;
const validWeight = (assessment: Assessment) =>
  Number.isFinite(assessment.weight) && assessment.weight >= 0;
const validGrade = (assessment: Assessment) =>
  assessment.score !== null &&
  Number.isFinite(assessment.score) &&
  assessment.score >= 0 &&
  Number.isFinite(assessment.maxScore) &&
  assessment.maxScore > 0;
const displayWeight = (value: number) => Number(value.toFixed(2));

export function ruleContributions(
  assessments: readonly Assessment[],
  rules: readonly GradingRule[] = [],
) {
  const result = new Map<
    string,
    { weight: number; counted: boolean; provisional: boolean; rule: GradingRule }
  >();
  for (const rule of resolveGradingRules(rules, assessments)) {
    const members = assessments.filter((a) => rule.assessmentIds.includes(a.id));
    const graded = members
      .filter((a) => a.status === 'GRADED' && validGrade(a))
      .sort((a, b) => b.score! / b.maxScore - a.score! / a.maxScore || a.id.localeCompare(b.id));
    const kept = new Set(graded.slice(0, rule.keep).map((a) => a.id));
    for (const member of members)
      result.set(member.id, {
        weight: kept.has(member.id) ? rule.weight / rule.keep : 0,
        counted: kept.has(member.id),
        provisional: graded.length < rule.assessmentIds.length,
        rule,
      });
  }
  return result;
}

export function calculateGrades(
  assessments: readonly Assessment[],
  rules: readonly GradingRule[] = [],
): GradeSummary {
  let configuredWeight = 0;
  let completedWeight = 0;
  let earnedPoints = 0;
  const warnings: string[] = [];
  const contributions = ruleContributions(assessments, rules);
  const ruleError = gradingRuleError(rules, assessments);
  if (rules.length && ruleError) warnings.push(ruleError);
  for (const rule of resolveGradingRules(rules, assessments)) {
    if (rule.mode === 'equal') {
      warnings.push(
        `${rule.name}: ${rule.weight}% shared equally across ${rule.assessmentIds.length} current assessments. Weights and averages adjust when assessments are added or removed. Ungraded work is not zero.`,
      );
      continue;
    }
    if (
      rule.assessmentIds.some(
        (id) => !assessments.some((a) => a.id === id && a.status === 'GRADED' && validGrade(a)),
      )
    )
      warnings.push(
        `${rule.name}: best ${rule.keep} of ${rule.assessmentIds.length}, ${rule.weight}% combined. Current grade uses the best recorded percentages so far; it can change as more scores arrive. Ungraded work is not zero.`,
      );
  }

  for (const assessment of assessments) {
    if (!validWeight(assessment)) {
      warnings.push(`“${assessment.name}” has an invalid weight and was excluded.`);
      continue;
    }
    configuredWeight += assessment.weight;
    if (assessment.status !== 'GRADED') continue;
    if (!validGrade(assessment)) {
      warnings.push(
        `“${assessment.name}” needs a valid score and maximum score before it counts as graded.`,
      );
      continue;
    }
    const effectiveWeight = contributions.get(assessment.id)?.weight ?? assessment.weight;
    completedWeight += effectiveWeight;
    earnedPoints += ((assessment.score as number) / assessment.maxScore) * effectiveWeight;
  }
  if (rules.length)
    configuredWeight = configuredCourseWeight(assessments.filter(validWeight), rules);

  if (configuredWeight < 100 - EPSILON) {
    warnings.push(
      `Assessment weights total ${displayWeight(configuredWeight)}%. Add the remaining ${displayWeight(100 - configuredWeight)}% for a complete course plan.`,
    );
  } else if (configuredWeight > 100 + EPSILON) {
    warnings.push(
      `Assessment weights total ${displayWeight(configuredWeight)}%, exceeding 100%. Correct the weights before using the target calculator.`,
    );
  }

  return {
    currentGrade: completedWeight > 0 ? (earnedPoints / completedWeight) * 100 : null,
    completedWeight,
    earnedPoints,
    remainingWeight: Math.max(0, 100 - completedWeight),
    configuredWeight,
    warnings,
  };
}

export function calculateTarget(
  assessments: readonly Assessment[],
  target: number,
  rules: readonly GradingRule[] = [],
): TargetResult {
  const summary = calculateGrades(assessments, rules);
  const missingWeight = Math.max(0, 100 - summary.configuredWeight);
  const assumption =
    missingWeight > EPSILON
      ? `Assumes the unconfigured ${displayWeight(missingWeight)}% will be assessed, bringing the course total to 100%. The required average applies to all ${displayWeight(summary.remainingWeight)}% remaining.`
      : rules.length
        ? 'Uses confirmed grading rules and the assessments currently known. Adding assessments to an equal-split category changes this projection.'
        : 'Assumes the course weights total 100% and remaining work can earn up to 100%, with no extra credit or dropped assessments.';
  const result = { ...summary, target, assumption };

  const ruleError = rules.length ? gradingRuleError(rules, assessments) : null;
  if (ruleError) {
    return {
      ...result,
      status: 'invalid',
      requiredAverage: null,
      assumption: ruleError,
    };
  }

  if (
    !Number.isFinite(target) ||
    target < 0 ||
    target > 100 ||
    summary.configuredWeight > 100 + EPSILON ||
    assessments.some(
      (assessment) =>
        !validWeight(assessment) || (assessment.status === 'GRADED' && !validGrade(assessment)),
    )
  ) {
    return { ...result, status: 'invalid', requiredAverage: null };
  }
  const unfinishedBestOf = rules.some(
    (rule) =>
      rule.mode !== 'equal' &&
      rule.assessmentIds.some(
        (id) => !assessments.some((a) => a.id === id && a.status === 'GRADED' && validGrade(a)),
      ),
  );
  if (unfinishedBestOf) {
    // Best-of contributions are nonlinear: future scores can replace recorded ones.
    // Solve an explicit equal-score scenario instead of treating missing grades as zero.
    const finalAt = (percentage: number) =>
      calculateGrades(
        assessments.map((a) =>
          a.status === 'GRADED'
            ? a
            : { ...a, status: 'GRADED', score: (a.maxScore * percentage) / 100 },
        ),
        rules,
      ).earnedPoints +
      (missingWeight * percentage) / 100;
    const projection = {
      ...result,
      projection: 'best-of' as const,
      assumption:
        'Assumes the same percentage on every remaining assessment, including unconfigured course weight. Best-of rules replace lower scores automatically. Different combinations of scores can also reach your target.',
    };
    if (finalAt(0) >= target - EPSILON)
      return { ...projection, status: 'secured', requiredAverage: 0 };
    if (finalAt(100) < target - EPSILON)
      return { ...projection, status: 'impossible', requiredAverage: null };
    let low = 0;
    let high = 100;
    for (let i = 0; i < 60; i++) {
      const middle = (low + high) / 2;
      if (finalAt(middle) >= target) high = middle;
      else low = middle;
    }
    return { ...projection, status: 'possible', requiredAverage: high };
  }
  if (summary.earnedPoints >= target - EPSILON) {
    return { ...result, status: 'secured', requiredAverage: 0 };
  }
  if (summary.remainingWeight <= EPSILON) {
    return { ...result, status: 'impossible', requiredAverage: null };
  }
  const requiredAverage = ((target - summary.earnedPoints) / summary.remainingWeight) * 100;
  return {
    ...result,
    requiredAverage,
    status: requiredAverage > 100 + EPSILON ? 'impossible' : 'possible',
  };
}

/** Category average uses recorded contributions, including only scores currently kept by a rule. */
export function currentCategoryGrade(
  assessments: readonly Assessment[],
  type: AssessmentType,
  rules: readonly GradingRule[] = [],
) {
  const contributions = ruleContributions(assessments, rules);
  let earned = 0;
  let weight = 0;
  for (const a of assessments) {
    if (a.type !== type || a.status !== 'GRADED' || !validGrade(a) || !validWeight(a)) continue;
    const contribution = contributions.get(a.id)?.weight ?? a.weight;
    earned += (a.score! / a.maxScore) * contribution;
    weight += contribution;
  }
  return weight > 0 ? (earned / weight) * 100 : null;
}
