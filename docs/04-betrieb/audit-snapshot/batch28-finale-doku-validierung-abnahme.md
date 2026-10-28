# Batch 28 — Finale Doku-Validierung Abnahme

Stand: 2026-06-05 · Status: **abgeschlossen**.

## Ziel

Aktive Doku final übergabefähig: keine alten Links auf archivierte
Prompt-Dokumente, keine alten Mai-Zahlen als aktive Wahrheit, keine
Widersprüche zu Navigation/CMS-Freeze, klare kopierbare Prompt-Schablone
für Redakteure.

## Geprüfte aktive Dokumente

`docs/README.md`, `docs/current-status.md`, `docs/ai-start-prompt.md`,
`docs/mitarbeiter-fahrplan.md`, `.lovable/always-follow.md`,
`.lovable/plan.md`, `docs/01-strategie/*`, `docs/02-architektur/*`,
`docs/03-redaktion/*`, `docs/04-betrieb/*` (ohne `audit-snapshot/`).

## Aktualisiert

| Datei | Änderung |
|---|---|
| `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` | Prompt-Schablone (Start/Auftrag/Abschluss) prominent in Abschnitt 2 eingebaut. Hinweis auf archivierte Vorgänger ergänzt. |
| `docs/01-strategie/cms-light-source-of-truth.md` | Komplett auf Post-Freeze-Stand umgeschrieben. Alte „75/81"-Zahlen entfernt, Verweis auf `cms-steuerbarkeit-status.md` als Live-Quelle. Stand 2026-06-05. |
| `docs/02-architektur/architektur.md` | Stand 2026-06-05. Navigation-Abschnitt neu: `cms_navigation_nodes` = redaktionelle Struktur, Code = Routing-Mechanik. Breadcrumb-Override-Sonderfall bleibt dokumentiert (Restpunkt). |
| `.lovable/always-follow.md` | Widerspruch in §6 entfernt — Navigation nicht mehr „Code = Public-Quelle", sondern `cms_navigation_nodes` = redaktionelle Struktur, Code = technische Routing-Mechanik. |
| `docs/mitarbeiter-fahrplan.md` | Auf ~1 Seite eingedampft. Verweist auf Dachdokument, `ai-start-prompt.md`, `current-status.md`. |
| `docs/04-betrieb/prompts-vs-admin.md` | Von 516 → ~70 Zeilen. Nur noch Entscheidungstabelle + Stopp-Regeln + Default-Sprache + Verweis auf Dachdokument. Alte Tranche-/Hotfix-Blöcke entfernt. |
| `docs/04-betrieb/naechste-schritte.md` | Komplett auf Post-Freeze umgeschrieben (Login, Klasse-A, Admin-UX, Inhalts-Audit, optionaler Feinschliff). Alte Mai-Tranchen-Listen entfernt. |
| `docs/03-redaktion/kurzanleitung.md` | Stand 2026-06-05. Verweis auf Dachdokument-Schablone als einzige gültige Prompt-Quelle. |
| `docs/03-redaktion/checkliste-redaktion.md` | Link auf archiviertes `redaktions-prompts.md` entfernt, Verweis auf Dachdokument. |
| `docs/03-redaktion/qa-nach-redaktionsrunde.md` | Link auf archiviertes `redaktions-prompts.md` entfernt, Verweis auf Dachdokument. „Geprüft nach Batch 28". |
| `docs/03-redaktion/redaktionshandbuch.md` | Header-Hinweis auf Dachdokument-Schablone. Tote Links (`start-fuer-neue-redakteure.md`, `uebergabe-marketing-redaktion-2026-05-17.md`) entfernt. „Geprüft nach Batch 28". |
| `docs/01-strategie/templates.md` | Toter Verweis auf `redaktions-prompts.md` → Verweis auf Dachdokument. „Geprüft nach Batch 28". |

## Archiviert (verschoben, nicht gelöscht)

| Von | Nach | Grund |
|---|---|---|
| `docs/04-betrieb/dokumentation-archiv-vorschlag.md` | `docs/archiv/doku-historisch/dokumentation-archiv-vorschlag-batch26.md` | Umsetzung des Vorschlags ist mit Batch 27/28 abgeschlossen. Archiv-Header ergänzt. |

`mitarbeiter-fahrplan.md` und `prompts-vs-admin.md` bleiben **aktiv** (auf
Empfehlung gekürzt statt archiviert). `naechste-schritte.md` bleibt
**aktiv** mit Post-Freeze-Inhalt.

## Alte Links / Widersprüche entfernt

- Alle aktiven Verweise auf `redaktions-prompts.md`, `prompt-leitplanken.md`,
  `prompt-kurzanleitung.md`, `start-fuer-neue-redakteure.md`,
  `uebergabe-marketing-redaktion-2026-05-17.md` in aktiven Dokumenten.
  (Verbleibende Treffer ausschließlich in `docs/archiv/**` und in
  `audit-snapshot/batch27-doku-hygiene-abnahme.md` als historischer Beleg
  — dort gewollt.)
- Navigations-Widerspruch in `.lovable/always-follow.md` §6.
- Alte „75/81 Seiten" als aktiver Stand.
- Mai-Stand-Daten ohne Re-Validierung — entweder aktualisiert oder
  „geprüft nach Batch 28 / weiterhin gültig" markiert.

## Finale Prompt-Schablone

Steht in [`../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md),
Abschnitt **2. Prompt-Schablone für Redakteure**. Drei Teile:
Startblock (Pflicht-Lesen + Arbeitsregel) → Arbeitsauftrag (Redaktion
füllt aus) → Abschlussblock (Bericht + Stopp). Komplett kopierbar.

## Bewusst aktiv gelassen (Detail-/Nachschlagewerk, kein Startpunkt)

- `docs/01-strategie/*` (Strategie-Detail)
- `docs/02-architektur/*` (Architektur-Detail, Single-Source-Dokumente)
- `docs/03-redaktion/redaktionshandbuch.md`, `kurzanleitung.md`,
  `checkliste-redaktion.md`, `qa-nach-redaktionsrunde.md` (Redaktions-
  Detailwerke unter dem Dachdokument)
- `docs/04-betrieb/` außer Audit-Snapshot (Policy-/Inventar-Dokumente)

## Nicht angefasst (out of scope dieser Batch)

- `docs/lovable-custom-rules.md`, `docs/lovable-custom-rules-compact.md`
  (eigenes Regelwerk).
- `docs/02-architektur/section-type-vertrag-entwurf.md` (Status-Rückfrage
  offen, separater Auftrag).
- `docs/04-betrieb/audit-snapshot/*` (Audit-Belege, historisch).

## Bestätigung — Scope-Grenzen eingehalten

- Keine DB-Migration durchgeführt.
- Keine Renderer-/Code-Logik geändert.
- Keine Navigation (weder DB noch Code) angefasst.
- Keine Website-Inhalte (`cms_section_fields`, `cms_assets`) geändert.
- Keine Dateien gelöscht — nur verschoben, neu geschrieben, gekürzt,
  verlinkt.

Nach diesem Bericht stoppt der Batch. Keine Batch-29-Arbeit beginnt.
