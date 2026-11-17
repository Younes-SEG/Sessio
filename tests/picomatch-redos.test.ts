// Guards the patched picomatch in vendor/picomatch (GHSA-fc5q-39xc-vjpf).
// See vendor/README.md for why it exists and when to remove it.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

type Picomatch = {
  makeRe: (pattern: string) => RegExp;
  isMatch: (input: string, pattern: string) => boolean;
};

// Resolve picomatch the way the real consumers (vitest, vite, tinyglobby) do.
const fromVitest = require.resolve('picomatch', { paths: [require.resolve('vitest')] });
const fromVite = require.resolve('picomatch', { paths: [require.resolve('vite')] });
const fromTinyglobby = require.resolve('picomatch', { paths: [require.resolve('tinyglobby')] });
const pm = require(fromVitest) as Picomatch;

function slowestMs(pattern: string, subjects: string[]) {
  const re = pm.makeRe(pattern);
  let worst = 0;
  for (const subject of subjects) {
    const start = performance.now();
    re.test(subject);
    worst = Math.max(worst, performance.now() - start);
  }
  return worst;
}

describe('patched picomatch (GHSA-fc5q-39xc-vjpf)', () => {
  it('every v4 consumer gets the vendored copy, identical to vendor/picomatch', () => {
    const source = new URL('../vendor/picomatch/', import.meta.url);
    for (const file of [
      'index.js',
      'posix.js',
      'lib/parse.js',
      'lib/picomatch.js',
      'lib/scan.js',
      'lib/utils.js',
      'lib/constants.js',
    ]) {
      // Line endings may differ on Windows checkouts; contents must not.
      const text = (path: string | URL) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
      const expected = text(new URL(file, source));
      for (const path of [fromVitest, fromVite, fromTinyglobby]) {
        expect(text(path.replace(/index\.js$/, file)), `${path} ${file}`).toBe(expected);
      }
    }
    expect(readFileSync(fromVitest.replace(/index\.js$/, 'lib/parse.js'), 'utf8')).toContain(
      'Command patch for GHSA-fc5q-39xc-vjpf',
    );
  });

  it('repeated extglobs from the advisory and our fuzzing stay fast', () => {
    const n = 40; // 2^40 steps on unpatched 4.0.7
    const subjects = [
      'a'.repeat(n) + '!',
      'a'.repeat(n) + '/',
      'ab'.repeat(n / 2) + '!',
      'a' + 'b'.repeat(n) + '!',
    ];
    for (const pattern of [
      '+(*)',
      '+(*a)',
      '*(*a)',
      '+(a*)',
      '+(*a|b)',
      '+(*?a)',
      '+(****)',
      '+(a|aa)',
      '+(a|[ab])',
      '+([ab]|[ab])',
      '+(@(a|aa)|a)',
      '+(@(*))x',
      '+(**[ab])',
      '*(!(foo))',
      '+(+(a))',
      'x+(*a)x',
    ]) {
      expect(slowestMs(pattern, subjects), pattern).toBeLessThan(100);
    }
  });

  it('keeps matching ordinary globs and safe extglobs', () => {
    const cases: Array<[string, string, boolean]> = [
      ['src/app/page.tsx', 'src/**/*.tsx', true],
      ['tests/pwa.test.ts', '**/*.{test,spec}.?(c|m)[jt]s?(x)', true],
      ['foo/bar/baz.jsx', 'foo/bar/*.+(js|jsx)', true],
      ['foo/bar/baz.css', 'foo/bar/*.+(js|jsx)', false],
      ['abc', '+(*)c', true],
      ['xay', '+(*a)y', true],
      ['ab', '*(a|b)', true],
      ['a.c', '+([[:alpha:].])', true],
      ['my/folder (Work, Accts)', '*/*(W*, *)*', true],
      ['foo', '*(@(foo))', true],
    ];
    for (const [input, pattern, expected] of cases) {
      expect(pm.isMatch(input, pattern), `${input} vs ${pattern}`).toBe(expected);
    }
  });
});
