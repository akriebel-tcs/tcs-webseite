> **Historisch — ersetzt durch das Dachdokument** (`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`). Verschoben im Batch 27, 2026-06-05. Inhalt unverändert darunter erhalten.

# Willkommen im TCS-Redaktionsbereich

> **Hinweis (Stand 2026-06-05):** Diese Seite wird abgelöst.
> Führende Startseite ist jetzt:
> **[`redaktions-uebergabe-und-prompt-regeln.md`](./redaktions-uebergabe-und-prompt-regeln.md)**
> (Dachdokument für Redaktion und Prompt-Arbeit).
> Inhalte unten bleiben gültig, bis die finale Archivierung beauftragt ist.
> Bei Widerspruch gilt das Dachdokument.

Diese eine Seite ist euer Startpunkt. Mehr braucht ihr für den Anfang nicht.

---

## Worum geht es?

Ihr pflegt **Texte und Bilder** der TCS-Webseite im internen Admin (`/admin`).
Produktdaten (Katalog, Produktdetailseiten, technische Specs) liegen in einer
**separaten Produktdatenbank** und werden in einem eigenen Prozess gepflegt —
nicht hier.

> **Grundsatz:** Es gibt keine grundsätzlich ausgeschlossenen
> Änderungswünsche. Entscheidend ist, **auf welcher Ebene** eine Änderung
> umgesetzt wird.

---

## Die vier Änderungsebenen

| Ebene | Was passiert dort | Wer macht das |
|---|---|---|
| **1. Admin / CMS-Light** | tägliche redaktionelle Arbeit an bestehenden Inhalten | Redaktionsteam |
| **2. Lovable / Prompt / Code** | Templates, Layouts, neue Seitentypen, neue Felder, CI, Funktionen | Marketing/Redaktion verantwortlich; technischer Gegencheck bei Bedarf |
| **3. Produktdatenbank** | Artikel, Specs, Produktbilder, Filter, PDP-Daten | Produkt-/Katalogprozess |
| **4. Strategie / CI / Konzept** | grundsätzliche Entscheidungen (Designsystem, Hauptstruktur) | fachliche Entscheidung → danach technische Umsetzung über Ebene 2 |

Alle vier Ebenen sind offen. Sie laufen nur über **unterschiedliche Wege**.

---

## Was läuft im Admin (Ebene 1)

Das ist eure tägliche Arbeit:

- Texte ändern (Überschriften, Subline, Fließtext, Buttontexte — sofern Feld vorhanden)
- DE- und EN-Variante pflegen
- bestehende Bilder austauschen
- Alt-Texte (DE/EN) pflegen
- Reihenfolge vorhandener Blöcke ändern (sofern Drag & Drop angeboten)
- Sichtbarkeit vorhandener Blöcke an/aus
- Navigations-Beschriftungen ändern (sofern freigegeben)
- Seite als **Entwurf** duplizieren

Bei **veröffentlichten, aktiven und verlinkten** Seiten wirken gespeicherte
Änderungen direkt auf die öffentliche Website. Bei **Entwürfen,
deaktivierten Blöcken oder nicht verlinkten Seiten** ist die Änderung nur
im Admin bzw. in der Vorschau sichtbar. Nach jedem Speichern bitte in der
Vorschau prüfen.

---

## Was nicht direkt im Admin geändert wird

Folgende Punkte sind **selbstverständlich änderbar**, aber nicht als normale
Redaktionsarbeit im Admin. Sie werden als technischer oder struktureller
**Änderungswunsch** aufgenommen und über Lovable / Code / Datenbank umgesetzt
(Ebene 2 oder 3):

- Produktdaten / Katalog / PDP → Produktprozess (Ebene 3)
- Code, Templates, Layoutlogik
- neue Seitentypen oder neue Inhaltsblöcke
- neue Bildplätze
- neue technische Felder
- neue Buttons an neuer Stelle, neue Logik
- größere Navigationsstruktur-Änderungen
- CI-/Designänderungen
- ganze Seiten umbauen oder entfernen
- erstmalige Veröffentlichung neuer Seitenarten

> Wenn so eine Änderung nötig ist: **nicht im Admin improvisieren**, sondern
> als Änderungswunsch an die technische Steuerung geben.

---

## Wie ihr einen Änderungswunsch sauber formuliert

Kurz, präzise, mit Beispiel oder Screenshot:

1. **Was** soll geändert werden? (Seite, Block, Bereich)
2. **Warum**? (fachlicher Grund / Wirkung)
3. **Wie**? (gewünschtes Ergebnis, ggf. Skizze)
4. **Bis wann**? (falls relevant)

Admin ist der Standardweg für bestehende redaktionelle Inhalte.
Lovable-Prompts sind der Arbeitsweg für Struktur, Funktion, Layout,
Datenmodell und größere Bulk-Anpassungen. Wer einen Prompt formuliert,
verantwortet Scope, Sprachen (DE/EN), Ausschlüsse, Prüfung und
Dokumentation. Bei Unsicherheit kann ein technischer Gegencheck
eingeholt werden.

Vorlage und Standard-Leseliste für Prompts:
[`../04-betrieb/prompts-vs-admin.md`](../04-betrieb/prompts-vs-admin.md).

---

## Drei Arbeitsprinzipien

1. **Tägliche Inhaltsarbeit gehört in den Admin.**
2. **Strukturelle, gestalterische oder funktionale Änderungen** werden über
   Lovable-Prompts umgesetzt — mit klarem Scope, expliziter Sprachangabe
   (DE/EN) und ausgeführten Checks.
3. **Nach jedem Speichern Vorschau prüfen.** Erscheint eine erwartete
   Änderung nicht: Vorgang dokumentieren (Seite, Kurz-ID, Screenshot,
   Fehlermeldung) und Folgeschritt entscheiden — nicht doppelt speichern.

---

## Wenn etwas nicht geht

- Fehlermeldung notieren (z. B. `field_not_allowed`, `section_not_found`,
  `asset_not_valid_for_edit`)
- **Kurz-ID immer mitschicken**:
  - **N-…** Navigationsknoten
  - **P-…** Page (Seite)
  - **B-…** Block / Section
  - **A-…** Asset (Bild)
- Vorgang dokumentieren und Folgeschritt entscheiden (Wiederholung,
  Prompt-Auftrag oder technischer Gegencheck).

---

## Sicherheitsnetz beim Prompten

Lovable wird mit festen Projektregeln aus `.lovable/always-follow.md` und
den verlinkten Strategie-Dokumenten gesteuert. Prompts, die gegen diese
Regeln verstoßen würden (z. B. Produktdaten ändern, Inhalte fest in den
Code schreiben, öffentliche Navigation ohne Auftrag umbauen), sollen
gestoppt und gemeldet werden. Diese Regeln reduzieren das Risiko,
ersetzen aber keine fachliche Prüfung. Jede prompt-auslösende Person
prüft das Ergebnis (Build, i18n-Check, Vorschau) und holt bei Bedarf
einen technischen Gegencheck ein.

---

## Mehr Details

- Ausführliches Handbuch: [`redaktionshandbuch.md`](./redaktionshandbuch.md)
- Kurzanleitung zum Ausdrucken: [`kurzanleitung.md`](./kurzanleitung.md)
- Wann Admin, wann Prompt: [`../04-betrieb/prompts-vs-admin.md`](../04-betrieb/prompts-vs-admin.md)
- Übergabe-Notiz: [`uebergabe-marketing-redaktion-2026-05-17.md`](./uebergabe-marketing-redaktion-2026-05-17.md)
