# Standardkarten-Slot-Vertrag (`card_v1`)

Stand: 2026-06-04 (Batch 15)

Verbindlicher Vertrag der Standardkarte. Wird vom Wahrheits-Check, vom
Admin-Editor und von den Karten-Renderern (`CardsSectionV1`,
`ProductScrollerV1`, `ProductShowcaseListV1`, `FeatureGridV1`)
verwendet.

## Pflicht-Slots

Eine Karte ohne diese Felder ist redaktionell ungültig:

| Slot          | Typ    | Pflicht | Bedeutung                          |
|---------------|--------|---------|------------------------------------|
| `title`       | Text   | ja      | Karten-Überschrift                 |

Alle weiteren Slots sind **optional**.

## Optionale Slots — kanonisch

| Slot          | Typ    | Hinweis                                                   |
|---------------|--------|-----------------------------------------------------------|
| `eyebrow`     | Text   | Mini-Label über dem Titel                                  |
| `description` | Text   | Karten-Fließtext                                           |
| `link_label`  | Text   | Button-Text                                                |
| `link_href`   | Text   | Ziel-Route oder URL                                        |
| `icon`        | Text   | Lucide-Icon-Name                                           |
| `icon_enabled`| Bool   | Icon ein/aus, default aus wenn `icon` leer                 |
| `image_enabled`| Bool  | Bild ein/aus, default ein wenn Bild vorhanden              |
| `badge`       | Text   | optionaler Status-Hinweis                                  |

## Optionale Bild-Slots — Fallback-Kette

`card_v1` hat **drei** Bildslots. Der Renderer entscheidet
containerbewusst, welcher den Vorrang bekommt, aber alle drei werden
gelesen:

| Slot          | Primär in Container                                  | Fallback-Verhalten                       |
|---------------|------------------------------------------------------|------------------------------------------|
| `image`       | `cards_v1` (Raster + `products`-Scroller), `product_scroller_v1`, `product_showcase_list_v1` | Standard-Karten-Bild                     |
| `thumbnail`   | `card_grid_v1` (Hub), `catalog_filter_grid_v1`        | Hub-/Filter-Thumbnail                    |
| `icon_image`  | `feature_grid_v1`                                     | Grafisches Icon, ersetzt Lucide          |

Alle drei Slots sind aus Admin-Sicht immer pflegbar (Whitelist gilt für
alle aktiven Karten). Der Renderer wählt nach Container-Kontext.

## Aliase / Legacy

Keine aktiven Aliase. Frühere Felder (`thumbnail_url`, `card_image`,
`asset_image`) sind nicht mehr Teil des Vertrags und werden im Admin
nicht angeboten.

## Wann ist ein Slot ein Fehler? (Wahrheits-Check-Regeln)

| Zustand                                                           | Severity     |
|-------------------------------------------------------------------|--------------|
| Slot Pflicht + leer                                               | critical     |
| Slot optional + leer                                              | warning      |
| Slot optional + befüllt + Renderer liest ihn                      | green        |
| Slot optional + befüllt + Renderer liest ihn **nicht**            | restschuld   |
| Slot überhaupt nicht im Renderer-Vertrag + befüllt                | restschuld   |
| Slot überhaupt nicht im Renderer-Vertrag + leer                   | warning      |
| Whitelist fehlt, aber Renderer + DB stimmen                       | warning      |
| DB-Dubletten je Viewport                                          | critical     |

Diese Regeln sind kodiert in `recordSeverity()` in
`src/features/admin/lib/truthSources.ts`.

## Container-Erwartung (`expectedSlotOf`)

Quelle: `src/features/cms/lib/cardVisibility.ts`.

```
cards_v1 (Raster)        → image    (optional)
cards_v1 (.scroller)     → image    (Pflicht)
product_scroller_v1      → image    (Pflicht)
product_showcase_list_v1 → image    (optional, icon_image als Fallback)
card_grid_v1             → thumbnail (Pflicht)
catalog_filter_grid_v1   → thumbnail (Pflicht)
feature_grid_v1          → icon_image (Pflicht)
unknown / sonst          → keine, alle drei bleiben optional
```

Diese Erwartung steuert nur den **required**-Flag. Die jeweils anderen
zwei Bildslots bleiben in jedem Container optional bekannt.
