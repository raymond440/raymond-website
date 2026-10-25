// ERBIJ: afrekenen met Stripe, bestelmails en de link "Markeer als verstuurd".
import { maakToken, leesToken } from './crypto.js';
import { maakCheckout, controleerWebhook, haalSessie, haalIntent, zetIntentMetadata, vindSessieVoorIntent, bestellingUitSessie, MAX_SETS } from './stripe.js';
import { bevestigingsMail, bestellingIntern, verzendMail, verstuurMail, esc } from './mail.js';

const INTERN = 'hey-raymond@klompsma.nl';
const geen404 = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
const tekst = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...geen404 } });
const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...geen404 } });

// 1. Afrekenen: de bezoeker kiest een aantal en gaat door naar de betaalpagina van Stripe.
export async function checkout(request, env) {
  if (request.method !== 'POST') return tekst('Alleen POST.', 405);
  const origin = new URL(request.url).origin;
  const terug = (fout) => Response.redirect(`${origin}/erbij/?fout=${fout}#bestel`, 303);
  const herkomst = request.headers.get('Origin');
  if (herkomst && herkomst !== origin) return tekst('Niet toegestaan.', 403);
  let aantal;
  try {
    aantal = Number((await request.formData()).get('aantal'));
  } catch {
    return terug('formulier');
  }
  if (!Number.isInteger(aantal) || aantal < 1 || aantal > MAX_SETS) return terug('aantal');
  try {
    const sessie = await maakCheckout(env, aantal, origin);
    return Response.redirect(sessie.url, 303);
  } catch (e) {
    console.error('Checkout aanmaken mislukt', e);
    return terug('betalen');
  }
}

// 2. Webhook: na betaling gaan er twee mails uit. De handtekening wordt altijd gecontroleerd.
export async function webhook(request, env) {
  if (request.method !== 'POST') return tekst('Alleen POST.', 405);
  const body = await request.text();
  if (!(await controleerWebhook(body, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET))) return tekst('Ongeldige handtekening.', 400);

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return tekst('Geen geldige JSON.', 400);
  }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return tekst('Genegeerd.');
  const ruw = event.data?.object;
  if (!ruw || ruw.payment_status !== 'paid' || ruw.metadata?.product !== 'erbij') return tekst('Genegeerd.');

  try {
    const sessie = await haalSessie(env, ruw.id);
    const b = bestellingUitSessie(sessie);
    // Stripe stuurt events soms dubbel: de vlag op de betaling zorgt dat er maar één keer gemaild wordt.
    const intent = await haalIntent(env, b.piId);
    if (intent.metadata?.bevestigd === 'ja') return tekst('Al afgehandeld.');

    const origin = new URL(request.url).origin;
    const token = await maakToken(env.ERBIJ_TOKEN_SECRET, b.piId);
    if (b.email) await verstuurMail(env, { naar: b.email, naam: b.naam, mail: bevestigingsMail(b) });
    await verstuurMail(env, { naar: INTERN, mail: bestellingIntern(b, `${origin}/api/erbij/verzonden?t=${token}`) });
    await zetIntentMetadata(env, b.piId, { bevestigd: 'ja' });
    return tekst('Afgehandeld.');
  } catch (e) {
    console.error('Webhook afhandelen mislukt', e);
    return tekst('Mislukt, probeer opnieuw.', 500); // Stripe probeert het later nog eens
  }
}

// 3. "Markeer als verstuurd": een beveiligde pagina met een optioneel veld voor een trackingcode.
const pagina = (inhoud) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>ERBIJ, bestelling</title></head>
<body style="margin:0;background:#fef9f3;color:#3f3b39;font-family:Georgia,serif;font-size:19px;line-height:29px"><main style="max-width:34rem;margin:0 auto;padding:2rem 1.2rem">
<p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#7a736d;margin:0 0 .5rem">ERBIJ, bestelling</p>${inhoud}</main></body></html>`;

async function bestellingVoorToken(env, token) {
  const data = await leesToken(env.ERBIJ_TOKEN_SECRET, token);
  if (!data) return null;
  const intent = await haalIntent(env, data.pi);
  const sessie = await vindSessieVoorIntent(env, data.pi);
  if (!sessie) return null;
  return { pi: data.pi, intent, b: bestellingUitSessie(sessie) };
}

export async function verzonden(request, env) {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const t = url.searchParams.get('t');
    let uitkomst;
    try {
      uitkomst = await bestellingVoorToken(env, t);
    } catch (e) {
      console.error(e);
      return html(pagina('<h1 style="font-weight:500">Even niet gelukt.</h1><p>Probeer het zo nog eens.</p>'), 502);
    }
    if (!uitkomst) return html(pagina('<h1 style="font-weight:500">Deze link werkt niet.</h1><p>Hij is ongeldig of verlopen.</p>'), 403);
    const { b, intent } = uitkomst;
    const al = intent.metadata?.verstuurd === 'ja';
    return html(
      pagina(
        `<h1 style="font-weight:500;font-size:30px;line-height:38px;margin:.2rem 0 1rem">${esc(b.naam)}, ${esc(b.aantal)} ${b.aantal === 1 ? 'set' : 'sets'}</h1><p style="margin:0 0 1rem">${esc(b.adresRegels.join(', '))}</p>` +
          (al
            ? `<p>Al als verstuurd gemarkeerd op ${esc(intent.metadata.verstuurd_op || '')}. De klant heeft de verzendmail gehad.</p>`
            : `<form method="post" action="/api/erbij/verzonden"><input type="hidden" name="t" value="${esc(t)}"><label style="display:block;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#7a736d;margin-bottom:.3rem">Trackingcode (mag leeg)</label><input name="volgen" placeholder="Bijvoorbeeld 3SABCD1234567" style="width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:.6rem .75rem;border:1px solid #3f3b39;background:#fef9f3;margin-bottom:1rem"><button type="submit" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;font-weight:bold;padding:.8rem 1.3rem;border:1px solid #3f3b39;background:#F7AC2E;color:#3f3b39;cursor:pointer">Stuur de verzendmail</button></form>`),
      ),
    );
  }
  if (request.method !== 'POST') return tekst('Niet toegestaan.', 405);

  const form = await request.formData();
  const uitkomst = await bestellingVoorToken(env, String(form.get('t') ?? '')).catch(() => null);
  if (!uitkomst) return html(pagina('<h1 style="font-weight:500">Deze link werkt niet.</h1>'), 403);
  const { b, intent, pi } = uitkomst;
  if (intent.metadata?.verstuurd === 'ja') return html(pagina('<h1 style="font-weight:500">Al verstuurd.</h1><p>Deze bestelling was al gemarkeerd. Er is geen tweede mail uitgegaan.</p>'));
  const volgen = String(form.get('volgen') ?? '').trim().slice(0, 300);
  try {
    if (b.email) await verstuurMail(env, { naar: b.email, naam: b.naam, mail: verzendMail({ voornaam: b.voornaam, volgen, trackUrl: env.TRACK_URL }) });
    await zetIntentMetadata(env, pi, { verstuurd: 'ja', verstuurd_op: new Date().toISOString().slice(0, 10), ...(volgen ? { trackingcode: volgen.slice(0, 450) } : {}) });
  } catch (e) {
    console.error('Verzendmail mislukt', e);
    return html(pagina('<h1 style="font-weight:500">Niet gelukt.</h1><p>De verzendmail is niet verstuurd. Ga terug en probeer het opnieuw.</p>'), 502);
  }
  return html(pagina(`<h1 style="font-weight:500;font-size:30px;line-height:38px;margin:.2rem 0 1rem">Verstuurd.</h1><p>${esc(b.voornaam || b.naam)} heeft de verzendmail gekregen en de bestelling staat als verstuurd in Stripe.</p>`));
}
