## Ziel

Die zentrale Raster-Regel (`src/features/cms/lib/cardGrid.ts`) greift bisher nur in den CMS-Renderern (`CardsSectionV1`, `CmsProductSolutionShell`). Custom-Pages haben weiterhin hartcodierte `grid md:grid-cols-2 lg:grid-cols-3` / `lg:grid-cols-4`-Klassen und erzeugen damit Orphan-Reihen wie B-079 (3 + 1 statt 2 + 2). Dieser Batch zieht den Helper flächendeckend ein.

## Scope: was wird konvertiert

Nur Container, die **inhaltliche Karten** rendern. Pattern:
- `benefits` / `vorteile` / „Highlights" → Family `benefits` (max 3 pro Reihe)
- `usecases` / `anwendungen` / „Einsatzbereiche" / „Lieferumfang" / „Module" → Family `default` (max 4)
- Sonst Family `default`

**Konvertieren (28 Stellen in 24 Dateien):**

Zutrittskontrolle-Produktseiten (gleiches Muster, jeweils 2 Container — Highlights + Lieferumfang):
- `VorhaengeschlossPage`, `FunkvernetzteOfflineLeserPage`, `ElektronischerKnaufzylinderPage`, `ElektronischeDrueckergarniturPage`, `BcmHandsenderPage`, `BcmOnlineLeserPage`

Übrige Custom-Pages:
- `gebaeudekommunikation/TuersprechanlagenPage` (anwendungsumfelder)
- `gebaeudekommunikation/SystemloesungenPage` (vorteile)
- `gebaeudekommunikation/SnipdooIpPage`
- `wissen/AkademiePage`
- `anwendungen/AnwendungDetailPage` (3 Container: Benefits, Use-Cases, Module)
- `anwendungen/ReferenzprojektePage`, `OeffentlicheHandPage`, `BildungseinrichtungenPage`, `ReferenzprojektDetailPage`
- `karriere/KarrierePage`
- `eingangssysteme/EntrySystemPage`, `EntryMaterialPage`
- `serviceportal/ServiceportalPage` (2 Container)
- `service/TechnischerSupportPage`, `PlanenKonfigurierenPage` (4), `DownloadsPage` (2), `ErsatzteilePage` (2), `ServicePage`
- `components/PersonaSection`
- `cms/components/sections/FeatureGridV1` (zentraler Renderer, wird konsistent mit Family `default`)

**Bewusst NICHT konvertiert (kein Karten-Raster):**
- `StatsSection`, `personas/*Content.tsx` Statistik-Blöcke (`grid-cols-2 lg:grid-cols-4 gap-8`) — Kennzahlen-Layout, immer 4 Items, kein Karten-Sinn
- `service/catalog/*` + `produkte/CategoryListPage`, `produkte/TuerkommunikationHubPage` — Produktkatalog (Spiegel-Regel-Schutz: Produkt-DB bleibt unangetastet)
- `admin/*` (`AssetUploader`, `AssetWorkbench`, `PageEditor`) — Admin-Tooling

## Konvertierungsmuster

Aus:
```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <div key={...} className="border p-6">…</div>
  ))}
</div>
```

Wird:
```tsx
<div className={cardGridClass("benefits", "")}>
  {items.map((item, i) => (
    <div
      key={...}
      className={`${cardGridItemClass("benefits", items.length, i)} border p-6`}
    >…</div>
  ))}
</div>
```

Wenn die Item-Liste inline (nicht in einer Variablen) gemappt wird, vorher in eine `const items = [...]` extrahieren, damit `items.length` verfügbar ist.

## Nicht-Ziele

- Keine DB-Änderung, keine Migration, keine RPC, keine Whitelist.
- Keine Inhalts-, Text- oder Bild-Änderung.
- Keine Renderer-Refaktor jenseits des Grid-Tausches.
- Kein Login, kein Auth.
- Produkt-DB / Produktkatalog bleiben unberührt.

## Abnahme

1. `npm run test -- cardGrid` grün (bestehende 27 Cases).
2. `tsc` grün (Harness).
3. Stichprobe Public:
   - B-079 `zutrittskontrolle.fahrstuhlsteuerung` → 2 + 2 ✓ (bereits gefixt)
   - Eine Zutrittskontrolle-Produktseite mit 4 Highlights → 2 + 2 oder 4er
   - Eine Seite mit 5 Items → 3 + 2
   - Eine Seite mit 7 Items → 4 + 3
4. Bericht `docs/04-betrieb/audit-snapshot/batch7b-raster-regel-global.md` mit Vorher/Nachher-Liste pro Datei.

## Reihenfolge

1. Welle A: 6 Zutrittskontrolle-Produktseiten (identisches Muster, geringes Risiko)
2. Welle B: Service-Bereich (5 Dateien, 9 Container)
3. Welle C: Anwendungen + Personas + Karriere + Wissen
4. Welle D: Gebäudekommunikation + Serviceportal + Eingangssysteme + `FeatureGridV1` + `PersonaSection`
5. Bericht + Stopp

Pro Welle: nach der letzten Datei kurz Tests laufen lassen, dann nächste Welle.