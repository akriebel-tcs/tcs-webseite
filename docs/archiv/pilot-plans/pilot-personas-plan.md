# Pilot-Plan: Feature-Domain `personas`

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


Status: **Planung (Etappe 9a)** – kein Produktivcode geändert.
Datum: 2026-04-21

---

## 1. Ziel der Persona-Migration

- Den Bereich **Personas** als eigene Feature-Domain unter `src/features/personas/` strukturieren.
- Personas explizit als **kuratierte Einstiege nach Nutzerrolle** definieren – nicht als eigenständige Produktwelten.
- **Keine Produktcontent-Duplikation**: Persona-Seiten verlinken auf bestehende Feature-Domains (`zutrittskontrolle`, `eingangssysteme`, `gebaeudemanagement`, `gebaeudekommunikation`, `signage`).
- **Keine Änderung an `PersonaContext`** in dieser Planung und in 9b.
- **Keine sichtbare Änderung** in dieser Etappe – Layout, Texte, Navigation, Routen, i18n bleiben bytegleich.
- Strukturelle Vorbereitung als Basis für spätere Konsolidierung (PersonaShell), i18n-Textmigration und ggf. URL-fähige Persona-Auswahl.

---

## 2. Aktuelle Dateien und Zuständigkeiten

| Aktuelle Datei | Aktuelle Funktion | Aktueller Ort | Empfohlener Zielpfad (9b) | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|
| `BauherrenContent.tsx` | Persona-Landingpage „Bauherren & Eigentümer“ (Hero + Highlights + Solutions + CTA) | `src/components/` | `src/features/personas/bauherr/components/BauherrContent.tsx` | Move + Rename (Singular wie in `personaNavigation.targetDomain: personas.bauherr`) | mittel | Wird in `pages/Index.tsx` als Komponente eingebunden. Importpfad in `Index.tsx` muss mitgezogen werden. |
| `ArchitektenContent.tsx` | Persona-Landingpage „Architekten & Gestalter“ | `src/components/` | `src/features/personas/architekt/components/ArchitektContent.tsx` | Move + Rename | mittel | Analog Bauherr. |
| `WohnungswirtschaftContent.tsx` | Persona-Landingpage „Wohnungswirtschaft“ (mit eigenem Hero und 9 Detail-Sections) | `src/components/` | `src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx` | Move | hoch | Importiert intern `WoWiHero` und `WoWiDetailSections` – Importpfade müssen mitgezogen werden. |
| `FachplanerContent.tsx` | Persona-Landingpage „Fachplaner & Integratoren“ | `src/components/` | `src/features/personas/fachplaner/components/FachplanerContent.tsx` | Move | mittel | Analog Bauherr. |
| `HandwerkContent.tsx` | Persona-Landingpage „Elektro-Handwerk“ | `src/components/` | `src/features/personas/handwerk/components/HandwerkContent.tsx` | Move | mittel | Analog Bauherr. |
| `FachhandelContent.tsx` | Persona-Landingpage „Fachhandel“ | `src/components/` | `src/features/personas/fachhandel/components/FachhandelContent.tsx` | Move | mittel | Analog Bauherr. |
| `wohnungswirtschaft/WoWiHero.tsx` | Hero-Section ausschließlich für Wohnungswirtschaft-Persona | `src/components/wohnungswirtschaft/` | `src/features/personas/wohnungswirtschaft/components/WoWiHero.tsx` | Move | niedrig | Nur ein Konsument (`WohnungswirtschaftContent.tsx`). Ordner `src/components/wohnungswirtschaft/` wird nach Move leer und kann entfernt werden. |
| `wohnungswirtschaft/WoWiDetailSections.tsx` | 9 exportierte Detail-Sections, ausschließlich für Wohnungswirtschaft-Persona | `src/components/wohnungswirtschaft/` | `src/features/personas/wohnungswirtschaft/components/WoWiDetailSections.tsx` | Move | niedrig | Nur ein Konsument (`WohnungswirtschaftContent.tsx`). |
| `PersonaSection.tsx` | Übersichtskachel-Grid auf Startseite (Anker-Links auf `#bauherren` etc.) | `src/components/` | **bleibt vorerst** in `src/components/` (Kandidat für `src/features/personas/shared/components/PersonaLinkGrid.tsx` in späterer Etappe) | kein Move in 9b | niedrig | Wird in `pages/Index.tsx` (Default-Pfad ohne `activePersona`) verwendet – semantisch ein Persona-Einstieg, technisch aber rein generisches Grid. Bewusst nicht in 9b. |
| `contexts/PersonaContext.tsx` | React-Context für `activePersona`-State | `src/contexts/` | **bleibt unverändert** | kein Move | niedrig | Verbraucht von `MetaNavigation`, `pages/Index.tsx`, `App.tsx` (Provider). Persona-IDs (`bauherren`, `architekten`, …) bleiben unverändert. |
| `MetaNavigation.tsx` | Persona-/Meta-Leiste (bereits an `personaNavigation.ts` und `metaNavigation.ts` angeschlossen) | `src/components/` | **bleibt unverändert** | kein Move | niedrig | Liest `personaNavigation` aus `@/navigation/`. Keine Änderung in 9b. |
| `navigation/personaNavigation.ts` | Datenstruktur Persona-Items (6 Einträge mit `id`, `labelKey`, `labelShortKey`, `targetDomain`) | `src/navigation/` | **bleibt unverändert** | kein Move | niedrig | `targetDomain`-Werte (`personas.bauherr`, `personas.architekt`, …) entsprechen bereits dem geplanten Zielpfad und können später als Referenz für Routen/Imports dienen. |
| `pages/Index.tsx` | Schaltet zwischen Default-Home und Persona-Landingpage je nach `activePersona` | `src/pages/` | bleibt; Imports der 6 Persona-Komponenten müssen in 9b angepasst werden | Edit (Imports) | hoch | Einziger Konsument der 6 Persona-Components. Mapping `personaComponents` muss bytegleich bleiben (gleiche Schlüssel `bauherren`, `architekten`, `wohnungswirtschaft`, `fachplaner`, `handwerk`, `fachhandel`). |

---

## 3. Persona-Doktrin

Diese Regeln gelten ab Etappe 9b dauerhaft für alle Persona-Inhalte:

1. **Personas sind Einstiege nach Nutzerrolle.**
   Sie führen Bauherren, Architekten, Wohnungswirtschaft, Fachplaner, Handwerk und Fachhandel in das passende Angebot, ohne neue Produktwelten zu schaffen.
2. **Personas enthalten keine dauerhaft doppelten Produktbeschreibungen.**
   Wenn derselbe Produkttext in zwei oder mehr Personas vorkommt, gehört er in eine Feature-Domain (oder in `shared/content/`) und wird von dort referenziert.
3. **Persona-Seiten verlinken auf Feature-Domains.**
   Solution-Blöcke verweisen via `Link to="/tuerkommunikation"`, `to="/zutrittskontrolle"`, `to="/entry-system"`, `to="/signage"` etc. – sie ersetzen keine Produktseite.
4. **Produkt-/Systemdetails bleiben in den jeweiligen Domains.**
   Z. B. SnipdooIP-Details in `gebaeudekommunikation`, BCM-Details in `gebaeudemanagement`, Türschild-Details in `signage`.
5. **Wenn Text in mehreren Personas ähnlich ist, gehört er wahrscheinlich in eine Feature-Domain oder in `shared/content/`.**
   Die aktuellen 6 Persona-Komponenten enthalten viele wiederholte Solution-Texte (Türsprechanlagen, Zutrittskontrolle, Entry-System, Signage) – das wird in einer späteren Etappe konsolidiert, **nicht in 9b**.
6. **Personas dürfen eigene Einstiegstexte und Rollenargumentation haben** (Hero, Highlights mit rollenspezifischen Vorteilen, CTA), aber **keine technischen Detailseiten ersetzen**.

---

## 4. Betroffene Assets

Analyse aller lokalen Bild-Imports in den 8 Persona-Dateien. **Externe URLs** (`https://ca1b582e-…png` für `imgEntry`) sind kein Asset-Move.

| Asset | Importiert in (Datei) | Mehrfach genutzt? | Möglicher Zielpfad | Empfehlung |
|---|---|---|---|---|
| `src/assets/block-kommunikation.jpg` | Bauherren, Architekten, Wohnungswirtschaft, Fachplaner, Handwerk, Fachhandel **+ `WohnungswirtschaftContent` selbst** (insgesamt 6 Persona-Komponenten) – außerdem ggf. weitere Konsumenten außerhalb Personas | ja, **sehr stark shared** | bleibt in `src/assets/` | **Nicht verschieben.** Klassisches Topic-Cover, das im gesamten Projekt als Referenz auf das Thema „Türkommunikation“ verwendet wird. Konsolidierung später ggf. in `gebaeudekommunikation/assets/` mit Re-Export, aber **nicht in 9b**. |
| `src/assets/block-zutritt.jpg` | alle 6 Persona-Komponenten | ja, **sehr stark shared** | bleibt in `src/assets/` | **Nicht verschieben.** Analog. |
| `src/assets/block-signage.jpg` | alle 6 Persona-Komponenten (laut bisheriger Analyse + 8a-Plan zusätzlich von weiteren Konsumenten genutzt; insgesamt ~8 Konsumenten) | ja, **sehr stark shared** | bleibt in `src/assets/` | **Nicht verschieben.** Bereits in 8b als shared bestätigt. |
| `src/assets/hero-entrance.jpg` | alle 6 Persona-Komponenten + `wohnungswirtschaft/WoWiHero.tsx` | ja, **sehr stark shared** | bleibt in `src/assets/` | **Nicht verschieben.** Globales Hero-Bild, das auch außerhalb Personas verwendet werden könnte. Konsolidierungsfrage später separat klären. |
| `https://ca1b582e-…png` (`imgEntry`) | alle 6 Persona-Komponenten als externe URL | ja | externe URL, kein Move | **Behalten.** Analog zu jimcdn.com-URLs in `eingangssysteme` – kein lokales Asset, daher außerhalb Move-Scope. Ggf. später als lokales Asset hinterlegen, aber nicht in 9b. |

**Klassifizierung:**

- **persona-exklusiv:** keine Assets identifiziert.
- **shared zwischen Personas:** `block-kommunikation`, `block-zutritt`, `block-signage`, `hero-entrance` (alle in 5–6 Personas).
- **shared mit Feature-Domains:** dieselben 4 Assets sind potenziell auch außerhalb Personas Konsumenten – Re-Verifikation in 9b vor Move-Versuch.
- **unklar:** keine.

**Konsequenz für 9b:** **Keine Asset-Moves.** Alle 4 lokalen Bilder bleiben in `src/assets/`. Eine spätere Etappe kann separat klären, ob Re-Lokalisierung in eine Feature-Domain (mit Re-Export) sinnvoll ist.

---

## 5. Betroffene Komponenten

| Komponente | Nutzung | Zielentscheidung (9b) | Risiko | Empfehlung |
|---|---|---|---|---|
| `BauherrenContent.tsx` | nur in `pages/Index.tsx` | Move nach `features/personas/bauherr/components/` | mittel | Move 1:1, keine inhaltliche Änderung. |
| `ArchitektenContent.tsx` | nur in `pages/Index.tsx` | Move nach `features/personas/architekt/components/` | mittel | Move 1:1. |
| `WohnungswirtschaftContent.tsx` | nur in `pages/Index.tsx` | Move nach `features/personas/wohnungswirtschaft/components/` | hoch | Importpfade zu `WoWiHero` und `WoWiDetailSections` mitziehen (relative Imports innerhalb der neuen Persona-Domain). |
| `FachplanerContent.tsx` | nur in `pages/Index.tsx` | Move nach `features/personas/fachplaner/components/` | mittel | Move 1:1. |
| `HandwerkContent.tsx` | nur in `pages/Index.tsx` | Move nach `features/personas/handwerk/components/` | mittel | Move 1:1. |
| `FachhandelContent.tsx` | nur in `pages/Index.tsx` | Move nach `features/personas/fachhandel/components/` | mittel | Move 1:1. |
| `wohnungswirtschaft/WoWiHero.tsx` | nur in `WohnungswirtschaftContent.tsx` | Move nach `features/personas/wohnungswirtschaft/components/` | niedrig | Persona-spezifisch, klar zuordenbar. |
| `wohnungswirtschaft/WoWiDetailSections.tsx` | nur in `WohnungswirtschaftContent.tsx` | Move nach `features/personas/wohnungswirtschaft/components/` | niedrig | Persona-spezifisch. |
| `PersonaSection.tsx` | nur in `pages/Index.tsx` (Default-Home, ohne aktive Persona) | **bleibt in `src/components/`** | niedrig | Generisches Übersichts-Grid, semantisch Persona-Einstieg. Bewusster Verzicht in 9b, um Scope klein zu halten. Spätere Etappe: nach `features/personas/shared/components/PersonaLinkGrid.tsx`. |
| `MetaNavigation.tsx` | App-Header | **bleibt unverändert** | niedrig | Liest aus `personaNavigation.ts`. Keine Änderung. |
| `PersonaShell` (hypothetisch) | – | **nicht in 9b einführen** | mittel (Layout-Risiko) | Eine generische Shell für Hero+Highlights+Solutions+CTA wäre attraktiv, würde aber Texte/Layout zusammenführen. Erst nach 1:1-Sichtprüfung der 6 migrierten Personas in einer späteren Etappe sinnvoll. |
| `shared/content/personaTypes.ts` (hypothetisch) | – | **nicht in 9b einführen** | niedrig | Erst, wenn die 6 Komponenten technisch verschoben sind und ein klares gemeinsames Schema sichtbar wird. |

**PersonaShell-Bewertung:** Die 6 Persona-Komponenten haben ein **strukturell sehr ähnliches Schema** (Hero → Stats/Highlights → Solutions → CTA), aber:
- die Texte sind rollenspezifisch und uneinheitlich detailliert,
- Wohnungswirtschaft hat eigenen Hero und 9 Detail-Sections,
- die Highlights-Icons unterscheiden sich pro Rolle.
Ein voreiliges Generifizieren würde Layout-Regressionen riskieren. **Empfehlung: PersonaShell erst nach 9b in einer separaten Etappe analysieren.**

---

## 6. PersonaContext / MetaNavigation

- **PersonaContext bleibt vorerst unverändert.** `activePersona`-State und Setter (`PersonaContext.tsx`) werden in 9b nicht angefasst.
- **MetaNavigation ist bereits an `personaNavigation.ts` angeschlossen** (seit Etappe 4h). Keine Änderung in 9b.
- **Keine Änderung an `activePersona`-Logik.** Der Switch in `pages/Index.tsx` bleibt strukturell identisch – nur die Importpfade der 6 Persona-Komponenten ändern sich.
- **Keine Routenänderung.** Personas sind weiterhin nicht URL-fähig (kein `/personas/bauherr`-Pfad). Wechsel passiert weiterhin über State.
- **Persona-Auswahl bleibt state-basiert** (Click → `setActivePersona` → Re-Render `Index.tsx`).
- **Spätere URL-fähige Persona-Auswahl** (z. B. `/personas/wohnungswirtschaft` oder Query-Param `?p=wowi`) wäre eine eigene Entscheidung mit eigener Etappe – **nicht Teil von 9b**.

---

## 7. i18n-Bezug

- **Navigation-i18n ist aktiv** (Namespace `navigation`, DE/EN, seit Etappe 4i/4j).
- **Persona-Navigation ist bereits im Namespace `navigation`** über `persona.bauherren.label`, `persona.bauherren.short` etc. – diese Keys bleiben unverändert.
- **Persona-Content-Texte sind noch hartcodiert** (Hero-Headline, Highlights-Titel/-Description, Solutions-Texte, CTA-Texte) in den 6 Komponenten und in `WoWiHero` / `WoWiDetailSections`.
- **Späterer eigener Namespace `personas` möglich** – Vorschlag:
  - `src/i18n/locales/de/pages/personas.json`
  - `src/i18n/locales/en/pages/personas.json`
- **Keine Textmigration in 9a/9b.** Struktur zuerst, Textmigration später. Texte bleiben in 9b 1:1 in den jeweiligen Persona-Komponenten.

---

## 8. Risiken und Schutzmaßnahmen

| Risiko | Beschreibung | Schutzmaßnahme |
|---|---|---|
| **Layoutänderungen durch Zusammenführen** | Wenn man in 9b voreilig Hero/Highlights/Solutions in eine PersonaShell zusammenführt, verändern sich Spacings, Animationen oder Typografie. | **9b nur als technischer Move umsetzen.** Keine PersonaShell, keine Section-Konsolidierung. |
| **Shared Assets versehentlich verschieben** | `block-kommunikation`, `block-zutritt`, `block-signage`, `hero-entrance` werden von 5–8 Konsumenten verwendet. Ein Move würde unbemerkt andere Domains brechen. | **Keine Asset-Moves in 9b.** Alle 4 Assets bleiben in `src/assets/`. |
| **PersonaContext versehentlich brechen** | Wenn Persona-IDs in `personaComponents`-Mapping (`Index.tsx`) abweichen, würde der Persona-Switch nicht mehr matchen. | **Persona-IDs bytegleich halten** (`bauherren`, `architekten`, `wohnungswirtschaft`, `fachplaner`, `handwerk`, `fachhandel`). Keine Umbenennung in 9b. |
| **MetaNavigation versehentlich ändern** | Änderungen an `personaNavigation.ts` würden die Persona-Leiste brechen. | **`navigation/`-Ordner in 9b nicht anfassen.** |
| **Produktcontent versehentlich duplizieren** | Wenn beim Move neue Texte oder Solutions hinzukommen, entstehen neue Dubletten. | **Keine Textänderungen in 9b.** |
| **Zu frühe Generifizierung mit PersonaShell** | Verlust rollenspezifischer Nuancen, Layout-Regressionen. | **PersonaShell explizit auf eine spätere Etappe verschoben.** |
| **Importpfad-Bruch in `Index.tsx`** | `Index.tsx` ist einziger Konsument; falscher Pfad → Build-Fehler. | **In 9b strikt parallel: Move + Import-Update + Build.** Verifikation mit `npm run build`. |
| **Wohnungswirtschaft-Sub-Imports** | `WohnungswirtschaftContent.tsx` importiert `@/components/wohnungswirtschaft/WoWiHero` und `WoWiDetailSections`. | **Beide Sub-Komponenten gleichzeitig mitziehen.** Importpfade auf relative oder Domain-Pfade umstellen (`./WoWiHero`, `./WoWiDetailSections`). |
| **`src/components/wohnungswirtschaft/`-Ordner verwaisen** | Nach Move bleibt ein leerer Ordner zurück. | **In 9b nach erfolgreichem Move den leeren Ordner entfernen.** |

**Rollback-Möglichkeit:** Da 9b ein reiner technischer Move ist (keine Texte, keine Layouts, keine Logik), ist Rollback durch `git revert` der 9b-Commits jederzeit möglich. Routen bleiben unverändert; ein Rollback hätte keine User-sichtbare Wirkung.

---

## 9. Empfehlung für Etappe 9b

**Empfehlung: 9b als reiner technischer Move umsetzen.**

In Scope für 9b:
- Move der 6 Persona-Content-Komponenten nach `src/features/personas/{bauherr,architekt,wohnungswirtschaft,fachplaner,handwerk,fachhandel}/components/`.
- Move von `WoWiHero.tsx` und `WoWiDetailSections.tsx` nach `src/features/personas/wohnungswirtschaft/components/`.
- Update der 6 Imports in `src/pages/Index.tsx`.
- Update der 2 Imports in `WohnungswirtschaftContent.tsx` (Sub-Komponenten).
- Entfernen des leeren Ordners `src/components/wohnungswirtschaft/`.
- Datei-Rename auf Singular: `BauherrenContent.tsx` → `BauherrContent.tsx` etc. (entsprechend `targetDomain: personas.bauherr`). **Optional** – wenn das Risiko zu hoch erscheint, bleiben die Dateinamen Plural; nur der Ordner ist Singular.

Nicht in Scope für 9b (bewusst):
- **Keine Konsolidierung zu PersonaShell.**
- **Keine Textänderungen.**
- **Keine Layoutänderungen.**
- **Keine Asset-Moves** (keines der 4 Bilder ist persona-exklusiv).
- **Keine Änderungen an `PersonaContext`, `MetaNavigation`, `personaNavigation.ts`, `metaNavigation.ts`.**
- **Keine Bewegung von `PersonaSection.tsx`** – bleibt vorerst in `src/components/`.
- **Keine i18n-Textmigration.**
- **Keine neuen Routen** (keine `/personas/...`-URLs).

PersonaShell, Textkonsolidierung und i18n-Textmigration kommen in **separaten späteren Etappen** nach Sichtprüfung und Vergleich der dann migrierten Persona-Komponenten.

---

## 10. Prompting-Regeln für spätere Mitarbeit

Diese Arbeitsregeln gelten ab Etappe 9b für jede Persona-bezogene Änderung:

1. **Bei Änderungen immer Feature-Domain nennen.** Beispiel: „Etappe 10x: nur `personas/wohnungswirtschaft` betreffend".
2. **Keine globalen Änderungen ohne expliziten Auftrag.** Ein Persona-Auftrag ist kein Freibrief, an `MetaNavigation`, `personaNavigation.ts` oder am `PersonaContext` zu arbeiten.
3. **Keine Navigation ändern, wenn nur Persona-Content gemeint ist.** `mainNavigation`, `footerNavigation`, `personaNavigation`, `metaNavigation` werden in Persona-Etappen nicht angefasst, außer ausdrücklich beauftragt.
4. **Keine Assets verschieben, wenn nur Text geändert wird.** Asset-Moves sind eine separate Etappe und brauchen explizite Konsumenten-Verifikation.
5. **Bei Persona-Änderungen nur den jeweiligen Persona-Ordner anfassen.** Eine Änderung an „Bauherr“ darf nicht in „Architekt“, „Wohnungswirtschaft“ etc. eingreifen.
6. **Produktdetails nicht in Personas schreiben, sondern auf Domain-Seiten verlinken.** Wenn eine Persona-Erweiterung neuen Produkttext fordert, gehört dieser in die zuständige Feature-Domain (`gebaeudekommunikation`, `zutrittskontrolle`, `eingangssysteme`, `gebaeudemanagement`, `signage`) – Persona verlinkt nur dorthin.

---

## Anhang: Geplante Zielstruktur (Vollbild)

```
src/features/personas/
├── shared/
│   ├── components/
│   │   ├── PersonaShell.tsx          (später optional, nicht in 9b)
│   │   ├── PersonaLinkGrid.tsx       (später optional, ersetzt PersonaSection)
│   │   └── PersonaHero.tsx           (später optional)
│   └── content/
│       └── personaTypes.ts           (später optional)
├── bauherr/
│   ├── components/
│   │   └── BauherrContent.tsx        (in 9b)
│   └── content/
├── architekt/
│   ├── components/
│   │   └── ArchitektContent.tsx      (in 9b)
│   └── content/
├── wohnungswirtschaft/
│   ├── components/
│   │   ├── WohnungswirtschaftContent.tsx  (in 9b)
│   │   ├── WoWiHero.tsx                   (in 9b)
│   │   └── WoWiDetailSections.tsx         (in 9b)
│   └── content/
├── fachplaner/
│   ├── components/
│   │   └── FachplanerContent.tsx     (in 9b)
│   └── content/
├── handwerk/
│   ├── components/
│   │   └── HandwerkContent.tsx       (in 9b)
│   └── content/
└── fachhandel/
    ├── components/
    │   └── FachhandelContent.tsx     (in 9b)
    └── content/
```

Die `.gitkeep`-Platzhalter unter `src/features/personas/{bauherr,architekt,wohnungswirtschaft,fachplaner,handwerk,fachhandel,shared}/` existieren bereits aus Etappe 0.
