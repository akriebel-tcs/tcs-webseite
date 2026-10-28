# Zielbausteine, Standard-Karte und Migrationsfahrplan

_Stand: 2026-06-01 — Sprint `cms-light-zielbausteine-standardkarte-und-migrationsfahrplan-1` (read-only)._
_Verbindliches technisches Zielmodell aus dem fachlichen Abgleich `docs/04-betrieb/template-elemente-abgleich-latest.md`. Keine DB-, Migrations-, RPC-, Inhalts-, Bild-, Feldwert-, Whitelist-, i18n-, Public-Renderer-, Routen-, Navigations-, Footer-, Breadcrumb- oder Produktdatenbank-Änderung._

---

## A. Zielbausteine (verbindlich)

| # | Fachlicher Baustein | Section-Type(n) | Status |
|---|---|---|---|
| 1 | Hero | `hero_v1` | bestätigt |
| 2 | Intro / Textblock | `content_v1` | bestätigt |
| 3 | Wechselteaser | `teaser_2col_v1` | bestätigt |
| 4 | Karten-Raster | `cards_v1` + `card_v1` | bestätigt |
| 5 | Karten-Scroller | `product_scroller_v1` + `card_v1` | bestätigt |
| 6 | Standard-Karte | `card_v1` mit Presets | **Zielstandard** |
| 7 | Stats | `stats_v1` + `stat_v1` | bestätigt |
| 8 | FAQ | `faq_v1` | bestätigt |
| 9 | CTA | `cta_v1` | bestätigt |
| 10 | Referenzprojekt | Detail-Template (Page-Komposition), kein eigener Section-Type | bestätigt |
| 11 | Produktbereichs-Filter | `catalog_filter_grid_v1` (Spezialfall, Produktdatenbank bleibt tabu) | bestätigt |
| 12 | Kontakt | Ziel wahrscheinlich `contact_block_v1` — **Klärpunkt, keine Migration** | offen |
| 13 | Download | Ziel wahrscheinlich `download_list_v1` + `download_card` — **Klärpunkt, keine Migration** | offen |
| 14 | News / Karriere | aktuell **kein dedizierter Section-Type**, kein technischer Ausbau in diesem Sprint | später prüfen |

---

## B. Standard-Karte und Presets

**Leitentscheidung:** `card_v1` bleibt der einzige Kartentyp im CMS-Light. Varianten werden als **Presets** modelliert (siehe `CARD_V1_VARIANTS` in `src/features/cms/contract/sectionTypes.ts`), nicht als neue Section-Types.

### Presets (maschinenlesbar in `STANDARD_CARD_PRESETS`)

| Preset | Erkennungssignal | Asset-Slots | Typische Felder |
|---|---|---|---|
| `image_card` | Parent `cards_v1` oder `product_scroller_v1`, Slot `image` | `image` | `title`, `description`, `subtitle`, `cta_*`, `href` |
| `thumbnail_card` | Parent `card_grid_v1` oder `catalog_filter_grid_v1`, Slot `thumbnail` | `thumbnail` | `title`, `description`, `cta_*`, `href` |
| `icon_card_lucide` | Parent `feature_grid_v1`, Textfeld `icon` (Lucide-Iconname) | – | `title`, `description`, `icon`, `features.0..4` |
| `icon_card_image` | Parent `feature_grid_v1`, Slot `icon_image` | `icon_image` | `title`, `description`, `features.0..4` |
| `multi_link_card` | DB enthält `link_1_*` (ggf. `link_2/3_*`) | – | `title`, `description`, `link_1..3_*` |
| `text_card` | reine Textkarte (Fallback) | – | `title`, `description`, optional `cta_*` |
| `download_card` | Parent `download_list_v1` (Spezialfall) | – | `title`, `description`, `cta_href` als Dateilink |

### Feldmodell der Standard-Karte (Ist-Stand im Vertrag)

| Bereich | Felder | Status |
|---|---|---|
| Bild / Assets | `image`, `thumbnail`, `icon_image` | im Vertrag, Asset-Slots (laufen über SectionAssetsBlock) |
| Eyebrow / Label | `subtitle` (Alias: `eyebrow`) | im Vertrag |
| Titel | `title` (Alias: `headline`) | im Vertrag |
| Beschreibung | `description` (Aliase: `beschreibung`, `desc`, `text`) | im Vertrag (`richtext`) |
| Icon (Text) | `icon` | im Vertrag |
| Features | `features.0` – `features.4` | im Vertrag |
| Links | `link_1_label`, `link_1_href`, `link_1_kind` – `link_3_*` | im Vertrag |
| CTA | `cta_label`, `cta_href`, plus `href` (klickbare Karte) | im Vertrag |
| Toggle-Schalter | `image_enabled`, `icon_enabled`, `eyebrow_enabled`, `features_0..4_enabled`, `link_1..3_enabled` | im Vertrag (technical_fields) |
| **Tags** | `tags.0..4` | **NICHT im Vertrag** — offener Klärpunkt (siehe F.1) |

**Garantie:** keine bestehenden Felder werden gelöscht oder umbenannt. Aliase werden weiter lesend unterstützt (`CARD_V1_FIELD_ALIASES`).

---

## C. Container vs. Karte

**Trennregel:** Container bestimmt **Layout**, Karte bestimmt **Inhalt**.

| Container | Layout | Karten-Slot-Erwartung |
|---|---|---|
| `cards_v1` | Raster (bis 3-spaltig) | `image_card` |
| `product_scroller_v1` | horizontaler Scroller | `image_card` |
| `card_grid_v1` | Hub-Grid | `thumbnail_card` |
| `catalog_filter_grid_v1` | Filter-Grid (live aus Produktdatenbank) | `thumbnail_card` (Spezialfall) |
| `feature_grid_v1` | Iconreihe | `icon_card_lucide` / `icon_card_image` |
| `download_list_v1` | Download-Liste | `download_card` (heute 0 Instanzen) |

---

## D. Spezialfälle

- **`hero_v1`**: Größenvarianten (Start groß / sonst normal) bleiben **Renderer-gesteuert** (CSS-Klasse), kein neues Vertragsfeld `size_variant`.
- **`catalog_filter_grid_v1`**: bezieht Produkte live aus der externen Produktdatenbank. Produktdatenbank bleibt tabu (siehe `.lovable/always-follow.md` §3).
- **`teaser_2col_v1`**: Feld „Feature" aus der PDF wird **nicht** an den Wechselteaser ergänzt — Features bleiben am `card_v1`.
- **`series_override_v1` / `series_override_container_v1`**: Legacy/Produktkatalog-Pflege, bleibt unverändert.
- **`list_v1`, `role_tabs_v1`, `tab_v1`, `rich_v1`**: bleiben Detail-/Spezialbausteine, keine Erhebung zum Zielstandard.

---

## E. Migrationsfahrplan Kontakt und Download (Dry-Run, keine Anwendung)

### E.1 Kontakt — B-550 / B-551 / B-552 auf `kontakt.root`

**Aktueller Bestand (DB-verifiziert 2026-06-01):**

| B-ID | section_key | section_type | aktiv |
|---|---|---|---|
| 550 | `sections` | `content_v1` | ja |
| 551 | `cards` | `content_v1` | ja |
| 552 | `form` | `content_v1` | ja |

**Zielmodell (Vorschlag):** `contact_block_v1` (Vertrag existiert, 0 Instanzen).

**Benötigte Vertragsfelder:** bereits vorhanden — `title`, `text`, `email`, `phone`, `cta_label`, `cta_href`.

**Benötigte Admin-Felder:** im Vertrag bereits modelliert (Gruppen Kopf · Inhalt · Kontakt · Link). Whitelist-Einträge in `cms_admin_editable_fields` müssten je Section/Feld/Locale neu angelegt werden.

**Benötigte Whitelist-Ergänzungen:** `title`, `text`, `email`, `phone`, `cta_label`, `cta_href` × DE/EN je betroffener Section.

**Renderer-Risiko:** mittel. `ContactBlockV1.tsx` existiert. Die heutigen `content_v1`-Sections leben aber unter `kontakt.root` mit drei sehr unterschiedlichen Aufgaben (Section-Listen, Karten, Formular). Ein 1:1-Typwechsel ist **nicht** möglich — `B-551` (cards) und `B-552` (form) sind fachlich kein Kontaktblock, sondern ein Karten-Container bzw. Formular-Anker.

**Public-Layout unverändert?** nicht trivial: Renderer-Wechsel von `content_v1` zu `contact_block_v1` ändert Markup, Spacing und Headlines.

**Reine Typkorrektur möglich?** **nein.** Echte Inhaltsmodellierung nötig:
1. genau **eine** Kontakt-Section pro Page als `contact_block_v1` aufnehmen (Telefon, E-Mail, CTA).
2. `B-551` (cards) wahrscheinlich auf `cards_v1` + Kontakt-Karten (Variante `multi_link_card` oder neuer Kontakt-Preset) umbauen.
3. `B-552` (form) bleibt vorerst `content_v1` mit Formular-Anker oder bekommt einen eigenen Form-Renderer (eigene spätere Etappe, nicht Teil dieser Migration).

**Empfehlung:** Migration nicht als reinen Typwechsel ausführen. Vorab fachliche Entscheidung: „Was zeigt der Kontaktblock genau, und was bleibt als generischer Inhalt darüber/darunter?"

### E.2 Download — Page `service.downloads` (P-081)

**Aktueller Bestand (DB-verifiziert 2026-06-01, 24 Sections aktiv):**

- `hero_v1`: B-339 (`hero`).
- `cards_v1` + `card_v1`-Kinder: B-340 `quickLinks` (4 Karten), B-343 `rma` (3 Karten), B-344 `bestellung` (3 Karten), B-345 `akademie` (5 Karten).
- `content_v1`: B-341 `dokumente` (eigentliche Dokumentenliste, heute reiner Text), B-346 `glossar`, B-347 `ansprechpartner`.
- `faq_v1`: B-342.

**Zielmodell (Vorschlag):** Nur **B-341 `dokumente`** als `download_list_v1` mit Kindern `card_v1`/Preset `download_card`. Die übrigen `cards_v1`-Sections (quickLinks/rma/bestellung/akademie) sind **keine** Download-Listen, sondern Link-Karten und bleiben `cards_v1` + `card_v1` (Preset je nach Inhalt).

**Benötigte Vertragsfelder:** vorhanden — `download_list_v1` (`title`, `intro`) und `card_v1`/`download_card` (`title`, `description`, `cta_href`, optional `cta_label`). Zusätzlich Datei-Asset-Slot: heute **nicht im Vertrag**. Klärpunkt: harte Dateifelder (`file_url`, `file_size`, `file_type`) oder Datei als `cms_assets`-Slot mit eigenem `kind`.

**Benötigte Admin-Felder:** `card_v1` ist abgedeckt; für Datei-Pflege fehlt ein Upload-Pfad. `download_card`-Preset im Admin-Plan ist bereits modelliert.

**Benötigte Whitelist-Ergänzungen:** für B-341 nach Umbau auf `download_list_v1`: `title`, `intro`. Für neue Download-Karten: `title`, `description`, `cta_href`, `cta_label` × DE/EN.

**Renderer-Risiko:** mittel. `DownloadListV1.tsx` existiert, hat aber 0 produktive Instanzen.

**Public-Layout unverändert?** **nein.** B-341 ist heute Text (`content_v1`), nach Umbau wäre es eine Listendarstellung. Layout ändert sich bewusst.

**Reine Typkorrektur möglich?** **nein.** B-341 muss inhaltlich neu modelliert werden (echte Dokumente als Kind-Sections), und das Datei-Asset-Modell ist noch offen.

**Empfehlung:** Migration erst, wenn (a) Datei-Asset-Modell entschieden und (b) Inhaltsquelle für die Dokumentenliste geklärt ist. Bis dahin bleibt `dokumente` unverändert.

---

## F. Offene Entscheidungen

1. **`tags.0..4` an Standard-Karte:** aufnehmen oder weglassen. Aufnahme erfordert gleichzeitige Whitelist- + Renderer-Etappe, sonst Drift.
2. **Kontakt-Block:** Migrationspfad für `kontakt.root` (siehe E.1) klären.
3. **Download-Listung:** Datei-Asset-Modell (harte Felder vs. `cms_assets`-Slot) entscheiden.
4. **News-Bereich:** später prüfen — Optionen: `cards_v1` + Standard-Karten **oder** eigener Seitentyp. Aktuell **kein Section-Type, kein Pilot, kein Ausbau**.
5. **Karriere-Bereich:** analog News — später prüfen, aktuell kein Ausbau.
6. **Admin-Preset-Auswahl:** soll der Admin den Preset einer Karte explizit anzeigen/auswählen lassen? Heute wird der Preset über `detectCardVariant` automatisch hergeleitet; vorhandene Felder bleiben pflegbar, variantenfremde Pflichtfelder werden im Plan ausgeblendet.

---

## G. Empfohlene nächste technische Etappe

`cms-light-standardkarte-admin-presets-und-sichere-seedings-1`:

- Preset-Erkennung im Admin sichtbar machen (Badge je Karte, kein Schreibweg).
- gezieltes, kleines Seeding nur für die `S1`-Tranche (5 Sections, `card_v1.description` auf einer Seite) als Pilot — keine Flächenmigration.
- danach Whitelist-Ergänzungen tranchenweise pro Container-Klasse (cards_v1 / product_scroller_v1), wieder ohne Inhaltsänderung.
- Kontakt- und Download-Migration **nicht** Teil dieser nächsten Etappe.

---

## Bestätigung

- Keine DB-Änderung.
- Keine Migration.
- Keine neue RPC.
- Keine Inhalte/Bilder/Feldwerte geändert.
- Keine Whitelist geändert.
- Keine i18n-Dateien geändert.
- Keine Public-Renderer-/Routen-/Navigations-/Footer-/Breadcrumb-Änderung.
- Keine Produktdatenbank berührt.
- Keine neuen Section-Types für News/Karriere gebaut.
- Keine Kontakt-/Download-Migration angewendet.
