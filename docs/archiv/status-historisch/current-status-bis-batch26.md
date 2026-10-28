# Aktueller Stand

Stand: 2026-06-03 (Abschlussbehauptung für `card_v1` zurückgezogen: Es gibt noch lokale Sonderrenderer und der Pflichtkarten-Nachweis war zu weich. Erst nach echtem Beleg für B-538, B-1905 und B-2084 darf wieder „abgeschlossen" stehen.)

## Sprint „card_v1 B-538-Standard flächig durchsetzen" (2026-06-03)

- **B-538 ist Goldstandard, 701/701 Karten gleichgezogen.** Idempotente Migration mit: `tags` → `chips.0..4` + `chips_N_enabled='1'`; `features.N` → `bullets.N` + `bullets_N_enabled='1'`; `cta_href`/`href` → `link_1_href`; Standardlabels DE+EN auf alle 701 Karten („Mehr erfahren / Learn more", „Zum Planer / To planner", „Zum Konfigurator / To configurator"). Override-Whitelist: `Details`, `Detail`, `Mehr`, `More`, `Read more`, `Weiterlesen`, `Details →`, `Mehr →` werden case-insensitiv ersetzt; „Mehr erfahren" / „Learn more" / „Zum Planer" bleiben unberührt.
- **Admin-Whitelist** erweitert: alle 3 Linkslots × 4 Felder × 2 Locales + chips.0..4 + bullets.0..4 + Toggles editierbar auf jeder aktiven `card_v1` (16.826 Linkzeilen).
- **Linkauflösung (vier Zielarten)** in neuem `resolveHref(raw, shortIdMap)`: interner Pfad `/…`, externe URL (`https://…`, `mailto:`, `tel:`), Kurz-ID Seite `P-265` → `cms_pages.route_path`, Kurz-ID Baustein `B-357` → Seitenpfad + `#section_key`-Anker. `#`, leer, unaufgelöste Kurz-IDs, freier Text ohne `/` werden **nicht öffentlich gerendert** (kein `href="#"` mehr).
- **Korrektur:** `AnwendungenPage` rendert aktive Top-Level-Container jetzt nur noch über `renderPageSectionByType`. Die frühere lokale Sonderlogik für `categories_uebergreifend` und `systemfunktionen_cards` wurde entfernt; `B-2084` läuft damit über `CardsSectionV1` und kann `link_1..3` vollständig ausspielen.
- **B-2084**: „Details →" endgültig weg. `link_1_href` DE=`/Kontakt`, EN automatisch aus `cta_href` nachgezogen. `link_1_label` DE=`mehr erfahren` (editorial belassen), EN=`Learn more`. Chips aus `chips.*`, `tags` ignoriert.
- **Gate verschärft:** `card-renderer-paritaet.mjs` enthält jetzt zusätzlich **V4**: lokale `card_v1`-Kind-Mappings mit `<Link>`/`ArrowRight`/`canonicalLink(link_1)` statt Standardrenderer werden rot.
- **Pflichtkarten-Nachweis korrigiert:** `scripts/cms/e2e-card-v1-pflichtkarten.mjs` zählt fehlende DB nicht mehr als grün. Ohne DB wird jetzt Snapshot + Preview/Public für **B-538**, **B-1905** und **B-2084** geprüft.

---


## Sprint „card_v1 E2E scharf — Phase 1b" (2026-06-03)

- **Single Source:** Container-Matrix lebt jetzt in `src/features/cms/contract/runtime/card_v1.matrix.json`. `cardRuntimeMatrix.ts` UND `scripts/cms/e2e-vertrag.mjs` lesen dieselbe Datei — keine Doppelpflege mehr.
- **Playwright statt fetch:** E2E nutzt headless Chromium (`/bin/chromium`), wartet auf Hydration, scrollt durch die Seite, sammelt DOM-Text + Anchors. Kein `skipped` mehr für normale Routen.
- **Vertragsprüfung:** active = muss im DOM (Links zusätzlich als `<a href>`); incomplete-Link = Label DARF NICHT klickbar sein; unsupported/disabled = Text DARF NICHT erscheinen.
- **Pflichtkarten:** B-538 (`product_scroller_v1`, Bullets/Chips/incomplete-Link), B-583 (`cards_v1.scroller`, Bildkarte), B-1177 (`card_grid_v1`, Thumbnail+Links), B-2002 (`feature_grid_v1`, Iconkarte).
- **Echter Befund:** B-538 → exit 1. Vertrag sagt `bullets.0=active` + `chips.0=active`, aber „Test" taucht im Published-DOM nicht auf. Entweder Deployment-Lag oder Renderer-Regression in `ProductScrollerV1`. Genau wofür scharf E2E da ist.
- **Scope-Treue:** Nur `card_v1`. Keine Hero/Teaser/CTA/FAQ/Content. Keine Inhalte gelöscht, keine Migration. Renderer-Fix bewusst in Folgesprint ausgegliedert.
- **Bericht:** `docs/04-betrieb/sprint-card-v1-e2e-scharf-phase1b-bericht.md`. Vertragsdoku aktualisiert.

## Sprint „card_v1 Runtime-Vertrag — Phase 1" (2026-06-03)

- **Eine Wahrheit pro Baustein:** Neue Vertragsdatei `src/features/cms/contract/runtime/card_v1.ts` ist ab sofort der einzige öffentliche Einstiegspunkt für Karten-Logik. Re-exportiert Container-Matrix + Resolver + statisches Feldinventar (`CARD_V1_FIELD_INVENTORY`) + Versionsmarker (`1.0.0`). Admin, Public-Renderer und Audit ziehen alle aus dieser Datei.
- **E2E read-only:** Neues Skript `scripts/cms/e2e-vertrag.mjs`. Pflichtkarte **B-538** (`gebaeudekommunikation.tuersprechanlagen` / `card_pak`, Container `product_scroller_v1`). Liest DB + Container, berechnet Vertragsstatus, ruft Public-HTML ab und prüft `active`-Felder. SPA-ehrlich: meldet `skipped` statt fälschlich rot, wenn nur Shell-HTML zurückkommt. Kein Service-Role-Key, keine Schreibwege.
- **Beleg:** Lauf bestätigt für B-538: `eyebrow/title/description/bullets.0/chips.0/image` = active · `link_1/2/3` = incomplete (Label ohne Ziel). Exakt das, was Admin nach „Runtime-Parität" anzeigt.
- **Bericht + Anleitung:** `docs/04-betrieb/runtime-vertrag-card-v1.md` (Vertragsdoku, Erweiterungspfad) und `docs/04-betrieb/sprint-card-v1-runtime-vertrag-phase1-bericht.md` (Sprint-Bericht inkl. nächster Phasen).
- **Scope-Treue:** Keine Migration, keine Inhaltsänderung, keine Renderer-Logikänderung. Reine Strukturarbeit (Vertragsschicht) plus read-only Audit. Hero/Teaser/CTA/FAQ/Content-Verträge bleiben bewusst ausgeklammert — eigene Folgesprints.

## Sprint „card_v1 Runtime-Parität — gemeinsame Karten-Matrix und Resolver-Wahrheit" (2026-06-03)

- **Befund:** B-538 (`card_pak`) im `product_scroller_v1`: `bullets.0`, `chips.0`, `link_1_label` gepflegt — öffentlich unsichtbar. Admin meldete „Links 0 von 3 aktiv", obwohl Label gepflegt war (`link_1_href` leer). Wahrheit zwischen Admin/DB/Public lief auseinander, je nach Container.
- **Neue Karten-Matrix:** `src/features/cms/lib/cardRuntimeMatrix.ts`. Pro Container (`cards_v1.grid`, `cards_v1.scroller`, `product_scroller_v1`, `card_grid_v1`, `catalog_filter_grid_v1`, `feature_grid_v1`, `download_list_v1`) festgelegt, welche Module (eyebrow/title/description/image/thumbnail/icon/icon_image/bullets/chips/links) öffentlich gerendert werden.
- **Runtime-Resolver:** `resolveCardRuntime` in `cardVisibility.ts`. Liefert pro Feld einen Status (`empty/unsupported/disabled/incomplete/active`) + Begründung. Links unterscheiden explizit `incomplete` (Label ohne href oder href ohne Label) von `active`/`disabled`.
- **Public-Renderer `ProductScrollerV1`** rendert jetzt bullets, chips und links 1..3 — Scroller-Karten wirken 1:1 wie im Admin gespeichert.
- **Admin-Workspace `BildkartenCardWorkspace`:**
  - Gruppen Bulletpoints/Chips/Links zeigen „in diesem Layout nicht sichtbar", wenn der Container das Modul nicht rendert (z. B. Bullets in `feature_grid_v1`).
  - Link-Zähler differenziert: `X aktiv · Y unvollständig · Z befüllt`.
  - Jede Linkzeile bekommt einen Statusbadge (aktiv / unvollständig / deaktiviert / nicht in diesem Layout / leer) inkl. Begründung („Beschriftung vorhanden, Ziel fehlt").
- **Scope-Treue:** Keine DB-/Whitelist-/RPC-Änderung. Keine Produktdatenbank, Navigation, Footer, i18n berührt. Keine Inhalte gelöscht. Renderer-Änderung nur in `ProductScrollerV1` (Felder ausspielen, die laut Matrix bereits unterstützt sind).
- **Geänderte Dateien:** neu `src/features/cms/lib/cardRuntimeMatrix.ts`, `docs/04-betrieb/card-v1-runtime-paritaet.md`, `docs/04-betrieb/sprint-card-v1-runtime-paritaet-bericht.md`; geändert `src/features/cms/lib/cardVisibility.ts`, `src/features/cms/components/sections/ProductScrollerV1.tsx`, `src/features/admin/components/BildkartenCardWorkspace.tsx`, `docs/current-status.md`.

---

## Sprint „Kartenmodell Semantik — Bulletpoints und Chips trennen" (2026-06-03)


- **Befund:** `features.*` wurde im Renderer als Bullet-Liste mit Anstrich ausgespielt, der Admin-Bereich hieß aber „Features". „Features" meint historisch eher kleine graue Chips/Pillen. Semantische Vermischung.
- **Neues kanonisches Modell:** `bullets.0..4` + `bullets_N_enabled` als echte Bulletpoints (Listenpunkte mit Anstrich). Separat `chips.0..4` + `chips_N_enabled` als graue Pillen. `features.*` ab jetzt Legacy/Fallback für Bulletpoints (nicht gelöscht).
- **Migration (`20260603084046_*`):** idempotent. Backfill `features.N → bullets.N` (262 Zeilen) und `features_N_enabled → bullets_N_enabled` (150 Zeilen), nur wo Ziel leer war. Default-Leerzeilen für alle vier neuen Modul-Familien × DE+EN × 701 aktive `card_v1`-Sections. Whitelist (`cms_admin_editable_fields`) für `bullets.0..4`, `bullets_N_enabled`, `chips.0..4`, `chips_N_enabled` × DE+EN freigeschaltet (≈ 28 040 Whitelist-Zeilen). **Konflikte: 0**, weil `bullets.*` vor der Migration komplett leer war.
- **Renderer canonical-first:** `cardVisibility.ts` liefert `bulletsVisible[]` aus `bullets.N` mit Fallback `features.N` (Toggle ebenfalls canonical-first). `featuresVisible` ist Alias auf `bulletsVisible`. Neu: `chipsVisible[]`. `CardsSectionV1` rendert Bulletpoints unverändert als Liste mit Punkt-Anstrich und neu `chips.*` als graue Pillen (`bg-muted`, Pille-Form). `CmsProductSolutionShell` liest Bulletpoints canonical-first. `ProductScrollerV1` rendert weiterhin keine Listen — Layout sieht das nicht vor.
- **Admin-Workspace:** Bereich „Features" → ersetzt durch **„Bulletpoints"** (schreibt `bullets.N` / `bullets_N_enabled`, mit Legacy-Hinweis falls nur `features.N` gefüllt). Neuer Bereich **„Chips / Merkmale"** (schreibt `chips.N` / `chips_N_enabled`).
- **RPC-Schreibtests grün:** `bullets.0`, `bullets_0_enabled`, `chips.0`, `chips_0_enabled` auf `eingangssysteme.material/card_aluminium/de` → jeweils `success=true, updated=true`. Keine `field_not_allowed`-Fehler.
- **CI-Gates alle grün:** `wahrheits-check-ci.mjs`, `renderer-audit.mjs --strict` (74/80 DB-first, 80/80 asset-clean), `validate-no-fout.mjs`, `contract-audit.mjs` (15 OK · 7 Warn · 0 Konflikt), `contract-drift-audit.mjs` (D1–D9 = 0, D10 = 28 unverändert).
- **Public unverändert:** solange keine `chips.*` gepflegt sind, sehen Karten optisch identisch aus — die Quelle ist jetzt nur canonical-first `bullets.*` statt direkt `features.*`.
- **Scope-Treue:** Keine Produktdatenbank, keine Navigation, kein Footer, keine Breadcrumbs, keine i18n-Löschung, kein Inhalt gelöscht, `features.*` unverändert, keine neue RPC.
- **Geänderte Dateien:** Migration `supabase/migrations/20260603084046_*.sql`; Renderer/Resolver `src/features/cms/lib/cardVisibility.ts`, `src/features/cms/components/sections/CardsSectionV1.tsx`, `src/features/cms/components/CmsProductSolutionShell.tsx`; Admin `src/features/admin/components/BildkartenCardWorkspace.tsx`. Neu: `docs/04-betrieb/card-v1-bullets-und-chips-semantik.md`, `docs/04-betrieb/sprint-kartenmodell-semantik-bulletpoints-chips-bericht.md`. Geändert: `docs/current-status.md`.

---

## Sprint „Kartenmodell vereinheitlichen — card_v1 Textwahrheit konsolidieren" (2026-06-03)

- **Befund:** Admin (`BildkartenCardWorkspace`) schrieb in `eyebrow`/`headline`/`beschreibung`, Public-Renderer (`CardsSectionV1`, `ProductScrollerV1`) lasen `subtitle`/`title`/`description`. Disjunkte Wahrheit über alle 701 aktiven `card_v1` — Admin-Edits wirkten nicht öffentlich, sichtbarer Public-Text war im Admin oft nicht editierbar.
- **Kanonisches Zielmodell:** `eyebrow` (Kicker) · `title` · `description` · `features.0..4`. Alias `subtitle`/`headline`/`beschreibung` bleibt als Fallback in der DB, nichts wird gelöscht.
- **Audit:** 0 Konflikte (190 `subtitle→eyebrow`, 30 `headline→title`, 30 `beschreibung→description`, alle Fall A: canonical leer, Alias gefüllt). `desc` (94 Zeilen) ist redundante Dublette zu `description` — kein Backfill nötig.
- **Migration (`20260603081100_*`):** idempotent. Default-Zeilen für canonical Felder × DE+EN, Alias→canonical kopiert (nur bei leerer canonical), Whitelist auf `is_enabled=true` für `eyebrow`/`title`/`description` × DE+EN über alle 701 Karten.
- **Coverage:** 1402/1402/1402 Whitelist (DE+EN × 3 Felder × 701 Karten). Inhalte: `eyebrow` 109 DE (14+95), `title` 692/701, `description` 660/701.
- **Renderer canonical-first:** `CardsSectionV1` und `ProductScrollerV1` lesen `title || headline`, `description || beschreibung`, `eyebrow || subtitle`.
- **Admin-Workspace canonical:** `BildkartenCardWorkspace.tsx` schreibt in `EYEBROW_FK="eyebrow"`, `TITLE_FK="title"`, `DESC_FK="description"`. Labels unverändert.
- **RPC-Schreibtest grün:** `eingangssysteme.material/card_aluminium/eyebrow/de` → `success=true, updated=true`.
- **CI-Gates alle grün:** `wahrheits-check-ci.mjs`, `renderer-audit.mjs --strict` (74/80, 80/80), `validate-no-fout.mjs`, `contract-audit.mjs` (15 OK · 7 Warn · 0 Konflikt), `contract-drift-audit.mjs` (D1–D9 = 0, D10 = 28 unverändert).
- **Scope-Treue:** Keine Produktdatenbank, keine Public-Routen, keine Navigation/Footer, keine i18n-Löschung, keine neuen RPCs, keine Container-Felder, keine Alias-Felder gelöscht.
- **Geänderte Dateien:** Migration `supabase/migrations/20260603081100_*.sql`; Renderer `CardsSectionV1.tsx`, `ProductScrollerV1.tsx`; Admin `BildkartenCardWorkspace.tsx` (3 Zeilen). Neu: `docs/04-betrieb/sprint-kartenmodell-vereinheitlichen-bericht.md`, `docs/04-betrieb/card-v1-textmodell-konsolidierung.md`. Geändert: `docs/current-status.md`.

---

## Sprint „CMS-Light Bedienbarkeit 2 — Hero, Wechselteaser, Content schreibfähig" (2026-06-03)

- **Befund:** Workspaces aus „Bedienbarkeit 1" zeigten die Felder korrekt an, viele Sections hatten aber weder Whitelist-Einträge (`cms_admin_editable_fields`) noch Default-Zeilen (`cms_section_fields`). Folge: `field_not_allowed` beim Speichern. Größte Lücken bei `hero_v1` (CTA-Felder 0/92, `subheadline` 2/92, `subline` 19/92), kleinere bei `content_v1` (`text` 150/223). `teaser_2col_v1` war bereits vollständig.
- **Fix (idempotente Migration `20260603075230_*`):** Für alle aktiven `hero_v1`/`teaser_2col_v1`/`content_v1`-Sections × DE+EN werden die vom Workspace gepflegten Felder in der Whitelist mit `is_enabled=true` eingetragen (`ON CONFLICT DO UPDATE`) und fehlende Default-Zeilen mit `value=''` ergänzt (`ON CONFLICT DO NOTHING`). Bestehende Werte unverändert.
- **Coverage nach Migration:** `hero_v1` 1104/1104 ✓ · `teaser_2col_v1` 938/938 ✓ · `content_v1` 1338/1338 ✓.
- **RPC-Schreibtest grün:** `home.start/hero/cta_label/de` und `zutrittskontrolle.mobiler-zutritt/submenu/label/en` jeweils `success=true, updated=true`, danach sauber geleert.
- **Public unverändert:** Leere Default-Zeilen verhalten sich identisch zu „kein Eintrag" — Renderer-Fallback (i18n/Props) greift weiterhin. Hero-CTA bleibt im Workspace als „nicht gerendert" markiert (kein Hero-Button im `CmsPageLayout`).
- **CI-Gates alle grün:** `wahrheits-check-ci.mjs`, `renderer-audit.mjs --strict` (74/80 DB-first, 80/80 asset-clean), `validate-no-fout.mjs`, `contract-audit.mjs` (15 OK · 7 Warn · 0 Konflikt), `contract-drift-audit.mjs` (D1–D9 = 0, D10 = 28 unverändert).
- **Scope-Treue:** Keine Änderung an Produktdatenbank, Public-Routen, Navigation, Footer, Breadcrumbs, Renderern, RPCs, i18n-JSON, Workspace-Code.
- **Geänderte Dateien:** neu `docs/04-betrieb/sprint-cms-light-bedienbarkeit-2-bericht.md`, Migration `supabase/migrations/20260603075230_*.sql`; geändert `docs/current-status.md`.

---

## Sprint „CMS-Light Bedienbarkeit 1 — Hero, Wechselteaser, Content" (2026-06-03)

- **Neue Bibliothek** `src/features/admin/lib/sectionWorkspaceGroups.ts`: kuratierte Workspace-Konfiguration für die drei Standard-Bausteine, abgeglichen gegen `sectionTypes.ts` + echte Renderer-Reads (`CmsPageLayout`, `Teaser2ColV1`, `ContentSectionV1`). Pro Feld: deutsches Klartext-Label + Hint, `role`, `expectation` (`public` / `optional` / `not-rendered` / `legacy`), `rendererNote`; Enum-Optionen für `image_position` und `background_variant`.
- **Neue Komponente** `src/features/admin/components/StandardBausteinWorkspace.tsx`: einheitlicher Akkordeon-Workspace mit Wirksamkeits-Badge pro Feld, DE/EN-Freigabeschalter, DE/EN-`EditableField`, eingebettetem Asset-Slot und sichtbarer Diagnose-Box für Altbestand-Felder. Schreibweg unverändert (`rpc_admin_update_section_field`), keine neue RPC, kein Direktzugriff.
- **PageEditor-Integration:** kleiner Branch in `PageEditor.tsx` direkt nach dem `card_v1`-Workspace; Doppelausgabe des Asset-Blocks unterdrückt. Alle anderen Section-Typen bleiben am flachen Plan-Renderer.
- **Wirksamkeits-Spezialfälle dokumentiert:** Hero-CTA-Felder (`cta_label`, `cta_href`) sind im Vertrag, werden vom Standard-Hero in `CmsPageLayout` nicht gerendert → klar als „nicht gerendert" markiert. `teaser_2col_v1` nutzt `cta_link` (NICHT `cta_href`), Hint warnt explizit.
- **D10-Gruppe A vorbereitet** (Container-Header `cards_v1` / `product_scroller_v1`): read-only-Befund — Vertrag listet Header-Felder bereits, P055 + Türsprechanlagen-Spezial bleiben für den geplanten Text-Whitelist-Sprint. In diesem Sprint kein Renderer-Eingriff.
- **CI-Gates alle grün:** `wahrheits-check-ci.mjs`, `renderer-audit.mjs --strict`, `validate-no-fout.mjs`, `contract-audit.mjs`, `contract-drift-audit.mjs` (unverändert: 15 OK · 7 Warnung · 0 Konflikt).
- **Scope-Treue:** Keine Änderung an Produktdatenbank, Public-Routen, Navigation, Footer, Breadcrumbs, Renderern (`src/features/cms/components/sections/*`), RPCs, i18n-JSONs oder Migrationen.
- **Geänderte Dateien:** neu `src/features/admin/lib/sectionWorkspaceGroups.ts`, `src/features/admin/components/StandardBausteinWorkspace.tsx`, `docs/04-betrieb/sprint-cms-light-bedienbarkeit-1-hero-teaser-content-bericht.md`; geändert `src/features/admin/components/PageEditor.tsx`, `docs/current-status.md`.

---

## Sprint „Public-Truth-Abschluss 1" (2026-06-03)

- **HomePage-Ausnahme abgebaut:** `src/features/home/pages/HomePage.tsx` zieht jetzt `useCmsI18n("home.start", undefined)` statt direktem `useTranslation`. Damit fällt sie aus der `EXEMPT`-Liste von `scripts/cms/renderer-audit.mjs` und aus `scripts/i18n/i18n-check.config.json.exemptPages`. Layout sichtbar unverändert; keine i18n-JSON-Inhalte gelöscht.
- **Renderer-Audit:** jetzt **74/80 DB-first** (vorher 73/80), **80/80 Asset-clean**. Verbleibende 6 Ausnahmen sind alle dokumentiert (AdminPage, TuersprechanlagenPage, 3× Produkt-Hub-Container, ProductDetailPage).
- **Body-Inventur final klassifiziert:** Harvester (`scripts/cms/faq-cta-toggle-inventar.mjs`) erkennt zwei zusätzliche Evidenztypen: (1) **Shared-Template über pageKey-Prop** — `<CategoryListPage pageKey="…"/>` in `routes.tsx` löst automatisch auf das echte Shared-Template auf und absorbiert dessen DB-first-Marker. (2) **Dynamic-Slug-Template** — explizites Registry `KNOWN_DYNAMIC_TEMPLATES` für `anwendungen.referenzprojekte.<slug>` → `ReferenzprojektDetailPage.tsx`. Zusätzlich `INTENTIONAL_SPECIAL_CASES` für 2 bewusst page-lose Einträge (`service.online-produktkatalog` = Legacy-Redirect, `personas.architekt.kopie` = Redaktions-Arbeitskopie).
- **Body-Pfad-Ergebnis:** **115 ok / 2 unknown** über alle 117 Seiten (vorher 101/16). Die 2 verbliebenen `unknown` sind exakt die beiden dokumentierten Sonderfälle — kein einziger „echter" `body=unknown` mehr.
- **`db_dupes` / `section_inactive` triagiert** (`docs/04-betrieb/db-dupes-section-inactive-triage.md`): `db_dupes = 0` aktive Asset-Dubletten in der DB. `section_inactive = 140` Sections über 31 Seiten — gruppiert als (a) absichtlich ausgeblendete Alt-Karten, (b) leere FAQ-Skeletons auf neuen CMS-Light-Seiten, (c) historische Layout-Varianten. Keine Migration nötig — die Inhalt-zuerst-Regel verbietet pauschales Löschen.
- **D10-Spezialrisiken inventarisiert** (`docs/04-betrieb/d10-spezialrisiken-inventar.md`): die 28 Hinweise sind keine Daten-Drift, sondern dokumentierte Renderer-Sonderheiten pro `section_type`. Gruppiert in 6 Buckets (A–F). Real abbaubar in diesem Sprint: keiner risikoarm und innerhalb der Scope-Grenzen — die 2 Befunde der Gruppe A werden mit dem geplanten Whitelist-Sprint (Etappe 4) adressiert.
- **CI-Gates alle grün:** `wahrheits-check-ci.mjs`, `renderer-audit.mjs --strict`, `validate-no-fout.mjs`, `contract-audit.mjs`, `contract-drift-audit.mjs` (D1–D9 = 0, D10 = 28 dokumentiert).
- **Geänderte Dateien:** `src/features/home/pages/HomePage.tsx`, `scripts/cms/renderer-audit.mjs` (EXEMPT-Eintrag entfernt), `scripts/i18n/i18n-check.config.json` (exemptPages entfernt), `scripts/cms/faq-cta-toggle-inventar.mjs` (Shared-Template-Detection, Dynamic-Slug-Registry, Special-Cases), `src/features/admin/lib/knownPageObjectContracts.ts` (auto-regeneriert), `docs/04-betrieb/faq-cta-toggle-inventar.md` (auto-regeneriert). **Neu:** `docs/04-betrieb/db-dupes-section-inactive-triage.md`, `docs/04-betrieb/d10-spezialrisiken-inventar.md`, `docs/04-betrieb/sprint-public-truth-abschluss-1-bericht.md`.
- **Scope-Treue:** Keine Änderung an Produktdatenbank, Public-Routen, Navigation, Footer, Breadcrumbs, Layouts oder RPCs. Keine i18n-JSON-Löschung. Keine Migration in diesem Sprint (`db_dupes = 0`, `section_inactive` bewusst behalten).
- **Empfehlung nächste Etappen:** (1) Sprint „cms-light-baustein-workspaces-wechselteaser-hero-content-1". (2) Pro-Feld-Text-Whitelist je `section_type` (löst auch D10-Gruppe A). (3) Admin-Login + RLS-Härtung erst als letzter Schritt vor Public-Live.

---

# Aktueller Stand — Vorgänger

Stand: 2026-06-02 (Folge-Sprints „cms-light-whitelist-luecken-nachziehen-1" + „cms-light-renderer-orphan-cleanup-1", aufgesetzt auf den Wahrheits-Check-Umbau vom selben Tag; inkl. Codex-Review-Korrekturen vom Abend)

## Whitelist-Lücken geschlossen + Renderer-Orphans aufgelöst

- **Wahrheits-Check ab 2026-06-02 objektbasiert:** Der Admin-Tab bewertet CTA, FAQ und Karten jetzt primär als **Objekte** statt als Sammlung interner Teilquellen. Grün heißt nur noch: Das Objekt hängt öffentlich wirksam am CMS. Rot heißt: keine belastbare CMS-Wahrheit. Gelb bleibt nur für Teilstände/unklare Page-Pfade. Grundlage dafür ist die neue, auto-generierte Map `src/features/admin/lib/knownPageObjectContracts.ts` aus `scripts/cms/faq-cta-toggle-inventar.mjs`; sie markiert FAQ/CTA-Seiten mit `ok` / `orphan` / `mixed` / `unknown` und verhindert damit falsche Grünmeldungen im Wahrheits-Check. Die frühere Feld-/Quellen-Sicht bleibt nur noch als Diagnose im Aufklapper bestehen. Doku ergänzt in `docs/04-betrieb/wahrheits-check.md`.
- **Whitelist-Backfill (`missing_whitelist` → 0):** Stand DB hat `cms_admin_editable_fields` **47.966 aktive Whitelist-Einträge**; die Prüfung „nicht-leere `cms_section_fields` (DE/EN) ohne aktiven Whitelist-Eintrag" ergibt **0**. Erreicht über die Mai-Backfill-Migrationen (`20260521220542_*`, `20260521222649_*`, `20260524073143_*`, `20260524074341_*`, `20260524083145_*`) + laufende Whitelist-Pflege; **nicht** über eine einzige Sammelmigration am 02.06. — die zuvor zitierte Migration `20260602154129_*` enthält nur den `cta_v1`-Farbschema-Backfill. Zielzustand ist korrekt, Erzählung jetzt ebenfalls.
- **`unknown_section_type` → 0:** `src/features/admin/lib/rendererSlotMap.ts` kennt jetzt `stat_v1`, `list_v1`, `tab_v1`, `role_tabs_v1` als reine Text-/Child-Container ohne Bildslot. Wahrheits-Check klassifiziert sie nicht mehr als „unbekannt".
- **Renderer-Orphans aufgelöst (`renderer_orphan` → 0):** Neuer Harvester `scripts/cms/harvest-page-component-reads.mjs` scannt die Codebasis nach `cms.asset(...)`-Aufrufen in Page-Komponenten und erzeugt die statische Allowlist `src/features/admin/lib/knownPageComponentReads.ts` (aktuell **110 Tupel**, inkl. Wildcards wie `anwendungen.referenzprojekte.*`). `truthSources.ts` kennt den neuen grünen Status `page_component_read` („Page-Komponente liest"), Badge in `SlotValidationView.tsx` emerald. Migration `20260602182725_*` stilllegt 21 echte Waisen (`is_active=false`) in `gebaeudekommunikation.beschilderung`, `mobile-tk-preview.root`, `personas.architekt.kopie` — kein Codepfad las sie.
- **Lese-Regel für die ~22.900+ grünen Treffer:** Grün heißt **technisch sauber** (DB · Whitelist · Renderer · Code-Fallback im Lot), **nicht automatisch redaktionell fertig**. Drei grüne Stati nebeneinander: `one_truth` (echter Inhalt), `editable_empty` / `not_yet_configured` (Optional-Slot bewusst leer), `page_component_read` (Inhalt wird von einer hartcodierten Page-Komponente gelesen, nicht vom Standard-Renderer). **Bekannte Heuristik:** Bei Textfeldern eines bekannten Section-Typs wird `renderer_reads=true` pauschal angenommen (V1-Renderer lesen Textfelder generisch via `f(ctx, fieldKey)`); eine pro-Feld-Whitelist existiert nur für Bildslots. Folge: ein Status `one_truth` auf einem Textfeld heißt „technisch sauber + im erwarteten Schema", nicht „garantiert öffentlich sichtbar". Die belastbare öffentliche Aussage liefert die Objekt-Ampel (CTA/FAQ/Karten).
- **Audit-Ergebnis (Renderer):** 73/80 Seiten DB-first, 80/80 Asset-clean. Einzige bewusste Ausnahme bleibt `HomePage.tsx` (nutzt noch `useTranslation`).
- **Geänderte/neue Dateien:** `src/features/admin/lib/rendererSlotMap.ts`, `src/features/admin/lib/truthSources.ts`, `src/features/admin/components/SlotValidationView.tsx`, `src/features/admin/lib/blockTemplates.ts` (cta_v1-Template auf 18 Felder + `image`-Slot, deckungsgleich mit `sectionTypes.ts`), **neu** `scripts/cms/harvest-page-component-reads.mjs` (jetzt plattformneutral via `fs.readdirSync`, Kommentare gestrippt — kein `find`-Aufruf mehr, kein `foo.bar`-False-Positive), **neu** `src/features/admin/lib/knownPageComponentReads.ts` (110 Tupel), 2 Migrationen `20260602154129_*` (CTA-Farbschema-Backfill) + `20260602182725_*` (Orphan-Stilllegung).
- **Codex-Review-Korrekturen 2026-06-02 (Abend):** (1) Harvester ist jetzt Windows-/macOS-/Linux-tauglich, kein Unix-`find` mehr. (2) Allowlist-False-Positive `foo.bar|hero|image` (Kommentar-Beispiel aus `CmsOnlyShell.tsx`) entfernt — Harvester strippt Kommentare vor dem Regex-Scan. (3) `cta_v1`-Template in `blockTemplates.ts` um `cta_kind`, `cta_secondary_kind`, `cta_primary_color`, `cta_secondary_color`, `background_variant` und Asset-Slot `image` ergänzt — jetzt deckungsgleich mit dem echten Renderer-Vertrag. (4) Text-Slot-Heuristik im Wahrheits-Check explizit als „bewusste Großzügigkeit" im Code dokumentiert + hier in der Lese-Regel. (5) Migrations-Erzählung in `docs/migration-log.md` und hier auf den tatsächlichen Migrationsinhalt korrigiert.
- **Wartung:** Allowlist nach Anlegen neuer hartcodierter Page-Komponenten neu erzeugen mit `node scripts/cms/harvest-page-component-reads.mjs`.
- **Scope-Treue:** Keine Änderung an Produktdatenbank, Public-Renderer-Struktur, Navigation, Footer, Breadcrumb, i18n-JSON. Keine neue RPC. Migrationen idempotent. Keine Inhalte gelöscht — Orphans nur deaktiviert.
- **Empfehlung nächste Etappen:** (1) Restliche `db_dupes` und `section_inactive`-Befunde sichten. (2) `HomePage.tsx` auf `useCmsI18n` ziehen. (3) Sprint „cms-light-baustein-workspaces-wechselteaser-hero-content-1" aus dem Vorsprint. (4) Mittelfristig: pro-Feld-Text-Whitelist je section_type, damit auch Textslots im Wahrheits-Check nicht-heuristisch grün werden. Admin-Login bleibt **letzter** Schritt vor Public-Live.

---

# Aktueller Stand — Vorgängerstand (heute früh)

Stand: 2026-06-02 (Sprint „cms-light-wahrheits-check-section-akkordeon-und-cta-eine-wahrheit-1", UI- und Wahrheits-Check-only + 4 idempotente CTA-Migrationen)

## Wahrheits-Check auf Section-Akkordeon + CTA „Eine Wahrheit"

- **Wahrheits-Check komplett umgebaut** (`/admin → Wahrheits-Check`): vorher 3.949 Einzelzeilen pro Bildslot + „Sonstige 3.949"-Halde, jetzt **eine Akkordeon-Zeile pro Section** mit Sammelstatus = schlimmster Feld-Status. Beispiel: CTA erscheint als **110 Section-Zeilen** (vorher fälschlich nur 48, weil `readSections()` am PostgREST-1000-Cap hängenblieb). Aufklappen zeigt jedes Feld einzeln mit allen vier Quellen (DB · Whitelist · Renderer · Code-Fallback).
- **Datenmodell erweitert (`src/features/admin/lib/truthSources.ts`):** `readSectionFields()` (neu, paginiert > 8.000 Zeilen) und `readSections()` (jetzt paginiert) sorgen dafür, dass keine Section/Feldzeile mehr fehlt. `TruthRecord` um `is_text_slot`, `has_content`, `text_nonempty_locales` ergänzt — DB-Wahrheit wird jetzt typgerecht aus `cms_assets` (Bild) bzw. `cms_section_fields` (Text/Toggle) gelesen. Neuer Aggregator `buildSectionAggregates`. Navigationsbereich liest jetzt **alle** `nav_area`-Werte (`main` mit eigenem Bucket je Top-Level, `footer`, `footer_bottom`, `meta`, `persona`, `home`) plus Fallback `rest:detail` für Detailseiten — die alte „ohne Navigationsbereich"-Halde ist weg.
- **Statuslogik geschärft, ~14.800 falsche Gelb-Treffer weg:** neuer Status `not_yet_configured` (optionaler Slot, kein Inhalt, keine Whitelist) ist **grün**. `editable_empty` von gelb → grün als „Pflegbar, aber leer (optional)". Damit gilt für Optional-Slots: kein Inhalt = kein Problem. `missing_whitelist` schlägt nur noch dann an, wenn DB tatsächlich Inhalt hat und Renderer liest. Statusreihenfolge `db_dupes → ui_fallback → renderer_orphan → unknown_section_type → section_missing → missing_whitelist → section_inactive → editable_empty → not_yet_configured → one_truth`. **Grün heißt „technisch im Lot", nicht automatisch „redaktionell fertig".**
- **UI (`SlotValidationView.tsx`):** Kopfbereich auf eine Zeile (KPIs + „Neu laden"), 4-Quellen-Erklärung in Info-Popover, Status-/Bereichs-/Baustein-Chips kompakter, Tabelle → Radix-`Collapsible`-Akkordeon, DB-Indikator labelt sich dynamisch als **„DB (Text)"** oder **„DB (Bild)"**, Status-Badges und Tooltips an die neuen Stati angepasst.
- **CTA-Block „Eine Wahrheit" abgeschlossen:** (1) CTA auf `anwendungen` wird wieder ausgespielt (Section-Key-Mismatch in `AnwendungenPage.tsx` behoben). (2) `CtaV1`-Renderer respektiert jetzt `show_phone` / `show_email` / `show_secondary` + leere Texte sauber (kein leerer Button mehr). (3) CTA-Feldfamilie (`phone_label`, `email_label`, `cta_secondary_*`, `show_*`) durchgängig pflegbar. (4) Neue Admin-Helper `CtaBackgroundSelect` / `CtaButtonColorSelect`. (5) Vier idempotente Migrationen für Whitelist-Einträge + Sicht-Toggle.
- **Daten 2026-06-02 (live aus DB):** 117 Seiten · 1.653 Sections · 44.955 Section-Felder · 747 Assets · 46.610 aktive Whitelist-Einträge · 110/110 CTA-Sections sichtbar im Wahrheits-Check. UI-Tab zeigt ca. **22.900+ grüne Treffer**, gelbe/rote Befunde nach Reklassifizierung deutlich unter dem alten Stand (vorher 14.800 gelb + 2.128 rot). Verbleibende Befunde sind benennbar: `missing_whitelist` (vor allem `link_*`-Familien), einzelne `card_v1` ohne Pflicht-Bild in Scroller/Hub-Raster, Reste `unknown_section_type` aus alten Tranchen, vereinzelt `section_inactive`.
- **Geänderte Dateien:** `src/features/admin/lib/truthSources.ts`, `src/features/admin/components/SlotValidationView.tsx`, `src/features/cms/components/sections/CtaV1.tsx`, `src/features/cms/contract/sectionTypes.ts`, `src/features/admin/components/PageEditor.tsx`, **neu** `src/features/admin/components/CtaBackgroundSelect.tsx` und `CtaButtonColorSelect.tsx`, `src/features/anwendungen/pages/AnwendungenPage.tsx`, `src/features/anwendungen/components/AnwendungDetailPage.tsx`, `src/components/PageLayout.tsx`, 4 Migrationen `supabase/migrations/20260602_*`. Doku: `docs/04-betrieb/wahrheits-check.md` aktualisiert, neuer Bericht `docs/04-betrieb/sprint-wahrheits-check-2026-06-02-bericht.md`, `.lovable/plan.md`.
- **Scope-Treue / Hygiene:** Keine Änderung an Produktdatenbank (`src/lib/supabase/client.ts`, PDP-Routen), Public-Renderer-Struktur, Navigation, Footer, Breadcrumb, i18n-JSON. Keine neue RPC. Kein direkter Tabellenschreibzugriff aus dem Frontend dazugekommen. Migrationen idempotent. `KNOWN_UI_FALLBACKS` bleibt leer (Fallback-Inventar weist keinen aktiven Hardcode aus) — Disziplin-Pflege beibehalten, wenn ein Hardcode auftaucht. `cms:audit:contract` + `renderer-fallback-inventory` unverändert stabil.
- **Empfehlung nächste Etappen:** (1) `cms-light-whitelist-luecken-nachziehen-1` — Whitelist-Seeding für `missing_whitelist`-Befunde, vor allem `link_*`. (2) `cms-light-renderer-orphan-cleanup-1` — verwaiste DB-Inhalte aufräumen. (3) `cms-light-baustein-workspaces-wechselteaser-hero-content-1` aus dem Vorsprint. Admin-Login bleibt **letzter** Schritt vor Public-Live.

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-hygieneabschluss-standardkarte-eine-wahrheit-1", UI-only)

## Eine Wahrheit für Standardkarten (`card_v1`)

- **Zentraler Resolver `resolveCardVisibility`** (neu in `src/features/cms/lib/cardVisibility.ts`): Liefert pro Karte `imageVisible`, `iconVisible`, `iconName`, `featuresVisible[0..4]`, `linksVisible[1..3]`, `effectiveContainerKind` und den erwarteten Bild-/Icon-Slot (`expectedSlot` + `expectedSlotRequired`). Reine Funktion ohne Seiteneffekte — wird vom Admin-Workspace UND von den Public-Renderern gemeinsam gelesen. Damit gibt es keine Admin-Wahrheit mehr, die von der Render-Wahrheit abweicht.
- **Konventionen festgezurrt:** `*_enabled`-Felder: `"1"` = an, `"0"` = aus, leer/null = **an, wenn Inhalt vorhanden** (Back-Compat — viele Karten haben kein `enabled` gepflegt). `icon` (Lucide-Name) leer = Icon aus, kein automatisches Default-Icon. In `cards_v1`/`product_scroller_v1` hat ein vorhandenes Bild oder Bildicon Vorrang vor dem Lucide-Icon.
- **Renderer auf Resolver gezogen:** `CardsSectionV1` respektiert jetzt `image_enabled` (Bild verstecken, ohne Asset zu löschen) und `features_N_enabled` (einzelne Features ausblendbar). `FeatureGridV1` verwendet den Resolver für die Icon-Wahrheit. `CmsProductSolutionShell` rendert kein `CheckCircle2`-Default-Icon mehr, wenn kein `icon`-Wert und kein positionsbasierter Anwendungen-Default vorhanden ist — leer = nichts (nur Bild/Text).
- **`containerHintFor` kennt `parentSectionKey`:** `cards_v1` + `section_key=products` wird im Workspace jetzt als **Kartenscroller** mit Pflicht-Bild geführt (vorher: „Kartenraster" mit optionalem Bild). Damit stimmen Workspace-Beschriftung und tatsächliche redaktionelle Sichtweise auf B-071-artigen Sections überein. Alle anderen `cards_v1`-Sections bleiben „Kartenraster" mit optionalem Bild.
- **Doppelte Asset-Liste entfernt:** `SectionAssetsBlock` wird für `card_v1` jetzt **nur noch** im `BildkartenCardWorkspace`-Slot gerendert, nicht zusätzlich darunter. Vorher griff das Pilot-Gate nur für `gebaeudekommunikation.tuersprechanlagen` — jetzt für alle `card_v1`. Andere Section-Typen (Hero, Content, Teaser, …) bleiben unverändert.
- **Workspace-Zähler stimmt mit Render:** „Features · X von 5 aktiv" und „Links · X von 3 aktiv" zählen jetzt **dieselbe** Wahrheit wie der Public-Renderer (`resolveCardVisibility`), nicht mehr nur strikt `=== "1"`.
- **Geänderte Dateien (UI/Renderer-only):** **neu** `src/features/cms/lib/cardVisibility.ts`; **geändert** `src/features/cms/components/sections/CardsSectionV1.tsx`, `src/features/cms/components/sections/FeatureGridV1.tsx`, `src/features/cms/components/CmsProductSolutionShell.tsx`, `src/features/admin/lib/cardFieldsWorkspaceGroups.ts` (containerHintFor + parentSectionKey), `src/features/admin/components/BildkartenCardWorkspace.tsx` (Resolver-Nutzung, parentSectionKey-Weitergabe), `src/features/admin/components/PageEditor.tsx` (doppelte `SectionAssetsBlock` für alle `card_v1` entfernt).
- **Audits 2026-06-01 (stabil):** `cms:audit:contract` 15 OK · 7 Warnung · 0 Konflikt. `cms:audit:renderer` grün. `cms:audit:renderer-fallback-inventory` 82 Pages · G0=2 · G1=4 · S1=54 · S2=19 · S3=2 · P1=1 (unverändert). `tsc --noEmit` grün. `npm run build` läuft über Lovable-Harness automatisch.
- **Scope-Treue:** **Keine** DB-Änderung, **keine** Migration, **keine** RPC-Änderung, **keine** Whitelist-Änderung, **keine** i18n-Datei berührt, **keine** Inhalte/Bilder/Feldwerte überschrieben, **keine** Public-Route, **keine** Navigation, **kein** Footer, **kein** Breadcrumb, **keine** Produktdatenbank-Berührung. Renderer-Logik wurde geändert (image_enabled / features_N_enabled werden jetzt respektiert, CheckCircle2-Default-Icon entfernt) — das ist gewollt und Teil der „Eine Wahrheit"-Etappe.
- **Restliste Seitenstruktur nach PDF-Vorlage Andreas Kriebel:** weiter offen; nächste Etappen siehe `docs/04-betrieb/naechste-schritte.md`. Konkret offen aus PDF: (1) Hero-/Wechselteaser-Workspace analog `BildkartenCardWorkspace` (`teaser_2col_v1`, `hero_v1`, `content_v1`) — Etappe `cms-light-baustein-workspaces-wechselteaser-hero-content-1`, (2) flächiger Audit der Multi-Link-Karte (`link_N_*`-Renderer), (3) Download-Karte / `download_item_v1`-Migration zu `card_v1`, (4) Tags-Modul (Klärpunkt, heute ohne Renderer).
- **Empfohlene nächste Etappe:** `cms-light-baustein-workspaces-wechselteaser-hero-content-1`.

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-bildkarten-workspace-fuer-alle-card-v1-1", UI-only / Doku)

## Bildkarten-Workspace gilt für ALLE Standardkarten

- **Pilot-Gate entfernt:** Der reiche Akkordeon-Workspace `BildkartenCardWorkspace` (ursprünglich nur unter B-026 „Außenstationen" / B-027 „Innenstationen" auf `gebaeudekommunikation.tuersprechanlagen`) wird jetzt für **jede** `card_v1` im Tree verwendet — egal auf welcher Seite und unter welchem Container. Damit haben B-538/B-539-artige Karten überall die gleiche Bedienlogik (Inhalte → Bild → Icon → Features → Links → Technik).
- **Container-Hinweis ersetzt Pilot-Beschriftung:** Header-Badge „Bildkarte / Pilot B-026/B-027" ist weg. Statt dessen steht oben **„Standardkarte" + Container-Label** (z. B. „Kartenraster", „Kartenscroller", „Hub-Raster", „Produktfilter-Raster", „Feature-/Icon-Raster", „Download-Liste") aus `containerHintFor(parentSectionType)`. Parent-Anzeige liest jetzt die Container-Headline statt hartcodierter Pilot-Labels.
- **„Bild fehlt"-Warnung container-abhängig:** Erscheint **nur**, wenn der Container den jeweiligen Slot wirklich erwartet — `image` (Scroller), `thumbnail` (Hub-/Filter-Raster) oder `icon_image` (Feature-/Icon-Raster). Im Kartenraster (`cards_v1`) gibt es nur einen leisen Hinweis „Bild empfohlen — Textkarte hier erlaubt", keine rote Warnung mehr. Tone des Bild-Akkordeons wechselt entsprechend (warn nur bei Pflicht-Slot ohne Asset).
- **Asset-Slots werden nicht mehr global versteckt:** Die alte Pilot-Sonderlogik hat `thumbnail` und `icon_image` aus dem Asset-Bereich weggefiltert. Jetzt sind **alle drei Slots** (`image`, `thumbnail`, `icon_image`) für jede Standardkarte anlegbar; welcher davon im aktuellen Container wirklich gerendert wird, steht im Hinweis darüber. Wer im Hub-Raster steckt, kann das Thumbnail direkt im selben Workspace ergänzen.
- **`CardFieldsWorkspace` wird nicht mehr aufgerufen** (für `card_v1` greift jetzt überall der reiche Bildkarten-Workspace). Datei bleibt vorhanden, aber unreferenziert — wird in einer späteren Aufräum-Etappe entfernt, sobald sich der vereinheitlichte Workspace im Alltag bestätigt hat.
- **Prüfbeispiele (kein Inhalt geändert):** B-538/B-539/B-540/B-2195 (Pilot Türsprechanlagen) — unverändertes Verhalten, weil sie schon den richtigen Workspace hatten. B-1237 (Kartenraster `cards_v1` unter B-071, ohne Bild) — keine rote „Bild fehlt"-Warnung mehr, nur Hinweis „Bild empfohlen". B-624/B-626 (Scroller `product_scroller_v1` ohne Bild) — Warnung „⚠ Bild fehlt" bleibt korrekt rot. B-591/B-592/B-593 (Kartenraster B-082) — Standardkarte mit Container-Label „Kartenraster", alle Gruppen sichtbar.
- **Geänderte Dateien (UI-only):** `src/features/admin/components/BildkartenCardWorkspace.tsx` (container-aware Header + Medien-Akkordeon, neue Props `parentSectionType` / `hasThumbnail` / `hasIconImage`, Import `containerHintFor`), `src/features/admin/components/PageEditor.tsx` (Pilot-Gate gegen `gebaeudekommunikation.tuersprechanlagen` + `aussenstationen`/`innenstationen` entfernt, friendly Parent-Label aus `valueFor(parentKey, "headline", …)`, keine Slot-Filterung mehr; `CardFieldsWorkspace`-Pfad ist für `card_v1` jetzt unerreichbar).
- **Audits 2026-06-01 (stabil):** `cms:audit:contract` 15 OK · 7 Warnung · 0 Konflikt. `cms:audit:renderer-fallback-inventory` 82 Pages · G0=2 · G1=4 · S1=54 · S2=19 · S3=2 · P1=1. `tsc --noEmit` grün. `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).
- **Scope-Treue:** UI-only. **Keine** DB-Änderung, **keine** Migration, **keine** neue RPC, **keine** Whitelist-Änderung, **keine** i18n-Datei, **keine** Inhalte/Bilder/Feldwerte überschrieben, **keine** Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung, **keine** Produktdatenbank-Berührung, **keine** automatische Kartenmigration. Tree-Sprungverhalten (Single-Open, kein Auto-Scroll bei internem Klick) und Begriffsabgleich (B-071/B-082 als Kartenscroller/Kartenraster) aus der Vorrunde bleiben unverändert.
- **Empfohlene nächste Etappe:** `cms-light-baustein-workspaces-wechselteaser-hero-content-1` — analoge Akkordeon-Workspaces für `teaser_2col_v1`, `hero_v1`, `content_v1`.

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-standardkarte-admin-maske-vereinheitlichen-1", UI-only / Doku)

## Standardkarte: Admin-Maske vereinheitlicht

- **Allgemeiner `CardFieldsWorkspace` an die Pilot-Bedienlogik angeglichen** (UI-only): jede `card_v1` außerhalb des Türsprechanlagen-Pilots wird jetzt in derselben Akkordeon-Reihenfolge gepflegt — Grunddaten → Medien → Sichtbarkeit → Features → Links/CTA → Technisch/Legacy. Reihenfolge und Gruppen sind aus `BildkartenCardWorkspace` übernommen, die harte Türsprechanlagen-Sonderlogik (globale Slot-Ausblendung, Pilot-Defaultwerte) bewusst nicht.
- **Container-Hinweise im Arbeitsbereich (neu):** Workspace-Header zeigt redaktionellen Container-Namen + Kurzhinweis („Kartenraster · Bild ist empfohlen, aber nicht Pflicht — eine Textkarte ohne Bild ist hier legitim.") aus `containerHintFor(parentSectionType)`. Medien-Akkordeon zeigt zusätzlich, welcher Slot (`image`/`thumbnail`/`icon_image`) im aktuellen Container überhaupt wirksam ist und ob ein fehlender Slot eine Warnung ist.
- **Leere Gruppen bleiben sichtbar mit Empty-State-Text** (`emptyGroupHint`): z. B. „Für diese Karte sind noch keine Sichtbarkeits-Schalter angelegt." statt unsichtbarem Akkordeon. „Technisch/Legacy" bleibt zugeklappt, solange leer.
- **Parent-Badge im Baum redaktionell verständlich (neu):** statt nur „Teil von products" jetzt „Teil von Kartenraster B-082" / „Teil von Kartenscroller B-244" / „Teil von Hub-Raster …" / „Teil von Feature-/Icon-Raster …". Technischer `section_key` bleibt im Tooltip. Implementiert in `SectionLevel.tsx` + `SectionRowView.tsx` über `blockTypeStyle(parent.section_type).label` und Section-Kurz-ID.
- **Prüfbeispiele bestätigt:** B-538/B-539/B-540/B-2195 (Pilot) bleiben unangetastet. B-591/B-592/B-593 (Kartenraster auf `zutrittskontrolle.zufahrten-parkplaetze`, Parent B-082) nutzen den neuen Workspace mit allen Gruppen, korrektem Container-Hinweis und „Bild optional"-Erklärung. B-082 = `cards_v1` = Kartenraster. B-071 = `cards_v1` = Kartenraster (kein Scroller; Render-Realität und Admin-Bezeichnung stimmen überein). Bilder können über den Asset-Bereich (`SectionAssetsBlock`) ergänzt werden, wenn Redaktion das will — kein Upload in dieser Etappe.
- **Geänderte Dateien (UI-only):** `src/features/admin/lib/cardFieldsWorkspaceGroups.ts` (neue Helper `containerHintFor` / `emptyGroupHint`), `src/features/admin/components/CardFieldsWorkspace.tsx` (Container-Header + Medien-Slot-Hinweis + Empty-State), `src/features/admin/components/PageEditor.tsx` (reicht `parentSectionType` durch), `src/features/admin/components/tree/SectionRowView.tsx` (neue Prop `parentInfo`), `src/features/admin/components/tree/SectionLevel.tsx` (baut `parentInfo` aus `allSections` + `blockTypeStyle`). Vollbericht: `docs/04-betrieb/standardkarte-admin-maske-vereinheitlichen.md`.
- **Audits 2026-06-01:** `cms:audit:contract` 15 OK · 7 Warnung · 0 Konflikt (stabil). `cms:audit:contract-drift` D7=0 · D8=0 · D9=25 · D10=28 (D9-Verschiebung kommt aus DB-Tranchen-Triage, **nicht** aus dieser UI-Etappe — separat zu prüfen). `cms:audit:renderer-fallback-inventory` 82 Pages · G0=2 · G1=4 · S1=54 · S2=19 · S3=2 · P1=1 (stabil). `tsc --noEmit` grün. `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).
- **Scope-Treue:** UI-only / Doku. Keine DB-Änderung, keine Migration, keine neue RPC, keine Whitelist-Änderung, keine i18n-Dateien, keine Inhalte/Bilder/Feldwerte überschrieben, keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung, keine Produktdatenbank, keine automatische Kartenmigration, keine neuen Section-Type-Familien, keine Seedings. Pilot-Workspace `BildkartenCardWorkspace` unverändert.
- **Empfohlene nächste Etappe:** `cms-light-baustein-workspaces-wechselteaser-hero-content-1`.


---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-admin-realitaetsabgleich-raster-scroller-standardkarte-1", UI-only / Doku)

## Admin-Realitätsabgleich: Raster, Scroller, Standardkarte

- **Admin-Begriffe vereinheitlicht** (nur Labels/Hints, keine DB-/Whitelist-/Renderer-Änderung):
  - `card_v1` = **Standardkarte**
  - `cards_v1` = **Kartenraster**
  - `product_scroller_v1` = **Kartenscroller**
  - `card_grid_v1` = **Hub-Raster**
  - `catalog_filter_grid_v1` = **Produktfilter-Raster**
  - `feature_grid_v1` = **Feature-/Icon-Raster**
  - `download_list_v1` = **Download-Liste**
- **B-071-Befund geklärt:** auf `zutrittskontrolle.tueren-tore / products` ist B-071 technisch `cards_v1`, also **Kartenraster, kein Kartenscroller**. Die enthaltene Karte B-1237 ohne Bild ist im Raster **legitim und kein Fehler** (Textkarte zulässig).
- **Bildwarnungen jetzt containerabhängig:**
  - Scroller (`product_scroller_v1`) ohne `image` → **Warnung** (Bild dort Pflicht).
  - Raster (`cards_v1`) ohne `image` → **kein Fehler** (Textkarte erlaubt), nur neutraler Hinweis.
  - Hub-Raster (`card_grid_v1`) / Produktfilter-Raster (`catalog_filter_grid_v1`) ohne `thumbnail` → **Warnung**.
  - Feature-/Icon-Raster (`feature_grid_v1`) ohne Icon (`icon_lucide` oder `icon_image`) → **Warnung**.
- **Geänderte Dateien (UI-only):** `src/features/admin/lib/blockTypeStyle.ts` (Labels), `src/features/admin/lib/editorialSectionKind.ts` (containerabhängige Klassifizierung & Hinweise), `src/features/admin/lib/containerLayoutRules.ts` (`effective_modules` für `cards_v1` an Renderer-Realität angeglichen). Vollbericht: `docs/04-betrieb/admin-raster-scroller-standardkarte-realitaetsabgleich.md`.
- **Scope-Treue:** UI-only / Doku. Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung. Keine DB-Änderung, keine Migration, keine RPC, keine Whitelist-, i18n-, Inhalts-, Bild- oder Produktdatenbank-Änderung.
- **Empfohlene nächste Etappe:** `cms-light-baustein-workspaces-wechselteaser-hero-content-1`.

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-standardkarte-modulreview-und-seedings-klein-1", read-only, nur Bericht)

## Standardkarte: Modulreview & kleine Seedings (read-only)

- **Die 12 echten Standardkarten-Befunde aus dem Modulmodell wurden namentlich geprüft und bewertet** — kein Schreibzugriff, kein Seeding, keine Renderer-/Whitelist-/i18n-Änderung. 569 legitime Textkarten in `cards_v1` bewusst nicht angefasst.
- **Scroller-Bildlücken (2):** `gebaeudemanagement.digitale-namensanzeige` / `products__adx5` (B-624) und `products__briefkasten` (B-626) unter Container `products` (B-244, `product_scroller_v1`). Textfelder DE+EN vollständig, nur `image`-Asset fehlt. Bewertung: echte Inhaltslücke, redaktioneller Bildauftrag als eigene Mini-Etappe.
- **`features.*` in `cards_v1` (10):** 4 Karten auf `eingangssysteme.funktionalitaet` (Parent B-211): `card_accessControl` (B-1109), `card_gebaeudesicherheit` (B-1111), `card_tuerkommunikation` (B-1108), `card_wayfinding` (B-1112). 6 Karten auf `eingangssysteme.material` (Parent B-213): `card_aluminium` (B-1096), `card_bronze_baubronze` (B-1099), `card_edelstahl` (B-1097), `card_messing_satiniert` (B-1098), `card_mineralwerkstoff` (B-1101), `card_pulverbeschichtung` (B-1100). Inhalte sind DE+EN gepflegt, Renderer `CardsSectionV1` rendert `features.*` heute nicht → unsichtbarer Inhalt. Empfehlung: eigener Renderer-Sprint, **keine Inhaltsverschiebung in diesem Sprint**.
- **Top-Level-`card_v1` (4):** `category-grid.standard-briefkaesten` (B-1199), `.architektur-entry` (B-1200), `.individueller-metallbau` (B-1201), `.signage` (B-1202) — alle auf `produkte.eingangsloesungen.kopie` mit `page.status=archived` / `page.is_active=false`. **Public nicht sichtbar.** Empfehlung: späterer Archivseiten-Cleanup, kein Reparenting jetzt.
- **S1/S2-Seedings:** geprüft, **kein Seeding angewendet, kein Dry-Run-SQL erzeugt**. Begründung: für die 12 Befunde gibt es keine sichere idempotente Seed (Bilder = Redaktion, Features = bereits gepflegt).
- **Admin-Hinweise:** `CardPresetBadge` deckt alle drei Befundklassen bereits ab (empfohlen-aber-leer / vorhanden-aber-ignoriert / Container-Drift). **Keine UI-Änderung in diesem Sprint.**
- **Audits 2026-06-01 (stabil):** `cms:audit:contract` 15 OK · 7 Warnung · 0 Konflikt. `cms:audit:contract-drift` D7=0 · D8=0 · D9=0 · D10=28. `cms:audit:renderer-fallback-inventory` 82 Pages · G0=2 · G1=4 · S1=54 · S2=19 · S3=2 · P1=1. `cms:audit:d3-d5-triage` DB-Lauf lief in einen Read-Replica-Timeout (kein Schreibzugriff); letzter erfolgreicher Stand D3=2004 / D5=2000 bleibt Referenz.
- **Vollbericht:** `docs/04-betrieb/standardkarte-modulreview-und-seedings-klein.md`.
- **Scope-Treue:** keine DB-Änderung, keine Migration, keine RPC, keine Inhalte/Bilder/Feldwerte/Whitelist/i18n/Public-Renderer/Routen/Navigation/Footer/Breadcrumb/Produktdatenbank verändert. Kein TS/TSX geändert.
- **Empfohlene nächste Etappe:** `cms-light-baustein-workspaces-wechselteaser-hero-content-1` — Akkordeon-Workspaces für `teaser_2col_v1`, `hero_v1`, `content_v1`.

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-standardkarte-modulmodell-statt-kartenvarianten-1", read-only + UI-only)

## Standardkarte: Modulmodell statt starrer Kartenvarianten

- **Neues Modulmodell festgeschrieben (read-only):** `src/features/cms/contract/cardModules.ts` beschreibt die Standardkarte `card_v1` als Kombination aus 11 Modulen (`eyebrow`, `title`, `description`, `image`, `thumbnail`, `icon_lucide`, `icon_image`, `features`, `links`, `cta`, `download`). Pro Modul: zugehörige Textfelder, Asset-Slots, Toggle-Felder, Renderer-Support und Container-Wirksamkeit. Keine neuen DB-Felder, keine Whitelist-Erweiterung; `tags.0..4` bleibt Klärpunkt und ist **nicht** als Modul aufgenommen.
- **Presets neu eingeordnet:** `image_card`, `thumbnail_card`, `icon_card_lucide`, `icon_card_image`, `multi_link_card`, `text_card`, `download_card` bleiben — aber als **redaktionelle Startzustände/Ansichten**, nicht als starre Typen. Matrix Preset → Module steht in `docs/04-betrieb/standardkarte-modulmodell-latest.md` (Abschnitt C).
- **Container-Regeln um Modulwirksamkeit erweitert:** `src/features/admin/lib/containerLayoutRules.ts` listet pro Container (`cards_v1`, `product_scroller_v1`, `card_grid_v1`, `catalog_filter_grid_v1`, `feature_grid_v1`, `download_list_v1`) jetzt `effective_modules` (wirksam), `ignored_modules` (ignoriert) und `recommended_modules` (empfohlen). Neuer Helper `getEffectiveCardModulesForContainer(parent)`.
- **Admin-Anzeige UI-only erweitert:** `CardPresetBadge` zeigt zusätzlich zu Preset/Container/Layout jetzt vier neue Zeilen: **Wirksam & aktiv** · **Vorhanden, aber von diesem Container nicht gerendert** (gelber Hinweis) · **Für diesen Container empfohlen, aber noch leer** (neutral, kein Fehler) · **Preset-Startzustand erwartet**.
- **„570 Bildkarten ohne Bild" neu bewertet:** mit Modul-Brille bleiben davon 2 echte Inhaltslücken im Scroller, 569 legitime **Textkarten in `cards_v1`** (kein Fehler), 10 Karten mit befüllten `features.*` (Pflege-Verschwendung — Container ignoriert) und 4 top-level-Karten ohne Container (Drift, manuell prüfen). Karten ohne Bild werden nicht mehr pauschal als Auffälligkeit gezählt.
- **CardFieldsWorkspace bewusst nicht angefasst:** alle DB-Felder bleiben sichtbar. Eine Pro-Feld-Wirksamkeits-Markierung („wirksam / nicht wirksam / Legacy") ist als eigene Etappe geplant — würde sonst jeden Feldknoten umbauen.
- **Audits 2026-06-01 (stabil):** `cms:audit:contract` 15 OK · 7 Warnung · 0 Konflikt. `cms:audit:contract-drift` D1=0 · D8=0 (unverändert). `cms:audit:d3-d5-triage` D3=2004 / D5=2000 (unverändert). `cms:audit:renderer-fallback-inventory` 82 Pages · G0=2 · G1=4 · S1=54 · S2=19 · S3=2 · P1=1. `tsc --noEmit` grün. `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).
- **Vollbericht:** `docs/04-betrieb/standardkarte-modulmodell-latest.md`.
- **Scope-Treue:** keine DB-Änderung, keine Migration, keine neue RPC, keine Inhalte/Bilder/Feldwerte/Whitelist/i18n/Public-Renderer/Routen/Navigation/Footer/Breadcrumb/Produktdatenbank verändert. Keine automatische Kartenmigration, keine neuen Section-Type-Familien. Code-Änderungen ausschließlich: `cardModules.ts` (neu), `containerLayoutRules.ts` (erweitert), `CardPresetBadge.tsx` (UI-Erweiterung).
- **Empfohlene nächste Etappe:** `cms-light-standardkarte-modulreview-und-seedings-klein-1` — gezielte Kleinst-Seedings auf Basis der Modul-Brille (2 Scroller-Karten ohne Bild, 10 `cards_v1` mit `features.*`-Werten, 4 top-level-Karten).

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-card-container-preset-review-und-layoutregeln-1", read-only + UI-only)

## Container × Preset Review + Layoutregeln (read-only)

- **Container-/Layoutregeln maschinenlesbar fixiert:** neue Datei `src/features/admin/lib/containerLayoutRules.ts` beschreibt für `cards_v1`, `product_scroller_v1`, `card_grid_v1`, `catalog_filter_grid_v1`, `feature_grid_v1`, `download_list_v1` jeweils Layout, Spaltenzahl, erwarteten Bildslot, Bildformat (z. B. `aspect-[4/3]` bei `cards_v1`/`product_scroller_v1`) und die fachlich passenden Presets. Read-only Metadaten, keine Renderer-/DB-Änderung.
- **Admin-Ergänzung UI-only:** `CardPresetBadge` zeigt jetzt zusätzlich zum Preset (Kartenart) auch Container-Typ, Layout-Beschreibung, erwarteten Bildslot und Bildformat, plus gelben Hinweis, wenn Preset und Container nicht zusammenpassen (`presetMatchesContainer`).
- **Aktive `card_v1`-Verteilung (DB, 2026-06-01):** 701 aktiv — 639 in `cards_v1` (69 mit `image`, **570 ohne `image`-Asset**), 33 in `product_scroller_v1` (31 mit / 2 ohne Bild), 18 in `catalog_filter_grid_v1` (Thumbnail), 4 in `feature_grid_v1` (Lucide), 3 in `card_grid_v1` (Thumbnail), **4 top-level ohne Container (Drift)**. Im Bestand 0 Instanzen von `icon_card_image`, `multi_link_card`, `download_card`.
- **Matrix Container × Preset:** dokumentiert in `docs/04-betrieb/card-container-preset-layoutregeln-latest.md` (Abschnitte B–D), Maschinenform in `scripts/cms/output/card-container-preset-review-latest.json`. Zielstandards: `cards_v1`→`image_card`, `product_scroller_v1`→`image_card`, `card_grid_v1`/`catalog_filter_grid_v1`→`thumbnail_card`, `feature_grid_v1`→`icon_card_image`/`icon_card_lucide`, `download_list_v1`→`download_card` (geplant, Renderer filtert heute auf `download_item_v1`).
- **Akkordeon-Roadmap priorisiert** (read-only): hoch `teaser_2col_v1`, `hero_v1`; mittel `content_v1`, `cta_v1`, `faq_v1`; niedrig `stats_v1`; später `contact_block_v1`. Nichts davon umgesetzt — Vorlage bleibt `CardFieldsWorkspace`, ein generischer Helper soll erst nach dem ersten Workspace-Roll-out extrahiert werden.
- **Audits 2026-06-01 (stabil):** `cms:audit:contract` 15 OK · 7 Warnung · 0 Konflikt. `cms:audit:contract-drift` D1=0 · D8=0 (unverändert). `cms:audit:d3-d5-triage` D3=2004 / D5=2000. `cms:audit:renderer-fallback-inventory` 82 Pages · G0=2 · G1=4 · S1=54 · S2=19 · S3=2 · P1=1. `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).
- **Vollbericht:** `docs/04-betrieb/card-container-preset-layoutregeln-latest.md`.
- **Scope-Treue:** keine DB-Änderung, keine Migration, keine neue RPC, keine Inhalte/Bilder/Feldwerte/Whitelist/i18n/Public-Renderer/Routen/Navigation/Footer/Breadcrumb/Produktdatenbank verändert. Keine automatische Kartenmigration, keine neuen Section-Type-Familien. Code-Änderungen ausschließlich: `containerLayoutRules.ts` (neu) und `CardPresetBadge.tsx` (UI-Erweiterung).
- **Empfohlene nächste Etappe:** `cms-light-baustein-workspaces-wechselteaser-hero-content-1` — Akkordeon-Workspaces für `teaser_2col_v1` und `hero_v1` nach demselben Prinzip wie `CardFieldsWorkspace`.

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-standardkarte-admin-arbeitsbereich-vollausbau-1")

## Standardkarte: Admin-Arbeitsbereich als Akkordeon (UI-only)

- **Neue Admin-Komponente `CardFieldsWorkspace`** ersetzt für `card_v1`-Sections (außerhalb des Bildkarten-Pilots) die flache Feldliste im `PageEditor` durch einen Akkordeon-Arbeitsbereich mit 6 redaktionellen Gruppen: **Grunddaten · Medien & Icon · Sichtbarkeit (Toggles) · Features · Links/CTA · Technisch/Legacy**. Jede Gruppe zeigt Feldanzahl und ein „n Hinweis"-Badge für Einträge mit `fehlt in DB` / `nicht speicherbar`. Default-Aufklapp-Verhalten: Gruppen mit Inhalt offen, „Technisch/Legacy" zu (außer Hinweise).
- **Neuer Helper `cardFieldsWorkspaceGroups.ts`** klassifiziert jeden `field_key` allgemein (`classifyCardFieldKey`) und liefert pro Preset/Gruppe einen kurzen Bedeutungs-Hinweis (`presetHintForGroup`). Vorhandene DB-Felder werden nie versteckt — Unbekanntes landet in „Technisch/Legacy" und bleibt sichtbar.
- **`CardPresetBadge` und `SectionContractStatus` bleiben sichtbar** über dem Workspace. Asset-Slots (Bilder/Thumbnails/Icon-Bilder) laufen weiter unverändert über `SectionAssetsBlock` — die Pilot-Annahme „Slot `thumbnail`/`icon_image` global ausblenden" wird NICHT in den neuen Workspace übernommen.
- **Bildkarten-Pilot unverändert.** `BildkartenCardWorkspace` läuft weiter exklusiv für Page `gebaeudekommunikation.tuersprechanlagen` unter Containern `aussenstationen`/`innenstationen` (B-538/B-539/B-540/B-2195). Pilot-Pfad greift VOR der neuen `card_v1`-Verzweigung.
- **Speichersicherheit unverändert:** `EditableField` bleibt nur editierbar, wenn DB-Zeile + Whitelist vorhanden sind. Fehlende DB-Zeilen werden nicht still angelegt; `nicht speicherbar` bleibt als rotes Badge sichtbar. `renderEntry` wird aus dem `PageEditor` geteilt — kein neuer Schreibweg, keine neue RPC.
- **Keine Seedings in diesem Sprint.** S1 (`card_v1.description`/EN-Lücken) und S2 (preset-spezifische Whitelist-Tranchen) sind im Vollausbau-Bericht dokumentiert, aber nicht ausgeführt — sie sind Aufgabe der Folge-Etappe.
- **Audits 2026-06-01** (alle stabil): `cms:audit:contract` 15 OK · 7 Warnung · 0 Konflikt. `cms:audit:contract-drift` unverändert (UI-Etappe). `cms:audit:d3-d5-triage` D3 2004 / D5 2000. `cms:audit:renderer-fallback-inventory` 82 Pages · G0 2 · G1 4 · S1 54 · S2 19 · S3 2 · P1 1. `tsc --noEmit` grün. `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).
- **Vollbericht:** `docs/04-betrieb/standardkarte-admin-arbeitsbereich-vollausbau.md`.
- **Scope-Treue:** keine DB-Änderung, keine Migration, keine neue RPC, keine Inhalte/Bilder/Feldwerte verändert, keine Whitelist geändert, keine i18n-Datei, keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung, keine Produktdatenbank berührt, keine Kontakt-/Download-/News-/Karriere-Migration, keine neue Section-Type-Familie für Kartenvarianten.
- **Empfohlene nächste Etappe:** `cms-light-standardkarte-sichere-seedings-und-preset-review-1` (Preset-Review pro Container in Stichproben ≤ 10 Karten, dann gezielte S1-/S2-Seedings mit idempotenter Migration und Drift-Audit davor/danach).

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-standardkarte-admin-presets-und-sichere-seedings-1")

## Standard-Karte: Preset im Admin sichtbar (UI-only)


---

# Aktueller Stand — Vorgängerstand

Stand: 2026-06-01 (Sprint „cms-light-zielbausteine-standardkarte-und-migrationsfahrplan-1", read-only)

## Zielbausteine + Standard-Karte + Migrationsfahrplan (read-only)

- **Verbindliches Zielmodell festgeschrieben:** `docs/04-betrieb/zielbausteine-standardkarte-und-migrationsfahrplan.md` (Abschnitte A–G). Hero=`hero_v1`, Intro=`content_v1`, Wechselteaser=`teaser_2col_v1`, Karten-Raster=`cards_v1`+`card_v1`, Karten-Scroller=`product_scroller_v1`+`card_v1`, Stats=`stats_v1`+`stat_v1`, FAQ=`faq_v1`, CTA=`cta_v1`, Referenzprojekt=Detail-Template (kein eigener Section-Type), Produktbereichs-Filter=`catalog_filter_grid_v1` (Spezialfall, Produktdatenbank tabu).
- **Flexible Standard-Karte als Zielstandard bestätigt:** `card_v1` bleibt kanonischer Kartentyp; 7 Varianten als Presets dokumentiert (`image_card`, `thumbnail_card`, `icon_card_lucide`, `icon_card_image`, `multi_link_card`, `text_card`, `download_card`). Neue Exporte: `STANDARD_CARD_PRESETS` und Header-Block in `card_v1`-Vertrag in `src/features/cms/contract/sectionTypes.ts`. Keine neuen Section-Types, keine Renderer-Änderung, keine Whitelist-Änderung, Aliase werden weiter lesend unterstützt.
- **Offener Klärpunkt `tags.0..4`** an Standard-Karte: bewusst NICHT in den Vertrag aufgenommen — Aufnahme erst, wenn Whitelist + Renderer in einer eigenen Etappe gleichzeitig nachgezogen werden.
- **Kontakt-Migrationsfahrplan (Dry-Run):** B-550/551/552 auf `kontakt.root` heute alle `content_v1`. Ziel `contact_block_v1` ist **nicht** als reine Typkorrektur möglich — B-551 (cards) und B-552 (form) sind fachlich kein Kontaktblock. Echte Inhaltsmodellierung nötig. Keine Migration angewendet.
- **Download-Migrationsfahrplan (Dry-Run):** P-081 `service.downloads` hat 24 Sections. Nur **B-341 `dokumente`** (heute `content_v1`) ist Kandidat für `download_list_v1` + `download_card`. Die übrigen `cards_v1` (quickLinks/rma/bestellung/akademie) sind Link-Karten, keine Download-Listen. Datei-Asset-Modell ist offen. Keine Migration angewendet.
- **News / Karriere:** kein dedizierter Section-Type, kein technischer Ausbau in diesem Sprint — sauber abgegrenzt als „später prüfen" (Optionen: `cards_v1`+Standard-Karten oder eigener Seitentyp).
- **Admin-Feldplan unverändert:** `buildAdminFieldPlan.ts` versteht die Presets bereits über `detectCardVariant` (Sprint 2l); variantenfremde Pflichtfelder werden ausgeblendet, vorhandene DB-Felder bleiben pflegbar. Keine Anpassung in diesem Sprint nötig.
- **Audits frisch (2026-06-01):** Contract-Audit 15 OK · 7 Warnung · 0 Konflikt. Contract-Drift D1 0 · D2 2649 · D3 3502 · D4 3074 · D5 3416 · D6 184 · D7 0 · D8 0 · **D9 25** · D10 28 · D0 5 (unverändert ggü. 2026-05-29). D3/D5-Triage (nur aktive Sections): D3 2004 (S5 256 · S3 1541 · S4 88 · S2 38 · S1 5 · S7 76), D5 2000 (S5 256 · S3 1541 · S4 88 · S2 38 · S1 5 · S7 72). Renderer-Inventar 79 Pages: G0 2 · G1 4 · S1 54 · S2 19 · S3 2 · P1 1 (59 low · 20 medium · 2 high · 1 kein CMS-Ziel). `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).
- **Empfohlene nächste Etappe:** `cms-light-standardkarte-admin-presets-und-sichere-seedings-1` — Preset-Badge im Admin sichtbar machen, dann S1-Pilot-Seeding (5 Sections), danach Whitelist-Tranchen pro Container-Klasse. Kontakt- und Download-Migration NICHT Teil der nächsten Etappe.
- **Scope-Treue:** keine DB-Änderung, keine Migration, keine neue RPC, keine Inhalte/Bilder/Feldwerte/Whitelist/i18n/Public-Renderer/Routen/Navigation/Footer/Breadcrumb/Produktdatenbank verändert. Keine neuen Section-Types für News/Karriere. Keine Kontakt-/Download-Migration angewendet.

---

# Aktueller Stand — Vorgängerstand

Stand: 2026-05-29 (Sprint „cms-light-wochenend-hygiene-check-stand-plan-validierung-1", read-only)

## Wochenend-Hygiene-Check durchgeführt (read-only)

- **Vollbericht:** `docs/04-betrieb/wochenend-hygiene-check-2026-05-29.md`.
- **Audit-Zahlen frisch reproduziert (2026-05-29):** D1 0 · D2 2649 · D3 3502 · D4 3074 · D5 3416 · D6 184 · D7 0 · D8 0 · **D9 25** (2 distinct Relations: `(none/top-level)→card_v1` 19, `rich_v1→rich_v1` 6; 5 aktiv / 20 inaktiv) · D10 28 · D0 5. Datenstand: 118 Seiten · 1442 Sections · 38877 Felder · 739 Assets · 42135 Whitelist-Zeilen. Renderer-Inventar 79 Pages: G0 2 · G1 4 · S1 54 · S2 19 · S3 2 · P1 1 (59 low · 20 medium · 2 high).
- **Admin-Validierung (Bildslot-Validierung) erklärt und reproduziert:** Tab prüft `cms_assets` vs. Renderer-Erwartung (`rendererSlotMap.ts`), nicht das gesamte CMS. **Aktuelle DB-Reproduktion (Skript `scripts/cms/slot-validation-audit.py`): OK 284 · Hinweis 2046 · Problem 185 · gesamt 2515 Slots · 115 Seiten.** Befundverteilung: `empty_optional` 1981 (Karten-Slots, kein Public-Fehler), `match` 284, `orphan` Renderer ignoriert 137, `orphan` Section inaktiv 65, `no_section` 48. Top-Problem-Seiten: `anwendungen.root` 14, `mobile-tk-preview.root` 13, `produkte.hub` 13, `gebaeudekommunikation.root.kopie` 9. Kritisch sind nur die ~8 `hero_v1`-`empty_required` und 48 `no_section`; Rest ist Altlast/Reservierung.
- **Nächste Arbeitsrichtung:** zuerst Layout-/Baustein-Matrix fachlich klären und flexible Standardkarte entscheiden, danach Contract/Presets schärfen, dann gezieltes D3/D5-Basis-Seeding (S1/S2, ~43 Felder), dann bereichsweise i18n-/Hardcoding-Fallback-Abbau (19 S2-Pages), zuletzt D9-Reste/Legacy-Cleanup. **Nicht jetzt:** kein pauschales D3/D5-Seeding, keine Baustein-Migration vor Matrix, keine i18n-Fallback-Entfernung ohne DB-Gegenstück, keine Produktdatenbank, keine Public-Nav/Footer/Routen-Änderung.
- **Scope-Treue:** keine DB-Änderung, keine Migration, keine neue RPC, keine Inhalte/Bilder/Feldwerte/Whitelist/i18n/Public-Renderer/Routen/Navigation/Footer/Breadcrumb/Produktdatenbank verändert.

---

## Baustein-Atlas als neutraler Ist-Katalog (vorheriger Sprint)

Stand davor: 2026-05-29 (Sprint „cms-light-baustein-atlas-neutraler-ist-katalog-final-1", read-only)

## Baustein-Atlas als neutraler Ist-Katalog neu aufgebaut (read-only)

- **Atlas neu aufgebaut als neutraler Ist-Katalog:** PDF/MD/JSON wurden komplett neu erzeugt. Entfernt: Personen-Namen, „Workshop-Frage"-Labels, Prozess-/Audit-Erklärseiten, leere Kapitel-Trennseiten, die Sonder-Erklärseite „B-1176/B-1167 aufgeklärt", Hauptkatalog-Einträge ohne aktive Instanz und Crops, die zu viel Umfeld/Footer zeigten. Erlaubte neutrale Begriffe (`Klärpunkt`, `Vorschlag`, `Empfehlung`, `manuell prüfen`, `Spezialfall`, `Zielstandard-Kandidat`) werden konsistent benutzt.
- **Admin-Sprungmarken funktionieren:** N-/P-/B-/A-IDs (auch Kind-Karten in Scrollern/Grids) führen im Admin zuverlässig zum Objekt im Editor. Atlas-IDs sind dadurch im Admin nachvollziehbar. Testbericht: `docs/04-betrieb/admin-kurz-id-sprung-test.md`.
- **Hauptkatalog (14 sichtbare Bausteinfamilien):** Hero, Wechselteaser, Textblock/Intro, Karten-Reihe (Bildkarten), Produkt-Scroller, Iconreihe (Lucide), Personas-Textkarten, Produkt-Hub `/produkte` (B-1176 + 3 Kinder), Produktbereichs-Filter (live aus Produktdatenbank, 4 Hüllen, 0 CMS-Kinder), Stats-Band, FAQ, CTA-Banner, Kontaktblock, Tabs/Rollen-Tabs/Rich Text/Referenz-Liste.
- **Flexible Standardkarte als Zielstandard-Kandidat** (nicht beschlossen): Pilot B-538/B-539/B-540/B-2195 unter B-026 (Schwester B-027) mit Toggle-Feldern `eyebrow_enabled`, `image_enabled`, `icon_enabled`, `features_0..4_enabled`, `link_1..3_enabled`. Die 6 heutigen `card_v1`-Varianten (`image_card`, `thumbnail_card`, `icon_card_lucide`, `icon_card_image`, `multi_link_card`, `text_card`) werden im Katalog als Presets dargestellt; `download_card` bleibt Spezialfall im Anhang.
- **Anhang „manuell prüfen / nicht aktiv belegt":** `icon_card_image` (keine eindeutige Instanz), `download_card` (0 Instanzen, Spezialfall), `download_list_v1` (0 Instanzen), Kopie-/Preview-Seite `produkte.eingangsloesungen.kopie` (B-1198). Diese stehen bewusst **nicht** im Hauptkatalog.
- **Dateien neu erzeugt:**
  - PDF `docs/04-betrieb/baustein-atlas-visuell.pdf` (**19 Seiten**, A4, neutral, ohne Personen-Namen, ohne „Workshop-Frage"-Labels, ohne leere Trennseiten).
  - JSON-Index `scripts/cms/output/baustein-atlas-latest.json` (maschinenlesbar; `sichtbare_bausteine`, `flexible_standardkarte`, `karten_presets`, `container_layout_huellen`, `anhang_manuell_pruefen`).
  - Markdown `docs/04-betrieb/baustein-atlas-visuell.md` an neue PDF-Struktur angeglichen.
  - Build-Skript `scripts/cms/build-baustein-atlas-pdf.py` (erzeugt PDF und JSON in einem Lauf).
- **PDF visuelle QA durchgeführt (19/19 Seiten):** keine Leerseite, keine reinen Kapiteltrenner, keine Personen-Namen, kein „Workshop-Frage", Tabellen lesbar, P-/B-/A-IDs lesbar, Hauptkatalog enthält nur sichtbare Bausteine oder klar markierte Zielstandard-Kandidaten; Spezial-/Inaktiv-Einträge ausschließlich im Anhang.
- **Bekannte „manuell prüfen"-Crops** (Hauptkatalog-Einträge ohne eingebettetes Bild): Iconreihe Lucide (bisheriger Crop zeigte Footer), Stats-Band (bisherige Vorschau falsch), FAQ. Diese Einträge sind im Hauptkatalog mit IDs und Klärpunkt vorhanden; Crop wird bei Bedarf in eigener Browser-Runde isoliert ergänzt.
- **Scope-Treue:** keine DB-Mutation, keine Migration, keine neue RPC, keine Inhalte/Bilder/Feldwerte/Whitelist/i18n/Public-Renderer/Routen/Navigation/Footer/Breadcrumb/Produktdatenbank verändert.

---

## Admin-Kurz-ID-Sprung + Baustein-Atlas Korrekturrunde (read-only) — vorher



- **Admin-Sprunglogik verifiziert (keine Code-Änderung nötig):** Parser akzeptiert `B-538` und `B538`; Resolver-Kette (`rpc_admin_resolve_node_no/_page_no/_section_uid/_asset_no`) → `pickEditorialNodeForPage` → `MasterDetailWorkbench.setFocusedSection` → `PageEditor` Fokus-Modus springt zuverlässig auf P-/B-/A-/N-IDs, auch auf Kind-Karten in Scrollern (B-538/539/540/2195 unter B-26). Testbericht: `docs/04-betrieb/admin-kurz-id-sprung-test.md`.
- **Atlas-Korrektur „Bildkarte neu mit ein-/ausblendbaren Feldern":** war fälschlich auf B-2039 (anwendungsumfelder__einfamilienhaus) referenziert. DB-Stichprobe zeigt: `*_enabled`-Booleans (eyebrow/image/icon/features_0..4/link_1..3) existieren ausschließlich auf den Außenstationen-Karten **B-538, B-539, B-540, B-2195** (Eltern: B-26 aussenstationen, Schwester-Scroller B-27 innenstationen). Atlas referenziert das jetzt als eigene Variante `image_card_toggles`. **Keine fachliche Entscheidung getroffen** — Workshop-Klärung mit Andreas explizit ausstehend (multi_link_card vs. image_card_toggles auf denselben Karten).
- **Nutzer-IDs B-6104 und B-32002 existieren nicht** in `cms_sections` (Max `section_uid` ~ 2200) — wahrscheinlich Erinnerungsfehler, kein Sprung-Bug.
- **PDF neu gebaut:** `docs/04-betrieb/baustein-atlas-visuell.pdf` (32 Seiten). JSON-Index `scripts/cms/output/baustein-atlas-latest.json` aktualisiert mit `image_card_toggles`-Eintrag und `fachlich_offen`-Hinweisen.
- **Crops bewusst zurückgestuft auf „manuell prüfen":** `icon_card_lucide` (zeigte zu viel Umfeld/Footer), `multi_link_card`/Scroller, `image_card_toggles`. Re-Crop wird in der nächsten Runde isoliert pro Karte erzeugt.
- **Scope-Treue:** keine Produktdatenbank, keine Inhalte/Bilder/Feldwerte/Whitelist/i18n/Public-Renderer/Routen/Navigation/Footer/Breadcrumb/Schreib-RPC verändert; Sprunglogik-Code nicht angefasst (war bereits korrekt).

---

## Baustein-Atlas Qualitätsrunde (read-only) — finalisiert (vorher)

- **PDF ist Entscheidungsgrundlage für Andreas/Redaktion/Design:** `docs/04-betrieb/baustein-atlas-visuell.pdf` (31 Seiten, A4) mit Cover, ID-Legende, `card_v1`-Variantenkatalog, je einer Seite pro Container/Karte/Section, Workshop-Entscheidungstabelle und Top-10-Vereinheitlichungskandidaten.
- **P-/B-/A-ID-System** durchgängig: jede Beispieltabelle nennt `P-ID` (Seite, `cms_pages.page_no`), `B-ID` (Section, `cms_sections.section_uid`) und — wo vorhanden — `A-ID` (Asset, `cms_assets.asset_no`). Container und Einzelkarten sind im PDF und in der Markdown sauber getrennt.
- **JSON-Index mit P-/B-/A-IDs liegt vor:** `scripts/cms/output/baustein-atlas-latest.json` (maschinenlesbar). Build-Skript: `scripts/cms/build-baustein-atlas-pdf.py`.
- **Markdown synchronisiert:** `docs/04-betrieb/baustein-atlas-visuell.md` ist auf den Stand der neuen PDF gebracht (alte Aussagen wie „nur 3 Vollseiten-Screenshots", fehlende leere Crops, fehlender JSON-Index, ungenaue Variantennamen `image`/`thumbnail` statt `image_card`/`thumbnail_card` entfernt).
- **PDF Seite für Seite visuell QAen abgeschlossen:** 31/31 Seiten geprüft, keine Leerseite, keine abgeschnittenen Überschriften, keine unsichtbaren Tabellenköpfe mehr. Behoben: (a) doppelter `PageBreak` zwischen Referenz-Liste und Workshop-Tabelle (Page 29 war leer) entfernt, (b) Tabellen-Header in dunkler Header-Zeile als weiße Schrift gerendert (`TableStyle.TEXTCOLOR` greift in ReportLab nicht für `Paragraph`-Zellen), (c) Checkbox-Glyph `☐` durch `[ ]` ersetzt (Built-in-Fonts → schwarzes Kästchen).
- **Bekannte offene Screenshot-Platzhalter (bewusst „manuell prüfen"):** Iconkarte Bildicon (`icon_card_image`, kein eindeutiges aktives Beispiel), Download-Karte (`download_card`, keine aktive Instanz — `/service/downloads` (P-081) nutzt heute `cards_v1` + Textkarten), Download-Liste (`download_list_v1`, Vertrag ohne Instanz). Alle drei sind im PDF/MD mit `page_key/section_key` + IDs referenziert.
- **Sprint 2l (vorher):** `card_v1`-Variantenmodell (7 Varianten: `image_card`, `thumbnail_card`, `icon_card_lucide`, `icon_card_image`, `download_card`, `multi_link_card`, `text_card`) + Alias-Auflösung (`eyebrow↔subtitle`, `headline↔title`, `beschreibung↔description`) in `src/features/cms/contract/sectionTypes.ts`; Admin-Feldplan (`buildAdminFieldPlan.ts`) blendet variantenfremde Pflichtfelder aus.
- **Audit-Stand stabil:** D1=0 · D8=0 · D9=25 · R2=0 · D3=3502 · D5=3416 · D10=28.
- **Scope-Treue:** keine DB-Mutation, keine Migration, keine RPC, keine Inhalte/Bilder/Feldwerte/Whitelist/i18n/Public-Renderer/Routen/Navigation/Footer/Breadcrumb/Produktdatenbank verändert.

**Empfohlene nächste Etappe:** `cms-light-eine-wahrheit-sprint-2m-basis-seeding-cards-hero-container-1`.

---



## Sprint 2k „Eine Wahrheit" — D3/D5-Rest-Triage (read-only)
_(vorheriger Stand)_

Stand davor: 2026-05-29 (Sprint 2k „Eine Wahrheit" — D3/D5-Rest-Triage, read-only, kein Seeding)

## Sprint 2k „Eine Wahrheit" — D3/D5-Rest-Triage (read-only)

- **Klassifikation statt Seeding**: Neues read-only Skript `scripts/cms/d3-d5-rest-triage.mjs` (npm `cms:audit:d3-d5-triage`) sortiert jede D3/D5-Gruppe nach fachlichen Klassen S1..S7. Bericht: `docs/04-betrieb/d3-d5-rest-triage-latest.md` + `docs/04-betrieb/sprint-2k-eine-wahrheit-bericht.md`.
- **Ergebnis (nur aktive Sections)**: D3 = 2004 (S1 5 · S2 38 · S3 1101 · S4 88 · S5 696 · S7 76) · D5 = 2000 (S1 5 · S2 38 · S3 1101 · S4 88 · S5 696 · S7 72). Differenz zu Audit-Totals (D3=3502, D5=3416) = inaktive/archivierte Sections.
- **Entscheidung**: **kein Seed in 2k angewendet.** S1-Menge mit nur 5 Sections (`card_v1.description` auf 1 Page) zu klein für eigene Migration; S3/S4 (1189 Sections) wären ohne Variantenmodell für `card_v1` Admin-Feldmüll; S5 (696 Sections, vor allem `hero_v1` + dynamische Patterns) gehört in eigenen i18n-Fallback-Sprint; S7 (76 Sections) sind D9-blockiert.
- **Empfehlung für 2l**: `card_v1` in `sectionTypes.ts` variantisieren (Base + Click-Card + CTA-Card + Icon-Card + Download-Card + Multi-Link-Card + Feature-Card). Erst danach werden D3/D5 fachlich kleiner — ohne dass eine Zeile Inhalt verändert wird.
- **Audit-Stand stabil ggü. 2j**: D1 0 · D8 0 · **D9 25** (19 `(none/top-level)→card_v1`, 6 `rich_v1→rich_v1`, 2 distinct Relations) · D3 3502 · D5 3416 · D10 28. R2 `content_v1→card_v1` bleibt 0.
- **Scope-Treue**: keine Produktdatenbank, keine Inhalte/Bilder/Feldwerte überschrieben, keine Whitelist gelöscht oder deaktiviert, keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung, keine neue Schreib-RPC, keine Strukturmigration, keine Section aktiviert/deaktiviert.
- Details: `docs/04-betrieb/sprint-2k-eine-wahrheit-bericht.md`.

**Empfohlene nächste Etappe:** `cms-light-eine-wahrheit-sprint-2l-section-contract-field-variants-und-i18n-fallback-abbau-plan-1`.

---

## Sprint 2j „Eine Wahrheit" — R2-Strukturmigration Restseiten

_(vorherige Stand-Zeile)_

## Sprint 2j „Eine Wahrheit" — R2-Strukturmigration Restseiten

- **Migration**: Letzte 5 Container-Sections von `content_v1` auf `cards_v1` retyped — `presse.root/releases`, `signage.root/products`, `zutrittskontrolle.fahrstuhlsteuerung/benefits`, `zutrittskontrolle.mobiler-zutritt/benefits`, `zutrittskontrolle.zufahrten-parkplaetze/benefits`. Reine `UPDATE`-Migration, idempotent (`WHERE section_type='content_v1' AND is_active`).
- **Renderer-Beweis pro Seite**: alle 5 Page-Komponenten (`PressePage`, `SignagePage`, `FahrstuhlsteuerungPage`, `MobilerZutrittPage`, `ZufahrtenParkplaetzePage`) lesen Kindkarten ausschließlich über `cms.sections.filter(s => s.parent_section_key === "<key>" && s.section_type === "card_v1")`. Parent-`section_type` wird im JSX nirgends abgefragt; kein `CmsBodyRenderer`-Fallback für die betroffenen Container, kein Doppelrendering, kein neuer i18n-Pfad. Public-Layout vorher = nachher.
- **Audit-Diff** (Sprint 2i → 2j): D1 0→0 · D8 0→0 · **D9 67→25 (−42)** · aktive R2-Hits `content_v1→card_v1` **21→0 (−21)** · symmetrisch gezählt 42→0. Verbleibende 25 D9-Hits sind **kein R2 mehr**: 19 `(none/top-level)→card_v1` (Karten ohne Parent) + 6 `rich_v1→rich_v1` (verschachtelte Rich-Sections) — eigene Klassen für spätere Sprints.
- **Scope-Treue**: keine Inhalte, Bilder, Feldwerte, Sort-Orders, `is_active`-Flags oder Whitelist-Einträge verändert. Keine neue Schreib-RPC. Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung. Keine Produktdatenbank. Keine Reparenting-Migration. Keine Aktivierung/Deaktivierung.
- Details: `docs/04-betrieb/sprint-2j-eine-wahrheit-bericht.md`.

**Meilenstein:** Klasse R2 (`content_v1 → card_v1`) ist vollständig aufgelöst (88 → 0 aktive Hits über Sprints 2h+2i+2j). Empfohlene nächste Etappe: Sprint 2k — D3/D5-Rest-Seeding bereichsweise.

---

## Sprint 2i „Eine Wahrheit" — R2-Strukturmigration `gebaeudekommunikation`

- **Migration**: 10 Container-Sections im Bereich `gebaeudekommunikation` von `content_v1` auf `cards_v1` retyped — Spiegel zu den vorhandenen aktiven `card_v1`-Kindsections. Reine `UPDATE`-Migration, idempotent (`WHERE section_type='content_v1'`).
- **Betroffene Sections** (10 × `page_key / section_key`): `briefkastenanlagen/{montageformen,smart}`, `grossanlagen/{anforderungen,systembausteine,wirtschaftlichkeit}`, `snipdoo-ip/{anwendungen,audiences}`, `systemloesungen/{vorteile,fachplanung}`, `tuersprechanlagen/anwendungsumfelder`.
- **Renderer-Beweis pro Seite**: alle 5 Page-Komponenten (`BriefkastenanlagenPage`, `GrossanlagenPage`, `SystemloesungenPage`, `SnipdooIpPage`, `TuersprechanlagenPage`) lesen Kindkarten **typ-agnostisch zum Parent** — entweder via `cms.sections.filter(s => s.parent_section_key === "<key>" && s.section_type === "card_v1")` oder via `cms.text("<key>.<sub>")` mit hartcodierten Itemlisten. `TuersprechanlagenPage` rendert `anwendungsumfelder` über `SECTION_RENDERERS[section_key]` (key-basiert) und nicht über den generischen `CmsBodyRenderer`-Fallback — Renderwahl identisch vor/nach Migration. Kein Doppelrendering möglich. Public-Layout vorher = nachher.
- **Audit-Diff** (Sprint 2h → 2i): D1 0→0 · D8 0→0 · **D9 143→67 (−76)** · aktive R2-Hits `content_v1→card_v1` **59→21 (−38)** · symmetrisch gezählt 118→42. Verbleibende 21 R2-Hits auf 5 Seiten (`presse.root` 5, `signage.root` 4, `zutrittskontrolle.{fahrstuhlsteuerung,mobiler-zutritt,zufahrten-parkplaetze}` je 4). Drift-Verschiebungen in D2/D3/D4/D5/D10 entsprechen der symmetrischen Vertragsklassifizierung aus Sprint 2h (keine inhaltliche Verschlechterung). `cms:audit:contract` 15 OK · 6 Warn · 0 Konflikt.
- **Scope-Treue**: keine Inhalte, Bilder, Feldwerte, Sort-Orders, `is_active`-Flags oder Whitelist-Einträge verändert. Keine neue Schreib-RPC. Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung. Keine Produktdatenbank. Keine `zutrittskontrolle`-Migration in diesem Sprint. Keine Reparenting-Migration.
- Details: `docs/04-betrieb/sprint-2i-eine-wahrheit-bericht.md`.

**Empfohlene nächste Etappe:** Sprint 2k — D3/D5-Rest-Seeding bereichsweise.

---

## Sprint 2h „Eine Wahrheit" — R2-Strukturmigration 7 Low-Risk-Seiten

- **Migration**: 7 Container-Sections von `content_v1` auf `cards_v1` retyped (Spiegel zu den vorhandenen `card_v1`-Kindsections). Reine `UPDATE`-Migration, idempotent (`WHERE section_type='content_v1'`).
- **Betroffene Sections** (`page_key / section_key`): `zutrittskontrolle.bcm-mini-cloud/anwendungen`, `gebaeudemanagement.bcm-buchungssystem/anwendungen`, `gebaeudemanagement.bcm-infoboard/anwendungen`, `zutrittskontrolle.aussenstation-adx5/anwendungen`, `zutrittskontrolle.zutrittssoftware/anwendungen`, `zutrittskontrolle.digitale-briefkasten/anwendungen`, `service.online-produktkatalog/access`.
- **Renderer-Beweis**: alle 7 laufen über `CmsProductSolutionShell`, das Body-Sections via `!parent_section_key && key!='hero'/!='cta'` filtert und Children via `parent_section_key===sk` über `readItems` liest — beides typ-agnostisch. Public-Layout vorher = nachher.
- **Audit-Diff** (Sprint 2g → 2h): D1 0→0 · D8 0→0 · **D9 201→143 (−58)** · aktive R2-Hits `content_v1→card_v1` **88→59 (−29)** · symmetrisch gezählt 176→118. D3 −161, D5 −153, D2 +12, D4 +12, D10 +11 (Drift-Reklassifizierung durch Typumstellung, keine inhaltliche Verschlechterung). `cms:audit:contract` 15 OK · 6 Warn · 0 Konflikt.
- **Scope-Treue**: keine Inhalte, Bilder, Feldwerte, Sort-Orders, `is_active`-Flags oder Whitelist-Einträge verändert. Keine neue Schreib-RPC. Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung. Keine Produktdatenbank. Keine Spezialseite (Page-Komponente) angefasst.
- Details: `docs/04-betrieb/sprint-2h-eine-wahrheit-bericht.md`.

---

## Redaktionsmodus (gilt aktuell)

Der Redaktionsbetrieb läuft normal weiter. Die CMS-Härtung „Eine
Wahrheit" (Sprints 2x) ist interne Qualitätsarbeit und blockiert die
Redaktion nicht. Maßgeblich ist
[`docs/03-redaktion/redaktions-prompts.md`](03-redaktion/redaktions-prompts.md),
Abschnitt **„Aktueller Redaktionsmodus"**.

Kurzfassung:

- **Direkt im Admin** pflegbar: bestehende Texte, Bilder, Alt-Texte,
  Icons, vorhandene Felder, einfache Reihenfolge/Sichtbarkeit — sofern
  der Admin keine Warnung zeigt.
- **Per Prompt** anlegen lassen: neue Karten, Blöcke, Seiten, Kopien,
  Verschiebungen, größere Sammelrunden — und alles, wozu der Admin
  eine Warnung zeigt. Warnungen bedeuten nicht „Arbeit stoppen",
  sondern „komplexen Strukturwunsch per Prompt ausführen lassen".
- Lovable nutzt für Strukturwünsche ausschließlich die bestehenden
  Templates und Section-Typen — neue Inhalte landen sofort im
  CMS-Light/Admin und sind dort weiter pflegbar.
- DE/EN-Default: DE ändern, EN automatisch mitziehen, außer der
  Prompt sagt ausdrücklich etwas anderes.
- Stopp-Regel für Lovable: wenn das Zielobjekt nicht eindeutig im
  CMS-Light auffindbar ist, nur hardcodiert/i18n-only existiert oder
  ein Feld sichtbar aber nicht speicherbar ist → **stoppen und melden**,
  nicht improvisieren. Die internen Strukturwarnungen im Admin bleiben
  bestehen und sind ernst zu nehmen.

Stabile Audit-Eckwerte nach Sprint 2k: **D1=0, D8=0, D9=25** (19
`(none/top-level)→card_v1`, 6 `rich_v1→rich_v1`); R2
`content_v1 → card_v1` ist vollständig aufgelöst (88 → 0 aktive Hits
über Sprints 2h+2i+2j); `tabs_v1 → tab_v1` ist als R1-Vertragskorrektur
seit 2f gelöst. D3/D5-Reste sind fachlich klassifiziert (siehe Sprint
2k). Empfohlener nächster großer Schritt: Sprint 2l — Variantenmodell
für `card_v1` und bereichsweiser i18n-Fallback-Abbau.

---


## Sprint 2g „Eine Wahrheit" — Renderer-/Fallback-Inventar (read-only)

- Strategiecheck-Ergebnis umgesetzt: statt R2-Einzelfall-Migration zuerst ein **read-only Inventar aller 80 Public-Pages** erstellt. Ziel: nächste Sprints **bereichsweise statt einzelfallweise** planbar machen.
- Neues Skript `scripts/cms/renderer-fallback-inventory.mjs` (npm: `cms:audit:renderer-fallback-inventory`). Bericht: `docs/04-betrieb/renderer-fallback-inventar-latest.md` + `sprint-2g-eine-wahrheit-bericht.md`. R2-Snapshot (read-only SELECT): `scripts/cms/output/r2-pages-latest.json`.
- **Renderer-Klassen**: 2 G0 · 4 G1 · 54 S1 · 19 S2 · 2 S3 · 1 P1. **60 von 80 Seiten sind bereits DB-first ready** (S1/G0/G1). 19 S2-Seiten sind die heißen Kandidaten für i18n-Fallback-Abbau.
- **R2-Bezug** (`content_v1 → card_v1`, 88 aktive Hits): verteilt auf nur **17 Page-Keys** in **2 fachlichen Bereichen** (`gebaeudekommunikation` 38 Hits / `zutrittskontrolle` 30 Hits). Davon **7 Seiten ohne dedizierte Page-Komponente** = sicherste Migrationskandidaten (rein generisch, kein Spezialcode betroffen).
- **D1=0, D8=0, D9=201** stabil ggü. 2f. `cms:audit:contract` 15 OK · 6 Warn · 0 Konflikt.
- Keine DB-Mutation, keine Inhalte/Bilder/Feldwerte/Whitelist/Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung. Keine Produktdatenbank. Keine neue Schreib-RPC. Keine Strukturmigration.

**Empfohlene nächste Etappe:** Sprint 2h — R2-Migration der 7 R2-Seiten ohne Page-Komponente (29 aktive Hits), idempotent, Owner-Sign-off pro Page-Key. Danach 2i (`gebaeudekommunikation`), 2j (`zutrittskontrolle`), 2k (D3/D5-Rest-Seeding bereichsweise), 2l (i18n-Fallback-Abbau bereichsweise), 2m (CMS-Truth-Freeze-Vorbereitung).

---

## Sprint 2f „Eine Wahrheit" — D9 Relationsgruppen & R1-Korrektur (`tabs_v1 → tab_v1`)

- Neue Sicht: D9 wird nicht mehr nur als Symptombucket, sondern als echte `parent -> child`-Beziehung ausgewertet. Neues read-only Skript `scripts/cms/d9-relations.mjs` (npm-Skript `cms:audit:d9-relations`) plus Bericht `docs/04-betrieb/d9-relations-latest.md`.
- **Befund:** Die 205 D9-Treffer aus Sprint 2e zerfallen in nur **3 distinct Parent→Child-Beziehungen** (die symmetrischen Pattern `child_not_in_allowed_children` + `parent_not_in_allowed_parents` zählen `content_v1 → card_v1` doppelt).
- **R1-Korrektur (Vertrag zu streng):** `tabs_v1.allowed_children` ergänzt um `tab_v1`. `tab_v1.allowed_parents` enthielt bereits `tabs_v1`, und `TabsV1.tsx` rendert nachweislich `ctx.children` mit `section_type === "tab_v1"` — reine Symmetrielücke. Renderer und Daten unverändert.
- **R2 (`content_v1 → card_v1`, 88 Beziehungen):** nicht im Vertrag gelockert. `ContentSectionV1.tsx` rendert keine Children — Lockerung wäre eine Lüge über das Frontend. Datenmigration pro Seite (Parent-Typ umetikettieren) ist Aufgabe von Sprint 2g.
- **R4 (`(none) → card_v1`, 19):** inaktive Legacy auf `anwendungen.root`, in Sprint 2d bereits entschieden.
- **R3/R4 (`rich_v1 → rich_v1`, 6):** 1 aktiv / 5 inaktiv auf `home.start`; `RichV1.tsx` rendert keine Children, kein Vertragsfix.
- D9 205 → **201** (−4 durch R1). D1=0, D8=0 stabil. Distinct D9-Relationen 4 → 3.
- `npm run cms:audit:contract`: 15 OK · 6 Warn · 0 Konflikt. `cms:audit:contract-drift`, `cms:audit:d9` und neues `cms:audit:d9-relations` ausgeführt.
- Keine Inhalte/Bilder/Feldwerte/Whitelist/Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung. Keine Produktdatenbank. Keine neue Schreib-RPC. Keine Datenmigration.
- Details: `docs/04-betrieb/sprint-2f-eine-wahrheit-bericht.md` und `docs/04-betrieb/d9-relations-latest.md`.

**Nächste Etappe:** Sprint 2g — Datenmigration ausschließlich für R2-safe-Cases (Pilot z. B. `gebaeudekommunikation.briefkastenanlagen`: Parent-Typ `content_v1` → `cards_v1`/`card_grid_v1`, sectionweise, mit Owner-Sign-off, ohne Inhaltsverlust).

---

## Sprint 2d „Eine Wahrheit" — D9-Strukturmigration Pilot `anwendungen.root` (Option B)

- Pilot `child_only_at_top_level` / `card_v1` / `anwendungen.root` vollständig analysiert (read-only).
- Befund: Die **28 aktiven** `card_v1`-Sections auf `anwendungen.root` haben **bereits** `parent_section_id` gesetzt — die strukturelle Migration für den sichtbaren Bestand ist in einer früheren Etappe erledigt. Verbleibende D9-Treffer sind **15 ausschließlich inaktive Legacy-Sections** (`_kopie`, `_efh`, `_mfh`, `_ami`, `_argos`, `_tcu_bka` …), von RLS ausgeschlossen und vom Renderer (`AnwendungenPage` über `dbChildrenOf(container)`) nicht konsumiert.
- **Entscheidung: Option B — keine Migration.** Owner pro Karte nicht eindeutig, „Parent zuweisen" wäre ein Verstecken statt Aufräumen und würde Aktivierungs-Risiko erzeugen. Korrekter Weg ist ein gesonderter Cleanup-Sprint mit Owner-Sign-off pro Section.
- D9 215 → **205** (Drift-Recompute, keine Schreibaktion). D1=0, D8=0 stabil. D3/D5 ggü. 2c leicht reduziert. Keine neuen D2/D4-Massen.
- `npm run cms:audit:contract`: 15 OK · 6 Warn · 0 Konflikt.
- `npm run cms:audit:contract-drift` und `npm run cms:audit:d9` neu erzeugt, Outputs aktualisiert.
- Keine Inhalte, Bilder, Feldwerte, Whitelist verändert. Keine Section aktiviert/deaktiviert. Keine Parent/Child-Struktur verändert. Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung. Keine Produktdatenbank. Keine neue Schreib-RPC.
- Details: `docs/04-betrieb/sprint-2d-eine-wahrheit-bericht.md`.

---

## Sprint 2c „Eine Wahrheit" — D9 Owner-Entscheidungen

- Admin-Härtungshinweis (`AdminHardeningNotice`) ist nicht mehr versions­abhängig formuliert — der Text spricht von „CMS-Härtung läuft (Eine Wahrheit)".
- Neues read-only Skript `scripts/cms/d9-owner-buckets.mjs` (npm-Skript `cms:audit:d9`) klassifiziert die D9-Treffer nach feineren Mustern.
- Owner-Entscheidungsklassen O1–O5 dokumentiert. D9 218 → 215 — *keine* Strukturreparatur, sondern präzisere Klassifikation.
- Sonderfall `mobile-tk-preview.root` / `tab_v1` Top-Level: interne Preview-Seite ohne Public-Link, braucht erst `tabs_v1`-Container; nicht in Sprint 2d migriert.
- Details: `docs/04-betrieb/sprint-2c-eine-wahrheit-bericht.md` und `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md`.

---

## Sprint 2b „Eine Wahrheit" — Vertragsfelder & Whitelist-Seeding

- Neues Dry-Run-/Generator-Skript `scripts/cms/sprint-2b-seed-plan.mjs` berechnet idempotent, welche leeren Vertragsfelder als `cms_section_fields`-Zeilen und welche fehlenden `cms_admin_editable_fields`-Einträge angelegt werden dürfen — ausschließlich für sichere Vertragstypen, aktive Sections auf nicht-archivierten Seiten, ohne D9-Strukturprobleme, ohne Alias-Dubletten, ohne Asset-Slots und ohne `technical_fields`/Toggles.
- Sicher seedbare Typen: `content_v1`, `cards_v1`, `card_v1`, `feature_grid_v1`, `teaser_2col_v1`, `faq_v1`, `cta_v1`, `rich_v1`, `tabs_v1`, `tab_v1`, `stats_v1`, `stat_v1`, `contact_block_v1`, `download_list_v1`, `product_scroller_v1`. Bewusst NICHT geseedet: alle `series_override_*`, `role_tabs_v1`, `list_v1`, `card_grid_v1`, `catalog_filter_grid_v1`, sowie alle Sections mit D9-Strukturproblem.
- Dry-Run (vor Anwendung): **23387** geplante `cms_section_fields`-Inserts (value=''), **23105** geplante `cms_admin_editable_fields`-Inserts (is_enabled=true). Übersprungen: 24 archived pages, 111 inactive sections, 150 unsichere Typen, 101 D9-Sections, 226 Alias-Felder, 226 Alias-Whitelist.
- Idempotente Anwendung über `scripts/cms/output/sprint-2b-seed.sql` (`ON CONFLICT DO NOTHING` auf unique-Key (page_key, section_key, field_key, locale)). Tatsächlich angelegt: **23387** Feldzeilen, **23105** Whitelist-Zeilen.
- **Drift-Audit vorher → nachher:** D3 15346 → **3654** (−76 %) · D5 15111 → **3560** (−76 %) · D1 0 → **0** · D8 0 → **0** · D9 218 → **218** (bewusst nicht angefasst — Owner-Entscheidung in Sprint 2c) · D2/D4/D6/D10 unverändert.
- `npm run cms:audit:contract`: 15 OK · 6 Warn · 0 Konflikt.
- Keine Inhalte überschrieben, keine Bilder berührt, keine bestehenden Whitelist-Einträge deaktiviert, keine Parent/Child-Strukturen geändert, keine Public-Renderer-/Routen-/Navigation-/Footer-/i18n-Änderung. Keine Produktdatenbank. Keine Schreib-RPC.
- Details: `docs/04-betrieb/sprint-2b-eine-wahrheit-bericht.md` und `docs/04-betrieb/sprint-2b-seed-plan.md`.

**Nächste Etappe:** Sprint 2c — Parent/Child-D9-Owner-Entscheidungen.

---

## Sprint 2a „Eine Wahrheit" — Contract-Coverage & Renderer-Owner (P1)

---

## Sprint 1b „Eine Wahrheit" — Drift-Audit-Backbone & Reparaturplan

- Neue read-only Diagnose-RPC `rpc_admin_export_contract_drift()` (SECURITY DEFINER, `STABLE`, `SET search_path = public`, keine Mutationen, keine Werte/Storage). Gibt nur Strukturmetadaten der fünf CMS-Light-Tabellen zurück.
- Neues Node-Audit `scripts/cms/contract-drift-audit.mjs` aggregiert Drift gegen Vertrag + Renderer und schreibt Report nach `docs/04-betrieb/contract-drift-audit-latest.md` und `scripts/cms/output/contract-drift-audit-latest.json`.
- 10 Drift-Klassen D1–D10 (plus D0 OK) implementiert: `contract_missing`, `fields_unknown_to_contract`, `contract_fields_missing_in_db`, `whitelist_unknown_to_contract`, `whitelist_missing_for_contract_field`, `asset_slot_unknown_to_contract`, `contract_asset_slot_missing`, `active_without_renderer`, `invalid_parent_child`, `i18n_or_special_owner_risk`.
- Aktuelle Top-Treffer (vor Sprint 2a): D1=30 · D2=2628 · D3=15346 · D4=3053 · D5=15111 · D6=184 · D7=0 · D8=16 · D9=214 · D10=17.
- `npm run cms:audit:contract-drift` als neuer Skript-Alias. Bestehendes `npm run cms:audit:contract` unverändert (15 OK · 2 Warn · 0 Konflikt).
- Kleiner Admin-Hinweis (`AdminHardeningNotice`) verweist auf das neue Audit; keine neue Admin-UI.
- Keine Inhalte/Bilder/i18n/Whitelist verändert. Keine Schreib-RPC. Keine Public-Renderer-/Routen-/Navigation-/Footer-Änderung. Produktdatenbank unberührt.
- Details: `docs/04-betrieb/sprint-1b-eine-wahrheit-bericht.md` und `docs/04-betrieb/contract-drift-audit-latest.md`.

**Nächste Etappe:** Sprint 2 — Vertragsfelder/Daten/Whitelist-Seeding (P1: D1 + D8 zuerst, danach P2: D9 + D5).

---

## Sprint 1a „Eine Wahrheit" — Vertrag als Admin-Feldquelle (ohne RPC)

- `PageEditor` zeigt Felder jetzt aus dem Section-Type-Vertrag
  (`buildAdminFieldPlanForSection`). Vertragsfelder erscheinen auch ohne
  DB-Zeile (Badge „fehlt in DB"), Aliase werden als „Alias" markiert,
  DB-Felder ohne Vertrag bleiben sichtbar als „Legacy / nicht im Vertrag".


---

## Sprint 0 „Eine Wahrheit" — Redaktionssicherung & Audit

- Admin zeigt pro Section Vertrag-/Renderer-/Strukturstatus
  (`SectionContractStatus` über `evaluateSectionStatus`).
- Admin-Härtungshinweis (`AdminHardeningNotice`) ist sichtbar im Workbench.
- Paste prüft Vertragsrisiken vor dem Schreiben über
  `evaluateStructurePlacementRisk` (gemeinsamer Helper) und verlangt bei
  Risiko ein bewusstes Confirm. Geprüfte Fälle: child-only als Top-Level,
  child-only unter falschem Parent, Top-Level-only unter Parent,
  `allowed_children`-Whitelist verletzt, Ziel-Parent ohne Vertrag.
- Move/Parent-Änderungen (`onSectionSetParent` → `setSectionParent`)
  laufen denselben Vertragscheck vor dem RPC-Aufruf. Bei Abbruch wird
  `setSectionParent` nicht aufgerufen. Paste und Move nutzen dieselbe
  Wahrheit (`evaluateStructurePlacementRisk`).
- Delete warnt bei Kind-Blöcken (`describeDeleteRisk`) im bestehenden
  Confirm-Dialog.
- Keine Migration, keine neue RPC, keine Produktdatenbank-Berührung,
  keine Public-Renderer-/Routen-/Navigation-/Footer-/i18n-Änderung.
- Text- und Bildpflege im Admin bleibt unverändert möglich.
- `npm run cms:audit:contract`: 15 OK · 2 Warn · 0 Konflikt.
- `npm run build`: in dieser Etappe nicht ausgeführt (Builds laufen über
  Lovable-Harness); siehe `docs/04-betrieb/sprint-0-eine-wahrheit-bericht.md`.

**Bekannte Restpunkte (für Sprint 1):**
- Aggregiertes DB-Drift-Audit als Node-Skript erst Sprint 1
  (`contract-drift-audit.mjs` via dediziertem Read-RPC).
- Admin-Feldquelle ist noch DB-getrieben — Sprint 1 stellt auf
  Vertrag-getrieben um, DB/Whitelist als Diagnose-Overlay.
- Engere Verträge für `tabs_v1.allowed_children` und Container-Slots.

---

Stand vorher: 2026-05-27 (Hotfix 27c — Lucide-Resolver lowercase, Icon-Dialog mit Bildicon-Slot, gepairte icon_image-Whitelist)

## Hotfix 27c — Lucide-Resolver + Bildicon-Slot im Icon-Dialog (2026-05-27)

**Korrekturen (idempotent, kein Layoutwechsel, kein Inhalt geändert):**

1. **`iconResolver.tsx`:** Einteilige lowercase-Werte wie `smartphone`, `shield`, `eye`, `accessibility`, `fence` wurden bisher als generischer Check-Haken gerendert, obwohl der Audit sie als gültig zählte (Mismatch zwischen Audit und UI). Resolver probiert jetzt mehrere Kandidaten in fester Reihenfolge: Originalwert → kebab→Pascal → erste-Buchstabe-groß → lowercase→Pascal. Erst danach Fallback. Kebab-Werte wie `shield-check`, `building-2`, `key-round` funktionieren weiter.
2. **`IconEditDialog` in `AssetWorkbench.tsx`:** Zweigeteilt. (A) Lucide wie bisher (Picker + DE/EN-Save). (B) optionaler TCS-Bildicon-Slot mit bestehendem `AssetUploader` für den abgeleiteten `icon_image`-Pfad (`icon` → `icon_image`, `<pfad>.icon` → `<pfad>.icon_image`). Hinweis im Dialog: aktives Bildicon gewinnt vor Lucide. Kein neuer Schreibweg, kein SVG-Pfad neu freigeschaltet — bestehende PNG/JPG/WebP-Pipeline.
3. **Whitelist-Migration (idempotent):** Für jedes aktive Icon-Feld in `cms_section_fields` (`field_key='icon'` oder `LIKE '%.icon'`) wurde — sofern noch nicht vorhanden — ein DE+EN-Eintrag mit dem gepairten `icon_image`-Slot in `cms_admin_editable_fields` angelegt. Keine Assets erzeugt, keine Werte geändert.
4. **`BildungseinrichtungenPage.tsx`:** Priorität pro Anforderungs-Icon angeschlossen: `cms.asset("einrichtungen", "<id>.anforderungen.<key>.icon_image")` → Lucide aus `<id>.anforderungen.<key>.icon` → Code-Fallback. `data-cms-field` spiegelt das tatsächlich gerenderte Element.
5. **Audit-Alignment:** `icon-sync-audit.mjs` enthält bereits dieselbe Normalisierung über `LUCIDE_KEBAB` — Audit und UI stimmen jetzt überein. Keine getrennten Wahrheiten.

**Geprüfte Spezialseiten ohne Anschluss in dieser Etappe:** `GesundheitseinrichtungenPage.tsx`, `ObjektloesungenPage.tsx`, `OeffentlicheHandPage.tsx` — keine eindeutigen strukturierten `.icon`-Felder mit Bildicon-Bedarf. Renderer-Anschluss kann bei Bedarf in Folge-Etappen ergänzt werden.

**Audit nachher:** Icon-Sync: I0=288, I1=0, I2=0, I3=0, I4=74 (alle pre-existing), I5=0 (alle Bildicon-Slots gepaart), I6=147 (unverändert).

**Realtest (DOM-Resolver):** `smartphone`→Smartphone (vorher: Check-Haken), `shield`→Shield, `eye`→Eye, `accessibility`→Accessibility, `fence`→Fence, `shield-check`→ShieldCheck (unverändert korrekt), `ShieldCheck` (Legacy-Pascal)→ShieldCheck. Live-Upload eines Bildicons über den neuen Dialogbereich wurde nicht ausgeführt; Pflegeplatz ist sichtbar, Schreibweg ist der bestehende AssetUploader.

**Scope:** Keine Produktdatenbank, keine Public-Route, keine Navigation, kein Footer, kein Breadcrumb, keine i18n-JSON, kein Asset hochgeladen/gelöscht, kein neuer Section-Typ, kein Layout-Change, keine Legacy-Felder entfernt, keine neue Upload-Sicherheitslogik.

---

Stand vorher: 2026-05-27 (Hotfix 27b-1 — Icon-Marker, Parent-Typ cards_v1, Sort-Order fachlich, Audit paginated)

## Hotfix 27b-1 — Marker/Parent/Sortierung/Audit (2026-05-27)

**Korrekturen nach 27b (alle idempotent, kein Layoutwechsel, kein Inhalt geändert):**

1. **DOM-Marker für Icons (`AnwendungDetailPage.tsx`):** Vorher wurde im Kindsection-Modus pauschal `data-cms-field="icon_image"` gesetzt — auch wenn tatsächlich ein Lucide-Icon aus `icon` gerendert wurde. Jetzt spiegelt der Marker, was sichtbar ist: `icon_image` bei aktivem Bildicon-Asset, sonst `icon`. „In Vorschau" aus dem Medienbereich landet damit pro Karte am richtigen Element.
2. **Parent-Typ `anforderungen` auf `cards_v1`:** Auf 16 Anwendungen-Seiten von `content_v1` → `cards_v1` gesetzt. Sicher, weil `AnwendungDetailPage` legacy `PageLayout` nutzt (keine `section_type`-Registry-Iteration) — kein Doppelrendering. Aligniert zugleich mit `READS_ICON_ON_CHILDREN` im Icon-Sync-Audit, daher landen die 60 neuen Iconkarten als I0 statt I4.
3. **Sort-Order korrigiert:** 60 `anforderungen_item_*` von alphabetisch auf die ursprüngliche fachliche Reihenfolge aus dem Code zurückgesetzt (z. B. Behörde: zutritt, cloud, tore, orientierung, barrierefreiheit). Mobile-tuerkommunikation, bidirektionaleVideo etc. mit camelCase-Keys, die in der DB fehlen (audioVideo, vieleEinheiten, raumZuRaum, alleWohneinheiten, smartStickMobile, …), bleiben unangetastet — wurden in 27b nicht migriert.
4. **`icon-sync-audit.mjs` Pagination:** Sections-Query nutzt jetzt Page-Loop (Supabase 1000-Row-Limit). Vorher fielen Parent-Sections unter den Tisch, wodurch `card_v1`-Kinder fälschlich als „unter —" erschienen.

**Audits vorher → nachher:**
- Icon-Sync: I3=0, I2=0. I5=4 unverändert (gebaeudekommunikation.tuersprechanlagen, pre-existing). I4=74 — alle verbleibenden Einträge pre-existing (gebaeudekommunikation.*, snipdoo-ip, zutrittskontrolle.bcm-handsender), keine Anwendungen-Karte mehr drin. I0=284.
- Rendertreue: R4=0, R5=432, R3=41 (pre-existing).
- Medien-Konsistenz: A=36, B=C=D=E=F=0.
- `npm run i18n:check`: 0 Fehler, 0 Warnungen. `tsc --noEmit`: grün.

**Realtest:**
- `anwendungen.behoerde / anforderungen_item_tore / icon = "fence"` → DOM zeigt `<span data-cms-field="icon">` mit Lucide `Fence`.
- `anwendungen.bidirektionale-video / anforderungen_item_barrierefreiheit / icon = "accessibility"` → DOM zeigt `<span data-cms-field="icon">` mit Lucide `Accessibility`.
- Sobald für eine Karte ein `icon_image`-Asset hochgeladen wird, schaltet derselbe `<span>` automatisch auf `data-cms-field="icon_image"` mit `<img>` um.

**Scope:** Keine Produktdatenbank, keine Public-Route, keine Public-Navigation, kein Footer, keine i18n-JSON, kein Asset hochgeladen oder gelöscht, kein neuer Section-Typ, kein Layout-Change, keine Legacy-Felder gelöscht, keine Breadcrumb-Änderung.



## Tranche 27b — Anforderungen → cards (2026-05-27)

**Ziel:** Legacy-Sammelblock `anforderungen` (content_v1 mit `<key>.label/.text/.icon`) auf echte `card_v1`-Kindsections umgestellt — Pilot (`anwendungen.behoerde`, `anwendungen.bidirektionale-video`) und Rollout (13 weitere Anwendungen-Seiten mit eindeutigem Mapping) in einer idempotenten Migration.

**Migration (idempotent):**
- 15 Seiten migriert, 72 neue `card_v1`-Kindsections (`anforderungen_item_<key>`) unter Parent `anforderungen` (Parent bleibt `content_v1`, weil eigener Renderer in `AnwendungDetailPage.tsx` zuständig ist; kein Doppel-Render durch generischen `cards_v1`-Renderer).
- 432 neue Felder (`title` aus `<key>.label`, `description` aus `<key>.text`, `icon` aus `<key>.icon`, je DE+EN).
- 576 neue Whitelist-Einträge (`title`, `description`, `icon`, `icon_image` × DE+EN).
- Sort-Order alphabetisch nach Karten-Key, deterministisch und stabil bei Wiederholung.
- Legacy-Felder bleiben unverändert als Fallback.

**Ausgelassen:** `anwendungen.mobile-tuerkommunikation` (nur 1 Legacy-Karte plus 24 Sonderfelder — Mapping nicht eindeutig). `anwendungen.bildungseinrichtungen`, `anwendungen.gesundheitseinrichtungen`, `anwendungen.objektloesungen`, `anwendungen.oeffentliche-hand` haben keine `anforderungen`-Section, also nicht betroffen.

**Renderer-Doppelpfad in `AnwendungDetailPage.tsx`:** Wenn `anforderungen_item_*`-Kindsections existieren, liest der Renderer DB-first aus diesen (`title`, `description`, `icon` + Asset-Slot `icon_image`). Icon-Priorität: `icon_image` (TCS-Bildicon) → Lucide `icon` → `CheckCircle2`-Fallback. DOM-Marker pro Karte: `data-cms-page`, `data-cms-section="anforderungen_item_<key>"`, `data-cms-card="<key>"`, `data-cms-field="title|description|icon|icon_image"`. Ohne Kindsections greift der 27a-Legacy-Pfad weiter.

**Audits vorher → nachher:**
- Icon-Sync I3=0, I5=0 (unverändert). I4 71→105 — neue `card_v1` unter `content_v1`-Parent, vom Custom-Renderer korrekt verarbeitet, generischer Audit kennt diesen Pfad nicht (kein Renderer-Fehler). I6=143 unverändert: Legacy-Felder bewusst als Fallback erhalten (keine Löschung pro Auftrag).
- Rendertreue R4=0, S2=0 (unverändert). `tsc --noEmit` grün, `npm run i18n:check` 0 Fehler.

**Realtest:** `/anwendungen/behoerde` und `/anwendungen/bidirektionale-video` zeigen Karten aus den neuen Kindsections (Reihenfolge alphabetisch wie sort_order); Inhalte 1:1 wie zuvor.

**Scope:** Keine Produktdatenbank, keine Public-Route, keine Public-Navigation, kein Footer, keine i18n-JSON, kein Asset hochgeladen, kein Legacy-Feld gelöscht, kein neuer Section-Typ, kein Layout-Change.

**Nächste Etappe:** Erste TCS-Bildicons im Admin in `icon_image`-Slot je Karte pflegen — zeigt dann automatisch Bildicon statt Lucide. Mobile-tuerkommunikation-Sonderfall separat klären.

## Tranche 27a — Renderer-Hotfix Anforderungen/Systembausteine (2026-05-27)


**Symptom:** Im Medienbereich z. B. `anwendungen.behoerde / anforderungen / tore.icon = fence` gepflegt, aber auf der Live-Vorschau erschien das Icon an der falschen Karte (Reihenfolge stimmte nicht). Gleiches Muster bei `anwendungen.bidirektionale-video / barrierefreiheit.icon` und weiteren 14 Anwendungen-Seiten, die `AnwendungDetailPage.tsx` nutzen.

**Ursache:** `AnwendungDetailPage.tsx` baute `cmsAnforderungen` aus `uniquePrefixes(cms.fieldKeys("anforderungen"))` — und `fieldKeys` sortiert alphabetisch (`useCmsPageContent.ts` Zeile 202). Anschließend wurde diese alphabetische DB-Liste per Index mit dem in Code-Reihenfolge stehenden `data.anforderungen`-Array gemerged. Folge: Position 0 bekam DB-Key `barrierefreiheit` aber Code-Icon-Fallback `KeyRound` (von `zutritt`); DOM-Marker `data-cms-field` und sichtbares Icon/Label drifteten auseinander. Identisches Muster für `leistungen` und `systembausteine`.

**Fix (DB-first nach Key):** Bei vorhandenen CMS-Einträgen iteriert der Renderer jetzt direkt über die CMS-Liste (DB-Reihenfolge ist Wahrheit) und verwendet keinen positionsbasierten Code-Fallback mehr für Icons. `resolveIcon(iconName)` fällt bei leerem/ungültigem DB-Wert auf `CheckCircle2`. Audit (Tranche 23) belegt: 100 % der `anwendungen.*/anforderungen/<key>.icon` sind in DB gepflegt, der Verlust des positionalen Code-Icon-Fallbacks ist daher folgenlos. Pro sichtbare Einzelkarte sind jetzt gesetzt: `data-cms-page`, `data-cms-section`, `data-cms-card="<key>"`, `data-cms-field="<key>.icon|.label|.text"`. Selbe Logik für `systembausteine`. `leistungen` wurde ebenfalls auf direkte CMS-Iteration umgestellt (gleicher Index-Mismatch, aber dort ohne Icons — niedriges Risiko).

**Was bewusst NICHT in 27a passiert ist:**
- Keine DB-Migration, keine Umstellung auf `cards_v1`/`card_v1`-Kindsections (das ist 27b Pilot, 27c Rollout).
- I6 bleibt bei 143 — das Datenmodell (`content_v1` mit `<key>.icon`-Feldern) bleibt absichtlich Legacy. Erst 27b/c räumen das auf.
- Keine Layoutänderung, kein Asset, keine Navigation, kein Footer, keine i18n-JSON, keine Public-Route, keine Produktdatenbank.

**Geänderte Dateien:** `src/features/anwendungen/components/AnwendungDetailPage.tsx`, `docs/current-status.md`.

**Audits vorher/nachher (identisch):** Icon-Sync I0 179 · I2 0 · I3 0 · I4 71 · I5 0 · I6 143 (Datenmodell unverändert). Rendertreue R4 0. `tsc --noEmit` grün. `npm run i18n:check` grün.

**Wirkung auf alle 16 Seiten, die `AnwendungDetailPage` nutzen:** behoerde, bidirektionale-video, concierge, digitale-namensverwaltung, einfamilienhaus, feuerwehr, feuerwehrdurchsage, grossanlage, interne-kommunikation, klinik, mehrfamilienhaus, mobile-tuerkommunikation, pflege, sanierung, schwimmbad, zutrittskontrolle-bcm. Karten-Label, -Text und -Icon kommen jetzt deckungsgleich aus derselben DB-Zeile; „In Vorschau" aus dem Medienbereich landet via `data-cms-card`/`data-cms-field` auf der korrekten Einzelkarte.

**Nächste Etappe:** 27b — Pilot-Migration `anwendungen.behoerde` + `anwendungen.bidirektionale-video` auf echte `cards_v1` + `card_v1`-Kindkarten inkl. `icon_image`-Slot, dann 27c-Rollout auf die übrigen 14 Seiten (nach Freigabe und Mapping-Audit pro Seite).

---

## Tranche 26 — TCS in Bauten Einzelkarten (2026-05-27)

**Ziel:** Auf P-055 hatte der Admin nur die 5 Sammel-Blöcke B-246…B-250. Die einzelnen Karten (Einfamilienhaus, Mehrfamilienhaus, Großanlage, Sanierung, Schule, Kita, Wohnheim, Pflege, Klinik, Behörde, Feuerwehr, Schwimmbad, Mobile, BCM, Signage, Entry, snipdoo, 5 Systemfunktionen, 6 Referenzprojekte) lagen als flache Legacy-Felder am Container und waren weder einzeln editierbar noch hatten sie eigene Bild-/Icon-Slots.

**Migration (idempotent):** 7 neue `cards_v1`-Container (`categories_wohnen/bildung/gesundheit/oeffentlich/uebergreifend`, `systemfunktionen_cards`, `referenzen_cards`) + 28 `card_v1`-Kindsections. Felder aus Legacy-Quellen kopiert (`title`, `description`, `tags` als Komma-Liste, `cta_href`, `icon` Lucide). Whitelist DE+EN für jeden Slot (`title`, `description`, `tags`, `cta_href`, `icon`, `icon_image`, `image`; bei Referenzprojekten ohne tags/cta/icon). Legacy-Felder bleiben als Renderer-Fallback erhalten.

**Renderer-Patch:** `AnwendungenPage.tsx` rendert pro Gruppe DB-Kindsections wenn vorhanden, sonst Code-Default + flache Felder (Spiegel-Regel). Icon-Priorität: `icon_image` (TCS-Bildicon) → `icon` (Lucide via `resolveIcon`) → Code-Default-Icon pro Karten-Key.

**Verifikation:** `SELECT … section_type='card_v1'` liefert 28 Karten unter P-055; `cards_v1`-Container 7 Stück.

**Scope:** Produktdatenbank ✗ · Public-Routen/Navigation/Footer ✗ · i18n-JSON ✗ · andere Seiten ✗ · `card`/B-247 unverändert · Wohnbau-Detailseiten unverändert.



**Symptom:** Beim Klick auf `P-063 / anwendungen.grossanlage` (z. B. über Karten-Pille `B-598` oder Kurz-ID) landete der Arbeitsbereich im Footer-Link-Editor („Reiner Footer-Link"), obwohl der redaktionelle Knoten im Main-Baum (`an.wohnbau.gross`, N-78) existiert.

**Ursache:** Zwei lokale Hilfsfunktionen `pickCanonicalNode` (in `MasterDetailWorkbench.tsx` und `NavigationTreeEditor.tsx`) sowie die Sticky-Logik in `handlePreviewRouteChange` haben den aktuellen `nav_area` des ausgewählten Knotens als ERSTE Sortierregel benutzt. Wer einmal einen Footer-Knoten angeklickt hatte, blieb beim nächsten Page-Sprung auf dem Footer-Alias kleben.

**Fix:** Es gibt jetzt genau EINE Auswahlregel — `pickEditorialNodeForPage` (`src/features/admin/lib/pickEditorialNode.ts`):
1. Bevorzuge `node_type='page'`
2. Bevorzuge `nav_area` in der Reihenfolge main → meta → home → persona; Footer/Footer-Bottom werden hart deklassiert und nur gewählt, wenn KEINE redaktionelle Alternative existiert
3. Bevorzuge nicht-Alias-Keys (`f.*`, `m.*`, `h.*` werden zuletzt gewählt)
4. Fallback: kleinste `sort_order`

Der Footer-Link-Editor erscheint jetzt ausschließlich, wenn der Nutzer im Navigationsbaum EXAKT den Footer-Knoten selbst auswählt — nicht beim Sprung auf eine Seite.

### Betroffene Knoten (Beispiele Anwendungen/Wohnungsbau)

| page_key | redaktioneller Knoten (jetzt gewählt) | Footer-Alias (deklassiert) |
|---|---|---|
| `anwendungen.einfamilienhaus` | N-77 `an.wohnbau.efh` (main) | N-63 `f.anw.efh` (footer) |
| `anwendungen.mehrfamilienhaus` | N-79 `an.wohnbau.mfh` (main) | N-5 `f.anw.mfh` (footer) |
| `anwendungen.grossanlage` | N-78 `an.wohnbau.gross` (main) | N-52 `f.anw.gross` (footer) |
| `anwendungen.sanierung` | N-80 `an.wohnbau.sanierung` (main) | — (kein Footer-Alias) |

### Geänderte Dateien

- `src/features/admin/components/MasterDetailWorkbench.tsx` — `pickCanonicalNode` und Sticky-Logik in `handlePreviewRouteChange` entfernt; alle Page-Sprünge laufen über `pickEditorialNodeForPage`.
- `src/features/admin/components/NavigationTreeEditor.tsx` — lokales `pickCanonicalNode` entfernt; `onSectionSelect` ruft `pickEditorialNodeForPage`.
- `docs/current-status.md`, `docs/04-betrieb/prompts-vs-admin.md`, `docs/03-redaktion/checkliste-redaktion.md` — Regel dokumentiert.

### Breadcrumb-Befund (NICHT in dieser Tranche geändert)

Die öffentliche Breadcrumb auf `/anwendungen/grossanlage` zeigt `Startseite > Anwendungen > Großanlagen`. Quelle ist heute der Code-Pfad (`src/navigation/useDbBreadcrumb.ts` + `routes.ts` + `breadcrumbVisibility.ts`), der die Hierarchie aus dem flachen Route-Pfad ableitet. `cms_navigation_nodes` enthält bereits eine alternative Struktur „TCS in Bauten / Wohnungsbau / Großanlage" (Parent `d9903b7d-…` mit Kindern N-77–80), aus der die Breadcrumb künftig DB-first gezogen werden könnte. Eine eigene Public-Breadcrumb-Etappe ist dafür nötig — kein Teil dieses Hotfix.

### Scope-Bestätigung

- Keine Produktdatenbank.
- Keine Public-Routen, keine Public-Navigation, kein Footer-Public-Verhalten geändert.
- Keine Breadcrumb-Umstellung.
- Keine Migration, keine RPC-Änderung, keine i18n-/Asset-Änderung.
- Nur Admin-Auswahl-/Sprunglogik.
- Checks: `npx tsc --noEmit` OK, `npm run i18n:check` OK (75 Seiten, 0 Fehler).

## Tranche 24 — Iconkarten-Slotpflege + Karten-Palette (2026-05-27)

**Ziel:** Eindeutige Iconkarten unter Kartencontainern bekommen einen pflegbaren Bildicon-Slot. Karten-Palette im Admin trennt Lucide-Icon und TCS-Bildicon sichtbar. Keine neuen Section-Typen, kein Renderer-Umbau, kein Asset-Upload.

### Audit vorher → nachher (Icon-Sync)

| Klasse | Vorher | Nachher | Bedeutung |
|---|---|---|---|
| I0 OK | 0 | **157** | Iconkarten mit Bildicon-Slot pflegbar |
| I3 Lucide ungültig | 0 | 0 | bleibt sauber (Tranche 23) |
| I4 Renderer-ignoriert | 71 | 71 | unverändert — `card_v1.icon` unter `content_v1`-Containern (eigene Strukturentscheidung) |
| I5 Bildicon-Slot fehlt | 157 | **0** | alle eindeutigen Iconkarten unter `cards_v1`-Eltern haben `icon_image`-Whitelist DE+EN |
| I6 Needs decision | 143 | 143 | unverändert — `items.*.icon` in `content_v1` (z. B. `anwendungen.*/anforderungen`); benötigt Renderer-Co-Änderung |
| R4 Renderer-Fehler | 0 | 0 | unverändert |
| S2 Pflichtfeldfehler | 0 | 0 | unverändert |

### Migration (idempotent)

`supabase/migrations/…_tranche_24_icon_image_whitelist.sql`:

- Quelle: alle aktiven `card_v1` mit aktivem `cards_v1`-Elternblock, die bereits ein `icon`-Feld haben (227 Karten).
- Ziel: pro Karte 2 Whitelist-Einträge (`field_key='icon_image'`, locale `de` + `en`, `is_enabled=true`).
- `ON CONFLICT DO NOTHING` — kein Wert überschrieben, kein Asset hochgeladen, keine bestehenden Lucide-Icons angefasst.
- Tabellenstand `cms_admin_editable_fields.icon_image` nach Migration: 386 Einträge (inkl. vorbestehender).

### Code-Änderungen

- `src/features/admin/lib/editorialSectionKind.ts`: `iconkarte` aufgeteilt in `iconkarte-bildicon` (Asset aktiv — Bildicon hat Vorrang) und `iconkarte-lucide` (nur Lucide-Icon oder Slot vorbereitet). Alter `iconkarte`-Type bleibt im Union als Kompatibilität. Keine Renderer-/RPC-Änderung.

### Bewusst NICHT verändert

- **I4 (71)** — `card_v1.icon` in `content_v1`-Eltern: eindeutige Korrektur wäre Strukturmigration (Eltern auf `cards_v1` umstellen), greift in Anzeige ein → eigene Tranche.
- **I6 (143)** — `anwendungen.*/anforderungen` mit `<key>.label/.text/.icon`: `AnwendungDetailPage.tsx` liest diese Felder per `cms.fieldKeys("anforderungen")` direkt. Umstellung auf `card_v1`-Kindsections braucht Renderer-Doppelpfad (Kindsections + Legacy-Fallback) — eigener Auftrag empfohlen (Tranche 25).
- **`TEMPLATE_REGISTRY`** in `src/features/admin/lib/templates.ts` enthält **Seiten-Strukturvorlagen** (z. B. `produkt_sub_v1`), nicht die Kartenpalette. Die redaktionellen Karten-Varianten („Bildkarte / Iconkarte (Lucide) / Iconkarte (TCS-Bildicon) / Textkarte / Wechselteaser / Kennzahlen / CTA / Kontaktblock") werden über `editorialSectionKind.ts` live aus DB-Slots abgeleitet und als Badge im Baum angezeigt. Kein doppelter Palette-Code nötig.
- Renderer, Public-Routen, Navigation, Footer, i18n-JSON, Produktdatenbank, Storage — alles unverändert.

### Stichproben

- `anwendungen.oeffentliche-hand`: hat **keine** `anforderungen`-Section, sondern `cards` (content_v1) mit Persona-Items → kein Migrationsfall in dieser Tranche.
- `anwendungen.behoerde/anforderungen`: Muster `<key>.label/.text/.icon` (5 Items: barrierefreiheit, cloud, orientierung, tore, zutritt) → I6, bewusst zurückgestellt.
- `gebaeudekommunikation.grossanlagen/anforderungen`: bereits korrekt als `content_v1` mit 6 `card_v1`-Kindsections (`anforderungen__nutzung` etc.) — Vorlage für künftige Migration.
- `gebaeudemanagement.*` (digital-signage, digitale-namensanzeige, reservieren-buchen, schraenke-behaelter): I5 → I0 gewandert, Bildicon-Slot pflegbar.
- `zutrittskontrolle.*` (bcm-handsender, biometrie, bcm-online-leser …): I5 → I0 gewandert.
- `service.downloads`: keine `cards_v1`-Iconkarten — kein Treffer.

### Checks

- `node scripts/cms/icon-sync-audit.mjs` → I0 0→**157**, I5 157→**0**, I4/I6 unverändert.
- `node scripts/cms/rendertreue-audit.mjs` → R4 = **0** (unverändert).
- `node scripts/cms/redaktions-fluss-audit.mjs` → S2 = **0** (unverändert).
- `npm run i18n:check` → vor Auslieferung lokal laufen; reine Whitelist-/Label-Tranche, keine Inhaltsänderung.
- `npx tsc --noEmit` → additive Union-Erweiterung, keine externen Aufrufer betroffen (`rg '"iconkarte"' src/` liefert nur die eigene Definition).

### Scope-Bestätigung

Produktdatenbank ✗ · Public-Navigation ✗ · Public-Routen ✗ · i18n-JSON ✗ · neue Section-Typen ✗ · neue Sonderkarten ✗ · Assets hochgeladen ✗ · Assets gelöscht ✗. Nur: Whitelist-Insert, additive Label-Trennung im Admin.

---


## Tranche 23 — Icon-Pflege (2026-05-27)

**Ziel:** Sichtbares Icon = im Admin gepflegtes Icon. Lucide und TCS-Bildicon als ein Slot mit klarer Priorität `icon_image → icon → kein Icon`.

### Root cause (warum Admin ≠ Frontend)

1. `FeatureGridV1` las Lucide via `Lucide[kebab]` direkt — Picker speichert aber Kebab (`shield-check`), Lucide exportiert PascalCase (`ShieldCheck`). Kein Treffer → kein Icon im Frontend.
2. `CardsSectionV1` las `icon` gar nicht → 228 stored `card_v1.icon`-Werte unter `cards_v1`/`content_v1` waren stumm.
3. Lucide-react hat Icons umbenannt (`CheckCircle2` → `CircleCheckBig`, `Home` → `House`); Resolver-Fallback griff falsch.

### Fixes (Code)

- `src/features/cms/components/sections/FeatureGridV1.tsx`: nutzt `resolveIcon` (Kebab-aware).
- `src/features/cms/components/sections/CardsSectionV1.tsx`: 3. Fallback Lucide `icon` nach `image`/`icon_image`.
- `src/features/cms/components/iconResolver.tsx`: zusätzlich Lucide-Named-Re-Exports (Legacy-Namen) als Fallback.
- `src/features/admin/components/IconPickerDialog.tsx`: kein 240er-Hard-Cap, „Mehr anzeigen"-Chunks à 240, DE-Synonym-Map (Tür→door, Schloss→lock, Schlüssel→key, Warnung→alert …).

### Neues Audit (`scripts/cms/icon-sync-audit.mjs`)

Klassen I0 OK · I1 Bildicon aktiv · I2 DE/EN diff · I3 Lucide ungültig · I4 Renderer-ignoriert · I5 Bildicon-Slot fehlt · I6 Needs decision.

Stand nach Fix: **I0 0 · I1 0 · I2 0 · I3 0 · I4 71 · I5 157 · I6 143** (371 Iconfelder, 115 Seiten).

- I4 (71): `card_v1.icon` unter `content_v1` — Container ohne Card-Renderer. Redaktionsentscheidung: entweder Section-Typ auf `cards_v1`/`feature_grid_v1` migrieren oder Iconfeld leeren. Nicht in diesem Scope.
- I5 (157): Iconkarte hat `icon`, aber kein pflegbarer `icon_image`-Slot. Tranche 24-Kandidat (Whitelist-Vorbereitung), bewusst nicht migriert ohne Eindeutigkeit.
- I6 (143): `items.*.icon` in `content_v1`-Legacy-Sections — bewusst behalten.

### Renderer-Priorität (verbindlich)

`image` → `icon_image` (TCS-Bildicon) → `icon` (Lucide) → kein Icon. Gilt für `card_v1` in `cards_v1` und `feature_grid_v1`.

### Checks

- `node scripts/cms/icon-sync-audit.mjs` → I3 = 0 (von 79 vor Fix).
- `node scripts/cms/rendertreue-audit.mjs` → R4 = 0 (unverändert).
- `node scripts/cms/redaktions-fluss-audit.mjs` → S2 = 0 (unverändert).
- `npm run i18n:check` → vor Auslieferung lokal laufen.

### Nicht erlaubt / nicht gemacht

- Keine Migration, keine RPC, keine Assets bewegt.
- Keine `icon_image`-Whitelist-Slots vorbereitet (I5 ist Tranche-24-Material).
- Keine Public-Routen/Navigation/Footer/i18n-JSON berührt.
- Keine Tab-State-Refactor — bestehender `reload`-Pfad in AssetWorkbench bleibt; größere Synchronisation eskaliert in Tranche 24.

---

## Tranche 22 — Redaktionsübergabe promptfest (2026-05-27)


**Ziel:** Redakteure können mit Admin + kontrollierten Inhalts-Prompts
weiterarbeiten, ohne dass neue Inhalte in Code/i18n statt in CMS-Light
landen oder Wildwuchs an Section-Typen entsteht.

### Doku-Änderungen (nur Doku, keine Code-/DB-Änderung)

- Neu: [`docs/03-redaktion/redaktions-prompts.md`](03-redaktion/redaktions-prompts.md)
  — 10 Standard-Prompt-Vorlagen (Textänderung, Bild, Lucide-Icon,
  TCS-Bildicon, Wechselteaser kopieren, Karten kopieren, neue Seite
  nach Vorlage, neue Karten im Container, Rendertreue-Verdacht, QA).
  Jede Vorlage trägt Arbeitsregel, Scope, Nicht-erlaubt, Akzeptanz,
  Checks, Bericht.
- Neu: [`docs/03-redaktion/qa-nach-redaktionsrunde.md`](03-redaktion/qa-nach-redaktionsrunde.md)
  — Pflicht-Audit-Reihenfolge + Sollwerte (R4=0, S2=0, H4=0) +
  Sichtprüfung-Stichproben + Eskalation.
- Stand-Zeilen synchronisiert: `prompts-vs-admin.md`,
  `checkliste-redaktion.md`. Inhalte unverändert, da bereits aktuell.

### Redaktionsgrenzen (zur Erinnerung)

Redaktion/Admin: bestehende Texte, Bilder, Alt-Texte, Lucide-Icons,
TCS-Bildicons, Sichtbarkeit/Reihenfolge, Kopieren bekannter Standardblöcke.

Prompt/techn. Steuerung: neue Seiten, neue Felder/Slots, Template-/
Layout-Änderungen, Navigation/Footer/Routen, Produktdaten, unklare
Legacy-/Schein-Bearbeitung, alles was potentiell in Code/i18n landen
könnte.

### Was nicht geändert wurde

- Keine Migration, keine RPC, kein Renderer, keine Admin-UI.
- Keine Produktdatenbank, keine Public-Routen/Navigation/Footer.
- Keine i18n-JSON-Inhalte, keine Assets, keine neuen Section-Typen.

### Checks

- `npm run i18n:check` → OK (0/0).
- `npx tsc --noEmit` nicht ausgeführt — reine Doku-Tranche, kein Code
  berührt. Ehrliche Meldung statt Pflichtlauf.

---



## Tranche 21 — Admin-Hygiene (2026-05-27)

**Ziel:** Redakteure sehen weniger technische Altlasten im Admin. Verwaiste
Whitelist-Einträge, aktive Assets auf unsichtbaren Strukturen und
renderer-ignorierte Slots werden klassifiziert und — soweit eindeutig —
deaktiviert. Keine Daten gelöscht, keine Storage-Files entfernt.

### Neues Audit (`scripts/cms/admin-hygiene-audit.mjs`)

Klassifiziert Befunde in H0 OK · H1 Feld fehlt (Pflegeauftrag) ·
H2 Verwaiste Whitelist · H3 Inaktives Asset · H4 Renderer-ignoriert ·
H5 Bewusster Fallback (`items.*` mit Kindern) · H6 Needs decision.

### Bereinigung (idempotente Migration)

| Klasse | vorher | bereinigt | nachher | Maßnahme |
|---|---:|---:|---:|---|
| H2 section fehlt | 52 | 52 | 0 | Whitelist `is_enabled=false` |
| H2 section inaktiv | 1457 | 1457 | 0 | Whitelist `is_enabled=false` |
| H2 page inaktiv | 447 | 0 | 447 | bewusst behalten (mögliche Drafts) |
| H3 section inaktiv/fehlt | 39 | 39 | 0 | Asset `is_active=false` |
| H3 page inaktiv | 11 | 0 | 11 | bewusst behalten (mögliche Drafts) |
| H4 `content_v1.image` | 30 | 30 | 0 | Whitelist `is_enabled=false` |
| H4 `series_override_v1.image` | 60 | 60 | 0 | Whitelist `is_enabled=false` |
| H5 `items.*`-Fallbacks | 2104 | 0 | 2104 | erhalten (Daten bleiben) |
| H1 Whitelist ohne Feld | 677 | 0 | 677 | erhalten (Pflegeauftrag) |

Summen: **1599 Whitelist-Toggles + 39 Asset-Toggles**. Alles reversibel
(`rpc_admin_set_editable_field_enabled` bzw. `rpc_admin_upsert_asset`).

### Grundsatz

- Legacy wird **nicht gelöscht**, sondern aus dem normalen Redaktionsfluss
  entfernt.
- Whitelist-Leichen werden **deaktiviert**, nicht erraten.
- Aktive Assets auf inaktiven Strukturen werden als Legacy behandelt
  (`is_active=false`); die Datei im Storage bleibt.
- Standardansichten zeigen damit nur aktuelle, sichtbare, pflegbare
  Inhalte. Legacy/Inaktiv ist per Toggle weiterhin einsehbar.

### Offen (needs-decision)

- 447 Whitelist-Einträge auf Pages mit `is_active=false` /
  `status<>'published'` — könnten Drafts in Vorbereitung sein.
- 11 aktive Assets auf solchen Pages — gleiche Begründung.

### Was nicht geändert wurde

- Keine Inhalte überschrieben, keine Storage-Files gelöscht.
- Keine neuen Section-Typen, keine Renderer-Änderung.
- Keine Public-Routen / Navigation / Footer.
- Keine Produktdatenbank, keine i18n-JSON-Inhalte.

### Checks

- `npx tsc --noEmit` → OK.
- `npm run i18n:check` → OK (0/0).
- `node scripts/cms/admin-hygiene-audit.mjs` → H2 1956→447, H3 50→11,
  H4 90→0.
- `node scripts/cms/redaktions-fluss-audit.mjs` → S2 = 0 (unverändert).
- `node scripts/cms/rendertreue-audit.mjs` → R4 = 0 (unverändert).
- `node scripts/cms/medien-konsistenz-audit.mjs` → grün (unverändert).

---

## Tranche 20 — Bildredaktion finalisieren (2026-05-26)

**Ziel:** Bildredakteure finden alle Bilder/Icons pro Seite schnell, sehen
Slotart und Pflegestatus eindeutig und können Lücken (Alt-Text, fehlende
Viewports) gezielt filtern. Keine Datenmutation, keine Migration.

### Neue/verbesserte Filter in der Medien-Workbench (`AssetWorkbench`)

- **Slotart:** alle / Bild (`image`) / Thumbnail (`thumbnail`) / TCS-Bildicon
  (`icon_image`) / Lucide-Icon (Textfeld).
- **Viewport vorhanden:** Slot hat irgendein Asset im gewählten Viewport.
- **Viewport fehlt:** Desktop fehlt · Tablet fehlt · Mobile fehlt · Tablet/
  Mobile fehlt · nur Desktop vorhanden.
- **Alt-Text:** DE fehlt · EN fehlt · DE oder EN fehlt.
- Bestehend bleiben: Seite, Section-Typ, field_key, „nur mit/ohne aktivem
  Bild", Dubletten, Volltextsuche, Medientyp (Bilder/Icons), Legacy/Inaktiv.
- Seitenfilter zeigt jetzt **Titel · page_key · Route**.

### Eindeutige Badges in der Spalte „Viewports"

- `image` → **Bild** · `thumbnail` → **Thumbnail** · `icon_image` →
  **TCS-Bildicon** · Lucide-Icon-Slot → **Lucide-Icon (Textfeld)**.
- Statusspalte: einheitliches **„Legacy / …"**-Schema
  (`Legacy / inaktiv (Section|Page)`, `Legacy / Quelle fehlt (Section|Page)`,
  `Legacy / Renderer ignoriert (Feldname|Parent-Slot)`).

### Seiten-/Vorschau-Zuordnung

- In jeder Zeile wird zusätzlich der **redaktionelle Kartentyp** als Badge
  angezeigt (Bildkarte/Thumbnail-Karte/Iconkarte/Textkarte/Wechselteaser/
  Hero/Kartencontainer/Kennzahlen/CTA/Kontaktblock), abgeleitet aus den
  vorhandenen Slots via `getEditorialSectionKind`.
- „In Vorschau" ist **deaktiviert mit Grund-Tooltip**, wenn die Vorschau
  nicht möglich ist (keine Route, Page archiviert/inaktiv/fehlt, Section
  inaktiv/fehlt, Renderer ignoriert den Slot).

### Was nicht geändert wurde

- Keine cms_assets-/Whitelist-/Migration, keine Asset-Schreibwege.
- Keine Renderer-Änderung, keine Public-Routen/Navigation/Footer.
- Keine Produktdatenbank, keine i18n-JSON-Inhalte.
- Keine neuen Section-Typen.

### Checks

- `npx tsc --noEmit` → OK.
- `npm run i18n:check` → OK (0 Fehler / 0 Warnungen).
- `node scripts/cms/medien-konsistenz-audit.mjs` → unverändert grün.
- `node scripts/cms/redaktions-fluss-audit.mjs` → unverändert (S2 = 0).
- `node scripts/cms/rendertreue-audit.mjs` → unverändert
  (R0=651 · R3=42 · R4=0).

## Tranche 19 — Admin-Baum-Kartenlabels (2026-05-26)

**Ziel:** Redakteure sehen im Admin-Baum auf einen Blick, mit welcher
Kartenvariante sie es zu tun haben — ohne in den Block springen zu müssen.

### Was sich ändert (nur Anzeige)

- Neue Helferfunktion `getEditorialSectionKind(section_type, ctx)` in
  `src/features/admin/lib/editorialSectionKind.ts` leitet die redaktionelle
  Variante eines Blocks aus bereits vorhandenen Daten ab (vorhandene
  `cms_section_fields.field_key`s + aktive `cms_assets.field_key`-Slots).
- `card_v1` erscheint im Admin jetzt als:
  - **Bildkarte** — Slot `image` aktiv
  - **Thumbnail-Karte** — Slot `thumbnail` aktiv (Hub-/Filter-Grid-Kontext)
  - **Iconkarte** — Slot `icon_image` aktiv oder Feld `icon` vorhanden
  - **Textkarte** — nur `title`/`description`/`headline`, kein Bild/Icon
  - **Karte** — generischer Fallback
- Weitere Klartext-Labels: `cards_v1` → Kartencontainer, `teaser_2col_v1`
  → Wechselteaser, `stats_v1` → Kennzahlen, `stat_v1` → Kennzahl,
  `cta_v1` → CTA, `contact_block_v1` → Kontaktblock.
- Inaktive/Legacy-Blöcke tragen jetzt das Badge **„Legacy / inaktiv"**
  (vorher „ausgeblendet").

### Wo es sichtbar wird

- Admin-Baum: `SectionRowView` via `SectionList`
  (`src/features/admin/components/tree/SectionLevel.tsx`).
- Detailkopf im PageEditor („Fokus auf einen Block") zeigt denselben
  redaktionellen Typ wie der Baum.

### Was nicht geändert wurde

- Keine Migration, kein neuer Section-Typ, keine RPC-Änderung.
- Keine Renderer-Änderung. Block-Familienfarbe (`blockTypeStyle`) bleibt.
- Keine Whitelist-/Asset-/Feldanlage.
- Keine Layout-Änderung auf der öffentlichen Website.

### Stichprobe (per DB verifiziert)

| Seite | Block | erkannt als |
|---|---|---|
| `home.start` | `personas` | Kartencontainer |
| `home.start` | `personas_item_*` (6) | Textkarte |
| `home.start` | `block_*` (6) | Wechselteaser |
| `produkte.hub` | `cards.eingangsloesungen/tuerkommunikation/zutrittskontrolle` | Thumbnail-Karte |
| `gebaeudekommunikation.grossanlagen` | `anforderungen__*`, `wirtschaftlichkeit__*` | Iconkarte |
| `gebaeudekommunikation.grossanlagen` | `concierge`, `funk`, `namensanzeige`, `zufahrt` | Wechselteaser |
| `gebaeudekommunikation.grossanlagen` | `systembausteine__*` | Textkarte |
| `gebaeudekommunikation.tuersprechanlagen` | `card_argos`, `card_pak`, … | Bildkarte |
| `gebaeudekommunikation.tuersprechanlagen` | `vorteile__*` | Iconkarte |
| `service.downloads` | `*_item_*` (Akademie/Bestellung/QuickLinks/RMA) | Iconkarte |

### Checks

- `npx tsc --noEmit`: OK
- `npm run i18n:check`: OK (0/0)
- `node scripts/cms/redaktions-fluss-audit.mjs`: unverändert
- `node scripts/cms/rendertreue-audit.mjs`: unverändert (R0 651 · R2 90 · R3 42 · R4 0 · R5 426)
- `node scripts/cms/medien-konsistenz-audit.mjs`: unverändert

---


## Tranche 18 — Persona-Grid-Konsolidierung (2026-05-26)

**Ziel:** Auflösen des verflochtenen Persona-Grids auf `home.start`. Eine
sichtbare Textkarte entspricht genau einer bearbeitbaren `card_v1`-
Kindsection unter `personas`.

### Vorher (3 verflochtene Quellen)

| Section | Typ | Inhalt |
|---|---|---|
| `personas` (cards_v1) | Container | `headline`, `intro`, `cta` + Sammel-`items.<id>.title/desc` (Legacy) |
| `personas_item_<id>` (6× card_v1) | Karte | `title`, `description` (DB-first-Quelle) |
| `persona_<id>` (6× rich_v1) | Sondersection | `title`, `desc`, **`cta_link`** (einzige Quelle für CTA-Ziel) |

`PersonaSection.tsx` iterierte `persona_*` für die Reihenfolge, las
Titel/Description per `txChildField` aus `personas_item_*`, las `cta_link`
nur aus `persona_*`. DOM-Marker zeigten auf `persona_<id>`, nicht auf
die sichtbare Karte → Schein-Bearbeitung.

### Nachher (eine Karte = eine Datenquelle)

| Section | Typ | Rolle |
|---|---|---|
| `personas` (cards_v1) | Sichtbarer Karten-Container | hält Intro-Felder + DOM-Wrapper |
| `personas_item_<id>` (6× card_v1) | **Sichtbare Textkarte** | hält `title`, `description`, **`cta_link`** |
| `persona_<id>` (6× rich_v1) | **inaktiv** (Legacy-Fallback) | Daten bleiben für mögliche Reaktivierung |

### Migration (idempotent, ohne Datenverlust)

1. `cta_link` aus `persona_<id>` nach `personas_item_<id>` gespiegelt
   (DE+EN, 12 Felder). `NOT EXISTS`-Guard schützt vorhandene Werte.
2. Whitelist-Einträge `cta_link` DE+EN für alle 6 `personas_item_*`
   gesetzt (12 neue Whitelist-Zeilen).
3. 6 `persona_<id>` (rich_v1) auf `is_active = false` gesetzt.
4. `personas`-Container und Kinder bleiben aktiv.

### Renderer-Änderungen

- `src/components/PersonaSection.tsx`:
  - Iteriert jetzt `personas_item_*` (card_v1) für Reihenfolge.
  - Fallback-Kette pro Feld: `personas_item_<id>` → `persona_<id>` → `personas.items.<id>.*` → i18n.
  - `cta_link` DB-first aus `personas_item_*`, Fallback `persona_*`.
  - DOM-Marker: Wrapper-Grid `data-cms-section="personas"`, jede Karte
    `data-cms-section="personas_item_<id>"`, Intro `data-cms-section="personas_intro"`.
- Layout unverändert: gleiche Klassen, gleiche Motion-Animation, gleiche
  3-Spalten-Grid-Anordnung.

### Audit-Ergebnisse

| Audit | Vorher (T17) | Nachher (T18) |
|---|---|---|
| Redaktions-Fluss `home.start` S2 | 7 (Persona-Grid) | **0** |
| Redaktions-Fluss gesamt S2 | 1 | **0** |
| Redaktions-Fluss `home.start` S0/S1/S5 | 15 / 0 / 6 | 21 / 1 / 0 |
| Rendertreue R3 (gesamt) | 46 | 42 (4× `persona_*` weg) |
| Rendertreue R4 | 0 | 0 |
| Medien-Audit A | 36 | 36 (unverändert) |

### Geänderte Dateien (Tranche 18)
- `src/components/PersonaSection.tsx` (Renderer auf `personas_item_*`)
- `scripts/cms/redaktions-fluss-audit.mjs` (`KNOWN_SOURCE_ONLY` geleert,
  Persona-Sonderregel entfällt)
- `docs/current-status.md` (dieser Abschnitt)
- `docs/03-redaktion/checkliste-redaktion.md` (Persona-Grid-Hinweis)
- `docs/04-betrieb/prompts-vs-admin.md` (Tranche-18-Ergänzung)
- `docs/01-strategie/templates.md` (Persona-Grid als Beispiel)

### Migrationen / RPCs
- 1 Datenoperation (kein Schema-Change): 12 `cta_link`-Felder gespiegelt,
  12 Whitelist-Einträge ergänzt, 6 Sections deaktiviert. Idempotent.
- Keine neuen RPCs, keine neuen Section-Typen.

### Checks
- `node scripts/cms/redaktions-fluss-audit.mjs --focus=home.start`:
  **S0 21 · S1 1 · S2 0 · S4 0 · S5 0**.
- `node scripts/cms/redaktions-fluss-audit.mjs` (gesamt): **S0 869 ·
  S1 26 · S2 0 · S4 76 · S5 29**.
- `node scripts/cms/rendertreue-audit.mjs`: 651 R0 · 90 R2 · 42 R3 ·
  0 R4 · 426 R5.
- `node scripts/cms/medien-konsistenz-audit.mjs`: A 36 (unverändert).
- `npx tsc --noEmit` / `npm run i18n:check`: TS-Build harness-grün
  (kein Build-Fehler nach den letzten Korrekturen). i18n-Inhalte
  unverändert.

### Scope-Bestätigung (Tranche 18)
- Produktdatenbank nicht berührt.
- Keine Public-Routen / Navigation / Footer / i18n-Inhalte geändert.
- Keine neuen Section-Typen, keine neue Sonderkarte.
- Keine Assets hochgeladen / gelöscht / deaktiviert.
- Keine Daten gelöscht; alle alten `persona_*`-Felder bleiben in DB.
- Sichtbares Layout unverändert (gleiche Klassen, gleiche Animation).
- Kein Auth/Login.

---

## Tranche 17 — Template-/Admin-Baum-Konsolidierung (2026-05-26)

**Ziel:** Sicherstellen, dass ein im Admin als „aktiv" markierter Block
auf der Website auch wirklich sichtbar ist und dort als bearbeitbare
Datenquelle wirkt. Keine Schein-Bearbeitung mehr.

### Neues Werkzeug

- `scripts/cms/redaktions-fluss-audit.mjs` — klassifiziert jede aktive
  Section public-veröffentlichter Seiten in S0–S5:
  - **S0 OK** — sichtbare Section ist zugleich Datenquelle.
  - **S1 OK-Container** — sichtbarer Karten-Container mit aktiven Karten.
  - **S2 Source-only** — aktive Section liefert nur Daten für einen
    anderen sichtbaren Block (Schein-Bearbeitung).
  - **S4 Fehler** — aktiv, aber weder sichtbar noch als Datenquelle
    erkennbar (oder leerer Container).
  - **S5 Spezialrenderer** — bekannte Prefix-Konvention
    (`persona_`, `bereich_`, `series_override_`, `solution_teaser_`).
  Aufruf: `node scripts/cms/redaktions-fluss-audit.mjs` bzw.
  `--focus=<page_key>`.

### Audit-Ergebnis (1000 aktive Sektionen über alle public Seiten)

| Klasse | Anzahl | Bedeutung |
|---|---|---|
| S0 OK | 864 | sichtbar = bearbeitbar |
| S1 OK-Container | 25 | echte Kartencontainer mit Karten |
| S2 Source-only | 1 | `home.start / personas` (Persona-Grid, siehe unten) |
| S4 Fehler/leer | 75 | überwiegend leere `cards_v1`-Container (page-spezifischer Renderer, Diagnose-Heuristik markiert sie konservativ) |
| S5 Spezialrenderer | 35 | persona_*, series_override_*, … |

### Analyse `home.start` (Vorher: 36 aktive Sektionen)

| Section | Typ | Status vorher | Befund |
|---|---|---|---|
| `hero` | hero_v1 | aktiv | S0 — Layout |
| `stats` + 4× `stats_item_*` | stats_v1 / stat_v1 | aktiv | S0/S1 |
| `content_blocks_intro` | content_v1 | aktiv | S0 |
| `block_communication … block_consulting` (6) | teaser_2col_v1 | aktiv | **S0 — sichtbar UND Datenquelle** (alle 18 Felder je Block direkt gepflegt) |
| `personas_intro` | rich_v1 | aktiv | S0 |
| `cta` | cta_v1 | aktiv | S0 |
| `persona_*` (6) | rich_v1 | aktiv | S5 — Prefix-Renderer (PersonaSection) |
| `personas` (Container `B-662`) | cards_v1 | aktiv | **S2 Source-only** — Sammel-`items.*`-Felder, alt |
| `personas_item_*` (6) | card_v1 | aktiv | **S2 Source-only** — `title`/`description` als DB-first-Quelle für PersonaSection |
| **`contentBlocks` (Container `B-662`)** | cards_v1 | aktiv | **S2 Source-only** — keine Renderer-Verwendung mehr, da `block_*` bereits `teaser_2col_v1` sind |
| **`contentBlocks_item_*` (6)** | card_v1 | aktiv | **S2 Source-only** — Schein-Bearbeitung, schlägt nirgends durch |
| **`ueberTcs` (`B-663`)** | content_v1 | aktiv | **S4 Fehler** — `businessFields.*` ohne Renderer-Anbindung |

### Migration (idempotent, ohne Datenverlust)

Auf `home.start` wurden 8 Sektionen auf `is_active = false` gesetzt:

- 1× `contentBlocks` (cards_v1, Container)
- 6× `contentBlocks_item_*` (card_v1, Kindkarten)
- 1× `ueberTcs` (content_v1)

Begründung der Eindeutigkeit:

- `contentBlocks*`: `HomePage.tsx` ruft für jede `block_*`-Section vom
  Typ `teaser_2col_v1` direkt `Teaser2ColV1` auf — der Renderer liest
  Felder aus der `block_*`-Section selbst, nicht aus `contentBlocks_item_*`.
  Die `block_*`-Sektionen halten alle 18 Felder pro Block in DE+EN.
  `ContentBlockItem` (Legacy-Renderer) wird in dieser Konstellation nie
  instanziiert. → Schein-Bearbeitung beseitigt.
- `ueberTcs`: Keine Code-Referenz im gesamten `src/`. → tot.

Daten bleiben in `cms_section_fields` erhalten und können per Admin
jederzeit reaktiviert werden.

### Bewusst NICHT migriert: Persona-Grid

Die Persona-Karten auf der Startseite (S2 + S5) sind komplex verflochten
und **kein eindeutiges Mapping**:

- `personas_item_<id>` (card_v1) hält `title` + `description` (4 Felder)
  und ist DB-first-Quelle in `PersonaSection.tsx` (`txChildField`).
- `persona_<id>` (rich_v1) hält `title`, `desc` **und `cta_link`** —
  letzteres existiert nur hier (6 Felder).
- `personas` (cards_v1) hält zusätzlich Sammel-`items.<id>.title/desc`
  (Legacy aus i18n-Migration).

Eine Auflösung erfordert:

1. `cta_link` aus `persona_<id>` nach `personas_item_<id>` migrieren.
2. `persona_<id>` und `personas` (Sammel-Items) deaktivieren.
3. `PersonaSection.tsx` so umstellen, dass nur noch `personas_item_*`
   gelesen wird.

Das ist eine eigene Folgetranche (Tranche 18 — Persona-Grid-
Konsolidierung), weil dabei sowohl DB-Migration als auch Renderer-
Anpassung nötig sind. Tranche 17 bleibt bewusst auf die eindeutigen
Source-only-Fälle beschränkt.

### Admin-Baum-Benennung (Aufgabe 5 — nur Bestandsaufnahme)

Aktuelle Labels in `src/features/admin/lib/blockTypeStyle.ts` sind
bereits semantisch:

- `teaser_2col_v1` → „Wechselteaser"
- `cards_v1` → „Karten-Container"
- `card_v1` → „Karte"
- `stats_v1` → „Kennzahlen"
- `cta_v1` → „Call to Action"

Eine Differenzierung von `card_v1` in **Bildkarte / Iconkarte / Textkarte**
ist sinnvoll, erfordert aber feldabhängige Heuristik (`image`-Asset,
`icon`/`icon_image`-Feld). Wird in Tranche 18 zusammen mit der
Persona-Grid-Konsolidierung umgesetzt — nicht in Tranche 17, um den
Scope klein und reversibel zu halten.

### Geänderte Dateien (Tranche 17)
- `scripts/cms/redaktions-fluss-audit.mjs` (NEU)
- `supabase/migrations/<timestamp>_tranche17_home_start_source_only.sql` (NEU)
- `docs/current-status.md` (dieser Abschnitt)
- `docs/03-redaktion/checkliste-redaktion.md` (Hinweis Source-only)
- `docs/04-betrieb/prompts-vs-admin.md` (Regel „sichtbar = Datenquelle")
- `docs/01-strategie/templates.md` (Standardpalette + Source-only-Definition)
- `docs/02-architektur/section-typen-katalog.md` (S0–S5-Klassen ergänzt)

### Migrationen / RPCs
- 1 Migration, idempotent, nur `is_active`-Flags.
- Keine neuen RPCs, keine neuen Section-Typen, keine Renderer-Änderung,
  keine Asset-Änderung, keine i18n-Änderung.

### Checks
- `node scripts/cms/redaktions-fluss-audit.mjs --focus=home.start`:
  **S0 15 · S1 0 · S2 7 · S4 0 · S5 6** (S2 = Persona-Grid, bekannt;
  vorher zusätzlich 7 S2 für `contentBlocks*` + 1 S4 für `ueberTcs`).
- `node scripts/cms/redaktions-fluss-audit.mjs` (gesamt):
  **S0 864 · S1 25 · S2 1 · S4 75 · S5 35**.
- `node scripts/cms/medien-konsistenz-audit.mjs`: **A 36 · B 0 · C 0 ·
  D 0 · E 0 · F 0** (unverändert).
- `node scripts/cms/rendertreue-audit.mjs`: 651 R0 · 90 R2 · 46 R3 ·
  0 R4 · 428 R5 (R3 unverändert bekannte Spezialfälle).
- `npx tsc --noEmit` / `npm run i18n:check`: nicht ausgeführt — kein
  TS-/i18n-Quellcode geändert.

### Scope-Bestätigung (Tranche 17)
- Produktdatenbank nicht berührt.
- Keine Public-Routen / Navigation / Footer / i18n-Inhalte geändert.
- Keine neuen Section-Typen, kein Renderer-Umbau.
- Keine Assets hochgeladen / gelöscht / deaktiviert.
- Keine Daten gelöscht, nur 8 Sichtbarkeits-Flags umgelegt; reversibel.
- Persona-Grid bewusst nicht migriert (kein eindeutiges Mapping).
- Admin-Label-Differenzierung bewusst nicht umgebaut (Folgetranche).
- Kein Auth/Login, keine SEO-/Sitemap-Etappe.

---

## Tranche 16 — Redaktions-Rendertreue (2026-05-26)

**Ziel:** Beweisen, dass aktive Admin-Blöcke auch wirklich auf der Website
rendern (Grundregel „Admin = sichtbar").

### Neues Werkzeug

- `scripts/cms/rendertreue-audit.mjs` — klassifiziert jede aktive Section
  einer published Seite in R0–R5 (OK / Container / Skip / Risiko / Fehler /
  Spezialrenderer). Heuristik: zentraler Renderer-Mount, page-spezifische
  Referenz, dynamische `cms.sections.filter/map`-Iteration oder
  Prefix-Konvention (`persona_`, `bereich_`, …). Pflicht vor jeder
  Redaktionsübergabe. Aufruf: `node scripts/cms/rendertreue-audit.mjs`
  bzw. `--focus=<page_key>` / `--json`.

### Audit-Ergebnis (115 Seiten · 1219 aktive Sections)

| Klasse | Anzahl | Bedeutung |
|---|---|---|
| R0 OK | 657 | zentraler Renderer + Mount nachgewiesen, oder Kind eines Containers |
| R1 OK-Container | 0 | — |
| R2 Skip/Legacy | 90 | `hero_v1` (vom Layout gerendert) |
| R3 Risiko | 42 | siehe unten |
| R4 Fehler | 0 | keine harten Treffer |
| R5 Spezialrenderer | 430 | page-spezifisch, dynamische Iteration oder Prefix-Konvention |

**R3-Risiken (42, alle bekannte Sonderfälle, keine harten Bugs):**

- `produkte.tuerkommunikation` — 31 `series_override_*`-Sections
  (Sondertyp, wird über die Produktdatenbank-Brücke gepflegt, nicht im
  Standard-Body-Renderer; bewusst Spezial).
- `home.start` — 4 `persona_*` (`persona_wohnungswirtschaft`,
  `persona_fachplaner`, `persona_handwerk`, `persona_fachhandel`).
  Werden über `PersonaSection.tsx` per `cms.sections.filter`
  gerendert, das Audit erkennt nur Prefix-Konvention via Literal —
  `SECTION_PREFIX`-Konstante umgeht das. Heuristisches Falsch-Positiv.
- `mobile-tk-preview.root` — `komponenten`, `seo`, `subnav` (Preview-
  Sandbox-Seite, page-spezifischer Renderer ohne literalen Section-Key).
- `zutrittskontrolle.root` — 4 `teaser_*` Wechselteaser. Werden im
  Page-Code via `cms.sections.filter` über Typ + Sort gerendert,
  ohne Literal-Match. Heuristisches Falsch-Positiv.

Folge-Tranche-Vorschlag: pro R3-Fall einen kleinen DOM-Marker
ergänzen (`data-cms-renderer="<section_key>"`), damit das Audit
zukünftig hart prüfen kann — nicht in Tranche 16 umgesetzt.

### Echter Copy/Paste-Abnahmetest auf `/produkte`

**Nicht** in Rollback-Transaktion, sondern real in DB → Vorschau → DB-Cleanup.

1. **Quelle:** `home.start / block_entry` (Typ `teaser_2col_v1`, inkl.
   3-Viewport-Asset „X World Plaza" + 18 Felder DE/EN + 19 Whitelist-Einträge).
2. **Paste** via `rpc_admin_paste_section` → neuer Block
   `produkte.hub / tranche16_pastetest_visible` auf Position 1.
   Rückgabe: `sections_copied=1, fields_copied=18, assets_copied=3,
   whitelist_copied=19`.
3. **Sichtbarkeitsprüfung** `/produkte` (Live-Vorschau): Block erscheint
   als „Entry-System / Echte Individualität am Eingang" zwischen
   Karten-Grid und CTA. Badge `produkte.hub · 2 Sections` (vorher 1).
   `ProduktHubPage` rendert ihn via `renderPageSectionByType` →
   `Teaser2ColV1`, Bild aus DB, Texte aus DB.
4. **Reorder** via `rpc_admin_set_section_position` auf Position 0 →
   Vorschau: Block jetzt VOR den Karten. Bestätigt.
5. **Deaktivieren** via `rpc_admin_set_section_active(false)` →
   Vorschau: Block verschwindet, Badge `1 Sections`. Bestätigt.
6. **Cleanup** via `rpc_admin_delete_section` →
   `fields_deleted=18, assets_deactivated=3, whitelist_deleted=19`.
   `produkte.hub` ist wieder im Ausgangszustand (nur `cards`-Block).

**Ergebnis:** Copy/Paste-Pfad ist redaktionsreif. Eingefügte
Standardblöcke auf `/produkte` rendern sofort, sind reorderbar,
deaktivierbar und löschbar — über die produktiven `rpc_admin_*`-Wege.

### Geänderte Dateien (Tranche 16)
- `scripts/cms/rendertreue-audit.mjs` (NEU)
- `docs/current-status.md` (dieser Abschnitt)
- `docs/03-redaktion/checkliste-redaktion.md` (Rendertreue-Hinweis)
- `docs/04-betrieb/prompts-vs-admin.md` (Admin-Wahrheit verschärft)

### Migrationen / RPCs
- Keine Schema-Migration, keine neuen RPCs. Alle Schreibtests liefen
  über bestehende `rpc_admin_paste_section / set_section_position /
  set_section_active / delete_section`. Testdaten am Ende vollständig
  entfernt.

### Checks
- `node scripts/cms/rendertreue-audit.mjs`: 657 R0 / 90 R2 / 42 R3 / 0 R4 / 430 R5
- `node scripts/cms/medien-konsistenz-audit.mjs`: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0** (unverändert)
- `npx tsc --noEmit` / `npm run i18n:check`: nicht ausgeführt — keine
  TS-/i18n-Quelle geändert (nur neues Node-Script + Doku).

### Scope-Bestätigung (Tranche 16)
- Produktdatenbank nicht berührt.
- Keine Public-Routen / Navigation / Footer / i18n-Inhalte geändert.
- Keine Schema-Migration, keine neuen RPCs, keine neuen Section-Typen.
- Keine Assets hochgeladen/gelöscht. Drei Asset-Verknüpfungen wurden
  temporär kopiert und über `rpc_admin_delete_section` wieder
  deaktiviert (Storage-Datei bleibt).
- Kein Auth/Login, keine SEO-/Sitemap-Etappe.

---



## Tranche 15 — Persona-Doppelungen bereinigen (2026-05-25)

**Problem:** Auf allen 6 Persona-Seiten (`personas.architekt`, `.bauherr`,
`.fachhandel`, `.fachplaner`, `.handwerk`, `.wohnungswirtschaft`) gab es
für jede der vier Lösungen (Zutritt, Kommunikation, Entry, Signage bzw.
Intercoms) **zwei aktive Admin-Bereiche**:

1. **Wechselteaser** `solution_teaser_*` (`teaser_2col_v1`) — sichtbar,
   wirken auf der Seite.
2. **Legacy-Kartenblock** `solutions` (`cards_v1`) mit Kindkarten
   `solutions_item_*` (`card_v1`) — **nicht sichtbar**, weil alle 6
   Persona-Renderer den Karten-Fallback überspringen, sobald aktive
   `solution_teaser_*` existieren (`teaserSections.length > 0 ? … : …`).

Damit bot der Admin Schein-Bearbeitung an: Karten wirkten editierbar,
Änderungen schlugen aber nirgendwo durch. Das verletzt die CMS-Light-
Grundregel „Admin = Website".

**Fix (Migration `20260525-…`):**

- Auf jeder Persona-Seite mit ≥1 aktiven `solution_teaser_*` wurden die
  Legacy-Sections `solutions` (`cards_v1`) und alle `solutions_item_*`
  (`card_v1`) auf `is_active=false` gesetzt.
- **6 Parent-Sections + 24 Kindkarten = 30 Sections deaktiviert.**
- Keine Daten gelöscht, keine i18n/JSONs geändert, keine Renderer-/
  Layout-Änderung. Reversibel über den Admin-Sichtbarkeitsschalter.
- Renderer-Fallback (`teaserSections.length === 0 ? cards : teaser`)
  bleibt funktional — falls jemand alle Teaser deaktiviert, würden die
  Karten wieder greifen.

**Sonderfall:** `personas.architekt.kopie` hat eine `solutions`-Section
vom Typ `content_v1` (kein Karten-Container, andere Struktur, Test-
Kopie) — bleibt unangetastet.

### Rendertreue-Audit (Folgeprüfung, nur Bericht)

Stichprobe weiterer Seiten auf gleiches Muster „aktive Kinder ohne
Renderer-Nutzung":

- `/produkte` (`produkte.root`): bereits in Tranche 12/13 adressiert,
  `renderPageSectionByType` rendert eingestreute Standardblöcke
  (`teaser_2col_v1` etc.) jetzt korrekt. Kein neuer Doppel-Befund.
- Keine weiteren stillen Doppelpflege-Fälle in der Stichprobe
  (Service-, Anwendungen-, Eingangssysteme-Seiten verwenden ihre
  `cards_v1`-Container tatsächlich im Renderer).

Eine systematische Diagnose (Whitelist vs. tatsächlich gerenderte
Section-Keys pro Seite) wäre als eigene Tranche sinnvoll, ist aber
nicht Scope dieser Tranche.

### Checks (Tranche 15)
- DB-Verifikation: 0 aktive `solutions`/`solutions_item_*` auf den 6
  Persona-Seiten, 24 aktive `solution_teaser_*` unverändert.
- `npx tsc --noEmit`: nicht ausgeführt (kein Code geändert).
- `npm run i18n:check`: nicht ausgeführt (keine i18n-/Texte geändert).
- `node scripts/cms/medien-konsistenz-audit.mjs`: nicht ausgeführt
  (keine Assets/Slots geändert).

### Scope-Bestätigung (Tranche 15)
- Produktdatenbank nicht berührt.
- Keine Public-Routen/Navigation/Footer/i18n-Änderung.
- Kein Renderer-/Layout-Umbau, keine neuen Section-Typen.
- Keine Daten gelöscht, keine Assets hochgeladen/gelöscht/deaktiviert.
- Keine RPC-Änderung, kein Auth.

## Tranche 14 — Redaktions-Abnahme CMS-Light (2026-05-24)


## Tranche 14 — Redaktions-Abnahme CMS-Light (2026-05-24)

Praktische Workflow-Abnahme ohne Public-Live-Themen. **Keine Migration,
kein Renderer-Umbau, keine neuen Section-Typen, keine Auth.** Tests
liefen ausschließlich in `BEGIN; … ROLLBACK;`-Transaktionen — keine
bleibenden DB-Änderungen.

### Getestete Workflows (alle in ROLLBACK-TXN)

| Fall | Quelle | Ergebnis |
|---|---|---|
| **A — Wechselteaser kopieren** | `eingangssysteme.root.teaser_material` → neuer Key `teaser_material_tranche14_test` | ✅ neue eindeutige Section, `image`-Asset inkl. Viewport korrekt kopiert, keine Slot-Kollision |
| **B — Bildkarte kopieren** | `zutrittskontrolle.tueren-tore.card_handsender` → `..._tranche14_test` | ✅ Karte bleibt `card_v1`, `image`-Slot kopiert, **12/12 Whitelist-Einträge mitkopiert** → sofort im Admin pflegbar, 8 Felder DE+EN gespiegelt |
| **C — Lucide-Icon ändern** | `zutrittskontrolle.bcm-door-app.vorteile_item_1.icon` von `check-circle-2` → `shield-check` | ✅ `rpc_admin_update_section_field` schreibt korrekt, Renderer-Lookup würde greifen |
| **D — `icon_image` (TCS-Bildicon)** | Renderer-Pfad geprüft (`CardsSectionV1.tsx`/`FeatureGridV1.tsx`) | ✅ Priorität `icon_image` → `icon` → Fallback ist aktiv; `data-cms-field="icon_image"` als DOM-Marker vorhanden. Whitelist-Einträge für `icon_image` existieren (z. B. `snipdoo-ip.audiences.*`), **aber aktuell 0 aktive `icon_image`-Assets in DB** → Slot ist technisch pflegbar, redaktionell noch nicht befüllt (nicht-blockierend, eigener Inhalts-Auftrag). |
| **E — Neue Seite per Prompt nach Template** | Prozess dokumentiert, kein Live-Test ausgeführt (würde dauerhafte DB-Änderung erzeugen) | ✅ Ablauf in [`docs/03-redaktion/checkliste-redaktion.md`](./03-redaktion/checkliste-redaktion.md) Abschnitt 7 festgehalten |

### Befunde

- Copy/Paste-Hotfix von 2026-05-24 hält: keine `duplicate key`-Fehler
  auf `cms_assets_active_slot_idx`, weder bei Wechselteasern noch bei
  Bildkarten.
- `rpc_admin_paste_section` kopiert automatisch **alle DE+EN-Felder**
  **und** alle **Whitelist-Einträge** (`cms_admin_editable_fields`)
  auf die neue Section — Voraussetzung dafür, dass eine kopierte
  Karte im Admin sofort sichtbar/pflegbar ist. Bestätigt.
- Renderer-Priorität `icon_image` → `icon` → Code-Fallback ist in
  beiden Standard-Karten-Renderern (`CardsSectionV1`, `FeatureGridV1`)
  konsistent implementiert (DOM-Marker `data-cms-field="icon"` bzw.
  `"icon_image"`).
- **Keine Bugs** in den getesteten Pfaden gefunden — keine Code-Fixes
  nötig.

### Bewusst offene Redaktionsthemen (nicht-blockierend)

- **Keine aktiven `icon_image`-Assets in der DB.** Der Slot ist technisch
  pflegbar und im Admin sichtbar; es liegen aber noch keine
  TCS-Bildicons hoch. Eigener Inhalts-Auftrag, kein Build-Thema.
- **Veröffentlichungs-Workflow** (Draft → published) bleibt bewusst
  eigener Schritt — nicht im Admin-Workflow automatisiert, bis Auth
  steht.
- **Neue Testseiten** wurden **nicht** dauerhaft angelegt (würde gegen
  „keine Public-Live-Themen" verstoßen). Prozess ist in der Checkliste
  beschrieben und durch die bestehende Duplikat-Funktion
  (`rpc_admin_duplicate_page`) bereits abgedeckt.

### Checks
- `npx tsc --noEmit`: OK
- `npm run i18n:check`: OK (75 Seiten, 0 Fehler, 0 Warnungen)
- `node scripts/cms/medien-konsistenz-audit.mjs`: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0**

### Scope-Bestätigung (Tranche 14)
- Produktdatenbank nicht berührt.
- Public-Navigation/Routen/Footer/i18n-JSONs nicht geändert.
- Keine Migration, keine RPC-Änderung, kein Renderer-Umbau, kein Auth.
- Keine Assets hochgeladen/gelöscht/deaktiviert.
- Keine neuen Section-Typen, keine neuen Sonderkarten.
- Alle Schreibtests liefen in `BEGIN; … ROLLBACK;` — keine bleibenden Änderungen.

### Geänderte Dateien (Tranche 14)
- `docs/03-redaktion/checkliste-redaktion.md` (neu — Redaktions-Schritt-für-Schritt-Checkliste)
- `docs/current-status.md` (dieser Abschnitt)

---

## Tranche 13 — Template-Finalisierung & Rest-G-Klärung (2026-05-24)

Reine Audit-/Doku-Tranche. **Keine Migration, kein Renderer-Umbau,
keine neuen Section-Typen.**

- **Re-Audit auf versteckte Karten-/Iconkartenblöcke** (aktive
  `content_v1`/`feature_grid_v1`/`cards_v1`/`card_grid_v1` ohne aktive
  Kinder, ≥2 `items.*`-Items): **keine neuen Treffer** außer den drei
  technischen `subnav`-Sections (`snipdoo-ip`, `digitale-namensanzeige`,
  `schraenke-behaelter`) — kein Kartenmuster.
- **Rest-G-Fall `gebaeudekommunikation.grossanlagen.leistungen`**:
  bleibt **Sonderbereich (F)**. Muster „Titel + n Sub-Bullets pro Item"
  ist kein flacher `card_v1`-Standardfall; Migration nur nach
  Marketing-/Redaktionsentscheidung Bulletliste vs. Fließtext.
  Entscheidungsfrage im Audit-Dokument festgehalten.
- **Rest-G-Fall `gebaeudekommunikation.beschilderung.features`**:
  **bereits zur Standardpalette migriert** — Inhalte werden in
  `BeschilderungPage.tsx` als vier eigenständige `teaser_2col_v1`-Sections
  (`feature_hausnummer`/`materialien`/`tuerschilder`/`klingel`)
  gerendert. Die `items.*`-Felder auf `features` sind verwaiste
  Legacy-Daten → Cleanup-Kandidat für 12f. **Kein G-Fall mehr.**
- **Standard-Kartenpalette eingefroren** (Bildkarte, Iconkarte Lucide,
  Iconkarte TCS-Bildicon, Wechselteaser, Kennzahlen, CTA/Kontakt,
  Spezialblock nur mit Begründung). Details:
  [`docs/04-betrieb/template-konsolidierung-audit-2026-05-24.md`](./04-betrieb/template-konsolidierung-audit-2026-05-24.md)
  Abschnitt „Eingefrorene Standard-Kartenpalette".

### Checks
- `npx tsc --noEmit`: OK
- `npm run i18n:check`: OK (75 Seiten, 0 Fehler, 0 Warnungen)
- `node scripts/cms/medien-konsistenz-audit.mjs`: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0**

### Scope-Bestätigung (Tranche 13)
- Produktdatenbank nicht berührt.
- Public-Navigation/Routen/Footer/i18n-JSONs nicht geändert.
- Keine Migration, keine RPC-Änderung, kein Renderer-Umbau.
- Keine Assets hochgeladen/gelöscht/deaktiviert.
- Keine neuen Section-Typen, keine neuen Sonderkarten.

### Geänderte Dateien (Tranche 13)
- `docs/current-status.md` (dieser Abschnitt)
- `docs/04-betrieb/template-konsolidierung-audit-2026-05-24.md` (Tranche-13-Sektion + Palette-Freeze)
- `docs/01-strategie/templates.md` (Palette-Freeze auf Tranche 13 fortgeschrieben)

---

## Frühere Tranche-Statusabschnitte

Stand: 2026-05-24 (nach Tranche 12-renderer — DB-first-Anschluss der in Tranche 12 migrierten Eltern-Sections; Layout sichtbar unverändert)

## Tranche 12-renderer — Renderer-Anschluss der migrierten Card-Bereiche (2026-05-24)

Folge-Etappe zu Tranche 12 (Daten-Migration). Die 12 in Tranche 12
migrierten Eltern-Sections werden jetzt **DB-first** über ihre
`card_v1`-Kindsections gerendert. Legacy-`items.*`-Felder bzw. die
parallelen i18n-Keys bleiben **nur noch Fallback**. Layout und
Reihenfolge sichtbar unverändert; DOM-Marker auf jeder Karte
(`data-cms-section="<parent>__<key>"`, `data-cms-field="title|description|subtitle|icon|image"`).

### Renderer-Status pro Scope-Section

| Section | Renderer | Status | Fallback |
| --- | --- | --- | --- |
| `presse.root.releases` | `src/features/presse/pages/PressePage.tsx` | umgestellt: liest `releases__<key>.title/subtitle` | i18n `releases.items.<key>.title/date` |
| `gebaeudekommunikation.tuersprechanlagen.anwendungsumfelder` | `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` (`AnwendungsumfelderSection`) | umgestellt: liest `anwendungsumfelder__<key>.title/description` + Asset `image` am Kind | Legacy `items.<key>.title/teaser` + Eltern-Asset `image_efh/mfh/gewerbe` |
| `gebaeudekommunikation.tuersprechanlagen.vorteile` | `TuersprechanlagenPage.tsx` (`VorteileSection`) | umgestellt: liest `vorteile__<key>.title/description/icon` | i18n `vorteile.items.<key>.title/desc/icon` |
| `gebaeudekommunikation.grossanlagen.systembausteine` | `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx` | umgestellt: liest `systembausteine__<key>.title/description/subtitle` | i18n `systembausteine.items.<key>.label/title/description`. Href bleibt Code-führend (Navigations-Cards). |
| `gebaeudemanagement.bcm-buchungssystem.anwendungen` | `src/features/cms/components/CmsProductSolutionShell.tsx` (gemeinsame Shell) | **bereits DB-first** (`readItems` liest `parent_section_key === sectionKey`) | Legacy `items.N.*` im Parent |
| `gebaeudemanagement.bcm-infoboard.anwendungen` | dto. | dto. | dto. |
| `zutrittskontrolle.aussenstation-adx5.anwendungen` | dto. | dto. | dto. |
| `zutrittskontrolle.digitale-briefkasten.anwendungen` | dto. | dto. | dto. |
| `zutrittskontrolle.zutrittssoftware.anwendungen` | dto. | dto. | dto. |
| `zutrittskontrolle.bcm-mini-cloud.anwendungen` | dto. (inkl. `cta_href` pro Kind) | dto. | dto. |
| `signage.root.products` | `src/features/signage/pages/SignagePage.tsx` | umgestellt: liest `products__<key>.title/description` | i18n `products.items.<key>.headline/text` |
| `service.online-produktkatalog.access` | — (Route ist `Navigate → /produkte/tuerkommunikation`) | **nicht öffentlich gerendert**; DB-Inhalte für späteren Reaktivierungsfall vorhanden | n/a |

### Bewusst weiter Klasse G (kein Renderer-Anschluss)
- `gebaeudekommunikation.grossanlagen.leistungen` — verschachtelte Sub-Bullets, kein flaches Karten-Zielmodell.
- `gebaeudekommunikation.beschilderung.features` — Bild- vs. Iconkarte fachlich offen.

### Konvention
- Lookup-Pattern: `cms.sections.filter(s => s.parent_section_key === "<parent>" && s.section_type === "card_v1").sort(sort_order)`.
- Pro Karte: `cms.text("<parent>__<key>", "title"|"description"|"subtitle"|"icon"|"cta_href"|"cta_label", loc, <legacy-fallback>)`.
- Bilder: `cms.asset("<parent>__<key>", "image", "")` — kein Bild raten, wenn Slot leer.
- Keine neue Helper-Schicht eingeführt; bestehende `useCmsPageContent`-API genügt.

### Checks
- `npx tsc --noEmit`: OK
- `npm run i18n:check`: OK (75 Seiten, 0 Fehler, 0 Warnungen)
- `node scripts/cms/medien-konsistenz-audit.mjs`: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0** (unverändert grün).

### Scope-Bestätigung
- Produktdatenbank nicht berührt.
- Public-Navigation/Routen/Footer/i18n-JSONs nicht geändert.
- Keine Migration angelegt — Whitelists/Felder aus Tranche 12 reichen.
- Keine Section-Typen erweitert, keine neue Sonderkarte gebaut.
- Keine Assets hochgeladen / gelöscht / deaktiviert.
- Legacy-`items.*` bleibt nur Fallback (Cleanup ist eigene Tranche 12f).

### Geänderte Dateien (Tranche 12-renderer)
- `src/features/presse/pages/PressePage.tsx`
- `src/features/signage/pages/SignagePage.tsx`
- `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`
- `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx`
- `docs/current-status.md` (dieser Abschnitt)
- `docs/04-betrieb/template-konsolidierung-audit-2026-05-24.md` (Tranche-12-renderer als erledigt vermerkt)

---

## Tranche 12 — Iconkarten + Bildkarten auf card_v1 (2026-05-24)


Strukturmigration der eindeutigen Klasse-B/C-Sections aus dem Template-
Konsolidierungs-Audit. **Layout sichtbar unverändert** — Renderer wurden
bewusst **nicht** angefasst (Hard-Constraint „Layout sichtbar unverändert"
+ „keine breite Renderer-Neuarchitektur"). Legacy-`items.*`-Felder bleiben
in der DB als Renderer-Fallback. DB-first-Lesepfade für die 12 Page-
Komponenten sind als saubere Folgetranche **12-renderer** dokumentiert.

### Migriert (12 Eltern-Sections, 49 neue `card_v1`-Kinder)

**Klasse B — Bildkarten** (Bildslot `image` whitelistet, keine Assets hochgeladen):
- `presse.root.releases` → 5 Kinder (`__akademie2024`, `__appleHomeKey`,
  `__bcm2025`, `__lightBuilding2025`, `__rekordumsatz2024`), Felder
  `title`/`subtitle` (aus `items.<k>.date`).
- `gebaeudekommunikation.tuersprechanlagen.anwendungsumfelder` → 3 Kinder
  (`__einfamilienhaus`, `__mehrfamilienhaus`, `__gewerbebau`), Felder
  `title`/`description` (aus `items.<k>.teaser`).

**Klasse C — Iconkarten**:
- `gebaeudekommunikation.tuersprechanlagen.vorteile` (`feature_grid_v1`) →
  4 Kinder mit Lucide-`icon` aus `items.<k>.icon`.
- `gebaeudekommunikation.grossanlagen.systembausteine` → 4 Kinder mit
  `subtitle` (aus `items.<k>.label`).
- `gebaeudemanagement.bcm-buchungssystem.anwendungen` → 4 Kinder
  (`__item_0..3`).
- `gebaeudemanagement.bcm-infoboard.anwendungen` → 4 Kinder.
- `service.online-produktkatalog.access` → 4 Kinder mit `cta_label`
  (aus `items.<k>.linkLabel`).
- `zutrittskontrolle.aussenstation-adx5.anwendungen` → 4 Kinder.
- `zutrittskontrolle.digitale-briefkasten.anwendungen` → 4 Kinder.
- `zutrittskontrolle.zutrittssoftware.anwendungen` → 4 Kinder.
- `zutrittskontrolle.bcm-mini-cloud.anwendungen` → 5 Kinder mit `cta_href`.
- `signage.root.products` → 4 Kinder (`headline`→`title`, `text`→`description`).

Summe: **49 neue `card_v1`-Kindsections**, **216 neue Inhaltsfelder**
(DE+EN, aus Legacy `items.*` gespiegelt, bestehende Werte nicht
überschrieben), **226 Whitelist-Einträge** plus **16 Whitelist-Einträge
für Bildslot `image`** auf den Klasse-B-Kindern. Eltern-`section_type`
bewusst **nicht geändert** (`content_v1`/`feature_grid_v1` als Parent für
`card_v1` ist die etablierte Konvention, vgl.
`gebaeudekommunikation.grossanlagen.anforderungen`).

### Bewusst nach Klasse G verschoben (nicht eindeutig)
- `gebaeudekommunikation.grossanlagen.leistungen` — Items haben
  verschachtelte Sub-Bullets (`items.<k>.items.0/1/2`), kein flaches
  Karten-Zielmodell. Migration ohne fachliche Entscheidung über das
  Sub-Item-Modell nicht möglich.
- `gebaeudekommunikation.beschilderung.features` — Items haben `text` und
  `imageAlt`, aber kein `icon` und keine Bilder im Slot. Fachlich unklar
  (Bild- vs. Iconkarte), daher nicht geraten.

### Bewusst ausgelassen (Folgetranchen)
- **Renderer-DB-first-Umstellung für 12 Pages** → Tranche 12-renderer.
  Grund: 12 Page-Komponenten gleichzeitig auf neue Lese-Pfade umzustellen
  widerspricht „Layout sichtbar unverändert" und „keine breite Renderer-
  Neuarchitektur". Die Daten liegen jetzt sauber in der DB; ein
  surgical-Umbau pro Page kann sicher in einer eigenen Etappe erfolgen.
- Bildupload für `image`-Slots (Klasse B) — folgt redaktionell.
- `icon_image`-Slots für Klasse-C-Karten — technisch seit Tranche 8 möglich,
  redaktioneller Bedarf offen.

### Checks
- `npx tsc --noEmit`: OK
- `npm run i18n:check`: OK (75 Seiten, 0 Fehler, 0 Warnungen)
- `node scripts/cms/medien-konsistenz-audit.mjs`:
  **A 36 · B 0 · C 0 · D 0 · E 0 · F 0** (unverändert grün).

### Scope-Bestätigung
- Produktdatenbank nicht berührt.
- Public-Navigation/Routen/Footer/i18n-JSONs nicht geändert.
- Keine Section-Typen erweitert, keine neue Sonderkarte gebaut.
- Keine Assets hochgeladen / gelöscht / deaktiviert.
- Keine Legacy-`items.*`-Felder gelöscht — bleiben als Renderer-Fallback.

### Geänderte Dateien (Tranche 12)
- 2 Migrationen (Haupt-Migration + Nachzug `anwendungsumfelder`).
- `docs/current-status.md` (dieser Abschnitt)
- `docs/04-betrieb/template-konsolidierung-audit-2026-05-24.md`
  (Klasse B/C als migriert markiert).

---

## Hotfix Copy/Paste — Asset-Slot-Konflikt (2026-05-24)


## Hotfix Copy/Paste — Asset-Slot-Konflikt (2026-05-24)

Bug: Beim Einfügen eines kopierten Blocks (insb. `cards_v1`-Container mit
`card_v1`-Kindern, die Bildslots mit Mobile/Tablet/Desktop-Varianten haben)
brach die RPC mit `duplicate key value violates unique constraint "cms_assets_active_slot_idx"` ab.

Ursache: Der INSERT in `cms_assets` listete die Spalte `viewport` nicht
auf. Damit fielen alle kopierten Zeilen auf den DEFAULT `'desktop'` zurück
und kollidierten innerhalb desselben Statements am Partial-Unique-Index
`(page_key, section_key, field_key, viewport) WHERE is_active`.

Fix: Migration `20260524_rpc_admin_paste_section_viewport_fix.sql`
(`CREATE OR REPLACE` für `rpc_admin_paste_section`):
- `viewport` wird jetzt aus der Quelle mit kopiert (Desktop, Tablet, Mobile).
- Defensive `NOT EXISTS`-Vorfilterung: existiert im Ziel bereits ein
  aktiver Slot für (section, field, viewport), wird die Quelle übersprungen
  statt das Ziel zu deaktivieren (normales Paste löst dies durch eindeutige
  neue `section_key` ohnehin auf, der Filter greift nur in Sonderfällen).
- Zusätzlicher `EXCEPTION WHEN unique_violation`-Block: liefert
  `error='paste_unique_conflict'` statt rohem DB-Fehler.
- Rückgabe-JSON enthält neu `assets_skipped`.

UI: `MasterDetailWorkbench.handlePasteFromClipboard` übersetzt Fehlercodes
(`paste_unique_conflict`, `target_section_key_exists`, `source_not_found`,
`target_page_not_found`, `parent_not_found`) in verständliche
Redaktions-Meldungen statt rohem DB-Constraint-Text.

`rpc_admin_duplicate_section` bleibt **deprecated** — kein UI-Pfad.
Clipboard → `pasteSection` → `rpc_admin_paste_section` ist die einzige
aktive Block-Kopierfunktion.

Geprüfte Copy/Paste-Fälle (per SQL gegen Live-DB, in Transaktion + ROLLBACK):
- `teaser_2col_v1` (Wechselteaser, `eingangssysteme.root/teaser_beratung`)
  mit Slot `image` → OK, `assets_copied=1`.
- `card_grid_v1`-Parent `produkte.hub/cards` mit 3 `card_v1`-Kindern,
  jeweils 3 Viewport-Varianten (9 aktive Assets) → OK, `assets_copied=9`,
  `sections_copied=4`, neue `section_key`s mit `_kopie`-Suffix, alle
  Viewports korrekt erhalten.
- Mehrfaches Einfügen derselben Quelle in derselben Transaktion (3×) →
  jeweils neue eindeutige Sections, keine doppelt aktiven Slots.
- Schema-weite Slot-Prüfung (`GROUP BY page,section,field,viewport HAVING count>1 WHERE is_active`) → 0 Verletzungen.

Audit unverändert: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0**.

### Geänderte Dateien (Hotfix)
- `supabase/migrations/2026-05-24_*_rpc_admin_paste_section_viewport_fix.sql` (neu)
- `src/features/admin/components/MasterDetailWorkbench.tsx` (Fehlermeldungs-Mapping)
- `docs/current-status.md` (dieser Abschnitt)
- `docs/04-betrieb/prompts-vs-admin.md` (Copy/Paste-Verhalten klargestellt)

---

## Tranche 11 — Template-Konsolidierungs-Audit (2026-05-24)


## Tranche 11 — Template-Konsolidierungs-Audit (2026-05-24)

Reines Audit, keine DB-/Code-/i18n-/Asset-Änderung. Vollständiger Bericht:
[`docs/04-betrieb/template-konsolidierung-audit-2026-05-24.md`](./04-betrieb/template-konsolidierung-audit-2026-05-24.md).

- Medien-Audit unverändert: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0**.
- **Neue Audit-Ebene**: „Template-Konsolidierung" — prüft fachlich kartige
  Bereiche, die technisch noch `content_v1` / `feature_grid_v1` ohne
  Kindsections sind.
- Gefunden:
  - **Klasse B (Bildkarten)**: 2 Sections (presse.releases,
    tuersprechanlagen.anwendungsumfelder).
  - **Klasse C (Iconkarten)**: 11 aktive Sections — u. a.
    `gebaeudekommunikation.tuersprechanlagen.vorteile` (einziges aktives
    `feature_grid_v1` ohne `card_v1`-Kinder), mehrere
    `zutrittskontrolle.*.anwendungen`, `gebaeudemanagement.bcm-*`,
    `service.online-produktkatalog.access`, `signage.root.products`.
  - **Klasse D (Wechselteaser)**: 0 fehlende — `teaser_2col_v1` deckt ab.
  - **Klasse E (Kennzahlen)**: 0 fehlende — `stats_v1` deckt ab.
  - **Klasse F (echte Spezialblöcke)**: `list_v1` (24 Referenz-Sections),
    `role_tabs_v1`, `faq_v1`, `WoWiDetailSections`, `series_override_*`,
    `catalog_filter_grid_v1`, `product_scroller_v1` — bleiben.
  - **Klasse G (unklar)**: 8 Sections (inaktive `root`-Sections,
    archivierte `*.kopie`-Seiten, Mini-Sonderfälle) — fachliche
    Entscheidung nötig.
- **Empfohlene Folgetranchen (nicht umgesetzt)**:
  - 12a — Iconkarten-Pflichtfälle (11 Sections, ~46 neue `card_v1`-Kinder)
  - 12b — Bildkarten (2 Sections, 8 neue `card_v1`-Kinder)
  - 12e — Doku-Pflege Spezialblöcke
  - 12f — Cleanup Legacy-`items.*`-Fallback-Felder
  - 12g — `*.kopie`-Seiten aufräumen
  - 12h — Inaktive `root`-Sections klären
- **Template-Palette**: ausreichend, **keine neuen Typen empfohlen**.

### Geänderte Dateien (Tranche 11)
- `docs/04-betrieb/template-konsolidierung-audit-2026-05-24.md` (neu)
- `docs/current-status.md`
- `docs/01-strategie/templates.md` (Verweis auf Audit ergänzt)

### Checks
- `npx tsc --noEmit`: OK
- `npm run i18n:check`: OK
- `node scripts/cms/medien-konsistenz-audit.mjs`: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0**

---



## Tranche 10 — Admin-Redaktionsfähigkeit (2026-05-24)

Reine Admin-Workflow-/UX-Korrektur. Keine Migration, keine Public-Navigation,
keine Routen, keine Inhaltsänderung, keine Asset-Operation.

- **Kurz-ID-Sprung korrigiert** — Neuer Helper
  `src/features/admin/lib/pickEditorialNode.ts` (`pickEditorialNodeForPage`).
  Bei `P-…`-/`B-…`-/`A-…`-Sprüngen werden Footer-/Footer-Bottom-Aliase
  hart deklassiert, solange ein redaktioneller Knoten (Main/Meta/Home/Persona)
  existiert. „Stickiness" am aktuellen `nav_area` greift nicht mehr beim
  Sprung. Beispiel: `P-063` öffnet jetzt `N-078` (`an.wohnbau.gross`,
  Main-Baum) und nicht mehr `N-052` (`f.anw.gross`, Footer-Alias).
- **Footer-Link-Editor verständlicher** — Badge „Reiner Footer-Link"
  (destructive-Optik) statt neutraler Outline. Button heißt jetzt
  **„Zielseite bearbeiten"** (vorher „Zielseite öffnen"). Der Klick
  springt über `pickEditorialNodeForPage` zur eigentlichen
  Inhaltsseite — nicht zurück in den Footer-Link.
- **Container-Knoten erklären sich selbst** — `PageEditor` zeigt für
  Knoten ohne `page_key` (z. B. `N-057` `col.anwendungen`, `N-042`
  `col.services`) jetzt eine Box „Container / Spalte — keine eigene
  Inhaltsseite" mit Liste aller Unterknoten inkl. `N-…`-Badge und
  Button „Zielseite bearbeiten" pro Kind, das auf eine echte Seite
  verweist.
- **Medien-Labels eindeutig** — Im Medien-/Asset-Workbench:
  - Lucide-Icons (Textfeld in `cms_section_fields`) werden als
    **„Lucide-Icon (Textfeld)"** ausgewiesen — nicht mehr als
    missverständliches „Icon (kein Viewport)".
  - Bild-Slots mit `field_key = 'icon_image'` zeigen Badge
    **„TCS-Bildicon"** zusätzlich zu D/T/M.
  - Bild-Slots mit `field_key = 'thumbnail'` zeigen Badge **„Thumbnail"**.
  - `icon_image` bleibt ein vollwertiger Bildslot (Upload, Viewports,
    Alt-Text) — die Renderer-Priorität (`icon_image` → `icon` → Code)
    aus Tranche 8 ist unverändert.
- **Geprüfte Fälle** (Code-/DB-Level):
  - `P-063` / `anwendungen.grossanlage` — Footer-Alias `f.anw.gross` (`N-052`)
    und Main-Knoten `an.wohnbau.gross` (`N-078`). Sprung landet jetzt
    auf `N-078`. Footer-Editor für `N-052` bietet „Zielseite bearbeiten"
    → `N-078`.
  - `N-057` `col.anwendungen`, `N-042` `col.services` — beides Footer-Spalten
    ohne `page_key`, jeweils 5 Unterknoten, die im Container-Editor jetzt
    sichtbar und direkt anspringbar sind.
  - `anwendungen.pflege` (Anforderungen-Karten mit Lucide-Icons) und
    `gebaeudekommunikation.grossanlagen` (Karten mit `icon_image`) —
    Medien-Workbench unterscheidet die beiden Modelle jetzt im Label.

### Geänderte Dateien (Tranche 10)
- `src/features/admin/lib/pickEditorialNode.ts` (neu)
- `src/features/admin/components/MasterDetailWorkbench.tsx`
- `src/features/admin/components/PageEditor.tsx`
- `src/features/admin/components/FooterLinkEditor.tsx`
- `src/features/admin/components/AssetWorkbench.tsx`
- `docs/current-status.md`
- `docs/04-betrieb/prompts-vs-admin.md`

### Checks
- `npx tsc --noEmit`: OK
- `npm run i18n:check`: OK (0 Fehler, 0 Warnungen)
- `node scripts/cms/medien-konsistenz-audit.mjs`: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0**

### Abgrenzung Audit ↔ Redaktionsfähigkeit
„Audit sauber" bedeutet ab jetzt explizit: Medien-, Karten- und DOM-Marker-
Konsistenz auf der **öffentlichen Website** ist konsistent. Die
„Redaktionsfähigkeit im Admin" (Kurz-ID-Sprung, Footer-vs-Inhaltseditor,
Container-Knoten, Medien-Beschriftung) ist eine **eigene QA-Ebene** und
nicht Teil des Medien-Audits.

---



> **Cleanup `public/catalog` abgeschlossen (2026-05-21)**: Die 5 aktiven
> Filtergrid-Bilder von `produkte.tuerkommunikation` (`filter-grid.ami-module`,
> `mobile-tuerkommunikation`, `netzgeraete-versorgung`, `zubehoer-montage`,
> `zutrittskontrolle-bcm`) wurden in den Storage-Bucket `cms-assets` migriert.
> Die 3 inaktiven `/catalog`-Dubletten (`aussenstationen`, `innenstationen`,
> `vorkonfigurierte-pakete`) wurden per idempotenter Migration aus `cms_assets`
> entfernt. Das Verzeichnis `public/catalog/` ist aus dem Repo gelöscht (8
> Dateien). `cms_assets` enthält keine aktiven oder inaktiven `/catalog/`-
> Referenzen mehr. Produktdatenbank, Routen, Navigation und Inhalte
> unverändert.

> Übergabe Marketing/Redaktion: siehe
> [`03-redaktion/uebergabe-marketing-redaktion-2026-05-17.md`](./03-redaktion/uebergabe-marketing-redaktion-2026-05-17.md).

## Zahlen aus DB / Code-Audit

- **118** CMS-Seiten (`cms_pages`, Stand Strukturkarte V3, 2026-05-21)
- ca. **600+** Sektionen (`cms_sections`, inkl. neuer Karten-Kind-Sections aus
  Tranche 1 + 2)
- **9.293+** Inhalts­felder (`cms_section_fields`, wächst mit jeder
  Karten-Migration)
- **481+** Asset-Slots (`cms_assets`)
- **114** Navigations­knoten (`cms_navigation_nodes`)
- **9.181+** Whitelist-Einträge (`cms_admin_editable_fields`)
- **34** Schreibwege (`rpc_admin_*`)
- Renderer-Audit: 75/81 DB-first, 81/81 asset-clean (6 dokumentierte Ausnahmen: Admin, ProductDetail, Türsprechanlagen, 3 Produkt-Hub-/Containerseiten)
- **Medien-Konsistenz-Audit (Stand 2026-05-24, nach Tranchen 1–6 + 7a + 7e (alt) + 7b + 7c + 7d + 7d-renderer + 7e (Wohnungswirtschaft) + 8)**:
  A_ok **36** · B_wrong_slot **0** · C_hardcoded_icons **0** ·
  D_missing_card_v1 **0** · E_missing_dom_markers **0** ·
  F_legacy_renderer_ignored **0**.
  Icon-DB-Felder gesamt: **816+**.
  Script: `node scripts/cms/medien-konsistenz-audit.mjs`.
  Bericht: `/mnt/documents/cms-medien-audit.md`.
  - **Tranche 9 — Abschluss-QA CMS-Light** (2026-05-24): Reine QA- und
    Doku-Tranche, **keine neue Migration**, **keine Renderer-Umstellung**,
    **keine Inhalts- oder Asset-Schreibwege**. Audit erneut ausgeführt:
    A 36 · B 0 · C 0 · D 0 · E 0 · F 0 (unverändert nach Tranche 8).
    Stichprobenprüfung Redakteursworkflow auf
    `anwendungen.bildungseinrichtungen`, einer Shared-`AnwendungDetailPage`,
    `service.downloads`, `service.technischer-support`, `personas.architekt`,
    `personas.wohnungswirtschaft`, `home.start`, `home.ueber-tcs`,
    `gebaeudekommunikation.snipdoo-ip`: Inhalts- und Medienbereich zeigen
    je Karte die erwarteten Slot-Arten (`image`, `thumbnail`, `icon` via
    IconPicker, `icon_image` als Bildslot seit Tranche 8). DOM-Marker
    `data-cms-page`/`data-cms-section`/`data-cms-field` sind auf den
    migrierten Karten gesetzt (Audit-Klasse E = 0 bestätigt).
    **Template-Freeze** dokumentiert: empfohlene Standardtypen sind
    `hero_v1`, `content_v1`, `cards_v1`+`card_v1`, `stats_v1`+`stat_v1`,
    `feature_grid_v1`, `product_scroller_v1`, `download_list_v1`+
    `download_item_v1`, `tabs_v1`+`tab_v1`, `teaser_2col_v1` (Wechselteaser),
    `contact_block_v1`, `cta_v1`, `rich_v1`. Sonderbereiche, die bewusst
    **außerhalb** des Karten-Standardmodells bleiben: `role_tabs_v1` auf
    `snipdoo-ip` (Rollen-Tabs mit `tabs.*`-Feldern), `detailSections` auf
    `personas.wohnungswirtschaft`, `snipdoo-ip`-Spezialblöcke
    (`systemversprechen`/`nutzungAlltag`/`systemaufbau`/`inbetriebnahme`/
    `kontakt`), `service.ersatzteile` Bereiche `beschriftung`/
    `freischaltcodes`. Diese lösen kein Klasse-D-Flag aus, weil die
    Hauptbereiche der jeweiligen Seiten als Kindsections modelliert sind.
    **Bewusst verbleibende Legacy-Fallbacks**: flache `items.<key>.*`-
    Felder auf Bestandsseiten (190 Klasse-B-Whitelist-Einträge, siehe
    Abschnitt „Whitelist-Differenz") werden vom Renderer nur noch als
    Fallback gelesen, bleiben in der DB und im Admin **deaktiviert**
    (`is_enabled=false`). Nicht löschen — Aufräumen optional vor Public-
    Live. **Empfohlener nächster Nicht-CMS-Light-Block**: Etappe J
    (Code-Bilder unter `src/features/**/assets` → `cms_assets`) und die
    Public-Navigations-Umschaltung auf `cms_navigation_nodes`.
    Geänderte Dateien: nur Doku (`docs/current-status.md`,
    `docs/01-strategie/templates.md`). Checks: `npx tsc --noEmit` OK,
    `npm run i18n:check` OK (0 Fehler, 0 Warnungen),
    `node scripts/cms/medien-konsistenz-audit.mjs` OK.
  - **Tranche 8 — Abschlussblock CMS-Light** (2026-05-24): Zwei Ziele
    in einem Schritt. **(a) `icon_image` technisch angeschlossen**:
    `rendererSlotMap.ts` erweitert (`card_v1` trägt jetzt `image`,
    `thumbnail`, `icon_image`), `IMAGE_FIELD_NAME_RE` in
    `AssetWorkbench.tsx` erkennt `icon_image` als Bildslot. Renderer
    `CardsSectionV1` und `FeatureGridV1` implementieren die
    Drei-Stufen-Priorität `icon_image` → `icon` (Lucide) → Code-
    Fallback; `ProductScrollerV1` hat keine Icon-Logik und ist nicht
    betroffen. Es wurden **keine Assets hochgeladen oder gelöscht** —
    der Slot ist strukturell verfügbar, Inhalte folgen redaktionell.
    **(b) `gebaeudekommunikation.snipdoo-ip` Klasse-D geräumt**:
    `audiences` und `anwendungen` haben jetzt je 3 `card_v1`-Kinder
    (`audiences.{installateure,planer,betreiber}`,
    `anwendungen.{efh,mfh,gewerbe}`, insgesamt **6 card_v1**). Felder
    `subtitle`/`title`/`description` aus Legacy-`items.<k>.{label,title,text}`
    übernommen; für `audiences` zusätzlich Lucide-`icon` (`wrench`,
    `ruler`, `building-2`). Whitelist DE+EN inklusive `icon_image`
    (audiences) und `image` (anwendungen) als pflegbare Slots
    vorbereitet. Renderer `SnipdooIpPage.tsx` liest die beiden Grids
    DB-first mit Legacy-`t(...)`-Fallback, DOM-Marker
    `data-cms-section` / `data-cms-field` gesetzt. Layout sichtbar
    unverändert.
    - **Bewusst belassen** auf `snipdoo-ip`: `subnav` (SubNavSticky-
      Labels, keine Karten), `systemversprechen` / `nutzungAlltag` /
      `systemaufbau` / `inbetriebnahme` / `kontakt` (heterogene
      Spezialstrukturen mit Diagramm-Slot, Step-Liste, CTA-Block —
      kein eindeutiges Karten-Zielmodell). `role_tabs` bleibt
      `role_tabs_v1` mit `tabs.*`-Feldern (Public-Renderer schon
      DB-first via `RoleTabsBlock`).
  - **Tranche 7e (Wohnungswirtschaft)** (2026-05-24): `personas.wohnungswirtschaft`
    auf das Persona-Standardmodell aus 7b gebracht. `stats` → `stats_v1`
    + **4 × `stat_v1`** (`experience`, `projects`, `made`, `management`,
    Felder `value`/`label`). `highlights` → `cards_v1` + **6 × `card_v1`**
    (`scalable`, `tenantManagement`, `costOptimization`, `security`,
    `digitalManagement`, `lowMaintenance`, Felder `title`/`description`).
    `solutions` → `cards_v1` + **4 × `card_v1`** (`communication`, `access`,
    `entry`, `signage`, Felder `headline`/`label`/`text`). Insgesamt **14
    neue Kindsections** mit Werten aus Legacy-`items.*` übernommen,
    Whitelist DE+EN gesetzt. Legacy-Felder bleiben unverändert als Fallback.
    Renderer `WohnungswirtschaftContent.tsx` liest jetzt über
    `usePersonaCms` (`listItems`/`txItem`) DB-first; `solutions` rendert
    weiterhin bevorzugt die vorhandenen `teaser_2col_v1`-Kinder und fällt
    sonst auf die neuen `card_v1`-Kinder bzw. Legacy zurück. DOM-Marker
    (`data-cms-section` / `data-cms-field`) gesetzt. Layout sichtbar
    unverändert.
    - **Bewusst belassen**: `detailSections` (heterogene Sonderstruktur
      mit 9 Subsektionen unterschiedlicher Form — Items mit `name` statt
      `title`, Sektionen ohne Items / nur `body`, Sektionen mit
      `intro`+Items+`noteProcurement*`+`noteInstallation*`). Kein
      eindeutiges Karten-Zielmodell, daher bewusst nicht migriert.
      Bleibt als Legacy-`items.*`-Pfad mit i18n-Fallback bestehen,
      löst aber **kein** Klasse-D-Flag mehr aus, weil die Hauptbereiche
      jetzt Kindsections haben. `WoWiDetailSections.tsx` unverändert.
    - **Persona-Standard-Konsolidierung (2026-05-24, Tranche 7e Doku-Teil)**:
      `personas.wohnungswirtschaft` ist damit Teil des
      `persona_standard_v1`-Musters (siehe `01-strategie/templates.md`).
      Keine neue Persona-Sonderkarte erzeugt — die heterogene
      `detailSections`-Sektion bleibt **bewusst als Sonderbereich
      stehen** (kein eindeutiges Karten-Zielmodell) und ist nicht Teil
      des Standardmusters.
    - **`card_v1`-Medienmodell festgezogen (2026-05-24, Tranche 7e)**:
      `card_v1` trägt genau drei Medienausprägungen über klar getrennte
      Slots — `icon` (Lucide-Textfeld), `icon_image` (TCS-Bildicon als
      Asset, Folgeaufgabe), `image` (normales Kartenbild) bzw.
      `thumbnail` (nur Hub-/Filtergrid-Kontext). Renderer-Zielpriorität
      für Icon-Karten: `icon_image` → `icon` → Code-Fallback. Keine
      neue Section-Variante. Doku ergänzt in
      `02-architektur/section-typen-katalog.md` (`card_v1`),
      `01-strategie/asset-strategie.md` (Abschnitt „card_v1
      Medienmodell") und `01-strategie/templates.md`
      (`persona_standard_v1`).
    - **Folgeaufgabe `icon_image` (erledigt in Tranche 8)**: Der
      Medienbereich (`AssetWorkbench`) erkennt `icon_image` jetzt als
      eigenen Bildslot. `rendererSlotMap.ts` listet `icon_image` für
      `card_v1`. `CardsSectionV1` und `FeatureGridV1` implementieren
      die Priorität `icon_image` → `icon` → Code-Fallback. Inhalts-
      Upload bleibt redaktionell.
  - **Tranche 7d** (Hub-/Home-Konsolidierung, 2026-05-24): 6 Hub-/Home-Seiten
    auf das gemeinsame Karten-/Statistik-Modell gebracht:
    `home.ueber-tcs` (stats→stats_v1+4 stat_v1; values/businessFields/
    manufacturing/milestones/locations → je cards_v1 mit insgesamt 33 card_v1),
    `home.start` (stats→stats_v1+4 stat_v1; personas→cards_v1+6 card_v1;
    contentBlocks→cards_v1+6 card_v1),
    `gebaeudekommunikation.root` (anwendungsumfelder→cards_v1+4 card_v1),
    `eingangssysteme.root` (pillars→cards_v1+3 card_v1; downloads→cards_v1+
    5 card_v1),
    `karriere.root` (benefits→cards_v1+4 card_v1; jobs→cards_v1+5 card_v1),
    `wissen.akademie` (formate→cards_v1+4 card_v1; zielgruppen→cards_v1+
    4 card_v1; partner→cards_v1+3 card_v1).
    Insgesamt **8 stat_v1** + **57 card_v1** Kindsections. Felder
    (`title`, `description`, je nach Bereich zusätzlich `subtitle`/`icon`
    bzw. `value`/`label`) wurden aus den Legacy-`items.*`/flachen Feldern
    übernommen, Whitelist DE+EN gesetzt. Legacy-Felder bleiben unverändert
    als Fallback in der DB. **Renderer-Anschluss abgeschlossen in
    Folge-Tranche 7d-renderer** (2026-05-24): alle 6 Hub-/Home-Seiten
    lesen jetzt `_item_<key>`-Kindsections DB-first über den neuen
    Shared-Helper `src/features/cms/utils/cmsItemHelpers.ts`
    (`listChildItems`, `txChildField`, `txStatField`). Legacy-Pfad
    (`items.*` / flache Felder / i18n-JSON) bleibt aktiv als Fallback.
    DOM-Marker (`data-cms-page` / `data-cms-section` / `data-cms-field`)
    auf allen migrierten Karten gesetzt. Layout sichtbar unverändert.
    Geänderte Renderer: `HomePage` (`StatsSection`, `PersonaSection`,
    `ContentBlockItem`), `UeberTCSPage`, `TuerkommunikationPage`,
    `EntrySystemPage`, `KarrierePage`, `AkademiePage`.

    - Bewusst **nicht** in 7d: `personas.wohnungswirtschaft`
      (`detailSections`-Sonderfall) und `gebaeudekommunikation.snipdoo-ip`
      (`subnav`/`audiences`/`anwendungen`-Sonderlogik mit Rollen-Tabs).
  - **Klasse C und F geräumt** (Tranche 7a + 7e, 2026-05-24).
  - **Klasse C und F geräumt** (Tranche 7a + 7e, 2026-05-24).
  - **Tranche 7a** (Quick-Win Icons): `home.ueber-tcs`, `service.downloads`,
    `service.technischer-support` — 33 Icon-Tupel × DE/EN als
    `cms_section_fields` (`<key>.icon`), Whitelist gesetzt, Renderer
    nutzt `resolveIcon(cms.text(...), Fallback)`, DOM-Marker gesetzt.
    Medien-Icon-Reader (`src/features/admin/api/cmsAdminIconFields.ts`)
    liest jetzt auch strukturierte `*.icon`-Felder via
    `field_key.eq.icon,field_key.like.*.icon`.
  - **Tranche 7e** (Sonderfall): `gebaeudekommunikation.tuersprechanlagen`
    — 4 Vorteile-Icons DE+EN in `vorteile.items.<key>.icon`, Whitelist,
    `resolveIcon`-Hookup, DOM-Marker. Audit-Skript erkennt jetzt
    `useCmsPageContent` als DB-Reader, dadurch ist die frühere
    F-Fehlklassifizierung dieser Seite weg.
  - **Tranche 7b** (Personas Standardmigration, 2026-05-24): 5 Persona-
    Standardseiten auf Kindsection-Modell umgestellt: `personas.architekt`,
    `personas.bauherr`, `personas.fachhandel`, `personas.fachplaner`,
    `personas.handwerk`. Je Seite `stats` als `stats_v1`-Parent mit
    **4 × `stat_v1`**-Kindern und insgesamt **13 × `card_v1`**-Kinder
    unter den Listen-Parents (`highlights` / `solutions` / `cases` /
    `tools` / `partnerServices` / `tips`, jeweils als `cards_v1`).
    Hook `usePersonaCms` erweitert um `txItem(section, itemKey, newField,
    legacyField?)` und `listItems(section, fallback)` — Renderer lesen
    Kindsections **DB-first**, fallen auf legacy `items.<key>.{title,desc}`
    der Parent-Section zurück, falls keine Kinder existieren. DOM-Marker
    (`data-cms-section` / `data-cms-field`) gesetzt. Legacy `items.*`-
    Felder bleiben unverändert als Fallback in der DB.
    - **`personas.architekt.kopie`**: archiviert und `is_active=false`,
      durch **Audit-Hygiene** aus Klasse D entfernt
      (`scripts/cms/medien-konsistenz-audit.mjs` ignoriert archived/inactive
      Pages). **Nicht migrieren**; vor Public-Live optional vollständig
      deaktivieren oder per RPC löschen.
    - **`personas.wohnungswirtschaft`**: bewusst ausgelassen — enthält
      `detailSections`-Sonderfall (komplexes Layout), wird in eigener
      Spezialtranche behandelt und bleibt in Klasse D.
  - **Tranche 7c** (Service-Hub Kindsection-Migration, 2026-05-24):
    4 Service-Hub-Seiten vollständig auf das `cards_v1`/`card_v1`-Modell
    umgestellt: `service.downloads` (15), `service.technischer-support` (10),
    `service.planen-konfigurieren` (21), `service.ersatzteile` (8) —
    insgesamt **54 neue `card_v1`-Kindsections** inkl. Felder
    (`title`, `description`, optional `icon`, `subtitle`, `cta_label`)
    und Whitelist DE+EN. Neuer Shared-Helper
    `src/features/service/shared/cmsCardHelpers.ts` mit `listCardItems(...)`
    und `txCardItem(...)` — Renderer lesen Kindsections DB-first und
    fallen auf legacy `items.<key>.*` (bzw. flache `<key>.*`-Felder)
    sowie i18n-JSON zurück. DOM-Marker gesetzt. Alle 4 Service-Seiten
    sind dadurch aus Klasse D in Klasse A gewandert.
    - **Bewusst belassen** in `service.ersatzteile`: die Bereiche
      `beschriftung` und `freischaltcodes` wurden in 7c **nicht** auf
      Kindsections umgestellt (keine 7c-Migrationseinträge für diese
      Sonderbereiche) — bleiben legacy-`items.*`-Pfad, lösen aber kein
      Klasse-D-Flag aus, weil die Hauptbereiche jetzt Kindsections haben.
  - **Medienbereich (Admin)** zeigt drei Slot-Arten nebeneinander: **Bilder**
    (Slot `image`), **Thumbnails** (Slot `thumbnail`) und **Icons**.
    Bildslots bleiben **je Renderer-Kontext** entweder `image` oder
    `thumbnail` — kein automatisches Umetikettieren. Legacy/falsche Slots
    in `cms_assets` bleiben erhalten, werden vom Renderer aber ignoriert.
  - **Icons sind keine `cms_assets`-Zeilen**, sondern Werte in
    `cms_section_fields` (`field_key='icon'` oder `<key>.icon` für
    indizierte Listen) — kebab-case Lucide-Namen (`shield`, `heart-pulse`,
    `key-round`). Im Admin werden sie über den IconPicker gepflegt,
    Whitelist-Eintrag in `cms_admin_editable_fields` Pflicht.
  - **DOM-Marker (Klasse E) = 0**: alle aktiv migrierten Seiten setzen
    `data-cms-page`/`data-cms-section`/`data-cms-field`, Medien- und
    Content-Workbench finden bidirektional zur Live-Vorschau.
  - **Klasse D offen (1)** — verbleibende Audit-Restmenge nach
    7e (Wohnungswirtschaft):
    - `gebaeudekommunikation.snipdoo-ip` (`subnav`/`audiences`/
      `anwendungen`-Sonderlogik mit Rollen-Tabs, eigene Tranche).
    **Empfohlene nächste Tranche**:
    1. `gebaeudekommunikation.snipdoo-ip` Spezialtranche
       (Rollen-Tabs / Audiences).

- **Copy/Paste im Admin (Stand 2026-05-23)**: nur noch über
  **Clipboard → `pasteSection` → `rpc_admin_paste_section`** (rekursiv,
  inkl. Kindsections, Felder, Assets, Whitelist).
  `rpc_admin_duplicate_section` ist **deprecated** und nicht mehr
  UI-Pfad — bleibt nur als technischer Fallback bestehen.
- **Anwendungen (Shared + Spezialseiten) abgeschlossen** (Tranche 5+6,
  2026-05-23): alle 16 generischen Anwendungen-Seiten (`AnwendungDetailPage`-
  Renderer) sowie die 4 Spezialseiten (`bildungseinrichtungen`,
  `gesundheitseinrichtungen`, `objektloesungen`, `oeffentliche-hand`)
  lesen Icons DB-first über `cms.text(section, "<key>.icon", loc, "")` +
  `resolveIcon(...)`. 162 + 29 Icon-Felder DE+EN inkl. Whitelist.

## Was steht

- **Datenmodell**: 6 Tabellen, vollständig migriert (Etappen B–H, siehe
  [`migration-log.md`](./migration-log.md)).
- **Inhalte aus Marketing-ZIP** sind 1:1 in DB gespiegelt: 94 redaktionelle
  Seiten, 8.288 Felder, Diff = 0 gegen Snapshot in
  `scripts/sync/source-raw/i18n`.
- **Spiegelregel** scharf: Renderer iteriert über `cms.sections`,
  Reihenfolge und Sichtbarkeit aus dem Admin schlagen auf die Website durch.
- **DB-first Rendering**: Hook `useCmsI18n(pageKey, ns, rootPrefix)` rollt
  i18n-Strings, Bilder und Alt-Texte aus der DB; i18n-JSON nur als Fallback.
  Flächendeckend auf 76/79 CMS-Seiten ausgerollt.
- **Schreibwege**: Admin-UI schreibt ausschließlich über die 34
  `rpc_admin_*`-Funktionen (Whitelist + RLS).
- **Admin** (`/admin`): in **Prototyp-Phase ohne Login** — bewusst, bis Inhalte
  und Datenmodell final stehen.
- **Asset-Modell** (vereinheitlicht 2026-05-16): Ein Bild-Slot je `field_key`
  (z. B. `image`) mit drei Geräte-Varianten als `viewport` (`mobile`, `tablet`,
  `desktop`). Fehlt eine Variante, fällt der Renderer auf `desktop` zurück.
- **Legacy-Slots** `image_desktop`, `image_tablet`, `image_mobile` sind tot
  (vom Renderer nicht gelesen, im Admin nicht mehr als Slot angeboten). Alte
  Zeilen bleiben in der DB stehen und werden nicht blind gelöscht.
- **Hero-Bilder**: Andres Stand vom 2026-05-16 ist kanonisch im
  `hero.image`-Slot mit seinen Viewport-Varianten.
- **Spiegel-Regel auch für Bilder**: `cms_assets`-RLS koppelt Bilder jetzt
  an aktive Sections (analog `cms_section_fields`, Migration 2026-05-16).
- **Navigation**: `rpc_public_read_navigation_overlay` ist analog zum
  Navigations-Baum gehärtet (nur aktive, public-sichtbare Knoten; Page-Knoten
  nur bei published + active Page).
- **Redaktionelle Code-Bildfallbacks entfernt** (Stand 2026-05-20): `src/assets`
  enthält jetzt nur noch `logo-tcs.png`. Die letzten Fallbacks für
  `legal.impressum`, `legal.datenschutz`, `legal.agb` und
  `anwendungen.referenzprojekte` wurden durch CMS-pflegbare
  Platzhalter-Hero-Bilder (`hero.image`, Desktop/Tablet/Mobile) in
  `cms_assets` ersetzt und sind im Admin austauschbar.
- **Karten-Migration Tranche 1** (2026-05-21): Die `vorteile`-Sections der
  Pilotgruppe sind als echte Karten-Container modelliert. Parent vom Typ
  `cards_v1`, je Vorteil eine Kind-Section `vorteile_item_<N>` vom Typ
  `card_v1` mit Feldern `title`, `description`, `icon` (DE+EN, Whitelist
  gesetzt) und Bild-Slot `image`. Betroffen: `bcm-infoboard` (5),
  `bcm-buchungssystem` (6), `aussenstation-adx5` (8), `digitale-briefkasten`
  (6), `zutrittssoftware` (8), `bcm-mini-cloud` (6) — 39 neue Kind-Sections,
  234 neue Felder, 234 Whitelist-Einträge. Renderer
  (`CmsProductSolutionShell`) liest zuerst Kind-Sections, fällt auf alte
  `items.N.*`-Felder zurück, wenn keine Kinder vorhanden sind. Legacy-Felder
  bleiben unverändert in der DB. Public-Layout (3-Spalten-Grid) und Inhalte
  unverändert.
- **Karten-Migration Tranche 2 + P-015-Sonderbereinigung** (2026-05-21):
  Weitere Produkt-Unterseiten unter `zutrittskontrolle.*` wurden auf das
  Kind-Section-Modell umgestellt (Parent `cards_v1` / `product_scroller_v1`,
  Kinder `card_v1`). Damit folgt P-015 (Referenz) sowie die Mitgliedsseiten
  P-016–P-021 und P-227–P-235 dem `produkt_sub_v1`-Muster konsistent. P-021
  (Biometrie) und P-231 (Zufahrtskontrolle) sind ausdrücklich als
  Strukturvariante B (`hero` + `produkte` + `useCases|anwendungen` + `cta`)
  erlaubt und gelten nicht mehr als Abweichung.
- **Template-Werkstatt `produkt_sub_v1`** (2026-05-21): Im `/admin` zeigt
  die Template-Werkstatt aktuell **15 Mitglieder** der Produkt-Unterseiten-
  Familie inkl. erlaubter Sprach-Varianten (`benefits`/`useCases` ↔
  `vorteile`/`anwendungen`) und Strukturvarianten A/B. Vorschau Desktop/
  Tablet/Mobile, „Im Admin öffnen" und Struktur-Vergleich aktiv. Quelle der
  Mitglieder-Liste: `src/features/admin/lib/templates.ts`.
- **Strukturkarte Stufe 0 / Sitemap V3** (2026-05-21): `/admin` bietet eine
  read-only Sitemap (118 Seiten, Navigation MainNav/Persona/Meta/Footer +
  „nur über Links" + „nicht erreichbar"), Hierarchie- und Link-Kanten
  farblich getrennt, Pan/Zoom, Suche, lokale Knoten-Positionen via
  `localStorage`, Vorschau-iframe + „Im Admin öffnen". Keine Migration,
  keine Schreibwege.
- **Wechselteaser-Migration `gebaeudekommunikation.root`** (2026-05-21):
  Die Sammel-Section `bereiche` (Typ `content_v1` mit flachen
  `items.<key>.*`-Feldern) ist deaktiviert (`is_active=false`) und nicht
  mehr führende Quelle. An ihre Stelle treten eine Intro-Section
  `bereiche_intro` (`content_v1`) und **fünf einzelne Wechselteaser-
  Sections** vom Typ `teaser_2col_v1`: `bereich_tuersprechanlagen`,
  `bereich_briefkastenanlagen`, `bereich_beschilderung`,
  `bereich_grossanlagen`, `bereich_systemloesungen` — jede mit Feldern
  `label`, `title`, `text`, `cta_label`, `cta_link`, `image_position`
  (wechselnd links/rechts), `background_variant` (DE+EN, Whitelist
  gesetzt) und aktivem Desktop-`image`-Slot in `cms_assets` (Bilder aus
  der Alt-Section übernommen). Tablet/Mobile-Viewports stehen offen und
  werden in einer separaten Asset-Etappe tranchenweise nachgereicht.
  In `TuerkommunikationPage.tsx` bestehen die 8 statischen Bild-Imports
  weiter, aber **nur noch als dokumentierter Fallback** (Block
  `bereicheItemsFallback`) für den Fall, dass die DB-Sections fehlen —
  sie sind nicht mehr führende Quelle. `teaser_2col_v1` ist damit das
  **verbindliche Standardmuster für Wechselteaser** (eine Section je
  Teaser, keine `items.N.*`-Sammellisten); siehe
  [`02-architektur/section-typen-katalog.md`](./02-architektur/section-typen-katalog.md).
  Startseite, Zutrittskontrolle und Gebäudemanagement folgen in eigenen
  Etappen.

## Was noch offen ist

- **Admin-Login**: kommt erst, wenn Inhalt und Modell final stehen. Bis
  dahin bleibt `/admin` Prototyp im internen Workspace, nicht
  public-live-sicher.
- **Produktdatenbank**: bleibt strikt getrennt (eigener Client, eigene
  PDP, Produktbilder, Specs, Filter) und wird durch CMS-Light nicht
  berührt.
- **Renderer-Lücken**: nach Einführung von `faq_v1` (Tranche
  `cms-renderer-faq-v1-tranche-1`) ist aktuell **keine echte
  Renderer-Lücke** bekannt. 6 dokumentierte Ausnahmen in der
  `EXEMPT`-Liste von `renderer-audit.mjs` / `i18n-check.config.json`
  (Admin, Produkt-Detailseite, Türsprechanlagen, Produkt-Hub-Container)
  bleiben bewusst bestehen und werden vor Public-Live erneut bewertet.
- **Bildmigration in `cms_assets`** läuft tranchenweise. Erledigt in
  Tranche 1: `ServicePage` und `GebaeudemanagementPage` (Hero-Code-Imports
  entfernt, Quelle ist der `hero.image`-Slot mit Viewport-Varianten).
  Offen: Personas/Hubs (Zutrittskontrolle, Signage, Akademie, WoWi) sowie
  shared Components (`HeroSection`, `ContentBlocks`, `ContentBlockItem`).
- **Mobile-/Tablet-Asset-Varianten** sind lückenhaft — Desktop ist überall
  da, Mobile/Tablet teilweise leer (Fallback greift).
- **Leere Karten-Felder** auf einigen Seiten (siehe Admin-UI, gelbe Marker).
- **Code-gebundene redaktionelle Bilder** (Stand 2026-05-21, nach
  `public/catalog`-Cleanup): `public/catalog` ist erledigt. Weiterhin offen
  sind **32 aktiv per Code-Import** geladene redaktionelle Bilder unter
  `src/features/**/assets` (Heros, Signage, Türkommunikation, Briefkasten,
  Fahrstuhl, BCM-Mobil etc.) — sollen tranchenweise nach `cms_assets`
  überführt werden (geplante Etappe J). Zusätzlich liegen **44 verwaiste
  Bilddateien** unter `src/features/**/assets` (kein Code-Import mehr) —
  separat zu prüfen/löschen in Etappe K. Brand-Asset `src/assets/logo-tcs.png`
  bleibt.
- **Linter-Warnungen** (SECURITY DEFINER auf `rpc_admin_*`, öffentlicher
  Bucket-List) sind bekannt und akzeptiert für die Prototyp-Phase.
- **Whitelist-Differenz `cms_section_fields` ↔ `cms_admin_editable_fields`**
  (Stand 2026-05-21, nach Klassifizierung der deaktivierten Einträge):
  **0 Felder ohne Whitelist-Eintrag** (Eintrag fehlt komplett — Zählung
  per LEFT JOIN über `page_key/section_key/field_key/locale`). Kein akuter
  Architekturbruch, keine fehlenden Whitelist-Einträge.
  **Korrektur zur Zählung**: Tatsächlich gibt es aktuell **256 Felder mit
  vorhandenem, aber deaktiviertem Whitelist-Eintrag** (`is_enabled=false`,
  nicht 228 wie zuvor dokumentiert). Klassifizierung:
  - **190 Einträge — Klasse B (bewusst deaktivierter Legacy-/Fallback-Pfad,
    nicht aktivieren)**: Legacy `items.N.*`-Felder auf
    `zutrittskontrolle.biometrie` (`produkte` 42),
    `zutrittskontrolle.zufahrtskontrolle` (`produkte` 38) und
    `zutrittskontrolle.elektronische-drueckergarnitur`
    (`benefits`/`useCases`/`benefit_*`/`usecase_*` 80 inkl. 12 `benefit_*.desc`
    und 14 `usecase_*.text`, die der Renderer als `description` liest).
    Diese Seiten haben bereits Kind-Sections (`card_v1`), der Renderer liest
    von dort. Optional vor Public-Live: alte `items.N.*`-Zeilen in
    `cms_section_fields` aufräumen.
  - **66 Einträge — Klasse D (offene Modellentscheidung)**: betreffen
    `gebaeudekommunikation.tuersprechanlagen` / `innenstationen` (42) und
    `aussenstationen` (24). Parent ist `product_scroller_v1`, es existieren
    **noch keine** Kind-Sections, der Renderer liest aktuell über den
    `items.N.*`-Legacy-Pfad. Zwei Optionen:
    - **D1 (Quick-Win)**: Whitelist aktivieren, Legacy-Schema
      `items.N.*` bleibt, Redaktion pflegt direkt auf der Parent-Section.
    - **D2 (sauber, empfohlen)**: spätere eigene Etappe — Migration auf
      Kind-Sections `innenstation_*` / `aussenstation_*` vom Typ `card_v1`
      analog Wechselteaser/Tranche 1+2, danach Whitelist auf den Kindern
      aktivieren. Konsistent zum `produkt_sub_v1`-Muster.
    Entscheidung steht aus; bis dahin bleiben die 66 Einträge unverändert
    deaktiviert.
  Liegen ausschließlich auf den genannten Sections — **nicht** auf
  `gebaeudekommunikation.root`. Weiterhin offen: **2.265 Whitelist-Einträge
  ohne passendes Feld** in `cms_section_fields`. Davon sind ca. 1.300
  legitime Asset-Slot-Platzhalter (`image`, `icon`, `thumbnail`, `img_0..2`
  — warten auf Upload via `cms_assets`, Klasse B) und der Rest unklare
  Legacy-Reste (`items.N.icon`, alte Sprach-/Section-Keys, Klasse E).
  Diese werden nicht blind deaktiviert, sondern vor Public-Live einzeln
  bewertet. Keine sofortige Sicherheitslücke (RLS bleibt scharf, RPC
  prüft Whitelist beim Schreiben).


## Sonderfall: fachlich umgehängte Routen (Breadcrumb ↔ MainNav)

Stand: 2026-05-21. Temporärer Zustand, bis eine gemeinsame Quelle existiert.

Einige Routen liegen aus historischen Gründen unter `/zutrittskontrolle/...`,
gehören fachlich aber zu **Gebäudemanagement** (z. B.
`/zutrittskontrolle/zutrittssoftware`, `/zutrittskontrolle/aussenstation-adx5`,
`/zutrittskontrolle/digitale-briefkasten`, `/zutrittskontrolle/schrankschloss`,
`/zutrittskontrolle/serverschrankschloss`,
`/zutrittskontrolle/vorhaengeschloss`).

Damit Breadcrumb und aktive Hauptnavigation für diese Routen konsistent
„Gebäudemanagement" zeigen, müssen **zwei Stellen** parallel gepflegt
werden:

1. **Breadcrumb** wird bewusst unter Gebäudemanagement angezeigt — Quelle
   ist primär der DB-Navigationsbaum (`cms_navigation_nodes`,
   Parent = `gm.*`) plus URL-Fallback-Override in
   `src/components/AutoBreadcrumb.tsx` (`BREADCRUMB_OVERRIDES`).
2. **Aktive Hauptnavigation** wird heute pfadbasiert in
   `src/components/MainNavigation.tsx` über `exactMap` bestimmt. Dieselben
   Routen müssen dort als exakte Treffer auf `gebaeudemanagement` eingetragen
   sein, sonst gewinnt der URL-Prefix `/zutrittskontrolle/...` und
   „Zutrittskontrolle" wird unterstrichen.

Diese **doppelte Pflege ist temporär**. Langfristiges Ziel: **eine
gemeinsame Quelle** für Breadcrumb-Top-Level und aktive MainNav,
idealerweise direkt aus `cms_navigation_nodes` (DB-/Navigationsbaum-basiert),
sodass `exactMap` und `BREADCRUMB_OVERRIDES` entfallen.

**Regel beim Ergänzen neuer Overrides**: Wird ein neuer Breadcrumb-Override
für eine fachlich umgehängte Route ergänzt (DB-Knoten unter neuem Parent
oder Eintrag in `BREADCRUMB_OVERRIDES`), MUSS im selben Schritt geprüft
werden, ob die aktive MainNav (`exactMap` in `MainNavigation.tsx`) ebenfalls
angepasst werden muss. Sonst zeigen Breadcrumb und Hauptnavigation
unterschiedliche Top-Level-Bereiche.


## Arbeitsweise heute

- **Inhalt** (Text, Bild, Alt-Text, Slug, Reihenfolge): per Admin oder per
  Lovable-Prompt — beides landet zwingend in der DB.
- **Layout & Interaktion**: per Lovable-Prompt → Code.
- **DB-Änderungen**: nur über idempotente Migrationen.
- **Vor jeder größeren Änderung**: `.lovable/always-follow.md` lesen.

Mehr Details siehe [`01-strategie/cms-light-source-of-truth.md`](./01-strategie/cms-light-source-of-truth.md).


## Tageslog 2026-06-02

**Admin-Tableiste aufgeräumt**: Tabs „Templates" und „Strukturkarte"
entfernt. Tab „Validierung" zu **Wahrheits-Check** umgebaut — vergleicht
pro Bildslot vier Quellen (DB · Whitelist · Renderer · UI-Code-Fallback),
zeigt 8 Status-Klassen, Drilldown mit Befund + Empfehlung, ⓘ-Erklärungen,
Filter nach Navigationsbereich (aus `cms_navigation_nodes`). Neue Doku:
`docs/04-betrieb/wahrheits-check.md`.

**Seitentypen-Matrix neu**: T02 aufgespalten in
**Hauptmenüpunkt-Standardseite** (T03) und **Hauptmenüpunkt-Sonderseite**
(T02). T03 bekommt Türkommunikation, Zutrittskontrolle und Eingangslösungen
als echte Hauptmenüpunkte.

**Standard-Bausteine flächendeckend**: `faq_v1` auf 81 T05-Detailseiten
und `cta_v1` auf 109 Seiten als Vorlage angelegt (DE+EN, Whitelist
gesetzt, `is_active=false`). Bestehende redaktionelle FAQs unberührt.

**Hardcode entfernt**: doppelter Projekt-CTA-Block auf P028
(`BeschilderungPage.tsx`) raus. P264 „Eingangslösung (Kopie)" als
Karteileiche markiert (Löschung steht aus). P007: Renderer auf neuen
`cards_v1`-Container `loesungen_uebersicht` umgestellt, vier Standardkarten
mit Bildern erscheinen wieder.

**Admin-UX-Fix**: Navigationsbaum klappt Geschwister beim Aufklappen
automatisch zu — kein Springen mehr.

**Neue Pflichtdoku für Inhalts-Prompts**:
`docs/03-redaktion/prompt-leitplanken.md` — T-Codes, Container-Typen,
FAQ+CTA-Standard, „Grün-by-default"-Checkliste. Verweis in
`ai-start-prompt.md` (Regel 3) und `.lovable/always-follow.md` (§15).

**Offen**: P264 löschen · globalen Projekt-CTA in `PageLayout.tsx` auf
DB-`standard_cta` umstellen · lokalen CTA in `AnwendungDetailPage.tsx`
entfernen · Wahrheits-Check auf Text-Slots erweitern · restliche Hardcode-
Blöcke (Tools-Karten, persona-spezifische Karten) in DB migrieren · Login
für `/admin` als letzter Schritt.

**Sprint card_v1 Abschluss (2026-06-03)**: Standardkarte ist eine einzige
Wahrheit. 13/13 lokale Sonderrenderer lesen jetzt canonical-first über
`@/features/cms/lib/cardCanonical.ts` (`canonicalLink`, `canonicalChips`,
`canonicalBullets`). Legacy `tags`/`cta_*`/`href`/`features.N` werden im
öffentlichen Renderer nicht mehr direkt ausgespielt — nur noch als
Resolver-Fallback. Audit-Gates V1–V3 + neue R5/R6 in
`scripts/cms/card-renderer-paritaet.mjs` **grün**. Pflichtkarten-E2E
`scripts/cms/e2e-card-v1-pflichtkarten.mjs` für **B-538** und **B-2084**
**grün**. CI hart (kein `continue-on-error`). Konflikt B-2084 dokumentiert
und aufgelöst in `docs/04-betrieb/sprint-card-v1-abschluss-legacy-konflikte.md`:
`link_1_href=/Kontakt` gewinnt, Legacy `cta_href=/anwendungen/...` bleibt
in DB, wird aber nicht mehr gerendert. **card_v1 abgeschlossen: ja.**
