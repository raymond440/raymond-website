// Draai met: node scripts/test-aanvraag.mjs
import assert from 'node:assert/strict';
import { leesFormulier, bouwMail, verwerk } from '../worker/aanvraag.js';

const f = (o) => { const d = new FormData(); for (const [k, v] of Object.entries(o)) d.set(k, v); return d; };
const goed = { soort: 'keynote', naam: 'Anne Jansen', mail: 'anne@voorbeeld.nl', organisatie: 'Café Ça', bericht: 'Een event in maart, 200 mensen.', website: '' };

assert.ok(leesFormulier(f(goed)).data);
assert.ok(leesFormulier(f({ ...goed, website: 'x' })).spam);
assert.ok(leesFormulier(f({ ...goed, soort: 'iets' })).fout);
assert.ok(leesFormulier(f({ ...goed, mail: 'geen-mail' })).fout);
assert.ok(leesFormulier(f({ ...goed, bericht: '' })).fout);
assert.ok(leesFormulier(f({ ...goed, bericht: 'x'.repeat(5001) })).fout);

// bestelling ERBIJ: geen bericht nodig, wel adres
const bestel = { soort: 'erbij', naam: 'Jan', mail: 'jan@voorbeeld.nl', aantal: '2', telefoon: '0612345678', adres: 'Straat 1', postcode: '9711 AA', plaats: 'Groningen', bericht: '', website: '' };
assert.ok(leesFormulier(f(bestel)).data);
assert.ok(leesFormulier(f({ ...bestel, adres: '' })).fout);
const bm = bouwMail(leesFormulier(f(bestel)).data, new Date('2026-10-25T12:00:00Z'), 'id2');
assert.match(bm.split('\r\n\r\n')[0], /Subject: Bestelling ERBIJ: Jan, 2 set\(s\)/);
assert.match(Buffer.from(bm.split('\r\n\r\n').slice(1).join('').replace(/\r\n/g, ''), 'base64').toString('utf8'), /Postcode: 9711 AA/);

// regeleinden in de naam mogen geen extra header opleveren
const mail = bouwMail(leesFormulier(f({ ...goed, naam: 'Piet\r\nBcc: boos@voorbeeld.nl' })).data, new Date('2026-10-25T12:00:00Z'), 'id1');
const [kop, ...rest] = mail.split('\r\n\r\n');
assert.ok(!/^Bcc:/mi.test(kop), 'headerinjectie');
const body = Buffer.from(rest.join('').replace(/\r\n/g, ''), 'base64').toString('utf8');
assert.match(body, /Bericht: Een event in maart/);
assert.match(kop, /Subject: =\?UTF-8\?B\?/); // Ç in de organisatie

// verwerken met een nepbinding
let verstuurd;
const env = { MAIL: { send: async (m) => { verstuurd = m; } } };
const req = (o, headers = {}) => new Request('https://raymondklompsma.nl/api/aanvraag', { method: 'POST', body: f(o), headers });
let r = await verwerk(req(goed, { Origin: 'https://raymondklompsma.nl' }), env, (a, b, raw) => ({ a, b, raw }));
assert.equal(r.status, 200); assert.equal(verstuurd.b, 'raymond@klompsma.nl');
verstuurd = undefined;
r = await verwerk(req(goed, { Origin: 'https://boos.example' }), env, (a, b, raw) => ({ a, b, raw }));
assert.equal(r.status, 403); assert.equal(verstuurd, undefined);
r = await verwerk(req({ ...goed, website: 'bot' }), env, (a, b, raw) => ({ a, b, raw }));
assert.equal(r.status, 200); assert.equal(verstuurd, undefined);
r = await verwerk(req({ ...goed, mail: 'x' }), env, (a, b, raw) => ({ a, b, raw }));
assert.equal(r.status, 400);
r = await verwerk(req(goed), { MAIL: { send: async () => { throw new Error('nee'); } } }, (a, b, raw) => ({ a, b, raw }));
assert.equal(r.status, 502);
console.log('aanvraag: alles ok');
