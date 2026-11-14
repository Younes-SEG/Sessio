import { describe, expect, it } from 'vitest';
import { letterFor, minimumFor, passMinimum, pointsFor } from '../src/lib/grade-scale';
import { schoolById, type SchoolProfile } from '../src/lib/schools';

const uottawa = schoolById('university-of-ottawa')!;

// Shape of Collège La Cité's PED-01-11 scale: letters stop at D- (50-53), the default pass
// mark is 60% (C-) and anything below the pass mark is recorded as EC.
const laCiteLike: SchoolProfile = {
  ...uottawa,
  id: 'test-la-cite-like',
  letterScale: [
    { letter: 'A+', min: 90, points: 4.3 },
    { letter: 'B', min: 74, points: 3 },
    { letter: 'C-', min: 60, points: 1.7 },
    { letter: 'D-', min: 50, points: 0.7 },
  ],
  roundPercentBeforeLetter: false,
  failLabel: 'EC',
  gpa: { max: 4.3, label: 'MPC' },
  passPercent: 60,
};

describe('uOttawa grading follows Academic Regulation A-3', () => {
  it('rounds the final course grade half up before assigning a letter', () => {
    expect(letterFor(69.5, uottawa)).toBe('B');
    expect(letterFor(69.4, uottawa)).toBe('C+');
    expect(letterFor(84.5, uottawa)).toBe('A');
  });

  it('keeps E as a real failing letter instead of replacing it with F', () => {
    expect(letterFor(45, uottawa)).toBe('E');
    expect(pointsFor(45, uottawa)).toBe(1);
    expect(letterFor(39.4, uottawa)).toBe('F');
    expect(letterFor(39.5, uottawa)).toBe('E');
  });

  it('applies rounding to the pass mark too', () => {
    expect(letterFor(49.5, uottawa)).toBe('D');
    expect(letterFor(49.4, uottawa)).toBe('E');
    expect(passMinimum(uottawa)).toBe(49.5);
  });

  it('turns letter targets into the lowest qualifying unrounded percentage', () => {
    expect(minimumFor('B', uottawa)).toEqual({ letter: 'B', min: 69.5, published: 70 });
    expect(minimumFor('A+', uottawa)).toEqual({ letter: 'A+', min: 89.5, published: 90 });
    expect(minimumFor('D', uottawa)).toEqual({ letter: 'D', min: 49.5, published: 50 });
    expect(minimumFor('E', uottawa)).toEqual({ letter: 'E', min: 39.5, published: 40 });
  });
});

describe('verified Ontario profiles match their published tables', () => {
  const school = (id: string) => schoolById(id)!;
  it('handles unusual cut-offs', () => {
    expect(letterFor(93, school('royal-military-college-of-canada'))).toBe('A');
    expect(letterFor(94, school('royal-military-college-of-canada'))).toBe('A+');
    expect(letterFor(93.9, school('lambton-college'))).toBe('A');
    expect(letterFor(86, school('george-brown-polytechnic'))).toBe('A');
    expect(letterFor(85.9, school('george-brown-polytechnic'))).toBe('A-');
    expect(letterFor(67, school('durham-college'))).toBe('B-');
    expect(pointsFor(95, school('durham-college'))).toBe(5);
    expect(letterFor(80, school('seneca-polytechnic'))).toBe('A');
    expect(letterFor(62, school('ontario-tech-university'))).toBe('C');
  });
  it('applies documented rounding only where the policy says so', () => {
    expect(letterFor(79.5, school('algonquin-college'))).toBe('A-');
    expect(letterFor(49.5, school('toronto-metropolitan-university'))).toBe('D-');
    expect(letterFor(89.95, school('queens-university'))).toBe('A');
    expect(letterFor(72.9, school('university-of-toronto'))).toBe('B-');
  });
  it('uses each school pass mark and fail label', () => {
    expect(letterFor(54, school('conestoga-college'))).toBe('F');
    expect(letterFor(55, school('conestoga-college'))).toBe('D');
    expect(letterFor(59, school('college-la-cite'))).toBe('EC');
    expect(letterFor(60, school('college-la-cite'))).toBe('C-');
    expect(letterFor(45, school('york-university'))).toBe('E');
    expect(passMinimum(school('college-la-cite'))).toBe(60);
  });
  it('gives no letters for percentage-only schools', () => {
    expect(letterFor(85, school('university-of-waterloo'))).toBeNull();
    expect(letterFor(85, school('mohawk-college'))).toBeNull();
  });
});

describe('schools whose fail label is not a letter', () => {
  it('replaces passing letters below the pass mark with the fail label', () => {
    expect(letterFor(55, laCiteLike)).toBe('EC');
    expect(pointsFor(55, laCiteLike)).toBe(0);
    expect(letterFor(30, laCiteLike)).toBe('EC');
    expect(letterFor(60, laCiteLike)).toBe('C-');
  });

  it('never sets a target below the pass mark for a passing letter', () => {
    expect(minimumFor('D-', laCiteLike)).toEqual({ letter: 'D-', min: 60, published: 60 });
    expect(passMinimum(laCiteLike)).toBe(60);
  });
});
