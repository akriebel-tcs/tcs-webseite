# Sprint-Bericht: `card_v1` E2E scharf (Phase 1b)

**Datum:** 2026-06-03
**Scope:** ausschließlich `card_v1`. Phase-1b-Ziel: bestehender Runtime-
Vertrag wird nicht nur berechnet, sondern in einem echten headless
Browser gegen die Published-Site verifiziert.

## Was gemacht wurde

### 1. Single Source of Truth (Matrix-Doppelpflege weg)

- **Neu:** `src/features/cms/contract/runtime/card_v1.matrix.json`
  hält die Container-Matrix (`cards_v1.grid`, `cards_v1.scroller`,
  `product_scroller_v1`, `card_grid_v1`, `catalog_filter_grid_v1`,
  `feature_grid_v1`, `download_list_v1`, `unknown`) und die Version
  (`1.0.0`).
- **`src/features/cms/lib/cardRuntimeMatrix.ts`** importiert diese
  JSON-Datei statt eigene Konstanten zu pflegen. Admin, Resolver und
  Renderer ziehen automatisch nach.
- **`scripts/cms/e2e-vertrag.mjs`** liest dieselbe JSON-Datei direkt
  (kein TS-Build nötig). Wer die Matrix ändert, ändert genau eine
  Datei — Drift unmöglich.

### 2. Playwright (headless Chromium) statt rohem `fetch`

- `chromium.launch` mit Fallback auf System-Chromium
  (`/bin/chromium` bzw. `PLAYWRIGHT_CHROMIUM_PATH`), damit kein
  zusätzlicher Bibliotheks-Download nötig ist.
- Pro Route: `goto(waitUntil: networkidle)` + Polling-Wartezeit bis
  Hydration sichtbar (> 2000 Zeichen `innerText`) + vollständiges
  Down-Scrolling (löst IntersectionObserver-/lazy-Renderer).
- DOM-Inhalt + alle `<a>`-Elemente werden eingesammelt und gegen
  den Vertrag geprüft.

### 3. Vertragsprüfung pro Karte

Für jedes Karten-Feld prüft das Skript:

| Vertrags-Status | Erwartung im DOM                                       | Verstoß = exit 1 |
| --------------- | ------------------------------------------------------ | ---------------- |
| `active`        | Text muss im sichtbaren DOM erscheinen                 | ja               |
| `active` (link) | zusätzlich als `<a href>` klickbar                     | ja               |
| `incomplete`    | Label DARF NICHT als klickbarer `<a href>` erscheinen  | ja               |
| `unsupported` / `disabled` | Text DARF NICHT im DOM auftauchen (ab 16 Zeichen) | ja  |
| `empty`         | nicht geprüft                                          | —                |

### 4. Pflichtkarten (Phase 1b, fest verdrahtet)

| Short-ID | Container             | Zweck                                         |
| -------- | --------------------- | --------------------------------------------- |
| B-538    | `product_scroller_v1` | Bullets/Chips + incomplete-Link (Pilot)       |
| B-583    | `cards_v1.scroller`   | Bildkarte im Standard-Raster                  |
| B-1177   | `card_grid_v1`        | Thumbnailkarte mit Links                      |
| B-2002   | `feature_grid_v1`     | Iconkarte                                     |

Erweitern: in `PFLICHTKARTEN` in `scripts/cms/e2e-vertrag.mjs` eintragen.

## Ergebnis des ersten Laufs (gegen Published-URL)

```
✗ FEHLER  B-538   gebaeudekommunikation.tuersprechanlagen/card_pak  (product_scroller_v1)
   active:     eyebrow, title, description, bullets.0, chips.0, image
   incomplete: link_1, link_2, link_3
   • active-Feld nicht im Public-DOM gefunden: "Test"   (bullets.0)
   • active-Feld nicht im Public-DOM gefunden: "Test"   (chips.0)
✓ OK      B-2002  vorteile__barrierefrei  (feature_grid_v1)
✓ OK      B-583   card_drueckergarnitur   (cards_v1.scroller)
✓ OK      B-1177  cards.tuerkommunikation (card_grid_v1)

Summary: total=4 ok=3 failed=1  → exit 1
```

**Befund:** Der Vertrag sagt für B-538 `bullets.0 = active` und
`chips.0 = active`. Im echten DOM der Published-Site fehlen beide
Werte (`Test` taucht nicht auf). Sektion `ProductScrollerV1` rendert
die Felder im Source-Code, aber die Published-Site spielt sie nicht
aus. Mögliche Ursachen:

1. **Deployment-Lag** — der jüngste Sprint „Runtime-Parität" wurde
   noch nicht publiziert; Quellcode und Live-Stand sind nicht synchron.
2. **Conditional-Branch** im Renderer schluckt die Felder unter
   Bedingungen, die im Live-Build greifen.

Phase 1b liefert exakt diese Erkenntnis. Folgesprint (außerhalb dieses
Scopes) entscheidet: redeployen oder Renderer nachbessern.

## Was bewusst NICHT gemacht wurde

- Kein Service-Role-Key, kein schreibender E2E-Test.
- Keine Renderer-Korrektur (B-538 bullets/chips). Phase 1b dokumentiert
  und meldet den Bruch — die Fix-Entscheidung gehört in einen
  Folgesprint.
- Kein Eingriff in Hero/Teaser/CTA/FAQ/Content.
- Keine Migration, keine Inhaltsänderung.

## Dateien

- neu: `src/features/cms/contract/runtime/card_v1.matrix.json`
- geändert: `src/features/cms/lib/cardRuntimeMatrix.ts` (importiert JSON)
- ersetzt: `scripts/cms/e2e-vertrag.mjs` (Playwright + JSON-Vertrag + 4 Pflichtkarten)
- neu: `docs/04-betrieb/sprint-card-v1-e2e-scharf-phase1b-bericht.md`
- geändert: `docs/04-betrieb/runtime-vertrag-card-v1.md`
- geändert: `docs/current-status.md`

## Nächste Schritte (Vorschläge, nicht Teil dieses Sprints)

- **B-538 reparieren:** Quelle des Bullets/Chips-Renderings auf
  Published-Site klären. Entweder Redeploy auslösen oder konkreten
  Code-Bug in `ProductScrollerV1` fixen — dann E2E muss grün werden.
- **Phase 2:** Verträge für `hero_v1`, `teaser_2col_v1`, `cta_v1`,
  `faq_v1`, `content_v1` — je eigener Sprint, gleicher Bauplan.
- **CI-Gate:** `node scripts/cms/e2e-vertrag.mjs` zur Pipeline
  hinzufügen, sobald B-538 grün ist.
