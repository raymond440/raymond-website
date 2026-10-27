// Wobbly Sun: bezoekers tekenen een zon op /wobbly en sturen hem in. De Worker mailt de tekening als PNG-bijlage naar Raymond.
// Los van `cloudflare:email` gehouden, zodat dit in Node te testen is (zie scripts/test-zon.mjs).
import { AFZENDER, ONTVANGER, json, enkeleRegel, codeerKop, base64Regels, herkomstOk } from './aanvraag.js';

// Het adres waar de zonnen in de mail aan gericht staan. De envelop gaat naar ONTVANGER, want de send_email-binding
// MAIL is vastgezet op raymond@klompsma.nl; hey-raymond@ is een alias in dezelfde inbox.
export const AAN = 'hey-raymond@klompsma.nl';
const MAX_BYTES = 1_500_000;
const MIN_BYTES = 2_000; // een leeg vel komt hieronder uit
const PNG_KOP = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function base64Bytes(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/.{1,76}/g, '$&\r\n').trimEnd();
}

// Leest een PNG-kop: geldig als het de PNG-handtekening heeft en de afmetingen redelijk zijn.
export function pngInfo(bytes) {
  if (bytes.length < 33 || PNG_KOP.some((b, i) => bytes[i] !== b)) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(12) !== 0x49484452) return null; // IHDR
  const w = dv.getUint32(16), h = dv.getUint32(20);
  if (w < 100 || h < 100 || w > 3000 || h > 3000) return null;
  return { w, h };
}

export async function leesZon(form) {
  if (String(form.get('website') ?? '').trim() !== '') return { spam: true };
  const naam = String(form.get('naam') ?? '').trim();
  const mail = String(form.get('mail') ?? '').trim();
  if (naam.length > 80) return { fout: 'De naam is te lang.' };
  if (mail.length > 200 || (mail && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(mail))) return { fout: 'Dat e-mailadres klopt niet.' };
  const streken = Number(form.get('streken'));
  if (!Number.isInteger(streken) || streken < 3) return { fout: 'Teken eerst een zon.' };
  const bestand = form.get('tekening');
  if (!bestand || typeof bestand === 'string' || typeof bestand.arrayBuffer !== 'function') return { fout: 'Geen tekening ontvangen.' };
  if (bestand.size > MAX_BYTES) return { fout: 'De tekening is te groot.' };
  const png = new Uint8Array(await bestand.arrayBuffer());
  if (png.length < MIN_BYTES) return { fout: 'Teken eerst een zon.' };
  if (!pngInfo(png)) return { fout: 'Dat is geen geldige tekening.' };
  return { data: { naam, mail, png } };
}

export function bouwZonMail({ naam, mail, png }, nu = new Date(), id = crypto.randomUUID()) {
  const wie = enkeleRegel(naam).replace(/[<>",]/g, '');
  const onderwerp = `Wobbly Sun: een zon${wie ? ` van ${wie}` : ''}`;
  const tekst = `Een nieuwe zon via raymondklompsma.nl/wobbly.\r\n\r\nVoornaam: ${wie || '(niet ingevuld)'}\r\nE-mail: ${mail || '(niet ingevuld)'}\r\n\r\nDe tekening zit als bijlage in deze mail.${mail ? ' Antwoord op deze mail om direct bij de tekenaar uit te komen.' : ''}\r\n`;
  const grens = `zon-${id.replace(/[^a-z0-9]/gi, '')}`;
  const kop = [
    `From: Website Raymond Klompsma <${AFZENDER}>`,
    `To: ${AAN}`,
    ...(mail ? [`Reply-To: ${wie ? `${wie} ` : ''}<${mail}>`] : []),
    `Subject: ${codeerKop(onderwerp)}`,
    `Date: ${nu.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@raymondklompsma.nl>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${grens}"`,
  ].join('\r\n');
  return [
    kop, '',
    `--${grens}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64', '',
    base64Regels(tekst),
    `--${grens}`,
    'Content-Type: image/png; name="zon.png"',
    'Content-Disposition: attachment; filename="zon.png"',
    'Content-Transfer-Encoding: base64', '',
    base64Bytes(png),
    `--${grens}--`, '',
  ].join('\r\n');
}

// `maakBericht(van, naar, raw)` komt uit index.js (new EmailMessage), `env.MAIL` is de send_email-binding.
export async function verwerkZon(request, env, maakBericht) {
  if (request.method !== 'POST') return json({ ok: false, fout: 'Alleen POST.' }, 405);
  if (!herkomstOk(request)) return json({ ok: false, fout: 'Niet toegestaan.' }, 403);
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, fout: 'Geen geldig formulier.' }, 400);
  }
  const gelezen = await leesZon(form);
  if (gelezen.spam) return json({ ok: true }); // de honeypot is gevuld: doe alsof het gelukt is
  if (gelezen.fout) return json({ ok: false, fout: gelezen.fout }, 400);
  try {
    await env.MAIL.send(maakBericht(AFZENDER, ONTVANGER, bouwZonMail(gelezen.data)));
  } catch (e) {
    console.error('Zon versturen mislukt', e);
    return json({ ok: false, fout: 'Versturen mislukt.' }, 502);
  }
  return json({ ok: true });
}
