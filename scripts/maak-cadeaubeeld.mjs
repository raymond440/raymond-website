// Maakt src/assets/erbij-cadeau.png: een luxe kist met twee potjes, van boven gezien (eigen illustratie).
// Het krabbeltje op het deksel komt uit het verpakkingsontwerp van Raymond (PDF). Draai: node scripts/maak-cadeaubeeld.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';

const fontBuf = readFileSync('node_modules/@fontsource/caveat/files/caveat-latin-500-normal.woff');
const font = opentype.parse(fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength));
const n2 = (v) => (v ?? 0).toFixed(2);
const pathData = (p) => p.commands.map((c) => (c.type === 'M' || c.type === 'L' ? `${c.type}${n2(c.x)} ${n2(c.y)}` : c.type === 'Q' ? `Q${n2(c.x1)} ${n2(c.y1)} ${n2(c.x)} ${n2(c.y)}` : c.type === 'C' ? `C${n2(c.x1)} ${n2(c.y1)} ${n2(c.x2)} ${n2(c.y2)} ${n2(c.x)} ${n2(c.y)}` : 'Z')).join('');
// glyph voor glyph, zonder kerning (opentype.js geeft anders NaN bij dit lettertype)
function tekst(s, x, y, grootte) {
  let cur = x; let d = '';
  for (const ch of s) { const g = font.charToGlyph(ch); d += pathData(g.getPath(cur, y, grootte)); cur += (g.advanceWidth ?? 0) * (grootte / font.unitsPerEm); }
  return d;
}

const krabbel = readFileSync(new URL('./deksel-krabbel.txt', import.meta.url), 'utf8').trim();
const logo = readFileSync(new URL('../src/components/ErbijLogo.astro', import.meta.url), 'utf8').match(/fill="currentColor">(.*)<\/svg>/s)[1];

const B = 1200;
const z = (n) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1; // vaste "toeval"-reeks: elke build hetzelfde

// houtnerf: lange, lichtjes golvende lijnen
let nerf = '';
for (let i = 0; i < 70; i++) {
  const y = 20 + (i / 70) * 640 + (z(i) - 0.5) * 8;
  const a = 6 + z(i + 3) * 14;
  const donker = z(i + 9) > 0.5;
  nerf += `<path d="M-20 ${y.toFixed(1)} C 220 ${(y - a).toFixed(1)}, 420 ${(y + a).toFixed(1)}, 640 ${(y - a / 2).toFixed(1)} S 900 ${(y + a).toFixed(1)}, 1040 ${y.toFixed(1)}" fill="none" stroke="${donker ? '#8a5c2b' : '#f3d9ae'}" stroke-opacity="${(0.07 + z(i + 5) * 0.12).toFixed(2)}" stroke-width="${(1 + z(i + 7) * 2.2).toFixed(1)}"/>`;
}

const s = 34; // celgrootte honingraat
const w = Math.sqrt(3) * s;
const hex = (cx, cy) => Array.from({ length: 6 }, (_, k) => { const a = ((60 * k + 30) * Math.PI) / 180; return `${(cx + s * Math.cos(a)).toFixed(2)},${(cy + s * Math.sin(a)).toFixed(2)}`; }).join(' ');
const cellen = [[w / 2, s], [0, 2.5 * s], [w, 2.5 * s]].map(([x, y]) => `<polygon points="${hex(x, y)}" fill="url(#kraft)" stroke="#6e4a27" stroke-width="3.2" stroke-linejoin="round"/><polygon points="${hex(x - 1.2, y - 1.6)}" fill="none" stroke="#e2bd8c" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="round"/>`).join('');

const potje = (cx, cy, draai) => `
  <g transform="translate(${cx} ${cy})">
    <circle r="190" fill="#24150a" opacity=".5" filter="url(#zacht)"/>
    <circle r="178" fill="url(#gat)" stroke="#5a3b1d" stroke-width="6"/>
    <circle r="178" fill="none" stroke="#e8c691" stroke-opacity=".5" stroke-width="2" transform="scale(.985)"/>
    <circle r="152" fill="url(#honing)"/>
    <circle r="152" fill="none" stroke="#a85f00" stroke-opacity=".5" stroke-width="3"/>
    <circle r="132" fill="#1b1819" stroke="#050404" stroke-width="3"/>
    <circle r="132" fill="url(#deksel)"/>
    <circle r="120" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="2"/>
    <g transform="rotate(${draai}) scale(132)"><path d="${krabbel}" fill="#fbf7ef" fill-rule="nonzero"/></g>
    <path d="M-100 -78 A 128 128 0 0 1 -22 -122" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="6" stroke-linecap="round"/>
  </g>`;

const kaart = `
  <g transform="translate(895 300) rotate(5)">
    <rect x="-112" y="-185" width="224" height="370" rx="6" fill="#2a1a0c" opacity=".4" filter="url(#zacht)" transform="translate(8 10)"/>
    <rect x="-112" y="-185" width="224" height="370" rx="5" fill="#fffdf8" stroke="#e6d6bb" stroke-width="2"/>
    <rect x="-96" y="-169" width="192" height="338" fill="none" stroke="#F7AC2E" stroke-width="2.5"/>
    <g transform="translate(-70 -150) scale(.4) translate(-155 -320)" fill="#F7AC2E">${logo}</g>
    <path d="${tekst('Eén voor jou.', -78, -20, 38)}" fill="#3f3b39"/>
    <path d="${tekst('Eén voor wie', -78, 34, 38)}" fill="#3f3b39"/>
    <path d="${tekst('het verdient.', -78, 76, 38)}" fill="#3f3b39"/>
    <path d="M-78 126 C -50 114, -20 138, 8 124 S 56 118, 78 128" fill="none" stroke="#F7AC2E" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">
  <defs>
    <linearGradient id="achter" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#f3e8d6"/></linearGradient>
    <linearGradient id="hout" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c590"/><stop offset=".55" stop-color="#d5ac72"/><stop offset="1" stop-color="#c39458"/></linearGradient>
    <linearGradient id="binnen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d4a26"/><stop offset="1" stop-color="#8d6338"/></linearGradient>
    <linearGradient id="kraft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c79a62"/><stop offset="1" stop-color="#b68650"/></linearGradient>
    <radialGradient id="gat" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#3d2713"/><stop offset="1" stop-color="#7a5230"/></radialGradient>
    <radialGradient id="honing" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#ffd24a"/><stop offset=".55" stop-color="#f4a31c"/><stop offset="1" stop-color="#cf7a05"/></radialGradient>
    <radialGradient id="deksel" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#4a4446" stop-opacity=".9"/><stop offset=".6" stop-color="#1b1819" stop-opacity="0"/></radialGradient>
    <filter id="zacht" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="schaduw" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="26"/></filter>
    <pattern id="raat" width="${w.toFixed(3)}" height="${(3 * s).toFixed(2)}" patternUnits="userSpaceOnUse">${cellen}</pattern>
    <clipPath id="vak"><rect x="46" y="46" width="1008" height="548" rx="10"/></clipPath>
  </defs>
  <rect width="${B}" height="${B}" fill="url(#achter)"/>
  <g transform="translate(600 590) rotate(-3.5) scale(1.1) translate(-550 -320)">
    <rect x="14" y="48" width="1100" height="660" rx="30" fill="#3a2410" opacity=".4" filter="url(#schaduw)"/>
    <rect width="1100" height="640" rx="26" fill="url(#hout)" stroke="#a37840" stroke-width="3"/>
    <clipPath id="nerfklem"><rect width="1100" height="640" rx="26"/></clipPath>
    <g clip-path="url(#nerfklem)">${nerf}</g>
    <rect x="1" y="1" width="1098" height="638" rx="25" fill="none" stroke="#fff3d6" stroke-opacity=".55" stroke-width="2"/>
    <rect x="26" y="26" width="1048" height="588" rx="14" fill="url(#binnen)" stroke="#5b3c1d" stroke-width="3"/>
    <g clip-path="url(#vak)"><g transform="translate(0 0)"><rect x="40" y="40" width="1020" height="560" fill="url(#raat)"/></g>
      <rect x="40" y="40" width="1020" height="560" fill="none" stroke="#3b2511" stroke-opacity=".45" stroke-width="16" filter="url(#zacht)"/></g>
    ${potje(250, 270, -8)}
    ${potje(610, 350, 14)}
    ${kaart}
  </g>
</svg>`;

await sharp(Buffer.from(svg), { density: 144 }).resize(B, B).png({ compressionLevel: 9 }).toFile(new URL('../src/assets/erbij-cadeau.png', import.meta.url).pathname);
console.log('src/assets/erbij-cadeau.png gemaakt');
