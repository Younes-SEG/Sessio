// Regenerates the installable-app PNG icons from src/app/icon.svg (the Sessio logo).
// Run after changing the logo: node scripts/generate-app-icons.mjs
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const logo = await readFile(new URL('../src/app/icon.svg', import.meta.url), 'utf8');
// Maskable and Apple icons are cropped by the device, so they need a full-bleed square.
// The glyph already sits well inside the maskable safe zone (centre 80% circle).
const square = logo.replace(/ rx="[^"]*"/, '');
if (square === logo) throw new Error('Expected a rounded rect in icon.svg');

const out = new URL('../public/icons/', import.meta.url);
await mkdir(out, { recursive: true });
const icons = [
  ['icon-192.png', logo, 192],
  ['icon-512.png', logo, 512],
  ['icon-maskable-512.png', square, 512],
  ['apple-touch-icon.png', square, 180],
];
for (const [name, svg, size] of icons) {
  await sharp(Buffer.from(svg), { density: (72 * size) / 48 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(name, out)));
}
console.log(`Wrote ${icons.length} icons to public/icons/`);
