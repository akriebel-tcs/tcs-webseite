# Pilot-Plan: Signage / Beschilderung — Grenzfall-Analyse (Etappe 8a)

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


> **Status:** Reine Analyse und Dokumentation. **Kein Produktivcode wird in dieser Etappe geändert**, keine Dateien verschoben, keine Routen, Navigation, Assets oder i18n-Texte angefasst.

---

## 1. Ziel der Analyse

Nach Abschluss der Domain-Migrationen `zutrittskontrolle`, `eingangssysteme`, `gebaeudemanagement` und `gebaeudekommunikation` sind vier Seiten als Grenzfälle stehen geblieben, die thematisch alle den Bereich „Signage / Beschilderung / Anzeige“ betreffen, aktuell aber über drei verschiedene Orte und zwei Domains verteilt sind:

- `src/pages/Beschilderung.tsx` (loose unter `src/pages/`)
- `src/pages/Signage.tsx` (loose unter `src/pages/`)
- `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx`
- `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx`

Ziele:

1. Klären, ob `signage` als eigene Feature-Domain sinnvoll ist.
2. Klären, welche Seiten dazugehören sollen.
3. Klären, welche Assets dazugehören (insb. shared `signage-hero.jpg` und `block-signage.jpg`).
4. Eine klare Empfehlung mit Vor-/Nachteilen formulieren.
5. Festlegen, welche Schritte vor einer technischen Migration nötig sind (insb. ob eine Marketing-/Produktentscheidung erforderlich ist).

**Keine Migration in dieser Etappe.**

---

## 2. Betroffene Seiten

| Aktuelle Datei | Aktuelle Route | Aktueller Ort | Fachliche Zuordnung | Mögliche Ziel-Domain | Risiko | Empfehlung |
|---|---|---|---|---|---|---|
| `src/pages/Beschilderung.tsx` | `/beschilderung` | `src/pages/` (loose) | Klassische Beschilderung & Wayfinding (Hausnummern, Türschilder, Klingelplatten, Piktogramme) — physische Produkte | `signage` | Mittel — in MainNavigation aktuell unter `gebaeudekommunikation` geführt; Verschieben ändert nur Code-Ort, **nicht** Slug/Navigation | In `signage` migrieren, sobald Marketing/Product die Domain freigibt |
| `src/pages/Signage.tsx` | `/signage` | `src/pages/` (loose) | Marketing-/Übersichtsseite TCS-Signage (Markenseite mit identischen Produkt-Themen wie `Beschilderung.tsx`) | `signage` | **Hoch — inhaltliche Dublette zu `Beschilderung.tsx`** (4 Themenblöcke 1:1 identisch: smarte Hausnummern, Farbvielfalt, Türschilder, Türklingeln) | Vor Migration **inhaltlich** klären, ob beide Seiten bestehen bleiben oder eine die andere ersetzt → **Marketing-/Produktentscheidung nötig** |
| `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx` | `/gebaeudemanagement/digital-signage` | `src/features/gebaeudemanagement/pages/` | BCM Infoboard — digitale, dynamische Beschilderung **als Teil des BCM-Zutrittskontrollsystems** | bleibt sinnvoll in `gebaeudemanagement` (alternativ `signage` mit BCM-Bezug) | Mittel — Slug enthält `/gebaeudemanagement/`, Verschieben würde URL ändern (verboten) | **Bleibt in `gebaeudemanagement`**, nur dokumentieren |
| `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx` | `/gebaeudemanagement/digitale-namensanzeige` | `src/features/gebaeudemanagement/pages/` | Digitale Namensanzeige BCM (Außenstation ADx5, CARUS Displaymodul, etc.) — **eng mit BCM-System verzahnt** | bleibt sinnvoll in `gebaeudemanagement` | Mittel — Slug enthält `/gebaeudemanagement/` | **Bleibt in `gebaeudemanagement`**, nur dokumentieren |

### Zusatzbeobachtung Navigation
- `mainNavigation.ts` Zeile 60 markiert `Beschilderung` bereits ausdrücklich als „Grenzfall: Beschilderung könnte auch zu signage gehören.“
- `mainNavigation.ts` Zeile 164 markiert `Digital Signage` bereits mit `targetDomain: "signage"` und Hinweis „Slug unter gebaeudemanagement, fachliche Domain ist signage.“
- `routes.ts` Zeile 95–96 enthält bereits `signage.root = "/signage"` als zentrale Route-Konstante.
- `footerNavigation.ts` Zeile 70–76 enthält einen weiteren toten Link `produkte.beschilderung`, der aktuell auf `/tuerkommunikation` zeigt (Note: „korrekt wäre vermutlich /beschilderung“).

→ Die Navigation hat die `signage`-Domain **bereits konzeptionell vorbereitet**, der Code-Ort ist nur noch nicht angepasst.

---

## 3. Mögliche Zielstruktur — drei Optionen

### Option A: `signage` als eigene Feature-Domain (alles zusammen)

```
src/features/signage/
├── pages/
│   ├── BeschilderungPage.tsx       (← src/pages/Beschilderung.tsx)
│   ├── SignagePage.tsx             (← src/pages/Signage.tsx)
│   ├── DigitalSignagePage.tsx      (← src/features/gebaeudemanagement/...)
│   └── DigitaleNamensanzeigePage.tsx (← src/features/gebaeudemanagement/...)
└── assets/
    ├── beschilderung/
    │   ├── signage-hausnummer.jpg
    │   ├── signage-materialien.jpg
    │   ├── signage-tuerschilder.jpg
    │   └── signage-tuerklingel.jpg
    ├── digital-signage/             (aus gebaeudemanagement übernehmen)
    └── namensanzeige/               (aus gebaeudemanagement übernehmen)
```

**Vorteile:**
- Klare fachliche Bündelung („alles, was auf Schildern oder Displays anzeigt“) an einem Ort.
- `signage`-Konzept ist in Navigation/Routes bereits vorgesehen.
- Beseitigt die unsaubere Verteilung über drei Orte.

**Nachteile:**
- **Slug-Konflikt:** `/gebaeudemanagement/digital-signage` und `/gebaeudemanagement/digitale-namensanzeige` müssten **bleiben**, da Routen byte-identisch sein müssen. Das würde bedeuten: Code lebt in `signage/`, URL lebt unter `gebaeudemanagement/` → semantischer Bruch zwischen Code und URL.
- BCM-Produkte (Digital Signage, Namensanzeige) sind technisch eng mit dem BCM-Zutrittskontrollsystem verzahnt — die fachliche Trennung ist nicht eindeutig.
- Verschieben **ohne Marketing-Klärung der Dublette** `Beschilderung.tsx` ↔ `Signage.tsx` zementiert das Problem nur.

### Option B: Status quo — Beschilderung bei `gebaeudekommunikation`, Digital Signage / Namensanzeige bei `gebaeudemanagement`

**Vorteile:**
- Keine Migration nötig, keine Risiken.
- BCM-Bezug von Digital Signage/Namensanzeige bleibt sichtbar im Code-Ort.
- Aktuelle Navigation passt bereits dazu.

**Nachteile:**
- `src/pages/Beschilderung.tsx` und `src/pages/Signage.tsx` bleiben **lose unter `src/pages/`** — verstoßen gegen die Feature-Domain-Architektur (`docs/architecture.md`).
- `signage`-Vorbereitung in `routes.ts` und `mainNavigation.ts` bleibt ungenutzt (toter Code-Ballast).
- Inhaltliche Dublette `Beschilderung.tsx` ↔ `Signage.tsx` bleibt unbearbeitet.

### Option C (empfohlen): Hybrid — `signage` nur für klassische Beschilderung & Wayfinding

```
src/features/signage/
├── pages/
│   ├── BeschilderungPage.tsx       (← src/pages/Beschilderung.tsx)
│   └── SignagePage.tsx             (← src/pages/Signage.tsx, NACH Klärung)
└── assets/
    └── beschilderung/
        ├── signage-hausnummer.jpg
        ├── signage-materialien.jpg
        ├── signage-tuerschilder.jpg
        └── signage-tuerklingel.jpg
```

`DigitalSignagePage.tsx` und `DigitaleNamensanzeigePage.tsx` **bleiben in `gebaeudemanagement`**, weil sie technisch zum BCM-System gehören (Slugs `/gebaeudemanagement/...` ohnehin nicht änderbar).

Shared Assets (`block-signage.jpg`, `signage-hero.jpg`) **bleiben in `src/assets/`**, weil sie auch von 7 Persona-Komponenten und `TuerkommunikationPage` genutzt werden.

**Vorteile:**
- Klare fachliche Abgrenzung: `signage` = klassische/physische Beschilderung; `gebaeudemanagement` = digitale BCM-Produkte.
- Code-Ort und Slug stimmen überein (`/beschilderung`, `/signage` ohne `gebaeudemanagement/`-Präfix).
- Räumt die losen Pages aus `src/pages/` ab.
- Nutzt die bereits vorbereitete `routes.signage`-Struktur und löst den `mainNavigation`-Note „Grenzfall“ konkret auf.
- Kleine, beherrschbare Migration (analog `eingangssysteme` mit 2 Pages, 4 Assets).

**Nachteile:**
- Inhaltliche Dublette `Beschilderung.tsx` ↔ `Signage.tsx` muss **vorher** geklärt sein, sonst zementiert die Migration zwei sehr ähnliche Marketing-Seiten in der neuen Domain.
- `mainNavigation`-Note bei `Digital Signage` (`targetDomain: "signage"`) bleibt eine offene Inkonsistenz, da diese Seite nicht mit migriert wird.

---

## 4. Assets

| Asset | Aktuell importiert in | Mehrfach genutzt? | Möglicher Zielpfad | Empfehlung |
|---|---|---|---|---|
| `src/assets/signage-hero.jpg` | `Beschilderung.tsx`, `TuerkommunikationPage.tsx` | **Ja** (2 Domains) | `src/assets/` (shared) | **Nicht verschieben** — bleibt shared in `src/assets/`. Beide Konsumenten importieren weiterhin von dort. |
| `src/assets/block-signage.jpg` | `Signage.tsx` + 7 Persona-Komponenten (`ArchitektenContent`, `BauherrenContent`, `ContentBlocks`, `FachhandelContent`, `FachplanerContent`, `HandwerkContent`, `WohnungswirtschaftContent`) | **Ja** (8 Konsumenten, mehrere Persona-Bereiche) | `src/assets/` (shared) | **Nicht verschieben** — bleibt shared in `src/assets/`. |
| `src/assets/signage-hausnummer.jpg` | `Beschilderung.tsx` | Nein | `src/features/signage/assets/beschilderung/signage-hausnummer.jpg` | Bei Option-A/C-Migration mit verschieben |
| `src/assets/signage-materialien.jpg` | `Beschilderung.tsx` | Nein | `src/features/signage/assets/beschilderung/signage-materialien.jpg` | Bei Option-A/C-Migration mit verschieben |
| `src/assets/signage-tuerschilder.jpg` | `Beschilderung.tsx` | Nein | `src/features/signage/assets/beschilderung/signage-tuerschilder.jpg` | Bei Option-A/C-Migration mit verschieben |
| `src/assets/signage-tuerklingel.jpg` | `Beschilderung.tsx` | Nein | `src/features/signage/assets/beschilderung/signage-tuerklingel.jpg` | Bei Option-A/C-Migration mit verschieben |
| `src/features/gebaeudemanagement/assets/digital-signage/*` | `DigitalSignagePage.tsx` | Nein | bleibt in `gebaeudemanagement` (Option B/C) | **Nicht anfassen** |
| `src/features/gebaeudemanagement/assets/namensanzeige/*` | `DigitaleNamensanzeigePage.tsx` | Nein | bleibt in `gebaeudemanagement` (Option B/C) | **Nicht anfassen** |

**Wichtigste Erkenntnis:** Die zwei „shared“ Assets (`signage-hero.jpg`, `block-signage.jpg`) sind tief in der Persona-Komponentenarchitektur verankert und dürfen unter keiner Option verschoben werden.

---

## 5. Navigation-Bezug

| Datei | Stelle | Aktueller Stand | Wirkung der geplanten Migration |
|---|---|---|---|
| `src/navigation/mainNavigation.ts` Zeile 53–60 | `gebaeudekommunikation.beschilderung` → `/beschilderung` | Aktiv, mit Note „Grenzfall: Beschilderung könnte auch zu signage gehören.“ | Slug bleibt `/beschilderung`. Note könnte später entfernt werden. **Keine Linkänderung in 8a oder bei einer 8b-Migration nötig.** |
| `src/navigation/mainNavigation.ts` Zeile 159–166 | `gebaeudemanagement.signage` (Digital Signage) → `/gebaeudemanagement/digital-signage`, `targetDomain: "signage"` | Aktiv, mit Note „Slug unter gebaeudemanagement, fachliche Domain ist signage.“ | Bei Option C bleibt diese Inkonsistenz bestehen. Bei Option A würde nur der Code-Ort verschoben, der Slug bliebe gleich. |
| `src/navigation/footerNavigation.ts` Zeile 70–76 | `produkte.beschilderung` zeigt **fälschlich** auf `/tuerkommunikation` | Bekanntes Problem aus Etappe 4d (markiert als `pending`). | **Nicht im Scope von 8a/8b.** Separat in einer Footer-Cleanup-Etappe lösen. |
| `src/navigation/routes.ts` Zeile 95–96 | `signage.root = "/signage"` bereits definiert | Vorbereitet, aktiv genutzt nur indirekt | Kann bei Option A/C unverändert verwendet werden. |

**Fazit Navigation:** Die Datenstruktur ist bereits auf eine `signage`-Domain vorbereitet. **In dieser Etappe keine Linkänderung.** Eine spätere technische Migration (8b) erfordert ebenfalls **keine** Navigation-Änderung, weil die Slugs unverändert bleiben.

---

## 6. i18n-Bezug

- Navigation-i18n (DE/EN, Namespace `navigation`) ist seit Etappe 4i aktiv und enthält bereits Keys für `nav.gebaeudekommunikation.beschilderung.*` sowie `nav.gebaeudemanagement.signage.*`.
- Seitentexte (Hero-Texte, Feature-Blöcke, etc.) sind **nicht** in i18n-Locales übersetzt — sie liegen weiterhin als deutsche String-Literale direkt in den `.tsx`-Dateien.
- Bei einer späteren `signage`-Migration kann optional ein eigener Namespace `signage` (`src/i18n/locales/de/signage.json`, `…/en/signage.json`) vorbereitet werden — **nicht in Etappe 8a/8b**, sondern in einer separaten Textmigrations-Etappe.

---

## 7. Empfehlung

### Klare Empfehlung: **Option C (Hybrid)**, jedoch nur **nach** vorheriger Marketing-/Produktentscheidung zur Dublette.

**Begründung:**

1. **Architekturkonform:** `src/pages/Beschilderung.tsx` und `src/pages/Signage.tsx` gehören als letzte „lose“ Domain-Seiten in eine Feature-Domain. Option C löst dies minimal-invasiv.
2. **BCM-Bezug respektiert:** Digital Signage und Namensanzeige sind technisch BCM-Produkte und gehören fachlich zu `gebaeudemanagement`. Eine Verschiebung würde den Slug-Code-Konflikt verschärfen.
3. **Navigation passt:** `routes.signage` und der Note „Grenzfall“ in `mainNavigation` sind bereits konzeptionell auf diese Lösung vorbereitet.
4. **Klein und beherrschbar:** 2 Pages + 4 exklusive Assets — vergleichbar mit der erfolgreichen `eingangssysteme`-Migration.
5. **Risikobegrenzt:** Shared Assets (`signage-hero.jpg`, `block-signage.jpg`) bleiben unangetastet; keine Persona-Komponenten betroffen; keine Slug-Änderungen.

### Welche Seiten sollen in einer ersten Migration verschoben werden?
- ✅ `src/pages/Beschilderung.tsx` → `src/features/signage/pages/BeschilderungPage.tsx`
- ⚠️ `src/pages/Signage.tsx` → `src/features/signage/pages/SignagePage.tsx` — **nur wenn Marketing/Product bestätigt, dass diese Seite zusätzlich zu `Beschilderung.tsx` weiterbestehen soll.**

### Welche Seiten sollen bewusst bleiben?
- `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx` (BCM-Bezug, Slug-Bindung)
- `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx` (BCM-Bezug, Slug-Bindung)

### Ist eine Marketing-/Produktentscheidung nötig?

**Ja.** Vor der eigentlichen Migration (8b) sollten Marketing/Product entscheiden:

1. **Sind `Beschilderung.tsx` (`/beschilderung`) und `Signage.tsx` (`/signage`) zwei eigenständige Seiten oder ist eine ein Duplikat?** Die Inhalte überschneiden sich zu ca. 80–90 % (gleiche 4 Produktthemen, fast identische Texte).
2. **Falls eigenständig:** Was ist die jeweilige Zielgruppe / Differenzierung (z. B. Marken-Übersicht vs. Wayfinding-Detailseite)?
3. **Falls Duplikat:** Welche bleibt? Welche bekommt einen Redirect (späterer Schritt, **nicht** in 8b)?

Ohne diese Entscheidung würde die Migration zwei strukturell fast identische Seiten in `src/features/signage/pages/` zementieren.

---

## 8. Empfohlene nächste Etappe

### Pfad 1 (empfohlen): Vor 8b zwei Klärungs-Etappen

- **Etappe 8a-bis (Doku, kein Code):** Marketing-/Produktentscheidung zur Dublette `Beschilderung.tsx` ↔ `Signage.tsx` einholen und in `docs/pilot-signage-plan.md` als **Sektion 9 — Marketing-Entscheidung** ergänzen.
- **Etappe 8b (technische Migration nach Option C):** Erst nach vorliegender Entscheidung. Verschiebt `Beschilderung.tsx` und (sofern bestätigt) `Signage.tsx` nach `src/features/signage/pages/` mit `Page`-Suffix, verschiebt 4 exklusive Assets nach `src/features/signage/assets/beschilderung/`. Slugs `/beschilderung` und `/signage` bleiben byte-identisch. Shared Assets bleiben in `src/assets/`. Keine Navigation-, Footer-, MetaNavigation- oder i18n-Änderung.

### Pfad 2 (Alternative): Status quo akzeptieren

Falls Marketing/Product keine zeitnahe Entscheidung trifft:

- **Etappe 8b alternativ:** Nur `src/pages/Beschilderung.tsx` nach `src/features/signage/pages/BeschilderungPage.tsx` verschieben (1 Page, 4 exklusive Assets). `Signage.tsx` bleibt vorerst unter `src/pages/` mit dokumentiertem Hinweis im Plan. Geringeres Risiko, löst aber das Dubletten-Problem nicht.

### Was darf 8b auf **keinen** Fall enthalten?

- Slug-Änderungen, Redirects, Linkkorrekturen
- Inhaltliche Konsolidierung der zwei Seiten
- Verschieben von shared Assets (`signage-hero.jpg`, `block-signage.jpg`)
- Verschieben von `DigitalSignagePage` oder `DigitaleNamensanzeigePage`
- Navigation-, Footer-, MetaNavigation- oder i18n-Änderungen
- Auflösen des Footer-Bugs `produkte.beschilderung` → `/tuerkommunikation` (separater Footer-Cleanup nötig)

---

## Zusammenfassung in einem Satz

`signage` sollte **als eigene Feature-Domain mit den klassischen Beschilderungsseiten** entstehen (Option C), digitale BCM-Produkte bleiben in `gebaeudemanagement`, shared Assets bleiben in `src/assets/` — **vorbehaltlich einer Marketing-Entscheidung** zur inhaltlichen Dublette `Beschilderung.tsx` ↔ `Signage.tsx`.
