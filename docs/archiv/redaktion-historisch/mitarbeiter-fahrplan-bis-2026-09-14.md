<!-- ARCHIVKOPIE -->

> **Historische Fassung — kein Ist-Zustand.**
> Ursprungspfad: `docs/mitarbeiter-fahrplan.md`
> Stand dieser Fassung: 2026-06-05 (nach Batch 25/26/27)
> Archiviert am: 2026-09-14 (Etappe 1, Doku-Nachtrag)
> Aktiver Nachfolger: docs/mitarbeiter-fahrplan.md (überarbeitet 2026-09-14)
>
> Diese Fassung ist **keine aktuelle Betriebs-, Sprach- oder
> Freigabezusage** und **kein aktueller Prüfwert**. Genannte Sollwerte,
> Audit-Zahlen, Sprachregeln und Abschlussregeln sind Historie.
> Relative Verweise wurden auf die Archivtiefe umgestellt; Basis der
> Originalpfade ist `docs/mitarbeiter-fahrplan.md`.

---

# Mitarbeiter-Fahrplan

Stand: 2026-06-05 (nach Batch 25/26/27 — CMS-Freeze + Doku-Hygiene).

Kurzer Onboarding-Pfad für neue Teammitglieder. **Wer prompted, braucht
das hier nicht** — der nimmt direkt die Prompt-Schablone aus dem
Dachdokument. Dieser Fahrplan ist nur für echte neue Menschen, die das
Projekt zum ersten Mal sehen.

## Tag 1 — Orientierung (60 Minuten)

In dieser Reihenfolge lesen:

1. [`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)
   — Dachdokument für Redaktion und Prompt-Arbeit (führende Startseite).
2. [`docs/ai-start-prompt.md`](../../ai-start-prompt.md) — Einstieg KI / neue
   Mitarbeit, goldene Regeln.
3. [`docs/current-status.md`](../../current-status.md) — Kurzstatus, was steht.
4. [`docs/02-architektur/datenmodell-erklaert.md`](../../02-architektur/datenmodell-erklaert.md)
   — die 6 CMS-Tabellen mit InDesign-Vergleich.

## Tag 1 — Praxis

- `/admin` öffnen, einmal durch eine Seite klicken (z. B.
  `/admin/pages/zutrittskontrolle`).
- Eine Subline ändern und auf der öffentlichen Seite prüfen → Spiegelregel
  live sehen.
- Ein Bild in einem Slot wechseln (`Asset hochladen` im Admin).

## Tag 2 — je nach Rolle

- **Redaktion:** [`docs/03-redaktion/kurzanleitung.md`](../../03-redaktion/kurzanleitung.md)
  + [`docs/03-redaktion/redaktionshandbuch.md`](../../03-redaktion/redaktionshandbuch.md).
- **Entwicklung / KI-Arbeit:** [`.lovable/always-follow.md`](../../../.lovable/always-follow.md),
  [`docs/02-architektur/architektur.md`](../../02-architektur/architektur.md),
  [`docs/02-architektur/rls-rpc-uebersicht.md`](../../02-architektur/rls-rpc-uebersicht.md).
- **Betrieb / Planung:** [`docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](../../04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md)
  + [`docs/04-betrieb/naechste-schritte.md`](../../04-betrieb/naechste-schritte.md).

## Wichtigste Begriffe

- **Slug** = der URL-Teil einer Seite (z. B. `zutrittskontrolle`).
- **Section / Block** = ein Inhaltsblock auf einer Seite (Hero,
  Karten-Reihe, FAQ …).
- **Field** = ein einzelnes Text-/Linkfeld in einer Section
  (Heading, Subline, CTA-Label …).
- **Asset-Slot** = ein Bildplatz in einer Section, mit Alt-Text.
- **nav_area** = der Navigationsbereich (Main / Meta / Footer / Persona).
- **Spiegelregel** = was im Admin steht, steht 1:1 auf der Website. Und umgekehrt.
- **DB-first Rendering** = die Website liest erst aus der DB, dann erst
  aus i18n-JSON.
- **Kurz-IDs** = N-… (Nav), P-… (Page), B-… (Block), A-… (Asset). Bei
  Problemen immer mitsenden.

## Wenn du nicht weiterweißt

- Lies [`.lovable/always-follow.md`](../../../.lovable/always-follow.md) und
  das Dachdokument.
- Bei Konflikt mit dem Auftrag: **stoppen und melden**, nicht improvisieren —
  speziell nicht an DB-Schema oder Public-Routen.
