// Maakt public/stilschrift-logo.svg: de kantlijn (streep 3) met het woordmerk "stilschrift" in
// Shippori Mincho 500 als outlines, zoals in het design system van Stilschrift (Header).
// Gebruik: node scripts/stilschrift-logo.mjs <pad naar shippori-mincho-latin-500-normal.woff>
import fs from 'node:fs';
import opentype from 'opentype.js';
const font = opentype.parse(fs.readFileSync(process.argv[2]).buffer.slice(0));
const kant = fs.readFileSync('public/stilschrift-kantlijn.svg', 'utf8').match(/<path d="([^"]+)"/)[1];
// Eenheden: kantlijn is 108 hoog (viewBox -7.1 -4 14 108), in het design system 38px hoog bij tekst van 22px.
const px = 38 / 108;              // schaal kantlijn
const fs_ = 22, spacing = 0.03 * fs_;
const gap = 10;
const kantB = 14 * px;            // 5px breed
let x = kantB + gap, d = '';
for (const g of font.stringToGlyphs('stilschrift')) {
  d += g.getPath(x, 0, fs_).toPathData(2);
  x += g.advanceWidth * fs_ / font.unitsPerEm + spacing;
}
const bb = font.getPath('stilschrift', 0, 0, fs_).getBoundingBox();
const base = 38 / 2 + (-(bb.y1 + bb.y2) / 2);   // tekst verticaal gecentreerd tegen de kantlijn
const W = (x - spacing).toFixed(2);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 38" role="img" aria-label="stilschrift">` +
  `<g transform="translate(${(kantB / 2).toFixed(2)},0) scale(${px.toFixed(5)}) translate(0,4)"><path d="${kant}" fill="none" stroke="#1E3AA8" stroke-width="7" stroke-linecap="round"/></g>` +
  `<path transform="translate(0,${base.toFixed(2)})" d="${d}" fill="#1C1D1F"/></svg>\n`;
fs.writeFileSync('public/stilschrift-logo.svg', svg);
console.log('ok', W, base);
