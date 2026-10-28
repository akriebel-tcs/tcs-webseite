# Container × Preset Review + Layoutregeln (read-only)

Stand: 2026-06-01
Sprint: `cms-light-card-container-preset-review-und-layoutregeln-1`

## A. Kurzfazit

- Es gibt heute **6 Container-Typen, die `card_v1`-Kinder rendern oder fachlich rendern sollten**: `cards_v1`, `product_scroller_v1`, `card_grid_v1`, `catalog_filter_grid_v1`, `feature_grid_v1`, `download_list_v1`.
- Die fachliche **Layout-/Bildregel pro Container** ist im Code eindeutig ablesbar und wurde maschinenlesbar in `src/features/admin/lib/containerLayoutRules.ts` festgehalten (read-only Metadaten).
- Aktive Karten-Verteilung (DB, 2026-06-01): **701 aktive `card_v1`** gesamt — 639 in `cards_v1`, 33 in `product_scroller_v1`, 18 in `catalog_filter_grid_v1`, 4 in `feature_grid_v1`, 3 in `card_grid_v1`, 4 ohne Container (top-level Drift).
- **Größtes Auffälligkeitsmuster:** 570 von 639 `cards_v1`-Karten haben kein `image`-Asset. Das ist Inhaltsarbeit, keine Strukturreparatur.
- **Admin-Ergänzung ist UI-only erfolgt:** `CardPresetBadge` zeigt jetzt zusätzlich zum erkannten Preset auch Container-Typ, Layout-Beschreibung, erwarteten Bildslot, Bildformat und Spaltenregel — plus Hinweis, falls Preset und Container nicht zusammenpassen.
- **Keine** DB-Änderung, **keine** Migration, **keine** RPC, **keine** Whitelist-/i18n-/Public-/Produktdatenbank-Änderung.

## B. Container-/Layoutregeln (aus Renderer-Code abgelesen)

| Container | Layout | Spalten (Renderer) | Bildslot | Bildformat (hart) | Quelle |
|---|---|---|---|---|---|
| `cards_v1` | Raster | 1 / 2 / 3 (`cardGridClass`) | `image` | `aspect-[4/3] object-cover` | `CardsSectionV1.tsx` |
| `product_scroller_v1` | Horizontaler Snap-Scroller | `w-72 md:w-80` Karten | `image` | `aspect-[4/3] object-cover` | `ProductScrollerV1.tsx` |
| `card_grid_v1` | Hub-Raster (kein eigener Renderer) | Hub-spezifisch | `thumbnail` | nicht global gesetzt | Hub-Pages (CategoryListPage etc.) |
| `catalog_filter_grid_v1` | Filter-Raster | 2 / 3 / 4 (filterabhängig) | `thumbnail` | nicht global gesetzt | CategoryListPage / TuerkommunikationHubPage |
| `feature_grid_v1` | Iconkarten-Raster | 1 / 2 / 3 | `icon_image` (Bildicon) ODER `icon` (Lucide-Name) | Icon quadratisch (12×12 / 8×8) | `FeatureGridV1.tsx` |
| `download_list_v1` | Vertikale Liste | 1 | — (Renderer liest kein Karten-Bild) | — | `DownloadListV1.tsx` |

Wichtig:
- `download_list_v1` filtert im Renderer heute auf **`download_item_v1`**-Kinder. `card_v1` als Download-Kind ist noch Migrationsaufgabe (siehe Zielbausteine-Fahrplan).
- `card_grid_v1` und `catalog_filter_grid_v1` haben **keinen eigenen Renderer**; sie sind Alias-Container, die direkt in Hub-/Katalog-Seiten gerendert werden. Der einzige produktiv gelesene Bildslot ihrer Kinder ist `thumbnail`.

## C. Matrix Container × Preset

| Container | Zielstandard-Preset(s) | Erlaubter Spezialfall | Drift / nicht verwenden |
|---|---|---|---|
| `cards_v1` | `image_card` | `text_card`, `multi_link_card` | `icon_card_*`, `thumbnail_card`, `download_card` |
| `product_scroller_v1` | `image_card` | — | `text_card`, `icon_card_*`, `thumbnail_card`, `download_card` |
| `card_grid_v1` | `thumbnail_card` | — | `image_card` (Slot `image` wird ignoriert), `icon_card_*` |
| `catalog_filter_grid_v1` | `thumbnail_card` | — | dito; zusätzlich: keine Produktdatenbank-Felder |
| `feature_grid_v1` | `icon_card_image`, `icon_card_lucide` | — | `image_card`/`thumbnail_card` (Bild wird vom Renderer ignoriert) |
| `download_list_v1` | `download_card` (geplant) | — | alle Bild-/Icon-Presets |

Erläuterung „Drift": Renderer rendert das Element entweder nicht oder nur als Fallback. Daten gehen nicht verloren, aber Pflegeaufwand verpufft.

## D. Aktive Karten — Auffälligkeiten (DB-Inventar)

Stand 2026-06-01 (`is_active=true`):

| Parent | Erkanntes Preset | Anzahl | Bewertung |
|---|---|---:|---|
| `cards_v1` | `image_card` | 69 | OK — Zielstandard |
| `cards_v1` | `image_card` ohne `image`-Asset | 570 | Inhaltsarbeit, kein Strukturfehler. Fallback (Icon/Text) greift. |
| `product_scroller_v1` | `image_card` | 31 | OK |
| `product_scroller_v1` | `image_card` ohne `image`-Asset | 2 | Bild fehlt — Inhaltslücke. |
| `card_grid_v1` | `thumbnail_card` | 3 | OK |
| `catalog_filter_grid_v1` | `thumbnail_card` | 18 | OK |
| `feature_grid_v1` | `icon_card_lucide` | 4 | OK — Lucide-Icon-Variante |
| (top-level, kein Container) | `text_card` | 4 | **Drift** — `card_v1` ohne Parent ist fachlich nicht vorgesehen. Manuell prüfen. |

Im Bestand **0** Instanzen von: `icon_card_image`, `multi_link_card`, expliziter `text_card` in passendem Container, `download_card`. Diese Presets existieren im Vertrag, sind aber noch nicht in Inhalten verwendet.

## E. Admin-Ergänzung (UI-only)

Was umgesetzt wurde:

- **Neuer Metadaten-Helper** `src/features/admin/lib/containerLayoutRules.ts` — read-only Vertrag für die 6 Container, mit `getContainerLayoutRule(parent)` und `presetMatchesContainer(parent, preset)`.
- **`CardPresetBadge` erweitert:** unterhalb von Preset/Beschreibung jetzt ein zusätzlicher Info-Block „Container · Layout · erwarteter Bildslot" mit Layout-Beschreibung, erwartetem Bildslot, Bildformat und typischer Spaltenzahl.
- **Hinweis-Badge:** wenn `presetMatchesContainer` false liefert (z. B. `image_card` in `feature_grid_v1`), zeigt der Badge eine gelbe Warnung „passt fachlich nicht zum Container — erlaubt wären …".

Was bewusst NICHT gemacht wurde:
- Kein Preset-Wechsel-Button (Variante ist Ableitung, keine eigene DB-Spalte).
- Keine Schreibwege geändert.
- Keine globale Slot-Filterung; Asset-Slots laufen unverändert über `SectionAssetsBlock`.

## F. Akkordeon-Roadmap für weitere Bausteine

Aufnahme-Prinzip: nur Bausteine mit ≥ 3 sinnvollen Feld-Gruppen profitieren vom Akkordeon. Flache Bausteine (< 5 Felder) bleiben einfach.

| Section-Type | Sinnvolle Gruppen | Asset-Slots | Eigenes Workspace? | Priorität |
|---|---|---|---|---|
| `teaser_2col_v1` | Kopf · Inhalt · Medien · Link · Technik (background_variant, image_position) | `image` (required) | **Ja** | hoch |
| `hero_v1` | Kopf (eyebrow/headline/subline) · Link · Medien | `image` (required) | **Ja** | hoch |
| `content_v1` | Kopf · Inhalt | — | Nein (3 Felder, flach lassen) | mittel |
| `cta_v1` | Kopf · Inhalt · Link · Medien | `image` (optional) | Ja, leicht | mittel |
| `faq_v1` | Kopf · Items (Kind-Sections) | — | Ja (Container-Workspace) | mittel |
| `stats_v1` | Kopf · Items (Kind-Sections `stat_v1`) | — | Ja (Container-Workspace) | niedrig |
| `contact_block_v1` | offen, abhängig von Kontakt-Migration | — | Erst nach Migration | später |

Vorbereiteter Helper: keine neue Utility nötig. `CardFieldsWorkspaceGroups` lässt sich als Vorlage für einen generischen `SectionFieldsWorkspace<SectionType>` benutzen — Umsetzung erst in der nächsten Etappe.

## G. Empfohlene nächste Schritte

1. **`cms-light-baustein-workspaces-wechselteaser-hero-content-1`** — Akkordeon-Workspaces für `teaser_2col_v1` und `hero_v1` (höchste Priorität, klares Schema).
2. Top-level `card_v1`-Drift (4 Instanzen) im Admin sichtbar machen oder als gezielter Cleanup-Auftrag listen.
3. S2-Whitelist-Tranche für `download_card` planen — erst wenn entschieden ist, ob `download_list_v1` weiter `download_item_v1` rendert oder auf `card_v1` umgestellt wird.
4. Inhaltsarbeit (kein Code): 570 `cards_v1`-Karten ohne Bild fachlich bewerten (Bild ergänzen / Container wechseln / Preset bewusst „text_card").
5. Nach erstem Workspace-Roll-out: gemeinsamen `SectionFieldsWorkspace`-Helper aus `CardFieldsWorkspace` extrahieren.

## H. Scope-Bestätigung

- Keine DB-Änderung. Keine Migration. Keine neue RPC.
- Keine Inhalte / Bilder / Feldwerte geändert.
- Keine Whitelist geändert. Keine i18n-Dateien geändert.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung.
- Keine Produktdatenbank berührt.
- Code-Änderungen ausschließlich: 1 neue Lib-Datei (`containerLayoutRules.ts`) + Erweiterung `CardPresetBadge.tsx` (Anzeige).
- Audits stabil: Contract 15 OK · 7 Warnung · 0 Konflikt; Contract-Drift D1=0, D8=0; D3/D5-Triage 2004/2000; Renderer-Inventar S1=54 · S2=19. `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).
