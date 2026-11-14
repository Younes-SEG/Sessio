import { expect, it } from 'vitest';
import { ApiError } from '../src/lib/server/errors';
import { apiError } from '../src/lib/server/http';

it('includes a server-derived access denial reason in the JSON error body', async () => {
  const response = apiError(ApiError.accessDenied('not-invited', 'Invitation required.'));
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: 'Invitation required.',
    reason: 'not-invited',
  });
});

it('does not invent a reason for an unlabeled error', async () => {
  const response = apiError(new ApiError(403, 'Denied.'));
  expect(await response.json()).toEqual({ error: 'Denied.' });
});
