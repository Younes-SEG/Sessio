import { describe, expect, it } from 'vitest';
import { schools } from '../src/lib/schools';

describe('school catalogue integrity', () => {
  it('keeps stable unique slugs and complete source evidence', () => {
    // 29 Ontario schools verified on 2026-11-14 (see src/lib/schools/ontario.ts).
    expect(schools).toHaveLength(29);
    expect(schools.map((school) => school.id)).toEqual(
      expect.arrayContaining(['university-of-ottawa', 'university-of-toronto', 'college-la-cite']),
    );
    expect(new Set(schools.map((school) => school.id)).size).toBe(schools.length);
    for (const school of schools) {
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
    for (const school of schools) {
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
      if (school.credits) {
        expect(school.credits.unitLabel.trim()).not.toBe('');
        expect(school.credits.unitLabelFr.trim()).not.toBe('');
        expect(school.credits.defaultPerCourse).toBeGreaterThan(0);
        expect(school.credits.defaultPerCourse).toBeLessThanOrEqual(1000);
      }
    }
  });
});
