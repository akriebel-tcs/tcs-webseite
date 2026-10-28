# Mitarbeiter-Fahrplan

Stand: 2026-09-15 (Doku-/Hilfeabschluss).

Kurzer Einstieg für neue Teammitglieder. **Wer promptet, braucht das hier
nicht** — dafür gilt die Schablone in Abschnitt 2 des Dachdokuments.

Die frühere Fassung (Stand 2026-06-05, mit „sechs CMS-Tabellen",
Spiegelregel als Ist-Zustand und einer unaufgeforderten Übungsänderung)
liegt unverändert unter
[`archiv/redaktion-historisch/mitarbeiter-fahrplan-bis-2026-09-14.md`](./archiv/redaktion-historisch/mitarbeiter-fahrplan-bis-2026-09-14.md)
und ist **Historie**.

## Lesen — nach Rolle

**Redaktion / Prompt-Arbeit (zuerst):**

1. [`03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](./03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)
   — führende Regelquelle (Abschnitt 2: Prompt-Schablone; Abschnitt 11:
   verbindlicher Arbeitsablauf).
2. [`current-status.md`](./current-status.md) — aktueller Stand und offene
   Punkte. Derzeit **kein Gesamtgrün**.

**KI / neue technische Mitarbeit:**
[`ai-start-prompt.md`](./ai-start-prompt.md) (Einstiegs-Wegweiser), dazu
[`../.lovable/always-follow.md`](../.lovable/always-follow.md).

**Strategie / Architektur** ([`01-strategie/`](./01-strategie/),
[`02-architektur/`](./02-architektur/)): **nur bedarfsgerecht**, wenn eine
konkrete Aufgabe es verlangt — keine Pflichtlektüre und kein Beleg für
den heutigen Umsetzungsstand.

## Erste Orientierung — rein lesend

- `/admin` öffnen, eine Seite ansehen, den Baum durchklicken.
- Auf der öffentlichen Seite dieselbe Stelle betrachten.
- **Nichts ändern.** Übungs- oder Teständerungen nur, wenn sie
  ausdrücklich beauftragt sind.

## Vor jeder beauftragten Arbeit

Kurz benennen: **Ziel** (Seite/Slug + Kurz-ID, Baustein, Feld/Bildslot),
**führende Quelle**, **Sprache(n)**, **bestehender Schreibweg**. Bei
mehrdeutigem Ziel: melden, nicht raten.

Am Ende die drei Nachweise nach Abschnitt 11.6 liefern (Rücklesen aus der
Datenbank, CMS-Bearbeitbarkeit, sichtbare Preview-Prüfung). Fehlender
Nachweis = **offen**.

## Begriffe

- **Slug** = URL-Teil einer Seite (z. B. `zutrittskontrolle`).
- **Section / Baustein / Block** = Inhaltsblock auf einer Seite.
- **Feld** = einzelnes Text-/Linkfeld in einem Baustein.
- **Asset-Slot** = Bildplatz mit Alt-Text.
- **nav_area** = Navigationsbereich (Hauptmenü, Meta, Footer, Persona).
- **Spiegelregel** = **Sollregel**: was im Admin steht, soll 1:1 öffentlich
  erscheinen. Ob das überall greift, ist pro Fall zu prüfen — es ist keine
  technische Garantie.
- **Kurz-IDs** = `N-…` (Navigation), `P-…` (Seite), `B-…` (Baustein),
  `A-…` (Asset). Bei Problemen immer mitsenden.

## Wenn du nicht weiterweißt

Dachdokument und [`../.lovable/always-follow.md`](../.lovable/always-follow.md)
lesen. Bei Konflikt mit dem Auftrag: **stoppen und melden**, nicht
improvisieren.
