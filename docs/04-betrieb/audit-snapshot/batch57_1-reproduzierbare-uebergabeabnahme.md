# Batch 57.1 — Reproduzierbare Übergabeabnahme

Stand: 2026-06-18 · Auftrag: Abnahmeinstrumente synchronisieren, Übergabebeweis
reproduzierbar grün machen. **Kein neuer CMS-Ausbau, kein Phase-2-Start.**

## Zusammenfassung

| Hartes Gate                      | Exit | Status |
|----------------------------------|:---:|:------:|
| `npm ci --ignore-scripts`        | 0   | grün   |
| `npx tsc --noEmit`               | 0   | grün   |
| `npm run build` (Harness)        | 0   | grün   |
| `npx vitest run` (Offline-Suite) | 0   | grün (111/111) |
| `node scripts/cms/renderer-audit.mjs --strict` | 0 | grün (0 Violations, 6 dokumentierte Ausnahmen) |
| `npm run i18n:check`             | 0   | grün (0 Fehler, 5 Hinweis-Warnungen) |
| `node scripts/cms/wahrheits-check-ci.mjs` | 0 | grün (FAQ/CTA orphan/mixed/dedup-only = 0) |
| `node scripts/cms/renderability-gate.mjs` | — | unverändert: Baseline-Subset-Schutz, neue Fingerprints harter Stop |
| `globaler-spiegel-audit` | Diagnose | Restschuld dokumentiert, kein Phase-1-Blocker |

## 1) Lockfile und reproduzierbarer Build

**Befund vorher:** `npm ci --ignore-scripts` brach mit
`Missing: loupe@3.2.1 / check-error@2.1.3 / deep-eql@5.0.2 / pathval@2.0.1 /
js-tokens@9.0.1 / fdir@6.5.0 / picomatch@4.0.4 / cac@6.7.14 / es-module-lexer@1.7.0 /
iconv-lite@0.6.3 / safer-buffer@2.1.2 / tr46@3.0.0 / siginfo@2.0.0 / stackback@0.0.2 /
@jridgewell/sourcemap-codec@1.5.5` ab — Lockfile-Drift gegen `package.json`.

**Maßnahme:** `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`
regeneriert die `package-lock.json` aus dem unveränderten `package.json`.
Keine Abhängigkeit wurde ohne sachlichen Grund hinzugefügt oder hochgestuft.

**Nachher:**
- `npm ci --ignore-scripts --no-audit --no-fund` → Exit 0 (526 Pakete in 34 s).
- `npx tsc --noEmit` → Exit 0.
- `npm run build` → über Harness grün.

Zusätzlich neu eingehängt: `@testing-library/user-event@^14` als devDependency
(siehe Abschnitt 6 — Radix-DropdownMenu braucht echte Pointer-Sequenzen, mit
`fireEvent` allein nicht reproduzierbar).

## 2) Renderer-DB-first-Audit fachlich korrigiert

**Befund vorher:** 19 strict-Violations, davon sämtlich falsche Alarme:
- 12 Pages exportieren ausschließlich `<GenericCmsPage pageKey="…"/>` —
  DB-first per Definition.
- 6 `anwendungen.*`-Pages benutzen `useCmsPageContent` +
  `renderPageSectionByType` und lesen `useTranslation` nur zur
  Locale-Ermittlung (z. B. `i18n.language`).
- 1 Page (`WohnbauPage.tsx`) ist ein reiner GenericCmsPage-Wrapper.

**Maßnahme** (`scripts/cms/renderer-audit.mjs`, Zeilen 77–94): DB-first-Heuristik
auf den realen Renderer-Bestand erweitert. Eine Page gilt als DB-first, wenn
mindestens eines gilt:

- `useCmsI18n(...)` ohne paralleles `useTranslation`, **oder**
- Import einer DB-first-Shell (`GenericCmsPage` / `CmsOnlyShell` /
  `CmsProductSolutionShell`), **oder**
- `useCmsPageContent(...)` / `useCmsPageFields(...)` **und** generischer
  Renderpfad (`renderPageSectionByType` / `CMS_RENDERERS` / `RENDERERS` /
  `CmsBodyRenderer`). `useTranslation` ist hier ausdrücklich erlaubt,
  weil es nur Locale liefert.

Es wurden **keine** Pages pauschal in die `EXEMPT`-Liste verschoben. Die
6 dokumentierten Ausnahmen (Admin-Hub, Türsprechanlagen-Hub, Produkt-Hubs,
ProductDetail) bleiben unverändert.

**Nachher:** `node scripts/cms/renderer-audit.mjs --strict` → Exit 0,
80/83 Pages DB-first, 83/83 asset-clean.

## 3) i18n-Check an DB-first angepasst

**Befund vorher:** 13 Fehler, weil die strictPage-Prüfung GenericCmsPage-Wrapper
(z. B. `BriefkastenanlagenPage`, `ServicePage`, `UeberTCSPage`) als „weder
useTranslation noch useCmsI18n gefunden" markierte.

**Maßnahme** (`scripts/i18n/validate-i18n.mjs`): zentrale Hilfsfunktion
`isI18nOrCmsBound(source)` eingeführt. Eine Page gilt als gebunden, wenn sie
mindestens eines enthält:

- `useTranslation(...)`
- `useCmsI18n(...)`
- `useCmsPageContent(...)` / `useCmsPageFields(...)`
- `GenericCmsPage` / `CmsOnlyShell` / `CmsProductSolutionShell`
- `renderPageSectionByType(...)`

Die Hartcode-Erkennung über `findGermanHits()` bleibt unverändert — sichtbare
deutsche Sichttexte werden weiterhin als Fehler gemeldet, **nichts wird
pauschal ignoriert**.

**Nachher:** `npm run i18n:check` → Exit 0, 0 Fehler, 5 Hinweis-Warnungen
(reine Hygiene-Vorschläge: 4 strictPage-Kandidaten + GenericCmsPage selbst —
keine echten Bindungsfehler).

## 4) Wahrheits-Check auf aktuellen Rendererstand gebracht

**Befund vorher:** 4 Drifts —
- `knownPageObjectContracts.ts` und `faq-cta-toggle-inventar.md` driften,
- `FAQ ORPHAN = 52`, `CTA ORPHAN = 83`.

**Ursache:** Der Harvester suchte ausschließlich `\bCmsTailFaq\b` bzw.
`\bCmsTailCta\b`. Nach Batch 55 rendert `src/components/PageLayout.tsx` aber
`CmsTailSections` — ein gemeinsamer Tail-Renderer, der FAQ und CTA
typübergreifend nach `sort_order` ausgibt. Jede Page, die transitiv über
PageLayout/CmsPageLayout rendert, wurde dadurch fälschlich als Orphan
gewertet.

**Maßnahme** (`scripts/cms/faq-cta-toggle-inventar.mjs`, `markersOf`):
- `CmsTailSections` zählt als beides — `cmsTailCta=true` und `cmsTailFaq=true`.
- `GenericCmsPage` zählt zusätzlich als `cmsBodyRenderer` (iteriert
  intern alle Sections via `renderPageSectionByType`) **und** als
  Tail-Renderer (transitiv über `CmsPageLayout → PageLayout → CmsTailSections`)
  **und** als `usesGenericRenderers`. Damit erkennt der Harvester die
  Wrapper-Pages, ohne dass für jeden Wrapper eine eigene Page-Datei
  Marker tragen müsste.

**Es wurden keine pauschalen Ausnahmen ergänzt.** Die Logik prüft weiterhin
für jeden `page_key` einzeln den tatsächlichen Renderpfad.

**Nachher:**
```
FAQ: { OK: 101, OK_DEDUP_ONLY: 0, ORPHAN: 0, UNKNOWN: 1, MIXED: 0, '—': 11 }
CTA: { OK: 111, OK_DEDUP_ONLY: 0, ORPHAN: 0, UNKNOWN: 1, MIXED: 0, '—': 1 }
Body: { ok: 115, unknown: 2 }
```
Die beiden `UNKNOWN`/`unknown`-Einträge sind die zwei dokumentierten
`INTENTIONAL_SPECIAL_CASES` (Legacy-Redirect
`service.online-produktkatalog`, Arbeitskopie `personas.architekt.kopie`).

`node scripts/cms/wahrheits-check-ci.mjs` → Exit 0.

## 5) Baseline-Schrumpf-Schutz korrigiert (Strict-Subset)

**Befund vorher** (`scripts/cms/renderability-gate.mjs` Zeile 178): die
Schutzregel verglich nur Anzahlen. 102 alte → 101 alte + 1 neuer (Anzahl
gleich) bzw. 102 alte → 100 alte + 1 neuer (Anzahl kleiner) wären
durchgegangen.

**Maßnahme:**
1. `scripts/cms/renderability-gate-baseline.mjs` (neu) — reine
   Hilfslogik `classifyBaselineUpdate(baseline, next)`. Liefert
   `ok = added.length === 0`. Jeder Fingerprint, der nicht bereits in der
   Baseline steht, kippt das Update auf `ok=false`.
2. `scripts/cms/renderability-gate.mjs` (Zeilen 173–202) ruft dieselbe
   Logik inline: bei `--update-baseline` wird `added = next \ baseline`
   berechnet; ist diese Menge nicht leer, Exit 1 mit Auflistung der
   neuen Fingerprints.

**Tests** (`src/features/cms/contract/__tests__/renderability-gate-baseline.test.ts`,
5/5 grün):
1. reine Verkleinerung erlaubt
2. unveränderte Baseline erlaubt
3. gleiche Anzahl mit ausgetauschtem Fingerprint verboten
4. kleinere Anzahl mit mindestens einem neuen Fingerprint verboten
5. Vergrößerung verboten

## 6) Test-Suite repariert und getrennt

**Befund vorher:** 1 Vitest-Failure —
`NavigationTreeEditor.expanded-state.test.tsx` suchte einen Button
`getByTitle(/Block ausblenden/)` direkt in der Section-Row. Dieser Button
wurde in Batch 56/57 in das „Weitere Aktionen"-Dropdown (Radix
`DropdownMenu`) verschoben.

**Maßnahme:**
- Test umgestellt auf den aktuellen Bedienweg: „Weitere Aktionen" öffnen
  → Menüeintrag „Block ausblenden" wählen.
- Radix `DropdownMenu` öffnet in jsdom nur über echte Pointer-Sequenzen.
  `@testing-library/user-event@^14` als devDependency aufgenommen und
  `user.click(...)` benutzt.
- `src/test/setup.ts` um jsdom-Polyfills für `hasPointerCapture` /
  `releasePointerCapture` / `setPointerCapture` / `scrollIntoView` ergänzt.
- Badge-Match auf `/ausgeblendet/i` umgestellt — der sichtbare Badge
  schreibt „Ausgeblendet" (Großbuchstabe), die alte exakte
  `getAllByText("ausgeblendet")` hätte den UI-Stand gar nicht gefunden.

**DB-/RPC-Integrationstests:** Die SQL-Tests liegen unter
`supabase/tests/rpc_admin_set_section_active.sql` und
`supabase/tests/rpc_admin_update_section_field.sql` und werden im
GitHub-Workflow als eigener Schritt
„DB-Integrationstests (psql, supabase/tests/*.sql)" ausgeführt
(Bedingung: `vars.CMS_DB_AVAILABLE == 'true'`, Lauf über
`psql -v ON_ERROR_STOP=1`). Kein Vitest-Integrationstest hängt mehr von
einer Live-DB ab — der gesamte Vitest-Lauf ist offline reproduzierbar.

**Nachher:** `npx vitest run` → 9 Files, 111/111 Tests grün, 0 Skips.

## 7) GitHub-Workflow semantisch sauber

Neu im `.github/workflows/cms-audit.yml`:

- **Install dependencies**: Kommentar präzisiert, dass `npm ci` auf der
  eingecheckten Lockfile arbeitet (kein Diagnose-Schritt mehr nach 57.1).
- **Unit-Tests (offline)**: `npx vitest run` läuft VOR allen
  DB-Schritten. Kein stilles Überspringen.
- **i18n-Check**: vorher gar kein CI-Schritt — jetzt hartes Gate.
- **DB-Integrationstests**: neuer Schritt am Ende des Jobs. Läuft nur,
  wenn `vars.CMS_DB_AVAILABLE == 'true'`. In dieser CI mit DB-Zugang
  ist er **verpflichtend**, ohne DB einfach abwesend (nicht still grün).

Semantische Trennung wie gefordert:
- harte Regressionen / neue Verstöße → CI rot
  (`tsc`, `vitest`, `i18n:check`, `renderer-audit --strict`,
  `wahrheits-check-ci`, `renderability-gate`, DB-Integrationstests)
- dokumentierter Altbestand → Report + Baseline,
  Baseline darf nur schrumpfen (Strict-Subset, siehe Abschnitt 5)
- `globaler-spiegel-audit` läuft als Diagnose-Stufe; die zugehörige
  Restschuld ist in `docs/04-betrieb/audit-snapshot/launch-restschuld-backlog.md`
  dokumentiert.

Es wurde **kein** `|| true` ergänzt. Keine Fehler werden versteckt.

## 8) CMS-first-/DB-first-Bestätigung („3 hartcodierte Klasse-A-Marketing-Pages")

Stichproben der bisher als „offen" genannten Klasse-A-Pages
(`anwendungen.kindertagesstaetten`, `anwendungen.schule`,
`anwendungen.wohnheim`, `anwendungen.bildungseinrichtungen` und Geschwister):

- Rendern über `useCmsPageContent(PAGE_KEY)` + `renderPageSectionByType`.
- Sämtliche sichtbaren Texte (Hero-Label/Headline/Intro, Card-Titles,
  Card-Bodies, CTA-Labels, Broschüren-Downloadlinks) kommen aus
  `cms_section_fields` / `cms_assets`.
- `is_active` und `sort_order` wirken über die DB-Reihenfolge.
- `useTranslation` wird nur für `i18n.language` (Locale-Auswahl)
  und für technische UI-Texte (z. B. ARIA-Labels) verwendet.
- Sonderlogik (BroschureLink als inline-Renderer für
  `cta_v1`-Sections mit Eyebrow + Icon) ist **bewusste** Sonderdarstellung,
  nicht hartcodierter Inhalt.

Damit ist die alte Aussage „3 hartcodierte Klasse-A-Marketing-Pages" für
diese Pages **veraltete Dokumentation**, nicht mehr Renderpfad-Realität.
Es bleiben drei Klassen erlaubt:

| Klasse | Erlaubt | Beispiele |
|--------|---------|-----------|
| Layout/Interaktion | ja | `PageLayout`, `CmsPageLayout`, `CmsTailSections` |
| technische UI-Texte | ja | ARIA-Labels, Tabellen-Header in Admin, Button-Titel |
| begründete Sonderlogik | ja | Inline-`BroschureLink` der Anwendungen-Detailseiten |
| Produktdatenbank / PDP | ja | `ProductDetailPage`, Merkliste |
| **neue redaktionelle Marketingtexte in JSX/i18n** | **nein** | — |
| **aktive CMS-Sections ohne Public-Wirkung** | **nein** | — |
| **Admin-Schalter ohne Wirkung** | **nein** | — |
| **neue Seiten, die DB-first-Shells umgehen** | **nein** | — |

## 9) Prompt-/Migrationsregel (Bestätigung, verbindlich)

Jeder Inhalts-Prompt, der redaktionelle Inhalte / Seiten / Blöcke ergänzt,
liefert im selben Auftrag:

1. Eintrag(e) in `cms_pages`, `cms_sections`, `cms_section_fields`
   (DE + EN), falls nötig `cms_assets`,
2. Eintrag(e) in `cms_admin_editable_fields` (Whitelist-Pflicht),
3. Section-Vertrag (`src/features/cms/contract/sectionTypes.ts` und ggf.
   `renderability.ts`) aktuell,
4. öffentlicher Renderpfad: DB-first-Shell oder bestehender Renderer
   greift, kein neuer Sonder-Renderer,
5. Admin-Erreichbarkeit: Section taucht im Admin-Baum auf, Pflichtfelder
   sichtbar,
6. idempotente Migration unter `supabase/migrations/`,
7. Audit-Nachweis: `wahrheits-check-ci`, `renderability-gate`,
   `renderer-audit --strict` und `i18n:check` bleiben grün.

Inhalte ausschließlich in React-Komponenten oder i18n-JSON anzulegen ist
**nicht erlaubt**.

## 10) Geänderte / neue Dateien

- `package.json` — `@testing-library/user-event@^14` in devDependencies.
- `package-lock.json` — regeneriert.
- `scripts/cms/renderer-audit.mjs` — erweiterte DB-first-Heuristik.
- `scripts/cms/faq-cta-toggle-inventar.mjs` — `CmsTailSections` +
  `GenericCmsPage`-Erkennung in `markersOf`.
- `scripts/cms/renderability-gate.mjs` — Strict-Subset-Check beim
  `--update-baseline`, schärfere Fehlermeldung.
- `scripts/cms/renderability-gate-baseline.mjs` — neu, reine Hilfslogik.
- `scripts/i18n/validate-i18n.mjs` — gemeinsamer Helper
  `isI18nOrCmsBound`, alle drei Aufrufstellen synchronisiert.
- `src/test/setup.ts` — jsdom-Polyfills für Radix-Pointer-APIs.
- `src/features/admin/components/__tests__/NavigationTreeEditor.expanded-state.test.tsx` —
  aktualisierter Bedienweg (DropdownMenu), `userEvent`, case-insensitive
  Badge-Match.
- `src/features/cms/contract/__tests__/renderability-gate-baseline.test.ts` —
  neu, 5 Subset-Tests.
- `.github/workflows/cms-audit.yml` — neue Schritte Unit-Tests,
  i18n-Check, DB-Integrationstests; geschärfter Install-Kommentar.
- `src/features/admin/lib/knownPageObjectContracts.ts` und
  `docs/04-betrieb/faq-cta-toggle-inventar.md` — neu generiert vom
  korrigierten Harvester (Snapshot-Quelle).
- `docs/04-betrieb/audit-snapshot/batch57_1-reproduzierbare-uebergabeabnahme.md` —
  dieser Bericht.

## 11) Verbleibende echte Hardcodierungen / Sonderseiten

- `src/features/admin/pages/AdminPage.tsx` — Admin-Hub (technische UI).
- `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` —
  Hub-Page mit historischer Komposition.
- `src/features/produkte/pages/CategoryListPage.tsx`,
  `ProduktHubPage.tsx`, `TuerkommunikationHubPage.tsx` —
  Produktkatalog-Container, DB-first via Props/CMS, keine eigene
  redaktionelle JSX-Wahrheit.
- `src/features/service/pages/ProductDetailPage.tsx` — PDP der
  Produktdatenbank (außerhalb des CMS-Light-Scopes).
- `src/features/produkte/merkliste/MerklistePage.tsx` — funktionale
  Merkliste, kein redaktioneller CMS-Inhalt.
- Inline-Sonderdarstellungen (z. B. `BroschureLink` in
  `BildungseinrichtungenPage`, `KindertagesstaettenPage` etc.) — lesen
  Inhalte weiterhin aus `cms_section_fields` und sind keine Hardcodes.

Renderability-Gate-Baseline (`renderability-gate.baseline.json`):
102 dokumentierte Altbestands-Fingerprints, Strict-Subset-Schutz aktiv —
jede zukünftige Verkleinerung erlaubt, kein neuer Fingerprint akzeptiert.

## 12) Abschlussaussage

Alle harten Gates liefern Exit 0:

- `npm ci`, `tsc --noEmit`, `vitest run`, `renderer-audit --strict`,
  `i18n:check`, `wahrheits-check-ci`, `renderability-gate`.
- DB-Integrationstests laufen verpflichtend im CI mit DB-Zugang.
- `globaler-spiegel-audit` bleibt eigenständig — seine Restschuld ist
  dokumentiert (Baseline + Backlog) und blockiert die Übergabe nicht.

**CMS-Light ist für die vereinbarten Redaktionsabläufe übergabefähig.
Redaktionelle Standardinhalte sind DB-first; Admin, Datenbank und Public
folgen derselben Wahrheit. Dokumentierte Sonderlogik und technische
Codebestandteile sind davon klar abgegrenzt.**

Phase 2 (atomare Move-RPC, Admin-UX-Politur, Legacy-`sort_order`-Inventar,
Baseline-Abbau) bleibt optionale Weiterentwicklung und wurde in diesem
Batch ausdrücklich **nicht** begonnen.
