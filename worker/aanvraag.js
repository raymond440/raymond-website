// Aanvraagformulieren (keynote, mentor, stip): valideren en omzetten naar een mail aan Raymond.
// Los van `cloudflare:email` gehouden, zodat dit in Node te testen is (zie scripts/test-aanvraag.mjs).

export const ONTVANGER = 'raymond@klompsma.nl';
export const AFZENDER = 'aanvraag@raymondklompsma.nl';
const TOEGESTANE_HERKOMST = ['https://raymondklompsma.nl'];

const SOORTEN = {
  keynote: 'Keynote',
  mentor: 'Mentor',
  stip: 'De stip',
};
const VELDEN = [
  ['naam', 'Naam', 120],
  ['mail', 'E-mail', 200],
  ['organisatie', 'Organisatie of bedrijf', 200],
  ['wanneer', 'Wanneer, ongeveer', 200],
  ['bericht', 'Bericht', 5000],
];
// verplichte velden per soort
const VERPLICHT = {
  keynote: ['naam', 'bericht'],
  mentor: ['naam', 'bericht'],
  stip: ['naam', 'bericht'],
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// Geen regeleinden in headers: dat is hoe mailinjectie werkt.
const enkeleRegel = (s) => s.replace(/[\r\n]+/g, ' ').trim();

function codeerKop(s) {
  // RFC 2047, voor een onderwerp met accenten of andere tekens buiten ASCII
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

function base64Regels(tekst) {
  const bytes = new TextEncoder().encode(tekst);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/.{1,76}/g, '$&\r\n').trimEnd();
}

export function leesFormulier(form) {
  const soort = String(form.get('soort') ?? '');
  if (!(soort in SOORTEN)) return { fout: 'Onbekend soort aanvraag.' };
  if (String(form.get('website') ?? '').trim() !== '') return { spam: true };

  const data = { soort };
  for (const [naam, , max] of VELDEN) {
    const waarde = String(form.get(naam) ?? '').trim();
    if (waarde.length > max) return { fout: `Het veld ${naam} is te lang.` };
    data[naam] = waarde;
  }
  if (VERPLICHT[soort].some((v) => !data[v])) return { fout: 'Niet alles is ingevuld.' };
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.mail)) return { fout: 'Dat e-mailadres klopt niet.' };
  return { data };
}

export function bouwMail(data, nu = new Date(), id = crypto.randomUUID()) {
  const onderwerp = `${SOORTEN[data.soort]}: ${enkeleRegel(data.naam)}${data.organisatie ? `, ${enkeleRegel(data.organisatie)}` : ''}`;
  const lijst = VELDEN.filter(([n]) => data[n]).map(([n, label]) => `${label}: ${data[n]}`);
  const tekst = `Nieuwe aanvraag via raymondklompsma.nl (${SOORTEN[data.soort]}).\r\n\r\n${lijst.join('\r\n')}\r\n\r\nAntwoord op deze mail om direct bij ${enkeleRegel(data.naam)} uit te komen.\r\n`;
  const kop = [
    `From: Website Raymond Klompsma <${AFZENDER}>`,
    `To: ${ONTVANGER}`,
    `Reply-To: ${enkeleRegel(data.naam).replace(/[<>",]/g, '')} <${data.mail}>`,
    `Subject: ${codeerKop(onderwerp)}`,
    `Date: ${nu.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@raymondklompsma.nl>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ].join('\r\n');
  return `${kop}\r\n\r\n${base64Regels(tekst)}\r\n`;
}

// `maakBericht(van, naar, raw)` komt uit index.js (new EmailMessage), `env.MAIL` is de send_email-binding.
export async function verwerk(request, env, maakBericht) {
  if (request.method !== 'POST') return json({ ok: false, fout: 'Alleen POST.' }, 405);

  const herkomst = request.headers.get('Origin');
  if (herkomst && !TOEGESTANE_HERKOMST.includes(herkomst) && !/^https:\/\/[a-z0-9-]+\.raymond-c50\.workers\.dev$/.test(herkomst) && !/^http:\/\/localhost(:\d+)?$/.test(herkomst)) {
    return json({ ok: false, fout: 'Niet toegestaan.' }, 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, fout: 'Geen geldig formulier.' }, 400);
  }
  const gelezen = leesFormulier(form);
  if (gelezen.spam) return json({ ok: true }); // de honeypot is gevuld: doe alsof het gelukt is
  if (gelezen.fout) return json({ ok: false, fout: gelezen.fout }, 400);

  try {
    await env.MAIL.send(maakBericht(AFZENDER, ONTVANGER, bouwMail(gelezen.data)));
  } catch (e) {
    console.error('Aanvraag versturen mislukt', e);
    return json({ ok: false, fout: 'Versturen mislukt.' }, 502);
  }
  return json({ ok: true });
}
