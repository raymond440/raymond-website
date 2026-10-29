import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Concepten zijn alleen zichtbaar in `npm run dev` (of een build met CONCEPTEN=1), nooit in de build voor live.
const artikelen = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/artikelen' }),
  schema: z.object({
    titel: z.string(),
    // alleen voor de volgorde in lijsten en RSS, nergens getoond: artikelen zijn tijdloos
    datum: z.coerce.date(),
    beschrijving: z.string(),
    tekening: z.enum(['zon', 'deur', 'pakje', 'trap']).optional(),
    // plek in de ode: de slug (anker) van de sectie waar dit stuk aan hangt, of de slug van een ander artikel
    // (dan hoort dit stuk bij dat artikel, zonder eigen plek in de ode)
    hoort_bij: z.string().optional(),
    // het begin van de zin in de ode waar de tak aan vastzit; daar komt de verwijzing in de kantlijn
    brug: z.string().optional(),
    // korte zin voor in de kantlijn
    kantlijn: z.string().optional(),
    // een stuk dat eerder elders verscheen: de datum wordt dan getoond als "Verschenen op ..."
    verschenen: z.coerce.date().optional(),
    concept: z.boolean().default(false),
  }),
});

// De ode aan onbevangenheid: de stam van de site, één bestand met zes delen.
const ode = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ode' }),
  schema: z.object({
    titel: z.string(),
    beschrijving: z.string(),
    // de enige datum op de site, getoond als "Laatst bijgewerkt"
    bijgewerkt: z.coerce.date(),
    concept: z.boolean().default(false),
  }),
});

// Losse pagina's bij ERBIJ: voorwaarden en privacy. De tekst komt van Raymond; tot dan staat concept op true.
const pagina = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pagina' }),
  schema: z.object({
    titel: z.string(),
    beschrijving: z.string(),
    concept: z.boolean().default(true),
  }),
});

export const collections = { artikelen, ode, pagina };
