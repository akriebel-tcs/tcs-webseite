# Section-Typen-Katalog (Public-Renderer)

**Stand:** 2026-05-15 — Etappe P-0  
**Zweck:** Verbindliches Schema für `cms_sections.section_type` und die zugehörigen `cms_section_fields`.  
**Wird gelesen von:** `<CmsBodyRenderer>` und den Komponenten unter `src/features/cms/components/sections/`.

## Konventionen

- `section_type` ist immer kleingeschrieben mit Unterstrich, Versions-Suffix (`_v1`, `_v2`).
- Felder kommen aus `cms_section_fields`, Schlüssel = `field_key`, Sprache = `locale` (`de`/`en`).
- Listen-Inhalte (z. B. Card-Items) werden über **Kind-Sections** (`parent_section_id`) modelliert. Eine Eltern-Section vom Typ `cards_v1` hat n Kind-Sections vom Typ `card_v1`.
- Bilder kommen aus `cms_assets` über `cms.asset(section_key, field_key)`.
- Renderer rendert Section nur, wenn mindestens ein Feld in der gewünschten Sprache gesetzt ist. Sonst fällt die Page-Komponente auf ihre i18n-Branch zurück.

## Karten-/Listen-Regel (verbindlich seit 2026-05-21)

Neue Karten- oder listenartige Inhalte werden **nicht mehr** als flache
`items.N.*`-Felder auf der Eltern-Section angelegt, sondern als
**Kind-Sections**:

- Parent `cards_v1` → Kinder vom Typ `card_v1`
- Parent `product_scroller_v1` → Kinder vom Typ `card_v1`
- Parent `feature_grid_v1` → Kinder vom Typ `card_v1`
- Parent `download_list_v1` → Kinder vom Typ `download_item_v1`
- Parent `stats_v1` → Kinder vom Typ `stat_v1`

Für jede Karte gilt:

- eigener stabiler `section_key` (z. B. `vorteile_item_1`, `produkte_3`,
  `usecase_2`) — keine Wiederverwendung über Seiten hinweg
- eigene Whitelist-Einträge (`cms_admin_editable_fields`) je Feld DE+EN,
  damit die Karte im Admin pflegbar ist
- Felder mindestens `title`, `description` (Pflicht); optional `icon`,
  Bildslot `image` **oder** `thumbnail`, `cta_label`/`cta_href`.
  Bildslot ist **kontextabhängig**: `image` für vollflächige Karten
  (Hero-/Teaser-Stil), `thumbnail` für kleine Produktkacheln in
  Scrollern. Pro `card_v1` immer nur **einer** der beiden Slots aktiv.
  Icons sind keine `cms_assets`, sondern Text-Werte in
  `cms_section_fields.icon` (kebab-case Lucide-Namen).
- Reihenfolge über `sort_order` der Kind-Section

**Legacy** `items.N.*` darf in Bestandsdaten als Fallback / Migrationsquelle
weiter existieren, ist aber **nicht** das führende Modell für neue Seiten.
`CmsProductSolutionShell` liest Kind-Sections zuerst und fällt nur auf
`items.N.*` zurück, wenn keine Kinder vorhanden sind.



## Typen

### `hero_v1` (alt: `hero`)
**Wird vom Body-Renderer ignoriert** — Hero rendert weiterhin `CmsPageLayout`.
Felder: `headline`, `intro`, `label` (= „Eyebrow", kleines Label oberhalb der Headline)  
Asset: `image`

### `content_v1` (alt: `content`)
Einfacher Textblock mit optionalem Eyebrow.
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `label` | nein | Eyebrow (kleines Label oberhalb) |
| `title` | ja | Überschrift |
| `text` | ja | Fließtext (mehrere Absätze via `\n\n`) |

### `cards_v1`
Card-Grid (2–4 Spalten responsive). Eltern-Section.
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `label` | nein | Eyebrow |
| `title` | ja | Überschrift über dem Grid |
| `intro` | nein | Einleitungstext |

**Kind-Sections:** `card_v1` (siehe unten), Reihenfolge per `sort_order`.

### `card_v1`
Einzelne Card. Nur als Kind von `cards_v1`, `card_grid_v1`,
`catalog_filter_grid_v1`, `product_scroller_v1` oder `feature_grid_v1`.

**Textfelder** (`cms_section_fields`):
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `title` | ja | Card-Titel |
| `description` | ja | Card-Text |
| `subtitle` | nein | Optionale Zwischenzeile |
| `cta_label` | nein | Button-Text |
| `cta_href` | nein | Ziel (intern: `/...`, extern: `https://...`) |
| `icon` | nein | **Lucide-Icon-Name** als Text (kebab-case, z. B. `shield`, `key-round`). Reines Textfeld, **kein** Asset. Auflösung im Renderer via `resolveIcon(...)`. |

**Asset-Slots** (`cms_assets`, je Slot drei Viewport-Varianten `desktop`/`tablet`/`mobile`):
| field_key | Bedeutung |
|---|---|
| `image` | Normales Karten-Bild oben (vollflächige Karten, Teaser-Stil). |
| `thumbnail` | Nur in Hub-/Filtergrid-Kontexten (`card_grid_v1`, `catalog_filter_grid_v1`). |
| `icon_image` | **TCS-Bildicon / grafisches Icon** (eigene Bilddatei, kein Lucide). Renderer-Priorität siehe unten. |

**Medienmodell — eine Wahrheit pro Slot, keine Doppelbedeutungen** (festgezogen 2026-05-24, Tranche 7e):

- `icon` (Textfeld) = Lucide-Icon. Wird im Admin über den IconPicker gepflegt.
- `icon_image` (Asset) = TCS-Bildicon / grafische Bildmarke. Seit
  Tranche 8 (2026-05-24) im Medienbereich als eigener Bildslot pflegbar
  (`AssetWorkbench` listet ihn neben `image`/`thumbnail`), Renderer
  `CardsSectionV1` und `FeatureGridV1` konsumieren ihn priorisiert.
- `image` (Asset) = normales Kartenbild.
- `thumbnail` (Asset) = Hub-/Filtergrid-Kontext.

**Renderer-Priorität für Icon-Karten** (seit Tranche 8 in `CardsSectionV1` und `FeatureGridV1` aktiv):

1. `icon_image`-Asset aktiv vorhanden → Bildicon rendern (`<img>` mit `data-cms-field="icon_image"`).
2. sonst `icon`-Textfeld gesetzt → Lucide via `resolveIcon(...)`.
3. sonst Code-Fallback (Default-Icon der Komponente).

Pro `card_v1` ist jeweils **ein** Bildslot semantisch aktiv — `image`
und `thumbnail` schließen sich gegenseitig aus (Kontext entscheidet).
`icon_image` ist orthogonal zu `image`/`thumbnail` (Icon-Karten haben
i. d. R. kein zusätzliches Großbild).

### `tabs_v1`
Horizontale Tab-Navigation mit ARIA-konformen Reitern. Eltern-Section.
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `label` | nein | Eyebrow |
| `title` | nein | H2 der Sektion |
| `intro` | nein | Einleitungstext |
| `tablist_label` | nein | ARIA-aria-label des tablist-Containers |

**Kind-Sections:** `tab_v1` (siehe unten). Reihenfolge per `sort_order`. Erster Tab (kleinster sort_order) ist beim Mount aktiv. Tab-Wechsel mit Framer-Motion-Fade.

### `tab_v1`
Einzelner Tab-Reiter. Nur als Kind von `tabs_v1`.
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `tab_label` | ja | Reiter-Beschriftung |
| `title` | ja | H3 im Tab-Panel |
| `description` | nein | Italic-Untertitel |
| `vorteile.<n>.headline` | nein | Mini-Headline des n. Vorteils (n = 1..4 oder mehr) |
| `vorteile.<n>.body` | nein | Body-Text des n. Vorteils |

**Bewusste Ausnahme von der Karten-/Listen-Regel:** Vorteile sind flach als `vorteile.<n>.*`-Felder modelliert statt als `card_v1`-Enkel. Begründung: feste Struktur (max. 4 Vorteile pro Tab), keine projektweite Wiederverwendung geplant.

**Mitglieder:** noch keine — eingeführt für Etappe 4g-2 (Mobile-TK-LP Zielgruppen).


### `feature_grid_v1`
**Status: historisch / nicht mehr verwenden.** Aktuell 0× im CMS aktiv.
Renderer bleibt als Fallback erhalten. Für neue Vorteils-/Merkmal-Raster
bitte `cards_v1` verwenden — `card_v1` kann dort weiterhin Lucide-Icons
(`icon`) oder ein Bildicon (`icon_image`) tragen.
Felder identisch zu `cards_v1`.  
**Kind-Sections (falls noch vorhanden):** `card_v1` mit Feld `icon`
(Lucide-Icon-Name).

### `product_scroller_v1`
Horizontaler Scroller für Produkt-/Lösungs-Cards.
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `label` | nein | Eyebrow |
| `title` | ja | Überschrift |
| `intro` | nein | Einleitung |

**Kind-Sections:** `card_v1` mit `subtitle`, `title`, `description`. Asset: `image`.

### `download_list_v1`
**Status: technische Reserve.** Aktuell 0× im CMS aktiv. Die sichtbare
Seite `/downloads` wird heute über `cards_v1`/`content_v1` gerendert,
nicht über `download_list_v1`. Renderer bleibt für eine spätere
standardisierte Dokumentenliste erhalten.
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `title` | ja | Überschrift |
| `intro` | nein | Einleitung |

**Kind-Sections:** `download_item_v1` mit `title`, `description`, `file_label` (z. B. „PDF, 2.4 MB"), `cta_href`.

### `contact_block_v1`
**Status: technische Reserve.** Aktuell 0× im CMS aktiv. Die sichtbare
Seite `/kontakt` nutzt eine eigene Kontakt-/Formular-Struktur (kein
`contact_block_v1`). Renderer bleibt für kompakte Kontakt-Karten auf
weiteren Seiten erhalten.
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `title` | ja | Überschrift |
| `text` | nein | Beschreibung |
| `phone` | nein | Telefonnummer (E.164 bevorzugt) |
| `email` | nein | E-Mail-Adresse |
| `cta_label` | nein | Button-Text |
| `cta_href` | nein | Ziel |

### `stats_v1`
Zahlen-Band (3–4 Kennzahlen).
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `title` | nein | Überschrift |
| `intro` | nein | Einleitung |

**Kind-Sections:** `stat_v1` mit `value` (z. B. „98 %"), `label`, `description`.

**Anwendungsbeispiel — Persona-Standardseiten (seit Tranche 7b, 2026-05-24):**
Die `stats`-Section der Persona-Standardseiten (`personas.architekt`,
`personas.bauherr`, `personas.fachhandel`, `personas.fachplaner`,
`personas.handwerk`) ist als `stats_v1`-Parent mit 4 × `stat_v1`-Kindern
modelliert. Listen wie `highlights` / `solutions` / `cases` / `tools` /
`partnerServices` / `tips` sind dort als `cards_v1` + `card_v1`-Kinder
modelliert. Renderer (`usePersonaCms.txItem` / `listItems`) liest
DB-first; legacy `items.<key>.{title,desc}` der Parent-Section bleibt
als Fallback.

### `teaser_2col_v1`
Generischer 2-Spalten-Teaser mit Bild und Text. Anordnung über `image_position`-Flag steuerbar, Hintergrund über `background_variant`-Flag. Auf Mobile staplet das Layout auf eine Spalte; Text steht dann immer oben, Bild unten (Lesbarkeits-Konvention, unabhängig von `image_position`).

| field_key | Pflicht | Bedeutung |
|---|---|---|
| `label` | nein | Eyebrow |
| `title` | ja | Headline der Teaser-Sektion |
| `text` | ja | Fließtext |
| `cta_label` | nein | CTA-Beschriftung. Wird zusammen mit `cta_link` gerendert. |
| `cta_link` | nein | CTA-Ziel (intern `/...` oder extern `https://...`) |
| `image_position` | nein | Enum `left` \| `right`. Default: `right`. |
| `background_variant` | nein | Enum `default` \| `muted`. Default: `default`. `muted` rendert `bg-secondary/30`. |

Asset: `image` (Pflicht für sinnvolle Darstellung; Viewport-Varianten gemäß `asset-strategie.md`).

**Renderer-Verhalten:**
- Unbekannte oder leere Werte in `image_position` / `background_variant` fallen auf Default zurück.
- CTA wird nur gerendert, wenn `cta_label` **und** `cta_link` befüllt sind.
- Auf Mobile (< md) ist die DOM-Reihenfolge bindend (Text oben, Bild unten); `image_position` greift erst ab `md`.

**Standardmuster „Wechselteaser":** `teaser_2col_v1` ist seit 2026-05-21 das verbindliche Standardmuster für abwechselnde Bild/Text-Teaser (z. B. „Alles für die Gebäudekommunikation"). Regeln:

- pro Wechselteaser eine **eigene** Top-Level-Section vom Typ `teaser_2col_v1` mit stabilem `section_key` (z. B. `bereich_tuersprechanlagen`).
- **keine** `items.N.*`-Sammellisten unter einer Eltern-Section.
- Bild über `cms_assets`, Slot `image`, Viewport-Strategie gemäß `asset-strategie.md`.
- Reihenfolge über `cms_sections.sort_order`, Wechsel links/rechts über `image_position`.
- CTA über `cta_label` + `cta_link`, optional `background_variant`.
- Whitelist-Einträge je Feld DE+EN inkl. `image`-Slot.

**Mitglieder (Stand 2026-05-21):** `home.start` (`block_communication`, `block_access`, `block_signage`, `block_entry`, `block_solutions`, `block_consulting`); `gebaeudekommunikation.root` (`bereich_tuersprechanlagen`, `bereich_briefkastenanlagen`, `bereich_beschilderung`, `bereich_grossanlagen`, `bereich_systemloesungen`); `gebaeudekommunikation.tuersprechanlagen` (`mobile_tk`, `snipdoo`); `gebaeudekommunikation.beschilderung` (`feature_hausnummer`, `feature_materialien`, `feature_tuerschilder`, `feature_klingel`); `gebaeudekommunikation.grossanlagen` (`concierge`, `zufahrt`, `funk`, `namensanzeige`); `gebaeudekommunikation.systemloesungen` (`concierge`, `feuerwehr`, `intern`, `bidi`); `zutrittskontrolle.root` (`teaser_tueren_tore`, `teaser_fahrstuhlsteuerung`, `teaser_schliesssysteme`, `teaser_mobile_door_app`); `gebaeudemanagement.root` (`teaser_digitale_namensanzeige`, `teaser_zufahrt_parkraum`, `teaser_digital_signage`, `teaser_reservieren_buchen`, `teaser_alarmanlagenkopplung`).

**Admin-Sicht:** In der Template-Werkstatt (`/admin` → Button „Templates") ist `teaser_2col_v1` unter dem Reiter **Block-/Teaser-Templates** als eigenes Muster „Wechselteaser" geführt (Stufe 0, read-only). Im Section-Tree und in Type-Badges wird der Typ violett markiert (siehe `src/features/admin/lib/blockTypeStyle.ts`).

### `cta_v1` (alt: `cta`)
Call-to-Action-Banner.
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `title` | ja | Headline |
| `text` | nein | Subline |
| `cta_label` | ja | Button-Text |
| `cta_href` | ja | Ziel |

Asset: `image` (optional, Hintergrund)

### `rich_v1` (alt: `rich`)
**Status: technische Reserve.** Aktuell 0× im CMS aktiv. Im Standardbetrieb
werden Fließtexte über `content_v1` (Intro/Textblock) gepflegt. Renderer
bleibt für künftige Lang-/Rechtstexte erhalten (Markdown via
`react-markdown`).
| field_key | Pflicht | Bedeutung |
|---|---|---|
| `title` | nein | Optionale Überschrift |
| `body` | ja | Markdown-Quelltext |

## Aliase / Migration alter Typ-Namen

Bestehende DB-Werte werden vom Renderer transparent gemappt:

| alt | neu |
|---|---|
| `hero` | `hero_v1` (Renderer überspringt) |
| `content` | `content_v1` |
| `card_v1` | `card_v1` (unverändert) |
| `cta` | `cta_v1` |
| `rich` | `rich_v1` |
| `intro` | `content_v1` |
| `feature-grid` | `feature_grid_v1` |
| `product-scroller` | `product_scroller_v1` |
| `content_blocks_intro_v1` | `content_v1` |
| `content_block_v1` | `content_v1` |
| `stats_v1` | unverändert |
| `cta_v1` | unverändert |
| `hero_v1` | unverändert |
| `products` | `product_scroller_v1` |

Aliasing erfolgt zentral in `CmsBodyRenderer.normalizeType()`. Eine spätere DB-Migration konsolidiert die Typ-Namen, ohne den Renderer zu brechen.

## Was NICHT in der DB landet

- Layout-Wrapper (Container, Padding, Background-Farbe der Section) → bleibt im Renderer.
- Routen-Definitionen → bleiben im Code (`src/app/routes.tsx`).
- Navigation-Baum → bleibt DB-getrieben über `cms_navigation_nodes`, aber Render-Logik ist Code.
- UI-Vokabular (Button-Texte wie „Mehr erfahren", „Schließen") → bleibt i18n.

## Redaktions-Fluss-Klassen S0–S5 (Tranche 17, 2026-05-26)

Ergänzend zum Renderer-Audit (`rendertreue-audit.mjs`, R0–R5) gibt es
das Redaktions-Fluss-Audit (`redaktions-fluss-audit.mjs`), das die
Sicht des Redakteurs prüft:

| Klasse | Bedeutung |
|---|---|
| S0 OK | Sichtbare Section ist zugleich Datenquelle. |
| S1 OK-Container | Sichtbarer Karten-Container mit aktiven Karten. |
| S2 Source-only | Aktive Section liefert nur Daten für anderen sichtbaren Block. Schein-Bearbeitung. |
| S3 Legacy | `is_active = false` — nicht im normalen Fluss. |
| S4 Fehler | Aktiv, aber weder sichtbar noch als Datenquelle erkennbar. |
| S5 Spezialrenderer | Bekannte Prefix-Konvention (`persona_`, `bereich_`, `series_override_`, `solution_teaser_`). |

S2 und S4 sind Handlungsbedarf für Konsolidierungs-Tranchen.

## Iconkarten-Variantenregel (Tranche 24, 2026-05-27)

Eine `card_v1` ist nur fachlich eine „Iconkarte" — der Section-Typ
bleibt `card_v1`. Variante ergibt sich aus den gepflegten Slots:

- **Iconkarte (TCS-Bildicon)** — `cms_assets.icon_image` aktiv.
- **Iconkarte (Lucide)** — `cms_section_fields.icon` gesetzt oder
  Slot `icon_image` per Whitelist vorbereitet, aber noch leer.

Renderer-Priorität pro Karte (verbindlich, `CardsSectionV1`,
`FeatureGridV1`): `image` → `icon_image` → `icon` → kein Icon.

Iconkarten in `content_v1`-Containern oder Legacy-Listen mit
`items.*.icon` sind **keine** „Iconkarten" in diesem Sinne — sie
brauchen entweder eine Strukturmigration (Eltern auf `cards_v1`) oder
eine Renderer-Erweiterung (eigene Tranche), bevor die Variantenregel
greift.

---

## Hotfix 27b-1 (2026-05-27) — Iconkarten Anwendungen-Anforderungen

- Lucide-Icon → DB-Feld `icon` (Lucide-Name, z. B. `fence`, `accessibility`). DOM-Marker `data-cms-field="icon"`.
- TCS-Bildicon → Asset-Slot `icon_image` (PNG/SVG). DOM-Marker `data-cms-field="icon_image"`. Hat Priorität vor `icon`.
- Anwendungen-Anforderungen sind echte `card_v1`-Kindsections unter Parent `anforderungen` (jetzt Typ `cards_v1`). Pflege im Admin pro Karte über Felder `title`, `description`, `icon` + Asset `icon_image`.
- Medienbereich und Live-Vorschau benutzen denselben Marker: Vorschau-Klick auf eine Karte trifft genau den `<span>`, der das tatsächlich gerenderte Icon trägt.
- Legacy `<key>.label/.text/.icon` im content_v1-Sammelblock bleibt nur Fallback und wird nicht mehr empfohlen.
