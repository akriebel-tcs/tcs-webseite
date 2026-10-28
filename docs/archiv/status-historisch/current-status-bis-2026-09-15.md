# Aktueller Stand

Stand dieser Datei: 2026-09-15 (Etappe 3A installiert; Etappe 1 der CMS-Light-Reparatur —
Regelbereinigung und lokale Abschlussprüfung).

## Kurzstatus (heute gültig)

**Kein Gesamtgrün.** Es gibt derzeit **keine gültige flächendeckende
Abnahme** des CMS-Kerns. Die unten zitierten Nullwerte stammen aus
Juni 2026 und sind **Historie**, kein aktueller Messwert.

Aktuell bekannt und offen:

- **Ungeprüft = offen:** Wahrheits-Check, Coverage, Spiegel-Audit,
  FAQ/CTA und Public-Blocks sind seit Juni 2026 nicht erneut gemessen
  worden. Bis zu einer neuen Messung gelten sie als **ungeprüft**, nicht
  als grün.
- **Sicherheitszustände offen:** kein Login/keine Rollenprüfung für
  `/admin` und die `rpc_admin_*`-Schreibwege; serverseitiger Schutz
  maschineller Übersetzungen nicht nachgewiesen; `cms-translate-field`
  ohne JWT. Diese Punkte sind **offen**, nicht abgenommen.
- **Sprachdaten:** DE/EN sind gepflegt; EN/PL/NL/DA sind Zielumfang,
  aber unterschiedlich weit. Verfügbare Sprachen werden ausschließlich
  aus dem Sprachregister (`cms_locales` über
  `src/i18n/localeRegistry.ts`) gelesen — keine Sprachliste im Code,
  keine neue Whitelist. Der dänische Lauf ist pausiert.
- **Lokale Abschlussprüfung:** `npm run cms:preflight` (Typprüfung →
  Unit-Tests → `i18n:contract` → Build, bricht beim ersten Fehler ab).
  Sie ersetzt **keine** Struktur-, Datenbank- oder Preview-Abnahme.
- **Bedienungstext-Katalog, Stand 2026-09-14 (Etappe 2B, abgeschlossen und
  unabhängig zurückgelesen):** Der einmalige additive Import ist erfolgt und
  vollständig gegengeprüft — die 414 alten Quellen, 1646 alten Übersetzungen
  und 1646 alten Prüfzustände sind **einschließlich aller Metadaten exakt
  unverändert**; neu hinzugekommen sind 8 Quellen, 26 Startwerte und 26
  Prüfzustände, alle **maschinell** (keine Freigabe). Dänisch hat für die
  neuen Schlüssel keinen Startwert und bleibt offen. Das ist **keine**
  allgemeine CMS-Abnahme.
- **Seitenkopie, Stand 2026-09-15 (Etappe 3A, geprüfte Fassung 2) —
  INSTALLIERT, aber ohne Live-Abnahme:** Der geprüfte SQL-Block aus
  `docs/04-betrieb/sql-entwurf-seitenkopie-2026-09-14.md` ist unverändert als
  Migration `20260915001300_4714afe1-43dc-4c80-bfa9-cb5e686c4cf1.sql`
  angewendet: genau sechs vorhandene Funktionskörper, keine neue Funktion,
  keine Rechte-, Tabellen-, Policy- oder Scheduleränderung, keine
  Datenänderung. `rpc_admin_duplicate_page` behält die Aufrufsignatur:
  verschachtelte Bausteine behalten ihre Elternbeziehung, Felder aller Sprachen
  behalten Prüfstatus und Fingerabdruck, Bilder behalten `viewport` und
  ausgeblendete Zeilen, Seitentitel- und Alt-Übersetzungen samt Prüfzuständen
  werden mitkopiert, die Whitelist wird exakt übernommen (auch deaktiviert), und
  der reale Karten-Seed-Trigger legt beim Kopieren keine Doppelzeilen mehr an
  (bisher `SQLSTATE 23505`). Kopieren löst **keine** Übersetzungsläufe aus
  (transaktionslokale Kennung, außerhalb der Kopie unverändertes Verhalten) —
  auch nicht über den Navigationsknoten, dessen Trigger mitgeliefert wurde.
  Die Beschriftung des neuen Menüknotens übernimmt vorhandene Titel-Prüfzustände
  (`nav_label`); ohne Nachweis bleibt sie `maschinell`, niemals „geprueft". Alle
  Quelldaten kommen aus **einem** Lesevorgang, Arbeitstabellen sind
  `pg_temp`-qualifiziert, die Zyklusprüfung hat keine Tiefengrenze, und
  Zielschlüssel **und** Zielroute sind gegen doppelte Klicks gesperrt.
  Nachweis: 26 tatsächlich ausgeführte Prüfungen in einer isolierten
  Testdatenbank (`src/test/pageCopySql.pglite.test.ts`, nur künstliche Daten)
  **plus** Funktions-Readback am Livebestand — alle sechs installierten Körper
  sind Byte für Byte gleich dem Entwurf, Rechte und Bestände unverändert, null
  neue Übersetzungsaufträge durch die Installation. **Nichts deployed, nichts
  veröffentlicht, keine echte Kopie ausgeführt, keine Live-Testdaten.** Offene
  Restlücken: **keine** echte Live-Kopie, keine Nebenläufigkeits-, Last- oder
  Wiederherstellungsabnahme, keine Sichtprüfung in der Vorschau; und
  `rpc_admin_duplicate_page` bleibt für `PUBLIC`/`anon`/`authenticated`
  ausführbar — der offene CMS-Schreibweg ist **nicht** behoben. Nächste offene
  Etappe: gemeinsame Leser/Sichtbarkeit.

- **Gemeinsamer Seitenleser, Stand 2026-09-15 (Etappe 4A) — nur Frontend-Lesepfad:**
  `src/features/cms/hooks/useCmsPageContent.ts` wurde eng begrenzt reparaturt:
  Lade- und Ergebniszustand gehören jetzt zur angefragten Seite (bei einem
  Seitenwechsel wird nie mehr der Stand der vorherigen Seite gezeigt, auch nicht
  im ersten neuen Render); späte Antworten und Antworten nach dem Ausbau
  überschreiben den aktuellen Stand nicht; ein Lesefehler oder eine fehlende
  Konfiguration leeren alle Nachschlagewerke und werden über ein zusätzliches
  Feld `error` (`read_failed` / `unconfigured`) unterscheidbar, statt eine
  Teilmenge als Erfolg auszugeben. Das seitenweise Lesen bricht bei Fehler oder
  fehlenden Daten (auch ab Seite 2) mit klarem Fehler ab, alle drei Ressourcen
  werden nur gemeinsam übernommen, und jede geblätterte Abfrage sortiert
  eindeutig (fachliche Reihenfolge + `id`). **Wichtig:** eine eindeutige
  Sortierung macht das Blättern deterministisch, ist aber **keine**
  Momentaufnahme-Garantie der Datenbank — parallele Schreibvorgänge können
  weiterhin einen gemischten Lesestand ergeben. Die Bausteinliste enthält nur
  echte Wurzeln und Nachkommen mit vollständig erreichbarer sichtbarer
  Elternkette (iterativ, endlich, ohne künstliche Tiefengrenze); verwaiste
  Kinder werden **nicht** mehr zu Wurzeln umgedeutet. Die gelesene
  DB-Reihenfolge (`sort_order`, `id`) wird dabei nur **gefiltert**, nicht neu
  sortiert — auch bei gleichen Ordnungszahlen. Bei Alt-Texten gelten die
  alten Spalten genau für DE/EN/PL; andere Sprachen nutzen die vertikalen
  Übersetzungen und die Rückfallkette aus dem Sprachregister — kein pauschales
  Polnisch mehr für NL/DA. Das Sprachregister wird unabhängig geladen und wird
  nach dem Eintreffen renderwirksam, ohne das Inhaltsladen zu blockieren.
  Das Client-Modul wird weiterhin erst bei Bedarf nachgeladen (Modulcache der
  Laufzeit); ein zusätzlicher eigener Zwischenspeicher wurde bewusst **nicht**
  eingebaut. Die frühere Vermutung, parallele Anfragen bekämen verschiedene
  Modulinstanzen, ist **nicht belegt** — sie ging auf ein Problem der
  Testattrappe zurück, das jetzt in den Tests (`vi.hoisted`) gelöst ist.
  Bewusst **nicht** umgebaut: bewusst leere/NULL-Werte, Textrückfälle, die
  Definition von `hasDbContent` (außer im Fehlerfall) und die Regel für
  veraltete maschinelle Werte; keine neue Sprachliste im Code, keine
  Renderer-/Layoutänderung, keine Umbenennung von Feldern, keine Filter- oder
  Löschänderung an Feldern/Medien. Nachweis: 21 tatsächlich ausgeführte
  React-Verhaltenstests (`src/test/useCmsPageContent.test.tsx`, gesteuerte
  Antworten, keine Datenbank; laufende Anfragen werden erst nach
  nachgewiesenem Start freigegeben), gesamte Testsuite 578 grün, `cms:preflight`
  Exitcode 0. **Offen:** keine Browser-/Vorschauabnahme der Seiten, keine
  Abnahme fest verdrahteter Altnutzer der Bausteinliste (separat zu prüfen),
  kein Deployment, keine Veröffentlichung.

- **Bausteinkopie, Stand 2026-09-15 (Etappe 3B) — INSTALLIERT (Entwurfsverlauf unten):**
  Für das Einfügen eines einzelnen Blocks mit allen Unterkarten
  (`rpc_admin_paste_section`) liegt ein geprüfter SQL-Entwurf unter
  `docs/04-betrieb/sql-entwurf-baustein-kopie-2026-09-15.md`. Er ist **keine**
  Migration und **nicht** angewendet: keine Live-Inhalte, kein Deployment, keine
  Veröffentlichung. Die heute live laufende Fassung ist unabhängig geprüft und
  in 9 von 17 Punkten fehlerhaft: ein ausgeblendeter Block wird beim Einfügen
  sichtbar, Prüfstatus und Fingerabdruck der Felder gehen verloren, eine bewusst
  gesperrte Whitelist-Zeile wird wieder freigegeben, ein ausgeblendetes Bild
  fehlt ganz, polnische Alt-Texte, vertikale Alt-Übersetzungen und
  Alt-Prüfzustände fehlen, es entstehen 7 Übersetzungsaufträge pro Einfügen,
  Bestandsschlüssel wie `cards.first` sind nicht kopierbar, und eine
  gleichnamige dauerhafte Tabelle würde gelöscht. Der Entwurf ersetzt genau
  **einen** vorhandenen Funktionskörper, ändert keinen Trigger, legt keine neue
  Funktion an und setzt keine Rechte; er nutzt die in Etappe 3A installierte
  Kopie-Kennung. Nachbesserung 2026-09-15 nach unabhängiger Prüfung: ein
  Elternverweis der Quellwurzel **in den eigenen Unterbaum** wird jetzt als
  Zyklus abgelehnt (Selbstbezug, Wurzel-Kind-Zyklus, langer Zyklus), ein
  fremdseitiger Wurzel-Elternverweis wird aus demselben Snapshot erkannt, die
  verbindliche Wurzel-Kennung stammt aus dem Snapshot statt aus einem
  Vorab-Lesevorgang, die Einfügeschleife hat einen Fortschrittswächter (klarer
  Abbruch statt Endlosschleife, ohne künstliche Tiefengrenze), und die
  Kopie-Kennung wird schon zu Funktionsbeginn erfasst. Nachbesserung 2:
  liefert ein Kind-Einfügen keine Zeile, bricht die Kopie sofort mit
  `paste_child_insert_no_row` und vollständigem Rücklauf ab — der Zähler des
  Fortschrittswächters steigt erst danach. Nachweis: 32 tatsächlich
  ausgeführte Prüfungen in einer isolierten Testdatenbank
  (`src/test/sectionPasteSql.pglite.test.ts`, nur künstliche Daten, reale
  Ordnungshilfen, zusätzlich ein bewusst injizierter Testfall mit einmalig
  übersprungenem Kind), die 26 Prüfungen der Etappe 3A bleiben grün,
  `cms:preflight` Exitcode 0. **Seit 2026-09-15 INSTALLIERT** als Migration
  `supabase/migrations/20260915005640_625cc3fb-3c01-4f1b-a02e-961ab3cf0f1e.sql`
  (genau ein bestehender Funktionskörper ersetzt, keine neue Funktion, keine
  Rechte-, Trigger-, Tabellen-, Policy- oder Datenänderung); Rücklesen ergab
  eine bytegleiche Definition zum geprüften Entwurf, Rechte und alle Bestände
  unverändert. **Offen:** keine echte Kopierabnahme in der
  Vorschau, keine Nebenläufigkeits-, Last- oder
  Wiederherstellungsabnahme, keine Sichtprüfung in der Vorschau; andere
  Schreibwege (Umsortieren, Position, Elternwechsel, Löschen) sind **nicht**
  gegen gleichzeitiges Einfügen gesperrt; `rpc_admin_paste_section` bleibt für
  `PUBLIC`/`anon`/`authenticated` ausführbar — der offene CMS-Schreibweg und
  `/admin` ohne Rollenprüfung bleiben unverändert ein separates Risiko.





- **UI-Katalog, Stand 2026-09-14 (Etappe 2A):** Das gespeicherte
  Code-Manifest `scripts/i18n/ui-catalog.manifest.json` ist auf **422
  Einträge** abgeglichen (vorher 414). Neu sind genau 8 Schlüssel:
  `common:actions.close`, `common:language.nl`,
  `navigation:breadcrumb.segments.merkliste` und die fünf
  `service:katalog.pdp.documents.categories.*` (bedienungsanleitung,
  datenblatt, montageanleitung, produktinfo, schaltplan). Keine
  entfernten Schlüssel, keine geänderten deutschen Quelltexte, keine
  ersetzten EN/PL-Startwerte; 171 bestehende Einträge haben zusätzlich
  einen NL-Startwert (mit den 8 neuen: 179 NL).
- **Datenbank weiterhin bei 414 — diese 8 Einträge fehlen dort (offen).**
  Der Katalog in der Datenbank wurde **nicht** verändert: keine
  Synchronisierung, keine Migration, kein Edge-Deployment, kein
  Übersetzungslauf. Grund: der bestehende Abgleichvertrag
  `rpc_admin_sync_ui_strings` vergibt einen fehlenden Prüfstatus pauschal
  als „geprüft" und kann über den Einfüge-Trigger
  `cms_autopilot_enqueue_unit` neue Übersetzungsjobs anstoßen (live
  `is_enabled=true`, `is_paused=false`). Beides ist ein **offener
  Vertragsbefund** und muss vor einem Abgleich geklärt werden — keine
  pauschale Prüfstatusvergabe, kein ungewollter Autopilot-Start.
  Vorhandene Sprachwerte in der Datenbank bleiben unangetastet.
- **Etappe 2B, Stand 2026-09-14 — Code vorbereitet, SQL NICHT ANGEWENDET:**
  Der Abgleichvertrag ist als **Entwurf** neu gefasst
  (`docs/04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md`):
  standardmäßig nur Bericht (`dry_run` = true), strikte Eingabeprüfung mit
  Abbruch vor jeder Änderung, ausschließlich Einfügen fehlender
  Katalogschlüssel und fehlender Startwerte, keine Änderung deutscher
  Quelltexte, keine Stilllegung/Reaktivierung, keine Freigabe für neue
  Startwerte (`maschinell`), transaktionslokale Unterdrückung der
  Übersetzungsaufträge. Der Entwurf liegt **bewusst nicht** in
  `supabase/migrations/` und ist **nicht ausgeführt**: die laufende Datenbank
  ist unverändert (414 Schlüssel), kein Abgleich, kein Deployment, kein
  Übersetzungslauf. Aufrufweg angepasst: Serverdienst reicht `dry_run` durch
  und meldet entstandene Aufträge ehrlich; das Skript
  `scripts/i18n/ui-catalog-sync.mjs` zeigt ohne `--apply` nur die Vorschau.

- **Etappe 2B, 2026-09-14 — Katalogimport AUSGEFÜHRT:** Der einmalige additive
  Abgleich mit dem Manifest `m76089c5e-422` ist über den geprüften Weg
  (Aufrufskript → geschützter Serverdienst → `rpc_admin_sync_ui_strings`)
  angewendet: **8 neue Katalogschlüssel, 26 neue Startwerte, 26 maschinelle
  Prüfzustände**. Stand jetzt: **422 Schlüssel, 1672 Übersetzungen, 1672
  Prüfzustände**. Bestehende deutsche Quellen, Übersetzungen und Prüfstatus
  sind unverändert (583 „geprueft" wie vorher), keine Freigabe für neue
  Startwerte, **0** durch den Import gestartete Übersetzungsaufträge; die
  Kontroll-Vorschau danach zeigt 0 fehlende Quellen und 0 Kandidaten.
  **Offen:** DA hat für die neuen Schlüssel keinen Startwert; die neuen
  Startwerte sind unkuratiert und nicht freigegeben; keine Preview-/Sichtprüfung,
  keine Veröffentlichung.

- **Etappe 2B, 2026-09-14 — Vertrag ANGEWENDET, Import OFFEN:** Der geprüfte
  SQL-Block ist als Migration
  `supabase/migrations/20260914232231_de6124a1-2be1-404b-ab18-da0e57fe7232.sql` angewendet
  (`cms_autopilot_trg_ui_strings`, `rpc_admin_ui_catalog_sync_capabilities`,
  `rpc_admin_sync_ui_strings`, Ausführung nur `service_role`). Der geprüfte
  Serverdienst `cms-translation-run` ist bereitgestellt. **Es wurde nichts
  importiert** — kein Abgleich, auch keine Vorschau: 414 Katalogschlüssel,
  1646 Übersetzungen, 1646 Prüfzustände vor und nach der Anwendung
  unverändert. Lesend belegt: Protokollstand 2, `writes = insert_only`,
  Trigger-Vertrag vorhanden, keine Ausführungsrechte für PUBLIC/`anon`/
  `authenticated`. Der Katalogimport der 8 fehlenden Schlüssel bleibt ein
  **eigener Auftrag**; keine Veröffentlichung.

- **Etappe 2B, Abschlusskorrekturen 2026-09-14 (weiter NICHT ANGEWENDET):**
  Das Aufrufskript verlangt beim Modusvergleich ausdrücklich
  `applied === !dry_run` (fehlend oder `null` = unklarer Zustand, Exitcode 1)
  und prüft die Unterdrückung **vor** der Erfolgsmeldung. Im Entwurf wird der
  verwaiste Prüfzustand auch bei noch fehlender Quellzeile klassifiziert, damit
  Vorschau und Anwendung übereinstimmen. Ehrliche Einordnung: die
  unabhängigen Gegenprüfungen wurden von **Codex** ausgeführt; neue Schlüssel
  bleiben nicht generell unübersetzt — vorhandene Startwerte (EN/PL/NL) werden
  unkuratiert und ohne Freigabe eingefügt, Sprachen ohne Startwert (u. a. DA)
  bleiben offen. Der Entwurf ist weiterhin **nicht** auf der laufenden
  Datenbank angewendet (dort unverändert 414 Schlüssel).

- **Etappe 2B, Nachprüfung 2026-09-14 (Entwurf korrigiert, weiter NICHT
  ANGEWENDET):** Eine unabhängige Ausführung in isoliertem PostgreSQL fand
  sechs zu schwache Pflichtfeld-Prüfungen (`jsonb_typeof(...) <> '…'` ist bei
  fehlendem Schlüssel NULL, also nicht wahr). Korrigiert über
  `IS DISTINCT FROM`; die Version wird nur als Text akzeptiert. Weiter
  korrigiert: Vorschau zählt dieselben Startwert-Kandidaten wie die Anwendung
  (auch die neuer Schlüssel), stillgelegte Katalogzeilen werden nicht beiläufig
  ergänzt, sondern als übersprungen berichtet; verwaiste Prüfzustände
  blockieren den Import statt ihn scheinbar freigegeben erscheinen zu lassen;
  betroffene Quellzeilen werden beim Anwenden kurz und in fester Reihenfolge
  gesperrt (kein Tabellenlock); Startwert und Prüfzustand entstehen paarweise
  atomar. Der globale Auftragszähler ist entfernt — berichtet wird nur noch
  der **eigene** Import als unterdrückt, über gleichzeitige Vorgänge außerhalb
  dieser Transaktion wird nichts behauptet.
  Versionswechsel ist jetzt **fail-closed**: neue lesende Auskunft
  `rpc_admin_ui_catalog_sync_capabilities()` (Protokollstand 2), neue
  geschützte Aktion `ui_catalog_sync_capabilities`; das Skript prüft den
  Protokollstand **vor** dem Abgleich, ein alter Serverdienst kennt die Aktion
  nicht, der neue Dienst ruft eine alte Datenbank nicht an. Unbekannte
  Schalter werden abgelehnt, auch mit `--apply`; bei widersprüchlicher Antwort
  behauptet das Skript weder Erfolg noch „kein Schreiben".
  Nachweis: **tatsächlich ausgeführte** Prüfungen —
  `src/test/uiCatalogSyncSql.pglite.test.ts` (19, isolierte Testdatenbank,
  nur künstliche Daten) und `src/test/uiCatalogSyncCli.test.ts` (9, echter
  Kindprozess gegen Testserver). Ein positiver Nachweis auf der **laufenden**
  Datenbank fehlt weiter und bleibt **offen**; Anwendung erst nach
  unabhängiger Prüfung und ausdrücklicher Freigabe.


- **Grüner Code-Stand ist keine Gesamtfreigabe.** Struktur-, Datenbank-
  und Preview-Abnahme bleiben getrennt verpflichtend.

### Historie (Juni 2026, nicht als aktueller Stand lesen)

Nach Batch 25/26/27 wurden gemeldet: Wahrheits-Check 0 Kritisch /
0 Restschuld · Coverage 0 · Globaler Spiegel-Audit 0 · FAQ/CTA
orphan/mixed/dedup-only 0 · Public-Blocks rot/gelb_restschuld 0.
Diese Werte dokumentieren den damaligen Abnahmestand.


**„Freeze" heißt: kein unkontrollierter Umbau — nicht Stillstand.**
Kontrollierte redaktionelle Arbeit innerhalb des bestehenden CMS-Light-
Baukastens ist ausdrücklich erlaubt: Seiten und Unterseiten anlegen,
Navigation anpassen, Karten ergänzen/sortieren/entfernen, Bausteine
sortieren, Bilder tauschen, Links setzen, bestehende Seitentypen /
Section-Typen / Kartenmodelle verwenden. Wenn ein Wunsch außerhalb
des Baukastens liegt (neuer Seitentyp, neuer Section-Typ, neue
Renderer-Logik, DB-Migration außerhalb normaler CMS-Datenpflege,
Produkt-DB-Arbeit, Login/Auth, Änderung der technischen Routing-/
Navigationsarchitektur), improvisiert Lovable nicht, sondern erklärt
kurz, welches Systemelement fehlt, und schlägt einen sauberen
Folgeauftrag vor — die Redaktion selbst wird dadurch nicht ausgebremst.
Details siehe `.lovable/always-follow.md`, Abschnitt CMS-Freeze.

Detail-Live-Status: [`04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](./04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md).
Abnahmebericht: [`04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md`](./04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md).
Führende Startseite für Redaktion und Prompts:
[`03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](./03-redaktion/redaktions-uebergabe-und-prompt-regeln.md).

## Was im Juni-Scope abgeschlossen wurde (Historie, Stand 2026-06-05)

Die folgenden Punkte beschreiben den damaligen Abnahmestand. Sie sind
seither nicht erneut gemessen worden und gelten daher nicht als
aktuelle Zusage.



- DB-first-Rendering auf allen aktiven CMS-Seiten via `useCmsI18n`.
- Spiegelregel greift flächendeckend (Reihenfolge, Sichtbarkeit, Inhalt).
- Whitelist-Pflicht (`cms_admin_editable_fields`) ist eingehalten.
- Service-Hub, Navigations-Pillen, Breadcrumbs, Schattenfeld-Bereinigung,
  „Hauptmenü aus"-Hint — alle erledigt.
- ZIP-Übergabestand dokumentiert (Codebase-ZIP + CMS-Light-Snapshot,
  beide manuell; Snapshot = `rls_public_only`, kein vollständiges DB-Backup).

## Bewusst offen / nicht im CMS-Scope

- Login / Auth / Rollenmodell (eigenes Folgeprojekt)
- Einzelne Klasse-A-Marketing-Pages, die noch hartcodiert sind
- Admin-UX-Kosmetik (z. B. Whitelist-Race, kleine UI-Politur)
- Inhalts-Audit nach dem nächsten Marketing-Stand
- **Polnisch (PL): Pilot läuft, noch nicht redaktionell abgenommen.**
  Übersetzungsgrundlage (Übersetzungsspeicher, Auftrags-Protokoll,
  Herkunftsstatus) steht; PL-Inhalte bisher nur auf
  `anwendungen.einfamilienhaus` und `anwendungen.klinik` (362 Felder, alle
  „maschinell"). Der Pflege-Editor hat die dritte Spalte PL samt
  Herkunfts-Kennzeichnung und Einzelübersetzung je Feld. Offen: PL-Freigabe
  („geprüft") und PL-Veröffentlichung.
- **Übersetzungs-Arbeitsbereich (seit 2026-09-11):** `/admin` hat direkt nach
  „Wahrheits-Check" den Bereich **Übersetzungen** — Sprachliste aus der
  Datenbank (DE Quelle, EN/PL aktiv, NL/DA vorbereitet und aus),
  Abdeckungsübersicht, Umfangswahl (eine Seite / Auswahl / ganze Sprache),
  Pflicht-Vorschau mit Kostenschätzung, echte fortsetzbare Läufe in der
  Datenbank (Pause/Fortsetzen/Abbruch, Fortschritt, Restzeit) und ein
  Prüfbericht mit CSV bzw. Druck/PDF. Seit 2026-09-11 umfasst der Bereich
  **alle** übersetzbaren Datenbereiche (15.855 deutsche Texte: 15.278
  Baustein-Texte, 125 Seitentitel, 141 Navigations-Beschriftungen, 42
  Navigations-Beschreibungen, 269 Bild-Alternativtexte) und eine durchsuchbare
  Textliste zum Übersetzen von Hand. Die Modell-Auswahl kommt seit 2026-09-11
  ausschließlich aus der Datenbank: Standard für große Läufe
  `google/gemini-3.6-flash`, Qualitätsmodus `openai/gpt-6-astra`, dazu
  Gemini 3.7 Flash, 3.1 Flash Lite und 3.1 Pro (Vorschau); die alten
  Gemini-2.5-Einträge sind entfernt. „Anderes Modell" öffnet ein geprüftes
  Eingabefeld (`anbieter/modell`). Für Gateway-Modelle wird bewusst keine
  Kostenschätzung ausgewiesen (Abrechnung nach Token). Titel, Navigation und Bild-Alternativtexte
  sind für Läufe nur dort vorbereitet, wo die Seite in der Sprache vorbereitet
  ist — Polnisch bleibt damit auf die Pilotseiten begrenzt.
  Seit 2026-09-12 führt der Bereich einen kompakten Hauptablauf in drei
  Schritten („1 Sprache wählen", „2 Fehlende Texte prüfen", „3 Alles Fehlende
  übersetzen"); alles Weitere liegt in geschlossenen Akkordeons. Geplant und
  übersetzt wird ausschließlich Fehlendes und Veraltetes; die Pflicht-Vorschau
  wird per Haken bestätigt. Vorbereitungs- und Übersetzungsstand werden getrennt
  gezählt („vorhanden / fehlt / muss aktualisiert werden / Fehler" gegenüber
  „für diese Sprache noch nicht vorbereitet"). Es gibt genau eine Laufanzeige;
  die Restzeit erscheint erst nach mindestens 25 verarbeiteten Texten. Im
  normalen Ablauf gibt es keine Eingabe für Sprachkürzel oder Freigabewort —
  ohne serverseitige Freigabe steht dort neutral „Gesamtlauf noch nicht
  administrativ freigeschaltet" und die Schaltfläche bleibt gesperrt.
  Die Verarbeitung läuft seit 2026-09-11 vollständig auf

  dem Server: eine Nachschau im Minutentakt arbeitet offene Läufe weiter,
  nimmt hängengebliebene Schritte wieder auf und schaltet sich ab, sobald
  kein Lauf mehr offen ist. Ein geschlossener Browser hält nichts an. Details:

  [`04-betrieb/uebersetzungswerkzeug.md`](./04-betrieb/uebersetzungswerkzeug.md).
  Weiterhin ohne Login/Rollenmodell; Schutz kommt aus serverseitiger
  Mengenbremse (30/Minute, 600/Tag je Ursprung+IP), harten Eingabegrenzen und
  CORS nur für die eigenen Ursprünge. Gesamtläufe über eine ganze Sprache sind
  serverseitig gesperrt, solange kein Freigabewort hinterlegt ist.
  Live-Details:
  [`04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](./04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md).



## Etappe 4B (2026-09-15) — Seitenend-Blöcke bleiben stehen

CTA- und FAQ-Blöcke am Seitenende verschwanden nach einem erneuten Render
(z. B. `/anwendungen/pflege`), weil sie sich selbst als „schon oben im Text
gerendert" gemeldet haben. Behoben: Nur eine Ausgabe mitten im Seitentext
meldet sich noch an, und nur wenn sie wirklich Inhalt zeigt. Doppelte Ausgaben
bleiben weiterhin ausgeschlossen. Keine Datenbank-/Rechte-/Inhaltsänderung,
keine Veröffentlichung. Nachweis und Restgrenzen:
[`04-betrieb/audit-snapshot/etappe-4b-seitenendbloecke-2026-09-15.md`](./04-betrieb/audit-snapshot/etappe-4b-seitenendbloecke-2026-09-15.md).

**Etappe 4C, Ergänzung nach Gegenprüfung:** Das Render-Register meldet jetzt
auch neue Inline-Ausgaben aus reinen Teilbaum-Aktualisierungen nach deren
Commit. Dadurch bleiben bei lokalem Ein-/Ausblenden eines CTA- oder FAQ-Blocks
stets genau eine Inline- oder Seitenend-Ausgabe sichtbar; der Provider muss
nicht zufällig mitrendern. 19 echte Integrationsprüfungen decken beide
Einzel-Renderer und `CmsTailSections` ab. Ehrliche Restgrenze: Für einen von
React vor dem Commit verworfenen Render-Versuch ist die Bereinigung eines
vorläufigen Eintrags nicht abschließend nachgewiesen. Keine Datenbank-, Rechte-
oder Inhaltsänderung, keine Veröffentlichung.

## Etappe 5 (2026-09-15) — Entwürfe und Speicherantworten im Feldeditor

Nachbesserung 5.2: Der Zielzustand wird beim Übersetzungsstart festgehalten und
bei Rückkehr verglichen. Ein zwischenzeitlich **gespeicherter** oder per
Serverauffrischung geänderter Zielwert wird nicht mehr still ersetzt, sondern der
Vorschlag über den bestehenden Dialog angeboten; ein unverändertes, sauberes
Zielfeld erhält ihn weiterhin automatisch. Die Meldung lautet neutral zutreffend
„Vorschlag liegt vor" statt „eingefügt". 31 Editor-Tests, Gesamtsuite 628 grün,
`cms:preflight` Exit 0.


Nachbesserung 5.1: Besuchszähler gegen alte Antworten/Vorschläge bei Rückkehr
A → B → A, eigener Inflight-Latch (nicht durch Prop-Refresh, Vorschlag oder
Konfliktknopf entsperrbar), späte Übersetzungsvorschläge werden separat
angeboten statt neueren Text zu überschreiben, Quelltextwechsel wird erkannt,
und unbeklärte Konflikte sperren das Speichern. 28 Editor-Tests, Gesamtsuite
625 grün, `cms:preflight` Exit 0. Serverseitiger CAS-Schutz und Readback bleiben
offen.

Der Feldeditor im Admin hängt seinen Zustand jetzt eindeutig an Seite, Baustein,
Feld und Sprache. Ein ungespeicherter Entwurf wird von einer Serverauffrischung
nicht mehr still überschrieben, sondern als sichtbarer Konflikt mit zwei
ausdrücklichen Entscheidungen angezeigt. Während eines Speichervorgangs ist kein
zweiter Save möglich, weiteres Tippen bleibt ungespeichert, und ein Erfolg gilt
nur für den tatsächlich abgeschickten Wert. Späte Antworten und späte
Übersetzungsvorschläge schlagen nach einem Feldwechsel nicht mehr auf das neue
Feld durch; nach dem Ausbau löst eine alte Antwort keinen Reload mehr aus.
Korrigiert wurden außerdem falsche Kommentare: `rpc_admin_update_section_field`
macht `INSERT ... ON CONFLICT ... UPDATE` und setzt `review_status='geprueft'` —
das SQL selbst blieb unangetastet. Nachweis: 16 neue Verhaltenstests an der
echten Komponente, Gesamtsuite 613 grün, `npm run cms:preflight` Exitcode 0,
lesende Admin-Vorschau geprüft. Weiterhin **offen**: serverseitige
Konfliktprüfung/CAS, Readback des geschriebenen Werts, NL/DA im Feldeditor,
`image_position`/Bulk als eigener Schreibpfad, offene CMS-Schreibrechte und
fehlendes Login/Rollenmodell für `/admin`. Details:
[`04-betrieb/audit-snapshot/etappe-5-entwuerfe-speicherantworten-2026-09-15.md`](./04-betrieb/audit-snapshot/etappe-5-entwuerfe-speicherantworten-2026-09-15.md).
Keine Datenbank-, Inhalts- oder Rechteänderung, keine Veröffentlichung.


## Historie

Lange Sprint- und Etappen-Erzählungen sowie der frühere Langstatus liegen
unter [`archiv/status-historisch/current-status-bis-batch26.md`](./archiv/status-historisch/current-status-bis-batch26.md)
und [`archiv/sprint-berichte/`](./archiv/sprint-berichte/). Sie sind
Belege, aber keine aktive Arbeitsgrundlage mehr.
