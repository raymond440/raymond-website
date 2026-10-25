# Project: raymondklompsma.nl

Dit is het project voor de persoonlijke website van Raymond Klompsma: https://raymondklompsma.nl. De code staat in deze map (Astro, statisch). De tekst van de artikelen leeft in zijn kennisbibliotheek (een Obsidian-vault), niet hier. Dit bestand is de werkwijze. Lees het bij elke sessie helemaal, samen met `DESIGN.md`. (`CLAUDE.md` is een symlink naar dit bestand.)

Dit project is ontstaan uit één lange sessie (september 2026). Alles wat daar is besloten, gebouwd en geleerd staat hieronder. Wat hier staat is leidend boven wat je zelf zou verzinnen.

## 0. Nieuwe opzet (live sinds 25 oktober 2026)

Dit hoofdstuk gaat voor op de rest waar het botst. De site hangt aan één groot stuk, **"Een ode aan onbevangenheid."** (zes delen), met een Samenwerken-sectie ernaast.

- **Routes:** `/` · `/onbevangen` (de ode, sticky inhoudsopgave, takken in de kantlijn) · `/verder-geschreven` (alle artikelen per deel) · `/artikelen/<slug>` · `/samenwerken` · `/samenwerken/keynote|mentor|stip` (met aanvraagformulier). `/over` en `/artikelen` zijn redirects (`astro.config.mjs` en `public/_redirects`). Menu: Onbevangen · Verder geschreven · Samenwerken. Kruimelpad op elke pagina behalve home.
- **Ode:** `src/content/ode/onbevangen.md` (collectie `ode`), bron `atelier/drafts/Een ode aan onbevangenheid - versie 2.md` in de vault. `## Vooraf` en `## Deel N. Titel.` met `###` onderdelen; het anker van een onderdeel is de slug van de kop. `bijgewerkt` is de enige datum op de site. `src/lib/ode.ts` splitst de gerenderde HTML in delen en zet de kantlijnverwijzingen.
- **Datamodel artikelen:** `hoort_bij` (slug van een `###` in de ode, of `deel-N` voor een deel zonder kopjes, zoals deel 6), `brug` (een zin of zinsdeel dat letterlijk in de ode staat, ook midden in een alinea; de verwijzing komt voor die alinea; de build faalt als die zin niet gevonden wordt), `kantlijn` (korte zin voor de kantlijn). `datum` bepaalt alleen de volgorde (lijsten, RSS) en wordt **nergens getoond**: artikelen zijn tijdloos. Met twee of meer `##` subtitels krijgt een artikel een inhoudsopgave.
- **Aanbod:** er is nu wel aanbod op Samenwerken (keynote, mentor, de stip). Dit **vervangt het besluit "geen aanbod"**. Het besluit "geen doelgroep" blijft: de artikelen zijn nog steeds een reflectie van Raymond. Geen prijzen op de site.
- **Concepten bekijken:** `npm run dev`, of `CONCEPTEN=1 npm run build && npm run preview`. Een gewone build laat concepten weg; de ode zelf is `concept: true` (open vraag over de honing/ERBIJ-alinea), dus `/onbevangen` bestaat dan niet.
- **Formulieren:** posten naar `/api/aanvraag` (`worker/index.js`, `worker/aanvraag.js`, getest met `node scripts/test-aanvraag.mjs`). Mail naar raymond@klompsma.nl (Raymonds keuze, 25 okt) via de `send_email`-binding (voorstel voor `wrangler.jsonc`: `"main": "worker/index.js"`, `assets.binding "ASSETS"`, `assets.run_worker_first ["/api/*"]`, `send_email [{name MAIL, destination_address raymond@klompsma.nl}]`). **Staat AAN sinds 25 okt 2026 (Email Routing op raymondklompsma.nl, raymond@klompsma.nl geverifieerd). Vereist** Email Routing op raymondklompsma.nl en raymond@klompsma.nl als geverifieerd bestemmingsadres; zonder dat kan de deploy falen. Eerst Email Routing instellen, dan de wrangler-config toevoegen.
- **ERBIJ (live sinds 25 okt 2026):** `/erbij` (honingmerk, eigen accent `--honing`, bestelformulier via dezelfde Worker, soort `erbij`, € 29,95 per set, Raymond neemt bestellingen met de hand aan en stuurt een Tikkie). Niet in het hoofdmenu; wel in het voetmenu, op de homepage ("Ook van mij"), onder de producten op Samenwerken en als link in de ode. Logo: `ErbijLogo.astro` (paden uit `prototype/erbij-logo.svg`). Melissa Bijdehand is een persona; de brief ("Een woordje van de koningin") en de noot staan op de pagina. De welkomstmail "Drip email 1" hoort NIET op de site (bewaard voor de latere mailreeks). Prijs € 29,95 inclusief verzending. Geen donatie noemen.
- **ERBIJ afrekenen (branch `erbij-afrekenen`, nog niet live; getest in de Stripe-testmodus met iDEAL):** productkaart op `/erbij` (twee potjes uit `src/assets/erbij-potje.png`, aantalknop 1 t/m 5 met min en plus, totaal loopt mee in de knop Afrekenen; zonder JavaScript een keuzelijst) post naar `/api/erbij/checkout` (Worker), die een Stripe Checkout Session maakt (iDEAL en kaart, NL en BE, optioneel telefoonveld, € 29,95 per set incl. btw en verzending) en doorstuurt. `/api/erbij/webhook` controleert de Stripe-handtekening, stuurt de bevestiging naar de klant en de bestelling naar Raymond (met link "Markeer als verstuurd"), en zet `bevestigd: ja` op de betaling zodat dubbele events geen dubbele mails geven. `/api/erbij/verzonden` (ondertekende token, 120 dagen geldig) toont een formulier met optionele trackingcode, stuurt de verzendmail en zet `verstuurd: ja`, `verstuurd_op` en `trackingcode` in de metadata van de betaling in Stripe. `/erbij/bedankt/` is de bedanktpagina. Code: `worker/erbij.js`, `worker/stripe.js`, `worker/mail.js` (teksten van Raymond, letterlijk), `worker/crypto.js`. Test: `node scripts/test-erbij.mjs` (Stripe en mailservice nagebootst). Secrets (alleen namen): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ERBIJ_TOKEN_SECRET`, de binding `EMAIL` (Cloudflare Email Service, voorkeur, vereist Workers Paid en een geonboard verzenddomein) of anders `BREVO_API_KEY`, optioneel `STRIPE_PRICE_ID`, `MAIL_FROM`, `TRACK_URL` (met `{code}`), `ERBIJ_LANDEN`. Een bestelling als verstuurd markeren: de link in de mail "Nieuwe bestelling ERBIJ". Voorwaarden en privacy: `src/content/pagina/` (concept tot Raymond de tekst levert); `BEDRIJF` in `src/site.ts` moet KvK en btw hebben voor ze live mogen (de build faalt anders).
- **ERBIJ lokaal testen:** `scripts/dev-erbij.sh` (zet de testsleutel `sk_test_...` in `.dev.vars`, dat staat in `.gitignore`; de Stripe CLI staat in `~/.local/bin`). Mails worden niet verstuurd maar staan op `/api/erbij/dev-mails`. Getest op 25 okt 2026 in de Stripe-testmodus van account acct_1UUURiLeSihSBUU1: checkout, betaling met testkaart, webhook, beide mails, "Markeer als verstuurd" met verzendmail. Let op: Stripe's nieuwe API (2026-09-30) kent `payment_method_types` niet meer; de betaalmethoden staan in het dashboard onder Instellingen, Betaalmethoden. In de Stripe-sandbox (acct_1UUURiLeSihSBUU1) staan sinds 25 okt 2026 alleen iDEAL (Wero) en Bancontact aan; kaart, Apple Pay, Link, Klarna en de rest zijn uit. Voor live moet dat daar apart worden ingesteld.
- **Voet op elke pagina** (`Voet.astro`): aanmelden (enige koraal) en reageren met kopieerknop. Dit verving `Inschrijven.astro`. De dormant PostHog-code zit daarin.
- **Besloten op 25 okt:** Hotel Wonderland was door corona acht maanden dicht; persoonlijke passages in de drie artikelen mogen; honing-alinea in de ode mag; extra zinnen in de twee live artikelen akkoord; reviews keynote zoals getoond; "Ik begin niet meer op maandag." blijft voorlopig weg. Gepubliceerd op 25 okt 2026 ("publiceer dit"): ode en zes nieuwe artikelen.
- **Nog open:** reviews op de mentorpagina (sectie is verborgen tot ze er zijn, zie `reviews` in `mentor.astro`), review Toerisme Oost-Vlaanderen op de keynotepagina (weggelaten), mentorvormen afstemmen op Accio, menunaam Samenwerken of Samen beginnen, persoonlijke passages in "Geen verbod, wel lijnen." (voetbalverbod), "Een toets is een stipje." (IJsselmeer) en "Ik verveel me te weinig." (meditatie), en of de twee live artikelen de extra zin uit het prototype krijgen.

## 1. Waar dit project voor is

- **Doel:** in contact komen met mensen, omdat Raymond dat leuk vindt. Een nieuwsbrief, artikelen en reageren per mail. Geen scoreboard, geen groeitargets.
- **Voorbeeld:** sive.rs van Derek Sivers. Dat is een voorbeeld voor de vorm, niet voor de inhoud: waarde leveren, schrijven wanneer het past, op social zijn om mensen te bereiken, niet "meer, meer, meer" voor volgers.
- **Geen doelgroep.** Besluit van 25 september 2026: de site is een reflectie van Raymond zelf. Vraag nooit "voor welke doelgroep". Toets in plaats daarvan: is dit echt van hem, en zou hij het ook schrijven als niemand het las? Zeg het hardop als een tekst naar een lezer toe buigt (uitleggen, verkopen, pleasen). De titel "Wat als het wel kan?" is zijn eigen vraag aan zichzelf, geen belofte aan een lezer. Het verschil zit niet in de titel, maar in wat erna komt.
- **Thema:** onbevangenheid. De houding, niet het onderwerp: beginnen voor je het zeker weet, de wiebelige zon die je als kind tekende.

## 2. Koppeling met de kennisbibliotheek

De vault staat op `/Users/raymond/Documents/Mijn kennisbibliotheek`. Dit project leest en schrijft daarin, maar de vault blijft van Raymond.

**Begin van elke sessie:**
1. Controleer of je bij de vault kunt (`ls "/Users/raymond/Documents/Mijn kennisbibliotheek"`). Kan dat niet, vraag Raymond de map toe te voegen (`/add-dir` of via de desktop-app). Werk niet zonder vault.
2. Lees `/Users/raymond/Documents/Mijn kennisbibliotheek/CLAUDE.md`. Dat is het schema: lagen, conventies, de FEEDBACK-workflow en de lijst "wat je nooit doet". Dat bestand laadt niet vanzelf mee vanuit deze map.

| Wat | Waar in de vault |
|---|---|
| Concepten en afgeronde artikelen | `atelier/drafts/` en `atelier/gepubliceerd/` (daar met prefix `YYYY-MM-DD - titel.md`) |
| Hub voor schrijfwerk | `wiki/onderwerpen/Schrijven en Ray's atelier.md` (secties "Gepubliceerd" en "Drafts in uitvoering") |
| Schrijfstem en checklist | `wiki/syntheses/Raymonds schrijfstem en de Sivers-richting.md` |
| Thema's en valkuilen | `wiki/concepten/Onbevangenheid.md`, `Streng-Ray.md`, `Kopen in plaats van vragen.md` |
| Entiteit van de site | `wiki/entiteiten/raymondklompsma.nl.md` (let op § 9) |
| Projectbestanden (nieuwsbriefteksten, beelden, logo) | `projecten/Website raymondklompsma.nl/` |
| Projectpagina | `projecten/Website raymondklompsma.nl/Projectpagina website raymondklompsma.nl.md` |
| Logboek en feedbacklog | `log.md` en `Feedback-log.md` |

**Regels:**
- De vault is de bron van waarheid voor tekst. Raymond schrijft en redigeert in Obsidian, in `atelier/drafts/`, met `[!fb]`- en `[!vraag]`-callouts. Een concept met een open callout gaat niet live.
- Verwerk feedback zoals het vault-CLAUDE.md voorschrijft: grep op `[!fb]`, `[!vraag]`, `[!smaak]`, pas aan, haal het blok weg, voeg een rij toe in `Feedback-log.md`. Een `[!vraag]` verwerk je pas als Raymond eronder heeft geantwoord.
- Alles in `bronnen/` is read-only. Gespreksopnames en transcripten staan daar of in Wispr Flow: lees ze als bron, neem er niets uit over zonder toestemming (zie § 7).
- Elke wijziging in de vault die bij dit project hoort krijgt een regel in `log.md` (prefix `meta`, `ingest` of `feedback`, zoals het vault-schema zegt). Controleer `date` vlak voor je een datum zet.

## 3. Stem en inhoud van de site

- Schrijf als Raymond, in de eerste persoon, aan de lezer met jij. Nooit u. (Documenten voor Raymond zelf schrijf je in de tweede persoon, zoals het vault-CLAUDE.md zegt. Sitetekst is zijn stem.)
- Sivers-richting: kort en dicht, begin bij het punt, geen verzachters ("hoor", "even", "eigenlijk", "wellicht"), geen aanloop. Maar niet staccato: zinnen mogen doorlopen met "want", "dus", "en". Raymond vond een eerdere versie te hakkerig.
- **Geen dashes (— of -) als zinsverbinder.** Punt, komma of dubbele punt.
- Titels zijn zinnen en eindigen met een punt. Alleen een echte vraag krijgt een vraagteken.
- Zinshoofdletter overal. Geen emoji, geen uitroeptekens, geen verkooppraat, geen jargon.
- Elk artikel heeft een concrete ondertitel (`beschrijving`) onder een eventueel poëtische titel. Die zegt wat het stuk is.
- Gebruik geen woorden die Raymond zelf niet zou gebruiken. Voorbeeld: hij wilde "gulheid" niet.
- Verzin geen voorbeelden of feiten in zijn persoonlijke stukken. Een voorbeeld uit de vault is niet automatisch iets wat hij zelf heeft meegemaakt: controleer het, of laat het weg. (Er stond ooit een anekdote in die hij nooit had meegemaakt.)
- Een intro of inleidende gedachte staat als gewone lopende tekst. Geen kader, geen citaatvorm.

## 4. Publiceren: "publiceer dit"

Een stuk gaat alleen live als Raymond dat expliciet zegt, per stuk ("publiceer dit", "zet maar live"). Eerdere toestemming geldt niet voor het volgende.

1. **Voorwaarden:** geen open `[!fb]` of `[!vraag]` in het concept. Privacycheck uit § 7 gedaan. Raymond heeft de definitieve tekst gelezen.
2. **Datum:** draai `date` en gebruik een volledige tijd (`datum: 2026-10-03T14:05:00+02:00`). Twee stukken op dezelfde dag sorteren anders niet goed: de lijst toont nieuwste bovenaan.
3. **Maak `src/content/artikelen/<slug>.md`** (voor een tak van de ode ook `hoort_bij`, `brug`, `kantlijn`; zie § 0) uit het concept met het script hieronder. Frontmatter:
   - `titel`: eindigt met een punt (tenzij het een vraag is)
   - `datum`: zie stap 2
   - `beschrijving`: één zin, concreet. Wordt ook de meta-beschrijving, de RSS-tekst en komt in de lijst
   - `tekening`: optioneel, `zon`, `deur`, `pakje` of `trap`. Zonder keuze geen tekening boven het artikel en een zon in het deelplaatje
   - `concept`: `true` toont het stuk alleen in `npm run dev`, nooit in de build. Zet op `false` om te publiceren
4. **Quote:** hooguit één per artikel, in het concept als `> [!quote] korte zin` (liefst onder tien woorden). Het script maakt er de markeerstift-markup van. Vergeet de binnenste `<span class="markeer">` nooit.
5. **Controleer lokaal:** `npm run build` moet schoon zijn. Er moeten een `dist/artikelen/<slug>/index.html` en een `dist/og/<slug>.png` staan. Bekijk het deelplaatje (Read op de png) en het artikel in de dev-server.
6. **Commit en push naar `main`.** Cloudflare bouwt automatisch (ongeveer twee minuten). Nooit force-push.
7. **Verifieer live:** poll op een achtergrondtaak tot de artikelpagina 200 geeft, en controleer dan het deelplaatje, de volgorde op de homepage, de quote-markup (`<aside class="uitgelicht">`) en dat er geen "concept"-label staat. Zeg pas dat het live staat als dit gecontroleerd is.
8. **Vault bijwerken:** het concept verhuist van `atelier/drafts/` naar `atelier/gepubliceerd/YYYY-MM-DD - titel.md`, met frontmatter `status: gepubliceerd`, `gepubliceerd`, `titel`, `aliassen` (oude werktitel), `beschrijving`, `tekening`, `publicatie`. Voeg een regel toe in de hub (sectie "Gepubliceerd"), voeg een `meta`-entry toe aan `log.md`, en laat oudere versies in `drafts/` staan.
9. **Terugdraaien:** `concept: true` en pushen, of `git revert`.

```python
import re
src = "<pad naar het concept in de vault>"
t = open(src).read()
body = t.split("---", 2)[2].lstrip("\n")
body = re.sub(r"^# .*\n", "", body, count=1)            # H1 weg: de layout toont de titel
body = re.sub(r"^> \[!quote\] (.*)$",
              r'<aside class="uitgelicht"><span class="markeer">\1</span></aside>',
              body, flags=re.M)
assert "[!" not in body                                  # geen open callout mee naar live
body = re.sub(r"\n{3,}", "\n\n", body).strip() + "\n"
```

## 5. Ontwerp

**Bron van waarheid:** het design system "Raymond Klompsma" in Claude Design: https://claude.ai/artifact/4zaqp8ka5zipbo57TtretQ. Raymond bewerkt dat zelf, ook terwijl jij werkt. `DESIGN.md` en `src/styles/global.css` zijn de vertaling naar deze codebase. Bij verschil wint Claude Design, maar bespreek een groot verschil met Raymond voor je de site aanpast.

**Kern (details in `DESIGN.md`):**
- Alleen licht. Crème `#fef9f3`, inkt `#3f3b39`, zand `#dac9b3` (haarlijnen), koraal `#ff9272` (alleen de vulling van de primaire knop, hooguit één vlak per scherm), koraal-inkt `#531b0b`, gedempt `#7a736d`, geel `#fbd700` (merkgeel van het logo), pen `#030406`.
- Lettertypen: Fraunces voor koppen (met SOFT 100 en WONK 1), Newsreader voor lopende tekst en intro, Caveat gewicht 500 voor de hand (naam, aanmeldkop, uitgelichte zin), Avenir voor kleine labels in hoofdletters. Basis is 20px. Labels staan op vaste px, los van de root.
- Hoeken altijd recht, geen schaduwen, geen verlopen. Lijnen zijn schaars: alleen het aanmeldblok heeft een kader.
- Geel komt alleen voor als vulling van de zon-tekening, als markeerstift en in het logo. Nooit als tekstkleur.
- **Markeerstift (`.markeer`):** één brede, wiebelige streep per regel uit `public/markeer.svg`, uitgerekt met `background-size: 100% …` en `no-repeat`. Nooit `repeat-x`: dat oogde als losse dabs per woord. Staat op de uitgelichte quote en op de homepagetitel.
- **Niet terugbrengen:** een callout-blok of citaatvorm (kader of linker lijn) voor een intro, Caveat Brush, een herhalende markeertegel, donkere modus. Het is meerdere keren geprobeerd en afgekeurd.
- **Tekeningen** worden gegenereerd in `src/lib/tekeningen.ts` (zon gevuld met geel, deur, pakje en trap met koraal). Een echte hand is beter: vervang ze als Raymond of een illustrator ze zelf tekent.
- **Logo:** `public/logo.png` (alleen "RAY" met handtekening), 68px hoog in de kop. Bron `src/assets/ray-logo.png`. Gebruik het bestand ongewijzigd, bouw het nooit na. Op 48px was het niet leesbaar, op 68px wel.
- **Deelplaatjes** (`src/pages/og/[id].png.ts`): de tekst wordt per glyph gezet met een eigen pad-serializer, omdat `opentype.js` met `getPath` en `getAdvanceWidth` NaN geeft bij dit lettertype. Maak dit niet "eenvoudiger".

**Bijwerken van Claude Design** (alleen als Raymond erom vraagt):
- Lees eerst de index (`project/design-system.json`) en elk bestand dat je gaat wijzigen opnieuw met de Artifact-tool, vlak voor je publiceert. Raymond kan ondertussen zelf hebben gewijzigd.
- Voeg jouw wijziging toe aan de versie die je net las. Stuur nooit een oudere kopie terug. Wordt je publicatie geweigerd omdat iemand tussentijds opsloeg, lees opnieuw en pas opnieuw toe.
- Eén publicatie met `root`, `file_path` (de index) en `files`. De index gaat in de laatste aanroep, met behoud van alle andere sleutels. Afbeeldingen en SVG gaan als asset (`asset: true`) en worden in de index vastgelegd.
- Raak Raymonds eigen formuleringen niet aan. Voeg toe, vervang niet.

## 6. Techniek

- **Stack:** Astro (statisch), content collection `artikelen` (`src/content.config.ts`), Fontsource-lettertypen, `sharp` en `opentype.js` voor deelplaatjes en losse tekeningen. Geen frameworks erbij zonder reden.
- **Commando's:** `astro dev --background`, `astro dev stop`, `npm run build`, `npm run lock`. De dev-server toont concepten (`concept: true`), de build niet. Toont de dev-server iets niet dat er wel hoort te staan, wis `.astro` en `node_modules/.astro` en herstart.
- **Lockbestand:** Cloudflare bouwt met Node 22 en npm 10, Raymonds Mac heeft npm 11. Npm 11 laat pakketten uit het lockbestand, en dan faalt `npm ci` op Cloudflare (meldingen over `@emnapi` of een ontbrekende `rolldown`-binding). Draai na elke `npm install` of `npm uninstall` `npm run lock`, controleer met `npx -y npm@10.9.2 ci --dry-run --os=linux --cpu=x64` en commit `package-lock.json`.
- **Hosting:** Cloudflare Workers met statische assets. De GitHub-repo `raymond440/raymond-website` (branch `main`) is gekoppeld. Bouwcommando `npm run build`, deploycommando `npx wrangler deploy`. `wrangler.jsonc`: `assets.directory ./dist`, `not_found_handling "404-page"`. Node-versie staat in `.node-version`.
- **Omgevingsvariabele:** `PUBLIC_NEWSLETTER_FORM_URL` (het Buttondown-aanmeldadres). Staat in Cloudflare onder de build-variabelen en lokaal in `.env` (gitignored). `.env.example` laat de vorm zien.
- **Domein:** raymondklompsma.nl is bij TransIP geregistreerd, de nameservers staan bij Cloudflare. Het kale adres is leidend: `www` en `http` geven 301 naar `https://raymondklompsma.nl`. Verhuis `klompsma.nl` nooit: daar draait Raymonds mail via Google Workspace.
- **Contactadres:** `hey-raymond@klompsma.nl`, een alias in Google Workspace (door Raymond getest, het werkt). Een Gmail-filter met label om het apart te houden was het voorstel; vraag na of dat staat. Het adres staat in `src/site.ts` (`CONTACT_EMAIL`).
- **Nieuwsbrief:** Buttondown, account `raymondklompsma`, betaald plan. Het formulier (`src/components/Inschrijven.astro`) post met `fetch` in `no-cors`-modus naar het embed-adres. Dubbele opt-in blijft aan (Raymond heeft getest dat de bevestigingsmail aankomt). Teksten en beelden voor de instellingen staan in de vault bij de projectbestanden.
- **Analytics:** Cloudflare Web Analytics, door Raymond aangezet. De PostHog-code en de A/B-test op de aanmeldkop staan er nog, maar slapen (geen sleutel). Activeer ze niet zonder overleg.
- **Git:** SSH-remote, lokale identiteit "Raymond Klompsma <raymond@klompsma.nl>". Commitberichten in het Nederlands, met de attributieregel uit de systeemmelding. Nooit force-push.
- **Browser-pane:** staat de pane verborgen of blijft een scherm blanco, open dan een verse tab (`tabs_create`, `navigate`, `tabs_select`) en scrol met `javascript_tool` (`scrollIntoView`). Reset een ingestelde viewport na het testen. Bekijk beelden en layout altijd zelf voor je zegt dat iets goed is.

**Astro (uit de scaffold):** start de dev-server in achtergrondmodus met `astro dev --background` en beheer hem met `astro dev stop`, `astro dev status` en `astro dev logs`. Documentatie: https://docs.astro.build. Raadpleeg de gidsen voor [routing](https://docs.astro.build/en/guides/routing/), [Astro-componenten](https://docs.astro.build/en/basics/astro-components/), [content collections](https://docs.astro.build/en/guides/content-collections/), [styling](https://docs.astro.build/en/guides/styling/) en [meertaligheid](https://docs.astro.build/en/guides/internationalization/) voor je aan zulke onderdelen werkt.

## 7. Privacy en veiligheid

De site is publiek. Wat hier op staat, staat voor altijd in cache, zoekmachines en archieven.
- **Niets live zonder expliciete go** van Raymond, per stuk. `concept: true` blijft onzichtbaar.
- **Gezin:** geen namen van kinderen, geen aantal. Alleen "mijn gezin" en "Friesland".
- **Geld:** geen bedragen, schulden, borgstellingen of belastingzaken.
- **Lopende zakelijke gesprekken, partners, investeerders en andere bedrijven:** niet noemen tenzij Raymond dat zelf nadrukkelijk wil. Transcripten van gesprekken bevatten ook verhalen van anderen: neem die nooit over.
- **Gezondheid:** alleen wat Raymond zelf al publiceerde (zijn gewichtsverhaal in de artikelen).
- **Controleer dit extra bij drafts over geld, werk of relaties** voor je ze als kandidaat voorstelt.
- **Geen credentials in de repo.** `.env` blijft gitignored. Wachtwoorden en tokens voert Raymond zelf in (GitHub, Cloudflare, Buttondown, TransIP, Google). Jij maakt geen accounts en logt niet in.
- **Niet verzinnen:** bij cijfers en claims die je niet kunt verifiëren (LinkedIn is niet leesbaar) vraag je het, of je laat ze weg.
- Pushen is publiek zichtbaar voor de site en triggert een deploy. Wees terughoudend met alles wat niet expliciet gevraagd is.

## 8. Besluiten die vastliggen

Haal deze niet opnieuw open zonder dat Raymond erom vraagt.
- Geen Brevo (te duur en te veel), wel Buttondown. Geen CMS: de vault is het CMS. De site staat buiten de vault in een eigen repo.
- Geen PostHog nu. Cloudflare Web Analytics is genoeg. A/B-testen pas bij voldoende verkeer.
- Alleen licht. Kaal domein, `www` gaat erheen.
- Homepage: de titel "Wat als het wel kan?" met markeerstift, daaronder gewone tekst, dan "Laatste artikelen" met een ondertitel. Geen callout.
- Eerste artikel "Ik kocht liever dan dat ik vroeg." blijft in de verleden tijd. De hybride versie 6 (weegschaal in de tegenwoordige tijd) is op Raymonds verzoek geparkeerd, niet verworpen.
- Het logo in de kop is de naamloze versie (alleen "RAY"), zoals Raymond het zelf in Claude Design heeft gezet.
- Koppen in Fraunces, basis 20px (laatste update van het design system).

## 9. Spanningen met de vault (nog niet opgelost)

1. **Doelgroep en inkomensmotor.** `wiki/entiteiten/raymondklompsma.nl.md` (mei 2026) beschrijft de site als inkomensmotor voor coaching aan founders, met prijzen en een jaarrelatiemodel. Het besluit van 25 september 2026 zegt het tegenovergestelde: een reflectie van Raymond, zonder doelgroep. Volg het nieuwste besluit. Zet niets over aanbod, prijzen of coaching op de site. Vraag Raymond bij gelegenheid of die entiteitenpagina herzien moet worden. Er staat een `[!vraag]` op.
2. **Wobbly Sun.** Dezelfde pagina zegt dat raymondklompsma.nl en Wobbly Sun gescheiden blijven. De site gebruikt het wiebelige zonnetje als motief (favicon, tekening, uitleg van onbevangenheid). Vraag Raymond of dat past voor "Over mij" live gaat.
3. **Claude Design zegt nog** dat de kop de naam in Caveat toont. De site toont het logo. Dat is Raymonds eigen tekst: vraag of hij het wil laten aanpassen.

## 10. Stand en open punten (gecontroleerd op 2026-10-03)

**Live en in orde:** homepage, artikelenlijst, twee artikelen ("Een derde is van jou.", "Ik kocht liever dan dat ik vroeg."), RSS, deelplaatjes, 404, logo, markeerstift. Redirects van `www` en `http` werken. De werkboom is schoon en alles is gepusht.

1. **"Over mij" staat nog als placeholder live** ("[Tekst volgt, door Raymond te schrijven.]"). Er zijn twee concepten in de vault, een korte en een uitgebreide, met open vragen: noemen we het huidige werk of niet, hoeveel over het gezin, en hoe vaag blijven we over de financiële kant van eerdere bedrijven. De concepten bevatten geen open callouts meer, maar Raymond heeft niet gezegd welke versie hij kiest. Vraag dat eerst, loop dan § 9 punt 2 langs en bouw `src/pages/over.astro` met de gekozen tekst (de trap-tekening staat er al).
2. **Buttondown:** Raymond heeft zelf getest dat bevestigingsmails aankomen. Nog te doen door hem: bevestigings- en welkomstmail vervangen door de teksten uit de vault, icoon en deelafbeelding uploaden (bestanden staan klaar), accentkleur koraal, voettekst en reply-to op `hey-raymond@klompsma.nl`. Het weghalen van de "Powered by Buttondown"-regel (white labeling, betaald plan) is nog niet gevonden: de schakelaar staat niet in hun documentatie. Dat vraagt contact met `concierge@buttondown.com`.
3. **Analytics:** Cloudflare Web Analytics is door Raymond aangezet, maar het meetscript staat niet in de HTML van de homepage (op 2026-10-03 gecontroleerd). Laat hem in het dashboard kijken of bezoeken tellen. Zo niet, dan komt het handmatige fragment in `Basis.astro`.
4. **Logo:** staat alleen in de kop. Favicon (de losse zon-tekening) en deelplaatje gebruiken het niet. De kop is op een smal scherm niet apart getest.
5. **"Iets natuurlijks":** Raymond noemde dat het "er ook bij mocht" op de homepage. Niet uitgezocht wat hij bedoelde (de honing, ERBIJ?). Vraag het, voeg niets toe zonder bevestiging.
6. **Drafts:** de oude draft "De maakbaarheid van het leven" is vervangen door "Een derde is van jou." en kan als vervangen worden gemarkeerd. "Ik begin niet meer op maandag" is weer een draft (staat niet op de site): bij publicatie het aantal kilo's gelijktrekken met "Een derde is van jou." (31 in juni, "bijna veertig" nu). "Een ode aan onbevangenheid" is het logische volgende stuk (het woord "onbevangen" verwijst nu nergens naartoe), maar is ruim 5.000 woorden en nog niet geredigeerd.
7. **Dev-only pagina's** `src/pages/stijl/` en `src/pages/tekeningen/`: de stijlpagina is verouderd (noemt Caveat Brush). Bijwerken of weghalen.

## 11. Werken met Raymond

- Nederlands, kort en direct, geen small talk, geen emoji. Hij mixt Nederlands en Engels: dat is authentiek. Complimenten kort en oprecht. Zie je een probleem of ben je het oneens, zeg het.
- Geef een aanbeveling in plaats van een opsomming. Haal niet opnieuw open wat al besloten is.
- **Laat het zien.** Raymond kiest sneller op een lokale proefpagina met varianten dan op een beschrijving. Bouw dan een dev-only pagina, laat hem kijken en verwijder die daarna weer.
- Zoek bij "te netjes", "voelt als een quote" of "niet leesbaar" de oorzaak, niet het symptoom. Vier randvarianten voor een callout losten niets op, omdat het probleem de vorm zelf was.
- Denk mee en loop een stap vooruit. Hij is strategisch én scherp op details.
- Zeg alleen dat iets af of live is als je het zelf hebt gebouwd, bekeken en live gecontroleerd. Wees eerlijk over wat je niet kon controleren.
- Hij wil gewezen worden op doelgroep-denken (zie § 1). Doe dat, rustig en kort.
