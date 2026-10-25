import { EmailMessage } from 'cloudflare:email';
import { verwerk } from './aanvraag.js';

// De site zelf is statisch (./dist). Dit Worker-script handelt alleen /api/* af; de rest komt direct uit de assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/aanvraag') return verwerk(request, env, (van, naar, raw) => new EmailMessage(van, naar, raw));
    return env.ASSETS.fetch(request);
  },
};
