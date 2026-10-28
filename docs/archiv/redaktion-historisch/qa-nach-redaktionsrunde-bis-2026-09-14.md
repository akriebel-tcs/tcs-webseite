<!-- ARCHIVKOPIE -->

> **Historische Fassung — kein Ist-Zustand.**
> Ursprungspfad: `docs/03-redaktion/qa-nach-redaktionsrunde.md`
> Stand dieser Fassung: 2026-05-27 (Tranche 22)
> Archiviert am: 2026-09-14 (Etappe 1, Doku-Nachtrag)
> Aktiver Nachfolger: docs/03-redaktion/qa-nach-redaktionsrunde.md (jetzt kurzer Wegweiser) + Dachdokument Abschnitt 11.6
>
> Diese Fassung ist **keine aktuelle Betriebs-, Sprach- oder
> Freigabezusage** und **kein aktueller Prüfwert**. Genannte Sollwerte,
> Audit-Zahlen, Sprachregeln und Abschlussregeln sind Historie.
> Relative Verweise wurden auf die Archivtiefe umgestellt; Basis der
> Originalpfade ist `docs/03-redaktion/qa-nach-redaktionsrunde.md`.

---

# QA nach jeder Redaktionsrunde

Stand: 2026-05-27 (Tranche 22, geprüft nach Batch 28 — weiterhin gültig).

> Kurze, immer gleiche Routine nach einer Redaktionsrunde — bevor
> Inhalte als "fertig" gelten oder veröffentlicht werden.
> Begleitend: [`checkliste-redaktion.md`](../../03-redaktion/checkliste-redaktion.md),
> Dachdokument [`redaktions-uebergabe-und-prompt-regeln.md`](../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md).

## 1. Technische Audits (Pflicht)

Reihenfolge ist egal; alle laufen schnell und lesend.

```bash
npm run i18n:check
node scripts/cms/medien-konsistenz-audit.mjs
node scripts/cms/rendertreue-audit.mjs
node scripts/cms/redaktions-fluss-audit.mjs
node scripts/cms/admin-hygiene-audit.mjs
```

Sollwerte (Stand 2026-05-27, nach Tranche 21):

| Audit | Erwartet |
|---|---|
| `i18n:check` | 0 Fehler / 0 Warnungen |
| Medien (A–F) | A unverändert · keine neuen B/C/D ohne Erklärung |
| Rendertreue | **R4 = 0** (sonst Rendertreue-Bug) · R3 darf nur Bekanntes enthalten |
| Redaktions-Fluss | **S2 = 0** (keine neue Schein-Bearbeitung) · S4 nicht ansteigend |
| Admin-Hygiene | H4 = 0 · H2/H3 nur in Klasse "Page inaktiv (Draft)" |

Jeder Anstieg gegenüber der letzten Tranche ist ein **Befund**: in den
Bericht aufnehmen und ggf. eine Folge-Tranche auslösen — nicht selbst
in der Datenbank "geradeziehen".

## 2. Sichtprüfung Stichproben (Pflicht)

Pro Redaktionsrunde mindestens prüfen:

- **Jede geänderte Seite** einmal in der Vorschau öffnen (DE + EN).
- **Jeden kopierten Block** einmal auf der Zielseite sehen.
- **Jedes ausgetauschte Bild** im richtigen Slot und Viewport.
- **Jedes geänderte Icon** (Lucide oder TCS-Bildicon) im richtigen Block.
- Wenn **Tablet/Mobile-Bilder** betroffen waren: in entsprechender
  Vorschau-Breite öffnen.
- **Mobile** zumindest stichprobenhaft für eine Seite der Runde.

## 3. Schnelle Plausibilitäten

- Reihenfolge im Admin = Reihenfolge auf der Seite? (Spiegelregel)
- Aktiv im Admin = sichtbar auf der Seite? (sonst Rendertreue-Bug melden)
- DE und EN beide gefüllt? (sonst `i18n:check` meckert ohnehin)
- Alt-Texte bei neuen/getauschten Bildern vorhanden?

## 4. Wann ist die Runde "fertig"?

Fertig **nur**, wenn:

- alle Pflicht-Audits grün sind (oder Befunde dokumentiert und einer
  Folge-Tranche zugewiesen),
- Stichproben optisch bestätigt sind,
- der Bericht der Runde enthält:
  - Liste geänderter Seiten/Blöcke (mit Kurz-IDs)
  - Audit-Zahlen vorher/nachher
  - offene Befunde
  - Bestätigung: keine Public-Navigation / Routen / Produktdaten
    geändert.

## 5. Was NICHT in QA gehört

- Keine spontanen Daten-Korrekturen "nebenbei" — entweder Admin-Pflege
  oder eigener Inhalts-Prompt.
- Keine Renderer-/Admin-UI-Änderungen — das ist eigene Tranche.
- Keine Migration — das ist eigene Tranche.

## 6. Eskalation

Wenn in der QA auftritt:

- **R4 > 0** → Rendertreue-Bug. Sofort melden, nicht eigenständig
  deaktivieren.
- **S2 > 0** → Schein-Bearbeitung. Block-Kurz-ID melden.
- **Medien-Audit C/D** neu → Slot-/Viewport-Problem. Asset prüfen.
- **Admin-Hygiene H4 > 0** → renderer-ignorierter Slot wieder aktiv.
  Cleanup-Tranche anstoßen.
