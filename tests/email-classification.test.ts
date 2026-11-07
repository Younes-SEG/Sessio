import { describe, it, expect } from 'vitest';
import {
  classifySchoolEmail,
  emailDeadline,
  schoolEmailExcerpt,
} from '../src/lib/email-classification';
import {
  effectiveGmailQuery,
  DEFAULT_GMAIL_QUERY,
  LEGACY_GMAIL_QUERY,
  LEGACY_SCHOOL_GMAIL_QUERY,
  scopedGmailQuery,
  SCHOOL_GMAIL_SCOPE,
  matchEmailAssessment,
} from '../src/lib/email-grades';
const courses = [{ code: 'SEG3102', archived: false }];
const classify = (subject: string, text = '', sender = 'Brightspace <no-reply@school.test>') =>
  classifySchoolEmail({ subject, text, sender }, courses);

describe('school email relevance', () => {
  it.each([
    [
      'SEG3102 Announcements: Project Deliverable 1 Feedback Published',
      'Hello everyone,\nPlease note that the feedback for project deliverable 1 has been published. Let me know if you have any questions.',
    ],
    ['SEG3102 Feedback published', 'Note that feedback for Lab 1 is now available.'],
    ['SEG3102 Feedback', 'Please note: your comments have been posted.'],
    ['SEG3102 Project feedback', 'The feedback for deliverable 1 has been published.'],
    [
      'SEG3102 Rétroaction publiée',
      'Veuillez noter que la rétroaction du livrable 1 est disponible.',
    ],
    ['SEG3102 Commentaires disponibles', 'Les commentaires sur le devoir 1 sont publiés.'],
  ])('keeps feedback without a grade in school updates: %s', (subject, text) => {
    expect(classify(subject, text)).toBe('ANNOUNCEMENT');
  });
  it.each([
    ['SEG3102 New announcement', 'Please note that the review slides have been published.'],
    ['SEG3102 New announcement', 'Note that the course outline is available.'],
    ['SEG3102 New announcement', 'The lecture notes have been posted.'],
  ])('does not confuse ordinary notes or English instructions with grades: %s', (subject, text) => {
    expect(classify(subject, text)).toBe('ANNOUNCEMENT');
  });
  it.each([
    ['SEG3102 Feedback published', 'Please note that your grade for Lab 1 has been published.'],
    ['SEG3102 Feedback published', 'Feedback is available.\nYour grade: 17/25'],
    ['SEG3102 Rétroaction', 'Votre note pour le livrable 1 a été publiée.'],
    ['SEG3102 Rétroaction', 'La note du devoir 1 est disponible.'],
    ['SEG3102', 'Note publiée pour le quiz 2.'],
    ['SEG3102', 'Notes disponibles sur Brightspace.'],
    ['SEG3102', 'Vos notes ont été mises à jour.'],
    [
      'SEG3102 Activity summary',
      'Feedback available\nCourse Grades (1)\nUpdated - Lab 1\nYour grade: 9/10',
    ],
  ])('keeps explicit grades even when feedback is also mentioned: %s', (subject, text) => {
    expect(classify(subject, text)).toBe('GRADE');
  });
  it('keeps a direct French professor email even without announcement keywords or a saved course', () => {
    const subject = 'STA2791 B00 Prob. & stats. pour ingénieurs [ LEC ] 20269 >';
    const body =
      'Bonjour tout le monde,\nDemain, Jeudi vous avez le test1 à 8:30. Il porte sur les lectures 1 à 7. Il comporte 6QCM et une question à développement. Vous avez droit à 2 feuilles (recto-verso) de formules et à une calculatrice.';
    expect(classify(subject, body, 'Professor <email@uottawa.brightspace.com>')).toBe(
      'ANNOUNCEMENT',
    );
    expect(emailDeadline(body)).toBeNull();
    expect(
      classify(subject, 'Please bring your formula sheets tomorrow.', 'email@college.d2l.com'),
    ).toBe('ANNOUNCEMENT');
    expect(classify(subject, body, 'email@uottawa.brightspace.com.evil.test')).toBe('IGNORE');
    expect(classify(subject, body, '"email@uottawa.brightspace.com" <other@example.test>')).toBe(
      'IGNORE',
    );
  });
  it('still excludes automatic content notices and unrelated mail while recognizing explicit test changes', () => {
    expect(
      classify(
        'STA2791 Lecture notes available',
        'Read the new lecture.',
        'email@uottawa.brightspace.com',
      ),
    ).toBe('IGNORE');
    expect(
      classify(
        'STA2791 - "Lecture 8" has been created',
        'A page was created.',
        'Notifications@uottawa.brightspace.com',
      ),
    ).toBe('IGNORE');
    expect(
      classify('Your password reset', 'Reset your password.', 'email@uottawa.brightspace.com'),
    ).toBe('IGNORE');
    expect(classify('Hello', 'Just saying hello.', 'email@uottawa.brightspace.com')).toBe('IGNORE');
    expect(
      classify('STA2791', 'Le test1 est reporté au 2026-10-23.', 'email@uottawa.brightspace.com'),
    ).toBe('ASSESSMENT_CHANGE');
  });
  it.each([
    ['SEG3102 Lab 1', 'Score: 18/20'],
    ['Your grade is available', 'Open Brightspace to view your result.'],
    ['Nouvelle note publiée — SEG3102', 'Note : 85 %'],
    ['SEG3102 Assignment 1 has been graded', ''],
    ['Grades - Grade item updated', ''],
  ])('keeps real grade notifications: %s', (subject, text) =>
    expect(classify(subject, text)).toBe('GRADE'),
  );
  it.each([
    ['Lecture notes available', 'New lecture notes on Brightspace'],
    ['Notes de cours publiées', 'SEG3102'],
    ['Note importante', 'Bonjour'],
    ['Your password reset', 'Brightspace reset code'],
    ['Sale! Student discount', 'Brightspace'],
    ['Weekly newsletter', 'New grade available Brightspace'],
    ['Meeting notes', 'SEG3102 project discussion'],
  ])('excludes unrelated messages: %s', (subject, text) =>
    expect(classify(subject, text)).toBe('IGNORE'),
  );
  it('requires a known course or LMS context, not just a university sender or numeric score', () => {
    expect(classify('Your credit score', 'Score: 85%', 'bank@bank.test')).toBe('IGNORE');
    expect(classify('Results available', '', 'newsletter@uottawa.ca')).toBe('IGNORE');
    expect(classify('SEG3102 Lab 1', 'Score: 18/20', 'prof@uottawa.ca')).toBe('GRADE');
    expect(
      classifySchoolEmail(
        { subject: 'SEG3102 Lab 1', text: 'Score: 18/20', sender: 'prof@school.test' },
        [{ code: 'SEG3102', archived: true }],
      ),
    ).toBe('IGNORE');
  });
  it('keeps announcements and changes separate from grades', () => {
    expect(classify('Grade weights updated', 'Lab weight: 10%')).toBe('ANNOUNCEMENT');
    expect(classify('SEG3102 — New announcement', 'Bring your laptop.')).toBe('ANNOUNCEMENT');
    expect(classify('SEG3102 Lab 1 deadline extended', 'Now due November 2, 2026 at 23:59.')).toBe(
      'ASSESSMENT_CHANGE',
    );
    expect(classify('SEG3102 — Examen reporté', 'Nouvelle date limite : 2026-11-02')).toBe(
      'ASSESSMENT_CHANGE',
    );
  });
  it('does not treat a quoted old grade as a new notification', () => {
    expect(classify('Thanks', 'Thank you!\nOn Tuesday wrote:\nYour grade is available')).toBe(
      'IGNORE',
    );
  });
  it('retains the relevant deadline through a long message for review', () => {
    const excerpt = schoolEmailExcerpt(
      'SEG3102 Lab 1',
      `${'Header\n'.repeat(500)}Deadline extended to November 2, 2026 at 23:59.`,
    );
    expect(emailDeadline(excerpt)).toEqual({ date: '2026-11-02', time: '23:59' });
  });
  it('keeps activity-summary grade context through long messages with unrelated deadlines', () => {
    const excerpt = schoolEmailExcerpt(
      'SEG3102 Activity summary',
      `Lab 6 - Due date in 5 days\n${'Header\n'.repeat(500)}Course Grades (1)\nUpdated - Lab 3\nYour grade: 9/10\nGo to Grades >>`,
    );
    expect(classify('SEG3102 Activity summary', excerpt)).toBe('GRADE');
    expect(
      matchEmailAssessment(
        excerpt,
        [{ id: 'c', ...courses[0] }],
        [
          { id: 'lab3', courseId: 'c', name: 'Lab 3', type: 'LAB' },
          { id: 'lab6', courseId: 'c', name: 'Lab 6', type: 'LAB' },
        ],
      ),
    ).toBe('lab3');
  });
});
describe('explicit deadline proposals', () => {
  it.each([
    ['Deadline extended to November 2, 2026 at 23:59.', { date: '2026-11-02', time: '23:59' }],
    ['Nouvelle date limite : 2 novembre 2026 à 17h30.', { date: '2026-11-02', time: '17:30' }],
    ['Now due 2026-11-02 at 5:30 pm.', { date: '2026-11-02', time: '17:30' }],
    ['Deadline: 2026-11-02', { date: '2026-11-02', time: null }],
  ])('reads %s', (text, expected) => expect(emailDeadline(text)).toEqual(expected));
  it.each([
    'Deadline moved from 2026-11-02 to 2026-11-03',
    'Now due next Friday',
    'Deadline: 02/11/2026',
    'Deadline: November 2',
    'Deadline: 2026-02-30',
    'Quiz cancelled on 2026-11-02',
    'Meeting 2026-11-02\nDeadline is next Friday',
  ])('leaves uncertain dates for review: %s', (text) => expect(emailDeadline(text)).toBeNull());
});
it('upgrades the legacy default and constrains custom Gmail filters', () => {
  expect(effectiveGmailQuery(LEGACY_GMAIL_QUERY)).toBe(DEFAULT_GMAIL_QUERY);
  expect(effectiveGmailQuery(LEGACY_SCHOOL_GMAIL_QUERY)).toBe(DEFAULT_GMAIL_QUERY);
  expect(effectiveGmailQuery('label:School')).toBe('label:School');
  expect(scopedGmailQuery('label:School')).toBe(`(${SCHOOL_GMAIL_SCOPE}) (label:School)`);
});
