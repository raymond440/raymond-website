// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://raymondklompsma.nl',
  trailingSlash: 'always',
  integrations: [sitemap()],
  redirects: {
    '/over': '/samenwerken/',
    '/artikelen': '/verder-geschreven/',
    '/artikelen/mag-middelmatigheid-alsjeblieft-sterven': '/artikelen/middelmatig-mag-in-je-werk-niet/',
  },
});
