# `card_v1`-Textmodell — Konsolidierung (Referenz)

Stand 2026-06-03 nach Sprint „Kartenmodell vereinheitlichen".

## Kanonische Felder

Alle 701 aktiven `card_v1`-Standardkarten benutzen ein einheitliches Textmodell. Admin schreibt direkt in diese Felder, Public-Renderer lesen sie canonical-first.

| Rolle | Field-Key | Sichtbarkeits-Toggle | Pflichtgrad |
|---|---|---|---|
| Kicker / Eyebrow (kleine Zeile über dem Titel) | `eyebrow` | `eyebrow_enabled` (1/0) | optional |
| Titel / Headline | `title` | — | empfohlen, je nach Container Pflicht |
| Beschreibung / Fließtext | `description` | — | optional bis empfohlen |
| Bulletpoint 1–5 | `features.0` … `features.4` | `features_0_enabled` … `features_4_enabled` (1/0) | optional |

Zusätzlich je nach Variante: `image`, `thumbnail`, `icon_image`, `icon`, `cta_label`/`cta_href`, `href`, `link_1..3_*` mit `link_N_enabled` und `link_N_kind`.

## Alias-/Legacy-Felder (nur noch Fallback)

Diese Felder bleiben in der DB stehen (Altbestand, nicht löschen) und werden von den Renderern ausschließlich als Fallback gelesen:

| Alias | Canonical | Renderer-Fallback aktiv in |
|---|---|---|
| `subtitle` | `eyebrow` | `CardsSectionV1`, `ProductScrollerV1` |
| `headline` | `title` | `CardsSectionV1`, `ProductScrollerV1` |
| `beschreibung` | `description` | `CardsSectionV1`, `ProductScrollerV1` |
| `desc` | `description` | kein Renderer-Fallback (war Dublette, identisch zu `description`) |

## Konfliktregeln (für künftige Migrationen)

| Fall | canonical | alias | Aktion |
|---|---|---|---|
| A | leer | gefüllt | Alias → canonical kopieren |
| B | gefüllt | leer | nichts ändern |
| C | gefüllt | gefüllt, gleich | nichts ändern |
| D | gefüllt | gefüllt, ungleich | nicht überschreiben, Konflikt protokollieren |

Im Sprint 2026-06-03 traten **0 Konflikte** auf — alle 250 Backfills waren Fall A.

## Renderer-Lesepfade (canonical-first)

```ts
// CardsSectionV1, ProductScrollerV1
const cardTitle    = cf(ctx, key, "title")       || cf(ctx, key, "headline");
const cardDesc     = cf(ctx, key, "description") || cf(ctx, key, "beschreibung");
const cardSubtitle = cf(ctx, key, "eyebrow")     || cf(ctx, key, "subtitle");
```

`FeatureGridV1`, `DownloadListV1`, `StatsV1` lasen bereits ausschließlich canonical — keine Fallback-Kette nötig.

## Admin-Workspace

`BildkartenCardWorkspace.tsx` schreibt seit 2026-06-03 in die canonical Felder:

```ts
const EYEBROW_FK = "eyebrow";
const TITLE_FK   = "title";
const DESC_FK    = "description";
```

Die UI-Labels bleiben unverändert (Eyebrow / Titel / Beschreibung).

## Backfill-Quelle

Migration `20260603081100_*` ist idempotent und kann erneut ausgeführt werden, ohne canonical Inhalte zu überschreiben. Sie ist die Referenz für jedes neue Backfill auf Karten-Textfelder.
