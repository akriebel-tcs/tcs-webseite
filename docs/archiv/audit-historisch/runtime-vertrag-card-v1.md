# Runtime-Vertrag `card_v1`

**Phase 1 (2026-06-03)** — Eine Wahrheit für Karten.

## Zweck

`card_v1` ist der dominante Baustein im CMS-Light. Bis Phase 0 lief
seine Wahrheit auseinander: Admin pflegte Felder, DB hatte Werte,
Public-Renderer rendert sie aber je nach Container unterschiedlich
(z. B. B-538: `bullets.0` und `chips.0` gepflegt, im
`product_scroller_v1` aber bis dahin nicht ausgespielt; Links zeigten
falsche Zählungen).

**Lösung:** Eine zentrale Vertragsdatei, die Admin, Renderer und
Audit-Skript gemeinsam lesen. Wer Karten anfasst, ändert NUR dort —
und alles andere zieht automatisch nach.

## Die eine Datei

`src/features/cms/contract/runtime/card_v1.matrix.json` (Container-Matrix, Single Source of Truth)
`src/features/cms/contract/runtime/card_v1.ts` (TypeScript-Einstieg, re-exportiert Resolver)

Die JSON-Datei wird gelesen von:
- `src/features/cms/lib/cardRuntimeMatrix.ts` (Admin + Renderer)
- `scripts/cms/e2e-vertrag.mjs` (E2E-Audit, Phase 1b scharf)

Wer ein Container-Layout ergänzt oder die Modul-Unterstützung ändert,
ändert NUR die JSON. Alles andere zieht automatisch nach.

Der TS-Vertrag exportiert zusätzlich:
- **`resolveCardRuntime(input)`** — Status pro Feld:
  `empty | unsupported | disabled | incomplete | active`.
- **`CARD_V1_FIELD_INVENTORY`** — statische Feldliste für Audits.
- **`CARD_V1_CONTRACT_VERSION`** — Versionsmarker (aktuell `1.0.0`).

Die echte Resolver-Logik liegt weiterhin in
`src/features/cms/lib/cardVisibility.ts`.

## Phase 1b: E2E scharf (Playwright)

`scripts/cms/e2e-vertrag.mjs` lädt jede Pflichtkarte-Route in einem
echten headless Chromium, wartet auf Hydration, scrollt durch die
Seite und prüft pro Feld:
- `active` → Text MUSS im DOM erscheinen (Links zusätzlich als `<a href>`)
- `incomplete` Link → Label DARF NICHT klickbar erscheinen
- `unsupported`/`disabled` → Text DARF NICHT erscheinen

Bei Verstoß: exit 1. Bericht: `scripts/cms/output/e2e-vertrag-latest.json`.

Pflichtkarten (Phase 1b): B-538, B-583, B-1177, B-2002 — Details im
Sprint-Bericht `sprint-card-v1-e2e-scharf-phase1b-bericht.md`.

## Konsumenten (eine Quelle)

| Konsument                            | Importiert aus Vertrag                           |
| ------------------------------------ | ------------------------------------------------ |
| `BildkartenCardWorkspace` (Admin)    | `resolveCardRuntime`, `CONTAINER_MATRIX`         |
| `CardsSectionV1` (Public)            | `resolveCardVisibility`                          |
| `ProductScrollerV1` (Public)         | `resolveCardVisibility`                          |
| `FeatureGridV1` (Public)             | `resolveCardVisibility`                          |
| `CmsProductSolutionShell` (Public)   | `resolveCardVisibility`                          |
| `scripts/cms/e2e-vertrag.mjs`        | spiegelt Container-Tabelle 1:1 (read-only)       |

## E2E-Read-Only-Beweis

`scripts/cms/e2e-vertrag.mjs` (Node, read-only) prüft pro Pflichtkarte:

1. **Vertrag berechnen** — Feldstatus je Karte aus DB + Container-Matrix.
2. **DB lesen** — `cms_section_fields`, `cms_assets`, `cms_sections`
   (Parent-Container).
3. **Public-HTML ziehen** — Preview-Route per `fetch`.
4. **Abgleichen** — jedes Feld mit `status=active` muss als Text im
   HTML auftauchen. Fehlt es → Verstoß.

**SPA-Ehrlichkeit:** Lovable rendert Inhalte clientseitig. Wenn das
rohe HTML nur die SPA-Shell enthält, meldet das Skript klar
`skipped` mit Hinweis statt fälschlich rot. Vertragsstatus wird
trotzdem berechnet und ausgegeben — das ist der wertvolle Teil.

Bericht: `scripts/cms/output/e2e-vertrag-latest.json`

### Pflichtkarte B-538

`page=gebaeudekommunikation.tuersprechanlagen`,
`section=card_pak`, Container `product_scroller_v1` „aussenstationen".

Aktueller Vertragsstatus (Stand Phase 1):

- `eyebrow` · `title` · `description` · `bullets.0` · `chips.0` ·
  `image` → **active**
- `link_1` · `link_2` · `link_3` → **incomplete** (Label gepflegt,
  `href` leer)

Damit ist die Beobachtung aus Phase 0 reproduziert: Admin sieht
„Links 0 von 3 aktiv" als richtig (alle drei sind incomplete, nicht
active), `bullets.0`/`chips.0` werden im Public-Renderer
ausgespielt (Sprint „Runtime-Parität").

## Erweitern

**Neues Feld in `card_v1`:**

1. Feld in DB + Whitelist anlegen (Migration).
2. `CARD_V1_FIELD_INVENTORY` in `card_v1.ts` ergänzen.
3. `CONTAINER_MATRIX` updaten (welche Container rendern das Feld?).
4. Resolver in `cardVisibility.ts` um Statuslogik erweitern.
5. Renderer ergänzen.
6. `e2e-vertrag.mjs` spiegelt Matrix-Änderung — Lauf prüfen.

**Neuer Container:**

1. `EffectiveContainerKind` erweitern.
2. Eintrag in `CONTAINER_MATRIX`.
3. `e2e-vertrag.mjs` Container-Support spiegeln.
4. Renderer + Admin verhalten sich automatisch korrekt.

**Pflichtkarte ergänzen (E2E):** in `PFLICHTKARTEN` in
`e2e-vertrag.mjs` eintragen — `{ shortId, pageKey, sectionKey, routePath }`.

## Was Phase 1 NICHT macht

- Kein schreibender E2E-Test (Service-Role-Key bleibt draußen).
- Keine Vertragsdateien für `hero_v1`, `teaser_2col_v1`, `cta_v1`,
  `faq_v1`, `content_v1` — eigene Folgesprints.
- Keine Inhalte verändert. Keine Migrationen. Reine Code-Strukturarbeit
  plus read-only Audit-Skript.

## Status

- Vertragsdatei lebt unter `src/features/cms/contract/runtime/`.
- Resolver + Matrix unverändert in Funktion, jetzt nur noch über den
  Vertrag konsumiert.
- E2E-Skript meldet B-538 mit korrektem Vertragsbild.
- Public-HTML-Verifikation aktuell `skipped` (SPA-Shell) — wird in
  Folgesprint mit Preview-Render (z. B. headless oder Build-HTML)
  scharf geschaltet.
