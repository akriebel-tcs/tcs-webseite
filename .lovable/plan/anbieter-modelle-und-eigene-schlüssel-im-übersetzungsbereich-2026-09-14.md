# Anbieter, Modelle und eigene Schlüssel im Übersetzungsbereich vereinheitlichen

## Vorab: geprüfter Ist-Stand (nur gelesen, nichts geändert)

- **Keine Anmeldung vorhanden.** Es gibt heute weder eine Rollen-Tabelle noch eine
  Rollenprüfung in der Datenbank (die frühere Rollen-Funktion wurde 2026-05-10 wieder
  entfernt) und keine Anmelde-Oberfläche. Der Bereich `/admin` ist offen.
- **Anbieter-Katalog liegt schon in der Datenbank** (`cms_translation_provider_rates`):
  5 Lovable-AI-Modelle aktiv, dazu Google Gemini (Eintrag noch auf altem Modell
  `gemini-2.5-flash`), Anthropic und DeepL — alle drei deaktiviert, weil ein eigener
  Schlüssel fehlt.
- **Dänischer Lauf** `4d875298…`: Status *pausiert*, 5.315 von 18.855 Texten fertig,
  0 Fehler, gespeicherter Anbieter `lovable_ai` / `google/gemini-3.6-flash`,
  letzter Hinweis „Tagesbudget erreicht", Arbeiter aus. Der Lauf wird nicht angefasst.

Damit ist Punkt 1 des Auftrags eindeutig: eine funktionsfähige Schlüssel-Eingabe darf
in der heutigen offenen Oberfläche **nicht** entstehen. Es muss zuerst eine minimale
Anmeldung mit serverseitiger Rollenprüfung gebaut werden. Das ist laut Projektregeln
ein Bereich, der ausdrücklich freigegeben werden muss — daher dieser Plan.

## Etappe 1 — Minimale Admin-Anmeldung (nur für geschützte Aktionen)

- Rollen-Modell in der Datenbank: eigenes Rollen-Enum, Tabelle `user_roles`,
  Prüf-Funktion `has_role` (fester Suchpfad, enge Rechte), Zugriffsregeln, Rechtevergabe.
- Anmeldeseite `/admin/anmelden`: E-Mail + Passwort, kein Selbstregistrieren.
  Sitzungswechsel wird zuerst beobachtet, dann die Sitzung gelesen.
- **Wichtig:** Die bestehende Redaktionsarbeit bleibt unverändert offen erreichbar.
  Geschützt wird ausschließlich der neue Bereich „Schlüssel & Anbieter" sowie die neue
  Aktion „Pausierten Lauf mit neuem Anbieter fortsetzen".
- Erstes Administrationskonto: wird von dir angelegt/bestätigt; ich lege keine
  Zugangsdaten selbst fest.

## Etappe 2 — Schlüssel sicher serverseitig ablegen

- Speicherung verschlüsselt im Vault der Datenbank, Schreiben und Lesen nur aus dem
  Serverdienst. Klartext geht nie an den Browser, nie ins Protokoll, nie in den Code.
- Neuer Serverdienst-Bereich (im bestehenden Übersetzungsdienst, kein zweiter Dienst)
  mit Aktionen: Status lesen, speichern, ersetzen, löschen, testen.
- Der Browser bekommt pro Anbieter nur: eingerichtet ja/nein, letzte vier Zeichen,
  Zeitpunkt der letzten Änderung, Prüfergebnis.
- Jede Aktion: Rollenprüfung serverseitig, Mengenbremse, Protokolleintrag ohne Wert.
- Bereits vorhandene Projekt-Geheimnisse werden nicht verändert und weiterhin als
  gültige Quelle akzeptiert (Vorrang: Vault-Eintrag, sonst Projekt-Geheimnis).

## Etappe 3 — Echte Modellermittlung je Anbieter

- **Google Gemini:** nach gültigem Schlüssel serverseitig die Modellliste von Google
  abrufen und nur Modelle anbieten, die Textgenerierung unterstützen. Nichts wird
  „auf Verdacht" angezeigt. Fällt der Abruf aus: kleiner geprüfter Ersatzkatalog plus
  Feld „eigenes Modell".
- **Anthropic:** offizielle Modellliste, sonst geprüftes Eingabefeld.
- **DeepL:** keine Modellauswahl, nur Sprachprüfung.
- Ergebnis wird in `cms_translation_provider_rates` gespiegelt (aktualisierbar über
  Knopf „Modelle neu laden"), inklusive Lade- und Fehlerzustand in der Oberfläche.
  Der veraltete Eintrag `gemini-2.5-flash` wird dabei durch echte Werte ersetzt.

## Etappe 4 — Anbieter/Modell pro Sprache

- Neue Zuordnung je Sprache (Anbieter + Modell) in der Datenbank, gepflegt in der
  Sprachverwaltung.
- Aktivierung erst nach erfolgreichem kleinen Server-Test (ein sehr kurzer Testtext),
  mit verständlicher Fehlermeldung bei falschem Schlüssel, fehlendem Recht,
  unbekanntem Modell oder Sprachbeschränkung.

## Etappe 5 — Pausierten Lauf umstellen (streng begrenzt)

- Die Status- und Kostenanzeige zeigt künftig immer den **am Lauf gespeicherten**
  Anbieter und Modell — nicht die aktuelle Auswahl in der Oberfläche.
- Neue, ausdrücklich zu bestätigende Aktion „Pausierten Lauf mit neuem Anbieter
  fortsetzen":
  - nur bei Status *pausiert*,
  - nur nach erfolgreichem Schlüssel- und Modelltest,
  - in einem Schritt: derselbe Lauf und derselbe Fortsetzungspunkt werden auf den
    neuen Anbieter umgestellt, Protokolleintrag geschrieben, Arbeiter wieder scharf,
  - kein neuer Lauf, keine Rücksetzung der 5.315 fertigen Texte, keine
    Doppelverarbeitung (die bestehende Prüfung „schon vorhanden" bleibt aktiv).
- Der dänische Lauf bleibt unangetastet, bis ein eigener Schlüssel eingerichtet ist
  **und** du diese Aktion selbst auslöst. Ohne eigenen Schlüssel bleibt die bisherige
  Fortsetzung nach Rückkehr des Lovable-Tagesbudgets unverändert möglich;
  Budgetgrenzen werden nicht verändert.

## Prüfungen

- Tests: Rollenschutz (ohne Anmeldung und ohne Rolle wird abgewiesen), keine
  Klartext-Rückgabe von Schlüsseln, Modellermittlung inkl. Ersatzkatalog,
  Sprachzuordnung, atomare Fortsetzung desselben pausierten Laufs ohne Zähler-Reset.
- Typprüfung, Build, echte Vorschau (Anmeldung, Schlüssel-Status, Modelle laden,
  Statusanzeige des dänischen Laufs).
- Nichts wird veröffentlicht, keine bestehenden Schlüssel geändert.

## Was ich von dir brauche

1. Freigabe für die Anmeldung/Rollenprüfung (Etappe 1) — ohne diese Etappe darf keine
   Schlüssel-Eingabe entstehen; ich würde dann nur den erklärenden Hinweis in der
   offenen Ansicht ergänzen.
2. E-Mail-Adresse(n), die Administrationsrechte bekommen sollen.
