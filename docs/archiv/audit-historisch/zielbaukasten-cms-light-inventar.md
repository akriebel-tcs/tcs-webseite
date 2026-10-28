# Zielbaukasten CMS-Light — Inventar (read-only)

_Generiert: 2026-05-29 — Sprint „Zielbaukasten Eine Wahrheit"_
_Status: strategisches Inventar, keine DB-/Code-/i18n-Änderung._

Quellen: `src/features/cms/contract/sectionTypes.ts`,
`src/features/cms/components/CmsBodyRenderer.tsx`,
`src/features/cms/components/sections/*.tsx`,
`docs/02-architektur/section-typen-katalog.md`,
`docs/02-architektur/section-type-vertrag-entwurf.md`,
`docs/04-betrieb/renderer-fallback-inventar-latest.md`,
`docs/04-betrieb/contract-drift-audit-latest.md` (Stand 2026-05-29).

---

## 1. Inventar sichtbarer Bausteine

Zusammenfassung aller heute auf der Public-Website sichtbaren
redaktionellen Bausteine. „Quelle" = woher der Renderer heute liest
(DB-first / i18n-Fallback / Hardcoding). „Z" = ist als Zielmuster
geeignet.

| Baustein (fachlich) | Section-Type(s) heute | Renderer | Typische Felder | Assets | Beispielseiten | Generisch? | Quelle | Z | Hinweis |
|---|---|---|---|---|---|---|---|---|---|
| Hero | `hero_v1` | `CmsPageLayout` (außerhalb `CmsBodyRenderer`) | `headline`/`title`, `subline`/`intro`, `eyebrow`/`label`, `cta_label`, `cta_href` | `image` (3 Viewports) | alle | generisch (Spezial-Hülle pro Page) | DB-first + i18n-Fallback | ja | Aliase `headline`↔`title` real, Vertrag muss eine Wahrheit benennen |
| Textblock | `content_v1` (Aliase: `content`, `intro`, `content_block_v1`, `content_blocks_intro_v1`) | `ContentSectionV1` | `label`, `title`, `text` | — | viele | generisch | DB-first | ja | viele Legacy-Sammelblöcke nutzen das fälschlich als Container |
| Bildkarte (Standard) | `card_v1` als Kind von `cards_v1` | `CardsSectionV1` | `subtitle`/`eyebrow`, `title`/`headline`, `description`/`beschreibung`, `cta_label`, `cta_href`, `href` | `image` (Hauptbild) | gebaeudekommunikation.\*, zutrittskontrolle.\* | generisch | DB-first | ja (Standard) | Alias-Cluster `eyebrow`/`headline`/`beschreibung` aus Pilot B-026/B-027 |
| Thumbnail-Karte | `card_v1` als Kind von `card_grid_v1` / `catalog_filter_grid_v1` | Hub-Pages (eingebettet) | `title`, `description`, `href` | `thumbnail` | produkte.hub, produkte.tuerkommunikation | spezial (Hub) | i18n-Fallback gemischt | bedingt | Bildslot `thumbnail` statt `image`, Admin muss das erzwingen |
| Iconkarte (Lucide) | `card_v1` als Kind von `feature_grid_v1` / `cards_v1` | `FeatureGridV1` / `CardsSectionV1` | `title`, `description`, `icon` (Lucide-Name als Text) | optional `icon_image` | viele Anwendungsseiten | generisch | DB-first | ja | klare Variantenregel (Tranche 24) |
| Iconkarte (TCS-Bildicon) | `card_v1` mit Asset `icon_image` | `CardsSectionV1` / `FeatureGridV1` | `title`, `description` | `icon_image` (3 Viewports) | persona-Seiten, Anwendungen | generisch | DB-first | ja | Priorität `image` → `icon_image` → `icon` (Lucide) |
| Textkarte | `card_v1` ohne Bild/Icon | `CardsSectionV1` | `title`, `description`, optional `cta_*` | — | vereinzelt | generisch | DB-first | ja | reduzierte Variante derselben `card_v1` |
| Multi-Link-Karte / CTA-Karte | `card_v1` mit `link_1..3_*` und `cta_*` | Spezial `TuersprechanlagenPage > ProduktScroller` | + `link_N_label/href/kind`, `link_N_enabled`, `cta_*` | `image` | gebaeudekommunikation.tuersprechanlagen | spezial | DB-first + Toggles | bedingt (Variante) | Felder werden generisch heute nicht gelesen → Variantenmodell nötig |
| Feature-Karte (Pilot) | `card_v1` mit `features.0..4`, `*_enabled` | Spezial `TuersprechanlagenPage` | + `features.N`, `features_N_enabled` | `image` | gebaeudekommunikation.tuersprechanlagen (B-026/B-027) | spezial | DB-first + Toggles | bedingt (Variante) | Pilot, nicht generisch ausgerollt |
| Download-Karte | `card_v1` (`download_item_v1` in Doku) als Kind von `download_list_v1` | `DownloadListV1` | `title`, `description`, `file_label`, `cta_href` | — | service.downloads | generisch | DB-first | ja | kein Bildslot — Vertragsregel |
| Kartencontainer (Bildkarten) | `cards_v1` | `CardsSectionV1` | `label`, `title`, `intro` | — | viele | generisch | DB-first | ja | Container-Kopf heute oft leer (P055-Befund) |
| Kartencontainer (Icons) | `feature_grid_v1` | `FeatureGridV1` | `label`, `title`, `intro` | — | Anwendungen | generisch | DB-first | ja | Admin darf hier `image` nicht anbieten |
| Karten-Scroller | `product_scroller_v1` | `ProductScrollerV1` + Spezial Türsprechanlagen | `label`, `title`, `intro` | — (Bilder am Kind) | gebaeudekommunikation.tuersprechanlagen, anwendungen.wohnbau | generisch + spezial | DB + i18n (Türsprechanlagen) | bedingt | Spezialrenderer liest i18n statt Container-Felder — Doppelwahrheit |
| Hub-/Filter-Grid | `card_grid_v1`, `catalog_filter_grid_v1` | Hub-Pages (kein eigener Top-Level-Renderer) | `title`, `intro` | — | produkte.\* | spezial | DB + Produktkatalog | bedingt | Kinder lesen `thumbnail` |
| Wechselteaser | `teaser_2col_v1` | `Teaser2ColV1` | `label`, `title`, `text`, `cta_label`, `cta_link`, `image_position`, `background_variant` | `image` | home.start, gebaeudekommunikation.\*, zutrittskontrolle.root, gebaeudemanagement.root | generisch | DB-first | **ja (Pilot Zielbild)** | Standardmuster seit 2026-05-21; `cta_link` ≠ `cta_href` |
| Tabs | `tabs_v1` + `tab_v1` | `TabsV1` | Container: `label`, `title`, `intro`, `tablist_label`; Kind: `tab_label`, `title`, `description`, `vorteile.<n>.*` | — | mobile-tk-preview.root | generisch | DB-first | ja | bewusste Ausnahme: `vorteile.<n>.*` flach |
| Rollen-Tabs | `role_tabs_v1` | Spezial `SnipdooIpPage` | dynamisch `tabs.<roleKey>.*` | — | gebaeudekommunikation.snipdoo-ip | spezial (S1) | DB + i18n-Schlüssel | Legacy | Spezialrenderer, generisch nicht ersetzbar ohne Umbau |
| FAQ | `faq_v1` | `FaqV1` | `eyebrow`/`label`, `headline`/`title`, `intro`, `items.<slug>.frage|antwort` (3 Schemata) | — | vereinzelt | generisch | DB-first | ja | Vertrag legt `items.<slug>.frage|antwort` als Zielschema fest |
| CTA-Banner | `cta_v1` (Alias `cta`) | `CtaV1` | `title`, `text`, `cta_label`, `cta_href` | optional `image` | viele | generisch | DB-first | ja | — |
| Kontaktblock | `contact_block_v1` | `ContactBlockV1` | `title`, `text`, `email`, `phone`, `cta_label`, `cta_href` | — | kontakt.root, kontakt-bcm.root | generisch | DB-first + i18n-Fallback | ja | — |
| Stats-Band | `stats_v1` + `stat_v1` | `StatsV1` | Container: `title`, `intro`; Kind: `value`, `label`, `description` | — | personas.\* | generisch | DB-first | ja | Standardmuster Persona-Seiten |
| Rich Text / Markdown | `rich_v1` (Alias `rich`) | `RichV1` | `title`, `body` | — | legal.\*, wissen.akademie, home.start Personas | generisch | DB-first | ja | bewusst rein redaktionell |
| Download-Liste | `download_list_v1` | `DownloadListV1` | `title`, `intro` | — | service.downloads | generisch | DB-first | ja | — |
| Produktscroller (Hub) | `product_scroller_v1` | Spezial Hub-Pages | dynamisch + i18n | — | produkte.hub, produkte.tuerkommunikation | spezial | i18n-Fallback gemischt | bedingt | i18n-Fallback-Abbau Aufgabe für Sprint 2l/2m |
| Series-Override (Legacy) | `series_override_v1`, `series_override_container_v1` | kein generischer Renderer | dynamisch | `thumbnail` (Override) | produkte.\* | Legacy (P1) | nur Override | **nein (Legacy)** | nicht für neue Inhalte verwenden |
| List (Spezial) | `list_v1` | Spezial `ReferenzprojektDetailPage` | `items` (zeilenweise) | — | anwendungen.referenzprojekte.\* | spezial | DB-first | bedingt | Sonderfall, kein generischer Renderer |

**Befund Inventar:**
- 18 generische Bausteine sind heute schon im `RENDERERS`-Set und tragen den Großteil der Public-Seiten.
- 4 spezialgetriebene Bausteine (`role_tabs_v1`, `list_v1`, Hub-Grids, Türsprechanlagen-Scroller) sind notwendig oder Pilot — kein Generalisierungsdruck in diesem Sprint.
- 2 Legacy-Familien (`series_override_*`) sind als „nicht für Neuanlage" markiert.

---

## 2. B-538 als Bildkarten-Referenz — ehrliche Prüfung

**Befund:** „B-538" existiert in der Codebasis **nicht** als konkrete Karte
mit `section_key` oder `id`. Volltext-/DB-Suche:

- `cms_sections.section_key ILIKE '%538%'` → 0 Zeilen.
- `cms_sections.id::text ILIKE '%538%'` → 5 Zufallstreffer (Hash-Anteil), keine `B-538`.
- Im Code erscheint `B-538` **ausschließlich** als Platzhalter-Beispiel in den Link-Eingaben:
  - `src/features/admin/components/CardBlueprintWorkshop.tsx:847`
  - `src/features/admin/components/BildkartenCardWorkspace.tsx:630`
  - Doku-Erwähnung: `docs/03-redaktion/bildkarten-blueprint-audit.md:226`
- Konkret existierende B-Nummern im Code/Doku-Korpus sind z. B. **B-026/B-027** (`aussenstationen`/`innenstationen` auf `gebaeudekommunikation.tuersprechanlagen`, Pilot „Scroller-Bildkarte") und **B-2059…B-2063** (Anwendungen-Karten unter `cards_v1`, Befund P055).

**Konsequenz für die Frage „kanonische Bildkarte":**

- B-538 ist **kein** echtes Standardmuster, sondern ein Demo-String für
  die Eingabeart `kind="shortid"` der CTA-/Multi-Link-Pflege.
- Als **fachlich kanonische Bildkarte** funktional besser geeignet:
  - **Generischer Standard:** `card_v1` als Kind von `cards_v1`, gelesen
    durch `CardsSectionV1` (Felder: `subtitle`, `title`, `description`,
    Asset `image`, optional `cta_label`/`cta_href`). Das ist exakt das
    Zielmodell aus `section-type-vertrag-entwurf.md` §5.
  - **Beispiel-Sections im Bestand:** `gebaeudekommunikation.tuersprechanlagen / aussenstationen → card_v1`-Kinder
    sind die qualitativ vollständigste Pilotmenge (B-026/B-027), zeigen
    aber gleichzeitig die heute noch nicht-generische Variantenfülle
    (`eyebrow`/`headline`/`beschreibung`-Aliase, `features.N`,
    `link_N_*`, `*_enabled`-Toggles).
- **Empfehlung:** „Standard-Bildkarte" wird nicht über eine einzelne
  Beispielkarte definiert, sondern über den **Vertrag** für `card_v1`
  im Container `cards_v1` (siehe Vertragsentwurf §5). Die heutigen
  Abweichungen sind:
  - Aliase `eyebrow`/`headline`/`beschreibung` (Pilot, fachlich nicht
    nötig — generisch auf `subtitle`/`title`/`description` mappen).
  - `features.0..4` + `*_enabled` (fachlich nötig, gehört in eine
    **Variante** „Feature-Bildkarte", nicht in die Basis).
  - `link_1..3_*` + `link_N_enabled` (fachlich nötig, gehört in eine
    **Variante** „Multi-Link-Bildkarte").
  - `icon_image` (orthogonale Variante „Iconkarte mit Bildicon").

---

## 3. Vorgeschlagener Zielbaukasten (reduziert)

Reduktion auf **ein** generisches Vokabular je Bedarf. Spezialrenderer
nur dort, wo fachlich unvermeidbar.

| Zielbaustein (Redaktionsname) | Section-Type | Erlaubte Felder | Asset-Slots | Parent/Child | Renderer | Wann verwenden | Ersetzt heute |
|---|---|---|---|---|---|---|---|
| Hero | `hero_v1` | `eyebrow`, `headline`, `subline`, `cta_label`, `cta_href` | `image` | Top-Level, keine Kinder, max. 1 pro Seite | `CmsPageLayout` | Seitenkopf | alle `hero`-Aliase, gemischte i18n-Heros |
| Textblock | `content_v1` | `label`, `title`, `text` | — | Top-Level, keine Kinder | `ContentSectionV1` | Fließtext-Abschnitt | `content`, `intro`, `content_block_v1`, `content_blocks_intro_v1` |
| **Wechselteaser** | `teaser_2col_v1` | `label`, `title`, `text`, `cta_label`, `cta_link`, `image_position`, `background_variant` | `image` | Top-Level, keine Kinder | `Teaser2ColV1` | abwechselnde Bild/Text-Bänder | alle `items.N.*`-Sammellisten für Teaser |
| **Kartencontainer** | `cards_v1` | `label`, `title`, `intro` | — | Top-Level, Kinder `card_v1` | `CardsSectionV1` | Bildkarten-Grid | viele `content_v1`-Sammelblöcke mit Items |
| **Icongrid** | `feature_grid_v1` | `label`, `title`, `intro` | — | Top-Level, Kinder `card_v1` (Iconvariante) | `FeatureGridV1` | 3-spaltiges Iconraster | hartcodierte Icon-Reihen |
| **Karten-Scroller** | `product_scroller_v1` | `label`, `title`, `intro` | — | Top-Level, Kinder `card_v1` | `ProductScrollerV1` | horizontale Karten | Türsprechanlagen-Spezialfall (i18n abbauen) |
| Bildkarte (Basis) | `card_v1` (Variante `image`) | `subtitle`, `title`, `description`, optional `cta_label`/`cta_href`, `href` | `image` | nur als Kind | über Container | normale Bildkarte | `eyebrow`/`headline`/`beschreibung`-Aliase |
| Iconkarte (Lucide) | `card_v1` (Variante `icon`) | `title`, `description`, `icon` | optional `icon_image` | nur als Kind von `feature_grid_v1`/`cards_v1` | über Container | klassische Iconkarte | hartcodierte Icon-Listen |
| Iconkarte (TCS-Bildicon) | `card_v1` (Variante `icon_image`) | `title`, `description` | `icon_image` | nur als Kind | über Container | Bildmarke statt Lucide | — |
| Thumbnail-Karte | `card_v1` (Variante `thumbnail`) | `title`, `description`, `href` | `thumbnail` | nur als Kind von `card_grid_v1`/`catalog_filter_grid_v1` | Hub | Hub-/Filterkachel | gemischte `image`-Verwendung im Hub |
| Textkarte | `card_v1` (Variante `text`) | `title`, `description`, optional `cta_*` | — | nur als Kind | über Container | reine Textkarte | — |
| Multi-Link-/Feature-Karte | `card_v1` (Variante `multi`) | + `features.0..4`, `link_1..3_label/href/kind` | `image` | nur als Kind | aktuell spezial → generisch nachziehen | komplexe Produktkarte | B-026/B-027-Pilot |
| Download-Karte | `card_v1` (Variante `download`) | `title`, `description`, `file_label`, `cta_href` | — | nur als Kind von `download_list_v1` | `DownloadListV1` | Downloadliste | — |
| Tabs | `tabs_v1` + `tab_v1` | Container: `label`, `title`, `intro`, `tablist_label`; Kind: `tab_label`, `title`, `description`, `vorteile.<n>.*` | — | Top-Level mit Kindern `tab_v1` | `TabsV1` | Reiternavigation | — |
| FAQ | `faq_v1` | `eyebrow`, `headline`, `intro`, `items.<slug>.frage|antwort` | — | Top-Level, keine Kinder | `FaqV1` | Frage/Antwort | 2 Legacy-Item-Schemata |
| CTA-Banner | `cta_v1` | `title`, `text`, `cta_label`, `cta_href` | optional `image` | Top-Level | `CtaV1` | Abschluss-CTA | `cta`-Alias |
| Kontaktblock | `contact_block_v1` | `title`, `text`, `email`, `phone`, `cta_label`, `cta_href` | — | Top-Level | `ContactBlockV1` | Kontakt-Sektion | hartcodierte Kontaktboxen |
| Stats-Band | `stats_v1` + `stat_v1` | Container: `title`, `intro`; Kind: `value`, `label`, `description` | — | Top-Level mit Kindern | `StatsV1` | Kennzahlen | — |
| Download-Liste | `download_list_v1` | `title`, `intro` | — | Top-Level mit Kindern `card_v1` (Variante `download`) | `DownloadListV1` | Dokumentenliste | — |
| Rich Text | `rich_v1` | `title`, `body` | — | Top-Level | `RichV1` | Legal / Akademie | `rich`-Alias |

**Bewusst NICHT als eigene Zielbausteine geführt:**

- `role_tabs_v1`, `list_v1` — bleiben Spezialfälle, kein Ausbau.
- `series_override_v1`, `series_override_container_v1` — Legacy, nur lesend.
- `card_grid_v1`, `catalog_filter_grid_v1` — bleiben Hub-Container, kein generischer Top-Level-Renderer.

---

## 4. Seitenmuster (Familienprüfung)

| Seitenfamilie | Aktueller Aufbau | Zielaufbau | Empfohlene Bausteine | Nahe am Ziel? | Layoutarbeit nötig? | Spezialrenderer entfernbar? |
|---|---|---|---|---|---|---|
| Startseite (home.start) | Spezial S2, viele `teaser_2col_v1` + `rich_v1`-Personas + hartcodierte Persona-Items | Hero + 6× Wechselteaser + Persona-Tabs/Cards + CTA | `hero_v1`, `teaser_2col_v1`, `cards_v1`+`card_v1`, `cta_v1` | teilweise | ja, Persona-Block normalisieren (heute `rich_v1` mit D9-Beziehungen) | langfristig ja |
| Bereichshubs (gebaeudekommunikation.root, zutrittskontrolle.root, eingangssysteme.root, gebaeudemanagement.root) | Wechselteaser-Reihe, einige hartcodierte Arrays (S2) | Hero + Wechselteaser-Reihe + optional `cards_v1` + CTA | `hero_v1`, `teaser_2col_v1`, `cards_v1`+`card_v1`, `cta_v1` | **sehr nah am Ziel** | minimal | überwiegend ja |
| Produkt-/Lösungsunterseiten (gebaeudekommunikation.tuersprechanlagen, briefkastenanlagen, grossanlagen, systemloesungen) | `CmsProductSolutionShell` / Spezial-Pages + R2-Container, Türsprechanlagen-Scroller mit i18n | Hero + Content + `product_scroller_v1` (DB-first) + `cards_v1` + CTA | wie heute, aber Container-Kopf aus DB, Karten-Aliase auflösen | teilweise (R2 erledigt) | mittel (Türsprechanlagen-i18n-Abbau) | teilweise |
| Anwendungen (anwendungen.\* — Wohnbau, Klinik, Schwimmbad, …) | S1 DB-first, viele `cards_v1`+`card_v1`+`feature_grid_v1` | unverändert | wie heute | **sehr nah am Ziel** | minimal | meist schon generisch |
| Service-Seiten (service.\*) | S1 DB-first, plus `download_list_v1`, Glossar als `content_v1` | unverändert | wie heute | nah am Ziel | gering | ja |
| Referenzen (anwendungen.referenzprojekte / Detail) | Spezial S1 mit `list_v1` (zeilen-gesplittete `items`) | Spezial bleibt | bleibt | nicht generalisierbar | nein | nein |
| Snipdoo/IP, Signage, Presse | S1 DB-first, Snipdoo nutzt `role_tabs_v1` | unverändert | wie heute | nah am Ziel | nein | nein (Spezial nötig) |
| Personas (personas.\*) | Standardmuster mit `stats_v1`+`stat_v1`+`cards_v1`+`card_v1`+`rich_v1`-Detail | unverändert | wie heute | **am Ziel** | nein | n/a |
| Hub-Seiten (produkte.\*) | S2 mit Produktkatalog-Join + i18n | Hub-Container + Produktdaten bleibt extern | `card_grid_v1`/`catalog_filter_grid_v1` + Produktdaten | Spezialfall, bleibt | gering | nein |
| Kontakt (kontakt.\*) | S2 mit hartcodierten Arrays | Hero + `contact_block_v1` + `cta_v1` | `contact_block_v1` | mittel | ja, Arrays nach DB | ja |
| Karriere | S1 DB-first | wie heute | wie heute | nah am Ziel | nein | n/a |
| Legal | S1 DB-first über `rich_v1` | wie heute | wie heute | **am Ziel** | nein | n/a |

**Priorisierung Layoutarbeit (wenn man Zielbaukasten zuerst macht):**

1. **Bereichshubs konsolidieren** (low-risk, hoher Lerneffekt): `teaser_2col_v1` ist bereits Standard, nur i18n-Restfallback abbauen.
2. **Türsprechanlagen-Scroller**: Spezialrenderer auf generisches `product_scroller_v1` zurückführen, sobald `card_v1`-Varianten im Vertrag stehen.
3. **home.start Personas**: D9-`rich_v1`-Beziehungen sauber als `cards_v1`+`card_v1` modellieren.
4. **Kontakt-/Hub-Hardcoding** in DB überführen (S2 → S1).

---

## 5. Konsequenz für D3/D5

Aus dem Drift-Audit (Stand 2026-05-29):

- **D3 = 3502** fehlende Vertragsfelder, **D5 = 3416** fehlende Whitelist-Einträge.
- Top-Treiber (siehe `contract-drift-audit-latest.md` §83-103) sind ausnahmslos **`card_v1`-Varianten-Felder**:
  - `card_v1 · href` / `features.0..4` / `link_1..3_*` → je **165** Sections.
  - `card_v1 · cta_label/cta_href` → je 160-161.
  - `card_v1 · icon` → 127, `subtitle` → 126.
- `hero_v1 · cta_label/cta_href` → 92 (echter Basisbedarf, kein Variantenproblem).
- `cards_v1 · intro/title/label` → 18-28 (Container-Header-Felder, P055-Befund).

**Bewertung:**

| Feldgruppe | Kategorie | Jetzt seeden? |
|---|---|---|
| `card_v1 · features.N`, `link_N_*`, `href` (je 165) | **Variante** (Multi-Link/Feature-Karte) | **nein** — erst nach Variantenmodell, sonst Admin-Feldmüll auf 165 Standard-Bildkarten |
| `card_v1 · cta_label/cta_href` (je 160) | Variante (CTA-Karte) | **nein** — gleicher Grund |
| `card_v1 · icon` (127) | Variante (Iconkarte) | **nein** — gehört zur Iconkarten-Variante |
| `card_v1 · subtitle` (126) | **Basis** | bedingt ja, nach Alias-Auflösung `eyebrow`↔`subtitle` |
| `card_v1 · description` (54) | Basis | **ja** (bereits S1-sicher in 2k-Triage) |
| `hero_v1 · cta_label/cta_href` (92) | Basis | **ja** — echter Pflichtbedarf, eigene Tranche |
| `hero_v1 · eyebrow/subline/headline` | Basis (Alias-Cluster) | erst nach Alias-Entscheidung |
| `cards_v1 · intro/title/label` (18-28) | Container-Header | **ja** — löst P055, kleiner Scope |
| `content_v1 · label` (16) | Basis | ja |

**Kernbefund:** Die D3/D5-Reste sind zu **>80 %** Variantenfelder von
`card_v1`. Pauschales Seeding würde auf jeder Standard-Bildkarte
Feldgruppen wie „Feature 1..5", „Link 1..3 Label/Href/Kind", „CTA",
„Icon" zeigen, die der Redakteur weder versteht noch braucht. Das ist
genau der „Admin-Feldmüll", den Sprint 2k zur Recht vermieden hat.

---

## 6. Migrationsstrategie — Empfehlung

| Variante | Beschreibung | Konsequenz |
|---|---|---|
| **A — weiter D3/D5-Seeding** | flächiges Seeding aller fehlenden Vertragsfelder | schnell „grüne Zahlen", aber Admin wird unübersichtlich; spätere Variantenarbeit muss Felder wieder ausblenden |
| **B — Zielbaukasten zuerst** | erst `card_v1`-Varianten im Vertrag, Wechselteaser-Konsolidierung, Hub-Klärung, dann D3/D5 | etwas langsamer, aber jedes Seeding ist anschließend semantisch sauber; Admin bleibt klar |
| **C — Kombiniert (empfohlen)** | jetzt nur **sichere Basis-Seedings** (Container-Header `cards_v1`, `content_v1 · label`, `hero_v1 · cta_*`), parallel Variantenmodell für `card_v1`, dann variantenbewusstes Restseeding | minimales Risiko, ständig sichtbarer Fortschritt, kein Admin-Feldmüll |

**Empfehlung: Variante C.**

Begründung:
- D9 ist stabil bei 25, R2 ist 0, D1/D8 sind 0 — strukturell ist nichts mehr akut.
- Die ~3000 D3/D5-Reste auf `card_v1` lösen sich beim Variantenmodell **rechnerisch** auf, ohne eine einzige Zeile zu seeden, weil der Vertrag pro Variante nur die jeweils relevanten Felder erwartet.
- Sichere Basisseedings (`cards_v1`-Header, `hero_v1`-CTA) sind klein, fachlich eindeutig und sofort wirksam.

---

## 7. Bewertung B-538 / Standardisierung Bildkarte

- B-538 ist kein echtes Standardmuster, sondern UI-Platzhalter.
- Standard-Bildkarte = Vertrag `card_v1` Basis (siehe §3, Variante `image`), nicht eine konkrete Section im Bestand.
- Echte Pilotkandidaten als Referenzkarten: `gebaeudekommunikation.tuersprechanlagen / aussenstationen / card-Kinder` (B-026/B-027) für die Variante „Multi-Link-/Feature-Karte" und beliebige aktive `card_v1`-Kinder unter `cards_v1` (z. B. Anwendungen `cards`-Sections) für die Basisvariante.

---

## 8. Scope-Bestätigung

- keine DB-Mutation
- keine Migration
- keine RPC-Änderung
- keine Inhalte/Bilder/Feldwerte/Whitelist verändert
- keine i18n-JSON-Änderung
- keine Public-Renderer-/Routen-/Navigation-/Footer-Änderung
- keine Produktdatenbank
- ausschließlich strategisches Inventar
