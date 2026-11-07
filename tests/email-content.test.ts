import { expect, it } from 'vitest';
import { EMAIL_TEXT_LIMIT, gmailContent } from '../src/lib/email-content';
import { schoolEmailExcerpt } from '../src/lib/email-classification';
import { emailMessageText } from '../src/lib/email-display';

const body = (text: string) => ({ data: Buffer.from(text).toString('base64url') });
const display = (text: string) =>
  emailMessageText({
    subject: 'SEG3102 Midterm Information and Review Session',
    sender: 'Professor <email@uottawa.brightspace.com>',
    excerpt: schoolEmailExcerpt('SEG3102 Midterm Information and Review Session', text),
    contentVersion: 1,
  });

it('retains the complete crib-sheet rule and review session, including paragraphs beyond the old limits', () => {
  const message = `${'Please review the course material carefully.\n'.repeat(100)}\nCrib Sheet: One single-sided sheet is allowed, but the text must be clearly legible. No other notes or electronic devices will be permitted during the exam.\n\nMidterm Review Session\nAn in-person midterm review session will be held this Friday, October 16, during the regular tutorial time. The TA (Omar) will review the topics covered by the midterm.\nPlease let us know if you have any questions.\nBest regards,\nBoqi`;
  const content = gmailContent({ mimeType: 'text/plain', body: body(message) });
  expect(content.truncated).toBe(false);
  expect(display(content.text)).toBe(message);
});

it('keeps HTML section headings, table values and links without executing HTML', () => {
  const content = gmailContent({
    mimeType: 'text/html',
    body: body(
      '<style>hidden</style><script>bad()</script><h3>Review Session</h3><p>Read <a href="https://school.test/review?a=1&amp;b=2">the guide</a>.</p><table><tr><td>Friday</td><td>14:30</td></tr></table>',
    ),
  });
  expect(content.text).toContain('Review Session\n');
  expect(content.text).toContain('the guide (https://school.test/review?a=1&b=2)');
  expect(content.text).toContain('Friday\t');
  expect(content.text).toContain('14:30');
  expect(content.text).not.toMatch(/hidden|bad\(\)|<script/);
});

it('uses HTML when the plain-text alternative is empty, without duplicating both versions', () => {
  const content = gmailContent({
    mimeType: 'multipart/alternative',
    parts: [
      { mimeType: 'text/plain', body: body('  ') },
      { mimeType: 'text/html', body: body('<p>Instructions complètes</p>') },
    ],
  });
  expect(content.text.trim()).toBe('Instructions complètes');
  expect(content.truncated).toBe(false);
});

it('flags bounded or unavailable body text instead of silently claiming completeness', () => {
  const content = gmailContent({
    mimeType: 'text/plain',
    body: body('a'.repeat(EMAIL_TEXT_LIMIT + 1)),
  });
  expect(content.text).toHaveLength(EMAIL_TEXT_LIMIT);
  expect(content.truncated).toBe(true);
  expect(
    gmailContent({ mimeType: 'text/plain', body: { attachmentId: 'body', size: 100 } }).truncated,
  ).toBe(true);
  expect(
    gmailContent({ filename: 'private.txt', mimeType: 'text/plain', body: body('secret') }).text,
  ).toBe('');
});

it('keeps meaningful repeated instructions, published-resource instructions and quoted context', () => {
  const text =
    'Published solutions for the 2026 exam are in the review folder.\nBring your student ID to participate in the exam.\nReview Session\nBring your student ID to participate in the exam.\nOn Tuesday wrote:\nPrevious instructions';
  expect(display(text)).toBe(text);
});
