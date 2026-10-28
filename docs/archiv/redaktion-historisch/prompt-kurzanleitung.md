> **Historisch — ersetzt durch das Dachdokument** (`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`). Verschoben im Batch 27, 2026-06-05. Inhalt unverändert darunter erhalten.

# Prompt-Regel für die Arbeit an der TCS-Webseite

> **Hinweis (Stand 2026-06-05):** Diese Seite wird abgelöst durch das
> Dachdokument **[`redaktions-uebergabe-und-prompt-regeln.md`](./redaktions-uebergabe-und-prompt-regeln.md)**.
> Inhalte hier bleiben bis zur Archivierung gültig — bei Widerspruch
> gilt das Dachdokument.

> Verbindliche Anleitung, wie Änderungen an der TCS-Webseite per Lovable-Prompt
> sauber beauftragt werden. Vollkontext: [Prompt oder Admin?](../04-betrieb/prompts-vs-admin.md) ·
> [Always-Follow](../../.lovable/always-follow.md)

---

## Kurzfassung (eine Seite)

- **Admin (`/admin`)** ist der Standardweg für bestehende redaktionelle Inhalte
  (Texte, Bilder, Alt-Texte, Reihenfolge, Sichtbarkeit, Navi-Labels).
- **Lovable-Prompt** ist der Weg für Struktur, Layout, neue Felder/Sections,
  CI, neue Funktionen und größere Bulk-Änderungen.
- **Produktdatenbank** (Artikel, Specs, PDP, Filter) ist ein eigener Prozess
  und wird nicht im CMS-Light gepflegt.
- Jeder Prompt beginnt mit dem **Arbeitsregel-Block** (siehe unten).
- **DE/EN-Default:** DE ändern, EN wird im selben Prompt-Lauf automatisch über
  die Edge Function `cms-translate-field` übersetzt und gespeichert.
  Muss nicht extra angefordert werden. Nur Abweichungen
  („nur DE", „nur EN", „EN unverändert lassen") müssen explizit drinstehen.
- Redaktionelle Inhalte **niemals** hartcodiert in `.tsx` schreiben.
- Nach jeder Änderung: `npm run i18n:check` und `npm run build` (bei CMS-Themen
  zusätzlich `npm run cms:audit:renderer` und/oder `npm run cms:check:fout`).

**Pflichtblock am Anfang jedes Prompts (kopierbar):**

```text
Arbeitsregel:
Lies zuerst .lovable/always-follow.md, docs/current-status.md und
docs/04-betrieb/prompts-vs-admin.md und halte dich daran.
```

---

## Grundsatz

Die TCS-Webseite kann auf mehreren Ebenen geändert werden. Entscheidend ist
nicht, ob etwas geändert werden darf, sondern über welchen Arbeitsweg es
sinnvoll geändert wird.

Admin ist der Standardweg für bestehende redaktionelle Inhalte. Lovable ist
der Änderungsweg für Struktur, Funktion, Layout, Datenmodell und größere
Bulk-Anpassungen. Die Produktdatenbank bleibt ein separater Prozess.

Bei jedem Prompt sind Ziel, Umfang, Sprachen, Ausschlüsse und Prüfungen
explizit anzugeben.

---

## Wann im Admin arbeiten?

Der Admin-Bereich `/admin` ist der Standardweg für bestehende redaktionelle
Inhalte.

Im Admin werden bearbeitet:

- Texte
- Überschriften
- Buttontexte, sofern als Feld vorhanden
- Bilder an vorhandenen Bildplätzen
- Alt-Texte
- DE-/EN-Felder
- Reihenfolge vorhandener Blöcke
- Sichtbarkeit vorhandener Blöcke
- Navigationsbeschriftungen, sofern freigegeben
- bestehende Seiteninhalte

Faustregel:

> Würde es ein Redakteur in einem normalen CMS pflegen, gehört es in den Admin.

---

## Wann mit Lovable prompten?

Lovable wird genutzt, wenn eine Änderung über die reine Redaktion hinausgeht.

Typische Prompt-Themen:

- neue Layouts
- neue Templates
- neue Inhaltsblöcke
- neue Bildplätze
- neue technische Felder
- neue Buttons an neuer Stelle
- Änderungen an CI, Farben, Typografie, Abständen
- neue Seitentypen
- größere Navigationsänderungen
- Produktkatalog-Funktionen
- Konfigurator-Anbindungen
- technische Fehlerbehebung
- Datenmigration oder Bulk-Änderungen
- mehrere Texte oder Bilder in einem Lauf einspielen

Faustregel:

> Würde es ein Entwickler bauen oder strukturell ändern, gehört es in Lovable.

---

## Produktdaten

Produktdaten werden nicht im CMS-Light gepflegt.

Dazu gehören:

- Artikelnummern
- technische Daten
- Produktspezifikationen
- Produktbilder im Katalog / auf Produktdetailseiten
- Filterlogik
- BMEcat-/Kataloglogik
- PDP-Daten

Diese Themen gehören in den Produktdatenbank-/Katalogprozess.

Redaktionelle Website-Bilder (z. B. Hero-Bilder, Content-Bilder, Bilder in
redaktionellen Seitenbereichen) werden dagegen im CMS-Light gepflegt.

---

## Pflichtblock am Anfang jedes Lovable-Prompts

Jeder Prompt beginnt mit diesem Block:

```text
Arbeitsregel:
Lies zuerst .lovable/always-follow.md, docs/current-status.md und
docs/04-betrieb/prompts-vs-admin.md und halte dich daran.
```

Dadurch kennt Lovable den aktuellen Projektstand, die Trennung zwischen
CMS-Light, Code und Produktdatenbank sowie die Regeln für Datenbank,
Inhalte und Checks.

---

## Prompt-Gerüst

Jeder Lovable-Prompt sollte möglichst nach diesem Muster aufgebaut sein:

```text
Titel:
<kurzer technischer Titel der Änderung>

Arbeitsregel:
Lies zuerst .lovable/always-follow.md, docs/current-status.md und
docs/04-betrieb/prompts-vs-admin.md und halte dich daran.

Ziel:
<ein Satz, was am Ende anders sein soll>

Kontext:
<kurze Einordnung, warum diese Änderung nötig ist>

Betroffen:
- Seite / Route:
- Bereich / Section:
- Komponente:
- Datenbank / Tabelle, falls relevant:

Sprachen:
- Default bei Inhaltsänderungen: DE ändern, EN wird im selben Prompt-Lauf
  automatisch über die Edge Function `cms-translate-field` übersetzt
  und gespeichert. Muss nicht extra angefordert werden.
- Falls bestehende EN-Texte bereits fachlich poliert sind, ausdrücklich
  schreiben: "EN unverändert lassen".
- Wenn nur eine Sprache geändert werden soll, ausdrücklich schreiben:
  "nur DE" oder "nur EN".

Erlaubt:
- <genau auflisten, was geändert werden darf>

Nicht erlaubt:
- keine Produktdatenbank ändern
- keine Inhalte außerhalb des genannten Bereichs ändern
- keine öffentlichen Routen ändern, sofern nicht ausdrücklich beauftragt
- keine Navigation / Footer ändern, sofern nicht ausdrücklich beauftragt
- keine neuen RPCs oder Migrationen ohne ausdrücklichen Auftrag
- keine redaktionellen Inhalte hartcodiert in .tsx schreiben

Akzeptanz:
- <woran erkennbar ist, dass die Änderung fertig ist>
- <konkrete Punkte, die geprüft werden sollen>

Checks:
- npm run i18n:check
- npm run build
- ggf. npm run cms:audit:renderer
- ggf. npm run cms:check:fout

Bericht:
Bitte am Ende berichten:
- welche Dateien geändert wurden
- ob Datenbank / Migrationen betroffen waren
- ob DE und EN geändert wurden
- ob die Produktdatenbank unverändert blieb
- welche Checks ausgeführt wurden
- ob es offene Punkte gibt
```

---

## Inhalt-zuerst-Regel

Redaktionelle Inhalte gehören in die Datenbank / ins CMS-Light, nicht fest
in den Code.

**In die Datenbank / CMS-Light gehören:**

- Texte
- Headlines
- Sublines
- Buttontexte
- Linklabels
- Bilder
- Alt-Texte
- Fokuspunkte
- Reihenfolge vorhandener Sections
- Sichtbarkeit vorhandener Sections
- Navigationslabels
- Meta-Texte, sofern im CMS als bearbeitbares Feld vorgesehen

**In den Code / Lovable gehören:**

- Layout
- Spacing
- Animation
- Renderlogik
- Templates
- neue Section-Typen
- neue technische Felder
- Routing
- Slugs (technische Struktur)
- CI / Farben / Typografie
- neue Funktionen
- neue Komponenten

**Regel:**

> Wenn ein Prompt Inhalte ändert, sollen diese über CMS-Light / Datenbank
> gepflegt werden. Wenn ein Prompt Aussehen, Verhalten, Struktur oder Logik
> ändert, gehört die Änderung in Code / Lovable.

Redaktionelle Inhalte nicht hartcodiert in `.tsx` schreiben. Technische
UI-Beschriftungen, Komponentenlogik und Layout gehören dagegen weiterhin
in den Code.

---

## Was ein Prompt nicht sein sollte

Nicht sinnvoll:

> „Mach die Seite schöner."
> „Ändere mal die Produkte."
> „Bring alles auf den neuen Stand."
> „Passe Bilder und Texte überall an."
> „Mach das wie im Screenshot."

Besser:

- eine konkrete Seite nennen
- einen konkreten Bereich nennen
- Ziel beschreiben
- DE/EN-Verhalten nur angeben, wenn vom Default abgewichen wird
- erlaubte Änderungen nennen
- Ausschlüsse nennen
- Akzeptanzkriterien formulieren
- Checks verlangen

---

## Beispiel: redaktionelle Bulk-Änderung per Prompt

```text
Titel:
cms-inhalte-startseite-cta-texte-1

Arbeitsregel:
Lies zuerst .lovable/always-follow.md, docs/current-status.md und
docs/04-betrieb/prompts-vs-admin.md und halte dich daran.

Ziel:
Auf der Startseite sollen die CTA-Texte in drei bestehenden Blöcken
aktualisiert werden.

Kontext:
Es handelt sich um eine redaktionelle Inhaltsänderung an bestehenden
CMS-Feldern.

Betroffen:
- Seite: home.start
- Bereiche: Hero, Einstiegskarten, finaler CTA

Sprachen:
- DE ändern, EN per Default automatisch mitübersetzen und speichern.

Erlaubt:
- nur bestehende CTA-Texte ändern
- Änderung über CMS-Light / rpc_admin_*
- keine Layoutänderung

Nicht erlaubt:
- keine Produktdatenbank
- keine neuen Felder
- keine neue Section
- keine Änderung an Navigation oder Footer
- keine Inhalte hartcodiert in .tsx

Akzeptanz:
- DE-Texte sind geändert
- EN-Texte sind passend mitgezogen
- Layout bleibt unverändert
- Startseite lädt ohne Fehler

Checks:
- npm run i18n:check
- npm run build

Bericht:
- geänderte Felder
- DE/EN-Status
- Checks
```

---

## Beispiel: Layoutänderung per Prompt

```text
Titel:
layout-produktkarten-eckige-filterbuttons-1

Arbeitsregel:
Lies zuerst .lovable/always-follow.md, docs/current-status.md und
docs/04-betrieb/prompts-vs-admin.md und halte dich daran.

Ziel:
Die Filterbuttons im Produktkatalog sollen eckiger wirken und besser
zum aktuellen Layout passen.

Kontext:
Layout-/Stylingänderung, keine Inhaltsänderung.

Betroffen:
- Produktkatalog
- Filterbuttons / Filterchips

Sprachen:
Keine Inhaltsänderung.

Erlaubt:
- CSS / Komponentenstyling der Filterbuttons ändern
- aktive und inaktive Zustände erhalten

Nicht erlaubt:
- keine Produktdatenbank
- keine Filterlogik ändern
- keine neuen Filter
- keine CMS-Inhalte ändern
- keine Navigation ändern

Akzeptanz:
- Filterbuttons sind nicht mehr pillenförmig
- Bedienung bleibt gleich
- mobile Darstellung bleibt nutzbar

Checks:
- npm run build

Bericht:
- geänderte Dateien
- Build-Ergebnis
```

---

## Beispiel: neue Funktion per Prompt

```text
Titel:
produktkatalog-merkliste-feinschliff-1

Arbeitsregel:
Lies zuerst .lovable/always-follow.md, docs/current-status.md und
docs/04-betrieb/prompts-vs-admin.md und halte dich daran.

Ziel:
Die bestehende Merkliste im Produktkatalog soll im UI klarer beschriftet
werden.

Kontext:
Funktionale UI-Anpassung im Produktkatalog. Es soll kein Shop und kein
Warenkorb entstehen.

Betroffen:
- Produktkatalog
- Merkliste
- Produktdetailansicht

Sprachen:
Technische UI-Texte DE/EN prüfen, falls vorhanden.

Erlaubt:
- Beschriftungen der Merkliste ändern
- bestehende Merkliste-Logik verwenden

Nicht erlaubt:
- kein Warenkorb
- kein Checkout
- kein Login
- keine Produktdatenbank ändern
- keine neue RPC
- keine CMS-Migration

Akzeptanz:
- Begriff „Merkliste" wird konsistent verwendet
- kein Shop-/Warenkorb-Begriff
- Produktdatenbank bleibt unverändert

Checks:
- npm run i18n:check
- npm run build

Bericht:
- geänderte Dateien
- DE/EN-Status
- Checks
```

---

## Kurzfassung zum Mitnehmen

- Admin ist für bestehende redaktionelle Inhalte.
- Lovable ist für Struktur, Layout, Funktion, Datenmodell und größere
  Bulk-Anpassungen.
- Produktdatenbank ist ein eigener Prozess.
- Pflichtblock „Arbeitsregel" steht am Anfang jedes Prompts.
- DE/EN-Default: DE ändern, EN automatisch mitübersetzt — nur Abweichungen
  müssen explizit drinstehen.
- Produktdatenbank nicht anfassen, außer es ist ausdrücklich beauftragt.
- Redaktionelle Inhalte nicht hartcodiert in `.tsx` schreiben.
- Checks nach jeder Änderung: `npm run i18n:check`, `npm run build`,
  bei CMS-Themen zusätzlich `npm run cms:audit:renderer` /
  `npm run cms:check:fout`.

**Vollkontext:** [`../04-betrieb/prompts-vs-admin.md`](../04-betrieb/prompts-vs-admin.md) ·
[`../../.lovable/always-follow.md`](../../.lovable/always-follow.md)
