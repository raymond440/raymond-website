// Stripe via de REST-API (geen SDK nodig). De sleutel is een Cloudflare-secret, nooit in de repo.
import { hmacHex, gelijk } from './crypto.js';

export const PRIJS_CENTEN = 2995; // € 29,95 per set van twee potjes, inclusief btw en verzending
export const MAX_SETS = 5;

function formulier(obj, voorvoegsel = '', uit = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const sleutel = voorvoegsel ? `${voorvoegsel}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? formulier(x, `${sleutel}[${i}]`, uit) : uit.append(`${sleutel}[${i}]`, String(x))));
    else if (v && typeof v === 'object') formulier(v, sleutel, uit);
    else if (v !== undefined && v !== null) uit.append(sleutel, String(v));
  }
  return uit;
}

async function stripe(env, methode, pad, body) {
  const res = await fetch(`https://api.stripe.com/v1/${pad}`, {
    method: methode,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: body ? formulier(body).toString() : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${methode} ${pad}: ${res.status} ${json?.error?.message ?? ''}`);
  return json;
}

export function maakCheckout(env, aantal, origin) {
  const regel = env.STRIPE_PRICE_ID
    ? { price: env.STRIPE_PRICE_ID, quantity: aantal }
    : {
        quantity: aantal,
        price_data: {
          currency: 'eur',
          unit_amount: PRIJS_CENTEN,
          product_data: { name: 'ERBIJ, twee potjes', description: 'Twee potjes honing van 250 gram. Inclusief verzending.' },
        },
      };
  return stripe(env, 'POST', 'checkout/sessions', {
    mode: 'payment',
    locale: 'nl',
    success_url: `${origin}/erbij/bedankt/`,
    cancel_url: `${origin}/erbij/#bestel`,
    line_items: [regel],
    payment_method_types: ['ideal', 'card'],
    shipping_address_collection: { allowed_countries: (env.ERBIJ_LANDEN ?? 'NL').split(',') },
    // optioneel telefoonnummer: een eigen veld, want phone_number_collection is bij Stripe altijd verplicht
    custom_fields: [{ key: 'telefoon', label: { type: 'custom', custom: 'Telefoon (mag leeg)' }, type: 'text', optional: true }],
    metadata: { product: 'erbij', aantal },
    payment_intent_data: { metadata: { product: 'erbij', aantal } },
  });
}

export const haalSessie = (env, id) => stripe(env, 'GET', `checkout/sessions/${encodeURIComponent(id)}?expand[]=payment_intent.latest_charge`);
export const haalIntent = (env, id) => stripe(env, 'GET', `payment_intents/${encodeURIComponent(id)}`);
export const zetIntentMetadata = (env, id, metadata) => stripe(env, 'POST', `payment_intents/${encodeURIComponent(id)}`, { metadata });
export async function vindSessieVoorIntent(env, piId) {
  const lijst = await stripe(env, 'GET', `checkout/sessions?payment_intent=${encodeURIComponent(piId)}&limit=1&expand[]=data.payment_intent.latest_charge`);
  return lijst.data?.[0];
}

// Stripe-Signature: t=...,v1=...  (HMAC-SHA256 over `${t}.${body}`), met een tolerantie van vijf minuten.
export async function controleerWebhook(body, kop, geheim, nu = Date.now(), tolerantie = 300) {
  if (!kop || !geheim) return false;
  const delen = Object.fromEntries(kop.split(',').map((d) => d.split('=')));
  const t = Number(delen.t);
  if (!t || Math.abs(nu / 1000 - t) > tolerantie) return false;
  const verwacht = await hmacHex(geheim, `${t}.${body}`);
  return kop.split(',').filter((d) => d.startsWith('v1=')).some((d) => gelijk(d.slice(3), verwacht));
}

// De bestelling in gewone woorden, uit een Checkout Session (met uitgeklapte payment_intent.latest_charge).
export function bestellingUitSessie(s) {
  const klant = s.customer_details ?? {};
  const verzend = s.collected_information?.shipping_details ?? s.shipping_details ?? {};
  const adres = verzend.address ?? klant.address ?? {};
  const tel = s.custom_fields?.find((f) => f.key === 'telefoon')?.text?.value || klant.phone || '';
  const aantal = Number(s.metadata?.aantal) || 1;
  const methode = s.payment_intent?.latest_charge?.payment_method_details?.type ?? s.payment_method_types?.[0] ?? '';
  return {
    naam: verzend.name || klant.name || '',
    voornaam: (klant.name || verzend.name || '').trim().split(/\s+/)[0] || '',
    email: klant.email || '',
    telefoon: tel,
    aantal,
    totaal: (s.amount_total ?? 0) / 100,
    methode: methode === 'ideal' ? 'iDEAL' : methode === 'card' ? 'kaart' : methode,
    adresRegels: [adres.line1, adres.line2, [adres.postal_code, adres.city].filter(Boolean).join(' '), adres.country].filter(Boolean),
    piId: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id,
    sessieId: s.id,
  };
}
