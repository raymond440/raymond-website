# Designsysteem raymondklompsma.nl

Bron: het design system "Raymond Klompsma" in Claude Design (design-system.json v3, https://claude.ai/artifact/4zaqp8ka5zipbo57TtretQ), zelf afgeleid van de live site (september 2026) plus het RAY-logo. Dat systeem is de brontekst; dit bestand is de vertaling ervan naar deze codebase, inclusief wat de generator hier concreet betekent. Basis: The Hoxton (nieuwsbrieven), gelezen door de bril van Sivers: tekst voorop, weinig ornament. Alleen licht.

## Tokens (`src/styles/global.css`)

| Token | Waarde | Rol |
|---|---|---|
| `--creme` | `#fef9f3` | achtergrond |
| `--inkt` | `#3f3b39` | tekst, links, randen. Nooit zwart. |
| `--zand` | `#dac9b3` | haarlijnen, onderstreping van links |
| `--koraal` | `#ff9272` | de ene actiekleur: alleen de vulling van de primaire knop |
| `--koraal-inkt` | `#531b0b` | tekst en rand op koraal |
| `--gedempt` | `#7a736d` | datum, ondertitels, voettekst. Haalt 4.46:1 op creme: niet onder 19px gebruiken, behalve in hoofdletter-labels |
| `--geel` | `#fbd700` | merkgeel uit het RAY-logo: logo, vulling van de zon-tekening, markeerstift achter een uitgelichte zin. Nooit als tekstkleur op licht |
| `--pen` | `#030406` | de pennenstreek van de handtekening in het logo. Op creme gebruik je inkt, niet pen |
| `--serif` | Newsreader Variable, Newsreader | artikeltekst, koppen |
| `--sans` | Avenir, Helvetica Neue, Arial | labels, navigatie, knoppen |
| `--speels` | Caveat (gewicht 500) | supporting font, de hand van Raymond. Geen Caveat Brush meer: die was te dik, Caveat is de dunne pen die bij de handtekening in het logo past |

Typografische maten komen letterlijk uit het bronsysteem (`type.groups` in `tokens.json`): titel 41.8px/48px, kop 36.1px/43px, artikeltitel 23.8px/39px, intro (ondertitel) 21.9px/34px, tekst 19px/1.65, labels 13.68px met 1.2312px letterspatiëring, naam 35px/50px, handkop 37px/53px, uitgelicht 41px/52px, alle laatste drie in Caveat 500.

## Regels

1. **Koraal maximaal één keer per pagina**, als gevuld vlak (de aanmeldknop). Nooit als tekstkleur, want het contrast is te laag.
2. **Caveat alleen als accent:** de naam in de header, de kop van het aanmeldblok, de uitgelichte quote in een artikel (één per artikel, tussen twee alinea's, op de gele markeerstift), en op een deelplaatje. Nooit voor lopende tekst of artikelkoppen.
3. **Geel is het merkgeel**, niet het algemene accent. Het komt alleen voor als: de vulling van de zon-tekening, de markeerstift achter een uitgelichte zin, en (zodra er een vectorversie is) het logo zelf. Nooit als tekstkleur, nooit als achtergrond van een hele sectie.
4. **Hoeken altijd 0.** Geen schaduwen, geen verlopen.
5. **Lijnen zijn schaars en 1px zand.** Alleen het aanmeldblok heeft een kader, en er staat een scheidingslijn in artikelen waar de schrijver die zelf zet. Lijsten, header, footer en de uitgelichte quote hebben geen lijnen: ruimte doet het werk. Knoppen en invoervelden hebben een 1px inktrand. Navigatie en artikeltitels krijgen bij hover/actief een 2px zandlijn (`text-decoration: underline 2px var(--zand)`), geen opacity-verandering.
6. **Links in tekst** zijn onderstreept met een zandlijn, niet gekleurd.
7. **Leesbreedte** is 38rem. Niets in de tekstkolom is breder.
8. **Tekst is Sivers.** Kort, dicht, geen dashes als zinsverbinder, geen verzachters, geen emoji of uitroeptekens. Titels zijn zinnen die eindigen met een punt; alleen een echte vraag krijgt een vraagteken.
9. **Focus altijd zichtbaar:** een ononderbroken ring van 2px in inkt, 2px afstand (`:focus-visible`).

## Logo

Het RAY-logo (gele blokletters, een handtekening in pen erdoorheen, "Raymond Klompsma" eronder in geel) staat sinds 27 september 2026 in de header van de site, als afbeelding (`public/logo.png`, bronbestand `src/assets/ray-logo.png`), op 48px hoogte met ruime marge, in plaats van de getypte naam. Dat volgt de eigen regel van het bronsysteem: de Caveat-naam was een tijdelijke vervanging tot er een transparante versie van het logo was.

Bewaard in de vault: `projecten/Website raymondklompsma.nl/logo/ray-logo.jpg` (oud, op wit) en `ray-logo-transparant.png` (huidig, transparant, bijgesneden op de inhoud). Gebruik het bestand altijd ongewijzigd; nooit nabouwen.

**Nog open:** het logo staat nu alleen in de header, op 68px hoogte (was 48px: te klein om te lezen). Bronbestand is de officiële `ray-logo-bijgesneden.png` uit het Claude Design-systeem. Favicon (nu nog de losse zon-tekening) en het deelplaatje (nu nog Caveat-tekst) gebruiken het logo nog niet. Op kleine schermen kan de header wat drukker ogen door de vaste breedte van het logo; nog niet apart getest op mobiel. Er bestaat ook een lichte variant (`ray-logo-licht.png`) voor een donkere ondergrond, nu niet gebruikt want de site is alleen licht.

## Tekenstijl

Getekende lijnen die met opzet niet kloppen. De wiebelige zon uit het onbevangenheidsartikel is het merkteken.

- **Lijn:** inkt (`--inkt`), 3.2 dik, ronde uiteinden, onregelmatig.
- **Kleur:** de zon vult in **geel** (merkgeel, verbindt de tekening met het logo); de andere tekeningen (deur, pakje, trap) vullen in **koraal**. Eén vlak per tekening, iets naast de lijn geplaatst, zoals bij drukwerk. Geen schaduw, geen verloop.
- **Vorm:** eenvoudig en kinderlijk, maar niet slordig. Voorbeelden: zon, deur op een kier, pakje, trap.
- **Formaat:** klein en met veel lucht. Eén per artikel of nieuwsbrief. Nooit een plaat die de tekst verdringt.
- **Waar:** boven een artikel, in het deelplaatje, in de nieuwsbrief, op "Over mij" (trap), op de 404-pagina (deur) en klein in het aanmeldblok (zon, geel). Niet boven de homepagetekst zelf.
- **Nieuwe tekening toevoegen:** in `src/lib/tekeningen.ts`. Losse png's staan op `/tekening/<naam>.png`, bruikbaar in de nieuwsbrief.
- **Per artikel kiezen:** met `tekening: deur` in de frontmatter. Zonder keuze krijgt een artikel geen tekening en een zon in het deelplaatje.
- **Een echte hand is beter.** Deze tekeningen zijn gegenereerd. Zodra Raymond of een illustrator ze zelf tekent, vervangen die de gegenereerde.

## Markeerstift (`.markeer`)

Herbruikbare klasse voor "met de hand gearceerd": een gele achtergrond uit `public/markeer.svg`, één doorlopende streep die met `background-size: 100% ...` over de hele regel wordt uitgerekt, met `box-decoration-break: clone` zodat elke regel apart wordt gearceerd bij meerdere regels. Nooit een herhalende tegel (`repeat-x`): dat oogde als losse dabs per woord, geen echte streep.

**Gebruikt op twee plekken:**
1. **Uitgelichte quote in een artikel:** in Markdown geschreven als `> [!quote] tekst`, bij publicatie omgezet naar `<aside class="uitgelicht"><span class="markeer">tekst</span></aside>`. **Vergeet de binnenste `<span class="markeer">` niet** bij het schrijven van een nieuw artikel.
2. **De titel op de homepage:** `<h1><span class="markeer">Wat als het wel kan?</span></h1>`. De regel `h1 .markeer` in `global.css` geeft een iets andere achtergrondmaat, want de titel is groter dan de uitgelichte quote.

**Er is geen apart callout-blok.** Eerdere versie had een homepage-intro in een kader (zoals het aanmeldblok) of met een linker lijn (blockquote-vorm); beide voelden als citaat, niet als eigen gedachte. De oplossing: gewone lopende tekst, geen kader, en de titel zelf gearceerd in plaats van een apart tekstblok.

## Componenten (`src/components/`)

- `Inschrijven.astro`: aanmeldblok. Het enige koraal.
- `Lijst.astro`: artikellijst met titel, datum en zandlijnen.
- `Reageren.astro`: mailregel onder een artikel.
- `Analytics.astro`: PostHog, slapend zolang er geen sleutel is.
- `Tekening.astro`: een tekening uit `src/lib/tekeningen.ts`.

## Pagina's (`src/pages/`)

- `index`, `over`, `artikelen/index`, `artikelen/[id]` (de artikelpagina), `404`.
- `og/[id].png.ts`: deelplaatje per artikel en voor de site, met Caveat (gewicht 500) als paden getekend.
- `stijl/`: stijlpagina, alleen lokaal.

## Artikelen

Markdown in `src/content/artikelen/`. `concept: true` toont het alleen lokaal. Zet op `false` om te publiceren.

## Lockbestand

Cloudflare bouwt met npm 10, de Mac heeft npm 11. Npm 11 laat twee `@emnapi`-pakketten uit het lockbestand, en dan faalt `npm ci` op Cloudflare. Na elke `npm install` of `npm uninstall`: draai `npm run lock` en commit `package-lock.json`.
