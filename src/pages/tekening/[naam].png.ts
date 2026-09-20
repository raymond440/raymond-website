import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { NAMEN, svgInhoud, type Naam } from '../../lib/tekeningen';

// Losse tekeningen als transparante png, bijvoorbeeld voor de nieuwsbrief.
export function getStaticPaths() {
  return NAMEN.map((naam) => ({ params: { naam } }));
}

export const GET: APIRoute = async ({ params }) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 200 200">${svgInhoud(params.naam as Naam, true)}</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
