# QA nach einer Redaktionsrunde — Wegweiser

Stand: 2026-09-14 (Etappe 1, Doku-Nachtrag).

Die frühere QA-Routine mit festen Sollwerten und DE+EN-Pflicht ist
**Historie** und liegt unter
[`../archiv/redaktion-historisch/qa-nach-redaktionsrunde-bis-2026-09-14.md`](../archiv/redaktion-historisch/qa-nach-redaktionsrunde-bis-2026-09-14.md).
Die dort genannten Zahlen sind **keine aktuellen Prüfwerte** und **keine
Freigabe**.

## Was heute gilt

Führend ist das Dachdokument, Abschnitt 11.6
([`redaktions-uebergabe-und-prompt-regeln.md`](./redaktions-uebergabe-und-prompt-regeln.md)).
Eine Runde gilt erst als abgeschlossen, wenn für die **betroffenen
Inhalte** alle drei Nachweise vorliegen:

1. **Rücklesen aus der Datenbank** — der gespeicherte Wert wird
   tatsächlich zurückgelesen.
2. **CMS-Bearbeitbarkeit** — das Feld bzw. der Bildslot ist im Admin
   pflegbar.
3. **Sichtbare Preview-Prüfung** — die Änderung ist in der Vorschau
   sichtbar (leer, ausgeblendet, fehlend und Ladefehler sind zu
   unterscheiden).

## Grenzen ehrlich benennen

- Eine lokale Codeprüfung (`npm run cms:preflight`) ist **kein Ersatz**
  für diese drei Nachweise und keine Datenbank-, Sicherheits- oder
  Browser-Abnahme.
- **Fehlender Nachweis = offen**, nicht „erfolgreich".
- Ein **alter grüner Bericht** (z. B. Juni 2026) ist keine Freigabe für
  heutige Arbeit. Es gibt derzeit **kein Gesamtgrün**
  ([`../current-status.md`](../current-status.md)).
- Nicht ausgeführte Prüfungen werden als **ungeprüft** gemeldet.

Keine neuen Prüfschwellen, Freigabelisten oder Übersetzungspflichten
entstehen aus dieser Seite.
