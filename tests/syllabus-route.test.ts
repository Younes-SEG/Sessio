import { syllabusDocx } from './fixtures/syllabus-docx';
import sharp from 'sharp';
import { SYLLABUS_MIME } from '../src/lib/syllabus-files';
import { beforeEach, expect, it, vi } from 'vitest';
import { POST, GET } from '../src/app/api/syllabus/preview/route';
import { db } from '../src/lib/server/db';
import { readSyllabusThroughService } from '../src/lib/server/syllabus-service';
import { syllabusPdf } from './fixtures/syllabus-pdf';

vi.mock('../src/lib/server/db', () => ({
  db: { course: { findUnique: vi.fn() }, semester: { findUnique: vi.fn() } },
}));
vi.mock('../src/lib/server/syllabus-service', () => ({
  isSyllabusServiceAvailable: async () => false,
  readSyllabusThroughService: vi.fn(),
}));
const url = 'http://127.0.0.1:3000/api/syllabus/preview';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.course.findUnique).mockResolvedValue({
    code: 'TEST101',
    name: 'Test course',
    semester: { startDate: new Date('2090-09-01'), endDate: new Date('2090-12-31') },
  } as never);
  vi.mocked(readSyllabusThroughService).mockResolvedValue({
    items: [],
    warnings: ['Nothing found'],
  });
});

it('passes original PDF bytes and only the selected course context to the model', async () => {
  const pdf = syllabusPdf([]);
  const response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-Command-Course': 'test-course' },
      body: Uint8Array.from(pdf),
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const input = vi.mocked(readSyllabusThroughService).mock.calls[0][0];
  expect(Buffer.from(input.bytes)).toEqual(pdf);
  expect(input.course).toEqual({
    code: 'TEST101',
    name: 'Test course',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
  });
  expect(input).toMatchObject({ kind: 'pdf', pages: 1 });
  expect(input.text).toBeUndefined();
  expect(db.course.findUnique).toHaveBeenCalledWith({
    where: { id: 'test-course', semester: { workspaceId: 'local' } },
    select: { code: true, name: true, semester: { select: { startDate: true, endDate: true } } },
  });
});

it('refuses missing courses and cross-origin requests before calling the model', async () => {
  let response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'Midterm 25%',
    }),
  );
  expect(response.status).toBe(400);
  response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Origin: 'https://untrusted.example' },
      body: 'Midterm 25%',
    }),
  );
  expect(response.status).toBe(403);
  vi.mocked(db.course.findUnique).mockResolvedValue(null);
  response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Command-Course': 'removed-course' },
      body: 'Midterm 25%',
    }),
  );
  expect(response.status).toBe(404);
  expect(readSyllabusThroughService).not.toHaveBeenCalled();
});

it('returns only setup availability, never the key', async () => {
  const response = await GET();
  expect(await response.json()).toEqual({ configured: false });
  expect(response.headers.get('cache-control')).toBe('no-store');
});

it('allows a new course preview with an owned term and no course', async () => {
  vi.mocked(db.semester.findUnique).mockResolvedValue({
    startDate: new Date('2090-09-01'),
    endDate: new Date('2090-12-31'),
  } as never);
  const request = () =>
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Command-Semester': 'owned-term' },
      body: 'TEST101 - Test course. Midterm 25%.',
    });
  expect((await POST(request())).status).toBe(200);
  expect(db.semester.findUnique).toHaveBeenCalledWith({
    where: { id: 'owned-term', workspaceId: 'local' },
    select: { startDate: true, endDate: true },
  });
  expect(vi.mocked(readSyllabusThroughService).mock.calls[0][0].course).toEqual({
    code: '',
    name: '',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
  });
  vi.mocked(db.semester.findUnique).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(404);
  expect(readSyllabusThroughService).toHaveBeenCalledTimes(1);
});

it.each(['docx', 'png', 'jpeg'] as const)(
  'accepts a valid %s upload with the same review-only contract',
  async (kind) => {
    const bytes =
      kind === 'docx'
        ? syllabusDocx()
        : await sharp({ create: { width: 80, height: 80, channels: 3, background: 'white' } })
            .toFormat(kind)
            .toBuffer();
    const response = await POST(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': SYLLABUS_MIME[kind], 'X-Command-Course': 'test-course' },
        body: Uint8Array.from(bytes),
      }),
    );
    expect(response.status).toBe(200);
    const input = vi.mocked(readSyllabusThroughService).mock.calls[0][0];
    expect(input.kind).toBe(kind);
    expect(input.course.code).toBe('TEST101');
    if (kind === 'docx') expect(input.text).toContain('Quiz 1');
    else expect(input.images).toHaveLength(1);
  },
);
