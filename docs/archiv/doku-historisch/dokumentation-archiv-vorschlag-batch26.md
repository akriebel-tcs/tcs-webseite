> **ARCHIVIERT (Batch 27/28, 2026-06-05):** Dieser Vorschlag aus Batch 26 ist umgesetzt. Liegt nur noch als Beleg hier. Aktive Doku-Struktur siehe `docs/README.md`.

---

# Dokumentation Archiv-Vorschlag

Stand: 2026-06-05 · Batch 26. **Reiner Vorschlag, nichts wurde
verschoben oder gelöscht.** Bitte erst nach explizitem Auftrag umsetzen.

> Archivziel: bestehender Ordner [`docs/archiv/`](../archiv/) —
> **kein** neuer `docs/99-archiv/`. Wir wollen nicht zwei Archive.

## Legende

- **Aktiv behalten** — gilt heute, ist für Redaktion / neue Seiten /
  Navigation / CMS-Pflege / Architektur weiterhin Pflicht-Lektüre.
- **Ins Archiv verschieben** — vollständig durch jüngere/Dach-Doku
  ersetzt. Reine Historie.
- **Beleg behalten (nicht anfassen)** — Audit-Artefakte oder Abschluss-
  berichte. Alt, aber als Belegkette wichtig — bleibt am Platz.
- **Inhalt übernehmen** — einzelne Passagen ins neue Dachdokument ziehen,
  Original dann archivieren.

---

## 1. `docs/` (Hauptverzeichnis)

| Datei | Empfehlung | Begründung |
|---|---|---|
| `README.md` | aktiv behalten | Wegweiser. Nach Batch 26 aktualisiert. |
| `current-status.md` | aktiv behalten, **kürzen prüfen** | Lange Sprint-Historie. Header okay, ältere Sprint-Blöcke (vor Batch 20) könnten in `docs/archiv/sprint-historie.md` ausgelagert werden — eigener Folge-Auftrag, hier nicht angefasst. |
| `ai-start-prompt.md` | aktiv behalten, **aktualisieren** | KI-Einstieg. Sollte als ersten Verweis das neue Dachdokument nennen. |
| `mitarbeiter-fahrplan.md` | aktiv behalten | Onboarding-Pfad. |
| `migration-log.md` | Beleg behalten | Historische Migrations-Etappen B–H. |
| `lovable-custom-rules*.md` | aktiv behalten | Lovable-Regelwerk. |

## 2. `docs/01-strategie/`

| Datei | Empfehlung | Begründung |
|---|---|---|
| `cms-light-source-of-truth.md` | aktiv behalten | Strategie-Kern. |
| `seitentyp-taxonomie.md` | aktiv behalten | Pflicht für neue Seiten (T-Codes). |
| `templates.md` | aktiv behalten | Strukturvorlagen. |
| `asset-strategie.md` | aktiv behalten | Bild-/Slot-Regeln. |
| `i18n-strategie.md` | aktiv behalten | DB-first, `useCmsI18n`. |
| `url-sprachstrategie.md` | aktiv behalten | URL/Sprach-Mapping. |
| `serviceportal-status.md` | aktiv behalten | Status des parkierten Bereichs. |
| `produktbereich-routing-map.md` | aktiv behalten | Produkt-Routing. |

## 3. `docs/02-architektur/`

| Datei | Empfehlung | Begründung |
|---|---|---|
| `architektur.md` | aktiv behalten | Gesamtbild. |
| `datenmodell-erklaert.md` | aktiv behalten | 6 CMS-Tabellen. |
| `section-typen-katalog.md` | aktiv behalten | Pflicht-Lektüre für neue Sections. |
| `karten-raster-regel.md` | aktiv behalten | Container-Wahl. |
| `rls-rpc-uebersicht.md` | aktiv behalten | Alle `rpc_admin_*`. |
| `section-type-vertrag-entwurf.md` | **prüfen** | Ist das ein laufender Entwurf oder fertig? Falls fertig → aktiv. Falls reine Vorstudie → archivieren. **Hier nicht angefasst, Rückfrage nötig.** |
| `sonderseiten-register.md` / `.json` | aktiv behalten | Register Sonderseiten. |

## 4. `docs/03-redaktion/`

| Datei | Empfehlung | Begründung |
|---|---|---|
| **`redaktions-uebergabe-und-prompt-regeln.md` (NEU)** | **führend** | Dachdokument, ab jetzt verbindliche Startseite. |
| `redaktionshandbuch.md` | aktiv behalten | Vollversion. Im Dachdokument verlinkt. |
| `kurzanleitung.md` | aktiv behalten | Print-Version, eine Seite. Bleibt nützlich. |
| `start-fuer-neue-redakteure.md` | **ins Archiv verschieben** | Inhalte (vier Änderungsebenen, drei Arbeitsprinzipien, Eskalation) sind im Dachdokument vollständig abgedeckt (Kap. 1, 2, 5, 7). Empfehlung: nach Bestätigung nach `docs/archiv/redaktion-historisch/` verschieben, im Dachdokument Hinweis ergänzen. |
| `prompt-kurzanleitung.md` | **ins Archiv verschieben** | Pflicht-Erstsatz, Prompt-Gerüst, Inhalt-zuerst-Regel — vollständig im Dachdokument Kap. 6 + Kap. 1. |
| `prompt-leitplanken.md` | **Inhalt übernehmen, dann archivieren** | T-Code-Tabelle, Container-Tabelle und „Grün-by-default"-Checkliste sind sehr wertvoll. Empfehlung: T-Code-Tabelle und Container-Tabelle 1:1 ins Dachdokument ziehen (oder als Anhang verlinken), danach Original archivieren. Bis dahin **bleibt das Dokument liegen**, das Dachdokument verweist auf `seitentyp-taxonomie.md` und `section-typen-katalog.md` als Single Source. |
| `uebergabe-marketing-redaktion-2026-05-17.md` | Beleg behalten | Übergabeprotokoll mit Datum. |
| `checkliste-redaktion.md` | aktiv behalten | Praktische Checkliste. |
| `qa-nach-redaktionsrunde.md` | aktiv behalten | QA-Vorgehen. |
| `redaktions-prompts.md` | **prüfen / ggf. archivieren** | Falls vollständig im Dachdokument abgebildet → archivieren. **Hier nicht angefasst, Rückfrage nötig.** |
| `bildkarten-*.md` (3 Dateien) | aktiv behalten | Karten-Spezialwissen (Blueprint, Copy-Audit, Zielbild). |

**Konsequenz für „eine Wahrheit":** sobald die drei markierten Dateien
archiviert sind, gibt es genau **ein** führendes Prompt-/Redaktions-
Dokument: `redaktions-uebergabe-und-prompt-regeln.md`.

## 5. `docs/04-betrieb/`

| Datei | Empfehlung | Begründung |
|---|---|---|
| `wahrheits-check.md` | aktiv behalten | Statuslogik. |
| `prompts-vs-admin.md` | aktiv behalten, **prüfen ob konsolidierbar** | Überlappt thematisch mit Dachdokument Kap. 1+2. Folge-Entscheidung. |
| `naechste-schritte.md` | aktiv behalten | Roadmap bis Public-Live. |
| `ausgeblendete-sections-policy.md` | aktiv behalten | Policy. |
| `faq-cta-toggle-inventar.md` | Beleg behalten | Wahrheits-Check-Quelle. |
| `seitentypen-bausteinmatrix-latest.md` | aktiv behalten | Bausteinmatrix. |
| `standardkarte-modulmodell-latest.md` | aktiv behalten | Karten-Module. |
| `script-lesbarkeit.md` | aktiv behalten | Wo der lesbare Bericht liegt. |
| `dokumentation-archiv-vorschlag.md` (DIESE DATEI) | aktiv behalten | Bis zur Umsetzung. Danach kann sie selbst archiviert werden. |
| Sprint-/Batch-Berichte (`sprint-*.md`, `card-v1-*.md`, `runtime-vertrag-*.md` etc.) | **größtenteils ins Archiv** | Sprint-Berichte sind historische Belege. Vorschlag: alles vor Batch 20 nach `docs/archiv/sprint-berichte/` verschieben. Aktuelle Sprint-Berichte bleiben, bis Folgesprint sie ablöst. **Hier nicht angefasst — eigener Auftrag.** |

## 6. `docs/04-betrieb/audit-snapshot/`

| Datei | Empfehlung | Begründung |
|---|---|---|
| `batch25-cms-abschluss-freeze.md` | **Beleg behalten** | Abschlussbericht, Belegkette. |
| `cms-steuerbarkeit-status.md` | aktiv behalten | Live-Status. |
| `cms-steuerbarkeit-matrix.md` | aktiv behalten | Live-Matrix. |
| `globaler-spiegel-audit.{md,json}` | Beleg behalten | Audit-Output. |
| `page-renderer-coverage.{md,json}` | Beleg behalten | Audit-Output. |
| `aktive-db-sections-ohne-renderpfad.{md,json}` | Beleg behalten | Audit-Output. |
| `public-blocks-ignorieren-admin-visibility.{md,json}` | Beleg behalten | Audit-Output. |
| `hartcode-steuerbarkeit-inventar.{md,json}` | Beleg behalten | Audit-Output. |
| Frühere Batch-Snapshots (vor Batch 25) | Beleg behalten | Historische Audit-Stände, nicht löschen. |

## 7. `docs/archiv/`

Bestehende Struktur (`pilot-plans/`, `checkpoints/`, `inventories/`,
`strategie-historisch/`, `architektur-historisch/`, `sync/`) bleibt
unverändert. Neue Unterordner bei Bedarf:

- `docs/archiv/redaktion-historisch/` — für die drei abgelösten Redaktion-/Prompt-Dokumente.
- `docs/archiv/sprint-berichte/` — falls alte Sprint-Berichte ausgelagert werden.

---

## Was als Nächstes konkret zu tun wäre (eigener Auftrag)

1. T-Code- und Container-Tabelle aus `prompt-leitplanken.md` ins
   Dachdokument übernehmen (oder als Anhang verlinken).
2. `start-fuer-neue-redakteure.md` und `prompt-kurzanleitung.md` nach
   `docs/archiv/redaktion-historisch/` verschieben.
3. `prompt-leitplanken.md` nach Übernahme der Tabellen ebenfalls
   archivieren.
4. Verweise in `docs/README.md`, `docs/current-status.md`,
   `docs/ai-start-prompt.md` und `mem://index.md` auf die archivierten
   Pfade prüfen — keine toten Links.
5. Offene Rückfragen klären: `section-type-vertrag-entwurf.md`,
   `redaktions-prompts.md`, alte Sprint-Berichte.

**Bis dahin: kein Verschieben, kein Löschen.**
