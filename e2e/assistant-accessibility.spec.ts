import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['light', 'dark'] as const) {
  test(`assistant supports keyboard, reduced motion and readable replies in ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/**', async (route) => {
      if (new URL(route.request().url()).pathname === '/api/assistant/chats') {
        return route.fulfill({
          json:
            route.request().method() === 'GET'
              ? new URL(route.request().url()).searchParams.has('id')
                ? {
                    id: '11111111-1111-4111-8111-111111111111',
                    title: '',
                    updatedAt: new Date().toISOString(),
                    entries: [],
                  }
                : { chats: [] }
              : {
                  id: '11111111-1111-4111-8111-111111111111',
                  title: '',
                  updatedAt: new Date().toISOString(),
                },
        });
      }
      const request = route.request();
      if (new URL(request.url()).pathname === '/api/assistant') {
        if (request.method() === 'GET') return route.fulfill({ json: { configured: true } });
        return route.fulfill({
          json: {
            id: request.postDataJSON().id,
            status: 'answer',
            text: '<img src=x onerror=alert(1)> is plain text.',
            items: [{ title: 'Test session', detail: 'Tomorrow at 6 PM', href: '/calendar' }],
          },
        });
      }
      if (request.method() !== 'GET') return route.fulfill({ json: { ok: true } });
      return route.continue();
    });
    await page.goto('/');
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle('dark', dark),
      theme === 'dark',
    );
    const trigger = page.getByRole('button', { name: 'Ask Sessio', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Ask Sessio' });
    await expect(dialog).toBeVisible();
    const audit = async () => {
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      ).toEqual([]);
    };
    await audit();
    await dialog.getByLabel('Message Sessio').fill('test');
    await page.keyboard.press('Enter');
    await expect(dialog.getByText('<img src=x onerror=alert(1)> is plain text.')).toBeVisible();
    await expect(dialog.locator('img')).toHaveCount(0);
    await audit();
    await page.setViewportSize({ width: 320, height: 740 });
    await expect(dialog.getByLabel('Message Sessio')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeVisible();
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await dialog.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await audit();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
