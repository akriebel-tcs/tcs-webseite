# Übersetzung: Anbieter, Modelle und eigene Schlüssel

Stand: 2026-09-14. Beschreibt den geschützten Teil des Übersetzungsbereichs
(Tab „Übersetzungen" → Abschnitt „Schlüssel & Anbieter").

## Grundsatz

- Es gibt **eine** Übersetzungsverwaltung: die bestehende Edge Function
  `cms-translation-run` plus die bestehenden `rpc_internal_translation_*`.
  Keine zweite parallele Verwaltung.
- Der Redaktionsbereich `/admin` bleibt in der Prototyp-Phase **ohne**
  Anmeldung erreichbar.
- Geschützt (Freigabe mit Adminpasswort) sind ausschließlich:
  Schlüssel anzeigen/speichern/löschen/testen, Modellliste neu laden,
  Anbieter-/Modellzuordnung je Sprache, „Pausierten Lauf mit neuem Anbieter
  fortsetzen".
- In der offenen Ansicht gibt es **kein** Eingabefeld für Schlüssel, nur den
  Hinweis, wo Schlüssel eingerichtet werden.

## Freigabe mit Adminpasswort

Es gibt **keine** Benutzerkonten, keine E-Mail-Anmeldung und keine
Selbstregistrierung. Muster ist der passwortgeschützte Administrationszugang
der Produktbasis.

- Der Abschnitt „Schlüssel & Anbieter" zeigt gesperrt ein Passwortfeld und den
  Knopf „Schlüsselverwaltung entsperren". `/admin/anmelden` ist dieselbe
  Passwortfreigabe (ohne Netzaufruf beim Aufbau, damit nie eine leere Seite
  entsteht).
- Passwort liegt ausschließlich als Projekt-Geheimnis auf dem Server:
  `CMS_ADMIN_PASSWORD` (alternativ `CMS_ADMIN_PASSWORD_SHA256` als Hex-Hash).
  Vergleich laufzeitkonstant (`timingSafeEqual`).
- Nach richtigem Passwort stellt `cms-translation-run` eine **signierte**
  Freigabe für 30 Minuten aus (HMAC, Geheimnis `CMS_ADMIN_SESSION_SECRET`),
  gesetzt als `HttpOnly; Secure; SameSite=None`-Cookie `cms_admin_session`.
  Der Client hält sie zusätzlich nur im Arbeitsspeicher — nie in
  `localStorage`, `sessionStorage` oder `document.cookie`.
- Jede geschützte Aktion prüft die Freigabe serverseitig (`requireAdmin`).
  Abgelaufen → `admin_session_expired`, ungültig → `admin_session_invalid`,
  fehlend → `admin_unlock_required`. Der Browser entscheidet nichts.
- Missbrauchsbremse: `admin_unlock` maximal 10 Versuche / 5 Minuten.
  Audit-Einträge enthalten nie Passwort oder Schlüsselwert.
- Ist kein Passwort eingerichtet, bleibt die Verwaltung geschlossen und zeigt
  eine Einrichtungsmeldung (`admin_password_not_configured`).


## Schlüsselablage

- Eigene Schlüssel liegen **verschlüsselt** im Datenbank-Tresor (Vault).
  `public.cms_provider_credentials` speichert nur Verweis, letzte vier
  Zeichen, Änderungszeitpunkt und Prüfergebnis — keinen Wert.
- Reihenfolge beim Lesen: Tresor zuerst, dann Projekt-Geheimnis
  (`GOOGLE_GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPL_API_KEY`).
  Bestehende Projekt-Geheimnisse bleiben also gültig.
- Der Browser erhält nie Klartext: nur „eingerichtet ja/nein", Herkunft,
  letzte vier Zeichen, Zeitpunkt, Prüfergebnis.
- Jede Aktion wird in `public.cms_provider_credential_audit` protokolliert —
  ohne Schlüsselwert. Zusätzlich bremst eine serverseitige Mengengrenze
  (`cms_provider_admin`, 30 Aktionen / 5 Minuten).
- Für Lovable AI wird **kein** eigener Schlüssel verwaltet.

## Modelle

- Google Gemini: Modelle werden serverseitig über die Models-API des Anbieters
  geladen; angeboten werden nur Modelle mit `generateContent`.
- Anthropic: offizielle Modellliste des Anbieters.
- DeepL: keine Modellauswahl.
- Fällt die Anbieter-API aus, greift ein konservativer, geprüfter
  Ersatzkatalog; eine eigene Modellkennung kann eingegeben werden.
- Ergebnisse werden in `cms_translation_provider_rates` gespiegelt. Entfallene
  Modelle werden nur **deaktiviert**, nie gelöscht.

## Anbieter/Modell je Sprache

`public.cms_locale_translation_config` (Sprache → Anbieter + Modell +
Prüfzeitpunkt). Gespeichert wird erst nach einem erfolgreichen kurzen
Server-Test beim Anbieter.

## Pausierten Lauf umstellen

- Nur bei `status = 'paused'`, nur nach erfolgreichem Schlüssel-/Modelltest und
  nur mit ausdrücklicher Bestätigung („UMSTELLEN").
- `rpc_internal_translation_run_switch_provider` stellt **denselben** Lauf
  atomar um: Anbieter/Modell neu, Zähler (`fields_done` …) und Checkpoint
  bleiben unangetastet, `worker_armed` wird wieder gesetzt, ein Audit-Eintrag
  geschrieben. Es entsteht kein neuer Lauf und keine Doppelverarbeitung.
- Ohne eigenen Schlüssel bleibt die bisherige Fortsetzung nach Rückkehr des
  Lovable-Modellbudgets unverändert möglich. Budgetgrenzen werden nicht
  verändert.
- Der dänische Lauf `4d875298-5b82-4968-b3c7-b0e7cf844442` (pausiert,
  5.315/18.855, Anbieter `lovable_ai` / `google/gemini-3.6-flash`) wurde
  **nicht** angefasst.

## Tests

`src/features/admin/api/__tests__/providerKeyAdmin.contract.test.ts` prüft am
Quelltext: Adminschranke für alle geschützten Aktionen, serverseitige
Rollenprüfung, keine Klartext-Rückgabe, kein Browser-Speicher, echte
Modellermittlung samt Ersatzkatalog, Bestätigung und Atomarität der
Laufumstellung, sowie dass die offene Ansicht kein Eingabefeld zeigt.

## Bedienablauf (ergänzt 2026-09-16)

- Wird in Schritt 2 „Anbieter und Modell wählen" ein eigener Anbieter ohne
  Schlüssel gewählt, erscheint direkt darunter eine Einrichtungshilfe mit dem
  Knopf „Eigenen Schlüssel einrichten". Er springt zur festen Marke
  `#cms-schluessel-und-anbieter` und hebt den gewählten Anbieter hervor.
- Speichern eines Schlüssels läuft in einem Zug: speichern → serverseitig
  testen → offizielle Modellliste laden → Schritt 2 aktualisieren. Bei DeepL
  entfällt das Modellladen.
- „Anbieter und Modell je Sprache" bietet die geladenen Modelle als Auswahlfeld
  an; eine eigene Modellkennung bleibt als Zusatzoption möglich.
- DeepL zeigt nirgends ein leeres Modellfeld; intern gilt weiter `deepl-api`.

## Modell-Kennungen je Anbieter (korrigiert 2026-09-16)

Die Prüfregel ist providerabhängig und kommt aus dem Serverdienst
(`MODEL_ID_PATTERNS` / `MODEL_ID_HINTS`, gemeldet im Status als
`model_id_patterns` / `model_id_hints`):

- `lovable_ai`: Gateway-Kennung `anbieter/modell`
- `google_gemini`, `anthropic`: native Kennung ohne Schrägstrich, nur
  `[A-Za-z0-9._-]`
- `deepl`: ausschließlich `deepl-api`, keine Modellauswahl

Dieselbe Regel gilt in `dry_run`/`start`, `locale_provider_set` und
`run_switch_provider`; die Oberfläche benutzt genau diese Server-Regeln und legt
keine zweite Modellliste an.

## Ein Bedienablauf (2026-09-16)

- Sprache wird ausschließlich in Schritt 1, Anbieter und Modell ausschließlich in Schritt 2 gewählt.
- „Fehlende Texte prüfen" (Schritt 3) prüft den Anbieter und speichert die Kombination Sprache/Anbieter/Modell über `locale_provider_set` als Sprachvoreinstellung.
- Gibt es für denselben Umfang einen pausierten Lauf, zeigt Schritt 2 Laufanbieter/-modell und die Auswahl. Schritt 4 stellt denselben Lauf bei Abweichung automatisch über `run_switch_provider` um und setzt ihn fort; bei Übereinstimmung nur „resume". Keine neue Lauf-Nummer, kein Bestätigungswort in der Oberfläche.
- „Schlüssel & Anbieter" verwaltet nur noch Schlüssel, Verbindungstest und Modelllisten — keine zweite Sprach-/Anbieter-/Modellwahl.
- DeepL bleibt ohne Modellwahl und wird kanonisch als `deepl-api` gespeichert und gestartet.

## Pausierten Lauf fortsetzen (korrigiert 2026-09-16)

Ursache des Fehlers: Das Umstellen eines pausierten Laufs auf einen anderen
Anbieter ist ein geschützter Schritt (kurzlebige Adminfreigabe, 30 Minuten).
Ohne gültige Freigabe schlug der Aufruf im Hintergrund fehl, die Meldung
erschien nur oben außerhalb des Sichtbereichs — Schritt 5 blieb sichtbar auf
„pausiert" mit dem alten Anbieter.

Korrigiert:
- Fehlt die Freigabe, ist der Knopf in Schritt 4 gesperrt und zeigt direkt
  daneben die Erklärung samt Knopf „Jetzt entsperren" (Sprung zum Abschnitt
  „Schlüssel & Anbieter").
- Nach dem Umstellen wird geprüft, ob der Lauf wirklich auf „läuft" steht;
  andernfalls wird zusätzlich fortgesetzt (Sicherheitsnetz beim erneuten Lesen).
- Fehler aus Serverdienst und Datenbank stehen jetzt direkt bei Schritt 4.
- Der Fortschritt zeigt ausschließlich den erneut aus der Datenbank gelesenen
  Laufzustand — nie die gewählte Absicht. Lauf-ID, Zähler und Checkpoint
  bleiben erhalten, es entsteht kein zweiter Lauf.
