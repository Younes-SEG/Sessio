import { expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { zipSync, strToU8 } from 'fflate';
import { inspectSyllabusUpload } from '../src/lib/server/syllabus-text';
import { syllabusDocx } from './fixtures/syllabus-docx';
import { syllabusKindFromName, syllabusKindFromMime } from '../src/lib/syllabus-files';

it('reads Word paragraphs, table cells and embedded images without fetching linked resources', async () => {
  const png = await sharp({ create: { width: 80, height: 80, channels: 3, background: 'white' } })
    .png()
    .toBuffer();
  const fetcher = vi.spyOn(globalThis, 'fetch');
  try {
    const result = await inspectSyllabusUpload(
      syllabusDocx({
        'word/media/image1.png': png,
        'word/_rels/document.xml.rels': strToU8(
          '<Relationships><Relationship Target="https://example.com/private" TargetMode="External"/></Relationships>',
        ),
      }),
      'docx',
    );
    expect(result.text).toContain('Science & Engineering');
    expect(result.text).toMatch(/Quiz 1[\s\S]*October 20, 2090 — 10%/);
    expect(result.pages).toBeNull();
    expect(result.images).toHaveLength(1);
    expect(result.warnings?.[0]).toContain('exact layout');
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    fetcher.mockRestore();
  }
});
it.each(['png', 'jpeg'] as const)('validates and normalizes a real %s image', async (kind) => {
  const bytes = await sharp({ create: { width: 90, height: 50, channels: 3, background: 'white' } })
    .toFormat(kind)
    .toBuffer();
  const result = await inspectSyllabusUpload(bytes, kind);
  expect(result.pages).toBe(1);
  expect(result.images).toHaveLength(1);
  expect((await sharp(result.images![0].bytes).metadata()).format).toBe('jpeg');
});
it('rejects spoofed images, invalid Word archives, XML entities and excessive decompression', async () => {
  await expect(inspectSyllabusUpload(strToU8('not a PNG'), 'png')).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    inspectSyllabusUpload(zipSync({ 'random.xml': strToU8('not a document') }), 'docx'),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    inspectSyllabusUpload(
      syllabusDocx({
        'word/document.xml': strToU8(
          '<!DOCTYPE x [<!ENTITY e "bad">]><w:document>&e;</w:document>',
        ),
      }),
      'docx',
    ),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    inspectSyllabusUpload(syllabusDocx({ large: new Uint8Array(9 * 1024 * 1024) }), 'docx'),
  ).rejects.toMatchObject({ status: 413 });
});
it('reports unsupported embedded images and recognizes supported extensions case-insensitively', async () => {
  const result = await inspectSyllabusUpload(
    syllabusDocx({ 'word/media/image.emf': strToU8('unsupported') }),
    'docx',
  );
  expect(result.warnings?.some((w) => w.includes('unsupported'))).toBe(true);
  expect(syllabusKindFromName('course.DOCX')).toBe('docx');
  expect(syllabusKindFromName('photo.JPG')).toBe('jpeg');
  expect(syllabusKindFromName('course.doc')).toBeUndefined();
  expect(syllabusKindFromMime('image/png')).toBe('png');
});
