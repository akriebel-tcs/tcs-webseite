# Pilot-Plan: Feature-Domain `gebaeudemanagement`

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


Dritte Domain-Migration nach `zutrittskontrolle` (Etappe 3) und `eingangssysteme` (Etappe 5).
**Reine Planung – kein Code wird in dieser Etappe (6a) verändert.**

Grundlage: [`docs/architecture.md`](../02-architecture/architecture.md), [`docs/migration-mapping.md`](../03-inventories/migration-mapping.md), [`docs/asset-strategy.md`](../01-strategy/asset-strategy.md), [`docs/architecture-checkpoint-5d.md`](../05-checkpoints/architecture-checkpoint-5d.md), [`docs/pilot-eingangssysteme-plan.md`](./pilot-eingangssysteme-plan.md).

---

## 1. Ziel des Piloten

- Dritte echte Feature-Domain-Migration nach `zutrittskontrolle` und `eingangssysteme`.
- Keine Routenänderung (alle bestehenden URLs bleiben byte-identisch).
- Keine Slug-Reform.
- Keine Layoutänderung.
- Keine inhaltliche Änderung (keine Textmigration, keine i18n-Übersetzung, keine Linkkorrektur).
- Build muss nach späterer Umsetzung (6b) grün bleiben.
- Vorgehen dient als wiederholbares Muster für die nachfolgenden Domain-Migrationen (`gebaeudekommunikation`, `service`, `wissen`, `anwendungen`).

---

## 2. Betroffene Seiten

Analyse der Pages, die zur Domain `gebaeudemanagement` gehören oder gehören könnten.
Quelle: `src/App.tsx` (Routen) und `src/pages/`.

| # | Aktuelle Datei | Aktuelle Route | Zielpfad | Ziel-Domain | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|---|
| 1 | `src/pages/Gebaeudemanagement.tsx` | `/gebaeudemanagement` | `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx` | `gebaeudemanagement` | move + rename | niedrig | Übersichtsseite, nutzt nur `PageLayout` + `FeatureBlock` + `ContentSection`. |
| 2 | `src/pages/SchraenkeBelhaelter.tsx` | `/gebaeudemanagement/schraenke-behaelter` | `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx` | `gebaeudemanagement` | move + rename | niedrig | Dateiname enthält Tippfehler `Belhaelter`; Zielname korrigiert auf `SchraenkeBehaelterPage` (passend zur Route `schraenke-behaelter`). Nur Dateiname, kein Slug. |
| 3 | `src/pages/DigitaleNamensanzeige.tsx` | `/gebaeudemanagement/digitale-namensanzeige` | `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx` | `gebaeudemanagement` | move + rename | niedrig | Route eindeutig unter `/gebaeudemanagement/`, deshalb klare Zuordnung trotz inhaltlicher Nähe zu Signage. |
| 4 | `src/pages/ReservierenBuchen.tsx` | `/gebaeudemanagement/reservieren-buchen` | `src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx` | `gebaeudemanagement` | move + rename | niedrig | Statische Marketingseite. Spätere Externe-Tool-Integration ändert die strukturelle Zuordnung nicht. |
| 5 | `src/pages/DigitalSignage.tsx` | `/gebaeudemanagement/digital-signage` | `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx` | `gebaeudemanagement` (Grenzfall) | move + rename | mittel | **Grenzfall** – siehe Abschnitt 2.1. |

### 2.1 Grenzfall-Bewertungen

#### `DigitalSignage.tsx` – `gebaeudemanagement` oder `signage`?

- **Aktuelle Route:** `/gebaeudemanagement/digital-signage` (App.tsx Zeile 114).
- **Existiert daneben:** `/signage` → `src/pages/Signage.tsx` (eigene Übersichtsseite).
- **Inhaltlicher Bezug:** BCM-Infoboard, integriert in das BCM-Zutrittskontrollsystem. Header-Label im PageLayout: „Gebäudemanagement".
- **Empfehlung:** Folge der Route. Verschieben nach `gebaeudemanagement`. Eine inhaltliche Re-Kategorisierung nach `signage` würde eine Slug-Reform implizieren – ist explizit ausgeschlossen.
- **Konsequenz für `signage`:** `Signage.tsx` und `Beschilderung.tsx` werden in einer späteren, eigenen Etappe als Domain `signage` betrachtet.

#### `DigitaleNamensanzeige.tsx` – `gebaeudemanagement` oder `signage`?

- **Aktuelle Route:** `/gebaeudemanagement/digitale-namensanzeige`.
- **Inhaltlicher Bezug:** Digitale Namensschilder an Außenstationen, Briefkästen, Klingeltableaus – BCM-System.
- **Empfehlung:** Folge der Route. Klar `gebaeudemanagement`.

#### `ReservierenBuchen.tsx` – statische Marketingseite oder externes Tool?

- **Aktueller Stand:** Statische Marketingseite.
- **Architektur-Doku** sieht potenzielles externes Tool vor (vgl. `docs/architecture.md`, „externe Tools bleiben außerhalb").
- **Empfehlung:** Aktuell statische Seite verschieben. Sollte später ein externes Tool eingebunden werden, geschieht das innerhalb derselben Domain (`features/gebaeudemanagement/external/` o. Ä.). Migration jetzt blockiert nichts.

#### Nicht betroffen / nicht zur Domain gehörend

| Datei | Begründung |
|---|---|
| `src/pages/Signage.tsx` (`/signage`) | Eigene Domain-Kandidatin (`signage`). Nicht in `/gebaeudemanagement/`-Pfad. |
| `src/pages/Beschilderung.tsx` (`/beschilderung`) | Gehört zu `signage`/Produkten, nicht zu `gebaeudemanagement`. |
| `src/pages/Briefkastenanlagen.tsx` (`/briefkastenanlagen`) | Gehört zu Produkten/`tuerkommunikation`, eigene Top-Level-Route. |
| `src/pages/anwendungen/DigitaleNamensverwaltung.tsx` | Gehört zur Domain `anwendungen`. |
| `src/pages/anwendungen/ZutrittskontrolleBCM.tsx` | Gehört zur Domain `anwendungen`. |

**Insgesamt zu migrierende Pages: 5** (4 eindeutig + 1 Grenzfall mit Empfehlung „verschieben, weil Route es definiert").

---

## 3. Betroffene Assets

Lokale Bild-Imports der 5 Pages. Quelle: grep nach den jeweiligen Asset-Dateinamen über `src/**/*.{ts,tsx}`.

| # | Aktuelle Asset-Datei | Importiert in | Empfohlener Zielpfad | Außerhalb der Domain genutzt? | Risiko | Empfehlung |
|---|---|---|---|---|---|---|
| 1 | `src/assets/block-gebaeudemanagement.jpg` | `Gebaeudemanagement.tsx` | `src/features/gebaeudemanagement/assets/block-gebaeudemanagement.jpg` | nein (1 Treffer) | niedrig | verschieben |
| 2 | `src/assets/bcm-schraenke-hero.jpg` | `SchraenkeBelhaelter.tsx` | `src/features/gebaeudemanagement/assets/schraenke/bcm-schraenke-hero.jpg` | nein | niedrig | verschieben |
| 3 | `src/assets/bcm-schrankschloss-produkt.jpg` | `SchraenkeBelhaelter.tsx` | `src/features/gebaeudemanagement/assets/schraenke/bcm-schrankschloss-produkt.jpg` | nein | niedrig | verschieben |
| 4 | `src/assets/bcm-serverschloss-produkt.jpg` | `SchraenkeBelhaelter.tsx` | `src/features/gebaeudemanagement/assets/schraenke/bcm-serverschloss-produkt.jpg` | nein | niedrig | verschieben |
| 5 | `src/assets/bcm-namensanzeige-hero.jpg` | `DigitaleNamensanzeige.tsx` | `src/features/gebaeudemanagement/assets/namensanzeige/bcm-namensanzeige-hero.jpg` | nein | niedrig | verschieben |
| 6 | `src/assets/bcm-aussenstation-adx5.jpg` | `DigitaleNamensanzeige.tsx` | `src/features/gebaeudemanagement/assets/namensanzeige/bcm-aussenstation-adx5.jpg` | nein | niedrig | verschieben |
| 7 | `src/assets/bcm-displaymodul.jpg` | `DigitaleNamensanzeige.tsx` | `src/features/gebaeudemanagement/assets/namensanzeige/bcm-displaymodul.jpg` | nein | niedrig | verschieben |
| 8 | `src/assets/bcm-briefkasten-digital.jpg` | `DigitaleNamensanzeige.tsx` | `src/features/gebaeudemanagement/assets/namensanzeige/bcm-briefkasten-digital.jpg` | nein | niedrig | verschieben |
| 9 | `src/assets/bcm-verwaltungssoftware.jpg` | `DigitaleNamensanzeige.tsx` | `src/features/gebaeudemanagement/assets/namensanzeige/bcm-verwaltungssoftware.jpg` | nein | niedrig | verschieben |
| 10 | `src/assets/bcm-etagentaster.jpg` | `DigitaleNamensanzeige.tsx` | `src/features/gebaeudemanagement/assets/namensanzeige/bcm-etagentaster.jpg` | nein | niedrig | verschieben |
| 11 | `src/assets/bcm-buchungssystem-produkt.jpg` | `ReservierenBuchen.tsx` (Hero) | `src/features/gebaeudemanagement/assets/reservieren-buchen/bcm-buchungssystem-produkt.jpg` | nein | niedrig | verschieben |
| 12 | `src/assets/hero-buchungssystem.jpg` | `ReservierenBuchen.tsx` (Produktcard) | `src/features/gebaeudemanagement/assets/reservieren-buchen/hero-buchungssystem.jpg` | nein | niedrig | verschieben |
| 13 | `src/assets/hero-infoboard.jpg` | `DigitalSignage.tsx` | `src/features/gebaeudemanagement/assets/digital-signage/hero-infoboard.jpg` | nein | niedrig | verschieben (siehe Grenzfall 2.1) |

**Insgesamt 13 lokale Assets, alle exklusiv per grep verifiziert.**

### Vorgeschlagene Unterordner-Struktur

```
src/features/gebaeudemanagement/assets/
├── block-gebaeudemanagement.jpg          (Übersichtsseite)
├── schraenke/                            (3 Dateien)
├── namensanzeige/                        (6 Dateien)
├── reservieren-buchen/                   (2 Dateien)
└── digital-signage/                      (1 Datei)
```

Begründung: Folgt dem Muster aus `eingangssysteme` und `zutrittskontrolle`, gruppiert pro Sub-Page. Kein `shared/`-Ordner notwendig (keine domainübergreifenden Mehrfachnutzungen).

---

## 4. Betroffene Komponenten

| Komponente | Aktueller Pfad | Nutzung | Zielentscheidung | Risiko |
|---|---|---|---|---|
| `PageLayout` | `src/components/PageLayout.tsx` | alle 5 Pages | bleibt vorerst in `src/components` | – |
| `ContentSection` | `src/components/PageLayout.tsx` (Re-Export) | 4 von 5 Pages (alle außer `Gebaeudemanagement.tsx`) | bleibt vorerst in `src/components` | – |
| `FeatureBlock` | `src/components/PageLayout.tsx` (Re-Export) | nur `Gebaeudemanagement.tsx` | bleibt vorerst in `src/components` | – |
| `motion` (framer-motion) | externes Package | 3 Pages (Schränke, Namensanzeige, Reservieren) | bleibt extern | – |
| Lucide-Icons | externes Package | alle 5 Pages | bleibt extern | – |

**Keine domain-spezifischen Komponenten vorhanden.** Anders als `WoWiHero`/`WoWiDetailSections` in der Persona-Domain Wohnungswirtschaft gibt es in `gebaeudemanagement` keine eigenen Komponenten unter `src/components/`. Der Ordner `src/features/gebaeudemanagement/components/` muss in 6b nicht angelegt werden.

Generische Komponenten wie `PageLayout`, `ContentSection`, `FeatureBlock` bleiben in dieser Migrationsphase bewusst in `src/components/`. Eine spätere Verschiebung nach `src/shared/components/` ist eine separate Etappe.

---

## 5. App.tsx / Routing

### Diff-Erwartung für 6b

Importpfade ändern – Routen-Werte bleiben byte-identisch.

| Aktueller Import | Geplanter Import |
|---|---|
| `import Gebaeudemanagement from "./pages/Gebaeudemanagement.tsx";` | `import Gebaeudemanagement from "./features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx";` |
| `import SchraenkeBelhaelter from "./pages/SchraenkeBelhaelter.tsx";` | `import SchraenkeBehaelter from "./features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx";` |
| `import DigitaleNamensanzeige from "./pages/DigitaleNamensanzeige.tsx";` | `import DigitaleNamensanzeige from "./features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx";` |
| `import ReservierenBuchen from "./pages/ReservierenBuchen.tsx";` | `import ReservierenBuchen from "./features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx";` |
| `import DigitalSignage from "./pages/DigitalSignage.tsx";` | `import DigitalSignage from "./features/gebaeudemanagement/pages/DigitalSignagePage.tsx";` |

Hinweis zur lokalen Variable `SchraenkeBelhaelter`: Es spricht nichts dagegen, gleichzeitig mit dem Datei-Rename auch die JSX-Variable auf `SchraenkeBehaelter` zu korrigieren. Die JSX-Referenz in der Route bleibt funktional identisch.

### Unverändert bleibt

- alle 5 Route-Pfade (`/gebaeudemanagement`, `/gebaeudemanagement/schraenke-behaelter`, `/gebaeudemanagement/digitale-namensanzeige`, `/gebaeudemanagement/reservieren-buchen`, `/gebaeudemanagement/digital-signage`)
- die Reihenfolge der Routes
- keine `/de`-/`/en`-Routen
- keine Redirects
- keine Slug-Änderung

---

## 6. Navigation-Bezug

- `src/navigation/mainNavigation.ts` enthält `gebaeudemanagement` bereits als Top-Level-Item mit Kindern – Datenstruktur ist seit Etappe 4c stabil.
- Einige Footer-/Navigations-Einträge sind Grenzfälle (z. B. „Digital Signage" könnte sowohl unter `gebaeudemanagement` als auch unter `signage` rangieren). **In dieser Etappe und in 6b werden keine Links geändert.**
- `src/navigation/footerNavigation.ts`, `src/navigation/personaNavigation.ts`, `src/navigation/metaNavigation.ts` werden nicht angefasst.
- Platzhalterlinks bleiben erhalten.
- Keine Linkaktivierung, keine Reihenfolge-Änderung, keine Label-Korrektur.

---

## 7. i18n-Bezug

- Navigation-i18n (Namespace `navigation`) ist seit Etappe 4i aktiv (DE/EN).
- Die Seitentexte der 5 Domain-Pages bleiben in 6b unverändert auf Deutsch hartkodiert.
- **Keine Volltextmigration im Move.** Eine spätere Etappe kann optional einen Namespace `gebaeudemanagement` vorbereiten.
- Ziel: Struktur zuerst, Textmigration später kontrolliert pro Domain.
- `src/i18n/locales/de/*.json` und `src/i18n/locales/en/*.json` werden in 6b nicht verändert.

---

## 8. Risiken und Schutzmaßnahmen

| Risiko | Wahrscheinlichkeit | Schutzmaßnahme |
|---|---|---|
| Kaputte Imports nach Move | mittel | Nach Move: `npm run build`. Bei Fehler: Rollback per git. |
| Mehrfach genutzte Assets übersehen | niedrig | Bereits per grep verifiziert (alle 13 Assets exklusiv). Vor Move in 6b nochmal grep zur Sicherheit. |
| Verwechslung `gebaeudemanagement` ↔ `signage` (Grenzfall `DigitalSignage.tsx`) | mittel | Klares Prinzip: „Folge der Route". Aktuelle Route definiert die Domain. |
| `ReservierenBuchen` als späteres externes Tool | niedrig | Verschieben als statische Seite blockiert keinen späteren externen-Tool-Workflow. |
| Versehentliche Linkkorrektur in Navigation | niedrig | Constraint: keine Änderungen an `src/navigation/*` und `src/components/MainNavigation.tsx`/`Footer.tsx`/`MetaNavigation.tsx` in 6b. |
| Layoutänderung durch Refactor-Versuchung | mittel | Constraint: nur move + import-rewrite. Kein Refactor an Komponenten oder Sektionen. |
| Build-Fehler durch falsche Asset-Pfade | mittel | Asset-Imports zeitgleich mit Move umstellen, dann sofort `npm run build`. |
| Tippfehler-Datei `SchraenkeBelhaelter` führt zu inkonsistenten Variablennamen | niedrig | Im Move auf `SchraenkeBehaelterPage.tsx` korrigieren – passt zur Route. JSX-Variable ebenfalls anpassen. Kein Slug. |

### Rollback-Möglichkeit

- Migration umfasst nur Datei-Moves, Asset-Moves und Importpfad-Änderungen.
- Ein Rollback ist durch git-Restore aller verschobenen Dateien und der `App.tsx`-Importzeilen möglich.
- Keine Datenbankänderung, keine Schema-Migration, keine Dependency-Änderung.

---

## 9. Empfohlener Umsetzungsumfang für Etappe 6b

**In Scope (6b):**

1. Anlegen der Ordner:
   - `src/features/gebaeudemanagement/pages/`
   - `src/features/gebaeudemanagement/assets/`
   - Asset-Unterordner (`schraenke/`, `namensanzeige/`, `reservieren-buchen/`, `digital-signage/`)
2. Verschieben + Umbenennen der 5 Pages (siehe Tabelle in Abschnitt 2).
3. Verschieben der 13 lokalen Assets (siehe Tabelle in Abschnitt 3).
4. Anpassen der Asset-Imports in den 5 Pages auf `@/features/gebaeudemanagement/assets/...`.
5. Anpassen der 5 Page-Imports und JSX-Referenzen in `src/App.tsx`.
6. Korrektur Datei-/Variablenname `SchraenkeBelhaelter` → `SchraenkeBehaelter` (kein Slug).
7. Löschen der alten Page-Dateien aus `src/pages/`.
8. Löschen der alten Asset-Dateien aus `src/assets/`.
9. `npm run build` ausführen, Erfolg verifizieren.
10. `docs/migration-log.md` aktualisieren (Etappe 6b).

**Out of Scope (6b):**

- Keine Texte ändern.
- Keine Layouts ändern.
- Keine Navigation ändern.
- Keine Linkkorrektur in Footer/MainNavigation/MetaNavigation.
- Keine Linkaktivierung.
- Keine Komponenten konsolidieren oder verschieben (`PageLayout` etc. bleiben in `src/components/`).
- Keine i18n-Textmigration.
- Keine `/de`-/`/en`-Routen.
- Keine Slug-Änderung an Routen.
- Keine Redirects.
- Keine neuen Dependencies.
- Keine anderen Domains anfassen.

**Bedingte Empfehlung:**

- Wenn Unsicherheit besteht, ob `DigitalSignage.tsx` zu `gebaeudemanagement` oder `signage` gehört: in 6b zunächst nicht verschieben. Die anderen 4 Pages sind eindeutig. Eine spätere Etappe kann den Grenzfall isoliert behandeln. Empfehlung dieses Plans bleibt jedoch: **verschieben** (folgt der Route).

---

## Zusammenfassung

- **5 Pages** zur Migration, **4 eindeutig** + **1 Grenzfall** (`DigitalSignage.tsx`) mit klarer Empfehlung.
- **13 lokale Assets**, alle exklusiv genutzt – keine domainübergreifenden Konflikte.
- **0 domain-spezifische Komponenten** – nur generische `PageLayout`/`ContentSection`/`FeatureBlock`, die in `src/components/` bleiben.
- **5 Importpfade** in `src/App.tsx` anzupassen, alle 5 Routenpfade bleiben byte-identisch.
- **Risikoprofil**: niedrig bis mittel, vergleichbar mit der bereits erfolgreich abgeschlossenen `eingangssysteme`-Migration.
- **Domain-Eignung**: `gebaeudemanagement` ist als nächste Migrationsdomain gut geeignet – kleiner Umfang, klare Routen, keine externen Tool-Abhängigkeiten, keine Persona-Verschränkung.
