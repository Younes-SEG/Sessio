import { describe, expect, it } from 'vitest';
import { emailDeadlineChanges } from '../src/lib/email-deadlines';
import { emailDeadline } from '../src/lib/email-classification';

const courses = [{ id: 'c', code: 'SEG3101', archived: false }];
const assessments = [
  { id: 'a1', courseId: 'c', name: 'Assignment 1', type: 'ASSIGNMENT' as const },
  { id: 'a2', courseId: 'c', name: 'Assignment 2', type: 'ASSIGNMENT' as const },
  { id: 'd1', courseId: 'c', name: 'Deliverable 1', type: 'PROJECT' as const },
  { id: 'd2', courseId: 'c', name: 'Deliverable 2', type: 'PROJECT' as const },
];
const subject =
  'SEG3101 A00 Software Requirements Analysis 20269 - Announcements: SEG3101: Deadline extension for Assignment 2 and Project Deliverable 2';
// Shape of a real Brightspace announcement (synthetic course content).
const body = [
  subject,
  'Posted Sunday, November 15, 2026 5:58 PM EST',
  'Dear students,',
  'Because of the recent disruption to the course, I’ve extended two deadlines for two days:',
  'Assignment 2 is now due Tuesday, November 17, 2026.',
  'Project Deliverable 2 is now due Tuesday, November 17, 2026.',
  'Please submit both on Brightspace as usual. All other requirements stay the same.',
].join('\n');
const changes = (text: string, s = subject) =>
  emailDeadlineChanges({ subject: s, text }, courses, assessments);

describe('email deadline changes', () => {
  it('changes each assessment named on its own line, ignoring the posted date', () => {
    expect(changes(body)).toEqual([
      { assessmentId: 'a2', date: '2026-11-17', time: null },
      { assessmentId: 'd2', date: '2026-11-17', time: null },
    ]);
    // The older single-date suggestion still reads the shared date.
    expect(emailDeadline(body)).toMatchObject({ date: '2026-11-17' });
  });

  it('keeps an explicit time and reads French', () => {
    expect(
      changes(
        'SEG3101: nouvelle date\nLe devoir 1 est reporté au 20 novembre 2026 à 23h59.',
        'SEG3101 - Annonces : report du devoir 1',
      ),
    ).toEqual([{ assessmentId: 'a1', date: '2026-11-20', time: '23:59' }]);
  });

  it('uses the subject when the body has only the date', () => {
    expect(
      changes(
        'The deadline has been extended to November 19, 2026.',
        'SEG3101: Deadline extension for Assignment 1',
      ),
    ).toEqual([{ assessmentId: 'a1', date: '2026-11-19', time: null }]);
  });

  it('ignores room numbers that look like course codes', () => {
    expect(changes(`${body}\nOffice hours stay in STE 2052.`)).toHaveLength(2);
  });

  it('changes nothing when unclear', () => {
    // Cancellation.
    expect(changes(body.replace('extended', 'cancelled'))).toEqual([]);
    // Two dates on one line.
    expect(
      changes('Assignment 2 moved from November 10, 2026 to November 17, 2026 (extension).'),
    ).toEqual([]);
    // Contradictory dates for the same assessment.
    expect(
      changes(
        'Extension:\nAssignment 2 is now due November 17, 2026.\nAssignment 2 is now due November 18, 2026.',
      ),
    ).toEqual([]);
    // No change wording at all.
    expect(
      changes('Assignment 2 is due November 17, 2026.', 'SEG3101: Reminder for Assignment 2'),
    ).toEqual([]);
    // Two of the student's own courses.
    expect(
      emailDeadlineChanges(
        { subject, text: `${body}\nSame for CSI2110.` },
        [...courses, { id: 'c2', code: 'CSI2110', archived: false }],
        assessments,
      ),
    ).toEqual([]);
    // Unknown assessment.
    expect(changes('Extension: Lab 9 is now due November 17, 2026.', 'SEG3101 extension')).toEqual(
      [],
    );
  });
});
