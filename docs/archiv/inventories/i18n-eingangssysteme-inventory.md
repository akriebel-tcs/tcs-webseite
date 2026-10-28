# i18n-Inventar – Eingangssysteme (Entry)

> Stand: nach Etappe 19b-0 (Inventar erstellt, noch keine Textmigration).
> Verwandte Dokumente: [`../01-strategy/i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`../02-architecture/code-landkarte.md`](../02-architecture/code-landkarte.md), [`../migration-log.md`](../migration-log.md).

---

## 1. Zweck

- Dieses Dokument ist ein **vorbereitendes Inventar** für die spätere i18n-Migration der Domain `eingangssysteme` (Entry-System).
- Es **migriert noch keine Texte** und ändert weder TSX- noch Locale-Dateien.
- Es dient als Grundlage für die nachfolgenden Etappen `19b-1`, `19b-2`, … bis `19b-final-check`.
- Inhaltlich orientiert es sich am Vorgehen der bereits abgeschlossenen Domains `gebaeudekommunikation`, `zutrittskontrolle` und `gebaeudemanagement`.

---

## 2. Technischer Status

| Aspekt | Status |
|---|---|
| Namespace `eingangssysteme` in `src/i18n/index.ts` registriert | ✅ ja (Import + `resources.de`/`resources.en` + `I18N_NAMESPACES`) |
| DE-Locale-Datei vorhanden | ✅ `src/i18n/locales/de/eingangssysteme.json` |
| EN-Locale-Datei vorhanden | ✅ `src/i18n/locales/en/eingangssysteme.json` |
| DE/EN strukturgleich | ✅ ja (beide enthalten ausschließlich `_meta`) |
| Vorhandene Root-Keys | nur `_meta` (Felder: `namespace`, `status`, `note`) |
| Status der Locale-Dateien | **vorbereitet** – `_meta.status = "prepared"`, keine echten Seitentexte, keine leeren Werte |
| Bereits vorhandene Keys, die erhalten bleiben müssen | `_meta.*` (Konvention aus anderen Domains) |
| Routen-Registrierung | `src/features/eingangssysteme/routes.tsx` mit 8 Routen unter `/entry-system` |

> Hinweis: Die Domain firmiert in der UI als „Entry" / „Entry-System", technisch jedoch konsequent als `eingangssysteme` (Feature-Ordner und Namespace). Der URL-Prefix lautet `/entry-system`.

---

## 3. Gefundene Seiten

Insgesamt **8 Seiten** unter `src/features/eingangssysteme/pages/`, alle in `src/features/eingangssysteme/routes.tsx` registriert.

| # | Seite | Datei | Route | Komplexität | Sichtbare Textgruppen | Besonderheiten | Empfohlene Etappe |
|---|---|---|---|---|---|---|---|
| 1 | Entry / Design | `EntryDesignPage.tsx` | `/entry-system/design` | **niedrig** | PageLayout, 2 Karten (Tableaus/Gestaltungsbänder) mit subtitle/title/text + 2 Prev/Next-Links | Externe Bilder (jimcdn), kein lokales Asset, einfacher Aufbau. Sehr kleine Textmenge. | `19b-1` |
| 2 | Entry / Integrationsformen | `EntryIntegrationsformenPage.tsx` | `/entry-system/integrationsformen` | **niedrig** | PageLayout, 4 Karten (In Putz / Unter Putz / Auf Putz / Freistehend), Prev/Next-Links | Klares Listenmuster, externe Bilder, keine Aria-Labels. | `19b-2` |
| 3 | Entry / Material | `EntryMaterialPage.tsx` | `/entry-system/material` | **mittel** | PageLayout, 6 Material-Karten (Aluminium / Edelstahl / Messing / Bronze / Pulverbeschichtung / Mineralwerkstoff) je mit subtitle/title/text + Feature-Liste, Prev/Next-Links | Längere Feature-Listen je Material; einheitliches Schema. | `19b-3` |
| 4 | Entry / Standards | `EntryStandardsPage.tsx` | `/entry-system/standards` | **mittel** | PageLayout, 3 Datenblatt-Downloads (PDF), 3 Standards-Karten (Unterputz / Inputz / Funktionsmodule AMI) + Prev/Next-Links | PDF-Links extern (URLs unverändert lassen), `target="_blank"`. | `19b-4` |
| 5 | Entry / Beratung | `EntryBeratungPage.tsx` | `/entry-system/beratung` | **mittel** | PageLayout, 2 Spalten (Konzept-/Gestaltungsthemen + Technologiethemen) je mit Intro + Liste, CTA-Block (title/text/cta) zu `/kontakt`, Prev/Next-Links | CTA-Block mit interner Route; reine Listen-Inhalte gut für stabile Item-Keys. | `19b-5` |
| 6 | Entry / Funktionalität | `EntryFunktionalitaetPage.tsx` | `/entry-system/funktionalitaet` | **mittel–hoch** | PageLayout, 7 Funktionsblöcke (Türkommunikation / Access Control / Verwahrung / Gebäudesicherheit / Wayfinding / Beleuchtung / Service) je mit subtitle/title/text + optionaler Feature-Liste, Prev/Next-Links | Längste reine Inhaltsliste, abwechselndes Layout (RTL bei ungeradem Index), nicht alle Blöcke haben Features. | `19b-6` |
| 7 | Entry / Referenzen | `EntryReferenzenPage.tsx` | `/entry-system/referenzen` | **hoch** | PageLayout, 6 Referenzobjekte je mit subtitle/title/description + designwunsch + scope-Liste + 2 fixe Sublabels („Designwunsch des Bauherrn" / „Funktions- und Installationsumfang") + Prev/Next-Links | Stabile Objektnamen (Berlin / Hamburg / Potsdam) bleiben in DE/EN identisch (Eigennamen); fachliche Beschreibungen müssen übersetzt werden. | `19b-7` |
| 8 | Entry-System (Root) | `EntrySystemPage.tsx` | `/entry-system` | **hoch** | PageLayout (`darkHero`, `fullWidth`), 3 „Three Pillars" (label/title/text), 7 „Discover Entry"-Karten (subtitle/title/description + „Mehr erfahren →"), Downloads-Block (5 PDFs + Intro), CTA-Block (title/text/cta) | `darkHero` aktiv, Discover-Karten sind dieselben 7 Unterseiten wie #1–#7 (potenziell shared mit Hero-Texten, aber bewusst eigene Kurzbeschreibungen). „Mehr erfahren →" als shared-Key kandidat. | `19b-8` |

---

## 4. Detailinventar pro Seite

### 4.1 EntryDesignPage

- **Datei:** `src/features/eingangssysteme/pages/EntryDesignPage.tsx`
- **Route:** `/entry-system/design`
- **PageLayout-Texte:**
  - `label`: „Entry / Design"
  - `headline`: „Design"
  - `intro`: „Mit Entry entstehen individuelle Designs. Aus vielen Optionen können Designs für kleine Tableaus, multifunktionale Terminals als auch großflächige Gestaltungsbänder entwickelt werden. Sie akzentuieren den Eingang und machen die Architektur erlebbar und nutzbar."
  - `heroImage`: externe URL (jimcdn)
  - `fullWidth`: aktiviert
- **Karten (2):**
  - `tableausTerminals`: subtitle „Zugeschnitten auf individuelle Bedürfnisse", title „Tableaus und Terminals", Fließtext, Bild
  - `gestaltungsbaender`: subtitle „Für repräsentative Eingangs- und Fassadenfunktionen", title „Gestaltungsbänder", Fließtext, Bild
- **Prev/Next-Links:** „← Entry Übersicht" (`/entry-system`), „Funktionalität →" (`/entry-system/funktionalitaet`)
- **Aria-/Alt-/Screenreader-Texte:** Bild-`alt` = Kartentitel
- **Mögliche spätere Key-Struktur:**
  - `design.hero.label` / `.headline` / `.intro`
  - `design.cards.tableausTerminals.{title,subtitle,text,imageAlt}`
  - `design.cards.gestaltungsbaender.{title,subtitle,text,imageAlt}`
  - `shared.nav.overview`, `shared.nav.next`, `shared.nav.prev` (kandidat) bzw. seitenlokale Prev/Next-Labels
- **Hinweise / Risiken:** Sehr klein, ideal als Einstieg in die Domain.

---

### 4.2 EntryIntegrationsformenPage

- **Datei:** `src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx`
- **Route:** `/entry-system/integrationsformen`
- **PageLayout-Texte:**
  - `label`: „Entry / Integrationsformen"
  - `headline`: „Integrationsformen"
  - `intro`: einleitender Fließtext zu Fassadentypen
  - `heroImage`: externe URL
  - `fullWidth`: aktiviert
- **Karten (4):** `inPutz`, `unterPutz`, `aufPutz`, `freistehend` – je subtitle / title / Fließtext / Bild
- **Prev/Next:** „← Material", „Referenzen →"
- **Aria-/Alt-:** Bild-`alt` = Kartentitel
- **Mögliche spätere Key-Struktur:**
  - `integrationsformen.hero.{label,headline,intro}`
  - `integrationsformen.items.<key>.{title,subtitle,text,imageAlt}` mit Keys `inPutz`, `unterPutz`, `aufPutz`, `freistehend`
- **Hinweise / Risiken:** Klares Schema, einfache Migration.

---

### 4.3 EntryMaterialPage

- **Datei:** `src/features/eingangssysteme/pages/EntryMaterialPage.tsx`
- **Route:** `/entry-system/material`
- **PageLayout-Texte:** `label` „Entry / Material", `headline` „Material", `intro` einleitender Fließtext, externe `heroImage`, `fullWidth`.
- **Karten (6):** je subtitle / title / Fließtext / Feature-Liste (3–5 Punkte) / Bild
  - Keys-Vorschlag: `aluminium`, `edelstahl`, `messingSatiniert`, `bronzeBaubronze`, `pulverbeschichtung`, `mineralwerkstoff`
- **Prev/Next:** „← Funktionalität", „Integrationsformen →"
- **Aria-/Alt-:** Bild-`alt` = Materialtitel
- **Mögliche spätere Key-Struktur:**
  - `material.hero.{label,headline,intro}`
  - `material.items.<key>.{title,subtitle,text,imageAlt,features[]}`
- **Hinweise / Risiken:** Werkstoffbezeichnungen wie „V2A", „CuZn37", „RAL" sind technische Begriffe und bleiben in EN gleich. Feature-Listen müssen in EN fachlich sauber übersetzt werden (z. B. „Gut recyclingfähig" → „Highly recyclable").

---

### 4.4 EntryStandardsPage

- **Datei:** `src/features/eingangssysteme/pages/EntryStandardsPage.tsx`
- **Route:** `/entry-system/standards`
- **PageLayout-Texte:** `label` „Entry / Standards", `headline` „Standards", `intro`, externe `heroImage`, `fullWidth`.
- **Downloads (3):** Datenblätter Serie AMI Unterputz / Inputz / Zubehör – je `label` + externe URL
- **Standards-Karten (3):** `unterputzmontage`, `inputzmontage`, `funktionsmoduleAmi` – je subtitle / title / Fließtext / Bild
- **Sektionsüberschrift:** „Datenblätter"
- **Prev/Next:** „← Referenzen", „Beratung →"
- **Aria-/Alt-:** Bild-`alt` = Kartentitel; PDF-Icon-Text „PDF" rein dekorativ.
- **Mögliche spätere Key-Struktur:**
  - `standards.hero.{label,headline,intro}`
  - `standards.downloads.title` + `standards.downloads.items.<key>.label` mit Keys `unterputzAmi`, `inputzAmi`, `zubehoerAmi`
  - `standards.items.<key>.{title,subtitle,text,imageAlt}`
- **Hinweise / Risiken:** PDF-URLs nicht verändern. „Serie AMI" bleibt als Produktbezeichnung erhalten.

---

### 4.5 EntryBeratungPage

- **Datei:** `src/features/eingangssysteme/pages/EntryBeratungPage.tsx`
- **Route:** `/entry-system/beratung`
- **PageLayout-Texte:** `label` „Entry / Beratung", `headline` „Beratung", `intro`, externe `heroImage`, `fullWidth`.
- **Spalten (2):**
  - `konzept`: title „Konzept- und Gestaltungsthemen" + intro + 4er-Liste
  - `technologie`: title „Technologiethemen" + intro + 6er-Liste
- **CTA-Block:** title „Projekt besprechen?", text, cta-Label „Kontakt aufnehmen" → `/kontakt`
- **Prev/Next:** „← Standards", „Entry Übersicht →"
- **Mögliche spätere Key-Struktur:**
  - `beratung.hero.{label,headline,intro}`
  - `beratung.topics.konzept.{title,intro,items[]}` (Liste als Array von Strings ODER eigenständige Item-Keys)
  - `beratung.topics.technologie.{title,intro,items[]}`
  - `beratung.cta.{title,text,cta}`
- **Hinweise / Risiken:** Bei Listen ohne fachliche Item-Keys ist Array-Verwendung pragmatisch und in DE/EN strukturgleich problemlos abbildbar.

---

### 4.6 EntryFunktionalitaetPage

- **Datei:** `src/features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx`
- **Route:** `/entry-system/funktionalitaet`
- **PageLayout-Texte:** `label` „Entry / Funktionalität", `headline` „Funktionalität", `intro` (länglich), externe `heroImage`, `fullWidth`.
- **Funktionsblöcke (7):** je subtitle / title / Fließtext / optionale Feature-Liste / Bild
  - Keys-Vorschlag: `tuerkommunikation` (Liste), `accessControl` (Liste), `verwahrung`, `gebaeudesicherheit` (Liste), `wayfinding` (Liste), `beleuchtung`, `service`
- **Prev/Next:** „← Design", „Material →"
- **Aria-/Alt-:** Bild-`alt` = Funktionstitel
- **Mögliche spätere Key-Struktur:**
  - `funktionalitaet.hero.{label,headline,intro}`
  - `funktionalitaet.items.<key>.{title,subtitle,text,imageAlt,features[]?}`
- **Hinweise / Risiken:** Layout wechselt RTL/LTR per Index – darf nicht durch Migration beeinflusst werden. Begriffe wie „Access Control", „BMA", „FSE", „FSD", „AAL" bleiben als Fachabkürzungen erhalten.

---

### 4.7 EntryReferenzenPage

- **Datei:** `src/features/eingangssysteme/pages/EntryReferenzenPage.tsx`
- **Route:** `/entry-system/referenzen`
- **PageLayout-Texte:** `label` „Entry / Referenzen", `headline` „Referenzen", `intro`, externe `heroImage`, `fullWidth`.
- **Referenzobjekte (6):** je subtitle / title / description / `design` (Designwunsch des Bauherrn) / `scope[]` (3–5 Items) / Bild
  - Keys-Vorschlag: `forumMuseumsinsel`, `pulse`, `weidtParkCorner`, `hamburgerFamiliendomizil`, `fritzTower`, `potsdamerWohnhaus`
- **Sublabels (fix, 2):** „Designwunsch des Bauherrn" / „Funktions- und Installationsumfang"
- **Prev/Next:** „← Integrationsformen", „Standards →"
- **Aria-/Alt-:** Bild-`alt` = Objektname
- **Mögliche spätere Key-Struktur:**
  - `referenzen.hero.{label,headline,intro}`
  - `referenzen.labels.designWish`, `referenzen.labels.scope`
  - `referenzen.items.<key>.{title,subtitle,description,design,scope[],imageAlt}`
- **Hinweise / Risiken:** Eigennamen (Forum an der Museumsinsel, Pulse, Weidt Park Corner, Fritz Tower) bleiben in EN gleich. Beschreibungen müssen fachlich übersetzt werden.

---

### 4.8 EntrySystemPage (Root)

- **Datei:** `src/features/eingangssysteme/pages/EntrySystemPage.tsx`
- **Route:** `/entry-system`
- **PageLayout-Texte:**
  - `label`: „Eingangssysteme"
  - `headline`: „ENTRY"
  - `intro`: längerer Fließtext zum Design- und Montagesystem
  - `heroImage`: lokales Asset `@/features/eingangssysteme/assets/hero-entry.jpg`
  - `fullWidth`, `darkHero`: aktiv
- **Three Pillars (3):** je label / title / Fließtext
  - Keys-Vorschlag: `derEingang`, `herstellerGewerke`, `lifecycle`
- **„Entry entdecken" – Header:** title „Entry entdecken", intro
- **Discover-Karten (7):** subtitle / title / description / Link auf jeweilige Unterseite + Footer-Label „Mehr erfahren →"
  - Keys identisch zu Unterseiten: `design`, `funktionalitaet`, `material`, `integrationsformen`, `referenzen`, `standards`, `beratung`
- **Downloads-Block:** title „Downloads", intro „Broschüren, Exposés und Datenblätter zum Entry-System.", 5 PDF-Links
  - Keys-Vorschlag: `entryExpose`, `broschuereSonderbau`, `datenblattUnterputz`, `datenblattInputz`, `datenblattZubehoer`
- **CTA-Block:** title „Beratung anfordern", text, cta „Kontakt aufnehmen" → `/kontakt`
- **Aria-/Alt-:** Discover-Bild-`alt` = Kartentitel
- **Mögliche spätere Key-Struktur:**
  - `root.hero.{label,headline,intro}`
  - `root.pillars.<key>.{label,title,text}`
  - `root.discover.{title,intro,more}` + `root.discover.items.<key>.{title,subtitle,description}` (Links/Bilder bleiben als Konstanten in TSX)
  - `root.downloads.{title,intro}` + `root.downloads.items.<key>.label`
  - `root.cta.{title,text,cta}`
- **Hinweise / Risiken:**
  - „ENTRY" als Marken-/Produktbezeichnung bleibt unverändert.
  - Discover-Texte sind bewusst Kurzbeschreibungen, nicht 1:1 mit den Hero-Intros der Unterseiten – daher **eigene Keys**, kein automatisches Sharing.
  - „Mehr erfahren →" / „Read more →" eignet sich als shared-Key (`shared.cta.readMore`).

---

## 5. Empfohlene Key-Struktur (Master-Vorschlag)

```text
eingangssysteme
├── _meta { namespace, status, note }
├── shared
│   ├── label                      // Domain-Breadcrumb-Label "Eingangssysteme" / "Entry Systems"
│   ├── nav
│   │   ├── overview               // "Entry Übersicht" / "Entry overview"
│   │   ├── prev                   // "← {label}" – seitenlokal überschreibbar
│   │   └── next                   // "{label} →"
│   └── cta
│       ├── readMore               // "Mehr erfahren →" / "Read more →"
│       └── kontaktAufnehmen       // "Kontakt aufnehmen" / "Get in touch"
├── root                           // EntrySystemPage
│   ├── hero { label, headline, intro }
│   ├── pillars.{derEingang,herstellerGewerke,lifecycle}.{label,title,text}
│   ├── discover { title, intro, more }
│   ├── discover.items.{design,funktionalitaet,material,integrationsformen,referenzen,standards,beratung}.{title,subtitle,description}
│   ├── downloads { title, intro }
│   ├── downloads.items.{entryExpose,broschuereSonderbau,datenblattUnterputz,datenblattInputz,datenblattZubehoer}.label
│   └── cta { title, text, cta }
├── design
│   ├── hero { label, headline, intro }
│   └── cards.{tableausTerminals,gestaltungsbaender}.{title,subtitle,text,imageAlt}
├── funktionalitaet
│   ├── hero { label, headline, intro }
│   └── items.{tuerkommunikation,accessControl,verwahrung,gebaeudesicherheit,wayfinding,beleuchtung,service}.{title,subtitle,text,imageAlt,features[]?}
├── material
│   ├── hero { label, headline, intro }
│   └── items.{aluminium,edelstahl,messingSatiniert,bronzeBaubronze,pulverbeschichtung,mineralwerkstoff}.{title,subtitle,text,imageAlt,features[]}
├── integrationsformen
│   ├── hero { label, headline, intro }
│   └── items.{inPutz,unterPutz,aufPutz,freistehend}.{title,subtitle,text,imageAlt}
├── referenzen
│   ├── hero { label, headline, intro }
│   ├── labels { designWish, scope }
│   └── items.{forumMuseumsinsel,pulse,weidtParkCorner,hamburgerFamiliendomizil,fritzTower,potsdamerWohnhaus}.{title,subtitle,description,design,scope[],imageAlt}
├── standards
│   ├── hero { label, headline, intro }
│   ├── downloads { title }
│   ├── downloads.items.{unterputzAmi,inputzAmi,zubehoerAmi}.label
│   └── items.{unterputzmontage,inputzmontage,funktionsmoduleAmi}.{title,subtitle,text,imageAlt}
└── beratung
    ├── hero { label, headline, intro }
    ├── topics.konzept { title, intro, items[] }
    ├── topics.technologie { title, intro, items[] }
    └── cta { title, text, cta }
```

**Konventionen:**
- Sprechende, stabile Item-Keys; **keine Index-Keys**.
- DE als Master, EN strukturgleich, 0 Diff, 0 leere Werte.
- `shared.*` nur für Inhalte, die wirklich mehrfach wiederverwendet werden (Domain-Label, Prev/Next, Read-more, Kontakt-CTA).
- Listen mit fachlich identifizierbaren Punkten → eigene Item-Keys; reine Aufzählungen ohne Wiederverwendung → `items[]`-Array.
- Externe Bild-URLs und PDF-URLs bleiben in der TSX als Konstanten – nur die sichtbaren Texte gehen in i18n.

---

## 6. Migrationsreihenfolge (Vorschlag)

Analog zur bewährten Reihenfolge der Domain `gebaeudemanagement` (klein → groß, einfach → komplex):

| Etappe | Inhalt |
|---|---|
| **19b-1** | EntryDesignPage (klein, 2 Karten) – etabliert `shared.label`, `shared.nav.*`. |
| **19b-2** | EntryIntegrationsformenPage (4 Karten, klares Schema). |
| **19b-3** | EntryMaterialPage (6 Karten + Feature-Listen) – etabliert `items.<key>.features[]`. |
| **19b-4** | EntryStandardsPage (Downloads-Block + 3 Standards) – etabliert `downloads.items.<key>.label`. |
| **19b-5** | EntryBeratungPage (2 Themen-Spalten + CTA) – etabliert `topics.<key>.items[]` und `shared.cta.kontaktAufnehmen`. |
| **19b-6** | EntryFunktionalitaetPage (7 Funktionsblöcke, optionale Features). |
| **19b-7** | EntryReferenzenPage (6 Referenzobjekte mit Designwunsch und Scope-Listen). |
| **19b-8** | EntrySystemPage (Root mit Pillars, 7 Discover-Karten, Downloads, CTA, `darkHero`). |
| **19b-final-check** | Domain-weiter Final-Check: `_meta.status` auf `"migrated"`, alle 8 Seiten in `strictPages`, DE/EN strukturgleich, `npm run i18n:check` und `npm run build` grün, Doku-Aktualisierung. |

> Etappen 19b-1 bis 19b-8 werden jeweils mit eigenem Final-Check (`19b-x-final-check`) abgeschlossen, analog zu `19a-*`.

---

## 7. Abgrenzung dieser Etappe (19b-0)

- ✅ Nur Dokumentation neu angelegt (`docs/03-inventories/i18n-eingangssysteme-inventory.md`).
- ✅ `docs/migration-log.md` ergänzt.
- ❌ **Keine** TSX-Datei geändert.
- ❌ **Keine** Locale-Datei geändert (DE/EN bleiben mit `_meta.status = "prepared"`).
- ❌ **Keine** Routen geändert.
- ❌ **Keine** Navigation geändert.
- ❌ **Keine** Assets geändert.
- ❌ **Keine** Config-Dateien geändert (`scripts/i18n/i18n-check.config.json`, `package.json`, `src/i18n/index.ts` usw.).
- ❌ **Kein** Build erforderlich.

---
