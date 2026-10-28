# Statusübersicht Übersetzungen — Ursache und Behebung der Zeitüberschreitungen

Stand: 2026-09-12 · Projekt: TCS-webseite_db_cms / CMS-Light (`uvkubrrljyzfvbvejepl`)
Keine Veröffentlichung, kein Übersetzungslauf, keine Inhaltsänderung.

## 1. Beobachtung

Beim Öffnen des Übersetzungsbereichs im Admin rief die Oberfläche
`cms-translation-run` (`action = "status"`) auf. Dort wurde
`rpc_internal_translation_coverage()` **bei jedem Aufruf neu** gerechnet;
Ergebnis waren 500/503/504 (~100 Vorfälle in ca. 15 Minuten am 11./12.09.).

## 2. Nachgewiesene Ursache (Messung)

`rpc_internal_translation_coverage()` durchläuft **alle** Sprachen aus
`cms_locales` und materialisiert je Sprache die komplette Menge über
`cms_translation_units(...)` (fünf Bereiche, mehrere Joins).

Bestand zum Messzeitpunkt:

| Tabelle | Zeilen |
| --- | --- |
| `cms_section_fields` | 127.512 (davon `locale='de'`: 55.145) |
| `cms_admin_editable_fields` | 142.550 |
| `cms_pages` | 125 |
| `cms_navigation_nodes` | 141 |
| `cms_assets` | 1.753 |
| übersetzbare deutsche Einheiten (Quelle) | 18.446 |

Gemessener Abfrageplan (`EXPLAIN (ANALYZE, BUFFERS)`) für **eine** Sprache und
**nur** den Bereich Bausteinfelder: **10,2 s**, davon **5,6 s** allein
sequentielle Suche über `cms_admin_editable_fields` (124.681 Zeilen verworfen,
kein Index auf `locale`). Fünf Sprachen × fünf Bereiche liefen dadurch weit über
das Zeitlimit des Gateways.

## 3. Behebung (additiv, idempotent, keine Inhaltsänderung)

Neue Datenbankobjekte:

| Objekt | Zweck |
| --- | --- |
| `public.cms_translation_coverage_locale_cache` | gespeicherte Zusammenfassung **je Sprache** (`payload`, `computed_at`, `compute_ms`, `is_stale`) |
| `rpc_internal_translation_coverage_locale(text)` | rechnet genau eine Sprache (`statement_timeout` 60 s) |
| `rpc_internal_translation_coverage_refresh_one(int, text)` | erneuert **höchstens eine** fällige Sprache |
| `rpc_internal_translation_coverage_cached(int, bool)` | setzt die Antwort aus den gespeicherten Sprachzeilen zusammen |
| `rpc_internal_translation_coverage_invalidate()` | markiert alle Sprachzeilen als veraltet |
| `cms_trg_coverage_invalidate()` + Auslöser auf 12 CMS-/Übersetzungstabellen | Inhalts- oder Laufänderung ⇒ Zahlen gelten als veraltet |
| Indizes `idx_cms_admin_editable_fields_locale`, `idx_cms_translation_unit_state_locale`, `idx_cms_assets_active` | beseitigen die teuren Volldurchläufe |

Rechte/RLS: Die Cache-Tabelle hat RLS aktiv **ohne** Policies (kein Zugriff für
`anon`/`authenticated`), Vollzugriff nur `service_role`. Bei allen neuen
Funktionen wurde EXECUTE für `PUBLIC`, `anon` und `authenticated` entzogen und
nur `service_role` erteilt. Der Sicherheits-Linter zeigt unverändert dieselben
vorbestehenden 61+61 SECURITY-DEFINER-Hinweise; neu ist nur der beabsichtigte
Hinweis „RLS aktiv, keine Policy" für die gesperrte Cache-Tabelle.

Oberfläche/Server:

- `supabase/functions/cms-translation-run` (`status`) ruft die gespeicherte
  Zusammenfassung auf (`coverage_max_age_seconds`, `refresh_coverage`).
- `src/features/admin/api/cmsTranslationRuns.ts`: Anfragen werden im Browser
  entdoppelt (eine laufende Anfrage wird geteilt), ein frisches Ergebnis wird
  60 Sekunden wiederverwendet; `resetTranslationStatusCache()` für Tests.
- `TranslationWorkbench.tsx`: zeigt Stand/Veraltet-Hinweis und den Knopf
  „Zahlen neu berechnen"; nach Laufende wird gezielt neu gerechnet.
- `cms_field_is_translatable(text)` ist jetzt `PARALLEL SAFE`.

## 4. Messwerte vor/nachher

| Zustand | Antwortzeit `action=status` |
| --- | --- |
| vorher | 500/503/504 (Zeitüberschreitung, ~100 Vorfälle/15 min) |
| erste Aufrufe (Aufwärmen, je eine Sprache) | 200 in ca. 3–4 s |
| gespeicherte Zahlen vollständig | **200 in 0,57–1,19 s** (drei Messungen) |

Rechendauer je Sprache beim Aufwärmen: `de` 18.474 ms, `nl` 7.211 ms,
`en` 3.783 ms, `pl` 3.066 ms, `da` 2.060 ms — künftig nur noch dann, wenn sich
etwas geändert hat, und stets nur eine Sprache pro Aufruf.

## 5. Tests

`src/features/admin/api/__tests__/translationStatusCache.test.ts` prüft:
Bündelung gleichzeitiger Aufrufe zu einer Anfrage, Wiederverwendung frischer
Zahlen, erneute Anfrage nach Ablauf, erzwungene Neuberechnung mit
`refresh_coverage=true` sowie den Normalfall mit gespeicherter Zusammenfassung.
Gesamtlauf: Typprüfung ohne Fehler, 18 Testdateien / 219 Tests grün.

## 6. Bewusst offen (nicht umgesetzt)

Der zweite Teil des Auftrags — ein **gemeinsamer** Katalog aus CMS-Texten und
gebündelter Bedienoberflächen-Mikrocopy (`ui_string`-Einheiten, DB-first
Laufzeitauflösung mit Datei-Notfallfallback, gemeinsame Prüf-/Laufplanung,
erweiterte öffentliche Sprachfreigabe, Segmentierung der fünf überlangen
Rechtstexte) — ist **nicht** umgesetzt. Er ist ein eigener, größerer Umbau und
sollte als separater beauftragter Schritt erfolgen, damit die jetzt
stabilisierte Statusübersicht nicht mit einem Datenmodellwechsel vermischt wird.

## 7. Entkopplung Sichtbarkeitsschalter / Zahlen (Nachtrag)

Fehlerbild: Beim Aktivieren einer Sprache („im CMS bearbeitbar") erschien
„canceling statement due to lock timeout", parallel
`rpc_internal_translation_coverage_cached:500/504`; Auswahlfelder waren lange
ausgegraut, und Schritt 5 zeigte einen fremden, alten Lauf einer anderen
Zielsprache.

Ursache: `rpc_admin_set_locale_visibility` bereitete zusätzlich alle Textfelder
der Sprache vor und traf dabei auf die gleichzeitig laufende, teure
Sprachstand-Berechnung (rund 35 s pro Sprache) → Sperre.

Korrektur:
- Der Sichtbarkeitsschalter ist eine kurze, wiederholbare Einzeländerung
  (`cms_locales` + Audit, `lock_timeout` 3 s, `statement_timeout` 15 s); die
  Vorbereitung passiert beim Prüfen/Starten eines Laufs.
- Die Neuberechnung des Sprachstands hält einen Advisory-Lock und meldet
  `cache.busy` statt eine zweite Berechnung zu starten.
- Oberfläche: Grundstatus (`fetchTranslationBasics`) und Sprachstand
  (`fetchTranslationCoverage`) sind getrennt, mit eigenem Lade- und
  Fehlerzustand. Sprachwahl und Aktivierung hängen nur am Grundstatus; eine
  aktivierte Sprache ist sofort auswählbar (Ergebnis der Datenbank wird direkt
  übernommen).
- Fortschritt: `findAnyOpenRun` entfällt. `findRunForLocale` liefert nur Läufe
  der gewählten Zielsprache und des gewählten Umfangs; bei Sprachwechsel werden
  Lauf, Vorschau und QA verworfen. Fehlt ein Lauf, steht dort ein klarer
  Hinweis statt eines fremden Laufs.

Prüfung: Typprüfung ohne Fehler, 19 Testdateien / 247 Tests grün, Build OK,
Preview-Stichprobe: Sprachauswahl sofort bedienbar, keine Fehlerbanner.
Nicht veröffentlicht; keine Inhalte geändert.

## 8. Abschluss, Sprachstand und Freigabe (Nachtrag 2026-09-13)

Symptom: Niederländisch war vollständig übersetzt, der Lauf zeigte aber
„18.857 von 18.855" und die Freigabe „auf der Website sichtbar" blieb gesperrt
mit der Meldung, es fehlten 18.446 Seiteninhalte. Zusätzlich liefen Statusabfragen
in Zeitüberschreitungen (500/504).

Ursachen und Korrekturen (alle idempotent, `CREATE OR REPLACE`):

1. `rpc_internal_translation_coverage_locale` hatte
   `columns_supported = (is_source OR locale IN ('en','pl'))`. Jede weitere Sprache
   galt damit als „nicht unterstützt". Jetzt: `(is_source OR is_active)` — generisch
   für alle im CMS aktiven Sprachen. Ebenso im Zweig für Sprachen ohne
   gespeicherten Stand in `rpc_internal_translation_coverage_cached`.
2. `rpc_internal_translation_progress` glich die Planzahl nur nach unten ab.
   Nach einem Rescan konnte „erledigt" über „geplant" steigen. Jetzt wird der Plan
   in beide Richtungen mit dem tatsächlichen Bestand abgeglichen
   (`plan_reconciled` / `plan_reconciled_up`), und der Sprachstand der Zielsprache
   wird bei Abschluss zur Neuberechnung markiert.
3. `rpc_admin_locale_release_readiness` rechnete den Sprachstand synchron durch
   (~35 s) und lief über die Programmierschnittstelle in die Anweisungs-Zeitgrenze.
   Jetzt liest die Prüfung nur den gespeicherten Stand: ist er frisch, antwortet sie
   in Millisekunden; ist er veraltet oder fehlt er, meldet sie `coverage_pending`
   („wird gerade berechnet") und merkt die Sprache zur Neuberechnung vor.
   Veraltete Zahlen werden nie als Wahrheit ausgegeben.
4. `rpc_internal_translation_coverage_refresh_one` wählte ohne Sprachangabe immer
   zuerst die Quellsprache (`l.is_source DESC`). Weil Deutsch durch jede
   Inhaltsänderung veraltet, kamen andere Sprachen nie an die Reihe. Jetzt zählt
   nur noch: fehlender Stand zuerst, danach der älteste Stand.

Oberfläche: In der Sprachverwaltung zeigt jede Sprache die offenen Zahlen getrennt
(Seiteninhalte / Bedienungstexte) und bietet „Sprachstand neu prüfen" (rechnet
serverseitig neu) sowie „Fehlende Übersetzungen vervollständigen" (wählt die Sprache
im Ablauf aus; es wird nichts automatisch gestartet).

Stand nach der Korrektur (gemessen): NL, EN, PL bereit (0 offen), DA absichtlich
nicht aktiv und nicht übersetzt (17.869 Seiteninhalte, 414 Bedienungstexte offen).
Lauf `e689826b` NL: 18.857 von 18.857, 0 Fehler.

### 8.1 Sprachblock kann nicht mehr verschwinden

Beobachtung: Der Block „Sprachen" mit den Schaltern „im CMS bearbeitbar" und
„auf der Website sichtbar" war zeitweise vollständig weg.

Absicherung:

- Die Sprachliste hängt ausschließlich an den schnellen Basisdaten
  (`fetchTranslationBasics`). Sprachstand-Zahlen (`fetchTranslationCoverage`)
  haben eigene Lade- und Fehlerzustände und können den Block nicht entfernen.
- Ein Ladefehler der Sprachliste wird jetzt lokal im Block gemeldet
  („Erneut laden"); die zuletzt geladenen Sprachen bleiben stehen und bedienbar.
- Neuer Absturzschutz `AdminSectionBoundary` umschließt Sprachblock, Automatik
  und Ablauf getrennt. Ein Anzeigefehler in einem Teil entfernt die übrigen
  Bereiche nicht mehr.
- Regressionstest `src/features/admin/components/__tests__/localeBlockResilience.test.tsx`
  simuliert Coverage-Fehler 500 und Zeitüberschreitung sowie einen Fehler der
  Sprachliste selbst und prüft, dass Liste und Schalter bedienbar bleiben.
