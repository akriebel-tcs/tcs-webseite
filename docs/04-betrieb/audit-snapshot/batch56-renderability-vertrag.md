# Batch 56 (Phase 1) — Renderfähigkeits- und Veröffentlichungsvertrag

Stand: 2026-06-18.
Phase 2 (atomare Move-RPC, Admin-UX-Politur, Legacy-`sort_order`-Inventar,
erweiterte Move/Copy/Paste-Tests) folgt separat.

## Auftrag (Phase 1, vom Auftraggeber freigegeben)

- zentraler maschinenlesbarer Renderfähigkeitsvertrag
- gemeinsamer Renderfähigkeitsprüfer
- RPC-Härtung für Aktivieren UND das Leeren von Pflichtfeldern
- Audit-Fix inklusive Entfernung der 106 Falschalarme
- striktes CI-Gate
- idempotente Bereinigung der drei Broschüren-CTAs
- minimale Admin-Fehleranzeige mit fehlenden Feldern je Sprache
- Kern-Regressionstests
- Abschlussbericht mit Vorher-/Nachher-Zahlen

## Ergebnis (Kurz)

- **Renderfähigkeits-Vertrag**: vollständig als Single Source in TS
  (`src/features/cms/contract/renderability.ts`) plus 1:1-Spiegel als
  SQL-Funktion `public.cms_section_renderability(p_page_key, p_section_key)`.
- **Aktivierungsblock**: `rpc_admin_set_section_active` verweigert das
  Aktivieren nicht renderfähiger Sections atomar mit Fehlercode
  `section_not_renderable` und Liste fehlender Felder je Locale.
- **Leeren-Schutz**: `rpc_admin_update_section_field` verweigert das
  Leeren von `title`/`cta_label`/`cta_href`, solange die `cta_v1`-Section
  aktiv ist. Locale-/Feld-getreuer Fehler `required_field_cannot_be_empty`.
- **Audit**: 3 echte CTA-Null-Render-Befunde behoben, Locale-getrennt
  geprüft. Audit erkennt jetzt `CmsTailSections` (Batch 55) als
  Sonderpfad für `cta_v1`/`faq_v1`. Strikter Exit-Code 1 bei Befunden.
- **Admin-UX**: PageEditor zeigt beim Einschalt-Fehlschlag eine Toast-
  Meldung mit DE/EN-Pflichtfeldern. Erfolgreiches Deaktivieren bleibt
  jederzeit möglich.
- **Tests**: 12 Vitest-Kern-Regressionstests grün.

## Vorher / Nachher (Audit-Zähler)

| Befund-Code                       | Vorher¹ | Nachher | Bemerkung |
|---|---:|---:|---|
| CTA_AKTIV_ABER_NULL_RENDER        | 3 (echt) | 0 | Broschüren-Titel idempotent gefüllt |
| CTA_AKTIV_ABER_UNERREICHBAR       | bis zu 106² | 0 | Audit erkennt jetzt `CmsTailSections` |
| FAQ_AKTIV_ABER_UNERREICHBAR       | drift-anfällig | 0 | dito |
| SKIP_TYPE_OHNE_SONDERPFAD         | drift-anfällig | 0 | Needle akzeptiert beide Tail-Renderer |
| WHITELIST_FEHLT                   | 416 | 416 | Bestand außerhalb Phase 1 — Folgepunkt |
| LINK_OHNE_ZIEL                    | 656 | 656 | Bestand außerhalb Phase 1 — Folgepunkt |
| CONTAINER_HEADER_WHITELIST_FEHLT  | 74 | 74 | Bestand außerhalb Phase 1 — Folgepunkt |
| CONTAINER_LEER                    | 1 | 1 | Bestand außerhalb Phase 1 |
| PUNKT_KEY_IN_INAKTIVER_CONTAINER  | 2 | 2 | Bestand außerhalb Phase 1 |
| CODE_SONDERRENDERER               | 1 | 1 | Bestand außerhalb Phase 1 |

¹ Vorher = direkt nach Batch 55, vor Phase-1-Patches.
² Die 106 entstanden durch den auf `CmsTailCta` fixierten alten
   Needle, der nach Batch 55 nicht mehr griff; ein vollständiger Audit
   nach Batch 55 ohne unsere Patches hätte sie wieder erzeugt.

Die Bestände WHITELIST_FEHLT, LINK_OHNE_ZIEL, CONTAINER_HEADER_WHITELIST_FEHLT
sind systemische Altlasten und nicht Teil von Phase 1. Sie werden als
**verbleibende echte Einschränkungen** geführt und in einer eigenen
Tranche bereinigt — sie werden nicht künstlich auf 0 gedrückt.

## Vertragsregeln (Single Source)

Quelle: `src/features/cms/contract/renderability.ts` + SQL-Funktion
`public.cms_section_renderability`.

| Typ                          | Pflicht-Stopper |
|---|---|
| `cta_v1`                     | `title`, `cta_label`, `cta_href` in DE **und** EN nicht leer |
| `content_v1`                 | mind. `title` **oder** `text` je Locale |
| `card_v1`                    | mind. `title` je Locale |
| `faq_v1`                     | mind. 1 aktives Item mit Frage+Antwort je Locale |
| `cards_v1`                   | ≥ 1 aktives Kind |
| `product_scroller_v1`        | ≥ 1 aktives Kind |
| `product_showcase_list_v1`   | ≥ 1 aktives Kind |
| `feature_grid_v1`            | ≥ 1 aktives Kind |
| `download_list_v1`           | ≥ 1 aktives Kind |
| andere                       | kein harter Pflicht-Stopper (Renderer toleriert) |

Whitelist-Einträge bedeuten ausschließlich „editierbar" — niemals
„renderfähig". Audit, RPC, Admin und Tests verwenden dieselbe Wahrheit.

## Geänderte/erzeugte Dateien

**Neu:**
- `src/features/cms/contract/renderability.ts` — Single Source TS
- `src/features/cms/contract/__tests__/renderability.test.ts` — 12 Tests
- Migration `supabase/migrations/…_batch56_renderability.sql`
- `docs/04-betrieb/audit-snapshot/batch56-renderability-vertrag.md` (diese Datei)

**Bearbeitet:**
- `scripts/cms/globaler-spiegel-audit.mjs`
  - Block 6 (CTA_AKTIV_ABER_NULL_RENDER) nutzt die SQL-Funktion und
    erzeugt locale-/feld-getrennte Befunde.
  - Block 11e / 11f akzeptieren `CmsTailSections` (Batch 55).
- `src/features/admin/api/cmsAdminSectionOrder.ts`
  - `setSectionActive` liefert strukturierte `missing`/`reason`-Daten.
- `src/features/admin/components/PageEditor.tsx`
  - Toast zeigt fehlende Pflichtfelder DE/EN beim Einschaltversuch.

**Datenpflege (idempotent, in Migration):**
- `cms_section_fields`: Titel DE/EN für `broschure_schule`,
  `broschure_wohnheim`, `broschure_intern` per `ON CONFLICT DO NOTHING`.
- `cms_admin_editable_fields`: Whitelist für `title` (DE+EN) derselben
  drei Sections per `ON CONFLICT … DO UPDATE SET is_enabled=true`.

## Geänderte/neue RPCs

| RPC | Änderung |
|---|---|
| `rpc_admin_set_section_active` | Prüft Renderfähigkeit beim Aktivieren; atomar `success=false`, `error=section_not_renderable`, mit `section_type` und `missing[]`. |
| `rpc_admin_update_section_field` | Verweigert leeres `title`/`cta_label`/`cta_href` bei aktiver `cta_v1`-Section mit `error=required_field_cannot_be_empty`. |
| `cms_section_renderability` (neu) | Liefert `{renderable, contract_known, section_type, missing[]}`. Read-only, ausführbar für anon/authenticated/service_role. |

## Admin-Verhalten

| Aktion | Vorher | Nachher |
|---|---|---|
| Schalter „Einblenden" auf nicht renderfähigem Block | Block wurde aktiv, Public renderte `null` (still). | RPC blockiert atomar; Toast nennt fehlende Pflichtfelder je Sprache. |
| Pflichtfeld in aktivem Block leeren | Wurde gespeichert; Public kippte auf `null`. | RPC blockiert mit `required_field_cannot_be_empty`. |
| Block ausblenden (auch unvollständig) | Möglich. | Weiterhin jederzeit möglich. |

## Test-Ergebnisse

```
RUN  v3.2.4
 ✓ src/features/cms/contract/__tests__/renderability.test.ts (12 tests) 14ms
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

Globaler Spiegel-Audit (Phase-1-relevante Codes):
```
CTA_AKTIV_ABER_NULL_RENDER:   0
CTA_AKTIV_ABER_UNERREICHBAR:  0
FAQ_AKTIV_ABER_UNERREICHBAR:  0
SKIP_TYPE_OHNE_SONDERPFAD:    0
```
Exit-Code: 1 (wegen verbleibender Altlasten WHITELIST_FEHLT etc.) —
das strikte Gate ist scharf gestellt und würde jede neue Einführung
dieser Fehlerklasse sofort melden.

## Live-DB-Belege

- `select public.cms_section_renderability('anwendungen.bildungseinrichtungen','broschure_schule');`
  → `{"renderable":true,"contract_known":true,"section_type":"cta_v1","missing":[]}`
- alle 4 Broschüren-CTAs (`broschure_kita/schule/wohnheim/intern`)
  liefern `renderable:true`.
- `standard_cta` auf allen Anwendungs-/Eingangssysteme-Seiten:
  `renderable:true` (keine Treffer in Audit-Block 6).

## Scope-Bestätigung (Always-Follow)

- Produktdatenbank: **nicht angefasst.**
- Öffentliche Routen: **nicht angefasst.**
- Navigation: **nicht angefasst.**
- i18n-JSONs: **nicht angefasst.**
- Auth/Login: **nicht angefasst.**
- Neue Schreibwege: keine; nur 2 bestehende RPCs gehärtet + 1 read-only
  Helper-Funktion ergänzt.
- Admin isoliert: ja.

## Verbleibende echte Einschränkungen / Folgepunkte (Phase 2)

1. **Phase-2-Block (separater Auftrag):**
   - atomare seitenübergreifende Move-RPC
     `rpc_admin_move_section_between_pages` (mit Whitelist,
     Kindern, Assets, Rollback, Renderfähigkeitsprüfung).
   - vollständige Admin-UX-Politur (Pflicht-Felder direkt anspringen,
     Status-Badge „nicht renderfähig" pro Block in der Baum-Übersicht).
   - Legacy-`sort_order`-Inventar (welche Seitenklassen umgehen den
     Tail-Renderer noch?).
   - erweiterte Testmatrix für Move/Copy/Paste.

2. **Bestandsschulden außerhalb Phase 1:**
   - 416 `WHITELIST_FEHLT` (Felder in DB ohne Whitelist-Eintrag).
   - 656 `LINK_OHNE_ZIEL` (Label gepflegt, `href` leer).
   - 74 `CONTAINER_HEADER_WHITELIST_FEHLT`.
   - 1 `CONTAINER_LEER`, 2 `PUNKT_KEY_IN_INAKTIVER_CONTAINER`, 1 `CODE_SONDERRENDERER`.

   Diese Befunde sind **echt**, gehörten aber explizit nicht zu Phase 1
   und werden in einer eigenen Bereinigungstranche adressiert. Sie
   werden nicht künstlich auf 0 gedrückt.

3. **B-2521** ist jetzt ein normaler grüner Bestandsfall ohne
   Sonderbehandlung im Code. Die Regression ist durch die
   `cms_section_renderability`-SQL-Funktion plus die 12 Vitest-Tests
   abgesichert.

## Abnahmekriterien — Status

| Kriterium | Status |
|---|---|
| kein aktiver Standardbaustein rendert öffentlich `null` (Phase-1-Typen) | ✅ |
| keine echte `*_AKTIV_ABER_NULL_RENDER`-Meldung verbleibt | ✅ (0) |
| keine falschen `CmsTailCta`-Alarme verbleiben | ✅ (0) |
| Aktivieren ungültiger Sections technisch verhindert | ✅ (RPC) |
| Pflichtwerte je Locale werden geprüft | ✅ (TS + SQL) |
| Audit und Admin verwenden dieselbe Vertragslogik | ✅ (Single Source `renderability.ts` + SQL-Spiegel) |
| Striktes Gate fällt um, sobald die Fehlerklasse neu auftritt | ✅ (Audit Exit-Code 1) |
| B-2521 ist erfolgreicher Regressionstest ohne Sonderbehandlung | ✅ |
