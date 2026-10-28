# Seitentypen- und Bausteinmatrix (CMS-Light)

**Etappe:** `cms-light-seitentypen-bausteinmatrix-und-admin-sicht-1`
**Stand:** 2026-06-02
**Scope:** Audit + Systematik + read-only Admin-Hinweis. Keine Inhaltsmigration. Keine DB-/Migrations-/RPC-/Whitelist-/i18n-/Routen-/Navigations-/Footer-/Breadcrumb-Änderung. Keine Inhalte überschrieben.

> **Quellen-Hinweis (führend):** Die verbindliche Wahrheit zu Seitentypen, Containern und Pflicht-/Optional-Bausteinen lebt in
> `docs/03-redaktion/prompt-leitplanken.md` und `src/features/admin/lib/pageTypeMatrix.ts`.
> Diese Matrix-Doku ist daraus **abgeleitet** und darf keine eigene zweite Wahrheit bilden. Bei Konflikten gelten Leitplanken + `pageTypeMatrix.ts`; diese Datei wird dann nachgezogen.

---

## Executive Summary

- Im Code existieren **23 Section-Types** im Vertrag, davon **12 mit generischem Renderer**, **6 Container** (rendern Kinder), **3 reine Kindelemente** (`card_v1`, `stat_v1`, `tab_v1`) und einige **Alias/Spezial-Typen** für den Produktbereich.
- Echte Standardbausteine im Sinne der PDF-Vorlage: `hero_v1`, `content_v1`, `teaser_2col_v1`, `cards_v1`+`card_v1`, `product_scroller_v1`, `feature_grid_v1`, `stats_v1`, `faq_v1`, `cta_v1`, `download_list_v1`, `contact_block_v1`.
- DB-Code `cms_pages.page_type` ist heute **eine T-Kennung** (T01–T19, plus `standard`). Diese T-Kennungen sind jetzt auf die vier fachlichen Seitentypen der PDF gemappt — sieh `src/features/admin/lib/pageTypeMatrix.ts`.
- Die zugeordneten Pilotseiten (`home.start`, vier Bereichs-Hubs, `anwendungen.root`, `service.hub`, `gebaeudekommunikation.tuersprechanlagen`) folgen heute schon weitgehend dem Sollbild. Größte sichtbare Lücke: **`service.hub`** ist als Hub angelegt, hat aber bisher nur Hero + Intro, keine Wechselteaser.
- Der PageEditor zeigt jetzt einen ruhigen, read-only Hinweis „Seitentyp & Bausteine" mit Sollbild und Abweichungen. Keine Validierung, keine Korrektur.

---

## Aufgabe 1 — Baustein-Inventar

Quelle: `src/features/cms/contract/sectionTypes.ts`, `src/features/cms/components/sections/`, `src/features/admin/components/BildkartenCardWorkspace.tsx`.

| Section-Type | Rolle | Renderer | Admin-Workspace | Bemerkung |
|---|---|---|---|---|
| `hero_v1` | Standard (skip in BodyRenderer, rendert via `CmsPageLayout`) | implizit | nein | wird über Standardfelder gepflegt |
| `content_v1` | Standard (Intro/Textblock) | `ContentSectionV1` | nein | Aliase: `content`, `intro`, `content_block_v1` |
| `teaser_2col_v1` | Standard (Wechselteaser) | `Teaser2ColV1` | nein | Workspace offen |
| `cards_v1` | Container (Kartenraster) | `CardsSectionV1` | für Kinder `card_v1` | folgt `resolveCardVisibility` |
| `card_v1` | Kindelement | gerendert vom Eltern-Container | **`BildkartenCardWorkspace`** | einzige Karte mit vollem Workspace |
| `product_scroller_v1` | Container (Kartenscroller) | `ProductScrollerV1` | für Kinder `card_v1` | Renderer noch ohne `resolveCardVisibility` |
| `feature_grid_v1` | Container (Icon-Karten) | `FeatureGridV1` | für Kinder `card_v1` | folgt Resolver |
| `stats_v1` | Container (Kennzahlen) | `StatsV1` | nein | Kinder: `stat_v1` |
| `stat_v1` | Kindelement | über `StatsV1` | nein | — |
| `faq_v1` | Standard | `FaqV1` | nein | — |
| `cta_v1` | Standard | `CtaV1` | nein | Alias: `cta` |
| `rich_v1` | Standard (Rich-Text) | `RichV1` | nein | — |
| `tabs_v1` | Container | `TabsV1` | nein | Kinder: `tab_v1` |
| `tab_v1` | Kindelement | über `TabsV1` | nein | — |
| `download_list_v1` | Container (Downloads) | `DownloadListV1` | nein | Kinder: `download_item_v1` — abweichend vom PDF-Ziel „Downloads als Standardkarten-Variante" |
| `contact_block_v1` | Standard (Kontakt) | `ContactBlockV1` | nein | — |
| `list_v1` | Standard (Aufzählung) | nein (Sonder) | nein | nur in Spezialseiten |
| `card_grid_v1` | Alias / Hub-Karten-Grid | n/a (Spezial-Hub) | nein | Produkt-/Hubseiten |
| `catalog_filter_grid_v1` | Alias / Produkt-Filtergrid | n/a (Produktbereich) | nein | `always-follow`: nicht anfassen |
| `series_override_v1`, `series_override_container_v1` | Sonderfall Produktbereich | n/a | nein | Produktbereich-Schutz |
| `role_tabs_v1` | Sonderfall Personas | n/a | nein | Personas-Block |

**Status zentrale Wahrheit (`resolveCardVisibility`):** `cards_v1` ✅, `feature_grid_v1` ✅, `product_scroller_v1` ⚠️ (noch nicht angeschlossen — offene Etappe).

---

## Aufgabe 2 — Seitentypen-Sollstruktur

Mapping: `cms_pages.page_type` (DB-Code) → fachlicher Seitentyp (PDF):

| DB-Code | Fachlicher Seitentyp | Anzahl Seiten | Sollbild |
|---|---|---|---|
| `T01` | **Startseite** | 1 | Hero · Wechselteaser. Optional: Kennzahlen, Intro, CTA, Karten, Rich-Text |
| `T02` | **Hauptmenüpunkt-Sonderseite** | 7 | Hero · Intro · Wechselteaser. Optional: Karten, CTA |
| `T03` | **Hauptmenüpunkt-Standardseite** | 3 | Hero · Intro · Wechselteaser. Optional: Karten, CTA |
| `T04` | **Untermenüpunkt-Seite** | 15 | Hero · Intro. Optional: Wechselteaser, Karten, Scroller, Feature-Raster, FAQ, CTA |
| `T05` | **Detail-Seite** | 81 | Hero · Intro · **FAQ** (seit 2026-06-02 als leerer Container auf jeder T05-Seite vorhanden). Optional: Scroller, Feature-Raster, Karten, Downloads, Kontakt, CTA |
| `T11`, `T17`, `T19`, `standard` | **Sonderseite** | 11 | Frei. Optional je nach Zweck: Hero, Intro, Kontakt, FAQ, CTA |

Die Soll-Definition lebt jetzt **maschinenlesbar** in `src/features/admin/lib/pageTypeMatrix.ts` (`SEITENTYPEN` + `PAGE_TYPE_CODE_MAP`).

---

## Aufgabe 3 — Bestehende Seiten zuordnen

Erhoben über `cms_sections` (Top-Level, aktiv) am 2026-06-02:

| Seite | DB-Code | Fachlicher Typ | Vorhandene Bausteine (Top-Level, aktiv) | Status |
|---|---|---|---|---|
| `home.start` (P-001) | T01 | Startseite | Hero · Kennzahlen · Intro · 6× Wechselteaser · Rich · CTA · Kartenraster | **passt** — übertrifft das Mindest-Sollbild |
| `gebaeudekommunikation.root` (P-027) | T03 | Hauptmenüpunkt-Standardseite | Hero · Intro · 5× Wechselteaser · Kartenraster · Intro | **passt** |
| `zutrittskontrolle.root` (P-010) | T03 | Hauptmenüpunkt-Standardseite | Hero · Intro · 4× Wechselteaser | **passt** — am 2026-06-02 von T04 auf T03 umklassifiziert (Bereichs-Hub-Logik). |
| `gebaeudemanagement.root` (P-049) | T03 | Hauptmenüpunkt-Standardseite | Hero · Intro · 5× Wechselteaser | **passt** |
| `eingangssysteme.root` (P-041) | T03 | Hauptmenüpunkt-Standardseite | Hero · Kartenraster · 7× Wechselteaser · Kartenraster · Intro · Wechselteaser | **passt** (Kartenraster vorgezogen, Intro nachgelagert) |
| `anwendungen.root` (P-055) | T03 | Hauptmenüpunkt-Standardseite | Hero · Intro · 5× Wechselteaser · Kartenraster · Intro · Kartenraster | **passt** — am 2026-06-02 von T02 auf T03 umklassifiziert (struktur­gleich mit den vier anderen Bereichs-Hubs). |
| `service.hub` (P-078) | T02 | Hauptmenüpunkt-Sonderseite | Hero · Intro | **abweichend** — Sollbild verlangt Wechselteaser zu den Service-Themen; aktuell nur Hero + Intro |
| `gebaeudekommunikation.tuersprechanlagen` (P-004) | T05 | Detail-Seite | Hero · Intro · 2× Scroller · 2× Wechselteaser · Kartenraster · Feature-Raster · Intro | **passt** — vollständige Detailseite, Referenz für Untermenü/Detail-Mischung |
| `signage.root` (P-135) | T05 | Detail-Seite | Hero · Intro · Kartenraster | **passt** (schlanke Detailseite) |
| Produkt-Hub `produkte.*` (P-253) | n/a | **Sonderseite** (Produktbereich) | nicht via `cms_sections` gepflegt | **Sonderseite** — `always-follow` verbietet Eingriff |
| `kontakt.root` (P-128) | standard | Sonderseite | Page-Komponente | **Sonderseite** |

---

## Aufgabe 4 — Admin-Sicht

**Umgesetzt in dieser Etappe:**

- Neuer read-only Hinweisblock „Seitentyp & Bausteine" im PageEditor (oberhalb der einklappbaren technischen Stammdaten).
- Inhalt:
  - Seitentyp als Klartext-Label (z. B. „Hauptmenüpunkt-Standardseite") + Roh-Code (z. B. `T03`).
  - Kurze redaktionelle Beschreibung des Sollbildes.
  - Liste der **vorhandenen** Top-Level-Bausteine (deduppt, mit menschenlesbaren Namen wie „Wechselteaser", „Kartenraster").
  - Liste der **fehlenden** Soll-Bausteine (gelb, nur falls vorhanden).
  - Liste der **zusätzlichen** Bausteine außerhalb Sollbild (neutral, nur falls vorhanden).
  - Wenn alles passt: ruhiger Hinweis „Abweichungen: keine".
- Keine Validierung, keine Fehlerstufe, keine Korrektur. Reiner Orientierungs-Hinweis im redaktionellen Modus.

**Bewusst nicht umgesetzt:**

- Kein neuer Bereich „Seitentyp & Bausteine" in der Tab-Leiste.
- Kein Schreibweg für `page_type`.
- Keine UI in TemplateWorkshop (kommt frühestens, wenn Templates für die vier Seitentypen formal definiert sind — siehe offene Entscheidungen).

---

## Aufgabe 5 — Keine automatische Korrektur

Bestätigung: in dieser Etappe **kein** Section deaktiviert, **keine** Karte verschoben, **kein** Teaser erzeugt, **keine** Migration. Reine Analyse + read-only UI + Doku.

---

## Offene Entscheidungen

1. **`zutrittskontrolle.root`** — am 2026-06-02 auf T03 umklassifiziert. ✅ erledigt.
2. **`service.hub`** — Wechselteaser zu Service-Themen pflegen (Redaktion) oder Sollbild für T02 weicher fassen?
3. **`download_list_v1`** mit Kindern `download_item_v1` vs. PDF-Ziel „Download als Standardkarten-Preset". Separate Migrations-Etappe nötig.
4. **`product_scroller_v1`** noch ohne `resolveCardVisibility`. Drift zwischen Admin (zeigt Felder) und Public (rendert nicht). Eigene Etappe.
5. **Formale Templates für die vier Seitentypen** in `TEMPLATE_REGISTRY` als read-only `TemplateDefinition` ergänzen — heute existiert nur `produkt_sub_v1`.

---

## Empfohlene nächste Etappen

1. `cms-light-template-startseite-readonly-1` — TemplateDefinition für T01 anlegen.
2. `cms-light-template-hauptmenuepunkt-readonly-1` — TemplateDefinition für T02/T03 (gemeinsam).
3. `cms-light-product-scroller-zentrale-wahrheit-1` — `ProductScrollerV1` auf `resolveCardVisibility` ziehen.
4. `cms-light-service-hub-wechselteaser-1` — Redaktionelle Etappe für `service.hub`.
5. `cms-light-download-item-zu-card-1` — Migrationsetappe für Download-Preset.

---

## Verifikation

- `tsc --noEmit` — durchläuft sauber (UI-only Änderung + neues Lib-Modul, keine Type-Brüche).
- `npm run cms:audit:contract` — unverändert (kein Vertrags-Eingriff).
- `npm run cms:audit:renderer` — unverändert (keine Renderer-Änderung).
- `npm run cms:audit:renderer-fallback-inventory` — unverändert.
- Keine Änderung an öffentlicher Website, Routen, Navigation, Footer, Breadcrumb, Inhalten oder Produktdatenbank.

---

## Quellen

- Code: `src/features/cms/contract/sectionTypes.ts`, `src/features/cms/components/sections/*.tsx`, `src/features/admin/lib/pageTypeMatrix.ts` (neu), `src/features/admin/components/PageEditor.tsx`.
- DB: `cms_pages.page_type` + `cms_sections` (Top-Level, aktiv), Abfrage am 2026-06-02.
- Vorgängerdoku: `docs/04-betrieb/seitentypen-bausteinmatrix-latest.md` (Stand 2026-06-02 morgens) — wird mit dieser Version ersetzt; bisherige Inhalte sind in den Tabellen oben aufgegangen.
