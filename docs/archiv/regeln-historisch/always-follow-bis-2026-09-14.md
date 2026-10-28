> **ARCHIV — nicht führend.**
> Ursprungspfad: `.lovable/always-follow.md`
> Archiviert: 2026-09-14 (Etappe 1, Restkorrekturen)
> Stand dieser Fassung: 2026-06-05 (nach Batch 25/26/27)
> Nachfolger (aktiv): `.lovable/always-follow.md` (gekürzte Schutzregeln) und
> `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` (führendes Dachdokument)
> Relative Verweise in dieser Fassung gingen von der Basis `.lovable/` aus und
> wurden hier NICHT umgeschrieben.

# Always Follow — TCS CMS-Light Projektregeln

Stand: 2026-06-05 (nach Batch 25/26/27 — CMS-Freeze + Doku-Hygiene).

Diese Regeln gelten für jede Änderung in diesem Projekt.
Wenn ein Auftrag dagegen verstößt, nicht umsetzen, sondern im Bericht melden.

**Führende Startseite für Redaktion und Prompt-Arbeit:**
[`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md).
**Technischer Hauptstatus:** [`docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](../docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md).
Kurzstatus: [`docs/current-status.md`](../docs/current-status.md).

**CMS-Freeze (klarifiziert seit Batch 33, präzisiert in Batch 52):**
„Freeze" heißt **kein unkontrollierter Umbau** — nicht „Stillstand" und
nicht „Redaktion darf nichts mehr". Der harte CMS-Kern ist seit Batch 25
freeze-reif (alle Gates — Wahrheits-Check, Coverage, Spiegel-Audit,
FAQ/CTA, Public-Blocks — auf 0).

**Innerhalb des bestehenden CMS-Light-Baukastens ist redaktionelle
Arbeit ausdrücklich erlaubt** und braucht keine Sondergenehmigung:

- Seiten und Unterseiten anlegen (mit bestehendem Seitentyp / T-Code).
- Navigation anpassen (Knoten in `cms_navigation_nodes`, Sortierung,
  Sichtbarkeit, Parent/Child, `nav_area`, „Hauptmenü aus").
- Karten ergänzen, entfernen, sortieren, sichtbar/unsichtbar schalten.
- Bausteine (Sections) sortieren, sichtbar/unsichtbar schalten,
  bestehende Section-Typen wiederverwenden.
- Bilder tauschen (`cms_assets`), Alt-Texte pflegen, Fokuspunkte setzen.
- Links setzen / entfernen / aktivieren / deaktivieren.
- Texte, Überschriften, Sublines, Bulletpoints, Chips, FAQ, CTA pflegen
  (DE und EN gemäß Default-Übersetzungsregel).
- Bestehende Kartenmodelle (`card_v1`) und Container (`cards_v1`,
  `product_scroller_v1`, `teaser_2col_v1`) verwenden.

Solche Arbeit muss weiterhin spiegel-treu, idempotent und über `rpc_admin_*`
laufen und mit Wahrheits-Check verifiziert werden — aber sie ist Normalbetrieb,
nicht „Freeze-Bruch".

**Lovable improvisiert nicht** (kurz innehalten, erklären, Folgeauftrag
vorschlagen — die Redaktion selbst wird dadurch nicht ausgebremst), wenn
der Wunsch außerhalb des bestehenden Baukastens liegt. In diesen Fällen
bitte kurz erklären, **welches technische Systemelement fehlt**, und einen
sauberen Folgeauftrag vorschlagen, statt zu improvisieren:

- neuer Seitentyp / neuer T-Code,
- neuer Section-Typ,
- neue Renderer-Sonderlogik,
- DB-Migration außerhalb normaler CMS-Datenpflege (Schema-Änderung,
  neue Tabelle, neue Spalte, neue RPC, RLS-Änderung),
- Produkt-DB / Produktkatalog / PDP,
- Login / Auth / Rollenmodell,
- neue technische Architektur, neue Renderer, Änderung der technischen
  Routing-/Navigationsarchitektur (Route-Matching, Code-Splitting,
  flächiger Systemwechsel) außerhalb redaktioneller DB-Pflege,
- flächige Veröffentlichungswellen (einzelne Seiten veröffentlichen ist
  ok; massenhaftes Statuskippen ohne Auftrag nicht).

Verboten bleibt **immer** (auch mit Auftrag): unkontrollierte
Massenmigration ohne Spiegel-Check, blindes Löschen von Dubletten,
Renderer-Umbau ohne vorgelagerten Plan, parallele Wahrheiten in Code
und DB.


## 1. Erst prüfen, dann ändern

Vor jeder Änderung:
- relevante bestehende Dateien lesen
- vorhandene Komponenten, Utilities, RPCs und Migrationen prüfen
- bestehende Struktur wiederverwenden
- keine parallele Struktur erfinden
- nur den beauftragten Scope ändern

## 2. Source of Truth

CMS-Light ist heute führend für:

- redaktionelle Inhalte (Texte, Headlines, Sublines, Linktitel)
- Seiteninstanzen (`cms_pages`, `cms_sections`, `cms_section_fields`)
- redaktionelle Assets / Bilder / Alt-Texte / Fokuspunkte (`cms_assets`)
- Reihenfolge und Sichtbarkeit von Sections (Spiegelregel: Admin = Website)
- zunehmend Navigations- und Breadcrumb-Struktur (`cms_navigation_nodes`,
  Public-Umschaltung etappenweise)
- Zuordnung von Seiten und Navigationsknoten

Code ist führend für:

- React-Komponenten, Templates, Renderer
- Layout, Spacing, Animation, Interaktion
- Routing-Logik
- technische UI-Texte (Buttons, Formularhinweise, Fehlertexte)
- Produktkatalog-Integration (PDP-Anbindung, Filterlogik im Frontend)
- Fallbacks, wo CMS-Light noch nicht vollständig migriert ist

i18n-JSONs (`src/i18n/locales/**`) und Code-Bilder (`src/**/assets/**`,
außer Produkt-/Logo-/UI-Grafik) sind heute **nur noch Fallback**. Neue
redaktionelle Inhalte und Bilder gehören in die DB. Bestehende
Code-Fallbacks werden tranchenweise nach `cms_section_fields` /
`cms_assets` migriert.

Externe Produktdatenbank (separat, eigener Client):

- Produktkatalog, PDP, Produktbilder, Produktdokumente
- technische Produktdaten, Filter, Specs

Produktdaten niemals ins CMS-Light kopieren.

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

Die öffentliche Website wird flächendeckend DB-first über CMS-Light
gerendert (Texte, Bilder, Reihenfolge, Sichtbarkeit) — via `useCmsI18n`
und `cms.asset(...)`. Inhalts- und Asset-Änderungen über Admin oder
`rpc_admin_*` schlagen über die Spiegelregel direkt durch — das ist
gewollt. Aktuelle Coverage-/Spiegel-Zahlen siehe
`docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md` — alte
Zwischenstände wie „75/81 Seiten" oder „73/80" sind historisch.

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
- Renderer-Struktur oder Section-Typ-Katalog ohne Auftrag erweitern
- Produktkatalog / PDP / Produkt-DB anfassen

**Regel für neue CMS-Seiten (Konvergenz-Regel):**
Neue CMS-Seiten werden ausschließlich als `CmsOnlyShell` angelegt
(bzw. `CmsProductSolutionShell` für T05-Produktlösungen) — direkt in
`src/app/routes.tsx`, ohne eigene Page-Datei unter `src/features/**/pages`.
Keine neuen `GenericCmsPage`-Wrapper und keine neuen eigenen
Page-Komponenten mehr, außer es ist nachweislich echte Sonderlogik nötig
(Status „Sonderlogik" im PageEditor). Bestehende Page-Komponenten mit
Status „Standardisiert" werden NICHT proaktiv migriert — der Bestand
konvergiert über die Zeit von selbst, ohne Risiko-Refactoring am
freeze-reifen CMS-Kern.


Die öffentliche Website bleibt damit in Layout, Routing und Renderern
stabil, während Inhalte, Bilder und Navigation per Admin/Prompt sauber
durchfließen.


## 5. Admin ist eigener Arbeitsbereich

`/admin` ist ein isolierter CMS-Light-Arbeitsbereich.

`/admin` darf nicht zeigen:
- öffentliche MainNavigation
- MetaNavigation
- Footer
- PersonaNavigation
- normale Website-Links, die aus dem Admin herausführen

Admin-UI ist ein Arbeitswerkzeug, keine Marketingseite.

## 6. Keine doppelte Wahrheit

Wenn eine neue DB-Spalte, Tabelle oder Funktion eingeführt wird, muss klar sein:

- Ist sie führend?
- Ist sie Fallback?
- Ist sie nur Diagnose?
- Ist sie Migrationsquelle?

Nicht zwei produktive Wahrheiten parallel benutzen.

Beispiel:
- Redaktionelle Texte: CMS-Light (`cms_section_fields`) ist führend,
  i18n-JSON nur Fallback.
- Redaktionelle Bilder: CMS-Light (`cms_assets`) ist führend, Code-Imports
  nur Fallback und werden tranchenweise entfernt.
- Navigation: `cms_navigation_nodes` ist die **redaktionelle
  Navigationsstruktur** (Knoten, Sortierung, Sichtbarkeit, `nav_area`,
  Parent/Child), gepflegt über `rpc_admin_*`. Der Code (`src/navigation/*`,
  `src/app/routes.tsx`) bleibt zuständig für die **technische
  Routing-Mechanik** (Route-Matching, Code-Splitting, NotFound,
  Redirects). Kein redaktioneller Inhalt im Code, keine Routing-Logik
  in der DB.

## 7. Migrationen

Jede Migration muss:

- idempotent sein
- auf frischer DB und bestehender DB zum selben Zielzustand führen
- eindeutige Zielwerte korrigieren
- keine Dubletten blind löschen
- bei Konflikten berichten statt aggressiv bereinigen
- keine Produktdaten anfassen
- keine unerwünschte Veröffentlichung auslösen

Wenn ein Datensatz bereits existiert, darf `INSERT ... WHERE NOT EXISTS` allein nicht reichen, falls falsche Werte korrigiert werden müssen.

## 8. Schreibwege

Frontend darf keine direkten Tabellen-Schreibzugriffe nutzen:

Verboten im Admin-Code:
- `.insert(`
- `.update(`
- `.upsert(`
- `.delete(`

Schreiben nur über eng begrenzte RPCs.

Jede Schreib-RPC muss:
- `SET search_path = public` verwenden
- keine dynamische SQL nutzen
- Whitelists verwenden
- nur erlaubte Felder ändern
- keine Produktdaten schreiben
- kein `service_role` im Frontend benötigen
- Risiken dokumentieren

## 9. No-Login-Prototyp

Die öffentliche Website wird bereits DB-first aus CMS-Light bedient
(Inhalte, Bilder, Reihenfolge, Sichtbarkeit). Solange `/admin` aber ohne
Login läuft, gilt:

- jede Schreibfunktion im Admin ist Prototyp und nicht produktionssicher
- keine breiten oder neuen Schreibrechte ohne Auftrag
- einzelne Seiten dürfen redaktionell veröffentlicht / unveröffentlicht
  werden; **flächige** Massen-Umschaltung (ganze Bereiche auf einmal)
  braucht einen eigenen Auftrag
- redaktionelle Navigationsarbeit über bestehende `cms_navigation_nodes`
  (Knoten anlegen/verschieben/ausblenden, Sortierung, `nav_area`,
  „Hauptmenü aus") ist erlaubt; **nicht** erlaubt ohne eigenen
  Technikauftrag ist eine Änderung der technischen Routing-/
  Navigationsarchitektur oder ein flächiger Systemwechsel der
  öffentlichen Navigation
- Auth/Login ist Pflicht, bevor `/admin` an externe Redaktion übergeben
  oder als produktiv betrachtet wird

Auth-Status aktuell:
- Admin läuft bewusst ohne Login (interner Workspace).
- Frühere Auth-Etappe wurde zurückgerollt, Auth ist nicht aktiv.
- Login kommt erst, wenn Inhalt und Datenmodell final stehen.

## 10. UI-Regeln für den Admin

Admin-UI soll:

- kompakt sein
- wie ein Arbeitswerkzeug wirken
- sichtbare Inhalte von technischen Details trennen
- technische Details einklappbar zeigen
- keine funktionslosen Buttons anzeigen
- keine neuen Aktionen vortäuschen
- Schreibfunktionen klar als Prototyp kennzeichnen

Bevorzugtes Zielbild (Tabs/Bereiche im Admin):

- Seiten & Inhalte (Pflege von `cms_pages` / `cms_sections` / `cms_section_fields`)
- Assets (Pflege von `cms_assets`, Alt-Texte, Viewports)
- Navigation (Pflege von `cms_navigation_nodes` — für redaktionelle Pflege innerhalb des bestehenden CMS-Light-Modells freigegeben)
- Diagnose / Status (Whitelist-Lücken, fehlende Mobile/Tablet-Assets, leere Felder)

Ältere Zielbilder mit Tabs wie „Übersicht / Struktur / Glossar" sind
historisch und nicht mehr maßgeblich.

## 11. Vor Abschluss immer prüfen

Am Ende jeder Etappe berichten:

- Welche Dateien wurden geändert?
- Welche Migrationen wurden angelegt/geändert?
- Welche RPCs wurden angelegt/geändert?
- Wurde Produktdatenbank geändert? Erwartet: nein.
- Wurde öffentliche Navigation geändert? Erwartet: nein.
- Wurden öffentliche Routen geändert? Erwartet: nein.
- Wurden i18n-Dateien geändert? Erwartet: nein.
- Wurde neue Schreiblogik gebaut? Wenn ja: welche und warum?
- Wurde `/admin` isoliert gehalten?
- Wurde `npm run i18n:check` ausgeführt?
- Wurde `npm run build` ausgeführt oder ehrlich berichtet, warum nicht?

## 12. Default-Übersetzungsregel (DE→EN)

Bei jeder Inhaltsänderung per Prompt gilt **automatisch Variante 2**:

- DE wird wie beauftragt geschrieben.
- EN wird im **selben Schritt** per Edge Function `cms-translate-field`
  (Lovable AI Gateway, Gemini) übersetzt und über
  `rpc_admin_update_section_field` direkt in die DB gespeichert — nicht
  nur als Vorschlag.
- Beides ist sofort im Admin sichtbar (DE-Feld + EN-Feld gefüllt).

Ausnahmen — nur, wenn der Prompt das **ausdrücklich** sagt:

- „nur DE ändern, EN unverändert lassen" → EN bleibt wie es war.
- „nur EN ändern" → DE bleibt unverändert.
- „EN bleibt unverändert" / „EN nicht überschreiben" → bestehende
  EN-Politur der Redaktion bleibt erhalten.

Zusätzliche Hinweise:

- Bei Bulk-Änderungen (z. B. >20 Felder gleichzeitig) vor Ausführung
  kurz nachfragen — jeder Call kostet Gateway-Budget.
- Produktdatenbank, technische UI-Strings in `src/i18n/`, Navigation
  und Footer sind von dieser Regel **nicht** erfasst — dort gilt
  weiterhin der bestehende Prozess.
- Nach Inhalts-Prompts immer `npm run i18n:check` ausführen.

## 13. Doku-Pflicht nach jeder Tranche

Nach jeder Audit-, Migrations- oder Renderer-Tranche MUSS im selben
Schritt die Dokumentation nachgezogen werden:

- `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md` ist
  **technischer Hauptstatus** und immer aktuell zu halten.
- `docs/current-status.md` (Kurzstatus, eine Seite) auf Stand bringen.
- Wenn Medien, Icons, Karten, Templates, Admin-Schreibwege oder
  Renderer betroffen sind, zusätzlich prüfen und ggf. nachziehen:
  - `docs/04-betrieb/prompts-vs-admin.md`
  - `docs/01-strategie/asset-strategie.md`
  - `docs/02-architektur/section-typen-katalog.md`
  - `docs/02-architektur/karten-raster-regel.md`
  - `docs/01-strategie/templates.md`
- Der Bericht muss enthalten: Audit vorher/nachher, geänderte
  Dateien/Migrationen/RPCs, geänderte Doku-Dateien, offene
  Klassen/Restpunkte, Scope-Bestätigung.

## 14. Wenn unsicher

Wenn der Auftrag unklar ist oder gegen diese Regeln verstoßen könnte:
nicht improvisieren — kurz im Bericht die Unklarheit benennen, das
fehlende Systemelement beschreiben und einen sauberen Folgeauftrag
vorschlagen. Die Redaktion wird dadurch nicht blockiert, sondern bekommt
einen klaren nächsten Schritt.

## 15. Neue CMS-Seiten / Karten / Bildslots (Verweis)

**Pflichtlektüre vor jedem Inhalts-Prompt:**
[`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)
— Dachdokument für Redaktion und Prompt-Arbeit. Es regelt:
freigegebener Scope, Eskalationspfad, Prompt-Startvorlage,
Kurzreferenz auf T-Codes, Container und Karten-Raster.

Single-Source-Detaildokumente:

- T-Codes / Seitentypen → `docs/01-strategie/seitentyp-taxonomie.md`
- Section-/Container-Typen → `docs/02-architektur/section-typen-katalog.md`
- Karten-/Raster-Regeln → `docs/02-architektur/karten-raster-regel.md`
- Bildslots / Viewports → `docs/01-strategie/asset-strategie.md`
- Templates / Strukturvorlagen → `docs/01-strategie/templates.md`
- Entscheidung „Prompt oder Admin" → `docs/04-betrieb/prompts-vs-admin.md`

Neue Inhalte gehören in `cms_pages` / `cms_sections` /
`cms_section_fields` / `cms_assets` / `cms_admin_editable_fields`
(Whitelist im selben Schritt) — nicht in Code oder i18n-JSONs als
führende Quelle.

## 16. Hierarchie bei Widersprüchen in der Doku

Wenn Doku-Aussagen sich widersprechen, gilt diese Reihenfolge:

1. `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` —
   Dachdokument (führende Startseite für Redaktion und Prompt-Arbeit).
2. `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md` —
   technischer Live-Status.
3. `.lovable/always-follow.md` — verbindliche Schutzregeln und Scope-Grenzen.
4. `docs/current-status.md` — Kurzstatus.
5. `docs/04-betrieb/prompts-vs-admin.md` — Entscheidung „Prompt oder Admin".
6. Strategie/Architektur-Dokumente unter `docs/01-strategie/` und
   `docs/02-architektur/` — fachliche Vertiefung.
7. `docs/archiv/**` — Historie, **nie führend**. Bei Konflikt mit
   aktuellen Dokumenten gewinnt das aktuelle Dokument.

Bei Unsicherheit lieber stoppen und melden statt nach veralteten
Checkpoints handeln.

## 17. ZIP-Wahrheit

Übergabe-ZIPs werden **nicht im Code erzeugt**:

- `TCS-webseite_db_cms.zip` = manueller Codebase-Download aus Lovable.
- `cms-light-master-snapshot-v2-*.zip` = manueller CMS-Light-Snapshot.
  Dieser Snapshot ist `rls_public_only` — ein **öffentlicher
  Lesesnapshot**, KEIN vollständiges DB-Backup. Nicht enthalten sind:
  `auth.*`, `storage.*`, `supabase_functions`, RPC-Bodies,
  vollständige RLS-Policies.

Für ein echtes Backup ist ein separater Admin-Export nötig (eigener
Auftrag).

