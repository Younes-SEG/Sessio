import type { SchoolProfile } from './types';

/** Common short forms students actually type. Matching ignores case, accents and punctuation. */
const ALIASES: Record<string, readonly string[]> = {
  'university-of-ottawa': ['uottawa', 'uo', 'udo', 'ottawa u'],
  'university-of-toronto': ['uoft', 'utoronto', 'uot', 'u of t'],
  'york-university': ['yorku'],
  'mcmaster-university': ['mac', 'mcmaster'],
  'university-of-waterloo': ['uw', 'uwaterloo'],
  'western-university': ['uwo', 'western ontario'],
  'toronto-metropolitan-university': ['tmu', 'ryerson', 'torontomu'],
  'queens-university': ['queens', 'queensu'],
  'wilfrid-laurier-university': ['wlu', 'laurier'],
  'ontario-tech-university': ['uoit', 'ontariotech'],
  'university-of-guelph': ['uog', 'uoguelph'],
  'laurentian-university': ['laurentienne'],
  'trent-university': ['trentu'],
  'universite-de-l-ontario-francais': ['uof', 'uontario'],
  'ocad-university': ['ocad', 'ocadu'],
  'royal-military-college-of-canada': ['rmc', 'cmr', 'rmcc'],
  'college-la-cite': ['la cite', 'cite'],
  'george-brown-polytechnic': ['gbc', 'george brown college'],
  'st-clair-college': ['saint clair', 'st clair'],
};

export const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const compact = (value: string) => value.replace(/ /g, '');

/** Optimal string alignment distance, capped for speed: small typos only. */
function editDistance(a: string, b: string, cap: number) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  let beforePrevious: number[] = [];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        row[j] = Math.min(row[j], beforePrevious[j - 2] + 1);
    }
    beforePrevious = previous;
    previous = row;
  }
  return previous[b.length];
}

/** A query word "nearly" matches a name word when a short typo separates them. */
function nearlyMatches(token: string, word: string) {
  if (token.length < 4) return false;
  const cap = token.length >= 7 ? 2 : 1;
  return (
    editDistance(token, word, cap) <= cap ||
    editDistance(token, word.slice(0, token.length), cap) <= cap
  );
}

export type SchoolSearch = { results: SchoolProfile[]; approximate: boolean };

/**
 * Best matches first. Exact and prefix matches win; only when nothing matches directly
 * does it fall back to typo-tolerant "closest" results, flagged as approximate.
 */
export function searchSchools(
  query: string,
  catalogue: readonly SchoolProfile[],
  limit = 6,
): SchoolSearch {
  const q = normalizeSearch(query);
  if (!q) return { results: [], approximate: false };
  const tokens = q.split(' ');
  const scored = catalogue.map((school) => {
    const names = [school.name, school.nameFr ?? ''].map(normalizeSearch).filter(Boolean);
    const words = names.flatMap((name) => name.split(' '));
    const aliases = (ALIASES[school.id] ?? []).map(normalizeSearch);
    let score = 0;
    if (aliases.some((alias) => compact(alias) === compact(q))) score = 100;
    else if (names.some((name) => name.startsWith(q))) score = 90;
    else if (aliases.some((alias) => q.length >= 2 && compact(alias).startsWith(compact(q))))
      score = 75;
    else if (tokens.every((token) => words.some((word) => word.startsWith(token)))) score = 60;
    else if (names.some((name) => name.includes(q))) score = 40;
    else if (normalizeSearch(school.province).startsWith(q)) score = 10;
    const typo =
      score === 0 &&
      tokens.every(
        (token) =>
          words.some((word) => word.startsWith(token) || nearlyMatches(token, word)) ||
          aliases.some((alias) => nearlyMatches(token, compact(alias))),
      ) &&
      tokens.some((token) => token.length >= 4);
    return { school, score, typo };
  });
  const byRank = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    b.score - a.score || a.school.name.localeCompare(b.school.name);
  const direct = scored.filter((entry) => entry.score > 0).sort(byRank);
  if (direct.length)
    return { results: direct.slice(0, limit).map((entry) => entry.school), approximate: false };
  const closest = scored.filter((entry) => entry.typo).sort(byRank);
  return { results: closest.slice(0, limit).map((entry) => entry.school), approximate: true };
}
