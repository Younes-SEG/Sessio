export const SYLLABUS_MIME = {
  pdf: 'application/pdf',
  text: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpeg: 'image/jpeg',
  png: 'image/png',
} as const;
export type SyllabusKind = keyof typeof SYLLABUS_MIME;
export function syllabusKindFromMime(mime: string): SyllabusKind | undefined {
  return (Object.keys(SYLLABUS_MIME) as SyllabusKind[]).find(
    (kind) => SYLLABUS_MIME[kind] === mime,
  );
}
export function syllabusKindFromName(name: string): SyllabusKind | undefined {
  const extension = name.split('.').at(-1)?.toLowerCase();
  if (extension === 'txt') return 'text';
  if (extension === 'jpg') return 'jpeg';
  if (extension === 'pdf' || extension === 'docx' || extension === 'jpeg' || extension === 'png')
    return extension;
}
