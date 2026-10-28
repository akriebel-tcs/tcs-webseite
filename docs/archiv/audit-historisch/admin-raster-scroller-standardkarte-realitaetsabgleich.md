# Admin-Realitätsabgleich: Kartenraster, Kartenscroller, Standardkarte (UI-only)

Stand: 2026-06-01
Sprint: `cms-light-admin-realitaetsabgleich-raster-scroller-standardkarte-1`

## A. Kurzfazit

- Der Admin spricht jetzt durchgehend von **Kartenraster**, **Kartenscroller** und **Standardkarte**.
- `card_v1` wird im Baum nicht mehr pauschal als „Bildkarte" gelabelt — Grundlabel ist **Standardkarte**, Bild/Icon/Features/Links erscheinen als **Modulhinweise** im Tooltip.
- „Bild fehlt"-Warnungen erscheinen **nur noch container-abhängig**: im Kartenscroller (Pflichtbild), im Hub-/Filter-Raster fehlt ggf. „Thumbnail", im Feature-Raster „Icon". Im Kartenraster ist eine Textkarte ohne Bild legitim — keine Warnung.
- Technische Begriffe (`cards_v1`, `product_scroller_v1`, …) bleiben im Tooltip / Detail sichtbar.
- Echte Unstimmigkeit im Vorgänger-Modulmodell aufgedeckt und korrigiert: `CardsSectionV1` rendert in Wirklichkeit auch `subtitle` (eyebrow), `icon_image`, Lucide-`icon`, `features.*` und CTA — nicht nur `title/description/image/cta`. `containerLayoutRules.ts` ist entsprechend nachgezogen.
- Keine DB-/Migration-/RPC-/Whitelist-/i18n-/Public-/Produktdatenbank-/Renderer-Änderung.

## B. Redaktionelle Begriffe (verbindlich im Admin)

| Technisch | Redaktionell im Admin | Bedeutung |
|---|---|---|
| `cards_v1` | **Kartenraster** | Standardkarten in 1–3 Spalten. Bild empfohlen, Textkarte legitim. |
| `product_scroller_v1` | **Kartenscroller** | Horizontal scrollende Standardkarten mit 4:3-Bild. Bild praktisch Pflicht. |
| `card_grid_v1` | **Hub-Raster** | Hub-Übersicht, Karten zeigen `thumbnail`. |
| `catalog_filter_grid_v1` | **Produktfilter-Raster** | Gefilterte Produktübersicht, `thumbnail`. |
| `feature_grid_v1` | **Feature-/Icon-Raster** | Iconkarten (TCS-Bildicon oder Lucide). |
| `download_list_v1` | **Download-Liste** | Liest aktuell `download_item_v1`, keine Karten. |
| `card_v1` | **Standardkarte** | Eine einzelne Karte; sichtbare Module bestimmt der Container darüber. |

## C. Befund B-71 (`zutrittskontrolle.tueren-tore`)

- page_key: `zutrittskontrolle.tueren-tore`
- B-71 `products` — `section_type = cards_v1` → **Kartenraster** (nicht Scroller).
- Renderer: `CardsSectionV1` (`src/features/cms/components/sections/CardsSectionV1.tsx`).
- Öffentlich: 3-spaltiges Raster mit 4:3-Bildern (kein horizontaler Scroller). Der frühere Admin-Hint „wirkt wie Scroller" stimmte fachlich nicht — der Renderer ist eindeutig ein Raster.

Kind-Karten (alle `card_v1`, Parent B-71):

| B-ID | section_key | image-Asset? | Bewertung neu |
|---|---|---|---|
| B-583 | card_drueckergarnitur | ja | OK |
| B-584 | card_knaufzylinder | ja | OK |
| B-585 | card_onlineleser | ja | OK |
| B-586 | card_offlineleser | ja | OK |
| B-1237 | card_minicloud | **nein** | Standardkarte ohne Bild. Im Raster legitim (Textkarte), erscheint aber neben 6 Bildkarten optisch leer. **Keine harte Warnung** mehr im Admin — Hinweis „noch keine Module aktiv außer Titel/Beschreibung". |
| B-587 | card_handsender | ja | OK |
| B-588 | card_biometrie | ja | OK |

Zweiter Container auf derselben Seite: B-72 `benefits` (`cards_v1` → Kartenraster) mit 4 Standardkarten (B-1238–B-1241) ohne Bild. Das ist ein klassisches Vorteile-Raster mit Textkarten — **keine Lücke**.

Vergleichsfall Scroller: **B-538** `card_pak` liegt unter B-26 `aussenstationen` (`product_scroller_v1`) auf `gebaeudekommunikation.tuersprechanlagen` — dort ist Bild Pflicht und eine Warnung „Bild fehlt" wäre fachlich richtig.

## D. Bildstatus-Logik (neu)

| Parent-Container | Karte ohne Bild | Anzeige im Admin |
|---|---|---|
| `product_scroller_v1` (Kartenscroller) | echt fehlend | **Warnung „Bild fehlt"** + Hint, dass der Scroller ein 4:3-Bild erwartet. |
| `cards_v1` (Kartenraster) | legitim | Kein Warn-Badge. Hint sagt: „Bild empfohlen, aber nicht Pflicht." |
| `card_grid_v1` / `catalog_filter_grid_v1` (Hub-/Filter-Raster) | Thumbnail fehlt | **Warnung „Thumbnail fehlt"** — Container liest `thumbnail`, nicht `image`. |
| `feature_grid_v1` (Feature-/Icon-Raster) | weder `icon_image` noch Lucide-`icon` | **Warnung „Icon fehlt"**. |
| `download_list_v1` | n/a | **Warnung „Container ignoriert Karte"** — Renderer liest nur `download_item_v1`. |
| kein Parent | n/a | **Warnung „kein Container"**. |

Bewusst NICHT umgesetzt: Asset-Datei-Erreichbarkeit (HTTP-Check). Wenn ein Bild-Asset DB-seitig existiert, gilt es als „aktiv". Eine kaputte/404-Datei aufzuspüren wäre ein eigener Health-Check-Sprint.

## E. Admin-Akkordeons — wo sichtbar?

Stichprobe aus dem Auftrag:

| B-ID | Seite | Parent | Workspace im Admin |
|---|---|---|---|
| B-583 (card_drueckergarnitur) | zutrittskontrolle.tueren-tore | cards_v1 | **CardFieldsWorkspace** (neue Akkordeons) |
| B-584 (card_knaufzylinder) | zutrittskontrolle.tueren-tore | cards_v1 | **CardFieldsWorkspace** |
| B-1237 (card_minicloud) | zutrittskontrolle.tueren-tore | cards_v1 | **CardFieldsWorkspace** |
| B-538 (card_pak) | gebaeudekommunikation.tuersprechanlagen | product_scroller_v1 | **BildkartenCardWorkspace** (Pilot — exklusiv für diese Seite, greift vor `CardFieldsWorkspace`) |

Sichtbarkeitsregel im `PageEditor`: Pilot-Pfad (`BildkartenCardWorkspace`) gilt nur für `gebaeudekommunikation.tuersprechanlagen`. Auf allen anderen Seiten erhalten `card_v1`-Sections automatisch den neuen `CardFieldsWorkspace` mit 6 redaktionellen Akkordeon-Gruppen. Vorschau/Harness könnte einen alten Build zeigen, wenn die Seite nicht neu geladen wird — das ist kein Code-Bug.

## F. Umgesetzte UI-only Änderungen

1. **`src/features/admin/lib/blockTypeStyle.ts`**
   - `card_v1` → Label **„Standardkarte"** mit neuer Beschreibung.
   - `cards_v1` → **„Kartenraster"** (statt „Karten-Container").
   - `product_scroller_v1` → **„Kartenscroller"** (statt „Scroller").
   - `feature_grid_v1` → **„Feature-/Icon-Raster"** (statt „Feature-Raster").
   - Neue Aliase + Spezial-Labels für `card_grid_v1` → „Hub-Raster", `catalog_filter_grid_v1` → „Produktfilter-Raster", `download_list_v1` → „Download-Liste".

2. **`src/features/admin/lib/editorialSectionKind.ts`**
   - `EditorialKind` um `standardkarte`, `kartenraster`, `kartenscroller`, `hub-raster`, `produktfilter-raster`, `feature-icon-raster`, `download-liste` erweitert (alte Werte bleiben für Rückwärtskompatibilität bestehen).
   - `classifyCard()` neu: Grundlabel immer „Standardkarte"; Hint listet aktive Module („Bild aktiv", „Icon aktiv (Lucide)", „Features aktiv", …) und beschreibt Container-Erwartung.
   - Warnungen container-abhängig: „Bild fehlt" nur im Kartenscroller, „Thumbnail fehlt" in Hub-/Filter-Raster, „Icon fehlt" im Feature-Raster, „Container ignoriert Karte" in Download-Liste, „kein Container" bei Top-Level.
   - Container-Switch um `product_scroller_v1`, `feature_grid_v1`, `download_list_v1` ergänzt; `cards_v1`/`card_grid_v1`/`catalog_filter_grid_v1` haben jeweils eigenes Label (statt „Kartencontainer").

3. **`src/features/admin/lib/containerLayoutRules.ts`**
   - `cards_v1.label` → „Kartenraster".
   - `cards_v1.effective_modules` korrigiert auf Renderer-Realität: `title, description, eyebrow, image, icon_image, icon_lucide, features, cta` (vorher fälschlich nur `title, description, image, cta`).
   - `cards_v1.ignored_modules` reduziert auf `thumbnail, links, download`.
   - `product_scroller_v1.label` → „Kartenscroller".

`CardPresetBadge`, `CardFieldsWorkspace` und `PageEditor` profitieren automatisch von den korrigierten Container-Regeln — keine Änderung dort nötig.

## G. Offene Punkte

1. Pro-Feld-Wirksamkeitsmarkierung im `CardFieldsWorkspace` (z. B. „dieses Feld wird im aktuellen Container nicht gerendert"). Eigener Sprint.
2. Health-Check für tatsächliche Bild-URL-Erreichbarkeit (404, leere Datei). Eigener Sprint.
3. Renderer-Entscheidung für `links` (Multi-Link-Karte) und `download`-Modul bleibt offen.
4. Pilot-Workspace `BildkartenCardWorkspace` und neuer `CardFieldsWorkspace` laufen parallel — Konsolidierung erst nach Workspace-Roll-out für `teaser_2col_v1`/`hero_v1`.

## H. Nächste Schritte

**Empfehlung:** `cms-light-baustein-workspaces-wechselteaser-hero-content-1` — Akkordeon-Workspaces für `teaser_2col_v1`, `hero_v1` und `content_v1` nach demselben Muster wie `CardFieldsWorkspace`.

## I. Audits (2026-06-01, nach Änderung)

- `cms:audit:contract` → **15 OK · 7 Warnung · 0 Konflikt** (unverändert).
- `cms:audit:contract-drift` → stabil.
- `cms:audit:renderer-fallback-inventory` → 82 Pages, G0=2 · G1=4 · S1=54 · S2=19 · S3=2 · P1=1 (unverändert).
- `tsc --noEmit` grün.
- `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).

## J. Scope-Bestätigung

- Keine DB-Änderung. Keine Migration. Keine neue RPC.
- Keine Inhalte, Bilder oder Feldwerte überschrieben.
- Keine Whitelist gelöscht / deaktiviert / verändert.
- Keine i18n-Datei verändert.
- Keine Public-Renderer-, Routen-, Navigations-, Footer- oder Breadcrumb-Änderung.
- Keine Produktdatenbank berührt. Keine automatische Kartenmigration. Keine neuen Section-Type-Familien. Kein Seeding.
- Geänderte Dateien (alle UI-only): `src/features/admin/lib/blockTypeStyle.ts`, `src/features/admin/lib/editorialSectionKind.ts`, `src/features/admin/lib/containerLayoutRules.ts`, `docs/04-betrieb/admin-raster-scroller-standardkarte-realitaetsabgleich.md` (neu), `docs/current-status.md`.
