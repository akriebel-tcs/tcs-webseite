# Redaktions-Änderungsprotokoll

## 2026-09-15 — Etappe 4A: gemeinsamer Seitenleser repariert (nur Frontend-Lesepfad)

Auslöser: 9 unabhängig ausgeführte Verhaltenstests gegen den Leser, 8 davon rot.

- **Geändert:** `src/features/cms/hooks/useCmsPageContent.ts` (Lesepfad), neue Testdatei `src/test/useCmsPageContent.test.tsx`.
- **Behoben:** Reste der vorherigen Seite nach einem Seitenwechsel (auch im ersten neuen Render), späte Antworten und Antworten nach dem Ausbau, Teilmengen als scheinbarer Erfolg beim Blättern (Fehler und fehlende Daten führen jetzt zum Abbruch), fehlende eindeutige Sortierung jeder geblätterten Abfrage, verwaiste Bausteine als Wurzeln sowie Zyklen/Nachfahren fehlender Eltern in der Bausteinliste, pauschal polnische Alt-Texte für NL/DA. Zusätzlich additives Feld `error` (`read_failed` / `unconfigured`), damit leer und Ladefehler unterscheidbar sind.
- **Nachkorrektur 2026-09-15 (Gegenprüfung):** (1) Die Bausteinliste wird nur noch **gefiltert**, nicht zusätzlich nach Schlüsselnamen sortiert — die eindeutig gelesene DB-Reihenfolge (`sort_order`, `id`) bleibt erhalten, auch bei gleichen Ordnungszahlen. (2) Der zwischenzeitlich eingebaute eigene Zwischenspeicher für das Client-Modul wurde **entfernt**; es bleibt beim ursprünglichen Nachladen bei Bedarf. Die Behauptung, parallele Anfragen bekämen sonst verschiedene Modulinstanzen, war **nicht belegt** und ist aus der Doku entfernt; die Ursache lag in der Testattrappe und ist dort mit `vi.hoisted` gelöst. (3) Die Tests warten jetzt nachweislich auf gestartete Anfragen, halten sie zurück, wechseln bzw. bauen dann ab und geben erst danach frei; der Ausbau-Test prüft `console.error` und `console.warn` gezielt mit Spionen.
- **Ausdrücklich nicht umgebaut:** bewusst leere/NULL-Werte, Textrückfälle, `hasDbContent`-Definition (außer im Fehlerfall), Regel für veraltete maschinelle Werte, Sprachliste (weiterhin nur `cms_locales`), Renderer/Layout, Feld- oder Medienfilter, Namensmigrationen.
- **Grenze, die bestehen bleibt:** eindeutige Sortierung ist **keine** Momentaufnahme-Garantie der Datenbank.
- **Prüfungen:** 21 neue React-Verhaltenstests mit gesteuerten Antworten (keine Datenbank), gesamte Suite 578 grün, `cms:preflight` Exitcode 0. Keine Migration, keine Datenänderung, kein Deployment, keine Veröffentlichung. Browser-/Vorschauabnahme und die Prüfung fest verdrahteter Altnutzer der Bausteinliste bleiben **offen** — kein Gesamtgrün.

## 2026-09-15 — Etappe 3B: Bausteinkopie INSTALLIERT (nur Funktionskörper)

Nach unabhängiger Prüfung des Entwurfs `cd6253cf5641bb55d9768946c27c1aa58af90f4f` (20/20 Prüfungen grün, einschließlich Kind-Einfügen ohne Kennung und vollständiger Rücknahme) wurde der geprüfte SQL-Block unverändert angewendet:

- **Migration:** `supabase/migrations/20260915005640_625cc3fb-3c01-4f1b-a02e-961ab3cf0f1e.sql` — ersetzt **genau einen** bestehenden Funktionskörper (`rpc_admin_paste_section`). Keine neue Funktion, kein Trigger, kein Recht, keine Signaturänderung, keine Tabellen-, Policy-, Scheduler- oder Datenänderung.
- **Vorher gesichert (lesend):** Definition (md5 `e5729a0d8b909a5653976cdd52a33e65`, 10.109 Zeichen), Rechte `{=X/postgres,postgres=X,anon=X,authenticated=X,service_role=X}`, Bestände 125 Seiten / 2.011 Bausteine / 150.085 Felder / 1.755 Medienzuordnungen / 141 Navigationsknoten / 178.288 Whitelist-Zeilen / 3.074 Prüfzustände / 42.965 Aufträge.
- **Nachher zurückgelesen:** installierte Definition (md5 `c901d3356138a0db9bc1021492bd650a`) ist **bytegleich** zum geprüften Entwurf (Vergleich der normalisierten `pg_get_functiondef`-Ausgabe, Diff leer); `SECURITY DEFINER`, `search_path=public`, `lock_timeout=3s`, `statement_timeout=60s`; Rechte unverändert; alle acht Bestandszahlen unverändert; Anzahl der Funktionen im Schema unverändert (120); **keine** echte Live-Kopie, keine Testseite, **null** neue Übersetzungsaufträge. Linter unverändert bei 136 vorbestehenden Befunden.
- **Prüfungen:** `sectionPasteSql.pglite.test.ts` 32/32, `pageCopySql.pglite.test.ts` 26/26, `npm run cms:preflight` Exitcode 0.
- **Ausdrücklich offen (nicht behoben):** keine echte Kopierabnahme in der Vorschau, keine Nebenläufigkeits-, Last- oder Wiederherstellungsabnahme; andere Schreibwege (Umsortieren, Position, Elternwechsel, Löschen) nehmen die Einfüge-Sperre nicht; `rpc_admin_paste_section` bleibt für `PUBLIC`/`anon`/`authenticated` ausführbar — offener CMS-Schreibweg und `/admin` ohne Rollenprüfung bleiben ein separates Risiko. Kein Deployment, keine Veröffentlichung.

## 2026-09-15 — Etappe 3B: Bausteinkopie-ENTWURF (Vorgeschichte, jetzt installiert)

### Nachbesserung 2 · 2026-09-15 (weiterhin NICHT ANGEWENDET)

Nach unabhängiger Prüfung (`299c4b95f9b0e30239a5b13074e7504275932e89`, alle 17 Haupttests plus Zyklustest bestanden) wurde der Fortschrittswächter präzisiert — geändert wurden nur SQL-Entwurf, Testdatei und Doku:

- **Kind-Einfügung ohne Zeile.** Bisher wurde `_progress` auch erhöht, wenn `RETURNING id` keine Kennung lieferte (z. B. BEFORE-Trigger mit `RETURN NULL`); ein dauerhaft übersprungenes Kind hätte weitergezählt. Jetzt wird unmittelbar nach **jedem** Kind-Einfügen geprüft: keine Kennung → `paste_child_insert_no_row` mit vollständigem Rücklauf; Zuordnung, Zähler und Fortschritt folgen erst danach. Beim Wurzel-Einfügen war das schon so. Keine weitere Logik geändert.
- **Nachweis:** `src/test/sectionPasteSql.pglite.test.ts` jetzt **32** Prüfungen, neu mit einem bewusst injizierten Trigger, der genau **einmal** ein Kind überspringt (das ist ein Fehlerinjektionstest, keine Aussage über die echten Live-Trigger). Etappe-3A-Regression 26/26 grün. Weiterhin keine Migration, keine Live-Kopie, kein Deployment, keine Veröffentlichung.

### Nachbesserung 2026-09-15 (weiterhin NICHT ANGEWENDET)

Nach unabhängiger Prüfung des Entwurfs (`c4728c8e71eeed7dc3c2fe3c8ff14b652bc89567`; alle 17 Prüfungen bestanden) wurden zwei Lücken geschlossen — geändert wurden ausschließlich der SQL-Entwurf, die Testdatei und diese Doku:

- **Quellzyklus wurde akzeptiert.** Die Erreichbarkeitsprüfung gibt die Wurzel als Startpunkt vor und findet deshalb auch alle Mitglieder eines Zyklus; sie beweist keine Zyklenfreiheit. Neu wird nach dem Unterbaum-Snapshot geprüft, ob der Elternverweis der Wurzel **in den eigenen Unterbaum** zeigt — Selbstbezug, Wurzel-Kind-Zyklus und langer Zyklus werden als `section_parent_cycle` abgelehnt, ohne zu schreiben. Ein Elternknoten **außerhalb** des Unterbaums auf derselben Quellseite bleibt zulässig (normale Kopie eines Kindbausteins). Ein fremdseitiger Wurzel-Elternverweis wird aus **demselben** Snapshot (`root_parent`) als `section_parent_foreign` gemeldet, nicht still repariert.
- **Wurzel-Kennung stammt jetzt aus dem Snapshot.** Bisher wurde sie vor dem gemeinsamen Snapshot gelesen und danach unverändert weiterbenutzt; wird die Quellzeile zwischenzeitlich ersetzt (gleicher `section_key`, neue Kennung), hätten Namensvergabe und Wurzel-Einfügen 0 Zeilen getroffen. Die Vorabprüfung stellt nur noch die Existenz fest; alle Kopierentscheidungen kommen aus dem Snapshot. Zusätzlich: Fortschrittswächter in der Einfügeschleife (klare Ausnahme und vollständiger Rücklauf statt Endlosschleife, **keine** künstliche Tiefengrenze) und ein Wächter für die Wurzelzeile.
- **Kopie-Kennung** wird schon zu Funktionsbeginn erfasst, damit der Fehlerbehandler nicht von einer erst spät gesetzten Variablen abhängt. Kein neuer Zustand, keine weitere Funktion, kein Recht, kein Trigger, kein Renderer geändert.
- **Nachweis:** `src/test/sectionPasteSql.pglite.test.ts` jetzt **31** tatsächlich ausgeführte Prüfungen (neu: Root-Selbstzyklus, Root-Kind-Zyklus, langer Zyklus, normale Kind-Kopie, fremdseitiger Wurzel-Elternverweis), die 26 Prüfungen der Etappe 3A bleiben grün. Weiterhin: keine Migration, keine Live-Kopie, kein Deployment, keine Veröffentlichung. **Anwendung erst nach unabhängiger Prüfung.**

- **Keine** Datenbankänderung: keine Migration angewendet, keine Live-Inhalte geschrieben, kein Deployment, kein Übersetzungslauf, keine Veröffentlichung. Neu bzw. geändert sind ausschließlich `docs/04-betrieb/sql-entwurf-baustein-kopie-2026-09-15.md`, `src/test/sectionPasteSql.pglite.test.ts`, `docs/current-status.md` und dieses Protokoll.
- **Gelesen:** führende Regeln (Dachdokument Abschnitt 11, Kurzstatus, technischer Status, `always-follow`), die live installierte `rpc_admin_paste_section`, die realen Ordnungshilfen `cms_resequence_sections_dfs` / `cms_renumber_sections`, Constraints und Indizes (u. a. `cms_assets_active_slot_idx`) sowie der Aufrufweg `MasterDetailWorkbench.handlePasteFromClipboard` → `cmsAdminSectionOrder.pasteSection` → RPC.
- **Anlass:** unabhängige Prüfung der LIVE-Fassung in isoliertem PostgreSQL mit den realen Triggern (einschließlich Etappe 3A): 17 Prüfungen, 8 bestanden, 9 fehlgeschlagen — inaktive Wurzel wird aktiv, Felder verlieren Prüfstatus/Fingerabdruck, deaktivierte Whitelist-Zeile wird durch den Karten-Seed wieder freigegeben, nur 3 von 4 Bildern (inaktives fehlt), `alt_pl` fehlt, vertikale Alt-Übersetzungen und Alt-Prüfzustände fehlen, 7 Autopilot-Aufrufe, `cards.first` als Name abgelehnt, unqualifiziertes `DROP TABLE` würde eine dauerhafte `public._paste_key_map` löschen.
- **Entwurf (nur EIN Funktionskörper, `rpc_admin_paste_section`):** Signatur, Fehlerkennungen und Antwortfelder bleiben kompatibel (`assets_skipped` bei Erfolg immer `0`); neue Felder rein additiv (`key_map`, `asset_translations_copied`, `unit_states_copied`, `source_snapshot_at`, `autopilot_suppressed_in_this_transaction`). Vollständiger Unterbaum mit Aktivzustand, Typ, Verschachtelung und relativer Reihenfolge; alle Felder aller Sprachen inkl. leer/`NULL`/JSON/Prüfstatus/Fingerabdruck; Whitelist exakt auch deaktiviert; alle Medienzuordnungen inkl. inaktiver, `viewport`, Fokus, allen Sprachspalten, plus vertikale Alt-Übersetzungen und `asset_alt`-Prüfzustände auf die neuen Bild-IDs. **Kein** Seitentitel, **keine** Navigation, **keine** Dateikopie.
- **Schutz:** wiederverwendete Kennung `cms.suppress_page_copy_autopilot` aus Etappe 3A (kein Trigger, kein Helper, kein Recht geändert), exakte Rücksetzung nach Erfolg **und** Fehler; ein Lese-Snapshot vor jeder Zieleinfügung (auch bei gleicher Quell-/Zielseite); Arbeitstabellen ausdrücklich `pg_temp`-qualifiziert; Graphprüfungen ohne Tiefengrenze; Zielseite mit fremdem Eltern-Verweis oder Zyklus wird klar abgelehnt (ohne Schreiben); Wurzelnamenkonflikt wird wie heute abgelehnt, Kindnamen erhalten deterministische Suffixe; Medienkonflikt bricht die ganze Kopie ab statt still zu überspringen; transaktionslokale Advisory-Sperre auf die Zielseite; Laufzeitgrenzen als Funktions-`SET`.
- **Schlüsselgrammatik konservativ erweitert:** `^[a-z][a-z0-9_]*([.-][a-z0-9_]+)*$` — Punkt/Bindestrich nur als Trenner, damit Bestandsschlüssel wie `cards.first` kopierbar bleiben. Keine SQL-Interpolation aus Eingaben. In der Datenbank existiert kein Check-Constraint auf `section_key`.
- **Nachweis:** `src/test/sectionPasteSql.pglite.test.ts` — **26 tatsächlich ausgeführte** Prüfungen in isoliertem PostgreSQL (PGlite) mit realen Tabellen, Constraints, Indizes, Triggern und den **realen** Ordnungshilfen, grün. Die 26 Prüfungen der Etappe 3A (`pageCopySql.pglite.test.ts`) bleiben grün. `npm run cms:preflight` Exitcode **0**.
- **Ausdrücklich offen (nicht behoben):** kein Nachweis am laufenden Datenbestand, keine Nebenläufigkeits-, Last- oder Wiederherstellungsabnahme, keine Sichtprüfung in der Vorschau. Andere Schreibwege (Reorder, Set-Position, Set-Parent, Löschen) nehmen die Advisory-Sperre **nicht**. `rpc_admin_paste_section` bleibt für `PUBLIC`/`anon`/`authenticated` ausführbar — der offene CMS-Schreibweg und `/admin` ohne Rollenprüfung bleiben ein **separates, unerledigtes Risiko**. Der Umbenennungs-Regex in `NavigationTreeEditor` ist ein anderer Vorgang und wurde nicht angefasst; die Oberfläche wurde nicht umgestaltet.
- **Anwendung erst nach unabhängiger Prüfung.**

## 2026-09-15 — Etappe 3A: geprüfte Seitenkopie INSTALLIERT (nur Funktionskörper)

- **Angewendet:** Migration `supabase/migrations/20260915001300_4714afe1-43dc-4c80-bfa9-cb5e686c4cf1.sql` — exakt der geprüfte SQL-Block aus `docs/04-betrieb/sql-entwurf-seitenkopie-2026-09-14.md` (Fassung 2), ohne jede Abweichung.
- **Umfang:** genau sechs bereits vorhandene Funktionskörper ersetzt (`cms_autopilot_trg_pages`, `cms_autopilot_trg_assets`, `cms_autopilot_trg_section_fields`, `cms_autopilot_trg_nav`, `cms_card_v1_seed_whitelist`, `rpc_admin_duplicate_page`). **Keine** neue Funktion, **keine** Hilfsfunktion, **keine** `GRANT`/`REVOKE`, keine Tabellen-, Policy- oder Scheduleränderung, keine Datenänderung.
- **Vorher/nachher (gelesen):** Rechte unverändert — die fünf Trigger `postgres=X|service_role=X`, `rpc_admin_duplicate_page` weiterhin `PUBLIC`/`anon`/`authenticated`/`postgres`/`service_role`. Bestände unverändert: 125 Seiten, 2.011 Bausteine, 150.085 Felder, 1.755 Medienzuordnungen, 141 Navigationsknoten, 178.288 Whitelist-Zeilen, 537 Seitentitel-Übersetzungen, 1.853 Alt-Text-Übersetzungen, 3.074 Prüfzustände, 42.965 Übersetzungsaufträge. **Null** neue Aufträge durch die Installation. Keine echte Kopie ausgeführt, keine Live-Testdaten geschrieben.
- **Readback:** die sechs installierten Funktionskörper stimmen Byte für Byte mit dem Entwurf überein (identische MD5-Prüfsummen, u. a. `rpc_admin_duplicate_page` 17.107 Zeichen). Laufzeitgrenzen als Funktions-`SET` bestätigt (`search_path=public`, `lock_timeout=3s`, `statement_timeout=60s`). Die entfernte Hilfsfunktion `cms_page_copy_in_progress` existiert nicht.
- **Linter:** 136 Befunde — **identisch** zur Zahl vor der Installation, also keine neuen Befunde. Diese vorbestehenden Befunde sind **nicht** behoben.
- **Ausdrücklich offen (nicht behoben):** kein positiver Nachweis am laufenden Datenbestand (keine echte Live-Kopie), keine Nebenläufigkeits-, Last- oder Wiederherstellungsabnahme, keine Sichtprüfung in der Vorschau. `rpc_admin_duplicate_page` bleibt für `PUBLIC`/`anon`/`authenticated` ausführbar; der offene CMS-Schreibweg und `/admin` ohne Rollenprüfung bleiben ein **separates, unerledigtes Risiko**.
- **Nächste offene Etappen:** Einzelbaustein-Einfügen (`rpc_admin_paste_section`) und gemeinsame Leser/Sichtbarkeit.
- **Rücknahme:** vorherige `CREATE OR REPLACE`-Fassungen der sechs Funktionen erneut anwenden; **keine** `GRANT`s dabei setzen. Kopierte Seiten würden über `rpc_admin_archive_page` / `rpc_admin_delete_page` entfernt.

## 2026-09-14 — Etappe 3A, Fassung 2: Nachbesserung des Seitenkopie-ENTWURFS (damals NICHT ANGEWENDET — inzwischen am 2026-09-15 installiert)

- **Keine** Datenbankänderung: keine Migration angewendet, keine Live-Daten geschrieben, kein Deployment, kein Übersetzungslauf, keine Veröffentlichung. Geändert wurden ausschließlich der Entwurf, die isolierte Prüfung, `docs/current-status.md` und dieses Protokoll.
- **Anlass:** unabhängige Prüfung (Codex) des Stands `89754452155ad0dcb98214866493d718396a7d21` — 16 von 19 Prüfungen bestanden, drei Fehler plus sechs Härtungsforderungen.
- **Gelesen:** die live installierte Fassung von `cms_autopilot_trg_nav` sowie die tatsächlichen Bereichs-/Einheitsschlüssel in `cms_translation_unit_state` (`nav_label` → Knoten-UUID, `unit_key='label'`).
- **Korrigiert:**
  1. `cms_autopilot_trg_nav` wird mitgeliefert und erhält dieselbe transaktionslokale Unterdrückung; ohne diesen Ersatz entstanden beim Navigationsknoten **zwei** Autopilot-Aufträge (Beschriftung und Beschreibung). Außerhalb der Kopie bleibt die Logik unverändert.
  2. Neue `nav_label`-Prüfzustände auf die neue Knoten-UUID: aus vorhandenen `page_title`-Zuständen übernommen, ohne Nachweis `maschinell` — **niemals** „geprueft". Damit gilt eine kopierte Beschriftung nicht mehr stillschweigend als freigegeben.
  3. Beschriftungen: alle vertikalen Titelzeilen außer `de` werden übernommen, **einschließlich** `en`/`pl`; die vertikale Zeile hat Vorrang vor `title_en`/`title_pl`, die Spalten dienen nur als Ersatz ohne vertikale Zeile. Leerwerte bleiben leer, deutscher Text wird nie in eine andere Sprache kopiert.
  4. Die Hilfsfunktion `cms_page_copy_in_progress()` ist **entfernt** (sie war für `PUBLIC` ausführbar); die Prüfung steht direkt in den fünf vorhandenen Triggerfunktionen. Es entsteht keine neue Funktion und kein neues Ausführungsrecht.
  5. Alle Arbeitstabellen sind ausdrücklich `pg_temp`-qualifiziert — auch beim `DROP`. Eine gleichnamige dauerhafte Tabelle in `public` kann nicht getroffen werden.
  6. Zyklusprüfung ohne Tiefengrenze: Erreichbarkeit von den Wurzeln mit `UNION` statt Abbruch bei Tiefe 64.
  7. Alle Quelldaten kommen aus **einer** Anweisung (JSON-Paket) und können sich daher nicht widersprechen; die Quelle wird bewusst nicht gesperrt, die globale Isolationsstufe nicht verändert.
  8. Zweite transaktionslokale Advisory-Sperre auf die angeforderte Route, danach erneute Konfliktprüfung; `lock_timeout`/`statement_timeout` als Funktions-`SET`; die Unterdrückungskennung wird auf den **exakten** vorherigen Wert zurückgesetzt.
- **Nachweis:** `src/test/pageCopySql.pglite.test.ts` — **26 tatsächlich ausgeführte** Prüfungen (vorher 20), grün. Neu: live-gleicher Navigationstrigger vor dem Entwurf eingespielt und null Aufträge nachgewiesen (danach wieder `nav_label` + `nav_description`), `nav_label`-Zustände je Sprache, Vorrang der vertikalen `en`-Titelzeile, neun gleichnamige dauerhafte `public._dup_*`-Tabellen bleiben unversehrt, gültige Kette mit 70 Ebenen wird vollständig kopiert, Zyklus über 70 Ebenen wird erkannt, belegte Route bei anderem Zielschlüssel wird gemeldet.
- **Offene Restlücken (unverändert ehrlich):** kein positiver Nachweis an der laufenden Datenbank; keine echte Nebenläufigkeits-, Last- oder Wiederherstellungsprüfung; Änderungen, die **nach** dem Lese-Schnappschuss committet werden, sind nicht in der Kopie; `rpc_admin_duplicate_page` bleibt für `PUBLIC`/`anon`/`authenticated` ausführbar — der offene CMS-Schreibweg und `/admin` ohne Rollenprüfung bleiben ein **separates, unerledigtes Risiko**.


## 2026-09-14 — Etappe 3A: Seitenkopie als ENTWURF (NICHT ANGEWENDET)
- **Keine** Datenbankänderung: keine Migration angewendet, keine Live-Daten geschrieben, kein Deployment, kein Übersetzungslauf, keine Veröffentlichung. Nur dieses Projekt.
- **Gelesen** (führende Quellen): `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` (Abschnitt 11), `.lovable/always-follow.md`, `docs/current-status.md`; dazu die live installierte `rpc_admin_duplicate_page`, alle beteiligten Spalten/Constraints/Sequenzen, die realen Trigger (`cms_card_v1_seed_whitelist`, `cms_autopilot_trg_pages/assets/section_fields/nav`, `cms_set_updated_at`, `cms_validate_locale_column`, `cms_pages_validate_status`) und die Aufrufer `src/features/admin/api/cmsAdminPagesLifecycle.ts` / `src/features/admin/components/DuplicatePageDialog.tsx`.
- **Entwurf:** `docs/04-betrieb/sql-entwurf-seitenkopie-2026-09-14.md` — bewusst **nicht** in `supabase/migrations/`. Signatur und alle bisherigen Fehlerkennungen/Antwortfelder unverändert; neue Felder rein additiv, die Aufrufer bleiben kompatibel und wurden nicht geändert.
- **Behobene Befunde** (unabhängig in isoliertem PostgreSQL nachgewiesen): `parent_section_id` wurde NULL; `review_status`/`source_hash` fehlten (maschinelle Werte galten als geprüft); `viewport` fehlte (Mobil-/Tablet-Bilder wurden Desktop); ausgeblendete Bilder fehlten; `cms_page_translations` und `cms_asset_translations` fehlten; Prüfzustände (`page_title`, `asset_alt`) fehlten; die Whitelist-Einfügung kollidierte mit dem Karten-Seed-Trigger (`SQLSTATE 23505`).
- **Verhalten:** Zielseite immer inaktiver Entwurf, Quelle unberührt; neue IDs/Nummern; Elternbeziehungen innerhalb der Kopie neu verknüpft; ungültiger Fremdverweis (`section_parent_foreign`) und Zyklus (`section_parent_cycle`) brechen **vor** jedem Schreiben ab; Whitelist exakt inkl. deaktivierter Zeilen und ohne zusätzliche Freigaben; Medienreferenzen bleiben Referenzen (keine Datei wird kopiert oder geladen); Navigationsknoten wie bisher inaktiv/nicht öffentlich, Beschriftungen aus den Seitentiteln, weitere Sprachen nur aus echten Titelübersetzungen — **niemals** stillschweigend deutscher Text.
- **Atomarität/Sperren:** eine Transaktion; `pg_advisory_xact_lock` nur auf den Zielschlüssel (Schutz gegen Doppelklick), kein Tabellenlock, kein Warten auf Übersetzungsaufträge; `lock_timeout`/`statement_timeout` transaktionslokal.
- **Keine Übersetzungsläufe:** transaktionslokale Kennung `cms.suppress_page_copy_autopilot`, geprüft in den vier Autopilot-Triggern und im Karten-Seed-Trigger. Außerhalb der Kopie unverändertes Verhalten; Autopilot nicht global pausiert, kein Trigger deaktiviert, keine Aufträge gelöscht. Die in Etappe 2B installierte Unterdrückung des Bedienungstext-Katalogs ist unangetastet.
- **Nachweis:** `src/test/pageCopySql.pglite.test.ts` — 20 **tatsächlich ausgeführte** Prüfungen in einer isolierten Testdatenbank (PGlite, künstliche Daten) mit den realen Tabellenbedingungen und dem echten Karten-Whitelist-Trigger: Quellbestand unverändert, neue IDs, vollständige Zuordnung, keine Autopilot-Aufträge, normales Triggerverhalten nach der Kopie, Zielkonflikt, belegter Pfad, Fremdverweis, Zyklus und vollständige Rücknahme bei einem Fehler mitten im Kopieren. Keine Substring-Prüfungen als Verhaltensnachweis.
- **Offene Restlücken (ehrlich):** kein positiver Nachweis an der laufenden Datenbank; keine Wiederherstellungs- oder Produktions-Concurrency-Prüfung; der Lese-Schnappschuss verkürzt das Fenster für gleichzeitige Marketing-Änderungen, schließt es unter `READ COMMITTED` aber nicht; `rpc_admin_duplicate_page` bleibt für `PUBLIC`/`anon`/`authenticated` ausführbar — der offene CMS-Schreibweg und `/admin` ohne Rollenprüfung bleiben ein **separates, unerledigtes Risiko** und werden hier nicht abgesichert. Einzelbaustein-Einfügen (`rpc_admin_paste_section`) ist unverändert und eine eigene Etappe.
- **Rücknahme:** Entwurfsdatei, Testdatei und die zwei Dokumente auf den Vorstand zurücksetzen. Keine Datenrücknahme nötig, da nichts angewendet wurde.



## 2026-09-14 — Etappe 2B: einmaliger additiver Katalogimport AUSGEFÜHRT
- **Verwaltungsweg (tatsächlich genutzt):** der bereits geprüfte Aufrufweg `node scripts/i18n/ui-catalog-sync.mjs` → geschützter Serverdienst `cms-translation-run` (`sync_ui_catalog`) → installierte Funktion `rpc_admin_sync_ui_strings` (Migration `supabase/migrations/20260914232231_de6124a1-2be1-404b-ab18-da0e57fe7232.sql`). Das serverseitige Freigabewort `CMS_TRANSLATION_GLOBAL_TOKEN` war in der Ausführungsumgebung gesetzt und wurde ausschließlich aus der Prozessumgebung gelesen — **nicht ausgegeben, nicht neu angelegt, nicht verändert**. Kein neuer öffentlicher Zugang, keine Rechteöffnung, kein manuelles Upsert, kein Nachbau alter SQL.
- **Vorschau vor dem Schreiben** (Manifest `m76089c5e-422`, 422 Einträge): `missing_sources` 8, `seed_candidates` 26 (EN 8, PL 8, NL 10), `source_conflicts` 0, `skipped_inactive_*` 0, `review_state_conflicts` 0 — deckungsgleich mit der unabhängigen Vorprüfung, deshalb angewendet.
- **Importantwort:** `success true`, `applied true`, `dry_run false`, `inserted_strings` 8, `inserted_translations` 26, `inserted_review_states` 26, `protocol_version` 2, `trigger_suppression_supported true`, `own_import_autopilot_suppressed true`.
- **Zählungen nachher:** 422 Katalogschlüssel (vorher 414), 1672 Übersetzungen (vorher 1646), 1672 Prüfzustände `ui_string` (vorher 1646). Genau 8 Zeilen tragen `manifest_version = 'm76089c5e-422'`; die 26 neuen Zustände sind `maschinell` (**keine** Freigabe); Anzahl `geprueft` unverändert 583; keine inaktive Quelle; **0** neue Übersetzungsaufträge durch den Import.
- **Kontroll-Vorschau danach:** `missing_sources` 0, `seed_candidates` 0, `missing_translations` {} — der Abgleich ist idempotent, ein zweiter Schreibaufruf ist nicht nötig und wurde nicht gemacht.
- **Nachweisgrenzen (ehrlich):** DA hat für die neuen Schlüssel keinen Startwert und bleibt **offen**; die 26 eingefügten Startwerte sind unkuratiert maschinell und **nicht** freigegeben. Es wurde kein Übersetzungslauf gestartet, keine Preview-/Sichtprüfung der Bedienungstexte auf der Website durchgeführt und nichts veröffentlicht. Aussagen über Aufträge **außerhalb** dieser Transaktion werden nicht getroffen.
- **Nicht angefasst:** andere Inhalte, Funktionen, Policies, Zeitpläne, Produktbasis; keine künstlichen Testdaten; kein Frontend-Publish.
- **Rücknahme:** die 8 Quellzeilen mit `manifest_version = 'm76089c5e-422'` samt ihrer 26 Startwerte und 26 maschinellen Zustände wären gezielt entfernbar; bestehende 414 Quellen, 1646 Übersetzungen und 1646 Zustände wurden nicht berührt.


## 2026-09-14 — Etappe 2B: Vertrag ANGEWENDET, Katalogimport weiter OFFEN
- **Angewendet** (begrenzte Freigabe): Migration `supabase/migrations/20260914232231_de6124a1-2be1-404b-ab18-da0e57fe7232.sql` übernimmt den geprüften SQL-Block aus `docs/04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md` unverändert — `cms_autopilot_trg_ui_strings`, `rpc_admin_ui_catalog_sync_capabilities`, `rpc_admin_sync_ui_strings` samt `REVOKE`/`GRANT` nur für `service_role`. Keine Tabellen-, Policy-, Scheduler- oder Datenänderung.
- **Bereitgestellt:** nur der bereits geprüfte Serverdienst `cms-translation-run` (geschützte Aktion `ui_catalog_sync_capabilities`, Weitergabe von `dry_run`). Kein Frontend-Publish, keine weitere Edge Function, keine Schlüsseländerung.
- **Kein Import:** kein Abgleich aufgerufen — auch **keine** Vorschau, kein `--apply`, keine Testdaten auf der laufenden Datenbank. Zählungen vor **und** nach der Anwendung identisch: 414 Katalogschlüssel, 1646 Übersetzungen, 1646 Prüfzustände (`area = 'ui_string'`).
- **Lesende Nachweise:** Funktionsdefinitionen und `proconfig` wie im Entwurf (fester `search_path`, `statement_timeout` 120 s, `lock_timeout` 5 s); Ausführungsrecht ausschließlich `postgres` und `service_role` (kein PUBLIC, kein `anon`, kein `authenticated`); Trigger-Vertrag vorhanden (`cms.suppress_ui_string_autopilot`); Auskunft liefert Protokollstand 2 und `writes = insert_only`.
- **Grenze (ehrlich benannt):** ein autorisierter positiver Aufruf der geschützten Auskunft war hier nicht möglich, weil das serverseitige Geheimnis im Prüfkontext nicht verwendet wird und nicht ausgegeben werden darf. Geprüft wurde deshalb nur die Sperre: ohne und mit falschem Freigabewort antwortet der Dienst mit HTTP 403; die Ausführung der Auskunft ist für die normale Datenbankrolle mit `42501` gesperrt. Der Inhalt der Auskunft ist über die installierte Funktionsdefinition belegt.
- **Offen:** Katalogimport (Datenbank weiterhin 414, die 8 neuen Schlüssel fehlen dort), Quellenkonflikte, Sprachen ohne Startwert (u. a. DA), `/admin` und `rpc_admin_*` ohne Rollenprüfung. Bestehende Sicherheitsbefunde des Linters (SECURITY-DEFINER-Funktionen mit offener Ausführung, Tabellen mit RLS ohne Policy) sind **Altbestand** und wurden durch diese Migration weder verursacht noch behoben.
- **Rücknahme:** die drei Funktionskörper aus der vorangehenden Migration `20260912081425_9fd0b0e7` bzw. `20260912081541_52a83832` wiederherstellen und dabei die `service_role`-only-Rechte ausdrücklich mitsetzen. Keine Datenrücknahme nötig, da keine Zeile geändert wurde.


## 2026-09-14 — Etappe 2B, Abschlusskorrekturen (SQL weiter NICHT ANGEWENDET)
- **Keine** Datenbankänderung: keine Migration, kein Abgleich aufgerufen, kein Deployment, kein Import, kein Übersetzungslauf, keine Veröffentlichung. Laufende Datenbank unverändert (414 Katalogschlüssel).
- Aufrufskript: die Modusprüfung verlangt jetzt ausdrücklich `applied === !dry_run` — fehlende oder `null`-Angaben gelten als unklarer Zustand (Exitcode 1). Beim Anwenden wird die transaktionslokale Unterdrückung **vor** der Erfolgsmeldung geprüft, damit nicht erst „kein Übersetzungslauf" behauptet und danach widersprochen wird.
- SQL-**Entwurf**: der verwaiste Prüfzustand wird auch bei noch fehlender Quellzeile klassifiziert. Vorschau und Anwendung stimmen damit überein (vorher meldete die Vorschau einen Startwert-Kandidaten, den die Anwendung übersprang).
- Nachweisgrenze: ausgeführt sind die isolierte Testdatenbank (PGlite, nur künstliche Daten) und echte Kindprozessläufe des Skripts, dazu `npm run cms:preflight`. Die unabhängigen Gegenprüfungen wurden von **Codex** ausgeführt (keine persönliche Zuschreibung). Ein positiver Nachweis auf der laufenden Datenbank fehlt weiterhin; Entwurf und Live-Stand bleiben getrennt.
- **Rücknahme:** `scripts/i18n/ui-catalog-sync.mjs`, `src/test/uiCatalogSyncCli.test.ts`, `src/test/uiCatalogSyncSql.pglite.test.ts`, den Entwurf und die zwei Dokumente auf den Stand `529f3d4d` zurücksetzen. Keine Datenrücknahme nötig, da nichts angewendet wurde.


## 2026-09-14 — Etappe 2B, Nachprüfung: Entwurf korrigiert (SQL weiter NICHT ANGEWENDET)
- **Keine** Datenbankänderung: keine Migration angewendet, kein Abgleich aufgerufen, kein Deployment, keine Scheduler-/Autopilot-Änderung, kein Übersetzungslauf, keine Veröffentlichung. Laufende Datenbank unverändert (414 Katalogschlüssel).
- Vorausgegangener unabhängiger Befund (Ausführung in isoliertem PostgreSQL): sechs Pflichtfeld-Prüfungen griffen nicht, weil `jsonb_typeof(...)` bei fehlendem Schlüssel NULL liefert. Korrigiert mit `IS DISTINCT FROM`; Version nur als Text gültig.
- Weitere Korrekturen im Entwurf: Vorschau zählt dieselben Startwert-Kandidaten wie die Anwendung (inkl. neuer Schlüssel); stillgelegte Katalogzeilen werden nicht ergänzt, sondern als übersprungen berichtet; verwaiste Prüfzustände blockieren den Import; betroffene Quellzeilen werden beim Anwenden kurz und in fester Reihenfolge gesperrt (kein Tabellenlock, keine Auftrags-/Inhaltstabellen); Startwert und Prüfzustand entstehen paarweise atomar; der globale Auftragszähler ist entfernt — berichtet wird nur der **eigene** Import als unterdrückt.
- Versionswechsel fail-closed: neue lesende Auskunft `rpc_admin_ui_catalog_sync_capabilities()` (Protokollstand 2) und geschützte Aktion `ui_catalog_sync_capabilities`. Das Aufrufskript prüft den Protokollstand **vor** dem Abgleich, lehnt unbekannte Schalter ab (auch mit `--apply`) und behauptet bei widersprüchlicher Antwort weder Erfolg noch „kein Schreiben". Kein Geheimnis wird ausgegeben.
- Nachweisgrenze: tatsächlich ausgeführt sind `src/test/uiCatalogSyncSql.pglite.test.ts` (19 Prüfungen, isolierte Testdatenbank, nur künstliche Daten) und `src/test/uiCatalogSyncCli.test.ts` (9 Prüfungen, echter Kindprozess). `npm run cms:preflight` vollständig grün. Ein positiver Nachweis auf der laufenden Datenbank fehlt und bleibt **offen**. Rücknahme: Entwurfsdatei und Testdateien entfernen, `supabase/functions/cms-translation-run/index.ts` und `scripts/i18n/ui-catalog-sync.mjs` auf die Vorfassung zurücksetzen (nichts wurde deployed); Rücknahme des SQL-Vertrags entfällt, da nie angewendet.



## 2026-09-14 — Etappe 2B: additiver Katalogabgleich vorbereitet (SQL NICHT ANGEWENDET)
- **Keine** Datenbankänderung: keine Migration angewendet, kein Katalogabgleich aufgerufen, kein Edge-Deployment, keine Scheduler-/Autopilot-Änderung, kein Übersetzungslauf, keine Veröffentlichung, keine Datensatzänderung. Die laufende Datenbank bleibt bei 414 Katalogschlüsseln.
- Neuer SQL-**Entwurf** `docs/04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md` (bewusst **nicht** in `supabase/migrations/`): `rpc_admin_sync_ui_strings(p_manifest jsonb)` behält die Signatur, arbeitet standardmäßig nur lesend (`dry_run` = true), prüft Manifest, Version, Einträge (nicht leer, max 20000), eindeutige Schlüssel, nichtleere deutsche Texte und Startwerte gültiger aktiver Zielsprachen und **bricht vor jeder Änderung ab** statt still zu filtern. Anwendung fügt ausschließlich fehlende Katalogschlüssel und fehlende Startwert-Zeilen ein (`ON CONFLICT DO NOTHING`); deutsche Quelltexte, `is_active`, bestehende Zieltexte (auch bewusst leere) und bestehende Prüfzustände bleiben unverändert. Neue Startwerte erhalten **keine** Freigabe (`maschinell` mit passendem Fingerabdruck, nur für tatsächlich neu eingefügte Zeilen). Quellenkonflikte werden nur berichtet, ohne Startwerte einzufügen.
- Übersetzungsaufträge im Import unterdrückt, **eng begrenzt**: `set_config('cms.suppress_ui_string_autopilot', 'on', true)` gilt nur innerhalb dieser Transaktion, der Trigger `cms_autopilot_trg_ui_strings` prüft diese Kennung und verhält sich sonst exakt wie bisher; anschließend wird die vorige Einstellung wiederhergestellt. Autopilot wird **nicht** global pausiert, kein Trigger deaktiviert, keine Rechte geöffnet. Rechte, fester `search_path`, `lock_timeout` 5 s und `statement_timeout` 120 s bleiben bzw. sind gesetzt; Execute weiterhin nur `service_role`.
- Aufrufweg: Serverdienst `cms-translation-run` (`sync_ui_catalog`) reicht `dry_run` durch, lehnt Nichtboolean ab und meldet `run_started` nur dann falsch, wenn die Datenbank tatsächlich 0 neue Aufträge nachgezählt hat. `scripts/i18n/ui-catalog-sync.mjs` zeigt ohne `--apply` nur die Vorschau; Geheimnis unverändert aus der Prozessumgebung, kein Browser-/VITE-Weg, kein offener RPC. **Kein automatischer Deploy.**
- Tests: `src/test/uiStringCatalog.test.ts` erweitert (29 grün) — Vorschau als Standard, Ablehnung ungültiger `dry_run`-Angaben, kein `UPDATE`/`DELETE`/`is_active` im Entwurf, keine Freigabe für neue Startwerte, transaktionslokale Unterdrückung, Rechte/Suchpfad/Wartezeiten; der bestehende Migrations-Test ist ausdrücklich als **historische Semantik** gekennzeichnet und nicht abgeschwächt. Neue transaktionale Datei `supabase/tests/rpc_admin_sync_ui_strings_additiv.sql` (läuft in `BEGIN … ROLLBACK`) für die spätere Ausführung.
- **Nachweisgrenze (ehrlich):** die neuen Prüfungen sind **statisch** (Wortlaut von Entwurf, Serverdienst, Skript). Es gibt **keinen** positiven Datenbanknachweis; Struktur-, DB- und Preview-Abnahme bleiben offen und getrennt verpflichtend. Verbleibende Risiken: bestehende Quellenkonflikte bleiben ungelöst (Entscheidung Code oder Datenbank führend offen), neue Schlüssel erhalten vorhandene Startwerte (EN/PL/NL) unkuratiert und ohne Freigabe, Sprachen ohne Startwert (u. a. DA) bleiben offen, `/admin` und die `rpc_admin_*`-Wege haben weiterhin keine Rollenprüfung.
- **Rücknahme:** Entwurf und SQL-Testdatei löschen; `supabase/functions/cms-translation-run/index.ts`, `scripts/i18n/ui-catalog-sync.mjs`, `src/test/uiStringCatalog.test.ts` und die zwei Dokumente auf den Stand `bf15e8a9` zurücksetzen. Da nichts angewendet wurde, ist keine Datenrücknahme nötig.



## 2026-09-14 — Etappe 2A: Code-Manifest des UI-Katalogs abgeglichen (nur Code/Doku)
- **Keine** Datenbankänderung: keine SQL-Mutation, keine Migration, kein Edge-Deployment, keine Scheduler-/Autopilot-Änderung, kein Übersetzungslauf, keine Veröffentlichung. Es wird **keine** DB-Reparatur behauptet.
- `scripts/i18n/ui-catalog.manifest.json` mit dem bestehenden Generator erneuert: **422 statt 414 Einträge**. Neu sind genau 8 Schlüssel (`common:actions.close`, `common:language.nl`, `navigation:breadcrumb.segments.merkliste`, `service:katalog.pdp.documents.categories.{bedienungsanleitung,datenblatt,montageanleitung,produktinfo,schaltplan}`). Keine entfernten Schlüssel, keine geänderten deutschen Quelltexte, keine ersetzten EN/PL-Startwerte; 171 bestehende Einträge erhalten zusätzlich einen NL-Startwert (mit den neuen: 179 NL). Die i18n-Quelldateien wurden **nicht** angefasst.
- `scripts/i18n/ui-catalog-manifest.mjs`: falscher Hinweis `npm run i18n:ui-manifest` → tatsächliches Skript `npm run i18n:ui-catalog`; Startwert-Kommentar nicht mehr auf EN/PL begrenzt (Startsprachen kommen aus `seedLocales` der Konfiguration, aktuell EN/PL/NL); `--check` vergleicht CRLF wie LF, Inhalt und Form bleiben streng.
- `src/test/uiStringCatalog.test.ts`: neuer Test vergleicht `buildManifest()` direkt gegen die gespeicherte Datei (Version, Zählungen, Schlüsselreihenfolge, deutsche Texte, Startwerte). Kein bestehender Test abgeschwächt, keine Datenbankabfrage.
- **Datenbank weiterhin 414 — diese 8 Einträge fehlen dort und bleiben offen.** Offener Vertragsbefund: `rpc_admin_sync_ui_strings` vergibt einen fehlenden Prüfstatus pauschal als „geprüft" und kann über `cms_autopilot_enqueue_unit` neue Jobs erzeugen (live `is_enabled=true`, `is_paused=false`). Deshalb wurde die Synchronisierung bewusst **nicht** aufgerufen. Bestehende Sprachwerte sind geschützt.
- **Nachweisgrenze:** nur die lokale Prüfung `npm run cms:preflight` (echte Exitcodes im Bericht). Grüner Code-Stand ist **keine** Gesamtfreigabe; Struktur-, DB- und Preview-Abnahme bleiben getrennt verpflichtend. Kein neues Regelwerk.
- **Rücknahme:** `scripts/i18n/ui-catalog.manifest.json`, `scripts/i18n/ui-catalog-manifest.mjs`, `src/test/uiStringCatalog.test.ts` und die beiden Dokumente auf den Stand `c2ccf59c` zurücksetzen; da nichts in die Datenbank geschrieben wurde, ist keine Datenrücknahme nötig.


## 2026-09-14 — Nachtrag Etappe 1: eindeutiger Doku-Einstieg (nur Dokumentation)
- **Keine** Inhalts-, Code-, Datenbank-, Auth-, Layout- oder Veröffentlichungsänderung; keine Migration, keine Tests mit Datenbankzugriff, keine Folgeaufträge.
- Fünf Anleitungen vollständig als Historie gesichert: `03-redaktion/kurzanleitung.md`, `redaktionshandbuch.md`, `checkliste-redaktion.md`, `qa-nach-redaktionsrunde.md` und `docs/mitarbeiter-fahrplan.md` → `docs/archiv/redaktion-historisch/<name>-bis-2026-09-14.md` (Kopf mit Ursprung, Stand, Archivdatum, Nachfolger; relative Verweise auf Archivtiefe umgestellt, Inhalte sonst unverändert, nichts gelöscht).
- Die vier aktiven `03-redaktion`-Pfade sind jetzt **kurze rollenspezifische Wegweiser** auf das Dachdokument (Abschnitt 2 Prompt-Schablone, Abschnitt 11 Arbeitsablauf, 11.6 Abschlussnachweise). Historische Detailbeschreibungen sind vor Nutzung gegen den tatsächlichen CMS-Stand zu prüfen.
- `mitarbeiter-fahrplan.md` überarbeitet: keine „sechs CMS-Tabellen"-Behauptung, keine garantierte Spiegelung (Spiegelregel jetzt ausdrücklich Sollregel), Orientierung rein lesend, Übungsänderungen nur auf ausdrücklichen Auftrag.
- `docs/README.md`: genau **ein** führender Arbeitseinstieg (Dachdokument); getrennte Gruppen für Status, technische Verträge, datierte Auditbelege und Archiv. `batch25-cms-abschluss-freeze.md` ausdrücklich als historische Referenz, nicht als führende Regel. `01-strategie/` und `02-architektur/` bleiben aktiv und werden nicht als heute vollständig geprüft dargestellt. „Spiegelregel" und „alles in der DB" stehen als Sollregel mit noch zu prüfender Umsetzung.
- Dachdokument: Aussage „Lovable liest die Pflicht-Dokumente automatisch" korrigiert — das Lesen ist **angewiesen, nicht technisch garantiert**. Im Startblock der Schablone und knapp in 11.1 ergänzt: vor dem ersten Schreibzugriff gelesene Quellen, Ziel-ID/Feld/Sprache und Schreibweg benennen; ungeklärte Zuordnung stoppt nur den betroffenen Schreibschritt, keine Hardcode-Ersatzlösung.
- `docs/ai-start-prompt.md`: DB/CMS/UI-Katalog als **Zielarchitektur** gekennzeichnet, noch nicht überall vollständig angebunden; `current-status.md` ist maßgeblich.
- `docs/archiv/README.md` um die fünf neuen Archiveinträge erweitert.
- **Nachweisgrenze (ehrlich):** geprüft wurden nur die relativen lokalen Markdown-Ziele der geänderten Dateien und der Diff-Pfade. **Keine** Datenbank-Rücklesung, keine CMS-Bearbeitbarkeits- oder Preview-Prüfung, kein Build, keine neue Messung — reiner Doku-Nachtrag. Bestehende offene Befunde (kein Gesamtgrün, UI-Katalog-Manifest-Drift 414/422, `/admin` ohne Login) bleiben offen.
- **Rücknahme:** Wegweiser-Dateien aus den Archivkopien wiederherstellen; alle Änderungen betreffen ausschließlich Markdown unter `docs/`.


## 2026-09-14 — Übernahme eines vom Nutzer geprüften Patches (nur Prüfmechanik)
- **Keine** redaktionelle Inhaltsänderung, keine Datenbankänderung, keine Veröffentlichung.
- `scripts/ci/preflight.mjs`: Windows-Shell nur noch für `npm`/`npx` (sonst brach ein Node-Pfad mit Leerzeichen); Umgebungs-Schalter `PREFLIGHT_STEPS_JSON` vollständig entfernt — eine leere Prüfliste hätte sonst grün gewirkt.
- `src/test/preflight.test.ts`: Prozess-Tests laufen über separate Testtreiber, die `runPreflight` importieren; neuer Test sichert, dass es keinen Umgehungs-Schalter mehr gibt.
- Nachweis: 17 Tests der Abschlussprüfung grün (inkl. Pfade mit `#`, `%`, Leerzeichen). Gesamtlauf prüft der Nutzer selbst.

## 2026-09-14 — Etappe 1 (Restkorrekturen): Regelwerk widerspruchsfrei, keine Inhaltsänderung
- **Keine** redaktionelle Inhaltsänderung, keine Datenbankänderung, keine Veröffentlichung. Nur Doku und lokale Prüfmechanik.
- `.lovable/always-follow.md` auf technische Schutzregeln gekürzt: Freeze-/„alle Gates 0"-Aussagen entfernt (Historie, kein Ist-Zustand), „Code führend für UI-Texte" ersetzt durch Katalog `cms_ui_strings`, die frühere automatische DE→EN-Pflicht (alter Abschnitt 12) entfällt und verweist jetzt auf Dachdokument 11.3. Frühere Fassung archiviert.
- Dachdokument: Abschnitte 1–10 mit Abschnitt 11 harmonisiert — Vorrangregel im Kopf, Sprachangabe im Prompt ohne automatische Zweitsprachenpflicht, Abschlussblock verweist auf die drei Nachweise aus 11.6. Frühere Fassung archiviert.
- `docs/lovable-custom-rules.md` und `docs/ai-start-prompt.md` waren veraltete konkurrierende Regelversionen → eng begrenzt archiviert, aktive Pfade sind jetzt Kurzverweise auf das Dachdokument.
- `docs/lovable-custom-rules-compact.md`: Bedien-Texte in i18n-Ressourcen sind ausdrücklich nur dokumentierter Übergang/Notfall, keine zweite gepflegte Inhaltswahrheit.
- Dachdokument 11.5: Formulierung präzisiert — einzelne `rpc_admin_*`-Aufrufe haben weiterhin ihre eigene Datenbank-Transaktion; es fehlt die Klammer über **mehrere** RPC-Aufrufe und eine Versionsabsicherung.
- **Offener Befund (nicht repariert):** UI-Katalog-Manifest ist abgedriftet — 414 gespeicherte gegenüber 422 aktuell generierten Einträgen (kein Zeilenendenproblem). Kein Sync, keine Datenbankänderung in dieser Etappe.

## 2026-09-08 — P-062 Mehrfamilienhaus: siebte Karte in `produkte_aussen`
- Seite `anwendungen.mehrfamilienhaus` (P-062), Container B-3221 `produkte_aussen` (`cards_v1`, bleibt unsichtbar, `section_bg = muted`, `card_aspect = 4-3`).
- **Neu:** B-3259 `produkte_aussen__pespro` (`card_v1`), Textfelder DE+EN mit `TEXT OFFEN`, `link_1_enabled = 0`, `image_enabled = 1`, grauer 4:3-Platzhalter mit Alt-Text `BILDAUFTRAG offen` (DE+EN), 78 Freigabezeilen wie bei den Schwesterkarten.
- Reihenfolge der sieben Kindkarten neu gesetzt: B-3235 `argos`, B-3259 `pespro`, B-3239 `entry`, B-3240 `tableau`, B-3236 `pes`, B-3237 `ave`, B-3238 `avu`.
- Alles DB-first; kein Code, keine i18n, kein neuer Section-Typ. Wahrheits-Check CI grün.

## 2026-09-08 — P-062 Mehrfamilienhaus: vollständiges Blockgerüst (nur Gerüst, Platzhalter)
- Seite `anwendungen.mehrfamilienhaus` (P-062, `/anwendungen/mehrfamilienhaus`). Struktur wie P-061: 18 Top-Level-Blöcke in `sort_order` 0–170. `hero` (B-1423) von 10 auf 0.
- **Neu, zunächst inaktiv:** B-3219 `uebersicht`, B-3220 `aussenstation`, B-3221 `produkte_aussen`, B-3222 `innenstation`, B-3223 `produkte_innen`, B-3224 `pakete`, B-3225 `mobil`, B-3226 `briefkasten`, B-3227 `produkte_briefkasten`, B-3228 `zutritt`, B-3229 `produkte_zutritt` (bestehende Typen `cards_v1` / `teaser_2col_v1`).
- **Neue Karten (aktiv, aber im inaktiven Container also nicht öffentlich):** B-3230–B-3234 (`uebersicht__*`, Links auf Sprungmarken `#aussenstation`, `#innenstation`, `#mobil`, `#briefkasten`, `#zutritt`), B-3235–B-3240 (`produkte_aussen__*`), B-3241–B-3244 (`produkte_innen__*`), B-3245–B-3248 (`pakete__*`), B-3249–B-3252 (`produkte_briefkasten__*`), B-3253–B-3256 (`produkte_zutritt__*`), B-3257 `verwandte_sanierung` (Link `/anwendungen/sanierung`), B-3258 `verwandte_namensverwaltung` (Link `/anwendungen/digitale-namensverwaltung`).
- Alle Textfelder DE+EN mit `TEXT OFFEN`, alle Bild-Slots mit dem grauen 4:3-Platzhalter und Alt-Text `BILDAUFTRAG offen` (auch die fünf Wechselteaser sowie neu am vorhandenen Hero-Bild).
- Technische Felder gemäß Auftrag: Teaser `background_variant` `black-5` / `default`, Galerien `section_bg` `muted` bzw. leer, `card_aspect = 4-3`.
- **Ausgeblendet, nicht gelöscht:** B-269 `anforderungen` mit B-2139–B-2143, B-271 `systembausteine`, B-3060 `verwandte_pflege`, B-3061 `verwandte_wohnheim` (letztere aus dem Container gelöst).
- **Bestehende, bisher inaktive Container eingeordnet:** B-2953 `werkzeuge` (sort 150, Karten B-3005–B-3008) und B-2954 `verwandte_anwendungen` (sort 160, Karten B-3058, B-3059, B-3257, B-3258). Beide bleiben inaktiv, bis die Redaktion sie sichtbar schaltet.
- `leistungen` (B-270): neue Gruppen `verkabelung.*`, `anlagengroesse.*`, `namenspflege.*` (je `title` + `items.0-2`, DE+EN, `TEXT OFFEN`) sowie Steuerfelder `groups_order` und `space_top`. Alte Gruppen `kommunikation.*`, `skalierung.*`, `verwaltung.*` bleiben als Altfelder erhalten, sind in der Redaktionsfreigabe gesperrt (24 Zeilen).
- Alle neuen Felder in `cms_admin_editable_fields` freigegeben (DE+EN), 0 Felder ohne Freigabe.
- Alles DB-first; kein Code, keine i18n, kein neuer Seiten-/Section-Typ. Navigation, Route und Breadcrumb unverändert. Wahrheits-Check CI grün.
- **Erhebung (ohne Änderung):** `werkzeuge` und `verwandte_anwendungen` fehlten nicht — sie existierten auf P-062 als inaktive Container mit aktiven Kindkarten. Dasselbe Muster auf 15 weiteren Anwendungsseiten (u. a. `behoerde`, `klinik`, `pflege`, `sanierung`, `grossanlage`, `schwimmbad`, `zutrittskontrolle-bcm`). Empfehlung: in einem eigenen Auftrag seitenübergreifend prüfen und die Container dort sichtbar schalten, wo die Kartenblöcke redaktionell fertig sind.



## 2026-09-07 — P-061 Einfamilienhaus: neuer Kartenblock `pakete` (TCS:PACKS)
- Seite `anwendungen.einfamilienhaus` (P-061): neuer Kartenblock **B-3214 `pakete`** (`cards_v1`) direkt hinter B-3170 `produkte_innen` und vor B-3155 `briefkasten` (`sort_order = 45`, Zielreihenfolge wie beauftragt, keine weitere Umsortierung nötig).
- Container-Texte DE+EN: `label` „TCS:PACKS", `title` „Installieren, einschalten, fertig" / „Install, switch on, done", `intro` gemäß Vorlage. Technische Felder: `section_bg = muted`, `card_aspect = 4-3`.
- Vier Kindkarten (`card_v1`), ohne Eyebrow: **B-3215 `pakete__audio`**, **B-3216 `pakete__video_neubau`**, **B-3217 `pakete__video_bestand`**, **B-3218 `pakete__garantie`** — `title` und `description` in DE+EN gemäß Vorlage. Nur B-3218 mit Link: DE „Zur Registrierung" / EN „Register the system" auf `https://garantie.tcsapps.de` (extern, Schalter an, HTTP 200 geprüft). Karten 1–3 ohne Link (`link_1_enabled = 0`).
- Bilder: alle vier Karten mit dem neutralen grauen 4:3-Platzhalter (`platzhalter-grau-4-3.png`) im Slot `image` belegt, Alt-Text DE+EN „BILDAUFTRAG offen".
- Freigaben `cms_admin_editable_fields`: 10 Zeilen für den Container (`label`, `title`, `intro`, `section_bg`, `card_aspect`) und 320 Zeilen für die vier Karten (gleicher Feldsatz wie die Galerien vom 05.09.), DE+EN.
- Alles DB-first über CMS-Light-Tabellen; kein Code, keine i18n, kein neuer Seiten-/Section-Typ, kein Vertrag geändert. Navigation, Route und Breadcrumb unverändert.
- Verifiziert: Vorschau DE und EN zeigen den Block an der beauftragten Position, grauer Hintergrund, vier 4:3-Platzhalter, Garantie-Link. Wahrheits-Check CI grün.


## 2026-09-05 — P-061: Blockschlüssel `werkzeuge_downloads`, Altfelder an B-381, Vertragsangleichung
- **T2:** B-2983 auf P-061 (`anwendungen.einfamilienhaus`) von `werkzeuge_ausschreibungstexte` in `werkzeuge_downloads` umbenannt (`rpc_admin_rename_section_key`; 1 Section, 8 Feldwerte, 78 Freigaben mitgezogen). Inhalt unverändert: „Datenblätter und Montageanleitungen" / „Data sheets and installation instructions", Link DE+EN `/downloads`. Gleichnamige Karten auf 15 weiteren Anwendungsseiten wurden bewusst **nicht** angefasst (Auftrag nur P-061).
- **T3:** `src/features/cms/contract/sectionTypes.ts` — `role: "richtext"` auf `role: "text"` geändert bei `teaser_2col_v1.text`, `cta_v1.text`, `cards_v1.intro`, `product_scroller_v1.intro`, `feature_grid_v1.intro`, `card_v1.description`. Der Vertrag beschreibt damit, was die Renderer können. `richtext` bleibt bei `content_v1.text` und `rich_v1.body`. Kein Editor-Wechsel im Admin (die Rolle steuert dort nur Umschalter/Auswahlfelder), keine Inhaltsänderung.
- **T4a:** B-381 `content` auf P-061 — `description` und `intro` in DE+EN geleert und in `cms_admin_editable_fields` gesperrt. `text` unverändert (gerendertes Feld).
- **T4b (nur Erhebung, keine Änderung):** Bericht `docs/04-betrieb/audit-snapshot/t4b-content-v1-altfelder-2026-09-05.md` — 348 gefüllte, aber vom Standard-Renderer nicht gelesene Feldwerte an `content_v1`-Blöcken, mit Gruppierung und Empfehlung.
- Alles DB-first über `rpc_admin_*`; keine zweite Wahrheit in Code/i18n; keine neuen Seitentypen/Section-Typen; Navigation, Route, Breadcrumb unverändert.

## 2026-09-05 — Neues Layout-Feld `card_aspect` (Bildformat je Kartenblock)
- Additives technisches Feld `card_aspect` am Container, gültig für `cards_v1` und `product_scroller_v1`. Werte: `21-9`, `16-9`, `4-3`, leer. Leer = bisherige Ableitung aus der Reihengröße, Bestand bleibt unverändert. Gesetzt gilt der Wert für alle Karten des Containers.
- Vertrag: `src/features/cms/contract/sectionTypes.ts` (technische Felder beider Container-Typen). Renderer: `cardGrid.ts` (`cardAspectOverrideClass`), `CardsSectionV1.tsx`, `ProductScrollerV1.tsx`. Admin: sichtbar/bearbeitbar unter „Technik".
- Gesetzt: P-061 `produkte_tuer` (B-3169) = `4-3`, damit alle vier Produktgalerien dasselbe Bildformat liefern. Freigabe (`cms_admin_editable_fields`) für alle Kartenblöcke von P-061, Locale DE (sprachneutrales Technikfeld).
- Geprüft: Wahrheits-Check CI grün, Typprüfung grün, Vorschau P-061 zeigt in `produkte_tuer` und `produkte_innen` je 4:3.



## 2026-09-05 — P-061 Einfamilienhaus: vier Produktgalerien, Sammel-Scroller ausgeblendet
- Seite `anwendungen.einfamilienhaus` (P-061, `/anwendungen/einfamilienhaus`). Vier neue Kartenraster (`cards_v1`) mit 18 Karten (`card_v1`), jeweils direkt hinter dem passenden Wechselteaser: **B-3169 `produkte_tuer`** (6 Karten, `section_bg=muted`), **B-3170 `produkte_innen`** (4, `muted`), **B-3171 `produkte_briefkasten`** (4, weiß), **B-3172 `produkte_zutritt`** (4, `muted`). Karten B-3173–B-3186. Texte (`title`, `intro`, `eyebrow`, `description`) in DE+EN gemäß Redaktionsvorlage.
- Link nur an B-3178 `produkte_tuer__signage`: DE „Zu den Türklingeln" / EN „View the doorbells" auf `https://www.tcs-signage.de/tuerklingeln/` (extern, Schalter an). Alle übrigen 17 Karten ohne Link (`link_1_enabled=0`).
- Bilder: alle 18 Karten mit dem neutralen grauen 4:3-Platzhalter (`platzhalter-grau-4-3.png`) im Slot `image` belegt, Alt-Text DE+EN „BILDAUFTRAG offen" — offener Bildbedarf per Volltextsuche findbar.
- Reihenfolge der Top-Level-Blöcke neu gesetzt: hero, uebersicht, tuersprechanlage, produkte_tuer, produkte_innen, briefkasten, produkte_briefkasten, hausnummer, kamera, zutritt, produkte_zutritt, content, leistungen, faq, werkzeuge, verwandte_anwendungen, standard_cta.
- **B-268 `systembausteine`** (`product_scroller_v1`) samt seinen fünf Kindkarten ausgeblendet (nicht gelöscht). Weiterhin ausgeblendet: B-266 `anforderungen` (mit vier Karten), B-3041 `verwandte_kindertagesstaette`.
- Whitelist `cms_admin_editable_fields`: 1.472 Zeilen (DE+EN) für die vier Container (`label`, `title`, `intro`, `section_bg`) und die 18 Karten (Kartenfelder inkl. Icon, Bild, Bulletpoints, Chips, Links 1–3) freigeschaltet.
- Kein Code, keine i18n, kein Renderer, kein Section-Typ, kein Vertrag geändert. `section_bg` ist bei `cards_v1` bereits vertraglich vorhanden (globaler Schalter in `sectionTypes.ts`) — keine Vertragsergänzung nötig. Navigation, Route und Breadcrumb unverändert.
- Verifiziert im Preview: Reihenfolge wie beauftragt, Grau/Weiß-Wechsel wie vorgegeben, 18 Platzhalterbilder, Signage-Link vorhanden. Wahrheits-Check CI grün (FAQ/CTA-Inventar neu erzeugt).


## 2026-09-03 — B-3120 Vertrieb Deutschland: Porträtfotos der Ansprechpartner
- 14 Porträtfotos von tcsag.de/kontakt/vertrieb-in-deutschland in den Bucket `cms-assets` geladen und je Eintrag als Bild-Slot `vorteile.<n>.image` in `cms_assets` verknüpft (Einträge 1–11, 13–15; 12 und 16 haben kein Foto). Alt-Texte DE+EN mit Personennamen gesetzt.
- Whitelist `cms_admin_editable_fields`: `vorteile.1–16.image` (DE+EN) freigeschaltet — Fotos im Admin austauschbar.
- Technisch (nur Darstellung): `TabsV1.tsx` rendert je Eintrag ein optionales Bild links neben Name/Kontakt; `rendererSlotMap.ts` dokumentiert den dynamischen Slot. Skript: `scripts/sync/upload-vertrieb-de-portraits.mjs` (idempotent).
- Verifiziert im Preview `/kontakt`: 16 Einträge, 14 Fotos; Build OK, Wahrheits-Check OK.



## 2026-09-03 — N-046 / P-128 Kontakt: Kontaktdaten Vertrieb Deutschland in B-3120
- Register **B-3120** (`kontakt.root` / `vertrieb_register__vertrieb_de`) mit 16 Vertriebsgebieten (Nord Ost, Nord West, Süd) aus tcsag.de/kontakt/vertrieb-in-deutschland befüllt: `vorteile.1–16.headline` (Gebietsnummer + Bundesländer) und `.body` (Name, Mobil/Telefon, E-Mail), DE+EN; `description` als Einleitungssatz.
- Whitelist `cms_admin_editable_fields` um `vorteile.5–16.headline/body` (DE+EN) ergänzt — alle Angaben im Admin pflegbar.
- Technisch: in `TabsV1.tsx` erhält der Vorteils-Body `whitespace-pre-line`, damit Name/Telefon/E-Mail je Zeile stehen. Keine Inhalte im Code.
- Verifiziert im Preview `/kontakt`: 16 Einträge im Register „Vertrieb Deutschland“ im 2-Spalten-Raster.


## 2026-09-03 — N-046 / P-128 Kontakt: vier Subnav-Register (Vertrieb/Schulungszentren)
- Seite `kontakt.root` (P-128, `/kontakt`). Neuer Registerblock **`vertrieb_register`** (`tabs_v1`, `sort_order=50`) mit vier Registern (`tab_v1`): `vertrieb_register__vertrieb_de` (Vertrieb Deutschland / Sales Germany), `__vertrieb_at` (Vertrieb Österreich / Sales Austria), `__vertriebsleitung` (Vertriebsleitung / Sales management), `__schulungszentren` (Schulungszentren / Training centres) — DE+EN.
- Pflegbar je Register (Whitelist `cms_admin_editable_fields`, DE+EN): `tab_label`, `title`, `description`, `vorteile.1–4.headline/body`, Bild-Slot `image`. Kopf des Blocks: `label`, `title`, `intro`, `tablist_label`. Texte/Bilder werden von der Redaktion im Admin gefüllt (Beschreibungen aktuell leer).
- Zwei technische Ergänzungen im Baukasten (beauftragt, da sonst nicht sichtbar/bildfähig): (1) `KontaktPage.tsx` rendert jetzt zusätzlich alle frei angelegten Top-Level-Sections generisch über `renderPageSectionByType` (eigene Keys `hero`/`inline`/`sections`/`cards`/`form` bleiben Sonderrenderer). (2) `tab_v1` hat einen optionalen Bild-Slot `image` (Vertrag `sectionTypes.ts`, `rendererSlotMap.ts`, Ausgabe in `TabsV1.tsx` über dem Panel-Text).
- Unverändert: Hero, Kontaktkarten, Hotline-Text, Formular, Navigation, Assets, alle übrigen Seiten mit `tabs_v1`/`tab_v1` (Bild bleibt optional, ohne Bild identische Ausgabe).
- Verifiziert im Preview `/kontakt`: vier Reiter in der vorgegebenen Reihenfolge, Panel-Wechsel funktioniert. Wahrheits-Check CI grün (FAQ/CTA-Inventar neu erzeugt).



## 2026-09-03 — N-003 / N-025: Karten-Icons in „Vorteile"/„Benefits"-Rastern auf `check`
- Betroffen: alle `card_v1`-Karten in Kartenrastern mit Elternblock `vorteile` bzw. `benefits` auf allen Seiten unter **N-003** und **N-025** (Unterbaum über `cms_navigation_nodes` ermittelt).
- Feld `icon` von `shield-check` auf `check` gesetzt, DE+EN: 266 Feldwerte geändert (Endstand: 268 Werte = `check`, inkl. zwei bereits vorher korrekter Karten).
- Unverändert: Icon-Größe und -Spezifikation (`CARD_ICON_CLASS` = `h-6 w-6`, Strichstärke 1.75), Texte, Links, Reihenfolge, Sichtbarkeit, Assets, Navigation. Nicht angefasst: Icons in `anforderungen` und `useCases` (kein Vorteile-/Benefits-Raster).
- Reine DB-Änderung in `cms_section_fields` — kein Code, keine i18n, kein Renderer, kein Section-Typ geändert.
- Verifiziert im Preview (`/zutrittskontrolle/bcm-door-app`): nur `lucide-check`, kein `lucide-shield-check` mehr.



## 2026-09-02 — Briefkastenanlagen (P-006): siebte Karte in B-3087 mit Link auf Eingangssysteme
- Seite `gebaeudekommunikation.briefkastenanlagen` (P-006), Kartenraster **B-3087 `entry_funktionen`** (`cards_v1`). Kein Code, keine i18n, kein Renderer, kein Section-Typ, kein Vertrag geändert.
- Neue Karte (`card_v1`) **`entry_funktionen__eingangssysteme`** als siebtes und letztes Kind (`sort_order=15`, nach B-3114): `title` DE „Mehr als Briefkästen" / EN „More than mailboxes", `description` DE/EN (EN mit Schreibweise „Entrance systems"), `icon=layout-grid` (in Lucide auflösbar), `link_1_label` DE „Mehr erfahren" / EN „Learn more", `link_1_href=/eingangssysteme` (DE+EN), `link_1_enabled=1`. Kein `link_1_kind` — die Vorbildkarten B-3084/B-3085 setzen dieses Feld ebenfalls nicht (Standard = interner Seitenwechsel ohne neuen Tab).
- Whitelist `cms_admin_editable_fields`: 82 Zeilen (41 Feldschlüssel × DE/EN) analog B-3114 plus `link_1_*` analog B-3084 freigeschaltet.
- Unverändert: B-3088–B-3092, B-3114, Kopf von B-3087, Teasertext B-3079, alle übrigen Blöcke inkl. Hintergründe, Reihenfolge, Sichtbarkeit (B-3093, B-038, B-1702, B-1703 bleiben ausgeblendet). Keine Assets, keine Navigationsknoten betroffen.
- Verifiziert im Preview (DE+EN): B-3087 rendert sieben Karten (4+3), neue Karte unten rechts mit Icon-SVG, Text und einem internen Link auf `/eingangssysteme`. Wahrheits-Check CI grün.
- Nur gemeldet (nicht beauftragt): B-3085 `anschluss__digitale-briefkastenanlage` hat das englische Link-Label irrtümlich unter `link_2_label` statt `link_1_label`.


## 2026-09-02 — Briefkastenanlagen (P-006): drei Eigenschaftskarten in B-3094
- Seite `gebaeudekommunikation.briefkastenanlagen` (P-006), Kartenraster **B-3094 `sortiment_bilder`** (`cards_v1`). Kein Code, keine i18n, kein Renderer, kein Section-Typ, kein Vertrag geändert.
- Drei neue Karten (`card_v1`) als Kinder von B-3094 an Position 4–6 angelegt: **B-3115 `sortiment_bilder__bestellbar`** („Ohne Angebot bestellbar" / „Orderable without a quotation", Icon `package-check`), **B-3116 `sortiment_bilder__postnorm`** („Nach der Postnorm gefertigt" / „Made to the postal standard", Icon `mail-check`, wortgleich zu B-3114), **B-3117 `sortiment_bilder__entnahmesicherung`** („Gesichert gegen Postdiebstahl" / „Protected against mail theft", Icon `shield-check`). Texte DE+EN, kein Bild-Asset, `link_1_enabled=0`.
- Whitelist `cms_admin_editable_fields`: je Karte 82 Zeilen (41 Feldschlüssel × DE/EN) analog B-3114 freigeschaltet.
- Nachfolgende Blöcke der Seite um 3 in `sort_order` verschoben (reine Umnummerierung, Reihenfolge und Sichtbarkeit unverändert; `skalierbarkeit`, `smart__design`, `smart__beschriftung`, `entry_cta` bleiben ausgeblendet). B-3095/3096/3097, Kopf von B-3094, `section_bg=secondary`, B-3087 und B-3114 unverändert.
- Verifiziert im Preview (DE+EN): B-3094 rendert 6 Karten als 3+3 — obere Reihe drei Bildkarten, untere Reihe drei Icon-Karten (SVG, kein Bild). Wahrheits-Check CI grün.

## 2026-08-28 — Mobile Türkommunikation: N-133 / P-236 ist führend
- Führende Seite: **N-133 / P-236 `mobile-tk-preview.root`** unter `/gebaeudekommunikation/mobile-tuerkommunikation` (Renderpfad `CmsOnlyShell`, vollständig im /admin pflegbar). Inhalte unverändert.
- Zwilling stillgelegt: Seite **P-273 `anwendungen.mobile-tuerkommunikation`** ist jetzt `archived` und inaktiv; Navigationsknoten **N-097** ist ausgeblendet (`show_in_public_nav=false`, inaktiv). Nichts gelöscht — nur stillgelegt, jederzeit rückholbar.
- Code: hartcodierte Seite `MobileTuerkommunikationPage.tsx` entfernt. Die alte URL `/anwendungen/mobile-tuerkommunikation` bleibt als dauerhafte Weiterleitung auf die führende Seite erhalten (Bestandslinks brechen nicht).
- Interne Verweise auf die führende URL umgestellt: `src/navigation/routes.ts` (`anwendungen.mobileTuerkommunikation`), `SanierungPage.tsx`, `SnipdooIpPage.tsx`. Der Navigations-Unterstrich-Override für die alte URL in `MainNavigation.tsx` entfällt (Menüpunkt kommt jetzt allein aus N-133).
- Generierte Diagnose neu erzeugt: `rendererPathMap.generated.ts` (97 Seiten), `knownPageObjectContracts.ts`, `knownPageComponentReads.ts`, `docs/04-betrieb/faq-cta-toggle-inventar.md`.
- Verifiziert: Weiterleitung greift (alte URL → `/gebaeudekommunikation/mobile-tuerkommunikation`), Seite rendert (H1 „Türrufe erreichen Sie zu Hause, im Büro, unterwegs."), Build OK, Wahrheits-Check CI grün, Renderability-Gate ohne neue Befunde.
- Hinweis: B-Nummern der Seite existieren (B-1070 Subnav, B-1071 Hero, B-1072 Anwendungen, B-1073 Zielgruppen, B-1074 Komponenten, B-1075 FAQ, B-1076 CTA (inaktiv), B-1077 Barrierefreiheit, B-2334 Standard-CTA) — Prompt-Aufträge können die Seite darüber ansprechen.

## 2026-08-27 — Briefkastenanlagen (P-006): Standardprogramm als ein grauer Abschnitt
- Seite `gebaeudekommunikation.briefkastenanlagen` (P-006). Kein Code, keine i18n, kein Renderer, kein Section-Typ, kein Vertrag geändert.
- B-3080 `sortiment` (`teaser_2col_v1`): `background_variant` DE+EN von `muted` (= 10 % Schwarz) auf `black-5` (= `bg-black/5`).
- B-3094 `sortiment_bilder` (`cards_v1`): Feld `section_bg` in `cms_admin_editable_fields` für DE+EN freigeschaltet (nur diese Seite/dieser Block, idempotente Migration) und auf `secondary` gesetzt — das Feld wird von `CardsSectionV1.tsx` bereits gelesen (Batch 22).
- B-3094 `label`: DE bleibt „Standardprogramm im Katalog" (stand bereits so in der DB), EN von „tandard mailbox systems in the catalog" (Tippfehler) auf „Standard range in the catalog". `title` unverändert.
- Karten B-3095/B-3096/B-3097 und alle übrigen Blöcke, Reihenfolgen und Sichtbarkeiten unverändert. Service-Hub (`service.hub`) als Stichprobe geprüft: unverändert.
- Wahrheits-Check CI grün, Build OK, Preview in DE und EN geprüft.
- Restpunkt (nicht beauftragt, nur gemeldet): winziger Tonunterschied an der Naht (`bg-black/5` = rgb(242,242,242) vs. `bg-secondary` = rgb(245,245,245)); Admin-Hilfetext zu `background_variant` nennt weiterhin nur `default`/`muted`.



## 2026-08-26 — Batch 68: `/downloads` finalisiert (Kapitel überall, Vorschau-Panel)
- Seite `service.downloads`, Section `dokumente` (Download-Center). Keine Route-, Navigations- oder Renderer-Architektur geändert. Optionale Blöcke (`quickLinks`, `faq`, `rma`, `bestellung`, `akademie`, `glossar`, `ansprechpartner`) waren bereits `is_active=false` — bewusst nicht angefasst, keine Bereinigung.
- Kapitelgruppierung gilt jetzt in **allen** Ansichten (Zielgruppe, Unterlagentyp, Suche, kombinierte Filter), nicht nur im Archiv. Reihenfolge der Contract-Quellen: `display_group_slug/label` → `document_type/document_type_label` → `section_slug/section_label`. Keine Ableitung aus Dateinamen.
- Neue Bedienlogik `Ansicht`: öffnet ein rechtes Vorschau-Panel (auf Mobile bildschirmfüllend) mit Titel, Quellenhinweis, `Neuer Tab`, `Download` und Schließen. PDF/HTML/Bild per iframe (sandboxed), sonst freundlicher Hinweis. Kein `dangerouslySetInnerHTML`. `Neuer Tab`/`Öffnen` und `Download` bleiben separate Aktionen.
- Filterspalte auf Mobile einklappbar („Filter (n)"). Prominente Filter unverändert: Produktkategorie, Familie/Serie; System, Sprache, Dokument-/Quellentyp unter „Weitere Filter". Facetten weiterhin kaskadierend aus `api_v1_download_center_facets_v2`.
- Neue CMS-Light-Bedienlabels (DE+EN in `cms_section_fields`, DE+EN whitelisted in `cms_admin_editable_fields`): `btn_view`, `btn_new_tab`, `btn_close_preview`, `preview_unavailable_hint`. `label_kapitel` von „Kapitel in diesem Bereich" auf „Kapitel" geändert (gilt nun überall). Migration idempotent.
- Fachliche Daten weiterhin ausschließlich read-only aus der Download-Contract-Datenbank über die Edge Function `download-center` (unverändert). Keine Zielgruppen/Bereiche/Typen/Dateien/Zähler in Code, i18n oder CMS-Light.
- Abnahme im Preview: Start neutral (Suche + zwei Einstiege, keine Trefferliste ohne Auswahl), Suche `PES Pro` 57 Treffer kapitelweise, `Senso Pro` 10 Treffer kapitelweise, `Installateur > Archiv` 143 (Produktinformationen 108 · Bedienungsanleitungen 16 · Handbücher 9 · Montageanleitungen 1 · Sonstige Support-Unterlagen 9), `Planer > Schaltpläne` 62, `Planer > Anlagenplanung` 12, `Ansicht` bleibt auf `/downloads` und öffnet das Panel mit iframe. Typecheck, Lint und Build grün.


## 2026-08-26 — Batch 65: Briefkastenanlagen (P-006) — überarbeitete Blockstruktur
- Seite: `gebaeudekommunikation.briefkastenanlagen` (P-006). Nur Struktur, Reihenfolge, Karten, Bildzuordnung, Linkziele. Alle neuen Fließtexte tragen `PLATZHALTER — Text folgt`.
- B-037 `montageformen`: neue Karte `montageformen__fuesse` („Freistehend mit seitlichen Füßen", `link_1_enabled=0`). Titel geändert: `__stele` → „Freistehend als Stele", `__unterputz` → „Unterputz". Neue Kartenfolge: Aufputz → Unterputz → Inputz → Füße → Stele.
- Bilder umgehängt (nicht neu hochgeladen): Inputz-Motiv von `__unterputz` → `__inputz`, Füße-Motiv von `__stele` → `__fuesse`. `__unterputz` und `__stele` haben nun bewusst kein Bild.
- Neu `entry_funktionen` (`cards_v1`, nach B-037): „Was ENTRY kann" / „Fünf Eigenschaften des Systems" mit fünf Iconkarten (`palette`, `shield-check`, `type`, `box`, `plug-zap`), ohne Bildslot.
- Neu `entry_cta` (`cta_v1`, `sort_order` nach `entry_funktionen`): „Stellen Sie Ihre Anlage zusammen." → `https://www.tcsag.de/Konfiguratoren/ENTRY-LBX/` (`cta_kind=extern`, `background_variant=light`, kein Bild/Zweitbutton/Kontaktzeilen).
- B-3079 `entry`: `cta_label`/`cta_link` geleert. B-3080 `sortiment`: CTA jetzt „Katalog herunterladen (PDF)" → TCS-Katalog-PDF (HTTP 200).
- Neu `sortiment_bilder` (`cards_v1`, nach B-3080): „Aus dem Katalog" / „Ein Blick ins Programm" mit drei Karten (Aufputz, Unterputz, Freistehend), bewusst ohne Bild und ohne Icon.
- Sprachen: Titel nur DE. EN unverändert, außer Pflichtfelder des neuen `entry_cta` (`title`, `cta_label` als Platzhalter, `cta_href` mit derselben URL) und lokalneutrale Link-/Schalterfelder — nötig für den Renderfähigkeitsvertrag.
- Whitelist DE+EN für alle neuen Sections/Karten/Felder gesetzt. Unverändert: B-036 `hero`, B-038 `skalierbarkeit`, B-039 `smart`, B-3081 `anschluss`, B-2209 `faq` (bleibt ausgeblendet), B-2308 `standard_cta`, Seitentyp, Route, Breadcrumb, Navigation.
- Kein Code, keine i18n-Datei geändert. Wahrheits-Check CI grün, Renderfähigkeits-Gate grün, Build OK, Preview geprüft (9 Top-Level-Sections im Debug-Badge).
- Bekannte Einschränkung: `cta_v1`-Blöcke rendern öffentlich gesammelt am Seitenende (`CmsTailCta`), daher erscheint `entry_cta` vor `standard_cta` am Seitenfuß statt zwischen `entry_funktionen` und `sortiment`. DB-Position ist korrekt gesetzt; ein Inline-CTA-Renderer wäre ein technischer Folgeauftrag.


## 2026-08-26 — Batch 64: Briefkastenanlagen (P-006) — neue Blockstruktur
- Seite: `gebaeudekommunikation.briefkastenanlagen` (P-006). Nur Struktur, Reihenfolge, Sichtbarkeit, Linkziele — keine inhaltlichen Texte erfunden; Pflichttexte tragen `PLATZHALTER — Text folgt`.
- Neu (Typ `teaser_2col_v1`, aktiv, zwischen B-036 `hero` und B-037 `montageformen`): B-3079 `entry` (Label „Design- und Montagesystem ENTRY", CTA „Anlage konfigurieren" → `https://www.tcsag.de/Konfiguratoren/ENTRY-LBX/`, `image_position=right`, `background_variant=default`) und B-3080 `sortiment` (Label „Vorverdrahtete Briefkastenanlagen", CTA „Anlage anfragen" → `/kontakt`, `image_position=left`, `background_variant=muted`). Bildslot `image` bewusst leer (Bildauftrag folgt).
- Neu (Typ `cards_v1`, aktiv, zwischen B-039 `smart` und B-2209 `faq`): B-3081 `anschluss`, Label „Weiter gedacht", Titel „Wenn die Anlage mehr können soll.", `intro` leer. Zwei Karten: B-3084 `anschluss__namensanzeige` → `/gebaeudemanagement/digitale-namensanzeige`, B-3085 `anschluss__digitale-briefkastenanlage` → `/zutrittskontrolle/digitale-briefkasten` (beide Routen existieren und sind veröffentlicht), `link_1_label` „Mehr erfahren", `link_1_enabled=1`.
- B-037 `montageformen`: neue Karte B-3082 `montageformen__inputz` (Titel „Inputz", Bildslot bewusst leer). Reihenfolge jetzt Unterputz → Aufputz → Inputz → Stele. Alle vier Karten `link_1_enabled=0` (auch `link_2`/`link_3`); Label, href und kind bleiben gespeichert. Legacy `cta_label`/`cta_href` gibt es auf diesen Karten nicht.
- B-039 `smart`: neue Karte B-3083 `smart__zutritt` (Titel „Zugang zur Haustür ohne Schlüssel", Lucide-Icon `key-round`). B-1702 `smart__design` und B-1703 `smart__beschriftung` auf `is_active=false` (nicht gelöscht). Sichtbare Reihenfolge: Türkommunikation → Barrierefrei → Zutritt; alle sichtbaren Karten `link_1..3_enabled=0`.
- Sprachen: DE-Arbeitstitel gesetzt. EN unverändert; nur technische Felder (`image_position`, `background_variant`, `cta_link`, `link_1_href/enabled`, `icon`) und die Pflichtfelder `title`/`text` der zwei neuen Teaser mit demselben Platzhalter, damit die neuen Bausteine dem Renderfähigkeitsvertrag genügen. Keine Übersetzungen erzeugt.
- Whitelist (`cms_admin_editable_fields`) für alle neuen Sections/Karten DE+EN gesetzt (Teaser inkl. Bildslot `image`; Karten über `card_v1`-Trigger plus `title`, `description`, `image`, `thumbnail`, `icon_image`).
- Unverändert: B-036 `hero` (inkl. Bild), B-038 `skalierbarkeit`, B-2209 `faq` (bleibt `is_active=false`), B-2308 `standard_cta`, Seitentyp, Route, Breadcrumb, Navigation (N-031).
- Kein Code geändert (Seite rendert über `GenericCmsPage`/`CmsBodyRenderer`), keine i18n-Datei berührt. Wahrheits-Check CI grün, Renderfähigkeits-Gate grün (0 neue Befunde), Preview geprüft: 17 sichtbare Sections in korrekter Reihenfolge, keine Kartenlinks auf `/kontakt`, keine Laufzeitfehler.


## 2026-08-19 — Batch 63: FAQ-Block B-2286 auf P-007 gefüllt und eingeschaltet
- Seite: `gebaeudekommunikation.systemloesungen` (P-007), Block B-2286 `faq` (Typ `faq_v1`, `sort_order` 23 — unverändert zwischen B-046 `fachplanung` und B-2309 `standard_cta`).
- Inhalte DE+EN gesetzt im Feldschema des funktionierenden Blocks B-2210 (P-008): `eyebrow`, `headline`, `intro` (leer) sowie `items.q1..q3.frage` / `.antwort` / `.enabled = 1` (drei Fragen: Muster-Hochhaus-Richtlinie, Sprachalarmanlage, Nachrüstung). EN-Texte 1:1 aus dem Auftrag, nicht neu übersetzt.
- Alle diese Felder in `cms_admin_editable_fields` DE+EN freigeschaltet. Leere Platzhalterzeilen im abweichenden `items.qN.q`/`.a`-Schema entfernt (waren ausnahmslos leer, kein Inhaltsverlust).
- `is_active = true`; Renderfähigkeitsvertrag (`cms_section_renderability`) meldet `renderable: true`, `missing: []` — vorher war genau das die Ursache für `section_not_renderable` (keine Frage/Antwort in DE/EN).
- Kein Code geändert: FAQ und CTA werden auf dieser Seite bereits von `PageLayout` → `CmsTailSections` in typübergreifender `sort_order` gerendert.
- Keine Bilder, keine Navigations-/Routen-/i18n-Änderung, keine anderen Blöcke berührt (B-2718/B-2203 bleiben ausgeblendet). Wahrheits-Check CI grün, Preview DE+EN geprüft.

## 2026-08-19 — Batch 62: Systemlösungen (P-007) — fünf Wechselteaser statt Kartenraster
- Seite: `gebaeudekommunikation.systemloesungen` (P-007). Neu angelegt (Section-Typ `teaser_2col_v1`, alle aktiv): `teaser_concierge` (sort_order 2), `teaser_internekomm` (3), `teaser_namensverwaltung` (4), `teaser_durchsage` (5), `teaser_bidi` (6) — also zwischen B-041 `vorteile` (1) und B-046 `fachplanung` (19).
- Felder je Block DE+EN gesetzt: `label`, `title`, `text`, `cta_label`, `cta_link`, `image_position`, `background_variant`; alle Felder in `cms_admin_editable_fields` freigeschaltet. CTA-Ziele: P-070 `/anwendungen/concierge`, P-071 `/anwendungen/interne-kommunikation`, P-072 `/anwendungen/digitale-namensverwaltung`, P-073 `/gebaeudekommunikation/systemloesungen/bewohnerinformation-im-sonderfall`, P-074 `/anwendungen/bidirektionale-video`.
- Bildslots: kein Bild gesetzt; je Block ein Platzhalter-Slot `image` (desktop) mit Alt-Text „BILDAUFTRAG offen" in DE+EN.
- Ausgeblendet, nicht gelöscht: B-2718 `systemfunktionen_cards` und B-2203 `loesungen_uebersicht` (`is_active = false`, Felder und Karten bleiben erhalten).
- Code (nur Renderpfad, keine Inhalte): `SystemloesungenPage.tsx` rendert Top-Level-Sections nun auch für `teaser_2col_v1` (bestehende Komponente `Teaser2ColV1`) in DB-`sort_order` — sonst wäre die Spiegel-Regel gebrochen.
- Keine Navigations-/Routenänderung, keine i18n-Texte, keine Detailseite verändert. Wahrheits-Check CI grün, Preview geprüft (fünf Teaser in korrekter Reihenfolge, CTA sichtbar).


## 2026-08-17 — Batch 61: Link-Prüfung mit Query-Parametern, FAQ-Ausrichtung, FAQ-Dopplung
- Keine Inhaltsänderung: keine Texte, Links, Kartenreihenfolgen, Sichtbarkeiten, Assets, Navigationsknoten. Nur Validierung, Layout und Renderverhalten.
- 404-Fehlalarm bei Links mit Query/Fragment behoben: neue gemeinsame Hilfsfunktion `routePathOf()` in `src/features/admin/lib/resolveCardLink.ts` schneidet `?…`/`#…` (und trailing Slash) vor dem Abgleich gegen `cms_pages.route_path` ab. Beide Abgleichstellen nutzen sie: `resolveCardLink()` (Link-Pillen in Baum + Arbeitsbereich) und `classifyHref()` in `src/features/admin/lib/structureMapData.ts` (Struktur-Karte). Referenz: B-2734 auf P-008, `/produkte/tuerkommunikation?kategorie=aussenstationen`. Unbekannte Pfade werden weiterhin als fehlend gemeldet.
- FAQ-Ausrichtung: `src/features/cms/components/sections/FaqV1.tsx` — `max-w-3xl mx-auto` → `max-w-3xl` (linksbündig in derselben Containerbreite wie `CardsSectionV1` u. a.). Typografie, Farben und Abstände unverändert. `CtaV1` bleibt bewusst zentriert.
- FAQ-Dopplung nach dem Speichern: Ursache war `CmsRenderRegistryProvider`, das die Registry bei *jedem* Render geleert hat. Bei einem Teil-Re-Render (nur Tail-Zweig) fehlte die Markierung des bereits montierten Inline-`FaqV1`, weshalb `CmsTailFaq` denselben Block ein zweites Mal ausgab. Fix: Registry lebt pro Mount, `useMarkRendered()` räumt seinen Eintrag beim Unmount selbst auf (`src/features/cms/components/CmsRenderRegistry.tsx`). Gilt gleichermaßen für `CmsTailCta`.
- Erhebung ohne Änderung: Altfelder `ctaPrimary`/`ctaSecondary` existieren in 3 Blöcken (B-56 `projektCta` auf P-008, B-65 `kontakt` auf `gebaeudekommunikation.snipdoo-ip`, B-46 `fachplanung` auf `gebaeudekommunikation.systemloesungen`), je DE+EN gefüllt, kein Renderer liest sie. Empfehlung: reguläres Feldpaar (`link_1_label`/`link_1_href` bzw. `cta_label`/`cta_href` + Sichtbarkeitsschalter) verwenden, Altfelder nur leeren statt löschen. Keine Änderung durchgeführt.
- Wahrheits-Check CI grün; Preview P-008 geprüft (FAQ einmalig, linksbündig).


## 2026-08-14 — Batch 60: Hero-Einleitungstext auf eine Wahrheit (`hero.subline`) konsolidiert
- Befund: `CmsPageLayout` las die Kandidaten in der Reihenfolge `intro → introText → subline → description`. Das Admin-Feld „Intro / Subline" schreibt nach `subline` und wurde deshalb von unsichtbaren Altwerten in `hero.intro` überstimmt (Referenz: `gebaeudekommunikation.grossanlagen`, P-008, B-047).
- Datenkonsolidierung (DB-first, idempotent, je Locale getrennt): Fall a (Altfeld gefüllt, `subline` leer) → Wert nach `subline` übernommen; danach Fall a+b → Altfelder `intro`/`introText`/`description` geleert (nicht gelöscht). Betroffen: 74 Hero-Blöcke, 148 Feldwerte DE+EN.
- Fall c (Altfeld und `subline` mit unterschiedlichen Texten) unverändert: 20 Seiten / 69 Feldwerte, darunter 11 Produktlösungs-Seiten (`CmsProductSolutionShell`, zeigt `subline`, `description` und `introText` als getrennte Elemente) sowie `gebaeudekommunikation.grossanlagen`, `personas.wohnungswirtschaft`.
- Renderer (nur Feldreihenfolge, keine Typografie): `src/features/cms/components/CmsPageLayout.tsx` → `pick(cms, "hero", loc, ["subline", "intro", "introText", "description"], intro)`. Altfelder bleiben Rückfallebene, i18n-Fallback unverändert.
- Whitelist: `hero.subline` für alle Hero-Blöcke DE+EN in `cms_admin_editable_fields` freigeschaltet.
- Gegenprobe DE+EN auf `/gebaeudekommunikation/grossanlagen`: der im Admin gepflegte Intro-Text erscheint öffentlich. Wahrheits-Check CI grün.
- Keine Navigations-/Routen-/i18n-Änderung, keine Feldzeilen gelöscht.


## 2026-08-13 — „Feuerwehrdurchsage" umbenannt in „Bewohnerinformation im Sonderfall" und umgehängt
- Seite: `anwendungen.feuerwehrdurchsage` (P-073, T05). Titel DE/EN → „Bewohnerinformation im Sonderfall" / „Resident information in exceptional situations".
- Navigationsknoten N-101 von `an.oeffentlich` (N-062) nach `gk.systemloesungen` (N-065, P-007) verschoben, Sortierung ans Ende (sort_order 6); Labels DE/EN neu gesetzt.
- Route umgestellt auf `/gebaeudekommunikation/systemloesungen/bewohnerinformation-im-sonderfall` (`cms_pages.route_path` per `rpc_admin_upsert_page`); alte URL `/anwendungen/feuerwehrdurchsage` bleibt als Legacy-Fallback erreichbar (nicht aktiv verlinkt).
- Kartenlinks nachgezogen (DE+EN, `cta_href` + `link_1_href`): `card_sf_feuerwehrdurchsage` auf `anwendungen.root` und auf `gebaeudekommunikation.systemloesungen`.
- Code (nur Routing-Mechanik, keine Inhalte): `src/features/anwendungen/routes.tsx`, `src/navigation/routes.ts`, `src/navigation/pageRegistry.ts` (neuer Parent `gebaeudekommunikation.systemloesungen`), Verwandte-Link in `FeuerwehrPage.tsx`, Breadcrumb-Segment-Labels in `navigation.json` (DE/EN).
- Breadcrumb geprüft: „Startseite › Gebäudekommunikation › Systemlösungen › Bewohnerinformation im Sonderfall". Seite `anwendungen.feuerwehr` (N-085) unverändert.
- Wahrheits-Check und Renderfähigkeits-Gate grün. Seitentexte mit dem Begriff „Feuerwehr…" bleiben unverändert und werden von der Redaktion im Admin überarbeitet.



## 2026-06-22 — Batch 59: Wohnheim-Blöcke von Bildungseinrichtungen nach Wohnheim verlagert
- Quelle: `anwendungen.bildungseinrichtungen` (P-057 / N-010). Ziel: `anwendungen.wohnheim` (P-268 / N-153).
- Verlagert (inkl. aller Kind-Karten, Felder DE/EN und Assets — Felder/Assets folgen per FK-Cascade): B-2586 `einrichtung_wohnheim` (teaser_2col_v1), B-2588 `anforderungen_wohnheim` (cards_v1, 5 Karten), B-2594 `leistungen_wohnheim_sicherheit` (cards_v1, 4 Karten), B-2599 `leistungen_wohnheim_kommunikation` (cards_v1, 4 Karten inkl. P-071-Link), B-2603 `leistungen_wohnheim_orientierung` (cards_v1, 3 Karten), B-2607 `broschure_wohnheim` (cta_v1).
- Auf Zielseite deaktiviert (nicht gelöscht): `anforderungen` (cards_v1) + 4 `anforderungen_item_*` Karten, `leistungen` (content_v1), `broschure_kita` (cta_v1).
- Neue Reihenfolge auf P-268: Hero (10) → Content (20) → Einrichtung (30) → Anforderungen (40) → Leistungen Sicherheit/Kommunikation/Orientierung (50/60/70) → Systembausteine (80) → Broschüre (90) → FAQ (100) → Standard-CTA (110).
- `WohnheimPage.tsx` auf generischen DB-First-Renderer (`GenericCmsPage`) umgestellt — hartkodierte Icon-/Fallback-Liste entfällt, Spiegel-Regel hergestellt.
- Übersichtskarte `card_uebersicht_wohnheim` auf der Quellseite bleibt unverändert (gehört zum Block `uebersicht_einrichtungen`, ein Übersichts-Navigator der Eltern-Seite).
- Keine Navigations-/Routenänderung; Slug, Breadcrumb und Hauptmenü-/Footer-Links auf `/anwendungen/wohnheim` unverändert.




## 2026-06-22 — Batch 58: Schule-Blöcke von Bildungseinrichtungen nach Schule verlagert
- Quelle: `anwendungen.bildungseinrichtungen` (P-057 / N-010). Ziel: `anwendungen.schule` (P-267 / N-152).
- Verlagert (inkl. aller Kind-Karten, Felder DE/EN und Assets): B-2542 `einrichtung_schule` (teaser_2col_v1), B-2543 `anforderungen_schule` (cards_v1, 6 Karten), B-2550 `leistungen_schule_sicherheit` (cards_v1, 4 Karten), B-2555 `leistungen_schule_kommunikation` (cards_v1, 4 Karten inkl. P-071-Link), B-2559 `leistungen_schule_orientierung` (cards_v1, 3 Karten), B-2563 `broschure_schule` (cta_v1).
- Auf Zielseite deaktiviert (nicht gelöscht): B-2685 `anforderungen`, B-2682 `leistungen`, B-2715 `broschure_kita`.
- Neue Reihenfolge auf P-267: Hero → Content → Einrichtung → Anforderungen → Leistungen (Sicherheit/Kommunikation/Orientierung) → Systembausteine → Broschüre → FAQ → Standard-CTA.
- `SchulePage.tsx` auf generischen DB-First-Renderer (`GenericCmsPage`) umgestellt — hartkodierte Icon-/Fallback-Liste entfällt, Spiegel-Regel hergestellt.
- Wahrheits-Check und card-renderer-paritaet grün; keine Navigations-/Routenänderung (Slug und Breadcrumb unverändert).



## 2026-06-18 — Neue Detail-Seite „TCS in Wohnheimen" (P-268)
- Seite `anwendungen.wohnheim`, Route `/anwendungen/wohnheim`, Typ T05; 11 Sections und alle Felder von P-267 (Schule) gespiegelt.
- Hero + Content-Headline/Intro/Description in DE+EN mit Wohnheim-spezifischen Texten überschrieben.
- Hero-Asset (3840×1360, Wohnheim-Fassade) hochgeladen und im Slot `hero/image` (desktop) aktiviert.
- Navigationsknoten `an.bildung.wohnheim` unter `an.bildung` (sort_order=3) angelegt.
- Übersichtskarte B-2669 (`card_uebersicht_wohnheim` auf P-057) per `link_1_*` auf `/anwendungen/wohnheim` verlinkt (DE+EN).
- Code: `WohnheimPage.tsx` + Route in `src/features/anwendungen/routes.tsx`.


## 2026-06-18 — Hero-Bild Schule ausgetauscht
- Seite: `anwendungen.schule` (P-267)
- Asset B-2884 (`hero/image`, desktop) wurde auf das neu gelieferte 3840×1360-Hero-Bild (`Web_Hero_Bildformat_3840_x_1360px_Schulen-1.jpg`) umgehängt.
- Reine DB-/Storage-Änderung, kein Code, kein i18n.


Stand: 2026-06-05 · Status: **aktiv, fortlaufend gepflegt**.

> Zweck: Eine **schlanke, dauerhafte Spur** redaktioneller Änderungen am
> CMS-Light, ohne für jede Kleinigkeit einen großen Batch-Bericht
> anzulegen.
>
> Dieses Protokoll ersetzt keinen technischen Audit-/Batch-Bericht
> (`docs/04-betrieb/audit-snapshot/`). Es ergänzt ihn um die
> **redaktionelle Sicht**: Wer hat wann was am Inhalt geändert?

---

## 2026-06-17 — Neue Detail-Seite „TCS in Schulen" (P-267)

- **Was:** Neue Detail-Seite `anwendungen.schule` (Typ T05) als Kindseite von P-057 Bildungseinrichtungen, analog zur Kita-Detail-Seite (P-266).
- **Wie:** Page-Datensatz, alle Top-Level-Sections und Anforderungs-Karten von P-061 Einfamilienhaus gespiegelt; Hero- und Content-Texte (headline/intro/description) DE+EN mit Schule-spezifischen Inhalten überschrieben.
- **Hero-Bild:** Asset in `cms-assets` hochgeladen (`anwendungen.schule/hero/image/desktop/...`) und in `cms_assets` mit `is_active=true`, Alt-Text DE/EN eingetragen. Slot `hero / image_enabled = 1`.
- **Navigation:** Knoten `an.bildung.schule` unter `an.bildung` angelegt (`sort_order=2`, `route_path=/anwendungen/schule`).
- **Verlinkung:** Schule-Übersichtskarte B-2668 auf P-057 verlinkt auf `/anwendungen/schule` (link_1 DE/EN).
- **Code:** Neue Route `/anwendungen/schule` (`SchulePage.tsx`) — reines DB-first Rendering über `AnwendungDetailPage`.
- **Offen:** Schule-spezifischer Inhalts-Feinschliff (Anforderungen, Leistungen, Systembausteine, FAQ, CTA) steht aktuell identisch zur Einfamilienhaus-Vorlage; Hero-Bild ist derzeit das vorhandene Schule-Foto im 3:2-Format — ein echtes 3840×1360 Hero kann später nachgereicht werden.

## 2026-06-17 — Kita-Detail-Seite: Hero-Bild + Verlinkung der Übersichtskarte

- Hero-Bild auf `anwendungen.kindertagesstaetten` (P-266) hinterlegt: Slot `hero/image` (Desktop), neues Asset B-2883, Alt-Texte DE/EN. Storage-Pfad `anwendungen.kindertagesstaetten/hero/image/desktop/1781705100000-kita-hero.jpg`.
- Kita-Übersichtskarte `card_uebersicht_kita` (B-2667) auf P-057 `anwendungen.bildungseinrichtungen` verlinkt: `link_1_enabled=1`, `link_1_kind=internal`, `link_1_href=/anwendungen/kindertagesstaetten`, Label „Mehr erfahren" / „Learn more" (DE + EN).
- Keine Code-/i18n-Änderungen, reine DB-/Asset-Pflege im CMS-Light. Spiegel-Regel eingehalten (Bild über `cms_assets`, Link über `cms_section_fields`).

---



## 2026-06-17 — Bildungseinrichtungen: Neue Detail-Seite „TCS in Kindertagesstätten"

- Neue Seite `anwendungen.kindertagesstaetten` (T05, Route `/anwendungen/kindertagesstaetten`), als Kindseite von P-057 `anwendungen.bildungseinrichtungen` (N-010).
- Aufbau analog zu P-061 Einfamilienhaus: alle Sections und Felder 1:1 gespiegelt (Hero, Anforderungen + 5 `card_v1`-Kinder, Content, Leistungen, Systembausteine, FAQ, Standard-CTA), Whitelist über vorhandenen Trigger automatisch geseedet.
- Kita-spezifisch überschrieben: `hero.headline`, `hero.intro`, `content.headline`, `content.intro`, `content.description` (DE + EN). Restliche Texte (Anforderungs-Karten, Leistungen, Systembausteine, FAQ, CTA) bleiben zunächst aus der Vorlage; können später per Prompt oder im /admin geschärft werden.
- Hero-Bild noch nicht hinterlegt — offener Punkt.
- Navigation: neuer Knoten `an.bildung.kita` im Hauptmenü unter `an.bildung`, sichtbar geschaltet.
- Code: neue Route + Page-Komponente `src/features/anwendungen/pages/KindertagesstaettenPage.tsx` (DB-first via `AnwendungDetailPage`, Code enthält keine Inhalte).
- P-057 Bildungseinrichtungen unverändert (keine Änderung an Sections, Karten, Links).

---

## 2026-06-12 — Bildungseinrichtungen: Neuer Kartenraster „Einrichtungen im Überblick"

- Seite: `anwendungen.bildungseinrichtungen` (P-057, N-010).
- Neu angelegt: Standard-Container `uebersicht_einrichtungen` (`cards_v1`, sort_order=50), direkt nach Hero (B-254) und vor den drei Einrichtungs-Blöcken.
- Drei neue Standardkarten (`card_v1`): `card_uebersicht_kita`, `card_uebersicht_schule`, `card_uebersicht_wohnheim` mit Titel, Kurzbeschreibung und Icon (DE + EN).
- Whitelist (`cms_admin_editable_fields`) für Gruppe + Karten im selben Schritt aktiviert (title, intro, description, eyebrow, icon, image_enabled, link_1..3_*).
- Renderer-Pfad: `BildungseinrichtungenPage` → `renderTopSection("uebersicht_einrichtungen")` → `CardsSectionV1` (Karten-Raster-Regel: 3 Karten = 1 Reihe à 3).
- Bestehende Sections (Hero, Einrichtungs-Teaser, Anforderungen, Leistungen, Broschüren, CTA) unverändert.

---

## 2026-06-12 — B-259 Wohnbau: Kartenscroller → Kartenraster

- Seite: `anwendungen.wohnbau`, Section `cards` (B-259).
- `section_type` von `product_scroller_v1` auf `cards_v1` umgestellt (DB-Migration, idempotent).
- Kind-Karten B-596 (Einfamilienhaus), B-597 (Mehrfamilienhaus), B-598 (Großanlage) unverändert (Inhalte, Reihenfolge, Sichtbarkeit, Assets).
- Renderer-Pfad: CmsBodyRenderer → `CardsSectionV1` (Karten-Raster-Regel: 3 Karten = 1 Reihe à 3).
- Navigation, Route, Breadcrumb, Whitelist: nicht betroffen.

---

## Wann eintragen?

**Pflicht-Eintrag**, wenn mindestens einer dieser Punkte zutrifft:

- Mehrere Seiten sind von derselben Änderung betroffen.
- Eine Änderung ist **navigationell relevant** (neuer Knoten, Reihen-
  folge, Sichtbarkeit `is_active`, `nav_area`, Parent/Child).
- Eine Änderung ist **strukturell relevant** (neue Seite, neuer Block,
  Section ein-/ausgeblendet, Karten hinzugefügt/entfernt, Reihenfolge
  in `cms_sections` geändert).
- Ein Inhalt wurde sprachübergreifend (DE+EN) eingespielt.

**Kein Eintrag nötig** bei reinen Tippfehler-Korrekturen, einzelnen
Alt-Text-Anpassungen oder Bild-Tausch ohne Strukturwirkung — der
Chat-Bericht reicht.

Im Zweifel: lieber einen Zweizeiler eintragen.

---

## So eintragen

Neuen Eintrag **oben** anhängen (neueste Änderung zuerst). Format:

```md
### YYYY-MM-DD — Kurztitel der Änderung

- Auftrag: [eine Zeile, was die Redaktion wollte]
- Betroffen: [P-…/page_key, B-…/section_key, N-…, A-… — wo sinnvoll]
- Art: [Inhalt / Navigation / Struktur / Sichtbarkeit / Reihenfolge / Sprache]
- Sprachen: [DE+EN / nur DE / nur EN]
- Spiegel geprüft: [ja/nein] · Wahrheits-Check: [ok / Hinweis]
- Anmerkung: [optional, max. 1–2 Zeilen]
```

Mehr nicht. Lange Begründungen, Screenshots, technische Listen gehören
in den Chat-Bericht oder in einen Audit-Snapshot, nicht hierher.

---

## Einträge

<!-- Neueste Änderung oben anhängen. Älteste unten. -->

### 2026-06-12 — Wechselteaser-Darstellung vereinheitlicht (Full-Bleed Rand-zu-Rand)

- Auftrag: Wechselteaser (`teaser_2col_v1`) sollen auf allen Seiten gleich breit dargestellt werden — entsprechend der Startseite Rand-zu-Rand.
- Ursache: `Teaser2ColV1` rendert intern `container mx-auto`. Auf Home / Eingangssysteme / TCS in Bauten läuft die Section dadurch bis zur Viewport-Kante (Page-Layout dort mit `fullWidth`). Auf Gebäudekommunikation, Zutrittskontrolle und Gebäudemanagement steckte der Teaser zusätzlich im äußeren `container mx-auto` von `PageLayout` (teils noch in `ContentSection`), was die Hintergrundfläche sichtbar einschnürte.
- Art: Renderer-Anpassung — `Teaser2ColV1` wird jetzt als Full-Bleed-Section gerendert (`w-screen` + `-ml-[50vw] -mr-[50vw] left-1/2 right-1/2`). Der innere `container mx-auto` begrenzt den Inhalt weiterhin auf die reguläre Lesebreite (max 1400 px, 2 rem Padding). Keine Änderungen an Inhalten, Whitelist, DB, Navigation oder Hintergrund-Optionen.
- Betroffen: alle Seiten mit `teaser_2col_v1` — insbesondere `gebaeudekommunikation.root`, `zutrittskontrolle.root`, `gebaeudemanagement.root` (Vereinheitlichung), sowie alle Persona-Seiten und sonstige Wechselteaser-Einsätze.
- Spiegel geprüft: ja (Renderer-Änderung, keine Spiegel-/Inhaltsbewegung; Admin-Vorschau `TeaserSectionPreview` bleibt isoliert und bewusst gerahmt) · Wahrheits-Check: nicht relevant (kein Vertrags-/Daten-Eingriff).
- Offene Punkte: keine.



### 2026-06-12 — Admin-Whitelist-Loader: Cap auf 500.000 Zeilen erhöht (B-1619/1620/1622/1677)

- Auftrag: Wechselteaser B-1619 (`teaser_tueren_tore`), B-1622 (`teaser_mobile_door_app`), B-1620 (`teaser_fahrstuhlsteuerung`) und B-1677 (`teaser_zufahrt_parkraum`) auf der Seite `zutrittskontrolle.root` waren im CMS-Light gesperrt („nicht in Whitelist", „DE/EN · GESPERRT"), obwohl die Whitelist-Einträge in der DB vorhanden und aktiv sind.
- Ursache: Der Loader in `src/features/admin/api/cmsAdminEditableFields.ts` hatte einen Hard-Cap von 50.000 Zeilen (PAGE_SIZE 1000 × Guard 50). Die Whitelist-Tabelle umfasst inzwischen 98.210 Einträge — alphabetisch hintere Seiten (z. B. `zutrittskontrolle.*`) wurden stillschweigend abgeschnitten und erschienen im Admin als „nicht in Whitelist".
- Betroffen: alle Admin-Editoren, die Whitelist-Zustände prüfen, für Seiten mit Page-Key ab dem alphabetischen Bereich, der den 50k-Cap überschritt (insb. `zutrittskontrolle.*`). Keine DB-, Inhalts- oder Renderer-Änderung — die Whitelist-Daten selbst waren immer korrekt.
- Art: Loader-Fix — Guard von 50 auf 500 erhöht (PAGE_SIZE bleibt 1000 → neuer Maximaldurchsatz 500.000 Zeilen, ~5× Puffer gegenüber aktuellem Bestand). Kommentar im Code aktualisiert.
- Spiegel geprüft: ja (Admin liest jetzt die vollständige Whitelist; die 4 Wechselteaser lassen sich pflegen) · Wahrheits-Check: nicht relevant (keine Vertrags-/Renderer-/Daten-Änderung).

### 2026-06-12 — Türsprechanlagen-Scroller: canonical-first für Title/Eyebrow/Description


- Auftrag: Standardkarten B-546 (`card_tasta_ip_7`), B-547 (`card_skylinetenpro`), B-2665 (`card_carus_next`) zeigten auf der öffentlichen Seite andere Texte als im Admin gepflegt.
- Ursache: Hardcodierter `ProduktScroller` in `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` las Alias-Felder (`headline`, `beschreibung`, `subtitle`) statt der kanonischen Felder (`title`, `description`, `eyebrow`) — entgegen dem dokumentierten `card_v1`-Textvertrag.
- Betroffen: Innen- und Außenstationen-Scroller auf `gebaeudekommunikation/tuersprechanlagen` (gleiche Funktion). Keine DB-, Inhalts-, Karten- oder Navigationsänderung.
- Art: Renderer-Fix — Lesereihenfolge auf canonical-first umgestellt (`title || headline || i18n`, `description || beschreibung || i18n`, `eyebrow || subtitle || i18n`).
- Sprachen: DE+EN gleichermaßen · Spiegel geprüft: ja (Renderer liest jetzt was Admin schreibt) · Wahrheits-Check: nicht relevant (kein DB-Write, kein Vertragsfeld).


### 2026-06-12 — Wechselteaser (teaser_2col_v1): halbe Höhe + 5 Hintergrund-Optionen

- Auftrag: Vertikale Abstände des Wechselteasers halbieren und am Block eine Auswahl für die Hintergrundfarbe ermöglichen (Weiss, 5 %, 7 %, 10 %, 13 % Schwarz).
- Betroffen: globaler Renderer `src/features/cms/components/sections/Teaser2ColV1.tsx` (Public) + Admin-Vorschau `TeaserSectionPreview.tsx`. Damit automatisch alle 71 `teaser_2col_v1`-Blöcke (u. a. anwendungen.root, eingangssysteme.root, gebaeudekommunikation.root + Unterseiten, gebaeudemanagement.root, home.start, personas.*, zutrittskontrolle.root). Keine Karten-, Asset-, Inhalts- oder Navigationsänderung.
- Art: Layout (Renderer-CSS: `py-8 lg:py-12` → `py-4 lg:py-6`) + neues Admin-Bedienfeld `TeaserBackgroundSelect` (5 Werte: `white | black-5 | black-7 | black-10 | black-13`). Migration: Whitelist `cms_admin_editable_fields` für `background_variant` (DE+EN) auf allen 71 Blöcken aktiviert (idempotent, `ON CONFLICT … SET is_enabled=true`). Bestehende Feldwerte (z. B. 4× `default`) bleiben unverändert; Renderer mappt `default`/leer → Weiss, Altbestand `muted` → 10 % Schwarz.
- Sprachen: technisches Feld (sprachneutral, DE-only Pflege; EN-Whitelist nur zur Konsistenz mit dem generischen Editor).
- Spiegel geprüft: ja (Renderer-Änderung wirkt 1:1 öffentlich, Admin-Vorschau spiegelt Padding und Hintergrund) · Wahrheits-Check: nicht relevant (Vertrag/Felder/Slots unverändert; `background_variant` bereits in `sectionTypes.ts` als Technik-Feld definiert).
- Anmerkung: Keine zweite Wahrheit — Werte liegen ausschließlich in `cms_section_fields`, Mapping nur im Renderer/Preview. Bestehender `CtaBackgroundSelect` (light/dark für `cta_v1`) bleibt unangetastet; PageEditor wählt jetzt nach `section_type` zwischen Teaser- und CTA-Hintergrundauswahl. Keine Navigation, keine Routen, keine Inhalte berührt.



### 2026-06-12 — Kartenscroller (product_scroller_v1): einheitliches 3+Anschnitt-Layout

- Auftrag: Kartenscroller soll in jedem Einsatz auf Desktop 3 Standardkarten vollständig zeigen und die 4. Karte am rechten Rand anschneiden (Referenz: B-026, B-027).
- Betroffen: globaler Renderer `src/features/cms/components/sections/ProductScrollerV1.tsx`. Damit automatisch alle Seiten/Blöcke, die `product_scroller_v1` (oder den Alias `cards_v1` mit `section_key='products'`) nutzen. Keine DB-, Inhalts-, Karten- oder Navigationsänderung.
- Art: Layout (nur Renderer-CSS, Tailwind-Klasse auf der Karten-Article). Mobile/Tablet-Breiten (`w-72 md:w-80`) unverändert; auf Desktop (`lg`) neue Breite `calc((100% - 5.25rem)/3.5)` = 3 volle Karten + Anschnitt der 4. bei `gap-6` (1.5rem).
- Sprachen: nicht inhaltlich · Spiegel geprüft: ja (kein Inhalts-/Sortier-Eingriff) · Wahrheits-Check: nicht relevant (kein DB-Write, kein Vertragsfeld).
- Anmerkung: Inhalte, Sichtbarkeit, Reihenfolge und Kartenmodell (`card_v1`) bleiben unverändert; keine zweite Wahrheit in i18n/Code.


### 2026-06-05 — Konvergenz-Regel für neue CMS-Seiten festgeschrieben

- Auftrag: Vereinheitlichung der Renderpfade als Regel festhalten, ohne bestehende Seiten anzufassen.
- Regel: Neue CMS-Seiten werden ausschließlich als `CmsOnlyShell` (bzw. `CmsProductSolutionShell` für T05) direkt in `src/app/routes.tsx` angelegt — keine neuen eigenen Page-Komponenten und keine neuen `GenericCmsPage`-Wrapper, außer es ist nachweislich Sonderlogik nötig.
- Bestand: bestehende „Standardisiert"-Seiten werden NICHT proaktiv migriert (Freeze nach Batch 25, kein Nutzergewinn). Konvergenz erfolgt natürlich über neue Seiten.
- Doku: `.lovable/always-follow.md` Abschnitt 4 + `docs/02-architektur/renderer-pfad-vs-seitentyp.md` (neuer Abschnitt „Regel für neue Seiten").
- Art: nur Regel-/Dokumentationsänderung. Keine DB-, Inhalts-, Navi- oder Renderer-Änderung.



### 2026-06-05 — Admin-Anzeige: technischer Renderpfad neben fachlichem T-Code

- Auftrag: Im /admin sichtbar machen, dass fachlicher Seitentyp (T-Code) und technischer Renderpfad zwei verschiedene Dinge sind.
- Betroffen: PageEditor-Sektion „Seitentyp & Bausteine" — zusätzlicher Block „Technischer Renderpfad" mit Status-Badge (Standardisiert / Gemischt / Sonderlogik).
- Art: Admin-Diagnose (read-only). Keine DB-, Inhalts-, Navi-, Renderer- oder Schreibweg-Änderung.
- Quelle: bestehendes `docs/04-betrieb/audit-snapshot/page-renderer-coverage.json` + Pattern-Scan auf `CmsOnlyShell` / `CmsProductSolutionShell` in `src/**/routes.tsx`. Generator: `scripts/admin/build-renderer-path-map.mjs` → schreibt `src/features/admin/lib/rendererPathMap.generated.ts`.
- Verteilung (95 Seiten): 13 Standard CMS (GenericCmsPage), 9 CMS-only Shell, 11 Produktlösungs-Shell, 3 eigene Komponenten mit voller DB-Iteration → zusammen 36 standardisiert; 59 eigene Komponenten als Sonderlogik (Eingangssysteme-Subpages, Anwendungen-Detailseiten, persona/hub-spezifische React-Seiten, registrierte Sonderseiten wie Kontakt/Karriere/Legal/Serviceportal).
- Doku: `docs/02-architektur/renderer-pfad-vs-seitentyp.md` neu.
- Spiegel: nicht relevant (keine Renderlogik-Änderung) · Wahrheits-Check: nicht relevant (kein DB-Write).
- Anmerkung: T-Codes wurden nicht umdefiniert, keine Seite umgebaut, keine zweite Wahrheit über Inhalte. Klassifikation kann jederzeit durch erneuten Lauf des Generators aktualisiert werden.



### 2026-06-05 — Geschwister-Navigation auf alle GenericCmsPage-Bereiche ausgerollt

- Auftrag: Bestehende `SiblingNav` über `GenericCmsPage` auf alle Seitenfamilien mit ≥ 2 live erreichbaren Geschwistern unter demselben Main-Nav-Parent übertragen.
- Betroffen (Public, automatisch über `GenericCmsPage`): Gebäudekommunikation-Unterseiten (Tuersprechanlagen, Briefkastenanlagen, Beschilderung, Grossanlagen, Systemloesungen, mobile-tk, snipdoo-ip), Gebäudemanagement-Unterseiten (Schraenke/Behaelter, Digitale Namensanzeige, Reservieren/Buchen, Digital Signage, Alarmanlagenkopplung), Zutrittskontrolle-Hauptbereiche (Tueren/Tore, Mobiler Zutritt, Fahrstuhlsteuerung, Zufahrten/Parkplaetze) sowie Subfamilien (zk.tueren-tore-Produkte, zk.zufahrten, gm.namensanzeige, gm.schraenke), Anwendungen-Branchen (Wohnbau, Objektloesungen, Bildungseinrichtungen, Gesundheitseinrichtungen, Oeffentliche Hand, Referenzprojekte) und Wohnbau-Unterseiten (an.wohnbau). Eingangssysteme unverändert (eigene Page-Komponenten mit explizitem `SiblingNav`).
- Art: Public-Renderer (Layout). Keine DB-, Inhalts- oder Navi-Struktur-Änderung.
- Sprachen: DE+EN (Labels aus `cms_navigation_nodes.label_de/_en` mit Fallback auf `cms_pages.title_*`).
- Spiegel geprüft: ja (Reihenfolge folgt `cms_navigation_nodes.sort_order`, Sichtbarkeit `is_active`) · Wahrheits-Check: nicht relevant (kein DB-Write).
- Anmerkung: `SiblingNav` einmal zentral in `GenericCmsPage.tsx` eingebunden — alle Seiten, die diesen Renderer benutzen, profitieren automatisch. Hook `useSiblingNavigation` bevorzugt jetzt `nav_area='main'`, wenn eine Seite in mehreren Nav-Bereichen vorkommt (z. B. zusätzlich in Footer-Spalte), damit am Seitenende nie Footer-Geschwister (Karriere, Presse, Kontakt, Datenschutz, Services) auftauchen. Seiten ohne Geschwister oder ohne Main-Nav-Parent (z. B. `home.ueber-tcs` über `ServicePage`, `UeberTCSPage` — nur Footer/Meta) rendern nichts. Bewusst nicht angebunden: Top-Level-Hauptbereiche (Produkte-Hub, Bereichs-Roots), Meta-Navigation (Kontakt, Karriere, Presse, Legal), Footer-only-Strukturen, Produktkatalog/PDP der externen Produkt-DB, Login/Admin. Geändert: `GenericCmsPage.tsx`, `useSiblingNavigation.ts`.

### 2026-06-05 — Generische Geschwister-Navigation (Eingangssysteme)

- Auftrag: Vor-/Zurück-Links innerhalb von Geschwisterseiten vereinheitlichen, statt hartcodierter Linkliste pro Seite.
- Betroffen: 7 Eingangssysteme-Unterseiten (`/entry-system/{design,funktionalitaet,material,integrationsformen,referenzen,standards,beratung}`).
- Art: Public-Renderer (Layout/Navigation). Keine DB-, Inhalts- oder Navi-Struktur-Änderung.
- Sprachen: DE+EN (Labels aus `cms_navigation_nodes.label_de/_en` mit Fallback auf `cms_pages.title_*`).
- Spiegel geprüft: ja (Reihenfolge folgt `cms_navigation_nodes.sort_order`, Sichtbarkeit `is_active`) · Wahrheits-Check: nicht relevant (kein DB-Write).
- Anmerkung: Neuer Hook `useSiblingNavigation` (`src/navigation/useSiblingNavigation.ts`) liest gleichrangige Geschwister direkt aus `cms_navigation_nodes` + `cms_pages` über bestehende Public-RLS — keine neue RPC, keine Migration. Neue Komponente `SiblingNav` (`src/components/SiblingNav.tsx`) rendert dezent kleine Textlinks mit Pfeilen, mobile-tauglicher Umbruch. Erste Seite zeigt nur „weiter", letzte nur „zurück". Knoten ohne gültige Route oder mit inaktiver Seite werden übersprungen. Toggle pro Seite über die bestehende `nav`-Section im Admin bleibt erhalten. `show_in_public_nav=false` (z. B. design/referenzen/standards) wird bewusst nicht gefiltert, weil das Flag nur die Menüsichtbarkeit steuert — Geschwister-Links am Seitenende dürfen weiterhin auf alle live erreichbaren Geschwisterseiten verweisen.

### 2026-06-05 — Vorlagen-Katalog: Gruppe „Technische Reserve" entfernt

- Auftrag: Block „Technische Reserve" (`rich_v1`, `download_list_v1`, `contact_block_v1`) aus dem Admin-Vorlagen-Katalog entfernen — nicht eingesetzt, nur Ballast für Redaktion.
- Betroffen: Admin-Tab „Vorlagen" (keine Seite, keine Section, kein Inhalt).
- Art: Admin-Anzeige (Sichtbarkeit).
- Sprachen: —
- Spiegel geprüft: nicht relevant · Wahrheits-Check: nicht relevant (kein DB-Write).
- Anmerkung: Linke Liste zeigt jetzt nur noch Seitentypen → Aktive Bausteine → Karten/Items. Renderer (`RichV1`, `ContactBlockV1`, `download_list_v1`), Section-Type-Vertrag und Whitelist bleiben unverändert im Code (Altbestand-Resilienz, Wiederaktivierung jederzeit möglich). Geändert: `VorlagenKatalog.tsx`.

### 2026-06-05 — Standardkarten: 2er-Reihe auf 21:9 angehoben

- Auftrag: Bildformat in `cards_v1` für 2er-Reihen ebenfalls flach machen (Thomas: 2 Karten wirken sonst zu hoch).
- Betroffen: alle `cards_v1`-Sections mit genau 2 Karten pro Reihe (Public).
- Art: Public-Renderer (Bildformat).
- Spiegel geprüft: nicht relevant (kein DB-Write) · Wahrheits-Check: nicht relevant.
- Anmerkung: Neue Reihen-Regel — 1 Karte → 21:9, 2 Karten → 21:9, 3 Karten → 16:9, 4 Karten → 4:3 (jeweils Desktop ≥ lg; Mobile/Tablet bleibt 16:9). Geändert: `cardGrid.ts`, `karten-raster-regel.md`. Zigzag-Wechselraster (`ContentBlockItem`) bewusst nicht angefasst — Bilder dort haben `h-auto` und werden nicht beschnitten; der wahrgenommene „schwarze/weiße Rand" stammt aus dem Quellbild selbst (TCS-Markenstreifen bzw. Bildhintergrund), nicht aus dem Renderer.

### 2026-06-05 — Standardkarten: row-aware Bildformat

- Auftrag: Bildproportionen in `cards_v1` an die tatsächliche Reihen-Größe koppeln (2er-Reihe = breiter, 4er-Reihe = bisheriges 4:3).
- Betroffen: alle Seiten mit `cards_v1` (Public-Renderer). Inhalte unverändert.
- Art: Public-Renderer (Layout/Bildformat).
- Sprachen: —
- Spiegel geprüft: nicht relevant (kein DB-Write) · Wahrheits-Check: nicht relevant.
- Anmerkung: Neue Regel in `cardImageAspectClass()` (`cardGrid.ts`): Desktop 1 Karte → 21:9, 2 Karten → 16:9, 3 Karten → 16:9, 4 Karten → 4:3. Mobile/Tablet einheitlich 16:9. Geändert: `CardsSectionV1.tsx`, `cardGrid.ts`, `karten-raster-regel.md`. Product-Scroller, Feature-Grid, Produktkatalog und PDP bewusst nicht angefasst (out of scope).

### 2026-06-05 — Vorlagen-Katalog: Gruppe „Historisch" entfernt

- Auftrag: `feature_grid_v1` / „Historisch / nicht mehr verwenden"-Block aus dem Admin-Vorlagen-Katalog entfernen (wird nicht mehr gebraucht, nicht mehr zeigen).
- Betroffen: Admin-Tab „Vorlagen" (keine Seite, keine Section, kein Inhalt).
- Art: Admin-Anzeige (Sichtbarkeit).
- Sprachen: —
- Spiegel geprüft: nicht relevant · Wahrheits-Check: nicht relevant (kein DB-Write).
- Anmerkung: Linke Liste zeigt jetzt nur noch Seitentypen → Aktive Bausteine → Karten/Items → Technische Reserve. Der Renderer `FeatureGridV1` und der Section-Typ-Alias bleiben im Code (für Altbestand-Resilienz), werden aber im Admin nicht mehr beworben. `contact_block_v1` bleibt in Technischer Reserve — keine Änderung an P-128/`/kontakt`.

### 2026-06-05 — Vorlagen-Katalog: Karten hochgezogen, Kontaktblock-Erklärung präzisiert

- Auftrag: „Karten / Items" (Standardkarte `card_v1`, 649×) in der linken Liste vor „Technische Reserve" einsortieren. Erklärung zu `contact_block_v1` / `download_list_v1` schärfen.
- Betroffen: Admin-Tab „Vorlagen" (keine Seite, keine Section, kein Inhalt).
- Art: Admin-Anzeige (Reihenfolge + Texthinweise).
- Sprachen: —
- Spiegel geprüft: nicht relevant · Wahrheits-Check: nicht relevant (kein DB-Write).
- Anmerkung: Neue Linke-Spalte-Reihenfolge: Seitentypen → Aktive Bausteine → Karten/Items → Technische Reserve → Historisch. Hinweis bei `contact_block_v1` stellt klar: `/kontakt` (P-128) ist mit `cards_v1` + Formular gebaut, nicht mit `contact_block_v1`; der Section-Typ ist nur ein reservierter Sonderbaustein, keine Navigationsrubrik (die Rubrik „Kontakt" lebt in `cms_navigation_nodes` + P-128). Analog für `/downloads` → `cards_v1`.

### 2026-06-05 — Vorlagen-Katalog: 0×-Bausteine klar einordnen



- Auftrag: 0×-Vorkommen (`feature_grid_v1`, `rich_v1`, `download_list_v1`, `contact_block_v1`) im Admin-Vorlagen-Katalog verständlich machen.
- Betroffen: Admin-Tab „Vorlagen" (keine Seite, keine Section, kein Inhalt).
- Art: Admin-Anzeige + Doku-Klarstellung (keine DB-, Renderer-, Navigations- oder Inhalts-Änderung).
- Sprachen: —
- Spiegel geprüft: nicht relevant · Wahrheits-Check: nicht relevant (kein DB-Write).
- Anmerkung: Links neu gruppiert in „Aktive Bausteine / Container", „Technische Reserve" (rich_v1, download_list_v1, contact_block_v1) und „Historisch / nicht mehr verwenden" (feature_grid_v1). Status-Hinweise im Detail erklären, warum `/kontakt` und `/downloads` trotz sichtbarer Inhalte 0× zählen. Doku-Korrekturen in `templates.md`, `section-typen-katalog.md`, `redaktions-uebergabe-und-prompt-regeln.md`.

### 2026-06-05 — B-028 Vorteile: feature_grid_v1 → cards_v1


- Auftrag: Sonderfall `feature_grid_v1` auf P-004 zurück in normales Kartenraster überführen.
- Betroffen: P-004 / `gebaeudekommunikation.tuersprechanlagen`, B-028 / `vorteile` (vier Kind-Karten unverändert).
- Art: Struktur (Section-Typ-Wechsel, keine Inhaltsänderung).
- Sprachen: —
- Spiegel geprüft: ja · Wahrheits-Check: ok (0 Kritisch).
- Anmerkung: `feature_grid_v1` aktiv nun 0x im CMS. Icons, Titel, Beschreibungen,
  Reihenfolge und Sichtbarkeit unverändert. Public: Vorteile-Bereich rendert als
  Standard-Kartenraster (4er-Reihe). Irreführende Admin-Warnung „Icon fehlt"
  entfällt, da `cards_v1` Lucide-Icons regulär unterstützt.


### 2026-06-05 — Protokoll angelegt

- Auftrag: Schlankes Redaktions-Änderungsprotokoll einführen.
- Betroffen: nur Doku (`docs/03-redaktion/`).
- Art: Doku/Prozess.
- Sprachen: —
- Spiegel geprüft: — · Wahrheits-Check: —
- Anmerkung: Erstanlage; keine Inhalts-, DB-, Renderer- oder
  Navigationsänderung.
