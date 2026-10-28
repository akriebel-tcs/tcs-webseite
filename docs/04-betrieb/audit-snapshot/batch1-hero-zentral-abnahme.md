# Batch 1 — Abnahme „Hero zentral gaten"

Stand: 2026-06-04

## 1. Geänderte Dateien

- `src/components/PageLayout.tsx` — neue Prop `hideHero?: boolean` (default `false`). Wenn `true`, wird der gesamte Hero-`<section>`-Block (inkl. Bild) nicht gerendert. Verhalten ohne Prop unverändert.
- `src/features/cms/components/CmsPageLayout.tsx` — neuer zentraler Guard:
  ```
  const hasActiveHeroSection = cms.sections.some(
    (s) => !s.parent_section_key && s.section_key === "hero",
  );
  const hideHero = cms.hasDbContent && !hasActiveHeroSection;
  ```
  und `hideHero={hideHero}` an `PageLayout` durchgereicht.
- `scripts/cms/public-blocks-ignorieren-admin-visibility.mjs` — `hasGate()` erkennt den zentralen Hero-Guard zusätzlich anhand der Imports `CmsPageLayout` / `GenericCmsPage`. Damit fallen Hero-Befunde auf Pages, die über den Wrapper laufen, korrekt aus der Liste.

Inhalte: keine. Texte: keine. Nur Sichtbarkeitsbindung.

## 2. Welche Pages profitieren

- 35 Pages mit direktem `CmsPageLayout`-Import.
- 51 Pages über `GenericCmsPage` (transitiv).
- Summe: 86 Pages. Alle reagieren ab sofort sofort auf das Admin-Aus-Schalten der `hero`-Section: Hero verschwindet komplett, der Rest der Seite bleibt.

`HomePage` ist bereits gegated (über `dbOrder` aus `cms.sections`) — kein Eingriff nötig.

## 3. Vorher/nachher Befundzahlen

| Metrik | vorher | nachher | Δ |
|---|---|---|---|
| Ampel rot (High-Blocker) | 0 | **0** | 0 |
| Ampel gelb (Medium-Kandidat) | 69 | **54** | −15 |
| Ampel gelb (Restschuld ohne DB-Bindung) | 34 | **34** | 0 |
| Ampel grau (vermutlich gegated) | 2 | **2** | 0 |
| Masterliste gesamt | 195 | **180** | −15 |
| Hero-Befunde `section_key=hero` in Klasse A | 23 | **8** | −15 |

Die verbleibenden 8 Hero-Befunde entfallen auf Plain-`PageLayout`-Pages aus den Sonderfällen (siehe Punkt 5).

## 4. Browser-Stichproben

- `/` (Startseite, `home.start`) — Hero rendert weiterhin korrekt (Regression OK, Screenshot im Tool-Verlauf).
- `/eingangssysteme/...` und `/eingangssysteme` antworten mit 404 (Routing-Lücke außerhalb des Batches, nicht durch diese Änderung verursacht — Routen sind im aktuellen `routes.tsx` nicht gemountet).
- Live-Toggle eines `hero`-Datensatzes wurde bewusst nicht durchgeführt, weil:
  - das einen DB-Schreibvorgang via `rpc_admin_*` voraussetzt und die Inhalts-Wahrheit nicht angefasst werden sollte;
  - die Gate-Logik deterministisch ist (RLS filtert inaktive Sections → `cms.sections.some(...)` ⇒ false → `hideHero=true` → `<section>` wird übersprungen);
  - der statische Trace im Code (`PageLayout.tsx` Zeile ~85) eindeutig nachvollziehbar ist.

Empfehlung Abnahme: ein Redakteur kann das Verhalten in der nächsten Pflege-Session über einen testweisen `is_active=false`-Toggle einer beliebigen Page (z. B. `signage.root`) verifizieren und sofort zurücksetzen.

## 5. Sonderfälle / Fallbacks

Plain-`PageLayout`-Pages (14 Stück) sind vom zentralen Guard nicht erfasst — sie sind bewusst kein Sonderfall, sondern offene Restschuld für Batch 2/3:

- Legal: Impressum, Datenschutz, AGB
- Service: `ProductDetailPage`
- Anwendungen: `AnwendungenPage`, `ReferenzprojektDetailPage`, `AnwendungDetailPage`
- Zutrittskontrolle Sub-Pages: Vorhaengeschloss, BcmOnlineLeser, ElektronischeDrueckergarnitur, BcmHandsender, ElektronischerKnaufzylinder, FunkvernetzteOfflineLeser

Pages ohne CMS-Hero-Vertrag (`cms.hasDbContent === false`): Guard greift nicht (Bedingung schließt sie aus), Hero bleibt aus den übergebenen Props sichtbar. Damit kann eine reine Legacy-Seite oder eine Seite ohne `cms_pages`-Eintrag nicht versehentlich leer werden.

## 6. Offene Risiken

- **Race beim ersten Render**: solange `useCmsPageContent` lädt, ist `cms.hasDbContent=false` ⇒ Hero wird gezeigt. Nach Load mit ausgeblendetem Hero schaltet er weg. Effekt: einmaliges, kurzes Aufblitzen bei sehr schnellen Verbindungen. Akzeptiert (analog zu allen anderen DB-first-Komponenten der Site).
- **Audit ist eine Heuristik**: das Skript erkennt den zentralen Guard jetzt anhand des Imports von `CmsPageLayout`/`GenericCmsPage`. Wenn jemand die Hero-Section in einer neuen Page-Datei künstlich nochmals hartkodiert, würde das vom Audit übersehen. Mitigation: bestehende Regel „neue Pages immer mit `GenericCmsPage`/`CmsPageLayout`" — siehe `docs/01-strategie/templates.md`.
- **Plain-`PageLayout`-Pages bleiben ungegated**: das ist die bewusste, dokumentierte Restschuld für Batch 2/3.

## Status

- Batch 1 abgeschlossen.
- Nächster geplanter Schritt: Batch 2 (Codemod Anwendungen) oder Batch 3 (Codemod Eingangssysteme) — laut D3a-Plan. **Hier nicht gestartet.**
