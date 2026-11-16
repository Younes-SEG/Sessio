import { test, expect } from '@playwright/test';

// Needs a workspace with no courses yet (e.g. a fresh disposable database). Not in the CI
// list because the CI fixture already has a course. Course creation here is real.
test('first course: suggests importing its syllabus or adding assessments', async ({
  page,
  request,
  baseURL,
  context,
}) => {
  const workspace = await (await request.get('/api/workspace')).json();
  test.skip(workspace.courses.length > 0, 'Workspace already has courses.');
  await context.addCookies([{ name: 'command-language', value: 'en', url: baseURL! }]);
  if (!workspace.settings.onboardingCompleted)
    await request.patch('/api/settings/preferences', {
      data: { onboardingCompleted: true },
      headers: { Origin: baseURL! },
    });
  if (!workspace.semesters.length)
    await request.post('/api/semesters', {
      data: { name: 'Fall 2026', startDate: '2026-09-01', endDate: '2026-12-31', isActive: true },
      headers: { Origin: baseURL! },
    });
  await page.goto('/courses');
  await page.getByRole('button', { name: 'Add course' }).first().click();
  await page.getByLabel('Course code').fill('NXT1000');
  await page.getByLabel('Course name').fill('Next step course');
  await page.getByRole('button', { name: 'Create course' }).click();
  const next = page.getByTestId('course-next-step');
  await expect(next).toBeVisible();
  await expect(next.getByRole('heading')).toHaveText('NXT1000 is ready');
  await next.getByRole('button', { name: 'Add an assessment' }).click();
  // The assessment form opens for the new course.
  await expect(page.getByRole('heading', { name: 'New assessment' })).toBeVisible();
  await expect(page.getByLabel('Course', { exact: true })).toHaveValue(/.+/);
  await expect(page.getByLabel('Course', { exact: true }).locator('option:checked')).toHaveText(
    /NXT1000/,
  );
  await page.getByRole('button', { name: 'Cancel' }).click();
  // A second course is not a first course: the form simply closes.
  await page.getByRole('button', { name: 'Add course' }).first().click();
  await page.getByLabel('Course code').fill('NXT2000');
  await page.getByLabel('Course name').fill('Second course');
  await page.getByRole('button', { name: 'Create course' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(next).toHaveCount(0);
});
