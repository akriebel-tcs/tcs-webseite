# Pilot-Plan: Restseiten / Service / Wissen / Unternehmen / Serviceportal (Etappe 11a)

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


**Datum:** 2026-04-21
**Status:** Analyse, kein Produktivcode geändert
**Vorgänger-Checkpoint:** [10e](../05-checkpoints/architecture-checkpoint-10e.md)

---

## 1. Ziel der Analyse

- 14 verbleibende Top-Level-Seiten unter `src/pages/` analysieren und Ziel-Feature-Domains zuordnen.
- **Keine** Migration in dieser Etappe.
- **Keine** Routenänderungen.
- **Keine** Textänderungen.
- **Keine** i18n-Textmigration.
- **Keine** Asset-Verschiebungen.
- Reine Dokumentation als Vorbereitung für Etappen 11b–11e.

---

## 2. Aktuelle Dateien und Ziel-Domains

| Aktuelle Datei | Aktuelle Route | Funktion / Inhalt | Ziel-Domain | Zielpfad | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|---|
| `Index.tsx` | `/` | Startseite mit Hero, Stats, ContentBlocks, Persona-Switch | `home` | `src/features/home/pages/IndexPage.tsx` | Move + Rename | **hoch** | Zentrale Seite, importiert 6 Persona-Komponenten und 5 generische Blöcke |
| `UeberTCS.tsx` | `/ueber-tcs` | Unternehmensvorstellung, Werte, Geschichte | `home` | `src/features/home/pages/UeberTCSPage.tsx` | Move + Rename | mittel | Hartcodierter Marketingtext, externe Bild-URLs |
| `Akademie.tsx` | `/akademie` | Schulungs-/Trainingsangebot | `wissen` | `src/features/wissen/pages/AkademiePage.tsx` | Move + Rename | niedrig | Eine Datei, klare Domain |
| `Downloads.tsx` | `/downloads` | Datenblätter, Anleitungen, Broschüren | `service` | `src/features/service/pages/DownloadsPage.tsx` | Move + Rename | niedrig | Größte Service-Seite, viele interne Links |
| `TechnischerSupport.tsx` | `/technischer-support` | Support-Kontakt, Hotline, Ticket | `service` | `src/features/service/pages/TechnischerSupportPage.tsx` | Move + Rename | niedrig | Hartcodierte Telefonnummern/Mailadressen |
| `Ersatzteile.tsx` | `/ersatzteile` | Ersatzteilbestellung, Verweise | `service` | `src/features/service/pages/ErsatzteilePage.tsx` | Move + Rename | niedrig | Verlinkt ggf. später externes Shop-System |
| `PlanenKonfigurieren.tsx` | `/planen-konfigurieren` | Tools/Konfiguratoren-Übersicht | `service` | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Move + Rename | mittel | Verweist später ggf. auf externe Konfiguratoren (Elbridge etc.) |
| `Serviceportal.tsx` | `/serviceportal` | Login-Maske + Kachelgrid (Prototyp) | `serviceportal` | `src/features/serviceportal/pages/ServiceportalPage.tsx` | Move + Rename | **hoch** | Wirkt funktional, hat aber **kein echtes Auth-Backend** |
| `Registrieren.tsx` | `/serviceportal/registrieren` | Registrierungs-Formular (Prototyp) | `serviceportal` | `src/features/serviceportal/pages/RegistrierenPage.tsx` | Move + Rename | **hoch** | Frontend-Form ohne Persistenz |
| `PasswortVergessen.tsx` | `/serviceportal/passwort-vergessen` | Passwort-Reset (Prototyp) | `serviceportal` | `src/features/serviceportal/pages/PasswortVergessenPage.tsx` | Move + Rename | **hoch** | Frontend-Form ohne Persistenz |
| `Kontakt.tsx` | `/kontakt` | Kontaktdaten, Adressen, Form | `kontakt` | `src/features/kontakt/pages/KontaktPage.tsx` | Move + Rename | niedrig | Eigenständige Domain, stabiler Inhalt |
| `Karriere.tsx` | `/karriere` | Karriere-Übersicht, Werte, Stellen | `karriere` | `src/features/karriere/pages/KarrierePage.tsx` | Move + Rename | niedrig | Eigenständige Domain |
| `Presse.tsx` | `/presse` | Pressemitteilungen, Downloads | `presse` | `src/features/presse/pages/PressePage.tsx` | Move + Rename | niedrig | Eigenständige Domain |
| `NotFound.tsx` | `*` | 404-Fallback | `app/shared` | `src/app/NotFound.tsx` *oder* `src/shared/components/NotFound.tsx` | Move | niedrig | Keine Feature-Zuordnung sinnvoll, gehört zur App-Shell |

**Summe:** 14 Dateien → 9 Ziel-Domains (`home`, `wissen`, `service`, `serviceportal`, `kontakt`, `karriere`, `presse`, `app/shared`).

---

## 3. Service / Wissen / Serviceportal unterscheiden

| Domain | Definition | Inhalte |
|---|---|---|
| **service** | Operative Hilfe rund um Produkt und Projekt | Support, Downloads, Ersatzteile, Planen/Konfigurieren |
| **wissen** | Bildung, Know-how, Schulungen | Akademie (später ggf. Webinare, Whitepaper, Glossar) |
| **serviceportal** | Geschützter / personalisierter Bereich (aktuell Prototyp) | Serviceportal-Einstieg, Registrieren, Passwort vergessen |

### Wichtige Klarstellungen

- **Serviceportal** ist heute nur Einstiegs-/Kachelbereich mit Login-Maske als UI-Mock — **kein echtes Backend, keine Session, keine Persistenz**.
- **Registrierung** und **Passwort vergessen** sind aktuell **reine Prototyp-/Frontend-Seiten** ohne Auth-Logik.
- Echte Auth, Kundenkonto, Elbridge, Produktkatalog, Konfiguratoren bleiben **externe Systeme** oder werden in späteren eigenen Backend-Etappen eingeführt (nicht in 11b–11e).

---

## 4. Betroffene Assets

**Ergebnis Asset-Audit (grep nach `import .* from "@/assets/"` und `from "../assets/"` in allen 14 Seiten):**

| Asset | Importiert in | Mehrfach genutzt | Möglicher Zielpfad | Empfehlung |
|---|---|---|---|---|
| *(keine lokalen Asset-Imports)* | – | – | – | – |

**Alle 14 Restseiten verwenden ausschließlich:**
- Lucide-React-Icons (keine Asset-Datei)
- Externe Bild-URLs (`tcsag.de`, `tcsag-web.lovable.app`, `jimcdn.com`) — bleiben unverändert
- Generische Komponenten aus `src/components/` (PageLayout, AutoBreadcrumb, ui/*)

**Konsequenz:**
- **Keine** Asset-Verschiebung in 11b–11e nötig.
- **Keine** Asset-Duplizierung möglich (kein lokales Asset betroffen).
- **`src/features/{home,service,wissen,serviceportal,kontakt,karriere,presse}/assets/`** bleibt vorerst leer.

---

## 5. Betroffene Komponenten

| Komponente | Aktueller Pfad | Nutzung in Restseiten | Zielentscheidung | Risiko | Empfehlung |
|---|---|---|---|---|---|
| `PageLayout` | `src/components/PageLayout.tsx` | Akademie, Downloads, Ersatzteile, TechnischerSupport | bleibt in `src/components/` (generisch) | niedrig | Nicht verschieben |
| `AutoBreadcrumb` | `src/components/AutoBreadcrumb.tsx` | Karriere, Kontakt, PasswortVergessen, PlanenKonfigurieren, Presse, Registrieren, Serviceportal, UeberTCS | bleibt in `src/components/` (generisch) | niedrig | Nicht verschieben |
| `HeroSection` | `src/components/HeroSection.tsx` | Index | bleibt in `src/components/` | niedrig | Nicht verschieben |
| `StatsSection` | `src/components/StatsSection.tsx` | Index | bleibt in `src/components/` | niedrig | Nicht verschieben |
| `ContentBlocks` | `src/components/ContentBlocks.tsx` | Index | bleibt in `src/components/` | niedrig | Nicht verschieben |
| `PersonaSection` | `src/components/PersonaSection.tsx` | Index | bleibt in `src/components/` | niedrig | Nicht verschieben |
| `CTASection` | `src/components/CTASection.tsx` | Index | bleibt in `src/components/` | niedrig | Nicht verschieben |
| Persona-Komponenten | `src/features/personas/*/components/` | Index (6 Imports) | bereits migriert (9b) | niedrig | Pfade bleiben korrekt nach Move von Index |
| shadcn `ui/*` (Card, Button, Sheet, Input, Label, Checkbox etc.) | `src/components/ui/*` | Downloads, TechnischerSupport, Serviceportal, Registrieren, PasswortVergessen, Kontakt | bleibt in `src/components/ui/` | niedrig | Nicht verschieben |
| Formulare (Kontakt, Registrieren, PasswortVergessen) | inline in Pages | nur in jeweiliger Page | bleiben **inline** in Page | mittel | Nicht in eigene Komponenten extrahieren — Scope wäre Refactoring, nicht Migration |

**Regel:** In 11b–11e werden **keine Komponenten verschoben**. Nur Pages werden bewegt.

---

## 6. App.tsx / Routing

### Betroffene App.tsx-Imports (Zeilen 11, 39–52)

```ts
import Index from "./pages/Index.tsx";              // → @/features/home/pages/IndexPage
import NotFound from "./pages/NotFound.tsx";        // → @/app/NotFound (oder @/shared/...)
import Kontakt from "./pages/Kontakt.tsx";          // → @/features/kontakt/pages/KontaktPage
import Karriere from "./pages/Karriere.tsx";        // → @/features/karriere/pages/KarrierePage
import Presse from "./pages/Presse.tsx";            // → @/features/presse/pages/PressePage
import UeberTCS from "./pages/UeberTCS.tsx";        // → @/features/home/pages/UeberTCSPage
import PlanenKonfigurieren from "./pages/PlanenKonfigurieren.tsx"; // → @/features/service/pages/PlanenKonfigurierenPage
import Downloads from "./pages/Downloads.tsx";      // → @/features/service/pages/DownloadsPage
import TechnischerSupport from "./pages/TechnischerSupport.tsx";   // → @/features/service/pages/TechnischerSupportPage
import Akademie from "./pages/Akademie.tsx";        // → @/features/wissen/pages/AkademiePage
import Ersatzteile from "./pages/Ersatzteile.tsx";  // → @/features/service/pages/ErsatzteilePage
import Serviceportal from "./pages/Serviceportal.tsx";             // → @/features/serviceportal/pages/ServiceportalPage
import PasswortVergessen from "./pages/PasswortVergessen.tsx";     // → @/features/serviceportal/pages/PasswortVergessenPage
import Registrieren from "./pages/Registrieren.tsx";               // → @/features/serviceportal/pages/RegistrierenPage
```

### Routen — bleiben byte-identisch

```
/                                        (Index)
*                                        (NotFound)
/kontakt
/karriere
/presse
/ueber-tcs
/planen-konfigurieren
/downloads
/technischer-support
/akademie
/ersatzteile
/serviceportal
/serviceportal/passwort-vergessen
/serviceportal/registrieren
```

- **Keine** Slug-Reform.
- **Keine** Redirects.
- **Keine** `/de`-/`/en`-Routen.
- JSX-Variablennamen in `App.tsx` bleiben unverändert (nur Import-Pfade ändern sich).

---

## 7. Navigation / Footer-Bezug

### Bereits in Navigation/Footer verlinkt

| Seite | MainNavigation | Footer | MetaNavigation | Status |
|---|---|---|---|---|
| `/` | implizit (Logo) | – | – | aktiv |
| `/ueber-tcs` | – | Spalte „Unternehmen" | – | aktiv |
| `/kontakt` | – | Spalte „Unternehmen" | Meta | aktiv |
| `/karriere` | – | Spalte „Unternehmen" | – | aktiv |
| `/presse` | – | Spalte „Unternehmen" | – | aktiv |
| `/akademie` | – | Spalte „Services" (`pending`) | – | **pending** |
| `/downloads` | – | Spalte „Services" | – | aktiv |
| `/technischer-support` | – | Spalte „Services" | – | aktiv |
| `/ersatzteile` | – | Spalte „Services" (`pending`) | – | **pending** |
| `/planen-konfigurieren` | – | Spalte „Services" (`pending`) | – | **pending** |
| `/serviceportal` | – | – | Meta | aktiv |
| `/serviceportal/registrieren` | – | – | – | nur direkter URL-Aufruf |
| `/serviceportal/passwort-vergessen` | – | – | – | nur direkter URL-Aufruf |

### Regel

- **Linkkorrekturen erfolgen NICHT in 11b–11e.**
- **Footer-Link-Fixes** (5 Anwendungen-Pendings, 3 Bottom-Bar-Legal, Produkte-Dubletten, Services-Pendings) bleiben **eigene spätere Etappe** nach Abschluss aller Strukturmigrationen.
- `mainNavigation.ts`, `footerNavigation.ts`, `personaNavigation.ts`, `metaNavigation.ts` bleiben in 11b–11e **unangetastet**.

---

## 8. i18n-Bezug

- **Navigation-i18n** (DE/EN) ist seit 4i aktiv — bleibt unverändert.
- **Seitentexte** dieser 14 Restseiten sind aktuell **hartcodiert** (DE).
- **Spätere Namespaces** (NICHT in 11b–11e):
  - `pages/home.json`
  - `pages/service.json`
  - `pages/wissen.json`
  - `pages/serviceportal.json`
  - `pages/kontakt.json`
  - `pages/karriere.json`
  - `pages/presse.json`
- **Keine** Textmigration in 11a/11b/11c/11d/11e — Scope strikt technisch.

---

## 9. Risiken und Schutzmaßnahmen

| Risiko | Beschreibung | Schutzmaßnahme |
|---|---|---|
| **Serviceportal wirkt funktional** | Login-Maske und Kachelgrid suggerieren Backend, das nicht existiert | Migration unverändert, keine Backend-Anbindung in 11d. Hinweis im Cleanup-Bericht. Markierung als Prototyp ist eigene spätere Etappe. |
| **Registrieren / PasswortVergessen täuschen Stakeholder** | Form-Submits wirken funktional, persistieren aber nichts | Inhalt **nicht ändern**. Optionale Prototyp-Markierung später (eigene Etappe). |
| **PlanenKonfigurieren** | Verweist später ggf. auf externe Konfiguratoren (Elbridge, tcsplan) | Migration als reine Page, keine Tool-Integration in 11c. |
| **Downloads** | Listen sind hartcodiert, brauchen später ggf. Supabase/Storage | Migration unverändert. CMS/Storage-Anbindung ist eigene spätere Etappe. |
| **Akademie / Karriere / Presse** | Können später externe Datenquellen / CMS bekommen | Migration unverändert, keine Datenquellen-Integration. |
| **NotFound** | Sollte nicht in Feature-Domain landen | Ziel: `src/app/NotFound.tsx` oder `src/shared/components/NotFound.tsx`. Entscheidung in 11e. |
| **Index (Home)** | Zentralste Seite, importiert 6 Persona-Komponenten + 5 generische Blöcke | Vorsichtige Einzeletappe (11e). Persona-Imports bleiben korrekt (bereits in 9b migriert). Build sofort verifizieren. |
| **AutoBreadcrumb-Slug-Maps** | Breadcrumb-Labels sind in `AutoBreadcrumb.tsx` zentral gepflegt | `AutoBreadcrumb.tsx` **nicht** anfassen. Routen bleiben byte-identisch → Labels bleiben korrekt. |
| **App.tsx-Order** | 14 Imports und 14 Route-Einträge müssen synchron umgestellt werden | Pro Etappe nur die jeweils betroffenen Importe ändern, JSX-Refs unverändert lassen. |

---

## 10. Empfehlung für nächste technische Etappen

### Split-Empfehlung (klar nach Risiko und Größe sortiert)

| Etappe | Scope | Dateien | Risiko | Anschluss-Cleanup |
|---|---|---|---|---|
| **11b** | Kleine Einzelseiten | `Kontakt`, `Karriere`, `Presse`, `Akademie` (4 Pages, 4 Domains) | niedrig | 11b-cleanup |
| **11c** | Service-Domain | `Downloads`, `TechnischerSupport`, `Ersatzteile`, `PlanenKonfigurieren` (4 Pages, 1 Domain) | niedrig–mittel | 11c-cleanup |
| **11d** | Serviceportal-Domain | `Serviceportal`, `Registrieren`, `PasswortVergessen` (3 Pages, 1 Domain) | mittel (Prototyp-Charakter) | 11d-cleanup |
| **11e** | Home + App-Shell | `Index`, `UeberTCS`, `NotFound` (3 Pages) | hoch (zentral) | 11e-cleanup |
| **11f** | Architektur-Checkpoint nach Restseiten-Migration | `docs/architecture-checkpoint-11f.md` | – | – |

### Constraints für alle Etappen 11b–11e

- **Keine** Textänderungen.
- **Keine** Linkkorrekturen.
- **Keine** Backend-Anbindung.
- **Keine** Asset-Verschiebungen.
- **Keine** Komponenten-Extraktion (Formulare bleiben inline).
- **Keine** i18n-Textmigration.
- **Keine** Slug-/Routenänderungen.
- **Pro Etappe**: Pages verschieben + `App.tsx`-Imports anpassen + Build verifizieren + Cleanup-Etappe.

### Bewusst NICHT in 11b–11e enthalten

- Footer-Pending-Link-Fixes (eigene spätere Etappe nach Abschluss aller Strukturmigrationen)
- Eingangssysteme-Subrouten-Auflösung
- Inhaltliche Konsolidierung von `anwendungen` (siehe 10e)
- Seitentext-i18n (Namespaces je Domain)
- `/de`-/`/en`-Routing
- Auth/Backend für Serviceportal
- CMS/Storage für Downloads/Presse/Karriere
- `@tanstack/query-core`-Build-Hinweis (nicht migrationsbedingt)
