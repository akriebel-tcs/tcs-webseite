# Pilot-Domain „zutrittskontrolle" – Migrationsplan (Etappe 3a)

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


> **Status:** Reine Planung. Kein Code wurde verschoben oder geändert.
> Diese Datei dient als Vorlage für die spätere Umsetzungs-Etappe 3b.

Bezug:
- [`docs/architecture.md`](../02-architecture/architecture.md) – Zielarchitektur
- [`docs/migration-mapping.md`](../03-inventories/migration-mapping.md) – Gesamtmapping
- [`docs/asset-strategy.md`](../01-strategy/asset-strategy.md) – Regel „Assets folgen Features"

---

## 1. Ziel des Piloten

- Erste echte Feature-Domain-Migration nach `src/features/zutrittskontrolle/`.
- **Keine** Routenänderung (`/zutrittskontrolle/...` bleiben byte-identisch).
- **Keine** Layout-, Inhalts-, Text-, Navigations- oder Footer-Änderung.
- **Build muss nach der Umsetzung grün bleiben.**
- Vorgehen soll als **Muster für alle weiteren Domains** dienen
  (Gebäudekommunikation, Eingangssysteme, Anwendungen, …).
- Pilot bleibt bewusst **klein**: nur Pages + eindeutig zugehörige Assets.
  Generische Komponenten (`PageLayout`, `CTASection`, …) bleiben in
  `src/components/`.

---

## 2. Betroffene Seiten

| Aktuelle Datei | Aktuelle Route | Zielpfad | Migrationsart | Risiko | Hinweise |
|---|---|---|---|---|---|
| `src/pages/Zutrittskontrolle.tsx` | `/zutrittskontrolle` | `src/features/zutrittskontrolle/pages/ZutrittskontrollePage.tsx` | verschieben + umbenennen | niedrig | Default-Export bleibt; Import-Alias `@/...` weiter nutzbar |
| `src/pages/ZutrittTuerenTore.tsx` | `/zutrittskontrolle/tueren-tore` | `src/features/zutrittskontrolle/pages/TuerenTorePage.tsx` | verschieben + umbenennen | niedrig | Enthält Horizontal-Scroll-Karussell; reine Visual-Komponente, keine externe Abhängigkeit |
| `src/pages/ZutrittMobil.tsx` | `/zutrittskontrolle/mobiler-zutritt` | `src/features/zutrittskontrolle/pages/MobilerZutrittPage.tsx` | verschieben + umbenennen | niedrig | Keine Querverweise |
| `src/pages/ZutrittFahrstuhl.tsx` | `/zutrittskontrolle/fahrstuhlsteuerung` | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | verschieben + umbenennen | niedrig | Kleinste Datei; idealer „Smoke Test" zuerst |
| `src/pages/ZufahrtenParkplaetze.tsx` | `/zutrittskontrolle/zufahrten-parkplaetze` | `src/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx` | verschieben + umbenennen | niedrig | Asset-Überschneidung mit `TuerenTorePage` (`bcm-handsender`, `bcm-kfz-kennzeichen`) – siehe Asset-Tabelle |

**Beobachtung:** Keine der 5 Pages wird aus einer anderen Datei importiert –
geprüft per Suche. Einzige Importstelle ist `src/App.tsx`.

---

## 3. Betroffene Assets

Alle u. g. Assets sind per Code-Suche **nur innerhalb der Pilot-Domain** verwendet
(0 Treffer in anderen Pages/Components).

| Aktuelle Asset-Datei | Importiert in | Zielpfad | Mehrfach genutzt außerhalb? | Risiko | Empfehlung |
|---|---|---|---|---|---|
| `src/assets/hero-zutrittskontrolle.jpg` | `Zutrittskontrolle.tsx` | `src/features/zutrittskontrolle/assets/hero-zutrittskontrolle.jpg` | nein | niedrig | mit Pilot verschieben |
| `src/assets/block-tueren-tore.jpg` | `ZutrittTuerenTore.tsx` (Hero) | `src/features/zutrittskontrolle/assets/tueren-tore/hero.jpg` | nein | niedrig | mit Pilot verschieben; Unterordner `tueren-tore/` |
| `src/assets/bcm-handsender.jpg` | `ZutrittTuerenTore.tsx`, `ZufahrtenParkplaetze.tsx` | `src/features/zutrittskontrolle/assets/produkte/bcm-handsender.jpg` | **innerhalb der Domain doppelt**, außerhalb nein | niedrig | gemeinsamer Unterordner `produkte/` – beide Pages importieren denselben Pfad |
| `src/assets/bcm-vorhaengeschloss.jpg` | `ZutrittTuerenTore.tsx` | `src/features/zutrittskontrolle/assets/produkte/bcm-vorhaengeschloss.jpg` | nein | niedrig | mit Pilot verschieben |
| `src/assets/bcm-biometrie.jpg` | `ZutrittTuerenTore.tsx` | `src/features/zutrittskontrolle/assets/produkte/bcm-biometrie.jpg` | nein | niedrig | mit Pilot verschieben |
| `src/assets/bcm-kfz-kennzeichen.jpg` | `ZutrittTuerenTore.tsx`, `ZufahrtenParkplaetze.tsx` | `src/features/zutrittskontrolle/assets/produkte/bcm-kfz-kennzeichen.jpg` | innerhalb doppelt, außerhalb nein | niedrig | gemeinsamer Pfad `produkte/` |
| `src/assets/block-mobiler-zutritt.jpg` | `ZutrittMobil.tsx` (Hero) | `src/features/zutrittskontrolle/assets/mobil/hero.jpg` | nein | niedrig | Unterordner `mobil/` |
| `src/assets/bcm-doorapp.jpg` | `ZutrittMobil.tsx` | `src/features/zutrittskontrolle/assets/mobil/bcm-doorapp.jpg` | nein | niedrig | mit Pilot verschieben |
| `src/assets/bcm-gsm-gateway.jpg` | `ZutrittMobil.tsx` | `src/features/zutrittskontrolle/assets/mobil/bcm-gsm-gateway.jpg` | nein | niedrig | mit Pilot verschieben |
| `src/assets/block-fahrstuhlsteuerung.jpg` | `ZutrittFahrstuhl.tsx` (Hero) | `src/features/zutrittskontrolle/assets/fahrstuhl/hero.jpg` | nein | niedrig | Unterordner `fahrstuhl/` |
| `src/assets/bcm-parkhaus-hero.jpg` | `ZufahrtenParkplaetze.tsx` (Hero) | `src/features/zutrittskontrolle/assets/zufahrten/hero.jpg` | nein | niedrig | Unterordner `zufahrten/` |
| `src/assets/bcm-schranke.jpg` | `ZufahrtenParkplaetze.tsx` | `src/features/zutrittskontrolle/assets/zufahrten/bcm-schranke.jpg` | nein | niedrig | mit Pilot verschieben |

**Vorgeschlagene Asset-Struktur:**

```
src/features/zutrittskontrolle/assets/
├── hero-zutrittskontrolle.jpg        # Domain-Übersicht
├── produkte/                         # gemeinsam genutzt (Türen + Zufahrten)
│   ├── bcm-handsender.jpg
│   ├── bcm-vorhaengeschloss.jpg
│   ├── bcm-biometrie.jpg
│   └── bcm-kfz-kennzeichen.jpg
├── tueren-tore/
│   └── hero.jpg
├── mobil/
│   ├── hero.jpg
│   ├── bcm-doorapp.jpg
│   └── bcm-gsm-gateway.jpg
├── fahrstuhl/
│   └── hero.jpg
└── zufahrten/
    ├── hero.jpg
    └── bcm-schranke.jpg
```

> **Hinweis zu Unsplash-Bildern:** Die Karten in `ZutrittTuerenTore` und
> `ZufahrtenParkplaetze` enthalten externe Unsplash-URLs.
> Diese sind **keine lokalen Assets** und bleiben unverändert.

---

## 4. Betroffene Komponenten

| Komponente | Aktueller Pfad | Nutzung im Pilot | Zielentscheidung | Risiko |
|---|---|---|---|---|
| `PageLayout`, `ContentSection`, `FeatureBlock` | `src/components/PageLayout.tsx` | alle 5 Pages | **bleibt vorerst in `src/components/`** – wird in vielen Domains genutzt; späterer Move nach `src/shared/components/` als eigene Etappe | niedrig |
| `lucide-react` Icons | npm | 4 von 5 Pages | unverändert | – |
| `framer-motion` | npm | 3 von 5 Pages | unverändert | – |

**Bewusst nicht im Pilot:**
- `MainNavigation`, `MetaNavigation`, `Footer` – globaler Chrome, ändert sich nicht.
- `ScrollToTop`, `AutoBreadcrumb` – global, kein Domain-Bezug.
- `CTASection`, `ProductHighlights`, `HeroSection`, `StatsSection`, `PersonaSection`,
  `ContentBlocks` – werden im Pilot nicht verwendet, gehören später ggf. zu `home/` oder `shared/`.

---

## 5. App.tsx / Routing

**Was sich in `src/App.tsx` ändert (Etappe 3b):**

```diff
- import Zutrittskontrolle from "./pages/Zutrittskontrolle.tsx";
- import ZutrittTuerenTore from "./pages/ZutrittTuerenTore.tsx";
- import ZutrittMobil from "./pages/ZutrittMobil.tsx";
- import ZutrittFahrstuhl from "./pages/ZutrittFahrstuhl.tsx";
- import ZufahrtenParkplaetze from "./pages/ZufahrtenParkplaetze.tsx";
+ import Zutrittskontrolle from "@/features/zutrittskontrolle/pages/ZutrittskontrollePage";
+ import ZutrittTuerenTore from "@/features/zutrittskontrolle/pages/TuerenTorePage";
+ import ZutrittMobil from "@/features/zutrittskontrolle/pages/MobilerZutrittPage";
+ import ZutrittFahrstuhl from "@/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage";
+ import ZufahrtenParkplaetze from "@/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage";
```

**Was sich ausdrücklich NICHT ändert:**
- `<Route path="...">`-Werte bleiben byte-identisch (5 Routen).
- Keine Slug-Änderung, kein Redirect.
- Keine `/de`-/`/en`-Routen in dieser Etappe.
- Lokale Variablennamen in `App.tsx` (z. B. `Zutrittskontrolle`) bleiben gleich,
  damit der Diff minimal bleibt.

---

## 6. i18n-Bezug

- Das i18n-Grundgerüst aus Etappe 2 existiert (`src/i18n/`, Namespace `common`).
- **In der Pilot-Migration werden bestehende Texte NICHT übersetzt.**
  Ziel ist erst die Struktur, dann später die kontrollierte Textmigration.
- **Optional vorbereitet (nicht Teil von 3b):**
  - `src/i18n/locales/de/zutrittskontrolle.json`
  - `src/i18n/locales/en/zutrittskontrolle.json`
  - Registrierung als Namespace `zutrittskontrolle` in `src/i18n/index.ts`.
- Sobald Textmigration startet: `useTranslation("zutrittskontrolle")` pro Page,
  Keys analog zur Sektionsstruktur (`hero.headline`, `ueberblick.body`,
  `produkte.handsender.title`, …).

---

## 7. Risiken und Schutzmaßnahmen

| Risiko | Bewertung | Schutzmaßnahme |
|---|---|---|
| Kaputte Imports nach Move | mittel | Vor dem Verschieben Suche `@/assets/<name>` und `@/pages/Zutritt*`; nur 5 Page-Importe (nur in `App.tsx`) und 11 Asset-Pfade müssen angepasst werden |
| Mehrfach genutztes Asset bricht eine andere Domain | niedrig | Suche bestätigt: alle 11 Assets sind exklusiv in den 5 Pilot-Pages verwendet |
| Versehentliche Layoutänderung | niedrig | Keine JSX/CSS-Änderung erlaubt – nur `import`-Pfade umbiegen |
| Route-Verlust | niedrig | `<Route path="...">`-Werte bleiben unverändert; nach Move alle 5 URLs manuell aufrufen |
| i18n-Verwechslung | niedrig | i18n bewusst aus Pilot 3b ausgenommen |
| Build-Fehler durch falsches Default-Export | niedrig | Alle 5 Pages haben `export default` – beim Verschieben 1:1 erhalten |
| Vergessene Asset-Datei in `src/assets/` | niedrig | Nach Move grep auf `@/assets/<bewegtes-bild>` muss 0 Treffer ergeben; alte Datei in `src/assets/` löschen |
| Rollback nötig | niedrig | Move ist atomar pro Datei; bei Build-Fehler einzelne Page zurückbewegen |

**Verifikations-Checkliste für Etappe 3b (vor "fertig"):**

- [ ] `npm run build` ist grün.
- [ ] 5 URLs liefern HTTP 200 in der Preview:
      `/zutrittskontrolle`, `/zutrittskontrolle/tueren-tore`,
      `/zutrittskontrolle/mobiler-zutritt`,
      `/zutrittskontrolle/fahrstuhlsteuerung`,
      `/zutrittskontrolle/zufahrten-parkplaetze`.
- [ ] Visuelle Stichprobe: Hero-Bild, Produktkarten, Vorteile-Grid sichtbar.
- [ ] Suche `@/pages/Zutritt` ergibt 0 Treffer.
- [ ] Suche `@/pages/ZufahrtenParkplaetze` ergibt 0 Treffer.
- [ ] Suche nach den 11 verschobenen Asset-Dateinamen in `src/assets/` ergibt 0 Treffer.
- [ ] Keine ungewollten Änderungen an `MainNavigation`, `Footer`, `MetaNavigation`.

---

## 8. Empfohlener Umsetzungsumfang für Etappe 3b

**In Scope:**
1. Anlage `src/features/zutrittskontrolle/pages/` und `src/features/zutrittskontrolle/assets/` (mit Unterordnern).
2. Verschiebung der **5 Pages** mit Umbenennung gemäß Tabelle in §2.
3. Verschiebung der **11 Assets** gemäß Tabelle in §3.
4. Anpassung der `import`-Pfade in den 5 Pages (Asset-Pfade relativ oder via `@/features/...`).
5. Anpassung der **5 Page-Imports in `src/App.tsx`** (siehe §5).
6. Löschung der alten Dateien in `src/pages/` und `src/assets/` für die 11 Assets.
7. `npm run build` und manuelle Stichprobe der 5 Routen.

**Out of Scope (bewusst):**
- Texte oder Layouts ändern.
- Navigation, Footer, Persona-Logik berühren.
- `PageLayout`/`ContentSection`/`FeatureBlock` verschieben oder konsolidieren.
- i18n-Textmigration.
- Andere Domains (Gebäudekommunikation, Eingangssysteme, …) anfassen.
- ESLint-Modulgrenzen einführen.
- Neue Dependencies.

**Geschätzter Umfang:** ~16 Datei-Operationen (5 Page-Moves + 11 Asset-Moves) + 1 Edit in `App.tsx` + 5 Edits in den Pages (Asset-Pfade).

---

## Anhang: Suchergebnisse

- Suche nach den 12 Asset-Pattern in `*.tsx`/`*.ts`:
  **32 Treffer in 5 Dateien** – alle innerhalb der Pilot-Domain.
- Suche nach Page-Default-Exports `Zutritt*` / `ZufahrtenParkplaetze`:
  Importstelle ausschließlich in `src/App.tsx` (5 Zeilen).
