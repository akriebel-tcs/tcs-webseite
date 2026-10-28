# Batch 41 — P-077 `anwendungen.referenzprojekte` Standardisierung

Datum: 2026-06-05
Bereich: TCS in Bauten / Anwendungen — Referenzprojekt-Übersicht
Modus: **DB-first-Umstellung** der bisherigen Sonderlogik
(`ReferenzprojektePage.tsx` + i18n + `useCmsAssetsForPages`) auf das
normale CMS-Light-Kartenraster (`cards_v1` + `card_v1`). Idempotente
Migration, kein Löschen, keine Navigation, keine Subseiten-Umbauten.

## 1. Ist-Zustand vor Batch 41

- P-077 zeigte 12 Referenzprojekt-Karten via hartcodiertem Grid in
  `ReferenzprojektePage.tsx`.
- Inhalte (Titel, Typ, Beschreibung, Detail-CTA) kamen aus i18n
  (`anwendungen.referenzen.projekte.<slug>.*`).
- Bilder kamen via `useCmsAssetsForPages` aus den Hero-Assets der
  jeweiligen Subseite (`anwendungen.referenzprojekte.<slug>.hero.image`).
- Link je Karte: `/anwendungen/referenzprojekte/<slug>`.
- DB-Sections auf P-077 (vorher): `hero` (hero_v1), `content`
  (content_v1, Intro), `faq` (faq_v1, inaktiv), `standard_cta`
  (cta_v1). **Kein Karten-Container.**

## 2. Neue Standardstruktur

Auf P-077 neu angelegt (Migration Batch 41):

- `cards_standard` (cards_v1, sort_order 15) — Container-Felder
  Label/Title/Intro DE+EN (1:1 aus i18n `referenzen.list`).
- 12 × `card_v1` als Kinder von `cards_standard`:

| sort | section_key | Titel | Eyebrow (Typ) | Link-Ziel | P-ID Ziel |
|---:|---|---|---|---|---:|
| 0 | `card_pulse_berlin` | PULSE, Berlin | Gewerbeneubau | `/anwendungen/referenzprojekte/pulse-berlin` | P-241 |
| 10 | `card_weidt_park_corner` | Weidt Park Corner, Berlin Mitte | Wohnanlage | `…/weidt-park-corner` | P-242 |
| 20 | `card_fritztower` | Fritztower, Berlin | Hochhaus | `…/fritztower` | P-243 |
| 30 | `card_haupttelegraphenamt` | Haupttelegraphenamt, Berlin | Denkmal / Sanierung | `…/haupttelegraphenamt` | P-244 |
| 40 | `card_spichern_2` | Spichern 2, Berlin | Wohn- und Geschäftshaus | `…/spichern-2` | P-245 |
| 50 | `card_thulestrasse` | Thulestraße, Berlin | Mehrfamilienhaus | `…/thulestrasse` | P-246 |
| 60 | `card_quartier_heidestrasse` | Quartier Heidestrasse, Berlin | Stadtquartier | `…/quartier-heidestrasse` | P-247 |
| 70 | `card_luisenpark_residenz` | Luisenpark Residenz, München | Wohnanlage | `…/luisenpark-residenz` | P-248 |
| 80 | `card_klinikum_sued` | Klinikum Süd, Stuttgart | Gesundheitseinrichtung | `…/klinikum-sued` | P-249 |
| 90 | `card_rathaus_neustadt` | Rathaus Neustadt, Dresden | Öffentliche Hand | `…/rathaus-neustadt` | P-250 |
| 100 | `card_campus_westend` | Campus Westend, Frankfurt | Bildungseinrichtung | `…/campus-westend` | P-251 |
| 110 | `card_seniorenresidenz_am_park` | Seniorenresidenz Am Park, Hamburg | Pflegeeinrichtung | `…/seniorenresidenz-am-park` | P-252 |

Pro Karte gepflegt (DE+EN, 1:1 aus i18n übernommen, nichts frei
umgeschrieben): `title`, `description`, `eyebrow` (+ `eyebrow_enabled=1`),
`icon='building'` (+ `icon_enabled=0`, Bild dominiert), `image_enabled=1`,
`link_1_label='Mehr erfahren'/'Learn more'`, `link_1_href` (interner
Pfad zur Subseite), `link_1_kind='internal'`, `link_1_enabled=1`.

**Bild-Assets:** je Karte 1 Row in `cms_assets` (asset_role='image',
field_key='image', locale=NULL) mit derselben `public_url`, die
bisher schon die Hero-Bilder der Subseiten geliefert hat. Kein neuer
Storage-Inhalt, nur DB-Spiegel.

**Whitelist:** vollständig.
- `cards_standard`: 6 Einträge (label/title/intro × DE+EN).
- Je Karte: 78 Einträge (39 Standard-card_v1-Keys × 2 Sprachen) inkl.
  bullets/chips/3 Link-Slots/Toggles.

## 3. Admin-Verlinkungs-Pille

`CardLinkPill` + `resolveCardLink` sind generisch und greifen für jede
`card_v1`-Karte, deren `link_1..3_href` mit `/` beginnt und in
`cms_pages.route_path` aufgelöst werden kann. Für die 12 neuen
Referenzkarten gilt das (alle 12 Subseiten existieren, status
`published`, `is_active=true`). Im Admin-Baum erscheint unter jeder
Karte automatisch die graue Pille mit P-Nummer und Routen-Pfad —
**keine Anpassung der Admin-Logik nötig**, kein parallel-Code gebaut.

## 4. Renderer

`src/features/anwendungen/pages/ReferenzprojektePage.tsx` wurde nach dem
Muster von `ObjektloesungenPage` (Batch 37) auf DB-first umgestellt:

- Hero kommt via `CmsPageLayout` (heroImage/label/headline/intro leer →
  Layout liest selbst aus DB / Fallback).
- `content` (content_v1) und `cards_standard` (cards_v1) werden über
  `renderPageSectionByType(...)` aus den DB-Sections gerendert.
- Tail-CTA (`standard_cta`) läuft wie auf allen Standardseiten via
  `CmsTailCta`.
- Kein Scroller, kein eigenes Grid, keine Spezialkomponente.
- `referenzprojekte`-Strukturdaten-Konstante in
  `src/features/anwendungen/data/referenzprojekte.ts` und der Hook
  `useCmsAssetsForPages` werden für die Übersicht **nicht mehr
  importiert**. Die Detail-Seiten nutzen sie weiterhin (außerhalb des
  Scopes von Batch 41).

## 5. Layout

12 Karten laufen über die bestehende `cardGridClass()` /
`cardGridItemClass()`-Regel. Für 12 Karten ergibt das `[4, 4, 4]` auf
Desktop (3 ausgewogene Reihen) — Standardraster, keine 1er-Orphans,
keine hartcodierten `grid-cols-*`-Klassen, keine Sonderregel.

## 6. Deaktivierte / nicht mehr genutzte Altlogik

- **Code:** das hartcodierte React-Grid in `ReferenzprojektePage.tsx`
  (i18n + per-Slug Sub-Page-Asset-Lookup) ist entfernt. Datei
  `src/features/anwendungen/data/referenzprojekte.ts` bleibt im Repo
  (wird vom Detail-Renderer weiter benutzt) — kein Code-Müll.
- **DB-Altcontainer:** **keine** auf P-077 deaktiviert. Es gab vorher
  schlicht keinen Karten-Container — die alten Karten lebten nur im
  Code. Nichts zu löschen, nichts zu archivieren.

## 7. Was nicht angefasst wurde

- Referenz-Unterseiten (P-241 … P-252): Inhalte, Sections, Renderer,
  Routen, Assets — alle unverändert.
- Navigation (`cms_navigation_nodes`, MainNav, Footer, Persona,
  Breadcrumb): unverändert.
- Produktdatenbank / PDP / Produktkatalog: nicht angefasst.
- Section-Typ-Katalog: keine neuen Typen.
- i18n-JSONs: nicht verändert (bleiben Fallback).

## 8. Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ **grün** (nach
  Regenerierung von `faq-cta-toggle-inventar`).
- `node scripts/cms/page-renderer-coverage.mjs` → 80 Page-Dateien,
  **0 Befunde** der Klasse `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`.
- `node scripts/admin/build-renderer-path-map.mjs` → 97 Pages neu
  geschrieben.
- DB-Stichprobe: 12 × `card_v1` aktiv, 12 × `image`-Asset aktiv,
  78 Whitelist-Einträge pro Karte, 6 für Container.

## 9. Restpunkte

- **R41-1 (Diagnose-Klassifizierung):** `rendererPathMap.generated.ts`
  zeigt für P-077 weiterhin `status="sonderlogik"`, weil der
  Harvester (`harvest-page-component-reads.mjs`) die Page-Datei noch
  als hartcodiert klassifiziert. Auf P-056/P-057/P-059/P-060/P-071
  wurde das in Batch 38 manuell auf `gemischt / teilweise_generisch`
  nachgeführt. Für P-077 gleichartig nachziehen (kosmetisch, betrifft
  nur PageEditor-Anzeige, ändert nichts an Public-Verhalten).
- **R41-2 (i18n-Aufräumen):** Die Block-Inhalte unter
  `anwendungen.referenzen.projekte.*` (DE+EN) sind seit Batch 41 für
  die Übersicht nicht mehr in Verwendung. Detail-Seiten nutzen sie
  noch (titel/longDescription/highlights/systems). Bereinigung erst,
  wenn auch die Detail-Seiten DB-first migriert werden — **nicht in
  diesem Batch**.
- **R41-3 (Bildquelle):** Die `public_url`s zeigen aktuell auf die
  alte Domain `tcsag-web.lovable.app/referenzen/<slug>.jpg` (gleiche
  URLs wie bisher in den Sub-Page-Hero-Assets). Wenn die Redaktion
  die Bilder auf einen eigenen Storage-Bucket umzieht, müssen
  parallel beide Stellen (Subseiten-Hero + Übersichtskarten)
  aktualisiert werden.

## 10. Zusammenfassung

P-077 rendert die Referenzprojekt-Übersicht jetzt vollständig DB-first
aus Standardbausteinen (`cards_v1` + `card_v1`). Die letzte
„Sonderlogik"-Seite im Bereich „TCS in Bauten / Anwendungen" ist damit
auf das Standardmodell migriert. Wahrheits-Check und Coverage sind
grün. Subseiten, Navigation und Produkt-DB wurden nicht angefasst.
