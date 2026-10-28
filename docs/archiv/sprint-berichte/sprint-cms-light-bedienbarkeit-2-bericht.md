# Sprint „CMS-Light Bedienbarkeit 2 — Hero, Wechselteaser, Content schreibfähig verifizieren"

Datum: 2026-06-03
Status: ✅ abgeschlossen

## Ziel

Die mit „Bedienbarkeit 1" neu eingeführten Workspaces für `hero_v1`,
`teaser_2col_v1` und `content_v1` mussten nicht nur angezeigt, sondern
wirklich speicherbar sein. Es gab analog zum `card_v1`-Hotfix den
Verdacht, dass die Whitelist (`cms_admin_editable_fields`) und die
Default-Zeilen (`cms_section_fields`) für viele aktive Sections fehlen
und Speichern deshalb `field_not_allowed` liefert.

## Befund (vor Migration)

Aktive Sections der Zieltypen:

| Typ              | Aktive Sections |
|------------------|-----------------|
| `hero_v1`        | 92              |
| `teaser_2col_v1` | 67              |
| `content_v1`     | 223             |

Coverage der vom Workspace gepflegten Felder (DE + EN):

- `teaser_2col_v1` — **vollständig** (alle 7 Felder × 67 Sections × 2 Locales).
- `content_v1` — Lücken bei `label` (10 Sections fehlen), `title` (12), `text` (73).
- `hero_v1` — gravierende Lücken:
  - `cta_label` / `cta_href` — 0/92 Sections (komplett fehlend).
  - `subheadline` — 90/92 Sections fehlend.
  - `subline` — 73/92 Sections fehlend.
  - `eyebrow` — 63/92 fehlend.
  - `headline` — 20/92 fehlend.

Praktische Folge: Im Admin-Hero-Workspace konnten Eyebrow/Subline/Headline
auf den meisten Seiten nicht gespeichert werden, und CTA-Felder waren
für alle Hero-Sections unspeicherbar. Genau das Bild wie beim
`card_v1`-Hotfix vorher.

## Fix

Eine idempotente Migration (`20260603075230_*`) trägt für **alle aktiven
Sections der drei Typen** ein:

1. Whitelist-Einträge in `cms_admin_editable_fields` für die vom
   Workspace gepflegten Felder × DE + EN, mit `is_enabled = true`
   (`ON CONFLICT … DO UPDATE`).
2. Default-Zeilen in `cms_section_fields` mit `value = ''`
   (`ON CONFLICT … DO NOTHING`), nur dort, wo noch keine Zeile existiert.
   Bestehende Werte bleiben unverändert.

Feldlisten pro Typ (genau die Felder, die der jeweilige Renderer liest
bzw. die der Workspace bewusst als „nicht gerendert" sichtbar macht):

- `hero_v1` (6): `eyebrow`, `headline`, `subheadline`, `subline`,
  `cta_label`, `cta_href`. `cta_label`/`cta_href` bleiben im Workspace
  als „nicht gerendert" markiert (`CmsPageLayout` rendert heute keinen
  Hero-Button) — sie sind aber jetzt speicherbar, sobald ein
  Hero-Renderer mit Button nachgezogen wird.
- `teaser_2col_v1` (7): `label`, `title`, `text`, `cta_label`,
  `cta_link`, `image_position`, `background_variant`.
- `content_v1` (3): `label`, `title`, `text`.

Keine Asset-Slots in dieser Migration — Bilder laufen weiterhin über
`SectionAssetsBlock` / `cms_assets`, das war nie das Problem.

## Coverage nach Migration

| Typ              | Sections | Whitelist `is_enabled` | DB-Default-Zeilen |
|------------------|----------|------------------------|-------------------|
| `hero_v1`        | 92       | 1104 (= 92 × 6 × 2) ✓  | 1104 ✓            |
| `teaser_2col_v1` | 67       | 938  (= 67 × 7 × 2) ✓  | 938 ✓             |
| `content_v1`     | 223      | 1338 (= 223 × 3 × 2) ✓ | 1338 ✓            |

Vollständig grün, ohne Lücken.

## RPC-Schreibtests

Direkt gegen `rpc_admin_update_section_field` getestet — beide vorher
„unspeicherbaren" Fälle gehen jetzt:

- `home.start / hero / cta_label / de` → `success=true, updated=true`,
  Wert liest sich als `TEST_SPRINT2`, danach wieder auf `""` gesetzt.
- `zutrittskontrolle.mobiler-zutritt / submenu / label / en` →
  `success=true, updated=true`, danach geleert.

Kein `field_not_allowed` mehr in den drei Workspaces.

## Public-Verhalten

Unverändert. Begründung:

- Default-Zeilen mit `value = ''` werden von den Renderern als „leer"
  behandelt und greifen auf den bestehenden Code-Fallback (i18n / Props)
  zurück (`f()`-Helper liefert `""`, `Teaser2ColV1` rendert dann den
  Default für `image_position`/`background_variant` wie zuvor).
- Bestehende, gefüllte Werte wurden nicht angefasst (`DO NOTHING`).
- Hero-CTA-Felder wirken weiterhin nicht öffentlich, weil
  `CmsPageLayout` sie nicht liest — entsprechend bleibt das Badge
  „nicht gerendert" im Workspace.

## Bewusst nicht angefasst

- Produktdatenbank, Routen, Navigation, Footer, Breadcrumbs.
- i18n-JSON.
- RPCs (keine neue, keine geänderte Signatur).
- Workspace-Code (`StandardBausteinWorkspace.tsx`,
  `sectionWorkspaceGroups.ts`) — die Anzeige war korrekt, nur die
  Daten-Basis fehlte.
- Andere Section-Typen (`cards_v1`, `product_scroller_v1`, …) — Scope
  bleibt eng auf Hero/Teaser/Content.

## Pflichtprüfungen am Ende

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅
- `node scripts/cms/renderer-audit.mjs --strict` → ✅ (74/80 DB-first,
  80/80 asset-clean, 6 dokumentierte Ausnahmen).
- `node scripts/cms/validate-no-fout.mjs` → ✅
- `node scripts/cms/contract-audit.mjs` → ✅ (15 OK, 7 Warn, 0 Konflikt).
- `node scripts/cms/contract-drift-audit.mjs` → ✅ (D1–D9 = 0, D10 = 28
  unverändert).

Keine neue Drift.
