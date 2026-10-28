# Hotfix: Bildkarten-Workspace Schreibfähigkeit reparieren

**Stand:** 2026-06-03
**Status:** Erledigt — alle 5 CI-Gates grün, RPC-Schreibtest erfolgreich.

## Problem

Im Admin schlug das Speichern von Sichtbarkeits-Schaltern in Standardkarten
(`card_v1`) reproduzierbar mit `field_not_allowed` fehl. Beispiel:

- Seite `eingangssysteme.material`
- Karte `card_bronze_baubronze`
- Feld `features_0_enabled`
- Fehlermeldung: „Schalter „Feature 1 sichtbar" (features_0_enabled) konnte
  nicht gespeichert werden — DE: field_not_allowed · EN: field_not_allowed"

## Root Cause

Die RPC `rpc_admin_update_section_field` erlaubt einen Schreibvorgang nur,
wenn der Feldschlüssel für die jeweilige Section in `cms_admin_editable_fields`
mit `is_enabled=true` freigeschaltet ist und die Zeile in
`cms_section_fields` bereits existiert (`UPDATE`-only).

Audit der DB (vor Hotfix):

- **701** aktive `card_v1`-Sections
- **686** davon ohne Whitelist-Eintrag für die Toggle-Felder
- **0** vorhandene Default-Zeilen in `cms_section_fields` für die Toggles

Damit war der gesamte technische Toggle-Feldsatz (`features_0..4_enabled`,
`link_1..3_enabled`, `image_enabled`, `icon_enabled`, `eyebrow_enabled`) im
Admin angezeigt, aber nicht persistierbar.

## Fix

Eine einzelne, idempotente Migration. Pro aktiver `card_v1`-Section und pro
Locale (DE/EN):

1. `cms_admin_editable_fields` für die 11 Toggle-Felder freischalten
   (`ON CONFLICT DO UPDATE SET is_enabled=true`).
2. `cms_section_fields`-Default-Zeile mit `value=''` anlegen
   (`ON CONFLICT DO NOTHING` — bestehende Werte werden nie überschrieben).

Public-Verhalten bleibt unverändert: `resolveCardVisibility` interpretiert
leere Werte mit `defaultIfBlank=true`, d. h. weiterhin „sichtbar, wenn
Inhalt vorhanden".

## Verifizierung

- Nach Hotfix: **701/701** card_v1-Sections mit Toggle-Whitelist,
  **1402** Default-Zeilen (`features_0_enabled` × DE+EN).
- RPC-Schreibtest auf `eingangssysteme.material / card_bronze_baubronze /
  features_0_enabled / de`: `success=true, updated=true`. Wert „0" gelesen,
  anschließend wieder auf "" zurückgesetzt.

## CI-Gates

Alle grün:

- `node scripts/cms/wahrheits-check-ci.mjs`
- `node scripts/cms/renderer-audit.mjs --strict`
- `node scripts/cms/validate-no-fout.mjs`
- `node scripts/cms/contract-audit.mjs` — 15 OK, 7 Warnungen, 0 Konflikte
- `node scripts/cms/contract-drift-audit.mjs` — D1–D9 = 0, D10 = 28 (unverändert)

## Scope eingehalten

- Keine Code-, Layout-, RPC-, Renderer- oder Whitelist-Logikänderung
- Keine Produktdatenbank, keine Navigation, keine i18n-JSON
- Keine pauschale Aufweichung der Whitelist — nur deklarierte `card_v1`-Toggles
- Keine sichtbare Public-Änderung
