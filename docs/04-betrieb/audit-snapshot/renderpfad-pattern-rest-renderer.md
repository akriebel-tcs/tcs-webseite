# Renderpfad-Pattern: Rest-Renderer am Seitenende (D2.3)

Stand: 2026-06-04
Befundklasse: `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`

## Regel

Wenn eine Page-Datei eigene Spezialbloecke rendert (also nicht
`<GenericCmsPage>` benutzt), muss sie **danach** alle uebrigen aktiven
Top-Level-Sections generisch ueber `renderPageSectionByType` ausspielen.

Andernfalls kann der Admin eine Section aktivieren, ohne dass sie
oeffentlich erscheint — genau die Fehlerklasse aus P027.

Ausnahmen muessen entweder im Code explizit als „bereits anderweitig
gerendert" markiert werden (siehe `handledSectionKeys` unten) oder im
`docs/02-architektur/sonderseiten-register.json` registriert sein.
Keine stillen Ausnahmen.

## Pattern

```tsx
{(() => {
  // Sections, die diese Page bereits oben explizit gerendert hat
  // oder die global ausserhalb des Body-Renderers laufen.
  const handledSectionKeys = new Set<string>([
    "hero",              // global ueber CmsPageLayout
    "standard_cta",      // global ueber CmsTailCta (SKIP_TYPES: cta_v1)
    // ... weitere Page-spezifische Spezialbloecke
  ]);
  const rest = cms.sections.filter(
    (s) =>
      !s.parent_section_key &&
      !handledSectionKeys.has(s.section_key),
  );
  return rest.map((s) =>
    renderPageSectionByType({
      pageKey: "<page_key>",
      sectionKey: s.section_key,
      sectionType: s.section_type,
      cms,
      locale: loc,
    }),
  );
})()}
```

## Was zaehlt als „bereits gerendert"

- `hero` / `hero_v1`: durch `CmsPageLayout` (steht in `SKIP_TYPES`).
- `cta_v1` / `standard_cta`: durch `CmsTailCta` am Seitenende des
  `PageLayout` (steht in `SKIP_TYPES`).
- Jede Section, deren Inhalte die Page weiter oben inline gerendert
  hat (z. B. `bereiche_intro` als ContentSection-Kopf von P027).
- Hartcodierte Spezialbloecke ohne DB-Gegenpart (z. B. `snipdoo` in P027).

## Was NICHT pauschal ausgeschlossen wird

Standardbausteine mit zentralem Renderer in `RENDERERS`, insbesondere:

- `faq_v1`
- `content_v1`
- `cards_v1`
- `teaser_2col_v1`
- `feature_grid_v1`
- `product_scroller_v1`
- `product_showcase_list_v1`
- `stats_v1`
- `download_list_v1`
- `tabs_v1`
- `rich_v1`

Diese muessen automatisch vom Rest-Renderer erfasst werden.

## Audit

Das Script `scripts/cms/page-renderer-coverage.mjs` erkennt Pages mit
einem `handledSectionKeys`-Set + Rest-Renderer als `generisch_iteration`
und entfernt davon abgedeckte Sections aus der Befundliste
`AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`.

Sobald das D4-Gate scharf geschaltet ist, bricht die CI hart, wenn eine
neue aktive DB-Section ohne Renderpfad eingefuehrt wird.

## Referenz-Implementierung

`src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`
ist die Vorlage. Beim Uebertragen auf weitere Pages bitte exakt
diese Struktur uebernehmen, damit das Audit-Script die Page korrekt
klassifiziert.
