# Gemeinsamer Sprachkatalog: Seiteninhalte + Bedienungstexte

Stand: 2026-09-12 · Projekt `TCS-webseite_db_cms` (CMS-Light) · Etappe 2 des
Auftrags „ein Sprachvertrag, ein Übersetzungswerkzeug".
Der zuvor stabilisierte Statuscache bleibt unverändert und wird weitergenutzt.

## 1. Was neu ist

Bis jetzt kannte das Übersetzungswerkzeug nur redaktionelle CMS-Inhalte. Die
wiederverwendbaren Bedienungstexte der Oberfläche (Schaltflächen, Filter,
Sortierung, Merkliste, Leer- und Fehlerzustände) lagen ausschließlich als
mitgelieferte Sprachdateien im Code und fielen deshalb aus Prüfung, Zählung und
Lauf heraus.

Jetzt gilt: **eine Menge, ein Werkzeug**. Bedienungstexte sind als eigener
Bereich `ui_string` Teil derselben Übersetzungseinheiten wie Seiteninhalte —
in Vorschau, Planung, Statuszählung, Textliste und Lauf.

## 2. Datenbankobjekte (additiv, wiederholbar)

| Objekt | Zweck |
| --- | --- |
| `cms_ui_strings` | Katalog der deutschen Bedienungstexte: `namespace`, `string_key`, `source_text`, `source_hash`, `is_active`, `manifest_version` |
| `cms_ui_string_translations` | Zieltexte je Sprache (`ui_string_id`, `locale`, `value`) |
| `cms_translation_units(...)` | erweitert um den Bereich `ui_string` (gemeinsame Einheitenmenge) |
| `rpc_admin_sync_ui_strings(jsonb)` | wiederholbarer Abgleich mit dem Manifest |
| `rpc_public_read_ui_strings(text)` | öffentliches Lesen der Zielsprache (DB-first zur Laufzeit) |
| `rpc_admin_locale_release_readiness(text)` | Freigabereife: offene Seiteninhalte **und** offene Bedienungstexte |
| `rpc_admin_update_translation_unit(...)` | erweitert: Bedienungstexte von Hand speichern (Status „geprueft") |
| `rpc_internal_apply_machine_unit(...)` | erweitert: maschinelles Ergebnis für Bedienungstexte, schützt geprüfte Werte |
| `cms_autopilot_trg_ui_strings()` + Trigger | neue/geänderte deutsche Bedienungstexte werden vorgemerkt |
| Trigger auf beiden Tabellen | Sprachstands-Übersicht wird nach Änderungen neu berechnet |
| `cms_translation_jobs_area_chk` | erlaubt zusätzlich `ui_string` |

Rechte (gemessen 2026-09-12, Korrekturprüfung): Beide Tabellen haben RLS ohne
öffentliche Regeln; Zugriff läuft nur über die geprüften Funktionen. Alle
Funktionen haben festen `search_path` und **keine** Rechte für `PUBLIC`.
Ausführungsrechte im Einzelnen:

| Funktion | anon | authenticated | service_role |
| --- | --- | --- | --- |
| `rpc_admin_sync_ui_strings(jsonb)` | nein | nein | ja |
| `cms_autopilot_trg_ui_strings()` | nein | nein | ja |
| `rpc_internal_*` (Abdeckung, Maschinenweg) | nein | nein | ja |
| `rpc_public_read_ui_strings(text)` | ja | ja | ja |
| `rpc_admin_locale_release_readiness(text)` | ja | ja | ja |

Der Abgleich des Katalogs ist damit kein Frontend-Weg mehr (siehe Abschnitt 3).

## 3. Manifest und CI

- Umfang/Ausschlüsse: `scripts/i18n/ui-catalog.config.json`
- Manifest erzeugen/prüfen: `scripts/i18n/ui-catalog-manifest.mjs`
  (`npm run i18n:ui-catalog`, `npm run i18n:ui-catalog:check`)
- Abgleich in die Datenbank: `npm run i18n:ui-catalog:sync` — läuft
  **ausschließlich** über den geschützten Serverdienst `cms-translation-run`
  (`action: "sync_ui_catalog"`) und verlangt das serverseitige Freigabewort
  `CMS_TRANSLATION_GLOBAL_TOKEN` aus der Prozessumgebung (Server/CI). Ohne
  Freigabewort bricht das Skript mit klarer Meldung ab. Der schreibende
  Datenbankvertrag `rpc_admin_sync_ui_strings` ist `service_role`-only und wird
  nur von diesem Dienst aufgerufen; im Frontend/VITE-Environment liegt kein
  Geheimnis. Der Serverweg begrenzt die Aufrufe zusätzlich (Bremse
  `cms_translation_ui_catalog_sync`), ist wiederholbar, überschreibt keinen
  Zieltext und startet keinen Übersetzungslauf (`run_started: false`).
- Im CMS-Light gibt es (Stand dieser Prüfung) **keine** Schaltfläche für den
  Katalogabgleich; er ist bewusst ein Server-/CI-Vorgang. Käme eine Schaltfläche
  hinzu, muss sie denselben Serverweg nutzen und die fehlende Freigabe
  verständlich melden (`global_authorization_not_configured`).
- `npm run i18n:contract` enthält die Katalogprüfung jetzt mit.

Aufgenommen sind die funktionalen Namespaces `common` (komplett),
`navigation` (nur `a11y`, `common`, `breadcrumb`), `service` (nur `katalog`,
ohne `diagnostics`) und `serviceportal` (ohne `_meta`).

## 4. Bestandszahlen (gemessen, 2026-09-12)

| Größe | Wert |
| --- | --- |
| Manifest-Einträge (deutsch) | 414 (`common` 20, `navigation` 97, `service` 148, `serviceportal` 149) |
| Katalog aktiv in der Datenbank | 414 |
| davon übersetzbare Einheiten im Werkzeug | 409 (5 Werte sind reine Codes/Zahlen und bleiben unübersetzt) |
| übernommene vorhandene Startwerte | EN 394, PL 184 (nur wo in der Datenbank kein Zieltext stand) |
| überschriebene Zieltexte | 0 |
| offen je Sprache (Bedienungstexte) | EN 20, PL 230 |
| deutsche Einheiten insgesamt (beide Klassen) | 18.855 |
| Abdeckung insgesamt | DE 18.855 · EN 18.825 · PL 18.620 |
| bewusst ausgeschlossene technische Werte | 33 (Adressen, Pfade, Klassen, Formatcodes, Marken, Entwicklerdiagnostik) |

Startwerte aus den Sprachdateien gelten als „von Hand geprüft" und werden von
automatischen Läufen nie ersetzt.

## 5. Laufzeit: Datenbank zuerst, Datei als Notfall

`src/i18n/uiStringsOverlay.ts` legt die Zieltexte aus der Datenbank über die
gebündelten Ressourcen (`i18next.addResourceBundle`, tief, mit Vorrang). Deutsch
kommt weiterhin aus der Datei und bleibt Quelle. Fehler beim Laden sind still:
die Seite bleibt mit dem mitgelieferten Sprachpaket vollständig bedienbar.
Es wird zur Laufzeit keine Datei im Repository geschrieben.

## 6. Öffentliche Sprachfreigabe

`checkPublicReleaseReadiness` fragt jetzt `rpc_admin_locale_release_readiness`
und nennt offene Seiteninhalte und offene Bedienungstexte getrennt.
`BUNDLED_LOCALES` ist nur noch Notfall-Hinweis, wenn die Datenbank nicht
antwortet — nicht mehr die fachliche Wahrheit. Interne Bearbeitung und
Übersetzung einer Sprache bleiben jederzeit möglich.

## 7. Überlange Rechtstexte

`supabase/functions/_shared/longTextSegments.ts` trennt sehr lange Quelltexte
nur an strukturellen Grenzen (Absätze, `</p>`, `</li>`, Satzenden außerhalb von
Tags) und setzt sie exakt wieder zusammen (`joinSegments(segmentLongText(t)) === t`).
HTML, Listen, Links und Platzhalter `{{…}}` bleiben unversehrt. Der Serverdienst
`cms-translation-run` übersetzt segmentweise und fügt die Teile mit den
Original-Abständen zusammen; erst über 12 Segmenten wird eine Einheit noch
übersprungen.

Betroffen sind die fünf bekannten Texte (`legal.agb` 23.326, `legal.agbEinkauf`
13.609, `legal.datenschutz` 25.999, `legal.datenschutzSnipdoo` 21.036,
`legal.garantiebedingungen` 4.024 Zeichen). Sie sind damit **planbar**, wurden
aber in diesem Schritt bewusst **nicht** übersetzt — Rechtstexte brauchen eine
juristische Abnahme.

## 8. Was bewusst im Code bleibt

- technische Schlüssel, Feldnamen, Slugs, Routen, URLs, Artikelnummern, IDs
- Markenname TCS, Produktcodes, Format- und Sprachcodes, CSS-Klassen
- Entwicklerdiagnostik (`service.katalog.diagnostics`, `_meta`)
- Seiteninhalts-Namespaces (`home`, `personas`, `service.hub`, `service.seiten`,
  …) — diese Inhalte liegen als CMS-Einheiten in der Datenbank und dürfen nicht
  als zweite Wahrheit in den Katalog wandern
- Produktnamen, PDP-/Kartentexte und technische Anzeigebezeichnungen kommen
  ausschließlich aus der Produktdatenbank (nur lesend) und sind weder CMS- noch
  Katalog-Inhalt

## 9. Freigabereife je Sprache (gemessen)

| Sprache | Seiteninhalte offen | Bedienungstexte offen | öffentlich freischaltbar |
| --- | --- | --- | --- |
| EN | 10 | 20 von 409 | nein |
| PL | 5 | 230 von 409 | nein |
| NL | 17.869 | 414 von 414 | nein |
| DA | 17.869 | 414 von 414 | nein |

EN und PL sind heute bereits öffentlich sichtbar; dieser Stand wurde
absichtlich nicht verändert. Das Gate greift ab jetzt für jede weitere
Freischaltung. Interne Bearbeitung und Übersetzung bleiben für alle Sprachen
möglich.

## 10. Statusleistung nach der Katalogintegration

Die Sprachstands-Übersicht läuft weiterhin über den zwischengespeicherten
Weg (`rpc_internal_translation_coverage_cached`), jetzt mit sechs Bereichen:

| Messung | Wert |
| --- | --- |
| Übersicht warm (erster Aufruf) | 33 ms |
| Übersicht warm (zweiter Aufruf) | 1 ms |
| Neuberechnung einer Sprache | 1,9–8,6 s (im Hintergrund, je Sprache) |
| Freigabereife je Sprache | nutzt denselben Cache statt eigener Vollzählung |
| Zeitüberschreitungen im Browsertest | keine (alle Aufrufe HTTP 200) |

## 11. Nachweise

- Tests: `src/test/uiStringCatalog.test.ts` (Katalog, Manifest, Nicht-Über\-schreiben,
  DB-first/Rückfall, Anfragebündelung, Segmentierung),
  `src/features/admin/api/__tests__/localeVisibility.contract.test.ts` (Freigabesperre)
- Typecheck ohne Fehler, 19 Testdateien / 237 Tests grün, Build erfolgreich
- Sprachvertrag-Audit: 0 harte fehlende Schlüssel, 0 verdächtige Literale
- Browserprüfung: polnische Seite `/service` liefert `lang=pl`, polnische
  Bedienungstexte und `rpc_public_read_ui_strings` mit HTTP 200; der
  Übersetzungsbereich im CMS-Light lädt ohne Zeitüberschreitung
- Übersetzungsläufe: 0 aktiv, 0 vorgemerkt, 0 Aufträge für Bedienungstexte
- Datenbank-Advisors: 136 Hinweise (vorher 127). Neu sind die zwei Tabellen mit
  RLS ohne öffentliche Regel (Zugriff nur über geprüfte Funktionen) und die drei
  neuen Funktionen im bereits bestehenden Muster „`/admin` ohne Login"
  (`rpc_admin_*` sind wie die vorhandenen 60+ Admin-Funktionen aufrufbar). Die
  intern-technischen Funktionen bleiben `service_role`-only; der neuen
  Auslösefunktion wurden die Rechte für Besucher und angemeldete Nutzer
  entzogen. Der Login-Schutz für `/admin` bleibt das offene Folgeprojekt.

## 12. Bewusst nicht getan

Kein Übersetzungslauf, keine Veröffentlichung, keine Änderung an Freigaben und
keine Änderung bestehender deutscher, englischer oder polnischer Zieltexte.
Die durch den Abgleich automatisch vorgemerkten Aufträge wurden entfernt und die
beiden Automatik-Läufe entwaffnet, damit ohne Ihre Freigabe nichts übersetzt
wird. Der Katalog kann jederzeit über „Fehlende Texte prüfen" neu geplant werden.

## 13. Korrekturprüfung 2026-09-12 (Commit 93b04617)

### 13.1 Behobener Widerspruch

Der schreibende Vertrag `rpc_admin_sync_ui_strings(jsonb)` war in der Datenbank
bereits für `PUBLIC`, `anon` und `authenticated` gesperrt, das Abgleich-Skript
rief ihn aber weiterhin mit dem öffentlichen Frontend-Schlüssel auf — der
nächste Abgleich wäre gescheitert. Korrigiert wurde der Anschluss, nicht das
Recht:

- neue Serveraktion `sync_ui_catalog` in `supabase/functions/cms-translation-run`
  (Freigabewort `CMS_TRANSLATION_GLOBAL_TOKEN`, Aufrufbremse, Manifestprüfung,
  Aufruf des Vertrags mit dem internen Schlüssel, kein Laufstart),
- `scripts/i18n/ui-catalog-sync.mjs` ruft nur noch diesen Dienst auf und liest
  das Freigabewort ausschließlich aus der Prozessumgebung,
- die Sperre ist zusätzlich als wiederholbare Migration verankert
  (`REVOKE ... FROM PUBLIC, anon, authenticated` + `GRANT ... TO service_role`),
  damit auch eine frische Datenbank denselben Stand hat.

### 13.2 Datenbank-Hinweise: exakte Zuordnung

Gemessen nach der Korrektur: **134** Hinweise (vorher im Abschlussbericht 136).
Aufteilung: 8 × „RLS aktiv ohne Regel" (INFO), 63 × „Besucher darf
SECURITY-DEFINER-Funktion ausführen", 63 × dasselbe für angemeldete Nutzer.

Durch den Katalog-Umbau neu entstanden sind genau **6** Hinweise:

| Objekt | Hinweis | Bewertung |
| --- | --- | --- |
| `cms_ui_strings` | RLS ohne Regel | unvermeidbar/gewollt: Zugriff nur über geprüfte Funktionen, keine offene Tabellenlesung |
| `cms_ui_string_translations` | RLS ohne Regel | wie oben |
| `rpc_public_read_ui_strings(text)` | 2 × SECURITY DEFINER ausführbar | technisch nötig: die öffentliche Website liest damit die Zieltexte ohne Login; nur Lesen, nur aktive Sprache |
| `rpc_admin_locale_release_readiness(text)` | 2 × SECURITY DEFINER ausführbar | folgt dem bestehenden Muster „`/admin` noch ohne Login"; nur Lesen/Zählen, kein Schreibweg |

Behoben statt hingenommen wurden dagegen:

- `rpc_admin_sync_ui_strings(jsonb)` — Rechte für `PUBLIC`/`anon`/`authenticated`
  entzogen (2 Hinweise weniger, jetzt migrationsfest),
- `cms_autopilot_trg_ui_strings()` — Rechte entzogen (2 Hinweise weniger).

Nicht diesem Umbau zuzurechnen sind die übrigen 61 Funktionen desselben
Musters sowie die Tabellen `cms_translation_coverage_cache`,
`cms_translation_coverage_locale_cache`, `cms_translation_jobs`,
`cms_translation_memory`, `cms_translation_unit_state` (Statuscache und
Übersetzungsmechanik aus früheren Etappen). Der Login-Schutz für `/admin` bleibt
das offene Folgeprojekt und ist die einzige echte Auflösung der 126
Funktionswarnungen; ein Entzug der Rechte ohne Login würde den Redaktionsbereich
funktionslos machen.

### 13.3 Nachweise dieser Prüfung

- Rechte je Funktion direkt aus dem Katalog gelesen (Tabelle in Abschnitt 2).
- Keine Inhalts-, Zieltext- oder Freigabeänderung, kein Übersetzungslauf, keine
  Veröffentlichung.
