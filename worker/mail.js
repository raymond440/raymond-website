// Klantmail via Cloudflare Email Service (voorkeur) of Brevo. Zonder mailverstuurder wordt er niets verstuurd.
// De teksten zijn die van Raymond, letterlijk. Verander ze niet zonder zijn akkoord.

export const AFZENDER = { name: 'Raymond Klompsma', email: 'bestelling@raymondklompsma.nl' };
export const REPLY_TO = { email: 'hey-raymond@klompsma.nl', name: 'Raymond Klompsma' };
const SITE = 'https://raymondklompsma.nl';
const HONING = '#F7AC2E';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function kader(inhoudHtml, { intern = false } = {}) {
  const logo = intern ? '' : `<p style="margin:0 0 22px"><img src="${SITE}/erbij-logo.png" width="110" height="32" alt="ERBIJ" style="display:block;border:0"></p>`;
  return `<!doctype html><html lang="nl"><body style="margin:0;padding:0;background:#fef9f3">
<div style="max-width:560px;margin:0 auto;padding:28px 22px;background:#fef9f3;color:#3f3b39;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:27px">
${logo}${inhoudHtml}
<p style="margin:28px 0 0;padding-top:12px;border-top:1px solid ${HONING};text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${HONING}">Alles wat bestaat, is verbonden.</p>
</div></body></html>`;
}
const p = (t, stijl = '') => `<p style="margin:0 0 16px;${stijl}">${t}</p>`;

export function bevestigingsMail({ voornaam, aantal }) {
  const naam = esc(voornaam || '');
  const onderwerp = 'Je bent erbij.';
  const html = kader(
    p(`Hoi ${naam},`) +
      p(`Dank je wel. Je bestelling is binnen: ${esc(aantal)} keer twee potjes ERBIJ.`) +
      p('Ik pak ze zelf in en stuur ze eind november naar je toe. Je hoort van me zodra ze onderweg zijn.') +
      p('Eén potje is voor jou. Het andere mag je weggeven aan iemand die het volgens jou verdient. Zonder reden, zonder er iets voor terug te vragen.') +
      p('Vragen? Beantwoord deze mail gewoon. Ik lees alles en antwoord zelf.') +
      p('Raymond') +
      p('P.S. Melissa, de koningin van bijenkast 31G11, laat weten dat ze trots is. Ze zegt het niet vaak.', 'font-style:italic;color:#7a736d'),
  );
  const tekst = `Hoi ${voornaam || ''},

Dank je wel. Je bestelling is binnen: ${aantal} keer twee potjes ERBIJ.

Ik pak ze zelf in en stuur ze eind november naar je toe. Je hoort van me zodra ze onderweg zijn.

Eén potje is voor jou. Het andere mag je weggeven aan iemand die het volgens jou verdient. Zonder reden, zonder er iets voor terug te vragen.

Vragen? Beantwoord deze mail gewoon. Ik lees alles en antwoord zelf.

Raymond

P.S. Melissa, de koningin van bijenkast 31G11, laat weten dat ze trots is. Ze zegt het niet vaak.

Alles wat bestaat, is verbonden.
`;
  return { onderwerp, html, tekst };
}

// volgen: een link of een trackingcode (mag leeg). Een code wordt een link als TRACK_URL (met {code}) is ingesteld.
// PostNL: https://postnl.nl/tracktrace/?B=<code>&P=<postcode>&D=<land>&T=C (formaat uit PostNL's eigen integratiegids, nog niet met een echte zending geprobeerd)
export const POSTNL_URL = 'https://postnl.nl/tracktrace/?B={code}&P={postcode}&D={land}&T=C';

export function verzendMail({ voornaam, volgen = '', trackUrl = POSTNL_URL, postcode = '', land = 'NL' }) {
  const naam = esc(voornaam || '');
  const v = volgen.trim();
  let link = '';
  if (/^https?:\/\//i.test(v)) link = v;
  else if (v && trackUrl) link = trackUrl.replace('{code}', encodeURIComponent(v)).replace('{postcode}', encodeURIComponent(postcode.replace(/\s+/g, ''))).replace('{land}', encodeURIComponent(land));
  const volgZin = link ? ` Je kunt ze hier volgen: <a href="${esc(link)}" style="color:#3f3b39">${esc(link)}</a>.` : v ? ` Trackingcode: ${esc(v)}.` : '';
  const volgTekst = link ? ` Je kunt ze hier volgen: ${link}.` : v ? ` Trackingcode: ${v}.` : '';
  const onderwerp = 'Je honing is onderweg.';
  const html = kader(
    p(`Hoi ${naam},`) +
      p(`Je potjes zijn onderweg.${volgZin}`) +
      p('Een kleine tip: honing kan van nature kristalliseren. Dat is geen fout, dat is echte honing. Zet het potje even in een bakje warm water en hij wordt weer vloeibaar.') +
      p('En vergeet het tweede potje niet. Je weet vast al voor wie hij is.') +
      p('Raymond'),
  );
  const tekst = `Hoi ${voornaam || ''},

Je potjes zijn onderweg.${volgTekst}

Een kleine tip: honing kan van nature kristalliseren. Dat is geen fout, dat is echte honing. Zet het potje even in een bakje warm water en hij wordt weer vloeibaar.

En vergeet het tweede potje niet. Je weet vast al voor wie hij is.

Raymond

Alles wat bestaat, is verbonden.
`;
  return { onderwerp, html, tekst };
}

export function bestellingIntern(b, verzondenUrl) {
  const regel = (k, v) => `<tr><td style="padding:4px 14px 4px 0;color:#7a736d;vertical-align:top">${k}</td><td style="padding:4px 0">${v}</td></tr>`;
  const euro = (n) => n.toFixed(2).replace('.', ',');
  const html = kader(
    `<table style="border-collapse:collapse;font-size:16px;margin:0 0 18px">` +
      regel('Naam', esc(b.naam)) +
      regel('Aantal', `${esc(b.aantal)} ${b.aantal === 1 ? 'set' : 'sets'} van twee potjes`) +
      regel('Adres', b.adresRegels.map(esc).join('<br>')) +
      regel('E-mail', esc(b.email)) +
      regel('Telefoon', esc(b.telefoon || 'niet opgegeven')) +
      regel('Betaald', `€ ${euro(b.totaal)}${b.methode ? ` via ${esc(b.methode)}` : ''}`) +
      regel('Stripe', esc(b.piId || b.sessieId)) +
      `</table>` +
      `<p style="margin:0 0 6px"><a href="${esc(verzondenUrl)}" style="display:inline-block;background:${HONING};color:#3f3b39;border:1px solid #3f3b39;padding:12px 20px;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;font-weight:bold;text-decoration:none">Markeer als verstuurd</a></p>`,
    { intern: true },
  );
  const tekst = `Nieuwe bestelling ERBIJ

Naam: ${b.naam}
Aantal: ${b.aantal} ${b.aantal === 1 ? 'set' : 'sets'} van twee potjes
Adres: ${b.adresRegels.join(', ')}
E-mail: ${b.email}
Telefoon: ${b.telefoon || 'niet opgegeven'}
Betaald: € ${euro(b.totaal)}${b.methode ? ` via ${b.methode}` : ''}
Stripe: ${b.piId || b.sessieId}

Markeer als verstuurd: ${verzondenUrl}
`;
  return { onderwerp: 'Nieuwe bestelling ERBIJ', html, tekst };
}

// Voorkeur: Cloudflare Email Service (binding EMAIL, geen extra account). Anders Brevo (BREVO_API_KEY).
export async function verstuurMail(env, { naar, naam, mail }) {
  const van = env.MAIL_FROM || AFZENDER.email;
  if (env.EMAIL?.send) {
    await env.EMAIL.send({
      from: { email: van, name: AFZENDER.name },
      to: naam ? { email: naar, name: naam } : naar,
      replyTo: REPLY_TO,
      subject: mail.onderwerp,
      html: mail.html,
      text: mail.tekst,
    });
    return;
  }
  if (!env.BREVO_API_KEY) throw new Error('Geen mailverstuurder ingesteld (binding EMAIL of BREVO_API_KEY)');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: AFZENDER.name, email: van },
      to: [{ email: naar, ...(naam ? { name: naam } : {}) }],
      replyTo: REPLY_TO,
      subject: mail.onderwerp,
      htmlContent: mail.html,
      textContent: mail.tekst,
    }),
  });
  if (!res.ok) throw new Error(`Brevo: ${res.status} ${(await res.text()).slice(0, 200)}`);
}
