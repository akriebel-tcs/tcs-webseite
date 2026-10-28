<!-- ARCHIVKOPIE -->

> **Historische Fassung — kein Ist-Zustand.**
> Ursprungspfad: `docs/03-redaktion/kurzanleitung.md`
> Stand dieser Fassung: 2026-06-05 (nach Batch 27/28)
> Archiviert am: 2026-09-14 (Etappe 1, Doku-Nachtrag)
> Aktiver Nachfolger: docs/03-redaktion/kurzanleitung.md (jetzt kurzer Wegweiser) + docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md (Dachdokument)
>
> Diese Fassung ist **keine aktuelle Betriebs-, Sprach- oder
> Freigabezusage** und **kein aktueller Prüfwert**. Genannte Sollwerte,
> Audit-Zahlen, Sprachregeln und Abschlussregeln sind Historie.
> Relative Verweise wurden auf die Archivtiefe umgestellt; Basis der
> Originalpfade ist `docs/03-redaktion/kurzanleitung.md`.

---

# Kurzanleitung Redaktionsteam — TCS CMS-Light

> Eine Seite. Zum Ausdrucken oder per Mail verschicken.
> Stand: 2026-06-05 (nach Batch 27, geprüft nach Batch 28).
>
> **Für Prompts an Lovable ausschließlich die Schablone im Dachdokument
> verwenden:** [`redaktions-uebergabe-und-prompt-regeln.md`](../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)
> (Abschnitt 2). Andere Prompt-Quellen — auch ältere im Archiv — sind
> nicht mehr gültig. Bei Konflikt gilt das Dachdokument.
>
> Vollversion: [Redaktionshandbuch](../../03-redaktion/redaktionshandbuch.md).

---

## Wo arbeite ich?

Im **`/admin`-Bereich** der TCS-Webseite. Link bekommt ihr von der technischen
Steuerung.

---

## Grundsatz

Es gibt **keine grundsätzlich ausgeschlossenen Änderungswünsche**.
Entscheidend ist, **auf welcher Ebene** sie umgesetzt werden:

| Ebene | Wofür |
|---|---|
| **Admin / CMS-Light** | Texte, Bilder, Reihenfolge, Sichtbarkeit, Nav-Labels |
| **Lovable / Code** | Templates, Layouts, neue Felder, CI, neue Funktionen |
| **Produktdatenbank** | Artikel, Specs, Produktbilder, PDP |
| **Strategie / CI** | Konzept, Designsystem — danach techn. Umsetzung |

Das Redaktionsteam arbeitet im Alltag **im Admin**. Strukturelle,
gestalterische oder funktionale Änderungen werden über **Lovable-Prompts**
durch die für den Bereich verantwortliche Person umgesetzt — mit klarem
Scope, expliziter Sprachangabe (DE/EN), ausgeführten Checks und Bericht.
Vorlage: [`../04-betrieb/prompts-vs-admin.md`](../../04-betrieb/prompts-vs-admin.md).
Technischer Gegencheck bei Bedarf.

---

## 4 Arbeitsprinzipien

1. **Tägliche Inhaltsarbeit gehört in den Admin** — nicht in einen Lovable-Prompt.
2. **Vorschau nach jedem Speichern prüfen.** Wenn nichts erscheint: melden, nicht doppelt speichern.
3. **Bei Fehlern Kurz-ID mitsenden** (N-… / P-… / B-… / A-…).
4. **Änderungen jenseits des Admins** über Lovable-Prompt umsetzen — mit Ziel, Scope, Sprachen (DE/EN), Ausschlüssen, Checks und Bericht.

---

## Text ändern

1. Seite im Baum wählen
2. Block (Section) wählen
3. Feld DE oder EN ändern
4. Speichern
5. Vorschau prüfen

## Bild tauschen

1. Seite + Block wählen
2. Beim vorhandenen Bild-Slot auf **Hochladen**
3. Datei wählen
4. Alt-Text DE/EN ergänzen
5. Vorschau prüfen

## Seite duplizieren

1. Vorlagen-Seite wählen
2. **Duplizieren** klicken
3. Kopie ist automatisch Entwurf
4. Inhalte ersetzen, Veröffentlichung über Änderungswunsch

---

## Was als Änderungswunsch geht (nicht im Admin)

- Produktdaten / Katalog / PDP
- neue Templates, Layouts, Bildplätze, technische Felder
- CI-/Designänderungen
- neue Seitentypen, neue Hauptnavigationsstrukturen
- ganze Seiten umbauen oder entfernen

→ Als Lovable-Prompt formulieren (Ziel, Kontext, betroffene Seiten,
Sprachen DE/EN, Erlaubt/Nicht erlaubt, Checks, Bericht). Vorlage:
`docs/04-betrieb/prompts-vs-admin.md`.

---

## Wenn etwas nicht geht

| Problem | Was tun |
|---|---|
| Feld ist grau / nur lesbar | An techn. Steuerung melden, Kurz-ID nennen |
| Fehlermeldung beim Speichern | Wortlaut notieren, melden |
| Änderung nicht öffentlich sichtbar | Melden, **nicht** doppelt speichern |
| Versehentlich etwas geändert | Vorgang dokumentieren (Seite, Kurz-ID, Änderung), Folgeschritt entscheiden (Rückgängig im Admin oder technischer Gegencheck) |

---

**Dachdokument (Prompts):** `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`
**Vollversion:** `docs/03-redaktion/redaktionshandbuch.md`
**Prompt vs. Admin:** `docs/04-betrieb/prompts-vs-admin.md`
