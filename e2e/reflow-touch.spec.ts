import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.2 AA checks a sighted keyboard, zoom or touch user would hit:
// - 1.4.10 Reflow: at 320 CSS px wide (400% zoom on a 1280 px screen) nothing scrolls sideways.
// - 2.5.8 Target size: controls are at least 24 by 24 px (axe "target-size").
// - 2.4.7 Focus visible: every control shows an outline or ring when reached by keyboard.
const pages = [
  '/',
  '/courses',
  '/tasks',
  '/calendar',
  '/grades',
  '/updates',
  '/email',
  '/syllabus',
  '/guide',
  '/settings',
  '/settings/calendar',
  '/settings/privacy',
  '/legal/privacy',
];

// Writes seed data, so run only against a disposable database (the CI list, or a throwaway
// local server), never the owner's workspace.
async function prepare(page: Page, baseURL: string) {
  await page.context().addCookies([{ name: 'command-language', value: 'en', url: baseURL }]);
  // Pages must be measured as themselves, not behind the first-run welcome screen.
  const done = await page.request.patch('/api/settings/preferences', {
    data: { onboardingCompleted: true },
    headers: { Origin: baseURL },
  });
  expect(done.ok()).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

/** Realistic content (long names, grades, tasks) so layouts are tested full, not empty. */
async function seed(page: Page, baseURL: string): Promise<string> {
  const api = page.request;
  const headers = { Origin: baseURL };
  const workspace = await (await api.get('/api/workspace')).json();
  const existing = workspace.courses.find((c: { code: string }) => c.code === 'RFL1000');
  if (existing) return existing.id;
  const term = await (
    await api.post('/api/semesters', {
      data: {
        name: 'Reflow term',
        startDate: '2090-09-01',
        endDate: '2090-12-31',
        isActive: false,
      },
      headers,
    })
  ).json();
  const course = await (
    await api.post('/api/courses', {
      data: {
        semesterId: term.id,
        code: 'RFL1000',
        name: 'Introduction to Very Long Course Names and Interdisciplinary Reflow Studies',
        instructor: 'Professor Maximiliana Featherstonehaugh-Montgomery',
      },
      headers,
    })
  ).json();
  expect(course.id, 'seeded course').toBeTruthy();
  for (const [name, score] of [
    ['Assignment 1 - Requirements elicitation and stakeholder analysis report', 17],
    ['Midterm examination (closed book, in person)', null],
    ['Lab 3', 9],
  ] as const)
    await api.post('/api/assessments', {
      data: {
        courseId: course.id,
        name,
        weight: 20,
        dueDate: '2090-10-15T23:59:00.000Z',
        ...(score === null ? {} : { score, maxScore: 20, status: 'GRADED' }),
      },
      headers,
    });
  await api.post('/api/tasks', {
    data: {
      title: 'Read chapters 4 to 7 and summarise the architectural decision records',
      courseId: course.id,
      dueDate: '2090-10-10T17:00:00.000Z',
    },
    headers,
  });
  return course.id;
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('h1').first()).not.toHaveText(/Welcome to Sessio/);
}

test('core pages reflow at 320 px and keep touch targets usable', async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  await prepare(page, baseURL!);
  const courseId = await seed(page, baseURL!);
  await page.setViewportSize({ width: 320, height: 640 });
  const problems: string[] = [];
  const check = async (where: string) => {
    const overflow = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || r.right <= width + 1) return false;
          // Content inside a horizontally scrollable region (tables, tab strips) is allowed.
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)) return false;
          }
          return true;
        })
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}`);
      return { scroll: document.documentElement.scrollWidth - width, wide };
    });
    if (overflow.scroll > 1)
      problems.push(
        `${where}: page scrolls sideways by ${overflow.scroll}px (${overflow.wide.join(', ')})`,
      );
    const axe = await new AxeBuilder({ page }).withRules(['target-size']).analyze();
    for (const v of axe.violations)
      for (const node of v.nodes) problems.push(`${where}: small target ${node.target.join(' ')}`);
  };
  for (const path of pages) {
    await open(page, path);
    await check(path);
  }
  // A full course page, on every tab, with long names and grades.
  await open(page, `/courses/${courseId}`);
  await expect(page.locator('h1')).toContainText('Very Long Course Names');
  await check('course overview');
  for (const tab of ['Assessments', 'Grades', 'Schedule', 'Notes']) {
    await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
    if (tab === 'Assessments')
      await expect(page.getByText('Assignment 1 - Requirements elicitation').first()).toBeVisible();
    await check(`course ${tab}`);
  }
  expect(problems).toEqual([]);
});

test('keyboard focus is visible on every control of core pages', async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  await prepare(page, baseURL!);
  const courseId = await seed(page, baseURL!);
  await page.setViewportSize({ width: 1280, height: 900 });
  const problems: string[] = [];
  for (const path of [
    '/',
    '/courses',
    '/tasks',
    '/grades',
    '/settings',
    '/guide',
    `/courses/${courseId}`,
  ]) {
    await open(page, path);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        // The Next.js dev overlay exists only under `next dev`.
        if (!el || el === document.body || el.tagName === 'NEXTJS-PORTAL') return null;
        const s = getComputedStyle(el);
        const ring =
          (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) ||
          (s.boxShadow && s.boxShadow !== 'none');
        const label =
          el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName;
        return { key: `${el.tagName}:${label}`, ring: Boolean(ring) };
      });
      if (!info || seen.has(info.key)) continue;
      seen.add(info.key);
      if (!info.ring) problems.push(`${path}: no visible focus on ${info.key}`);
    }
  }
  expect(problems).toEqual([]);
});
