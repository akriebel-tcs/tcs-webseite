# Batch 7b — Raster-Regel global einziehen (Zwischenstand)

Stand: 2026-06-04
Auslöser: B-079 (`zutrittskontrolle.fahrstuhlsteuerung → benefits`, 4 Karten)
rendert auf Desktop als „3 + 1" statt „2 + 2", weil die zentrale
Raster-Regel (`src/features/cms/lib/cardGrid.ts`) nur in den
CMS-Renderern, nicht in den Custom-Pages greift.

## Welle A — Zutrittskontrolle-Produktseiten ✓

Pro Datei: 2 Container (Vorteile + Lieferumfang/Anwendungen) umgestellt
auf `cardGridClass` + `cardGridItemClass`.

- `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` (1 Container, bereits in vorigem Turn)
- `src/features/zutrittskontrolle/pages/VorhaengeschlossPage.tsx`
- `src/features/zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx`
- `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx`
- `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx`
- `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx`
- `src/features/zutrittskontrolle/pages/BcmOnlineLeserPage.tsx`

Verifikation: `rg "lg:grid-cols-[34]" src/features/zutrittskontrolle` →
keine Treffer mehr.

## Welle B — Service-Bereich ✓

- `src/features/service/pages/ServicePage.tsx` (Hub-Sections, `useCases`)
- `src/features/service/pages/TechnischerSupportPage.tsx` (Channels, `useCases`, conditional `<a>/<Link>/<div>`-Wrapper bekommen `itemCls`)
- `src/features/service/pages/DownloadsPage.tsx` (Quick-Links + Akademie)
- `src/features/service/pages/ErsatzteilePage.tsx` (Ersatzteile + Vorteile)
- `src/features/service/pages/PlanenKonfigurierenPage.tsx` (HOAI, Planungsdaten, Konfiguratoren, Shops — 4 Container)

Bewusst ausgenommen laut Plan (Produktkatalog/Spiegel-Regel-Schutz):
`service/catalog/CatalogProductGrid.tsx`, `CatalogMvp.tsx`, `CatalogFilters.tsx`.

## Noch offen — Welle C + D

Welle C (Anwendungen + Personas + Karriere + Wissen):
- `anwendungen/components/AnwendungDetailPage.tsx` (3 Container)
- `anwendungen/pages/ReferenzprojektePage.tsx`, `OeffentlicheHandPage.tsx`, `BildungseinrichtungenPage.tsx`, `ReferenzprojektDetailPage.tsx`
- `karriere/pages/KarrierePage.tsx`
- `wissen/pages/AkademiePage.tsx`

Welle D (Gebäudekommunikation + Serviceportal + Eingangssysteme + zentrale Renderer):
- `gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`, `SystemloesungenPage.tsx`, `SnipdooIpPage.tsx`
- `serviceportal/pages/ServiceportalPage.tsx` (2 Container)
- `eingangssysteme/pages/EntrySystemPage.tsx`, `EntryMaterialPage.tsx`
- `components/PersonaSection.tsx`
- `cms/components/sections/FeatureGridV1.tsx`

## Stopp-Grund

Time-Warning der Harness. Welle A + B sind in sich abgeschlossen und
verifiziert; Welle C + D sind nicht angefangen und sollten in einem
eigenen Turn folgen.

## Abnahme bisher

- B-079 (4 Benefits) → `[2, 2]` statt „3 + 1" ✓ (Welle 0)
- Welle A: 6 Produktseiten × 2 Container (max 4 Highlights → `[4]` oder
  `[2, 2]`; max 6 Lieferumfang → `[3, 3]`) ✓
- Welle B: 9 Container umgestellt, build-blockierender TS-Fehler
  (`detail` versehentlich entfernt) sofort gefixt.
- Bestehende Tests `src/features/cms/lib/__tests__/cardGrid.test.ts`
  (27 Cases) unverändert grün.

## Nicht verändert

- Keine DB / Migration / RPC / Whitelist / i18n.
- Keine Inhalts-, Text- oder Bild-Änderung.
- Keine Renderer-Refaktor jenseits des Grid-Tausches.
- Produktkatalog (`service/catalog/*`, `produkte/*`) unangetastet.
- Login bleibt out of scope.
