# Übersetzungs-Automatik (verbindlicher Vertrag)

Stand: 2026-09-11 · Projekt: Web-neu / CMS-Light (`uvkubrrljyzfvbvejepl`)

## 1. Zweck und Abgrenzung

Neue oder inhaltlich geänderte **deutsche** CMS-Texte werden serverseitig
automatisch in alle Sprachen übersetzt, die in `cms_locales` gleichzeitig
`is_active = true` **und** `is_public = true` haben (Quellsprache Deutsch
ausgenommen). Ergebnisse liegen ausschließlich in CMS-Light.

Nicht betroffen:

- statische Bedienoberflächen-Texte in `src/i18n/locales/**` (technische
  Microcopy, bleibt im Code),
- Produktdatenbank (`ncvxzkwazdemivdolpzc`, weiterhin nur lesend),
- Veröffentlichung der Website (weiterhin nur auf ausdrücklichen Auftrag).

## 2. Historie: früherer EN-Weg vs. heutige Automatik

| Weg | Beschreibung | Status |
| --- | --- | --- |
| Feld-Knopf „Übersetzen“ (`cms-translate-field`) | Vorschlag für ein Feld, Redaktion speichert selbst | bleibt als Handarbeit |
| Beauftragte Prompt-Läufe / Migrationen (EN) | DE→EN im selben Auftrag gepflegt | historisch |
| Übersetzungsbereich mit Läufen (`cms-translation-run`) | manuell gestartete Läufe je Seite/Sprache | bleibt |
| **Automatik (neu)** | Datenbank-Auslöser plant Aufträge, Serverarbeiter verarbeitet | dauerhaft |

## 3. Auslöser

Datenbank-Auslöser auf den deutschen Quellspalten:

| Tabelle | Spalte(n) | Bereich |
| --- | --- | --- |
| `cms_section_fields` (locale = `de`) | `value` | `section_field` |
| `cms_pages` | `title_de` | `page_title` |
| `cms_navigation_nodes` | `label_de`, `description_de` | `nav_label`, `nav_description` |
| `cms_assets` (aktiv) | `alt_de` | `asset_alt` |

Kein Auftrag entsteht bei:

- unverändertem Text (normalisierter Vergleich über `cms_translation_normalize`),
- nicht übersetzbaren Werten (`cms_text_is_translatable` = false: URL, `href`,
  Slug, Kennung, Symbolname, Schalter, Zahl),
- nicht übersetzbaren Feldschlüsseln (`cms_field_is_translatable` = false),
- ausgeschalteter Automatik (`cms_translation_autopilot.is_enabled = false`),
- Sprachen, die nicht aktiv **und** öffentlich sind.

## 4. Auftragswarteschlange

Aufträge liegen in der **bestehenden** Tabelle `cms_translation_jobs` mit
`batch_id = 'auto'` (zusätzliche Spalten `area`, `ref_id`, `unit_key`,
`source_text`). Es gibt keine zweite Warteschlange.

- Der Fingerabdruck der Quelle ist `cms_translation_hash(source_text)`.
- Mehrere schnelle Änderungen ersetzen denselben Auftrag (Idempotenz über den
  bestehenden eindeutigen Schlüssel); verarbeitet wird immer nur der jüngste
  Fingerabdruck.
- `cms_autopilot_enqueue_unit` führt für Bausteinfelder die Freigabeliste
  (`cms_admin_editable_fields`) der Zielsprache mit.

## 5. Schutz von Handarbeit

- Ist der Zieltext vorhanden und `review_status = 'geprueft'` (also von Hand
  gepflegt), wird **nicht** übersetzt. Der Auftrag wird als
  `skipped_manual` mit `last_error = 'manual_value_source_changed'` protokolliert
  — sichtbar im Übersetzungsbereich als „von Hand gepflegt, Quelle geändert“.
- Maschinelle Zieltexte dürfen bei geänderter Quelle aktualisiert werden
  (`review_status` bleibt `maschinell`, `source_hash` wird mitgeführt).
- Der Schreibweg bleibt `rpc_internal_apply_machine_unit` /
  `rpc_internal_apply_machine_translation` (Service-Rolle, atomar). Kein
  Schreibweg aus dem Browser.

## 6. Verarbeitung

- Je Zielsprache existiert höchstens ein offener Lauf mit
  `scope_kind = 'auto'` (`cms_autopilot_ensure_run`).
- `rpc_internal_translation_next_batch` liefert für Automatik-Läufe die offenen
  Aufträge dieser Sprache (max. 25 je Schritt), sonst wie bisher die
  Texteinheiten des Laufumfangs.
- Der Arbeiter (`cms-translation-run`, Aktion `worker`, per Zeitplan aus der
  Datenbank) verarbeitet mit Lease, Lebenszeichen, Wiederaufnahme, Retry mit
  Backoff, Kosten- und Tagesgrenzen. Ist nichts mehr offen, wird der Lauf
  `done` und der Zeitplan abgeschaltet.
- Anbieter und Modell kommen aus `cms_translation_provider_rates`
  (`is_default`). Keine Modellkennung im Frontend.
- Der Freigabecode (`CMS_TRANSLATION_GLOBAL_TOKEN`) gilt weiterhin für **von
  Hand gestartete** Gesamtläufe. Automatik-Aufträge einzelner Textänderungen
  brauchen ihn nicht.

## 7. Neue Sprache öffentlich schalten

`rpc_admin_set_locale_visibility` bereitet die Sprache vor und plant beim
Wechsel „nicht öffentlich → öffentlich“ einen Serverlauf für die fehlenden und
veralteten Texte dieser Sprache ein. Es gibt keine feste Sprachliste im Code.

## 8. Fehler und Nachvollziehbarkeit

- Auftragsstatus: `pending`, `translated`, `memory_hit`, `skipped_manual`,
  `failed` (mit `attempts` und `last_error`).
- Provenienz je Zieltext: `review_status`, `source_hash`, plus
  `cms_translation_memory` (Anbieter, Modell, Zeit).
- Oberfläche: `rpc_admin_translation_autopilot_status` zeigt Zustand,
  Zielsprachen, offen/übersetzt/Fehler/Handarbeit, letzten erfolgreichen Lauf
  und letzte Serveraktivität.
- Schalter: `rpc_admin_set_translation_autopilot(boolean)`.

## 9. Bedienlogik: hybrid und schnell (Ergänzung)

**Speichern übersetzt nie synchron.** Eine deutsche Speicherung markiert
serverseitig nur „fehlt/veraltet“, legt bzw. aktualisiert einen Auftrag in
`cms_translation_jobs` (`batch_id = 'auto'`) und kehrt sofort zurück. Es gibt
keinen KI-Aufruf im Speicherpfad und keinen im Browser.

**Ruhezeit (Entprellung).** Jeder Auftrag erhält
`cms_translation_jobs.scheduled_at = now() + cms_translation_autopilot.debounce_seconds`
(Standard 90 s, zulässig 5–3600 s). Eine erneute Änderung derselben Einheit
überschreibt Quelltext, `source_hash` und `scheduled_at` — es wird also nur die
letzte deutsche Fassung übersetzt. `rpc_internal_translation_next_batch` liefert
für Automatik-Läufe nur fällige Aufträge (`scheduled_at <= now()`) und meldet
wartende über `pending_later`; der Serverdienst hält den Lauf dann offen
(`waiting_for_debounce`) statt ihn auf „fertig“ zu setzen. Der Browser darf
geschlossen sein.

**Zwei getrennte Schalter.**

| Feld | Bedeutung |
| --- | --- |
| `cms_translation_autopilot.is_enabled` | Erkennung, Markierung und Planung |
| `cms_translation_autopilot.is_paused` | nur die Verarbeitung (Übersetzen) |

`is_paused = true` setzt offene Automatik-Läufe auf `paused`; fehlende und
veraltete Texte werden weiterhin erkannt und geplant. Fortsetzen stellt die
Läufe auf `queued` und aktiviert den Server-Worker erneut. Schalter:
`rpc_admin_set_translation_autopilot(p_enabled, p_paused)`.

**Anzeige je Zielsprache.** `rpc_admin_translation_autopilot_status` liefert
`per_locale` mit geplant (Ruhezeit läuft), jetzt fällig, läuft, übersetzt,
Fehler, von Hand gepflegt und letzter erfolgreicher Verarbeitung.
`rpc_admin_translation_locale_counts(locale)` liefert auf Klick vorhanden,
fehlt, veraltet, von Hand geschützt und (technischer Ausnahmefall) nicht
vorbereitet.

**Vollständiger Nachlauf je Sprache.** „Alle fehlenden und veralteten Texte
jetzt übersetzen“ bleibt der bestehende Weg über die Schritte 1–4 des
Übersetzungsbereichs (Sprache → Modell → Prüfen → Start) inklusive Anhalten und
Fortsetzen. Dieser von Hand gestartete Gesamtlauf braucht weiterhin den
Freigabecode; die Automatik einzelner Änderungen nicht.

**Kein Übersetzen pro Tastendruck.** Auslöser sind ausschließlich die
Datenbank-Trigger auf gespeicherten deutschen Quellwerten.

## 10. Folgepunkt (nicht umgesetzt)

Inhaltseditor bei mehr als zwei Sprachen: statt beliebig vieler Spalten soll
neben der Quelle DE genau **eine auswählbare Zielsprache** mit Status und
Bearbeitungsfeld stehen. Das ist bewusst nicht in diesem Schritt umgebaut
worden, um die bestehende DE/EN-Pflege nicht zu destabilisieren. Offener
**Folgepunkt** für einen eigenen, eng begrenzten Auftrag.

## 11. Abschlusssicherung von Läufen (Reparatur 2026-09-12)

**Beobachtung.** Lauf `977c5546` (Ziel `pl`, ganze Sprache) stand auf
„abgeschlossen“, zeigte aber 227 von 235 verarbeiteten Einheiten (97 %).

**Ursache (zwei Stellen).**

1. Zählfehler im Serverdienst: `rpc_internal_apply_machine_unit` antwortete für
   8 Einheiten mit `success = true, updated = false` (Zielwert war bereits
   identisch vorhanden). Dieser Fall wurde weder als erledigt noch als
   übersprungen oder fehlerhaft gezählt und verschwand aus der Bilanz.
2. Abschluss ohne Prüfung: bei leerem Stapel meldete der Dienst
   `p_status = 'done'`, und `rpc_internal_translation_progress` übernahm das
   ungeprüft — ohne Vergleich von Plan und Bilanz und ohne Blick auf offene
   Einheiten.

**Korrektur.**

- `cms-translation-run`: erfolgreiche Anwendungen ohne Änderung zählen als
  verarbeitet; der Abschluss wird nicht mehr behauptet, sondern von der
  Datenbank entschieden (`finished` folgt dem zurückgemeldeten Status).
- `rpc_internal_translation_progress`: „abgeschlossen“ nur bei erfüllter Bilanz
  oder nachweislich leerer Restmenge (`rpc_internal_translation_open_units`).
  Bleiben Einheiten offen, bleibt der Lauf `running`, der Cursor wird
  zurückgesetzt (Rescan) und der Grund protokolliert. Ein vollständiger Rescan
  ohne Fortschritt endet sauber mit `incomplete_unresolved_units:N`. Weicht der
  Plan bei leerer Restmenge ab, wird er angeglichen und als
  `plan_reconciled:N` vermerkt.
- `rpc_internal_translation_run_resume`: prüft zuerst die Restmenge; bei Bedarf
  Fortsetzen mit Rescan, sonst sauberer Abschluss. Der Steuerbefehl
  „Fortsetzen“ nutzt jetzt diesen Weg und wirkt damit auch bei zu früh
  abgeschlossenen Läufen.
- Oberfläche: „abgeschlossen“ erscheint nie unter 100 %. Stattdessen
  „unvollständig: N Restobjekte“ mit Grund und der Aktion „Restlauf
  fortsetzen“.

**Zustand vorher → nachher.**

| Lauf | vorher | nachher |
| --- | --- | --- |
| `977c5546` | `done`, geplant 235, erledigt 227 (97 %) | `done`, geplant 227, erledigt 227 (100 %), Grund protokolliert |
| `ae3a4a71` | `running`, 0 geplant, keine Aktivität | `done`, als leerer Lauf protokolliert |

**Restobjekte.** 0. `cms_translation_units('pl')` = 18.855 Einheiten, davon 0
offen; 0 wartende Aufträge; alle 235 ursprünglich geplanten Zielzeilen wurden
im Laufzeitfenster geschrieben (5 Bausteinfelder, 230 Bedienungstexte).

**Zeitplan.** Der Arbeiter läuft ausschließlich serverseitig über den
Datenbank-Zeitplan (minütlich, `worker`-Aktion). Ein geschlossener Browser oder
ein Ruhezustand des Rechners hält ihn nicht auf; der Zeitplan wird nur bei
offenen Läufen scharf gestellt und danach abgeschaltet. Aktuell: 0 offene
Läufe, 0 scharf gestellte Läufe.

**Geprüft.** 19 Testdateien / 247 Tests grün (inkl. neuer Regressionstests für
„geplant 235 / verarbeitet 227 / Status done“), Typprüfung, Build und
Syntaxprüfung des Serverdienstes grün. Keine Zieltexte, Freigaben oder Inhalte
verändert; kein neuer Gesamtlauf; keine Veröffentlichung.
