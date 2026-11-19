import { describe, expect, it } from 'vitest';
import { legalDocuments, type LegalDocument } from '../src/lib/legal';
import { legalDocumentsFr } from '../src/lib/legal-fr';

const documents = Object.keys(legalDocuments) as LegalDocument[];

describe('French legal documents', () => {
  it('cover the same documents as English', () => {
    expect(Object.keys(legalDocumentsFr).sort()).toEqual([...documents].sort());
  });

  it.each(documents)('%s keeps the English section and paragraph structure', (document) => {
    const shape = (doc: (typeof legalDocumentsFr)[LegalDocument]) =>
      doc.sections.map((section) => section.paragraphs.length);
    expect(shape(legalDocumentsFr[document])).toEqual(shape(legalDocuments[document]));
  });

  it.each(documents)('%s has no paragraph left in English', (document) => {
    const english = new Set<string>([
      legalDocuments[document].title,
      legalDocuments[document].introduction,
      ...legalDocuments[document].sections.flatMap((s) => [s.title, ...s.paragraphs]),
    ]);
    const french = legalDocumentsFr[document];
    // Product names can match ("Ask Command"); whole sentences must not.
    for (const text of [french.introduction, ...french.sections.flatMap((s) => s.paragraphs)])
      expect(english.has(text), text).toBe(false);
  });

  it('keeps provider locations and the 18+ AI requirement in both languages', () => {
    const flat = (doc: (typeof legalDocumentsFr)[LegalDocument]) =>
      doc.sections.flatMap((s) => s.paragraphs).join(' ');
    const en = flat(legalDocuments.privacy);
    const fr = flat(legalDocumentsFr.privacy);
    for (const place of ['Virginia', 'Ohio']) expect(en).toContain(place);
    for (const place of ['Virginie', 'Ohio']) expect(fr).toContain(place);
    // The app moved from Vercel (Washington, D.C.) to Render (Virginia) on 2026-11-19.
    expect(en).not.toContain('Vercel');
    expect(fr).not.toContain('Vercel');
    expect(en).toContain('at least 18');
    expect(fr).toContain('au moins 18 ans');
  });
});
