# Designsysteem raymondklompsma.nl

Afgeleid van The Hoxton (nieuwsbrieven), gelezen door de bril van Sivers: tekst voorop, weinig ornament. Alleen licht.

## Tokens (`src/styles/global.css`)

| Token | Waarde | Rol |
|---|---|---|
| `--creme` | `#fef9f3` | achtergrond |
| `--inkt` | `#3f3b39` | tekst, links, randen. Nooit zwart. |
| `--zand` | `#dac9b3` | alle lijnen, 1px |
| `--koraal` | `#ff9272` | accent, alleen gevulde vlakken |
| `--koraal-inkt` | `#531b0b` | tekst en rand op koraal |
| `--gedempt` | `#7a736d` | datum, ondertekst |
| `--serif` | Newsreader Variable | artikeltekst, koppen |
| `--sans` | Avenir, Helvetica Neue, Arial | labels, navigatie, knoppen |
| `--speels` | Caveat Brush | supporting font |

## Regels

1. **Koraal maximaal één keer per pagina**, als gevuld vlak (de aanmeldknop). Nooit als tekstkleur, want het contrast is te laag.
2. **Caveat Brush alleen als accent:** de naam in de header, de kop van het aanmeldblok, de uitgelichte quote in een artikel (één per artikel, tussen twee alinea's), en op een deelplaatje. Nooit voor lopende tekst of artikelkoppen.
3. **Hoeken altijd 0.** Geen schaduwen, geen verlopen.
4. **Lijnen zijn schaars en 1px zand.** Alleen het aanmeldblok heeft een kader, en er staat een scheidingslijn in artikelen waar de schrijver die zelf zet. Lijsten, header, footer en de uitgelichte quote hebben geen lijnen: ruimte doet het werk. Knoppen en invoervelden hebben een 1px inktrand.
5. **Labels** (datum, "concept", navigatie, knoppen) zijn klein, sans en hoofdletters met letterspatiëring.
6. **Links in tekst** zijn onderstreept met een zandlijn, niet gekleurd.
7. **Leesbreedte** is 38rem. Niets in de tekstkolom is breder.
8. **Tekst is Sivers.** Kort, dicht, geen dashes als zinsverbinder, geen verzachters.

## Componenten (`src/components/`)

- `Inschrijven.astro`: aanmeldblok. Het enige koraal.
- `Lijst.astro`: artikellijst met titel, datum en zandlijnen.
- `Reageren.astro`: mailregel onder een artikel.
- `Analytics.astro`: PostHog, slapend zolang er geen sleutel is.

## Pagina's (`src/pages/`)

- `index`, `over`, `artikelen/index`, `artikelen/[id]` (de artikelpagina), `404`.
- `og/[id].png.ts`: deelplaatje per artikel en voor de site, met Caveat Brush als paden getekend.
- `stijl/`: stijlpagina, alleen lokaal.

## Artikelen

Markdown in `src/content/artikelen/`. `concept: true` toont het alleen lokaal. Zet op `false` om te publiceren.

## Lockbestand

Cloudflare bouwt met npm 10, de Mac heeft npm 11. Npm 11 laat twee `@emnapi`-pakketten uit het lockbestand, en dan faalt `npm ci` op Cloudflare. Na elke `npm install` of `npm uninstall`: draai `npm run lock` en commit `package-lock.json`.
