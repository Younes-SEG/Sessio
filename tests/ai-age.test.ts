import { beforeEach, expect, it, vi } from 'vitest';

const settings = { findUnique: vi.fn(), upsert: vi.fn() };
const hosted = vi.fn();
vi.mock('../src/lib/server/db', () => ({ db: { settings } }));
vi.mock('../src/lib/server/hosting', () => ({ isHosted: () => hosted() }));

const { assertAiAgeConfirmed, confirmAiAge } = await import('../src/lib/server/ai-age');

beforeEach(() => {
  vi.clearAllMocks();
});

it('does not ask the local edition for an age confirmation', async () => {
  hosted.mockReturnValue(false);
  await expect(assertAiAgeConfirmed('local')).resolves.toBeUndefined();
  expect(settings.findUnique).not.toHaveBeenCalled();
});

it('refuses hosted AI with 428 (not an access-denied 403) until confirmed', async () => {
  hosted.mockReturnValue(true);
  settings.findUnique.mockResolvedValueOnce(null);
  await expect(assertAiAgeConfirmed('user:a')).rejects.toMatchObject({ status: 428 });
  settings.findUnique.mockResolvedValueOnce({ aiAgeConfirmedAt: null });
  await expect(assertAiAgeConfirmed('user:a')).rejects.toMatchObject({ status: 428 });
  settings.findUnique.mockResolvedValueOnce({ aiAgeConfirmedAt: new Date() });
  await expect(assertAiAgeConfirmed('user:a')).resolves.toBeUndefined();
  expect(settings.findUnique).toHaveBeenLastCalledWith({
    where: { workspaceId: 'user:a' },
    select: { aiAgeConfirmedAt: true },
  });
});

it('records the first confirmation for the signed-in workspace only', async () => {
  const first = new Date('2026-11-15T12:00:00Z');
  settings.findUnique.mockResolvedValueOnce({ aiAgeConfirmedAt: first });
  await expect(confirmAiAge('user:a')).resolves.toBe(first);
  expect(settings.upsert).not.toHaveBeenCalled();

  settings.findUnique.mockResolvedValueOnce(null);
  settings.upsert.mockResolvedValueOnce({ aiAgeConfirmedAt: first });
  await confirmAiAge('user:b');
  expect(settings.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { workspaceId: 'user:b' },
      create: expect.objectContaining({ id: 'preferences:user:b', workspaceId: 'user:b' }),
    }),
  );
});
