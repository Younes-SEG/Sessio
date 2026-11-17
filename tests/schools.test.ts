import { describe, expect, it } from 'vitest';
import { schools, type SchoolProfile } from '../src/lib/schools';

describe('school catalogue integrity', () => {
  it('keeps stable unique slugs and complete source evidence', () => {
    // 43 Ontario schools: 37 verified on 2026-11-14; Brock, Confederation, Northern, Nipissing,
    // St. Lawrence and Fleming on 2026-11-16.
    expect(schools).toHaveLength(43);
    expect(schools.map((school) => school.id)).toEqual(
      expect.arrayContaining(['university-of-ottawa', 'university-of-toronto', 'college-la-cite']),
    );
    expect(new Set(schools.map((school) => school.id)).size).toBe(schools.length);
    for (const entry of schools) {
      const school: SchoolProfile = entry;
      expect(school.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(school.name.trim()).not.toBe('');
      expect(school.province.trim()).not.toBe('');
      expect(typeof school.roundPercentBeforeLetter).toBe('boolean');
      expect(school.failLabel.trim()).not.toBe('');
      expect(school.sources.length).toBeGreaterThan(0);
      for (const source of school.sources) {
        expect(() => new URL(source.url)).not.toThrow();
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.title.trim()).not.toBe('');
        expect(source.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(`${source.checked}T00:00:00.000Z`).toISOString().slice(0, 10)).toBe(
          source.checked,
        );
      }
    }
  });

  it('keeps scales ordered and numeric settings sensible', () => {
    for (const entry of schools) {
      const school: SchoolProfile = entry;
      if (school.letterScale) {
        expect(school.letterScale.length).toBeGreaterThan(1);
        expect(new Set(school.letterScale.map((grade) => grade.letter)).size).toBe(
          school.letterScale.length,
        );
        for (const [index, grade] of school.letterScale.entries()) {
          expect(grade.letter.trim()).not.toBe('');
          expect(grade.min).toBeGreaterThanOrEqual(0);
          expect(grade.min).toBeLessThanOrEqual(100);
          if (index) expect(grade.min).toBeLessThan(school.letterScale[index - 1].min);
          if (grade.points !== undefined) {
            expect(grade.points).toBeGreaterThanOrEqual(0);
            expect(grade.points).toBeLessThanOrEqual(school.gpa?.max ?? grade.points);
          }
        }
        // A scale may stop above 0% only when a separate fail label (e.g. EC) covers the rest.
        const failLetterInScale = school.letterScale.some(
          (grade) => grade.letter === school.failLabel,
        );
        if (failLetterInScale) expect(school.letterScale.at(-1)?.min).toBe(0);
        else expect(school.passPercent).not.toBeNull();
      }
      if (school.gpa) {
        expect(school.gpa.max).toBeGreaterThan(0);
        expect(school.gpa.max).toBeLessThanOrEqual(100);
        expect(school.gpa.label.trim()).not.toBe('');
      }
      if (school.passPercent !== null) {
        expect(school.passPercent).toBeGreaterThanOrEqual(0);
        expect(school.passPercent).toBeLessThanOrEqual(100);
      }
      if (school.passRules) {
        expect(school.passRules.length).toBeGreaterThan(0);
        expect(new Set(school.passRules.map((rule) => rule.label)).size).toBe(
          school.passRules.length,
        );
        for (const rule of school.passRules) {
          expect(rule.label.trim()).not.toBe('');
          expect(rule.labelFr.trim()).not.toBe('');
          expect(rule.passPercent).toBeGreaterThanOrEqual(0);
          expect(rule.passPercent).toBeLessThanOrEqual(100);
        }
      }
      if (school.averageFloor !== undefined) {
        expect(school.averageFloor).toBeGreaterThanOrEqual(0);
        expect(school.averageFloor).toBeLessThanOrEqual(100);
      }
      if (school.repeatPolicy !== undefined) {
        expect(['highest', 'latest', 'all']).toContain(school.repeatPolicy);
      }
      if (school.lettersAreGuidelines !== undefined) {
        expect(typeof school.lettersAreGuidelines).toBe('boolean');
        expect(school.letterScale).not.toBeNull();
      }
      if (school.credits) {
        expect(school.credits.unitLabel.trim()).not.toBe('');
        expect(school.credits.unitLabelFr.trim()).not.toBe('');
        expect(school.credits.defaultPerCourse).toBeGreaterThan(0);
        expect(school.credits.defaultPerCourse).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('stores the verified rule extensions on the intended profiles', () => {
    const byId = (id: string): SchoolProfile | undefined =>
      schools.find((school) => school.id === id);
    expect(byId('university-of-waterloo')?.averageFloor).toBe(32);
    expect(byId('western-university')?.averageFloor).toBe(40);
    expect(byId('ocad-university')?.averageFloor).toBe(45);
    expect(byId('york-university')?.lettersAreGuidelines).toBe(true);
    expect(byId('ontario-tech-university')?.lettersAreGuidelines).toBe(true);
    expect(byId('wilfrid-laurier-university')?.lettersAreGuidelines).toBe(true);
    expect(byId('conestoga-college')?.repeatPolicy).toBe('latest');
    expect(byId('algonquin-college')?.repeatPolicy).toBe('highest');
    expect(byId('college-la-cite')?.repeatPolicy).toBe('highest');
    expect(byId('sheridan-college')?.repeatPolicy).toBe('highest');
    expect(byId('fanshawe-college')?.repeatPolicy).toBe('highest');
    expect(byId('durham-college')?.repeatPolicy).toBe('highest');
    expect(byId('loyalist-college')?.repeatPolicy).toBe('highest');
    expect(byId('university-of-ottawa')?.passRules).toHaveLength(2);
    expect(byId('queens-university')?.passRules).toHaveLength(1);
    expect(byId('universite-de-l-ontario-francais')?.passRules).toHaveLength(2);
    expect(byId('conestoga-college')?.passRules).toHaveLength(4);
    expect(byId('georgian-college')?.averageFloor).toBe(49);
    expect(byId('lakehead-university')?.repeatPolicy).toBe('latest');
    expect(byId('university-of-windsor')?.repeatPolicy).toBe('highest');
    expect(byId('cambrian-college')?.repeatPolicy).toBe('highest');
    expect(byId('college-boreal')?.repeatPolicy).toBe('latest');
    expect(byId('college-boreal')?.passPercent).toBe(50);
    expect(byId('st-clair-college')?.repeatPolicy).toBe('latest');
    expect(byId('mohawk-college')?.passRules).toHaveLength(4);
  });

  it('keeps the newly verified scales exact', () => {
    const byId = (id: string): SchoolProfile | undefined =>
      schools.find((school) => school.id === id);
    const minOf = (id: string, letter: string) =>
      byId(id)?.letterScale?.find((grade) => grade.letter === letter)?.min;
    const pointsOf = (id: string, letter: string) =>
      byId(id)?.letterScale?.find((grade) => grade.letter === letter)?.points;
    expect(byId('carleton-university')?.gpa?.max).toBe(12);
    expect(pointsOf('carleton-university', 'C-')).toBe(4);
    expect(minOf('lakehead-university', 'E')).toBe(40);
    expect(minOf('canadore-college', 'C+')).toBe(65);
    expect(pointsOf('college-boreal', 'A')).toBe(3.5);
    expect(byId('college-boreal')?.failLabel).toBe('EC');
    expect(byId('humber-polytechnic')?.letterScale).toBeNull();
    // Brock, read directly from the 2026-2027 calendar on 2026-11-16.
    expect(byId('brock-university')?.letterScale?.map((g) => [g.letter, g.min])).toEqual([
      ['A+', 90],
      ['A', 80],
      ['B', 70],
      ['C', 60],
      ['D', 50],
      ['F', 0],
    ]);
    expect(byId('brock-university')?.averageFloor).toBe(45);
    expect(byId('brock-university')?.repeatPolicy).toBe('latest');
    expect(byId('brock-university')?.passPercent).toBe(50);
  });
});
