import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('auth controls fit a narrow dark layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/auth/sign-up');
  await page.getByRole('button', { name: 'Passer en français' }).click();
  await expect(page.getByRole('heading', { name: 'Votre espace pour étudier' })).toBeVisible();
  await expect(
    page.getByText('Réunissez vos cours, notes et projets dans votre espace privé.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Afficher le mot de passe' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer un compte' })).toBeVisible();
  await expect(page.getByText('Vos cours. Vos projets. Un peu plus de clarté.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Politiques' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/auth-mobile.png', fullPage: true });
});

// Run with playwright.auth.config.ts, which never connects to the real provider.
for (const path of ['sign-in', 'sign-up', 'reset-password']) {
  test(`${path} can reveal and hide a password without submitting`, async ({ page }) => {
    let requests = 0;
    await page.route('**/api/auth/**', async (route) => {
      requests++;
      await route.fulfill({ json: { status: true } });
    });
    await page.goto(`/auth/${path}${path === 'reset-password' ? '?token=synthetic' : ''}`);
    const password = page.locator('input[name="password"]');
    await password.fill('Synthetic-only-123!');
    await expect(password).toHaveAttribute('type', 'password');
    const show = page.getByRole('button', { name: 'Show password', exact: true });
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue('Synthetic-only-123!');
    expect(requests).toBe(0);
    await expect(page.locator('nav').getByRole('link', { name: 'Terms', exact: true })).toHaveClass(
      /policy-link/,
    );
    await expect(
      page.locator('nav').getByRole('link', { name: 'Privacy', exact: true }),
    ).toHaveAttribute('href', '/legal/privacy');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Passer en français' }).click();
    await page.getByRole('button', { name: 'Afficher le mot de passe', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Masquer le mot de passe', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'password');
    expect(requests).toBe(0);
  });
}

test('sign out requires confirmation, supports cancellation and retains failures for retry', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/api/auth/sign-out', async (route) => {
    requests++;
    await route.fulfill({
      status: requests === 1 ? 500 : 200,
      json: requests === 1 ? { message: 'Synthetic failure' } : { success: true },
    });
  });
  await page.goto('/auth/sign-out');
  const trigger = page.getByRole('button', { name: 'Sign out', exact: true });
  await trigger.click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Stay signed in' })).toBeFocused();
  expect(requests).toBe(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Stay signed in' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(requests).toBe(0);
  await trigger.click();
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not sign out');
  expect(requests).toBe(1);
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  expect(requests).toBe(2);
});

for (const [path, heading, detail] of [
  [
    'invitation-only',
    'Command is invitation only',
    'Your email is verified, but this account has not been invited to Command.',
  ],
  [
    'account-deleting',
    'Your account is being deleted',
    'This workspace is unavailable while your account is being deleted.',
  ],
  ['access-denied', 'Access denied', 'Command could not confirm access to this workspace.'],
] as const) {
  test(`${path} explains the denial without loading a workspace`, async ({ page }) => {
    let requests = 0;
    await page.route('**/api/**', async (route) => {
      requests++;
      await route.abort();
    });
    await page.goto(`/auth/${path}`);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByText(detail, { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    expect(requests).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
