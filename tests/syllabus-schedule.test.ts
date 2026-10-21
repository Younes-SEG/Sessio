import { describe, expect, it } from 'vitest';
import { sessionDateChoices, sessionStartTime } from '../src/lib/syllabus-schedule';
import { validateSyllabusResult } from '../src/lib/syllabus-result';
import {
  courseSessions,
  quizTiming,
  midtermTiming,
  sessionPreview,
} from './fixtures/syllabus-sessions';

describe('timetable row time recovery', () => {
  it('recovers both parallel Tuesday labs from their own rows and keeps all meeting options', () => {
    const rows = [
      ['A', 'LECTURE', 2, 'Tuesday 16:00 – 17:20 STE H0104 Lecture', '16:00'],
      ['A', 'LECTURE', 4, 'Thursday 14:30 – 15:50 STE B0138 Lecture', '14:30'],
      ['CBY B02', 'LAB', 2, 'Tuesday 11:30 – 12:50 CBY B02 Lab', null],
      ['STE 0130', 'LAB', 2, 'Tuesday 11:30 – 12:50 STE 0130 Lab', null],
      ['STE 0131', 'LAB', 3, 'Wednesday 10:00 – 11:20 STE 0131 Lab', '10:00'],
      ['STE G0103', 'TUTORIAL', 5, 'Friday 17:30 – 18:50 STE G0103 Tutorial', '17:30'],
    ];
    const preview = validateSyllabusResult(
      {
        items: [],
        warnings: [],
        sessions: rows.map(([section, kind, weekday, source, startTime], i) => ({
          id: `row-${i}`,
          courseCode: 'SEG3102',
          section,
          kind,
          weekday,
          source,
          startTime,
          ordinal: null,
          page: 1,
        })),
      },
      { startDate: '2026-09-01', endDate: '2026-12-31', pages: 5 },
    );
    expect(preview.sessions?.map((s) => s.startTime)).toEqual([
      '16:00',
      '14:30',
      '11:30',
      '11:30',
      '10:00',
      '17:30',
    ]);
    const choices = sessionDateChoices(
      {
        label: 'Lab week',
        startDate: '2026-10-19',
        endDate: '2026-10-23',
        kind: 'LAB',
        ordinal: null,
        source: '',
        page: 1,
      },
      preview.sessions!,
      'SEG3102',
    );
    expect(choices.map((c) => [c.session.section, c.date, c.time])).toEqual([
      ['CBY B02', '2026-10-20', '11:30'],
      ['STE 0130', '2026-10-20', '11:30'],
      ['STE 0131', '2026-10-21', '10:00'],
    ]);
  });

  it.each([
    ['Mardi | 11 h 30 à 12 h 50 | CBY B02 | Labo', '11:30'],
    ['Tuesday 9:00-10:20 Lab', '09:00'],
    ['Tuesday CBY B02 Lab. Time unknown.', null],
    ['Tuesday 11:30-12:50 or 14:30-15:50', null],
    ['Tuesday 11:30-12:50; another timetable says 14:30', null],
    ['Tuesday 11:30-12:50 (conflicting times)', null],
    ['Tuesday 11:30-12:50 PM', null],
    ['Tuesday 13:30-12:50', null],
    ['Tuesday 25:30-12:50', null],
    ['Tuesday 11:30, room STE 0130', null],
  ])('only repairs an unambiguous range: %s', (source, expected) => {
    expect(sessionStartTime({ source, startTime: null })).toBe(expected);
  });

  it('preserves an already extracted valid time', () => {
    expect(sessionStartTime({ startTime: '11:30', source: 'Tuesday lab' })).toBe('11:30');
  });
});

describe('syllabus session dates', () => {
  it.each([
    ['A01', ['2026-10-01', '2026-10-15', '2026-11-05', '2026-11-19', '2026-12-03']],
    ['B01', ['2026-10-02', '2026-10-16', '2026-11-06', '2026-11-20', '2026-12-04']],
    ['B02', ['2026-09-30', '2026-10-14', '2026-11-04', '2026-11-18', '2026-12-02']],
  ])('resolves all five quiz weeks for tutorial %s', (section, expected) => {
    const dates = Array.from(
      { length: 5 },
      (_, i) =>
        sessionDateChoices(quizTiming(i), courseSessions, 'GNG1505').find(
          (c) => c.session.section === section,
        )?.date,
    );
    expect(dates).toEqual(expected);
  });
  it('uses lecture 2 and excludes other course codes and lecture 1', () => {
    expect(
      sessionDateChoices(midtermTiming, courseSessions, 'gng 1505').map((c) => [
        c.session.section,
        c.date,
        c.time,
      ]),
    ).toEqual([
      ['A', '2026-10-21', '11:30'],
      ['B', '2026-10-22', '16:00'],
    ]);
    expect(
      sessionDateChoices(quizTiming(0), courseSessions, 'GNG1505').some(
        (c) => c.session.id === 'EN',
      ),
    ).toBe(false);
    expect(sessionDateChoices(quizTiming(0), courseSessions, 'OTHER')).toEqual([]);
  });
  it('flags the Monday holiday without silently moving the quiz', () => {
    const choice = sessionDateChoices(
      quizTiming(1),
      courseSessions,
      'GNG1505',
      sessionPreview.exceptions,
    ).find((c) => c.session.id === 'B03');
    expect(choice).toMatchObject({ date: '2026-10-12', conflicts: ['Thanksgiving'] });
  });
  it('does not invent weeks, invalid dates or missing times', () => {
    for (const dates of [
      { startDate: null, endDate: null },
      { startDate: '2026-02-30', endDate: '2026-03-05' },
      { startDate: '2026-11-01', endDate: '2026-10-01' },
      { startDate: '2026-09-01', endDate: '2026-12-31' },
    ]) {
      expect(sessionDateChoices({ ...quizTiming(0), ...dates }, courseSessions, 'GNG1505')).toEqual(
        [],
      );
    }
    expect(
      sessionDateChoices(quizTiming(0), [{ ...courseSessions[3], startTime: null }], 'GNG1505')[0]
        .time,
    ).toBe('');
  });
  it('keeps multiple lecture possibilities unresolved when no ordinal is provided', () => {
    const choices = sessionDateChoices(
      { ...midtermTiming, ordinal: null },
      courseSessions,
      'GNG1505',
    ).filter((c) => c.session.section === 'A');
    expect(choices).toHaveLength(2);
  });
  it('retains separate quizzes and requires confirmation even if the model guessed a date', () => {
    const raw = structuredClone(sessionPreview);
    raw.items[0].date = '2026-10-01';
    raw.items[0].time = '17:30';
    const result = validateSyllabusResult(raw, {
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      pages: 9,
    });
    expect(result.items.filter((i) => i.type === 'QUIZ')).toHaveLength(5);
    expect(result.items[0]).toMatchObject({ date: '', time: '', weight: null, grouped: false });
    expect(result.items[5]).toMatchObject({ durationMinutes: 75, weight: 25 });
    expect(result.items[6]).toMatchObject({ timing: null, date: '', weight: 55 });
  });
});
