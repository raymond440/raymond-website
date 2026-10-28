import { artikelen, odeEntry } from '../site';

// De ode wordt uit één Markdown-bestand opgebouwd: Vooraf en zes delen (## Deel N. Titel), met ### onderdelen
// die een vast anker hebben. Artikelen hangen met `hoort_bij` aan zo'n onderdeel. Op de plek van de `brug`
// (het begin van een zin in de ode) komt een verwijzing in de kantlijn.

export type Tak = { id: string; titel: string; omschrijving: string; kantlijn: string; bij: string };
export type Onderdeel = { id: string; titel: string; takken: Tak[] };
export type Deel = { nr: number; id: string; titel: string; html: string; onderdelen: Onderdeel[]; deelTakken: Tak[]; takken: Tak[] };
export type Ode = {
  titel: string;
  beschrijving: string;
  bijgewerkt: Date;
  minuten: number;
  vooraf: string;
  delen: Deel[];
  aantalTakken: number;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const zonderTags = (s: string) =>
  s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

export async function laadOde(): Promise<Ode | undefined> {
  const e = await odeEntry();
  if (!e) return undefined;
  const html = e.rendered?.html;
  if (!html) throw new Error('De ode heeft geen gerenderde HTML.');

  const alleTakken = (await artikelen()).filter((a) => a.data.hoort_bij);
  const stukken = [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2 id="|$)/g)];

  let vooraf = '';
  const delen: Deel[] = [];
  for (const [, , kop, inhoud] of stukken) {
    const titel = zonderTags(kop);
    if (titel === 'Vooraf') {
      vooraf = inhoud;
      continue;
    }
    const m = /^Deel (\d+)\.\s*(.+)$/.exec(titel);
    if (!m) throw new Error(`Onverwachte kop in de ode: ${titel}`);
    const nr = Number(m[1]);

    let deelHtml = inhoud;
    const onderdelen: Onderdeel[] = [...inhoud.matchAll(/<h3 id="([^"]+)">([\s\S]*?)<\/h3>/g)].map(([, id, h3]) => ({
      id,
      titel: zonderTags(h3),
      takken: [],
    }));

    const deelId = `deel-${nr}`;
    const deelTakken: Tak[] = [];
    for (const a of alleTakken) {
      // een tak hangt aan een onderdeel (###) of, als het deel geen kopjes heeft, aan het deel zelf (deel-N)
      const onderdeel = onderdelen.find((o) => o.id === a.data.hoort_bij);
      if (!onderdeel && a.data.hoort_bij !== deelId) continue;
      const tak: Tak = {
        id: a.id,
        titel: a.data.titel,
        omschrijving: a.data.beschrijving,
        kantlijn: a.data.kantlijn ?? a.data.beschrijving,
        bij: a.data.hoort_bij!,
      };
      (onderdeel ? onderdeel.takken : deelTakken).push(tak);

      if (!a.data.brug) throw new Error(`Artikel ${a.id} heeft hoort_bij maar geen brug.`);
      // de brug moet in het onderdeel zelf staan (of in het deel, bij een tak aan het deel)
      let begin = 0;
      let einde = deelHtml.length;
      if (onderdeel) {
        begin = deelHtml.indexOf(`<h3 id="${onderdeel.id}">`);
        const volgende = deelHtml.indexOf('<h3 id="', begin + 1);
        if (volgende !== -1) einde = volgende;
      }
      const sectie = deelHtml.slice(begin, einde);
      const plek = sectie.indexOf(esc(a.data.brug));
      if (plek === -1) throw new Error(`Brug van ${a.id} niet gevonden in "${onderdeel?.titel ?? titel}": ${a.data.brug}`);
      // de verwijzing komt voor de alinea waarin de brugzin staat
      const alinea = sectie.lastIndexOf('<p>', plek);
      if (alinea === -1) throw new Error(`Brug van ${a.id} staat niet in een alinea.`);
      const aside =
        `<aside class="takken kant"><p class="label">Hier schreef ik verder over</p>` +
        `<a class="tak-titel" href="/artikelen/${a.id}/">${esc(tak.titel)}</a>` +
        `<span class="tak-beschr">${esc(tak.kantlijn)}</span></aside>`;
      const abs = begin + alinea;
      deelHtml = deelHtml.slice(0, abs) + aside + deelHtml.slice(abs);
    }

    delen.push({ nr, id: deelId, titel: m[2], html: deelHtml, onderdelen, deelTakken, takken: [...deelTakken, ...onderdelen.flatMap((o) => o.takken)] });
  }
  if (delen.length === 0) throw new Error('Geen delen gevonden in de ode.');

  const woorden = (e.body ?? '').split(/\s+/).filter(Boolean).length;
  return {
    titel: e.data.titel,
    beschrijving: e.data.beschrijving,
    bijgewerkt: e.data.bijgewerkt,
    minuten: Math.max(1, Math.round(woorden / 230)),
    vooraf,
    delen,
    aantalTakken: delen.reduce((n, d) => n + d.takken.length, 0),
  };
}

export type Plek = { deel: number; deelTitel: string; onderdeel: string; onderdeelId: string };

// Waar in de ode hangt elk artikel? Leeg als de ode (nog) niet zichtbaar is.
export async function plekken(): Promise<Map<string, Plek>> {
  const kaart = new Map<string, Plek>();
  const ode = await laadOde();
  if (!ode) return kaart;
  for (const d of ode.delen)
    for (const o of d.onderdelen)
      for (const t of o.takken) kaart.set(t.id, { deel: d.nr, deelTitel: d.titel, onderdeel: o.titel, onderdeelId: o.id });
  for (const d of ode.delen) for (const t of d.deelTakken) kaart.set(t.id, { deel: d.nr, deelTitel: d.titel, onderdeel: '', onderdeelId: d.id });
  return kaart;
}

export const zonderPunt = (s: string) => s.replace(/[.]$/, '');
export const kleineLetter = (s: string) => zonderPunt(s).charAt(0).toLowerCase() + zonderPunt(s).slice(1);
