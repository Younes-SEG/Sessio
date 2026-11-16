import { test, expect } from '@playwright/test';

// Settings → Calendar keeps the full explanation visible; only first-run setup folds it.
test('calendar settings show the full calendar explanation', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'command-language', value: 'en', url: baseURL! }]);
  await page.goto('/settings/calendar');
  await expect(page.getByText(/Save calendar stores this private link/)).toBeVisible();
  await expect(page.getByText('Calendar changes save here separately')).toBeVisible();
  await expect(page.getByText(/Grades and notes stay yours/)).toBeVisible();
  await expect(page.getByTestId('calendar-how-it-works')).toHaveCount(0);
});
