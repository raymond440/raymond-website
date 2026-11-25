import { getCollection, type CollectionEntry } from 'astro:content';
import { toonConcepten } from '../site';

// Stilschrift opent op dinsdag 5 januari 2027. De bouwlog loopt elke vrijdag tot dan:
// van vrijdag 20 november 2026 tot en met vrijdag 1 januari 2027, zeven weken.
export const OPENING = new Date('2027-01-03T00:00:00+01:00');
export const AANTAL_WEKEN = 7;

export type Week = CollectionEntry<'bouwlog'>;

// Oudste eerst: week 1 bovenaan, de nieuwste onderaan.
export async function weken(): Promise<Week[]> {
  const alle = await getCollection('bouwlog', (w) => toonConcepten || !w.data.concept);
  return alle.sort((a, b) => a.data.week - b.data.week);
}

export const slug = (w: Week) => `week-${w.data.week}`;
export const adres = (w: Week) => `/stilschrift/bouwen/${slug(w)}/`;

// "20 november", zonder jaar: de reeks loopt maar zeven weken.
export const kortDatum = (d: Date) =>
  d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' });

// "Vrijdag 27 november"
export function volgendeVrijdag(d: Date): Date | undefined {
  const v = new Date(d.valueOf() + 7 * 24 * 60 * 60 * 1000);
  return v < OPENING ? v : undefined;
}
export const dagDatum = (d: Date) => {
  const s = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Foto's staan naast het .md-bestand; in de frontmatter alleen de bestandsnaam.
const fotos = import.meta.glob<ImageMetadata>('../content/bouwlog/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
export function foto(bestand: string | undefined): ImageMetadata | undefined {
  if (!bestand) return undefined;
  const pad = Object.keys(fotos).find((p) => p.endsWith(`/${bestand}`));
  return pad ? fotos[pad] : undefined;
}

// De tekst heeft een regel "[FOTO: bestand — onderschrift: "..."]". Die alinea knippen we eruit,
// zodat de foto op precies die plek komt. De tekst zelf blijft ongewijzigd in het .md-bestand.
export function knipFoto(html: string): { voor: string; na: string; bestand?: string; onderschrift?: string } {
  const re = /<p>\[FOTO:\s*([^\s\]]+)\s*(?:[—–-]|&#x2014;|&mdash;)?\s*(?:onderschrift:\s*)?(?:"|“|&quot;|&#x201C;|&ldquo;)?([\s\S]*?)(?:"|”|&quot;|&#x201D;|&rdquo;)?\]<\/p>/;
  const m = html.match(re);
  if (!m || m.index === undefined) return { voor: html, na: '' };
  return {
    voor: html.slice(0, m.index),
    na: html.slice(m.index + m[0].length),
    bestand: m[1],
    onderschrift: m[2].trim() || undefined,
  };
}
