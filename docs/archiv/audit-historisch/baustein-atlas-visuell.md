# Baustein-Atlas CMS-Light — neutraler Ist-Katalog (read-only)

_Stand: 2026-05-29 — Sprint `cms-light-baustein-atlas-neutraler-ist-katalog-final-1`._
_Reine Analyse/Doku. Keine DB-, Migrations-, RPC-, Inhalts-, Bild-, Feldwert-, Whitelist-, i18n-, Public-Renderer-, Routen-, Navigations-, Footer-, Breadcrumb- oder Produktdatenbank-Änderung._

## Auf einen Blick

- **PDF (Ist-Katalog):** `docs/04-betrieb/baustein-atlas-visuell.pdf` (19 Seiten, A4, neutral aufgebaut, ohne Personen-Namen, ohne „Workshop-Frage"-Labels, ohne leere Trennseiten).
- **JSON-Index (maschinenlesbar):** `scripts/cms/output/baustein-atlas-latest.json`.
- **Build-Skript:** `scripts/cms/build-baustein-atlas-pdf.py` (erzeugt PDF und JSON in einem Lauf).
- **Admin-Sprungmarken-Test:** `docs/04-betrieb/admin-kurz-id-sprung-test.md`. Sprung zu N-/P-/B-/A-IDs (inkl. Kind-Karten in Scrollern/Grids) funktioniert.

## Zweck

Der Atlas ist ein **neutraler Ist-Katalog**. Er beantwortet:

- Welche sichtbaren Bausteine gibt es heute?
- Wo finde ich sie im CMS (P-/B-/A-ID, page_key, section_key)?
- Welcher Baustein ist ein **Zielstandard-Kandidat**?
- Was sollte später zusammengeführt, ersetzt oder geprüft werden?

Es ist **kein** Prozessbericht, **keine** Entscheidung, **keine** Personen-Diskussion.

## ID-Konvention

| Kürzel | Bedeutung | Quelle |
|---|---|---|
| **P-ID** | Seite | `cms_pages.page_no` |
| **B-ID** | Block / Section | `cms_sections.section_uid` |
| **A-ID** | Asset / Bild | `cms_assets.asset_no` |
| **N-ID** | Navigationsknoten | `cms_navigation_nodes.node_no` |

Eingabe im Admin akzeptiert `B-538` und `B538`. Der Sprung öffnet den Editor und fokussiert auch Kind-Karten innerhalb von Scrollern/Grids.

## Drei Begriffe — sauber getrennt

| Begriff | Bedeutung |
|---|---|
| **Sichtbarer Baustein** | Was auf der Website wirklich erscheint (Hero, Wechselteaser, Karten-Reihe, Iconreihe …). |
| **Container (Layout-Hülle)** | Technische Hülle, die mehrere Karten zusammenhält. Beispiele: `cards_v1`, `product_scroller_v1`, `feature_grid_v1`, `card_grid_v1`, `catalog_filter_grid_v1`. Container sind kein eigener sichtbarer Baustein. |
| **Flexible Standardkarte** | Eine Karte (`card_v1`) mit ein-/ausblendbaren Zonen (Bild, Icon, Eyebrow, Features, Links). Ein **Preset** entscheidet, welche Zonen sichtbar sind. |

## Sichtbare Bausteine (Hauptkatalog)

| # | Baustein | Section-Typ / Container | Aktive Instanzen | Vorschlag |
|---|---|---|---|---|
| 1 | Hero | `hero_v1` | 92 | behalten |
| 2 | Wechselteaser | `teaser_2col_v1` | 66 | behalten |
| 3 | Textblock / Intro | `content_v1` | 224 | standardisieren |
| 4 | Karten-Reihe (Bildkarten) | `cards_v1` + `card_v1` (Preset Bildkarte) | 127 Container | standardisieren |
| 5 | Produkt-Scroller | `product_scroller_v1` + `card_v1` | 8 | standardisieren |
| 6 | Iconreihe (Lucide) | `feature_grid_v1` + `card_v1` (Preset Iconkarte) | 1 / 51 | standardisieren |
| 7 | Personas-Textkarten | `cards_v1` + `card_v1` (Preset Textkarte) | mehrere | standardisieren |
| 8 | Produkt-Hub (/produkte) | `card_grid_v1` + 3 `card_v1` (Preset Thumbnail) | 1 / 3 | standardisieren |
| 9 | Produktbereichs-Filter (live) | `catalog_filter_grid_v1` (0 CMS-Kinder, Produktdatenbank) | 4 | Spezialfall |
| 10 | Stats-Band | `stats_v1` + `stat_v1` | 8 / 32 | behalten |
| 11 | FAQ | `faq_v1` | 3 | behalten |
| 12 | CTA-Banner | `cta_v1` | 1 | standardisieren |
| 13 | Kontaktblock | `contact_block_v1` (Vertrag, 0 Instanzen) | 0 | später prüfen |
| 14 | Tabs · Rollen-Tabs · Rich Text · Referenz-Liste | `tabs_v1` · `role_tabs_v1` · `rich_v1` · `list_v1` | 1 / 1 / 2 / 24 | behalten |

## Flexible Standardkarte (Zielstandard-Kandidat)

- **Parent-Scroller:** `B-026` `aussenstationen` (`product_scroller_v1`) auf `P-004` `gebaeudekommunikation.tuersprechanlagen`.
- **Schwester-Scroller:** `B-027` `innenstationen` (gleiche Kartenfamilie).
- **Karten mit Toggles:** `B-538`, `B-539`, `B-540`, `B-2195` (alle `card_v1`, Kinder von `B-026`).
- **Verifizierte Toggle-Felder:** `eyebrow_enabled`, `image_enabled`, `icon_enabled`, `features_0_enabled` … `features_4_enabled`, `link_1_enabled` … `link_3_enabled`.
- **Vorschlag:** Diese Karte als `standard_card_v1` zum Vertrag erheben und die heutigen Variant-Keys als Presets abbilden. **Nicht beschlossen** — markiert als Zielstandard-Kandidat.

## Karten-Presets (heute `card_v1`-Varianten)

| Preset (fachlich) | Variant-Key (heute) | Sichtbares Ergebnis | Zonen-Belegung |
|---|---|---|---|
| Bildkarte | `image_card` | Bild oben, Titel, Beschreibung | Bild an, Icon/Features/Links aus |
| Produktbereich-Karte | `thumbnail_card` | Hub-Kachel mit Vorschaubild | Bild an (Slot `thumbnail`), ein Link |
| Scroller-Karte (Pilot) | `image_card` + Toggles | Karte mit Toggles pro Zone | Basis der Standardkarte |
| Textkarte | `text_card` | Nur Titel und Text | Bild/Icon/Features aus |
| Iconkarte Lucide | `icon_card_lucide` | Lucide-Icon oben, Titel, kurzer Text | Icon an, Bild aus |
| Iconkarte Bildicon | `icon_card_image` | Wie Iconkarte Lucide, mit Bildicon | Icon an (Slot `icon_image`), Bild aus |
| Multi-Link-/Feature-Karte | `multi_link_card` | Karte mit bis zu 3 sekundären Links | Links/Features an |

`download_card` ist **Spezialfall** (eigene Dateifelder `file_label`/`file_href`) und steht im Anhang.

## Container als Layout-Hüllen

Container bestimmen die Anordnung. Der sichtbare Baustein ist meist die Karte darin.

| Container-Typ | Rolle (Layout) | Was lebt darin? | Aktiv |
|---|---|---|---|
| `cards_v1` | Grid-Hülle 2–4 Karten | `card_v1` (Bild-/Text-/Iconkarte) | 127 |
| `product_scroller_v1` | Horizontaler Scroller | `card_v1` (Pilot mit Toggles) | 8 |
| `feature_grid_v1` | Icongrid-Hülle | `card_v1` (Preset Iconkarte) | 1 |
| `card_grid_v1` | Hub-Hülle `/produkte` (`B-1176`) | `card_v1` (Preset Thumbnail) · 3 Kinder | 1 |
| `catalog_filter_grid_v1` | Produktbereichs-Filter (live) | Kacheln aus Produktdatenbank · 0 CMS-Kinder | 4 |

## Anhang — manuell prüfen / nicht aktiv belegt

- **Iconkarte Bildicon (`icon_card_image`)** — Vertrag vorhanden, keine eindeutige aktive Instanz.
- **Download-Karte (`download_card`)** — Vertrag vorhanden, 0 Instanzen. Spezialfall (harte Dateifelder). `/service/downloads` (P-081) nutzt heute `cards_v1` + Textkarten.
- **Download-Liste (`download_list_v1`)** — Vertrag vorhanden, 0 Instanzen.
- **Kopie-/Preview-Seite `produkte.eingangsloesungen.kopie` (`B-1198`)** — vierte Instanz von `catalog_filter_grid_v1`, nicht regulär public/auffindbar.

## Bekannte „manuell prüfen"-Stellen für Crops

| Baustein | Grund |
|---|---|
| Iconreihe Lucide | bisheriger Crop zeigte zu viel Umfeld inkl. Footer |
| Stats-Band | bisheriger Crop zeigte nicht das echte Stats-Band |
| Standardkarte (B-538/539/540/2195) | Hauptansicht über Scroller-Crop abgedeckt; isolierter Karten-Crop optional |
| FAQ / Kontaktblock / restliche Spezialbausteine | bei Bedarf isolierter Crop |

Crops dieser Einträge werden bei Bedarf in einer eigenen Browser-Runde isoliert nachgezogen und verändern den Hauptkatalog nicht.

## Scope-Bestätigung

Keine DB-Mutation, keine Migration, keine neue RPC, keine Inhalts-/Bild-/Feldwert-/Whitelist-/i18n-Änderung, keine Public-Renderer-/Routen-/Navigations-/Footer-/Breadcrumb-Änderung, keine Produktdatenbank-Änderung.
