import { test, expect } from '@playwright/test';
import type { Workspace } from '../src/lib/types';
import { syllabusModelResult } from '../tests/fixtures/syllabus-result';
import { validateSyllabusResult } from '../src/lib/syllabus-result';

test('syllabus reuses a matching course and course deletion requires confirmation', async ({
  page,
  request,
}) => {
  const name = `Course matching check ${Date.now()}`;
  let semesterId = '';
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
      (await request.post('/api/courses', { data: { name, code: 'REUSE3101', semesterId } })).ok(),
    ).toBeTruthy();
    const course = (await workspace()).courses.find((c) => c.name === name)!;
    expect(
      (
        await request.post('/api/assessments', {
          data: {
            courseId: course.id,
            name: 'Midterm 1',
            type: 'MIDTERM',
            weight: 0,
            score: 90,
            maxScore: 100,
            status: 'GRADED',
          },
        })
      ).ok(),
    ).toBeTruthy();
    const assessment = (await workspace()).assessments.find((a) => a.courseId === course.id)!;
    await page.route('**/api/syllabus/preview', (route) =>
      route.fulfill({
        json:
          route.request().method() === 'GET'
            ? { configured: true }
            : validateSyllabusResult(
                {
                  ...syllabusModelResult,
                  course: { ...syllabusModelResult.course, code: 'reuse-3101', name },
                  items: [syllabusModelResult.items[0]],
                },
                { startDate: '2090-09-01', endDate: '2090-12-31', pages: 1 },
              ),
      }),
    );
    await page.goto('/syllabus');
    await page.getByRole('combobox', { name: 'Term', exact: true }).selectOption(semesterId);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'outline.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('REUSE3101 Midterm 1 worth 25%'),
    });
    await page.getByRole('button', { name: 'Read syllabus', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Existing course', exact: true })).toBeChecked();
    await expect(page.getByRole('combobox', { name: 'Course', exact: true })).toHaveValue(
      course.id,
    );
    await expect(page.getByRole('combobox', { name: 'Save as', exact: true })).toHaveValue(
      assessment.id,
    );
    await expect(
      page.getByText(
        'Matched your existing course. Review the updates below; a second course will not be created.',
      ),
    ).toBeVisible();
    await page
      .getByLabel(
        'I checked the course details, selected dates, times, individual weights and matches against my syllabus.',
      )
      .check();
    await page.getByRole('button', { name: 'Save reviewed assessments', exact: true }).click();
    await expect(
      page.getByText('Saved: 0 new assessments and 1 updated assessments.', { exact: true }),
    ).toBeVisible();
    const saved = await workspace();
    expect(saved.courses.filter((c) => c.semesterId === semesterId)).toHaveLength(1);
    expect(saved.assessments.find((a) => a.id === assessment.id)).toMatchObject({
      weight: 25,
      score: 90,
      status: 'GRADED',
    });
    await page.goto(`/courses/${course.id}`);
    await page.getByRole('button', { name: 'Delete course', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete course?', exact: true });
    await expect(dialog).toContainText('you can restore it');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await workspace()).courses.some((c) => c.id === course.id)).toBe(true);
    await page.getByRole('button', { name: 'Delete course', exact: true }).click();
    await dialog.getByRole('button', { name: 'Delete course', exact: true }).click();
    await expect(page).toHaveURL(/\/courses$/);
    const removed = await workspace();
    expect(removed.courses.some((c) => c.id === course.id)).toBe(false);
    expect(removed.assessments.some((a) => a.courseId === course.id)).toBe(false);
    await page
      .getByRole('region', { name: 'Deleted courses', exact: true })
      .locator('summary')
      .click();
    const trash = page.getByRole('region', { name: 'Deleted courses', exact: true });
    await expect(trash).toContainText(name);
    await trash.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(trash).not.toContainText(name);
    expect((await workspace()).assessments.find((a) => a.id === assessment.id)).toMatchObject({
      score: 90,
      weight: 25,
    });
    await page.goto(`/courses/${course.id}`);
    await page.getByRole('button', { name: 'Delete course', exact: true }).click();
    await dialog.getByRole('button', { name: 'Delete course', exact: true }).click();
    await expect(page).toHaveURL(/\/courses$/);
    await page
      .getByRole('region', { name: 'Deleted courses', exact: true })
      .locator('summary')
      .click();
    await trash.getByRole('button', { name: 'Delete permanently', exact: true }).click();
    const permanent = page.getByRole('dialog', { name: 'Delete permanently?', exact: true });
    await expect(permanent).toContainText('This cannot be undone.');
    await permanent.getByRole('button', { name: 'Delete permanently', exact: true }).click();
    await expect(trash).not.toContainText(name);
    expect((await workspace()).deletedCourses?.some((c) => c.id === course.id)).toBe(false);
  } finally {
    if (semesterId) await request.delete(`/api/semesters/${semesterId}`);
  }
});
