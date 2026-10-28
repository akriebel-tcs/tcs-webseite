# Architektur-Checkpoint 11f — Nach vollständiger `src/pages/`-Migration

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


**Datum:** 2026-04-21
**Etappe:** 11f (reine Dokumentation, keine Codeänderung)
**Vorgänger-Checkpoints:** [`5d`](./architecture-checkpoint-5d.md), [`8d`](./architecture-checkpoint-8d.md), [`10e`](./architecture-checkpoint-10e.md)

---

## 1. Statusübersicht

- `src/pages/` ist **vollständig entfernt**.
- Alle bisherigen Seiten wurden in **Feature-Domains** (`src/features/<domain>/pages/`) oder unter `src/app/pages/` überführt.
- **Routen wurden während der Migration bewusst nicht geändert** — alle URLs sind byte-identisch zum Ausgangszustand.
- **Navigation, Footer, MetaNavigation und i18n-Locales** blieben während der gesamten Strukturmigration stabil.
- **Keine Slug-Reform.**
- **Keine `/de`-/`/en`-Routen** angelegt.
- **Keine Backend-/Auth-/Supabase-Integration.**
- App.tsx ist weiterhin die zentrale Routing-Datei (alle Routen weiterhin dort registriert).

---

## 2. Migrierte Feature-Domains

| Domain | Zielpfad | Migrierte Dateien / Bereiche | Assets verschoben | Besonderheiten / offene Punkte |
|---|---|---|---|---|
| home | `src/features/home/pages/` | `HomePage.tsx`, `UeberTCSPage.tsx` | nein | Home-Sections (Hero/Stats/Content/Persona/CTA) bleiben in `src/components/`; spätere Konsolidierung möglich. |
| personas | `src/features/personas/{bauherr,architekt,wohnungswirtschaft,fachplaner,handwerk,fachhandel}/components/` | 8 Persona-Content-Komponenten (inkl. `WoWiHero`, `WoWiDetailSections`) | nein (4 shared Assets bleiben in `src/assets/`) | Inhaltliche Konsolidierung offen; PersonaShell/PersonaLinkGrid bewusst verschoben. |
| zutrittskontrolle | `src/features/zutrittskontrolle/pages/` + `assets/` | 5 Pages | ja (12 Assets in 5 Unterordnern) | Abgeschlossen, Cleanup erfolgt. |
| eingangssysteme | `src/features/eingangssysteme/pages/` + `assets/` | 8 Pages | ja (1 Asset `hero-entry.jpg`) | Externe `jimcdn.com`-URLs unverändert; MainNavigation-Unterpunkte fachlich offen. |
| gebaeudemanagement | `src/features/gebaeudemanagement/pages/` + `assets/` | 5 Pages (inkl. `DigitalSignagePage`, `DigitaleNamensanzeigePage`) | ja (13 Assets in 4 Unterordnern + 1 Root) | BCM-Bindung Digital Signage / Namensanzeige bewusst hier (nicht in `signage`). |
| gebaeudekommunikation | `src/features/gebaeudekommunikation/pages/` + `assets/` | 6 Pages (inkl. `SnipdooIpPage`) | ja (26 Assets in 5 Unterordnern) | Shared Assets (`block-kommunikation`, `signage-hero`) bleiben in `src/assets/`. |
| signage | `src/features/signage/pages/` + `assets/beschilderung/` | 2 Pages (`BeschilderungPage`, `SignagePage`) | ja (4 Assets) | Inhaltliche Dublette `Beschilderung` ↔ `Signage` weiterhin offen (Marketing-Entscheidung). |
| anwendungen | `src/features/anwendungen/{pages,components,data}/` | 24 Pages + `AnwendungDetailPage` + `referenzprojekte.ts` | nein (2 Asset-Imports unverändert in `src/assets/`) | Fachliche Überschneidungen mit Produktdomains; Referenzprojekte ggf. später datengetrieben. |
| service | `src/features/service/pages/` | 4 Pages (`Downloads`, `TechnischerSupport`, `Ersatzteile`, `PlanenKonfigurieren`) | nein | Spätere Konfigurator-/Shop-/Download-Anbindung offen. |
| wissen | `src/features/wissen/pages/` | `AkademiePage.tsx` | nein | Bisher nur Akademie; weitere Wissens-Seiten möglich. |
| kontakt | `src/features/kontakt/pages/` | `KontaktPage.tsx` | nein | Formular bleibt inline (kein Backend). |
| karriere | `src/features/karriere/pages/` | `KarrierePage.tsx` | nein | — |
| presse | `src/features/presse/pages/` | `PressePage.tsx` | nein | — |
| serviceportal | `src/features/serviceportal/pages/` | 3 Pages (`Serviceportal`, `Registrieren`, `PasswortVergessen`) | nein | **Reiner Frontend-Prototyp**, keine Auth/Supabase. |
| app/pages | `src/app/pages/` | `NotFoundPage.tsx` | nein | Generischer App-Bereich (nicht Feature-Domain). |

---

## 3. Aktuelle Zielstruktur (grob)

```
src/
├── app/
│   └── pages/
│       └── NotFoundPage.tsx
├── features/
│   ├── home/pages/
│   ├── personas/
│   │   ├── architekt/components/
│   │   ├── bauherr/components/
│   │   ├── fachhandel/components/
│   │   ├── fachplaner/components/
│   │   ├── handwerk/components/
│   │   ├── wohnungswirtschaft/components/
│   │   └── shared/
│   ├── anwendungen/{pages,components,data}/
│   ├── service/pages/
│   ├── serviceportal/pages/
│   ├── gebaeudekommunikation/{pages,assets}/
│   ├── gebaeudemanagement/{pages,assets}/
│   ├── eingangssysteme/{pages,assets}/
│   ├── zutrittskontrolle/{pages,assets}/
│   ├── signage/{pages,assets}/
│   ├── kontakt/pages/
│   ├── karriere/pages/
│   ├── presse/pages/
│   └── wissen/pages/
├── navigation/
│   ├── mainNavigation.ts
│   ├── footerNavigation.ts
│   ├── personaNavigation.ts
│   ├── metaNavigation.ts
│   ├── routes.ts
│   └── types.ts
├── i18n/
│   ├── index.ts
│   └── locales/{de,en}/{common,navigation}.json
├── components/        # Generische + shadcn-ui Komponenten
├── assets/            # Shared Assets (von mehreren Domains genutzt)
├── contexts/PersonaContext.tsx
├── App.tsx            # Zentrale Routing-Datei
└── main.tsx
```

`src/pages/` existiert nicht mehr.

---

## 4. Was bewusst NICHT geändert wurde

- **Keine sichtbaren Texte** in den migrierten Seiten geändert.
- **Keine Layouts** geändert (kein Redesign, keine Konsolidierung).
- **Keine Routen** geändert — alle URLs byte-identisch.
- **Keine URL-/Slug-Reform** (z. B. `/anwendungen/grossanlage` vs. `/grossanlagen`).
- **Keine Navigation-Linkkorrekturen** (Footer-Pending-Links bleiben).
- **Keine Footer-Linkkorrekturen** (12 `placeholder`/`pending`-Einträge bleiben).
- **Keine i18n-Textmigration der Seitentexte** (nur Navigation-i18n DE/EN aktiv).
- **Keine Supabase-Anbindung.**
- **Keine echte Auth** (Serviceportal/Registrieren/PasswortVergessen sind Frontend-Prototypen).
- **Keine Backendlogik.**
- **Keine Konfiguratoren integriert** (PlanenKonfigurieren bleibt statisch).
- **Keine Produktkatalog-/Download-Datenbank** integriert.
- **Keine App.tsx-Dezentralisierung** (alle Routen weiterhin zentral).

---

## 5. Offene technische Themen

- **App.tsx** ist weiterhin zentrale Routing-Datei mit allen Routen.
- Spätere **Routing-Dezentralisierung pro Feature-Domain** sinnvoll (Domain exportiert eigene Routes).
- **Footer-Link-Fixes** offen (12 `placeholder`/`pending`-Einträge laut Etappe 4d).
- **MainNavigation-Unterlinks / Sprungziele** offen, besonders Eingangssysteme (4 nicht aufgelöste Sublinks laut Etappe 4a).
- **URL-/Slug-Konzept** offen (Singular/Plural-Inkonsistenzen, Anwendungssicht ↔ Produktsicht).
- **`/de`-/`/en`-Routing** offen.
- **Seitentext-i18n** offen (nur Navigation-Namespace ist aktiv).
- **Build-Hinweis `@tanstack/query-core`** offen (vorbestehend seit Etappe 6c, nicht migrationsbedingt).
- **`package.json`-Name** ggf. noch Lovable-Default — prüfen.
- **Doppelte Toaster / Sonner-Prüfung** offen (`<Toaster />` und `<Sonner />` in App.tsx).
- **Temporäre Vite-Dateien / `.gitignore`** prüfen.
- **Bundle-Größe / Code-Splitting** später prüfen (aktuell keine Lazy-Routes).

---

## 6. Offene fachliche / inhaltliche Themen

- **Signage vs. Beschilderung** fachlich noch zu prüfen (zwei Seiten, ~80–90 % Themenüberschneidung — Marketing-/Produktentscheidung).
- **`DigitalSignage` / `DigitaleNamensanzeige`** bleiben aktuell bei `gebaeudemanagement` (BCM-Slug-Bindung). Spätere Verschiebung in `signage` denkbar, aber nicht entschieden.
- **Anwendungen** haben fachliche Überschneidungen mit Produkt-/Systemdomains (`Grossanlage` Singular ↔ `Grossanlagen` Plural; `MobileTuerkommunikation`, `BidirektionaleVideo`, `Feuerwehrdurchsage`, `InterneKommunikation` ↔ `gebaeudekommunikation/systemloesungen`; `ZutrittskontrolleBCM` ↔ `zutrittskontrolle`; `DigitaleNamensverwaltung` ↔ `gebaeudemanagement/DigitaleNamensanzeige`).
- **Serviceportal** wirkt wie Account-Bereich, ist aber nur **Prototyp** (kein Backend, keine echten Daten).
- **Downloads / Ersatzteile / Konfiguratoren** später ggf. externe Systeme oder Supabase/Storage.
- **Referenzprojekte** später ggf. datengetrieben (aktuell statische TS-Datei, 12 Datensätze).
- **Personas** sind technisch verschoben, aber **noch nicht inhaltlich konsolidiert** (kein PersonaShell, keine PersonaLinkGrid, keine Textkonsolidierung).
- **Navigation/Sprungmarken** müssen später fachlich geprüft werden (Eingangssysteme-Subrouten, Footer-Links, Persona-Verlinkungen).

---

## 7. Empfehlung nächste Arbeitsblöcke

### A. Technische Hygiene
- Build-Hinweis `@tanstack/query-core` prüfen/dokumentieren
- `package.json`-Name prüfen (ggf. Lovable-Default ersetzen)
- Doppelte Toaster/Sonner prüfen (ein Toast-System auswählen)
- Temporäre Dateien / `.gitignore` prüfen

### B. Routing-Struktur
- App.tsx-Routing dezentralisieren
- Feature-Domains exportieren eigene Routes (`<Domain>Routes.tsx`)
- Routenwerte weiterhin stabil halten (keine URL-Änderungen)

### C. Navigation / Links
- Footer-Link-Fixes (12 `placeholder`/`pending`-Einträge)
- MainNavigation-Unterlinks prüfen (echte Ziele zuordnen)
- Home-Logo-Click prüfen
- Sprungmarken / Unterbereiche prüfen
- Eingangssysteme-Unterpunkte prüfen (4 nicht aufgelöste Sublinks)

### D. URL-/Slug-Konzept
- Ist-URLs inventarisieren
- Ziel-URLs DE/EN festlegen (Singular/Plural-Inkonsistenzen klären)
- `/de`- und `/en`-Strategie definieren
- Redirect-Konzept (alte → neue Slugs)
- Sitemap / `hreflang`-Tags

### E. Seitentext-i18n
- Pro Feature Namespace planen (z. B. `personas`, `anwendungen`, `service`, …)
- Deutsche Texte aus den Pages extrahieren
- Englische Texte vorbereiten (Übersetzungen)
- **Sprachumschalter erst nach belastbarer Textbasis** aktivieren

### F. Team-Arbeitsanleitung
- Wie künftig in Lovable gepromptet werden soll
- Welche Feature-Domain im Prompt **explizit genannt werden muss**
- **Keine pauschalen „mach mal"-Prompts** — immer Domain + Scope nennen
- Assets nur nach Strukturregel (`src/features/<domain>/assets/` für domain-exklusiv, `src/assets/` für shared)
- **Keine Routenänderungen ohne Freigabe**
- **Keine Backend-/Tool-Integration ohne Konzept**

---

## 8. Leistungsdokumentation

> Strukturelle Neuordnung der TCS-Unternehmenswebseite von einer flachen Lovable-/React-Pages-Struktur in eine Feature-Domain-Architektur inkl. Navigationsdatenmodell, i18n-Grundlage, Asset-Zuordnung, Dokumentation und schrittweiser, reversibler Migration aller bestehenden Seiten.
