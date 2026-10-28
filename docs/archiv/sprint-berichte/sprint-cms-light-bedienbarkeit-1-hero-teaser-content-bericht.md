# Sprint „CMS-Light Bedienbarkeit 1 — Hero, Wechselteaser, Content" — Bericht

Stand: 2026-06-03

## Ziel
Hero, Wechselteaser und Content im Admin redaktionell sauber pflegbar machen
— mit sichtbarer Wirksamkeit pro Feld („wirkt öffentlich" · „optional" ·
„Fallback/Legacy" · „nicht gerendert").

## Geliefert

### Neue Bibliothek
- `src/features/admin/lib/sectionWorkspaceGroups.ts`
  - Kuratierte Workspace-Konfiguration für `hero_v1`, `teaser_2col_v1`, `content_v1`
  - Quellen-Abgleich gegen `sectionTypes.ts` + Renderer-Code
    (`CmsPageLayout`, `Teaser2ColV1`, `ContentSectionV1`)
  - Pro Feld: deutsches Klartext-Label + Hint, `role`, `expectation`,
    `rendererNote`; für Enum-Felder zusätzlich `enumOptions`
    (`image_position`, `background_variant`)

### Neue Komponente
- `src/features/admin/components/StandardBausteinWorkspace.tsx`
  - Einheitlicher Workspace für die drei Section-Typen
  - Akkordeon-Gruppen (Kopf / Inhalt / Link / Technik)
  - Pro Feld: Wirksamkeits-Badge, DE/EN-Freigabeschalter, DE/EN-`EditableField`,
    Renderer-Hint im Debug-Modus
  - Asset-Slot wird über bestehenden `SectionAssetsBlock`-`ReactNode` eingerahmt
  - Legacy-Felder (in DB, nicht im Workspace) werden in eigener
    Diagnose-Box sichtbar gehalten, nicht versteckt
  - Schreibweg unverändert: nur `EditableField` →
    `rpc_admin_update_section_field`. Keine neue RPC, kein direkter
    Tabellenzugriff.

### PageEditor-Integration
- `src/features/admin/components/PageEditor.tsx`:
  - Import + Branch direkt nach dem `card_v1`-Workspace-Block
  - Doppelausgabe des Asset-Blocks am Ende der Section unterdrückt
  - Restliches Verhalten (flacher Plan-Renderer für alle anderen
    Section-Typen) unverändert

## Wirksamkeits-Logik

| Lage des Feldes                                     | Badge                          |
|-----------------------------------------------------|--------------------------------|
| Im Vertrag + im Renderer-Read + Wert in DB          | „wirkt öffentlich" (grün)      |
| Im Vertrag + im Renderer-Read, aber DB leer         | „leer · wirkt sobald gefüllt" (amber) |
| Im Vertrag + Renderer-Read, aber bewusst optional   | „optional" (sky)               |
| Im Vertrag, vom Renderer nicht gelesen              | „nicht gerendert" (rot)        |
| In DB, aber nicht im Workspace-Modell               | „Altbestand" (Diagnose-Box)    |

Konkret heißt das für die drei Bausteine:
- **hero_v1** — `eyebrow`, `headline`, `subheadline`, `subline` sind
  Renderer-Reads. `cta_label` / `cta_href` sind im Vertrag, werden aber
  vom Standard-Hero in `CmsPageLayout` nicht gerendert → klar als
  „nicht gerendert" markiert. Pflege bleibt möglich.
- **teaser_2col_v1** — `label`, `title`, `text`, `cta_label`, `cta_link`,
  `image_position`, `background_variant`, Asset `image` sind alle
  Renderer-Reads. `cta_link` (NICHT `cta_href`) wird im Hint
  ausdrücklich genannt.
- **content_v1** — schlank: `label`, `title`, `text`. Kein CTA, kein Bild.
  Aliase `body`/`intro` für `text` sind im Vertrag erlaubt, kanonisch
  bleibt `text`.

## Pflichtprüfungen

| Gate                                              | Status |
|---------------------------------------------------|--------|
| `node scripts/cms/wahrheits-check-ci.mjs`         | OK     |
| `node scripts/cms/renderer-audit.mjs --strict`    | OK     |
| `node scripts/cms/validate-no-fout.mjs`           | OK     |
| `node scripts/cms/contract-audit.mjs`             | OK     |
| `node scripts/cms/contract-drift-audit.mjs`       | 15 OK · 7 Warnung · 0 Konflikt (unverändert) |

## D10-Gruppe A — Status (read-only Befund)

- `cards_v1`, `product_scroller_v1`, `feature_grid_v1` Vertrag listet
  bereits `label`, `title`, `intro` am Container.
- `sectionTypes.ts` enthält dokumentierte `known_conflicts` /
  `known_specials` (P055 Header aus i18n; Türsprechanlagen-Spezial).
- In diesem Sprint wurde **nicht** an den Container-Renderern geschraubt
  (Public bleibt unverändert).
- **Nächster Sprint „Text-Whitelist je section_type":**
  - Für `cards_v1`-Container Header durchgängig DB-first ziehen (P055).
  - `product_scroller_v1`-Spezial-Renderer (Türsprechanlagen) auf
    DB-Header umstellen oder bewusst als Ausnahme markieren.

## Scope-Bestätigung

| Bereich                                    | Geändert? |
|--------------------------------------------|-----------|
| Produktdatenbank / `src/lib/supabase/client.ts` | nein |
| Öffentliche Routen (`src/app/routes.tsx`)       | nein |
| Navigation / Footer / MetaNav / PersonaNav      | nein |
| i18n-JSONs inhaltlich                           | nein |
| Renderer in `src/features/cms/components/sections/*` | nein |
| RPCs (neue oder geänderte)                      | nein |
| Migrationen                                     | keine |

## Geänderte Dateien

Neu:
- `src/features/admin/lib/sectionWorkspaceGroups.ts`
- `src/features/admin/components/StandardBausteinWorkspace.tsx`
- `docs/04-betrieb/sprint-cms-light-bedienbarkeit-1-hero-teaser-content-bericht.md`

Geändert (klein):
- `src/features/admin/components/PageEditor.tsx` (Import + 2 Branches)
- `docs/current-status.md` (Stand + Workspace-Zahlen)
