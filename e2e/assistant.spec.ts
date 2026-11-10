import { test, expect } from '@playwright/test';
import type { Workspace } from '../src/lib/types';

test('chat keeps recent social and query context without sending returned calendar cards', async ({
  page,
}) => {
  const calls: { messages: { role: string; text: string }[] }[] = [];
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/api/assistant/chats') {
      return route.fulfill({
        json:
          route.request().method() === 'GET'
            ? new URL(route.request().url()).searchParams.has('id')
              ? {
                  id: '11111111-1111-4111-8111-111111111111',
                  title: '',
                  updatedAt: new Date().toISOString(),
                  entries: [],
                }
              : { chats: [] }
            : {
                id: '11111111-1111-4111-8111-111111111111',
                title: '',
                updatedAt: new Date().toISOString(),
              },
      });
    }
    const req = route.request();
    if (new URL(req.url()).pathname === '/api/assistant') {
      if (req.method() === 'GET') return route.fulfill({ json: { configured: true } });
      const body = req.postDataJSON();
      calls.push(body);
      const latest = body.messages.at(-1).text;
      const text = latest.includes('study')
        ? 'You have one study session planned.'
        : 'I’m good, thanks! How about you?';
      return route.fulfill({
        json: {
          id: body.id,
          status: 'answer',
          text,
          context: latest.includes('study')
            ? 'Completed read-only question: agendaScope=study_sessions. No changes made.'
            : text,
          ...(latest.includes('study')
            ? { items: [{ title: 'Private calendar result title', detail: 'Tomorrow at 6 PM' }] }
            : {}),
        },
      });
    }
    if (req.method() !== 'GET') return route.fulfill({ json: { ok: true } });
    return route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask Command', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Ask Command' });
  const input = panel.getByLabel('Message Command');
  for (const text of [
    'hey how are you?',
    'doing well thanks',
    'any study sessions planned?',
    'what about next week?',
    'hi again',
    'thanks again',
    'cool',
  ]) {
    await input.fill(text);
    await input.press('Enter');
    await expect(panel.getByRole('button', { name: 'New chat' })).toBeEnabled();
    await expect.poll(() => calls.at(-1)?.messages.at(-1)?.text).toBe(text);
    await expect(panel.getByRole('status')).toHaveCount(0);
  }
  expect(calls[1].messages).toHaveLength(3);
  expect(calls[3].messages.some((m) => m.text.includes('agendaScope=study_sessions'))).toBe(true);
  expect(calls[3].messages.some((m) => m.text.includes('Private calendar result title'))).toBe(
    false,
  );
  expect(calls.at(-1)!.messages.length).toBeLessThanOrEqual(11);
});

test('chat clarifies, saves, confirms and undoes without replaying earlier actions; mobile and French remain usable', async ({
  page,
  request,
}) => {
  const workspace: Workspace = await (await request.get('/api/workspace')).json();
  workspace.settings.onboardingCompleted = true;
  const calls: Record<string, unknown>[] = [];
  let refreshed = 0;
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/api/assistant/chats') {
      return route.fulfill({
        json:
          route.request().method() === 'GET'
            ? new URL(route.request().url()).searchParams.has('id')
              ? {
                  id: '11111111-1111-4111-8111-111111111111',
                  title: '',
                  updatedAt: new Date().toISOString(),
                  entries: [],
                }
              : { chats: [] }
            : {
                id: '11111111-1111-4111-8111-111111111111',
                title: '',
                updatedAt: new Date().toISOString(),
              },
      });
    }
    const url = new URL(route.request().url());
    if (url.pathname === '/api/workspace') {
      refreshed++;
      return route.fulfill({ json: workspace });
    }
    if (url.pathname === '/api/assistant') {
      if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true } });
      const body = route.request().postDataJSON();
      calls.push(body);
      if (body.action === 'undo')
        return route.fulfill({
          json: {
            id: body.id,
            status: 'undone',
            text: 'Undone. The previous state has been restored.',
            href: '/grades',
          },
        });
      if (body.action === 'confirm')
        return route.fulfill({
          json: {
            id: body.id,
            status: 'saved',
            text: 'Saved · SEG3102 · Assignment 1: 8/10',
            href: '/grades',
          },
        });
      if (body.messages.at(-1).text === 'I got 9/10')
        return route.fulfill({
          json: {
            id: body.id,
            status: 'clarify',
            text: 'Which course and assessment?',
            context: 'Which course and assessment?',
          },
        });
      if (body.messages.at(-1).text === 'Actually make it 8/10 for A1 SEG3102')
        return route.fulfill({
          json: {
            id: body.id,
            status: 'confirm',
            text: 'Replace 9/10 with 8/10?',
            href: '/grades',
          },
        });
      return route.fulfill({
        json: {
          id: body.id,
          status: 'saved',
          text: 'Saved · SEG3102 · Assignment 1: 9/10',
          href: '/grades',
        },
      });
    }
    if (route.request().method() !== 'GET')
      return route.fulfill({ json: { ok: true, updates: [], automaticGrades: [] } });
    return route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask Command', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Ask Command' });
  await expect(panel).toBeVisible();
  await expect(
    panel.getByText('Chats are saved privately in your workspace', { exact: false }),
  ).toBeVisible();
  await expect(panel.getByText('until you delete them', { exact: false })).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Privacy details' })).toHaveAttribute(
    'href',
    '/legal/privacy',
  );
  await panel
    .getByRole('button', { name: 'I got 9/10 on Assignment 1 in SEG3102.', exact: true })
    .click();
  expect(calls).toHaveLength(0); // Examples fill the input; they do not save anything.
  const input = panel.getByLabel('Message Command');
  await input.fill('I got 9/10');
  await input.press('Enter');
  await expect(panel.getByText('Which course and assessment?', { exact: true })).toBeVisible();
  await input.fill('A1 of SEG3102');
  await input.press('Enter');
  await expect(panel.getByText('Saved · SEG3102 · Assignment 1: 9/10')).toBeVisible();
  expect(calls[1].messages as unknown[]).toHaveLength(3);
  expect(refreshed).toBeGreaterThan(0);
  await input.fill('Actually make it 8/10 for A1 SEG3102');
  await input.press('Enter');
  await expect(panel.getByRole('button', { name: 'Confirm change' })).toBeVisible();
  expect(calls[2].messages as unknown[]).toHaveLength(1);
  await panel.getByRole('button', { name: 'Confirm change' }).click();
  await expect(panel.getByText('Saved · SEG3102 · Assignment 1: 8/10')).toBeVisible();
  await panel.getByRole('button', { name: 'Undo', exact: true }).last().click();
  await expect(panel.getByText('Undone. The previous state has been restored.')).toBeVisible();
  await page.screenshot({ path: 'artifacts/assistant/desktop.png' });
  await panel.getByRole('button', { name: 'Close dialog' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.topbar').getByRole('button', { name: 'Passer en français' }).click();
  await page.getByRole('button', { name: 'Demander à Command', exact: true }).click();
  const french = page.getByRole('dialog', { name: 'Demander à Command' });
  await expect(french.getByLabel('Message à Command')).toBeVisible();
  await french.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const box = await french.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  expect(box!.y + box!.height).toBeLessThanOrEqual(845);
  await page.screenshot({ path: 'artifacts/assistant/mobile.png' });
  await french.getByRole('button', { name: 'Fermer la fenêtre' }).click();
  await page.screenshot({ path: 'artifacts/assistant/mobile-header.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
