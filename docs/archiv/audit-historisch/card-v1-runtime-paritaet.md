# `card_v1` Runtime-Parität — Container-aware Karten-Wahrheit

Status: aktiv seit Sprint „card_v1 Runtime-Parität — gemeinsame Karten-Matrix und Resolver-Wahrheit" (2026-06-03).

## Worum es geht

Eine `card_v1`-Karte wird je nach Eltern-Container unterschiedlich
ausgespielt. Bisher wussten Admin, Public-Renderer und Audit das nicht
in derselben Form — Felder waren im Admin pflegbar und in der DB
gespeichert, aber öffentlich wirkungslos (z. B. B-538 im
`product_scroller_v1`: `bullets.0`, `chips.0`, `link_1_label` waren
gepflegt, aber nicht sichtbar).

Die Lösung ist eine **zentrale Code-Matrix** plus ein **gemeinsamer
Runtime-Resolver**:

- `src/features/cms/lib/cardRuntimeMatrix.ts` — Welche Karten-Module
  rendert welcher Container?
- `src/features/cms/lib/cardVisibility.ts` → `resolveCardRuntime` —
  Liefert pro Feld einen sprechenden Status, container-aware.

## Statusmodell

| Status        | Bedeutung                                                                 |
|---------------|---------------------------------------------------------------------------|
| `empty`       | Nichts gepflegt.                                                          |
| `unsupported` | Wert gepflegt, aber Container rendert dieses Feld nicht.                  |
| `disabled`    | Wert vorhanden, aber Toggle = „0" (z. B. `link_1_enabled=0`).             |
| `incomplete`  | Teilwerte vorhanden — Link-Label ohne href oder href ohne Label.          |
| `active`      | Öffentlich wirksam.                                                       |

## Container-Matrix (Auszug)

| Container               | Eyebrow | Title | Description | Image | Thumbnail | Icon | Icon-Image | Bullets | Chips | Links (1..3) |
|-------------------------|:-------:|:-----:|:-----------:|:-----:|:---------:|:----:|:----------:|:-------:|:-----:|:------------:|
| `cards_v1.grid`         | ✓       | ✓     | ✓           | ✓     | —         | ✓    | ✓          | ✓       | ✓     | —            |
| `cards_v1.scroller`     | ✓       | ✓     | ✓           | ✓     | —         | —    | —          | ✓       | ✓     | —            |
| `product_scroller_v1`   | ✓       | ✓     | ✓           | ✓     | —         | —    | —          | ✓       | ✓     | ✓            |
| `card_grid_v1`          | ✓       | ✓     | ✓           | —     | ✓         | —    | —          | —       | —     | ✓            |
| `catalog_filter_grid_v1`| —       | ✓     | ✓           | —     | ✓         | —    | —          | —       | —     | —            |
| `feature_grid_v1`       | —       | ✓     | ✓           | —     | —         | ✓    | ✓          | —       | —     | —            |
| `download_list_v1`      | —       | —     | —           | —     | —         | —    | —          | —       | —     | —            |

Die Matrix ist die Code-Wahrheit. Wer ein neues Container-Layout baut,
trägt sich hier ein — Admin-Anzeige und Audit-Regeln ziehen automatisch nach.

## Wo das wirkt

- **Public-Renderer**
  - `CardsSectionV1.tsx` (cards_v1.grid)
  - `ProductScrollerV1.tsx` — neu: rendert jetzt bullets, chips, links
    1..3 entsprechend Matrix.
  - `FeatureGridV1.tsx`
  - `CmsProductSolutionShell.tsx`
- **Admin** — `BildkartenCardWorkspace.tsx`
  - Bulletpoints/Chips/Links-Gruppen zeigen „in diesem Layout nicht
    sichtbar", wenn der Container das Modul nicht rendert.
  - Link-Zähler: `X aktiv · Y unvollständig · Z befüllt`.
  - Pro Linkzeile ein Statusbadge (aktiv / unvollständig / deaktiviert
    / nicht in diesem Layout / leer) inkl. Begründung
    („Beschriftung vorhanden, Ziel fehlt").

## Akzeptanztest B-538

`card_pak` in `product_scroller_v1` auf
`gebaeudekommunikation.tuersprechanlagen`:

- `bullets.0 = "Test"` → Public sichtbar (Container unterstützt Bullets).
- `chips.0 = "Test"` → Public sichtbar.
- `link_1_label = "Mehr erfahren"` ohne href → Admin: „unvollständig
  · Beschriftung vorhanden, Ziel fehlt." Public: kein Link.
- `link_1_label + link_1_href` → Admin: „aktiv". Public: Link sichtbar.
- `link_1_enabled = 0` → Admin: „deaktiviert". Public: kein Link.

## Scope-Grenzen

- Keine Whitelist-/RPC-/DB-Änderung.
- Keine Produktdatenbank/Navigation/Footer berührt.
- Keine Inhalte/Legacy-Felder gelöscht.
- Renderer-Änderungen beschränkt auf das Ausspielen bisher
  unterstützter, aber nicht gerenderter Felder.
