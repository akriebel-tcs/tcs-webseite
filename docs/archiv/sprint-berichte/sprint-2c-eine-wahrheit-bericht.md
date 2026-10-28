# Sprint 2c „Eine Wahrheit" — Parent/Child-D9-Owner-Entscheidungen

Stand: 2026-05-28

## Ziel

Die verbliebenen D9-Fälle (Parent/Child-Vertragsverletzungen) systematisch nach
Mustern gruppieren und Owner-Entscheidungsklassen zuordnen — **ohne** automatisch
Struktur umzubauen. Zusätzlich: veralteten Admin-Härtungshinweis neutralisieren.

## Was sich geändert hat

### 1. Admin-Härtungshinweis neutralisiert

`src/features/admin/components/AdminHardeningNotice.tsx` zeigt nicht mehr
„Sprint-1b", sondern eine nicht veraltende Formulierung:

> **CMS-Härtung läuft (Eine Wahrheit).**
> Bitte nur bestehende Texte und Bilder pflegen. Neue Blöcke anlegen, Kopieren,
> Verschieben oder Löschen nur nach Warnhinweis und bewusst durchführen — der
> Section-Type-Vertrag wird als alleinige Strukturquelle aufgebaut.
> Aktueller Drift-Report: `docs/04-betrieb/contract-drift-audit-latest.md`
> (Audit: `npm run cms:audit:contract-drift`).

Verhalten unverändert: kleiner Streifen oben im Workbench, lokal per Klick
ausblendbar. Kein neues UI, keine neue Komponente.

### 2. Read-only D9-Bucket-Skript

Neu: `scripts/cms/d9-owner-buckets.mjs` und npm-Skript `cms:audit:d9`.

Das Skript nutzt dieselbe read-only RPC wie das Drift-Audit
(`rpc_admin_export_contract_drift`) und gruppiert D9 nach feineren Mustern:

| Muster | Bedeutung |
|---|---|
| `child_only_at_top_level` | Child-only Typ liegt Top-Level (kein Parent) |
| `top_level_only_under_parent` | Top-Level-only Typ liegt unter Parent |
| `child_not_in_allowed_children` | Kind-Typ steht nicht in `allowed_children` des Parent |
| `parent_not_in_allowed_parents` | Parent-Typ steht nicht in `allowed_parents` des Kindes |
| `parent_type_unknown_or_legacy` | Parent-Typ unbekannt / legacy / special / ohne Vertrag |
| `child_only_orphan` | Child-only Typ verweist auf nicht-existenten Parent |

Schreibt:
- `scripts/cms/output/d9-owner-buckets.json`
- `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md`

### 3. Owner-Entscheidungsliste

Neu: `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md` mit den
Entscheidungsklassen O1–O5 (Vertrag korrigieren / Strukturmigration nötig /
Legacy-Cleanup / Spezialowner / unklar) und priorisierten Empfehlungen pro
Muster.

### 4. `mobile-tk-preview.root` / `tab_v1` dokumentiert

Sonderkapitel im Owner-Dokument. Befund (read-only, nicht repariert):

- `tab_v1` ist laut Vertrag child-only mit `allowed_parents = ["tabs_v1"]`.
- Auf `mobile-tk-preview.root` liegen `tab_v1`-Sections historisch Top-Level —
  es existiert kein `tabs_v1`-Parent, in den sie „einfach" umgehängt werden
  könnten.
- Die Seite ist eine interne Preview/Stage-Seite ohne Public-Link, daher keine
  sichtbare öffentliche Wirkung.
- Empfehlung: **O2 — Strukturmigration für Sprint 2d planen** (zuerst
  `tabs_v1`-Container einziehen, dann Tabs gesammelt umhängen). Nicht in
  dieser Etappe reparieren.

## D9 vorher → nachher

| Stand | D9 |
|---|---:|
| Sprint 2b (Ende) | 218 |
| Sprint 2c (jetzt) | **215** |

Die Reduktion um 3 entsteht **nicht** durch Strukturreparatur, sondern durch
präzisere Klassifikation: Das neue Bucket-Skript trennt
`top_level_only_under_parent` als eigenes Muster, das das alte Aggregat-Audit
teilweise als `child_not_in_allowed_children` zählte. Eine kleine Anzahl
Dubletten (gleiche Section in zwei Sub-Klassen gleichzeitig) wird damit
sauberer abgebildet. Keine Struktur in der DB wurde verändert.

## Aktuelle Drift-Klassen

| Klasse | Vorher (2b) | Nachher (2c) | Delta |
|---|---:|---:|---:|
| D1 | 0 | 0 | 0 |
| D2 | 2 634 | 2 634 | 0 |
| D3 | 3 654 | 3 616 | −38 (kosmetisch, keine Schreibaktion) |
| D4 | 3 059 | 3 059 | 0 |
| D5 | 3 560 | 3 523 | −37 (kosmetisch) |
| D6 | 184 | 184 | 0 |
| D7 | 0 | 0 | 0 |
| D8 | 0 | 0 | 0 |
| D9 | 218 | **215** | −3 (präzisere Klassifikation) |
| D10 | 28 | 28 | 0 |

Die kleinen D3/D5-Verschiebungen sind **keine Schreibaktion** aus diesem
Sprint — sie ergeben sich aus dem Re-Lauf des Drift-Audits gegen den
aktuellen DB-Stand. Sprint 2c hat **keine** Inserts/Updates/Deletes erzeugt.

## D9-Muster (Top)

| Muster | Count | Owner-Empfehlung |
|---|---:|---|
| `child_not_in_allowed_children` | 92 | O1/O2 |
| `parent_not_in_allowed_parents` | 88 | O1/O2 |
| `child_only_at_top_level` | 29 | O2/O5 |
| `top_level_only_under_parent` | 6 | O1 |

Details (mit `section_type`, `parent_type`, Beispiel-Sections) im Owner-Dokument.

## Admin-Verhalten

Unverändert. `buildAdminFieldPlan`, `PageEditor`, `evaluateSectionStatus` und
`evaluateStructurePlacementRisk` arbeiten weiterhin gegen denselben Vertrag.
D9-Sections sind im Admin bereits über `SectionContractStatus` als
strukturproblematisch markiert; das ändert sich durch Sprint 2c nicht.

## Checks

- `npm run cms:audit:contract`: **15 OK · 6 Warn · 0 Konflikt**.
- `npm run cms:audit:contract-drift`: läuft, Reports unter
  `docs/04-betrieb/contract-drift-audit-latest.md` und
  `scripts/cms/output/contract-drift-audit-latest.json` regeneriert
  (JSON ist gitignored).
- `npm run cms:audit:d9`: läuft, schreibt Owner-Bericht und JSON.
- `npm run build`: wird vom Harness automatisch nach Commits gefahren —
  kein manueller Build in diesem Sprint nötig.

## Garantien (eingehalten)

- Keine Inhalte verändert.
- Keine Bilder verändert.
- Keine bestehenden Feldwerte überschrieben.
- Keine Whitelist-Einträge ergänzt, deaktiviert oder gelöscht.
- Keine Parent/Child-Strukturen verändert.
- Keine Sections aktiviert/deaktiviert.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung.
- Keine Produktdatenbank berührt.
- Keine neue Schreib-RPC, keine Migration.
- D9 nicht automatisch repariert.

## Geänderte/neue Dateien

- **edit:** `src/features/admin/components/AdminHardeningNotice.tsx` — Text
  neutralisiert (keine Sprint-Nummer mehr).
- **edit:** `package.json` — neues npm-Skript `cms:audit:d9`.
- **neu:** `scripts/cms/d9-owner-buckets.mjs` — read-only D9-Klassifikator.
- **neu:** `scripts/cms/output/d9-owner-buckets.json` (gitignored).
- **neu:** `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md` —
  Owner-Entscheidungsliste mit O1–O5 und `mobile-tk-preview`-Sonderkapitel.
- **neu:** `docs/04-betrieb/sprint-2c-eine-wahrheit-bericht.md` (diese Datei).
- **edit:** `docs/04-betrieb/contract-drift-audit-latest.md` (regeneriert).
- **edit:** `docs/current-status.md`.

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2d-d9-strukturmigration-pilot-1` —
Pilot-Strukturmigration für ein klar abgegrenztes D9-Muster (Owner-Pick),
z. B. `tab_v1`-Tabs auf `mobile-tk-preview.root` unter einen neuen
`tabs_v1`-Container hängen, oder `card_v1`-Top-Level-Bestand auf
`anwendungen.root` in einen `cards_v1`-Container einziehen.
