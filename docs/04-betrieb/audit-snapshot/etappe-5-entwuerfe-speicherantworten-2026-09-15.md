# Etappe 5 — Redaktionelle Entwürfe und Speicherantworten (2026-09-15)

Scope: **nur Frontend** (`src/features/admin/components/EditableField.tsx`,
Kommentarkorrektur in `src/features/admin/api/cmsAdminWrite.ts`, neue Tests, Doku).
**Keine** DB-, Inhalts-, Rechte- oder Auth-Änderung, keine Migration, kein
Übersetzungslauf, kein Deployment, keine Veröffentlichung. Der Stand aus
Etappe 4C/4D bleibt unverändert.

## Behobene Fehlverhalten (alle vorher belegt rot)

1. **Stilles Überschreiben:** Eine Serverauffrischung derselben Feldidentität
   überschreibt einen ungespeicherten Entwurf nicht mehr. Der abweichende
   Serverwert erscheint als sichtbarer Konflikthinweis mit zwei ausdrücklichen
   Entscheidungen („Neueren Text übernehmen" / „Meinen Entwurf behalten").
2. **Entwurfs-Übertrag beim Seitenwechsel:** Der Editorzustand hängt jetzt
   eindeutig an `pageKey + sectionKey + fieldKey + locale`. Bei Identitätswechsel
   wird bereits im laufenden Render zurückgesetzt — auch bei identischem
   Ausgangswert.
3. **Status während des Speicherns:** Weiteres Tippen setzt den Status nicht mehr
   auf „idle"; der Speichern-Knopf bleibt für die laufende Anfrage gesperrt, ein
   zweiter Save ist nicht möglich.
4. **Späte Antwort nach Feldwechsel:** Antworten werden nur übernommen, wenn
   Identität **und** Anfragennummer noch passen; ein neues Feld zeigt nie
   fälschlich „Gespeichert.".
5. **Falsche Erfolgsmeldung:** Der Erfolg gilt nur für den abgeschickten Wert.
   Wurde zwischenzeitlich weitergetippt, meldet die UI „Gespeichert — Ihr neuerer
   Text ist noch nicht gespeichert." und der Entwurf bleibt ungespeichert.
6. **Rückruf nach Ausbau:** Nach dem Ausbau der Komponente wird `onSaved` nicht
   mehr aufgerufen; ein fremder Reload kann so nicht ausgelöst werden.

Zusätzlich: Fehler **und** Ausnahmen im Schreibpfad werden verständlich gemeldet;
verspätete Übersetzungsvorschläge werden nach einem Feldwechsel verworfen; der
an die Übersetzungsknöpfe gereichte DE-Wert entspricht immer dem sichtbaren
Entwurf. Whitelist-Sperren, Icon-Auswahl und DE/EN/PL-Ansichten sind unverändert.

## Kommentarkorrektur (kein SQL geändert)

`rpc_admin_update_section_field` führt am Livestand ein
`INSERT ... ON CONFLICT ... UPDATE` aus und setzt `review_status = 'geprueft'`.
Die früheren Kommentare („nur UPDATE", „keine Statusänderung") waren **falsch**
und sind in `EditableField.tsx` und `cmsAdminWrite.ts` korrigiert. Das SQL selbst
wurde in dieser Etappe **nicht** angefasst.

## Nachweise

- Neue Testdatei `src/test/editableFieldDrafts.test.tsx`: 16 Verhaltenstests an
  der echten `EditableField`-Komponente (gemockt nur `saveSectionField`,
  IconPicker, IconResolver, CMS-Client für die Übersetzungsantwort). Geprüft
  werden Ergebnisse und Aufrufargumente, nicht Quelltextstellen. Es wird kein
  echter Übersetzungsdienst aufgerufen und kein produktiver Wert geschrieben.
- Gesamtsuite: **613 Tests in 48 Dateien grün**.
- `npm run cms:preflight`: **Exitcode 0** (Typprüfung, Tests, i18n-Vertrag, Build).
- Lesende Admin-Vorschau im Browser (`/admin?lang=de`, Startseite, Block „Hero"):
  Baum und Arbeitsbereich laden, 14 Feldeditoren mit echten Werten sichtbar,
  Whitelist-Sperre („Gesperrt (Whitelist aus)") weiterhin sichtbar, keine
  Seitenfehler. **Nichts gespeichert.**

## Weiterhin offen (nicht behoben)

- **Keine serverseitige Konfliktprüfung / kein CAS.** Der Konfliktschutz ist rein
  clientseitig gegen den zuletzt gelesenen Wert. Zwei parallele Redaktionen
  können sich weiterhin serverseitig überschreiben.
- **Kein Readback** des geschriebenen Werts; „Gespeichert." beruht auf der
  RPC-Antwort, nicht auf einem erneuten Lesen.
- **NL/DA im Feldeditor fehlen** — der Editor kennt nur DE/EN/PL.
- **`image_position` und die Sammel-Aktionen (Bulk)** bleiben ein eigener
  Schreibpfad ohne Entwurfs-/Konfliktschutz.
- **Offene CMS-Schreibrechte** (`rpc_admin_*` für `PUBLIC`/`anon`/`authenticated`)
  und **kein Login/Rollenmodell für `/admin`** — unverändert offen.
- Browserprüfung nur lesend und nur an einer Seite; flächige Abnahme offen.

## Nachbesserung 5.1 (2026-09-15) — Gegenprüfung A/B/C/D

Vier weitere reale Kombinationen aus der Gegenprüfung sind behoben; Umfang blieb
Bedienoberfläche (`EditableField.tsx`), kein SQL, kein Inhalt, keine Freigabe.

- **A) Rückkehr A → B → A.** Identität allein genügte nicht: nach der Rückkehr
  stimmte `identityRef` wieder, und eine alte Antwort wurde übernommen. Neu gibt
  es einen **Besuchszähler**: `EditableField` bildet ein Besuchstoken
  `<seite>::<baustein>::<feld>#<besuch>`, das bei **jedem** Identitätswechsel
  hochzählt und an die Editoren gereicht wird. Alte Save-Antworten und alte
  Übersetzungsvorschläge gehören damit nachweisbar zum alten Besuch und werden
  verworfen. Nach echtem Ausbau erscheint auch keine Erfolgsmeldung mehr für
  einen angeblich eingefügten Vorschlag.
- **B) Separater Inflight-Latch.** Der Speicherlauf hängt nicht mehr am
  UI-Status `save`, sondern an einem eigenen Feld `pending` plus synchronem
  `inflightRef`. Weder Prop-Refresh noch Übersetzungsvorschlag noch
  Konfliktknopf setzen ihn zurück — nur die passende abgeschlossene Anfrage oder
  ein Identitätswechsel. Doppelklicks im selben Ereigniszyklus fängt der Latch
  synchron ab.
- **C) Späte Vorschläge zerstören keinen neueren Text.** Ist das Zielfeld
  zwischenzeitlich bearbeitet worden oder läuft ein Save, wird der Vorschlag
  **separat angeboten** („Vorschlag einfügen" / „Vorschlag verwerfen") statt den
  sichtbaren Text zu ersetzen. Ändert sich der deutsche Quelltext während der
  Übersetzung, wird der Vorschlag sichtbar verworfen — keine falsche
  Erfolgsmeldung.
- **D) Konflikt blockiert stilles Speichern.** Bei unbeklärtem Serverkonflikt ist
  „Speichern" gesperrt (mit Hinweis); es bleiben die beiden bewussten
  Entscheidungen. „Neueren Text übernehmen" entsperrt eine laufende Anfrage
  nicht. Das ist **kein** serverseitiger CAS-Schutz — der fehlt weiterhin.

Nachweise 5.1: `src/test/editableFieldDrafts.test.tsx` jetzt **28 Tests**
(16 aus Etappe 5 unverändert + 12 neue zu A/B/C/D, inkl. Varianten Seite /
Baustein / Feld mit späterer Rückkehr). Gesamtsuite **625 Tests in 48 Dateien
grün**, `npm run cms:preflight` **Exitcode 0**. Kein echter KI-Aufruf, kein
DB-Schreibtest, keine Testlockerung.

## Nachbesserung 5.2 (2026-09-15) — Zielzustand beim Übersetzungsstart

Belegter Restfall: Wurde das EN-Feld während einer laufenden Übersetzung von
Hand geändert **und erfolgreich gespeichert**, war der Entwurf danach nicht mehr
„dirty" — der späte Vorschlag hat den gespeicherten Text still ersetzt.
„Zwischenzeitlich bearbeitet" ist ausdrücklich nicht dasselbe wie „bei Antwort
gerade noch ungespeichert".

Reparatur (nur Bedienoberfläche, kein SQL, kein Inhalt, keine Freigabe):

- `TranslateButton` liest über `readTargetBaseline()` den sichtbaren Zielwert
  **im Moment des Klicks** und reicht ihn als `baseline` an `onTranslated`
  weiter; `ExternalSuggestion` trägt diese `baseline` mit.
- Der Editor bietet den Vorschlag separat an, wenn `pending`, ein offener
  Entwurf **oder** `value !== baseline` gilt. Damit sind auch ein
  zwischenzeitlich gespeicherter eigener Wert und eine Serverauffrischung des
  Zielwerts abgedeckt. Bestehender Identitäts-, Besuchs-, `dirty`- und
  Inflight-Schutz bleibt unverändert.
- Ein von Anfang an unverändertes, sauberes Zielfeld erhält den Vorschlag
  weiterhin automatisch.
- `EditableField` hält die sichtbaren Zielwerte in `enLiveRef`/`plLiveRef`
  (kein zusätzliches Rendern); gesperrte Zielspalten nutzen den Serverwert.

Wahrheitskorrektur: Der Erfolgstoast meldet nicht mehr „Vorschlag eingefügt",
sondern neutral zutreffend `„<Sprache>-Vorschlag liegt vor — bitte prüfen und
speichern."` Ob eingesetzt oder nur angeboten wird, entscheidet das Zielfeld.

Nachweise 5.2: `src/test/editableFieldDrafts.test.tsx` jetzt **31 Tests**
(28 unverändert + 3 neue: Ziel geändert und gespeichert während der Anfrage,
Ziel per Serverauffrischung geändert, unverändertes Zielfeld). Gesamtsuite
**628 Tests in 48 Dateien grün**, `npm run cms:preflight` **Exitcode 0**,
Build OK. Kein echter KI-Aufruf, kein DB-Schreibtest, keine Testlockerung.

Offene Punkte unverändert: kein serverseitiges CAS, kein Readback, NL/DA im
Feldeditor fehlen, `image_position`/Bulk eigener Schreibpfad, offene
CMS-Schreibrechte und fehlendes Login für `/admin`.
