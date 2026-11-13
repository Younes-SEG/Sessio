import { request } from '@playwright/test';

// The smoke suite starts from an empty disposable database, not the owner's
// previously onboarded workspace. Exercise the normal welcome action first.
export default async function setup() {
  const url = new URL(process.env.DATABASE_URL || 'http://invalid');
  if (
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    !/^\/command_ci_[a-z0-9_]+$/.test(url.pathname)
  )
    throw new Error('Smoke setup requires a disposable CI database.');
  const api = await request.newContext({ baseURL: 'http://127.0.0.1:3100' });
  try {
    const response = await api.patch('/api/settings/preferences', {
      data: { onboardingCompleted: true },
    });
    if (!response.ok()) throw new Error('Could not prepare the smoke-test workspace.');
    const semester = await api.post('/api/semesters', {
      data: {
        name: 'CI accessibility fixture',
        startDate: '2090-09-01',
        endDate: '2090-12-31',
        isActive: false,
      },
    });
    if (!semester.ok()) throw new Error('Could not create the synthetic test semester.');
    const term = await semester.json();
    const course = await api.post('/api/courses', {
      data: { semesterId: term.id, code: 'CIT1000', name: 'Synthetic accessibility course' },
    });
    if (!course.ok()) throw new Error('Could not create the synthetic test course.');
  } finally {
    await api.dispose();
  }
}
