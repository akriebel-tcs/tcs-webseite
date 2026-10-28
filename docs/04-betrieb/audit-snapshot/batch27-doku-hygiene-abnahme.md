# Batch 27 — Doku-Hygiene nach CMS-Freeze (Abnahme)

Stand: 2026-06-05. Reine Doku-Arbeit. Keine DB, keine Renderer, keine
Seiten, keine Navigation geändert.

## 1 · Ziel

Nach dem CMS-Freeze (Batch 25) und dem Dachdokument (Batch 26) die
Dokumentation auf **eine aktive Start-Wahrheit** reduzieren:

- genau eine führende Startstelle für Redaktion/Prompt-Arbeit,
- klare technische Statusquelle,
- alte Sprint-/Prompt-/Zwischenstands-Dokumente ins Archiv oder eindeutig
  als historisch markiert,
- keine Belege gelöscht,
- keine technischen Änderungen.

## 2 · Aktive Einstiegspunkte (jetzt führend)

1. `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` — Dachdokument
2. `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md` — technischer Live-Status
3. `docs/04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md` — Abschlussbericht
4. `docs/01-strategie/cms-light-source-of-truth.md`
5. `docs/01-strategie/seitentyp-taxonomie.md`
6. `docs/02-architektur/section-typen-katalog.md`
7. `docs/02-architektur/karten-raster-regel.md`
8. `.lovable/always-follow.md`

Zusätzlich aktiv: `docs/current-status.md` (Kurzstatus), `docs/ai-start-prompt.md`.

## 3 · Was wurde verschoben

### 3.1 Status

- `docs/current-status.md` (2504 Zeilen, alter Langstatus) →
  `docs/archiv/status-historisch/current-status-bis-batch26.md`.
- Neue `docs/current-status.md`: kurz (~40 Zeilen), Stand nach Batch 26/27,
  Verweise auf die führenden Dokumente, klar markierte „bewusst offen"-Liste
  (Login, Klasse-A-Pages, Admin-UX, Marketing-Inhalts-Audit).

### 3.2 Redaktion (`docs/03-redaktion/`)

Aktiv bleiben (5): `redaktions-uebergabe-und-prompt-regeln.md`,
`redaktionshandbuch.md`, `kurzanleitung.md`, `checkliste-redaktion.md`,
`qa-nach-redaktionsrunde.md`.

Verschoben nach `docs/archiv/redaktion-historisch/` (mit Archiv-Header):

| Datei | Grund |
|---|---|
| `start-fuer-neue-redakteure.md` | abgelöst durch Dachdokument |
| `prompt-kurzanleitung.md` | abgelöst durch Dachdokument |
| `prompt-leitplanken.md` | T-Code-/Container-Tabellen jetzt als Kurzreferenz im Dachdokument (Abschnitt 5a) + Single-Source-Verweise auf `seitentyp-taxonomie.md`, `section-typen-katalog.md`, `karten-raster-regel.md` |
| `redaktions-prompts.md` | Sicherheitsmodus-Doku aus der CMS-Härtungsphase, jetzt durch Freeze + Dachdokument abgedeckt |
| `uebergabe-marketing-redaktion-2026-05-17.md` | datierter Übergabeprotokoll-Stand |
| `bildkarten-blueprint-audit.md` | Lese-Audit vom 2026-05-27, historisch |
| `bildkarten-scroller-copy-audit.md` | Lese-Audit vom 2026-05-27, historisch |
| `bildkarten-scroller-zielbild.md` | Strategie-Dokument vom 2026-05-27, durch finalen Section-Typen-Katalog überholt |

**Bildkarten-Entscheidung:** Alle drei Dateien waren Audits/Zielbilder vom
27.05.2026 aus der CMS-Härtungsphase. Die fachlichen Festlegungen
(Container `cards_v1` / `product_scroller_v1` / `teaser_2col_v1` /
`feature_grid_v1`, Karten als `card_v1`-Kind-Sections, Bildslots)
sind seit Freeze in `02-architektur/section-typen-katalog.md` und
`01-strategie/asset-strategie.md` zentralisiert. Daher direkt
archivieren, keine Konsolidierung in `bildkarten-regeln.md` nötig.

### 3.3 Betrieb (`docs/04-betrieb/`)

Aktiv bleiben (8 Dateien + `audit-snapshot/`):

- `wahrheits-check.md`
- `ausgeblendete-sections-policy.md`
- `naechste-schritte.md`
- `dokumentation-archiv-vorschlag.md` (Übergangsdoku aus Batch 26)
- `prompts-vs-admin.md`
- `faq-cta-toggle-inventar.md`
- `script-lesbarkeit.md`
- `audit-snapshot/` (Belegordner, nur README neu geschrieben)

Verschoben nach `docs/archiv/sprint-berichte/`:

- alle `sprint-*.md` (33 Dateien)
- alle `hotfix-*.md` (2 Dateien)

Verschoben nach `docs/archiv/audit-historisch/`:

- alle `*-latest.md` (7 Dateien: `card-container-preset-…`,
  `contract-drift-…`, `d3-d5-rest-triage-…`, `d9-relations-…`,
  `renderer-fallback-inventar-…`, `seitentypen-bausteinmatrix-…`,
  `template-elemente-abgleich-…`)
- `admin-kurz-id-sprung-test.md`, `admin-raster-scroller-standardkarte-realitaetsabgleich.md`
- `baustein-atlas-visuell.md`, `baustein-atlas-visuell.pdf`,
  `baustein-atlas-assets/` (Ordner)
- `bildkarten-workspace-fuer-alle-card-v1.md`
- `card-v1-bullets-und-chips-semantik.md`,
  `card-v1-runtime-paritaet.md`,
  `card-v1-textmodell-konsolidierung.md`,
  `runtime-vertrag-card-v1.md`
- `d10-spezialrisiken-inventar.md`
- `db-dupes-section-inactive-triage.md`
- `eine-wahrheit-abschluss.md`
- `preview-paritaet-b538-bullets-chips-links.md`
- `standardkarte-admin-arbeitsbereich-vollausbau.md`,
  `standardkarte-admin-maske-vereinheitlichen.md`,
  `standardkarte-admin-presets-und-sichere-seedings.md`,
  `standardkarte-modulmodell-latest.md`,
  `standardkarte-modulreview-und-seedings-klein.md`
- `template-konsolidierung-audit-2026-05-24.md`
- `wochenend-hygiene-check-2026-05-29.md`
- `zielbaukasten-cms-light-inventar.md`,
  `zielbausteine-standardkarte-und-migrationsfahrplan.md`

`audit-snapshot/` ist **nicht durch Löschen aufgeräumt**. Stattdessen
neue `audit-snapshot/README.md`: zeigt Einstiegspunkte
(`cms-steuerbarkeit-status.md`, `batch25-cms-abschluss-freeze.md`,
`batch27-doku-hygiene-abnahme.md`), markiert frühere `batchNN-*.md`-
und `p027-*`-Dateien als Historie, und führt die aktiven Audit-Snapshots
mit ihren Quellen auf.

### 3.4 `.lovable/`

- `.lovable/plan.md` (alter konkreter Raster-Regel-Plan) →
  `docs/archiv/lovable-historisch/plan-bis-batch26.md`.
- Neue `.lovable/plan.md`: kurzer Freeze-Hinweis + Einstiegsverweise.
- `.lovable/always-follow.md` aktualisiert (siehe 4).

## 4 · Welche Inhalte wurden inhaltlich aktualisiert

### `.lovable/always-follow.md`

- Stand-Zeile + Verweis auf Dachdokument als führende Startseite und auf
  `cms-steuerbarkeit-status.md` als technischen Hauptstatus.
- Freeze-Hinweis im Kopf.
- Abschnitt 4 (Öffentliche Website schützen): alte Zahlen `75/81`
  entfernt, Navigations-Absatz präzisiert (DB-first über
  `cms_navigation_nodes`, Routen/Breadcrumbs/Kartenlinks konsistent,
  Wahrheits-Check + Preview-Stichprobe).
- Abschnitt 13 (Doku-Pflicht): `cms-steuerbarkeit-status.md` ist
  technischer Hauptstatus; `current-status.md` ist Kurzstatus; ergänzt um
  `karten-raster-regel.md`.
- Abschnitt 15 (Neue CMS-Seiten): Pflichtlektüre = Dachdokument
  (vorher: `prompt-leitplanken.md`). Single-Source-Verweise gebündelt.
- Abschnitt 16 (Hierarchie bei Widersprüchen) neu sortiert: Dachdokument
  zuerst, dann technischer Status, dann Always-Follow, dann Kurzstatus.
- Abschnitt 17 (alt: Sicherheitsmodus mit Verweis auf
  `redaktions-prompts.md`) entfernt; durch Freeze und Eskalationspfad im
  Dachdokument abgedeckt. Neuer Abschnitt 17: **ZIP-Wahrheit**
  (`rls_public_only`-Snapshot ist KEIN vollständiges DB-Backup).

### `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`

- Neuer Abschnitt **5a — T-Codes & Container Kurzreferenz** mit
  Verweisen auf die drei Single Sources. Keine Tabellen-Duplikation.

### `docs/README.md`

- Komplett umgeschrieben: 8 aktive Einstiegspunkte explizit gelistet,
  Struktur-Diagramm aktualisiert (neue Archiv-Unterordner: 
  `status-historisch/`, `redaktion-historisch/`, `audit-historisch/`,
  `sprint-berichte/`, `lovable-historisch/`).

### `docs/ai-start-prompt.md`

- Reihenfolge der Pflichtlektüre angepasst: Dachdokument → Kurzstatus →
  `cms-steuerbarkeit-status.md` → `.lovable/always-follow.md`.
- Regel 3 zeigt jetzt direkt auf `seitentyp-taxonomie.md` /
  `section-typen-katalog.md` / `karten-raster-regel.md` statt auf das
  archivierte `prompt-leitplanken.md`.
- Neue Regel 8: CMS-Freeze.

### `mem://index.md`

- Core-Regel „führende Startseite = Dachdokument" und
  „Technischer Hauptstatus = `cms-steuerbarkeit-status.md`" gesetzt.
- Alte aktive Pfade auf `prompt-leitplanken.md`, `prompt-kurzanleitung.md`,
  `start-fuer-neue-redakteure.md` aus den Memories-Verweisen entfernt
  bzw. als Archiv markiert.
- Neue Memory-Einträge für `karten-raster-regel.md`,
  `seitentyp-taxonomie.md`, `section-typen-katalog.md`, Kurzstatus,
  Batch-27-Bericht, archivierte Bereiche.

## 5 · Welche Historie bleibt erhalten

Sämtliche verschobenen Dateien liegen unverändert (mit Archiv-Header in
`redaktion-historisch/`) im Archiv. Es wurde **keine Datei gelöscht**.
Audit-Belege in `docs/04-betrieb/audit-snapshot/` bleiben vollständig
erhalten — nur die README dort wurde aktualisiert.

## 6 · Welche Links wurden aktualisiert

- `docs/README.md` — komplette Liste der aktiven Einstiegspunkte.
- `docs/ai-start-prompt.md` — Pflichtlektüre + Regel 3.
- `docs/current-status.md` — neu, kurze Form mit Verweisen.
- `.lovable/always-follow.md` — Kopfbereich, Abschnitte 4, 13, 15, 16, 17.
- `.lovable/plan.md` — Freeze-Hinweis, Verweise.
- `docs/04-betrieb/audit-snapshot/README.md` — Einstiegspunkte + aktive
  Snapshots.
- `mem://index.md` — Core + Memories synchronisiert.

## 7 · Was wurde bewusst nicht angefasst

- Keine DB-Migration, keine RPC-Änderung, kein Renderer-Code, keine
  Seiten, keine Navigation, keine i18n-JSONs, keine Inhalte.
- `docs/04-betrieb/audit-snapshot/` Inhalte (nur README neu).
- `docs/01-strategie/`, `docs/02-architektur/` — vollständig unverändert.
- `docs/lovable-custom-rules.md` und `docs/lovable-custom-rules-compact.md`
  — eigenes Regelwerk, außerhalb dieses Batches.
- `docs/mitarbeiter-fahrplan.md`, `docs/migration-log.md` — unverändert
  (Onboarding bzw. Migrationshistorie).
- Bestehende Archiv-Unterordner (`pilot-plans/`, `checkpoints/`,
  `inventories/`, `strategie-historisch/`, `architektur-historisch/`,
  `sync/`, `referenzen/`) — unverändert.

## 8 · Bestätigung

- Keine DB-Migration angelegt.
- Keine Renderer-/Code-Logik geändert.
- Keine neuen Seiten erstellt.
- Keine Navigation umgebaut.
- Keine Inhalte (CMS-Felder, Assets, i18n) geändert.
- Keine Datei gelöscht.

Nach diesem Bericht: **Stopp.** Keine Batch-28-Arbeit gestartet.
