# Doku TCS-Webseite — Wegweiser

Stand: 2026-09-15 (Doku-/Hilfeabschluss).

> **Wichtig:** Es gibt derzeit **kein gültiges Gesamtgrün.** Die Nullwerte der
> Juni-2026-Messungen sind Historie. Bis zu einer frischen Messung gelten die
> CMS-Gates als **ungeprüft**, ebenso die offenen Sicherheitszustände
> (`/admin` ohne Login, `rpc_admin_*` ohne Caller-Prüfung).


## 1. Führender Arbeitseinstieg (genau einer)

**[`03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](./03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)**
— Dachdokument für Redaktion und Prompt-Arbeit.

- Abschnitt 2: Prompt-Schablone — **einzige** verbindliche Prompt-Quelle.
- Abschnitt 11: verbindlicher Arbeitsablauf (Ziel/Feld/Sprache vorher
  feststellen, Ablageorte, Sprachen, Schreibarbeiten, Abschlussnachweise
  in 11.6).

Alles Weitere unten ist **Status, Nachschlagewerk, Beleg oder Historie** —
**keine** parallele Regelquelle. Bei Widerspruch gilt das Dachdokument.

## 2. Aktueller Status

- [`current-status.md`](./current-status.md) — Kurzstatus (Etappen-Tabelle,
  offene Kernpunkte, nächste Etappe). Historische Zwischenstände stehen nur in
  [`archiv/status-historisch/current-status-bis-2026-09-15.md`](./archiv/status-historisch/current-status-bis-2026-09-15.md).
- [`04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](./04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md)
  — technischer Status; die Ampeln sind auf ihr Messdatum (2026-06-04)
  datiert und **kein heutiger Wert**.


## 3. Technische Verträge / Nachschlagewerk

Bedarfsgerecht lesen — kein Beleg dafür, dass der beschriebene Zustand
heute vollständig geprüft ist:

- [`../.lovable/always-follow.md`](../.lovable/always-follow.md) —
  technische Schutzregeln und Scope-Grenzen.
- [`lovable-custom-rules-compact.md`](./lovable-custom-rules-compact.md) —
  technische Kurzfassung. [`lovable-custom-rules.md`](./lovable-custom-rules.md)
  ist nur noch Kurzverweis.
- [`01-strategie/`](./01-strategie/) — Strategie (u. a.
  [`cms-light-source-of-truth.md`](./01-strategie/cms-light-source-of-truth.md),
  [`seitentyp-taxonomie.md`](./01-strategie/seitentyp-taxonomie.md)).
  **Weiterhin aktiv, nicht archiviert** — Stand pro Datei prüfen.
- [`02-architektur/`](./02-architektur/) — Architektur (u. a.
  [`section-typen-katalog.md`](./02-architektur/section-typen-katalog.md),
  [`karten-raster-regel.md`](./02-architektur/karten-raster-regel.md),
  [`datenmodell-erklaert.md`](./02-architektur/datenmodell-erklaert.md)).
  **Weiterhin aktiv, nicht archiviert** — Stand pro Datei prüfen.
- [`ai-start-prompt.md`](./ai-start-prompt.md) — Einstieg für KI / neue
  Mitarbeit (Kurzverweis).
- [`mitarbeiter-fahrplan.md`](./mitarbeiter-fahrplan.md) — Onboarding-Pfad.

## 4. Redaktion — Wege

- Dachdokument (siehe 1.) — führend.
- [`03-redaktion/kurzanleitung.md`](./03-redaktion/kurzanleitung.md) —
  Kurzweg für den Alltag (Wegweiser).
- [`03-redaktion/checkliste-redaktion.md`](./03-redaktion/checkliste-redaktion.md)
  und [`03-redaktion/redaktionshandbuch.md`](./03-redaktion/redaktionshandbuch.md)
  — Wegweiser; die Detailbeschreibungen liegen als Historie im Archiv und
  sind vor Nutzung gegen den tatsächlichen CMS-Stand zu prüfen.
- [`03-redaktion/qa-nach-redaktionsrunde.md`](./03-redaktion/qa-nach-redaktionsrunde.md)
  — Abschlussnachweise nach Abschnitt 11.6.
- [`03-redaktion/redaktions-aenderungsprotokoll.md`](./03-redaktion/redaktions-aenderungsprotokoll.md)
  und [`migration-log.md`](./migration-log.md) — **werden fortgeführt.**

## 5. Datierte Auditbelege (Historie, keine Regel)

- [`04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md`](./04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md)
  — Abschlussbericht Juni 2026. **Ausdrücklich historische Referenz, keine
  führende Regel und keine heutige Abnahme.**
- weitere Belege in [`04-betrieb/audit-snapshot/`](./04-betrieb/audit-snapshot/),
  jeweils auf ihr Messdatum bezogen.

## 6. Archiv

[`archiv/README.md`](./archiv/README.md) — Historie mit Ursprung, Stand und
aktivem Nachfolger. **Historische Messwerte sind keine aktuellen grünen
Gates.**

## 7. Sollregeln (Umsetzung im Einzelfall zu prüfen)

Diese Regeln beschreiben das **Ziel**, nicht eine heute erteilte Abnahme:

- **Inhalt zuerst:** Texte, Bilder, Alt-Texte gehören in die CMS-Tabellen
  (`cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`,
  `cms_navigation_nodes`), zentrale Bedien-Texte in den Katalog
  `cms_ui_strings`. Im Code bleiben Layout und Interaktion. Ob jede Stelle
  bereits so angebunden ist, ist **noch zu prüfen** (siehe
  [`current-status.md`](./current-status.md)).
- **Spiegelregel:** Reihenfolge, Sichtbarkeit und Inhalt aus dem Admin
  sollen sich 1:1 öffentlich abbilden. **Sollregel, keine technische
  Garantie** — pro Fall über die Preview-Prüfung belegen.
- **Schreiben nur über `rpc_admin_*`** — kein direkter Tabellenschreibzugriff
  aus dem Frontend.
- **Idempotente Migrationen** — gleicher Zielzustand auf frischer und
  bestehender Datenbank.
- **Produktdaten nur lesend** aus der Produktbasis.
- **Lokale Abschlussprüfung:** `npm run cms:preflight` (Typprüfung App +
  Node, Unit-Tests, `i18n:contract`, Build; Abbruch beim ersten Fehler).
  Ersetzt **keine** Struktur-, Datenbank-, Sicherheits- oder
  Preview-Abnahme.

## 8. Ersetzte Fassungen

Überholte Fassungen der in Etappe 1 ersetzten Regel-, Status- und
Anleitungsdokumente liegen mit Ursprung, Datum und Nachfolger in
[`archiv/README.md`](./archiv/README.md). Im Doku-Nachtrag vom 2026-09-14
kamen die vier Redaktions-Anleitungen aus `03-redaktion/` und
`mitarbeiter-fahrplan.md` dazu; die aktiven Pfade bestehen als kurze
Wegweiser weiter.

## Struktur

```text
docs/
  README.md                       ← du bist hier
  current-status.md               Kurzstatus
  ai-start-prompt.md              Einstieg für KI / neue Mitarbeit (Kurzverweis)
  mitarbeiter-fahrplan.md         Onboarding-Pfad
  migration-log.md                Migrations-Etappen (wird fortgeführt)
  lovable-custom-rules-compact.md technische Kurzfassung
  lovable-custom-rules.md         Kurzverweis

  01-strategie/                   Strategie (aktiv, Stand pro Datei)
  02-architektur/                 Architektur (aktiv, Stand pro Datei)
  03-redaktion/                   Dachdokument (führend) + Wegweiser + Protokoll
  04-betrieb/                     Laufender Betrieb
    audit-snapshot/               datierte Belege + technischer Status

  archiv/                         Historie, nicht maßgeblich
    status-historisch/ regeln-historisch/ redaktion-historisch/
    audit-historisch/ sprint-berichte/ lovable-historisch/
    pilot-plans/ checkpoints/ inventories/ strategie-historisch/
    architektur-historisch/ sync/ referenzen/
```
