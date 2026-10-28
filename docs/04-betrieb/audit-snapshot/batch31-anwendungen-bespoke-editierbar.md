# Batch 31 — Anwendungen / „TCS in Bauten" redaktionell bearbeitbar

Stand: 2026-06-05. Sofort-Fix für Sonder-Page-Komponenten im Bereich
`anwendungen`.

## Problem

Bei mehreren Anwendungs-Seiten (P-057 Bildungseinrichtungen,
P-059 Gesundheitseinrichtungen, P-060 Öffentliche Hand,
P-077 Referenzprojekte sowie allen geteilten Detail-Anwendungen wie
Behörde, Klinik, Feuerwehr, Concierge …) liest der öffentliche Code
Felder aus der DB, die im Admin nur in der orangen
„Altbestand-Felder"-Box (Diagnose, nicht bearbeitbar) erscheinen.

Grund: Diese Seiten nutzen einen Standard-Section-Typ (z. B. `content_v1`),
haben aber bespoke Feldstrukturen (`kita.title`, `<bereich>.items.0`,
`<key>.label/title/description/href`, `meta_units`, `meta_year`, …),
die der generische `StandardBausteinWorkspace` nicht modelliert. Damit
sind sie redaktionell unerreichbar — das widerspricht der CMS-Light-
Regel „Was öffentlich aus der DB gerendert wird, muss im Admin
bearbeitbar sein".

## Prüfumfang

Geprüft wurden alle aktiven Seiten im Navigationsbereich `anwendungen`:

| Page-Key                                         | Komponente                                                  | Befund                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `anwendungen.root` (P-055)                       | `AnwendungenPage.tsx` (Generic-Render)                      | ok — alle Sections über Standard-Renderer                              |
| `anwendungen.wohnbau` (P-058)                    | `GenericCmsPage`                                            | ok                                                                     |
| `anwendungen.bildungseinrichtungen` (P-057)      | `BildungseinrichtungenPage.tsx` (bespoke)                   | `sections`, `einrichtungen` waren nicht bearbeitbar → jetzt bearbeitbar |
| `anwendungen.gesundheitseinrichtungen` (P-059)   | `GesundheitseinrichtungenPage.tsx` (bespoke)                | `section`, `cards` waren nicht bearbeitbar → jetzt bearbeitbar         |
| `anwendungen.oeffentliche-hand` (P-060)          | `OeffentlicheHandPage.tsx` (bespoke)                        | `section`, `cards` waren nicht bearbeitbar → jetzt bearbeitbar         |
| `anwendungen.referenzprojekte` (P-077)           | `ReferenzprojektePage.tsx` (bespoke)                        | `content` (Kicker/Subtitle/detailsCta …) nicht bearbeitbar → jetzt bearbeitbar |
| `anwendungen.referenzprojekte.*` (11 Detailseiten) | `ReferenzprojektDetailPage.tsx` (bespoke)                   | `hero` (meta_units/meta_year/subline), `beschreibung`, `highlights`, `systems`, `gallery` nicht bearbeitbar → jetzt bearbeitbar |
| `anwendungen.objektloesungen` (P-062)            | `ObjektloesungenPage.tsx`                                   | Standard-Render-Pfad, keine bespoke Felder                              |
| `anwendungen.behoerde`, `…concierge`, `…einfamilienhaus`, `…feuerwehr`, `…feuerwehrdurchsage`, `…grossanlage`, `…interne-kommunikation`, `…klinik`, `…mehrfamilienhaus`, `…mobile-tuerkommunikation`, `…pflege`, `…sanierung`, `…schwimmbad`, `…zutrittskontrolle-bcm`, `…bidirektionale-video`, `…digitale-namensverwaltung` (16 Seiten) | `AnwendungDetailPage` (geteilte bespoke Komponente) | `content` (label/headline/intro/description), `leistungen` (`<bereich>.title`/`items.N`), `systembausteine` (`<key>.label/title/description/href`), `broschure` (label/href) waren nicht bearbeitbar → jetzt bearbeitbar |

## Was geändert wurde

1. **Bespoke-Registry erweitert** (`src/features/admin/lib/bespokePageSections.ts`)
   - Exakte Einträge für P-057/-059/-060/-077 (alle bespoke Sections).
   - Muster-Erkennung für die 16 geteilten Detail-Anwendungen
     (`AnwendungDetailPage`) und die 11 Referenzprojekt-Detail-Seiten
     (`ReferenzprojektDetailPage`).
   - Pro Section ein redaktionell verständliches Label und ein
     Hinweistext, der erklärt, dass es kein Altbestand ist.

2. **`StandardBausteinWorkspace`** (`src/features/admin/components/StandardBausteinWorkspace.tsx`)
   - Wenn eine Section als bespoke registriert ist, werden die nicht
     vom Standard-Workspace abgedeckten Felder NICHT mehr nur als
     Diagnose-Chips angezeigt, sondern als **vollwertige DE/EN-
     `EditableField`-Eingaben** mit Freigabeschalter pro Sprache.
   - Visuelle Trennung: Sonderfelder erscheinen jetzt im blauen Block
     („Sonderfelder dieser Page-Komponente"), klar von der orangen
     Altbestand-Warnung unterschieden.
   - Schreibweg unverändert: `EditableField` →
     `rpc_admin_update_section_field`; Freigabe →
     `rpc_admin_set_editable_field_enabled`. Kein direkter
     Tabellenzugriff, kein neuer Section-Typ, keine Migration.

## Whitelist / Schreibbarkeit

DB-seitig wurde nichts geändert. Eine Vollprüfung der Whitelist
(`cms_admin_editable_fields`) gegen die tatsächlich gefüllten Text-
Felder im Bereich `anwendungen*` ergab **0 fehlende Einträge und
0 deaktivierte für tatsächlich vorhandene Inhalte** (15.724 aktive
Whitelist-Zeilen, 1 deaktiviert — bewusst). Damit funktionieren die
neuen Eingabefelder sofort: jede bespoke Section, die jetzt im Admin
editierbar wird, hat bereits DE/EN-Whitelist-Einträge.

Falls in Zukunft neue Felder in der DB landen, greift weiterhin
`scripts/cms/whitelist-coverage-audit.mjs` als CI-Gate.

## Was bewusst NICHT geändert wurde

- **Keine** Renderer-Änderung. Public-Layout, Reihenfolge,
  Sichtbarkeit und Inhalte bleiben Bit für Bit identisch.
- **Keine** Migration auf `cards_v1` oder andere Standard-Strukturen.
  Auch wenn `gesundheitseinrichtungen|cards` und
  `oeffentliche-hand|cards` strukturell wie Karten aussehen, sind sie
  weiterhin bespoke (Tags-Anzahl, Icon-Logik, Routing) — nicht ohne
  Auftrag umbauen.
- **Keine** neuen Navigationseinträge, keine neuen Seiten, keine
  Inhaltsänderung.
- **Keine** zweite Wahrheit: alles geht weiterhin durch die
  bestehenden RPCs.

## Restfälle / Folgepunkte (NICHT in diesem Batch)

- Optional: Pro Sonderfeld eine sprechende Beschriftung statt des
  technischen Keys (z. B. „Kita · Titel" statt `kita.title`). Heute
  rendert das Eingabefeld nur den Key — funktional vollständig, aber
  noch nicht „schön".
- Optional: Strukturierte Gruppierung der bespoke Felder
  (Anforderungen / Leistungen / Bilder etc.) als faltbare Unterblöcke.
- Optional: `list_v1`-Sections (`highlights`, `systems`) speichern
  `items` aktuell als JSON-Text — ein dedizierter Listen-Editor wäre
  redaktionsfreundlicher.

Diese drei Punkte sind reine Admin-UX-Politur und können in einem
separaten Auftrag erledigt werden. Bearbeitbarkeit ist mit diesem
Batch hergestellt.

## Verifikation

- `tsc --noEmit -p tsconfig.app.json` → grün.
- DB-Whitelist-Soll/Ist-Abgleich für alle `anwendungen*`-Seiten →
  0 fehlend, 0 ungewollt deaktiviert.
- Wahrheits-Check / Public-Blocks: nicht erneut ausgeführt, weil
  weder DB-Migration noch Renderer-Änderung erfolgt ist. Der CMS-Kern
  bleibt im Freeze-Stand aus Batch 25.

## Geänderte Dateien

- `src/features/admin/lib/bespokePageSections.ts` (Registry erweitert)
- `src/features/admin/components/StandardBausteinWorkspace.tsx`
  (Bespoke-Legacy-Felder jetzt editierbar)
- `docs/04-betrieb/audit-snapshot/batch31-anwendungen-bespoke-editierbar.md`
  (dieser Bericht)
