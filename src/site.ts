import { getCollection } from 'astro:content';

// Alias in Google Workspace, met filter en label in Gmail.
export const CONTACT_EMAIL = 'hey-raymond@klompsma.nl';

export const datum = (d: Date) =>
  d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

export async function artikelen() {
  const alle = await getCollection('artikelen', (a) => import.meta.env.DEV || !a.data.concept);
  return alle.sort((a, b) => b.data.datum.valueOf() - a.data.datum.valueOf());
}
