# Sprint „Zielbaukasten Eine Wahrheit" — Bericht

_Stand: 2026-05-29 — strategischer Inventar- und Zielbild-Sprint_
_Auftrag: `cms-light-zielbaukasten-layout-und-komponenten-inventar-1`_

## Ziel

Vor weiterer D3/D5-Seedingarbeit prüfen, ob zuerst der visuelle
Zielbaukasten und die Seitenmuster konsolidiert werden sollten. Keine
DB-/Code-/i18n-Änderung in diesem Sprint.

## Was wurde gemacht

- Vollständiges read-only Inventar aller sichtbaren CMS-Light-Bausteine
  (24 Familien) erstellt — siehe
  `docs/04-betrieb/zielbaukasten-cms-light-inventar.md` §1.
- B-538 in Code und DB geprüft — Befund: existiert **nur als UI-Platzhalter**
  in den Link-Inputs (`CardBlueprintWorkshop`, `BildkartenCardWorkspace`),
  keine konkrete Karte im Bestand.
- Reduzierten Zielbaukasten mit 20 Bausteinen und 7 `card_v1`-Varianten
  vorgeschlagen (Inventar §3).
- 12 Seitenfamilien gegen das Zielbild gespiegelt — Bereichshubs,
  Anwendungen, Personas und Legal sind „am/sehr nah am Ziel"
  (Inventar §4).
- D3/D5-Treiber fachlich klassifiziert: **>80 % der Reste sind
  `card_v1`-Variantenfelder**, deren pauschales Seeding zu Admin-Feldmüll
  führen würde.
- Drei Migrationsvarianten A/B/C bewertet, Variante C empfohlen.

## Ergebnisse — Antworten auf die Kernfragen

### Ist der bisherige Weg weiter sinnvoll?
Ja, aber mit Akzentverschiebung. Strukturarbeit (R2, D9) ist im
Wesentlichen abgeschlossen. Reines D3/D5-Seeding ohne Variantenmodell
würde inhaltsleere Felder im Admin erzeugen, gerade auf den 165
Standard-Bildkarten.

### Soll D3/D5-Seeding pausiert werden?
**Teilweise pausieren.** Nur sichere Basis-Seedings jetzt ausführen
(Container-Header `cards_v1`, `hero_v1 · cta_*`, `content_v1 · label` —
zusammen ca. 200 Sections). Die ~2800 Variantenfelder auf `card_v1`
**nach** dem Variantenmodell behandeln, dann oft rechnerisch ohne
Seeding gelöst.

### Welche Zielbausteine werden empfohlen?
20 Zielbausteine (Inventar §3), mit `card_v1` als **einem** Typ in
7 fachlichen Varianten (Bild, Icon-Lucide, Icon-Bildicon, Thumbnail,
Text, Multi-Link/Feature, Download). Standardmuster „Wechselteaser"
bleibt `teaser_2col_v1`. Standard-Container bleibt `cards_v1`.

### Welche vorhandenen Bausteine sind Legacy?
- `series_override_v1`, `series_override_container_v1` — nur Produktkatalog-Override, read-only.
- `content_v1` als **Karten-Container** (R2-Klasse, schon migriert).
- `list_v1` — Spezialfall Referenzprojekte, bleibt aber spezial.
- Item-Schemata `items.N.*` für neue Karten — bereits seit 2026-05-21 verboten.
- Item-Schemata `items.<slug>.q|a` und `items.<n>.q|a` in FAQs — Legacy gegenüber `frage|antwort`.

### Ist B-538 ein gutes Bildkarten-Standardmuster?
**Nein.** B-538 existiert nicht als konkrete Karte; der Verweis im
Auftrag basiert auf einem UI-Platzhalter. Standard-Bildkarte soll
**nicht** an einer einzelnen Beispielkarte hängen, sondern am Vertrag
`card_v1` (Variante `image`) als Kind von `cards_v1`. Reale
Referenzkandidaten im Bestand: aktive `card_v1`-Kinder unter `cards_v1`
in Anwendungen-/Bereichsseiten; für die Multi-Link-Variante die
Türsprechanlagen-Karten B-026/B-027.

### Welche Seitenfamilien sollten zuerst konsolidiert werden?
1. **Bereichshubs** (gebaeudekommunikation.root, zutrittskontrolle.root, gebaeudemanagement.root, eingangssysteme.root) — Wechselteaser ist Standard, nur i18n-Reste abbauen.
2. **Türsprechanlagen-Produktscroller** — Spezialrenderer auf generisches `product_scroller_v1` zurückführen.
3. **home.start Personas** — D9-`rich_v1`-Beziehungen als `cards_v1`+`card_v1` modellieren.

### Welche nächsten 3 großen Sprints empfiehlst du?
1. **Sprint 2l — `card_v1`-Variantenmodell + Aliase**:
   `sectionTypes.ts` um Varianten erweitern (`image` / `icon` /
   `icon_image` / `thumbnail` / `text` / `multi` / `download`),
   Aliase `eyebrow`↔`subtitle`, `headline`↔`title`, `beschreibung`↔`description`
   im Vertrag (und ggf. im generischen Renderer) auflösen.
   D3/D5 reduziert sich rechnerisch um ~2800.
2. **Sprint 2m — Basis-Seedings (klein, klar)**:
   `cards_v1 · {label,title,intro}` für betroffene Container,
   `hero_v1 · {cta_label,cta_href}` (92), `content_v1 · label` (16).
   ~200 Sections, idempotent.
3. **Sprint 2n — i18n-Fallback-Abbau bereichsweise**:
   19 S2-Seiten aus dem Renderer-Inventar bereichsweise auf DB-first
   ziehen (Türsprechanlagen-Scroller, home.start, Kontakt-Seiten,
   Hub-Seiten).

## Empfohlene Migrationsstrategie

**Variante C — kombiniert**: sichere Basis-Seedings sofort, parallel
Variantenmodell entwickeln, dann variantenbewusstes Restseeding.

## Gelieferte Dokumente

- `docs/04-betrieb/zielbaukasten-cms-light-inventar.md` (neu)
- `docs/04-betrieb/sprint-zielbaukasten-eine-wahrheit-bericht.md` (dieses Dokument, neu)

## Scope-Bestätigung

- keine DB-Mutation
- keine Migration
- keine neue Schreib-RPC
- keine Inhalte / Bilder / Feldwerte / Sort-Order / `is_active`-Flags geändert
- keine Whitelist-Änderung
- keine i18n-JSON-Änderung
- keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung
- keine Produktdatenbank-Berührung
- ausschließlich read-only Inventar und Strategievorschlag
