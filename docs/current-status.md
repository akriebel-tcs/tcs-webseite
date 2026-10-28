# Aktueller Stand

Stand dieser Datei: 2026-09-15 (Nachtabschluss Doku/Hilfe).

Führende Regelquelle bleibt das Dachdokument
[`03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](./03-redaktion/redaktions-uebergabe-und-prompt-regeln.md),
Abschnitt 2 (Prompt-Schablone) und Abschnitt 11 (verbindlicher Arbeitsablauf).
Diese Datei ist nur Status, keine zweite Regelquelle.

**Kein Gesamtgrün, kein „alles sicher".** Es gibt keine flächendeckende
Abnahme. Ungeprüft heißt offen.

## 1. Heutiger Stand je Etappe

| Etappe | Was nachgewiesen ist | Was ausdrücklich fehlt |
| --- | --- | --- |
| 1 — Arbeitseinstieg / Promptregeln | Dachdokument mit Abschnitt 2 + 11 vorhanden, Statusdateien entwidersprucht | Lesen ist **angewiesen, nicht technisch erzwungen** |
| 2B — Bedientext-Katalog | Additiver Import ausgeführt: **422 Quellen / 1672 Übersetzungen**, davon **8 Quellen + 26 Übersetzungen neu**; vorhandene Zeilen unverändert, 0 Übersetzungsaufträge | Keine Sprachabnahme, neue Startwerte unkuratiert (`maschinell`), DA ohne Startwert |
| 3A — vollständige Seitenkopie | SQL installiert (`20260915001300_…`), Quell-/Ziel-Zuordnung geprüft, atomarer Abbruch im Fehlerfall getestet, Readback bytegleich | Keine produktive Testkopie, keine Live-/Nebenläufigkeitsabnahme; historisches `duplicate_section` und andere Altwege sind **nicht** als repariert nachgewiesen |
| 3B — Teilbaumkopie (`rpc_admin_paste_section`) | SQL installiert (`20260915005640_…`), Unterbaum/Felder/Medien/Whitelist geprüft, Zyklus- und Abbruchtests, Readback bytegleich | wie 3A; Umsortieren/Verschieben/Löschen nicht gegen gleichzeitiges Einfügen gesperrt |
| 4A — gemeinsamer Seitenleser | Lade-/Ergebniszustand seitengebunden, späte Antworten wirkungslos, Fehler statt Teilmenge, eindeutige Sortierung, nur erreichbare Bausteine | Nur Code/Preview, **nicht veröffentlicht**; keine Momentaufnahme-Garantie der Datenbank |
| 4B/4C — CTA/FAQ am Seitenende | Genau eine Ausgabe je Block, auch bei reinen Teilbaum-Aktualisierungen | Restgrenze: für einen von React vor dem Commit verworfenen Render-Versuch ist die Bereinigung eines vorläufigen Eintrags **nicht** nachgewiesen (Concurrent/Suspense) |
| 5 — Feldeditor (Entwürfe/Speicherantworten) | Zustand an Seite+Baustein+Feld+Sprache gebunden; Entwurf wird nicht still überschrieben, Konflikt sichtbar mit zwei Entscheidungen; ein Speicherlauf je Zeit; Erfolg nur für den abgeschickten Wert; späte Antworten/Übersetzungsvorschläge wirken nicht ins neue Feld; Vorschlag bei geändertem Ziel nur separat angeboten | **Reiner UI-Schutz.** Kein serverseitiger Versionsvergleich (kein CAS), **kein** Readback des geschriebenen Werts; NL/DA im Feldeditor fehlen; `image_position`/Sammelaktionen eigener Schreibpfad |

Nachweise (Etappe 5, unabhängige Gegenprüfung): **45 Tests bestanden**
(14 eigene + 31 Projekt), Commit `b349bbdf77ae780aad2852df6e8ac587595b84e5`.
Nachweise 4A/4B/4C (unabhängige Gegenprüfung): **61 Tests bestanden**
(11 eigene Tail + 19 Projekt Tail + 10 eigene Leser + 21 Projekt Leser);
Sichtprüfung `/anwendungen/pflege` DE = 18 Überschriften, Kontaktlink, Bild;
`/produkte` DE/NL = 3 Links, 3 Bilder. **Keine flächenweite Abnahme.**

`npm run cms:preflight` (Typprüfung → Tests → `i18n:contract` → Build) ist die
lokale Codeprüfung und ersetzt **keine** Datenbank-, Sicherheits- oder
Browserabnahme.

## 2. Offene Kernpunkte (priorisiert)

1. **Offener Schreibzugriff:** `/admin` ohne Login/Rollenmodell; `rpc_admin_*`
   für `PUBLIC`/`anon`/`authenticated` ausführbar, `cms-translate-field` ohne
   Caller-Prüfung.
2. **Kein serverseitiger Versionsvergleich** beim Speichern und **keine
   Mehrfeldtransaktion** über die getrennten RPCs — parallele Redaktion kann
   sich weiterhin überschreiben.
3. **NL/DA an einzelnen Editor- und API-Stellen gesperrt** (Feldeditor kennt
   DE/EN/PL); Zielumfang bleibt DE, EN, PL, NL, DA aus `cms_locales`.
4. **fehlend / leer / verborgen / Ladefehler** sind noch nicht flächenweit
   unterscheidbar.
5. **Statische Fallbacks und getrennte Schemata/Altleser** bestehen weiter
   (dokumentierter Übergang, nicht zweite Redaktion).
6. **Vollständig durchgängiger DE-Pilot fehlt** — es gibt keinen Nachweis über
   die ganze Kette Datenbank → Admin → Vorschau.
7. **Concurrent/Suspense-Restgrenze des Render-Registers** (siehe Tabelle,
   4B/4C) bleibt offen.
8. Historische Juni-2026-Nullwerte (Wahrheits-Check, Coverage, Spiegel-Audit,
   FAQ/CTA, Public-Blocks) sind **seither nicht neu gemessen** und gelten als
   ungeprüft.

## 3. Nächste fachliche Etappe

**Ein** abgegrenzter deutscher Pilot mit einer Nachweismatrix
Datenbank → CMS → Vorschau für: Ändern, Kopieren, Verschieben,
Leeren/Ausblenden, Medien/Links. Ausdrücklich **keine** Massenmigration und
**keine** Löschung von Altlasten. Zugangssicherung wird **separat** geklärt,
ohne die bestehende Redaktion auszusperren. Remix, Scantron und die
Produktbasis bleiben unangetastet.

## 4. Sicherung / Backups

Die vorhandenen Übergabestände sind **logische Exporte plus Medien**:

- Codebase-ZIP (manueller Download aus Lovable),
- Master-Snapshot V2 (älterer CMS-Light-Stand, `rls_public_only`),
- Full-Export V3 vom 14.09.2026 20:27 UTC mit 23 Tabellen / 393.325 Zeilen,
- separates Ergänzungspaket mit 1.413 lokal gesicherten Medien sowie
  technischen Definitionsnachweisen (u. a. SQL-/Funktionsnachweise — die
  Aussage „keine RPC-Körper" gilt daher nicht pauschal).

Diese Zahlen stammen aus der unabhängigen Backup-Prüfung **vor** der
Nachtarbeit und wurden hier **nicht** neu verifiziert.

Das ist weiterhin **kein vollständig getesteter PostgreSQL-Restore**: kein
vollständiger `pg_dump`, kein transaktional einheitlicher Zeitpunkt, kein
vollständiger Export von `auth.*` / Vault / `storage.*` / Systemobjekten, keine
geprobte Wiederherstellung.

## 5. Historie und Belege

- Vollständige Vorfassung dieser Datei (mit allen Zwischenständen der Nacht,
  Wortlaut unverändert):
  [`archiv/status-historisch/current-status-bis-2026-09-15.md`](./archiv/status-historisch/current-status-bis-2026-09-15.md)
  — SHA256 `6e196efb785ed385dafcb9163021cb82926a4bb7c1a084dd592afc52f1894c05`.
- Ältere Fassungen:
  [`archiv/status-historisch/current-status-bis-2026-09-14.md`](./archiv/status-historisch/current-status-bis-2026-09-14.md),
  [`archiv/status-historisch/current-status-bis-batch26.md`](./archiv/status-historisch/current-status-bis-batch26.md).
- Technischer Status (Ampeln auf Messdatum 2026-06-04 datiert):
  [`04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](./04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md).
- Etappenberichte: [`04-betrieb/audit-snapshot/`](./04-betrieb/audit-snapshot/),
  u. a.
  [`etappe-4b-seitenendbloecke-2026-09-15.md`](./04-betrieb/audit-snapshot/etappe-4b-seitenendbloecke-2026-09-15.md)
  und
  [`etappe-5-entwuerfe-speicherantworten-2026-09-15.md`](./04-betrieb/audit-snapshot/etappe-5-entwuerfe-speicherantworten-2026-09-15.md).
- SQL-Entwürfe und Vertragsbefunde:
  [`04-betrieb/sql-entwurf-seitenkopie-2026-09-14.md`](./04-betrieb/sql-entwurf-seitenkopie-2026-09-14.md),
  [`04-betrieb/sql-entwurf-baustein-kopie-2026-09-15.md`](./04-betrieb/sql-entwurf-baustein-kopie-2026-09-15.md),
  [`04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md`](./04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md).
- Übersetzungs-Arbeitsbereich, Polnisch-Pilot, Freeze-Lesart und der
  Juni-2026-Abnahmestand: nur noch in der Archivfassung oben sowie in
  [`04-betrieb/uebersetzungswerkzeug.md`](./04-betrieb/uebersetzungswerkzeug.md),
  [`04-betrieb/uebersetzungs-automatik.md`](./04-betrieb/uebersetzungs-automatik.md)
  und
  [`04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md`](./04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md).
- Migrations- und Änderungsprotokoll: [`migration-log.md`](./migration-log.md).
