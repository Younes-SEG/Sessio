import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const targets = [
  'nav-courses',
  'course-terms',
  'course-import',
  'course-add',
  'course-filters',
  'course-list',
  'nav-calendar',
  'calendar-connect',
  'calendar-add',
  'calendar-controls',
  'calendar-filters',
  'calendar-grid',
  'nav-tasks',
  'task-add',
  'task-views',
  'task-filters',
  'task-list',
  'nav-grades',
  'grades-add',
  'grades-awaiting',
  'grades-filters',
  'grades-views',
  'grades-results',
  'nav-home',
  'focus',
];

/** Open the tour from the guide: a fresh workspace first passes the school and calendar steps. */
async function startTour(page: Page, french = false) {
  await page.goto('/guide');
  const welcome = page.getByRole('button', {
    name: french ? 'Me faire découvrir' : 'Show me around',
    exact: true,
  });
  const replay = page.getByRole('button', {
    name: french ? 'Faire la visite guidée' : 'Take the guided tour',
  });
  await expect(welcome.or(replay)).toBeVisible();
  if (await replay.isVisible()) return replay.click();
  await welcome.click();
  await page.getByRole('button', { name: french ? 'Passer' : 'Skip', exact: true }).click();
  await page
    .getByRole('button', { name: french ? 'Passer pour l’instant' : 'Skip for now', exact: true })
    .click();
}

for (const config of [
  { name: 'desktop', width: 1920, height: 1080, french: false },
  { name: 'mobile French', width: 390, height: 844, french: true },
  { name: 'small screen', width: 320, height: 568, french: false },
]) {
  test(`guided tour: interactive navigation and stable spotlight on ${config.name}`, async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: config.width, height: config.height });
    await page.emulateMedia({
      reducedMotion: config.name === 'small screen' ? 'reduce' : 'no-preference',
    });
    await context.addCookies([
      { name: 'command-language', value: config.french ? 'fr' : 'en', url: baseURL! },
    ]);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Exercise real pages without changing the user's saved onboarding preference.
    await page.route('**/api/settings/preferences', async (route) => {
      if (route.request().method() === 'PATCH') {
        expect(route.request().postDataJSON()).toMatchObject({ onboardingCompleted: true });
        await route.fulfill({ json: { id: 'preferences' } });
      } else await route.continue();
    });
    // Force a visible loading interval to catch the former centered fallback.
    await page.route(/\?_rsc=/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.continue();
    });
    await startTour(page, config.french);
    const dialog = page.getByRole('dialog');
    for (let step = 0; step < targets.length; step++) {
      await expect(dialog).toHaveAttribute('data-step', String(step));
      await expect(dialog).toHaveAttribute('data-ready', 'true');
      const target = targets[step];
      const navigation = target.startsWith('nav-');
      const panel = page.locator('.tour-panel');
      await expect(panel).toBeVisible();
      await expect(panel).toHaveCSS('opacity', '1');
      // Wait for ResizeObserver to settle after translations wrap.
      await expect
        .poll(async () =>
          panel.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
          }),
        )
        .toBe(true);
      const hole = page.locator('.tour-shade mask rect[fill="black"]');
      const box = await hole.evaluate((el) => ({
        x: +el.getAttribute('x')!,
        y: +el.getAttribute('y')!,
        width: +el.getAttribute('width')!,
        height: +el.getAttribute('height')!,
      }));
      expect(box.width).toBeGreaterThan(0);
      expect(box.y + box.height).toBeLessThanOrEqual(config.height);
      if (!navigation) {
        const header = await page.locator('.topbar').boundingBox();
        expect(header!.y + header!.height).toBeLessThanOrEqual(box.y);
        const panelBox = await panel.boundingBox();
        expect(panelBox!.y >= box.y + box.height || panelBox!.x >= box.x + box.width).toBe(true);
      }
      if (step === 0) {
        for (let i = 0; i < 6; i++) {
          await page.keyboard.press('Tab');
          expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
        }
        const results = await new AxeBuilder({ page }).include('.tour-dialog').analyze();
        expect(results.violations.map((v) => v.id)).toEqual([]);
      }
      if (step === 2) {
        await dialog
          .getByRole('button', { name: config.french ? 'Étape précédente' : 'Previous step' })
          .click();
        await expect(dialog).toHaveAttribute('data-step', '1');
        await dialog
          .getByRole('button', { name: config.french ? 'Suivant' : 'Next', exact: true })
          .click();
        await expect(dialog).toHaveAttribute('data-step', '2');
      }
      if (navigation) {
        await expect(
          dialog.getByRole('button', { name: config.french ? 'Suivant' : 'Next', exact: true }),
        ).toHaveCount(0);
        const before = await panel.evaluate((el) => ({ left: el.style.left, top: el.style.top }));
        await page.evaluate(() => {
          const samples: { left: string; top: string; hidden: boolean }[] = [];
          const started = performance.now();
          (window as unknown as { tourSamples: typeof samples }).tourSamples = samples;
          const sample = () => {
            const dialog = document.querySelector('.tour-dialog');
            const panel = document.querySelector<HTMLElement>('.tour-panel');
            if (panel && dialog && !dialog.hasAttribute('data-ready'))
              samples.push({
                left: panel.style.left,
                top: panel.style.top,
                hidden: getComputedStyle(panel).visibility === 'hidden',
              });
            if (dialog && performance.now() - started < 3000) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
        const hit = page.locator('.tour-navigation-hit');
        if (step === 0) {
          await hit.focus();
          await page.keyboard.press('Enter');
        } else await hit.click();
        await expect(dialog).toHaveAttribute('data-step', String(step + 1));
        await expect(dialog).toHaveAttribute('data-ready', 'true');
        const samples = await page.evaluate(
          () =>
            (window as unknown as { tourSamples: { left: string; top: string; hidden: boolean }[] })
              .tourSamples,
        );
        if (step === 0) expect(samples.length).toBeGreaterThan(0);
        for (const sample of samples) expect(sample).toEqual({ ...before, hidden: true });
      } else {
        const next = dialog.getByRole('button', {
          name:
            step === targets.length - 1
              ? config.french
                ? 'Prêt à commencer'
                : 'Ready to begin'
              : config.french
                ? 'Suivant'
                : 'Next',
          exact: true,
        });
        if (step === 1 && config.name !== 'small screen') {
          const previousTitle = await dialog.locator('h2').textContent();
          const fading = await next.evaluate(async (button: HTMLButtonElement) => {
            button.click();
            await new Promise((resolve) => setTimeout(resolve, 80));
            const dialog = document.querySelector('.tour-dialog')!;
            const panel = document.querySelector('.tour-panel')!;
            return {
              step: dialog.getAttribute('data-step'),
              title: panel.querySelector('h2')!.textContent,
              opacity: Number(getComputedStyle(panel).opacity),
            };
          });
          expect(fading.step).toBe('1');
          expect(fading.title).toBe(previousTitle);
          expect(fading.opacity).toBeGreaterThan(0);
          expect(fading.opacity).toBeLessThan(1);
        } else await next.click();
      }
    }
    await expect(dialog).not.toBeVisible();
    expect(errors).toEqual([]);
    // Replaying is always available; Escape exits without touching course records.
    await startTour(page, config.french);
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
}

test('guided tour: skip to the next page from inside a page', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(60_000);
  await context.addCookies([{ name: 'command-language', value: 'en', url: baseURL! }]);
  await page.route('**/api/settings/preferences', async (route) => {
    if (route.request().method() === 'PATCH') await route.fulfill({ json: { id: 'preferences' } });
    else await route.continue();
  });
  await startTour(page);
  const dialog = page.getByRole('dialog');
  const skip = page.getByTestId('tour-skip-page');
  // Sidebar instructions keep their single action; no skip there.
  await expect(dialog).toHaveAttribute('data-step', '0');
  await expect(dialog).toHaveAttribute('data-ready', 'true');
  await expect(skip).toHaveCount(0);
  await page.locator('.tour-navigation-hit').click();
  await expect(dialog).toHaveAttribute('data-step', '1');
  await expect(dialog).toHaveAttribute('data-ready', 'true');
  const results = await new AxeBuilder({ page }).include('.tour-dialog').analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  // From Courses, jump straight to the first Calendar spotlight.
  await expect(skip).toHaveText('Skip to Calendar');
  await skip.click();
  await expect(dialog).toHaveAttribute('data-step', String(targets.indexOf('calendar-connect')));
  await expect(dialog).toHaveAttribute('data-ready', 'true');
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(skip).toHaveText('Skip to Tasks');
  await skip.click();
  await expect(dialog).toHaveAttribute('data-step', String(targets.indexOf('task-add')));
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(dialog).toHaveAttribute('data-ready', 'true');
  await skip.click();
  await expect(dialog).toHaveAttribute('data-step', String(targets.indexOf('grades-add')));
  await expect(dialog).toHaveAttribute('data-ready', 'true');
  await expect(skip).toHaveText('Skip to Home');
  await skip.click();
  // The last page has nowhere further to skip to.
  await expect(dialog).toHaveAttribute('data-step', String(targets.indexOf('focus')));
  await expect(dialog).toHaveAttribute('data-ready', 'true');
  await expect(skip).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
