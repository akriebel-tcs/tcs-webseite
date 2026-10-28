# Batch 15 — Vorprüfung: Standardkarten-Slot-Vertrag

Stand: 2026-06-04

## Frage

Im CMS-Light Wahrheits-Check zeigt der Admin ~323 „Restschuld"
(amber). Viele davon liegen bei `card_v1` und betreffen die Bildslots
`icon_image` / `thumbnail`. Ist das echte Renderer-Schuld oder
Messfehler?

## Datenquellen

`buildTruthReport()` (`src/features/admin/lib/truthSources.ts`)
verschneidet:

- `cms_assets` (DB-Inhalte, aktiv/inaktiv, je Viewport)
- `cms_section_fields` (Texte/Toggles, je Locale)
- `cms_admin_editable_fields` (Whitelist „darf gepflegt werden")
- `cms_sections` (Section-Aktivität, Eltern-Container)
- `RENDERER_SLOT_MAP` (`rendererSlotMap.ts`) + `expectedSlotOf()`
  (`cardVisibility.ts`) als Renderer-Erwartung
- `KNOWN_PAGE_COMPONENT_READS` für hartcodierte Seitenkomponenten

## Befund 1 — `card_v1` hat drei Bildslots, der Check verengt auf einen

Bis Batch 14 setzt `truthSources.ts` für `card_v1` den erwarteten Slot
über `expectedSlotOf(kind)` auf **genau einen** Wert
(`image` | `thumbnail` | `icon_image`), abhängig vom Eltern-Container:

| Eltern-Container             | erwartet  | required |
|------------------------------|-----------|----------|
| `cards_v1` (Raster)          | image     | nein     |
| `cards_v1` (`products`-Scroller) | image | ja       |
| `product_scroller_v1`        | image     | ja       |
| `product_showcase_list_v1`   | image     | nein     |
| `card_grid_v1` (Hub)         | thumbnail | ja       |
| `catalog_filter_grid_v1`     | thumbnail | ja       |
| `feature_grid_v1`            | icon_image| ja       |
| sonst                        | none      | nein     |

Realität in der DB:

```
section_type=card_v1, is_active=true (622 Sections)
Whitelist je Slot (DE+EN, jeweils ~1244 Reihen):
  image      → 622 Sections
  thumbnail  → 622 Sections
  icon_image → 622 Sections
```

Jede aktive Standardkarte hat also alle drei Bildslots im Admin
pflegbar (so ist der Vertrag gemeint). Der Check sah aber pro Karte nur
einen Slot als „vom Renderer erwartet". Die anderen zwei wurden zu
`renderer_orphan` mit Severity `restschuld`.

622 × 2 = ~1244 Records → aggregiert zu Section-Ampeln ergibt einen
großen Teil der 323 sichtbaren Restschuld-Sektionen.

## Befund 2 — Die Renderer LESEN alle drei Slots

Quellcode, Stand 2026-06-04:

- `CardsSectionV1.tsx` liest `image`, `thumbnail`, `icon_image`
- `ProductScrollerV1.tsx` liest `image` und fällt auf `icon_image`
  zurück
- `ProductShowcaseListV1.tsx` liest `image` und `icon_image`
- `FeatureGridV1.tsx` liest `icon_image`

Das heißt: ein gepflegtes `icon_image` auf einer Karte im Raster wird
sehr wohl gerendert — der Wahrheits-Check sagte trotzdem
„verwaist".

## Befund 3 — Leere optionale Slots zählten als Restschuld

`recordSeverity()` mappte jeden `renderer_orphan` mit optionalem
field_key auf `restschuld`, auch wenn der Slot **leer** war
(`has_content=false`). Damit wurden „der Admin könnte das pflegen, tut
es aktuell nicht" und „der Admin pflegt das aktiv, Renderer ignoriert"
gleich behandelt.

## Aktueller `icon_image`-Befüllungsstand

```
cms_assets aktiv mit field_key=icon_image, section_type=card_v1: 0
```

Es gibt aktuell kein einziges Karten-`icon_image`. Trotzdem zählte der
Check für jede der 622 Karten den Slot als Restschuld. Reines
Messartefakt.

## Ergebnis Vorprüfung

| Frage                                                           | Antwort |
|-----------------------------------------------------------------|---------|
| Ist `icon_image` ein offizieller Standardkarten-Slot?           | Ja      |
| Wird `icon_image` von den Renderern grundsätzlich unterstützt?  | Ja      |
| Wird der Slot heute irgendwo befüllt?                           | Nein    |
| Ist die 323er-Restschuld echte Renderer-Lücke?                  | Nein, Messfehler |
| Müssen Renderer geändert werden?                                | Nein    |
| Müssen Inhalte geändert werden?                                 | Nein    |
| Muss eine Migration laufen?                                     | Nein    |
| Muss der Wahrheits-Check kalibriert werden?                     | Ja      |
