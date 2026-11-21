import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('saved chats reopen after refresh, keep separate conversations, and delete without replaying actions', async ({
  page,
}) => {
  type Entry = { key: string; role: string; text: string; reply?: object };
  const chats: { id: string; title: string; updatedAt: string; entries: Entry[] }[] = [];
  const sent: { conversationId: string; messages: { role: string; text: string }[] }[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/assistant/chats') {
      if (request.method() === 'GET') {
        const id = url.searchParams.get('id');
        return route.fulfill({
          json: id
            ? chats.find((chat) => chat.id === id)
            : {
                chats: [...chats]
                  .reverse()
                  .map(({ id, title, updatedAt }) => ({ id, title, updatedAt })),
              },
        });
      }
      const body = request.postDataJSON();
      if (body.action === 'delete') {
        chats.splice(
          chats.findIndex((chat) => chat.id === body.id),
          1,
        );
        return route.fulfill({ json: { ok: true } });
      }
      const chat = {
        id: crypto.randomUUID(),
        title: '',
        updatedAt: new Date().toISOString(),
        entries: [] as Entry[],
      };
      chats.push(chat);
      return route.fulfill({ json: chat });
    }
    if (url.pathname === '/api/assistant') {
      if (request.method() === 'GET') return route.fulfill({ json: { configured: true } });
      const body = request.postDataJSON();
      sent.push(body);
      const chat = chats.find((chat) => chat.id === body.conversationId)!;
      const text = body.messages.at(-1).text;
      if (!chat.title) chat.title = text;
      const reply = {
        id: body.id,
        status: 'answer',
        text: `Reply: ${text}`,
        context: `Topic: ${text}`,
      };
      chat.entries.push(
        { key: `user:${body.id}`, role: 'user', text },
        { key: body.id, role: 'assistant', text: reply.text, reply },
      );
      return route.fulfill({ json: reply });
    }
    if (request.method() !== 'GET') return route.fulfill({ json: { ok: true } });
    return route.continue();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const launch = () => page.getByRole('button', { name: 'Ask Sessio', exact: true }).click();
  await launch();
  const panel = page.getByRole('dialog', { name: 'Ask Sessio' });
  const send = async (text: string) => {
    await expect(panel.getByRole('button', { name: 'Recent chats' })).toBeEnabled();
    await panel.getByLabel('Message Sessio').fill(text);
    await panel.getByRole('button', { name: 'Send message' }).click();
    await expect(panel.getByText(`Reply: ${text}`, { exact: true })).toBeVisible();
  };
  await send('Planning my week');
  const firstId = sent[0].conversationId;
  await page.reload();
  await launch();
  await expect(panel.getByText('Reply: Planning my week', { exact: true })).toBeVisible();
  expect(sent).toHaveLength(1); // Loading history is read-only.
  await send('What about Friday?');
  expect(sent[1].conversationId).toBe(firstId);
  await panel.getByRole('button', { name: 'New chat', exact: true }).click();
  await send('A different question');
  expect(sent[2].conversationId).not.toBe(firstId);
  expect(sent[2].messages).toHaveLength(1);
  await page.setViewportSize({ width: 320, height: 740 });
  await panel.getByRole('button', { name: 'Recent chats' }).click();
  await panel.getByRole('button', { name: /^Planning my week/ }).click();
  await expect(panel.getByText('Reply: What about Friday?', { exact: true })).toBeVisible();
  expect(sent).toHaveLength(3);
  await panel.getByRole('button', { name: 'Recent chats' }).click();
  await panel.getByRole('button', { name: 'Delete chat : Planning my week', exact: true }).click();
  await expect(
    panel.getByText('Saved grades and calendar events will stay.', { exact: false }),
  ).toBeVisible();
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await panel.getByRole('button', { name: 'Keep chat' }).click();
  expect(chats).toHaveLength(2);
  await panel.getByRole('button', { name: 'Delete chat : Planning my week', exact: true }).click();
  await panel.getByRole('button', { name: 'Delete conversation', exact: true }).click();
  await expect(panel.getByText('Reply: Planning my week', { exact: true })).toHaveCount(0);
  expect(chats).toHaveLength(1);
  expect(sent).toHaveLength(3);
  await page.reload();
  await launch();
  await expect(panel.getByText('Reply: A different question', { exact: true })).toBeVisible();
});
