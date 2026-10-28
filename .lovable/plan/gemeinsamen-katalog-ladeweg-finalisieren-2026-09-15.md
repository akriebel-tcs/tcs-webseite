# Gemeinsamen Katalog-Ladeweg finalisieren

## Ziel
Die drei Verbraucher der Produktliste nutzen denselben gebündelten Ladeweg. Jeder Verbraucher kann unabhängig abbrechen; die echte Netzabfrage endet erst, wenn kein Verbraucher mehr wartet. Alte Ergebnisse werden nach Fehlern oder Sprach-/Kategoriewechseln eindeutig als vorheriger Stand gekennzeichnet.

## Umsetzung
- Den Haupt-Listing-Aufruf auf den gemeinsamen Ladeweg umstellen und dessen Sprachantwort weiterhin korrekt ableiten.
- Den gemeinsamen Cache um verbraucherbezogene Abbruchverwaltung ergänzen:
  - identische Parameter teilen genau eine laufende Netzabfrage,
  - ein einzelner Abbruch beeinflusst andere Verbraucher nicht,
  - bei Abbruch aller Verbraucher wird die Netzabfrage beendet,
  - ein späterer Verbraucher startet danach sauber neu.
- Cache bei der bestehenden kurzen Gültigkeit belassen, abgelaufene Einträge entfernen und die Größe fest begrenzen.
- Fehler-/Abschlussbehandlung nur auf den noch identischen Cacheeintrag anwenden, damit alte Anfragen keine neueren Einträge löschen.
- `describeDbError` auf erlaubte Felder beschränken; unbekannte Objekte neutral darstellen und sensible Inhalte in erlaubten Textfeldern redigieren.
- Bei Fehlern nach Sprach-, Kategorie- oder Filterwechsel die stehenbleibende Liste ausdrücklich als vorherigen Stand kennzeichnen.

## Prüfungen
- Tests für zwei Verbraucher, Einzelabbruch, Gesamtabbruch, Neustart nach Abbruch sowie getrennte Sprach-/Kategorie-Schlüssel.
- Sicherheitstests für unbekannte Fehlerobjekte und Redaktion von Tokens, Authorization-Angaben und Zugangsdaten in URLs.
- Interaktionstest für die Kennzeichnung vorheriger Ergebnisse.
- Fokussierte Tests, Gesamtsuite, Typprüfung, Vorprüfung und Build.
- Praktische Preview-Prüfung mit Netzwerkmessung für Paketkatalog sowie schnelle Sprach-/Kategoriewechsel.

## Grenzen
Keine Datenbank-, Inhalts-, Rechte-, Übersetzungs- oder Veröffentlichungsänderungen. Das Datenblattlayout bleibt unberührt.
