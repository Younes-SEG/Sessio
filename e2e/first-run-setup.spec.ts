import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

// First run: welcome, school, bring in the semester, then Home or the tour.
// The page reads onboarding state from the server, so the disposable CI workspace is
// switched to first-run here and restored afterwards; in-test writes are mocked.
async function setOnboarded(request: APIRequestContext, baseURL: string, value: boolean) {
  const response = await request.patch('/api/settings/preferences', {
    data: { onboardingCompleted: value },
    headers: { Origin: baseURL },
  });
  expect(response.ok()).toBe(true);
}

test.beforeEach(async ({ request, baseURL }) => setOnboarded(request, baseURL!, false));
test.afterEach(async ({ request, baseURL }) => setOnboarded(request, baseURL!, true));

async function firstRun(page: Page) {
  const saved: unknown[] = [];
  let connected = false;
  await page.route('**/api/settings/preferences', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    saved.push(route.request().postDataJSON());
    await route.fulfill({ json: { id: 'preferences' } });
  });
  await page.route('**/api/calendar-subscriptions', async (route) => {
    if (route.request().method() === 'POST' && route.request().postDataJSON().action === 'connect')
      connected = true;
    await route.fulfill({
      json: connected
        ? [
            {
              id: 'first-run',
              enabled: true,
              name: 'University calendar',
              fromDate: '2026-09-01',
              throughDate: '2026-12-31',
              lastSyncedAt: null,
              lastError: null,
              itemCount: 4,
            },
          ]
        : [],
    });
  });
  return saved;
}

test('first run brings in the Brightspace calendar before going Home', async ({ page }) => {
  const saved = await firstRun(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /explore on my own/ }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bring in your courses and deadlines' }),
  ).toBeVisible();
  await page.getByLabel('Calendar subscription link').fill('https://calendar.example/first-run');
  await page.getByRole('button', { name: 'Save calendar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Calendar connected' })).toBeVisible();
  // Setup continues in place rather than linking away mid-onboarding.
  await expect(page.getByRole('link', { name: 'View calendar' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bring in your courses and deadlines' }),
  ).toHaveCount(0);
  expect(saved).toContainEqual(expect.objectContaining({ onboardingCompleted: true }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('first run setup can be skipped on the way to the tour', async ({ page }) => {
  const saved = await firstRun(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Show me around', exact: true }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('data-step', '0');
  await expect(dialog).toHaveAttribute('data-ready', 'true');
  expect(saved).toEqual([]);
});
