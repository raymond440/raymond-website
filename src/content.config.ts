import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artikelen = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/artikelen' }),
  schema: z.object({
    titel: z.string(),
    datum: z.coerce.date(),
    beschrijving: z.string(),
    // concepten zijn alleen zichtbaar in `npm run dev`, nooit in de build
    concept: z.boolean().default(false),
  }),
});

export const collections = { artikelen };
