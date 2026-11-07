import { test, expect } from '@playwright/test';
import type { Workspace } from '../src/lib/types';

test('dashboard counters follow assessment completion and reopening without counting obsolete study reminders', async ({
  page,
  request,
}) => {
  const data: Workspace = await (await request.get('/api/workspace')).json();
  await page.clock.setFixedTime(new Date('2026-11-05T15:00:00-05:00'));
  data.semesters = [
    {
      id: 'term',
      name: 'Test term',
      isActive: true,
      startDate: '2026-09-01',
      endDate: '2026-12-31',
    },
  ];
  data.courses = [
    {
      id: 'course',
      semesterId: 'term',
      code: 'SEG3102',
      name: 'Design',
      archived: false,
      color: '#789080',
      instructor: null,
      notes: '',
    },
  ];
  const assessment = {
    id: 'lab',
    courseId: 'course',
    name: 'Lab 7',
    type: 'LAB' as const,
    dueDate: '2026-11-06T04:59:00Z',
    status: 'NOT_STARTED' as const,
    score: null,
    maxScore: 100,
    weight: 10,
    notes: '',
  };
  data.assessments = [
    assessment,
    { ...assessment, id: 'quiz', name: 'Quiz 3', type: 'QUIZ', dueDate: '2026-11-05T22:30:00Z' },
    { ...assessment, id: 'next', name: 'Next assignment', dueDate: '2026-11-09T04:59:00Z' },
    { ...assessment, id: 'graded', name: 'Graded assignment', status: 'GRADED', score: 80 },
  ];
  const task = {
    id: 'study',
    courseId: 'course',
    assessmentId: 'quiz',
    title: 'Study for SEG3102 — Quiz 3',
    description: '',
    dueDate: '2026-11-05T22:30:00Z',
    priority: 'MEDIUM' as const,
    status: 'NOT_STARTED' as const,
    studyTask: true,
    calendarManaged: false,
    estimatedMinutes: 30,
    subtasks: [],
    createdAt: '2026-11-01T12:00:00Z',
    completedAt: null,
  };
  data.tasks = [
    task,
    {
      ...task,
      id: 'personal',
      assessmentId: null,
      studyTask: false,
      title: 'Read notes',
      estimatedMinutes: 10,
    },
    {
      ...task,
      id: 'legacy',
      assessmentId: 'lab',
      studyTask: false,
      calendarManaged: true,
      title: 'Old calendar copy',
    },
  ];
  data.settings.onboardingCompleted = true;
  data.settings.showCompleted = false;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/workspace') return route.fulfill({ json: data });
    if (path === '/api/email')
      return route.fulfill({
        json: { configured: false, connection: null, updates: [], assessments: [] },
      });
    if (route.request().method() === 'GET') return route.continue();
    const collection = path.startsWith('/api/assessments/')
      ? data.assessments
      : path.startsWith('/api/tasks/')
        ? data.tasks
        : [];
    const item = collection.find((value) => value.id === path.split('/').pop());
    if (item) Object.assign(item, route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  const stat = (name: string) =>
    page
      .locator('.stat-card')
      .filter({ has: page.getByText(name, { exact: true }) })
      .locator('.stat-number');
  const home = () => page.getByRole('link', { name: 'Home', exact: true }).click();
  const tasks = () =>
    page
      .getByRole('link', { name: /^Tasks(?:\s+\d+)?$/ })
      .first()
      .click();
  await page.goto('/');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(stat('Due today')).toHaveText('4');
  await expect(stat('Deadlines this week')).toHaveText('3');
  await tasks();
  const section = page.getByRole('region', { name: 'Assessments', exact: true });
  await section.getByRole('checkbox', { name: 'Complete: Quiz 3', exact: true }).click();
  await section.getByRole('checkbox', { name: 'Complete: Lab 7', exact: true }).click();
  await home();
  await expect(stat('Due today')).toHaveText('1');
  await expect(stat('Deadlines this week')).toHaveText('1');
  await expect(stat('Planned focus time')).toHaveText('10m');
  // The source reminder is left intact; only actionable work contributes to counts.
  expect(data.tasks.find((t) => t.id === 'study')?.status).toBe('NOT_STARTED');
  await page.getByRole('button', { name: 'Complete Read notes', exact: true }).click();
  await expect(stat('Due today')).toHaveText('0');
  await tasks();
  await section.getByRole('button', { name: /^Upcoming/ }).click();
  await section.getByRole('checkbox', { name: 'Complete: Next assignment', exact: true }).click();
  await home();
  await expect(stat('Deadlines this week')).toHaveText('0');
  await expect(stat('Due today')).toHaveText('0');
  await tasks();
  await section.getByRole('button', { name: /^Completed/ }).click();
  await section.getByRole('checkbox', { name: 'Reopen: Lab 7', exact: true }).click();
  await home();
  await expect(stat('Due today')).toHaveText('1');
  await expect(stat('Deadlines this week')).toHaveText('1');
});
