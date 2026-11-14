import { describe, expect, it } from 'vitest';
import { config } from '../src/proxy';

// The matcher is a single path pattern; anchored, it behaves as a regular expression.
const gated = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe('proxy matcher', () => {
  it('keeps public static files outside the sign-in gate', () => {
    expect(gated('/fonts/lora-variable.ttf')).toBe(false);
    expect(gated('/fonts/plus-jakarta-sans-variable.ttf')).toBe(false);
    expect(gated('/licenses/pdfjs/LICENSE')).toBe(false);
    expect(gated('/_next/static/chunks/app.js')).toBe(false);
  });

  it('still gates the workspace and its API', () => {
    expect(gated('/')).toBe(true);
    expect(gated('/courses')).toBe(true);
    expect(gated('/settings/account')).toBe(true);
    expect(gated('/api/workspace')).toBe(true);
    expect(gated('/auth/sign-in')).toBe(true);
  });
});
