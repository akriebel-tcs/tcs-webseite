# D10-Spezialrisiken — Inventur & Gruppierung

Stand: 2026-06-03 · Quelle: `node scripts/cms/contract-drift-audit.mjs`
(read-only) → `docs/04-betrieb/contract-drift-audit-latest.md`.

D10 zählt keine Daten-Drift, sondern **vertragliche Hinweise pro
`section_type`** — also bekannte Renderer-Sonderheiten, die in der
Section-Vertrags-Map (`src/features/admin/lib/sectionTypeContracts.ts`)
explizit eingetragen sind. Sie sind kein Bug, sie beschreiben eine
bewusst akzeptierte Renderer-Eigenschaft.

**Gesamtzahl:** 28 Hinweise auf 14 `section_type`s.

## Gruppen

### A. Container liest Header heute aus i18n (Spiegelregel-Restschuld) — 2

- `cards_v1` — P055 (B-2059): Header heute aus i18n, Vertrag verlangt
  DB-Felder `label/title/intro` am Container.
- `product_scroller_v1` — Türsprechanlagen: Container-Header aus
  `tuersprechanlagen.*` (i18n), nicht aus DB.

**Aktion:** real abbaubar im geplanten Sprint „pro-Feld-Text-Whitelist
je `section_type`" (siehe `docs/current-status.md`, Etappe 4). Bis dahin
bewusster Restbestand.

### B. Aliasing/dynamische Field-Patterns (Audit kennt sie als Pattern) — 7

- `content_v1` — `normalizeType` aliasiert `content / intro /
  content_block_v1 / content_blocks_intro_v1 → content_v1`.
- `card_v1` — Aliase `eyebrow / headline / beschreibung` nur in
  Spezial-Renderern.
- `card_v1` — `feature_grid_v1`-Kinder dürfen kein `image`.
- `card_v1` — `card_grid_v1 / catalog_filter_grid_v1`-Kinder lesen
  `thumbnail`, nicht `image`.
- `feature_grid_v1` — Kinder sind Iconkarten, `image/thumbnail` an
  Kindern bewusst nicht gerendert.
- `download_list_v1` — Kinder `card_v1` lesen `file_label / cta_href`,
  kein `image`-Slot.
- `card_grid_v1`, `catalog_filter_grid_v1` — Kinder lesen `thumbnail`.

**Aktion:** bewusst behalten. Diese Aliase sind notwendig, weil die
Public-Renderer historisch verschiedene Feldnamen lesen. Der Admin
behandelt sie konsequent über die Whitelist; Drift würde D2/D4
auffangen — beide stehen aktuell auf 0.

### C. Renderer-Spezialfälle (kein generischer CmsBodyRenderer) — 8

- `product_scroller_v1` — Spezial-Renderer liest zusätzlich
  `card.eyebrow/headline/beschreibung` + `*_enabled`-Toggles.
- `list_v1` — Konsumiert von `ReferenzprojektDetailPage`
  (`anwendungen.referenzprojekte.<slug>`, Sections `highlights`/`systems`).
- `list_v1` — Page liest `items` direkt und splittet zeilenweise.
- `role_tabs_v1` — Konsumiert von `SnipdooIpPage`
  (`gebaeudekommunikation.snipdoo-ip`).
- `role_tabs_v1` — Felder dynamisch `tabs.<roleKey>.label|headline|p1|p2`.
- `role_tabs_v1` — Kein generischer Renderer — Page liest Rollen-Keys
  aus i18n.
- `tab_v1` — Renderer liest `vorteile.<n>.headline / body`.
- `tab_v1` — Audit erkennt diese dynamisch.

**Aktion:** bewusst behalten. Diese Spezialrenderer haben dokumentierte
Konsumenten (genau eine Page pro Renderer); ein Umbau auf den generischen
`CmsBodyRenderer` wäre ein eigener großer Sprint und nicht risikoarm.

### D. Dynamische Slug-/Sub-Page-Pfade (Sonderfall, dokumentiert) — 1

- `tab_v1` — `mobile-tk-preview.root` hat `tab_v1` historisch als
  Top-Level (D9 markiert das korrekt als `child_only_at_top_level`).

**Aktion:** bewusst behalten — `mobile-tk-preview.root` ist eine
Vorschau-Seite, kein redaktioneller Live-Pfad. D9-Markierung reicht.

### E. Legacy/Read-only (Produkt-/Katalog-Spezial) — 4

- `series_override_v1` — Legacy/Fallback: nur Produktkatalog-Overrides,
  Admin read-only.
- `series_override_container_v1` — Konsumiert von
  `CatalogMvp/TuerkommunikationHub`.
- `series_override_container_v1` — Container ohne sichtbaren Header.
- `series_override_container_v1` — Children (`series_override_v1`) sind
  Legacy: nur über Admin-spezifische Schreibwege pflegbar.

**Aktion:** bewusst behalten. Produktdatenbank wird in diesem Sprint per
Scope-Grenze nicht angefasst.

### F. Renderer-Spezialitäten ohne Umbau-Lever — 6

- `hero_v1` — Wird nicht im `CmsBodyRenderer` ausgegeben (`SKIP_TYPES`).
- `teaser_2col_v1` — `cta_link` vs. `cta_href`: niemals im selben
  Adminfeld vermischen.
- `faq_v1` — Items als Felder `items.<slug>.frage|antwort`, nicht als
  Kindsection.
- `faq_v1` — Renderer akzeptiert drei Schemata.
- `tabs_v1` — Erlaubte Kindtypen müssen mittelfristig enger gefasst
  werden.

**Aktion:** weiter beobachten. Der Vertrag dokumentiert das Verhalten
korrekt; die CI würde Drift sofort melden.

## Risikobewertung

| Gruppe | Eintragszahl | Risiko | Aktion in diesem Sprint |
|--------|-------------:|--------|-------------------------|
| A      | 2            | mittel | aufgehoben für Etappe 4 |
| B      | 7            | niedrig | dokumentiert behalten |
| C      | 8            | niedrig | dokumentiert behalten |
| D      | 1            | niedrig | dokumentiert behalten |
| E      | 4            | niedrig (Scope-Grenze) | nicht angefasst |
| F      | 6            | niedrig | weiter beobachten |

**Ergebnis:** Keine D10-Befunde sind in diesem Sprint risikoarm
**und** außerhalb der Scope-Grenzen reparierbar. Die 2 Befunde in
Gruppe A werden mit dem geplanten Whitelist-Sprint adressiert.
