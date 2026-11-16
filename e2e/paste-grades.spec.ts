import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Workspace } from '../src/lib/types';

test('pasted Brightspace grades are reviewed before saving and never overwrite silently', async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36).toUpperCase();
  const name = `Paste check ${suffix}`;
  let semesterId = '',
    courseId = '';
  const workspace = async (): Promise<Workspace> => (await request.get('/api/workspace')).json();
  try {
    await request.post('/api/semesters', {
      data: { name, startDate: '2090-09-01', endDate: '2090-12-31', isActive: false },
    });
    semesterId = (await workspace()).semesters.find((s) => s.name === name)!.id;
    await request.post('/api/courses', { data: { code: `PST${suffix}`, name, semesterId } });
    courseId = (await workspace()).courses.find((c) => c.name === name)!.id;
    for (const data of [
      { name: 'Quiz 2', type: 'QUIZ', weight: 10, maxScore: 10 },
      { name: 'Lab 1', type: 'LAB', weight: 5, maxScore: 2 },
      {
        name: 'Assignment 1',
        type: 'ASSIGNMENT',
        weight: 20,
        maxScore: 100,
        score: 80,
        status: 'GRADED',
      },
    ])
      expect(
        (await request.post('/api/assessments', { data: { courseId, ...data } })).ok(),
      ).toBeTruthy();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/courses/${courseId}`);
    await page.getByRole('tab', { name: 'Grades' }).click();
    await page.getByRole('button', { name: 'Paste grades', exact: true }).click();
    await page
      .getByLabel('Grades table')
      .fill(
        [
          'Grade Item\t\tPoints\tWeight Achieved\tGrade',
          'Quiz\t\t\t9.5 / 10\tA+',
          '\tQuiz 2\t9.5 / 10\t9.5 / 10\tA+',
          '\tQuiz 3\t- / 10\t- / -\t-',
          'Lab\t\t\t2 / 2\tA+',
          '\tLab 01\t2 / 2\t5 / 5\tA+',
          'Assignment\t\t\t19 / 20\tA+',
          '\tAssignment 1\t95 / 100\t19 / 20\tA+',
        ].join('\n'),
      );
    await page.getByRole('button', { name: 'Read grades' }).click();
    await expect(page.getByRole('checkbox', { name: /Quiz 2 · 9\.5 \/ 10/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /Lab 01 · 2 \/ 2/ })).toBeChecked();
    const conflict = page.getByRole('checkbox', { name: /Assignment 1 · 95 \/ 100/ });
    await expect(conflict).not.toBeChecked();
    await expect(page.getByText('In Command: 80 / 100')).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);

    await page.getByRole('button', { name: 'Save selected grades' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Grades saved: 2' })).toBeVisible();
    const saved = (await workspace()).assessments.filter((a) => a.courseId === courseId);
    expect(saved.find((a) => a.name === 'Quiz 2')).toMatchObject({ score: 9.5, status: 'GRADED' });
    expect(saved.find((a) => a.name === 'Lab 1')).toMatchObject({ score: 2, maxScore: 2 });
    expect(saved.find((a) => a.name === 'Assignment 1')).toMatchObject({ score: 80 });
  } finally {
    if (courseId) {
      await request.delete(`/api/courses/${courseId}`);
      await request.delete(`/api/deleted-courses/${courseId}`);
    }
    if (semesterId) await request.delete(`/api/semesters/${semesterId}`);
  }
});
