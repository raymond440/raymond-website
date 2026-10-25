// Draai met: node scripts/test-erbij.mjs   (Stripe en Brevo worden nagebootst, er gaat niets echt weg)
import assert from 'node:assert/strict';
import { hmacHex, maakToken, leesToken } from '../worker/crypto.js';
import { checkout, webhook, verzonden } from '../worker/erbij.js';
import { controleerWebhook } from '../worker/stripe.js';
import { bevestigingsMail, verzendMail, bestellingIntern } from '../worker/mail.js';

const env = { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test', ERBIJ_TOKEN_SECRET: 'token-geheim', BREVO_API_KEY: 'brevo-x', TRACK_URL: 'https://track.example/{code}/{postcode}/{land}' };

// ---- token
const tok = await maakToken(env.ERBIJ_TOKEN_SECRET, 'pi_1');
assert.equal((await leesToken(env.ERBIJ_TOKEN_SECRET, tok)).pi, 'pi_1');
assert.equal(await leesToken('ander', tok), null);
assert.equal(await leesToken(env.ERBIJ_TOKEN_SECRET, tok.slice(0, -2) + 'xx'), null);
assert.equal(await leesToken(env.ERBIJ_TOKEN_SECRET, tok, Date.now() + 200 * 86400 * 1000), null, 'verlopen');

// ---- nagebootste buitenwereld
const stripeState = { intent: { id: 'pi_1', metadata: { product: 'erbij', aantal: '2' } }, gemaild: [], calls: [] };
const sessie = {
  id: 'cs_test_1', payment_status: 'paid', amount_total: 5990, metadata: { product: 'erbij', aantal: '2' },
  customer_details: { name: 'Sanne de Vries', email: 'sanne@voorbeeld.nl', address: { country: 'NL' } },
  collected_information: { shipping_details: { name: 'Sanne de Vries', address: { line1: 'Voorbeeldstraat 1', postal_code: '1234 AB', city: 'Groningen', country: 'BE' } } },
  custom_fields: [{ key: 'telefoon', text: { value: '0612345678' } }],
  payment_intent: { id: 'pi_1', latest_charge: { payment_method_details: { type: 'ideal' } } },
};
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), m = init.method ?? 'GET';
  stripeState.calls.push(`${m} ${u.replace('https://api.stripe.com/v1/', '')}`);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('api.brevo.com')) { stripeState.gemaild.push(JSON.parse(init.body)); return json({ messageId: 'x' }, 201); }
  if (m === 'POST' && u.endsWith('/checkout/sessions')) { stripeState.checkoutBody = new URLSearchParams(init.body); return json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }); }
  if (u.includes('/checkout/sessions?payment_intent=')) return json({ data: [sessie] });
  if (u.includes('/checkout/sessions/')) return json(sessie);
  if (m === 'POST' && u.includes('/payment_intents/')) { Object.assign(stripeState.intent.metadata, Object.fromEntries([...new URLSearchParams(init.body)].map(([k, v]) => [k.replace(/^metadata\[|\]$/g, ''), v]))); return json(stripeState.intent); }
  if (u.includes('/payment_intents/')) return json(stripeState.intent);
  return json({ error: { message: 'onbekend ' + u } }, 404);
};
const post = (pad, body, headers = {}) => new Request('https://raymondklompsma.nl' + pad, { method: 'POST', body, headers });
const fd = (o) => { const d = new FormData(); for (const [k, v] of Object.entries(o)) d.set(k, v); return d; };

// ---- afrekenen
let r = await checkout(post('/api/erbij/checkout', fd({ aantal: '2' }), { Origin: 'https://raymondklompsma.nl' }), env);
assert.equal(r.status, 303); assert.equal(r.headers.get('Location'), 'https://checkout.stripe.com/c/pay/cs_test_1');
const b = stripeState.checkoutBody;
assert.equal(b.get('mode'), 'payment'); assert.equal(b.get('line_items[0][quantity]'), '2');
assert.equal(b.get('line_items[0][price_data][unit_amount]'), '2995'); assert.equal(b.get('line_items[0][price_data][currency]'), 'eur');
assert.deepEqual([b.get('payment_method_types[0]'), b.get('payment_method_types[1]')], ['ideal', 'card']);
assert.equal(b.get('shipping_address_collection[allowed_countries][0]'), 'NL'); assert.equal(b.get('shipping_address_collection[allowed_countries][1]'), 'BE');
assert.equal(b.get('custom_fields[0][optional]'), 'true');
assert.equal(b.get('success_url'), 'https://raymondklompsma.nl/erbij/bedankt/');
for (const slecht of ['0', '6', 'x', '1.5', '']) {
  r = await checkout(post('/api/erbij/checkout', fd({ aantal: slecht })), env);
  assert.match(r.headers.get('Location'), /\/erbij\/\?fout=aantal/, 'aantal ' + slecht);
}
r = await checkout(post('/api/erbij/checkout', fd({ aantal: '1' }), { Origin: 'https://boos.example' }), env);
assert.equal(r.status, 403);

// ---- webhook
const event = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'paid', metadata: { product: 'erbij' } } } };
const body = JSON.stringify(event);
const t = Math.floor(Date.now() / 1000);
const kop = async (tt = t, geheim = env.STRIPE_WEBHOOK_SECRET) => `t=${tt},v1=${await hmacHex(geheim, `${tt}.${body}`)}`;
assert.equal(await controleerWebhook(body, await kop(), env.STRIPE_WEBHOOK_SECRET), true);
r = await webhook(post('/api/erbij/webhook', body, { 'Stripe-Signature': await kop(t, 'fout') }), env); assert.equal(r.status, 400, 'verkeerde handtekening');
r = await webhook(post('/api/erbij/webhook', body, { 'Stripe-Signature': await kop(t - 4000) }), env); assert.equal(r.status, 400, 'te oud');
r = await webhook(post('/api/erbij/webhook', body + ' ', { 'Stripe-Signature': await kop() }), env); assert.equal(r.status, 400, 'gewijzigde body');
r = await webhook(post('/api/erbij/webhook', body), env); assert.equal(r.status, 400, 'zonder handtekening');
assert.equal(stripeState.gemaild.length, 0);

r = await webhook(post('/api/erbij/webhook', body, { 'Stripe-Signature': await kop() }), env);
assert.equal(r.status, 200); assert.equal(stripeState.gemaild.length, 2);
const [klant, intern] = stripeState.gemaild;
assert.equal(klant.to[0].email, 'sanne@voorbeeld.nl'); assert.equal(klant.subject, 'Je bent erbij.');
assert.match(klant.htmlContent, /Hoi Sanne,/); assert.match(klant.htmlContent, /2 keer twee potjes ERBIJ/);
assert.equal(klant.replyTo.email, 'hey-raymond@klompsma.nl');
assert.equal(intern.to[0].email, 'hey-raymond@klompsma.nl'); assert.equal(intern.subject, 'Nieuwe bestelling ERBIJ');
assert.match(intern.htmlContent, /Voorbeeldstraat 1/); assert.match(intern.htmlContent, /0612345678/); assert.match(intern.htmlContent, /€ 59,90 via iDEAL/);
const link = intern.textContent.match(/https:\/\/raymondklompsma\.nl\/api\/erbij\/verzonden\?t=[^\s]+/)[0];
assert.equal(stripeState.intent.metadata.bevestigd, 'ja');
// tweede aflevering van hetzelfde event: geen nieuwe mails
r = await webhook(post('/api/erbij/webhook', body, { 'Stripe-Signature': await kop() }), env);
assert.equal(r.status, 200); assert.equal(stripeState.gemaild.length, 2, 'geen dubbele mails');
// andere events en onbetaalde sessies worden genegeerd
const ander = JSON.stringify({ type: 'charge.succeeded', data: { object: {} } });
r = await webhook(post('/api/erbij/webhook', ander, { 'Stripe-Signature': `t=${t},v1=${await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${t}.${ander}`)}` }), env);
assert.equal(r.status, 200); assert.equal(stripeState.gemaild.length, 2);

// ---- markeer als verstuurd
r = await verzonden(new Request(link), env); assert.equal(r.status, 200);
assert.match(await r.text(), /Sanne de Vries, 2 sets/);
r = await verzonden(new Request('https://raymondklompsma.nl/api/erbij/verzonden?t=onzin'), env); assert.equal(r.status, 403);
r = await verzonden(post('/api/erbij/verzonden', fd({ t: link.split('t=')[1], volgen: '3SABCD1234567' })), env);
assert.equal(r.status, 200); assert.equal(stripeState.gemaild.length, 3);
const verzend = stripeState.gemaild[2];
assert.equal(verzend.subject, 'Je honing is onderweg.'); assert.match(verzend.htmlContent, /track\.example\/3SABCD1234567\/1234AB\/BE/);
assert.equal(stripeState.intent.metadata.verstuurd, 'ja'); assert.equal(stripeState.intent.metadata.trackingcode, '3SABCD1234567');
r = await verzonden(post('/api/erbij/verzonden', fd({ t: link.split('t=')[1], volgen: '' })), env);
assert.equal(stripeState.gemaild.length, 3, 'geen tweede verzendmail');

// ---- mails zonder trackingcode en met een link
assert.doesNotMatch(verzendMail({ voornaam: 'Sanne' }).html, /volgen/);
assert.match(verzendMail({ voornaam: 'Sanne', volgen: 'https://t.example/abc' }).html, /Je kunt ze hier volgen/);
assert.match(bevestigingsMail({ voornaam: '<b>x</b>', aantal: 1 }).html, /&lt;b&gt;/, 'html wordt geëscaped');
console.log('erbij: alles ok');

// ---- Cloudflare Email Service als verstuurder
{
  const verstuurd = [];
  const envCf = { EMAIL: { send: async (m) => { verstuurd.push(m); return { messageId: 'm1' }; } } };
  const { verstuurMail } = await import('../worker/mail.js');
  await verstuurMail(envCf, { naar: 'a@b.nl', naam: 'A B', mail: bevestigingsMail({ voornaam: 'A', aantal: 1 }) });
  assert.equal(verstuurd[0].to.email, 'a@b.nl'); assert.equal(verstuurd[0].replyTo.email, 'hey-raymond@klompsma.nl'); assert.equal(verstuurd[0].subject, 'Je bent erbij.');
  await assert.rejects(() => verstuurMail({}, { naar: 'a@b.nl', mail: bevestigingsMail({ voornaam: 'A', aantal: 1 }) }));
  console.log('erbij (Cloudflare Email): ok');
}
