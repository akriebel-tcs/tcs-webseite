# Always Follow — TCS CMS-Light Schutzregeln

Stand: 2026-09-14 (Etappe 1, Restkorrekturen).

Diese Datei enthält **technische Schutzregeln und Scope-Grenzen**.
Sie ist **keine** Prozessbeschreibung und **keine** zweite Regelkopie.

**Führende Regelquelle für Arbeitsablauf, Sprachen, Schreibarbeiten und
Abschlussnachweise ist das Dachdokument:**
[`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)
— insbesondere **Abschnitt 11 (Verbindlicher Arbeitsablauf)**.
Bei Widerspruch gilt das Dachdokument.

Weitere aktive Einstiegspunkte:
- Kurzstatus: [`docs/current-status.md`](../docs/current-status.md)
- technischer Status: [`docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](../docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md)

## 0. Kein Gesamtgrün

Es gibt derzeit **keine gültige flächendeckende Abnahme** des CMS-Kerns.
Die früher gemeldeten Nullwerte (Wahrheits-Check, Coverage, Spiegel-Audit,
FAQ/CTA, Public-Blocks) stammen aus Juni 2026 und sind **Historie**, kein
aktueller Messwert. Ungeprüft heißt **offen**, nicht grün. Offene
Sicherheitszustände (kein Login/Rollenmodell für `/admin` und
`rpc_admin_*`, `cms-translate-field` ohne JWT, serverseitiger Schutz
maschineller Übersetzungen nicht nachgewiesen) sind **nicht abgenommen**.

„Freeze" bedeutet: **kein unkontrollierter Umbau** — nicht Stillstand.
Kontrollierte redaktionelle Arbeit im bestehenden CMS-Light-Baukasten ist
erlaubt. Welche Arbeit freigegeben ist und wie sie abzuschließen ist,
regelt das Dachdokument (Abschnitte 3, 4, 11) — nicht diese Datei.

Verboten bleibt **immer** (auch mit Auftrag): unkontrollierte
Massenmigration ohne Spiegel-Check, blindes Löschen von Dubletten,
Renderer-Umbau ohne vorgelagerten Plan, parallele produktive Wahrheiten
in Code und DB.

## 1. Erst prüfen, dann ändern

- relevante bestehende Dateien lesen
- vorhandene Komponenten, Utilities, RPCs und Migrationen prüfen
- bestehende Struktur wiederverwenden, keine parallele Struktur erfinden
- nur den beauftragten Scope ändern
- bei mehrdeutigem Ziel nicht raten, sondern melden

## 2. Source of Truth

CMS-Light ist führend für:

- redaktionelle Inhalte (Texte, Headlines, Sublines, Linktitel)
- Seiteninstanzen (`cms_pages`, `cms_sections`, `cms_section_fields`)
- redaktionelle Assets / Bilder / Alt-Texte / Fokuspunkte (`cms_assets`)
- Reihenfolge und Sichtbarkeit von Sections (Spiegelregel: Admin = Website)
- Navigations- und Breadcrumb-Struktur (`cms_navigation_nodes`)
- zentrale Bedien-/UI-Texte über den Katalog `cms_ui_strings`

Code ist führend für:

- React-Komponenten, Templates, Renderer
- Layout, Spacing, Animation, Interaktion
- Routing-Mechanik
- Typregeln und technische Validierung
- Produktkatalog-Anbindung (PDP, Filterlogik im Frontend)

i18n-JSONs (`src/i18n/locales/**`) und Code-Bilder sind **Übergangs-
Fallback**: dokumentierter Übergang bzw. Notfall, **keine eigenständig
gepflegte zweite Inhaltswahrheit**. Bestehende Fallbacks werden jetzt
nicht entfernt, aber auch nicht als führende Quelle ausgebaut. Neue
redaktionelle Inhalte, Bilder und Bedien-Texte gehören in die DB.

Externe Produktdatenbank (separat, eigener Client, **nur lesend**):
Produktkatalog, PDP, Produktbilder, Produktdokumente, technische Daten,
Filter, Specs. Produktdaten niemals ins CMS-Light kopieren.

## 3. Produktdatenbank ist tabu

Nicht ändern, außer der Auftrag sagt es ausdrücklich:

- `src/lib/supabase/client.ts`
- Produktdatenbank-Env
- Produktkatalog
- PDP
- Produktdaten-RPCs
- Produktdatenbank-Migrationen
- Produktdaten-Storage

Im Admin-Bereich darf kein Produktdatenbank-Client importiert werden.

## 4. Öffentliche Website schützen

Die öffentliche Website rendert DB-first über CMS-Light (via `useCmsI18n`
und `cms.asset(...)`). Inhalts- und Asset-Änderungen über Admin oder
`rpc_admin_*` schlagen über die Spiegelregel direkt durch — das ist
gewollt. Coverage-/Spiegel-Zahlen sind nur gültig, wenn sie **neu
gemessen** wurden; alte Zwischenstände sind historisch.

Navigation darf redaktionell weiterentwickelt werden (neue Knoten, neue
Unterseiten, Sortierung, Hauptmenü-aus, Footer-Slots), aber:
- DB-first über `cms_navigation_nodes` / `rpc_admin_*` arbeiten.
- Routen, Breadcrumbs und Kartenlinks müssen konsistent bleiben.
- Nach Navigationsänderungen: Wahrheits-Check + Preview-Stichprobe.

Nicht ohne ausdrücklichen Auftrag:

- öffentliche Routen-Mechanik ändern (`src/navigation/routes.ts`,
  `src/app/routes.tsx`) jenseits redaktioneller DB-Pflege
- i18n-JSON-Dateien (`src/i18n/locales/**`) inhaltlich ändern
- Seiten flächig veröffentlichen / Status flächig kippen
- Renderer-Struktur oder Section-Typ-Katalog erweitern
- Produktkatalog / PDP / Produkt-DB anfassen

**Regel für neue CMS-Seiten (Konvergenz-Regel):**
Neue CMS-Seiten werden ausschließlich als `CmsOnlyShell` angelegt
(bzw. `CmsProductSolutionShell` für T05-Produktlösungen) — direkt in
`src/app/routes.tsx`, ohne eigene Page-Datei unter `src/features/**/pages`.
Keine neuen `GenericCmsPage`-Wrapper und keine neuen eigenen
Page-Komponenten, außer es ist nachweislich echte Sonderlogik nötig
(Status „Sonderlogik" im PageEditor). Bestehende Page-Komponenten mit
Status „Standardisiert" werden **nicht** proaktiv migriert.

## 5. Admin ist eigener Arbeitsbereich

`/admin` ist ein isolierter CMS-Light-Arbeitsbereich und darf nicht
zeigen: öffentliche MainNavigation, MetaNavigation, Footer,
PersonaNavigation, normale Website-Links, die aus dem Admin herausführen.

Admin-UI ist ein Arbeitswerkzeug, keine Marketingseite.

## 6. Keine doppelte Wahrheit

Bei jeder neuen Spalte, Tabelle oder Funktion muss klar sein: führend,
Fallback, Diagnose oder Migrationsquelle. Nicht zwei produktive
Wahrheiten parallel benutzen.

- Redaktionelle Texte: `cms_section_fields` führend, i18n-JSON nur
  Übergangs-Fallback.
- Bedien-Texte: `cms_ui_strings` führend, i18n-JSON Übergangs-Fallback.
- Redaktionelle Bilder: `cms_assets` führend, Code-Imports Fallback.
- Navigation: `cms_navigation_nodes` ist die redaktionelle Struktur; der
  Code (`src/navigation/*`, `src/app/routes.tsx`) bleibt für die
  technische Routing-Mechanik zuständig. Kein redaktioneller Inhalt im
  Code, keine Routing-Logik in der DB.

Zustände in der Anzeige nie vermischen: **leer**, **verborgen**,
**fehlend**, **Ladefehler** sind vier verschiedene Dinge.

## 7. Migrationen

Jede Migration muss:

- idempotent sein
- auf frischer und bestehender DB zum selben Zielzustand führen
- eindeutige Zielwerte korrigieren
- keine Dubletten blind löschen
- bei Konflikten berichten statt aggressiv bereinigen
- keine Produktdaten anfassen
- keine unerwünschte Veröffentlichung auslösen

`INSERT ... WHERE NOT EXISTS` allein genügt nicht, wenn falsche Werte
korrigiert werden müssen.

## 8. Schreibwege

Frontend darf keine direkten Tabellen-Schreibzugriffe nutzen — verboten
im Admin-Code: `.insert(`, `.update(`, `.upsert(`, `.delete(`.
Schreiben ausschließlich über eng begrenzte `rpc_admin_*`.

Jede Schreib-RPC muss:
- festen `search_path` setzen
- keine dynamische SQL nutzen
- Whitelists verwenden und nur erlaubte Felder ändern
- keine Produktdaten schreiben
- kein `service_role` im Frontend benötigen
- Risiken dokumentieren

Neue `SECURITY DEFINER`-Funktionen brauchen festen `search_path`,
engsten Schreibumfang, explizite EXECUTE-Rechte und passende
Caller-Autorisierung; **kein** EXECUTE für `PUBLIC`.

Der Ablauf beim Schreiben (vorher lesen, Fremdänderungen erkennen,
Grenzen der Absicherung) steht im Dachdokument, Abschnitt 11.5.

## 9. No-Login-Prototyp

`/admin` läuft bewusst ohne Login (interner Workspace). Solange das gilt:

- jede Schreibfunktion im Admin ist Prototyp und nicht produktionssicher
- keine breiten oder neuen Schreibrechte ohne Auftrag
- einzelne Seiten dürfen veröffentlicht/unveröffentlicht werden;
  **flächige** Massen-Umschaltung braucht einen eigenen Auftrag
- redaktionelle Navigationsarbeit über `cms_navigation_nodes` ist
  erlaubt; Änderungen der technischen Routing-/Navigationsarchitektur
  brauchen einen Technikauftrag

Bestehender legitimer Zugang bleibt erhalten; es wird **keine neue
Kontopflicht** ohne Auftrag eingeführt. Der No-Login-Zustand ist ein
dokumentierter **offener** Sicherheitszustand, keine Abnahme.

## 10. UI-Regeln für den Admin

Admin-UI soll kompakt sein, wie ein Arbeitswerkzeug wirken, sichtbare
Inhalte von technischen Details trennen (Details einklappbar), keine
funktionslosen Buttons und keine vorgetäuschten Aktionen zeigen und
Schreibfunktionen klar als Prototyp kennzeichnen.

Zielbild der Bereiche: Seiten & Inhalte · Assets · Navigation ·
Übersetzungen · Diagnose/Status. Ältere Zielbilder („Übersicht /
Struktur / Glossar") sind historisch.

## 11. Sprachen und Übersetzungen (Verweis)

Verbindlich ist das Dachdokument, Abschnitt 11.3. Kurz:

- Verfügbare Sprachen kommen ausschließlich aus dem Sprachregister
  (`cms_locales` über `src/i18n/localeRegistry.ts`) — keine neue
  Whitelist im Code.
- **Keine automatische Zweit-/Drittsprachenpflicht in dieser Datei.**
  Ob und welche Sprachen ein Auftrag mitschreibt, sagt der Auftrag bzw.
  das Dachdokument; ein deutscher Inhaltspilot bleibt zunächst nur DE.
- Keine automatischen neuen Übersetzungsläufe; pausierte Läufe bleiben
  pausiert. Keine PL-Massenübersetzung oder PL-Veröffentlichung ohne
  ausdrückliche Freigabe.
- Freigabe- und Herkunftsangaben dürfen nicht verfälscht werden.

## 12. Abschluss (Verweis)

Abschlussnachweise regelt das Dachdokument, Abschnitt 11.6
(Rücklesen aus der DB · CMS-Bearbeitbarkeit · sichtbare Preview-Prüfung;
fehlender Nachweis = **offen**). Lokal zusätzlich:
`npm run cms:preflight` — ersetzt **keine** Struktur-, Datenbank- oder
Preview-Abnahme.

Im Bericht immer nennen: geänderte Dateien, Migrationen, RPCs; ob
Produktdatenbank / öffentliche Navigation / öffentliche Routen / i18n
geändert wurden (Erwartung: nein); ob neue Schreiblogik entstand; ob
`/admin` isoliert blieb; welche Prüfungen liefen und welche nicht.

## 13. Doku-Pflicht nach jeder Tranche

Im selben Schritt nachziehen:
- `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md` (technischer Status)
- `docs/current-status.md` (Kurzstatus)
- bei redaktionell/strukturell relevanten Änderungen:
  `docs/03-redaktion/redaktions-aenderungsprotokoll.md`
- bei Medien/Karten/Templates/Schreibwegen/Renderern zusätzlich
  `docs/04-betrieb/prompts-vs-admin.md`,
  `docs/01-strategie/asset-strategie.md`,
  `docs/02-architektur/section-typen-katalog.md`,
  `docs/02-architektur/karten-raster-regel.md`,
  `docs/01-strategie/templates.md`

## 14. Wenn unsicher

Nicht improvisieren: Unklarheit benennen, fehlendes Systemelement
beschreiben, sauberen Folgeauftrag vorschlagen.

## 15. Detaildokumente (Single Source)

- T-Codes / Seitentypen → `docs/01-strategie/seitentyp-taxonomie.md`
- Section-/Container-Typen → `docs/02-architektur/section-typen-katalog.md`
- Karten-/Raster-Regeln → `docs/02-architektur/karten-raster-regel.md`
- Bildslots / Viewports → `docs/01-strategie/asset-strategie.md`
- Templates → `docs/01-strategie/templates.md`
- „Prompt oder Admin?" → `docs/04-betrieb/prompts-vs-admin.md`

## 16. Hierarchie bei Widersprüchen

1. `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` (Dachdokument, führend)
2. `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`
3. `.lovable/always-follow.md` (diese Schutzregeln)
4. `docs/current-status.md`
5. `docs/lovable-custom-rules-compact.md`
6. Strategie-/Architekturdokumente unter `docs/01-strategie/`, `docs/02-architektur/`
7. `docs/archiv/**` — Historie, **nie führend**

Bei Unsicherheit stoppen und melden statt nach veralteten Checkpoints
handeln.

## 17. ZIP-Wahrheit

- `TCS-webseite_db_cms.zip` = manueller Codebase-Download aus Lovable.
- `cms-light-master-snapshot-v2-*.zip` = manueller CMS-Light-Snapshot,
  `rls_public_only` — **öffentlicher Lesesnapshot, kein vollständiges
  DB-Backup** (ohne `auth.*`, `storage.*`, `supabase_functions`,
  RPC-Bodies, vollständige RLS-Policies).
- Vollexport/Medienpaket: `docs/04-betrieb/gesamt-export-cms-light.md`.
