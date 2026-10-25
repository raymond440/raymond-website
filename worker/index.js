import { EmailMessage } from 'cloudflare:email';
import { verwerk } from './aanvraag.js';
import { checkout, webhook, verzonden } from './erbij.js';

// De site zelf is statisch (./dist). Dit Worker-script handelt alleen /api/* af; de rest komt direct uit de assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/aanvraag') return verwerk(request, env, (van, naar, raw) => new EmailMessage(van, naar, raw));
    if (url.pathname === '/api/erbij/checkout') return checkout(request, env);
    if (url.pathname === '/api/erbij/webhook') return webhook(request, env);
    if (url.pathname === '/api/erbij/verzonden') return verzonden(request, env);
    return env.ASSETS.fetch(request);
  },
};
