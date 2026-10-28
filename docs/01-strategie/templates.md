# Templates — Strukturvorlagen für CMS-Light-Seiten

Stand: 2026-05-27 (Tranche 22 — geprüft nach Batch 28, fachlich weiterhin
gültig; neue Inhalts-Prompts laufen über das Dachdokument
`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`) · Status:
**Stufe 0 (Admin-Übersicht aktiv)**, keine globale Template-Vererbung,
keine Public-Änderung, keine DB-Migration.

## Template-Freeze — empfohlene Standard-Section-Typen (Stand 2026-05-24, Tranche 13)

> **Tranche 13 hat die Palette eingefroren.** Nach Re-Audit auf
> versteckte Karten-/Iconblöcke und Entscheidung beider Rest-G-Fälle
> (`grossanlagen.leistungen` = Sonderbereich, `beschilderung.features`
> = bereits `teaser_2col_v1`) gilt: **keine neuen Section-Typen, keine
> neuen Sonderkarten.** Details im
> [Template-Konsolidierungs-Audit](../04-betrieb/template-konsolidierung-audit-2026-05-24.md).

Diese Liste ist die **Soll-Palette** für neue redaktionelle Inhalte. Andere
Typen können in Bestandsseiten weiterleben, sind für **Neuanlagen** aber
nicht empfohlen. Details pro Typ: `docs/02-architektur/section-typen-katalog.md`.

| Typ | Zweck | Pflicht-Textfelder | Asset-Slots | `icon_image`? | Für Neuanlagen empfohlen |
|---|---|---|---|---|---|
| `hero_v1` | Seiten-Hero | `headline` | `image` (3 Viewports) | nein | ja |
| `content_v1` | Textblock mit optionalem Eyebrow | `title`, `text` | — | nein | ja |
| `cards_v1` | Karten-Container (Parent) | `title` | — | nein | ja |
| `card_v1` | Einzelne Karte (Kind) | `title`, `description` | `image` *oder* `thumbnail`, zusätzlich `icon_image` (Bildicon) | **ja** (Priorität: `icon_image` → `icon` → Code-Fallback) | ja |
| `stats_v1` | Kennzahlenband (Parent) | — | — | nein | ja |
| `stat_v1` | Einzelne Kennzahl (Kind) | `value`, `label` | — | nein | ja |
| `feature_grid_v1` | Icon-Karten-Grid | `title` | `icon_image` (über Kinder) | **ja** (über `card_v1`-Kinder) | **nein** — historisch (0× aktiv), bitte `cards_v1` verwenden |
| `product_scroller_v1` | Horizontaler Produkt-Scroller | `title` | `image` (über `card_v1`-Kinder) | nein (keine Icon-Logik) | ja |
| `download_list_v1` + `download_item_v1` | Download-Liste | `title` / `title`+`cta_href` | — | nein | technische Reserve (0× aktiv) |
| `tabs_v1` + `tab_v1` | Tab-Navigation | `tab_label`, `title` | — | nein | ja (bei generischen Tabs) |
| `teaser_2col_v1` | Wechselteaser (2-Spalten) | `title`, `text` | `image` | nein | ja |
| `contact_block_v1` | Kontakt-Karte | `title` | — | nein | technische Reserve (0× aktiv) |
| `cta_v1` | CTA-Banner | `title`, `cta_label`, `cta_href` | `image` (optional) | nein | ja |
| `rich_v1` | Markdown-/Rich-Text (Legal, Akademie) | `body` | — | nein | technische Reserve (0× aktiv) |

**Sonderbereiche, die bewusst außerhalb dieser Standardpalette bleiben:**

- `role_tabs_v1` auf `gebaeudekommunikation.snipdoo-ip` (Rollen-Tabs mit
  flachen `tabs.*`-Feldern; Renderer `RoleTabsBlock` DB-first).
- `detailSections` auf `personas.wohnungswirtschaft` (heterogene 9-
  Subsektionen-Sonderstruktur, kein eindeutiges Karten-Zielmodell).
- `snipdoo-ip`-Spezialblöcke `systemversprechen`, `nutzungAlltag`,
  `systemaufbau`, `inbetriebnahme`, `kontakt` (Diagramm-Slot, Step-Liste,
  CTA-Block).
- `service.ersatzteile` Bereiche `beschriftung` und `freischaltcodes`
  (legacy `items.*`-Pfad mit i18n-Fallback).

Diese Sonderbereiche lösen kein Klasse-D-Flag aus, weil die jeweiligen
Hauptbereiche der Seiten bereits als Kindsections modelliert sind.

**Bewusst verbleibende Legacy-Fallbacks:** flache `items.<key>.*`-Felder
auf migrierten Bestandsseiten (z. B. `zutrittskontrolle.biometrie`,
`zutrittskontrolle.zufahrtskontrolle`, `personas.architekt`) bleiben in
der DB und werden vom Renderer als Fallback gelesen, falls keine
Kindsections vorhanden sind. Sie sind im Admin **deaktiviert**
(`cms_admin_editable_fields.is_enabled=false`, Klasse B —
siehe `docs/current-status.md`, Abschnitt „Whitelist-Differenz") und
werden nicht gelöscht. Optional vor Public-Live aufräumen.



## Worum geht es?

Viele Seiten in der TCS-Webseite sind **strukturgleich** — sie haben denselben Aufbau
aus Hero, Vorteilen, Anwendungsfällen, CTA usw., aber **andere Inhalte**
(Texte, Bilder).

Ein **Template** beschreibt diese gemeinsame Struktur **einmal zentral**, sodass
neue Seiten danach gebaut werden können und Layout-Änderungen später an **einer**
Stelle erfolgen.

## Wichtige Trennung: Struktur vs. Inhalt

| | Struktur-Template | Inhalts-Daten |
|---|---|---|
| Beispiel | „Hero → Vorteile (n Karten) → Anwendungen (n Karten) → CTA" | „Headline: Elektronische Drückergarnitur" |
| Lebt in | **Code** (Renderer-Komponente) + dieser Doku | **DB** (`cms_section_fields`, `cms_assets`) |
| Änderung wirkt | auf **alle** Seiten, die das Template nutzen | nur auf die eine Seite |

Templates sind also keine DB-Sache, sondern **Code + Konvention**. Die DB hält
nur die Inhalte pro Seiteninstanz.

---

## Template `produkt_sub_v1` — „Produkt-Unterseite / Produktlösungsseite"

**Referenz-Seite:** `zutrittskontrolle.elektronische-drueckergarnitur` (P-015)
**Renderer-Vorbild:** `src/features/cms/components/CmsProductSolutionShell.tsx`
(liest Kind-Sections zuerst, fällt nur als Legacy-Pfad auf flache
`items.N.*`-Felder zurück).

Ein Template ist eine **Familie** mit erlaubten Strukturvarianten. Section-
Keys dürfen sprachliche Synonyme tragen:

- `benefits` ↔ `vorteile` (Karten-Container „Vorteile")
- `useCases` ↔ `anwendungen` (Karten-Container „Anwendungen")

Beide Schreibweisen sind gleichwertig, der Renderer behandelt sie als
Synonyme. Neue Seiten dürfen die deutsche Schreibweise verwenden;
Bestandsseiten in `benefits`/`useCases` werden nicht umbenannt.

### Erlaubte Strukturvarianten

**Variante A — Vorteile + Anwendungen**

| sort_order | section_key | section_type | Inhalt |
|---|---|---|---|
| 10 | `hero` | `hero_v1` | Großes Bild + Headline + Subline + Eyebrow |
| 20 | `benefits` *oder* `vorteile` | `cards_v1` | Karten-Container „Vorteile" mit n × `card_v1` als Kindern |
| 30 | `useCases` *oder* `anwendungen` | `cards_v1` | Karten-Container „Anwendungen" mit n × `card_v1` als Kindern |
| 40 | `cta` | `content_v1` *oder* `cta_v1` | Schluss-Block mit Aufforderung |

**Variante B — Produkte + Anwendungen** (Showcase-Variante)

| sort_order | section_key | section_type | Inhalt |
|---|---|---|---|
| 10 | `hero` | `hero_v1` | Hero |
| 20 | `produkte` | `product_scroller_v1` *oder* `cards_v1` | Produkt-Scroller mit n × `card_v1` als Kindern |
| 30 | `useCases` *oder* `anwendungen` | `cards_v1` | Anwendungen |
| 40 | `cta` | `content_v1` *oder* `cta_v1` | Schluss-Block |

P-021 (Biometrie) und P-231 (Zufahrtskontrolle) sind Mitglieder dieser
Familie in Variante B und gelten **nicht** als Abweichung.

### Kind-Felder pro `card_v1` (Vorteile / Anwendungen / Produkte)

- `title` — Karten-Überschrift (Pflicht, DE+EN whitelisten)
- `description` (bzw. Legacy `desc` / `text`) — Karten-Text (Pflicht, DE+EN)
- `icon` — Lucide-Icon-Name als Text, z. B. `Shield`, `Building2` (optional)
- `image` — Bild-Slot mit Viewports `desktop`/`tablet`/`mobile` (optional,
  Whitelist für DE+EN setzen, damit der Upload-Slot im Admin sichtbar ist)
- bei Linkkarten zusätzlich `cta_label` + `cta_href`, falls fachlich nötig
- bei Feature-/Bulletkarten zusätzlich `features.0..N`

### Mitglieder der Familie (Stand 2026-05-21, 15 Seiten)

Variante A (Vorteile + Anwendungen):

- ✅ P-015 `zutrittskontrolle.elektronische-drueckergarnitur` — **Referenz**
- ✅ P-016 `zutrittskontrolle.elektronischer-knaufzylinder`
- ✅ P-017 `zutrittskontrolle.bcm-handsender`
- ✅ P-018 `zutrittskontrolle.funkvernetzte-offline-leser`
- ✅ P-019 `zutrittskontrolle.bcm-online-leser`
- ✅ P-020 `zutrittskontrolle.vorhaengeschloss`

Variante B (Produkte + Anwendungen):

- ✅ P-021 `zutrittskontrolle.biometrie`
- ✅ P-231 `zutrittskontrolle.zufahrtskontrolle`

Weitere CMS-only Produktlösungsseiten (Tranche B2):

- ✅ P-227 `zutrittskontrolle.bcm-door-app`
- ✅ P-228 `zutrittskontrolle.gsm-gateway`
- ✅ P-230 `zutrittskontrolle.bcm-mini-cloud`
- ✅ P-232 `zutrittskontrolle.digitale-briefkasten`
- ✅ P-233 `zutrittskontrolle.zutrittssoftware`
- ✅ P-234 `zutrittskontrolle.schrankschloss`
- ✅ P-235 `zutrittskontrolle.serverschrankschloss`

### Bewusst nicht in dieser Familie

- **Übersichts- / Verteilerseiten** (Hubs wie `/zutrittskontrolle`,
  `/gebaeudemanagement`) — folgen einem eigenen Muster
  (`overview` / `submenu` / `products`) und werden nicht als
  Produkt-Unterseiten behandelt.
- P-012 (Mobiler Zutritt), P-013 (Fahrstuhlsteuerung), P-014 (Zufahrten &
  Parkplätze) — eigene Hub-Strukturen.
- `zutrittskontrolle.aussenstation-adx5` — gehört zur
  Gebäudekommunikations-Familie (Türstation/Sprechanlage).

---

## Stufenmodell (so wachsen Templates später)

Dies ist die **Roadmap**, falls/wann wir über die reine Dokumentation hinausgehen.
Heute sind wir auf Stufe 0.

### Stufe 0 — Admin-Übersicht *(aktueller Stand, seit 2026-05-21)*
Templates sind in dieser Datei beschrieben **und** im `/admin` in der
**Template-Werkstatt** (Button oben links) sichtbar. Die Werkstatt ist
rein lesend, zeigt pro Template Referenz- und Mitgliedsseiten mit
P-Nummer, Status, öffentlicher Route, Strukturvariante (A/B),
Sprachvariante und einem Slot-Vergleich gegen die Referenz. Vorschau
Desktop/Tablet/Mobile per iframe und „Im Admin öffnen" springt direkt
zur Seitenpflege. Keine DB-Spalte, keine Vererbung, kein Eingriff in den
Public-Renderer. Die Mitglieder-Liste lebt als statische Konfiguration
in `src/features/admin/lib/templates.ts`.

#### Block-/Teaser-Templates (neu, 2026-05-21)

Neben Seiten-Templates kennt die Werkstatt seit dieser Etappe einen
zweiten Reiter **Block-/Teaser-Templates**. Dort sind einzelne
Section-Typen geführt, die als wiederverwendbares redaktionelles Muster
verstanden werden (kein Container/Kind-Pattern, sondern eigenständige
Top-Level-Section). Quelle: `src/features/admin/lib/blockTemplates.ts`.

Stand 2026-06-05 enthält der Reiter mehrere Container- und Block-Vorlagen,
darunter:

- `teaser_2col_v1` — Anzeigename **Wechselteaser**.
  2-Spalten-Teaser mit Bild/Text-Wechsel (`image_position` links/rechts),
  16:9-Bildformat, Hover-Zoom, optionalem CTA und Hintergrund-Variante
  (`default`/`muted`).
  Feldschema: `label`, `title`, `text`, `cta_label`, `cta_link`,
  `image_position`, `background_variant`; Asset-Slot `image` mit
  Viewport-Varianten gemäß `asset-strategie.md`.
- Weitere Container/Blöcke (Stand Batch 30): `hero_v1`, `content_v1`,
  `rich_v1`, `cards_v1`, `feature_grid_v1`, `product_scroller_v1`,
  `tabs_v1`, `stats_v1`, `download_list_v1`, `contact_block_v1`,
  `cta_v1`, `faq_v1` sowie die Standardkarte `card_v1` als Kind-Section.
  Single Source der Container-Definitionen bleibt
  `docs/02-architektur/section-typen-katalog.md`; die Admin-Anzeige
  spiegelt diese Definitionen 1:1.

Vorkommen werden live aus `cms_sections` gelesen.

Auch hier gilt Stufe 0: read-only, keine Vererbung, keine DB-Spalte,
keine Public-Wirkung. Zentrale Template-Einstellungen wie Bildverhältnis
oder Bewegungsverhalten bleiben heute bewusst **Code-Konvention** im
Renderer (`Teaser2ColV1.tsx`) — eine spätere Stufe könnte sie in eine
Template-Konfiguration auslagern.

Im Section-Tree und in Type-Badges wird `teaser_2col_v1` violett
markiert; die Farbe ist zentral in `src/features/admin/lib/blockTypeStyle.ts`
hinterlegt.

Referenzgruppe `produkt_sub_v1` (Stand 2026-05-21, **15 Mitglieder**):

- Referenz: P-015 `zutrittskontrolle.elektronische-drueckergarnitur`
- Variante A (6 Seiten): P-015, P-016, P-017, P-018, P-019, P-020
- Variante B (2 Seiten): P-021, P-231
- Tranche B2 (7 Seiten): P-227, P-228, P-230, P-232, P-233, P-234, P-235

P-012 (Mobiler Zutritt), P-013 (Fahrstuhlsteuerung) und P-014
(Zufahrten & Parkplätze) gehören **nicht** in diese Gruppe — sie nutzen
`overview` / `submenu` / `products` und folgen einem anderen Muster.

### Stufe 1 — Gemeinsamer Renderer
Eine einzige Komponente `ProduktSubPage.tsx`, die `cms.sections` dynamisch
rendert. Alle Produkt-Unterseiten zeigen darauf.
→ Folge: Layout-Änderung („Bild kleiner", „Vorteile vor Anwendungen") = **eine**
Code-Stelle, wirkt auf alle Instanzen.

### Stufe 2 — Template-Sichtbarkeit im `/admin`
Neue Spalte `cms_pages.template_key` (z. B. `produkt_sub_v1`). Im `/admin`
neuer Bereich **„Templates"**, der pro Template auflistet, welche Seiten es
nutzen. Reine Anzeige, kein neues Schreibverhalten.

### Stufe 3 — Template-Skeleton beim Anlegen
Neue Seite mit `template_key = produkt_sub_v1` → automatisch werden Hero +
Vorteile + Anwendungen + CTA + leere Felder + Whitelist-Einträge angelegt.
Redaktion füllt nur noch Texte und Bilder.

---

## Wichtig — was Templates **nicht** ändern

- Die **Spiegelregel** bleibt: Reihenfolge und Sichtbarkeit aus dem `/admin`
  schlagen 1:1 auf die Website durch. Templates ändern nur die **Default-Struktur**
  beim Anlegen, nicht das laufende Verhalten.
- Inhalte (Texte, Bilder) bleiben pro Seite eigen — ein Template überschreibt
  niemals Inhalte einer Instanz.
- Die Whitelist-Pflicht (`cms_admin_editable_fields`) gilt weiter für jedes
  neue Feld, auch wenn es per Template-Skeleton angelegt wird.

## Nächster Schritt

Sobald wir wissen, welche der oben gelisteten Kandidaten-Seiten wirklich nach
P-015 gebaut werden sollen, entscheiden wir, ob wir auf **Stufe 1** springen
(gemeinsamer Renderer) oder die Folgeseiten zunächst nach dem dokumentierten
Muster einzeln aufsetzen.

---

## Template-Kandidat `persona_standard_v1` — „Persona-Standardseite" (Stand 2026-05-24)

**Status:** Muster-Kandidat, **noch kein Template** im engeren Sinn (keine
Familie in `src/features/admin/lib/templates.ts`, keine Werkstatt-Sicht,
keine Vererbung). Wird hier dokumentiert, damit die Struktur ab Tranche 7b
nachvollziehbar und für eine spätere Stufe-1-Konsolidierung greifbar ist.

**Referenz-Renderer:** `src/features/personas/shared/usePersonaCms.ts`
(Helfer `txItem(section, itemKey, newField, legacyField?)` und
`listItems(section, fallback)` — Kindsections DB-first, legacy
`items.<key>.*` als Fallback).

**Mitglieder (6, Stand 2026-05-24, Tranche 7b + 7e migriert):**

- `personas.architekt`
- `personas.bauherr`
- `personas.fachhandel`
- `personas.fachplaner`
- `personas.handwerk`
- `personas.wohnungswirtschaft` *(Tranche 7e: `stats` / `highlights` /
  `solutions` auf das Standardmuster gebracht. Heterogene
  `detailSections` bleiben bewusst Legacy-`items.*` und lösen kein
  Klasse-D-Flag mehr aus — siehe `current-status.md`.)*

**Bewusst nicht in dieser Familie:**

- `personas.architekt.kopie` — archiviert + `is_active=false`, durch
  Audit-Hygiene ausgeschlossen.

**Strukturmuster pro Seite:**

| section_key | section_type | Modellierung |
|---|---|---|
| `hero` | `hero_v1` | Standard-Hero |
| `stats` | `stats_v1` | Parent + n × `stat_v1`-Kinder |
| `highlights` / `solutions` / `cases` / `tools` / `partnerServices` / `tips` | `cards_v1` | Parent + n × `card_v1`-Kinder (je Seite eine Teilmenge) |

Felder pro `card_v1`: `title`, `description`, optional `subtitle`,
`icon` (Lucide-Textfeld), optional Asset-Slots `image` / `icon_image`
nach `card_v1`-Medienmodell (siehe `section-typen-katalog.md` →
`card_v1`). Felder pro `stat_v1`: `value`, `label`, `description`.
Whitelist (`cms_admin_editable_fields`) für jedes Feld DE+EN gesetzt.

**Keine neue Kartenvariante** für Persona-Seiten: Icon-Karten,
Bildicon-Karten und Bildkarten werden alle als `card_v1` modelliert —
nur der gepflegte Slot (`icon` vs. `icon_image` vs. `image`)
unterscheidet sich.

**Noch keine** Template-Vererbung oder neuer gemeinsamer Renderer — eine
mögliche Stufe-1-Konsolidierung („PersonaStandardPage.tsx") wird erst
geprüft, wenn das `icon_image`-Admin-Modell ausgerollt ist und die
heterogenen `detailSections` der Wohnungswirtschaft als bewusster
Sonderbereich akzeptiert bleiben.


---

## Verweis — Template-Konsolidierungs-Audit (Tranche 11, 2026-05-24)

Eine vollständige Bestandsaufnahme, welche fachlich kartigen Bereiche
heute noch außerhalb der Standardpalette laufen, liegt unter
[`docs/04-betrieb/template-konsolidierung-audit-2026-05-24.md`](../04-betrieb/template-konsolidierung-audit-2026-05-24.md).
Dort sind 11 Iconkarten-Sections (Klasse C), 2 Bildkarten-Sections
(Klasse B), die echten Spezialblöcke und ein Folgetranchen-Plan
dokumentiert. Diese Datei (`templates.md`) bleibt die normative
Template-Definition; das Audit ist die Backlog-Sicht.

## Standardpalette für Redakteure (Tranche 17, 2026-05-26)

Verbindliche kleine Palette, die im Admin als „echte" Blöcke geführt
wird:

| Section-Typ | Label im Admin | Bedeutung |
|---|---|---|
| `hero_v1` | Hero | Seitenkopf, vom Layout gerendert |
| `teaser_2col_v1` | Wechselteaser | 2-Spalten-Teaser, Bild + Text |
| `cards_v1` + `card_v1` | Karten-Container + Karte | Standard-Karten-Liste |
| `stats_v1` + `stat_v1` | Kennzahlen + Kennzahl | Zahlenblock |
| `cta_v1` | Call to Action | Aufruf zur Aktion |
| `contact_block_v1` | Kontaktblock | Standardisierter Kontaktbereich |

Echte Spezialblöcke (`series_override_*`, `solution_teaser_*`,
`persona_*` u. ä.) sind dokumentiert, aber nicht Teil der
Redaktions-Standardpalette.

`card_v1` hat redaktionell drei Varianten — je nach befülltem
Feld/Slot:

- **Bildkarte** — `image`-Slot gepflegt.
- **Iconkarte** — `icon` (Lucide-Name) oder `icon_image` (TCS-Grafik).
- **Textkarte** — weder Bild noch Icon, nur Textfelder.

Eine UI-Differenzierung im Admin-Baum (eigene Labels für die drei
Varianten) folgt in Tranche 18.

### Source-only-Container

Sammel-Container, die nur als Datenquelle für andere sichtbare Blöcke
existieren (z. B. alte `contentBlocks` + `contentBlocks_item_*` neben
sichtbaren `block_*`-Wechselteasern), gehören **nicht** in den
normalen Redaktionsfluss und müssen auf `is_active = false` stehen.
Siehe `redaktions-fluss-audit.mjs` (Klassen S2/S4).

## Beispiel: Persona-Grid `home.start` (Tranche 18)

Referenzfall für „eine sichtbare Karte = eine bearbeitbare Datenquelle":

- Container `personas` (cards_v1) — sichtbarer Karten-Container mit
  Intro-Feldern.
- 6 Kinder `personas_item_<persona>` (card_v1) — jede Karte ist eine
  Textkarte mit `title`, `description`, `cta_link` (DE+EN).
- DOM-Marker pro Karte: `data-cms-section="personas_item_<persona>"`.

Frühere Verflechtung über parallel aktive `persona_*` (rich_v1) als
CTA-Link-Quelle ist aufgelöst; die Sektionen bleiben inaktiv erhalten
als Legacy-Fallback im Renderer.

## Karten-Palette (Stand Tranche 24, 2026-05-27)

Die redaktionelle Karten-Palette wird **nicht** als eigene
Template-Registry geführt, sondern aus tatsächlich gepflegten
DB-Slots in `editorialSectionKind.ts` abgeleitet und im Admin als
Badge angezeigt:

| Badge | Bedingung (in `cms_section_fields` / `cms_assets`) |
|---|---|
| Bildkarte | Asset-Slot `image` aktiv oder per Whitelist pflegbar |
| Thumbnail-Karte | Asset-Slot `thumbnail` aktiv oder per Whitelist pflegbar |
| Iconkarte (TCS-Bildicon) | Asset-Slot `icon_image` aktiv |
| Iconkarte (Lucide) | Feld `icon` gesetzt oder Slot `icon_image` per Whitelist vorbereitet |
| Textkarte | nur Titel/Beschreibung, kein Bild/Icon |
| Karte | Variante noch nicht eindeutig ableitbar |

Container/Spezialblöcke:

| Section-Typ | Badge |
|---|---|
| `cards_v1` / `card_grid_v1` / `catalog_filter_grid_v1` | Kartencontainer |
| `teaser_2col_v1` | Wechselteaser |
| `stats_v1` / `stat_v1` | Kennzahlen / Kennzahl |
| `cta_v1` / `cta` | CTA |
| `contact_block_v1` | Kontaktblock |

Frühere interne Bezeichnungen wie „Integrationskarte",
„Material-Feature-Karte", „Content-Block-Karte" werden auf diese
Standardpalette zurückgeführt und nicht als eigene Template-Arten
geführt — Alle Karten sind technisch `card_v1` und werden
ausschließlich anhand ihrer gepflegten Slots klassifiziert.

---

## Hotfix 27b-1 (2026-05-27) — Iconkarten Anwendungen-Anforderungen

- Lucide-Icon → DB-Feld `icon` (Lucide-Name, z. B. `fence`, `accessibility`). DOM-Marker `data-cms-field="icon"`.
- TCS-Bildicon → Asset-Slot `icon_image` (PNG/SVG). DOM-Marker `data-cms-field="icon_image"`. Hat Priorität vor `icon`.
- Anwendungen-Anforderungen sind echte `card_v1`-Kindsections unter Parent `anforderungen` (jetzt Typ `cards_v1`). Pflege im Admin pro Karte über Felder `title`, `description`, `icon` + Asset `icon_image`.
- Medienbereich und Live-Vorschau benutzen denselben Marker: Vorschau-Klick auf eine Karte trifft genau den `<span>`, der das tatsächlich gerenderte Icon trägt.
- Legacy `<key>.label/.text/.icon` im content_v1-Sammelblock bleibt nur Fallback und wird nicht mehr empfohlen.
