// Kleine hulpjes rond HMAC (WebCrypto, werkt in Workers en Node 22).
const enc = new TextEncoder();

export async function hmacHex(geheim, data) {
  const sleutel = await crypto.subtle.importKey('raw', enc.encode(geheim), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', sleutel, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// vergelijken in constante tijd
export function gelijk(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let verschil = 0;
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return verschil === 0;
}

const b64u = (s) => btoa(String.fromCharCode(...enc.encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

// Ondertekende token voor de link "Markeer als verstuurd": bevat alleen het PaymentIntent-ID en een einddatum.
export async function maakToken(geheim, pi, geldigDagen = 120, nu = Date.now()) {
  const lading = b64u(JSON.stringify({ pi, e: Math.floor(nu / 1000) + geldigDagen * 86400 }));
  return `${lading}.${await hmacHex(geheim, lading)}`;
}

export async function leesToken(geheim, token, nu = Date.now()) {
  if (typeof token !== 'string' || !geheim) return null;
  const [lading, sig] = token.split('.');
  if (!lading || !sig || !gelijk(sig, await hmacHex(geheim, lading))) return null;
  try {
    const data = JSON.parse(unb64u(lading));
    if (!data.pi || data.e < Math.floor(nu / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}
