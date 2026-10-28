# Sprint „Kartenmodell vereinheitlichen — card_v1 Textwahrheit konsolidieren" (2026-06-03)

## Ausgangsbefund

Disjunkte Wahrheit zwischen Admin und Public-Renderer für alle 701 aktiven `card_v1`-Karten:

- **Admin (`BildkartenCardWorkspace.tsx`)** schrieb in die Felder `eyebrow` · `headline` · `beschreibung`.
- **Public-Renderer (`CardsSectionV1`, `ProductScrollerV1`)** lasen `subtitle` · `title` · `description`.

Folge: Admin-Edits am Kicker/Titel/Beschreibung wirkten nicht auf der öffentlichen Seite. Umgekehrt war ein redaktionell sichtbarer Text aus Public im Admin oft nicht editierbar/auffindbar.

## Kanonisches Zielmodell

| Rolle | Canonical | Alias (Fallback) |
|---|---|---|
| Kicker / Eyebrow | `eyebrow` | `subtitle` |
| Titel / Headline | `title` | `headline` |
| Beschreibung | `description` | `beschreibung` |
| Bulletpoints | `features.0` … `features.4` | — |

Sichtbarkeit weiter über `eyebrow_enabled`, `image_enabled`, `icon_enabled`, `features_N_enabled`, `link_N_enabled`. Alias-Felder bleiben erhalten (nicht gelöscht), werden vom Renderer nur noch als Fallback gelesen.

## Audit vor Migration

701 aktive `card_v1`-Karten, Parent-Container:
- `cards_v1` 643 · `product_scroller_v1` 33 · `catalog_filter_grid_v1` 18 · `feature_grid_v1` 4 · `card_grid_v1` 3

Befüllung Alias vs canonical (DE+EN, pro field-Zeile):
- `subtitle → eyebrow`: 190 nur Alias · 0 Konflikte
- `headline → title`: 30 nur Alias · 0 Konflikte
- `beschreibung → description`: 30 nur Alias · 0 Konflikte
- `desc` (94 Zeilen) ist immer identisch zu `description` → kein Backfill nötig, nur Inventar.

**0 Konflikte über alle Mappings** — Migration konnte ohne manuelle Entscheidungen durchlaufen.

## Migration (`20260603081100_*`)

Idempotent, in einem `DO`-Block:

1. **Default-Zeilen** in `cms_section_fields` für `eyebrow` / `title` / `description` × DE+EN über alle 701 Karten anlegen (nur wenn fehlend).
2. **Alias → canonical kopieren** ausschließlich wenn canonical leer/NULL:
   - `subtitle → eyebrow`
   - `headline → title`
   - `beschreibung → description`
3. **Whitelist** `cms_admin_editable_fields` für die drei canonical Felder × DE+EN auf `is_enabled=true` setzen (`ON CONFLICT DO UPDATE`).

Keine `DELETE`, keine Überschreibung bestehender canonical Werte, keine Layoutänderung, keine Produktdaten betroffen.

## Coverage nach Migration

| Metrik | Wert |
|---|---|
| Aktive `card_v1`-Sections | 701 |
| `eyebrow`-Default-Zeilen (DE+EN) | 1402 / 1402 ✓ |
| `eyebrow` befüllt (DE) | 109 (14 vorhanden + 95 backfilled) |
| `title` befüllt (DE) | 692 / 701 |
| `description` befüllt (DE) | 660 / 701 |
| Whitelist `eyebrow` DE+EN | 1402 / 1402 ✓ |
| Whitelist `title` DE+EN | 1402 / 1402 ✓ |
| Whitelist `description` DE+EN | 1402 / 1402 ✓ |

## Renderer-Anpassung (canonical-first)

- `src/features/cms/components/sections/CardsSectionV1.tsx`: `title || headline`, `description || beschreibung`, `eyebrow || subtitle`.
- `src/features/cms/components/sections/ProductScrollerV1.tsx`: dieselbe Reihenfolge.
- `FeatureGridV1`, `DownloadListV1`, `StatsV1` lasen bereits ausschließlich canonical (`title` / `description`) — keine Änderung.

Container-Felder (Container-`title`, `intro`, `label`) bleiben unberührt.

## Admin-Workspace-Anpassung

`src/features/admin/components/BildkartenCardWorkspace.tsx` Konstanten (Z. 811–819):

```ts
const EYEBROW_FK = "eyebrow";     // unverändert
const TITLE_FK   = "title";       // vorher: "headline"
const DESC_FK    = "description"; // vorher: "beschreibung"
```

Damit speichert der Admin jetzt direkt in die canonical Felder, die der Renderer auch primär liest. Aliasfelder bleiben in der DB als Altbestand stehen und werden bei nächstem Mausover in der „Technik"-Gruppe sichtbar; nicht gelöscht.

## RPC-Schreibtest

`rpc_admin_update_section_field('eingangssysteme.material','card_aluminium','eyebrow','de','TEST-EYEBROW-CANON')`
→ `success=true, updated=true`, gespeicherter Wert lesbar, anschließend sauber geleert. Kein `field_not_allowed`.

## Sichtprobe Test-Karten (DE)

| Karte | eyebrow | title | description |
|---|---|---|---|
| `eingangssysteme.material/card_aluminium` | — | Aluminium | „Die Oberfläche von Aluminium k…" |
| `eingangssysteme.material/card_edelstahl` | „Geschliffen, gebürstet, poliert …" | Edelstahl | „Die Oberfläche von Edelstahl k…" |
| `eingangssysteme.material/card_messing_satiniert` | „Geschliffen, versiegelt … brüniert" | Messing satiniert | „Eine Kupferlegierung mit einem…" |
| `eingangssysteme.design/card_tableausTerminals` | „Zugeschnitten auf individuelle Bedürfnisse" | Tableaus und Terminals | „In einer Installation kann die…" |
| `eingangssysteme.design/card_gestaltungsbaender` | „Für repräsentative Eingangs- und Fassadenfunktionen" | Gestaltungsbänder | „In Gestaltungsbändern können n…" |

Alle Werte sind jetzt im Admin canonical pflegbar, der Renderer liest sie canonical-first.

## CI-Gates (alle grün)

- `wahrheits-check-ci.mjs` ✓
- `renderer-audit.mjs --strict` ✓ (74/80 DB-first, 80/80 asset-clean)
- `validate-no-fout.mjs` ✓
- `contract-audit.mjs` ✓ (15 OK · 7 Warn · 0 Konflikt)
- `contract-drift-audit.mjs` ✓ (D1–D9 = 0, D10 = 28 unverändert)

## Scope-Treue

- Keine Produktdatenbank.
- Keine Public-Routen, Navigation, Footer, Breadcrumbs.
- Keine i18n-JSON-Änderung, keine Löschungen.
- Keine neuen RPCs.
- Keine Container-Felder modifiziert.
- Keine Alias-Felder gelöscht — bleiben als Legacy in der DB.

## Geänderte Dateien

- **Migration:** `supabase/migrations/20260603081100_*.sql`
- **Renderer:** `src/features/cms/components/sections/CardsSectionV1.tsx`, `src/features/cms/components/sections/ProductScrollerV1.tsx`
- **Admin-Workspace:** `src/features/admin/components/BildkartenCardWorkspace.tsx` (3 Zeilen)
- **Doku:** `docs/04-betrieb/sprint-kartenmodell-vereinheitlichen-bericht.md` (neu), `docs/04-betrieb/card-v1-textmodell-konsolidierung.md` (neu), `docs/current-status.md` (Header aktualisiert)

## Restfälle / Folgesprints

- `desc`-Feld (94 Zeilen, identisch zu `description`) bleibt als Dublette in der DB. Saubere Bereinigung gehört in einen späteren reinen Aufräum-Sprint mit `db_dupes`-Triage.
- `text` / `body` / `intro` auf `card_v1`-Sections bewusst NICHT auto-migriert — kommen ggf. aus Container-Kontext.
- Whitelist-Erweiterung von `features.0..4` für die verbliebenen 92 Karten ohne Feature-Whitelist gehört in einen Folgesprint, falls Redaktion dort Bulletpoints pflegen will.
