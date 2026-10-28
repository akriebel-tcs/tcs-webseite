# Standardkarte: Modulmodell statt Kartenvarianten (read-only)

Stand: 2026-06-01
Sprint: `cms-light-standardkarte-modulmodell-statt-kartenvarianten-1`

## A. Kurzfazit

- `card_v1` bleibt der **einzige technische Kartentyp**. Es wird kein neuer Section-Type angelegt.
- Die Karte wird ab jetzt fachlich/technisch über **Module** beschrieben: `eyebrow`, `title`, `description`, `image`, `thumbnail`, `icon_lucide`, `icon_image`, `features`, `links`, `cta`, `download`.
- Die bisherigen Presets (`image_card`, `thumbnail_card`, `icon_card_lucide`, `icon_card_image`, `multi_link_card`, `text_card`, `download_card`) bleiben — aber als **redaktionelle Startzustände/Ansichten**, nicht als starre Typen.
- Der **Container entscheidet**, welche Module der Karte heute wirklich gerendert werden. Was nicht wirksam ist, ist Pflege-Verschwendung — aber kein Fehler.
- Im Admin macht `CardPresetBadge` jetzt sichtbar: Container, Layout, Bildslot, **wirksame Module · vorhandene aber ignorierte Module · empfohlene noch leere Module · Preset-Pflichtmodule, die fehlen**.
- **Karten ohne Bild werden nicht pauschal als Fehler bewertet** — eine Textkarte ist eine legitime Standardkarte ohne Bildmodul.
- Keine DB-Änderung, keine Migration, keine RPC, keine Inhalte/Bilder/Whitelist/i18n/Public-Renderer/Produktdatenbank verändert. Keine neuen Section-Type-Familien.

## B. Standardkarten-Module (Vertrag in `src/features/cms/contract/cardModules.ts`)

| Modul | Textfelder | Asset-Slots | Toggles | Renderer-Support | Wirksam in Containern |
|---|---|---|---|---|---|
| `eyebrow` | `eyebrow`, `subtitle`, `kicker`, `label`, `subline` | — | `eyebrow_enabled`, `subtitle_enabled` | container-spezifisch | `product_scroller_v1` (Spezialrenderer) |
| `title` | `title`, `headline` | — | `headline_enabled` | unterstützt | alle 6 Container |
| `description` | `description`, `beschreibung`, `desc`, `text`, `body` | — | `beschreibung_enabled`, `description_enabled` | unterstützt | alle 6 Container |
| `image` | — | `image` | — | container-spezifisch | `cards_v1`, `product_scroller_v1` |
| `thumbnail` | — | `thumbnail` | — | container-spezifisch | `card_grid_v1`, `catalog_filter_grid_v1` |
| `icon_lucide` | `icon` | — | — | container-spezifisch | `feature_grid_v1` |
| `icon_image` | — | `icon_image` | — | container-spezifisch | `feature_grid_v1` |
| `features` | `features.0`–`features.4` | — | — | container-spezifisch | `feature_grid_v1` |
| `links` | `link_1_*`, `link_2_*`, `link_3_*` | — | — | **offen** | — (Klärpunkt) |
| `cta` | `cta_label`, `cta_href`, `href` | — | — | unterstützt | `cards_v1`, `product_scroller_v1`, `card_grid_v1`, `catalog_filter_grid_v1` |
| `download` | `cta_label`, `cta_href` | — | — | **offen** | — (Klärpunkt, Renderer-Migration nötig) |

Wichtig:
- `tags.0..4` ist **bewusst nicht** als Modul aufgenommen — bleibt offener Klärpunkt bis Renderer + Whitelist gleichzeitig nachgezogen werden.
- Keine neuen DB-Felder, keine Whitelist-Änderung. Die Liste beschreibt nur, was im Bestand vorkommt.

## C. Preset → Module (redaktionelle Startzustände)

| Preset | Pflicht-Module (Startzustand) | Optional | Bewusst nicht im Preset |
|---|---|---|---|
| `image_card` | `title`, `image` | `eyebrow`, `description`, `cta` | thumbnail, icon_*, features, links, download |
| `thumbnail_card` | `title`, `thumbnail` | `description`, `cta` | eyebrow, image, icon_*, features, links, download |
| `icon_card_lucide` | `title`, `icon_lucide` | `description`, `features` | image, thumbnail, icon_image, links, cta, download, eyebrow |
| `icon_card_image` | `title`, `icon_image` | `description`, `features` | image, thumbnail, icon_lucide, links, cta, download, eyebrow |
| `multi_link_card` | `title`, `links` | `description`, `eyebrow` | image, thumbnail, icon_*, features, cta, download |
| `text_card` | `title`, `description` | `eyebrow`, `cta` | image, thumbnail, icon_*, features, links, download |
| `download_card` | `title`, `download` | `description` | image, thumbnail, icon_*, features, links, cta, eyebrow |

Lesart:
- „Startzustand" heißt: Wenn du dieses Preset in der Redaktion meinst, gehören diese Module zuerst dazu.
- Optional = darf gepflegt werden, der Container darüber entscheidet aber, ob es sichtbar wird.
- „Bewusst nicht im Preset" verhindert nicht das Speichern — markiert nur, dass es atypisch ist.

## D. Container → wirksame Module (aus Renderern abgelesen)

| Container | Layout | Wirksame Module | Ignorierte Module | Empfohlene Module |
|---|---|---|---|---|
| `cards_v1` | 4:3-Raster | title · description · image · cta | eyebrow · thumbnail · icon_* · features · links · download | title · description · image |
| `product_scroller_v1` | Snap-Scroller | eyebrow · title · description · image · cta | thumbnail · icon_* · features · links · download | title · description · image |
| `card_grid_v1` | Hub-Grid | title · description · thumbnail · cta | eyebrow · image · icon_* · features · links · download | title · thumbnail |
| `catalog_filter_grid_v1` | Filter-Grid | title · description · thumbnail · cta | eyebrow · image · icon_* · features · links · download | title · thumbnail |
| `feature_grid_v1` | Iconkarten-Grid | title · description · icon_lucide · icon_image · features | eyebrow · image · thumbnail · links · cta · download | title · description · icon_image |
| `download_list_v1` | Liste | title · description · download | eyebrow · image · thumbnail · icon_* · features · links · cta | title · download |

Hinweise:
- `download_list_v1` rendert heute nur `download_item_v1`-Kinder. `card_v1` als Download-Kind ist Plan, kein Status.
- `links` (Multi-Link) ist in keinem heutigen Container produktiv — Klärpunkt.

## E. Aktive Karten — Bewertung mit Modul-Brille (DB 2026-06-01)

Aktiv: **701 `card_v1`** gesamt.

| Parent | Karten | Bild-Asset | Thumb-Asset | Lucide-Icon | Features mit Wert | CTA-Label mit Wert | Bewertung |
|---|---:|---:|---:|---:|---:|---:|---|
| `cards_v1` | 639 | 70 | 0 | — | 10 | 7 | Bildmodul empfohlen, aber **569 als Textkarte legitim**. `link_N`/`features.*` als leere Felder vorhanden, aber Renderer ignoriert sie → kein Datenverlust, kein Fehler. |
| `product_scroller_v1` | 33 | 31 | 0 | — | — | — | OK — 2 Karten ohne Bild sind Inhaltslücke (Scroller erwartet Bildkarten). |
| `catalog_filter_grid_v1` | 18 | 0 | 18 | — | — | — | OK — Thumbnail-Modul wirksam. |
| `card_grid_v1` | 3 | 0 | 3 | — | — | — | OK. |
| `feature_grid_v1` | 4 | 0 | 0 | 4 | 4 | — | OK — Lucide-Iconmodul aktiv. |
| (top-level) | 4 | 0 | 4 | — | — | — | **Drift** — `card_v1` ohne Container hat keine wirksamen Module. Manuell prüfen. |

Konkrete Drift-Fälle (Modul vorhanden, Container ignoriert ihn):
- `cards_v1` mit befüllten `features.*`: **10** Karten (Features-Modul vorhanden, Container rendert es nicht).
- `cards_v1` mit befüllten `link_N_*`: **0** Karten (alle leer — keine echte Pflege-Verschwendung).
- `card_grid_v1`/`feature_grid_v1` mit `image`-Asset: **0**.
- `product_scroller_v1` ohne `image`-Asset: **2** Karten — Inhaltslücke (Scroller will Bildkarte).

Konsequenz: Die 570 „Bildkarten ohne Bild" aus dem Vorgängerbericht reduzieren sich auf:
- **2** echte Inhaltslücken im Scroller,
- **569** legitime Textkarten in `cards_v1`,
- **10** Karten mit Pflege-Verschwendung in `features.*`,
- **4** top-level-Karten ohne Container.

## F. Admin-Anzeige (UI-only)

`CardPresetBadge` zeigt jetzt unterhalb von Preset/Container/Layout zusätzlich:

- **Wirksam & aktiv:** Module, deren Felder/Assets gefüllt sind UND vom Container gerendert werden.
- **Vorhanden, aber von diesem Container nicht gerendert:** gelber Hinweis. Pflege verpufft.
- **Für diesen Container empfohlen, aber noch leer:** neutraler Hinweis — kein Fehler, nur Empfehlung.
- **Preset-Startzustand erwartet:** wenn der erkannte Startzustand Module verlangt, die heute nicht aktiv sind.

Bewusst NICHT umgesetzt:
- Keine globale Feld-Ausblendung im Workspace. Der `CardFieldsWorkspace` zeigt weiter alle DB-Felder. Hinweistext im Akkordeon-Header bleibt unverändert — eine feinere Pro-Feld-Kennzeichnung („wirksam / nicht wirksam / Legacy") ist als nächste Etappe vorgesehen, würde aber jeden Feldknoten umbauen.
- Kein Preset-Wechsel-Button. Preset bleibt Ableitung aus Container + Slot + Feldern.
- Keine Schreibwege geändert. Keine Whitelist-Eingriffe.

## G. Offene Entscheidungen

1. **`links`-Modul (Multi-Link-Karte)** — Renderer-Unterstützung fehlt heute. Entweder Preset zurückbauen oder Renderer einbauen.
2. **`download`-Modul** — `download_list_v1` rendert weiter `download_item_v1`. Migration auf `card_v1` ist Plan, nicht Status; Datei-Asset-Modell offen.
3. **`eyebrow` in `cards_v1`/`card_grid_v1`** — Renderer zeigt es heute nicht. Entweder als wirksam ergänzen (Renderer-Etappe) oder im Admin als „nur Pflege, nicht sichtbar" markieren.
4. **Pro-Feld-Wirksamkeit im Workspace** — wenn das gewünscht ist, eigene Etappe (jeder Field-Render-Knoten bekommt eine Wirksamkeits-Badge).
5. **`tags.0..4`** — bleibt Klärpunkt, kein Modul.

## H. Empfohlene nächste Schritte

- **Nächste Etappe:** `cms-light-standardkarte-modulreview-und-seedings-klein-1` — kleine, gezielte Seedings auf Basis der Modul-Brille:
  - 2 Scroller-Karten ohne Bild fachlich prüfen.
  - 10 `cards_v1`-Karten mit `features.*`-Werten redaktionell sichten (Container wechseln, Werte als Text in `description` übernehmen oder bewusst lassen).
  - 4 top-level-Karten kuratieren.
- Renderer-Entscheidung zu `links` und `eyebrow in cards_v1` als eigene Etappe planen (UI bleibt sonst dauerhaft mit „Hinweis: nicht wirksam" markiert).
- Erst danach Pro-Feld-Wirksamkeit im `CardFieldsWorkspace`.

## I. Scope-Bestätigung

- Keine DB-Änderung. Keine Migration. Keine neue RPC.
- Keine Inhalte / Bilder / Feldwerte geändert.
- Keine Whitelist geändert. Keine i18n-Dateien geändert.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung.
- Keine Produktdatenbank berührt. Keine automatische Kartenmigration.
- Code-Änderungen ausschließlich:
  - **neu** `src/features/cms/contract/cardModules.ts` (read-only Modul-Vertrag)
  - **erweitert** `src/features/admin/lib/containerLayoutRules.ts` (Module pro Container)
  - **erweitert** `src/features/admin/components/CardPresetBadge.tsx` (Modulanzeige UI-only)
- Audits 2026-06-01 stabil:
  - `cms:audit:contract` 15 OK · 7 Warnung · 0 Konflikt
  - `cms:audit:contract-drift` D1=0 · D8=0 (unverändert)
  - `cms:audit:d3-d5-triage` D3=2004 / D5=2000 (unverändert)
  - `cms:audit:renderer-fallback-inventory` 82 Pages · G0=2 · G1=4 · S1=54 · S2=19 · S3=2 · P1=1
- `tsc --noEmit` grün. `npm run build` nicht manuell ausgeführt (Lovable-Harness baut automatisch).
