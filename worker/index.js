import { EmailMessage } from 'cloudflare:email';
import { verwerk } from './aanvraag.js';
import { verwerkZon } from './zon.js';
import { checkout, webhook, verzonden, herroepen } from './erbij.js';
import { devPostbus, esc } from './mail.js';

// De site zelf is statisch (./dist). Dit Worker-script handelt alleen /api/* af; de rest komt direct uit de assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/aanvraag') return verwerk(request, env, (van, naar, raw) => new EmailMessage(van, naar, raw));
    if (url.pathname === '/api/zon') return verwerkZon(request, env, (van, naar, raw) => new EmailMessage(van, naar, raw));
    if (url.pathname === '/api/erbij/checkout') return checkout(request, env);
    if (url.pathname === '/api/erbij/webhook') return webhook(request, env);
    if (url.pathname === '/api/erbij/verzonden') return verzonden(request, env);
    if (url.pathname === '/api/erbij/herroepen') return herroepen(request, env);
    // alleen lokaal, met MAIL_DRY_RUN=1: bekijk de mails die anders zouden zijn verstuurd
    if (url.pathname === '/api/erbij/dev-mails' && env.MAIL_DRY_RUN === '1') {
      const n = url.searchParams.get('n');
      if (n !== null) return new Response(devPostbus[Number(n)]?.html ?? 'Geen mail.', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return new Response(`<!doctype html><meta charset="utf-8"><body style="font:16px/1.5 Georgia,serif;max-width:40rem;margin:2rem auto"><h1>Testmails</h1><ol>${devPostbus.map((m, i) => `<li><a href="?n=${i}">${esc(m.onderwerp)}</a> aan ${esc(m.naar)}</li>`).join('')}</ol>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return env.ASSETS.fetch(request);
  },
};
