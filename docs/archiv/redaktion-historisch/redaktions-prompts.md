> **Historisch — ersetzt durch das Dachdokument** (`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`). Verschoben im Batch 27, 2026-06-05. Inhalt unverändert darunter erhalten.

# Redaktions-Prompt-Vorlagen

Stand: 2026-05-29 (Redaktionsbetrieb läuft normal weiter; CMS-Härtung „Eine Wahrheit" ist interne Qualitätsarbeit)

> Diese Vorlagen sind die **Standardform** für Lovable-Prompts, die im
> redaktionellen Alltag entstehen. Sie sorgen dafür, dass Inhalte in
> **CMS-Light / Supabase** landen, nicht in Code oder i18n-JSON.
>
> **Goldene Regel:** Inhalt = Admin oder Inhalts-Prompt → DB.
> Struktur/Layout = technischer Änderungswunsch → Code.
>
> Begleitend lesen: [`checkliste-redaktion.md`](./checkliste-redaktion.md),
> [`../04-betrieb/prompts-vs-admin.md`](../04-betrieb/prompts-vs-admin.md),
> [`qa-nach-redaktionsrunde.md`](./qa-nach-redaktionsrunde.md).

## Aktueller Redaktionsmodus

Der Redaktionsbetrieb läuft normal weiter. Die im Hintergrund laufende
CMS-Härtung („Eine Wahrheit") ist interne Qualitätsarbeit und ändert
**nichts** an dem, was die Redaktion tun darf. Maßgeblich für Lovable
und Redaktion ist genau dieser Abschnitt.

**Direkt im Admin pflegen:**

- Bestehende Texte in vorhandenen CMS-Light-Feldern (DE/EN).
- Bestehende Bilder und Alt-Texte in vorhandenen Asset-Slots
  (`image`, `thumbnail`, `icon_image`).
- Lucide-Icon-Werte in vorhandenen `icon`-Feldern.
- Einfache Reihenfolge/Sichtbarkeit, **sofern der Admin keine Warnung
  zeigt**.
- DE/EN-Default: DE ändern, EN automatisch per `cms-translate-field`
  mitziehen — Abweichung nur bei ausdrücklicher Angabe.

**Per Prompt formulieren (sicherer Weg für Strukturwünsche):**

- Neue Karten, Blöcke, Sections, Seiten.
- Kopieren von Karten/Blöcken in andere Bereiche.
- Verschieben, wenn der Admin warnt oder die Zielstruktur unklar ist.
- Größere Text- oder Bildrunden über mehrere Seiten.
- Jede Aktion, bei der der Admin eine Warnung zeigt oder die nicht
  sauber funktioniert — nicht erzwingen, sondern als Prompt
  formulieren.

Lovable legt solche Strukturwünsche **CMS-konform** über die bestehenden
Templates, Section-Typen und CMS-Light-Strukturen an. Neue Inhalte sind
sofort im CMS-Light/Admin sichtbar und dort weiter pflegbar.

**Pflicht in jedem Redaktions- oder Struktur-Prompt:**

- Wenn möglich **Kurz-ID** nennen: `P-…` (Seite), `B-…` (Block),
  `A-…` (Asset), `N-…` (Navigationsknoten).
- Satz „Inhalt in CMS-Light/Supabase speichern, nicht in Code oder
  i18n-JSON."
- Keine Public-Routen, MainNavigation, MetaNavigation, Footer,
  PersonaNavigation, Breadcrumb anfassen.
- Keine Produktdatenbank anfassen.

**Stopp-Regeln für Lovable (statt improvisieren):**

1. Zielobjekt (Seite/Block/Feld/Slot) **nicht eindeutig** im CMS-Light
   auffindbar → stoppen, Kandidaten mit Kurz-ID berichten, auf Auswahl
   warten.
2. Inhalt existiert **nur** hardcodiert im Code oder **nur** als
   i18n-Fallback (`src/i18n/locales/**`) → nicht selbst nach CMS-Light
   umbauen, sondern melden („gehört in technische Tranche").
3. Vertragsfeld ist im Admin **sichtbar, aber nicht speicherbar**
   (fehlende Whitelist, Renderer liest Feld nicht, D9-Befund) → keine
   neue Schreibmechanik bauen, sondern melden mit Verweis auf
   `docs/04-betrieb/contract-drift-audit-latest.md`.
4. Strukturwunsch (neue Karte/Block/Seite, Kopieren, Verschieben):
   über die Vorlagen 5–8 weiter unten CMS-konform anlegen — bestehende
   Templates und Section-Typen verwenden, keine neue Variante erfinden.

**Empfohlener Kurz-Prompt für die Redaktion:**

```text
Titel: <was geändert werden soll>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/03-redaktion/redaktions-prompts.md
  (Abschnitt: Aktueller Redaktionsmodus)

Scope:
- Ziel: <Seite P-…, Block B-…, Feld/Slot oder Asset A-…>
- Änderung: <neuer Text DE / neues Bild / neuer Icon-Wert / neue Karte …>
- In CMS-Light/Supabase speichern, nicht in Code oder i18n-JSON.
- Bei Strukturwünschen: bestehende Templates/Section-Typen verwenden.
- EN automatisch mitziehen (Default), außer ich sage etwas anderes.

Wenn das Ziel nicht eindeutig auffindbar ist, oder nur in Code/i18n
existiert, oder nicht speicherbar ist: stoppen und berichten.
```


## Pflicht-Sicherheitsregeln für jeden Redakteurs-Prompt

Diese Sätze gehören in **jeden** Inhalts-Prompt — sonst nicht abschicken:

1. Wenn möglich, **Kurz-ID** der Seite/des Blocks/des Assets nennen
   (`P-…`, `B-…`, `A-…`, `N-…`).
2. „**In CMS-Light/Supabase speichern, nicht in Code oder i18n-JSON.**"
3. „Keine Public-Routen / MainNavigation / Footer / MetaNavigation
   ändern."
4. „Keine Produktdatenbank anfassen."
5. Bei Bildern: **Slotart nennen** (`image`, `thumbnail`, `icon_image`)
   oder den vorhandenen Slot übernehmen, nicht raten.
6. Bei Karten: nur die **eingefrorene Standardpalette** verwenden
   (Bildkarte / Iconkarte / Textkarte / Thumbnail-Karte / Wechselteaser).
7. Nach Ausführung **Vorschau prüfen** und **Bericht** mit geänderten
   Dateien/Tabellen verlangen.

---

## 1. Textänderung an bestehender Stelle

> **Sicherheitsmodus aktiv:** nur vorhandenes Feld einer vorhandenen
> Section ändern. Wenn Feld/Section nicht eindeutig auffindbar oder nicht
> speicherbar ist → stoppen und melden, nicht anlegen.


```text
Titel: Text ändern: <Seite> · <Block> · <Feld>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md

Scope:
- Seite: <page_key oder P-…>
- Block: <section_key oder B-…>
- Feld: <field_key, z. B. headline, subline, description, cta_label>
- Neuer DE-Text: "<exakter Wortlaut>"
- EN: automatisch per cms-translate-field mitziehen (Default).
  (Abweichung nur ausdrücklich: "nur DE", "EN unverändert lassen".)

Nicht erlaubt:
- keine anderen Felder/Blöcke anfassen
- keine Whitelist-/Schema-Änderung
- nicht in i18n-JSON oder Code schreiben
- keine Produktdatenbank, keine Navigation/Footer/Routen

Akzeptanz:
- Feld in cms_section_fields aktualisiert (DE+EN)
- Vorschau zeigt neuen Text
- Bericht nennt Tabelle/RPC

Checks:
- npm run i18n:check

Bericht:
- geändertes Feld (page_key/section_key/field_key)
- DE/EN-Status
- Vorschau-Sichtprüfung beauftragt
```

## 2. Bild austauschen

> **Sicherheitsmodus aktiv:** Bild nur in einen **bereits vorhandenen**
> Asset-Slot derselben Section laden. Kein neuer Slot, kein neuer
> Viewport-Typ, kein Bild in `src/`. Wenn der Slot fehlt → stoppen und
> als technischen Änderungswunsch melden.


```text
Titel: Bild austauschen: <Seite> · <Block> · <Slot>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md
- docs/01-strategie/asset-strategie.md

Scope:
- Seite: <page_key oder P-…>
- Block: <section_key oder B-…>
- Slot: <image | thumbnail | icon_image>  (vorhandenen Slot verwenden)
- Viewport: <desktop | tablet | mobile>  (Default desktop)
- Quelle: <URL oder Datei im Chat>
- Alt-Text DE: "<…>"
- Alt-Text EN: "<…>"  (oder per Default automatisch)

Nicht erlaubt:
- keinen neuen Slot anlegen
- keine Bilder in src/ einchecken
- keine Produktbilder anfassen
- keine Renderer-/Layout-Änderung

Akzeptanz:
- cms_assets-Eintrag aktualisiert (gleicher slot, neuer Viewport-Eintrag)
- Alt-Text DE+EN gesetzt
- Vorschau zeigt neues Bild
- Medien-Workbench: Slot weiterhin grün

Checks:
- node scripts/cms/medien-konsistenz-audit.mjs

Bericht:
- A-… des Assets, Slot, Viewport
- Alt-Texte
- Audit-Klassen vorher/nachher (A/B/C/D/E/F)
```

## 3. Lucide-Icon ändern

> **Sicherheitsmodus aktiv:** nur vorhandenes `icon`-Feld (Textwert,
> kebab-case) ändern. Keine neuen Icon-Felder anlegen, kein Bild
> hochladen.


```text
Titel: Lucide-Icon ändern: <Seite> · <Iconkarte>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md

Scope:
- Seite: <page_key>, Block: <section_key oder B-…>
- Feld: icon  (Textfeld, kebab-case Lucide-Name)
- Neuer Wert: "<lucide-name, z. B. shield-check>"

Nicht erlaubt:
- kein Bild hochladen (Lucide-Icon ist Textfeld, kein Asset)
- kein icon_image-Slot anfassen
- keine neue Icon-Quelle einführen

Akzeptanz:
- cms_section_fields.icon (DE+EN gleicher Wert) gesetzt
- Vorschau zeigt neues Icon, falls kein icon_image den Vorrang hat

Checks:
- npm run i18n:check

Bericht:
- Section, alter/neuer Icon-Name
- Hinweis, ob icon_image vorhanden ist (dann Vorrang)
```

## 4. TCS-Bildicon (`icon_image`) setzen

> **Sicherheitsmodus aktiv:** nur in einen **bereits angelegten**
> `icon_image`-Slot laden. Wenn der Slot auf der Section nicht existiert
> → stoppen und als technischen Änderungswunsch melden, nicht selbst
> anlegen.


```text
Titel: TCS-Bildicon setzen: <Seite> · <Iconkarte>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md
- docs/01-strategie/asset-strategie.md

Scope:
- Seite: <page_key>, Block: <section_key oder B-…>
- Slot: icon_image
- Viewport: desktop (Pflicht), tablet/mobile optional
- Quelle: <URL oder Datei>
- Alt-Text DE+EN: "<…>" / EN per Default

Nicht erlaubt:
- nicht in image- oder thumbnail-Slot schreiben
- Lucide-Wert in `icon` nicht löschen (Fallback bleibt)

Akzeptanz:
- cms_assets-Eintrag im Slot icon_image aktiv
- Renderer zeigt Bildicon (Vorrang vor Lucide)
- Medien-Workbench-Badge "TCS-Bildicon" sichtbar

Checks:
- node scripts/cms/medien-konsistenz-audit.mjs

Bericht:
- A-…, Slot, Viewports
- Hinweis: Bildicon hat Vorrang vor Lucide-`icon`
```

## 5. Wechselteaser kopieren und auf Zielseite einfügen

> **Strukturwunsch per Prompt:** Lovable kopiert Section + Felder +
> Whitelist CMS-konform über `rpc_admin_paste_section`. Bitte Quelle
> und Ziel mit Kurz-IDs nennen. Kein eigenes Anlegen im Code.


```text
Titel: Wechselteaser kopieren: <Quelle> → <Ziel>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md
- docs/03-redaktion/checkliste-redaktion.md

Scope:
- Quellblock: <page_key>/<section_key> oder B-…  (Typ teaser_2col_v1)
- Zielseite: <page_key>  · Zielposition: <vor/nach <section_key>>
- Inhalte 1:1 mitkopieren (DE+EN, Bilder, Whitelist)
- Anschließend: <Felder, die geändert werden sollen>

Nicht erlaubt:
- kein neuer Section-Typ
- kein anderer Slot
- keine Layout-Änderung am Wechselteaser
- keine Public-Navigation / Footer

Akzeptanz:
- neuer teaser_2col_v1 mit "_kopie"-Schlüssel sichtbar
- Sichtprüfung in Vorschau bestanden (Rendertreue)
- Whitelist DE+EN für alle Felder vorhanden

Checks:
- node scripts/cms/rendertreue-audit.mjs
- node scripts/cms/redaktions-fluss-audit.mjs

Bericht:
- Quelle/Ziel mit Kurz-IDs
- neuer section_key
- R3/R4-Befunde
```

## 6. Bildkarte / Iconkarte / Textkarte / Thumbnail-Karte kopieren

> **Strukturwunsch per Prompt:** Karten werden CMS-konform über
> `rpc_admin_paste_section` kopiert (Felder + Asset-Slots + Whitelist).
> Variante bleibt erhalten, Slots werden nicht umetikettiert.


```text
Titel: Karte kopieren: <Variante> · <Quelle> → <Ziel>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md
- docs/03-redaktion/checkliste-redaktion.md

Scope:
- Variante: <Bildkarte | Iconkarte | Textkarte | Thumbnail-Karte>
- Quelle: <page_key>/<section_key> (card_v1)
- Ziel-Kartencontainer: <page_key>/<section_key> (cards_v1 oder feature_grid_v1)
- Position: <am Ende | vor/nach <section_key>>
- Inhalte 1:1 mitkopieren (Felder + Asset-Slots + Whitelist)

Nicht erlaubt:
- keine Variante wechseln (Bildkarte bleibt Bildkarte)
- kein Asset-Slot umetikettieren (image ≠ thumbnail ≠ icon_image)
- kein neuer Section-Typ

Akzeptanz:
- Karte im Zielcontainer sichtbar
- Im Admin-Baum erscheint die erkannte Variante korrekt
- Whitelist DE+EN vollständig
- Vorschau bestanden

Checks:
- node scripts/cms/rendertreue-audit.mjs
- node scripts/cms/redaktions-fluss-audit.mjs

Bericht:
- Quelle/Ziel, neuer section_key
- erkannte Variante laut Admin-Baum
```

## 7. Neue Seite nach bestehender Vorlage anlegen

> **Strukturwunsch per Prompt:** Lovable legt die neue Seite
> CMS-konform nach bestehender Vorlage in `cms_pages` + `cms_sections`
> + `cms_section_fields` + `cms_admin_editable_fields` an (Status
> draft). Routen/Navigation nur, wenn ausdrücklich beauftragt.


```text
Titel: Neue Seite nach Vorlage: <Zweck>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md
- docs/01-strategie/templates.md
- docs/01-strategie/asset-strategie.md

Scope:
- Vorlage / Template: <z. B. produkt_sub_v1 oder konkrete Seite P-…>
- page_key: <vorschlag, kebab.case>
- route_path: <vorschlag>
- Blöcke (nur Standardpalette):
  1. hero
  2. <cards_v1 + card_v1 …>
  3. <teaser_2col_v1 …>
  4. cta / contact_block_v1
- Sprachen: DE-Inhalte unten + EN automatisch
- Status: draft (is_active=false) — Veröffentlichung als eigener Schritt

Nicht erlaubt:
- keine neue Section-Familie
- keine neue Route in src/navigation
- keine MainNavigation/Footer-Änderung
- keine Produktdatenbank
- keine Inhalte hart im Code/i18n

Akzeptanz:
- cms_pages-Eintrag (draft) angelegt
- cms_sections in genannter Reihenfolge
- cms_section_fields DE+EN
- cms_admin_editable_fields-Whitelist DE+EN pro Feld
- Asset-Slots vorbereitet (leer, falls keine Bilder geliefert)

Checks:
- npm run i18n:check
- node scripts/cms/redaktions-fluss-audit.mjs --focus=<page_key>

Bericht:
- vergebene P-/B-Nummern
- Template-Zuordnung
- DE/EN-Status
- Bestätigung: keine Public-Navigation / Routen / Produktdaten geändert
```

## 8. Neue Karten in bestehendem Kartencontainer

> **Strukturwunsch per Prompt:** Lovable legt N neue `card_v1`-Kind-
> Sections im genannten Container an (Felder DE+EN + Whitelist).
> Variante des Containers wird übernommen, keine neue Variante erfunden.


```text
Titel: Neue Karten in Container: <Seite> · <Container>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md

Scope:
- Container: <page_key>/<section_key> (cards_v1 oder feature_grid_v1)
- Variante: <Bildkarte | Iconkarte | Textkarte | Thumbnail-Karte>
- Anzahl neuer Karten: <N>
- Pro Karte: title DE, description DE, optional image/icon_image/icon
- EN: per Default automatisch
- Position: am Ende, sofern nicht anders angegeben

Nicht erlaubt:
- keine andere Variante im selben Container mischen, wenn das im
  Bestand nicht schon so ist
- keine neuen Felder erfinden (nur title/description/icon/cta_link/etc.)
- keine Layout-Änderung am Container

Akzeptanz:
- N neue card_v1-Kind-Sections aktiv
- Whitelist DE+EN für alle Felder
- Vorschau zeigt alle neuen Karten in richtiger Reihenfolge

Checks:
- node scripts/cms/rendertreue-audit.mjs
- npm run i18n:check

Bericht:
- neue section_keys
- erkannte Variante laut Admin-Baum
```

## 9. Fehler melden: Admin geändert, Vorschau unverändert

```text
Titel: Rendertreue-Verdacht: <Seite> · <Block>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md
- docs/03-redaktion/checkliste-redaktion.md

Scope (nur Diagnose, KEINE Änderung):
- Seite: <page_key oder P-…>
- Block: <section_key oder B-…>, Feld: <field_key>
- Beobachtung: "Im Admin geändert, in der Vorschau nicht sichtbar."
- Bitte prüfen: Rendertreue (R-Klassen) und Redaktions-Fluss (S-Klassen).

Nicht erlaubt:
- keine eigenständige Deaktivierung von Blöcken
- keine Renderer-Änderung ohne neue Tranche
- keine Migration

Akzeptanz:
- Befund-Klasse (R0–R5 / S0–S5) benannt
- Empfehlung: Folge-Tranche oder kein Handlungsbedarf

Checks:
- node scripts/cms/rendertreue-audit.mjs
- node scripts/cms/redaktions-fluss-audit.mjs --focus=<page_key>

Bericht:
- Befund, vermutliche Ursache, Empfehlung
```

## 10. Bitte um technische Prüfung nach Redaktionsrunde

```text
Titel: QA nach Redaktionsrunde <Datum>

Arbeitsregel:
Lies zuerst:
- .lovable/always-follow.md
- docs/current-status.md
- docs/04-betrieb/prompts-vs-admin.md
- docs/03-redaktion/qa-nach-redaktionsrunde.md

Scope (nur lesend):
- Seiten/Blöcke, die in dieser Runde geändert wurden: <Liste>

Nicht erlaubt:
- keine Datenänderung
- keine Migration
- keine Renderer-/Admin-UI-Änderung

Akzeptanz:
- alle QA-Audits laufen
- Befunde werden mit vorheriger Tranche verglichen
- Stichproben in Vorschau bestätigt

Checks:
- npm run i18n:check
- node scripts/cms/medien-konsistenz-audit.mjs
- node scripts/cms/rendertreue-audit.mjs
- node scripts/cms/redaktions-fluss-audit.mjs
- node scripts/cms/admin-hygiene-audit.mjs

Bericht:
- Audit-Zahlen vorher/nachher (A–F, R0–R5, S0–S5, H0–H6)
- offene Befunde + Empfehlung
- Stichproben-Liste mit Ergebnis
```
