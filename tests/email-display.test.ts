import { expect, it } from 'vitest';
import { emailMessageText } from '../src/lib/email-display';

const subject = 'SEG3102 A00 Software Design & Architecture 20269 - Announcements: Midterm Review';
const sender = 'Brightspace <notifications@school.test>';
it('shows the announcement without repeated Brightspace headers, metadata or footer spacing', () => {
  const body =
    'Please review the Design Structure lecture.\nReworking assignment 1 is a great exercise.';
  const result = emailMessageText({
    subject,
    sender,
    excerpt: `${subject}\n\n    ${subject}\n\n\n  ${subject}\nPosted Friday, October 16, 2026 7:19 PM EDT\nFrom: ${sender}\nSubject: ${subject}\n\n\n   Dear Students,\n${body}\n\n\n\n SEG3102 A00 Software Design & Architecture 20269\n\n Go to An\n${body}`,
  });
  expect(result).toBe(body);
});
it('preserves dates, grades, task instructions and meaningful links', () => {
  const excerpt =
    'Lab 1 deadline extended to November 2, 2026 at 23:59.\nScore: 18/20\nPublished score: 85%\nDate: November 2, 2026\nGo to the Exam Review section to prepare.\nhttps://school.test/review\nFrom now on, use the revised rubric.';
  expect(emailMessageText({ subject, sender, excerpt })).toBe(excerpt);
});
it('cleans French headers without removing the actual deadline', () => {
  const excerpt =
    'Objet : Révision\nDe : prof@school.test\nPublié le 16 octobre 2026 à 19h19\nBonjour à tous,\n\nDate limite : 2 novembre 2026 à 23h59.\nVoir l’annonce';
  expect(emailMessageText({ subject: 'Révision', sender, excerpt })).toBe(
    'Date limite : 2 novembre 2026 à 23h59.',
  );
});
it('does not invent content when only template metadata was saved', () => {
  expect(
    emailMessageText({ subject, sender, excerpt: `${subject}\n${sender}\nGo to Announcement` }),
  ).toBe('');
});
