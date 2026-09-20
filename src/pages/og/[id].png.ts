import type { APIRoute } from 'astro';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { artikelen } from '../../site';

const fontPad = 'node_modules/@fontsource/caveat-brush/files/caveat-brush-latin-400-normal.woff';
const buf = readFileSync(fontPad);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);

// Glyph voor glyph zetten, zonder kerning en ligaturen. De GPOS/GSUB-tabellen van dit font
// geven met opentype.js NaN in het pad bij paren als "at".
function breedte(tekst: string, grootte: number): number {
  return [...tekst].reduce((som, ch) => som + (font.charToGlyph(ch).advanceWidth ?? 0) * (grootte / font.unitsPerEm), 0);
}
// Eigen serializer: toPathData(2) van opentype.js geeft NaN in controlepunten bij dit font.
function pathData(p: opentype.Path): string {
  const n = (v: number | undefined) => (v ?? 0).toFixed(2);
  return p.commands
    .map((c) => {
      if (c.type === 'M' || c.type === 'L') return `${c.type}${n(c.x)} ${n(c.y)}`;
      if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      return 'Z';
    })
    .join('');
}
function pad(tekst: string, x: number, y: number, grootte: number): string {
  let cursor = x;
  let d = '';
  for (const ch of tekst) {
    const g = font.charToGlyph(ch);
    d += pathData(g.getPath(cursor, y, grootte));
    cursor += (g.advanceWidth ?? 0) * (grootte / font.unitsPerEm);
  }
  return d;
}

const B = 1200;
const H = 630;
const MARGE = 90;

function regels(tekst: string, grootte: number, maxBreedte: number): string[] {
  const woorden = tekst.split(' ');
  const uit: string[] = [];
  let huidig = '';
  for (const w of woorden) {
    const kandidaat = huidig ? `${huidig} ${w}` : w;
    if (breedte(kandidaat, grootte) > maxBreedte && huidig) {
      uit.push(huidig);
      huidig = w;
    } else {
      huidig = kandidaat;
    }
  }
  if (huidig) uit.push(huidig);
  return uit;
}

export async function getStaticPaths() {
  const lijst = await artikelen();
  return [
    { params: { id: 'site' }, props: { titel: 'Raymond Klompsma', onder: 'Wat ik zie en waar ik in geloof.' } },
    ...lijst.map((a) => ({ params: { id: a.id }, props: { titel: a.data.titel, onder: 'Raymond Klompsma' } })),
  ];
}

export const GET: APIRoute = async ({ props }) => {
  const { titel, onder } = props as { titel: string; onder: string };
  const grootte = titel.length > 45 ? 78 : 96;
  // Balanceren: zelfde aantal regels, zo smal mogelijk, zodat er geen alleenstaand woord overblijft.
  const maxB = B - MARGE * 2;
  const aantal = regels(titel, grootte, maxB).length;
  let smal = maxB;
  while (smal > 300 && regels(titel, grootte, smal - 20).length === aantal) smal -= 20;
  const kop = regels(titel, grootte, smal).slice(0, 4);
  const lijnHoogte = grootte * 1.08;
  const startY = 200 + grootte * 0.8;

  const kopPaden = kop
    .map((r, i) => `<path d="${pad(r, MARGE, startY + i * lijnHoogte, grootte)}" fill="#3f3b39"/>`)
    .join('');
  const onderPad = `<path d="${pad(onder, MARGE, H - 70, 40)}" fill="#3f3b39" fill-opacity="0.7"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">
    <rect width="${B}" height="${H}" fill="#fef9f3"/>
    <rect x="${MARGE}" y="120" width="96" height="14" fill="#ff9272"/>
    ${kopPaden}
    ${onderPad}
    <rect x="${MARGE}" y="${H - 120}" width="${B - MARGE * 2}" height="1" fill="#dac9b3"/>
  </svg>`;

  if (/NaN/.test(svg)) throw new Error(`OG-afbeelding voor "${titel}" bevat NaN in het pad`);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
