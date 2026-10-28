# Batch 21 — Aufgabe 1: Inventar „content_v1 mit Punktfeld-Wolken"

Stand: 2026-06-04 · Read-only

## Suchkriterium

- `cms_sections.section_type = 'content_v1'`
- Section + Page sind `is_active=true` / `status='published'`
- **≥ 8 distinct `field_key`** in der Section (de-Locale gezählt)
- Mindestens ein Treffer auf:
  - Regex `/(^|\.)items?\.[a-z0-9_-]+\.(title|label|description|linkLabel|href|icon)$/i`
  - **oder** paarweise `<key>.headline` + `<key>.intro` (≥ 1 vollständiges Paar)

## Ergebnis

**4 Fälle projektweit** — keine ausufernde Restschuld, sondern punktuelle Modellbrüche.

| # | page_key | section_key | Feldkeys | items.* | Gruppen | Klasse | Public-Eindruck | Migrationskandidat? |
|--:|---|---|---:|---:|---:|:--:|---|:--:|
| 1 | `service.hub` | `sections` | 66 | 48 | 5 | **A** | 5 Themenkachel-Sektionen, 16 Kacheln | **Ja — Pilot Batch 22** |
| 2 | `gebaeudekommunikation.beschilderung` | `features` | 16 | 4 | 0 | **A** | 4 Bildkacheln (hausnummer/klingel/materialien/tuerschilder) | Ja — später |
| 3 | `gebaeudemanagement.digital-signage` | `products` | 8 | 3 | 0 | **A** | 1 Produktkachel (infoboard) | Ja — klein, später sammeln |
| 4 | `gebaeudekommunikation.grossanlagen` | `leistungen` | 15 | 3 | 0 | **B** | 3 Leistungsblöcke mit Bullet-Listen | **Nein** — Bullets, kein Kartenraster |

## Klassifikation A–E

- **A — echte Kartenwolke (3 Fälle):** Public zeigt Kacheln, Redaktion erwartet Karteneditor (anlegen, sortieren, duplizieren, verlinken).
- **B — Textblock mit legitimen Punktfeldern (1 Fall):** `grossanlagen / leistungen` nutzt `items.X.items.0..2` für **Bullet-Listen**, kein Kartenraster. `cards_v1` wäre die falsche Form; sachgerecht wäre eher `feature_grid_v1` oder `tabs_v1`. Heutige Form ist redaktionell genug, solange Bullets selten geändert werden.
- **C — Layout-/Wrapper-Helfer:** keine Funde.
- **D — Legacy/Altbestand:** keine Funde (alle 4 Sections werden aktiv gerendert).
- **E — Sonderseite:** keine Funde.

## Redaktionsperspektive je Fall

| # | „Sieht aus wie Karten?" | „Erwartung: Karten editieren?" | Entscheidung |
|--:|:--:|:--:|---|
| 1 | ✅ klar | ✅ klar | **Pilot** |
| 2 | ✅ | ✅ (mit Bildslot + Alt) | Folgekandidat |
| 3 | ✅ klein | ✅ (weitere Produkte ergänzen) | Folgekandidat |
| 4 | ❌ (Bullets) | ❌ (Listen pflegen) | beibehalten |

## Bemerkung Wahrheits-Check

Alle 4 Sections sind **wahrheits-check-grün** (DB-Wert = Public-Wert, vollständige Whitelist, kein Renderer-Fallback). Der Modellbruch ist nicht „Inhalt fehlt", sondern „Editor-Erlebnis fehlt".
