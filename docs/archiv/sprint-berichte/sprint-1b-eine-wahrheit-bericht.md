# Sprint 1b „Eine Wahrheit" — Drift-Audit-Backbone & Reparaturplan

Stand: 2026-05-28

## Ziel

Aus den Live-Warnungen aus Sprint 0/1a ein aggregiertes, maschinen- und
menschenlesbares Drift-Audit machen. Grundlage für die kommenden
größeren Reparatur-Sprints (Seeding, Whitelist, Vertragsangleichung).

## Was wurde gebaut

### 1. Read-only Diagnose-RPC

Migration: `rpc_admin_export_contract_drift()`

- `SECURITY DEFINER`, `STABLE`, `SET search_path = public`
- Sprache SQL, **keine** dynamische SQL
- **keine** `INSERT/UPDATE/DELETE/UPSERT`
- liefert nur Strukturdaten der CMS-Light-Tabellen:
  - `cms_pages` — page_key, route_path, page_type, status, is_active
  - `cms_sections` — Hierarchie + section_type + is_active + sort_order
  - `cms_section_fields` — Schlüssel + Locale + `has_value`-Marker (keine Werte)
  - `cms_assets` — page_key/section_key/asset_role/field_key/locale/viewport/is_active
  - `cms_admin_editable_fields` — Whitelist-Einträge
- `EXECUTE` für `anon`, `authenticated`, `service_role`
  (gleiches Muster wie alle bestehenden `rpc_admin_read_*` — siehe
  `docs/02-architektur/rls-rpc-uebersicht.md`). Linter-Warnung
  „Public Can Execute SECURITY DEFINER Function" ist erwartet und
  projektweit bewusst akzeptiert, weil die Funktion read-only und
  diagnoseorientiert ist und keinerlei Inhalte/Werte/Secrets ausgibt.

Diese RPC ist **keine Backup-Funktion** — sie ist die kompakte
Strukturquelle für das Audit-Skript.

### 2. Node-Audit-Skript

`scripts/cms/contract-drift-audit.mjs` (read-only, exit 0):

- liest Vertrag aus `src/features/cms/contract/sectionTypes.ts`
  (regex-basiert, ohne TS-Compiler)
- liest Renderer-Set + `normalizeType`-Aliase aus
  `src/features/cms/components/CmsBodyRenderer.tsx`
- ruft die neue RPC über REST auf (nutzt
  `VITE_SUPABASE_PUBLISHABLE_KEY`, fällt auf `SUPABASE_SERVICE_ROLE_KEY`
  zurück, wenn vorhanden)
- meldet fehlende Env sauber und prüft den statischen Teil weiterhin
- schreibt:
  - `scripts/cms/output/contract-drift-audit-latest.json`
  - `docs/04-betrieb/contract-drift-audit-latest.md`

### 3. Drift-Klassen

| Klasse | Bedeutung |
|---|---|
| D0  | OK (keine D1/D2/D3/D8/D9-Treffer auf dieser Section) |
| D1  | `contract_missing` — section_type ohne Vertrag |
| D2  | `fields_unknown_to_contract` — DB-Feld weder Vertrag/Alias/Dynamic |
| D3  | `contract_fields_missing_in_db` — Vertragsfeld ohne DB-Zeile |
| D4  | `whitelist_unknown_to_contract` — Whitelist erlaubt Feld ohne Vertrag |
| D5  | `whitelist_missing_for_contract_field` — Vertrag erwartet Whitelist |
| D6  | `asset_slot_unknown_to_contract` — `cms_assets.field_key` nicht im Vertrag |
| D7  | `contract_asset_slot_missing` — Pflicht-Slot fehlt in DB |
| D8  | `active_without_renderer` — aktive Top-Level-Section ohne Renderer |
| D9  | `invalid_parent_child` — Vertragsverletzung (Parent/Child) |
| D10 | `i18n_or_special_owner_risk` — bewusste Spezial-/i18n-Übernahmen |

### 4. Aktuelle Zahlen (2026-05-28)

Datenstand: 118 Seiten · 1.455 Sections · 15.558 Felder · 739 Assets · 19.130 Whitelist-Zeilen.

| Klasse | Count |
|---|---:|
| D1  | 30 |
| D2  | 2.628 |
| D3  | 15.346 |
| D4  | 3.053 |
| D5  | 15.111 |
| D6  | 184 |
| D7  | 0 |
| D8  | 16 |
| D9  | 214 |
| D10 | 17 |

### 5. Top-5-Drift-Probleme

1. **D3 / D5 systemisch (≈15.000):** Vertragsfelder existieren in fast
   keiner Section als physische DB-Zeile bzw. Whitelist-Zeile. Erwartet
   — Sprint 2 ist genau dafür gedacht.
2. **D9 = 214:** Parent/Child-Verletzungen. Hauptursache sind Kinder
   unter D1-Eltern (`role_tabs_v1`, `list_v1`, `tab_v1`,
   `series_override_container_v1`), für die der Vertrag noch fehlt.
3. **D2 = 2.628:** Legacy-Feldnamen, die der Vertrag nicht kennt.
   Größter Block sind `card_v1`-Felder (Aliase und alte Pilot-Namen).
4. **D1 = 30:** vier Section-Typen ohne Vertrag —
   `list_v1`, `tab_v1`, `series_override_container_v1`, `role_tabs_v1`.
5. **D8 = 16:** aktive Top-Level-Sections ohne Renderer. Müssen einzeln
   geprüft und entweder als legacy markiert, deaktiviert oder
   umgetypt werden.

### 6. Empfohlene Reparatur-Tranchen

| Prio | Risiko | Tranche |
|---|---|---|
| P1 | mittel | Vertrag für 30 Sections ohne Vertragstyp ergänzen oder als `legacy` markieren |
| P1 | hoch | 16 aktive Top-Level-Sections ohne Renderer prüfen / deaktivieren |
| P2 | hoch | 214 Parent/Child-Verletzungen kuratieren |
| P2 | niedrig | Whitelist für ~15.000 Vertragsfelder seeden (datengetrieben, locale-aware) |
| P3 | niedrig | Fehlende Vertragsfelder als leere DB-Zeilen anlegen (Seeding) |
| P3 | mittel | 2.628 Legacy-DB-Felder auswerten — Vertrag erweitern oder stilllegen |
| P3 | mittel | 3.053 Whitelist-Einträge ohne Vertrag prüfen |
| P3 | mittel | 184 Asset-Slots außerhalb des Vertrags klären |

## Was bewusst nicht geändert wurde

- Keine Inhalte, keine Texte, keine Bilder
- Keine Whitelist verändert (`cms_admin_editable_fields` unangetastet)
- Keine Public-Renderer, keine Routen, keine Navigation, kein Footer,
  keine Breadcrumbs, keine i18n-Dateien
- Keine Schreib-RPC, keine `service_role`-Nutzung im Frontend
- Keine Produktdatenbank
- Keine automatische Reparatur — alle Tranchen sind kuratierte Folge-Sprints

## Checks

- `npm run cms:audit:contract` → **15 OK · 2 Warn · 0 Konflikt**
- `npm run cms:audit:contract-drift` → läuft, schreibt Report (siehe oben)
- `npm run build` → Harness baut automatisch; manuell nicht ausgeführt

## Admin-UI

`AdminHardeningNotice` zeigt jetzt einen kurzen Hinweis auf
`npm run cms:audit:contract-drift` und den Report-Pfad. Keine neue UI,
keine Schreibwege geändert.

## Nächste Etappe

`cms-light-eine-wahrheit-sprint-2-vertragsfelder-daten-whitelist-seeding-1`

Empfohlene Reihenfolge: zuerst P1 (D1 + D8), danach P2 (D9 + D5),
zuletzt P3.
