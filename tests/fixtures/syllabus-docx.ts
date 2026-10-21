import { zipSync, strToU8 } from 'fflate';
export function syllabusDocx(
  extra: Record<string, Uint8Array> = {},
  body = '<w:p><w:r><w:t>TEST101 — Science &amp; Engineering</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Quiz 1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>October 20, 2090 — 10%</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
) {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    'word/document.xml': strToU8(
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
    ),
    ...extra,
  });
}
