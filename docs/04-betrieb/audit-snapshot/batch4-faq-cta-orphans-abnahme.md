# Batch 4 — FAQ-/CTA-Orphans zentral abgebaut (Abnahme)

Stand: 2026-06-04 · Abschluss Batch 4 vor Stopp.

## 1. Vorher / nachher (Quelle: `faq-cta-toggle-inventar.mjs`, live DB)

| Block | OK vorher | OK nachher | ORPHAN vorher | ORPHAN nachher | MIXED |
|-------|----------:|-----------:|--------------:|---------------:|------:|
| FAQ   | 28 | **77** | 52 | **3** | 0 |
| CTA   | 50 | **85** | 58 | **23** | 1 (home.start, unverändert) |

- FAQ-Orphans: **−49** (von 52 auf 3, **−94 %**).
- CTA-Orphans: **−35** (von 58 auf 23, **−60 %**).
- Masterliste: unverändert 140 (Wahrheitscheck-Kritisch sinkt entsprechend
  um ~84 Objektzeilen, sobald die Admin-UI das nächste Mal die
  `KNOWN_PAGE_OBJECT_CONTRACTS` neu liest).

## 2. Eingesetztes Pattern (zentral, kein Page-für-Page-Fix)

Neuer Render-Pass-lokaler Registry-Kontext + zwei Tail-Renderer in
`PageLayout`. Dedup über React-Render-Reihenfolge (JSX top-down):

```
src/features/cms/components/CmsRenderRegistry.tsx   (neu)
  └─ CmsRenderRegistryProvider + useMarkRendered + useRenderedSections
src/features/cms/components/CmsTailFaq.tsx          (neu)
  └─ rendert aktive faq_v1-Sections, die nicht bereits inline markiert sind
src/features/cms/components/CmsTailCta.tsx          (Dedup ergänzt)
  └─ skippt, wenn cta_v1-Section bereits inline markiert wurde
src/features/cms/components/sections/FaqV1.tsx      (self-mark)
src/features/cms/components/sections/CtaV1.tsx      (self-mark)
src/components/PageLayout.tsx                       (Provider + Tail-FAQ + Tail-CTA)
```

Mechanik (ein Render-Pass):
1. `PageLayout` öffnet `CmsRenderRegistryProvider` (frische Set pro Pass).
2. Page-Body (Children) rendert — inline genutzte `FaqV1`/`CtaV1`/`CmsBodyRenderer`
   markieren ihre `section_key` in der Registry.
3. Am Seitenende rendert PageLayout `CmsTailFaq` und `CmsTailCta`; beide
   überspringen Section-Keys, die bereits markiert sind.

Damit greift der Admin-Schalter automatisch auf jeder Seite mit `pageKey`,
ohne Page-für-Page-Eingriff und ohne Doppel-Render.

## 3. Geänderte Dateien

Code:
- `src/components/PageLayout.tsx`
- `src/features/cms/components/CmsRenderRegistry.tsx` (neu)
- `src/features/cms/components/CmsTailFaq.tsx` (neu)
- `src/features/cms/components/CmsTailCta.tsx`
- `src/features/cms/components/sections/FaqV1.tsx`
- `src/features/cms/components/sections/CtaV1.tsx`

Audit-Tooling:
- `scripts/cms/faq-cta-toggle-inventar.mjs`
  - neuer Marker `cmsTailFaq`
  - `cmsPageLayoutMarkers` direkt aus Pfad lesen (alte Heuristik verfehlte
    `const CmsPageLayout = …; export default CmsPageLayout`)
  - transitive Vererbung PageLayout → CmsPageLayout für `cmsTailCta` und
    `cmsTailFaq`
  - dynamic-slug-Templates erhalten Tail-Marker

Auto-generiert (vom Skript überschrieben):
- `docs/04-betrieb/faq-cta-toggle-inventar.md`
- `src/features/admin/lib/knownPageObjectContracts.ts`

Weitere Audit-Snapshots neu erzeugt:
- `docs/04-betrieb/audit-snapshot/page-renderer-coverage.{md,json}`
- `docs/04-betrieb/audit-snapshot/public-blocks-ignorieren-admin-visibility.{md,json}`
- `docs/04-betrieb/audit-snapshot/eine-wahrheit-offene-befunde-masterliste.{md,json}`

## 4. Welche Pages profitieren

Alle Pages, die FAQ oder CTA über das CMS pflegen UND `PageLayout`
direkt oder via `CmsPageLayout` / `GenericCmsPage` einbinden.
Insgesamt **49 FAQ-Pages** und **35 CTA-Pages** wurden allein durch den
Zentral-Fix von Orphan auf OK gehoben — darunter:

- alle `anwendungen.referenzprojekte.*` (12 Detail-Seiten)
- alle generischen Detail-Seiten in `gebaeudekommunikation`,
  `gebaeudemanagement`, `zutrittskontrolle`, `eingangssysteme`,
  `anwendungen` (ohne eigenes Layout, `<GenericCmsPage>`-basiert)

## 5. Browser-Stichproben

Stichprobenartig im Preview verifiziert (Konsole sauber, kein Doppel-Render):

| Seite | Layout | FAQ-Block | CTA-Block | Befund |
|-------|--------|-----------|-----------|--------|
| `/anwendungen/wohnbau` | GenericCmsPage | — | standard_cta | CTA erscheint 1x am Ende ✓ |
| `/anwendungen/referenzprojekte/campus-westend` | ReferenzprojektDetailPage | faq | standard_cta | beide 1x ✓ |
| `/zutrittskontrolle/biometrie` | GenericCmsPage | faq | standard_cta | beide 1x ✓ |
| `/gebaeudekommunikation/briefkastenanlagen` | GenericCmsPage | faq | standard_cta | beide 1x ✓ |
| `/eingangssysteme/material` | EntryMaterialPage (FaqV1 inline) | faq | standard_cta | FAQ nicht doppelt — Dedup greift ✓ |

Admin-Toggle-Probe: `faq` auf einer Stichprobenseite kurz auf `is_active=false`
gesetzt → öffentliche Seite zeigt FAQ nicht mehr (RLS filtert Section aus
`cms.sections` → CmsTailFaq findet keinen Kandidaten). Zustand zurückgesetzt.

## 6. Seiten bewusst nicht angefasst

23 verbliebene CTA-Orphans + 3 FAQ-Orphans haben **kein PageLayout** im
Renderpfad, sondern eigene Speziallayouts (Formular, Auth, Hub-Spezial,
Persona-Cards). Sie sind für Batch 5 vorgesehen:

FAQ-Orphans (3):
- `gebaeudekommunikation.snipdoo-ip` (Speziallayout SnipdooIpPage)
- `personas.bauherr` (Persona-Spezial)
- `service.planen-konfigurieren` (Konfigurator-Spezial)

CTA-Orphans (23 — Cluster):
- alle 6 Personas (`personas.*`) — Persona-Layout ohne PageLayout
- 3 Serviceportal-Seiten (Login / Passwort / Registrieren) — Auth-Layout
- `gebaeudemanagement.bcm-buchungssystem`, `…bcm-infoboard` — eigene Layouts
- 9× `zutrittskontrolle.*` Spezial-Produktseiten (BCM-Door-App,
  Schrankschloss, GSM-Gateway, …)
- `produkte.tuerkommunikation` (Katalog-Hub)
- `service.planen-konfigurieren`, `gebaeudekommunikation.snipdoo-ip`

MIXED unverändert: `home.start` (bewusster Sonderfall, Legacy-CTASection
+ DB-CTA — wurde in vorigen Batches dokumentiert).

## 7. Risiken / Sonderfälle

- **Provider-Kontext nur unter `PageLayout`**: Pages, die `PageLayout`
  nicht einbinden (siehe Punkt 6), bekommen weder Tail-Render noch Dedup.
  Verhalten unverändert — keine Regression.
- **Set-Reset über In-place-`clear()`** im Provider statt neuer Identität:
  spart Re-Renders der Consumer, ist render-pass-stabil, da React JSX
  synchron top-down auswertet.
- **Mehrere aktive `faq_v1` pro Seite**: `CmsTailFaq` rendert alle nicht
  bereits inline markierten — sortiert nach `cms.sections`-Reihenfolge
  (= `sort_order` aus DB).
- **`standard_cta`-Konvention**: `CmsTailCta` bevorzugt weiterhin
  `standard_cta`, fällt auf `cta` zurück. Keine Verhaltensänderung.

## 8. Empfehlung Batch 5

Sonderseiten ohne `PageLayout` nachziehen, in dieser Reihenfolge:

1. **Personas-Cluster** (6 Seiten) — ein gemeinsames Persona-Layout, das
   `CmsRenderRegistryProvider` + Tail-Renderer einbettet → erschlägt alle 6
   in einem Schritt.
2. **Serviceportal** (3 Auth-Seiten) — minimaler Tail-CTA-Einbau in das
   Auth-Layout.
3. **Spezial-Produktseiten** (`zutrittskontrolle.*` Cluster, 9 Seiten) —
   prüfen, ob `<CmsTailCta pageKey>` punktuell ergänzt werden kann,
   ohne das Speziallayout zu brechen.
4. **Konfigurator-/Hub-Seiten** (`produkte.tuerkommunikation`,
   `service.planen-konfigurieren`, `snipdoo-ip`) — Einzelfallprüfung.

Nach Batch 5 sollte der Wahrheitscheck-Kritisch-Wert nahe Null sein.

---

Stopp nach Batch 4 wie beauftragt. Kein Batch 5 begonnen.
