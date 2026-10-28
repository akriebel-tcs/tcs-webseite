# Prompt oder Admin? Welche Änderung läuft wo?

Stand: 2026-06-05 (nach Batch 25/26/27 — CMS-Freeze + Doku-Hygiene).

> **Diese Datei ist nur Entscheidungstabelle + Stopp-Regeln.**
> Die verbindliche Prompt-Schablone steht im Dachdokument:
> [`../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md).

## Grundsatz

Es gibt keine grundsätzlich ausgeschlossenen Änderungswünsche. Entscheidend
ist, **auf welcher Ebene** sie umgesetzt werden.

## Die vier Änderungsebenen

| Ebene | Wofür | Wer |
|---|---|---|
| **1. Admin / CMS-Light** | Texte, Bilder, Reihenfolge, Sichtbarkeit, Nav-Labels, neue Karten/Seiten im bestehenden Section-Typ | Redaktion direkt im `/admin` |
| **2. Lovable / Prompt** | Bulk-Pflege, neue Seiten auf Basis bestehender T-Codes/Section-Typen, Navigations-Umbauten | Redaktion via Prompt-Schablone aus dem Dachdokument |
| **3. Technik / Code** | Neue Section-Typen, neue Renderer-Logik, neue Felder, RLS/RPC, Migrationen | Technische Steuerung, eigener Auftrag |
| **4. Produktdatenbank** | Artikelnummern, Specs, Produktbilder, PDP, Filter | Produkt-/Katalogprozess (separat) |

## Schnellantwort

| Aufgabe | Ebene |
|---|---|
| Headline / Subline ändern | 1 — Admin |
| Bild austauschen, Alt-Text pflegen | 1 — Admin |
| Reihenfolge zweier Sections tauschen | 1 — Admin |
| Sichtbarkeit eines Blocks an/aus | 1 — Admin |
| Navigations-Label umbenennen | 1 — Admin |
| Karte/Block kopieren und einfügen | 1 — Admin |
| Bulk-Änderung (viele Felder gleichzeitig) | 2 — Prompt |
| Neue Seite (bestehender T-Code) | 2 — Prompt |
| Navigation umbauen (Knoten, Sortierung, Hauptmenü-aus, Footer-Slots) | 2 — Prompt |
| QA-Runde / Wahrheits-Check ausführen | 2 — Prompt |
| Neuer Section-Typ / neuer Renderer / neue DB-Spalte | 3 — Technik |
| Layout / Spacing / Animation ändern | 3 — Technik |
| CI / Farben / Typografie ändern | 3 — Technik |
| Login / Auth / Rollen | 3 — Technik (eigenes Folgeprojekt) |
| Produktbild, Specs, Filterlogik | 4 — Produktprozess |

## Stopp-Regeln

Lovable stoppt und meldet, wenn:

- Ein **neuer Section-Typ** nötig wäre (`section_type` existiert nicht).
- Eine **Renderer-Sonderlogik** oder neue Komponente nötig wäre.
- Eine **DB-Migration** nötig wäre.
- **Auth / Login / Rollen** berührt werden.
- **Produktdatenbank, PDP, Katalog** berührt würden.
- Inhalte **hartcodiert** im Code statt in der DB landen sollen.
- Eine Änderung gegen `.lovable/always-follow.md` verstößt.

In diesen Fällen: **eigener technischer Auftrag**, nicht im Redaktionsprompt
miterledigen.

## Default-Sprache (DE / EN)

Per Prompt geänderte DE-Texte werden im selben Schritt automatisch per
Edge Function `cms-translate-field` ins EN übersetzt und gespeichert.
Ausnahmen ausdrücklich im Prompt nennen: „nur DE ändern", „nur EN ändern",
„EN unverändert lassen". Im Admin bleiben DE/EN getrennte Felder.

Details siehe `.lovable/always-follow.md` §12.

## Verweise

- **Dachdokument (führend):** [`../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)
- Projektregeln: [`../../.lovable/always-follow.md`](../../.lovable/always-follow.md)
- Live-Status: [`audit-snapshot/cms-steuerbarkeit-status.md`](./audit-snapshot/cms-steuerbarkeit-status.md)
- Kurzanleitung Redaktion: [`../03-redaktion/kurzanleitung.md`](../03-redaktion/kurzanleitung.md)
