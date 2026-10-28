# Migrations-Mapping (Etappe 1)

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


> Reine Dokumentation. **Keine Datei verschoben, keine Route geändert, kein Produktivcode angefasst.**
> Grundlage: Zielarchitektur in [`architecture.md`](../02-architecture/architecture.md).

**Migrationsart-Werte:** `später verschieben` · `später aufteilen` · `später konsolidieren` · `bleibt vorerst` · `extern verlinken` · `unklar`
**Risiko-Werte:** `niedrig` · `mittel` · `hoch`

---

## A. Pages – Top-Level (`src/pages/`)

| Datei | Aktuelle Route | Funktion / Inhalt | Ziel-Domain | Späterer Zielpfad | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|---|
| `Index.tsx` | `/` | Startseite (Hero, Stats, ContentBlocks, Personas, CTA) | `home` | `src/features/home/pages/HomePage.tsx` | später verschieben | mittel | Komponiert viele Shared-Sektionen, Imports nachziehen |
| `NotFound.tsx` | `*` | 404-Seite | `shared` | `src/shared/components/NotFound.tsx` oder `src/app/` | später verschieben | niedrig | Domänenfrei |
| `Tuerkommunikation.tsx` | `/tuerkommunikation` | Übersicht Gebäudekommunikation | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/pages/UebersichtPage.tsx` | später verschieben | mittel | **Route `/tuerkommunikation` bleibt vorerst bestehen**, auch wenn Domain `gebaeudekommunikation` heißt |
| `Tuersprechanlagen.tsx` | `/tuersprechanlagen` | Türsprechanlagen | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/pages/Tuersprechanlagen.tsx` | später verschieben | niedrig | – |
| `Briefkastenanlagen.tsx` | `/briefkastenanlagen` | Briefkastenanlagen | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/pages/Briefkastenanlagen.tsx` | später verschieben | niedrig | – |
| `Beschilderung.tsx` | `/beschilderung` | Beschilderung (statisch + digital) | `signage` | `src/features/signage/pages/Beschilderung.tsx` | später verschieben | mittel | Alternativ `gebaeudekommunikation`, siehe Sonderpunkt 4 |
| `Signage.tsx` | `/signage` | Signage-Übersicht | `signage` | `src/features/signage/pages/SignageUebersicht.tsx` | später verschieben | mittel | Siehe Sonderpunkt 4 |
| `DigitalSignage.tsx` | `/gebaeudemanagement/digital-signage` | Digital Signage | `signage` | `src/features/signage/pages/DigitalSignage.tsx` | später verschieben | mittel | Aktuell unter `/gebaeudemanagement/...` – Route bleibt vorerst |
| `Grossanlagen.tsx` | `/grossanlagen` | Großanlagen-Übersicht | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/pages/Grossanlagen.tsx` | später verschieben | mittel | Überlappung mit `anwendungen/Grossanlage.tsx` prüfen |
| `Systemloesungen.tsx` | `/systemloesungen` | Systemlösungen | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/pages/Systemloesungen.tsx` | später verschieben | niedrig | – |
| `Zutrittskontrolle.tsx` | `/zutrittskontrolle` | Übersicht Zutrittskontrolle | `zutrittskontrolle` | `src/features/zutrittskontrolle/pages/Uebersicht.tsx` | später verschieben | niedrig | Pilot-Kandidat |
| `ZutrittTuerenTore.tsx` | `/zutrittskontrolle/tueren-tore` | Zutritt Türen/Tore | `zutrittskontrolle` | `src/features/zutrittskontrolle/pages/TuerenTore.tsx` | später verschieben | niedrig | – |
| `ZutrittMobil.tsx` | `/zutrittskontrolle/mobiler-zutritt` | Mobiler Zutritt | `zutrittskontrolle` | `src/features/zutrittskontrolle/pages/MobilerZutritt.tsx` | später verschieben | niedrig | – |
| `ZutrittFahrstuhl.tsx` | `/zutrittskontrolle/fahrstuhlsteuerung` | Fahrstuhlsteuerung | `zutrittskontrolle` | `src/features/zutrittskontrolle/pages/Fahrstuhlsteuerung.tsx` | später verschieben | niedrig | – |
| `ZufahrtenParkplaetze.tsx` | `/zutrittskontrolle/zufahrten-parkplaetze` | Zufahrten/Parkplätze | `zutrittskontrolle` | `src/features/zutrittskontrolle/pages/ZufahrtenParkplaetze.tsx` | später verschieben | niedrig | – |
| `Gebaeudemanagement.tsx` | `/gebaeudemanagement` | Übersicht Gebäudemanagement | `gebaeudemanagement` | `src/features/gebaeudemanagement/pages/Uebersicht.tsx` | später verschieben | niedrig | – |
| `SchraenkeBelhaelter.tsx` | `/gebaeudemanagement/schraenke-behaelter` | Schränke/Behälter | `gebaeudemanagement` | `src/features/gebaeudemanagement/pages/SchraenkeBehaelter.tsx` | später verschieben | niedrig | Tippfehler-Reminder im Dateinamen |
| `DigitaleNamensanzeige.tsx` | `/gebaeudemanagement/digitale-namensanzeige` | Digitale Namensanzeige | `gebaeudemanagement` | `src/features/gebaeudemanagement/pages/DigitaleNamensanzeige.tsx` | später verschieben | mittel | Grenzfall zu `signage` – derzeit GM zugeordnet, wie Route |
| `ReservierenBuchen.tsx` | `/gebaeudemanagement/reservieren-buchen` | Reservieren/Buchen | `gebaeudemanagement` | `src/features/gebaeudemanagement/pages/ReservierenBuchen.tsx` | später verschieben | niedrig | – |
| `EntrySystem.tsx` | `/entry-system` | Übersicht Eingangssysteme | `eingangssysteme` | `src/features/eingangssysteme/pages/Uebersicht.tsx` | später verschieben | mittel | **Route `/entry-system` bleibt vorerst** |
| `Anwendungen.tsx` | `/anwendungen` | Übersicht Anwendungen | `anwendungen` | `src/features/anwendungen/pages/Uebersicht.tsx` | später verschieben | niedrig | – |
| `Objektloesungen.tsx` | `/objektloesungen` | Objektlösungen | `anwendungen` | `src/features/anwendungen/pages/Objektloesungen.tsx` | später verschieben | mittel | Alternativ eigene Domain – derzeit `anwendungen` |
| `Bildungseinrichtungen.tsx` | `/bildungseinrichtungen` | Bildungseinrichtungen | `anwendungen` | `src/features/anwendungen/pages/Bildungseinrichtungen.tsx` | später verschieben | niedrig | Logisch wie Anwendungs-Detail (Route auf Top-Level) |
| `Kontakt.tsx` | `/kontakt` | Kontaktseite | `kontakt` | `src/features/kontakt/pages/KontaktPage.tsx` | später verschieben | niedrig | – |
| `Karriere.tsx` | `/karriere` | Karriere | `karriere` | `src/features/karriere/pages/KarrierePage.tsx` | später verschieben | niedrig | – |
| `Presse.tsx` | `/presse` | Presse | `presse` | `src/features/presse/pages/PressePage.tsx` | später verschieben | niedrig | – |
| `UeberTCS.tsx` | `/ueber-tcs` | Über TCS | `home` | `src/features/home/pages/UeberTCS.tsx` | später verschieben | niedrig | Alternativ eigene Mini-Domain `unternehmen` – vorerst `home` |
| `Akademie.tsx` | `/akademie` | TCS-Akademie | `wissen` | `src/features/wissen/pages/Akademie.tsx` | später verschieben | mittel | Trennt Wissen aus „Service & Wissen", siehe Sonderpunkt 3 |
| `Downloads.tsx` | `/downloads` | Downloadcenter | `wissen` | `src/features/wissen/pages/Downloads.tsx` | später verschieben | mittel | Inhaltlich Wissen; alternativ `service` – siehe Sonderpunkt 3 |
| `TechnischerSupport.tsx` | `/technischer-support` | Technischer Support | `service` | `src/features/service/pages/TechnischerSupport.tsx` | später verschieben | niedrig | – |
| `Ersatzteile.tsx` | `/ersatzteile` | Ersatzteile | `service` | `src/features/service/pages/Ersatzteile.tsx` | später verschieben | niedrig | – |
| `PlanenKonfigurieren.tsx` | `/planen-konfigurieren` | Planen & Konfigurieren | `service` | `src/features/service/pages/PlanenKonfigurieren.tsx` | später verschieben + extern verlinken | mittel | Einstiegsseite bleibt; Konfiguratoren selbst sind **externe Tools** und nicht Teil dieser Codebase |
| `Serviceportal.tsx` | `/serviceportal` | Serviceportal-Einstieg | `serviceportal` | `src/features/serviceportal/pages/Uebersicht.tsx` | später verschieben | mittel | Bleibt **reine Kachel-/Einstiegsseite**, keine Tool-Logik |
| `PasswortVergessen.tsx` | `/serviceportal/passwort-vergessen` | Passwort vergessen | `serviceportal` | `src/features/serviceportal/pages/PasswortVergessen.tsx` | später verschieben oder extern verlinken | hoch | **Auth gehört nicht in diese Website** – Kandidat zur Auslagerung an externes Login/SSO |
| `Registrieren.tsx` | `/serviceportal/registrieren` | Registrieren | `serviceportal` | `src/features/serviceportal/pages/Registrieren.tsx` | später verschieben oder extern verlinken | hoch | Wie oben – Auth-Flow extern; in Marketing-Site nur Einstiegsseite |

---

## B. Pages – Anwendungen (`src/pages/anwendungen/`)

Alle unter `/anwendungen/...`, Migrationsart `später verschieben`, Risiko `niedrig` sofern nicht anders angegeben. Ziel-Domain durchgängig `anwendungen`, Zielpfad `src/features/anwendungen/pages/<Datei>`.

| Datei | Aktuelle Route | Inhalt | Hinweis |
|---|---|---|---|
| `Einfamilienhaus.tsx` | `/anwendungen/einfamilienhaus` | Wohnbau-Detail | – |
| `Mehrfamilienhaus.tsx` | `/anwendungen/mehrfamilienhaus` | Wohnbau-Detail | – |
| `Grossanlage.tsx` | `/anwendungen/grossanlage` | Großanlage Anwendung | Überlappung mit `pages/Grossanlagen.tsx` (gebaeudekommunikation) prüfen |
| `Sanierung.tsx` | `/anwendungen/sanierung` | Sanierung | – |
| `Pflege.tsx` | `/anwendungen/pflege` | Pflegeeinrichtung | – |
| `Klinik.tsx` | `/anwendungen/klinik` | Klinik | Überlappung mit `Gesundheitseinrichtungen.tsx` |
| `Behoerde.tsx` | `/anwendungen/behoerde` | Behörde | Überlappung mit `OeffentlicheHand.tsx` |
| `Feuerwehr.tsx` | `/anwendungen/feuerwehr` | Feuerwehr | – |
| `Schwimmbad.tsx` | `/anwendungen/schwimmbad` | Schwimmbad | – |
| `Concierge.tsx` | `/anwendungen/concierge` | Concierge | – |
| `InterneKommunikation.tsx` | `/anwendungen/interne-kommunikation` | Interne Komm. | – |
| `DigitaleNamensverwaltung.tsx` | `/anwendungen/digitale-namensverwaltung` | Namensverwaltung | Grenzfall zu `gebaeudemanagement` (Risiko mittel) |
| `Feuerwehrdurchsage.tsx` | `/anwendungen/feuerwehrdurchsage` | Feuerwehrdurchsage | – |
| `BidirektionaleVideo.tsx` | `/anwendungen/bidirektionale-video` | Bidir. Video | – |
| `MobileTuerkommunikation.tsx` | `/anwendungen/mobile-tuerkommunikation` | Mobile Türkomm. | Querbezug zu `gebaeudekommunikation` (Risiko mittel) |
| `ZutrittskontrolleBCM.tsx` | `/anwendungen/zutrittskontrolle-bcm` | BCM-Zutritt Anwendung | Querbezug zu `zutrittskontrolle` (Risiko mittel) |
| `Wohnbau.tsx` | `/anwendungen/wohnbau` | Wohnbau-Übersicht | Cluster-Eltern für EFH/MFH |
| `Gesundheitseinrichtungen.tsx` | `/anwendungen/gesundheitseinrichtungen` | Gesundheit | Cluster-Eltern für Klinik/Pflege |
| `OeffentlicheHand.tsx` | `/anwendungen/oeffentliche-hand` | Öff. Hand | Cluster-Eltern für Behörde/Feuerwehr |
| `Referenzprojekte.tsx` | `/anwendungen/referenzprojekte` | Referenz-Listing | Liest `src/data/referenzprojekte.ts` |
| `ReferenzprojektDetail.tsx` | `/anwendungen/referenzprojekte/:slug` | Referenz-Detail | – |

---

## C. Pages – Entry (`src/pages/entry/`)

Alle Ziel-Domain `eingangssysteme`, Migrationsart `später verschieben`, Risiko `niedrig`. **Routen `/entry-system/...` bleiben vorerst.** Zielpfad `src/features/eingangssysteme/pages/<Datei>`.

| Datei | Aktuelle Route | Inhalt |
|---|---|---|
| `EntryDesign.tsx` | `/entry-system/design` | Design |
| `EntryFunktionalitaet.tsx` | `/entry-system/funktionalitaet` | Funktionalität |
| `EntryMaterial.tsx` | `/entry-system/material` | Material |
| `EntryIntegrationsformen.tsx` | `/entry-system/integrationsformen` | Integrationsformen |
| `EntryReferenzen.tsx` | `/entry-system/referenzen` | Referenzen |
| `EntryStandards.tsx` | `/entry-system/standards` | Standards |
| `EntryBeratung.tsx` | `/entry-system/beratung` | Beratung |

---

## D. Pages – Systemtechnik (`src/pages/systemtechnik/`)

| Datei | Aktuelle Route | Inhalt | Ziel-Domain | Späterer Zielpfad | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|---|
| `SnipdooIp.tsx` | `/systemtechnik/snipdoo-ip` | Snipdoo IP-Systemtechnik | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/pages/SnipdooIp.tsx` | später verschieben | mittel | Alternativ eigene Sub-Domain `systemtechnik` innerhalb GK – vorerst direkt unter GK |

---

## E. Komponenten (`src/components/`)

| Datei | Funktion | Ziel-Domain | Späterer Zielpfad | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|
| `MainNavigation.tsx` | Hauptnavigation (hartkodiert) | `navigation` + `shared` | Daten → `src/navigation/mainNavigation.ts`, Renderer → `src/shared/components/MainNavigation.tsx` | später aufteilen | hoch | Daten/UI trennen, i18n-fähig machen |
| `MetaNavigation.tsx` | Meta-/Persona-Leiste | `navigation` + `shared` | Daten → `src/navigation/{personaNavigation,metaNavigation}.ts`, Renderer → `src/shared/components/MetaNavigation.tsx` | später aufteilen | hoch | Persona-State bleibt im Context |
| `Footer.tsx` | Footer | `navigation` + `shared` | Daten → `src/navigation/footerNavigation.ts`, Renderer → `src/shared/components/Footer.tsx` | später aufteilen | mittel | – |
| `NavLink.tsx` | Link-Helper | `shared` | `src/shared/components/NavLink.tsx` | später verschieben | niedrig | – |
| `SubNavSticky.tsx` | Sticky-Sub-Nav | `shared` | `src/shared/components/SubNavSticky.tsx` | später verschieben | niedrig | – |
| `AutoBreadcrumb.tsx` | Breadcrumb | `shared` | `src/shared/components/AutoBreadcrumb.tsx` | später verschieben | mittel | Liest Routen – nach Route-Reform anpassen |
| `ScrollToTop.tsx` | Router-Helper | `shared` | `src/shared/components/ScrollToTop.tsx` oder `src/app/` | später verschieben | niedrig | – |
| `PageLayout.tsx` | Generisches Page-Layout | `shared` | `src/shared/components/PageLayout.tsx` | später verschieben | niedrig | – |
| `HeroSection.tsx` | Hero-Komponente Startseite | `home` | `src/features/home/components/HeroSection.tsx` | später verschieben | mittel | Falls auch andernorts genutzt → `shared` |
| `StatsSection.tsx` | Stats Startseite | `home` | `src/features/home/components/StatsSection.tsx` | später verschieben | niedrig | – |
| `ContentBlocks.tsx` | Content-Blöcke Startseite | `home` | `src/features/home/components/ContentBlocks.tsx` | später verschieben | mittel | Verlinkt in Hauptbereiche – nutzt später Nav-Konstanten |
| `PersonaSection.tsx` | Persona-Teaser Startseite | `home` | `src/features/home/components/PersonaSection.tsx` | später verschieben | niedrig | – |
| `CTASection.tsx` | CTA-Block | `shared` | `src/shared/components/CTASection.tsx` | später verschieben | niedrig | Mehrfach genutzt |
| `ProductHighlights.tsx` | Produkt-Highlights | `shared` | `src/shared/components/ProductHighlights.tsx` | später verschieben | mittel | Verwendet in vielen Bereichen |
| `RoleTabsBlock.tsx` | Rollen-Tab-Block | `shared` | `src/shared/components/RoleTabsBlock.tsx` | später verschieben | mittel | Persona-bezogen, aber generisch |
| `AnwendungDetailPage.tsx` | Layout für Anwendungs-Detailseiten | `anwendungen` | `src/features/anwendungen/components/AnwendungDetailPage.tsx` | später verschieben | mittel | Wird von ~20 Pages genutzt – Imports nachziehen |
| `BauherrenContent.tsx` | Persona-Content Bauherr | `personas/bauherr` | `src/features/personas/bauherr/components/BauherrContent.tsx` | später konsolidieren | hoch | **Konsolidierungskandidat** – siehe Sonderpunkt 5 |
| `ArchitektenContent.tsx` | Persona-Content Architekt | `personas/architekt` | `src/features/personas/architekt/components/ArchitektContent.tsx` | später konsolidieren | hoch | Konsolidieren |
| `WohnungswirtschaftContent.tsx` | Persona-Content WoWi | `personas/wohnungswirtschaft` | `src/features/personas/wohnungswirtschaft/components/Content.tsx` | später konsolidieren | hoch | Konsolidieren |
| `FachplanerContent.tsx` | Persona-Content Fachplaner | `personas/fachplaner` | `src/features/personas/fachplaner/components/Content.tsx` | später konsolidieren | hoch | Konsolidieren |
| `HandwerkContent.tsx` | Persona-Content Handwerk | `personas/handwerk` | `src/features/personas/handwerk/components/Content.tsx` | später konsolidieren | hoch | Konsolidieren |
| `FachhandelContent.tsx` | Persona-Content Fachhandel | `personas/fachhandel` | `src/features/personas/fachhandel/components/Content.tsx` | später konsolidieren | hoch | Konsolidieren |
| `ui/*` (shadcn) | UI-Primitives | `shared` | `src/shared/ui/*` | bleibt vorerst | niedrig | Verschiebung erst nach Alias-Umstellung |

> **Persona-Konsolidierung (Sonderpunkt 5):** Die 6 `*Content.tsx`-Dateien sind strukturell sehr ähnlich. Ziel ist eine generische `PersonaShell` in `src/features/personas/shared/components/PersonaShell.tsx`, gespeist aus `src/features/personas/<persona>/content/links.ts` (kuratierte Verweise auf Hauptbereiche, keine Eigeninhalte). **In dieser Etappe nichts ändern.**

### Komponenten – Wohnungswirtschaft (`src/components/wohnungswirtschaft/`)

| Datei | Funktion | Ziel-Domain | Späterer Zielpfad | Migrationsart | Risiko |
|---|---|---|---|---|---|
| `WoWiHero.tsx` | WoWi-Hero | `personas/wohnungswirtschaft` | `src/features/personas/wohnungswirtschaft/components/WoWiHero.tsx` | später konsolidieren | mittel |
| `WoWiDetailSections.tsx` | WoWi-Sektionen | `personas/wohnungswirtschaft` | `src/features/personas/wohnungswirtschaft/components/WoWiDetailSections.tsx` | später konsolidieren | mittel |

---

## F. Daten (`src/data/`)

| Datei | Inhalt | Ziel-Domain | Späterer Zielpfad | Migrationsart | Risiko | Hinweis |
|---|---|---|---|---|---|---|
| `referenzprojekte.ts` | Liste der Referenzprojekte | `anwendungen` | `src/features/anwendungen/data/referenzprojekte.ts` | später verschieben | mittel | Spätere Migration nach Supabase + i18n-Felder `{ de, en }` |

---

## G. Assets (`src/assets/`) – grobe Gruppierung

Aktuell **flach in `src/assets/`** (64 Dateien + 1 Unterordner `snipdoo/`). **In dieser Etappe wird nichts verschoben.** Spätere Zielordner:

| Aktueller Datei-Präfix / Muster | Beispiele | Ziel-Gruppe | Späterer Zielpfad |
|---|---|---|---|
| `logo-tcs.png` | Logo | globale Assets | `src/shared/assets/` |
| `hero-*.jpg` (außer feature-spezifisch) | `hero-entry.jpg`, `hero-zutrittskontrolle.jpg`, `hero-buchungssystem.jpg`, `hero-infoboard.jpg`, `hero-entrance.jpg` | gemischt | je nach Feature: `eingangssysteme`, `zutrittskontrolle`, `gebaeudemanagement`, `home` |
| `block-*.jpg` | `block-zutritt`, `block-kommunikation`, `block-entry`, `block-gebaeudemanagement`, `block-signage`, `block-tueren-tore`, `block-mobiler-zutritt`, `block-fahrstuhlsteuerung`, `block-objekt`, `block-beratung` | `home` (ContentBlocks-Startseite) | `src/features/home/assets/` |
| `tk-*.jpg` | Türsprech-Außen-/Innenstationen | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/assets/` |
| `briefkasten-*.jpg` | Briefkasten-Bilder | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/assets/` |
| `signage-*.jpg` | Signage/Hausnummer/Türschilder | `signage` | `src/features/signage/assets/` |
| `grossanlage-*.jpg` | Großanlage-Bilder | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/assets/` (oder `anwendungen` – siehe Hinweis) |
| `systemloesungen-*.jpg` | Systemlösungen | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/assets/` |
| `bcm-*.jpg` | BCM/Schloss/Schranke/Kennzeichen | `zutrittskontrolle` (vorrangig) | `src/features/zutrittskontrolle/assets/` – einzelne Bilder (`bcm-namensanzeige-hero`, `bcm-briefkasten-digital`, `bcm-displaymodul`) gehören zu `gebaeudemanagement` bzw. `gebaeudekommunikation`, **fall-by-fall klären** |
| `feature-sanierung.png` | Sanierungs-Anwendung | `anwendungen` | `src/features/anwendungen/assets/` |
| `snipdoo/*.webp` | Snipdoo-IP-Systemtechnik | `gebaeudekommunikation` | `src/features/gebaeudekommunikation/assets/snipdoo/` |

**Hinweis:** Asset-Migration erst nach den Code-Migrationen, sonst doppelte Imports. **Dynamische/wechselnde Medien** (Referenzbilder, Download-PDFs) später nach Supabase Storage – siehe Architektur §8.

---

## H. Sonderpunkte (Wiederholung & Begründung)

1. **Gebäudekommunikation:** Domain heißt intern `gebaeudekommunikation`, Routen `/tuerkommunikation`, `/tuersprechanlagen`, `/briefkastenanlagen`, `/grossanlagen`, `/systemloesungen` bleiben in Etappe 0/1 unverändert. Eine spätere SEO-/Slug-Reform wird separat geplant.
2. **Eingangssysteme:** Domain heißt intern `eingangssysteme`, Routen `/entry-system` und `/entry-system/...` bleiben unverändert.
3. **Service & Wissen:** Aktuell in der Navigation kombiniert. Mapping ordnet zu:
   - **service:** `TechnischerSupport`, `Ersatzteile`, `PlanenKonfigurieren`
   - **wissen:** `Akademie`, `Downloads`
   - Grenzfall **Downloads** → derzeit `wissen` markiert (Inhalts-/Wissensressource), Risiko `mittel`. Endgültige Zuordnung erfolgt mit Navigations-Reform.
4. **Signage:** Vorhandene Seiten (`Signage.tsx`, `Beschilderung.tsx`, `DigitalSignage.tsx`) sind aktuell auf drei Routen verteilt (`/signage`, `/beschilderung`, `/gebaeudemanagement/digital-signage`). Mapping-Vorschlag: alle drei in eine eigene Domain `signage` bündeln. **Alternative Einordnungen** (`gebaeudekommunikation` für statische Beschilderung, `gebaeudemanagement` für Digital Signage) sind möglich – endgültige Entscheidung **vor** der eigentlichen Verschiebung treffen, deshalb Risiko `mittel`. **`DigitaleNamensanzeige.tsx`** bleibt zunächst bei `gebaeudemanagement` (Route-konform), Grenzfall zu Signage dokumentiert.
5. **Personas:** Sechs `*Content.tsx` + zwei `wohnungswirtschaft/*`-Komponenten sind Konsolidierungskandidaten (Ziel: `PersonaShell` + kuratierte `links.ts` pro Persona). Risiko `hoch` wegen UI-Drift, daher klar separate Etappe.
6. **Externe Tools:**
   - `PlanenKonfigurieren.tsx` – Einstiegsseite bleibt in der Site, **die eigentlichen Konfiguratoren (Schaltplan, Namensschild, Planungsassistent) sind extern** und werden nur verlinkt/registriert.
   - `Serviceportal.tsx` – nur Kachel-Übersicht.
   - `PasswortVergessen.tsx`, `Registrieren.tsx` – **Auth-Flows gehören nicht in die Marketing-Site** (Risiko `hoch`); langfristig an externes Login/SSO auslagern.
   - Produktkatalog, Elbridge, 3D-Showroom, Kundenkonto: existieren aktuell **nicht** im Code – bleibt extern.
7. **Assets:** Nur grob nach Präfix gruppiert. Endgültige Zuordnung pro Datei geschieht beim eigentlichen Move zusammen mit den Imports.

---

## I. Als `unklar` markierte / risikoreiche Entscheidungen

| Bereich | Offene Frage |
|---|---|
| **Signage-Bündelung** | Alle drei Signage-Pages in `signage` oder gesplittet? Empfehlung: bündeln. Bestätigung nötig. |
| **DigitaleNamensanzeige** | `gebaeudemanagement` (Route-konform) oder `signage` (inhaltlich)? |
| **Großanlagen vs. anwendungen/Grossanlage** | Inhaltliche Überlappung – Konsolidierung prüfen. |
| **Klinik vs. Gesundheitseinrichtungen / Behörde vs. ÖffentlicheHand** | Cluster-Eltern + Detail – ggf. Detail-Seiten in Cluster-Sektionen mergen. |
| **Objektloesungen / Bildungseinrichtungen** | Top-Level-Routen, inhaltlich Anwendungen – Routen-Reform bei späterer Migration. |
| **UeberTCS** | Eigene Mini-Domain `unternehmen` oder unter `home`? Vorerst `home`. |
| **Auth-Pages (PasswortVergessen, Registrieren)** | Auslagern an externes SSO/Serviceportal-Backend? Empfehlung: ja. |
| **`PlanenKonfigurieren`** | Verbleibt als Marketing-/Einstiegsseite, Konfigurator-Logik extern. |

---

## J. Pilot-Domain-Empfehlung

**Empfehlung: `zutrittskontrolle` als Pilot-Domain für Etappe 2.**

Begründung:
- **Klar abgegrenzt:** 5 Pages (Übersicht + 4 Detailseiten) mit konsistenter Route `/zutrittskontrolle/...`.
- **Wenige Cross-Feature-Imports:** Pages nutzen vor allem `PageLayout`, `HeroSection`-Pattern, `CTASection` – also nur Shared-Komponenten.
- **Geringes inhaltliches Risiko:** Keine Persona-Komponenten betroffen.
- **Kein Auth, keine externen Tools** in dieser Domain.
- **Assets sind über `bcm-*` und `hero-zutrittskontrolle.jpg` klar identifizierbar.**
- **Reversibel:** 5 Dateien lassen sich notfalls schnell zurückrollen.

Alternativen:
- `kontakt` / `karriere` / `presse` (je 1 Datei) sind noch kleiner, aber zu trivial für ein belastbares Pilot-Pattern.
- `eingangssysteme` (8 Pages) ist die zweitbeste Wahl, hat aber den Routen-Sondernamen `/entry-system`.

---

## K. Statistik

- Pages Top-Level: **35**
- Pages Anwendungen: **21**
- Pages Entry: **7**
- Pages Systemtechnik: **1**
- Komponenten Top-Level (ohne `ui/`): **22**
- Komponenten WoWi: **2**
- Datendateien: **1**
- Asset-Dateien: **64** (+ Unterordner `snipdoo/` mit 6 Dateien)
- Domains mit klarer Mehrheit: `anwendungen` (21+), `gebaeudekommunikation` (~9), `zutrittskontrolle` (5), `eingangssysteme` (8), `gebaeudemanagement` (4), `signage` (3), `service` (3), `wissen` (2), Personas (8 Komponenten)
- Als `unklar`/Grenzfall markiert: 8 Bereiche (siehe Abschnitt I)
