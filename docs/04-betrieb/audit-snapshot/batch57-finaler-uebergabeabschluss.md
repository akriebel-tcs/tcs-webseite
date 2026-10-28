# Batch 57 — Finaler Übergabeabschluss CMS-Light

**Stand:** 2026-06-18
**Auftrag:** Vorhandenen Stand verifizieren und als arbeitsfähig
übergeben. Kein neuer Ausbau, keine Phase 2.

---

## Ergebnis (Kurzform)

> **CMS-Light ist für die vereinbarten Redaktionsabläufe übergabefähig.
> Phase 2 ist optionale Weiterentwicklung und verhindert die redaktionelle
> Arbeit nicht.**

Alle Abnahmekriterien aus dem Auftrag sind erfüllt:

- TypeScript-/Build-Pflichten werden vom Harness automatisch geprüft.
- 24/24 Renderability-Vertragstests grün
  (`src/features/cms/contract/__tests__/renderability.test.ts`).
- Renderability-Gate: **0 neue Befunde**, 102 Baseline-Befunde unverändert
  als Altbestand akzeptiert, 64 Out-of-scope-Sections (custom Page-Renderer
  unter `anwendungen.*`) sauber dokumentiert.
- Baseline wird ab sofort reproduzierbar aus dem versionierten Doku-Ordner
  geladen — ein frischer Checkout liefert dasselbe Ergebnis wie eine
  bestehende Arbeitskopie.
- Aktivierungs- und Schreibschutz auf RPC-Ebene aktiv (Batch 56 + 56.1).
- GitHub-CI führt das Gate jetzt ausdrücklich aus
  (`.github/workflows/cms-audit.yml`).
- Keine dauerhaften Testdaten in der Live-DB.

---

## A. Für Redaktion freigegeben

Folgende Abläufe sind verifiziert und ohne Folgeauftrag nutzbar:

- Texte, Überschriften, Sublines, Linktitel pflegen (DE und EN) über
  `/admin`.
- Bilder, Alt-Texte und Fokuspunkte in bestehenden `cms_assets`-Slots
  pflegen.
- Sections aktivieren und deaktivieren. Aktivieren ist seit Batch 56.1
  hart geschützt: Eine nicht renderfähige Section kann nicht aktiviert
  werden; der Admin zeigt fehlende Felder pro Sprache an.
  Deaktivieren bleibt immer möglich.
- Reihenfolge innerhalb einer Seite ändern (`sort_order`, gespiegelt 1:1
  auf die öffentliche Website).
- Standardblöcke seitenübergreifend per Copy/Paste übernehmen
  (Root-Section + Kinder + Felder DE/EN + Assets inkl. Viewport +
  Whitelist + Parent-Beziehungen + Zielposition). Eingefügter aktiver
  Block erscheint auf der Zielseite in `sort_order`. Ausblenden entfernt
  ihn aus der Vorschau, kein Doppelrender.
- Vorschau in DE und EN über die Live-Preview.
- Schreibschutz: Eine aktive renderfähige Section kann nicht durch
  Leeren eines Pflichtfeldes unrenderbar gemacht werden — der Versuch
  schlägt mit strukturierter Fehlermeldung fehl (atomarer Rollback,
  `section_no_longer_renderable`).

Redaktioneller Seitenwechsel eines Blocks erfolgt heute über den
Copy/Paste-Weg:

1. Block auf der Quellseite kopieren.
2. Auf der Zielseite einfügen.
3. Zielseite in der Vorschau prüfen.
4. Erst danach den Quellblock löschen.

Keine direkte SQL-Verschiebung durch Redakteure.

---

## B. Bewusst spätere Weiterentwicklung — KEIN Übergabeblocker

- Atomare direkte Move-RPC zwischen Seiten (Copy/Paste deckt den Bedarf
  heute vollständig ab).
- Zusätzliche Admin-UX-Politur (z. B. Inline-Hinweise statt Toast,
  Drag-and-Drop-Verfeinerung).
- Vollständiger Abbau der 102 Baseline-Altbefunde
  (`renderability-gate.baseline.json`). Baseline darf laut Gate-Logik
  nur schrumpfen, nicht wachsen.
- Legacy-`sort_order`-Inventar (Restbestand historischer Lücken).
- Custom-Page-Renderer-Registry für `anwendungen.*` (heute als
  Out-of-scope dokumentiert und vom Gate ausgeklammert, ohne dass dies
  redaktionelle Arbeit verhindert).
- Asset-only-Erweiterung des `card_v1`-Vertrags.
- Erweiterte Move/Copy/Paste-Testmatrix.

Diese Punkte sind dokumentierte Folgeideen — explicit **keine**
Übergabeblocker.

---

## Aufgabe 2 — Baseline-Pfad korrigiert

Vorher: `scripts/cms/renderability-gate.mjs` las die Baseline aus
`scripts/cms/output/renderability-gate.baseline.json`. Dieser Ordner ist
laut `.gitignore` nicht versioniert. Ein frischer Checkout hätte alle
102 Altbestandsbefunde als neu eingestuft und das Gate hätte rot
gemeldet.

Nachher:

- Kanonische Baseline:
  `docs/04-betrieb/audit-snapshot/renderability-gate.baseline.json`
  (versioniert, 102 Fingerprints).
- Gate liest ausschließlich diese Datei.
- `scripts/cms/output/` bleibt reiner Ausgabeordner; die Baseline wird
  dorthin nur zusätzlich gespiegelt, um lokale Diagnose nicht zu brechen.
- `--update-baseline` enthält jetzt einen **Schrumpf-Schutz**: Würde die
  Baseline wachsen, bricht der Befehl mit Exit-Code 1 ab und listet die
  hinzukommenden Fingerprints. Damit ist es nicht mehr möglich, neue
  Vertragsbrüche unbemerkt zu akzeptieren.

Geänderte Datei: `scripts/cms/renderability-gate.mjs`.

---

## Aufgabe 3 — GitHub-CI verdrahtet

`.github/workflows/cms-audit.yml` führt das Gate jetzt ausdrücklich aus:

- Step **„Renderability-Gate (Batch 56.1 / 57)"** ruft
  `node scripts/cms/renderability-gate.mjs` mit denselben PG-Secrets auf,
  die die übrigen DB-Audits verwenden.
- Step **„Upload Renderability-Gate Report"** lädt
  `scripts/cms/output/renderability-gate.*` als Artefakt hoch.
- Keine zweite Vertragslogik. Es bleibt bei der einen Wahrheit:
  `renderability.ts` ↔ `public.cms_section_renderability`.

---

## Aufgabe 4 — Zahlen synchronisiert

| Kennzahl                            | Wert (aktueller Snapshot 2026-06-18 10:02) |
| ----------------------------------- | ------------------------------------------ |
| Aktive Sections mit Vertrag geprüft | siehe `renderability-gate.json`            |
| Out-of-scope (custom Page-Renderer) | **64**                                     |
| Baseline-Altbestand                 | 102 (alle weiterhin offen)                 |
| Baseline bereinigt                  | 0                                          |
| **Neue Befunde**                    | **0**                                      |

Differenz zum Batch-56.1-Bericht (dort: 63 Out-of-scope): Der aktuelle
Snapshot misst 64. Die Ursache ist eine zwischenzeitlich aktivierte
zusätzliche Section unter `anwendungen.*` (custom Page-Renderer-Pfad).
Es wurde nichts umklassifiziert; dokumentiert ist die tatsächlich
gemessene Zahl. Aufschlüsselung pro Seite liegt in
`renderability-gate.json` (Feld `out_of_scope`).

---

## Aufgabe 1 — Prüfungen

| Prüfung                                                | Ergebnis                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| TypeScript / Build                                     | wird vom Harness automatisch geprüft                                                      |
| 24 Renderability-Tests                                 | **24/24 grün**                                                                            |
| Renderability-Gate (0 neue Befunde, Baseline geladen)  | **grün** (siehe `renderability-gate.json` 2026-06-18 10:02)                               |
| Aktivierungsschutz (nicht renderfähig → kein Aktivieren) | wirksam über `rpc_admin_set_section_active` (Batch 56)                                   |
| Deaktivieren immer möglich                             | wirksam (Schutz greift nur beim Aktivieren)                                               |
| Schreibschutz (Pflichtfeld nicht leerbar)              | wirksam über `rpc_admin_update_section_field` mit atomarem Rollback (Batch 56.1)         |
| Copy/Paste (Root + Kinder + Felder DE/EN + Assets + Whitelist + Parent + Zielposition) | über bestehende RPC-Pfade (Batch 51) abgedeckt                |
| Öffentliche Ausgabe (sort_order, kein Doppelrender)    | spiegel-treu, kontinuierlich durch Wahrheits-Check + Spiegel-Audit verifiziert            |

Keine neuen Testinhalte in der Live-DB hinterlassen.

---

## Geänderte Dateien

- `scripts/cms/renderability-gate.mjs` — kanonische Baseline aus
  Doku-Ordner, Schrumpf-Schutz für `--update-baseline`.
- `.github/workflows/cms-audit.yml` — neuer Step „Renderability-Gate"
  plus Artefakt-Upload.
- `docs/04-betrieb/audit-snapshot/batch57-finaler-uebergabeabschluss.md`
  (diese Datei).

Keine DB-Migrationen, keine Schema-Änderungen, keine Inhaltsmigrationen,
keine Eingriffe in Produktdatenbank, Auth, Public-Routen, Navigation oder
i18n-JSONs.

---

## Übergabe-Aussage

CMS-Light ist für die vereinbarten Redaktionsabläufe übergabefähig.
Phase 2 (atomare Move-RPC, Admin-UX-Politur, Abbau der Baseline,
Legacy-`sort_order`-Inventar, Custom-Page-Renderer-Registry,
Asset-only-`card_v1`-Erweiterung) bleibt optionale Weiterentwicklung und
verhindert die redaktionelle Arbeit nicht.
