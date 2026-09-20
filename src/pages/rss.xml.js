import rss from '@astrojs/rss';
import { artikelen } from '../site';

export async function GET(context) {
  const lijst = await artikelen();
  return rss({
    title: 'Raymond Klompsma',
    description: 'Wat ik zie en waar ik in geloof.',
    site: context.site,
    items: lijst.map((a) => ({
      title: a.data.titel,
      pubDate: a.data.datum,
      description: a.data.beschrijving,
      link: `/artikelen/${a.id}/`,
    })),
    customData: '<language>nl-nl</language>',
  });
}
