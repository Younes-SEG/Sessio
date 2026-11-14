import { describe, expect, it } from 'vitest';
import { schools, searchSchools, type SchoolProfile } from '../src/lib/schools';

const all = schools as readonly SchoolProfile[];
const ids = (query: string) => searchSchools(query, all).results.map((school) => school.id);

describe('school search', () => {
  it('shows nothing until the student types', () => {
    expect(searchSchools('', all)).toEqual({ results: [], approximate: false });
    expect(searchSchools('   ', all).results).toEqual([]);
  });

  it('ranks the best match first and caps the list', () => {
    expect(ids('university of toronto')[0]).toBe('university-of-toronto');
    expect(ids('toronto')).toEqual(
      expect.arrayContaining(['university-of-toronto', 'toronto-metropolitan-university']),
    );
    expect(searchSchools('university', all).results.length).toBeLessThanOrEqual(6);
  });

  it('understands common short forms', () => {
    expect(ids('uoft')[0]).toBe('university-of-toronto');
    expect(ids('uOttawa')[0]).toBe('university-of-ottawa');
    expect(ids('TMU')[0]).toBe('toronto-metropolitan-university');
    expect(ids('ryerson')[0]).toBe('toronto-metropolitan-university');
    expect(ids('mac')[0]).toBe('mcmaster-university');
    expect(ids("queen's")[0]).toBe('queens-university');
  });

  it('ignores accents and punctuation', () => {
    expect(ids('la cite')[0]).toBe('college-la-cite');
    expect(ids('universite de l ontario')[0]).toBe('universite-de-l-ontario-francais');
  });

  it('falls back to closest matches for small typos, flagged as approximate', () => {
    const typo = searchSchools('toronot', all);
    expect(typo.approximate).toBe(true);
    expect(typo.results.map((school) => school.id)).toContain('university-of-toronto');
    expect(searchSchools('waterlo', all).results[0].id).toBe('university-of-waterloo');
    expect(searchSchools('zzzz unknown', all).results).toEqual([]);
  });
});
