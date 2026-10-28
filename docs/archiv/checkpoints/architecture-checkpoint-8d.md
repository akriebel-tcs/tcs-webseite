# Architektur-Checkpoint 8d

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


Stand nach fünf migrierten Feature-Domains und aktiver Navigations-/i18n-Datenstruktur.
Diese Datei ist reine Dokumentation. Es wurde kein Produktivcode geändert.

Vorgänger-Checkpoint: [`docs/architecture-checkpoint-5d.md`](./architecture-checkpoint-5d.md)
Zielbild: [`docs/architecture.md`](../02-architecture/architecture.md)
Migrations-Mapping: [`docs/migration-mapping.md`](../03-inventories/migration-mapping.md)
Asset-Strategie: [`docs/asset-strategy.md`](../01-strategy/asset-strategy.md)
Migrationschronologie: [`docs/migration-log.md`](../migration-log.md)

---

## 1. Aktueller Stand

### Migrierte Feature-Domains
- `zutrittskontrolle` (Etappen 3a–3c)
- `eingangssysteme` (Etappen 5a–5c)
- `gebaeudemanagement` (Etappen 6a–6c)
- `gebaeudekommunikation` (Etappen 7a–7c)
- `signage` (Etappen 8a–8c)

### Noch nicht in Feature-Domains migrierte Bereiche
- `anwendungen/` (~21 Pages, stark mit Personas und shared Assets verflochten)
- `personas/` (Architekt, Bauherr, Fachhandel, Fachplaner, Handwerk, Wohnungswirtschaft – Content-Komponenten in `src/components/`, shared Assets)
- `service/` (PlanenKonfigurieren, Downloads, TechnischerSupport, Ersatzteile)
- `wissen/` (Akademie)
- `kontakt/`, `karriere/`, `presse/` (jeweils Einzelseite)
- `serviceportal/` (Serviceportal, Registrieren, PasswortVergessen)
- `home/` (Index, UeberTCS) – Landingpage und Unternehmensseite
- `legal/` (Impressum, Datenschutz, AGB) – noch keine eigenständigen Seiten, Footer-Links sind Platzhalter (`#`)

### Stand der Navigation
- `MainNavigation`, `Footer` und `MetaNavigation` lesen vollständig aus zentralen Datenstrukturen (`src/navigation/*.ts`).
- 6 Top-Level-Items in `mainNavigation.ts`, 29 Kinder. Eingangssysteme-Subrouten und Alarmanlagenkopplung weiterhin als `pending` markiert.
- Footer: 4 Spalten mit 21 Links plus 3 Bottom-Bar-Links (24 gesamt). 12 Einträge weiterhin als `placeholder`/`pending` (5 Service-`#`-Links, 3 Legal, 1 Datenschutz, 3 Produkte-Dubletten).
- 6 Persona-Items + 4 Meta-Links in `personaNavigation.ts`/`metaNavigation.ts`.
- `routes.ts` deckt alle aktiven Routen ab; Slugs unverändert.

### Stand der i18n-Struktur
- `i18next` + `react-i18next` initialisiert (Etappe 2).
- Namespaces aktiv: `common`, `navigation`.
- DE/EN-Locales für `navigation` strukturell identisch (je 106 Keys, Etappe 4j).
- Sichtbare Sprache weiterhin DE; kein Sprachumschalter, keine `/de`-/`/en`-Routen.
- Seitentexte (Hero, Sections, Cards, Personas, Anwendungen) sind noch hartcodiert.

### Stand der Asset-Strategie
- Regel „Assets folgen Features" wird konsequent umgesetzt: jede migrierte Domain hat einen eigenen `assets/`-Ordner (mit Themen-Unterordnern).
- Domain-exklusive Assets liegen unter `src/features/<domain>/assets/...`.
- Echte shared Assets (in mehreren Domains oder in Persona-/Hero-/Block-Komponenten verwendet) verbleiben bewusst in `src/assets/`.
- Shared Assets aktuell u. a.: `block-kommunikation.jpg`, `block-signage.jpg`, `block-gebaeudemanagement.jpg` (über Personas), `signage-hero.jpg` (von `TuerkommunikationPage` und Beschilderung), Hero-Bilder der Startseite, Persona-Portraits.

---

## 2. Migrierte Domains im Detail

| Domain | Pages | Assets | Bemerkung |
|---|---|---|---|
| `zutrittskontrolle` | 5 | 11 (in 5 Themen-Unterordnern) | Pilot-Domain. Generische Komponenten (PageLayout etc.) bewusst in `src/components/` belassen. Cleanup entfernte 1 ungenutzten Import + 1 zugehöriges Asset. |
| `eingangssysteme` | 8 | 1 lokal (`hero-entry.jpg`) | 42 externe `jimcdn.com`-Bild-URLs sind außerhalb des Move-Scope geblieben und weiterhin offen. Naming-Bewusstsein: deutsche Domain ↔ englische Route `/entry-system`. |
| `gebaeudemanagement` | 5 | 13 (in 4 Themen-Unterordnern + 1 Root-Asset) | Datei-Tippfehler `SchraenkeBelhaelter` → `SchraenkeBehaelter` korrigiert. Slug `/schraenke-behaelter` unverändert. |
| `gebaeudekommunikation` | 6 | 26 (in 5 Themen-Unterordnern) | Shared Assets `block-kommunikation.jpg` und `signage-hero.jpg` bewusst in `src/assets/` belassen. Grenzfälle (Beschilderung, Signage, anwendungen/Grossanlage) nicht angefasst. |
| `signage` | 2 | 4 (Unterordner `beschilderung/`) | Shared Assets `signage-hero.jpg` und `block-signage.jpg` bewusst in `src/assets/` belassen. BCM-Seiten `DigitalSignage`/`DigitaleNamensanzeige` bleiben in `gebaeudemanagement`. Inhaltliche Dublette `/beschilderung` ↔ `/signage` nicht aufgelöst. |

Cleanup-Status: Nach allen fünf Domains sind keine ungenutzten Imports mehr offen (oxlint sauber).

---

## 3. Bewusst offen gelassene Strukturfragen

- **`/signage` vs. `/beschilderung`**: ~80–90 % thematische Überschneidung. Keine technische Konsolidierung; Marketing-/Content-Entscheidung steht aus.
- **DigitalSignage und DigitaleNamensanzeige bleiben bei `gebaeudemanagement`**: BCM-/Slug-Bindung an `/gebaeudemanagement/...`. Spätere Verschiebung nach `signage` möglich, aber nicht zwingend.
- **Footer-Link-Fixes weiterhin offen**: 12 `placeholder`/`pending`-Einträge (5 Service-`#`, 3 Legal, 1 Datenschutz, 3 Produkte-Dubletten); werden separat dokumentiert.
- **MainNavigation-Subrouten bei Eingangssysteme weiterhin pending**: `Material`, `Funktionalität`, `Integrationsformen`, `Standards` sind in `mainNavigation.ts` als `pending` markiert, obwohl die Pages als Feature-Domain existieren – Linkfreigabe ist Produkt-/Marketing-Frage.
- **Seitentext-i18n noch offen**: nur Navigation und Footer sind über `i18next`. Hero, Sections, Persona-Content, Anwendungen sind weiterhin hartcodiert in DE.
- **`/de`-/`/en`-Routing noch offen**: kein Sprachumschalter, keine Locale-Prefixes, keine SEO-Ausspielung.
- **Admin/CMS/Supabase Storage noch offen**: kein Backend, keine redaktionelle Pflege; alles statisch im Repo.
- **Produktkatalog/Downloads separat**: Downloads-/Ersatzteile-/Datenblatt-Listen sind statische Pages und noch nicht datengetrieben.
- **Build-Hinweis `@tanstack/query-core`**: vorbestehend seit Etappe 6c, nicht migrationsbedingt; wird separat dokumentiert.

---

## 4. Noch nicht migrierte Bereiche

| Bereich | Erwarteter Umfang | Risiko | Empfehlung |
|---|---|---|---|
| `personas` | 6 Persona-Content-Komponenten (`ArchitektenContent`, `BauherrenContent`, `FachhandelContent`, `FachplanerContent`, `HandwerkContent`, `WohnungswirtschaftContent`) + Persona-Portraits + viele shared Assets (block-*-Bilder) + `PersonaContext`, `PersonaSection`, `MetaNavigation`-Anbindung | **Hoch.** Persona-Komponenten sind Hauptkonsumenten der shared Assets (`block-kommunikation.jpg`, `block-signage.jpg`, `block-gebaeudemanagement.jpg` u. a.). Eine Auflösung dieser Verflechtung erleichtert spätere Asset-Bereinigungen erheblich. | **Als nächstes planen** (Etappe 9a). |
| `anwendungen` | ~21 Pages (`Wohnbau`, `Einfamilienhaus`, `Mehrfamilienhaus`, `Grossanlage`, `Sanierung`, `Pflege`, `Klinik`, `Behoerde`, `Feuerwehr`, `Schwimmbad`, `Concierge`, `InterneKommunikation`, `DigitaleNamensverwaltung`, `Feuerwehrdurchsage`, `BidirektionaleVideo`, `MobileTuerkommunikation`, `ZutrittskontrolleBCM`, `Gesundheitseinrichtungen`, `OeffentlicheHand`, `Referenzprojekte`, `ReferenzprojektDetail`) + `Anwendungen` Übersicht + `Bildungseinrichtungen` + `Objektloesungen` + `data/referenzprojekte.ts` + `AnwendungDetailPage`-Komponente | **Hoch.** Viele Pages teilen Bildmaterial mit Personas und Domain-Welten. `ZutrittskontrolleBCM`, `MobileTuerkommunikation`, `BidirektionaleVideo`, `Feuerwehrdurchsage`, `Grossanlage`, `DigitaleNamensverwaltung` haben fachliche Nähe zu bereits migrierten Domains. | **Nach Personas planen** (Etappe 10a). |
| `service` | 4 Pages (`PlanenKonfigurieren`, `Downloads`, `TechnischerSupport`, `Ersatzteile`) | Niedrig–mittel. Statische Inhalte, voraussichtlich wenige domain-exklusive Assets. | **Nach `anwendungen` planen** (gemeinsam mit `wissen`). |
| `wissen` | 1 Page (`Akademie`) | Niedrig. | **Gemeinsam mit `service` planen.** |
| `kontakt` | 1 Page (`Kontakt`) | Niedrig. Kann im Block „Sonstige" gemeinsam migriert werden. | **Später**, nach `service`/`wissen`. |
| `karriere` | 1 Page (`Karriere`) | Niedrig. | **Später.** |
| `presse` | 1 Page (`Presse`) | Niedrig. | **Später.** |
| `serviceportal` | 3 Pages (`Serviceportal`, `Registrieren`, `PasswortVergessen`) | Niedrig–mittel. Formulare ohne Backend; rein statisch. Spätere Backend-Anbindung (Lovable Cloud) wäre eigene Etappe. | **Später.** |
| `legal` (Impressum, Datenschutz, AGB) | Aktuell **keine eigenständigen Seiten** im Repo; Footer-Links zeigen auf `#`. | Niedrig technisch, aber Compliance-relevant. | **Erst nach fachlicher Klärung** (Inhalte/Texte vom Kunden nötig). |

---

## 5. Empfehlung für nächste Etappe

**Empfohlene Reihenfolge:**

1. **Etappe 9a: `personas` planen** (reine Analyse, kein Code).
2. Etappe 9b/9c: `personas` migrieren und cleanen.
3. Etappe 10a–c: `anwendungen` planen, migrieren, cleanen.
4. Etappe 11: `service` und `wissen` gemeinsam planen/migrieren.
5. Footer-Link-Fixes als separate Doku-Etappe (Mapping `#` → korrekte Routen oder Entscheidung „bleibt Platzhalter").
6. Build-/Dependency-Thema `@tanstack/query-core` als separate Doku-Etappe.

**Begründung Reihenfolge `personas` zuerst:**
Die Persona-Content-Komponenten in `src/components/` sind aktuell die größten Verbraucher der shared Assets in `src/assets/` (insbesondere `block-*.jpg` und themenbezogene Block-Bilder). Solange Personas nicht in eine eigene Feature-Domain überführt sind, bleiben viele Assets künstlich „shared". Eine geordnete Personas-Migration:
- klärt die echten Verbraucher der Block-Bilder,
- ermöglicht spätere präzisere Asset-Zuordnung in `anwendungen`,
- reduziert das Risiko bei der größten verbleibenden Domain (`anwendungen` mit 21 Pages),
- legt das Fundament für i18n-Migration der Persona-Content-Texte.

`anwendungen` ist die größte und am stärksten querverflochtene Domain – sie zuletzt unter den Produkt-/Themenwelten zu migrieren ist sicherer.

---

## 6. Leistungsdokumentation

> Strukturelle Neuordnung der TCS-Webseiten-Codebasis in Feature-Domains, Aufbau zentraler Navigations- und i18n-Struktur, Migration von fünf Produkt-/Themenwelten sowie Dokumentation offener fachlicher Strukturentscheidungen.

Konkret umgesetzt seit Projektbeginn:
- Architektur-, Mapping-, Asset- und Navigations-Inventardokumentation.
- Aufbau `src/features/`, `src/navigation/`, `src/shared/`, `src/i18n/`, `src/tools/`.
- i18n-Grundgerüst (DE/EN) mit Namespaces `common` und `navigation`, sichtbar aktiv für Navigation/Footer/Meta.
- Datengetriebene Navigation (`mainNavigation`, `footerNavigation`, `personaNavigation`, `metaNavigation`, `routes`) mit Typsystem (`NavItem`, `LinkType`, `Badge`, `PersonaItem`).
- Migration von fünf Feature-Domains (`zutrittskontrolle`, `eingangssysteme`, `gebaeudemanagement`, `gebaeudekommunikation`, `signage`) inklusive Asset-Reorganisation in domain-eigene Themen-Unterordner.
- Cleanup-Etappen ohne offene ungenutzte Imports (oxlint sauber).
- Bewusste, dokumentierte Nicht-Migrationen (Grenzfälle, shared Assets, BCM-Bindungen).

Routenstabilität: Alle öffentlichen URLs sind seit Projektbeginn byte-identisch geblieben.
