import { unzipSync } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import sharp from 'sharp';
import { ApiError } from './errors';

export interface SyllabusImage {
  bytes: Uint8Array;
  mime: 'image/jpeg' | 'image/png';
}
export interface InspectedSyllabus {
  pages: number | null;
  text?: string;
  images?: SyllabusImage[];
  warnings?: string[];
}

export async function inspectImage(
  bytes: Uint8Array,
  expected: 'jpeg' | 'png',
): Promise<SyllabusImage> {
  try {
    const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error();
    // Fully decode the image, orient phone photos and omit location/other metadata.
    const normalized = await image
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 95 })
      .toBuffer();
    if (normalized.length > 8 * 1024 * 1024) throw new Error();
    return { bytes: normalized, mime: 'image/jpeg' };
  } catch {
    throw new ApiError(
      400,
      'This image could not be opened. Choose a clear JPG or PNG under 25 megapixels.',
    );
  }
}

/** Read bounded document parts in memory; never execute macros or retrieve external links. */
export async function inspectDocx(bytes: Uint8Array): Promise<InspectedSyllabus> {
  try {
    let expanded = 0;
    let entries = 0;
    const files = unzipSync(bytes, {
      filter(file) {
        if (
          ++entries > 2000 ||
          (expanded += file.originalSize) > 32 * 1024 * 1024 ||
          file.originalSize > 8 * 1024 * 1024
        )
          throw new ApiError(
            413,
            'This Word document is too complex. Export it to PDF or use a smaller document.',
          );
        return (
          /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(file.name) ||
          /^word\/media\/[^/]+$/.test(file.name)
        );
      },
    });
    if (!files['word/document.xml']) throw new Error();
    const parser = new XMLParser({
      preserveOrder: true,
      ignoreAttributes: true,
      removeNSPrefix: true,
      trimValues: false,
      parseTagValue: false,
    });
    function readXml(data: Uint8Array) {
      if (data.length > 2 * 1024 * 1024)
        throw new ApiError(413, 'This Word document contains too much text. Export it to PDF.');
      const xml = new TextDecoder('utf-8', { fatal: true }).decode(data);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error();
      const nodes: unknown = parser.parse(xml);
      function walk(value: unknown, depth = 0): string {
        if (depth > 100) throw new Error();
        if (!Array.isArray(value)) return '';
        return value
          .map((node) => {
            if (!node || typeof node !== 'object') return '';
            return Object.entries(node)
              .map(([tag, child]) => {
                if (['del', 'instrText', 'drawing', 'pict'].includes(tag)) return '';
                if (tag === '#text') return String(child);
                if (tag === 'tab') return '\t';
                if (tag === 'br' || tag === 'cr') return '\n';
                const text = walk(child, depth + 1);
                return text + (tag === 'tc' ? '\t' : ['p', 'tr', 'tbl'].includes(tag) ? '\n' : '');
              })
              .join('');
          })
          .join('');
      }
      return walk(nodes);
    }
    const text = Object.entries(files)
      .filter(([name]) => name.endsWith('.xml'))
      .sort(([a], [b]) =>
        a === 'word/document.xml' ? -1 : b === 'word/document.xml' ? 1 : a.localeCompare(b),
      )
      .map(([, data]) => readXml(data))
      .join('\n')
      .trim();
    if (text.length > 100_000) throw new ApiError(413, 'Use fewer than 100,000 text characters.');
    const media = Object.entries(files).filter(([name]) => name.startsWith('word/media/'));
    if (media.length > 20)
      throw new ApiError(413, 'Use a Word document with 20 images or fewer, or export it to PDF.');
    const images: SyllabusImage[] = [];
    let imageBytes = 0;
    let skipped = false;
    for (const [name, data] of media) {
      const ext = name.split('.').at(-1)?.toLowerCase();
      if (!['jpg', 'jpeg', 'png'].includes(ext ?? '')) {
        skipped = true;
        continue;
      }
      const image = await inspectImage(data, ext === 'png' ? 'png' : 'jpeg');
      imageBytes += image.bytes.length;
      if (imageBytes > 8 * 1024 * 1024)
        throw new ApiError(
          413,
          'The images in this Word document are too large. Export it to PDF or reduce their size.',
        );
      images.push(image);
    }
    if (!text && !images.length) throw new Error();
    return {
      pages: null,
      text,
      images,
      warnings: [
        'Word text, tables and embedded JPG/PNG images were read. Page numbers and exact layout are unavailable; check complex layouts against the original or import a PDF.',
        ...(skipped
          ? [
              'Some embedded images use unsupported formats. Export this Word document to PDF to include them.',
            ]
          : []),
      ],
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      'This Word document could not be opened. Choose an unlocked .docx file or export it to PDF.',
    );
  }
}
