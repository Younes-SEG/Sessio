import { describe, expect, it } from 'vitest';
import { brightspaceUrl } from '../src/lib/brightspace';

describe('Brightspace source links', () => {
  const page = 'https://school.brightspace.com/d2l/le/calendar/12/event/34/detailsview';
  it('finds a source page in imported notes or linked assessment notes', () => {
    expect(brightspaceUrl(`Imported event\n(${page}).`)).toBe(page);
    expect(brightspaceUrl('Study for this', null, page)).toBe(page);
    expect(brightspaceUrl(`${page}?ou=12`)).toBe(`${page}?ou=12`);
  });
  it.each([
    'javascript:alert(1)',
    'http://school.brightspace.com/d2l/home',
    'https://school.brightspace.com.evil.test/d2l/home',
    'https://school.brightspace.com@evil.test/d2l/home',
    'https://user:secret@school.brightspace.com/d2l/home',
    'https://school.brightspace.com:8080/d2l/home',
    'https://school.brightspace.com/d2l/le/calendar/feed/user/feed.ics?token=secret',
    'https://school.brightspace.com/d2l/calendar?subscription=secret',
    '',
  ])('does not expose an unsafe or private subscription URL', (source) => {
    expect(brightspaceUrl(source)).toBeNull();
  });
});
