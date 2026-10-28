# Gesamt-Export CMS-Light (Datenpaket v3)

Stand: 2026-09-14. Betrifft nur TCS Web Neu / CMS-Light. Produktbasis, Remix,
Scantron, Übersetzungsläufe und Scheduler sind unberührt.

## Was der Export ist

Ein umfassender **logischer** Export der CMS-Light-Inhalte — inklusive nicht
veröffentlichter und inaktiver Zeilen, Sprachen, Navigation,
Medienzuordnungen, Whitelists und Konfigurationen.

Kein `pg_dump`, kein atomarer Snapshot, keine geprüfte Wiederherstellung. Der
Status steht im Dateinamen (`-UNVOLLSTAENDIG`) und in `manifest.json`.

## Bedienung

Redaktionsbereich → Tab „Snapshot/Export" → Abschnitt „Gesamt-Export".

1. Mit dem bestehenden Adminpasswort entsperren (kein Konto, keine E-Mail).
2. Optional „Umfang prüfen" — Zählerstände und letzte Änderung je Tabelle.
3. „Datenpaket herunterladen (.zip)" — mit Fortschritt und „Abbrechen".
4. Medien separat: `media/Download-Medien.ps1` unter Windows ausführen.

Ohne Freigabe wird **nichts** gelesen: keine Zeilen, keine Vollzahlen, keine
Struktur. Beim Öffnen des Tabs werden keine Bilder abgerufen. Der
Freigabewert bleibt nur im Arbeitsspeicher (nie Adresszeile, Browserspeicher
oder Protokoll). Läuft die Freigabe während des Exports ab, bricht der Lauf
ab — es entsteht kein halbfertiges Paket, das als Erfolg gilt.

## Serverseite

`supabase/functions/cms-snapshot-export/index.ts`

- Prüft auf **jeder** Anfrage die Freigabe über die bestehende Aktion
  `admin_session` von `cms-translation-run`. Keine zweite Auth-Wahrheit, kein
  eigenes Passwort, keine eigene Signatur. Timeout/Fehler → Abweisung
  (`admin_check_unavailable`, fail closed).
- Ursprungsprüfung wie im Übersetzungsdienst; `service_role` bleibt Server.
- Aktionen: `counts`, `rows`, `storage_inventory` (Seite oder `summary_only`),
  `schema`.
- Kein SQL, kein Tabellenname und keine Ziel-URL vom Client: nur Namen aus
  `EXPORT_TABLES`; alles andere → `table_not_allowed`.
- Paging per Keyset auf dem echten eindeutigen Schlüssel (`id`, `locale`,
  `cache_key`, `singleton`), Batch höchstens 1000.

### Exportierte Tabellen (23) mit Klassifikation

- **content**: `cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`,
  `cms_asset_translations`, `cms_navigation_nodes`,
  `cms_navigation_node_translations`, `cms_page_translations`,
  `cms_ui_strings`, `cms_ui_string_translations`, `cms_translation_unit_state`
- **config**: `cms_admin_editable_fields`, `cms_page_completion`,
  `cms_locales`, `cms_locale_translation_config`,
  `cms_translation_provider_rates`
- **operations**: `cms_translation_memory`, `cms_translation_autopilot`,
  `cms_translation_runs`, `cms_translation_jobs`,
  `cms_locale_visibility_audit`
- **cache**: `cms_translation_coverage_cache`,
  `cms_translation_coverage_locale_cache`

Beim späteren Zurückspielen dürfen `operations`/`cache` **niemals** automatisch
aktiviert oder abgearbeitet werden (Scheduler/Jobs bleiben aus).

### Nicht exportiert

`cms_provider_credentials`, `cms_provider_credential_audit`, Tresor/Geheimnisse,
`auth.*` (Konten, Passwörter), `user_roles`, `storage.*`-Metadaten
(Objektinventar wird separat gelesen). Die Ausschlüsse stehen im Manifest.

## Struktur (Live-DDL-Ersatz)

`public.rpc_internal_cms_schema_snapshot()` — additive, rein lesende Funktion,
`SECURITY INVOKER`, fester `search_path`, Umfang nur `public.cms_*` ohne
Zugangsdatentabellen. `EXECUTE` ist für `PUBLIC`, `anon` und `authenticated`
entzogen, nur `service_role` darf ausführen. Quelltexte von Funktionen mit
`secret|credential|vault|password` im Namen werden bewusst nicht ausgegeben.
Ergebnis liegt als `schema/live-schema.json` im Paket; die Migrationsdateien
sind ausdrücklich nur Historie.

## Medien

- `storage_inventory` liest **alle** Objekte im Bucket `cms-assets`, auch
  unreferenzierte, mit Pfad, Größe, MIME, Zeitpunkt und öffentlicher URL.
  Seit 2026-09-14 **ohne rekursiven Ordnerdurchlauf**: gelesen wird über die
  rein lesenden, nur für `service_role` ausführbaren Funktionen
  `public.rpc_internal_storage_inventory_page(p_after, p_limit)` (Keyset-Seite,
  höchstens 1000 Objekte) und `public.rpc_internal_storage_inventory_summary()`
  (echtes SQL-Aggregat: Anzahl, Gesamtgröße, letzte Änderung). Beide sind
  `SECURITY INVOKER` mit festem `search_path`; `EXECUTE` ist `PUBLIC`, `anon`
  und `authenticated` entzogen. Am Storage-Schema, an Policies und an den
  Dateien wurde nichts geändert. Grund der Umstellung: der alte Ordnerdurchlauf
  lief bei 1.413 Objekten in die 150-Sekunden-Grenze der Edge Function
  („Request idle timeout limit (150s) reached") und machte das Datenpaket
  unvollständig.
- Bucket und Umfang sind serverseitig festgelegt; der Client wählt weiterhin
  keinen Pfad und keinen Bucket. Jede Serveranfrage bleibt kurz, der Client
  sammelt die Seiten. Ein hängender oder doppelter Cursor, ein erschöpftes
  Seitenlimit und jeder Serverfehler sind Fehler und setzen `truncated` —
  keine stille Teilmenge. `summary_only` nutzt das Aggregat und läuft **nicht**
  erneut durch die Objektliste.
- Gezählt und geliefert werden **alle** Objekte des festen Buckets, auch solche
  mit fehlender oder unbrauchbarer Größenangabe. Eine fehlende Größe wird nie zu
  `0`: das Objekt behält eine leere Größe, wird in `invalid_size_count` gezählt,
  erzeugt einen Fehler in Seite und Summe und landet als „Groesse fehlt oder ist
  ungueltig" in `unsafe_paths` — das Paket kann damit nicht „vollständig" sein.
- Bestandsmessung 2026-09-14 (SQL, ohne Filter): 1.413 Objekte, davon 0 mit
  unbrauchbarer Größe, 1.706.155.287 Bytes, letzte Änderung 13:21:41 UTC.
- Vor- und Nachzählung werden über Anzahl, Gesamtgröße **und** letzte Änderung
  verglichen — im Datenpaket (Inventar gegen Nachzählung) und im Medienpaket
  (Vorzählung gegen Nachzählung). Fehler oder Abschneidung der Vorzählung
  bedeuten „unvollständig", eine echte Abweichung bedeutet „MIT-HINWEISEN".
- Keine Binärdaten im Browser: das Paket enthält Manifest, CSV und
  `Download-Medien.ps1` (Windows). Das Skript behandelt das Manifest als
  **nicht vertrauenswürdig**: Zielpfade werden erneut geprüft (kein `..`, keine
  Laufwerke, keine Windows-Gerätenamen, keine abschließenden Punkte/Leerzeichen,
  keine Groß-/Kleinschreibungs-Dubletten, keine Verknüpfungen/ReparsePoints),
  der Zielordner liegt immer relativ zu `$PSScriptRoot` und wird mit
  Verzeichnistrenner abgesichert (kein Ausbruch in Geschwisterordner).
  Heruntergeladen wird ausschließlich vom exakten eigenen, öffentlichen
  Speicheranfang; Weiterleitungen sind verboten (`-MaximumRedirection 0`),
  mit Zeitgrenze und begrenzten Wiederholungen. Geprüft wird die **gesamte
  Vorfahrenkette inklusive Zielwurzel** auf Verknüpfungen — nicht nur der
  unmittelbare Ordner. Geladen wird in eine garantiert **neu** angelegte
  Zwischendatei (`CreateNew`, Zufallsname); vorhandene Dateien oder
  Verknüpfungen werden nie überschrieben, das Umbenennen läuft ohne `-Force`.
  Erst nach Größenprüfung gegen das Manifest wird die Zieldatei gesetzt. Beim
  Erstdownload berechnet das Skript den SHA256 selbst und speichert ihn für die
  Wiederaufnahme im lokalen Protokoll; ohne Serverhash im Manifest findet kein
  Hashvergleich gegen das Manifest statt. Fehlende, leere, boolesche, negative
  oder krumme Größenangaben sind ein Fehler und umgehen keine Prüfung.
  Manifestpfade werden zusätzlich auf Kontrollzeichen
  geprüft, und die internen Protokoll-/Manifestnamen sind reserviert, damit
  kein Medienobjekt sie überschreibt. Adressen müssen exakt auf Schema, Host
  und Bucket passen; `..`, kodierte Ausbrüche (`%2e`, `%2f`, `%5c`), Query und
  Fragment werden abgelehnt.
- **Lange Windows-Pfade (Befund vom echten Lauf 2026-09-14):** Windows
  PowerShell 5.1 kann Pfade über MAX_PATH (260 Zeichen) nicht anlegen oder
  umbenennen; ein Objektname mit 269 Zeichen Gesamtpfad brach den Lauf nach 6
  geladenen Dateien mit „Ein Teil des Pfades konnte nicht gefunden werden"
  (`Move-Item`) ab. Das Skript prüft deshalb **vor dem ersten Download** alle
  Zielpfade: läuft es unter 5.1 und wäre ein Pfad zu lang, bricht es sofort ab
  (Exitcode 2), lädt nichts und nennt Anzahl, längsten Pfad, ein Beispiel und
  die nötige Verkürzung. Zwei Auswege werden ausgegeben: PowerShell 7 nutzen
  (`pwsh -File .\Download-Medien.ps1 …`, unterstützt lange Pfade) oder das
  Paket kürzer entpacken (z. B. `C:\tcs`) und ein kurzes `-Ziel` wählen. Es
  wird **nichts** an Registry oder System geändert (kein `LongPathsEnabled`).
  Empfehlung für diese Sicherung: **PowerShell 7**.
- **Wiederaufnahme:** Das Protokoll wird nach **jeder** fertigen Datei und nach
  jedem Fehler atomar geschrieben (`.json.new` → `.json.bak`-Sicherung →
  Umbenennen), beim Lesen notfalls aus der Sicherung wiederhergestellt. Ein
  Abbruch (Strg+C) läuft über `try/finally` und verliert keine bereits
  geprüften Hashes — ein erneuter Start überspringt sie. Übersprungen wird nur
  bei identischem Objektpfad **und** identischer Adresse **und** passender
  Größe **und** zum lokal protokollierten SHA256. Die gesamte bereits
  vorhandene Vorfahrenkette bis zur Laufwerkswurzel wird vor jeder
  Verzeichniserstellung und vor jedem Protokollschreiben geprüft; ein
  Protokollschreibfehler beendet den Lauf als Fehler. Protokoll als JSON **und** CSV. Ein
  leeres/ungültiges Manifest sowie Inventarfehler/unsichere oder doppelte Pfade
  sind niemals ein Erfolg (Exitcode 2). Keine Schlüssel; der einzige
  Löschbefehl entfernt die eigene Zwischendatei, niemals den Zielordner.
- Externe Medienquellen (z. B. `image.jimcdn.com`, `www.tcsag.de`) stehen
  getrennt in `externe-medien.csv` und sind **nicht** gesichert. Es gibt keinen
  serverseitigen Proxy für beliebige URLs. Storage-Rechte bleiben unverändert;
  für nicht-öffentliche Objekte wird nichts geöffnet.

## Manifest v3 und Statuslogik

Datum, Umfang, Zählerstände vor/nach Export, Änderungsmarker, Prüfungen,
Ausschlussliste, Medieninventar-Kennzahlen (inkl. Nachzählung), nicht
abgedeckte `cms_*`-Tabellen, Fehlerliste, `status_reasons` und SHA256 je Datei.
Keine hartcodierten „known totals".

Drei Statuswerte, im Dateinamen erkennbar:

| Status | Dateiname | Bedeutung |
| --- | --- | --- |
| `complete` | ohne Zusatz | keine Befunde |
| `changed` | `-MIT-HINWEISEN` | gelesen, aber Änderungen/unklare Nachzählung/nicht abgedeckte Tabellen |
| `incomplete` | `-UNVOLLSTAENDIG` | Fehler, fehlende Eltern, Medienprobleme |

`complete` ist nur möglich, wenn auch die **Nachzählung** je Tabelle vorliegt
und stimmt. Fehlende, fehlerhafte oder abweichende Nachzählung, unklare
Medien-Nachzählung sowie Fehler oder Abschneidung in dieser Nachzählung,
Inventarfehler/-abschneidung, unsichere oder doppelte
Medienpfade, nicht gelesene Tabellen und leere/unplausible Serverantworten
führen nie zu „vollständig".

Geprüft werden die **13 echten** Fremdschlüssel im Exportumfang, darunter die
Selbstbezüge `cms_sections.parent_section_id`, `cms_navigation_nodes.parent_id`,
der zusammengesetzte Schlüssel
`cms_section_fields.(page_key,section_key) → cms_sections.(page_key,section_key)`
und alle fünf `locale → cms_locales.locale`-Bezüge. Fehlt eine Tabelle im
Paket, wird die Beziehung als „nicht geprüft" gemeldet, nicht still
übersprungen. Es werden keine Beziehungen erfunden.

## Abbrechen

Das Abbruchsignal geht durch **jeden** Netzaufruf (inklusive der Wiederhol-
pausen), durch Struktur- und Inventarphase und durch den ZIP-Bau. Ein Abbruch
ist sofort endgültig: kein Paket, kein Download. Sperren oder das Verlassen des
Bildschirms brechen einen laufenden Export ebenfalls ab.

## Geprüft

- `unentsperrt` → 401 `admin_unlock_required`, keine Daten (auch `schema` und
  `storage_inventory`/`summary_only`).
- gefälschtes/abgelaufenes Token → 401 `admin_session_invalid`, keine Daten;
  greift auch vor der Tabellenprüfung.
- fremder Ursprung → 403 `origin_not_allowed`.
- Metadaten-RPC als `anon` → `42501 permission denied`.
- Tests: `src/features/admin/api/__tests__/cmsFullExport.test.ts` (61) —
  Freigabepflicht, Ausschlussliste, exakt gepinnte Client-Version, Batchgrenze,
  Paging über 1000 Zeilen, hängender Cursor, Schleifenlimit, Wiederholungen,
  Abbruch-Weitergabe an Netzaufrufe/Wartezeiten/ZIP, Statuslogik (complete /
  changed / incomplete), Plausibilitätsprüfung der Serverantworten, nicht
  abgedeckte Tabellen, alle 13 Fremdschlüssel inkl. Selbst- und
  Verbundschlüssel, Pfad-Traversal und Windows-Gerätenamen, Manifest-Härtung im
  Downloader, CSV-Serialisierung.
- Neu abgedeckt: Paging über 1000 Medienobjekte, `summary_only` ohne Objektliste,
  Serverfehler/Abschneidung, hängender und doppelter Cursor, Abbruch im Paging,
  Medienpaket liest nur `cms_assets`.
- Negative Live-Prüfung nach Umstellung: ohne Freigabe 401, gefälschte Freigabe
  401, fremder Ursprung 403, beide Inventar-RPCs als `anon` `42501 permission
  denied`.
- Pfadlängenprüfung: eigener Test (Reihenfolge vor der Schleife, keine
  Registry-Änderung, beide Auswege in der Meldung).
- Vor-/Nachvergleich: eigene Tests für Vorzählungsfehler, Abschneidung,
  abweichende Anzahl/Bytes/letzte Änderung und für Objekte ohne gültige Größe.
- Gesamtlauf: 441 Tests grün, Typprüfung grün, Bau grün.

## Offene Grenze

Ein **positiver** Ende-zu-Ende-Export wurde von Lovable nicht ausgeführt: das
Adminpasswort liegt ausschließlich als Servergeheimnis vor. Bitte einmal im
Redaktionsbereich entsperren und das Paket herunterladen; `manifest.json` →
`status` muss `complete` sein.

## Nur Medienpaket

Wenn nur das Medieninventar gefehlt hat, muss **nicht** alles neu gelesen
werden. Der Knopf „Nur Medienpaket herunterladen (.zip)" (gleiche Freigabe,
gleicher Ursprungsschutz) liest ausschließlich:

- das Medieninventar per Keyset-Paging,
- die Mediensumme vor und nach dem Lesen,
- die Tabelle `cms_assets` für Zuordnung und externe Referenzen.

Das Paket enthält `media/media-manifest.json`, `media/media-objekte.csv`,
`media/externe-medien.csv`, `media/Download-Medien.ps1`, `media/LIESMICH.md`,
`manifest.json` (SHA256 je Datei, Status, Vor/Nach-Summen) und `README.txt`.
Es enthält keine Tabellen, keine Struktur und keine Bilddateien — die
Bilddateien lädt das PowerShell-Skript. Ein bereits heruntergeladenes,
unvollständiges Datenpaket bleibt unverändert gültig; das Medienpaket ist
ausschließlich die Ergänzung. Statuslogik und Dateinamens-Suffixe sind dieselben
wie beim Datenpaket.

## Bedienung im Export-Tab

Hauptweg ist der geschützte **Gesamt-Export (Datenpaket v3)** oben im Tab. Der
alte Export bleibt erhalten, steht aber darunter als eingeklappter Bereich
„Alter Export v2: nur öffentliche Inhalte" und lädt/zählt erst nach
ausdrücklichem Öffnen — beim Öffnen des Tabs passiert nichts.
