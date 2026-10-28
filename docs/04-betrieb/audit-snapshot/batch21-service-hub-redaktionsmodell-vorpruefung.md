# Batch 21 — Aufgabe 0: Vorprüfung `service.hub / P-078`

Stand: 2026-06-04 · Read-only

## DB-Stand (verifiziert per `psql`)

| Section | Typ | sort_order | is_active |
|---|---|---:|---|
| `hero` (B-323) | `hero_v1` | 10 | true |
| `sections` (B-324) | **`content_v1`** | 20 | true |
| `standard_cta` (B-2335) | `cta_v1` | 30 | true |

- **`cms_section_fields`:** 132 Feldwerte (66 distinct field_keys × 2 Locales) unter `B-324 sections`.
- **`cms_admin_editable_fields`:** 132/132 whitelisted (alle `is_enabled=true`). → Wahrheits-Check grün, kein Whitelist-Drift.

## Feldstruktur in `B-324 sections`

5 Gruppen × je 1 `<g>.label` + 1 `<g>.headline` + 1 `<g>.intro` + N × `<g>.items.<key>.{title,description,linkLabel}`:

| Gruppe | Items |
|---|---:|
| `produktzugang` | 4 (katalog, finder, serien, stammdaten) |
| `downloads` | 5 (downloads, datenblaetter, handbuecher, schaltplaene, technische) |
| `planung` | 2 (planen, ersatzteile) |
| `support` | 3 (support, faq, glossar) |
| `akademie` | 2 (akademie, serviceportal) |
| **Σ** | **16 Kacheln + 4 Legacy-Leerfelder (`label`, `title`, `text`)** |

## Was kommt aus Code (`src/features/service/pages/ServicePage.tsx`)?

Hart im Code (`sectionsMeta`):

- Gruppen-Reihenfolge (produktzugang → downloads → planung → support → akademie)
- Items pro Gruppe inkl. Reihenfolge
- **Lucide-Icons** (BookOpen, Search, Layers, Database, Download, FileText, …)
- **Routen-Targets** (`ROUTES.service.onlineProduktkatalog`, …)
- **Placeholder-Flag** (`href === ROUTES.placeholder.root` → ausgegraut, nicht klickbar)
- **External-vs-Internal-Logik** (`startsWith("/")` → `<Link>`, sonst `<a>`)
- Alternierender Hintergrund (`bg-secondary` jede zweite Gruppe)
- `cardGridClass("useCases", …)` für das Raster

Aus DB (`t("hub.sections.<g>.…")`, via `useCmsI18n`):

- alle sichtbaren Texte (label, headline, intro, title, description, linkLabel)
- Hero-Label/Headline/Intro
- Hero-Bilder (`cms_assets`)

## Warum kein Karteneditor im Admin?

- `B-324 sections` ist `content_v1` (flacher Felder-Container), nicht `cards_v1`.
- Der Admin-Karteneditor (Add/Sort/Duplicate/Link) bindet ausschließlich an `cards_v1` mit `card_v1`-Kindsections.
- Die 132 Punktfelder sind im Admin nur über Diagnose/„Altbestand-Felder in der DB" zugänglich, **nicht** als Kachelkarten editierbar — obwohl public 16 Kacheln sichtbar sind.
- Genau das ist der **Redaktionsmodell-Bruch**: Wahrheits-Check ist grün (DB-Wert = Public-Wert), aber Redaktionserwartung „Karte anlegen / sortieren / duplizieren / Ziel-Seite verlinken" ist nicht erfüllbar.

## Unterseiten-Verlinkung

| Karte | Ziel-Route | Pages-Status |
|---|---|---|
| katalog | `/service/online-produktkatalog` | echte Page |
| finder | `ROUTES.placeholder.root` | **Placeholder (ausgegraut)** |
| serien | placeholder | Placeholder |
| stammdaten | placeholder | Placeholder |
| downloads / datenblaetter / handbuecher / technische | `/service/downloads` | echte Page |
| schaltplaene | `/service/technischer-support` | echte Page |
| planen | `/service/planen-konfigurieren` | echte Page |
| ersatzteile | `/service/ersatzteile` | echte Page |
| support | `/service/technischer-support` | echte Page |
| faq | `/service/downloads` | echte Page (Ziel umstritten) |
| glossar | placeholder | Placeholder |
| akademie | `/wissen/akademie` | echte Page (anderer Bereich) |
| serviceportal | `/serviceportal` | T01-Sonderseite (parkiert) |

Link-Modell heute: hartcodierte Route-Konstanten + `linkLabel` aus DB.
Sauberes Zielmodell: `link_page_key` (DB-Pointer auf `cms_pages.page_key`) + `is_external`-Flag.

## Redaktionssicht (Bewertung)

- **Public sieht aus wie:** 5 Themenkachel-Sektionen mit alternierendem Hintergrund, jede mit Eyebrow + H2 + Intro + Kachelraster.
- **Redakteur erwartet hier:** Kachel hinzufügen/löschen, Reihenfolge ändern, Titel/Beschreibung/Linktext bearbeiten, Ziel-Seite per Dropdown wählen, Icon wählen, Placeholder-Markierung setzen.
- **Heute möglich:** nur Texte ändern (über „Altbestand"-Editor). Strukturänderungen (Karte hinzufügen, sortieren, Ziel ändern, Icon wechseln) brauchen Code-Deploy.
- **Klassifikation:** **A — echte Kartenwolke**, klarer Migrationskandidat.

## Warum Wahrheits-Check trotzdem grün

Wahrheits-Check prüft 4 Quellen pro Slot (DB · Whitelist · Renderer · UI-Code-Fallback). Hier:
- DB hat Werte → ✓
- Whitelist deckt alle 132 Felder → ✓
- Renderer liest jeden Wert per `t("hub.sections.…")` → ✓
- Kein UI-Fallback nötig (DB liefert) → ✓

Das Modell „flache Punktfelder + Custom-Renderer" ist technisch sauber gespiegelt — aber redaktionell unbedient. Genau dieses Delta ist der Auslöser für Batch 21/22.
