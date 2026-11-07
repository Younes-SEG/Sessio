import { expect, it } from 'vitest';
import { matchingCourses } from '../src/lib/course-matching';

const terms = [
  { id: 'fall', startDate: '2026-09-01', endDate: '2026-12-31' },
  { id: 'duplicate', startDate: '2026-09-01', endDate: '2026-12-31' },
  { id: 'retake', startDate: '2027-09-01', endDate: '2027-12-31' },
];
const course = { id: 'real', code: 'SEG3101', semesterId: 'fall' };

it('recognizes course code formatting without merging different classes or terms', () => {
  for (const code of ['seg 3101', 'SEG-3101', 'SEG–3101', 'SEG_3101'])
    expect(matchingCourses([course], terms, code, 'fall')).toEqual([course]);
  expect(matchingCourses([course], terms, 'SEG3102', 'fall')).toEqual([]);
  expect(matchingCourses([course], terms, 'SEG3101A', 'fall')).toEqual([]);
  expect(matchingCourses([course], terms, 'SEG3101', 'retake')).toEqual([]);
});

it('finds duplicate term records but prefers a course in the selected term', () => {
  const sample = { ...course, id: 'sample', semesterId: 'duplicate' };
  expect(matchingCourses([course], terms, 'SEG3101', 'duplicate')).toEqual([course]);
  expect(matchingCourses([sample, course], terms, 'SEG3101', 'fall')).toEqual([course]);
  expect(
    matchingCourses([sample, { ...sample, id: 'ambiguous' }], terms, 'SEG3101', 'fall'),
  ).toHaveLength(2);
});
