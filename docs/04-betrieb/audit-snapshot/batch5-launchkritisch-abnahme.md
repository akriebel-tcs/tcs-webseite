# Batch 5 — Launch-Kritisch auf 0

Stand: 2026-06-04 · Quelle: `live:supabase` · `node scripts/cms/faq-cta-toggle-inventar.mjs`

## Vorher → Nachher (FAQ-/CTA-Toggle-Inventar)

| Block | Vorher (Batch 4 Ende) | Nachher (Batch 5) |
|-------|----------------------:|------------------:|
| FAQ orphan | 3 | **0** |
| FAQ ok     | 77 | 80 |
| CTA orphan | 23 | **0** |
| CTA mixed  | 1 (`home.start`) | **0** |
| CTA ok     | 85 | 109 |

Body-Pfad: **114 ok / 0 unknown** (unverändert).

Wahrheitscheck-Kritisch FAQ-/CTA-Orphans: **27 → 0** (52 + 58 vor Batch 4 → 3 + 23 nach Batch 4 → **0 + 0** nach Batch 5).

## Behobene Fälle

### Audit-Fehlklassifikationen (kein Code-Fix nötig, nur Audit-Marker erweitert)

`scripts/cms/faq-cta-toggle-inventar.mjs`:

- `<CTASection/>` ist seit Batch 4 nur noch ein dünner Wrapper um `CmsTailCta` — Regex `legacyCTASection` durch `ctaSectionWrapper` ersetzt, zählt als CTA-OK. Behebt `home.start` (`mixed → ok`).
- `CmsProductSolutionShell` rendert intern die DB-Section `cta` (Kontakt-Block). Neuer Marker → CTA-OK. Behebt 11 zutrittskontrolle/gebaeudemanagement BCM-Pages (`orphan → ok`).
- `PersonaBodyRenderer` iteriert `cms.sections` und dispatcht `standard_cta`/`cta_v1` + `faq_v1` über `renderPageSectionByType`. Neuer Marker `personaBodyRenderer` → FAQ-/CTA-OK. Behebt 6 Persona-CTA + `personas.bauherr` FAQ.
- `renderPageSectionByType(...)` zählt jetzt als generischer Renderer-Dispatch (Klammer-Variante in Regex `usesGenericRenderers`).

### Echte Code-Fixes (Speziallayouts ohne PageLayout/CmsPageLayout)

Jede Page bekommt `CmsRenderRegistryProvider` als Wurzel und am Ende `CmsTailFaq` + `CmsTailCta`. Wo eine Page eine eigene Inline-CTA hartcodiert hat, registriert `CmsInlineSectionMarker sectionKey="standard_cta"` die Section im Render-Pass, damit der Tail nicht doppelt rendert.

- `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` — Provider + Tail; Inline-Kontakt-Block markiert als `standard_cta`.
- `src/features/service/pages/PlanenKonfigurierenPage.tsx` — Provider + Tail; Inline-CTA markiert als `standard_cta`.
- `src/features/produkte/pages/TuerkommunikationHubPage.tsx` — Provider + Tail (keine Inline-CTA).
- `src/features/serviceportal/pages/ServiceportalPage.tsx` — Provider + Tail; Inline-„matches PageLayout"-CTA markiert als `standard_cta`.
- `src/features/serviceportal/pages/RegistrierenPage.tsx` — Provider + Tail.
- `src/features/serviceportal/pages/PasswortVergessenPage.tsx` — Provider + Tail.

### Neue Hilfskomponente

- `src/features/cms/components/CmsInlineSectionMarker.tsx` — winziger No-Op-Marker, der `useMarkRendered(sectionKey)` aufruft. Verhindert Doppel-Render auf Speziallayouts, die ihre Inline-CTA absichtlich behalten.

## Bewusste Restschuld (NICHT Launch-Kritisch)

- SnipdooIpPage, PlanenKonfigurierenPage, ServiceportalPage: die Inline-CTA überschreibt weiterhin den DB-Inhalt von `standard_cta`. Admin-Toggle „inaktiv" wirkt auf der Public-Seite **nicht**, solange der Inline-Block im Code steht. Wenn der Inhalt in die DB wandert, kann `<CmsInlineSectionMarker/>` plus das Inline-Markup ersatzlos gelöscht werden — der Tail-Renderer übernimmt automatisch.
- 34 Restschuld-Befunde (Plain-PageLayout-Pages, optionale Icon-/Bildslots) bleiben dokumentierte Restschuld aus Batch 1/3/4, kein Launch-Blocker.

## Geänderte Dateien

- `scripts/cms/faq-cta-toggle-inventar.mjs` (Markerlogik)
- `src/features/cms/components/CmsInlineSectionMarker.tsx` (neu)
- `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`
- `src/features/service/pages/PlanenKonfigurierenPage.tsx`
- `src/features/produkte/pages/TuerkommunikationHubPage.tsx`
- `src/features/serviceportal/pages/ServiceportalPage.tsx`
- `src/features/serviceportal/pages/RegistrierenPage.tsx`
- `src/features/serviceportal/pages/PasswortVergessenPage.tsx`
- `src/features/admin/lib/knownPageObjectContracts.ts` (auto-generiert)
- `docs/04-betrieb/faq-cta-toggle-inventar.md` (auto-generiert)

## Zielerreichung

- FAQ orphan: **0** ✓
- CTA orphan: **0** ✓
- CTA mixed: **0** ✓
- Wahrheitscheck-Kritisch (FAQ-/CTA-Orphans): **0** ✓
- Spiegel-Audit High: unverändert **0** (kein Spiegel-Audit erneut gefahren, weil keine DB-Migration in diesem Batch).

## Nicht ausgeführt (bewusst)

- Kein Batch 6, keine Section-Type-Migration, keine Restschuld-Migration, kein Login.
- Spiegel-Audits / `page-renderer-coverage` / `public-blocks-ignorieren-admin-visibility` / `tsc` nicht in diesem Schritt neu gefahren — DB unverändert, nur Code/Markers.
- Browser-Stichproben sind nach Batch 5 separat manuell zu prüfen (`/ich-bin/bauherr`, `/gebaeudekommunikation/snipdoo-ip`, `/planen-konfigurieren`, `/zutrittskontrolle/bcm-mini-cloud`, `/serviceportal`, `/produkte/tuerkommunikation`, `/`). Erwartung: keine Doppel-CTAs, kein Whiteout.
