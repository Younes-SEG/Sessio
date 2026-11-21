import { test, expect, devices, type Browser } from '@playwright/test';

// Installable website: manifest and icons load signed out, the service worker stores nothing
// but its static offline page, and the phone-only "Add to Home Screen" tip is translated.

test('manifest, icons and service worker load', async ({ page, request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: 'Sessio', display: 'standalone', start_url: '/' });
  for (const icon of [...manifest.icons, { src: '/icons/apple-touch-icon.png' }]) {
    const file = await request.get(icon.src);
    expect(file.ok(), icon.src).toBe(true);
    expect(file.headers()['content-type'], icon.src).toBe('image/png');
  }

  await page.goto('/legal/privacy');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto('/');
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys())
      for (const entry of await (await caches.open(name)).keys())
        urls.push(new URL(entry.url).pathname);
    return urls;
  });
  expect(cached).toEqual(['/offline.html']);
});

async function phone(browser: Browser, baseURL: string, language: 'en' | 'fr', name = 'iPhone 13') {
  const context = await browser.newContext({ ...devices[name], baseURL });
  await context.addCookies([{ name: 'command-language', value: language, url: baseURL }]);
  // The tip waits until the school question is answered or dismissed; the CI workspace has none.
  await context.addInitScript(() =>
    localStorage.setItem('command-school-prompt-dismissed-v1', 'true'),
  );
  return context;
}

test('home screen tip shows on phones in English and French and stays dismissed', async ({
  browser,
  baseURL,
}) => {
  const english = await phone(browser, baseURL!, 'en');
  const page = await english.newPage();
  await page.goto('/');
  const tip = page.getByRole('complementary', { name: 'Add Sessio to your home screen' });
  await expect(tip).toContainText('Tap Share, then Add to Home Screen.');
  await tip.getByRole('button', { name: 'Dismiss home screen tip' }).click();
  await expect(tip).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(tip).toBeHidden();
  await english.close();

  const french = await phone(browser, baseURL!, 'fr', 'Pixel 7');
  const frenchPage = await french.newPage();
  await frenchPage.goto('/');
  const frenchTip = frenchPage.getByRole('complementary', {
    name: 'Ajoutez Sessio à votre écran d’accueil',
  });
  await expect(frenchTip).toContainText('Ouvrez le menu du navigateur');
  await expect(
    frenchTip.getByRole('button', { name: 'Masquer le conseil sur l’écran d’accueil' }),
  ).toBeVisible();
  await french.close();
});

test('home screen tip stays hidden on a desktop computer', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('command-school-prompt-dismissed-v1', 'true'),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('install-tip')).toHaveCount(0);
});
