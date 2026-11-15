import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { validateSyllabusResult } from '../src/lib/syllabus-result';
import type { Workspace } from '../src/lib/types';

// Synthetic reader output (no paid API): six 2% labs where only the best 5 count for 10%.
const labs = Array.from({ length: 6 }, (_, i) => ({
  name: `Lab ${i + 1}`,
  type: 'LAB' as const,
  date: `2090-10-${String(i + 10).padStart(2, '0')}`,
  time: '23:59',
  weight: 2,
  source: `Lab ${i + 1} report - 2%`,
  page: 1,
  warnings: [],
  grouped: false,
}));
const readerResult = {
  categories: [
    {
      name: 'Lab reports',
      type: 'LAB' as const,
      weight: 10,
      count: 6,
      equalWeights: true,
      source: 'Lab reports (best 5 of 6, 2% each) 10%',
      page: 1,
    },
  ],
  items: [
    ...labs,
    {
      name: 'Final exam',
      type: 'FINAL_EXAM' as const,
      date: '2090-12-15',
      time: '09:00',
      weight: 90,
      source: 'Final exam - 90%',
      page: 1,
      warnings: [],
      grouped: false,
    },
  ],
  warnings: [],
};

test('syllabus review suggests a best-of rule that the student applies (mocked provider)', async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36).toUpperCase();
  const name = `Best-of check ${suffix}`;
  let semesterId = '',
    courseId = '';
  const workspace = async (): Promise<Workspace> => (await request.get('/api/workspace')).json();
  try {
    expect(
      (
        await request.post('/api/semesters', {
          data: { name, startDate: '2090-09-01', endDate: '2090-12-31', isActive: false },
        })
      ).ok(),
    ).toBeTruthy();
    semesterId = (await workspace()).semesters.find((s) => s.name === name)!.id;
    expect(
      (
        await request.post('/api/courses', { data: { code: `BST${suffix}`, name, semesterId } })
      ).ok(),
    ).toBeTruthy();
    courseId = (await workspace()).courses.find((c) => c.name === name)!.id;
    await page.route('**/api/syllabus/preview', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { configured: true } });
        return;
      }
      await route.fulfill({
        json: validateSyllabusResult(readerResult, {
          startDate: '2090-09-01',
          endDate: '2090-12-31',
          pages: 1,
        }),
      });
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/syllabus?course=${courseId}`);
    await expect(page.getByRole('combobox', { name: 'Course', exact: true })).toHaveValue(courseId);
    await page.getByText('Or paste syllabus text', { exact: true }).click();
    await page.getByLabel('Syllabus text').fill('Lab reports (best 5 of 6, 2% each) 10%');
    await page.getByRole('button', { name: 'Find assessments from text' }).click();

    const card = page.getByRole('region', { name: 'Suggested grading rule' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('5 / 6');
    await expect(card).toContainText('10%');
    await expect(page.getByText(/Course weight after import:\s*102\.00%/)).toBeVisible();

    const result = await new AxeBuilder({ page })
      .include('[aria-label="Suggested grading rule"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);

    await card.getByRole('button', { name: 'Apply best-of rule' }).click();
    await expect(card).toBeHidden();
    await expect(page.getByText(/Course weight after import:\s*100\.00%/)).toBeVisible();

    await page.getByRole('checkbox', { name: /^I checked the course details/ }).check();
    await page.getByRole('button', { name: 'Save reviewed assessments' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved: 7 new' })).toBeVisible();
    const saved = (await workspace()).courses.find((c) => c.id === courseId)!;
    const savedLabs = (await workspace()).assessments.filter(
      (a) => a.courseId === courseId && a.type === 'LAB',
    );
    expect(saved.gradingRules).toHaveLength(1);
    expect(saved.gradingRules![0]).toMatchObject({ keep: 5, weight: 10 });
    expect([...saved.gradingRules![0].assessmentIds].sort()).toEqual(
      savedLabs.map((a) => a.id).sort(),
    );
  } finally {
    if (courseId) {
      await request.delete(`/api/courses/${courseId}`);
      await request.delete(`/api/deleted-courses/${courseId}`);
    }
    if (semesterId) await request.delete(`/api/semesters/${semesterId}`);
  }
});
