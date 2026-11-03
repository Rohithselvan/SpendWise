// Generates PWA / Apple icons from the SVG mark. Run: npm run icons
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const mark = (pad = 0, rounded = true) => {
  const s = 512;
  const r = rounded ? 112 : 0;
  const scale = (s - pad * 2) / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <rect width="${s}" height="${s}" rx="${r}" fill="#0f1211"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})">
    <circle cx="32" cy="32" r="17" fill="none" stroke="#26302d" stroke-width="7"/>
    <path d="M32 15 A17 17 0 0 1 48.2 37.3" fill="none" stroke="#2fd08a" stroke-width="7" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="4.5" fill="#2fd08a"/>
  </g>
</svg>`;
};

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/favicon.svg', mark(40, true));
const jobs = [
  ['icon-192.png', 192, mark(40, true)],
  ['icon-512.png', 512, mark(40, true)],
  // Maskable: full-bleed background, mark inside the 80% safe zone
  ['icon-maskable-512.png', 512, mark(96, false)],
  // Apple applies its own rounding; supply a square, opaque icon
  ['apple-touch-icon.png', 180, mark(56, false)],
  ['favicon-32.png', 32, mark(24, true)],
];
for (const [name, size, svg] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).flatten({ background: '#0f1211' }).png().toFile(`public/icons/${name}`);
  console.log('wrote', name);
}
