import { lijn, pad, cirkel } from './wiebel';

export type Naam = 'zon' | 'deur' | 'pakje' | 'trap';
export const NAMEN: Naam[] = ['zon', 'deur', 'pakje', 'trap'];

type Deel = { d: string; vul?: boolean };

// Recept: inktlijn van 3.2 met ronde uiteinden, met opzet niet recht, en één koraal vlak dat
// iets naast de lijn valt, zoals bij drukwerk. Geen schaduw, geen verloop.
export function delen(naam: Naam): Deel[] {
  const uit: Deel[] = [];
  const vul = (d: string) => uit.push({ d, vul: true });
  const streek = (d: string) => uit.push({ d });

  if (naam === 'zon') {
    vul(cirkel(100, 100, 27, 3));
    streek(cirkel(100, 100, 27, 11));
    const stralen = 9;
    for (let i = 0; i < stralen; i++) {
      const hoek = (i / stralen) * Math.PI * 2 + 0.25 + Math.sin(i * 2.3) * 0.12;
      const van = 41 + Math.sin(i * 1.7) * 3;
      const tot = 60 + Math.cos(i * 2.1) * 9;
      streek(lijn([100 + Math.cos(hoek) * van, 100 + Math.sin(hoek) * van], [100 + Math.cos(hoek) * tot, 100 + Math.sin(hoek) * tot], 20 + i, 1.2));
    }
  }
  if (naam === 'deur') {
    const blad: [number, number][] = [[62, 34], [118, 44], [118, 168], [62, 178]];
    vul(pad(blad, 5, true));
    streek(pad([[54, 26], [142, 26], [142, 178]], 7));
    streek(pad([[54, 26], [54, 178]], 8));
    streek(pad(blad, 9, true));
    streek(cirkel(108, 112, 3.5, 4, 0.1));
    streek(lijn([36, 180], [166, 180], 12, 1.4));
  }
  if (naam === 'pakje') {
    vul(pad([[48, 92], [152, 92], [152, 172], [48, 172]], 4, true));
    streek(pad([[48, 92], [152, 92], [152, 172], [48, 172]], 6, true));
    streek(pad([[42, 72], [158, 72], [158, 92], [42, 92]], 8, true));
    streek(lijn([100, 72], [100, 172], 10, 1.2));
    streek(cirkel(82, 54, 15, 13, 0.08));
    streek(cirkel(118, 54, 15, 14, 0.08));
    streek(lijn([100, 72], [92, 62], 15, 1));
    streek(lijn([100, 72], [108, 62], 16, 1));
  }
  if (naam === 'trap') {
    vul(pad([[150, 50], [182, 50], [182, 82], [150, 82]], 3, true));
    streek(pad([[28, 174], [28, 146], [68, 146], [68, 114], [108, 114], [108, 82], [150, 82], [150, 50], [182, 50]], 7));
    streek(lijn([16, 174], [190, 174], 9, 1.4));
  }
  return uit;
}

// hex=true: vaste kleuren, voor losse bestanden (png, svg). Anders CSS-variabelen van de site.
export function svgInhoud(naam: Naam, hex = false): string {
  const inkt = hex ? '#3f3b39' : 'var(--inkt)';
  const koraal = hex ? '#ff9272' : 'var(--koraal)';
  const d = delen(naam);
  const vullingen = d.filter((x) => x.vul).map((x) => `<path d="${x.d}" fill="${koraal}" stroke="none" transform="translate(4 3)"/>`);
  const lijnen = d.filter((x) => !x.vul).map((x) => `<path d="${x.d}" stroke="${inkt}" stroke-width="3.2"/>`);
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${vullingen.join('')}${lijnen.join('')}</g>`;
}
