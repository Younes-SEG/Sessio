import { expect, it } from 'vitest';
import { schoolNotificationGroups } from '../src/lib/email-duplicates';

const body =
  'Please review the Design Structure lecture before the midterm.\nBring one single-sided formula sheet, a pencil and your student ID.';
const announcement = {
  id: 'announcement',
  kind: 'ANNOUNCEMENT' as const,
  contentVersion: 1,
  bodyTruncated: false,
  subject: 'SEG3102 A00 Software Design 20269 - Announcements: Midterm Review',
  sender: 'Notifications@uottawa.brightspace.com',
  receivedAt: '2026-11-05T15:00:00Z',
  excerpt: '',
};
announcement.excerpt = `${announcement.subject}\nPosted Thursday, November 5, 2026 10:00 AM\nHello everyone,\n${body}\nSEG3102 A00 Software Design 20269\nGo to Announcements >> (https://school.test/announcement/1)\nYou are receiving this message because you subscribed to announcements.`;
const direct = {
  ...announcement,
  id: 'direct',
  subject: 'SEG3102 A00 Software Design 20269',
  sender: 'Professor <email@uottawa.brightspace.com>',
  receivedAt: '2026-11-05T15:02:00Z',
  excerpt: `Dear Students,\n${body}`,
};

it('groups announcement and direct-mail copies despite wrappers, sender and whitespace differences', () => {
  const groups = schoolNotificationGroups([
    announcement,
    { ...direct, excerpt: direct.excerpt.replace('before', '\n  before') },
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].map((m) => m.id)).toEqual(['direct', 'announcement']);
  expect(groups[0][1].excerpt).toBe(announcement.excerpt);
});
it.each([
  body.replace('single-sided', 'double-sided'),
  `${body}\nThe exam starts at 14:30.`,
  `${body}\nhttps://school.test/revised-rules`,
])('retains meaningful content changes: %s', (changed) => {
  expect(schoolNotificationGroups([announcement, { ...direct, excerpt: changed }])).toHaveLength(2);
});
it('preserves different dates, scores, meaningful URLs and negation', () => {
  for (const [left, right] of [
    ['14:30', '15:30'],
    ['18/20', '19/20'],
    ['https://school.test/a', 'https://school.test/b'],
    ['You may use notes.', 'You may not use notes.'],
  ]) {
    expect(
      schoolNotificationGroups([
        { ...direct, excerpt: `${body}\n${left}` },
        { ...direct, id: 'changed', excerpt: `${body}\n${right}` },
      ]),
    ).toHaveLength(2);
  }
});
it('does not combine different courses, multi-course messages, old reminders or chains beyond three days', () => {
  expect(schoolNotificationGroups([announcement, { ...direct, subject: 'GNG1505' }])).toHaveLength(
    2,
  );
  expect(
    schoolNotificationGroups([announcement, { ...direct, subject: 'SEG3102 GNG1505' }]),
  ).toHaveLength(2);
  expect(
    schoolNotificationGroups([announcement, { ...direct, receivedAt: '2026-11-10T15:00:00Z' }]),
  ).toHaveLength(2);
  expect(
    schoolNotificationGroups([
      direct,
      { ...direct, id: 'second', receivedAt: '2026-11-07T15:00:00Z' },
      { ...direct, id: 'third', receivedAt: '2026-11-09T15:00:00Z' },
    ]),
  ).toHaveLength(2);
});
it('keeps grades, deadline changes, digests, replies, short messages and incomplete sources separate', () => {
  const variants = [
    { kind: 'GRADE' as const },
    { kind: 'ASSESSMENT_CHANGE' as const },
    { subject: 'Activity summary for SEG3102' },
    { subject: 'Re: SEG3102 Review' },
    { bodyTruncated: true },
    { contentVersion: 0 },
    { excerpt: 'Please review the notes.' },
  ];
  for (const variant of variants) {
    const message = { ...direct, ...variant };
    expect(schoolNotificationGroups([message, { ...message, id: 'copy' }])).toHaveLength(2);
  }
});
it('groups French messages without altering their accented instructions', () => {
  const text =
    'Veuillez lire les consignes avant le laboratoire. Apportez une calculatrice et votre carte étudiante pour participer.';
  expect(
    schoolNotificationGroups([
      {
        ...announcement,
        subject: 'SEG3102 - Annonces: Laboratoire',
        excerpt: `Publié le 5 novembre 2026 à 10h00\nBonjour à tous,\n${text}\nVoir l’annonce`,
      },
      { ...direct, subject: 'SEG3102', excerpt: text },
    ]),
  ).toHaveLength(1);
});
