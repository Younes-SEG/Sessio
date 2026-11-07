import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Workspace } from '../src/lib/types';

test('compact grade display edits only grading fields and preserves assessment details', async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36).toUpperCase();
  const name = `Grade entry check ${suffix}`;
  let semesterId = '';
  let courseId = '';
  const workspace = async (): Promise<Workspace> => (await request.get('/api/workspace')).json();
  try {
    expect(
      (
        await request.post('/api/semesters', {
          data: { name, startDate: '2090-01-01', endDate: '2090-05-01', isActive: false },
        })
      ).ok(),
    ).toBeTruthy();
    semesterId = (await workspace()).semesters.find((s) => s.name === name)!.id;
    expect(
      (
        await request.post('/api/courses', { data: { code: `GRADE${suffix}`, name, semesterId } })
      ).ok(),
    ).toBeTruthy();
    courseId = (await workspace()).courses.find((c) => c.name === name)!.id;
    expect(
      (
        await request.post('/api/assessments', {
          data: {
            name,
            courseId,
            type: 'LAB',
            weight: 20,
            maxScore: 20,
            status: 'SUBMITTED',
            dueDate: '2090-03-01T20:00:00Z',
            notes: 'Preserve these notes',
          },
        })
      ).ok(),
    ).toBeTruthy();
    const assessment = (await workspace()).assessments.find((a) => a.name === name)!;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/grades');
    await page.getByLabel('Search courses', { exact: true }).fill(name);
    await page.locator(`[data-grade-course="${courseId}"]`).click();
    await page.locator('[data-grade-group="LAB"] > summary').click();
    const row = page.locator(`[data-grade-item="${assessment.id}"]`);
    await expect(row).toContainText('Not graded');
    await expect(row.locator('input')).toHaveCount(0);
    await row.getByRole('button', { name: `Edit grade: ${name}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit grade', exact: true });
    await expect(dialog.locator('input')).toHaveCount(4);
    await expect(dialog.locator('select, textarea, input[type="datetime-local"]')).toHaveCount(0);
    await dialog.getByLabel('Score received', { exact: true }).fill('18');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(row).toContainText('Not graded');
    await row.getByRole('button').click();
    await expect(dialog.getByLabel('Score received', { exact: true })).toHaveValue('');
    await dialog.getByLabel('Score received', { exact: true }).fill('18');
    await dialog.getByLabel('Assessment name', { exact: true }).fill(name + ' revised');
    await dialog.getByLabel('Course weight (%)', { exact: true }).fill('25');
    for (const dark of [false, true]) {
      await page.evaluate(
        (value) => document.documentElement.classList.toggle('dark', value),
        dark,
      );
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
      ).toEqual([]);
    }
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toContainText('90%');
    await expect(row).toContainText('18 / 20');
    await expect(row).toContainText('25% weight');
    const saved = (await workspace()).assessments.find((a) => a.id === assessment.id)!;
    expect(saved).toMatchObject({
      name: name + ' revised',
      score: 18,
      maxScore: 20,
      status: 'GRADED',
      weight: 25,
      courseId,
      type: assessment.type,
      dueDate: assessment.dueDate,
      notes: assessment.notes,
    });
    await row.getByRole('button').click();
    await dialog.getByLabel('Score received', { exact: true }).fill('');
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toContainText('Not graded');
    expect((await workspace()).assessments.find((a) => a.id === assessment.id)).toMatchObject({
      score: null,
      status: 'SUBMITTED',
      notes: assessment.notes,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    if (courseId) {
      await request.delete(`/api/courses/${courseId}`);
      await request.delete(`/api/deleted-courses/${courseId}`);
    }
    if (semesterId) await request.delete(`/api/semesters/${semesterId}`);
  }
});

test('user guide is discoverable and links to grade entry and calendar setup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: 'User guide', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'User guide', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Guide topics' })
    .getByRole('link', { name: 'Enter and track grades' })
    .click();
  await expect(page).toHaveURL(/\/guide#grades$/);
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value), dark);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
    ).toEqual([]);
  }
  await page.getByRole('link', { name: 'Connect calendar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save calendar', exact: true })).toBeVisible();
});
