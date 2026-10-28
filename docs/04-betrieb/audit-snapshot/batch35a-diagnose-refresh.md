# Batch 35a — Diagnose-Refresh für P-057 / P-071

Stand: 2026-06-05
Status: ✅ abgenommen

## Auftrag

Diagnose- und Admin-Anzeigen für P-057 (`anwendungen.bildungseinrichtungen`)
und P-071 (`anwendungen.interne-kommunikation`) auf den Stand nach
Batch 33d / 34b / 34c bringen. Keine Renderer-Logik, keine DB, keine
Inhalte, keine Navigation, keine Migration anfassen.

## Befund vor dem Refresh

`docs/04-betrieb/audit-snapshot/page-renderer-coverage.json` und damit
`src/features/admin/lib/rendererPathMap.generated.ts` haben P-057 und
P-071 als `hart_codiert / sonderlogik / eigene_komponente` geführt.
Tatsächlich rendern beide Seiten seit Batch 33d / 34b vollständig
DB-first über `useCmsPageContent(PAGE_KEY)` +
`renderPageSectionByType(...)`.

Ursache: Der Heuristik-Extractor in
`scripts/cms/page-renderer-coverage.mjs` konnte den `page_key` und die
Section-Keys nicht erkennen, weil

1. der `PAGE_KEY` als `const PAGE_KEY = "…"` deklariert und nur als
   Variable an `useCmsPageContent` / `CmsPageLayout` weitergereicht
   wird,
2. P-057 die Section-Keys als Template-Literale baut
   (`einrichtung_${id}`, `anforderungen_${id}`,
   `leistungen_${id}_…`, `broschure_${id}`),
3. P-071 die Section-Keys als String-Array-Konstante
   (`const SECTION_ORDER = ["einrichtung_intern", "anforderungen", …]`)
   führt und über `SECTION_ORDER.map((sk) => renderTopSection(sk))`
   an `renderPageSectionByType` reicht.

## Maßnahmen (nur Diagnose-Skripte / generierte Dateien)

1. `scripts/cms/page-renderer-coverage.mjs` ergänzt um drei Erkennungs-
   Heuristiken — rein additiv, keine Verhaltensänderung für bereits
   korrekt eingestufte Seiten:
   - Fallback-Muster `const PAGE_KEY = "…"` für die `page_key`-
     Extraktion.
   - Template-Literal-Präfix `\`<prefix>_${…}` wird als
     `explicit_section_key_prefix` geführt.
   - String-Array-Konstanten (`const NAME = ["…", "…"]`) gelten als
     explizit gehandhabte Keys, wenn die Datei
     `renderPageSectionByType(...)` aufruft.
2. `node scripts/cms/page-renderer-coverage.mjs` neu ausgeführt →
   D1-Befunde: 0 (unverändert), aber P-057 und P-071 sind jetzt im
   Coverage-Snapshot enthalten und korrekt als `teilweise_generisch`
   klassifiziert.
3. `node scripts/admin/build-renderer-path-map.mjs` neu ausgeführt →
   `src/features/admin/lib/rendererPathMap.generated.ts` aktualisiert.

## Ergebnis (Admin-Anzeige „Technischer Renderpfad")

| page_key | vorher | nachher |
| --- | --- | --- |
| `anwendungen.bildungseinrichtungen` | `hart_codiert / sonderlogik / eigene_komponente` | `teilweise_generisch / gemischt / eigene_komponente_teilweise` |
| `anwendungen.interne-kommunikation` | `hart_codiert / sonderlogik / eigene_komponente` | `teilweise_generisch / gemischt / eigene_komponente_teilweise` |

Die Einstufung als „gemischt" ist bewusst: Beide Seiten dispatchen DB-
Sections explizit über benannte Section-Keys (kein voller
`cms.sections.map(...)`-Sweep). Sie sind damit fachlich DB-first, aber
technisch keine `GenericCmsPage`. „gemischt" beschreibt das exakter
als „standardisiert" und ist ehrlicher als „sonderlogik".

## Was NICHT angefasst wurde

- Keine Renderer-/Page-Komponenten geändert.
- Keine Section-Renderer geändert.
- Keine DB-Migration, keine RPC, keine Daten.
- Keine Navigation, keine Templates, keine Whitelist.
- Keine Inhalte (cms_section_fields, cms_assets) verändert.
- Keine Altcontainer gelöscht.
- Keine Folgearbeit an P-056 / P-059 / P-060 / P-065 / P-077 begonnen.

## Verifikation

- `node scripts/cms/page-renderer-coverage.mjs` → 0 D1-Befunde.
- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ OK.
- Build wird durch die Harness automatisch geprüft.

## Restpunkt R1 aus Batch 35

Restpunkt R1 (Coverage-Snapshot stale) ist mit Batch 35a aufgelöst.
Die Restpunkte R2–R4 aus Batch 35 bleiben unverändert offen und sind
für spätere Batches eingeplant.
