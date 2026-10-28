# Template-Konsolidierungs-Audit (Tranche 11 → 13)

Stand: 2026-05-24 — **Tranche 13 abgeschlossen, Template-Palette eingefroren.**

Tranche 12 hat 12 von 13 Klasse-B/C-Sections auf `card_v1`-Kindsections
migriert. Tranche 12-renderer hat die zugehörigen Renderer DB-first
angeschlossen. Tranche 13 hat re-auditiert und die zwei offenen
Klasse-G-Fälle fachlich entschieden — **ohne Migration, ohne Renderer-
Umbau, ohne neue Section-Typen**.

## Tranche 13 — Rest-G-Klärung + Palette-Freeze (2026-05-24)

### Re-Audit: versteckte Karten-/Iconkarten-Sammelblöcke

DB-Scan (aktive `content_v1`/`feature_grid_v1`/`cards_v1`/`card_grid_v1`
auf published+active Pages, ohne aktive Kinder, mit ≥2 `items.*`-Items):

| page_key | section_key | items | Befund |
|---|---|---:|---|
| `gebaeudekommunikation.snipdoo-ip` | `subnav` | 9 | **Subnavigation**, kein Kartenfall |
| `gebaeudemanagement.digitale-namensanzeige` | `subnav` | 5 | **Subnavigation**, kein Kartenfall |
| `gebaeudemanagement.schraenke-behaelter` | `subnav` | 2 | **Subnavigation**, kein Kartenfall |
| `gebaeudekommunikation.beschilderung` | `features` | 4 | siehe G-Fall 2 unten — bereits als `teaser_2col_v1` umgesetzt |
| `gebaeudekommunikation.grossanlagen` | `leistungen` | 3 | siehe G-Fall 1 unten — bewusster Sonderfall |
| `eingangssysteme.standards` | `downloads` | 3 | bereits in Klasse G (Tranche 12g/12h-Thema) |

**Ergebnis:** **Keine neuen versteckten Karten-/Iconkartenbereiche.** Die
drei `subnav`-Sections sind technische Subnavigations-Daten und kein
Kartenmuster. Alle redaktionell relevanten Karten-Sammelblöcke sind
entweder durch Tranche 12 migriert oder bewusst als Sonderfall geführt.

### Rest-G-Fall 1 — `gebaeudekommunikation.grossanlagen.leistungen`

- DB: `content_v1`, 3 Items (`kommunikation`, `steuerung`, `zutritt`),
  Feldmuster `items.<k>.title` + `items.<k>.items.0/1/2` (Titel **plus**
  drei verschachtelte Sub-Bullets je Item).
- Renderer: `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx`
  (Z. 140 ff.) — iteriert `leistungenKeys` und liest `items.${key}.title`
  + `items.${key}.items` (Array via `returnObjects: true`) aus i18n.
- Layout: Titel + Bullet-Liste je Spalte, kein Bild, kein Icon.

**Entscheidung:** **Echter Sonderbereich, keine Migration.** Begründung:
das Muster „Titel + n Sub-Bullets pro Item" ist kein flacher
`card_v1`-Standardfall. Eine Abbildung als `card_v1`+`description` würde
die Listenstruktur platt machen; eine Abbildung als
`card_v1`+`features.0..N` würde ein neues Feldmuster im Katalog
einführen, ohne dass es andere Mitglieder gibt — verstößt gegen „keine
neuen Section-Typen / Feldmuster ohne Bedarf".

**Offene Entscheidungsfrage für Marketing/Redaktion** (vor evtl. späterer
Migration zu klären):
> Sollen die drei Leistungsbereiche der Großanlagen weiterhin als
> Titel + Bulletliste dargestellt werden, oder sollen sie zu drei
> Standardkarten mit Fließtext werden? — Bulletliste: Sonderfall behalten.
> Fließtext: zu `cards_v1`+`card_v1`+`description` migrieren.

### Rest-G-Fall 2 — `gebaeudekommunikation.beschilderung.features`

- DB: `content_v1`, 4 Items (`hausnummer`, `materialien`, `tuerschilder`,
  `klingel`), Feldmuster `items.<k>.title` + `items.<k>.text` +
  `items.<k>.imageAlt`.
- **Renderer-Realität** (`src/features/signage/pages/BeschilderungPage.tsx`):
  Die Items werden **nicht** mehr aus `items.*` gerendert. Stattdessen
  iteriert der Renderer die vier eigenständigen `teaser_2col_v1`-Sections
  `feature_hausnummer`, `feature_materialien`, `feature_tuerschilder`,
  `feature_klingel` über `<Teaser2ColV1>`. Die `features`-Parent-Section
  liefert nur noch `label`/`title`/`intro`.

**Entscheidung:** **Bereits zur Standardpalette migriert (Wechselteaser).**
Die `items.*`-Felder auf `features` sind verwaiste Legacy-Daten und
gehören in Tranche 12f (Legacy-Cleanup). **Kein G-Fall mehr.**

### Status der G-Liste nach Tranche 13

- `grossanlagen.leistungen` → **F (Sonderbereich)**, dokumentiert mit Entscheidungsfrage.
- `beschilderung.features` → **A (bereits Standard)**, Cleanup-Kandidat für 12f.
- `*.kopie`-Seiten, inaktive `root`-Sections, `eingangssysteme.standards.downloads`
  bleiben **G** mit eigenen Folgetranchen (12g/12h).

### Eingefrorene Standard-Kartenpalette für Redaktion

| Kartenart | Section-Typen | Pflege im Admin |
|---|---|---|
| Bildkarte | `cards_v1` + `card_v1` + Asset `image` | Titel, Beschreibung, optional CTA, Bild |
| Iconkarte (Lucide) | `cards_v1` / `feature_grid_v1` + `card_v1` + Feld `icon` | Titel, Beschreibung, Lucide-Iconname (Textfeld) |
| Iconkarte (TCS-Bildicon) | `cards_v1` / `feature_grid_v1` + `card_v1` + Asset `icon_image` | wie oben + Bildicon-Slot. Renderer-Priorität: `icon_image` → `icon` → Code |
| Wechselteaser | `teaser_2col_v1` + Asset `image` | Titel, Text, CTA, Bild, Bild-Position, Hintergrund |
| Kennzahlen | `stats_v1` + `stat_v1` | Wert, Label, optional Beschreibung |
| CTA / Kontakt | `cta_v1` / `contact_block_v1` | Standardfelder |
| Spezialblock | nur mit fachlicher Begründung | F-Klasse, dokumentationspflichtig |

**Keine neuen Section-Typen, keine neuen Sonderkarten.** Bestehende
Palette deckt alle in den Audits gefundenen Fälle ab.

### Admin-/Redaktionssicht — Stichproben-Check

- Bildkarte (`presse.root.releases__bcm2025`): einzelne `card_v1`-Section,
  Felder `title`/`subtitle` pflegbar (DE+EN-Whitelist aus Tranche 12),
  Bildslot `image` whitelistet.
- Iconkarte Lucide (`gebaeudekommunikation.tuersprechanlagen.vorteile__sicherheit`):
  einzelne `card_v1`-Section, `icon`-Textfeld pflegbar.
- Karte mit `icon_image` (`gebaeudekommunikation.grossanlagen.*` per Tranche 8):
  AssetWorkbench listet `icon_image` mit Badge „TCS-Bildicon".
- Wechselteaser (`gebaeudekommunikation.beschilderung.feature_hausnummer`):
  einzelne `teaser_2col_v1`-Section mit `image`-Slot.
- G-Fall `grossanlagen.leistungen`: bleibt als Container sichtbar,
  Items leben in i18n — dokumentiert als Sonderbereich, keine
  irreführende „Karte editieren"-UI.

### Verbleibend offene Folgetranchen
12f (Cleanup Legacy `items.*`), 12g (`*.kopie`-Seiten),
12h (inaktive `root`-Sections).

### Checks (Tranche 13)
- `npx tsc --noEmit`: OK
- `npm run i18n:check`: OK (75 Seiten, 0 Fehler, 0 Warnungen)
- `node scripts/cms/medien-konsistenz-audit.mjs`: **A 36 · B 0 · C 0 · D 0 · E 0 · F 0**

### Scope-Bestätigung (Tranche 13)
- Keine Migration, kein Renderer-Umbau.
- Keine neuen Section-Typen, keine neuen Sonderkarten.
- Produktdatenbank, Public-Navigation/Routen/Footer/i18n-JSONs nicht berührt.
- Keine Assets hochgeladen/gelöscht/deaktiviert.
- Beide Rest-G-Fälle nicht geraten — eindeutig oder dokumentiert.

---



> **Abgrenzung**
> „Medien-/Karten-Audit sauber" (A 36 · B 0 · C 0 · D 0 · E 0 · F 0)
> heißt: die bekannten Konsistenzklassen sind technisch in Ordnung
> (Bildslots, DOM-Marker, `card_v1`-Kinder, Renderer-Pfade). Es heißt
> **nicht**, dass fachlich alle kartig wirkenden Bereiche bereits über
> die Standardpalette laufen. Dieses Audit ist die nächste Ebene.

## 1. Audit-Zahlen

- Medien-/Karten-Audit (`scripts/cms/medien-konsistenz-audit.mjs`):
  **A 36 · B 0 · C 0 · D 0 · E 0 · F 0** — unverändert seit Tranche 9.
- Section-Typen aktuell in DB:

| Typ | gesamt | aktiv |
| --- | ---: | ---: |
| `card_v1` | 611 | 585 |
| `content_v1` | 271 | 266 |
| `cards_v1` | 102 | 89 |
| `hero_v1` | 92 | 92 |
| `teaser_2col_v1` | 68 | 65 |
| `stat_v1` | 32 | 32 |
| `series_override_v1` | 30 | 30 |
| `list_v1` | 24 | 24 |
| `product_scroller_v1` | 8 | 8 |
| `stats_v1` | 8 | 8 |
| `rich_v1` | 7 | 7 |
| `catalog_filter_grid_v1` | 4 | 4 |
| `tab_v1` | 4 | 4 |
| `faq_v1` | 3 | 3 |
| `cta_v1` / `card_grid_v1` / `feature_grid_v1` / `tabs_v1` / `role_tabs_v1` / `series_override_container_v1` | je 1 | je 1 |

Auffällig: **266** aktive `content_v1` und **24** `list_v1` — beide Typen
sind fachlich teilweise „verkappte Kartenbereiche".

## 2. Standard-Zielpalette (Soll)

| Klasse | Standardtyp(en) |
| --- | --- |
| Bildkarte | `cards_v1` + `card_v1` + Asset `image` |
| Iconkarte (Lucide) | `cards_v1` / `feature_grid_v1` + `card_v1` + Feld `icon` |
| Iconkarte (TCS-Grafik) | `cards_v1` / `feature_grid_v1` + `card_v1` + Asset `icon_image` |
| Wechselteaser | `teaser_2col_v1` + Asset `image` |
| Kennzahlen | `stats_v1` + `stat_v1` |
| Produkt-Karten-Slider | `product_scroller_v1` + `card_v1` |
| Filter-Grid | `catalog_filter_grid_v1` + `card_v1` + Asset `thumbnail` |
| Reiter | `tabs_v1` + `tab_v1` (oder `role_tabs_v1` für Persona-Tabs) |
| Lange Texte | `rich_v1` |
| Call-to-Action | `cta_v1` |
| Kontaktblock | `contact_block_v1` |
| Echte Spezialblöcke | je eigener Typ, begründet (z. B. `role_tabs_v1`, FAQ, Stats) |

**Empfehlung**: keine neuen Typen anlegen. Bestehende Palette reicht für
alle in diesem Audit gefundenen Fälle. Vorschläge für neue Typen werden
explizit nicht ausgesprochen.

## 3. Klassifizierung der gefundenen Bereiche

### A — Bereits Standard
Alle `card_v1`-Kinder unter `cards_v1` / `feature_grid_v1` /
`catalog_filter_grid_v1` / `product_scroller_v1` (Mehrheit). Auch alle
`stats_v1` / `stat_v1`, alle `teaser_2col_v1`, `hero_v1`, `rich_v1`,
`cta_v1`, `tabs_v1` / `tab_v1`, `role_tabs_v1` (Spezialfall snipdoo-ip).

### B — Eindeutige Bildkarten (zu `cards_v1` + `card_v1` + `image`)
*(aktive `content_v1` ohne Kindsections, Feldmuster mit Titel + Beschreibung,
mutmaßlich später mit Bild)*

| page_key | section_key | Items | Felder |
| --- | --- | ---: | --- |
| `presse.root` | `releases` | 5 | nur `title` (Pressemeldungen) |
| `gebaeudekommunikation.tuersprechanlagen` | `anwendungsumfelder` | 3 | nur `title` |

*Risiko*: niedrig. Layout heute textlastig — Bildslot wird ergänzt, ist
optional. Im Renderer reicht ein DB-first-Fallback auf bestehende Texte.

### C — Eindeutige Iconkarten (zu `cards_v1` / `feature_grid_v1` + `card_v1` + `icon`)
*(aktive `content_v1`/`feature_grid_v1` ohne Kindsections, Feldmuster
Titel + Beschreibung, optional `href`; Icons werden im Renderer heute
hartcodiert oder fehlen)*

| page_key | section_key | Type | Items | Felder |
| --- | --- | --- | ---: | --- |
| `gebaeudekommunikation.tuersprechanlagen` | `vorteile` | `feature_grid_v1` | 4 | 8 Lucide-Icons in `items.*.icon`, **keine `card_v1`-Kinder** |
| `gebaeudekommunikation.beschilderung` | `features` | `content_v1` | 4 | title + desc |
| `gebaeudekommunikation.grossanlagen` | `systembausteine` | `content_v1` | 4 | title + desc |
| `gebaeudekommunikation.grossanlagen` | `leistungen` | `content_v1` | 3 | nur title |
| `gebaeudemanagement.bcm-buchungssystem` | `anwendungen` | `content_v1` | 4 | title + desc |
| `gebaeudemanagement.bcm-infoboard` | `anwendungen` | `content_v1` | 4 | title + desc |
| `service.online-produktkatalog` | `access` | `content_v1` | 4 | title + desc |
| `zutrittskontrolle.aussenstation-adx5` | `anwendungen` | `content_v1` | 4 | title + desc |
| `zutrittskontrolle.digitale-briefkasten` | `anwendungen` | `content_v1` | 4 | title + desc |
| `zutrittskontrolle.zutrittssoftware` | `anwendungen` | `content_v1` | 4 | title + desc |
| `zutrittskontrolle.bcm-mini-cloud` | `anwendungen` | `content_v1` | 5 | title + desc + `href` (Links!) |
| `signage.root` | `products` | `content_v1` | 4 | nur desc |

*Anmerkung*: `gebaeudekommunikation.tuersprechanlagen.vorteile` ist der
**einzige** aktive `feature_grid_v1` ohne `card_v1`-Kinder — also der
„prominente" Pre-Migration-Fall. Die übrigen sind `content_v1`, die
fachlich wie Iconkarten gelesen werden.

### D — Eindeutige Wechselteaser (zu `teaser_2col_v1`)
Keine eindeutigen Fälle gefunden. Die 68 aktiven `teaser_2col_v1` decken
das Muster bereits ab.

### E — Eindeutige Kennzahlen (zu `stats_v1` + `stat_v1`)
Keine fehlenden Fälle in aktiven Seiten. (`personas.architekt.kopie.stats`
ist `content_v1`, gehört aber zu einer **archivierten Persona-Kopie** —
siehe Klasse G.)

### F — Echte Spezialblöcke (bleiben)
| Typ | Verwendung | Begründung |
| --- | --- | --- |
| `role_tabs_v1` | `gebaeudekommunikation.snipdoo-ip` | Zielgruppen-Tabs mit eigener Rollenlogik. Standard-`tabs_v1` reicht inhaltlich nicht. |
| `tabs_v1` / `tab_v1` | wenige Seiten | Echte Reiter-Interaktion. |
| `faq_v1` | 3 Sections | FAQ mit Akkordeon-Verhalten. |
| `list_v1` | `anwendungen.referenzprojekte.*` (24 Sections, Highlights/Systems) | Reine Text-Bullet-Listen pro Referenzprojekt, keine Karten. Bleibt `list_v1`. |
| `series_override_v1` / `series_override_container_v1` | Produkt-Overrides | Produktkatalog-Domäne, nicht CMS-Light-Scope. |
| `catalog_filter_grid_v1` | Filter-Grids | Eigene Filter-Logik. |
| `product_scroller_v1` | Produkt-Slider | Eigene Scroll-Logik. |
| `hero_v1`, `cta_v1`, `rich_v1`, `contact_block_v1` | global | bewusst eigene Typen. |
| `WoWiDetailSections` (Code) | `personas.wohnungswirtschaft` | Heterogene Inhaltsblöcke, in Tranche 7e bewusst als Legacy-Fallback belassen. |

### G — Unklar / fachliche Entscheidung nötig
| Fall | Frage |
| --- | --- |
| `eingangssysteme.standards.downloads` (`content_v1`, 3 Items, weder `title` noch `desc`, weder `href` noch `icon`) | Sind das echte Download-Links? → ggf. `download_list_v1` (existiert als Renderer) oder `cards_v1` + `card_v1` mit `cta_href`? |
| `gebaeudemanagement.digital-signage.products` (`content_v1`, 1 Item, mit `href`) | Einzelnes Item — gehört das fachlich zu einer anderen Section? Migration nur, wenn Section bleibt. |
| `eingangssysteme.root.discover` (`content_v1`, **inaktiv**, 7 Items) | Inaktive Section. Vor Migration klären: löschen oder reaktivieren+migrieren? |
| `gebaeudekommunikation.root.bereiche` (`content_v1`, **inaktiv**, 5 Items) | Wie oben. |
| `zutrittskontrolle.root.functions` (`content_v1`, **inaktiv**, 4 Items) | Wie oben. |
| `personas.architekt.kopie.*` (4 `content_v1`-Sections) | Seite ist `archived` + `is_active=false`. Vermutlich Test-Kopie — kann gelöscht statt migriert werden. |
| `produkte.eingangsloesungen.kopie.category-grid` (`catalog_filter_grid_v1`, 4 `card_v1`-Kinder, Seite archiviert) | Wie oben — Kopie, vor Migration löschen. |
| `personas.wohnungswirtschaft.detailSections` (Code) | In Tranche 7e bewusst als Legacy-Fallback gelassen. Eigene Folge-Entscheidung. |

### Sauber bereits migriert mit Karten-Kindern (Legacy `items.*` als Fallback)
Diese Sections haben sowohl `card_v1`-Kinder (Standard) als auch noch die
alten `items.*`-Felder in `cms_section_fields`. Renderer liest Standard;
Legacy-Felder dienen nur noch als Fallback. **Cleanup-Kandidaten für 12f**:

`gebaeudekommunikation.grossanlagen.anforderungen`,
`.systemloesungen.vorteile`, `.snipdoo-ip.anwendungen`,
`.snipdoo-ip.audiences`, `.briefkastenanlagen.smart`,
`.briefkastenanlagen.montageformen`, `.grossanlagen.wirtschaftlichkeit`,
`.systemloesungen.fachplanung`, `zutrittskontrolle.fahrstuhlsteuerung.benefits`,
`.mobiler-zutritt.benefits`, `.zufahrten-parkplaetze.benefits`,
`service.downloads.{akademie,bestellung,rma}`,
`service.technischer-support.{channels,rma,ersatzteile}`,
`home.ueber-tcs.{values,manufacturing}`.

## 4. Code-Treffer (Renderer-/Page-Sonderlogik)

| Datei | Fall | Klasse |
| --- | --- | --- |
| `src/features/anwendungen/components/AnwendungDetailPage.tsx` | liest `cmsLeistungen[i].items` mit Code-Fallback-Array | F (bewusster Fallback, kein Schaden) |
| `src/features/personas/wohnungswirtschaft/components/WoWiDetailSections.tsx` | heterogene Detail-Blöcke | F (Tranche 7e) |
| `src/features/zutrittskontrolle/pages/BiometriePage.tsx` | nutzt `items.*`-Lesepfad | prüfen in 12-Vorbereitung, vermutlich F |
| `src/features/gebaeudemanagement/pages/{DigitalSignage,DigitaleNamensanzeige,ReservierenBuchen,SchraenkeBehaelter}Page.tsx` | `items.map`-Pattern, liest aber bereits aus Card-Helpern | A (DB-first, Fallback OK) |
| `src/features/service/pages/ServicePage.tsx`, `ProductDetailPage.tsx` | Service-Hub bzw. PDP, kein Karten-Standardfall | F |
| `src/features/cms/components/sections/*` | Standard-Renderer | A |
| `src/features/admin/**` | Admin-UI, kein Public-Renderer | außerhalb Scope |
| `src/features/produkte/merkliste/MerklistePage.tsx`, `src/features/service/catalog/**` | Produktdatenbank | außerhalb Scope |

**Keine** harten `[{ title, description, icon, image, href }]`-Arrays in
neuen Code-Pfaden gefunden. Alte Code-Arrays leben nur noch als Fallback
hinter DB-first-Hooks.

## 5. Empfohlene Folgetranchen

### Tranche 12a — Iconkarten-Pflichtfälle (Klasse C, höchste Priorität)
**Ziel**: alle in Tabelle C gelisteten Sections (11 Sections) auf
`cards_v1` + `card_v1` + Feld `icon` (Lucide) heben.

- erwartete neue Kindsections: **~46** `card_v1`
- erwartete neue Felder: Titel + Beschreibung + Icon-Name je Karte (DE+EN)
- Whitelist-Pflicht je Kind beachten
- Renderer-Anpassungen: 11 Page-Komponenten (zutrittskontrolle.*, gebaeudemanagement.bcm-*, gebaeudekommunikation.beschilderung/grossanlagen, service.online-produktkatalog, signage.root)
- Layout sichtbar gleich, sofern Icon-Defaults bewahrt werden
- Risiko: mittel (Icon-Namen müssen pro Karte zugeordnet werden — kein Raten, ggf. eigener Klärungsschritt)
- Doku: `templates.md` als „erweiterte Iconkarten-Standardisierung" ergänzen

### Tranche 12b — Bildkarten (Klasse B)
**Ziel**: `presse.root.releases`, `gebaeudekommunikation.tuersprechanlagen.anwendungsumfelder`
auf `cards_v1` + `card_v1` + Asset `image`.

- erwartete neue Kindsections: **8** `card_v1`
- Asset-Slot `image` je Karte (Upload folgt redaktionell, kein Auto-Bild)
- Renderer: 2 Pages
- Risiko: niedrig

### Tranche 12c — Wechselteaser-Sammelbereiche
**Aktuell keine eindeutigen Kandidaten.** Tranche entfällt — Klasse D ist leer.

### Tranche 12d — Kennzahlen
**Aktuell keine fehlenden Stats-Sections.** Tranche entfällt — Klasse E
in aktiven Seiten ist leer. Etwaige Migration nur, falls archivierte
`personas.architekt.kopie.stats` reaktiviert werden soll.

### Tranche 12e — Echte Spezialblöcke
Keine Migration. Nur Doku-Pflege im `section-typen-katalog.md`:
ausdrücklich dokumentieren, warum `list_v1`, `faq_v1`, `role_tabs_v1`,
`series_override_*`, `catalog_filter_grid_v1`, `WoWiDetailSections`
Spezialblöcke bleiben.

### Tranche 12f — Cleanup Legacy-Fallback-Felder
**Niedrige Priorität.** In Sections mit `card_v1`-Kindern alle alten
`items.*`-Felder aus `cms_section_fields` entfernen (und Whitelist
deaktivieren), sobald die zugehörigen Renderer komplett DB-first sind.
Reine Aufräumtranche, kein Layout-Effekt, eigene Risiko-Prüfung.

### Tranche 12g — Archivierte Kopien aufräumen (Klasse G)
`personas.architekt.kopie` und `produkte.eingangsloesungen.kopie`
einzeln prüfen und entweder löschen oder als Vorlage dokumentieren.

### Tranche 12h — Inaktive `root`-Sections klären (Klasse G)
`eingangssysteme.root.discover`, `gebaeudekommunikation.root.bereiche`,
`zutrittskontrolle.root.functions` — gemeinsame fachliche Entscheidung:
löschen oder reaktivieren+migrieren.

## 6. Empfohlene Template-Palette (unverändert)

`card_v1`, `cards_v1`, `feature_grid_v1`, `teaser_2col_v1`,
`stats_v1` / `stat_v1`, `product_scroller_v1`, `tabs_v1` / `tab_v1`,
`role_tabs_v1`, `rich_v1`, `cta_v1`, `contact_block_v1`,
`catalog_filter_grid_v1`, `list_v1`, `faq_v1`, `hero_v1`,
`series_override_v1` / `series_override_container_v1`, `download_list_v1`.

**Keine neuen Typen empfohlen.** Alle gefundenen Fälle fassen sich mit
dieser Palette.

## 7. Scope-Bestätigung

- keine Migration, kein Renderer-Umbau, keine Doku-Inhaltsänderung außer
  diesem Audit-Dokument und den verlinkten Synchronisationen
- keine Produktdatenbank berührt
- keine Public-Navigation, keine Routen, keine i18n-JSON-Inhalte
  geändert
- keine Assets hochgeladen / gelöscht / deaktiviert
- keine neue Sonderkarte gebaut, keine neuen Section-Typen vorgeschlagen
- unklare Mappings sind als Klasse G dokumentiert, nicht geraten
