import { test, expect } from '@playwright/test';
import type { Workspace } from '../src/lib/types';

test('Tasks shows original assessments, filters them and completes work without creating tasks or clearing grades', async ({
  page,
  request,
}) => {
  const original = await request.get('/api/workspace');
  const data: Workspace = await original.json();
  await page.clock.setFixedTime(new Date('2026-11-05T15:00:00-05:00'));
  data.semesters = [
    {
      id: 'term',
      name: 'This term',
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      isActive: true,
    },
    {
      id: 'old',
      name: 'Past term',
      startDate: '2025-09-01',
      endDate: '2025-12-31',
      isActive: false,
    },
  ];
  const course = {
    id: 'course',
    semesterId: 'term',
    code: 'SEG3102',
    name: 'Design',
    instructor: null,
    color: '#789080',
    notes: '',
    archived: false,
  };
  data.courses = [
    course,
    { ...course, id: 'other', code: 'GNG1505' },
    { ...course, id: 'past', semesterId: 'old' },
    { ...course, id: 'archive', archived: true },
  ];
  const lab = {
    id: 'lab7',
    courseId: 'course',
    name: 'Lab 7 - Due',
    type: 'LAB' as const,
    dueDate: '2026-11-06T04:59:00Z',
    status: 'NOT_STARTED' as const,
    score: null,
    maxScore: 100,
    weight: 5,
    notes: '',
  };
  data.assessments = [
    lab,
    { ...lab, id: 'quiz', name: 'Quiz 3', courseId: 'other', type: 'QUIZ' },
    { ...lab, id: 'future', name: 'Next lab', dueDate: '2026-11-07T04:59:00Z' },
    { ...lab, id: 'overdue', name: 'Late assignment', dueDate: '2026-11-04T04:59:00Z' },
    { ...lab, id: 'undated', name: 'Undated assignment', dueDate: null },
    { ...lab, id: 'graded', name: 'Graded lab', status: 'GRADED', score: 80 },
    { ...lab, id: 'past', name: 'Past lab', courseId: 'past' },
    { ...lab, id: 'archive', name: 'Archived lab', courseId: 'archive' },
  ];
  data.tasks = [];
  data.settings.onboardingCompleted = true;
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  let fail = false;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/workspace') return route.fulfill({ json: data });
    if (path === '/api/email')
      return route.fulfill({
        json: { configured: false, connection: null, updates: [], assessments: [] },
      });
    if (route.request().method() === 'GET') return route.continue();
    const body = route.request().postDataJSON();
    writes.push({ path, body });
    if (fail) return route.fulfill({ status: 500, json: { error: 'Save failed for test' } });
    if (path.startsWith('/api/assessments/'))
      Object.assign(
        data.assessments.find((a) => a.id === path.split('/').pop())!,
        body,
      );
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('/tasks');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const section = page.getByRole('region', { name: 'Assessments', exact: true });
  const row = section.locator('[data-assessment-work="lab7"]');
  await expect(row).toBeVisible();
  await expect(section.locator('[data-assessment-work]')).toHaveCount(2);
  await section.getByLabel('Assessment course').selectOption('course');
  await expect(section.locator('[data-assessment-work]')).toHaveCount(1);
  await section.getByRole('checkbox', { name: 'Complete: Lab 7 - Due', exact: true }).click();
  await expect(row).toHaveCount(0);
  await section.getByRole('button', { name: /^Completed/ }).click();
  await expect(section.getByRole('checkbox', { name: 'Reopen: Lab 7 - Due' })).toBeChecked();
  await expect(section.getByRole('checkbox', { name: 'Graded: Graded lab' })).toBeDisabled();
  expect(data.assessments.find((a) => a.id === 'graded')?.score).toBe(80);
  await section.getByRole('checkbox', { name: 'Reopen: Lab 7 - Due' }).click();
  await section.getByRole('button', { name: /^Today/ }).click();
  await expect(row).toBeVisible();
  fail = true;
  await row.getByRole('checkbox').click();
  await expect(section.getByRole('alert')).toHaveText('Save failed for test');
  await expect(row.getByRole('checkbox')).not.toBeChecked();
  expect(writes.every((write) => write.path === '/api/assessments/lab7')).toBe(true);
  expect(writes[0].body).toEqual({ status: 'SUBMITTED' });
  expect(writes[1].body).toEqual({ status: 'IN_PROGRESS' });
  expect(data.tasks).toHaveLength(0);
  await section.getByRole('button', { name: /^Upcoming/ }).click();
  await expect(section.getByRole('button', { name: 'Next lab', exact: true })).toBeVisible();
  await section.getByRole('button', { name: /^Overdue/ }).click();
  await expect(section.getByRole('button', { name: 'Late assignment', exact: true })).toBeVisible();
  await section.getByRole('button', { name: /^All assessments/ }).click();
  await section.getByRole('textbox', { name: 'Search assessments' }).fill('Undated');
  await expect(section.locator('[data-assessment-work]')).toHaveCount(1);
  await expect(
    section.getByRole('button', { name: 'Undated assignment', exact: true }),
  ).toBeVisible();
  await section.getByRole('textbox', { name: 'Search assessments' }).fill('');
  await expect(section.getByRole('button', { name: 'Past lab', exact: true })).toHaveCount(0);
  await expect(section.getByRole('button', { name: 'Archived lab', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
