import { french } from './fr';

/** French for the dynamic warnings built in `src/lib/grades.ts`; keep the patterns in sync. */
const patterns: [RegExp, (...parts: string[]) => string][] = [
  [
    /^Assessment weights total ([\d.]+)%\. Add the remaining ([\d.]+)% for a complete course plan\.$/,
    (total, remaining) =>
      `Les pondérations des évaluations totalisent ${total} %. Ajoutez les ${remaining} % restants pour un plan de cours complet.`,
  ],
  [
    /^Assessment weights total ([\d.]+)%, exceeding 100%\. Correct the weights before using the target calculator\.$/,
    (total) =>
      `Les pondérations des évaluations totalisent ${total} %, soit plus de 100 %. Corrigez-les avant d’utiliser le calculateur de note visée.`,
  ],
  [
    /^([\s\S]+): ([\d.]+)% shared equally across (\d+) current assessments\. Weights and averages adjust when assessments are added or removed\. Ungraded work is not zero\.$/,
    (name, weight, count) =>
      `${name} : ${weight} % répartis également entre ${count} évaluations actuelles. Les pondérations et moyennes s’ajustent quand des évaluations sont ajoutées ou retirées. Un travail non noté ne compte pas comme zéro.`,
  ],
  [
    /^([\s\S]+): best (\d+) of (\d+), ([\d.]+)% combined\. Current grade uses the best recorded percentages so far; it can change as more scores arrive\. Ungraded work is not zero\.$/,
    (name, keep, count, weight) =>
      `${name} : les ${keep} meilleurs sur ${count}, ${weight} % au total. La note actuelle utilise les meilleurs pourcentages enregistrés jusqu’ici; elle peut changer quand d’autres notes arrivent. Un travail non noté ne compte pas comme zéro.`,
  ],
  [
    /^“([\s\S]+)” has an invalid weight and was excluded\.$/,
    (name) => `« ${name} » a une pondération invalide et a été exclue.`,
  ],
  [
    /^“([\s\S]+)” needs a valid score and maximum score before it counts as graded\.$/,
    (name) =>
      `« ${name} » doit avoir une note et une note maximale valides avant d’être comptée comme notée.`,
  ],
];

export function translateGradeWarning(warning: string, language: 'en' | 'fr'): string {
  if (language !== 'fr') return warning;
  for (const [pattern, render] of patterns) {
    const match = pattern.exec(warning);
    if (match) return render(...match.slice(1));
  }
  return french[warning] ?? warning;
}
