# Sprint „Kartenmodell Semantik — Bulletpoints und Chips trennen"

Stand 2026-06-03.

## Auftrag

Bulletpoints (Listenpunkte mit Anstrich) und Chips/Merkmale (graue Pillen)
sauber trennen. Die historischen `features.*`-Felder werden semantisch zu
Bulletpoints (so wurden sie öffentlich genutzt). Chips/Merkmale werden als
eigenes, optionales Modul `chips.*` eingeführt.

## Was gemacht wurde

### Datenmodell (Migration `20260603084046_*`)

Idempotente Backfill- und Whitelist-Migration für alle **701 aktiven
`card_v1`-Sections** in DE+EN:

- `features.0` … `features.4` → `bullets.0` … `bullets.4` kopiert, nur wo
  `bullets.N` leer/fehlt → **262 Backfill-Zeilen**.
- `features_N_enabled` → `bullets_N_enabled` (analog) → **150 Toggle-Zeilen**.
- Default-Leerzeilen für `bullets.0..4`, `bullets_N_enabled`, `chips.0..4`,
  `chips_N_enabled` für alle aktiven Karten in DE+EN.
- Whitelist (`cms_admin_editable_fields`) für alle vier neuen Modul-Familien
  freigeschaltet → **+ ≈ 28 040 Whitelist-Zeilen** (701 × 20 Felder × 2 Locales).
- `features.*` bleibt unverändert als Legacy/Fallback.
- **Konflikte: 0** — `bullets.*` war vor der Migration komplett leer.

### Renderer (canonical-first)

- `src/features/cms/lib/cardVisibility.ts`:
  - `bulletsVisible[0..4]` als kanonische Wahrheit (canonical `bullets.N`,
    Fallback `features.N`; Toggle ebenfalls canonical-first).
  - `featuresVisible` ist jetzt nur noch Alias auf `bulletsVisible`
    (Back-Compat für Konsumenten).
  - Neu: `chipsVisible[0..4]` für das Chips-Modul.
- `src/features/cms/components/sections/CardsSectionV1.tsx`:
  - Liest Bulletpoints canonical-first und rendert sie wie bisher als
    Liste mit Punkt-Anstrich.
  - Neu: rendert `chips.*` als kleine graue Pillen (`bg-muted`,
    Pille-Form) — nur wenn mindestens ein Chip aktiv ist.
- `src/features/cms/components/CmsProductSolutionShell.tsx`: liest
  Bulletpoints canonical-first.
- `ProductScrollerV1` rendert weiterhin keine Bullet-Listen — Layout sieht
  das nicht vor; keine Änderung.

### Admin-Workspace (`BildkartenCardWorkspace.tsx`)

- Bereich „Features" → ersetzt durch **„Bulletpoints"**.
  - Schreibt `bullets.N` / `bullets_N_enabled`.
  - Zeigt einen Legacy-Hinweis, wenn nur `features.N` gefüllt ist.
- Neuer Bereich **„Chips / Merkmale"**.
  - Schreibt `chips.N` / `chips_N_enabled`.
  - Hinweistext: „Wird als kleine graue Pillen ausgespielt."
- `GroupKey` erweitert um `bullets` + `chips`; alter Schlüssel `features`
  entfernt.

### Dokumentation

- Neu: `docs/04-betrieb/card-v1-bullets-und-chips-semantik.md` — Referenz
  für die Semantik, Konfliktregeln, Renderer- und Admin-Wahrheit.
- Aktualisiert: `docs/current-status.md` (Stand-Eintrag).

## Pflichtprüfungen

| Gate | Status |
|---|---|
| `node scripts/cms/wahrheits-check-ci.mjs` | ✅ OK |
| `node scripts/cms/renderer-audit.mjs --strict` | ✅ 74/80 DB-first, 80/80 asset-clean |
| `node scripts/cms/validate-no-fout.mjs` | ✅ OK |
| `node scripts/cms/contract-audit.mjs` | ✅ 15 OK · 7 Warnung · 0 Konflikt |
| `node scripts/cms/contract-drift-audit.mjs` | ✅ 0 D5/D6/D7/D8/D9, 28 vorbestehende D10 |

## RPC-Schreibtests

Erfolgreich gegen `eingangssysteme.material / card_aluminium`, Locale DE:

| Feld | Antwort |
|---|---|
| `bullets.0` = „Werkstoff AlMg1" | `success:true, updated:true` |
| `bullets_0_enabled` = „1" | `success:true, updated:true` |
| `chips.0` = "" | `success:true, updated:true` |
| `chips_0_enabled` = „1" | `success:true, updated:true` |

Keine `field_not_allowed`-Fehler mehr.

## Scope-Grenzen eingehalten

- Keine Produktdatenbank, Navigation, Footer, Breadcrumbs angefasst.
- Keine i18n-JSON gelöscht.
- Keine bestehenden Inhalte gelöscht.
- `features.*` ist unverändert vorhanden (Legacy/Fallback).
- Public-Layout der heutigen Karten unverändert — gleiche Inhalte, neue
  canonical-first Quelle.
- Keine neue RPC angelegt.

## Manuelle Test-Empfehlung für Redaktion

Mindestens diese Karten im Admin antesten:

- `eingangssysteme.material` → `card_aluminium`, `card_edelstahl`,
  `card_messing_satiniert`
- `eingangssysteme.design` → `card_tableausTerminals`,
  `card_gestaltungsbaender`
- eine `feature_grid_v1`-Karte
- eine `product_scroller_v1`-Karte
- eine Hubkarte aus `card_grid_v1` / `catalog_filter_grid_v1`

Pro Karte: Bulletpoint ändern → Reload → Public-Vorschau → Toggle aus →
Reload → Chip pflegen → Public-Vorschau → Pille erscheint.
