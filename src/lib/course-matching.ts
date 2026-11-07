/** Formatting differences such as SEG 3101 / seg-3101 do not identify a new class. */
export const courseCodeKey = (code: string) =>
  code
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s\-–—_.]/g, '');

type Term = { id: string; startDate: Date | string; endDate: Date | string };
export function matchingCourses<T extends { code: string; semesterId: string }>(
  courses: T[],
  terms: Term[],
  code: string,
  semesterId: string,
): T[] {
  const key = courseCodeKey(code);
  if (!key) return [];
  const sameCode = courses.filter((course) => courseCodeKey(course.code) === key);
  const exact = sameCode.filter((course) => course.semesterId === semesterId);
  if (exact.length) return exact;
  const term = terms.find((item) => item.id === semesterId);
  if (!term) return [];
  const day = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
  return sameCode.filter((course) =>
    terms.some(
      (candidate) =>
        candidate.id === course.semesterId &&
        day(candidate.startDate) === day(term.startDate) &&
        day(candidate.endDate) === day(term.endDate),
    ),
  );
}
