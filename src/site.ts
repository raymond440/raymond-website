import { getCollection, getEntry } from 'astro:content';

// Alias in Google Workspace, met filter en label in Gmail.
export const CONTACT_EMAIL = 'hey-raymond@klompsma.nl';

// Concepten tonen: in `npm run dev`, of in een build met CONCEPTEN=1 (voor lokaal bekijken met `npm run preview`).
export const toonConcepten = import.meta.env.DEV || import.meta.env.CONCEPTEN === '1';

export const datum = (d: Date) =>
  d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

// Nieuwste bovenaan. De datum bepaalt alleen de volgorde, hij wordt nergens getoond.
export async function artikelen() {
  const alle = await getCollection('artikelen', (a) => toonConcepten || !a.data.concept);
  return alle.sort((a, b) => b.data.datum.valueOf() - a.data.datum.valueOf());
}

export async function odeEntry() {
  const e = await getEntry('ode', 'onbevangen');
  if (!e || (e.data.concept && !toonConcepten)) return undefined;
  return e;
}

// Bedrijfsgegevens voor de webshop. ERBIJ is een handelsnaam van Saga BV. Nummers komen van Raymond: nooit zelf invullen.
export const BEDRIJF = {
  naam: 'Saga BV',
  handelsnaam: 'ERBIJ',
  kvk: '76135179' as string | null,
  btw: 'NL860519478B01' as string | null,
  adres: 'De Bugel 8, 8567 KA Oudemirdum' as string | null,
};
