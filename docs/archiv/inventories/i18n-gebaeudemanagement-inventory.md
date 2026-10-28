# i18n-Inventar – Gebäudemanagement

> Stand: nach Etappe 19a-0 (Inventar erstellt, noch keine Textmigration).
> Verwandte Dokumente: [`../01-strategy/i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`../02-architecture/code-landkarte.md`](../02-architecture/code-landkarte.md), [`../migration-log.md`](../migration-log.md).

---

## 1. Zweck

- Dieses Dokument ist ein **vorbereitendes Inventar** für die spätere i18n-Migration der Domain `gebaeudemanagement`.
- Es **migriert noch keine Texte** und ändert weder TSX- noch Locale-Dateien.
- Es dient als Grundlage für die nachfolgenden Etappen `19a-1`, `19a-2`, … bis `19a-final-check`.
- Inhaltlich orientiert es sich am Vorgehen der bereits abgeschlossenen Domains `gebaeudekommunikation` und `zutrittskontrolle`.

---

## 2. Technischer Status

| Aspekt | Status |
|---|---|
| Namespace `gebaeudemanagement` in `src/i18n/index.ts` registriert | ✅ ja (Import + `resources.de`/`resources.en` + `I18N_NAMESPACES`) |
| DE-Locale-Datei vorhanden | ✅ `src/i18n/locales/de/gebaeudemanagement.json` |
| EN-Locale-Datei vorhanden | ✅ `src/i18n/locales/en/gebaeudemanagement.json` |
| DE/EN strukturgleich | ✅ ja (beide enthalten nur `_meta`) |
| Vorhandene Root-Keys | nur `_meta` (Felder: `namespace`, `status`, `note`) |
| Status der Locale-Dateien | **vorbereitet** – `_meta.status = "prepared"`, keine echten Seitentexte, keine leeren Werte |
| Bereits vorhandene Keys, die erhalten bleiben müssen | `_meta.*` (Konvention aus anderen Domains) |

---

## 3. Gefundene Seiten

Insgesamt **6 Seiten** unter `src/features/gebaeudemanagement/pages/`, alle in `src/features/gebaeudemanagement/routes.tsx` registriert.

| # | Seite | Datei | Route | Komplexität | Sichtbare Textgruppen | Besonderheiten | Empfohlene Etappe |
|---|---|---|---|---|---|---|---|
| 1 | Alarmanlagenkopplung (Platzhalter) | `AlarmanlagenkopplungPage.tsx` | `/gebaeudemanagement/alarmanlagenkopplung` | **niedrig** | PageLayout (label/headline/intro), 1 ContentSection (label/title/Fließtext) | Reine Platzhalterseite (Etappe 14e-1). Sehr wenige Texte. | `19a-1` |
| 2 | Digital Signage | `DigitalSignagePage.tsx` | `/gebaeudemanagement/digital-signage` | **niedrig–mittel** | PageLayout, 3 ContentSections (Überblick, Einsatzbereiche mit 4 Items, Technik) | Keine horizontale Scroller, keine Datenblatt-Links. Lucide-Icons (Building2/Monitor/Globe/Palette). | `19a-2` |
| 3 | Reservieren und Buchen | `ReservierenBuchenPage.tsx` | `/gebaeudemanagement/reservieren-buchen` | **mittel** | PageLayout, Überblick, Produkte (1 Karte), Vorteile (4 Items) | Horizontaler Scroller-Block vorhanden, Aria-Labels „Zurück/Weiter scrollen“, „Datenblatt“-Link `href="#"`. Nur 1 Produktkarte. | `19a-3` |
| 4 | Schränke und Behälter | `SchraenkeBehaelterPage.tsx` | `/gebaeudemanagement/schraenke-behaelter` | **mittel** | PageLayout, Überblick, Produkte (2 Karten), Vorteile (4 Items) | Horizontaler Scroller, Aria-Labels, „Datenblatt“-Link. Komponentenname intern `SchraenkeBelhaelter` (Tippfehler im Default-Export, nicht im Slug). | `19a-4` |
| 5 | Digitale Namensanzeige | `DigitaleNamensanzeigePage.tsx` | `/gebaeudemanagement/digitale-namensanzeige` | **mittel–hoch** | PageLayout, Überblick, Produkte (5 Karten), Vorteile (4 Items) | Horizontaler Scroller, Aria-Labels, „Datenblatt“-Link, viele Produktbeschreibungen. | `19a-5` |
| 6 | Gebäudemanagement (Root) | `GebaeudemanagementPage.tsx` | `/gebaeudemanagement` | **mittel–hoch** | PageLayout, BCM-Abschnitt, Funktionen mit 5 FeatureBlocks (lange Fließtexte) | Lange Fließtexte je FeatureBlock, Nummerierung „1.“–„5.“ ist Teil der Headline (sollte beim Migrieren stabil bleiben). | `19a-6` |

---

## 4. Detailinventar pro Seite

### 4.1 AlarmanlagenkopplungPage

- **Datei:** `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx`
- **Route:** `/gebaeudemanagement/alarmanlagenkopplung`
- **PageLayout-Texte:**
  - `label`: „Gebäudemanagement"
  - `headline`: „Alarmanlagenkopplung"
  - `intro`: „Diese Seite wird derzeit vorbereitet."
  - `heroImage`: lokales Asset (kein eigener Alt-Text gesetzt)
- **Abschnitte:**
  - ContentSection
    - `label`: „In Vorbereitung"
    - `title`: „Alarmanlagenkopplung"
    - Fließtext: „Informationen zur Kopplung von Gebäudemanagement-Lösungen mit Alarmanlagen werden ergänzt."
- **Karten / Listen / CTAs:** keine
- **Aria-/Alt-/Screenreader-Texte:** keine eigenen
- **Mögliche spätere Key-Struktur:**
  - `alarmanlagenkopplung.hero.label` / `.headline` / `.intro`
  - `alarmanlagenkopplung.placeholder.label` / `.title` / `.text`
- **Hinweise / Risiken:** Inhalt ist explizit als Platzhalter markiert (Etappe 14e-1). Migration trivial; kein eigener Aria-/Alt-Text nötig.

---

### 4.2 DigitalSignagePage

- **Datei:** `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx`
- **Route:** `/gebaeudemanagement/digital-signage`
- **PageLayout-Texte:**
  - `label`: „Gebäudemanagement"
  - `headline`: „Digital Signage – Kontextabhängige digitale Beschilderung für alle Ihre Bedürfnisse"
  - `intro`: „Informieren Sie Bewohner, Mitarbeiter und Besucher mit dem BCM Infoboard: dynamische Inhalte, integriert in Ihr Zutrittskontrollsystem – auf jedem Display mit HDMI-Eingang."
  - `heroImage`: lokales Asset
  - `fullWidth`: aktiviert
- **Abschnitte:**
  - **Überblick** – ContentSection (label „Überblick", title „Infoboard – im BCM System integriert", längerer Fließtext)
  - **Einsatzbereiche** – ContentSection (label „Einsatzbereiche", title „Vielfältige Anwendungsmöglichkeiten")
    - 4 Karten (Items-Map): `Eingangsbereiche`, `Empfangsbereiche`, `Geschäfte, Hotels & Gastronomie`, `Individuelle Gestaltung` jeweils mit `title` + `desc`
  - **Technik** – ContentSection (label „Technik", title „Einfache Integration", Fließtext)
- **Karten / Listen / CTAs:** keine Datenblatt-Links, keine externen CTAs
- **Aria-/Alt-/Screenreader-Texte:** keine eigenen
- **Mögliche spätere Key-Struktur:**
  - `digitalSignage.hero.label/headline/intro`
  - `digitalSignage.overview.label/title/text`
  - `digitalSignage.useCases.label/title/items.{eingang,empfang,handel,individuell}.title/desc`
  - `digitalSignage.technology.label/title/text`
- **Hinweise / Risiken:** Technische Begriffe (`BCM`, `HDMI-Eingang`) als Werte erfassen, nicht zerstückeln. Reihenfolge der 4 Karten beibehalten.

---

### 4.3 ReservierenBuchenPage

- **Datei:** `src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx`
- **Route:** `/gebaeudemanagement/reservieren-buchen`
- **PageLayout-Texte:**
  - `label`: „Gebäudemanagement"
  - `headline`: „Reservieren und Buchen – Intelligentes Buchungssystem"
  - `intro`: „Reservierungen für jeden, überall: Mit dem BCM-Buchungssystem verwalten Sie Räume, Geräte und Ressourcen digital – mit automatischer Zutrittskontrolle."
  - `fullWidth`: aktiviert
- **Abschnitte:**
  - **Überblick** – ContentSection (label „Überblick", title „Digitales Buchungssystem", Fließtext)
  - **Produkte** – manuell (kein ContentSection-Wrapper)
    - Header-Span: „Produkte"
    - h2: „Lösungen im Überblick"
    - Subline: „Das BCM-Buchungssystem – flexibel einsetzbar für Räume, Geräte und Gemeinschaftseinrichtungen."
    - 1 Produktkarte (`bcmBuchungssystem`): `subtitle`, `title`, `description`
    - „Datenblatt"-Link (`href="#"`)
    - Aria-Labels: „Zurück scrollen", „Weiter scrollen" (nur sichtbar bei > 1 Karte)
  - **Vorteile** – ContentSection (label „Vorteile", title „Warum das BCM-Buchungssystem?")
    - 4 Items: `intelligenteUebersicht`, `sichererZugang`, `umfassendeNutzung`, `flexibleRegeln`
- **Mögliche spätere Key-Struktur:**
  - `reservierenBuchen.hero.label/headline/intro`
  - `reservierenBuchen.overview.label/title/text`
  - `reservierenBuchen.products.label/title/intro/items.bcmBuchungssystem.{subtitle,title,description}`
  - `reservierenBuchen.benefits.label/title/items.{intelligenteUebersicht,sichererZugang,umfassendeNutzung,flexibleRegeln}.{title,desc}`
  - Wiederverwenden, falls eingeführt: `shared.products.datasheet`, `shared.scroll.left`, `shared.scroll.right` (Muster aus `zutrittskontrolle`)
- **Hinweise / Risiken:** Scrollbutton-Block nur bedingt sichtbar (`produktCards.length > 1`), Aria-Texte trotzdem mit migrieren. „Datenblatt"-`href="#"` unverändert lassen.

---

### 4.4 SchraenkeBehaelterPage

- **Datei:** `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx`
- **Route:** `/gebaeudemanagement/schraenke-behaelter`
- **PageLayout-Texte:**
  - `label`: „Gebäudemanagement"
  - `headline`: „Schränke und Behälter – Elektronische Schließsysteme für Mobiliar"
  - `intro`: „Wiederverwendbar und flexibel: Batteriebetriebene Offline-Schrankschlösser sichern Spinde, Schränke und Serverschränke – mit digitaler Rechteverwaltung über die browserbasierte BCM-Software."
  - `fullWidth`: aktiviert
- **Abschnitte:**
  - **Überblick** – ContentSection (label „Überblick", title „Elektronische Schrankschlösser", Fließtext)
  - **Produkte** – Header „Produkte"/„Lösungen im Überblick"/Subline + 2 Karten (`schrankschloss`, `serverschloss`) mit `subtitle`/`title`/`description`, je „Datenblatt"-Link, Aria-Labels Scrollbuttons
  - **Vorteile** – ContentSection (label „Vorteile", title „Warum TCS für die Sicherung von Schränken und Behälter?") mit 4 Items: `flexibel`, `nachruestung`, `zentraleVerwaltung`, `aufruestbar`
- **Aria-/Alt-/Screenreader-Texte:** Scrollbuttons („Zurück/Weiter scrollen"), `<img alt={card.title}>` (Produktbild-Alt = Titel; spätere i18n via Item-Key)
- **Mögliche spätere Key-Struktur:**
  - `schraenkeBehaelter.hero.label/headline/intro`
  - `schraenkeBehaelter.overview.label/title/text`
  - `schraenkeBehaelter.products.label/title/intro/items.{schrankschloss,serverschloss}.{subtitle,title,description}`
  - `schraenkeBehaelter.benefits.label/title/items.{flexibel,nachruestung,zentraleVerwaltung,aufruestbar}.{title,desc}`
- **Hinweise / Risiken:** Default-Export-Variable im Code heißt `SchraenkeBelhaelter` (Tippfehler), Slug ist korrekt `schraenke-behaelter` – Variable nicht im Zuge der i18n-Etappe umbenennen (separates Anliegen).

---

### 4.5 DigitaleNamensanzeigePage

- **Datei:** `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx`
- **Route:** `/gebaeudemanagement/digitale-namensanzeige`
- **PageLayout-Texte:**
  - `label`: „Gebäudemanagement"
  - `headline`: „Digitale Namensanzeige – Elektronische Namensschilder und Verwaltung"
  - `intro`: „Mieterwechsel ohne Techniker: Digitale Namensanzeigen und zentrale Verwaltung für Außenstationen, Briefkästen und Klingeltableaus – einfach per Browser."
  - `fullWidth`: aktiviert
- **Abschnitte:**
  - **Überblick** – ContentSection (label „Überblick", title „Digitale Namensverwaltung für Gebäude", Fließtext)
  - **Produkte** – Header „Produkte"/„Lösungen im Überblick"/Subline + 5 Karten: `adx5`, `displaymodul`, `briefkasten`, `software`, `etagentaster`, je `subtitle`/`title`/`description`, „Datenblatt"-Link, Aria-Labels Scrollbuttons
  - **Vorteile** – ContentSection (label „Vorteile", title „Warum TCS für digitale Namensanzeigen?") mit 4 Items: `fernverwaltung`, `mieterwechsel`, `modular`, `vandalismus`
- **Aria-/Alt-/Screenreader-Texte:** Scrollbuttons; Produktkarten rendern aktuell **kein** `<img>` im Bildbereich (leerer `aspect-[4/3]`-Container) – ein späterer Alt-Text ist hier vorerst nicht erforderlich. Keine i18n-Risiken.
- **Mögliche spätere Key-Struktur:**
  - `digitaleNamensanzeige.hero.label/headline/intro`
  - `digitaleNamensanzeige.overview.label/title/text`
  - `digitaleNamensanzeige.products.label/title/intro/items.{adx5,displaymodul,briefkasten,software,etagentaster}.{subtitle,title,description}`
  - `digitaleNamensanzeige.benefits.label/title/items.{fernverwaltung,mieterwechsel,modular,vandalismus}.{title,desc}`
- **Hinweise / Risiken:** Lange Produktbeschreibungen mit Markenbegriffen (`CARUS ARGOS`, `ADx5`) – als Werte unverändert übernehmen.

---

### 4.6 GebaeudemanagementPage (Root)

- **Datei:** `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx`
- **Route:** `/gebaeudemanagement`
- **PageLayout-Texte:**
  - `label`: „Gebäudemanagement"
  - `headline`: „Vernetztes Gebäudemanagement mit dem BCM-System"
  - `intro`: „Sicherheit, Komfort und digitale Information zentral gesteuert"
  - `heroImage`: lokales Block-Asset
- **Abschnitte:**
  - **BCM-System** – ContentSection (label „BCM-System", title „Mehr als Zutrittskontrolle", langer Fließtext zur Systembeschreibung)
  - **Funktionen** – ContentSection (label „Funktionen", title „Gebäudemanagement im Detail")
    - 5 FeatureBlocks (jeweils `headline` + `text`):
      1. „1. Digitale Namensanzeige"
      2. „2. Zufahrtssteuerung und Parkraumüberwachung"
      3. „3. Digitale Informations- und Anzeigesysteme (Digital Signage)"
      4. „4. Reservieren und Buchen"
      5. „5. Alarmanlagenkopplung"
- **Karten / Listen / CTAs:** keine eigenen Buttons/Links innerhalb der FeatureBlocks (keine internen Verlinkungen aus dieser Page heraus).
- **Aria-/Alt-/Screenreader-Texte:** keine eigenen.
- **Mögliche spätere Key-Struktur:**
  - `root.hero.label/headline/intro`
  - `root.bcm.label/title/text`
  - `root.functions.label/title/items.{digitaleNamensanzeige,zufahrt,digitalSignage,reservierenBuchen,alarmanlagenkopplung}.{headline,text}`
- **Hinweise / Risiken:**
  - Die **Nummerierung „1." bis „5."** in den Headlines beibehalten – entweder direkt im DE/EN-Wert oder konsistent als Bestandteil der Übersetzung. Nicht im JSX dynamisch nummerieren, um Reihenfolge stabil zu halten.
  - Lange Fließtexte – DE/EN sorgfältig pflegen.

---

## 5. Vorgeschlagene i18n-Key-Struktur (Domain `gebaeudemanagement`)

Empfohlen ist eine flache, sprechende Struktur analog zu `zutrittskontrolle`:

```
gebaeudemanagement
├── _meta { namespace, status, note }
├── shared
│   ├── label                       // wiederkehrendes „Gebäudemanagement" (PageLayout-label)
│   ├── sections.overview           // „Überblick"
│   ├── sections.benefits           // „Vorteile"
│   ├── sections.useCases           // „Einsatzbereiche" (DigitalSignage)
│   ├── sections.technology         // „Technik" (DigitalSignage)
│   ├── products.label              // „Produkte"
│   ├── products.title              // „Lösungen im Überblick"
│   ├── products.datasheet          // „Datenblatt"
│   ├── scroll.left                 // Aria „Zurück scrollen"
│   └── scroll.right                // Aria „Weiter scrollen"
├── root.*
├── alarmanlagenkopplung.*
├── digitalSignage.*
├── reservierenBuchen.*
├── schraenkeBehaelter.*
└── digitaleNamensanzeige.*
```

Konventionen (analog zur i18n-Strategie):

- **Stabile technische Keys**, keine Index-Keys (`items[0]` ist verboten – stattdessen sprechende Keys wie `items.adx5`).
- **DE = Master**, EN strukturgleich.
- **Shared-Keys** nur einführen, wenn ein Wert wirklich mehrfach exakt vorkommt (sinnvoll für `Gebäudemanagement`-Label, „Überblick", „Vorteile", „Produkte", „Lösungen im Überblick", „Datenblatt", Scroll-Aria-Labels).
- **Markennamen / Produktnamen / technische Begriffe** (`BCM`, `BCM-System`, `BCM Infoboard`, `CARUS ARGOS`, `ADx5`, `HDMI`, `PZ-Einsatz`) als Werte unverändert übernehmen.
- **Keine künstliche Tiefe** – Struktur folgt der tatsächlichen Seite.

---

## 6. Empfohlene Migrationsreihenfolge

Abgeleitet aus tatsächlicher Komplexität und Risiko (klein → groß):

| Etappe | Inhalt | Begründung |
|---|---|---|
| `19a-1` | Alarmanlagenkopplung (Platzhalter) | Sehr wenige Texte, ideal um die Domain-Datei mit `_meta` + `shared.*` + `alarmanlagenkopplung.*` produktiv zu starten. |
| `19a-2` | Digital Signage | Übersichtlich strukturiert (3 ContentSections, 4 Items), keine Scroller, keine Produktkarten – guter zweiter Schritt. |
| `19a-3` | Reservieren und Buchen | Erste Seite mit Scroller-Pattern, aber nur 1 Produktkarte – `shared.products.*` und `shared.scroll.*` werden hier eingeführt. |
| `19a-4` | Schränke und Behälter | Wiederholt das Scroller-Pattern mit 2 Produktkarten + 4 Vorteilen. Geringes neues Risiko. |
| `19a-5` | Digitale Namensanzeige | 5 Produktkarten + 4 Vorteile, längere Beschreibungen – `shared.*` ist zu diesem Zeitpunkt schon stabil. |
| `19a-6` | Gebäudemanagement (Root) | 5 lange FeatureBlock-Texte, Nummerierung – sinnvoll als letzter Schritt mit voller Sicht auf Unterseiten. |
| `19a-final-check` | Domain `gebaeudemanagement` vollständig prüfen | DE/EN-Strukturgleichheit, leere Werte, harte Texte in TSX, Aria-/Alt-/Screenreader-Texte, Routen/Layout/Assets unverändert, Build grün. |

---

## 7. Prüfhinweise für spätere Migrationsetappen

- Bestehende Keys (`_meta.*`, einmal eingeführte `shared.*`) **nicht löschen**.
- **DE als Master**, EN strukturgleich pflegen – jede neue Schlüsselebene muss in beiden Dateien existieren.
- **Keine harten sichtbaren Texte** in migrierten TSX-Dateien stehen lassen. Interne JSX-Kommentare und technische Werte (`BCM`, `HDMI`, `PZ-Einsatz`, `CARUS ARGOS`, `ADx5`) sind erlaubt.
- **Aria-/Alt-/Screenreader-Texte** der Scrollbuttons mitnehmen (`shared.scroll.left/right`). Bestehende `<img alt={card.title}>` werden über den Item-Key aufgelöst.
- **Layout, Klassen, Animationen, Icons, Reihenfolge, Routen, Navigation, Assets, URL-Strategie unverändert** lassen.
- **`href="#"`-Datenblatt-Links** nicht verändern – nur Linktext über `shared.products.datasheet` führen.
- Nach jeder Code-Etappe: **`npm run build`** und nur die bekannte Chunk-Size-Warnung als akzeptiert dokumentieren.
- Nach jeder abgeschlossenen Etappe: **`docs/migration-log.md`** ergänzen.
- Nach `19a-final-check`: `docs/current-status.md`, `docs/01-strategy/i18n-strategy.md` und `docs/02-architecture/code-landkarte.md` auf den neuen Stand bringen (Status `gebaeudemanagement` = migriert).

---

## 8. Abgrenzung dieser Etappe

In Etappe `19a-0` wurde:

- **keine TSX-Datei** geändert
- **keine Locale-Datei** geändert
- **keine Route** geändert
- **keine Navigation** geändert
- **kein Asset** geändert
- **kein Build** ausgeführt (nicht erforderlich)

Es wurde **ausschließlich Dokumentation** erstellt:

- diese Inventar-Datei (`docs/03-inventories/i18n-gebaeudemanagement-inventory.md`)
- ein Eintrag in `docs/migration-log.md`
