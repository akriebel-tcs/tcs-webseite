# Sprint-Bericht: card_v1 als Masterkarte — Icon ein-/ausblenden

Datum: 2026-06-03
Status: UI + Resolver + Matrix + Whitelist umgestellt. Keine neuen Felder.
Bestehendes Feld `icon_enabled` ist jetzt der offizielle Sichtbarkeits-
schalter für das Icon — der Icon-Name in `icon` bleibt beim Ausblenden
erhalten.

## Grundregel (neu)

`card_v1` ist die Masterkarte. Jede `card_v1`-Karte kann jedes Modul
tragen: Bild, Icon, Eyebrow, Titel, Beschreibung, Bulletpoints, Chips,
Links. Der Container ordnet nur an, er reduziert nicht den
Funktionsumfang der Karte. Sichtbarkeit eines Moduls = Inhalt vorhanden
UND Sichtbarkeits-Schalter nicht „aus".

## Was sich konkret geändert hat

### 1. Runtime-Matrix (`card_v1.matrix.json`, v2.0.0)

Alle Karten-Container (`cards_v1.grid`, `cards_v1.scroller`,
`product_scroller_v1`, `card_grid_v1`, `feature_grid_v1`) unterstützen
jetzt ALLE Module: `eyebrow`, `title`, `description`, `image`,
`thumbnail`, `icon`, `icon_image`, `bullets`, `chips`, `links`.

Echte technische Sonderfälle bleiben restriktiv:
- `catalog_filter_grid_v1` (produktgetriebener Filter)
- `download_list_v1`
- `unknown`

### 2. Resolver (`src/features/cms/lib/cardVisibility.ts`)

- Icon-Sichtbarkeit jetzt: `iconName.length > 0 && icon_enabled !== "0"`.
- Default für `icon_enabled` bei leerem Wert: `true` (Back-Compat).
- **Entfernt**: der frühere Override, der das Icon in
  `cards_v1`/`product_scroller_v1` versteckte, sobald ein Bild oder
  Bildicon vorhanden war. Icon und Bild können jetzt koexistieren — der
  Renderer entscheidet rein über die Schalter.

### 3. Admin (`BildkartenCardWorkspace.tsx`)

- `IconBlock` schreibt jetzt zwei Felder getrennt:
  - `icon` (Lucide-Name, bleibt beim Ausschalten erhalten)
  - `icon_enabled` (`"1"` / `"0"`) — über die Checkbox
- Header-Text entrümpelt: kein „in diesem Layout nicht sichtbar" mehr,
  sondern klar „an · shield-check" oder „aus · shield-check".
- Wenn kein Icon-Name gesetzt ist, ist der Schalter deaktiviert mit
  Hinweis „Schalter wird aktiv, sobald unten ein Icon-Name gesetzt ist."

### 4. Whitelist (Migration)

Für jede Section, in der `icon` bereits in `cms_admin_editable_fields`
freigeschaltet war, wurde `icon_enabled` (DE+EN, `is_enabled=true`)
nachgezogen. Sonst hätte die RPC den Schalter still abgelehnt.

### 5. Renderer

Der seitenlokale `ProduktScroller` in `TuersprechanlagenPage.tsx` zeigte
bereits ein Icon (über `vis.iconVisible && vis.iconName`). Mit dem neuen
Resolver wird `vis.iconVisible` jetzt auch in `product_scroller_v1`
wahr, wenn `icon_enabled=1`. Kein Codepfad-Eingriff nötig.

`CardsSectionV1` und `FeatureGridV1` lesen denselben Resolver und
zeigen das Icon entsprechend.

## Akzeptanz

- **B-538**: `icon=shield-check`, `icon_enabled=0` → Icon aus. Schalter
  in Admin auf „an" stellen → Icon erscheint im Preview.
- **B-583**, **B-1177**, **B-2002**: keine Codepfade berührt, bleiben
  grün.
- Bulletpoints/Chips/Links: Renderer und Sichtbarkeitslogik unverändert.
- E2E (`scripts/cms/e2e-vertrag.mjs`) liest die Matrix direkt — Container
  unterstützen jetzt mehr Felder, also schrumpft die Menge möglicher
  `unsupported`-Findings. Bestehende Pflichtkarten-Checks bleiben grün
  (Bullets/Chips/Links unverändert).

## Was bewusst NICHT geändert wurde

- Keine neuen Felder (`icon_enabled` existiert seit langem in der DB).
- Keine Migration auf bestehende `icon_enabled`-Werte. Wer früher
  versehentlich auf `0` gesetzt hat, sieht das Icon jetzt aus und kann
  es im Admin wieder einschalten — bewusste Korrektur statt
  Massen-Backfill.
- Kein Eingriff in Produktdatenbank, Navigation, Footer, i18n-Fallbacks.
- Kein Eingriff in Hero/Teaser/CTA/FAQ/Content.
