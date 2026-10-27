// Draai met: node scripts/test-zon.mjs
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { leesZon, bouwZonMail, verwerkZon, pngInfo } from '../worker/zon.js';

// een echte PNG van 640x360 met ruis, zodat hij boven de minimumgrootte uitkomt
function maakPng(w, h, ruis) {
  const crc = (buf) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const b of buf) r = t[(r ^ b) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h, 255);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; if (ruis) for (let i = 0; i < 200; i++) raw[y * (w * 3 + 1) + 1 + Math.floor(Math.random() * w * 3)] = Math.floor(Math.random() * 255); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const png = maakPng(640, 360, true);
const leeg = maakPng(640, 360, false);
assert.ok(png.length > 2000 && leeg.length < 2000, `groottes ${png.length} ${leeg.length}`);
assert.deepEqual(pngInfo(new Uint8Array(png)), { w: 640, h: 360 });
assert.equal(pngInfo(new Uint8Array(Buffer.from('geen png, maar wel lang genoeg om de controle te raken, zeker weten'))), null);

const f = (o, bestand = png) => { const d = new FormData(); for (const [k, v] of Object.entries(o)) d.set(k, v); if (bestand) d.set('tekening', new Blob([bestand], { type: 'image/png' }), 'zon.png'); return d; };
const goed = { naam: 'Anne', mail: 'anne@voorbeeld.nl', streken: '12', website: '' };

assert.ok((await leesZon(f(goed))).data);
assert.ok((await leesZon(f({ ...goed, naam: '', mail: '' }))).data, 'naam en mail zijn optioneel');
assert.ok((await leesZon(f({ ...goed, website: 'x' }))).spam);
assert.ok((await leesZon(f({ ...goed, streken: '1' }))).fout, 'te weinig streken');
assert.ok((await leesZon(f(goed, leeg))).fout, 'leeg vel');
assert.ok((await leesZon(f(goed, null))).fout, 'geen bestand');
assert.ok((await leesZon(f(goed, Buffer.alloc(5000, 1)))).fout, 'geen png');
assert.ok((await leesZon(f({ ...goed, mail: 'x' }))).fout);
assert.ok((await leesZon(f({ ...goed, naam: 'x'.repeat(81) }))).fout);

// de mail: bijlage, geen headerinjectie, onderwerp met accenten
const data = (await leesZon(f({ ...goed, naam: 'Zoë\r\nBcc: boos@voorbeeld.nl' }))).data;
const mail = bouwZonMail(data, new Date('2026-10-27T12:00:00Z'), 'abc123');
const [kop] = mail.split('\r\n\r\n');
assert.ok(!/^Bcc:/mi.test(kop), 'headerinjectie');
assert.match(kop, /^To: hey-raymond@klompsma\.nl$/m);
assert.match(kop, /multipart\/mixed; boundary="zon-abc123"/);
assert.match(kop, /Subject: =\?UTF-8\?B\?/);
const bijlage = mail.split('Content-Transfer-Encoding: base64\r\n\r\n')[2].split('\r\n--zon-abc123--')[0].replace(/\r\n/g, '');
assert.ok(Buffer.from(bijlage, 'base64').equals(png), 'de bijlage is de ingestuurde PNG');
assert.match(mail, /filename="zon\.png"/);

// verwerken met een nepbinding
let verstuurd;
const env = { MAIL: { send: async (m) => { verstuurd = m; } } };
const req = (o, headers = {}, b) => new Request('https://raymondklompsma.nl/api/zon', { method: 'POST', body: f(o, b), headers });
const mb = (a, b, raw) => ({ a, b, raw });
let r = await verwerkZon(req(goed, { Origin: 'https://raymondklompsma.nl' }), env, mb);
assert.equal(r.status, 200); assert.equal(verstuurd.b, 'raymond@klompsma.nl');
verstuurd = undefined;
r = await verwerkZon(req(goed, { Origin: 'https://boos.example' }), env, mb);
assert.equal(r.status, 403); assert.equal(verstuurd, undefined);
r = await verwerkZon(req({ ...goed, website: 'bot' }), env, mb);
assert.equal(r.status, 200); assert.equal(verstuurd, undefined);
r = await verwerkZon(req(goed, {}, leeg), env, mb);
assert.equal(r.status, 400); assert.equal(verstuurd, undefined);
r = await verwerkZon(new Request('https://raymondklompsma.nl/api/zon'), env, mb);
assert.equal(r.status, 405);
r = await verwerkZon(req(goed), { MAIL: { send: async () => { throw new Error('nee'); } } }, mb);
assert.equal(r.status, 502);
console.log('zon: alles ok');
