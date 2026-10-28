> **Historisch — ersetzt durch das Dachdokument** (`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`). Verschoben im Batch 27, 2026-06-05. Inhalt unverändert darunter erhalten.

# Prompt-Leitplanken — neue Inhalte landen sofort auf Grün

Stand: 2026-06-02 · **Hinweis (Batch 26):** Dieses Dokument bleibt fachlich
gültig (insbesondere die T-Code- und Container-Tabellen sind nach wie vor
die Referenz). Übergeordnete Startseite ist jedoch das Dachdokument
**[`redaktions-uebergabe-und-prompt-regeln.md`](./redaktions-uebergabe-und-prompt-regeln.md)**.
Sobald die Tabellen ins Dachdokument übernommen sind, wird diese Datei
nach `docs/archiv/redaktion-historisch/` verschoben (siehe
[Archiv-Vorschlag](../04-betrieb/dokumentation-archiv-vorschlag.md)).

Diese Datei ist **verbindlich** für jeden Prompt, der neue Seiten, Sections,
Karten oder Slots erzeugt. Ziel: alles, was per Prompt entsteht, ist
**„eine Wahrheit"** im Sinne des Wahrheits-Checks
(siehe `docs/04-betrieb/wahrheits-check.md`) — also DB ✓, Whitelist ✓,
Renderer ✓, kein UI-Code-Fallback.

Wer eine KI prompted, soll sich an diesem Gerüst orientieren. Wer als KI
prompted, MUSS dieses Gerüst einhalten und bei Abweichung melden statt
improvisieren.

---

## 1. Seitentypen-Pflicht (`cms_pages.page_type`)

Jede neue Seite bekommt **genau einen** dieser T-Codes. Kein freies Feld,
keine Mischformen.

| Code | Seitentyp                           | Wofür                                          | Pflicht-Bausteine                       | Optional                                                                 |
|------|-------------------------------------|------------------------------------------------|-----------------------------------------|--------------------------------------------------------------------------|
| T01  | Startseite                          | nur 1× pro Sprache                             | `hero_v1`, `teaser_2col_v1`             | `stats_v1`, `content_v1`, `cards_v1`, `cta_v1`, `rich_v1`                |
| T02  | Hauptmenüpunkt-Sonderseite          | Hubs mit eigener Logik (Produkte-, Service-Hub)| `hero_v1`, `cards_v1`                   | `content_v1`, `teaser_2col_v1`, `product_scroller_v1`, `feature_grid_v1`, `faq_v1`, `cta_v1` |
| T03  | Hauptmenüpunkt-Standardseite        | normale Bereichs-Hubs                          | `hero_v1`, `content_v1`, `teaser_2col_v1` | `cards_v1`, `faq_v1`, `cta_v1`                                          |
| T04  | Untermenüpunkt-Seite                | Themen-Unterseite                              | `hero_v1`, `content_v1`                 | `teaser_2col_v1`, `cards_v1`, `product_scroller_v1`, `feature_grid_v1`, `faq_v1`, `cta_v1` |
| T05  | Detail-Seite                        | Produkt-/Themendetail                          | `hero_v1`, `content_v1`, `faq_v1`       | `product_scroller_v1`, `feature_grid_v1`, `cards_v1`, `download_list_v1`, `contact_block_v1`, `cta_v1` |
| T11/T17/T19 | Sonderseite                  | Legal, Kontakt, Karriere, Serviceportal        | je nach Zweck                           | `hero_v1`, `content_v1`, `contact_block_v1`, `faq_v1`, `cta_v1`         |

Quelle: `src/features/admin/lib/pageTypeMatrix.ts` — wenn die Matrix sich
ändert, ändert sich diese Tabelle mit.

---

## 2. Standard-Bausteine (immer mitbestellen)

Auf **T03, T04, T05** werden grundsätzlich zwei Standard-Slots vorgesehen,
auch wenn der Prompt sie nicht erwähnt:

- **`faq_v1`** — Akkordeon mit 5 Q&A, default `is_active=false`
- **`cta_v1`** — „Lassen Sie uns Ihr Projekt gemeinsam planen…", default `is_active=false`

Begründung: Spiegelregel + Inhalt-zuerst. So kann der Admin sie jederzeit
einblenden, ohne dass eine neue Migration nötig wird.

---

## 3. Container-Typen (Karten richtig anlegen)

Wenn ein Prompt von „Karten" spricht, MUSS der Container-Typ explizit
gewählt werden — keine Eigenerfindungen.

| Wunsch im Prompt                              | Korrekter `section_type` | Was es ist                                                                                  |
|-----------------------------------------------|--------------------------|---------------------------------------------------------------------------------------------|
| „Kartenraster", „Grid", „Übersicht in Kacheln"| `cards_v1`               | Statisches Raster, alle Karten sichtbar, responsive (1/2/3/4 Spalten).                      |
| „Karten-Scroller", „horizontal scrollen"       | `product_scroller_v1`    | Horizontal scrollbare Reihe, gleich hohe Karten, Snap-Punkte.                               |
| „Feature-Liste mit Icons"                      | `feature_grid_v1`        | Icon + Headline + Text, kein Bild.                                                          |
| „Wechselteaser", „Bild links / Text rechts"    | `teaser_2col_v1`         | Zweispaltige Wechselblöcke. Nicht für mehr als 4 Items — sonst `cards_v1`.                  |
| „Hero", „Seitenkopf"                           | `hero_v1`                | Genau **einer** pro Seite, immer ganz oben.                                                 |
| „Intro-Text", „Einleitungsabsatz"              | `content_v1`             | Eyebrow + Headline + Fließtext.                                                             |
| „Kontaktbox", „Ansprechpartner"                | `contact_block_v1`       | —                                                                                           |
| „Downloads", „PDF-Liste"                       | `download_list_v1`       | —                                                                                           |

Karten innerhalb eines Containers sind eigene Sections mit `parent_id` auf
den Container. Pro Karte gilt das **Standardkarten-Modulmodell**
(`docs/04-betrieb/standardkarte-modulmodell-latest.md`): `image_card`,
`icon_card`, Headline, Subline, CTA-Slot.

---

## 4. „Grün-by-default"-Checkliste für jede Migration

Eine Migration, die eine neue Section oder ein neues Feld anlegt, ist nur
dann vollständig, wenn alle vier Punkte erfüllt sind:

1. **DB**: `cms_sections` + `cms_section_fields` (DE+EN) + ggf. `cms_assets`
   sind mit sinnvollen Defaults befüllt (auch leer ist ok, aber das Feld
   muss existieren).
2. **Whitelist**: jeder neue `field_key` bekommt im **selben Migrationsschritt**
   einen Eintrag in `cms_admin_editable_fields`
   (`page_key`, `section_key`, `field_key`, `locale`, `is_enabled=true`).
3. **Renderer**: der gewählte `section_type` existiert in
   `src/features/admin/lib/rendererSlotMap.ts` **und** hat eine Renderer-
   Komponente unter `src/features/cms/components/sections/`. Wenn nicht:
   stoppen, melden — keinen neuen Typ erfinden.
4. **Kein UI-Fallback**: in der Page-Komponente darf das Feld nicht
   hartcodiert sein. Wenn doch ein Fallback existiert, vor dem Aktivieren
   entfernen (oder bewusst in `KNOWN_UI_FALLBACKS` listen, bis der Umzug
   abgeschlossen ist).

Erst wenn 1–4 sitzen, ist der Slot im Wahrheits-Check **„Eine Wahrheit"**.

---

## 5. Pflicht-Erstsatz für jeden Inhaltsprompt

Vor inhaltlichen Prompts an Lovable gehört diese Zeile (oder eine
gleichwertige) an den Anfang:

> „Datenbank-first, alles auf Grün im Wahrheits-Check. Halte dich an
> `docs/03-redaktion/prompt-leitplanken.md`."

So weiß die KI, dass sie:

- den Seitentyp (T-Code) bestätigen muss
- den richtigen Container-Typ wählt
- FAQ + Projekt-CTA als Standard mitdenkt
- die Whitelist mit anlegt
- keine Inhalte hart in den Code schreibt

---

## 6. Was Lovable NIE per Inhalts-Prompt tun darf

- Texte, Headlines, Sublines, Bilder, Linktitel oder Alt-Texte **in
  Komponentencode** schreiben.
- Neue `section_type`-Werte erfinden, für die es keinen Renderer gibt.
- Migrationen ohne Whitelist-Eintrag committen.
- Bestehende redaktionelle Inhalte überschreiben, ohne sie vorher zu
  melden.
- An Produktdatenbank, Public-Routing oder Navigation rühren, solange
  der Prompt das nicht ausdrücklich verlangt.

Bei Konflikt zwischen Prompt und Leitplanken: **stoppen, melden, nicht
improvisieren** (Always-Follow §1).

---

## Verweise

- [`.lovable/always-follow.md`](../../.lovable/always-follow.md) — Projektregeln
- [`docs/ai-start-prompt.md`](../ai-start-prompt.md) — KI-Einstieg
- [`docs/04-betrieb/wahrheits-check.md`](../04-betrieb/wahrheits-check.md) — Statuslogik
- [`docs/04-betrieb/seitentypen-bausteinmatrix-latest.md`](../04-betrieb/seitentypen-bausteinmatrix-latest.md) — Bausteinmatrix
- [`docs/04-betrieb/standardkarte-modulmodell-latest.md`](../04-betrieb/standardkarte-modulmodell-latest.md) — Karten-Module
- [`docs/03-redaktion/prompt-kurzanleitung.md`](./prompt-kurzanleitung.md) — Kurzfassung für Redaktion
