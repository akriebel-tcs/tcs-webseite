# Pilot-Plan: Feature-Domain `gebaeudekommunikation`

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


Vierte Domain-Migration nach `zutrittskontrolle` (Etappe 3), `eingangssysteme` (Etappe 5) und `gebaeudemanagement` (Etappe 6).
**Reine Planung – kein Code wird in dieser Etappe (7a) verändert.**

Grundlage: [`docs/architecture.md`](../02-architecture/architecture.md), [`docs/migration-mapping.md`](../03-inventories/migration-mapping.md), [`docs/asset-strategy.md`](../01-strategy/asset-strategy.md), [`docs/architecture-checkpoint-5d.md`](../05-checkpoints/architecture-checkpoint-5d.md), [`docs/pilot-gebaeudemanagement-plan.md`](./pilot-gebaeudemanagement-plan.md).

---

## 1. Ziel des Piloten

- Größere Feature-Domain-Migration nach drei kleineren Pilotdomains.
- Keine Routenänderung (alle bestehenden URLs bleiben byte-identisch).
- Keine Slug-Reform.
- Keine Layoutänderung.
- Keine inhaltliche Änderung (keine Textmigration, keine i18n-Übersetzung, keine Linkkorrektur).
- Build muss nach späterer Umsetzung (7b) grün bleiben.
- **Besondere Vorsicht** wegen Grenzbereichen Signage/Beschilderung, Großanlagen vs. Anwendungen/Großanlage, sowie shared-Assets über mehrere Personas.
- Erste Migration mit **shared-Assets** (`block-kommunikation.jpg`, `block-signage.jpg`) – muss explizit ausgeklammert werden.

---

## 2. Betroffene Seiten – eindeutig zugehörig

Quelle: `src/App.tsx` (Routen) und `src/pages/`.

| # | Aktuelle Datei | Aktuelle Route | Zielpfad | Ziel-Domain | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|---|
| 1 | `src/pages/Tuerkommunikation.tsx` | `/tuerkommunikation` | `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx` | `gebaeudekommunikation` | move + rename | mittel | Übersichtsseite mit 6 Asset-Imports, davon mehrere shared (siehe Abschnitt 4). |
| 2 | `src/pages/Tuersprechanlagen.tsx` | `/tuersprechanlagen` | `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` | `gebaeudekommunikation` | move + rename | niedrig | 8 Produkt-Bilder, alle TK-präfixiert und domain-exklusiv. |
| 3 | `src/pages/Briefkastenanlagen.tsx` | `/briefkastenanlagen` | `src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx` | `gebaeudekommunikation` | move + rename | niedrig | 4 Briefkasten-Assets, alle Präfix `briefkasten-*`. |
| 4 | `src/pages/Grossanlagen.tsx` | `/grossanlagen` | `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx` | `gebaeudekommunikation` | move + rename | mittel | 5 Assets `grossanlage-*`. **Achtung Verwechslung** mit `src/pages/anwendungen/Grossanlage.tsx` (Singular!) – siehe Grenzfälle. |
| 5 | `src/pages/Systemloesungen.tsx` | `/systemloesungen` | `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx` | `gebaeudekommunikation` | move + rename | niedrig | 4 Assets `systemloesungen-*`. |
| 6 | `src/pages/systemtechnik/SnipdooIp.tsx` | `/systemtechnik/snipdoo-ip` | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | `gebaeudekommunikation` | move + rename | mittel | Liegt aktuell in Unterordner `src/pages/systemtechnik/`. Nutzt zusätzlich Komponenten `SubNavSticky` und `RoleTabsBlock`. 6 webp-Assets unter `src/assets/snipdoo/`. |

**Insgesamt zu migrierende Pages: 6.**

---

## 3. Grenzfälle

### 3.1 `Beschilderung.tsx` – Gebäudekommunikation oder eigene Domain `signage`?

- **Aktuelle Route:** `/beschilderung`.
- **Aktuelle Navigation:** in `mainNavigation.ts` als Kind von `gebaeudekommunikation` gelistet.
- **Inhalt:** Hausnummern, Türschilder, Türklingeln, Materialien – physische Beschilderung am Eingang.
- **Asset-Präfix:** `signage-*` (5 Dateien).
- **Bewertung:**
  - Pro `gebaeudekommunikation`: aktuelle Navigations-Zuordnung, fachliche Nähe zu Türkommunikation/Briefkasten am Hauseingang.
  - Pro eigene Domain `signage`: gemeinsamer Asset-Präfix mit `Signage.tsx`, eigenständiger thematischer Bereich.
- **Empfehlung:** **Nicht in 7b aufnehmen.** Beschilderung in Etappe 7b auslassen, separat in einer eigenen späteren Etappe entscheiden (zusammen mit `Signage.tsx`). Begründung: Beide Pages teilen sich vermutlich Assets mit gleichem Präfix – eine voreilige Trennung würde Asset-Refactor erzwingen, was Constraints widerspricht.

### 3.2 `Signage.tsx` – eigene Domain `signage` oder Teil von Gebäudekommunikation?

- **Aktuelle Route:** `/signage`.
- **Inhalt:** Übersicht „Signage" (BCM-Welt), nutzt nur `block-signage.jpg` (shared).
- **Bewertung:** Inhaltlich eigenständige Domain-Kandidatin. Gleichzeitig mit `Beschilderung.tsx` zu betrachten.
- **Empfehlung:** **Nicht in 7b aufnehmen.** Spätere eigene Etappe `signage` empfohlen.

### 3.3 `DigitalSignage.tsx`

- **Status:** **Bereits unter `gebaeudemanagement` migriert** (Etappe 6b).
- **Pfad:** `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx`.
- **Aktion in 7b:** keine. Nur dokumentieren. Nicht erneut anfassen.

### 3.4 `DigitaleNamensanzeige.tsx`

- **Status:** **Bereits unter `gebaeudemanagement` migriert** (Etappe 6b).
- **Pfad:** `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx`.
- **Aktion in 7b:** keine. Nur dokumentieren.

### 3.5 `src/pages/anwendungen/Grossanlage.tsx` (Singular)

- **Aktuelle Route:** `/anwendungen/grossanlage`.
- **Zugehörigkeit:** Domain `anwendungen`. Nicht `gebaeudekommunikation`.
- **Beziehung:** Inhaltliche Überschneidung mit `Grossanlagen.tsx` (Plural), aber strukturell und routenseitig klar getrennt.
- **Aktion in 7b:** **nicht migrieren.** Bleibt vorläufig in `src/pages/anwendungen/`. Nur Abhängigkeit dokumentieren. Verwechslungsrisiko bei Datei-Operationen (Singular vs. Plural) ist hoch – siehe Risiken.

### 3.6 Weitere fachlich nahe Pages

| Datei | Begründung Nicht-Aufnahme |
|---|---|
| `src/pages/Tuersprechanlagen.tsx` (bereits in 2.) | gehört rein |
| `src/pages/Bildungseinrichtungen.tsx` | gehört zur Domain `anwendungen` (Branchenseite). |
| `src/pages/anwendungen/InterneKommunikation.tsx` | Domain `anwendungen`. |
| `src/pages/anwendungen/Feuerwehrdurchsage.tsx` | Domain `anwendungen`. |
| `src/pages/anwendungen/BidirektionaleVideo.tsx` | Domain `anwendungen`. |

---

## 4. Betroffene Assets

Lokale Bild-Imports der 6 eindeutig betroffenen Pages. Quelle: grep über `src/**/*.{ts,tsx}`.

### 4.1 Domain-exklusive Assets (verschiebbar)

| # | Aktuelle Asset-Datei | Importiert in | Empfohlener Zielpfad | Außerhalb der Domain genutzt? | Risiko | Empfehlung |
|---|---|---|---|---|---|---|
| 1 | `src/assets/tk-aussenstation-pes-pro.jpg` | `Tuerkommunikation.tsx`, `Tuersprechanlagen.tsx` | `src/features/gebaeudekommunikation/assets/tuersprechanlagen/tk-aussenstation-pes-pro.jpg` | nein (intra-domain Doppelnutzung) | niedrig | verschieben |
| 2 | `src/assets/tk-aussenstation-carus.jpg` | `Tuersprechanlagen.tsx` | `…/tuersprechanlagen/tk-aussenstation-carus.jpg` | nein | niedrig | verschieben |
| 3 | `src/assets/tk-aussenstation-entry.jpg` | `Tuersprechanlagen.tsx` | `…/tuersprechanlagen/tk-aussenstation-entry.jpg` | nein | niedrig | verschieben |
| 4 | `src/assets/tk-innenstation-tasta-pro.jpg` | `Tuersprechanlagen.tsx` | `…/tuersprechanlagen/tk-innenstation-tasta-pro.jpg` | nein | niedrig | verschieben |
| 5 | `src/assets/tk-innenstation-senso-pro.jpg` | `Tuersprechanlagen.tsx` | `…/tuersprechanlagen/tk-innenstation-senso-pro.jpg` | nein | niedrig | verschieben |
| 6 | `src/assets/tk-innenstation-skyline.jpg` | `Tuersprechanlagen.tsx` | `…/tuersprechanlagen/tk-innenstation-skyline.jpg` | nein | niedrig | verschieben |
| 7 | `src/assets/tk-innenstation-series-h.jpg` | `Tuersprechanlagen.tsx` | `…/tuersprechanlagen/tk-innenstation-series-h.jpg` | nein | niedrig | verschieben |
| 8 | `src/assets/briefkasten-hero.jpg` | `Briefkastenanlagen.tsx`, `Tuerkommunikation.tsx` | `…/briefkastenanlagen/briefkasten-hero.jpg` | nein (intra-domain Doppelnutzung) | niedrig | verschieben |
| 9 | `src/assets/briefkasten-aufputz.jpg` | `Briefkastenanlagen.tsx` | `…/briefkastenanlagen/briefkasten-aufputz.jpg` | nein | niedrig | verschieben |
| 10 | `src/assets/briefkasten-unterputz.jpg` | `Briefkastenanlagen.tsx` | `…/briefkastenanlagen/briefkasten-unterputz.jpg` | nein | niedrig | verschieben |
| 11 | `src/assets/briefkasten-stele.jpg` | `Briefkastenanlagen.tsx` | `…/briefkastenanlagen/briefkasten-stele.jpg` | nein | niedrig | verschieben |
| 12 | `src/assets/grossanlage-hero.jpg` | `Grossanlagen.tsx`, `Tuerkommunikation.tsx` | `…/grossanlagen/grossanlage-hero.jpg` | nein (intra-domain Doppelnutzung) | niedrig | verschieben |
| 13 | `src/assets/grossanlage-concierge.jpg` | `Grossanlagen.tsx` | `…/grossanlagen/grossanlage-concierge.jpg` | nein | niedrig | verschieben |
| 14 | `src/assets/grossanlage-schranke.jpg` | `Grossanlagen.tsx` | `…/grossanlagen/grossanlage-schranke.jpg` | nein | niedrig | verschieben |
| 15 | `src/assets/grossanlage-funkzylinder.jpg` | `Grossanlagen.tsx` | `…/grossanlagen/grossanlage-funkzylinder.jpg` | nein | niedrig | verschieben |
| 16 | `src/assets/grossanlage-namensanzeige.jpg` | `Grossanlagen.tsx` | `…/grossanlagen/grossanlage-namensanzeige.jpg` | nein | niedrig | verschieben |
| 17 | `src/assets/systemloesungen-hero.jpg` | `Systemloesungen.tsx`, `Tuerkommunikation.tsx` | `…/systemloesungen/systemloesungen-hero.jpg` | nein (intra-domain Doppelnutzung) | niedrig | verschieben |
| 18 | `src/assets/systemloesungen-feuerwehr.jpg` | `Systemloesungen.tsx` | `…/systemloesungen/systemloesungen-feuerwehr.jpg` | nein | niedrig | verschieben |
| 19 | `src/assets/systemloesungen-intern.jpg` | `Systemloesungen.tsx` | `…/systemloesungen/systemloesungen-intern.jpg` | nein | niedrig | verschieben |
| 20 | `src/assets/systemloesungen-bidi.jpg` | `Systemloesungen.tsx` | `…/systemloesungen/systemloesungen-bidi.jpg` | nein | niedrig | verschieben |
| 21 | `src/assets/snipdoo/systemdiagramm-snipdoo-ip.webp` | `SnipdooIp.tsx` | `…/snipdoo/systemdiagramm-snipdoo-ip.webp` | nein | niedrig | verschieben |
| 22 | `src/assets/snipdoo/nutzung-alltag-home-app.webp` | `SnipdooIp.tsx` | `…/snipdoo/nutzung-alltag-home-app.webp` | nein | niedrig | verschieben |
| 23 | `src/assets/snipdoo/anwendung-einfamilienhaus.webp` | `SnipdooIp.tsx` | `…/snipdoo/anwendung-einfamilienhaus.webp` | nein | niedrig | verschieben |
| 24 | `src/assets/snipdoo/anwendung-mehrfamilienhaus.webp` | `SnipdooIp.tsx` | `…/snipdoo/anwendung-mehrfamilienhaus.webp` | nein | niedrig | verschieben |
| 25 | `src/assets/snipdoo/anwendung-gewerbe.webp` | `SnipdooIp.tsx` | `…/snipdoo/anwendung-gewerbe.webp` | nein | niedrig | verschieben |
| 26 | `src/assets/snipdoo/inbetriebnahme-snipdoo-system.webp` | `SnipdooIp.tsx` | `…/snipdoo/inbetriebnahme-snipdoo-system.webp` | nein | niedrig | verschieben |

**26 domain-exklusive Assets, alle verschiebbar.**

### 4.2 Shared/Cross-Domain Assets – NICHT verschieben

| # | Asset | Genutzt in (außerhalb gebaeudekommunikation) | Aktion in 7b |
|---|---|---|---|
| A | `src/assets/block-kommunikation.jpg` | `Tuerkommunikation.tsx` (Hero), `Tuersprechanlagen.tsx` (Hero) **+ HandwerkContent, WohnungswirtschaftContent, FachhandelContent, ArchitektenContent, BauherrenContent, FachplanerContent (Persona-Komponenten)** | **Bleibt in `src/assets/`.** Asset-Imports in den 2 Domain-Pages bleiben absolut auf `@/assets/block-kommunikation.jpg`. Verschiebung erst sinnvoll, wenn Persona-Komponenten in eine eigene Domain überführt sind. |
| B | `src/assets/signage-hero.jpg` | `Tuerkommunikation.tsx` (Hero) **+ Beschilderung.tsx** | **Bleibt in `src/assets/`.** Beschilderung wurde explizit aus 7b ausgeklammert. Asset folgt erst, wenn beide Konsumenten in dieselbe Domain wandern. |

### 4.3 Vorgeschlagene Unterordner-Struktur

```
src/features/gebaeudekommunikation/assets/
├── tuersprechanlagen/    (7 Dateien)
├── briefkastenanlagen/   (4 Dateien)
├── grossanlagen/         (5 Dateien)
├── systemloesungen/      (4 Dateien)
└── snipdoo/              (6 Dateien)
```

`Tuerkommunikation.tsx` (Übersichtsseite) hat keinen eigenen Unterordner, sondern referenziert die jeweiligen Sub-Domain-Hero-Assets über die neuen Pfade plus die zwei shared Assets aus `@/assets/`.

---

## 5. Betroffene Komponenten

| Komponente | Aktueller Pfad | Nutzung | Zielentscheidung | Risiko |
|---|---|---|---|---|
| `PageLayout` | `src/components/PageLayout.tsx` | alle 6 Pages | bleibt in `src/components` | – |
| `ContentSection` | `src/components/PageLayout.tsx` (Re-Export) | 5 von 6 Pages | bleibt in `src/components` | – |
| `FeatureBlock` | `src/components/PageLayout.tsx` (Re-Export) | `Briefkastenanlagen.tsx`, `Systemloesungen.tsx` | bleibt in `src/components` | – |
| `SubNavSticky` | `src/components/SubNavSticky.tsx` | `SnipdooIp.tsx` | **bleibt vorerst in `src/components`** – wird ggf. später shared/feature-spezifisch eingeordnet | niedrig |
| `RoleTabsBlock` | `src/components/RoleTabsBlock.tsx` | `SnipdooIp.tsx` | **bleibt vorerst in `src/components`** – möglicherweise persona-relevant, separat zu bewerten | mittel |
| `Button` (shadcn) | `src/components/ui/button.tsx` | `SnipdooIp.tsx` | bleibt in `src/components/ui` | – |
| `motion` (framer-motion) | externes Package | 5 Pages | bleibt extern | – |
| `Link` (react-router-dom) | externes Package | 4 Pages | bleibt extern | – |
| Lucide-Icons | externes Package | alle 6 Pages | bleibt extern | – |

**Generische Komponenten** (`PageLayout`, `ContentSection`, `FeatureBlock`, `Button`) bleiben in `src/components/`. **`SubNavSticky` und `RoleTabsBlock`** bleiben in 7b ebenfalls in `src/components/` – eine spätere Einordnung in `src/shared/components/` oder eine Persona-Domain ist eigenständige Entscheidung.

---

## 6. App.tsx / Routing

### Diff-Erwartung für 7b

| Aktueller Import | Geplanter Import |
|---|---|
| `import Tuerkommunikation from "./pages/Tuerkommunikation.tsx";` | `import Tuerkommunikation from "./features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx";` |
| `import Tuersprechanlagen from "./pages/Tuersprechanlagen.tsx";` | `import Tuersprechanlagen from "./features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx";` |
| `import Briefkastenanlagen from "./pages/Briefkastenanlagen.tsx";` | `import Briefkastenanlagen from "./features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx";` |
| `import Grossanlagen from "./pages/Grossanlagen.tsx";` | `import Grossanlagen from "./features/gebaeudekommunikation/pages/GrossanlagenPage.tsx";` |
| `import Systemloesungen from "./pages/Systemloesungen.tsx";` | `import Systemloesungen from "./features/gebaeudekommunikation/pages/SystemloesungenPage.tsx";` |
| `import SnipdooIp from "./pages/systemtechnik/SnipdooIp.tsx";` | `import SnipdooIp from "./features/gebaeudekommunikation/pages/SnipdooIpPage.tsx";` |

### Unverändert bleibt

- alle 6 Route-Pfade (`/tuerkommunikation`, `/tuersprechanlagen`, `/briefkastenanlagen`, `/grossanlagen`, `/systemloesungen`, `/systemtechnik/snipdoo-ip`).
- Insbesondere `/systemtechnik/snipdoo-ip` (Slug bleibt, obwohl Datei in `gebaeudekommunikation` wandert – keine Slug-Reform).
- Reihenfolge der Routes.
- Keine `/de`-/`/en`-Routen.
- Keine Redirects.

### Nach 7b: leere Ordner

`src/pages/systemtechnik/` wird nach Move leer und kann in 7b mitgelöscht werden (analog zu `src/pages/entry/` in Etappe 5b).

---

## 7. Navigation-Bezug

- `src/navigation/mainNavigation.ts` enthält `gebaeudekommunikation` bereits als Top-Level-Item mit Kindern.
- **Beschilderung** ist dort aktuell als Kind von `gebaeudekommunikation` gelistet – Konsequenz: Wenn Beschilderung später eine eigene Domain wird, muss die Navigation parallel angepasst werden. **In 7b nicht angefasst.**
- `Signage`, `DigitalSignage` und `DigitaleNamensanzeige` sind Grenzfälle in der Navigation, in 7b nicht angefasst.
- `src/navigation/footerNavigation.ts`, `personaNavigation.ts`, `metaNavigation.ts` werden nicht angefasst.
- Platzhalterlinks bleiben erhalten.

---

## 8. i18n-Bezug

- Navigation-i18n (Namespace `navigation`) ist seit Etappe 4i aktiv (DE/EN).
- Die Seitentexte der 6 Domain-Pages bleiben in 7b unverändert auf Deutsch hartkodiert.
- **Keine Volltextmigration im Move.** Eine spätere Etappe kann optional einen Namespace `gebaeudekommunikation` vorbereiten.
- Ziel: Struktur zuerst, Textmigration später kontrolliert pro Domain.
- `src/i18n/locales/de/*.json` und `src/i18n/locales/en/*.json` werden in 7b nicht verändert.

---

## 9. Risiken und Schutzmaßnahmen

| Risiko | Wahrscheinlichkeit | Schutzmaßnahme |
|---|---|---|
| Kaputte Imports nach Move (6 Pages, 26 Assets) | mittel-hoch | Nach Move: `npm run build`. Bei Fehler: Rollback per git. |
| Shared-Assets übersehen und versehentlich verschoben (`block-kommunikation.jpg`, `signage-hero.jpg`) | hoch | Explizite Liste in Abschnitt 4.2. Vor Move in 7b nochmal grep. |
| Verwechslung `Grossanlagen.tsx` (Plural, gebaeudekommunikation) ↔ `anwendungen/Grossanlage.tsx` (Singular, anwendungen) | mittel | Strikt nur `Grossanlagen.tsx` (Plural) anfassen. `anwendungen/Grossanlage.tsx` bleibt liegen. |
| Verwechslung `gebaeudekommunikation` ↔ `signage` (Beschilderung-Grenzfall) | mittel | Beschilderung in 7b explizit ausgeklammert. |
| `Snipdoo` ist Unterbereich `systemtechnik/` – Datei-Move erzeugt leeren Ordner | niedrig | Leeren Ordner `src/pages/systemtechnik/` nach Move löschen. |
| `SubNavSticky`/`RoleTabsBlock` werden ggf. später in andere Domain wandern | niedrig | In 7b in `src/components/` belassen. Keine Komponenten-Konsolidierung. |
| Versehentliche Linkkorrektur in Navigation | niedrig | Constraint: keine Änderungen an `src/navigation/*` und Renderer-Komponenten in 7b. |
| Layoutänderung durch Refactor-Versuchung | mittel | Constraint: nur move + import-rewrite. Kein Refactor. |
| Build-Fehler durch falsche Asset-Pfade | mittel-hoch | Asset-Imports zeitgleich mit Move umstellen, dann sofort `npm run build`. |
| Persona-Komponenten verlieren Asset-Zugriff (falls shared Asset doch verschoben) | hoch | Shared-Assets explizit ausgeklammert (Abschnitt 4.2). |

### Rollback-Möglichkeit

- Migration umfasst nur Datei-Moves, Asset-Moves und Importpfad-Änderungen.
- Rollback durch git-Restore aller verschobenen Dateien und der `App.tsx`-Importzeilen.
- Keine Datenbankänderung, keine Schema-Migration, keine Dependency-Änderung.

---

## 10. Empfohlener Umsetzungsumfang für Etappe 7b

**In Scope (7b):**

1. Anlegen der Ordner:
   - `src/features/gebaeudekommunikation/pages/`
   - `src/features/gebaeudekommunikation/assets/{tuersprechanlagen,briefkastenanlagen,grossanlagen,systemloesungen,snipdoo}/`
2. Verschieben + Umbenennen der **6 eindeutig zugehörigen Pages** (siehe Abschnitt 2).
3. Verschieben der **26 domain-exklusiven Assets** (siehe Abschnitt 4.1).
4. **Shared-Assets** (`block-kommunikation.jpg`, `signage-hero.jpg`) **bleiben in `src/assets/`** und werden in den verschobenen Pages weiter über `@/assets/...` referenziert.
5. Anpassen der Asset-Imports in den 6 Pages: domain-exklusive Imports auf `@/features/gebaeudekommunikation/assets/...`, shared bleiben unverändert.
6. Anpassen der 6 Page-Imports und JSX-Referenzen in `src/App.tsx`.
7. Löschen der alten Page-Dateien aus `src/pages/` und `src/pages/systemtechnik/`.
8. Löschen der alten 26 Asset-Dateien aus `src/assets/` und `src/assets/snipdoo/` (`snipdoo/`-Ordner wird leer und kann gelöscht werden).
9. `npm run build` ausführen, Erfolg verifizieren.
10. `docs/migration-log.md` aktualisieren (Etappe 7b).

**Out of Scope (7b):**

- `Beschilderung.tsx`, `Signage.tsx` – Grenzfälle, separate Etappe.
- `anwendungen/Grossanlage.tsx` – andere Domain.
- Bereits migrierte `DigitalSignage.tsx`, `DigitaleNamensanzeige.tsx` – nicht erneut anfassen.
- Shared-Assets (`block-kommunikation.jpg`, `signage-hero.jpg`).
- Keine Texte ändern.
- Keine Layouts ändern.
- Keine Navigation ändern.
- Keine Linkkorrektur, keine Linkaktivierung.
- Keine Komponenten konsolidieren oder verschieben (`PageLayout`, `SubNavSticky`, `RoleTabsBlock` etc. bleiben in `src/components/`).
- Keine i18n-Textmigration.
- Keine `/de`-/`/en`-Routen, keine Slug-Änderung, keine Redirects.
- Keine neuen Dependencies.
- Keine anderen Domains anfassen.

---

## Zusammenfassung

- **6 Pages** zur Migration, alle eindeutig zugehörig.
- **4 Grenzfälle dokumentiert**, davon 2 explizit ausgeklammert (`Beschilderung`, `Signage`) und 2 bereits migriert (`DigitalSignage`, `DigitaleNamensanzeige`).
- **26 domain-exklusive Assets** verschiebbar.
- **2 shared Assets** (`block-kommunikation.jpg`, `signage-hero.jpg`) bewusst in `src/assets/` belassen.
- **0 domain-spezifische Komponenten** – alle generischen oder cross-domain Komponenten bleiben in `src/components/`.
- **6 Importpfade** in `src/App.tsx` anzupassen, alle 6 Routenpfade bleiben byte-identisch.
- **Risikoprofil**: mittel – größte Migration bisher mit ersten echten shared-Assets und Grenzfällen.
- **Domain-Eignung**: `gebaeudekommunikation` ist als nächste Migrationsdomain geeignet, **wenn** der Plan strikt eingehalten wird (Grenzfälle ausklammern, shared-Assets nicht anfassen).
