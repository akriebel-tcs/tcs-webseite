# Template-Elemente ↔ CMS-Light Baustein-Atlas — Abgleich

_Stand: 2026-06-01 — Sprint `cms-light-baustein-atlas-abgleich-mit-template-elemente-uebersicht-1` (read-only)._
_Reine fachliche Entscheidungsgrundlage. Keine DB-, Migrations-, RPC-, Inhalts-, Bild-, Feldwert-, Whitelist-, i18n-, Public-Renderer-, Routen-, Navigations-, Footer-, Breadcrumb- oder Produktdatenbank-Änderung._

Arbeitsgrundlage: hochgeladene PDF `Seiteninhaltselemente-übersicht.pdf` (fachliche Wunschliste wiederverwendbarer Seiteninhaltselemente nach Seitentyp: Startseite, Hauptmenüpunkt, Untermenüpunkt, Detail).
Quellen für den Ist-Stand: `docs/04-betrieb/baustein-atlas-visuell.md`, `scripts/cms/output/baustein-atlas-latest.json`, `src/features/cms/contract/sectionTypes.ts`, DB-Stichprobe `cms_sections` (Stand 2026-06-01).

---

## A. Kurzfazit

- Die in der PDF gewünschten Inhaltselemente sind **fachlich nahezu vollständig** durch heutige CMS-Light-Bausteine abgedeckt — meist mit einer aktiven Referenz-B-ID, die direkt im Admin sichtbar ist.
- **Drei echte Lücken/Klärpunkte:**
  1. **Kontakt-Baustein**: Die PDF zeigt einen wiederverwendbaren „Kontakt"-Block (B-550–B-552 auf `kontakt.root`). DB-Stichprobe: B-550/551/552 sind heute alle vom Typ `content_v1`, nicht `contact_block_v1`. Es gibt einen Vertrag `contact_block_v1`, aber 0 aktive Instanzen.
  2. **Download-Listung**: P-081 `service.downloads` nutzt heute `cards_v1` + Textkarten. Vertrag `download_list_v1` und Karten-Preset `download_card` existieren, sind aber unbelegt. PDF-Hinweis: „ist um doc-Listung zu ergänzen".
  3. **News / Karriere**: In der PDF als gewünschte Bausteine genannt, im CMS-Light aktuell **kein dedizierter Section-Type** und keine aktive Referenz-Seite.
- **Standard-Karte**: Die PDF-Feldliste (Bild, Eyebrow, Icon, Title, Text, Feature, Tags 0–4, Links 1–3) deckt sich **fast 1:1** mit `card_v1` heute — bis auf **`tags.0..4`** (kein Vertragsfeld) und das Toggle-Modell (`*_enabled`), das in der PDF implizit über „Felder optional zeigen" abgebildet ist. Die 7 heutigen `card_v1`-Varianten (`image_card`, `thumbnail_card`, `icon_card_lucide`, `icon_card_image`, `multi_link_card`, `text_card`, `download_card`) lassen sich vollständig als **Presets einer flexiblen Standard-Karte** abbilden — kein neuer Spezialtyp nötig, außer eventuell `download_card` (Dateifelder).
- **Wechselteaser**: `teaser_2col_v1` deckt die PDF-Feldliste vollständig ab. **Klärpunkt**: die PDF nennt zusätzlich ein Feld „Feature" am Wechselteaser; im heutigen Vertrag existiert das nicht (nur am `card_v1`). Vorschlag: nicht ergänzen, sondern an `card_v1` verweisen.

**Empfehlung**: Bestehenden Atlas nicht umbauen. Vor technischer Umsetzung 3 Punkte fachlich entscheiden (Kontakt-Standard, Download-Listung-Standard, News/Karriere-Konzept) und die flexible Standard-Karte zum Zielstandard erheben.

---

## B. Matrix der gewünschten Template-Elemente (aus PDF)

| Fachlicher Name (PDF) | PDF-Referenz | Heutiger Section-Type | Aktive Beispiel-Sections (verifiziert) | Geeignet für | Wiederverwendbar | Empfehlung |
|---|---|---|---|---|---|---|
| Hero (H1 groß) | B-008 | `hero_v1` | B-008 (`home.start/hero`, aktiv) | Start | ja | **behalten** |
| Hero (H1 normal) | B-149 | `hero_v1` | B-149 (`gebaeudekommunikation.root/hero`, aktiv) | Main / Submain / Detail | ja | **behalten** (Variante über Renderer-Klasse, keine Vertragsänderung) |
| Stats / Kennzahlen | B-009 | `stats_v1` + `stat_v1` | B-009 (`home.start/stats`, aktiv) | Start | ja | **behalten** |
| Intro-Textblock | B-025 | `content_v1` | B-025 (`gebaeudekommunikation.tuersprechanlagen/ueberblick`, aktiv) | Start / Main / Submain / Detail | ja | **behalten + standardisieren** (Header-Felder konsolidieren) |
| Wechselteaser | B-1610 / B-1611 | `teaser_2col_v1` | B-1610, B-1611 (`gebaeudekommunikation.root`, beide aktiv) | Start / Main / Submain / Detail | ja | **Zielstandard** (siehe D & Abschnitt 4) |
| Karten-Scroller (Standard-Karten) | B-026 | `product_scroller_v1` + `card_v1` | B-026 (`…tuersprechanlagen/aussenstationen`, aktiv); Kinder B-538/539/540/2195 | Submain | ja | **Zielstandard-Kandidat** (Pilot der flexiblen Karte) |
| Karten-Raster bis 3-spaltig | B-151 | `cards_v1` + `card_v1` | B-151 (`gebaeudekommunikation.root/anwendungsumfelder`, aktiv) | Start / Main / Submain | ja | **behalten + standardisieren** auf flexible Karte |
| Referenzprojekt | P-241 / B-1119 | Page-Komposition (`hero_v1` + `content_v1` …) | P-241 `anwendungen.referenzprojekte.pulse-berlin`; B-1119 `…/beschreibung` (`content_v1`, aktiv) | Detail | ja (Seitentyp) | **als Detail-Template** behandeln, kein neuer Section-Type |
| Download-Seite | P-081 (Hinweis: „um doc-Listung ergänzen") | heute `cards_v1` + Textkarten; Vertrag `download_list_v1` / Preset `download_card` 0 Instanzen | P-081 `service.downloads` | Submain | teilweise | **Klärpunkt** — Download-Listungs-Standard fehlt; Entscheidung: `download_list_v1` aktivieren oder `card_v1`-Preset `download_card` etablieren |
| FAQ | B-342 | `faq_v1` | B-342 (`service.downloads/faq`, aktiv) | Submain | ja | **behalten** |
| Kontakt | B-550 – B-552 | aktuell alle `content_v1`; Vertrag `contact_block_v1` existiert, 0 Instanzen | B-550/551/552 (`kontakt.root`, alle aktiv, alle `content_v1`) | Submain / Detail | ja (gewünscht) | **Klärpunkt** — Kontakt-Block-Standard entscheiden: `contact_block_v1` etablieren oder bewusst auf `content_v1` + flexible Karte zurückführen |
| CTA-Banner | B-007 | `cta_v1` | B-007 (`home.start/cta`, aktiv) | Start (+ optional Main/Submain/Detail) | ja | **behalten + standardisieren** |
| News | — (PDF nennt nur Name) | **nicht vorhanden** | — | Start / Main | offen | **Klärpunkt** — kein Section-Type, kein Pilot |
| Karriere | — (PDF nennt nur Name) | **nicht vorhanden** | — | Main / Submain | offen | **Klärpunkt** — kein Section-Type, kein Pilot |
| Standard-Karte (Feldsatz) | — | `card_v1` (Kindsection) | viele (z. B. B-538/539/540/2195) | überall in Containern | ja | **Zielstandard** (siehe Abschnitt 3) |

Legende „Empfehlung":
- **behalten** = heute deckungsgleich, keine Vertragsänderung nötig
- **standardisieren** = Vertrag/Admin-Presets nachschärfen, keine Inhaltsmigration
- **Klärpunkt** = fachliche Entscheidung offen
- **Zielstandard / Zielstandard-Kandidat** = soll zum Referenzbaustein erhoben werden

---

## C. Abgleich mit vorhandenem CMS-Light-Bestand

| Vertragstyp | Im PDF gewünscht? | Aktive Instanzen heute | Notiz |
|---|---|---|---|
| `hero_v1` | ja (B-008, B-149) | 92 | zwei Größenvarianten heute über Renderer-Klassen, nicht über Vertragsfeld |
| `stats_v1` (+ `stat_v1`) | ja (B-009) | 8 / 32 | deckungsgleich |
| `content_v1` | ja („Intro-Textblock" B-025) | 224 | dominanter Texttyp; Header-Aliase (`label/eyebrow`, `title/headline`, `text/body/intro`) bereits im Vertrag |
| `teaser_2col_v1` | ja (B-1610/1611) | 66 | Feldsatz deckt PDF-Wünsche, Ausnahme „Feature" (s. Abschnitt 4) |
| `cards_v1` (+ `card_v1`) | ja (Raster) | 127 | Zielstandard-Container für flexible Karte |
| `product_scroller_v1` (+ `card_v1`) | ja (Scroller, B-026) | 8 | Pilot für Toggle-Karte |
| `card_grid_v1` (+ `card_v1`) | (implizit Hub) | 1 / 3 | Hub `/produkte` (B-1176) — kein expliziter PDF-Wunsch, aber bestehender Standard |
| `feature_grid_v1` (+ `card_v1`) | (implizit „Standard-Karte mit Icon") | 1 / 51 | Iconreihe; Preset `icon_card_lucide`/`icon_card_image` |
| `catalog_filter_grid_v1` | — | 4 | Produktdatenbank-Live-Filter; Spezialfall, kein PDF-Element |
| `faq_v1` | ja (B-342) | 3 | deckungsgleich |
| `cta_v1` | ja (B-007) | 1 | wenig genutzt; Vertrag steht |
| `contact_block_v1` | ja (B-550–B-552) | **0** | Vertrag existiert, Instanzen sind `content_v1` → Bruch zwischen PDF-Wunsch und DB-Realität |
| `download_list_v1` / `download_card` | ja (P-081, „doc-Listung ergänzen") | **0 / 0** | Vertrag existiert, P-081 nutzt `cards_v1`+Textkarten |
| `rich_v1`, `tabs_v1`, `role_tabs_v1`, `list_v1` | — | je 1–24 | nicht in PDF; bleiben Spezial-/Detailbausteine |
| **News-Section** | ja | **nicht vorhanden** | weder Vertrag noch Renderer noch aktive Seite |
| **Karriere-Section** | ja | **nicht vorhanden** | dito |

---

## D. Empfohlene Zielbausteine (fachliche Empfehlung, keine Beschlussfassung)

1. **Hero** = `hero_v1` (eine Vertragsfamilie, zwei Größenvarianten weiterhin über Renderer-Klasse, nicht über Vertragsfeld).
2. **Intro-Textblock** = `content_v1` mit konsolidierten Header-Feldern (`label`/`title`/`text`); Aliase im Vertrag bleiben für Bestand.
3. **Wechselteaser** = `teaser_2col_v1` als Zielstandard für alle Seitentypen (siehe Abschnitt 4).
4. **Karten-Reihe** = `cards_v1` + **flexible Standard-Karte** (`card_v1` mit Presets) als gemeinsamer Standard für „Raster bis 3-spaltig" und „Scroller". Layoutwahl (Grid vs. Scroller) bleibt am Container.
5. **Stats** = `stats_v1` + `stat_v1` unverändert.
6. **FAQ** = `faq_v1` unverändert.
7. **CTA-Banner** = `cta_v1` unverändert; Adoption auf Main/Submain ist eine fachliche Frage, kein Vertragsthema.
8. **Referenzprojekt** = **Seitentyp** (Detail-Template), nicht eigener Section-Type. Komposition: `hero_v1` + `content_v1` (+ optional `cards_v1`/`teaser_2col_v1`).

Offen (siehe F): Kontakt, Download-Listung, News, Karriere.

---

## E. Zusammenführungs-Kandidaten

| Heute | Vorschlag | Bedingung |
|---|---|---|
| `card_v1`-Varianten `image_card`, `thumbnail_card`, `icon_card_lucide`, `icon_card_image`, `multi_link_card`, `text_card` | als **Presets einer flexiblen Standard-Karte** modellieren; Variant-Key bleibt im Admin sichtbar | Toggle-Modell (`*_enabled`) im Admin standardisieren; Renderer liest Toggles bereits |
| `download_card` | entweder eigenes Preset der flexiblen Karte **oder** weiter Spezialfall mit harten Dateifeldern | Entscheidung zur Download-Listung (siehe F.2) |
| Header-Aliase `eyebrow↔subtitle`, `headline↔title`, `beschreibung↔description` an `card_v1` | konsolidieren auf je eine kanonische Form, Aliase nur lesend behalten | Inhaltsmigration **nicht** Teil dieser Etappe |
| B-550–B-552 (`content_v1` heute) | konsolidieren auf einen Kontakt-Standard | Entscheidung F.1 |
| `cards_v1` (P-081 Download) | konsolidieren auf Download-Listungs-Standard | Entscheidung F.2 |

---

## F. Offene Klärpunkte

1. **Kontakt-Standard** — `contact_block_v1` aktivieren (Single-Section pro Seite, harte Felder Telefon/E-Mail/CTA) **oder** Kontakt weiter aus `content_v1` + flexibler Karte zusammensetzen. Heute sind alle drei aktiven Sections auf `kontakt.root` (B-550/551/552) vom Typ `content_v1`; der PDF-Wunsch deutet auf einen wiederverwendbaren Kontakt-Block.
2. **Download-Listung** — `download_list_v1` (+ `download_card`) als Standard etablieren oder weiterhin `cards_v1` + Textkarten nutzen. PDF-Hinweis „ist um doc-Listung zu ergänzen" lässt offen, ob ein neuer Section-Type oder ein Preset gemeint ist.
3. **News-Bereich** — gibt es heute weder als Section-Type noch als aktive Seite. Vor Vertragserweiterung klären: eigenständige Newsliste oder über `cards_v1` + Karten-Preset?
4. **Karriere-Bereich** — analog News.
5. **Standard-Karte: Feld „tags.0..4"** — in der PDF gelistet, im heutigen Vertrag nicht vorhanden. Entscheidung: ergänzen (neue Felder + Whitelist) oder weglassen.
6. **Wechselteaser: Feld „Feature"** — in der PDF am Wechselteaser gelistet, im Vertrag nur an `card_v1`. Vorschlag: nicht am Wechselteaser ergänzen.
7. **Hero-Größenvarianten** — heute über Renderer-Klassen (Start = groß, sonst normal). PDF unterscheidet B-008/B-149. Klären: bleibt Renderer-gesteuert oder neues Vertragsfeld `size_variant`?
8. **Toggle-Modell** im Admin — heute Pilot auf B-538/539/540/2195. Vor Erhebung zum Zielstandard: Admin-UI-Konzept für die Toggles (sichtbar pro Karte, nicht global) bestätigen.

---

## G. Empfohlene nächste technische Schritte (in Reihenfolge)

1. **Fachliche Entscheidungen** zu F.1–F.4 treffen (Kontakt, Download, News, Karriere). Ohne diese Entscheidungen keine Vertragserweiterung.
2. **Flexible Standard-Karte** beschließen: `card_v1` als kanonischer Karten-Typ, Variant-Keys als Presets, Toggle-Modell im Admin offiziell freischalten. Bestehende Inhalte bleiben unverändert.
3. **Vertrag schärfen** (`sectionTypes.ts`): Presets dokumentieren, Header-Aliase auf je eine kanonische Form ausrichten, `download_card`-Status klären, Entscheidung zu `tags.*` und Hero-`size_variant` einpflegen — alles **read-only Vertrag**, kein Renderer-/Admin-Codepfad.
4. **Admin-UI-Anpassung** (separate Etappe): Preset-Auswahl an `card_v1`, Toggle-Modell sichtbar machen, Kontakt-Block-Standard im Section-Picker zeigen, sobald F.1 entschieden ist.
5. **Renderer-/Migrationsplan** für die entschiedenen Spezialfälle (Kontakt, Download) — erst nach Schritt 1–4, klar als eigene Sprints.

---

## Bestätigung

- Keine DB-Änderung.
- Keine Migration.
- Keine neue RPC.
- Keine Inhalte/Bilder/Feldwerte geändert.
- Keine Whitelist geändert.
- Keine i18n-Dateien geändert.
- Keine Public-Renderer-/Routen-/Navigations-/Footer-/Breadcrumb-Änderung.
- Keine Produktdatenbank berührt.
- Bestehender Baustein-Atlas (`docs/04-betrieb/baustein-atlas-visuell.{md,pdf}`) und JSON-Index (`scripts/cms/output/baustein-atlas-latest.json`) wurden **nicht** umgebaut. Keine neue PDF, keine neuen Screenshots.
