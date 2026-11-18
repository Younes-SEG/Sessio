import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { french } from '../src/lib/i18n/fr';
import { formatPercent, isSingular } from '../src/lib/i18n/format';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = [...sourceFiles('src/components'), ...sourceFiles('src/app')];
const unescape = (text: string) =>
  text
    .replace(/\\n/g, '\n')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(['"\\])/g, '$1');

/** Literal copy passed straight to t('…') or <T text="…" />. */
function literalKeys() {
  const keys = new Map<string, string>();
  const patterns = [
    /\bt\(\s*'((?:[^'\\]|\\.)*)'\s*[,)]/g,
    /\bt\(\s*"((?:[^"\\]|\\.)*)"\s*[,)]/g,
    /<T\s+text="([^"]*)"/g,
    /<T\s+text=\{\s*'((?:[^'\\]|\\.)*)'\s*\}/g,
  ];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of patterns)
      for (const match of source.matchAll(pattern)) keys.set(unescape(match[1]), file);
  }
  return keys;
}

describe('French coverage', () => {
  it('has a French entry for every literal string passed to t() or <T>', () => {
    const keys = literalKeys();
    expect(keys.size).toBeGreaterThan(500);
    const missing = [...keys].filter(([key]) => !(key in french)).map(([k, f]) => `${f}: ${k}`);
    expect(missing).toEqual([]);
  });

  it('keeps the same {placeholders} in every French entry', () => {
    const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [english, translated] of Object.entries(french))
      expect(names(translated), english).toEqual(names(english));
  });

  it('addresses the student as « vous » outside the chat', () => {
    expect(french['Loading your workspace…']).toBe('Chargement de votre espace…');
  });

  it('writes French numbers and plurals the French way', () => {
    expect(formatPercent(8.5, 'fr-CA')).toBe('8,5\u00a0%');
    expect(formatPercent(8.5, 'en-CA')).toBe('8.5%');
    expect(formatPercent(10, 'fr-CA')).toBe('10\u00a0%');
    expect(formatPercent(102, 'en-CA', 2, 2)).toBe('102.00%');
    expect(isSingular(0, 'fr-CA')).toBe(true);
    expect(isSingular(0, 'en-CA')).toBe(false);
    expect(isSingular(2, 'fr-CA')).toBe(false);
  });

  it('gives the French guide every anchor the app links to', () => {
    const guide = readFileSync('src/components/guide-language.tsx', 'utf8');
    const guideParts = [
      guide,
      readFileSync('src/components/assistant-guide.tsx', 'utf8'),
      readFileSync('src/components/brightspace-notification-guide.tsx', 'utf8'),
    ].join('\n');
    const anchors = new Set<string>();
    for (const file of files)
      for (const match of readFileSync(file, 'utf8').matchAll(/\/guide#([a-z-]+)/g))
        anchors.add(match[1]);
    expect(anchors.size).toBeGreaterThan(0);
    for (const anchor of anchors) expect(guideParts, anchor).toContain(`id="${anchor}"`);
    expect(guide).not.toContain('restent actuellement en anglais');
  });
});
