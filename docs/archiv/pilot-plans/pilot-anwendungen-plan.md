# Pilot-Plan: Feature-Domain `anwendungen`

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


Status: **Planung (Etappe 10a)** – kein Produktivcode geändert.
Datum: 2026-04-21

Diese Domain ist mit Abstand die **größte Migrationseinheit** im Projekt
(21 Pages + 1 generische Detailkomponente + 1 Datenmodul).
Daher wird hier bewusst nur **geplant und geclustert**, nicht migriert.

---

## 1. Ziel der Analyse

- `anwendungen` als große Feature-Domain vorbereiten
- Keine Migration in dieser Etappe
- Keine Konsolidierung von Inhalten oder Komponenten
- Keine Routenänderung (alle Slugs bleiben byte-identisch)
- Keine Textänderung
- Keine Asset-Verschiebung
- Keine Navigations- oder i18n-Änderung
- Empfehlung für die Aufteilung von Etappe 10b (Splitting in 10b/10c/10d)

---

## 2. Betroffene Seiten

### Vorgeschlagene Zielstruktur

```
src/features/anwendungen/
├── pages/        (alle 21 .tsx)
├── components/   (AnwendungDetailPage.tsx + ggf. lokale Card-Komponenten)
├── data/         (referenzprojekte.ts)
├── assets/       (nur domain-exklusive Bilder, siehe §5)
└── content/      (optional später, z. B. ausgelagerte Daten-Objekte)
```

### Hauptseiten unter `src/pages/anwendungen/`

| Aktuelle Datei | Aktuelle Route | Funktion / Inhalt | Empfohlener Zielpfad | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|
| `Wohnbau.tsx` | `/anwendungen/wohnbau` | Übersicht 4 Wohnbau-Cards | `features/anwendungen/pages/WohnbauPage.tsx` | move + rename `*Page.tsx` | niedrig | Lokales Asset `feature-sanierung.png` |
| `Einfamilienhaus.tsx` | `/anwendungen/einfamilienhaus` | Detail (AnwendungDetailPage) | `features/anwendungen/pages/EinfamilienhausPage.tsx` | move | niedrig | nur externe Bilder |
| `Mehrfamilienhaus.tsx` | `/anwendungen/mehrfamilienhaus` | Detail | `features/anwendungen/pages/MehrfamilienhausPage.tsx` | move | niedrig | nur externe Bilder |
| `Grossanlage.tsx` | `/anwendungen/grossanlage` | Detail | `features/anwendungen/pages/GrossanlagePage.tsx` | move | mittel | **Namenskollision** mit `gebaeudekommunikation/GrossanlagenPage.tsx` (Plural) – siehe §4 |
| `Sanierung.tsx` | `/anwendungen/sanierung` | Detail | `features/anwendungen/pages/SanierungPage.tsx` | move | niedrig | |
| `Pflege.tsx` | `/anwendungen/pflege` | Detail | `features/anwendungen/pages/PflegePage.tsx` | move | niedrig | |
| `Klinik.tsx` | `/anwendungen/klinik` | Detail | `features/anwendungen/pages/KlinikPage.tsx` | move | niedrig | |
| `Behoerde.tsx` | `/anwendungen/behoerde` | Detail | `features/anwendungen/pages/BehoerdePage.tsx` | move | niedrig | |
| `Feuerwehr.tsx` | `/anwendungen/feuerwehr` | Detail | `features/anwendungen/pages/FeuerwehrPage.tsx` | move | niedrig | |
| `Schwimmbad.tsx` | `/anwendungen/schwimmbad` | Detail | `features/anwendungen/pages/SchwimmbadPage.tsx` | move | niedrig | |
| `Concierge.tsx` | `/anwendungen/concierge` | Detail (Systemfunktion) | `features/anwendungen/pages/ConciergePage.tsx` | move | niedrig | |
| `InterneKommunikation.tsx` | `/anwendungen/interne-kommunikation` | Detail | `features/anwendungen/pages/InterneKommunikationPage.tsx` | move | mittel | thematisch nah an `gebaeudekommunikation/systemloesungen` |
| `DigitaleNamensverwaltung.tsx` | `/anwendungen/digitale-namensverwaltung` | Detail | `features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx` | move | mittel | inhaltl. nah an `gebaeudemanagement/DigitaleNamensanzeige` (siehe §4) |
| `Feuerwehrdurchsage.tsx` | `/anwendungen/feuerwehrdurchsage` | Detail | `features/anwendungen/pages/FeuerwehrdurchsagePage.tsx` | move | mittel | thematisch Systemlösung |
| `BidirektionaleVideo.tsx` | `/anwendungen/bidirektionale-video` | Detail | `features/anwendungen/pages/BidirektionaleVideoPage.tsx` | move | mittel | thematisch Systemlösung |
| `MobileTuerkommunikation.tsx` | `/anwendungen/mobile-tuerkommunikation` | Detail | `features/anwendungen/pages/MobileTuerkommunikationPage.tsx` | move | mittel | thematisch nah an `gebaeudekommunikation` |
| `ZutrittskontrolleBCM.tsx` | `/anwendungen/zutrittskontrolle-bcm` | Detail | `features/anwendungen/pages/ZutrittskontrolleBCMPage.tsx` | move | mittel | Doublette Domain `zutrittskontrolle` (siehe §4) |
| `Gesundheitseinrichtungen.tsx` | `/anwendungen/gesundheitseinrichtungen` | Übersicht (2 Cards) | `features/anwendungen/pages/GesundheitseinrichtungenPage.tsx` | move | niedrig | Asset `block-objekt.jpg` shared |
| `OeffentlicheHand.tsx` | `/anwendungen/oeffentliche-hand` | Übersicht (3 Cards) | `features/anwendungen/pages/OeffentlicheHandPage.tsx` | move | niedrig | Asset `block-objekt.jpg` shared |
| `Referenzprojekte.tsx` | `/anwendungen/referenzprojekte` | Übersicht (Liste) | `features/anwendungen/pages/ReferenzprojektePage.tsx` | move | niedrig | nutzt `data/referenzprojekte.ts` |
| `ReferenzprojektDetail.tsx` | `/anwendungen/referenzprojekte/:slug` | Detailroute mit `useParams` | `features/anwendungen/pages/ReferenzprojektDetailPage.tsx` | move | mittel | Slug-Routing, Carousel |

### Top-Level-Seiten mit Anwendungsbezug (außerhalb `src/pages/anwendungen/`)

| Aktuelle Datei | Aktuelle Route | Funktion / Inhalt | Empfohlener Zielpfad | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|
| `src/pages/Anwendungen.tsx` | `/anwendungen` | Hauptübersicht mit allen Kategorien + Systemfunktionen + Referenzen | `features/anwendungen/pages/AnwendungenPage.tsx` | move | niedrig | enthält 5 Kategorien (Wohngebäude, Bildungseinrichtungen, Gesundheit, Öffentlich, Übergreifend) + Systemfunktionen + Referenzen-Teaser |
| `src/pages/Objektloesungen.tsx` | `/objektloesungen` | Top-Level-Übersicht mit 8 Branchen-Karten | `features/anwendungen/pages/ObjektloesungenPage.tsx` | move | mittel | Top-Level-Slug `/objektloesungen` (kein `/anwendungen/...`) – Routenwert bleibt unverändert |
| `src/pages/Bildungseinrichtungen.tsx` | `/bildungseinrichtungen` | Top-Level-Übersicht (Kita/Schule/Wohnheim) | `features/anwendungen/pages/BildungseinrichtungenPage.tsx` | move | mittel | Top-Level-Slug `/bildungseinrichtungen` (kein `/anwendungen/...`) – inhaltlich klar Anwendungen-Domain |

### Daten + Komponenten

| Aktuelle Datei | Aktueller Ort | Funktion | Empfohlener Zielpfad | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|
| `AnwendungDetailPage.tsx` | `src/components/` | Generisches Detail-Layout für 13 Detail-Pages | `features/anwendungen/components/AnwendungDetailPage.tsx` | move | mittel | Sehr viele Konsumenten (13 Detail-Pages). Imports müssen alle aktualisiert werden. |
| `referenzprojekte.ts` | `src/data/` | 12 Referenzprojekt-Datensätze | `features/anwendungen/data/referenzprojekte.ts` | move | mittel | Konsumenten: `Referenzprojekte.tsx`, `ReferenzprojektDetail.tsx` |

---

## 3. Clusterung der Anwendungen

Die 21 Pages lassen sich logisch in 6 Cluster gruppieren.
Die Cluster dienen **nur der Plan-Strukturierung**, sie werden in der Migration **nicht** als Unterordner abgebildet (alle Pages liegen flach unter `pages/`).

### Cluster A – Übersichtsseiten (Hub)
- `Anwendungen.tsx` (`/anwendungen`)
- `Objektloesungen.tsx` (`/objektloesungen`) – Top-Level
- `Bildungseinrichtungen.tsx` (`/bildungseinrichtungen`) – Top-Level
- `Wohnbau.tsx` (`/anwendungen/wohnbau`)
- `Gesundheitseinrichtungen.tsx` (`/anwendungen/gesundheitseinrichtungen`)
- `OeffentlicheHand.tsx` (`/anwendungen/oeffentliche-hand`)

### Cluster B – Wohnbau (Detail)
- `Einfamilienhaus.tsx`
- `Mehrfamilienhaus.tsx`
- `Grossanlage.tsx`
- `Sanierung.tsx`

### Cluster C – Gesundheit (Detail)
- `Pflege.tsx`
- `Klinik.tsx`

### Cluster D – Öffentliche Hand / Sonderbau (Detail)
- `Behoerde.tsx`
- `Feuerwehr.tsx`
- `Schwimmbad.tsx`

### Cluster E – Systemfunktionen / Übergreifend
- `Concierge.tsx`
- `InterneKommunikation.tsx`
- `DigitaleNamensverwaltung.tsx`
- `Feuerwehrdurchsage.tsx`
- `BidirektionaleVideo.tsx`
- `MobileTuerkommunikation.tsx`
- `ZutrittskontrolleBCM.tsx`

### Cluster F – Referenzen
- `Referenzprojekte.tsx`
- `ReferenzprojektDetail.tsx`
- (+ Daten: `referenzprojekte.ts`)

### Überschneidungen mit bereits migrierten Domains

| Cluster | Berührt | Anmerkung |
|---|---|---|
| E | `gebaeudekommunikation` | `MobileTuerkommunikation`, `Feuerwehrdurchsage`, `BidirektionaleVideo`, `InterneKommunikation` sind „Anwendungssicht" – die **Produktsicht** liegt in `gebaeudekommunikation/systemloesungen` |
| E | `gebaeudemanagement` | `DigitaleNamensverwaltung` (Anwendung) ↔ `DigitaleNamensanzeige` (Produkt unter BCM/Gebäudemanagement) |
| E | `zutrittskontrolle` | `ZutrittskontrolleBCM` (Anwendungs-Übersicht) ↔ Domain `zutrittskontrolle` (Produktunterseiten) |
| B | `gebaeudekommunikation` | `Grossanlage` (Anwendung Wohnpark) ↔ `GrossanlagenPage` (Produkt Großanlagen-Sprechanlage) |

**Doktrin** (kein Migrationsschritt, nur Klärung):
- `anwendungen/*` = **Use-Case-Sicht** (Wer? Welches Gebäude?).
- Domain-Pages = **Produkt-/Systemsicht** (Was? Welches System?).
- Beide Sichten dürfen bestehen und sich gegenseitig verlinken.
- Texte werden in 10b–10d **nicht** zusammengeführt.

---

## 4. Grenzfälle

### 4.1 `anwendungen/Grossanlage.tsx` ↔ `gebaeudekommunikation/GrossanlagenPage.tsx`

- Singular vs. Plural – **bewusste Unterscheidung**.
- `/anwendungen/grossanlage` = Anwendungssicht (Wohnpark, Quartier, Pförtner).
- `/grossanlagen` = Produktsicht (große Sprechanlagen-Systeme bis 12 Zoll Display).
- **Empfehlung:** Beide bleiben getrennt. Datei wird nach `features/anwendungen/pages/GrossanlagePage.tsx` (Singular) verschoben, Datei in `gebaeudekommunikation/` bleibt unverändert.

### 4.2 `MobileTuerkommunikation.tsx` ↔ `gebaeudekommunikation`

- Anwendungssicht (Türruf aufs Smartphone, Erreichbarkeit).
- Domain `gebaeudekommunikation/SnipdooIp` und `Tuerkommunikation` decken Produktsicht ab.
- **Empfehlung:** Bleibt unter `anwendungen/`. Keine Inhaltskonsolidierung.

### 4.3 `ZutrittskontrolleBCM.tsx` ↔ Domain `zutrittskontrolle`

- Diese Seite wirkt wie eine **zweite Übersicht** für BCM (Anwendungs-Hub).
- Domain `zutrittskontrolle` enthält 5 spezifische Produkt-/Anwendungspfade.
- **Empfehlung:** Bleibt vorerst unter `anwendungen/` (Slug `/anwendungen/zutrittskontrolle-bcm` wird in vielen `verwandteAnwendungen`-Listen referenziert). Spätere Konsolidierung möglich, **nicht in 10b–10d**.

### 4.4 `DigitaleNamensverwaltung.tsx` ↔ `gebaeudemanagement/DigitaleNamensanzeige`

- Anwendungssicht (Mieterwechsel ohne Techniker) vs. Produktsicht (BCM-Modul „Digitale Namensanzeige").
- **Empfehlung:** Bleibt getrennt. Datei wandert nach `features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx`.

### 4.5 `Feuerwehrdurchsage.tsx` und `BidirektionaleVideo.tsx` ↔ `gebaeudekommunikation/systemloesungen`

- Beides sind Detailseiten, die als „Systemfunktion" auch unter `/systemloesungen` referenziert werden.
- **Empfehlung:** Bleiben unter `anwendungen/` (Slugs sind dort gewachsen, `verwandteAnwendungen`-Verlinkungen vorhanden). Keine Verschiebung in `gebaeudekommunikation/`.

### 4.6 `Bildungseinrichtungen.tsx` als Top-Level-Route

- Slug `/bildungseinrichtungen` (kein `/anwendungen/...`).
- Verlinkt aus `Anwendungen.tsx` und mehreren `verwandteAnwendungen`-Listen.
- **Empfehlung:** Datei wandert technisch in `features/anwendungen/pages/`, **Route bleibt `/bildungseinrichtungen`**. Keine Slug-Reform in 10b–10d.

### 4.7 `Objektloesungen.tsx` als Top-Level-Route

- Slug `/objektloesungen` (kein `/anwendungen/...`).
- Verlinkt u. a. aus Footer-Datenstruktur (5 Anwendungen-Footer-Links zeigen aktuell auf `/objektloesungen`, vgl. Etappe 4d).
- **Empfehlung:** Datei wandert technisch in `features/anwendungen/pages/`, **Route bleibt `/objektloesungen`**.

### 4.8 `Referenzprojekte` und `ReferenzprojektDetail` mit `referenzprojekte.ts`

- Klare zusammenhängende Einheit (Liste + Detail + Datenmodul).
- Datei `referenzprojekte.ts` liegt aktuell unter `src/data/`.
- **Empfehlung:** Komplette Einheit in einem Schritt verschieben (gemeinsam mit dem Übersichts-Cluster A in **10b**). Damit bleibt `src/data/` nach 10b leer und kann zu einem späteren Zeitpunkt entfernt werden.

---

## 5. Betroffene Assets

### Lokale Asset-Imports (nur diese 3 Imports gefunden, alle `block-objekt.jpg`)

| Asset | Importiert in | Mehrfach genutzt? | Möglicher Zielpfad | Empfehlung |
|---|---|---|---|---|
| `src/assets/block-objekt.jpg` | `Wohnbau.tsx`, `Referenzprojekte.tsx`, `Gesundheitseinrichtungen.tsx`, `OeffentlicheHand.tsx`, `Objektloesungen.tsx` (5 Konsumenten innerhalb `anwendungen`-Cluster) – muss vor 10b/c/d gegen Konsumenten **außerhalb** `anwendungen` gegrept werden | ja, mind. 5 (zu prüfen) | bleibt vorerst in `src/assets/` | **Nicht verschieben.** Wenn Etappe 10x abgeschlossen ist und nachweislich kein Konsument außerhalb `anwendungen` mehr existiert, kann später in `features/anwendungen/assets/` verschoben werden. |
| `src/assets/feature-sanierung.png` | `Wohnbau.tsx` | unklar – per grep vor 10b prüfen | falls nur dort: `features/anwendungen/assets/feature-sanierung.png` | **Vor 10b/c per grep verifizieren.** Wenn ausschließlich in `Wohnbau.tsx` genutzt, mit dem Wohnbau-Cluster mitziehen. |

### Externe Bilder (NICHT migrieren)

Sehr viele Anwendungsseiten nutzen externe Bild-URLs, vor allem von `https://www.tcsag.de/fileadmin/_processed_/...` (ca. 30+ Vorkommen) und `https://tcsag-web.lovable.app/referenzen/...` (12 Vorkommen in `referenzprojekte.ts`).

- Werden **nicht** als lokale Assets behandelt.
- Bleiben unverändert als URL-Strings.
- Späteres Self-Hosting ist eine **separate Etappe** (außerhalb Migrations-Roadmap).

### Heroes der `AnwendungDetailPage`-Seiten

Die meisten Detail-Pages setzen `heroImage` direkt auf eine externe URL (vgl. `Einfamilienhaus.tsx`, `Concierge.tsx`, `Sanierung.tsx`, …). Daher entstehen **keine** lokalen Asset-Moves für diese Seiten.

### Bewusst geschützte Shared Assets (NICHT verschieben)

- `block-objekt.jpg` – Konsumenten innerhalb und ggf. außerhalb der Domain
- alle externen URLs
- `block-*`-Familie generell (siehe Etappen 8a/9a-Doktrin)

---

## 6. Betroffene Komponenten

| Komponente | Aktueller Pfad | Nutzung | Zielentscheidung | Risiko | Empfehlung |
|---|---|---|---|---|---|
| `AnwendungDetailPage` | `src/components/` | 13 Detail-Pages der Domain | **gehört in die Domain** → `features/anwendungen/components/` | mittel | Verschieben in **10b** zusammen mit Hub/Übersichten – alle 13 Importpfade in einem Rutsch anpassen. Type-Exports (`AnwendungPageData`, `Anforderung`, `Leistungsbereich`, …) mit verschieben. |
| `PageLayout` / `ContentSection` | `src/components/` | domainübergreifend (alle Domains) | **bleibt generisch** in `src/components/` | niedrig | Nicht anfassen. |
| `FeatureBlock` | `src/components/ContentBlocks.tsx` | domainübergreifend | **bleibt generisch** | niedrig | Nicht anfassen. |
| Lokale Card-Renderer in `Anwendungen.tsx` (`SolutionCardComponent`) | inline in `Anwendungen.tsx` | nur dort | wandert mit der Page mit | niedrig | Keine Extraktion in 10b. |
| Carousel (`@/components/ui/carousel`) | shadcn UI | `ReferenzprojektDetail` | **bleibt** in `components/ui/` | niedrig | Nicht anfassen. |

---

## 7. Datenstruktur / Referenzen

- `src/data/referenzprojekte.ts` enthält 12 Datensätze (`ReferenzprojektData[]`).
- Konsumenten:
  - `src/pages/anwendungen/Referenzprojekte.tsx` (`import { referenzprojekte }`)
  - `src/pages/anwendungen/ReferenzprojektDetail.tsx` (`import { referenzprojekte }`, lookup über `slug`)
- **Empfehlung 10b:**
  - Datei in einem Move nach `src/features/anwendungen/data/referenzprojekte.ts` verschieben.
  - Beide Konsumenten-Imports aktualisieren (`@/features/anwendungen/data/referenzprojekte`).
  - `src/data/` darf nach dem Move leer bleiben (Aufräumen separat, wenn keine andere Datei darin liegt).
- **Spätere Optionen** (nicht jetzt):
  - Auslagerung nach Lovable Cloud (Supabase) als CMS-light für Referenzen – eigene Etappe, eigene Plan-Datei.

---

## 8. App.tsx / Routing

### Betroffene App.tsx-Imports (nach Etappen 10b/10c/10d insgesamt)

- 21 Imports aus `./pages/anwendungen/...`
- 1 Import aus `./pages/Anwendungen.tsx`
- 1 Import aus `./pages/Objektloesungen.tsx`
- 1 Import aus `./pages/Bildungseinrichtungen.tsx`

**Routenwerte:**
- Alle 24 Route-Werte bleiben **byte-identisch** (keine Slug-Änderung).
- Keine `/de`-/`/en`-Routen.
- Keine Redirects.
- Keine Rename-Operationen auf Route-Ebene.

Die Werte stehen bereits in `src/navigation/routes.ts` (`ROUTES.anwendungen.*`, `ROUTES.bildungseinrichtungen`, `ROUTES.objektloesungen`).

---

## 9. Navigation-Bezug

- `src/navigation/mainNavigation.ts` enthält bereits alle Anwendungen-Links.
- Inkonsistenz: Manche Anwendungen-Children verweisen auf Top-Level-Routen (`/bildungseinrichtungen`, `/objektloesungen`) statt `/anwendungen/...`. Diese **Routenstruktur ist gewollt** und wird nicht reformiert.
- Footer (`footerNavigation.ts`) referenziert in seiner Anwendungen-Spalte `/objektloesungen` (5 `pending`-Einträge, vgl. Etappe 4d) – **nicht in 10b–10d ändern**.
- Persona-Komponenten verlinken vereinzelt auf `/anwendungen/...` und `/bildungseinrichtungen` – **nicht in 10b–10d ändern**.
- **Empfehlung:** Linkkorrekturen (Footer-Anwendungen-Spalte, Persona-Verlinkungen) sind eine **separate Etappe** nach Abschluss aller anwendungs-bezogenen Moves.

---

## 10. i18n-Bezug

- Navigation-i18n (DE/EN) ist seit 4i aktiv (`navigation`-Namespace).
- Anwendungstexte sind weiterhin **hartcodiert in den Komponenten** (Headlines, Intros, Anforderungen, Leistungen, Beschreibungen).
- **Spätere Option:** eigener Namespace `anwendungen`:
  - `src/i18n/locales/de/pages/anwendungen.json`
  - `src/i18n/locales/en/pages/anwendungen.json`
- **In 10b/10c/10d findet keine Textmigration statt.** Struktur zuerst, Text später.

---

## 11. Risiken und Schutzmaßnahmen

| Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Schutzmaßnahme |
|---|---|---|---|
| Sehr viele Dateien (24 Pages + 1 Komponente + 1 Daten-Datei) → Big-Bang fehleranfällig | hoch | Build-Fehler, lange Review-Zeit | **Splitting in 10b/10c/10d** (siehe §12) |
| Namensverwechslung `Grossanlage` (Anwendung) ↔ `Grossanlagen` (Produkt) | mittel | falscher Import, broken link | Singular vs. Plural strikt einhalten, Empfehlungen in §4.1 dokumentieren |
| Versehentliches Konsolidieren von Inhalten (Anwendung ↔ Produkt) | mittel | Verlust kuratierter Texte | Doktrin §3 explizit: **keine Textänderung in 10b–10d** |
| Shared Asset `block-objekt.jpg` versehentlich verschieben | mittel | Broken Image in mehreren Pages | Asset bleibt in `src/assets/`, vgl. §5 |
| `referenzprojekte.ts`-Importpfade in 2 Konsumenten nicht synchron geändert | mittel | Build-Fehler | Nur in **einem** Etappenschritt (10b) verschieben, beide Konsumenten **gleichzeitig** anpassen |
| `ReferenzprojektDetail` mit Slug-Routing wird beim Move beschädigt | niedrig | Detailroute defekt | Routenwert byte-identisch lassen, Reactor-Type `useParams<{ slug: string }>()` unverändert |
| `AnwendungDetailPage`-Import in 13 Pages: einer wird vergessen | hoch | TS-Build-Fehler in 1 Page | Komponente und 13 Pages **im selben Etappenschritt (10b oder eigene 10b-Tranche)** verschieben |
| Top-Level-Slugs `/objektloesungen` und `/bildungseinrichtungen` werden versehentlich geändert | niedrig | Broken Links aus Footer + Persona | Routenwerte explizit in App.tsx prüfen, vorher/nachher diff |
| Footer-Pending-Links (`/objektloesungen`-Tranchen) versehentlich umbiegen | mittel | sichtbare Footer-Änderung | Footer in 10b–10d **nicht anfassen**, Linkkorrekturen sind separate Etappe |
| Persona-Verlinkungen auf Anwendungen ändern sich versehentlich | mittel | sichtbare Inhaltsänderung | Persona-Komponenten in 10b–10d **nicht anfassen** |
| Externe Bild-URLs ändern sich versehentlich | niedrig | Bilder weg | URLs sind reine Strings, bei Move nicht editieren |
| Rollback-Fähigkeit | – | – | Pro Etappe (10b/c/d) ein eigener Cleanup-Schritt (10b' / 10c' / 10d') analog zu 5c/6c/7c/9c |

---

## 12. Empfehlung für Etappe 10b

**Klare Empfehlung: KEIN Big-Bang. Splitting in drei Tranchen.**

### 10b – Kernstruktur, Hub, Übersichten und Referenzen

Scope:
- Komponente: `AnwendungDetailPage.tsx` → `features/anwendungen/components/`
- Daten: `data/referenzprojekte.ts` → `features/anwendungen/data/`
- Hub-/Übersichts-Pages:
  - `Anwendungen.tsx` (`/anwendungen`)
  - `Objektloesungen.tsx` (`/objektloesungen`)
  - `Bildungseinrichtungen.tsx` (`/bildungseinrichtungen`)
  - `Wohnbau.tsx`
  - `Gesundheitseinrichtungen.tsx`
  - `OeffentlicheHand.tsx`
  - `Referenzprojekte.tsx`
  - `ReferenzprojektDetail.tsx`
- Imports der 13 Detail-Pages auf neuen Pfad von `AnwendungDetailPage` aktualisieren (Pages bleiben in 10b an alter Stelle, ihre **Imports** ziehen sofort nach – sonst Build-Fehler).
- App.tsx-Imports der 8 verschobenen Pages aktualisieren.

Risiko: mittel (wegen `AnwendungDetailPage`-Pfad-Update in 13 Konsumenten).
Vorteil: Build bleibt nach 10b grün; danach ist der Hub-Bereich abgeschlossen.

### 10c – Cluster B, C, D (Detail-Pages, klare Anwendungssicht)

Scope:
- Wohnbau-Detail: `Einfamilienhaus`, `Mehrfamilienhaus`, `Grossanlage`, `Sanierung`
- Gesundheit-Detail: `Pflege`, `Klinik`
- Öffentliche Hand-Detail: `Behoerde`, `Feuerwehr`, `Schwimmbad`

Risiko: niedrig (alles `AnwendungDetailPage`-Wrapper, 9 Page-Moves + 9 App.tsx-Importpfade).

### 10d – Cluster E (Systemfunktionen, Grenzfälle)

Scope:
- `Concierge`, `InterneKommunikation`, `DigitaleNamensverwaltung`, `Feuerwehrdurchsage`, `BidirektionaleVideo`, `MobileTuerkommunikation`, `ZutrittskontrolleBCM`

Risiko: mittel (thematische Überschneidungen mit `gebaeudekommunikation`/`gebaeudemanagement`/`zutrittskontrolle`, vgl. §4) – aber **technisch** sind es weiterhin reine Wrapper. Kein inhaltliches Refactoring.

### Konstanten für 10b/10c/10d

- Keine Textänderung
- Keine Layoutänderung
- Keine Slug-Reform
- Keine Asset-Duplikate
- Keine Navigationsänderung
- Keine i18n-Textmigration
- Keine Redirects
- Keine Konsolidierung mit Domain-Pages
- Persona-/Footer-Linkkorrekturen separate Etappen

### Cleanup-Etappen analog zu 5c/6c/7c/9c

Nach jedem Block (10b, 10c, 10d) ein eigener Cleanup-Schritt empfohlen:
- 10b' – Cleanup Hub/Daten/`AnwendungDetailPage`
- 10c' – Cleanup Detail-Pages B/C/D
- 10d' – Cleanup Systemfunktionen + abschließender Architektur-Checkpoint

---

## 13. Prompting-Regeln für spätere Mitarbeit (anwendungen)

- Bei Änderungen immer Cluster (A/B/C/D/E/F) nennen.
- Anwendungssicht (Use-Case, Persona, Gebäudetyp) **niemals** mit Produktsicht zusammenführen.
- Externe Bild-URLs nicht ohne Auftrag durch lokale Assets ersetzen.
- Slugs nicht reformieren – auch nicht `/objektloesungen` und `/bildungseinrichtungen`.
- `referenzprojekte.ts`: neue Einträge unten anhängen, Slugs eindeutig.
- Footer- und Persona-Verlinkungen nur auf explizite Anweisung anfassen.
- Linkkorrekturen (Footer-Pending-Links auf `/objektloesungen`) sind **eigene Etappe**, nicht im Rahmen von 10b–10d.
