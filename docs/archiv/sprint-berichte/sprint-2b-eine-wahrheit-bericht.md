# Sprint 2b „Eine Wahrheit" — Vertragsfelder & Whitelist-Seeding

Stand: 2026-05-28

## Ziel

D3 (`contract_fields_missing_in_db`) und D5 (`whitelist_missing_for_contract_field`) für sichere Vertragstypen reduzieren — kontrolliert, idempotent, ohne Inhalte zu erfinden und ohne Public-Wirkung.

## Vorgehen

1. **Dry-Run** mit `scripts/cms/sprint-2b-seed-plan.mjs` (read-only, nutzt `rpc_admin_export_contract_drift`).
2. Generierte SQL-Datei `scripts/cms/output/sprint-2b-seed.sql` (`ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING`) idempotent angewendet.
3. Audits `cms:audit:contract` und `cms:audit:contract-drift` nachgefahren.

Schreibwege: nur `INSERT` mit ON CONFLICT — kein `UPDATE`, kein `DELETE`. Keine neue RPC. Keine Schema-Änderung.

## Scope-Regeln (umgesetzt)

- Nur Section-Typen aus der Sicherheits-Liste:
  `content_v1`, `cards_v1`, `card_v1`, `feature_grid_v1`, `teaser_2col_v1`, `faq_v1`, `cta_v1`, `rich_v1`, `tabs_v1`, `tab_v1`, `stats_v1`, `stat_v1`, `contact_block_v1`, `download_list_v1`, `product_scroller_v1`.
- Nur `text_fields` mit `admin: true`.
- Asset-Slots (`image`, `thumbnail`, `icon_image`, `background`) bleiben in `cms_assets` — keine Seed-Zeilen in `cms_section_fields`.
- `technical_fields`/Toggles **nicht** geseedet (zu unsicher, nicht aus DB-Mustern abgeleitet — bleibt für späteren Sprint).
- Locale-Aufteilung: `de-en` → `de` + `en`, `de-only` → nur `de`.
- Alias-Regel: wenn ein Alias-Feld (z. B. `headline` statt `title`) bereits in DB oder Whitelist existiert, wird der kanonische Name **nicht** zusätzlich geseedet (zählt im Report als „durch Alias abgedeckt"). Keine Migration Alias → kanonisch.
- Übersprungen: archived/inactive Pages, inactive Sections, jede Section mit D9-Strukturproblem, unsichere/legacy/special Typen.

## Dry-Run-Zahlen

| Klasse | Wert |
|---|---:|
| Geplante `cms_section_fields`-Inserts | **23 387** |
| Geplante `cms_admin_editable_fields`-Inserts | **23 105** |
| Übersprungen: Page archived | 24 |
| Übersprungen: Section inactive | 111 |
| Übersprungen: Typ unsicher (legacy/special/etc.) | 150 |
| Übersprungen: D9 Parent/Child-Verletzung | 101 |
| Alias deckt cms_section_fields ab | 226 |
| Alias deckt Whitelist ab | 226 |

Detaillierter Bericht: `docs/04-betrieb/sprint-2b-seed-plan.md`.

## Tatsächlich angelegt

| Tabelle | Vorher | Nachher | Δ |
|---|---:|---:|---:|
| `cms_section_fields` | 15 558 | 38 945 | **+23 387** |
| `cms_admin_editable_fields` | 19 130 | 42 235 | **+23 105** |

Keine bestehenden Werte wurden überschrieben (alle Zeilen kamen aus `NOT EXISTS`-Pfad bzw. fielen unter `ON CONFLICT DO NOTHING`).

## Drift-Audit vorher → nachher

| Klasse | Vorher | Nachher | Bemerkung |
|---|---:|---:|---|
| D1 contract_missing | 0 | **0** | stabil |
| D2 fields_unknown_to_contract | 2 634 | 2 634 | nicht Ziel von 2b |
| D3 contract_fields_missing_in_db | 15 346 | **3 654** | **−76 %** |
| D4 whitelist_unknown_to_contract | 3 059 | 3 059 | nicht Ziel von 2b |
| D5 whitelist_missing_for_contract_field | 15 111 | **3 560** | **−76 %** |
| D6 asset_slot_unknown_to_contract | 184 | 184 | unverändert |
| D7 contract_asset_slot_missing | 0 | 0 | stabil |
| D8 active_without_renderer | 0 | **0** | stabil |
| D9 invalid_parent_child | 218 | **218** | bewusst unverändert |
| D10 i18n_or_special_owner_risk | 28 | 28 | unverändert |

Verbleibende D3/D5 entfallen auf unsichere Typen (special/legacy) und auf D9-Sections, die bewusst nicht geseedet wurden — Owner-Entscheidung in Sprint 2c.

## Warum D9 nicht automatisch repariert wird

D9-Fälle sind strukturelle Vertragsverletzungen (child-only Typ als Top-Level, oder Kind in falschem Container). Ihre Reparatur verändert Parent/Child-Strukturen, was Public-Renderer-Verhalten beeinflussen kann (z. B. `tab_v1` auf `mobile-tk-preview.root`). Sprint 2b legt für diese Sections bewusst **keine Vertragsfelder** an, damit kein neuer Pflegeplatz entsteht, der später wieder umgehängt werden müsste.

## Warum Alias-Felder nicht automatisch migriert werden

Der Vertrag kennt Aliase (z. B. `card_v1.title` ↔ `headline`, `card_v1.subtitle` ↔ `eyebrow`). Wenn ein Alias bereits Werte trägt, würde ein zusätzlicher kanonischer Eintrag entweder als leeres Doppelfeld erscheinen (verwirrend) oder müsste den Aliaswert übernehmen (verändert Inhalt — gegen die Regeln). Beides ist Owner-Entscheidung und passt zu Sprint 2c/2d.

## Admin-Verhalten

`buildAdminFieldPlanForSection` und `PageEditor` lesen `cms_section_fields` direkt — die neuen leeren Zeilen erscheinen jetzt als reguläre Vertragsfelder mit grünem „Vertrag"-Badge und (dank gleichzeitiger Whitelist-Zeile) als speicherbar. Alias-Felder bleiben mit „Alias"-Badge. Legacy-Felder ohne Vertrag bleiben mit „Legacy / nicht im Vertrag" markiert. Asset-Slots bleiben unverändert im AssetUploader.

## Checks

- `npm run cms:audit:contract`: **15 OK · 6 Warn · 0 Konflikt** (Warnungen sind erwartet für SPECIAL-Typen ohne generischen Renderer).
- `npm run cms:audit:contract-drift`: läuft, Reports unter `docs/04-betrieb/contract-drift-audit-latest.md` und `scripts/cms/output/contract-drift-audit-latest.json` aktualisiert.
- `npm run build`: nicht manuell ausgeführt — wird vom Harness automatisch nach jedem Commit gefahren. Keine TS-Codeänderungen in diesem Sprint, nur ein neues Skript + Doku.

## Garantien (eingehalten)

- Keine bestehenden Inhalte verändert.
- Keine Bilder verändert.
- Keine bestehenden Feldwerte überschrieben.
- Keine Whitelist-Einträge deaktiviert oder gelöscht.
- Keine Parent/Child-Strukturen verändert.
- Keine Sections aktiviert/deaktiviert.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung.
- Keine Produktdatenbank berührt.
- Keine neue Schreib-RPC.
- D9 nicht automatisch repariert.

## Geänderte/neue Dateien

- **neu:** `scripts/cms/sprint-2b-seed-plan.mjs`
- **neu:** `scripts/cms/output/sprint-2b-seed-plan.json` (Dry-Run-Daten)
- **neu:** `scripts/cms/output/sprint-2b-seed.sql` (idempotente Insert-Anweisungen, 3,7 MB)
- **neu:** `docs/04-betrieb/sprint-2b-seed-plan.md` (Dry-Run-Bericht)
- **neu:** `docs/04-betrieb/sprint-2b-eine-wahrheit-bericht.md` (dieses Dokument)
- **aktualisiert:** `docs/current-status.md`
- **aktualisiert:** `docs/04-betrieb/contract-drift-audit-latest.md` und `scripts/cms/output/contract-drift-audit-latest.json` (regeneriert)

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2c-parent-child-d9-owner-entscheidungen-1` — 218 D9-Fälle (insbesondere historische `tab_v1` auf `mobile-tk-preview.root`) als Owner-Entscheidung kuratieren, ggf. umhängen oder als „bewusste Spezialfälle" im Vertrag markieren.
