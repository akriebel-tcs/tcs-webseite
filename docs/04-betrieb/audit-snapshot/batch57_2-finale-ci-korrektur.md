# Batch 57.2 — Finale CI-Korrektur (Offline-/Integrationstrennung + Card-Parität)

Stand: 2026-06-18
Scope: ausschließlich die in Batch 57.1 verbliebenen zwei CI-Widersprüche.
Kein neuer CMS-Ausbau, keine Phase 2, keine Inhaltsmigration.

## 1. Offline- vs. Integrationstests sauber getrennt

### Befund vor Batch 57.2
- `src/features/admin/api/__tests__/rpc_admin_update_section_field.test.ts`
  griff auf die Live-Lovable-Cloud zu und lief im normalen
  `npx vitest run` mit. Ohne Netz/DB scheiterte derselbe Lauf mit
  `fetch failed` — der „offline reproduzierbare" Unit-Lauf war es nicht.

### Änderungen
- Datei umbenannt:
  `rpc_admin_update_section_field.test.ts`
  → `rpc_admin_update_section_field.int.test.ts`
  (Konvention: `*.int.test.{ts,tsx}` = DB-/Netz-Integrationstest).
- `vitest.config.ts` schaltet über `VITEST_INTEGRATION`:
  - Default: `include` = alle Unit-/Komponententests,
    `exclude` enthält `**/*.int.test.{ts,tsx}`.
  - `VITEST_INTEGRATION=1`: `include` = `src/**/*.int.test.{ts,tsx}`.
- Neue NPM-Scripts in `package.json`:
  - `test:unit` → `vitest run` (offline)
  - `test:integration` → `VITEST_INTEGRATION=1 vitest run`
  - `test` bleibt Alias auf den Offline-Lauf.
- GitHub-Workflow `.github/workflows/cms-audit.yml`:
  - Schritt „Unit-Tests (offline, ohne DB)" ruft jetzt `npm run test:unit`.
  - Neuer Schritt „DB-Integrationstests (Vitest, VITEST_INTEGRATION=1)"
    läuft VERPFLICHTEND, wenn `vars.CMS_DB_AVAILABLE == 'true'`.
  - Bestehende `supabase/tests/*.sql`-psql-Smoketests (mit ROLLBACK)
    bleiben unverändert.

### Akzeptanz
- Frischer Lauf ohne DB: `npm run test:unit` → **8 Dateien / 107 Tests grün**
  (Integrationsdatei korrekt ausgeschlossen — vorher 9/111).
- Mit DB-Zugang: `npm run test:integration` läuft die 4 RPC-Tests
  + die `supabase/tests/*.sql`-Smoketests. Stilles Überspringen unter
  `CMS_DB_AVAILABLE=true` ist nicht mehr möglich.

## 2. Card-Renderer-Paritätsgate — Heuristik fachlich präzisiert

### Befund vor Batch 57.2 (6 Verstöße, alle Fehlalarme)
- `V2_UNGUARDED_ICON_RENDER` × 2 in
  `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`
  (Zeilen 199, 269).
- `R5_LEGACY_CARD_FIELD_DIRECT` × 4 in
  `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx` (52, 54)
  und `…/InterneKommunikationPage.tsx` (54, 56).

### Fachliche Einordnung der 6 Treffer

A. Broschüren-Links (4×): Die `BroschureLink(cms, sectionKey, loc)`-Helper
lesen `cta_label`/`cta_href` aus Sections vom Typ **`cta_v1`**
(`broschure_intern`, dynamisch aus `block.brochure`). Das sind keine
`card_v1`-Kinder. Das Gate hat hier den `card_v1`-Vertrag fälschlich
auf einen `cta_v1`-Helfer angewendet. Kein realer Vertragsbruch.

B. Snipdoo-Icons (2×): `audiences.map(({ key, Icon }) => …)` und
`moduleKeys.map(({ key, Icon }) => …)` iterieren über **hartcodierte
Lucide-Icon-Arrays** im Code, nicht über `card_v1`-Kinder aus der DB.
Die betroffenen Sections (`audiences`, `systemaufbau.moduleKeys`) sind
reine Layout-Module ohne `card_v1`-Kindervertrag und ohne
`icon_enabled`-Whitelist. `resolveCardVisibility` / `resolveCardIcon`
sind hier fachlich nicht zuständig. Kein realer Vertragsbruch.

### Änderung am Gate (keine pauschale Datei-Ausnahme)
Neue Hilfsfunktion `hasCardV1IterationContext(lines, idx)` in
`scripts/cms/card-renderer-paritaet.mjs`:

- scannt ±40 Zeilen um den Treffer,
- entfernt vorher Kommentar-/JSDoc-Zeilen (damit Header-Kommentare wie
  „(cards_v1 + card_v1-Kinder)" NICHT mehr als Kontextbeweis zählen),
- akzeptiert nur echte Iterationsmarker im Code:
  - `section_type === "card_v1"`
  - `listChildItems(... , "card_v1")`
  - `parent_section_type === "card_v1" | "cards_v1"`
  - `parentSectionType: "cards_v1"`
  - `section_key === "card_v1"`

`V2_UNGUARDED_ICON_RENDER` und `R5_LEGACY_CARD_FIELD_DIRECT` flaggen
einen Treffer nur noch, wenn dieser Kontext nachweisbar vorliegt. Die
Heuristik wurde NICHT entschärft — fehlende Toggle-Guards in echten
`card_v1`-Karten brechen das Gate weiterhin hart. Es wurde ausschließlich
der Geltungsbereich auf den `card_v1`-Vertrag eingegrenzt.

### Akzeptanz
- `node scripts/cms/card-renderer-paritaet.mjs` → **Exit 0, GRÜN**.
- Keine pauschale Dateiausnahme für `SnipdooIpPage`,
  `BildungseinrichtungenPage` oder `InterneKommunikationPage`.
- Echte `card_v1`-Iterationen (Persona-Karten, Lösungs-Hubs,
  Standardrenderer) sind weiterhin durch das Gate geschützt — die
  Wirksamkeit ist über die bestehenden 31 `iconEnabledToggle`-Tests
  und 16 `cardCanonical`-Tests abgesichert (alle grün).

## 3. Lokale Ausführung der harten Workflow-Schritte (Exit-Codes)

Alle ohne DB ausführbaren Schritte lokal nachgefahren, Exit-Codes
dokumentiert:

| Schritt                                                  | Exit |
|----------------------------------------------------------|------|
| `npx tsc --noEmit`                                       | 0    |
| `npm run test:unit` (107/107 grün)                       | 0    |
| `npm run i18n:check` (75 Seiten, 0 Fehler, 5 Warn)       | 0    |
| `node scripts/cms/renderer-audit.mjs --strict`           | 0    |
| `node scripts/cms/card-renderer-paritaet.mjs`            | 0    |
| `node scripts/cms/wahrheits-check-ci.mjs`                | 0    |
| `node scripts/cms/persona-eine-wahrheit.mjs`             | 0    |
| `node scripts/cms/persona-sort-order-wirksam.mjs`        | 0    |
| `node scripts/cms/validate-no-fout.mjs`                  | 0    |

Mit DB-Zugang in CI (nicht in dieser Sandbox ausgeführt, dort von
`CMS_DB_AVAILABLE=true` + GitHub-Secrets abhängig):
- `node scripts/cms/renderability-gate.mjs` (Baseline-Strict-Subset-Gate)
- `node scripts/cms/globaler-spiegel-audit.mjs`
- `supabase/tests/*.sql` über psql (mit ROLLBACK, keine Spuren)
- `npm run test:integration` (4 RPC-Vitest-Tests)

`npm run build` wird vom Build-Harness laufend ausgeführt; lokal nicht
zusätzlich manuell angeworfen, um doppelte Builds zu vermeiden.

## 4. Geänderte Dateien

- `vitest.config.ts` — Env-Switch `VITEST_INTEGRATION`, sauberer
  Default-Exclude für `**/*.int.test.{ts,tsx}`.
- `package.json` — Scripts `test:unit`, `test:integration`.
- `src/features/admin/api/__tests__/rpc_admin_update_section_field.int.test.ts`
  (umbenannt aus `…test.ts`).
- `scripts/cms/card-renderer-paritaet.mjs` — Helper
  `hasCardV1IterationContext()`, präzisierte V2b- und R5-Heuristik.
- `.github/workflows/cms-audit.yml` — Unit-Schritt nutzt
  `npm run test:unit`; neuer verpflichtender Vitest-Integrations-Schritt
  unter `CMS_DB_AVAILABLE=true`.
- `docs/04-betrieb/audit-snapshot/batch57_2-finale-ci-korrektur.md` (dieses
  Dokument).

## 5. Nicht Bestandteil dieses Batches

Keine Änderungen an Produktdatenbank, Auth, Navigation, Routen,
i18n-JSON-Inhalten, Section-Typen, Layout oder Phase-2-Funktionen
(atomare Move-RPC, Admin-UX-Politur, Baseline-Abbau, Legacy-
`sort_order`-Inventar). Diese bleiben optionale Weiterentwicklung.
