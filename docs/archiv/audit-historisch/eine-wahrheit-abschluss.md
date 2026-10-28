# Eine-Wahrheit-Statusbericht (CMS-Light)

> **Status: WIEDER OFFEN (Runde 12.b, Zwischenstand 2026-06-03).**
> Runde 12 hat die Audit-Lücke verschärft und P253 / `produkte.hub`
> strukturell geschlossen. Runde 12.b hat die **P113 9-Block-Migration**
> abgeschlossen: die 9 Detail-Blöcke der Persona Wohnungswirtschaft sind
> jetzt vollständig als CMS-Sections (`detail_*`, Typ `cards_v1` +
> `card_v1`) in der DB hinterlegt, DE+EN gepflegt, im Admin freigeschaltet
> und werden ausschließlich über den zentralen `PersonaCmsSection`-Renderer
> ausgespielt. `WoWiDetailSections.tsx` ist entfernt.
> Offen bleiben: Persona-Body-Renderer auf DB-`sort_order` (Schritt 4)
> sowie die 5 `SECTION_TYPE_OHNE_RENDERER`-Befunde.
> Maßgeblich bleibt ausschließlich
> `scripts/cms/globaler-spiegel-audit.mjs` + Sub-Gates.

## 0. Aktueller Audit-Stand

`node scripts/cms/globaler-spiegel-audit.mjs` (Stand 2026-06-03,
nach P113-Migration):

| Befund-Code | Anzahl | Bedeutung |
|---|---:|---|
| `PUNKT_KEY_IN_INAKTIVER_CONTAINER` | 47 | Inaktive Container mit gefüllten Punkt-Key-Feldern (Altbestand `detailSections.*`). |
| `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK` | 6 | Persona-Komponenten rendern `<section data-cms-section="…">` (hero/stats) ohne aktive cms_sections-Zeile. |
| `RENDER_ORDER_NICHT_AUS_DB` | 6 | Alle 6 Persona-Content-Dateien verdrahten Body-Sections hart in JSX statt aus `cms.sections.sort_order` zu rendern. |
| `SECTION_TYPE_OHNE_RENDERER` | 5 | Aktive section_types ohne Renderer-Eintrag: `catalog_filter_grid_v1`, `list_v1`, `role_tabs_v1`, `series_override_container_v1`, `series_override_v1`. |
| `PERSONA_FALLBACK_RENDERER_AKTIV` | 2 | WoWi rendert Solutions aus lokaler i18n-Map statt aus DB-Teasern. |
| `PERSONA_DETAILSECTIONS_LEGACY` | 0 | (Runde 12.b — P113 strukturell behoben, `WoWiDetailSections.tsx` entfernt.) |
| `LOCALER_STANDARDSECTION_RENDERER` | 0 | (P253 strukturell behoben.) |
| `CONTAINER_KINDER_NICHT_UEBER_STANDARDRENDERER` | 0 | (P253 strukturell behoben.) |

### Runde 12.b — P113 9-Block-Migration, Vorher/Nachher

| Messwert | Vorher | Nachher | Delta |
|---|---:|---:|---:|
| Aktive `cms_sections` auf `personas.wohnungswirtschaft` | 18 | 46 | **+28** |
| `detail_*`-Sections (9 Container vom Typ `cards_v1` + 19 Karten `card_v1`) | 0 | 28 | **+28** |
| `cms_section_fields` für `detail_*` (DE + EN) | 0 | 118 | **+118** |
| `cms_admin_editable_fields` für `detail_*` (Whitelist) | 0 | 118 | **+118** |
| Hartcodierte JSX-Renderer in `WoWiDetailSections.tsx` | 9 | 0 (Datei entfernt) | **−9** |

Schritt: 9 Container vom Typ `cards_v1` (sort_order 30 ff.), Container-Felder
`label`/`title`/`intro` (DE+EN). Pro Karte ein `card_v1`-Kind mit
`title`/`description` (DE+EN). Jeder Eintrag liegt gleichzeitig in der
Admin-Whitelist (`is_enabled=true`) — die Spiegel-Regel hält damit auch
für die 9 Detail-Blöcke. Hinweis: Die 4 längeren Intro-Texte (barrierefrei,
plugPlay inkl. Beschaffungs-/Installationshinweis, mietershop, serviceGarantie)
wurden im Container-Feld `intro` als Fließtext zusammengeführt; im Admin
können sie dort eins-zu-eins gepflegt werden.

Snapshot im Repo: `docs/04-betrieb/audit-snapshot/`.

## 1. Was in Runde 12 erledigt wurde

### 1.1 Audit global geschärft (neue Codes, alle aktiv)

In `scripts/cms/globaler-spiegel-audit.mjs`:

- **`SECTION_TYPE_OHNE_RENDERER`** — aktiver `section_type` ohne
  Eintrag in `RENDERERS`/`normalizeType()`. Zeigt sofort, wenn ein
  Sondertyp in der DB lebt, den Public nicht standardisiert rendert.
  Findet aktuell 5 Typen (siehe oben).
- **`LOCALER_STANDARDSECTION_RENDERER`** — Page-Datei enthält
  lokales `motion.article`/`<article>`-Inline-Rendering einer
  Karten-Section. Findet 0 nach P253-Fix.
- **`CONTAINER_KINDER_NICHT_UEBER_STANDARDRENDERER`** — Container
  mit aktiven `card_v1`-Kindern, aber Page rendert die Kinder lokal.
  Findet 0 nach P253-Fix.

Bestehende Codes (`PERSONA_DETAILSECTIONS_LEGACY`,
`RENDER_ORDER_NICHT_AUS_DB`, `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK`,
`PUNKT_KEY_IN_INAKTIVER_CONTAINER`, `PERSONA_FALLBACK_RENDERER_AKTIV`)
bleiben unverändert scharf.

### 1.2 Neues CI-Gate `persona-sort-order-wirksam.mjs`

`scripts/cms/persona-sort-order-wirksam.mjs` prüft statisch (ohne DB)
pro Datei:

- Persona-Content-Datei muss `PersonaBodyRenderer` einsetzen ODER
  darf nicht mehr als 1 `<PersonaCmsSection …/>` im Body verdrahten.
- WoWi darf keine `WoWiDetailSections`/`*Section`-Imports mehr führen.
- `ProduktHubPage.tsx` darf kein lokales `motion.article` enthalten,
  muss `renderPageSectionByType` aufrufen und darf `cards` nicht
  als `if (section_key === "cards")`-Sonderfall behandeln.

Hart eingebunden in `.github/workflows/cms-audit.yml` (kein
`continue-on-error`). Bricht CI rot.

### 1.3 P253 / Produkte-Hub strukturell geschlossen

- DB-Migration (idempotent): `cms_sections.section_type` für
  `produkte.hub`/`cards` von `card_grid_v1` auf `cards_v1` umgestellt.
- `title`-Felder DE+EN aus `headline` backfilled.
- Whitelist für Container-Header (`label`/`title`/`intro` DE+EN)
  vollständig ergänzt.
- `src/features/produkte/pages/ProduktHubPage.tsx` enthält keinen
  lokalen Karten-Renderpfad mehr. Alle Top-Level-Sections (inkl.
  `cards`) laufen über `renderPageSectionByType` in DB-`sort_order`.
- Folge: link_1/2/3, Chips, Bullets, Icon-Resolver wirken jetzt wie
  bei jeder Standardkarte. `card_grid_v1` ist nicht mehr aktiv und
  taucht in `SECTION_TYPE_OHNE_RENDERER` nicht mehr auf.

## 2. Was offen bleibt (Runde 12.b)

### 2.1 P113 / `personas.wohnungswirtschaft` — 9-Block-Migration

Status: **offen**. `WoWiDetailSections.tsx` rendert weiterhin
9 Detailbereiche aus i18n. `PERSONA_DETAILSECTIONS_LEGACY` bleibt
rot, `RENDER_ORDER_NICHT_AUS_DB` für WoWi bleibt rot,
`PUNKT_KEY_IN_INAKTIVER_CONTAINER` (47) bleibt rot.

Pflicht für 12.b:

1. Je Block (`tuersprechanlagen`, `barrierefrei`, `plug_play`,
   `mietershop`, `namensanzeige`, `zutritt_parkraum`,
   `gefahrenalarmierung`, `bestandsmodernisierung`, `service_garantie`)
   echte `cms_sections` als `content_v1` oder `cards_v1` anlegen.
2. Inhalte aus i18n + bestehenden `detailSections.*`-Punkt-Keys
   verlustfrei übernehmen, Whitelist DE+EN.
3. Alten `detailSections`-Container deaktiviert/archiviert belassen
   (nicht löschen, Always-Follow-Regel).
4. `WoWiDetailSections.tsx`-Imports aus `WohnungswirtschaftContent.tsx`
   entfernen.
5. Vorher/Nachher-Nachweis: gleiche Texte, jetzt als echte
   CMS-Sections im Admin pflegbar.

### 2.2 Persona-Body-Renderer auf DB-`sort_order` (alle 6 Personas)

Status: **offen**. Alle 6 Persona-Content-Dateien verdrahten Body
hart in JSX (`RENDER_ORDER_NICHT_AUS_DB = 6`,
`persona-sort-order-wirksam` rot).

Pflicht für 12.b:

- Gemeinsamer `PersonaBodyRenderer` einführen, der über
  `cms.sections.sort_order` iteriert und `renderPageSectionByType`
  aufruft.
- Hero + Stats bleiben Sonderpfad (`KNOWN_JSX_SONDERPFADE`
  dokumentiert — **Allowlist ist Schuld auf Zeit, nicht Zielzustand**).
- Alle 6 Personas auf den neuen Renderer umstellen.
- WoWi-Solutions-Fallback (`solutionLinkByKey` / `solutionKeys.map`)
  durch DB-Teaser ersetzen (`PERSONA_FALLBACK_RENDERER_AKTIV = 0`).

### 2.3 Unregistrierte Standardtypen

Status: **offen** (5 Treffer in `SECTION_TYPE_OHNE_RENDERER`).
`catalog_filter_grid_v1`, `list_v1`, `role_tabs_v1`,
`series_override_container_v1`, `series_override_v1` brauchen
entweder einen registrierten Renderer oder eine Migration auf einen
Standardtyp. Keine neuen Sondertypen zementieren.

## 3. Abnahmebedingungen für „geschlossen"

Bevor wieder „geschlossen" behauptet werden darf, müssen alle
folgenden Punkte gleichzeitig grün sein:

- [ ] `PERSONA_DETAILSECTIONS_LEGACY = 0`
- [ ] `RENDER_ORDER_NICHT_AUS_DB = 0`
- [ ] `PUNKT_KEY_IN_INAKTIVER_CONTAINER = 0`
- [ ] `PERSONA_FALLBACK_RENDERER_AKTIV = 0`
- [x] `LOCALER_STANDARDSECTION_RENDERER = 0` *(seit Runde 12)*
- [x] `CONTAINER_KINDER_NICHT_UEBER_STANDARDRENDERER = 0` *(seit Runde 12)*
- [ ] `SECTION_TYPE_OHNE_RENDERER = 0`
- [ ] `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK` ≤ KNOWN_JSX_SONDERPFADE,
      jeder Treffer hat eine aktive cms_sections-Zeile UND ist im
      Bericht begründet
- [ ] Sub-Gate `persona-eine-wahrheit` exit 0
- [ ] Sub-Gate `persona-sort-order-wirksam` exit 0
- [ ] Verschieben im CMS-Light beeinflusst die Public-Reihenfolge auf
      allen 6 Personas und auf P253
- [ ] Audit-Snapshot in `docs/04-betrieb/audit-snapshot/` aktualisiert

## 4. Bewusst dokumentierte Sonderpfade

`KNOWN_JSX_SONDERPFADE` in `scripts/cms/globaler-spiegel-audit.mjs`:

- `personas.*` → `hero`, `stats` dürfen als JSX-Sonderlayout bleiben,
  müssen aber als aktive `cms_sections` mit Whitelist existieren und
  DB-first lesen.

**Allowlist ≠ Zielzustand.** Jede Ausnahme ist technische Schuld auf
Zeit, kein dauerhafter Zustand.

## 5. Was das praktisch heißt

Solange der Audit rot ist:

- Keine Behauptung „Eine Wahrheit geschlossen".
- Inhalte, die auf P113 öffentlich erscheinen, aber im Admin nicht
  auftauchen, sind erwartbar (nicht editierbar). Pflegekanal
  vorübergehend: `src/i18n/locales/de/personas.json` →
  `wohnungswirtschaft.detailSections.*` — bis 12.b erledigt ist.
- Drag/drop in der CMS-Navigation hat auf Persona-Seiten **keine**
  Wirkung auf die Public-Reihenfolge, bis der `PersonaBodyRenderer`
  steht.
- P253 funktioniert ab jetzt korrekt: Verschieben/Bearbeiten im
  Admin spiegelt sich auf der Produkte-Hub-Seite.
