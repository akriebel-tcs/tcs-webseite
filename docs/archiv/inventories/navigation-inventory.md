# Navigations-Inventar (Etappe 4a)

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


> **Status:** Reine Dokumentation. Kein Code wurde geändert.
> Vollständige Inventarisierung der aktuellen Navigation als Vorbereitung für die spätere zentrale Datenstruktur unter `src/navigation/`.

Bezug:
- [`docs/architecture.md`](../02-architecture/architecture.md) – Zielarchitektur
- [`docs/migration-mapping.md`](./migration-mapping.md) – Datei-Mapping
- [`docs/migration-log.md`](../migration-log.md) – Etappenlog

---

## 1. Ziel der späteren Navigations-Zentralisierung

- **Navigation als Datenstruktur** in `src/navigation/`, nicht hartcodiert in Komponenten.
- **Komponenten rendern nur noch** (`MainNavigation`, `Footer`, `MetaNavigation` werden zu reinen Renderern über die Datenstruktur).
- **Texte über i18n-Keys** (`labelKey`, `descriptionKey`) statt direkter Strings.
- **Linktypen explizit kennzeichnen** (`internal`, `external`, `iframe`, `subdomain`) — externe Spezialtools (Konfigurator, Elbridge, Produktkatalog, 3D-Showroom) sind nicht Teil dieser Codebasis und werden über `linkType !== "internal"` geführt.
- **Feature-Domains und Navigation passen zusammen**: `targetDomain` pro NavItem dokumentiert die Zugehörigkeit zur Ziel-Feature-Domain, unabhängig vom aktuellen URL-Slug.
- **Single Source of Truth**: Routen in `App.tsx` und Navigation referenzieren später dieselben Pfade aus `src/navigation/routes.ts`.

---

## 2. Aktueller Ist-Stand

| Datei | Art | Aktuelle Struktur | Texte hartcodiert | Routen hartcodiert | Externe Links | i18n-fähig | Spätere Ziel-Datei |
|---|---|---|---|---|---|---|---|
| `src/components/MainNavigation.tsx` | Hauptnavigation (Desktop + Mobile) | Inline-Konstante `navItems` (6 Bereiche × 4–6 Kinder) | ja | ja | nein | nein | `src/navigation/mainNavigation.ts` (Daten) + dünner Renderer in `src/components/MainNavigation.tsx` |
| `src/components/MetaNavigation.tsx` | Persona-Leiste + Meta-Links (Serviceportal/Kontakt/Karriere/Presse) | Inline-Konstante `personas` + JSX-Inline-Links | ja | ja | nein | nein | `src/navigation/personaNavigation.ts` + `src/navigation/metaNavigation.ts` |
| `src/components/Footer.tsx` | Footer mit 4 Spalten + Bottom-Bar | Inline-Konstante `footerLinks` | ja | ja (z. T. `#` als Platzhalter) | nein (Impressum/AGB sind `#`) | nein | `src/navigation/footerNavigation.ts` |
| `src/components/AutoBreadcrumb.tsx` | Breadcrumb-Generator + `segmentLabels` (60+ Slugs → Label) | Inline-Map `segmentLabels` | ja | nein (liest `useLocation`) | nein | nein | später `src/navigation/segmentLabels.ts` (oder via i18n-Keys ableiten) |
| `src/components/SubNavSticky.tsx` | Sticky In-Page-Navigation für Anchor-Links | reine Renderer-Komponente, Items werden von Pages übergeben | nein (Items von außen) | nein | nein | i18n-relevant beim Aufrufer | bleibt – nur Renderer |

**Beobachtungen:**
- Keine Navigation greift heute auf eine zentrale Datei zurück.
- `Footer` enthält **6 Platzhalter `href="#"`** (Konfigurator, Downloads, TCS Akademie, Ersatzteil-Shop, Support, Datenschutz) sowie 3 weitere im Bottom-Bar (Impressum, Datenschutz, AGB).
- `Footer` enthält **3 falsche Routen**: TCS:PACKS, snipdoo®, Beschilderung verlinken alle auf `/tuerkommunikation` statt der jeweiligen Zielseite.
- `Footer` enthält **5 falsche Routen** in der Anwendungen-Spalte: Einfamilienhaus / Mehrfamilienhaus / Großanlagen / Gewerbe / Referenzen verlinken alle auf `/objektloesungen` statt auf `/anwendungen/...`.
- `MainNavigation` Gebäudemanagement enthält `Zufahrten und Parkplätze` mit href `/zutrittskontrolle/zufahrten-parkplaetze` — d. h. **bewusste Cross-Domain-Verlinkung** zwischen Gebäudemanagement und Zutrittskontrolle.
- `MainNavigation` Eingangssysteme: alle 4 Kinder verlinken auf `/entry-system` (keine eigenen Sub-Routen genutzt, obwohl `entry/Entry*.tsx` existieren).
- `MainNavigation` Anwendungen: `Bildungseinrichtungen` zeigt auf `/bildungseinrichtungen` (Top-Level), nicht auf `/anwendungen/...` wie die anderen.

---

## 3. MainNavigation-Inventar

> Datenquelle: `src/components/MainNavigation.tsx` Zeilen 7–72.
> Spalte `Linktyp` ist hier durchgängig `internal` (alle Routen zeigen auf eigene React-Routen).

### 3.1 Bereich „Gebäudekommunikation" (`/tuerkommunikation`)

| Bereich | Label | Route | Kind? | Beschreibung | Ziel-Domain | Linktyp | labelKey | descriptionKey | Hinweis / Risiko |
|---|---|---|---|---|---|---|---|---|---|
| Top | Gebäudekommunikation | `/tuerkommunikation` | nein | – | `gebaeudekommunikation` | internal | `nav.gebaeudekommunikation.label` | – | **Domain ≠ Slug.** Slug bleibt vorerst (siehe Architektur-Doku); Migration später separat. |
| Kind | Türsprechanlagen | `/tuersprechanlagen` | ja | Audio- und Video-Kommunikation an der Tür | `gebaeudekommunikation` | internal | `nav.gebaeudekommunikation.tuersprechanlagen.label` | `nav.gebaeudekommunikation.tuersprechanlagen.desc` | – |
| Kind | Briefkastenanlagen | `/briefkastenanlagen` | ja | Integrierte Brief- und Paketkastensysteme | `gebaeudekommunikation` | internal | `nav.gebaeudekommunikation.briefkastenanlagen.label` | `nav.gebaeudekommunikation.briefkastenanlagen.desc` | – |
| Kind | Beschilderung und Wayfinding | `/beschilderung` | ja | Von Hausnummer, Piktogramm bis Türschild | `gebaeudekommunikation` *(unklar, evtl. `signage`)* | internal | `nav.gebaeudekommunikation.beschilderung.label` | `nav.gebaeudekommunikation.beschilderung.desc` | **Grenzfall.** Beschilderung könnte auch zu `signage` gehören. |
| Kind | Großanlagen | `/grossanlagen` | ja | Lösungen für Wohnquartiere und Großprojekte | `gebaeudekommunikation` | internal | `nav.gebaeudekommunikation.grossanlagen.label` | `nav.gebaeudekommunikation.grossanlagen.desc` | Überschneidung mit `/anwendungen/grossanlage`. |
| Kind | Systemlösungen | `/systemloesungen` | ja | Ganzheitliche Kommunikationssysteme | `gebaeudekommunikation` | internal | `nav.gebaeudekommunikation.systemloesungen.label` | `nav.gebaeudekommunikation.systemloesungen.desc` | – |

### 3.2 Bereich „Zutrittskontrolle" (`/zutrittskontrolle`) ✅ migriert

| Bereich | Label | Route | Kind? | Beschreibung | Ziel-Domain | Linktyp | labelKey | descriptionKey | Hinweis |
|---|---|---|---|---|---|---|---|---|---|
| Top | Zutrittskontrolle | `/zutrittskontrolle` | nein | – | `zutrittskontrolle` | internal | `nav.zutrittskontrolle.label` | – | Domain bereits unter `src/features/zutrittskontrolle/`. |
| Kind | Türen und Tore | `/zutrittskontrolle/tueren-tore` | ja | Sichere Zutrittslösungen für jeden Eingang | `zutrittskontrolle` | internal | `nav.zutrittskontrolle.tueren-tore.label` | `nav.zutrittskontrolle.tueren-tore.desc` | – |
| Kind | Mobiler Zutritt per App oder Anruf | `/zutrittskontrolle/mobiler-zutritt` | ja | Türöffnung bequem per Smartphone-App oder Telefonanruf | `zutrittskontrolle` | internal | `nav.zutrittskontrolle.mobiler-zutritt.label` | `nav.zutrittskontrolle.mobiler-zutritt.desc` | – |
| Kind | Fahrstuhlsteuerung | `/zutrittskontrolle/fahrstuhlsteuerung` | ja | Intelligente Etagenfreigabe und Zugangsregelung | `zutrittskontrolle` | internal | `nav.zutrittskontrolle.fahrstuhl.label` | `nav.zutrittskontrolle.fahrstuhl.desc` | – |
| – | *(nicht in Nav, aber Route)* | `/zutrittskontrolle/zufahrten-parkplaetze` | – | – | `zutrittskontrolle` | internal | – | – | **Wird in Gebäudemanagement-Dropdown verlinkt** (Cross-Domain). |

### 3.3 Bereich „Gebäudemanagement" (`/gebaeudemanagement`)

| Bereich | Label | Route | Kind? | Beschreibung | Ziel-Domain | Linktyp | labelKey | descriptionKey | Hinweis |
|---|---|---|---|---|---|---|---|---|---|
| Top | Gebäudemanagement | `/gebaeudemanagement` | nein | – | `gebaeudemanagement` | internal | `nav.gebaeudemanagement.label` | – | – |
| Kind | Digitale Namensanzeige | `/gebaeudemanagement/digitale-namensanzeige` | ja | e-Paper-Displays für die Namensanzeige | `gebaeudemanagement` *(oder `signage`)* | internal | `nav.gebaeudemanagement.namensanzeige.label` | `nav.gebaeudemanagement.namensanzeige.desc` | **Grenzfall** Signage/Gebäudemanagement. |
| Kind | Zufahrten und Parkplätze | `/zutrittskontrolle/zufahrten-parkplaetze` | ja | Schranken- und Parkraumsteuerung | **`zutrittskontrolle`** | internal | `nav.gebaeudemanagement.zufahrten.label` | `nav.gebaeudemanagement.zufahrten.desc` | **Cross-Domain.** Bewusste Verlinkung in fremde Domain. Datenstruktur muss `targetDomain` korrekt setzen. |
| Kind | Schränke und Behälter | `/gebaeudemanagement/schraenke-behaelter` | ja | Elektronische Schließsysteme für Mobiliar | `gebaeudemanagement` | internal | `nav.gebaeudemanagement.schraenke.label` | `nav.gebaeudemanagement.schraenke.desc` | – |
| Kind | Digital Signage – Informieren | `/gebaeudemanagement/digital-signage` | ja | Digitale Informations- und Anzeigesysteme | `signage` *(unter gebaeudemanagement-Slug)* | internal | `nav.gebaeudemanagement.signage.label` | `nav.gebaeudemanagement.signage.desc` | **Grenzfall.** Slug unter `gebaeudemanagement`, Domain ist `signage`. |
| Kind | Reservieren und Buchen | `/gebaeudemanagement/reservieren-buchen` | ja | Raum- und Ressourcenbuchung | `gebaeudemanagement` | internal | `nav.gebaeudemanagement.reservieren.label` | `nav.gebaeudemanagement.reservieren.desc` | Mögliches späteres externes Tool. |
| Kind | Alarmanlagenkopplung | `/gebaeudemanagement` | ja | Integration von Sicherheitssystemen | `gebaeudemanagement` | internal | `nav.gebaeudemanagement.alarm.label` | `nav.gebaeudemanagement.alarm.desc` | **Risiko: dubletter Link** (zeigt auf den Top-Level, keine eigene Seite). |

### 3.4 Bereich „Eingangssysteme" (`/entry-system`)

| Bereich | Label | Route | Kind? | Beschreibung | Ziel-Domain | Linktyp | labelKey | descriptionKey | Hinweis |
|---|---|---|---|---|---|---|---|---|---|
| Top | Eingangssysteme | `/entry-system` | nein | – | `eingangssysteme` | internal | `nav.eingangssysteme.label` | – | **Domain ≠ Slug.** Englischer Slug, deutsche Domain. |
| Kind | Systematische Funktionalität | `/entry-system` | ja | Alle Gewerke unter Dach und Fach | `eingangssysteme` | internal | `nav.eingangssysteme.funktionalitaet.label` | `nav.eingangssysteme.funktionalitaet.desc` | **Risiko: alle 4 Kinder zeigen auf `/entry-system`.** Sub-Pages `entry/EntryFunktionalitaet.tsx`, `EntryDesign.tsx`, `EntryMaterial.tsx`, `EntryBeratung.tsx` etc. existieren bereits — Links müssten auf `/entry-system/funktionalitaet` etc. zeigen. |
| Kind | Baukörper & Montageform | `/entry-system` | ja | Passgenau und diskret integriert | `eingangssysteme` | internal | `nav.eingangssysteme.baukoerper.label` | `nav.eingangssysteme.baukoerper.desc` | s. o. — sollte vermutlich auf `/entry-system/integrationsformen` zeigen. |
| Kind | Ausdrucksstarke Materialien | `/entry-system` | ja | Haptik und Farbe, die überzeugen | `eingangssysteme` | internal | `nav.eingangssysteme.material.label` | `nav.eingangssysteme.material.desc` | s. o. — sollte vermutlich `/entry-system/material` sein. |
| Kind | Projektberatung | `/entry-system` | ja | Von der Vision bis zur Umsetzung | `eingangssysteme` | internal | `nav.eingangssysteme.beratung.label` | `nav.eingangssysteme.beratung.desc` | s. o. — sollte vermutlich `/entry-system/beratung` sein. |

### 3.5 Bereich „Anwendungen" (`/anwendungen`)

| Bereich | Label | Route | Kind? | Beschreibung | Ziel-Domain | Linktyp | labelKey | descriptionKey | Hinweis |
|---|---|---|---|---|---|---|---|---|---|
| Top | Anwendungen | `/anwendungen` | nein | – | `anwendungen` | internal | `nav.anwendungen.label` | – | – |
| Kind | TCS im Wohnbau | `/anwendungen/wohnbau` | ja | Lösungen für Ein- und Mehrfamilienhäuser | `anwendungen` | internal | `nav.anwendungen.wohnbau.label` | `nav.anwendungen.wohnbau.desc` | – |
| Kind | TCS in Bildungseinrichtungen | `/bildungseinrichtungen` | ja | Sichere Kommunikation für Kitas, Schulen und Wohnheime | `anwendungen` | internal | `nav.anwendungen.bildung.label` | `nav.anwendungen.bildung.desc` | **Inkonsistenz:** Top-Level-Slug statt `/anwendungen/...`. |
| Kind | TCS in Gesundheitseinrichtungen | `/anwendungen/gesundheitseinrichtungen` | ja | Zutritt und Kommunikation in Kliniken und Praxen | `anwendungen` | internal | `nav.anwendungen.gesundheit.label` | `nav.anwendungen.gesundheit.desc` | – |
| Kind | TCS in Einrichtungen der öffentlichen Hand | `/anwendungen/oeffentliche-hand` | ja | Lösungen für Behörden und öffentliche Gebäude | `anwendungen` | internal | `nav.anwendungen.oeffentlich.label` | `nav.anwendungen.oeffentlich.desc` | – |
| Kind | Referenzprojekte | `/anwendungen/referenzprojekte` | ja | Inspiration & Fallstudien | `anwendungen` | internal | `nav.anwendungen.referenzen.label` | `nav.anwendungen.referenzen.desc` | – |

### 3.6 Bereich „Services und Wissen" (`#`)

| Bereich | Label | Route | Kind? | Beschreibung | Ziel-Domain | Linktyp | labelKey | descriptionKey | Hinweis |
|---|---|---|---|---|---|---|---|---|---|
| Top | Services und Wissen | `#` | nein | – | – | – (kein Link) | `nav.services.label` | – | **Top-Level ohne Ziel.** Architektur trennt später `service` und `wissen` — Top-Level könnte später auf eine Übersichtsseite oder reines Dropdown ohne href bleiben. |
| Kind | Planen & Konfigurieren | `/planen-konfigurieren` | ja | TCS-Anlagenkonfigurator, Außenstationen-Konfigurator | **`tools` (extern)** | **subdomain/external (geplant)** | `nav.services.planen.label` | `nav.services.planen.desc` | **Doktrin-Treffer:** Konfiguratoren sind externe Spezialtools, derzeit aber als interne Route. Spätere Klassifizierung als `external`/`subdomain`. |
| Kind | Downloads | `/downloads` | ja | Ausschreibungstexte, Datenblätter, Kataloge, Firmware | `service` | internal | `nav.services.downloads.label` | `nav.services.downloads.desc` | – |
| Kind | Technischer Support | `/technischer-support` | ja | Schaltplan-Datenbank tcsplan.de, Hotline | `service` | internal | `nav.services.support.label` | `nav.services.support.desc` | tcsplan.de wäre `external`. |
| Kind | TCS Akademie | `/akademie` | ja | Schulungen & Webinare | `wissen` | internal | `nav.wissen.akademie.label` | `nav.wissen.akademie.desc` | – |
| Kind | Ersatzteile, Beschriftung und Freischaltcodes | `/ersatzteile` | ja | Online bestellen | **`tools` (extern, geplant)** | internal *(später external/subdomain)* | `nav.services.ersatzteile.label` | `nav.services.ersatzteile.desc` | **Doktrin-Treffer:** Bestellung = externes Tool. |

**Zusammenfassung MainNavigation:** 6 Top-Level-Bereiche, 29 Kinder, 1 toter Top-Link (`#`), 4 nicht aufgelöste Sub-Links in Eingangssysteme.

---

## 4. Persona-/MetaNavigation-Inventar

> Datenquelle: `src/components/MetaNavigation.tsx`.

### 4.1 Persona-Leiste (links)

| Label | Aktion | Ziel-Domain | Linktyp | labelKey | Hinweis |
|---|---|---|---|---|---|
| Bauherren & Eigentümer | Toggle `activePersona = "bauherren"`, Navigate `/` | `personas/bauherr` | internal *(state)* | `persona.bauherren.label` | Persona-State, kein Link auf eigene Seite. |
| Architekten & Gestalter | Toggle `activePersona = "architekten"` | `personas/architekt` | internal *(state)* | `persona.architekten.label` | – |
| Wohnungswirtschaft & Bauträger | Toggle `activePersona = "wohnungswirtschaft"` | `personas/wohnungswirtschaft` | internal *(state)* | `persona.wohnungswirtschaft.label` | – |
| Fachplaner & Integratoren | Toggle `activePersona = "fachplaner"` | `personas/fachplaner` | internal *(state)* | `persona.fachplaner.label` | – |
| Elektro-Handwerk | Toggle `activePersona = "handwerk"` | `personas/handwerk` | internal *(state)* | `persona.handwerk.label` | – |
| Fachhandel | Toggle `activePersona = "fachhandel"` | `personas/fachhandel` | internal *(state)* | `persona.fachhandel.label` | – |

**Hinweise:**
- Personas sind kuratierte Einstiege, **keine eigenen Routen** (sie steuern aktuell nur `PersonaContext`).
- Persona-Texte sollen später nicht in der Navigation gepflegt werden, sondern in `features/personas`.
- Mobile-Variante zeigt zusätzlich `p.label` (Lang-Form) statt `p.short`. Datenstruktur sollte beide Varianten als `labelKey` und `labelShortKey` führen.

### 4.2 Meta-Links (rechts)

| Label | Route | Ziel-Domain | Linktyp | labelKey | Hinweis |
|---|---|---|---|---|---|
| Serviceportal | `/serviceportal` | `serviceportal` | internal | `meta.serviceportal.label` | **Doktrin:** Serviceportal in dieser Website nur Einstieg/Kachelseite, **keine Auth-/Tool-Logik**. |
| Kontakt | `/kontakt` | `kontakt` | internal | `meta.kontakt.label` | – |
| Karriere | `/karriere` | `karriere` | internal | `meta.karriere.label` | – |
| Presse | `/presse` | `presse` | internal | `meta.presse.label` | – |

---

## 5. Footer-Inventar

> Datenquelle: `src/components/Footer.tsx`.

### 5.1 Spalte „Produkte"

| Label | Route | Linktyp | Ziel-Domain | labelKey | Hinweis |
|---|---|---|---|---|---|
| Türkommunikation | `/tuerkommunikation` | internal | `gebaeudekommunikation` | `footer.produkte.tuerkommunikation` | Label „Türkommunikation" vs. MainNav „Gebäudekommunikation" — **Inkonsistenz**. |
| Zutrittskontrolle | `/zutrittskontrolle` | internal | `zutrittskontrolle` | `footer.produkte.zutrittskontrolle` | – |
| Eingangssysteme | `/entry-system` | internal | `eingangssysteme` | `footer.produkte.eingangssysteme` | – |
| TCS:PACKS | `/tuerkommunikation` | internal | `gebaeudekommunikation` *(unklar)* | `footer.produkte.packs` | **Falsche Route** (Platzhalter). |
| snipdoo® | `/tuerkommunikation` | internal | `gebaeudekommunikation`/`systemtechnik` | `footer.produkte.snipdoo` | **Falsche Route.** Echte Page existiert: `/systemtechnik/snipdoo-ip`. |
| Beschilderung | `/tuerkommunikation` | internal | `signage` *(oder `gebaeudekommunikation`)* | `footer.produkte.beschilderung` | **Falsche Route.** Echte Page: `/beschilderung`. |

### 5.2 Spalte „Anwendungen"

| Label | Route | Linktyp | Ziel-Domain | labelKey | Hinweis |
|---|---|---|---|---|---|
| Einfamilienhaus | `/objektloesungen` | internal | `anwendungen` | `footer.anwendungen.efh` | **Falsche Route.** Echte Page: `/anwendungen/einfamilienhaus`. |
| Mehrfamilienhaus | `/objektloesungen` | internal | `anwendungen` | `footer.anwendungen.mfh` | **Falsche Route.** Echte Page: `/anwendungen/mehrfamilienhaus`. |
| Großanlagen | `/objektloesungen` | internal | `anwendungen` | `footer.anwendungen.grossanlagen` | **Falsche Route.** Echte Page: `/anwendungen/grossanlage`. |
| Gewerbe | `/objektloesungen` | internal | `anwendungen` | `footer.anwendungen.gewerbe` | **Keine eigene Route vorhanden.** |
| Referenzen | `/objektloesungen` | internal | `anwendungen` | `footer.anwendungen.referenzen` | **Falsche Route.** Echte Page: `/anwendungen/referenzprojekte`. |

### 5.3 Spalte „Services"

| Label | Route | Linktyp | Ziel-Domain | labelKey | Hinweis |
|---|---|---|---|---|---|
| Konfigurator | `#` | – | `tools` (extern) | `footer.services.konfigurator` | **Toter Link.** Doktrin: extern. |
| Downloads | `#` | – | `service` | `footer.services.downloads` | **Toter Link.** Echte Page: `/downloads`. |
| TCS Akademie | `#` | – | `wissen` | `footer.services.akademie` | **Toter Link.** Echte Page: `/akademie`. |
| Ersatzteil-Shop | `#` | – | `tools` (extern) | `footer.services.ersatzteile` | **Toter Link.** Doktrin: extern. |
| Support | `#` | – | `service` | `footer.services.support` | **Toter Link.** Echte Page: `/technischer-support`. |

### 5.4 Spalte „Unternehmen"

| Label | Route | Linktyp | Ziel-Domain | labelKey | Hinweis |
|---|---|---|---|---|---|
| Über TCS | `/ueber-tcs` | internal | `home` *(oder eigene Domain `unternehmen`)* | `footer.unternehmen.ueber` | – |
| Karriere | `/karriere` | internal | `karriere` | `footer.unternehmen.karriere` | – |
| Presse | `/presse` | internal | `presse` | `footer.unternehmen.presse` | – |
| Kontakt | `/kontakt` | internal | `kontakt` | `footer.unternehmen.kontakt` | – |
| Datenschutz | `#` | – | `legal` | `footer.unternehmen.datenschutz` | **Toter Link.** Domain `legal` existiert noch nicht. |

### 5.5 Bottom-Bar

| Element | Wert | Linktyp | labelKey | Hinweis |
|---|---|---|---|---|
| Logo „TCS" | Link `/` | internal | – | – |
| Copyright | Dynamisch (Jahr) | – | `footer.bottom.copyright` | Interpolation `{{year}}`. |
| Impressum | `#` | – | `footer.bottom.impressum` | **Toter Link.** Domain `legal`. |
| Datenschutz | `#` | – | `footer.bottom.datenschutz` | **Toter Link.** Dublette zu Spalte „Unternehmen". |
| AGB | `#` | – | `footer.bottom.agb` | **Toter Link.** Domain `legal`. |

**Zusammenfassung Footer:** 4 Spalten × 5–6 Links = 21 Footer-Links + 3 Bottom-Links = **24 Einträge, davon 11 tote/falsche Routen** (≈ 46 %).

---

## 6. Vorschlag für spätere Type-Struktur

> **Reine Empfehlung. Noch nicht implementieren.**

```ts
// src/navigation/types.ts (späterer Vorschlag)

export type LinkType = "internal" | "external" | "iframe" | "subdomain";
export type Badge = "new" | "external" | "beta";
export type AuthRequirement = "no" | "yes" | "planned";

export type NavItem = {
  /** Stabiler Schlüssel, sprachunabhängig (für Tracking, Tests, Stable IDs). */
  key: string;
  /** i18n-Schlüssel im Namespace `navigation`. */
  labelKey: string;
  labelShortKey?: string;
  descriptionKey?: string;
  /** Interner Pfad (React-Router). Mutually exclusive mit `externalUrl`. */
  path?: string;
  /** Externe URL. Pflicht, wenn linkType ∈ {external, subdomain, iframe}. */
  externalUrl?: string;
  linkType: LinkType;
  /** Code-interne Feature-Domain (siehe docs/architecture.md). */
  targetDomain?: string;
  children?: NavItem[];
  badge?: Badge;
  requiresAuth?: AuthRequirement;
};

export type PersonaItem = {
  id: "bauherren" | "architekten" | "wohnungswirtschaft" | "fachplaner" | "handwerk" | "fachhandel";
  labelKey: string;
  labelShortKey: string;
  targetDomain: `personas/${string}`;
};
```

### Vorgeschlagene Datei-Aufteilung

| Datei | Inhalt |
|---|---|
| `src/navigation/types.ts` | `NavItem`, `LinkType`, `PersonaItem`, `Badge`, `AuthRequirement` |
| `src/navigation/routes.ts` | Konstanten aller URL-Pfade (`ROUTES.zutrittskontrolle.fahrstuhl = "/zutrittskontrolle/fahrstuhlsteuerung"`). **Single Source of Truth** für `App.tsx` und Navigation. |
| `src/navigation/mainNavigation.ts` | Datenstruktur der 6 Top-Level-Bereiche + 29 Kinder |
| `src/navigation/personaNavigation.ts` | Liste der 6 Personas |
| `src/navigation/metaNavigation.ts` | 4 Meta-Links (Serviceportal, Kontakt, Karriere, Presse) |
| `src/navigation/footerNavigation.ts` | 4 Spalten + Bottom-Bar |
| `src/navigation/segmentLabels.ts` | Map für AutoBreadcrumb (oder via i18n-Keys ersetzen) |

---

## 7. Risiken

| Risiko | Bewertung | Beobachtung |
|---|---|---|
| Kaputte Links | **hoch** | 11 von 24 Footer-Links sind tot oder zeigen auf falsche Routen. |
| Doppelte / inkonsistente Routen | mittel | Footer „Türkommunikation" vs. MainNav „Gebäudekommunikation"; Bildungseinrichtungen als Top-Level statt unter `/anwendungen/`. |
| Falsche Ziel-Domain | mittel | `/zutrittskontrolle/zufahrten-parkplaetze` taucht in Gebäudemanagement-Dropdown auf — Datenstruktur muss `targetDomain` korrekt führen, sonst Persona/SEO-Logik bricht. |
| Service/Wissen-Trennung unsicher | mittel | Aktuell ein gemeinsames Dropdown „Services und Wissen" mit `href="#"`. Architektur trennt `service` und `wissen` — Migration erfordert Designentscheidung (zwei Top-Level oder weiterhin gemeinsam). |
| Externe Tools versehentlich als interne Route | **hoch** | „Planen & Konfigurieren", „Ersatzteile, Beschriftung und Freischaltcodes", „Konfigurator", „Ersatzteil-Shop" sind laut Architektur-Doktrin **externe Tools**, aktuell aber als interne Routen verlinkt. |
| i18n-Key-Drift | mittel | Solange Labels hartcodiert bleiben, kein Drift. Sobald Migration startet: Key-Schema (`nav.<bereich>.<unterbereich>.label`) muss eingehalten werden. |
| Navigation und App.tsx-Routing laufen auseinander | mittel | Eingangssysteme: Routen `/entry-system/funktionalitaet` etc. existieren, aber Nav verlinkt nur auf `/entry-system`. → späterer Renderer könnte 404-fähige Pfade aus `routes.ts` enforcen. |
| Persona-State nicht in URL | niedrig | Aktuell nur React-State. Spätere Linkbarkeit/Sharing (z. B. `?persona=architekt`) wäre eine separate Entscheidung. |
| Beschilderung/Signage/Namensanzeige-Grenzfälle | mittel | 3 Einträge mit unklarer Domain-Zuordnung — siehe Asset-Strategy §3. |

---

## 8. Empfohlene nächste technische Etappe

> **Phasen-Vorschlag (4b–4f), pro Etappe minimal-invasiv:**

1. **Etappe 4b:** `src/navigation/types.ts` + `src/navigation/routes.ts` anlegen (reine Datendateien, **noch keine Komponente angeschlossen**). Routen aus `App.tsx` 1:1 als Konstanten extrahieren — keine Umbenennung. Build muss grün bleiben.
2. **Etappe 4c:** `src/navigation/mainNavigation.ts` als Datenstruktur erstellen, **identisch zur aktuellen `navItems`-Konstante** (keine Linkkorrekturen!). MainNavigation-Renderer auf Datenstruktur umstellen. Smoke-Test: alle 35 Links visuell prüfen.
3. **Etappe 4d:** `footerNavigation.ts` erstellen. **Hier zuerst Inventar einfrieren — Linkkorrekturen ausdrücklich als eigene Etappe 4d-fix danach**, damit Strukturmigration und Inhaltskorrektur trennbar bleiben.
4. **Etappe 4e:** `metaNavigation.ts` + `personaNavigation.ts` + Renderer-Anpassung. Persona-Logik bleibt zunächst State-basiert.
5. **Etappe 4f:** i18n-Namespaces `navigation` (DE/EN) anlegen und Renderer auf `t(item.labelKey)` umstellen. **Erst jetzt** beginnt die Textmigration der Navigation.
6. **Optional 4g:** `segmentLabels.ts` aus `AutoBreadcrumb` extrahieren oder gegen i18n-Keys ersetzen.

**Reihenfolge-Begründung:**
- Datenstruktur zuerst → minimaler Diff pro Etappe.
- Linkkorrekturen erst nach stabiler Struktur → klare Diffs in Code-Review.
- i18n-Aktivierung zuletzt → Navigation kann unabhängig validiert werden.
- Persona-/Meta zuletzt, weil Persona-Architektur (PersonaShell) noch nicht migriert ist.
