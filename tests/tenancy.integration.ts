import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { Client } from 'pg';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';

// The identity substitute exists only in this test. Production always uses Neon Auth.
const identity = vi.hoisted(() => ({ current: 'local' }));
vi.mock('../src/lib/server/auth', () => ({ requireWorkspaceId: async () => identity.current }));
import { db } from '../src/lib/server/db';
import { saveEntity, deleteEntity } from '../src/lib/server/mutations';
import { getWorkspace } from '../src/lib/server/workspace';
import { eraseWorkspace, exportWorkspace } from '../src/lib/server/privacy';
import { importSyllabus } from '../src/lib/server/syllabus-import';
import { applyCalendarFeed, syncSubscription } from '../src/lib/server/calendar-subscriptions';
import { ensureStudyTasks } from '../src/lib/server/study-tasks';
import { retireCalendarTasks } from '../src/lib/server/calendar-reconcile';
import { parseCalendarFeed } from '../src/lib/calendar-feed';
import { POST as calendarChange } from '../src/app/api/calendar-subscriptions/route';
import { beginGmail, finishGmail } from '../src/lib/server/gmail-oauth';
import {
  emailOverview,
  syncEmail,
  reviewEmail,
  gradeRevision,
  deadlineRevision,
  disconnectEmail,
} from '../src/lib/server/email-updates';
import { GMAIL_SCOPE, sealGmail } from '../src/lib/server/gmail-client';
import { GMAIL_NOTICE, scopedGmailQuery } from '../src/lib/email-grades';

const original = process.env.DATABASE_URL;

function configureTestGmail() {
  vi.stubEnv('GOOGLE_GMAIL_CLIENT_ID', 'test-client');
  vi.stubEnv('GOOGLE_GMAIL_CLIENT_SECRET', 'test-secret');
  vi.stubEnv('GMAIL_TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64'));
  vi.stubEnv('GOOGLE_GMAIL_REDIRECT_URI', 'http://127.0.0.1:3000/api/email/callback');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('COMMAND_HOSTED', 'false');
}

it('resumes an old email page without skipping emails that arrived during the pause', async () => {
  configureTestGmail();
  identity.current = 'gmail-pagination';
  const cutoff = Math.floor(Date.now() / 1000) - 7 * 86400;
  const queries: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/token')) return Response.json({ access_token: 'access' });
      queries.push(parsed.searchParams.get('q') || '');
      return Response.json({ messages: [] });
    }),
  );
  try {
    await db.gmailConnection.create({
      data: {
        workspaceId: identity.current,
        email: 'student@example.test',
        refreshToken: sealGmail('test-refresh', identity.current),
        query: 'label:School',
        pageToken: 'old-page',
        pageQuery: `${scopedGmailQuery('label:School')} after:${cutoff - 30 * 86400} before:${cutoff}`,
      },
    });
    await syncEmail();
    expect(
      (
        await db.gmailConnection.findUniqueOrThrow({ where: { workspaceId: identity.current } })
      ).lastCheckedAt?.getTime(),
    ).toBe(cutoff * 1000);
    await syncEmail();
    expect(queries[1]).toContain(`after:${cutoff - 2 * 86400}`);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

it('binds Gmail OAuth to the initiating browser and workspace, and rejects reuse or erased state', async () => {
  configureTestGmail();
  identity.current = 'gmail-oauth';
  const fetcher = vi.fn(async (url: string | URL) => {
    if (String(url).includes('/token'))
      return Response.json({
        access_token: 'access',
        refresh_token: 'private-refresh',
        scope: GMAIL_SCOPE,
      });
    return Response.json({ emailAddress: 'student@example.test' });
  });
  vi.stubGlobal('fetch', fetcher);
  try {
    await expect(
      beginGmail({ consent: GMAIL_NOTICE }, 'https://wrong.example'),
    ).rejects.toMatchObject({ status: 400 });
    const start = await beginGmail({ consent: GMAIL_NOTICE }, 'http://127.0.0.1:3000');
    expect(new URL(start.url).searchParams.get('code_challenge_method')).toBe('S256');
    expect(new URL(start.url).searchParams.get('scope')).toBe(GMAIL_SCOPE);
    await expect(finishGmail('code', start.state, 'wrong')).rejects.toMatchObject({ status: 400 });
    identity.current = 'gmail-other';
    await expect(finishGmail('code', start.state, start.state)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetcher).not.toHaveBeenCalled();
    identity.current = 'gmail-oauth';
    await finishGmail('code', start.state, start.state);
    const saved = await db.gmailConnection.findUniqueOrThrow({
      where: { workspaceId: identity.current },
    });
    expect(saved.refreshToken).not.toContain('private-refresh');
    expect((await emailOverview()).connection?.email).toBe('student@example.test');
    expect(JSON.stringify(await exportWorkspace())).not.toContain(saved.refreshToken);
    await db.emailUpdate.create({
      data: {
        connectionId: saved.id,
        messageId: 'keep-on-reconnect',
        subject: 'Grade released',
        sender: 'Brightspace',
        receivedAt: new Date(),
        excerpt: 'Grade available',
      },
    });
    const reconnect = await beginGmail({ consent: GMAIL_NOTICE }, 'http://127.0.0.1:3000');
    await finishGmail('new-code', reconnect.state, reconnect.state);
    expect((await emailOverview()).updates).toHaveLength(1);
    expect(
      (await db.gmailConnection.findUniqueOrThrow({ where: { workspaceId: identity.current } })).id,
    ).toBe(saved.id);
    await expect(finishGmail('code', start.state, start.state)).rejects.toMatchObject({
      status: 400,
    });
    const erased = await beginGmail({ consent: GMAIL_NOTICE }, 'http://127.0.0.1:3000');
    await eraseWorkspace();
    await expect(finishGmail('code', erased.state, erased.state)).rejects.toMatchObject({
      status: 400,
    });
    expect(await db.gmailConnection.count({ where: { workspaceId: identity.current } })).toBe(0);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

it('deduplicates Gmail notifications, isolates them, and only saves reviewed scores with stale-grade protection', async () => {
  configureTestGmail();
  identity.current = 'gmail-review';
  try {
    const term = await saveEntity('semesters', {
      name: 'Email term',
      startDate: '2090-09-01',
      endDate: '2090-12-31',
    });
    const course = await saveEntity('courses', {
      semesterId: term.id,
      code: 'SEG3102',
      name: 'Email course',
    });
    const assessment = await saveEntity('assessments', {
      courseId: course.id,
      name: 'Lab 1',
      type: 'LAB',
      weight: 10,
    });
    await db.gmailConnection.create({
      data: {
        workspaceId: identity.current,
        email: 'student@example.test',
        refreshToken: sealGmail('test-refresh', identity.current),
        query: 'label:School',
      },
    });
    const fetcher = vi.fn(async (url: string | URL) => {
      const path = new URL(url).pathname;
      if (path.endsWith('/token')) return Response.json({ access_token: 'access' });
      if (path.endsWith('/messages'))
        return Response.json({ messages: [{ id: 'msg1' }, { id: 'msg2' }] });
      if (path.endsWith('/revoke')) return new Response('', { status: 200 });
      const release = path.endsWith('/msg2');
      return Response.json({
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: 'SEG3102 Lab 1 grade' },
            { name: 'From', value: 'Brightspace <school@example.test>' },
          ],
          body: {
            data: Buffer.from(
              release ? 'Your grade is available on Brightspace.' : 'Score: 18/20',
            ).toString('base64url'),
          },
        },
      });
    });
    vi.stubGlobal('fetch', fetcher);
    await syncEmail();
    await syncEmail();
    let overview = await emailOverview();
    expect(overview.updates).toHaveLength(2);
    const message = overview.updates.find((m) => m.score === 18)!;
    expect(message.suggestedAssessmentId).toBe(assessment.id);
    expect(overview.updates.find((m) => m.score === null)).toBeDefined();
    const before = await db.assessment.findUniqueOrThrow({ where: { id: assessment.id } });
    expect(before.score).toBeNull();
    const apply = {
      action: 'apply',
      id: message.id,
      assessmentId: assessment.id,
      score: 18,
      maxScore: 20,
      expectedRevision: gradeRevision(before),
    };
    identity.current = 'gmail-review-other';
    expect((await emailOverview()).updates).toHaveLength(0);
    await expect(reviewEmail(apply)).rejects.toMatchObject({ status: 404 });
    identity.current = 'gmail-review';
    await db.assessment.update({
      where: { id: assessment.id },
      data: { score: 19, maxScore: 20, status: 'GRADED' },
    });
    await expect(reviewEmail(apply)).rejects.toMatchObject({ status: 409 });
    expect((await db.assessment.findUniqueOrThrow({ where: { id: assessment.id } })).score).toBe(
      19,
    );
    const current = await db.assessment.findUniqueOrThrow({ where: { id: assessment.id } });
    await reviewEmail({ ...apply, expectedRevision: gradeRevision(current) });
    expect(await db.assessment.findUnique({ where: { id: assessment.id } })).toMatchObject({
      score: 18,
      maxScore: 20,
      status: 'GRADED',
      weight: 10,
    });
    await expect(
      reviewEmail({ ...apply, expectedRevision: gradeRevision(current) }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await db.emailUpdate.findUniqueOrThrow({ where: { id: message.id } })).excerpt).toBe(
      '',
    );
    overview = await emailOverview();
    await reviewEmail({ action: 'dismiss', id: overview.updates[0].id });
    await syncEmail();
    expect((await emailOverview()).updates).toHaveLength(0);
    const fetchCount = fetcher.mock.calls.length;
    await syncEmail(true);
    expect(fetcher.mock.calls.length).toBe(fetchCount);
    await disconnectEmail();
    expect((await emailOverview()).connection).toBeNull();
    expect((await db.assessment.findUniqueOrThrow({ where: { id: assessment.id } })).score).toBe(
      18,
    );
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
it('matches an already imported activity summary to the graded lab without changing saved grades', async () => {
  identity.current = 'gmail-summary-match';
  const semester = await saveEntity('semesters', {
    name: 'Fall',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
  });
  const course = await saveEntity('courses', {
    semesterId: semester.id,
    code: 'SEG3102',
    name: 'Design',
  });
  const lab3 = await saveEntity('assessments', {
    courseId: course.id,
    name: 'Lab 3 - Due',
    type: 'LAB',
    weight: 5,
  });
  const lab6 = await saveEntity('assessments', {
    courseId: course.id,
    name: 'Lab 6',
    type: 'LAB',
    weight: 5,
  });
  const connection = await db.gmailConnection.create({
    data: {
      workspaceId: identity.current,
      email: 'test@example.test',
      refreshToken: 'unused-test-token',
      query: 'label:School',
    },
  });
  const message = await db.emailUpdate.create({
    data: {
      connectionId: connection.id,
      messageId: 'digest',
      subject: 'Activity summary for SEG3102 A00',
      sender: 'Brightspace <school@example.test>',
      receivedAt: new Date(),
      excerpt:
        'Assignment (1)\nLab 6 - Due date is in 5 days\nGo to Assignments >>\nCourse Grades (1)\nUpdated - Lab 3\nYour grade: 9/10, A+, 4.5/5% of final grade\nGo to Grades >>',
      score: 9,
      maxScore: 10,
      suggestedAssessmentId: lab6.id,
    },
  });
  expect((await emailOverview()).updates.find((m) => m.id === message.id)).toMatchObject({
    suggestedAssessmentId: lab3.id,
    score: 9,
    maxScore: 10,
  });
  expect((await db.assessment.findUniqueOrThrow({ where: { id: lab3.id } })).score).toBeNull();
  expect((await db.assessment.findUniqueOrThrow({ where: { id: lab6.id } })).score).toBeNull();
  // The first implementation stored only a score line. Recover source context
  // even when that old message is outside the next Gmail search result page.
  configureTestGmail();
  try {
    await db.gmailConnection.update({
      where: { id: connection.id },
      data: { refreshToken: sealGmail('test-refresh', identity.current) },
    });
    await db.emailUpdate.update({
      where: { id: message.id },
      data: { excerpt: 'Your grade: 9/10', suggestedAssessmentId: null },
    });
    const fetcher = vi.fn(async (url: string | URL) => {
      const path = new URL(url).pathname;
      if (path.endsWith('/token')) return Response.json({ access_token: 'access' });
      if (path.endsWith('/messages')) return Response.json({ messages: [] });
      return Response.json({
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: message.subject },
            { name: 'From', value: message.sender },
          ],
          body: { data: Buffer.from(message.excerpt).toString('base64url') },
        },
      });
    });
    vi.stubGlobal('fetch', fetcher);
    await syncEmail();
    expect(
      (await emailOverview()).updates.find((m) => m.id === message.id)?.suggestedAssessmentId,
    ).toBe(lab3.id);
    expect(await db.emailUpdate.count({ where: { connectionId: connection.id } })).toBe(1);
    expect((await db.assessment.findUniqueOrThrow({ where: { id: lab3.id } })).score).toBeNull();
    expect(
      (await db.emailUpdate.findUniqueOrThrow({ where: { id: message.id } })).excerpt,
    ).toContain('Updated - Lab 3');
    const reads = () =>
      fetcher.mock.calls.filter(([url]) => new URL(url).pathname.endsWith('/messages/digest'))
        .length;
    expect(reads()).toBe(1);
    await syncEmail();
    expect(reads()).toBe(1);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
  identity.current = 'other-summary-workspace';
  expect((await emailOverview()).updates).toHaveLength(0);
});
it('separates school updates, filters legacy noise, and reviews deadline changes without altering grades', async () => {
  configureTestGmail();
  identity.current = 'gmail-announcements';
  try {
    const semester = await saveEntity('semesters', {
      name: 'Fall',
      startDate: '2090-09-01',
      endDate: '2090-12-31',
    });
    const course = await saveEntity('courses', {
      semesterId: semester.id,
      code: 'SEG3102',
      name: 'Design',
    });
    const assessment = await saveEntity('assessments', {
      courseId: course.id,
      name: 'Lab 1',
      type: 'LAB',
      weight: 10,
      score: 18,
      maxScore: 20,
      status: 'GRADED',
      dueDate: '2090-11-01T20:00:00Z',
    });
    const connection = await db.gmailConnection.create({
      data: {
        workspaceId: identity.current,
        email: 'test@example.test',
        refreshToken: sealGmail('test-refresh', identity.current),
        query: 'label:School',
      },
    });
    await db.emailUpdate.create({
      data: {
        connectionId: connection.id,
        messageId: 'legacy-noise',
        subject: 'Meeting notes',
        sender: 'personal@example.test',
        excerpt: 'Tomorrow is fine.',
        receivedAt: new Date(),
      },
    });
    const samples: Record<string, [string, string]> = {
      notice: ['SEG3102 New announcement', 'Bring your laptop to the next lecture.'],
      deadline: ['SEG3102 Lab 1 deadline extended', 'Now due November 2, 2090 at 23:59.'],
      noise: ['Your shopping receipt', 'Enjoy your purchase.'],
      grade: ['SEG3102 Lab 1 grade published', 'Score: 18/20'],
    };
    const fetcher = vi.fn(async (url: string | URL) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/token')) return Response.json({ access_token: 'access' });
      if (parsed.pathname.endsWith('/messages')) {
        expect(parsed.searchParams.get('q')).toContain('brightspace');
        return Response.json({ messages: Object.keys(samples).map((id) => ({ id })) });
      }
      const [subject, body] = samples[parsed.pathname.split('/').pop()!];
      return Response.json({
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: subject },
            { name: 'From', value: 'Brightspace <school@example.test>' },
          ],
          body: { data: Buffer.from(body).toString('base64url') },
        },
      });
    });
    vi.stubGlobal('fetch', fetcher);
    await syncEmail();
    const updates = (await emailOverview()).updates;
    expect(updates.map((row) => row.kind).sort()).toEqual([
      'ANNOUNCEMENT',
      'ASSESSMENT_CHANGE',
      'GRADE',
    ]);
    const ignored = await db.emailUpdate.findUniqueOrThrow({
      where: { connectionId_messageId: { connectionId: connection.id, messageId: 'noise' } },
    });
    expect(ignored).toMatchObject({ status: 'IGNORED', subject: '', sender: '', excerpt: '' });
    const before = await db.assessment.findUniqueOrThrow({ where: { id: assessment.id } });
    expect(before.dueDate?.toISOString()).toBe('2090-11-01T20:00:00.000Z');
    const change = updates.find((row) => row.kind === 'ASSESSMENT_CHANGE')!;
    identity.current = 'another-workspace';
    await expect(reviewEmail({ action: 'read', id: change.id })).rejects.toMatchObject({
      status: 404,
    });
    identity.current = 'gmail-announcements';
    await expect(
      reviewEmail({ action: 'read', id: updates.find((row) => row.kind === 'GRADE')!.id }),
    ).rejects.toMatchObject({ status: 400 });
    await reviewEmail({ action: 'read', id: change.id });
    const firstRead = await db.emailUpdate.findUniqueOrThrow({ where: { id: change.id } });
    await reviewEmail({ action: 'read', id: change.id });
    expect(await db.emailUpdate.findUniqueOrThrow({ where: { id: change.id } })).toMatchObject({
      status: 'READ',
      excerpt: firstRead.excerpt,
      reviewedAt: firstRead.reviewedAt,
    });
    expect((await emailOverview()).updates.find((row) => row.id === change.id)?.read).toBe(true);
    expect(await db.assessment.findUniqueOrThrow({ where: { id: assessment.id } })).toMatchObject({
      dueDate: before.dueDate,
      score: 18,
      maxScore: 20,
      weight: 10,
    });
    expect(change.proposedDeadline).toEqual({ date: '2090-11-02', time: '23:59' });
    expect(change.suggestedAssessmentId).toBe(assessment.id);
    const apply = {
      action: 'apply-deadline',
      id: change.id,
      assessmentId: assessment.id,
      dueDate: '2090-11-03T04:59:00Z',
      expectedRevision: deadlineRevision(before),
    };
    identity.current = 'another-workspace';
    await expect(reviewEmail(apply)).rejects.toMatchObject({ status: 404 });
    identity.current = 'gmail-announcements';
    await expect(
      reviewEmail({ ...apply, id: updates.find((row) => row.kind === 'GRADE')!.id }),
    ).rejects.toMatchObject({ status: 400 });
    await db.assessment.update({
      where: { id: assessment.id },
      data: { dueDate: new Date('2090-11-02T20:00:00Z') },
    });
    await expect(reviewEmail(apply)).rejects.toMatchObject({ status: 409 });
    const current = await db.assessment.findUniqueOrThrow({ where: { id: assessment.id } });
    await reviewEmail({ ...apply, expectedRevision: deadlineRevision(current) });
    expect(await db.assessment.findUniqueOrThrow({ where: { id: assessment.id } })).toMatchObject({
      dueDate: new Date(apply.dueDate),
      score: 18,
      maxScore: 20,
      weight: 10,
      status: 'GRADED',
    });
    await expect(
      reviewEmail({ ...apply, expectedRevision: deadlineRevision(current) }),
    ).rejects.toMatchObject({ status: 409 });
    const fetchCount = fetcher.mock.calls.length;
    await syncEmail();
    expect(fetcher.mock.calls.length - fetchCount).toBe(2); // Tokens and ID list only; ignored messages aren't reread.
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

const name = `command_tenancy_test_${randomBytes(8).toString('hex')}`;
let admin: Client;
let disposable: Client;
let created = false;
beforeAll(async () => {
  if (!original || !/^command_tenancy_test_[a-f0-9]{16}$/.test(name))
    throw new Error('Invalid disposable database configuration');
  // Avoid inadvertently provisioning test databases in the deployed service.
  const url = new URL(original);
  if (!['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Run tenancy checks against local PostgreSQL');
  admin = new Client({ connectionString: original });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  process.env.DATABASE_URL = url.toString();
  disposable = new Client({ connectionString: process.env.DATABASE_URL });
  await disposable.connect();
  for (const entry of readdirSync('prisma/migrations', { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    await disposable.query(readFileSync(`prisma/migrations/${entry.name}/migration.sql`, 'utf8'));
  }
  const check = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  expect(check[0].name).toBe(name);
});
afterAll(async () => {
  await db.$disconnect();
  await disposable?.end();
  process.env.DATABASE_URL = original;
  if (created && /^command_tenancy_test_[a-f0-9]{16}$/.test(name))
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin?.end();
});

it('creates a syllabus course and its assessments atomically with ownership and duplicate checks', async () => {
  identity.current = 'user:syllabus-new';
  const term = await saveEntity('semesters', {
    name: 'Import term',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
    isActive: true,
  });
  const otherTerm = await saveEntity('semesters', {
    name: 'Other term',
    startDate: '2091-01-01',
    endDate: '2091-04-30',
  });
  const newCourse = { semesterId: term.id, code: 'new101', name: 'Imported course' };
  const item = {
    existingId: null,
    name: 'Midterm',
    type: 'MIDTERM',
    dueDate: null,
    weight: 25,
    source: 'Midterm 25%',
  };
  await expect(importSyllabus({ newCourse, reviewed: false, items: [item] })).rejects.toBeDefined();
  identity.current = 'user:outsider';
  await expect(importSyllabus({ newCourse, reviewed: true, items: [item] })).rejects.toMatchObject({
    status: 404,
  });
  identity.current = 'user:syllabus-new';
  await expect(
    importSyllabus({
      newCourse,
      reviewed: true,
      items: [
        { ...item, weight: 70 },
        { ...item, name: 'Final', weight: 50 },
      ],
    }),
  ).rejects.toMatchObject({ status: 400 });
  expect(await db.course.count({ where: { semesterId: term.id } })).toBe(0);
  const result = await importSyllabus({ newCourse, reviewed: true, items: [item] });
  expect(result).toMatchObject({ courseCreated: true, created: 1, updated: 0 });
  const imported = (await getWorkspace()).courses.find((c) => c.id === result.courseId)!;
  expect(imported.syllabusImportedAt).toEqual(expect.any(String));
  expect(imported.syllabusImportDetected).toBe(true);
  expect(await db.course.findUnique({ where: { id: result.courseId } })).toMatchObject({
    code: 'NEW101',
    semesterId: term.id,
  });
  expect(await db.assessment.findFirst({ where: { courseId: result.courseId } })).toMatchObject({
    name: 'Midterm',
    weight: 25,
  });
  await expect(importSyllabus({ newCourse, reviewed: true, items: [item] })).rejects.toMatchObject({
    status: 409,
  });
  const empty = await importSyllabus({
    newCourse: { ...newCourse, code: 'EMPTY101' },
    reviewed: true,
    items: [],
  });
  expect(empty.created).toBe(0);
  await deleteEntity('semesters', term.id);
  expect(await db.course.count({ where: { semesterId: term.id } })).toBe(0);
  expect(await db.semester.findUnique({ where: { id: otherTerm.id } })).toMatchObject({
    isActive: true,
  });
});

it('records only saved syllabus imports and preserves the status through edits and rejected imports', async () => {
  identity.current = 'syllabus-status';
  const term = await saveEntity('semesters', {
    name: 'Status term',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
  });
  const course = await saveEntity('courses', {
    semesterId: term.id,
    code: 'STATUS101',
    name: 'Status course',
  });
  const status = async () => (await getWorkspace()).courses.find((c) => c.id === course.id)!;
  expect(await status()).toMatchObject({ syllabusImportedAt: null, syllabusImportDetected: false });
  const item = {
    existingId: null,
    name: 'Midterm',
    type: 'MIDTERM',
    dueDate: null,
    weight: 25,
    source: 'Midterm 25%',
  };
  await expect(
    importSyllabus({ courseId: course.id, reviewed: false, items: [item] }),
  ).rejects.toBeDefined();
  expect((await status()).syllabusImportedAt).toBeNull();
  await importSyllabus({ courseId: course.id, reviewed: true, items: [item] });
  const first = (await status()).syllabusImportedAt;
  expect(first).toEqual(expect.any(String));
  await saveEntity('courses', { name: 'Renamed course' }, course.id);
  await expect(
    importSyllabus({
      courseId: course.id,
      reviewed: true,
      items: [{ ...item, existingId: 'missing' }],
    }),
  ).rejects.toBeDefined();
  expect((await status()).syllabusImportedAt).toBe(first);
  await db.course.update({ where: { id: course.id }, data: { syllabusImportedAt: null } });
  expect(await status()).toMatchObject({ syllabusImportedAt: null, syllabusImportDetected: true });
  identity.current = 'syllabus-status-other';
  expect((await getWorkspace()).courses).toHaveLength(0);
  await expect(
    importSyllabus({ courseId: course.id, reviewed: true, items: [item] }),
  ).rejects.toMatchObject({ status: 404 });
});

it.each(['courses', 'semesters'])(
  'deletes %s and linked work without affecting personal items or other users',
  async (entity) => {
    identity.current = `user:deletion-test-${entity}`;
    const semester = await saveEntity('semesters', {
      name: 'Deletion test',
      startDate: '2090-01-01',
      endDate: '2090-05-01',
    });
    const course = await saveEntity('courses', {
      code: 'DELETE101',
      name: 'Temporary',
      semesterId: semester.id,
    });
    const assessment = await saveEntity('assessments', {
      courseId: course.id,
      name: 'Graded work',
      status: 'GRADED',
      score: 90,
    });
    const linkedTask = await saveEntity('tasks', {
      title: 'Linked task',
      assessmentId: assessment.id,
      subtasks: [{ title: 'Step' }],
    });
    const directTask = await saveEntity('tasks', { title: 'Course task', courseId: course.id });
    const personalTask = await saveEntity('tasks', { title: 'Personal task' });
    const eventInput = {
      title: 'Event',
      startAt: '2090-02-01T12:00:00Z',
      endAt: '2090-02-01T13:00:00Z',
    };
    const linkedEvent = await saveEntity('events', { ...eventInput, courseId: course.id });
    const personalEvent = await saveEntity('events', eventInput);
    const schedule = await saveEntity('schedules', {
      courseId: course.id,
      title: 'Lecture',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:00',
    });
    identity.current = 'user:other';
    await expect(
      deleteEntity(entity, entity === 'courses' ? course.id : semester.id),
    ).rejects.toMatchObject({ status: 404 });
    expect(await db.task.findUnique({ where: { id: linkedTask.id } })).not.toBeNull();
    identity.current = `user:deletion-test-${entity}`;
    await deleteEntity(entity, entity === 'courses' ? course.id : semester.id);
    expect(await db.course.findUnique({ where: { id: course.id } })).toBeNull();
    expect(await db.assessment.findUnique({ where: { id: assessment.id } })).toBeNull();
    expect(await db.scheduleEntry.findUnique({ where: { id: schedule.id } })).toBeNull();
    expect(await db.task.count({ where: { id: { in: [linkedTask.id, directTask.id] } } })).toBe(0);
    expect(await db.subtask.count({ where: { taskId: linkedTask.id } })).toBe(0);
    expect(await db.calendarEvent.findUnique({ where: { id: linkedEvent.id } })).toBeNull();
    expect(await db.task.findUnique({ where: { id: personalTask.id } })).not.toBeNull();
    expect(await db.calendarEvent.findUnique({ where: { id: personalEvent.id } })).not.toBeNull();
  },
);

it('isolates complete workspaces, cross-references, imports, sync and erasure', async () => {
  async function populate(owner: string) {
    identity.current = owner;
    const semester = await saveEntity('semesters', {
      name: owner,
      startDate: '2090-01-01',
      endDate: '2090-05-01',
      isActive: true,
    });
    const course = await saveEntity('courses', {
      name: owner,
      code: 'TEST101',
      semesterId: semester.id,
    });
    const assessment = await saveEntity('assessments', {
      name: `${owner} grade`,
      courseId: course.id,
      status: 'GRADED',
      score: 87,
      weight: 20,
    });
    const task = await saveEntity('tasks', {
      title: `${owner} task`,
      subtasks: [{ title: `${owner} child` }],
      workspaceId: 'forged',
    });
    const event = await saveEntity('events', {
      title: `${owner} event`,
      startAt: '2090-02-01T12:00:00Z',
      endAt: '2090-02-01T13:00:00Z',
    });
    const schedule = await saveEntity('schedules', {
      courseId: course.id,
      title: owner,
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:00',
    });
    await saveEntity('settings', { displayName: owner }, 'preferences');
    const feed = await db.calendarSubscription.create({
      data: {
        workspaceId: owner,
        name: owner,
        url: 'https://calendar.example/PRIVATE-TEST-FEED',
        enabled: true,
        fromDate: new Date('2090-01-01'),
        throughDate: new Date('2090-05-01'),
        timeZone: 'UTC',
      },
    });
    return { semester, course, assessment, task, event, schedule, feed };
  }
  await populate('local');
  const alice = await populate('user:alice');
  const bob = await populate('user:bob');
  const bobBefore = JSON.stringify(await getWorkspace());
  identity.current = 'local';
  const localBefore = JSON.stringify(await getWorkspace());
  identity.current = 'user:alice';
  const exported = await exportWorkspace();
  expect(exported.workspace.semesters).toHaveLength(1);
  expect(exported.workspace.semesters[0].isActive).toBe(true);
  expect(exported.workspace.tasks[0].subtasks).toHaveLength(1);
  expect(exported.workspace.settings.displayName).toBe('user:alice');
  expect(JSON.stringify(exported)).not.toContain('user:bob');
  expect(JSON.stringify(exported)).not.toContain('PRIVATE-TEST-FEED');
  expect(exported.calendarConnections).toHaveLength(1);
  for (const [entity, entry] of [
    ['semesters', bob.semester],
    ['courses', bob.course],
    ['assessments', bob.assessment],
    ['tasks', bob.task],
    ['events', bob.event],
    ['schedules', bob.schedule],
  ] as const) {
    await expect(saveEntity(entity, {}, entry.id)).rejects.toMatchObject({ status: 404 });
    await expect(deleteEntity(entity, entry.id)).rejects.toBeDefined();
  }
  await expect(
    saveEntity('courses', { semesterId: bob.semester.id }, alice.course.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('assessments', { courseId: bob.course.id }, alice.assessment.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('tasks', { courseId: bob.course.id }, alice.task.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('tasks', { assessmentId: bob.assessment.id }, alice.task.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('events', { courseId: bob.course.id }, alice.event.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('schedules', { courseId: bob.course.id }, alice.schedule.id),
  ).rejects.toMatchObject({ status: 404 });
  const item = {
    existingId: null,
    name: 'Imported exam',
    type: 'MIDTERM',
    dueDate: null,
    weight: 10,
    source: '',
  };
  await expect(
    importSyllabus({ courseId: bob.course.id, reviewed: true, items: [item] }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    importSyllabus({
      courseId: alice.course.id,
      reviewed: true,
      items: [{ ...item, existingId: bob.assessment.id }],
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(
    await importSyllabus({ courseId: alice.course.id, reviewed: true, items: [item] }),
  ).toMatchObject({ created: 1 });
  await expect(syncSubscription(bob.feed.id)).rejects.toMatchObject({ status: 404 });
  for (const action of ['disconnect', 'forget']) {
    const response = await calendarChange(
      new Request('http://localhost/api/calendar-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
        body: JSON.stringify({ action, id: bob.feed.id }),
      }),
    );
    expect(response.ok).toBe(false);
  }
  const options = { fromDate: '2090-01-01', throughDate: '2090-05-01', timeZone: 'UTC' };
  await db.$transaction((tx) =>
    applyCalendarFeed(
      tx,
      bob.feed.id,
      { name: 'Hacked', total: 0, items: [] },
      options,
      'user:alice',
    ),
  );
  expect(
    (await db.calendarSubscription.findUniqueOrThrow({ where: { id: bob.feed.id } })).name,
  ).toBe('user:bob');
  await eraseWorkspace();
  expect((await getWorkspace()).courses).toHaveLength(0);
  expect((await getWorkspace()).tasks).toHaveLength(0);
  expect(await db.calendarSubscription.count({ where: { workspaceId: 'user:alice' } })).toBe(0);
  identity.current = 'user:bob';
  expect(JSON.stringify(await getWorkspace())).toBe(bobBefore);
  identity.current = 'local';
  expect(JSON.stringify(await getWorkspace())).toBe(localBefore);
  expect(await db.task.count({ where: { workspaceId: 'forged' } })).toBe(0);
});

it('calendar imports merge translated source identities, preserve grades, and leave planning tasks independent', async () => {
  const workspaceId = 'calendar-translations';
  const options = {
    fromDate: '2026-09-01',
    throughDate: '2026-12-31',
    timeZone: 'America/Toronto',
  };
  const term = await db.semester.create({
    data: {
      workspaceId,
      name: 'Fall',
      startDate: new Date(options.fromDate),
      endDate: new Date(options.throughDate),
      isActive: true,
    },
  });
  const course = await db.course.create({
    data: { semesterId: term.id, code: 'TST1234', name: 'Test' },
  });
  const source = 'https://school.brightspace.com/d2l/le/calendar/42/event/123/detailsview?ou=42';
  const legacy = await db.assessment.create({
    data: {
      courseId: course.id,
      name: 'Laboratoire 1 – À échéance',
      type: 'LAB',
      dueDate: new Date('2026-10-01T12:00:00Z'),
      notes: source,
      score: 18,
      maxScore: 20,
      weight: 10,
      status: 'GRADED',
    },
  });
  // Existing duplicate from the older import path, with no grade.
  const duplicate = await db.assessment.create({
    data: { courseId: course.id, name: 'Lab 1 - Due', notes: source },
  });
  const makeSubscription = (suffix: string, owner = workspaceId) =>
    db.calendarSubscription.create({
      data: {
        workspaceId: owner,
        url: 'https://school.brightspace.com/feed/' + suffix,
        name: 'Test',
        fromDate: new Date(options.fromDate),
        throughDate: new Date(options.throughDate),
        timeZone: options.timeZone,
      },
    });
  const first = await makeSubscription('en');
  await db.importedCalendarItem.create({
    data: {
      subscriptionId: first.id,
      sourceKey: 'stable@school.brightspace.com',
      assessmentId: duplicate.id,
    },
  });
  const feed = (
    title = 'Lab 1 - Due',
    uid = 'stable@school.brightspace.com',
    date = '20261001T120000Z',
  ) =>
    parseCalendarFeed(
      `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:${uid}
SUMMARY:${title}
LOCATION:TST1234 A00 Test 20269
DESCRIPTION:${source}
DTSTART:${date}
END:VEVENT
END:VCALENDAR`,
      options,
    );
  const apply = (id: string, preview = feed(), owner = workspaceId) =>
    db.$transaction((tx) => applyCalendarFeed(tx, id, preview, options, owner), {
      isolationLevel: 'Serializable',
    });
  await apply(first.id);
  expect(await db.assessment.count({ where: { courseId: course.id } })).toBe(1);
  expect(await db.assessment.findUnique({ where: { id: legacy.id } })).toMatchObject({
    score: 18,
    maxScore: 20,
    weight: 10,
    status: 'GRADED',
  });
  let tasks = await db.task.findMany({ where: { workspaceId, assessmentId: legacy.id } });
  expect(tasks).toHaveLength(0);
  const second = await makeSubscription('fr');
  await apply(second.id, feed('Laboratoire 1 – À échéance'));
  expect(await db.assessment.count({ where: { courseId: course.id } })).toBe(1);
  expect(await db.task.count({ where: { workspaceId } })).toBe(0);
  await db.task.create({
    data: {
      workspaceId,
      courseId: course.id,
      assessmentId: legacy.id,
      title: 'Prepare lab report',
      description: 'Personal notes',
      priority: 'HIGH',
      dueDate: new Date('2026-10-01T12:00:00Z'),
      status: 'IN_PROGRESS',
    },
  });
  await apply(second.id, feed('Lab 1 - Due', 'stable@school.brightspace.com', '20261003T120000Z'));
  tasks = await db.task.findMany({ where: { workspaceId } });
  expect(tasks[0]).toMatchObject({
    title: 'Prepare lab report',
    description: 'Personal notes',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: new Date('2026-10-01T12:00:00Z'),
  });
  // A regenerated UID still matches the provider event ID even if its title and date change.
  await apply(second.id, feed('Renamed assignment - Due', 'replacement-id', '20261004T120000Z'));
  expect(await db.assessment.count({ where: { courseId: course.id } })).toBe(1);
  // Deleting a task is intentional, and subsequent sync must not recreate it.
  await db.task.delete({ where: { id: tasks[0].id } });
  await apply(second.id);
  expect(await db.task.count({ where: { workspaceId } })).toBe(0);
  // Identical titles/dates are not enough evidence to merge different source events.
  const different = feed();
  different.items[0].key = 'different';
  different.items[0].description = source.replace('/123/', '/124/');
  await apply(second.id, different);
  expect(await db.assessment.count({ where: { courseId: course.id } })).toBe(2);
  const other = await makeSubscription('en', 'calendar-other-owner');
  await apply(other.id, feed(), 'calendar-other-owner');
  expect(
    await db.assessment.count({
      where: { course: { semester: { workspaceId: 'calendar-other-owner' } } },
    }),
  ).toBe(1);
  // Cancellation clears the assessment deadline without creating a task.
  different.items[0].cancelled = true;
  await apply(second.id, different);
  expect(await db.task.count({ where: { workspaceId } })).toBe(0);
  expect(
    (
      await db.assessment.findFirstOrThrow({
        where: { courseId: course.id, notes: { contains: '/124/' } },
      })
    ).dueDate,
  ).toBeNull();
  // Deleted source entries are tombstones, including when another language feed is connected.
  const mapping = await db.importedCalendarItem.findUniqueOrThrow({
    where: { subscriptionId_sourceKey: { subscriptionId: second.id, sourceKey: 'different' } },
  });
  await db.assessment.delete({ where: { id: mapping.assessmentId! } });
  await apply(second.id, { ...different, items: [{ ...different.items[0], cancelled: false }] });
  expect(await db.assessment.count({ where: { courseId: course.id } })).toBe(1);
});

it('keeps recurring deadlines separate even when Brightspace links share the same event ID', async () => {
  const workspaceId = 'recurring-calendar';
  const options = {
    fromDate: '2026-09-01',
    throughDate: '2026-12-31',
    timeZone: 'America/Toronto',
  };
  const sub = await db.calendarSubscription.create({
    data: {
      workspaceId,
      url: 'https://school.brightspace.com/recurrence',
      name: 'Test',
      timeZone: options.timeZone,
      fromDate: new Date(options.fromDate),
      throughDate: new Date(options.throughDate),
    },
  });
  const preview = parseCalendarFeed(
    `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:weekly
SUMMARY:Quiz - Due
LOCATION:TST1234 A00 Test 20269
DESCRIPTION:https://school.brightspace.com/d2l/le/calendar/42/event/99/detailsview
DTSTART:20261001T120000Z
RRULE:FREQ=WEEKLY;COUNT=2
END:VEVENT
END:VCALENDAR`,
    options,
  );
  for (let i = 0; i < 2; i++)
    await db.$transaction((tx) => applyCalendarFeed(tx, sub.id, preview, options, workspaceId));
  expect(await db.assessment.count({ where: { course: { semester: { workspaceId } } } })).toBe(2);
  expect(await db.task.count({ where: { workspaceId } })).toBe(0);
});

it('persists best-of rules atomically, isolates members, and protects them through edits and deletions', async () => {
  identity.current = 'user:best-of';
  const term = await saveEntity('semesters', {
    name: 'Rules term',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
  });
  const items = Array.from({ length: 5 }, (_, i) => ({
    clientId: `import:${i}`,
    existingId: null,
    name: `Quiz ${i + 1}`,
    type: 'QUIZ',
    dueDate: null,
    weight: null,
    source: 'Test fixture',
  }));
  const rule = {
    id: 'quizzes',
    name: 'Quizzes',
    keep: 4,
    weight: 20,
    assessmentIds: items.map((i) => i.clientId),
    source: 'Best 4 of 5 quizzes count.',
  };
  const body = {
    newCourse: { code: 'RULE101', name: 'Rules course', semesterId: term.id },
    reviewed: true,
    items,
    gradingRules: [rule],
    gradingNotes: rule.source,
  };
  const imported = await importSyllabus(body);
  let workspace = await getWorkspace();
  const course = workspace.courses.find((c) => c.id === imported.courseId)!;
  const members = workspace.assessments.filter((a) => a.courseId === course.id);
  expect(course.gradingNotes).toBe(rule.source);
  expect(course.gradingRules![0].assessmentIds.sort()).toEqual(members.map((a) => a.id).sort());
  const member = members[0];
  await saveEntity('assessments', { score: 80, status: 'GRADED' }, member.id);
  await saveEntity('courses', { notes: 'Independent course note' }, course.id);
  expect((await getWorkspace()).courses.find((c) => c.id === course.id)!.gradingRules).toHaveLength(
    1,
  );
  await expect(deleteEntity('assessments', member.id)).rejects.toThrow(/grading rule/);
  const other = await saveEntity('courses', {
    code: 'OTHER101',
    name: 'Other',
    semesterId: term.id,
  });
  await expect(saveEntity('assessments', { courseId: other.id }, member.id)).rejects.toThrow(
    /grading rule/,
  );
  await expect(
    saveEntity('courses', { gradingRules: course.gradingRules }, other.id),
  ).rejects.toThrow(/missing assessment/);
  await saveEntity('assessments', { courseId: course.id, name: 'Final', weight: 80 });
  await expect(
    saveEntity('assessments', { courseId: course.id, name: 'Too much', weight: 1 }),
  ).rejects.toThrow(/100%/);
  await expect(
    importSyllabus({
      ...body,
      newCourse: { ...body.newCourse, code: 'BAD101' },
      gradingRules: [{ ...rule, assessmentIds: ['foreign', ...rule.assessmentIds.slice(1)] }],
    }),
  ).rejects.toThrow(/missing assessment/);
  workspace = await getWorkspace();
  expect(workspace.courses.some((c) => c.code === 'BAD101')).toBe(false);
  identity.current = 'user:outsider';
  await expect(saveEntity('courses', { gradingRules: [] }, course.id)).rejects.toThrow();
  identity.current = 'user:best-of';
  await saveEntity('courses', { gradingRules: [] }, course.id);
  expect((await getWorkspace()).assessments.find((a) => a.id === member.id)!.score).toBe(80);
  await deleteEntity('assessments', member.id);
});

it('retires unchanged calendar task copies while preserving personal work and other workspaces', async () => {
  const workspaceId = 'calendar-task-cleanup';
  const term = await db.semester.create({
    data: {
      workspaceId,
      name: 'Fall',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-31'),
    },
  });
  const course = await db.course.create({
    data: { semesterId: term.id, code: 'LAB1000', name: 'Lab' },
  });
  const assessment = await db.assessment.create({
    data: {
      courseId: course.id,
      name: 'Lab 1',
      notes: 'Source notes',
      dueDate: new Date('2026-10-20'),
      score: 18,
      maxScore: 20,
      status: 'GRADED',
    },
  });
  const base = {
    workspaceId,
    courseId: course.id,
    assessmentId: assessment.id,
    title: assessment.name,
    description: assessment.notes,
    dueDate: assessment.dueDate,
    status: 'COMPLETED' as const,
    completedAt: new Date('2026-10-21'),
    calendarManaged: true,
  };
  const mirror = await db.task.create({ data: base });
  const customized = [];
  for (const change of [
    { title: 'Study for the lab' },
    { description: 'My notes' },
    { priority: 'HIGH' as const },
    { estimatedMinutes: 30 },
    { dueDate: new Date('2026-10-19') },
    { status: 'IN_PROGRESS' as const, completedAt: null },
    { subtasks: { create: { title: 'Review instructions' } } },
  ])
    customized.push(await db.task.create({ data: { ...base, ...change } }));
  const manual = await db.task.create({ data: { ...base, calendarManaged: false } });
  const other = await db.task.create({ data: { ...base, workspaceId: 'other-cleanup-owner' } });
  const cleanup = () => db.$transaction((tx) => retireCalendarTasks(tx, workspaceId));
  expect(await cleanup()).toEqual({ removed: 1, preserved: 7 });
  expect(await db.task.findUnique({ where: { id: mirror.id } })).toBeNull();
  for (const task of customized)
    expect(await db.task.findUnique({ where: { id: task.id } })).toMatchObject({
      ...task,
      calendarManaged: false,
    });
  expect(await db.task.findUnique({ where: { id: manual.id } })).toEqual(manual);
  expect(await db.task.findUnique({ where: { id: other.id } })).toEqual(other);
  expect(await db.assessment.findUnique({ where: { id: assessment.id } })).toEqual(assessment);
  expect(await cleanup()).toEqual({ removed: 0, preserved: 0 });
});

it('creates study tasks once within ten days, isolates workspaces, and respects completion, deletion and personal edits', async () => {
  const workspaceId = 'study-reminders';
  identity.current = workspaceId;
  const now = new Date('2090-10-15T16:00:00Z');
  const term = await db.semester.create({
    data: {
      workspaceId,
      name: 'Study term',
      startDate: new Date('2090-09-01'),
      endDate: new Date('2090-12-31'),
      isActive: true,
    },
  });
  const course = await db.course.create({
    data: { semesterId: term.id, code: 'SCI1000', name: 'Science' },
  });
  const exam = await db.assessment.create({
    data: {
      courseId: course.id,
      name: 'Midterm 1',
      type: 'MIDTERM',
      dueDate: new Date('2090-10-25T16:00:00Z'),
    },
  });
  const quiz = await db.assessment.create({
    data: {
      courseId: course.id,
      name: 'Quiz 1',
      type: 'QUIZ',
      dueDate: new Date('2090-10-26T16:00:00Z'),
    },
  });
  await db.assessment.create({
    data: { courseId: course.id, name: 'Lab 1', type: 'LAB', dueDate: exam.dueDate },
  });
  const sync = (at = now, owner = workspaceId) =>
    db.$transaction((tx) => ensureStudyTasks(tx, owner, at));
  await sync(now, 'other-study-owner');
  expect(await db.task.count({ where: { workspaceId } })).toBe(0);
  await Promise.all([sync(), sync(), sync()]);
  let tasks = await db.task.findMany({ where: { workspaceId } });
  expect(tasks).toHaveLength(1);
  const study = tasks[0];
  expect(study).toMatchObject({
    title: 'Study for SCI1000 — Midterm 1',
    assessmentId: exam.id,
    studyTask: true,
    calendarManaged: false,
    status: 'NOT_STARTED',
    dueDate: exam.dueDate,
  });
  // Source revisions follow through without creating new tasks.
  await db.assessment.update({
    where: { id: exam.id },
    data: { name: 'Midterm revised', dueDate: new Date('2090-10-24T16:00:00Z') },
  });
  await sync();
  expect(await db.task.findUnique({ where: { id: study.id } })).toMatchObject({
    title: 'Study for SCI1000 — Midterm revised',
    dueDate: new Date('2090-10-24T16:00:00Z'),
  });
  await saveEntity('tasks', { status: 'COMPLETED' }, study.id);
  await sync();
  expect(await db.task.findUnique({ where: { id: study.id } })).toMatchObject({
    status: 'COMPLETED',
    studyTask: true,
  });
  expect((await db.assessment.findUniqueOrThrow({ where: { id: exam.id } })).status).toBe(
    'NOT_STARTED',
  );
  await deleteEntity('tasks', study.id);
  await sync();
  expect(await db.task.count({ where: { workspaceId } })).toBe(0);
  // The next refresh after entering the window creates the next reminder.
  await sync(new Date('2090-10-16T16:00:00Z'));
  tasks = await db.task.findMany({ where: { workspaceId } });
  expect(tasks).toHaveLength(1);
  expect(tasks[0].assessmentId).toBe(quiz.id);
  await saveEntity(
    'tasks',
    { title: 'Review chapter 2', description: 'My study plan' },
    tasks[0].id,
  );
  await sync(new Date('2090-10-16T16:00:00Z'));
  expect(await db.task.findUnique({ where: { id: tasks[0].id } })).toMatchObject({
    title: 'Review chapter 2',
    description: 'My study plan',
    studyTask: false,
  });
  const final = await db.assessment.create({
    data: { courseId: course.id, name: 'Final', type: 'FINAL_EXAM', dueDate: exam.dueDate },
  });
  await sync();
  expect(await db.task.count({ where: { workspaceId, assessmentId: final.id } })).toBe(1);
  await deleteEntity('assessments', final.id);
  expect(await db.task.count({ where: { workspaceId, studyTask: true } })).toBe(0);
  identity.current = 'local';
});

it('enriches calendar assessments from bilingual syllabus names without duplicating or losing grades', async () => {
  identity.current = 'syllabus-matching';
  const term = await saveEntity('semesters', {
    name: 'Matching term',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
  });
  const course = await saveEntity('courses', {
    semesterId: term.id,
    code: 'SEG3102',
    name: 'Design',
  });
  const lab = await db.assessment.create({
    data: {
      courseId: course.id,
      name: 'Lab 1 - Due',
      type: 'LAB',
      weight: 0,
      dueDate: new Date('2090-10-22T19:00:00Z'),
      status: 'GRADED',
      score: 18.5,
      maxScore: 20,
      notes: 'Brightspace source and personal notes',
    },
  });
  const item = {
    existingId: null,
    name: 'SEG3102 Laboratoire 01',
    type: 'LAB',
    dueDate: '2090-10-20T19:00:00Z',
    weight: 2,
    source: 'Lab 1: 2%',
  };
  const payload = { courseId: course.id, reviewed: true, items: [item] };
  expect(await importSyllabus(payload)).toMatchObject({ created: 0, updated: 1 });
  expect(await db.assessment.findUnique({ where: { id: lab.id } })).toMatchObject({
    ...lab,
    weight: 2,
  });
  expect(await importSyllabus({ ...payload, items: [{ ...item, weight: 3 }] })).toMatchObject({
    created: 0,
    updated: 1,
  });
  expect(await db.assessment.count({ where: { courseId: course.id } })).toBe(1);
  expect(await db.assessment.findUnique({ where: { id: lab.id } })).toMatchObject({
    ...lab,
    weight: 2,
  });
  await expect(
    importSyllabus({ ...payload, items: [{ ...item, name: 'Lab exercises', weight: 10 }] }),
  ).rejects.toMatchObject({ status: 409 });
  // Explicitly reviewed allocation can update the weight, leaving all other fields intact.
  await importSyllabus({
    ...payload,
    items: [{ ...item, existingId: lab.id, dueDate: null, weight: 2.5 }],
  });
  expect(await db.assessment.findUnique({ where: { id: lab.id } })).toMatchObject({
    ...lab,
    weight: 2.5,
  });
  identity.current = 'local';
});

it('keeps equal category totals through calendar sync, manual additions, moves and deletion', async () => {
  identity.current = 'equal-category-owner';
  const term = await saveEntity('semesters', {
    name: 'Equal term',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
    isActive: true,
  });
  const course = await saveEntity('courses', {
    semesterId: term.id,
    code: 'EQL1234',
    name: 'Equal weights',
  });
  const other = await saveEntity('courses', {
    semesterId: term.id,
    code: 'OTH1234',
    name: 'Other',
  });
  const rules = ['LAB', 'ASSIGNMENT', 'PROJECT'].map((type) => ({
    id: type,
    name: type,
    mode: 'equal',
    assessmentType: type,
    keep: 1,
    weight: 10,
    assessmentIds: [],
    source: 'Confirmed equal split',
  }));
  // A category-only syllabus can save a lasting rule before any assessment exists.
  await importSyllabus({ courseId: course.id, reviewed: true, items: [], gradingRules: rules });
  expect(
    (await getWorkspace()).courses.find((c) => c.id === course.id)?.syllabusImportedAt,
  ).toEqual(expect.any(String));
  const options = { fromDate: '2090-09-01', throughDate: '2090-12-31', timeZone: 'UTC' };
  const feed = await db.calendarSubscription.create({
    data: {
      workspaceId: identity.current,
      url: 'https://school.brightspace.com/test-equal',
      name: 'Test',
      fromDate: new Date(options.fromDate),
      throughDate: new Date(options.throughDate),
      timeZone: 'UTC',
    },
  });
  const sync = (count: number) =>
    db.$transaction((tx) =>
      applyCalendarFeed(
        tx,
        feed.id,
        parseCalendarFeed(
          'BEGIN:VCALENDAR\nVERSION:2.0\n' +
            Array.from(
              { length: count },
              (_, i) =>
                `BEGIN:VEVENT\nUID:equal-lab-${i}@school.brightspace.com\nSUMMARY:Lab ${i + 1} - Due\nLOCATION:EQL1234 A00 Test\nDTSTART:209010${String(i + 10).padStart(2, '0')}T120000Z\nEND:VEVENT\n`,
            ).join('') +
            'END:VCALENDAR',
          options,
        ),
        options,
        identity.current,
      ),
    );
  await sync(2);
  const scoped = async () =>
    (await getWorkspace()).assessments.filter((a) => a.courseId === course.id);
  const first = (await scoped())[0];
  expect((await scoped()).map((a) => a.weight)).toEqual([5, 5]);
  await saveEntity(
    'assessments',
    { score: 18, maxScore: 20, status: 'GRADED', weight: 99 },
    first.id,
  );
  await sync(3);
  await sync(3);
  expect(await scoped()).toHaveLength(3);
  expect((await scoped()).every((a) => Math.abs(a.weight - 10 / 3) < 1e-10)).toBe(true);
  expect((await scoped()).find((a) => a.id === first.id)).toMatchObject({
    score: 18,
    maxScore: 20,
    status: 'GRADED',
    dueDate: first.dueDate,
  });
  expect((await db.assessment.findUniqueOrThrow({ where: { id: first.id } })).weight).toBe(0);
  const added = await saveEntity('assessments', {
    courseId: course.id,
    name: 'Lab 4',
    type: 'LAB',
    weight: 0,
  });
  expect((await scoped()).every((a) => a.weight === 2.5)).toBe(true);
  await saveEntity('assessments', { courseId: other.id }, added.id);
  expect((await scoped()).every((a) => Math.abs(a.weight - 10 / 3) < 1e-10)).toBe(true);
  const removable = (await scoped()).find((a) => a.id !== first.id)!;
  await deleteEntity('assessments', removable.id);
  expect((await scoped()).every((a) => a.weight === 5)).toBe(true);
  for (const type of ['ASSIGNMENT', 'PROJECT']) {
    await saveEntity('assessments', { courseId: course.id, name: `${type} 1`, type, weight: 0 });
    await importSyllabus({
      courseId: course.id,
      reviewed: true,
      items: [
        { name: `${type} 2`, type, existingId: null, weight: null, dueDate: null, source: '' },
      ],
    });
    expect((await scoped()).filter((a) => a.type === type).map((a) => a.weight)).toEqual([5, 5]);
  }
  identity.current = 'equal-outsider';
  await expect(saveEntity('courses', { gradingRules: rules }, course.id)).rejects.toMatchObject({
    status: 404,
  });
  expect((await getWorkspace()).assessments).toHaveLength(0);
  identity.current = 'equal-category-owner';
  await saveEntity('courses', { gradingRules: [] }, course.id);
  expect((await scoped()).every((a) => a.weight === 0)).toBe(true);
  expect((await scoped()).find((a) => a.id === first.id)?.score).toBe(18);
  identity.current = 'local';
});

it('remembers onboarding completion only for the signed-in workspace', async () => {
  identity.current = 'onboarding-new';
  const first = await getWorkspace();
  expect(first.settings.onboardingCompleted).toBe(false);
  await saveEntity('settings', { onboardingCompleted: true }, 'preferences');
  expect((await getWorkspace()).settings.onboardingCompleted).toBe(true);
  await saveEntity('settings', { theme: 'DARK' }, 'preferences');
  expect((await getWorkspace()).settings.onboardingCompleted).toBe(true);
  identity.current = 'onboarding-other';
  expect((await getWorkspace()).settings.onboardingCompleted).toBe(false);
  identity.current = 'local';
});
