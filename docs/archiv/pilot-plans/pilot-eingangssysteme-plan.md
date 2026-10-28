# Pilot-Plan: Feature-Domain `eingangssysteme`

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


Status: Planung (Etappe 5a). Kein Produktivcode geändert.
Folge-Etappe: 5b (technische Migration).

Bezugsdokumente:
- [`docs/architecture.md`](../02-architecture/architecture.md)
- [`docs/migration-mapping.md`](../03-inventories/migration-mapping.md)
- [`docs/asset-strategy.md`](../01-strategy/asset-strategy.md)
- [`docs/pilot-zutrittskontrolle-plan.md`](./pilot-zutrittskontrolle-plan.md) (Vorbild)
- [`docs/migration-log.md`](../migration-log.md)

---

## 1. Ziel des Piloten

- Zweite echte Feature-Domain-Migration nach `zutrittskontrolle`.
- Keine Routenänderung. Alle `/entry-system`- und `/entry-system/...`-URLs bleiben byte-identisch.
- Keine Slug-Reform (Route bleibt englisch `/entry-system`, Domain-Ordnername deutsch `eingangssysteme` – bewusste Trennung URL ↔ Code).
- Keine Layoutänderung. Keine inhaltliche Änderung.
- Keine Textmigration in i18n. Keine Navigationskorrektur.
- Build muss nach Etappe 5b grün bleiben.
- Vorgehen soll als Muster für größere Domains (z. B. `gebaeudekommunikation`, `gebaeudemanagement`) dienen.

Bewusste Abweichungen vom Pilot `zutrittskontrolle`:
- 8 Seiten statt 5.
- Eine Top-Level-Page (`EntrySystem.tsx`) liegt unter `src/pages/`, sieben Sub-Pages unter `src/pages/entry/` – beide Quellordner werden in einen Zielordner zusammengeführt.

---

## 2. Betroffene Seiten

| Aktuelle Datei | Aktuelle Route | Zielpfad | Migrationsart | Risiko | Hinweise |
|---|---|---|---|---|---|
| `src/pages/EntrySystem.tsx` | `/entry-system` | `src/features/eingangssysteme/pages/EntrySystemPage.tsx` | Move + Rename (`Page`-Suffix) | niedrig | Nutzt lokales Asset `@/assets/hero-entry.jpg` (siehe Abschnitt 3). Top-Level-Übersicht, verweist auf alle 7 Sub-Routen. |
| `src/pages/entry/EntryDesign.tsx` | `/entry-system/design` | `src/features/eingangssysteme/pages/EntryDesignPage.tsx` | Move + Rename | niedrig | Nur externe Bild-URLs (jimcdn.com). |
| `src/pages/entry/EntryFunktionalitaet.tsx` | `/entry-system/funktionalitaet` | `src/features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx` | Move + Rename | niedrig | Nur externe Bild-URLs. |
| `src/pages/entry/EntryMaterial.tsx` | `/entry-system/material` | `src/features/eingangssysteme/pages/EntryMaterialPage.tsx` | Move + Rename | niedrig | Nur externe Bild-URLs. |
| `src/pages/entry/EntryIntegrationsformen.tsx` | `/entry-system/integrationsformen` | `src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx` | Move + Rename | niedrig | Nur externe Bild-URLs. |
| `src/pages/entry/EntryReferenzen.tsx` | `/entry-system/referenzen` | `src/features/eingangssysteme/pages/EntryReferenzenPage.tsx` | Move + Rename | niedrig | Nur externe Bild-URLs. |
| `src/pages/entry/EntryStandards.tsx` | `/entry-system/standards` | `src/features/eingangssysteme/pages/EntryStandardsPage.tsx` | Move + Rename | niedrig | Nur externe Bild-URLs. |
| `src/pages/entry/EntryBeratung.tsx` | `/entry-system/beratung` | `src/features/eingangssysteme/pages/EntryBeratungPage.tsx` | Move + Rename | niedrig | Nur externe Bild-URLs. |

Summe: **8 Seiten**. Alle existieren bereits, keine neuen Inhalte.

Hinweis zum Rename:
- `Page`-Suffix ist konsistent mit dem bereits abgeschlossenen Pilot `zutrittskontrolle` (`ZutrittskontrollePage.tsx`, `MobilerZutrittPage.tsx` usw.).
- Default-Export-Namen können entweder mitgeändert (`EntrySystemPage`) oder beibehalten (`EntrySystem`) werden. Empfehlung für 5b: **Default-Exporte mit umbenennen**, damit Component-Name und Dateiname übereinstimmen. App.tsx kann beim Import ohnehin frei umbenennen (`import EntrySystemPage from ...`).

---

## 3. Betroffene Assets

Analyse aller `@/assets/...`-Imports und externer Bild-URLs in den 8 Seiten:

| Aktuelle Asset-Datei | Importiert in | Zielpfad | Mehrfach genutzt außerhalb der Domain? | Risiko | Empfehlung |
|---|---|---|---|---|---|
| `src/assets/hero-entry.jpg` | `src/pages/EntrySystem.tsx` (`imgEntry`) | `src/features/eingangssysteme/assets/hero-entry.jpg` | unklar – Name `hero-entry` deutet auf domänenspezifisch, aber Verifikation per `grep` in 5b nötig | niedrig–mittel | Vor Move per Suche prüfen, ob andere Seiten `hero-entry.jpg` importieren. Falls ja: Asset bleibt in `src/assets/`. Falls nein: Move in `assets/` (kein Unterordner nötig, einziges lokales Asset). |

**Externe Bild-URLs (jimcdn.com):**
Alle 8 Seiten beziehen ihre Inhaltsbilder ausschließlich über externe Hotlinks zur bisherigen Jimdo-CMS-Instanz (`https://image.jimcdn.com/...`).

| Seite | Anzahl externer Bild-URLs |
|---|---|
| `EntrySystem.tsx` | 7 (Discover-Cards) |
| `EntryDesign.tsx` | 1 hero + 2 Inhalt = 3 |
| `EntryFunktionalitaet.tsx` | 1 hero + 7 Inhalt = 8 |
| `EntryMaterial.tsx` | 1 hero + 6 Inhalt = 7 |
| `EntryIntegrationsformen.tsx` | 1 hero + 4 Inhalt = 5 |
| `EntryReferenzen.tsx` | 1 hero + 6 Inhalt = 7 |
| `EntryStandards.tsx` | 1 hero + 3 Inhalt = 4 |
| `EntryBeratung.tsx` | 1 hero = 1 |
| **Summe** | **42 externe URLs** |

**Empfehlung 5b:** Externe URLs **nicht ersetzen**. Sie sind Teil des Inhalts, nicht der Code-Struktur. Eine spätere separate Etappe „Asset-Lokalisierung Eingangssysteme" kann die externen Bilder ggf. als lokale Assets unter `src/features/eingangssysteme/assets/{design|material|...}/` ablegen. **Kein Bestandteil von 5b.**

**Vorgesehene Unterordner-Struktur (für spätere Asset-Lokalisierung, nicht 5b):**
- `src/features/eingangssysteme/assets/` (für `hero-entry.jpg`)
- `src/features/eingangssysteme/assets/design/` (zukünftig)
- `src/features/eingangssysteme/assets/funktionalitaet/` (zukünftig)
- `src/features/eingangssysteme/assets/material/` (zukünftig)
- `src/features/eingangssysteme/assets/integrationsformen/` (zukünftig)
- `src/features/eingangssysteme/assets/referenzen/` (zukünftig)
- `src/features/eingangssysteme/assets/standards/` (zukünftig)
- `src/features/eingangssysteme/assets/shared/` (zukünftig, nur falls querverwendet)

In 5b: nur `hero-entry.jpg` move-relevant, **keine** Unterordner anlegen.

---

## 4. Betroffene Komponenten

Analyse aller Komponenten-Imports der 8 Seiten:

| Komponente | Aktueller Pfad | Nutzung | Zielentscheidung | Risiko |
|---|---|---|---|---|
| `PageLayout` | `@/components/PageLayout` | Alle 8 Seiten | **Bleibt vorerst in `src/components/`** | keins – generisch, projektweit verwendet |
| `ContentSection` (named export aus PageLayout) | `@/components/PageLayout` | Nur `EntrySystem.tsx` (importiert, aber nicht aktiv im JSX verwendet – unbenutzter Import) | **Bleibt in `src/components/`** | niedrig – ggf. in 5b/Cleanup ungenutzten Import entfernen |
| `Link` | `react-router-dom` | Alle 8 Seiten | extern, irrelevant | keins |
| `motion` | `framer-motion` | Alle 8 Seiten | extern, irrelevant | keins |

**Keine domänenspezifischen Komponenten.** Alle Inhalte sind direkt in den Page-Files implementiert (Inline-Arrays + JSX). Keine Verschiebung nach `features/eingangssysteme/components/` in 5b geplant.

Generische Komponenten werden in 5b **nicht** verschoben (Konsistenz mit Pilot `zutrittskontrolle`).

---

## 5. App.tsx / Routing

**Anzupassende Importpfade** (Zeilen 25–32 in `src/App.tsx`):

| Aktuell | Neu |
|---|---|
| `import EntrySystem from "./pages/EntrySystem.tsx";` | `import EntrySystemPage from "./features/eingangssysteme/pages/EntrySystemPage.tsx";` |
| `import EntryDesign from "./pages/entry/EntryDesign.tsx";` | `import EntryDesignPage from "./features/eingangssysteme/pages/EntryDesignPage.tsx";` |
| `import EntryFunktionalitaet from "./pages/entry/EntryFunktionalitaet.tsx";` | `import EntryFunktionalitaetPage from "./features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx";` |
| `import EntryMaterial from "./pages/entry/EntryMaterial.tsx";` | `import EntryMaterialPage from "./features/eingangssysteme/pages/EntryMaterialPage.tsx";` |
| `import EntryIntegrationsformen from "./pages/entry/EntryIntegrationsformen.tsx";` | `import EntryIntegrationsformenPage from "./features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx";` |
| `import EntryReferenzen from "./pages/entry/EntryReferenzen.tsx";` | `import EntryReferenzenPage from "./features/eingangssysteme/pages/EntryReferenzenPage.tsx";` |
| `import EntryStandards from "./pages/entry/EntryStandards.tsx";` | `import EntryStandardsPage from "./features/eingangssysteme/pages/EntryStandardsPage.tsx";` |
| `import EntryBeratung from "./pages/entry/EntryBeratung.tsx";` | `import EntryBeratungPage from "./features/eingangssysteme/pages/EntryBeratungPage.tsx";` |

**Route-Werte unverändert** (Zeilen 105–112 in `src/App.tsx`):
- `/entry-system`
- `/entry-system/design`
- `/entry-system/funktionalitaet`
- `/entry-system/material`
- `/entry-system/integrationsformen`
- `/entry-system/referenzen`
- `/entry-system/standards`
- `/entry-system/beratung`

Im JSX nur die Komponenten-Referenzen `<EntrySystem />` → `<EntrySystemPage />` etc. anpassen.

- Keine `/de`-/`/en`-Routen.
- Keine Slug-Änderung.
- Keine Redirects.
- Kein `react-router`-Konfigurationswechsel.

---

## 6. Navigation-Bezug

- `mainNavigation.ts` enthält den Bereich „Eingangssysteme" bereits als Datenstruktur (Etappe 4c).
- Mehrere Kinder sind aktuell `pending` und zeigen noch auf `/entry-system` (statt auf zukünftige eigene Sub-Routen wie `/eingangssysteme/...`). Siehe `docs/navigation-inventory.md`.
- **In 5b werden diese Links NICHT korrigiert.** Die Navigation bleibt byte-identisch.
- Eine spätere Aktivierung der Sub-Routen (eigene Routes statt `/entry-system`-Fallback) erfolgt **separat** nach Content- und Navigationsfreigabe in einer eigenen Etappe (z. B. 6a „Navigation-Linkkorrektur").
- `mainNavigation.ts`, `footerNavigation.ts`, `personaNavigation.ts`, `metaNavigation.ts` werden in 5b **nicht angefasst**.

---

## 7. i18n-Bezug

- Navigation-i18n ist seit Etappe 4i/4j aktiv (Namespace `navigation`, DE/EN je 106 Keys).
- **Seitentexte der Domain `eingangssysteme` werden in 5b nicht migriert.** Alle deutschen Texte bleiben hartcodiert in den Page-Files (so wie aktuell auch in `zutrittskontrolle`).
- Optional kann später ein eigener Namespace `eingangssysteme` (oder ein gemeinsames `pages`-Schema) vorbereitet werden – als separate Etappe.
- Ziel: Strukturmigration zuerst (5b), Textmigration später kontrolliert pro Domain.

---

## 8. Risiken und Schutzmaßnahmen

| Risiko | Eintrittswahrscheinlichkeit | Schutzmaßnahme |
|---|---|---|
| Kaputte Imports nach Move (TS2307) | mittel | Nach Move sofort `npm run build`. Alle Pfadänderungen nur in `App.tsx`, keine anderen Caller bekannt. |
| Mehrfach genutztes Asset `hero-entry.jpg` wird zerstört | niedrig | Vor Move per `grep -r "hero-entry" src/` prüfen. Bei Mehrfachnutzung: Asset in `src/assets/` belassen. |
| Verwechslung Domain-Name `eingangssysteme` (deutsch) vs. Route `/entry-system` (englisch) | mittel | Klare Doku im Plan, Routen-Tabelle in 5b im Migration-Log wiederholen. Code-Reviewer prüft, dass keine Route geändert wurde. |
| Versehentliche Linkkorrektur in Navigation (z. B. `pending`-Status entfernt) | niedrig | 5b fasst `src/navigation/*` nicht an. Nur `App.tsx` + `src/pages/...` + `src/features/eingangssysteme/...`. |
| Layoutänderungen durch versehentliches Refactoring beim Move | niedrig | Reine Datei-Verschiebung mit Pfad-Adjustment, kein inhaltliches Refactoring. Diff vor Commit prüfen. |
| Build-Fehler durch ungenutzten `ContentSection`-Import in `EntrySystem.tsx` | niedrig | Build ist bereits aktuell grün mit diesem Import. Änderungen daran optional in eigener Cleanup-Etappe (analog 3c). |
| Externe Bild-URLs brechen (jimcdn.com) | niedrig (nicht durch Move beeinflussbar) | Außerhalb des Migrations-Scopes. Separate Etappe „Asset-Lokalisierung". |
| Rollback nicht möglich | sehr niedrig | Reine git-Diff-Migration. `git revert` einer einzelnen Etappe stellt den Vorzustand her. |

---

## 9. Empfohlener Umsetzungsumfang Etappe 5b

**Im Scope:**
- 8 Page-Dateien nach `src/features/eingangssysteme/pages/` verschieben und mit `Page`-Suffix umbenennen.
- Asset `src/assets/hero-entry.jpg` → `src/features/eingangssysteme/assets/hero-entry.jpg` verschieben **nur wenn** Verifikation zeigt, dass es keine externen Caller gibt. Andernfalls Asset belassen.
- Asset-Import in `EntrySystemPage.tsx` entsprechend anpassen (`@/features/eingangssysteme/assets/hero-entry.jpg` oder Beibehaltung von `@/assets/hero-entry.jpg`).
- `src/App.tsx`: 8 Importpfade + 8 JSX-Komponenten-Referenzen anpassen.
- `docs/migration-log.md`: Etappe 5b dokumentieren.

**Nicht im Scope (für 5b):**
- Routen ändern.
- Slug-Reform (`/entry-system` → `/eingangssysteme`).
- Navigationsdatenstrukturen anfassen (`mainNavigation.ts` etc.).
- `pending`-Links aktivieren oder korrigieren.
- Inhaltliche Texte ändern.
- i18n-Textmigration.
- Komponenten konsolidieren (`PageLayout`, `ContentSection`).
- Externe Bild-URLs durch lokale Assets ersetzen.
- Default-Export-Refactoring jenseits des Renames.
- Cleanup ungenutzter Imports (separate Etappe analog 3c, z. B. 5c).

**Geschätzter Diff-Umfang 5b:**
- 8 Datei-Renames/-Moves (Page-Files).
- Ggf. 1 Datei-Move (`hero-entry.jpg`).
- 1 Datei mit Mehrfach-Edits (`src/App.tsx`: 16 Stellen).
- 1 Datei-Edit für Asset-Pfad (`EntrySystemPage.tsx`, falls Asset verschoben wird).
- 1 Datei-Edit für Doku (`docs/migration-log.md`).

---

## Anhang: Verifikations-Checkliste für Etappe 5b

Nach Umsetzung muss gelten:
- [ ] `npm run build` exit 0.
- [ ] Alle 8 Routen rendern unverändert (manueller Sichttest).
- [ ] `src/pages/EntrySystem.tsx` existiert nicht mehr.
- [ ] `src/pages/entry/` ist leer oder gelöscht.
- [ ] Keine Datei in `src/` referenziert noch `./pages/EntrySystem` oder `./pages/entry/...`.
- [ ] `mainNavigation.ts`, `footerNavigation.ts`, `personaNavigation.ts`, `metaNavigation.ts` byte-identisch.
- [ ] `src/i18n/locales/**` byte-identisch.
- [ ] Sichtbarer Footer, MainNavigation, MetaNavigation unverändert.
