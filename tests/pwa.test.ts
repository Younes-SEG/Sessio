import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import manifest from '../src/app/manifest';
import { config } from '../src/proxy';
import { french } from '../src/lib/i18n/fr';
import { APP_BACKGROUND } from '../src/lib/theme';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const gated = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

function pngSize(path: string) {
  const file = read(`public${path}`);
  expect(file.subarray(1, 4).toString('latin1'), path).toBe('PNG');
  return `${file.readUInt32BE(16)}x${file.readUInt32BE(20)}`;
}

describe('installable website', () => {
  const app = manifest();

  it('describes a standalone Sessio app in the site colours', () => {
    expect(app).toMatchObject({
      name: 'Sessio',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    });
    expect(app.theme_color).toBe(APP_BACKGROUND.light);
    expect(app.background_color).toBe(APP_BACKGROUND.light);
    const css = read('src/app/globals.css').toString();
    expect(css).toContain(`--background: ${APP_BACKGROUND.light};`);
    expect(css).toContain(`--background: ${APP_BACKGROUND.dark};`);
  });

  it('lists PNG icons that exist at their stated sizes, including a maskable one', () => {
    const icons = app.icons ?? [];
    for (const icon of icons) expect(pngSize(icon.src), icon.src).toBe(icon.sizes);
    expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    expect(pngSize('/icons/apple-touch-icon.png')).toBe('180x180');
  });

  it('serves the install files outside the sign-in gate', () => {
    for (const path of [
      '/manifest.webmanifest',
      '/sw.js',
      '/offline.html',
      '/icons/icon-192.png',
      '/icons/apple-touch-icon.png',
    ])
      expect(gated(path), path).toBe(false);
    expect(gated('/api/workspace')).toBe(true);
    expect(gated('/courses')).toBe(true);
  });

  it('has a service worker that never stores pages or API responses', () => {
    const worker = read('public/sw.js').toString();
    // The only cached file is the static offline page, added once at install.
    expect(worker).not.toMatch(/\.put\(|addAll\(/);
    expect(worker.match(/cache\.add\(/g)).toHaveLength(1);
    expect(worker).toContain("const OFFLINE_URL = '/offline.html'");
    // Requests are only intercepted while the device reports it is offline.
    expect(worker).toMatch(/request\.mode !== 'navigate'[^\n]*self\.navigator\.onLine\) return;/);
    expect(worker).not.toMatch(/addEventListener\('push'/);
    const offline = read('public/offline.html').toString();
    expect(offline).toContain('lang="fr"');
    expect(offline).not.toMatch(/<script/);
  });

  it('translates every line of the home screen tip into French', () => {
    const source = read('src/components/install-tip.tsx').toString();
    const copy = [...source.matchAll(/\bt\('([^']+)'\)/g)].map((match) => match[1]);
    expect(copy.length).toBeGreaterThanOrEqual(6);
    for (const text of copy) expect(french[text], text).toBeTruthy();
  });
});
