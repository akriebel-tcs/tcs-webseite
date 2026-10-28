# Code-Landkarte – TCS Unternehmenswebseite

Diese Datei erklärt die Projektstruktur in einfacher Sprache. Sie richtet sich an alle, die wissen wollen, **wo sich was befindet** und **welche Datei für welche Aufgabe zuständig ist** – auch ohne tiefes Programmierwissen.

> Stand: nach Etappe `hygiene-dead-code-1` (toter Code, tote Assets und tote i18n-Keys entfernt). Vorgänger u. a. `hygiene-status-1`, `hygiene-cta-rest-1`, `hygiene-strictpages-close-1`, `i18n-validator-fix-1`, `hygiene-nav-rest-1`, `footer-rest-hygiene-1`, `i18n-coverage-policy-1`, `i18n-coverage-close-1`.
> Verwandte Dokumente: [`architecture.md`](./architecture.md), [`migration-log.md`](../migration-log.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`current-status.md`](../current-status.md), [`routing-decentralization-plan.md`](./routing-decentralization-plan.md).

---

## 1. Gesamtstruktur

| Ordner | Was liegt dort? | Hier typischerweise ändern | Hier besser nicht ändern |
|---|---|---|---|
| `src/app/` | App-weite Bausteine: zentrale Routensammlung (`routes.tsx`), Fehlerseite (`pages/NotFoundPage.tsx`). | NotFound-Inhalt, neue Feature-Routen einbinden. | Routing-Mechanik nur mit Bedacht. |
| `src/features/` | Fachliche Bereiche der Webseite (eine Unterordner pro Themenwelt, z. B. `gebaeudekommunikation/`, `anwendungen/`). | Seiteninhalte, Bilder, lokale Komponenten der jeweiligen Domain. | Nichts aus fremden Domains hier ablegen. |
| `src/components/` | **Wiederverwendbare** UI-Komponenten und Layout-Renderer (Navigation, Footer, Breadcrumb, PageLayout, ContentBlocks). | Darstellung/Verhalten der globalen UI. | Keine Seitentexte einzelner Themenwelten. |
| `src/navigation/` | **Datenstrukturen** für Navigation (Hauptnav, Footer, Meta, Personas) und zentrale URL-Konstanten. | Reihenfolge, Linkziel, neue Menüpunkte. | Renderer-Logik liegt in `src/components/`. |
| `src/i18n/` | Mehrsprachigkeit: i18next-Konfiguration und Übersetzungsdateien (DE/EN). | Navigationstexte DE/EN. | Schlüsselstruktur nur abgestimmt ändern. |
| `src/contexts/` | React-Contexts (z. B. `PersonaContext` für aktiv markierte Persona). | State-Logik der Personas. | Keine Persona-Texte hier. |
| `src/assets/` | **Globale** Bilder/Medien, die nicht an eine einzelne Domain gebunden sind (z. B. Hero-Bilder der Startseite). | Globale Bilder hinzufügen/austauschen. | Domain-spezifische Bilder gehören in `src/features/<domain>/assets/`. |
| `docs/` | Architektur, Migration-Log, Pläne, Checkpoints, diese Landkarte. | Dokumentation jeder Art. | Keine produktiven Codedateien. |

---

## 2. Feature-Domains

Jede Domain hat eigene Pages, oft eigene Assets und eine eigene `routes.tsx`. Sie ist die **Heimat** eines fachlichen Themas.

| Domain | Zweck | Wichtige Pages | Lokale Assets | Eigene `routes.tsx` | Besonderheiten |
|---|---|---|---|---|---|
| `home` | Startseite und Über-uns. | `HomePage.tsx`, `UeberTCSPage.tsx` | nein (nutzt `src/assets/`) | ja | Startseite bündelt globale Komponenten (Hero, ContentBlocks, Personas). |
| `gebaeudekommunikation` | Türkommunikation, Briefkasten, snipdoo IP, Beschilderung. | `TuerkommunikationPage`, `TuersprechanlagenPage`, `BriefkastenanlagenPage`, `GrossanlagenPage`, `SystemloesungenPage`, `SnipdooIpPage` | ja | ja | Aktive Root: `/gebaeudekommunikation`; Legacy `/tuerkommunikation` als Fallback. |
| `zutrittskontrolle` | Zutritt für Türen, Tore, Aufzüge, Parkplätze. | `ZutrittskontrollePage`, `TuerenTorePage`, `MobilerZutrittPage`, `FahrstuhlsteuerungPage`, `ZufahrtenParkplaetzePage`, `ElektronischeDrueckergarniturPage` (Route `/zutrittskontrolle/elektronische-drueckergarnitur`, Etappe `feature-elektronische-drueckergarnitur-1`; in Hauptnavigation aufgenommen via Etappe `feature-elektronische-drueckergarnitur-navigation-1`) | ja | ja | Pilot-Domain der Migration (Etappe 3b). |
| `gebaeudemanagement` | Digitale Namen, Schränke, Signage, Alarmkopplung. | `GebaeudemanagementPage`, `DigitaleNamensanzeigePage`, `SchraenkeBehaelterPage`, `DigitalSignagePage`, `ReservierenBuchenPage`, `AlarmanlagenkopplungPage` | ja | ja | Eigene Platzhalterseite für Alarmanlagenkopplung (Etappe 14e-1). |
| `eingangssysteme` | Entry-System: Design, Material, Funktionalität, Beratung. | `EntrySystemPage`, `EntryDesignPage`, `EntryMaterialPage`, `EntryFunktionalitaetPage`, `EntryIntegrationsformenPage`, `EntryReferenzenPage`, `EntryStandardsPage`, `EntryBeratungPage` | ja | ja | Aktive Root: `/entry-system`. |
| `anwendungen` | Einsatzfelder (Wohnbau, Pflege, Behörde, Bildung, Objektlösungen, Referenzen). | `AnwendungenPage`, `WohnbauPage`, `PflegePage`, `KlinikPage`, `BehoerdePage`, `BildungseinrichtungenPage`, `ObjektloesungenPage`, `ReferenzprojektePage` u. a. | ja | ja | Bildung und Objektlösungen unter `/anwendungen/...` verschachtelt (14e-6, 14e-7); flache Slugs als Legacy-Fallback. |
| `signage` | Beschilderung & Wayfinding. | `BeschilderungPage`, `SignagePage` | ja | ja | Aktive Route: `/gebaeudekommunikation/beschilderung`; `/signage` und `/beschilderung` Legacy. |
| `service` | Service-Hub, Online-Produktkatalog, Planung, Konfiguration, Downloads, Support, Ersatzteile, Produktdetailseiten. | `ServicePage`, `OnlineProduktkatalogPage`, `PlanenKonfigurierenPage`, `DownloadsPage`, `TechnischerSupportPage`, `ErsatzteilePage`, **`ProductDetailPage`** | nein | ja | Vollständig i18n-migriert. Online-Produktkatalog und PDP lesen read-only aus der externen Supabase-Auslieferungsschicht – Detailstruktur siehe **Abschnitt 2.1**. |
| `serviceportal` | Login-Bereich, Registrierung, Passwort vergessen. | `ServiceportalPage`, `RegistrierenPage`, `PasswortVergessenPage` | nein | ja | Reine Frontend-Stubs – noch kein echter Auth-Backend. |
| `wissen` | Akademie, Wissensangebote. | `AkademiePage` | nein | ja | Vollständig i18n-migriert. Wenige Seiten, baufähig für Erweiterung. |
| `kontakt` | Kontaktseite. | `KontaktPage` | nein | ja | Ankerziel `#kontakt` aus ContentBlocks. |
| `karriere` | Karriereseite. | `KarrierePage` | nein | ja | – |
| `presse` | Presseseite. | `PressePage` | nein | ja | – |
| `personas` | Persona-Inhalte (Architekt, Bauherr, Fachhandel, Fachplaner, Handwerk, Wohnungswirtschaft). | `*Content.tsx`-Komponenten je Persona | teilweise | nein | Keine eigenen Pages – wird via `PersonaSection`/Persona-State in andere Seiten eingebettet. |

---

## 2.1 Service-Domain: Online-Produktkatalog & PDP

Der Online-Produktkatalog und die Produktdetailseite (PDP) sind innerhalb der `service`-Domain als eigener Unterbereich `src/features/service/catalog/` organisiert. Diese Übersicht hilft neuen Bearbeitern, die Verantwortlichkeiten schnell zu finden. Detaillierter Funktionsstand siehe `current-status.md` (Abschnitt „Aktueller Stand: Online-Produktkatalog und PDP").

| Datei / Ordner | Aufgabe |
|---|---|
| `src/features/service/catalog/components/CatalogMvp.tsx` | **Katalog-Einstieg.** Headline, Subline, Suche, Kategorie-Chips, Filterzeile, Sortierung, Trefferzahl, Reset, Starthinweis. Implementiert das Filter-/Such-Gate (Karten erscheinen erst nach aktiver Auswahl: Chip, Filter oder Suche ≥ 2 Zeichen). |
| `src/features/service/catalog/components/CatalogProductGrid.tsx` | **Produktkarten im Listing.** Bild aus `primary_image_*`, Titel/Untertitel, Preis, Klassifikations-Pills, Klickbarkeit über `pdp_slug_resolved` / `pdp_slug` / `artikel_nr`. |
| `src/features/service/catalog/components/CatalogFilters.tsx` | **DB-getriebene Filter** ausschließlich aus `product_filter_options_view`. Quick-Filter-Pills für `system_typ`, `montageart`, `wohneinheiten`, `ip_gateway`, weitere Gruppen als Selects. |
| `src/features/service/catalog/components/CatalogStatus.tsx` | Status-/Diagnose-Zeile. Diagnose-Panel nur in Dev-Modus sichtbar. |
| `src/features/service/pages/ProductDetailPage.tsx` | **PDP-Container.** Auflösung Slug → `artikel_nr` über Resolver, Laden über `rpc_get_product_pdp`, Komposition der PDP-Sub-Komponenten. Hero-Bild deaktiviert. |
| `src/features/service/catalog/components/pdp/` | **Strukturierte PDP-Sub-Komponenten:** `ProductPdpHeader`, `ProductPdpSummary`, `ProductPdpTechnicalData`, `ProductPdpInfoTable`, `ProductPdpDocuments`, geteilte Typen in `types.ts`. Leere Sektionen blenden sich automatisch aus. |
| `src/features/service/catalog/api/catalog.ts` | **Read-only Zugriff** auf `product_catalog_view` (`getAllCatalogProducts`, in 1000er-Blöcken), `product_filter_options_view`, `column_presets`, `product_column_definitions`, lesende RPC `rpc_get_catalog_context`. Ausschließlich `select(...)`. |
| `src/features/service/catalog/api/pdp.ts` | **Slug-Auflösung** über gezielte `.eq(...).limit(1)`-Queries gegen `product_pdp_view` (Felder `pdp_slug_resolved`, `pdp_slug`, `slug`, `artikel_nr`), Fallback `product_catalog_view`, strenger Direkt-Fallback `artikel_nr`. **PDP-RPC** `rpc_get_product_pdp(p_artikel_nr, p_locale)`. |
| `src/features/service/catalog/api/diagnostics.ts` | Read-only Diagnose-Checks (Konfiguration, RPC-Erreichbarkeit, View-Erreichbarkeit, Preset-Verfügbarkeit). Ergebnis fließt in `CatalogStatus`. |
| `src/features/service/catalog/lib/columnModel.ts` | Spaltenmodell-Resolver (Preset → Spalten), Filter-Gruppierung, tolerante Spaltennamenskonventionen (`*_resolved`, `*_de`, `*_en`). |
| `src/features/service/catalog/lib/pdpAssets.ts` | URL-Bildung für PDP-Bilder/Dokumente (direkte URL-Felder bevorzugt, sonst `bucket + path` mit Default-Buckets `article-images` / `article-documents`). |

**Wichtige Regeln (zur Erinnerung):**

- Strikt **read-only** gegen die externe Produktdatenbank (`tkscpnwbkjmqopnddxle`). Keine `insert/update/delete/upsert`, keine schreibenden RPCs, kein `service_role`-Key.
- **Zwei strikt getrennte Supabase-Clients:**
  - **Produktdatenbank-Client:** `src/lib/supabase/client.ts` (extern, read-only), liest `VITE_PRODUCT_SUPABASE_URL` / `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY` (Fallback `tkscpnwbkjmqopnddxle`).
  - **CMS-Light-/Lovable-Cloud-Client:** `src/integrations/supabase/client.ts` (intern, Lovable Cloud `uvkubrrljyzfvbvejepl`), nutzt die generischen `VITE_SUPABASE_*`. **Nur** für redaktionelle CMS-Inhalte zulässig.
  - Beide Clients dürfen nicht vermischt werden. Produktdaten werden **nicht** in CMS-Tabellen kopiert.
- **Keine erfundenen Slugs, URLs, Klassifikationen.** Werte stammen ausschließlich aus den DB-Views/RPCs der freigegebenen Auslieferungsschicht (Manifest / `api_v1_*` / lesende `rpc_*`).
- **Keine Direktzugriffe** auf interne Bild-/Dokumenttabellen aus dem Frontend; bevorzugt `public_url`-Felder, keine eigene Storage-Pfad-Erfindung.
- CMS-Light-Migrationen existieren ausschließlich für redaktionelle Inhalte (`cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`). Die Produktdatenbank bleibt extern und wird vom Webseitenprojekt **nicht** migriert.

---


## 3. Routing

Routing ist **dezentral**: jede Domain bringt ihre eigenen Routen mit. Die App sammelt sie an einer Stelle ein.

| Datei | Aufgabe |
|---|---|
| `src/features/**/routes.tsx` | **Pro Domain**: exportiert ein JSX-Fragment mit `<Route path="..." element={<Page />} />`. Hier werden auch Legacy-/Fallback-URLs eingetragen. |
| `src/app/routes.tsx` | **Sammelstelle**: importiert alle Feature-Route-Fragmente und stellt sie als ein zusammengesetztes Element bereit. |
| `src/App.tsx` | **App-Schale**: enthält Provider (Router, QueryClient, Tooltip, i18n), globale Layout-Bestandteile und den zentralen `<Routes>`-Block, der `appRoutes` rendert. |
| `src/app/pages/NotFoundPage.tsx` | **404-Seite** – bewusst zentral, nicht in einer Feature-Domain. |

Wichtig:

- Es gibt **kein** `src/pages/`-Verzeichnis mehr. Wer eine Seite sucht, schaut in `src/features/<domain>/pages/` oder `src/app/pages/`.
- Eine neue Seite anlegen heißt: Page-Komponente in der Domain anlegen **und** den Eintrag in der jeweiligen `routes.tsx` der Domain ergänzen.
- Legacy-URLs werden bewusst als zusätzliche `<Route>` neben der aktiven Route belassen, damit Bestandslinks nicht brechen.

---

## 4. Navigation

Die Navigation ist sauber getrennt in **Daten** (`src/navigation/`) und **Darstellung** (`src/components/`).

| Datei | Aufgabe |
|---|---|
| `src/navigation/routes.ts` | **Zentrale URL-Konstanten** (`ROUTES.gebaeudekommunikation.root` usw.). Single source of truth für interne Linkziele. Enthält auch `*Legacy`-Konstanten, die **nicht** aktiv verlinkt werden sollen. |
| `src/navigation/mainNavigation.ts` | **Hauptnavigation** mit Top-Level-Bereichen und ihren Dropdown-Children. Reihenfolge im Array = Reihenfolge im Dropdown. |
| `src/navigation/footerNavigation.ts` | **Footer-Spalten** und Bottom-Bar (Legal). |
| `src/navigation/metaNavigation.ts` | **Meta-Leiste** oben rechts: Kontakt, Karriere, Presse, Serviceportal. |
| `src/navigation/personaNavigation.ts` | **Persona-Leiste**: Architekt, Bauherr, Fachhandel, Fachplaner, Handwerk, Wohnungswirtschaft. |
| `src/navigation/types.ts` | TypeScript-Typen für alle Navigationsstrukturen (`NavItem`, `LinkType`, `Status`, `Badge` …). |

### Status-Werte (kurz erklärt)

| Status | Bedeutung |
|---|---|
| `active` | Link zeigt auf eine echte, freigegebene Seite. |
| `pending` | Link zeigt aktuell ersatzweise auf eine andere Seite (z. B. weil Zielinhalt noch fehlt). Wird später korrigiert. |
| `placeholder` | Link ist bewusst noch nicht aktiv (z. B. Legal-Links `"#"`). |

### Legacy-/Fallback-Routen

Bei Slug-Umzügen (z. B. `/objektloesungen` → `/anwendungen/objektloesungen`) bleibt die alte URL als zusätzliche Route bestehen, **ohne** aktiv verlinkt zu werden. So funktionieren externe/alte Links weiter, ohne dass die neue, fachlich saubere Struktur darunter leidet.

---

## 5. Renderer-Komponenten

Diese Komponenten **machen sichtbar**, was in `src/navigation/` als Daten liegt – oder bilden globale Layout-Bausteine.

| Datei | Aufgabe |
|---|---|
| `src/components/MainNavigation.tsx` | Rendert die Hauptnavigation, Dropdowns, aktive Markierung des Top-Level-Bereichs (URL-basiert, mit `aria-current`). |
| `src/components/MetaNavigation.tsx` | Rendert die Meta-Leiste und die Persona-Auswahl. |
| `src/components/Footer.tsx` | Rendert den Footer (Spalten + Bottom-Bar) auf Basis von `footerNavigation.ts`. |
| `src/components/AutoBreadcrumb.tsx` | Erzeugt automatische Breadcrumbs aus der URL. Slug-Labels (z. B. `objektloesungen` → „Objektlösungen") werden hier gepflegt. |
| `src/components/PageLayout.tsx` | Standard-Seitengerüst (Hero, Sections, Spacing) für die meisten Unterseiten. |
| `src/components/ContentBlocks.tsx` | Inhaltsblock-Sektion auf der Startseite (6 Themenblöcke mit Bild + Text + interner Link). Nutzt `ROUTES`-Konstanten. |
| `src/components/PersonaSection.tsx` | Rendert die Persona-Kacheln auf der Startseite und deren Verhalten (Auswahl, Reset). |

**Faustregel**

- Datenstruktur ändern → in `src/navigation/`.
- Sichtbare Darstellung ändern → in `src/components/`.
- Inhalt einer einzelnen Seite ändern → in `src/features/<domain>/pages/`.

---

## 6. i18n (Mehrsprachigkeit)

| Datei | Aufgabe |
|---|---|
| `src/i18n/index.ts` | Initialisiert i18next, lädt die Locale-Dateien. |
| `src/i18n/locales/de/navigation.json` | Deutsche Navigationstexte (Hauptnav, Dropdowns, Footer, Meta). |
| `src/i18n/locales/en/navigation.json` | Englische Navigationstexte. |
| `src/i18n/locales/de/common.json` | Allgemeine deutsche Texte (knapp gehalten). |
| `src/i18n/locales/en/common.json` | Allgemeine englische Texte. |

Wichtig zum aktuellen Stand:

- **Sprachumschalter ist aktiv** (Header), persistiert via `i18next` + `localStorage`.
- **17 Namespaces sind in `src/i18n/index.ts` registriert**: `common`, `navigation`, `home`, `personas`, `kontakt`, `karriere`, `presse`, `serviceportal`, `gebaeudekommunikation`, `zutrittskontrolle`, `gebaeudemanagement`, `eingangssysteme`, `anwendungen`, `signage`, `service`, `wissen`, `legal`.
- **68 Seiten** sind in `scripts/i18n/i18n-check.config.json` als `strictPages` aufgenommen, **2 Pages** als `exemptPages` mit Begründung dokumentiert (`HomePage.tsx` als Container-Page, `AnwendungDetailPage.tsx` als Hilfskomponente). Seit Etappe `hygiene-strictpages-close-1` deckt `strictPages` alle gerouteten i18n-fähigen Pages ab. `npm run i18n:check` meldet aktuell **0 Fehler und 0 Warnungen**. Definitionen für *Page*, *Container-Page* und *Hilfskomponente* siehe `i18n-strategy.md`.
- **`_meta.status`-Stand** (DE/EN je): alle Domain-Namespaces stehen auf `migrated`, mit Ausnahme von `legal` (`in-progress` – Inhalte sind redaktionell offen). `common` und `navigation` führen kein `_meta`-Feld.
- **Legal**: Domain technisch angelegt (Impressum, Datenschutz, AGB), Inhalte redaktionell offen und in der UI als „in Bearbeitung" markiert.
- EN-Label des Bereichs Anwendungen ist `Use cases` (DE bleibt `Anwendungen`); URLs/Slugs unverändert.
- Globaler PageLayout-CTA läuft über `common.pageCta.*`.
- **Kein /de-/en-Routing** – URLs sind sprachneutral. URL-Sprachstrategie ist eine spätere Entscheidung.

### Empfohlene i18n-Ablage (Variante A)

Künftig sollen Seitentexte schrittweise aus TSX-Dateien in **zentrale i18n-Dateien pro Feature-Domain** ausgelagert werden. Empfohlenes Muster:

```
src/i18n/locales/de/home.json
src/i18n/locales/en/home.json
src/i18n/locales/de/personas.json
src/i18n/locales/en/personas.json
src/i18n/locales/de/gebaeudekommunikation.json
src/i18n/locales/en/gebaeudekommunikation.json
src/i18n/locales/de/zutrittskontrolle.json
src/i18n/locales/en/zutrittskontrolle.json
src/i18n/locales/de/gebaeudemanagement.json
src/i18n/locales/en/gebaeudemanagement.json
src/i18n/locales/de/eingangssysteme.json
src/i18n/locales/en/eingangssysteme.json
src/i18n/locales/de/anwendungen.json
src/i18n/locales/en/anwendungen.json
…
```

Konvention:

- **Ein Feature-Bereich = ein i18n-Namespace.** Der Dateiname (ohne `.json`) ist gleichzeitig der Namespace.
- **Deutsch ist Master-Sprache.** Neue Texte zuerst in `de/<namespace>.json` ergänzen.
- **Englisch hat dieselbe Key-Struktur** wie Deutsch – jede neue Schlüsselebene muss in beiden Dateien existieren.
- **Keine extrem kleinteiligen Dateien** pro Persona oder pro Seite anlegen, solange eine Domain-Datei handhabbar bleibt.
- **Bei sehr großen Domains** (Faustregel: über ca. 500–800 Zeilen) kann später gezielt gesplittet werden, z. B. `anwendungen.json` + `anwendungen.referenzen.json`. Erst splitten, wenn es nötig wird.
- **Keine Sammeldateien über Domains hinweg.** Jede Domain bleibt für ihre Texte selbst verantwortlich.

### i18n-Pflege per Prompt

Damit Textänderungen eindeutig adressierbar sind, sollen Änderungen künftig immer über **Namespace + Key** beschrieben werden – nicht mehr über vage Ortsangaben.

Beispiel:

- Namespace: `personas`
- Key: `architekt.solutions.signage.headline`
- Sprache(n): `de` und `en`

Regeln:

- **Nicht** mehr „ändere irgendeinen Text auf der Architektenseite", sondern **immer** Namespace und Key benennen.
- **Jede Textänderung berücksichtigt DE und EN.** Wenn die englische Übersetzung noch nicht final ist, wird sie zumindest strukturell als Key angelegt (auch mit deutschem Platzhaltertext, wenn nötig markiert).
- **Neue Texte** sollen möglichst nicht mehr direkt hart in TSX ergänzt werden, sondern als i18n-Keys in der zuständigen Domain-Datei und über `useTranslation("<namespace>")` + `t("…")` eingebunden werden.
- **Key-Struktur** folgt der fachlichen Hierarchie: `<seite>.<abschnitt>.<element>` (z. B. `wohnbau.hero.title`, `wohnbau.hero.subtitle`).

---

## 7. Personas

| Bereich | Aufgabe |
|---|---|
| `src/contexts/PersonaContext.tsx` | Hält die aktive Persona im React-State (z. B. „Architekt"). |
| `src/features/personas/<persona>/components/*Content.tsx` | Persona-spezifische Inhalte: Hero, Kacheln, Empfehlungen. Verlinkt in Feature-Domains über aktive `ROUTES`-Konstanten. |
| `src/components/PersonaSection.tsx` | Rendert die Persona-Auswahl auf der Startseite. |
| `src/navigation/personaNavigation.ts` | Datenstruktur der 6 Personas (Reihenfolge, Labels, Linkziele). |

Konzept:

- Personas sind **kuratierte Einstiegsperspektiven**, keine eigenen Produktdomains. Sie wiederholen keine Produkte, sondern verlinken in die Fachbereiche.
- Persona-Kacheln verlinken auf aktive Routen (keine Legacy-URLs).
- Sobald ein Nutzer in einen Fachbereich navigiert, wird der Persona-Aktivzustand zurückgesetzt (Etappe 14e-2), damit die Persona-Markierung nicht fälschlich „kleben" bleibt.

---

## 8. Assets

| Ort | Wofür |
|---|---|
| `src/features/<domain>/assets/...` | **Domain-spezifische** Bilder (z. B. `gebaeudekommunikation/assets/tuersprechanlagen/...`). Folgen ihrer Domain. |
| `src/assets/...` | **Globale** Bilder, die mehrere Domains nutzen oder zur App-Schale gehören (z. B. Block-Teaser-Bilder der Startseite). |
| Externe URLs | Werden vermieden. Aktuell sind alle aktiv genutzten Bilder lokal. |

Regel: **Assets folgen Features, aber gemeinsam genutzte Assets bleiben global.** Wer ein Bild nur in einer Domain braucht, legt es dort ab. Wer es an mehreren Stellen braucht, lässt es global.

---

## 9. Dokumentation (Überblick)

| Datei | Inhalt |
|---|---|
| `docs/README.md` | Einstieg und Überblick über die Dokumentationsstruktur. |
| `docs/current-status.md` | Kompakte Statusübersicht des Projekts. |
| `docs/ai-start-prompt.md` | Startprompt für neue KI-Chats inkl. operativer Arbeitsweise. |
| `docs/02-architecture/architecture.md` | Zielarchitektur und Leitplanken. |
| `docs/migration-log.md` | Chronologische Liste **aller** Migrations-Etappen mit Datum, Scope und Bemerkung. |
| `docs/02-architecture/routing-decentralization-plan.md` | Plan und Vorgehen zur Routing-Dezentralisierung. |
| `docs/02-architecture/technical-hygiene-check.md` (+ Checkpoint in `05-checkpoints/`) | Hygiene-Audits (Imports, ungenutzte Dateien, Routenkonsistenz). |
| `docs/05-checkpoints/architecture-checkpoint-*.md` | Architekturstände nach größeren Etappen (5d, 8d, 10e, 11f). |
| `docs/04-pilot-plans/pilot-*-plan.md` | Pilot-Pläne pro Domain (Zutrittskontrolle, Eingangssysteme, Anwendungen, Personas …). |
| `docs/03-inventories/navigation-inventory.md` | Inventar der ursprünglichen Navigation (vor Bereinigung). |
| `docs/01-strategy/asset-strategy.md` | Asset-Mapping und Ordnungsregeln. |
| `docs/01-strategy/production-readiness-plan.md` | Strategischer Produktionsfahrplan. |
| `docs/01-strategy/i18n-strategy.md` | i18n-Konventionen und Stand. |
| `docs/01-strategy/serviceportal-status.md` | Serviceportal-Stand. |
| `docs/03-inventories/migration-mapping.md` | Mapping „alte Datei → neue Heimat". |
| `docs/02-architecture/code-landkarte.md` | **Diese Datei.** |

---

## 10. Praktische Änderungsbeispiele

| Ich will ändern… | Datei / Ort |
|---|---|
| Reihenfolge im Dropdown | `src/navigation/mainNavigation.ts` |
| Linkziel eines Dropdown-Eintrags | `src/navigation/mainNavigation.ts` + ggf. `src/navigation/routes.ts` |
| Footer-Link | `src/navigation/footerNavigation.ts` |
| Meta-Link (Kontakt/Karriere/Presse/Serviceportal) | `src/navigation/metaNavigation.ts` |
| Neue Seite in Domain | `src/features/<domain>/pages/` + `src/features/<domain>/routes.tsx` |
| Breadcrumb-Label für neuen Slug | `src/components/AutoBreadcrumb.tsx` |
| Navigationstext DE/EN | `src/i18n/locales/de/navigation.json` und `…/en/navigation.json` |
| Startseiten-Teaser (6 Themenblöcke) | `src/components/ContentBlocks.tsx` |
| Persona-Kacheln einer Persona | `src/features/personas/<persona>/components/*Content.tsx` |
| Bild einer Domain-Seite | `src/features/<domain>/assets/` (oder `src/assets/`, falls global geteilt) |
| 404-Inhalt | `src/app/pages/NotFoundPage.tsx` |
| Neue URL-Konstante | `src/navigation/routes.ts` |

---

## 11. Ampel für Änderungen

Nicht jede Datei lässt sich gleich gefahrlos anfassen. Diese Ampel hilft, das Risiko einer Änderung schnell einzuschätzen – ganz ohne Programmierwissen.

- 🟢 **Grün** = redaktionell gut änderbar (Texte, Übersetzungen, Dokumentation).
- 🟡 **Gelb** = nur mit Vorsicht / nach kurzer Prüfung (Reihenfolgen, Linkziele, Inhalte mit Querverweisen).
- 🔴 **Rot** = nicht ohne technische Prüfung ändern (Routing, App-Schale, zentrale Renderer).

| Bereich / Datei | Ampel | Bedeutung |
|---|---|---|
| `src/i18n/locales/de/*.json` | 🟢 | Deutsche Texte pflegen. |
| `src/i18n/locales/en/*.json` | 🟢 | Englische Übersetzungen pflegen. |
| `docs/` | 🟢 | Dokumentation pflegen. |
| `src/navigation/mainNavigation.ts` | 🟡 | Reihenfolge und Linkziele der Hauptnavigation – danach Header/Dropdowns kurz prüfen. |
| `src/navigation/footerNavigation.ts` | 🟡 | Footer-Links – danach Footer kurz prüfen. |
| `src/navigation/metaNavigation.ts` | 🟡 | Meta-Leiste (Kontakt/Karriere/Presse/Serviceportal) – Sichtprüfung. |
| `src/navigation/personaNavigation.ts` | 🟡 | Persona-Leiste – Sichtprüfung. |
| `src/features/**/pages/*.tsx` | 🟡 | Seiteninhalte liegen teils noch dort; künftig besser über i18n auslagern. |
| `src/components/ContentBlocks.tsx` | 🟡 | Startseiten-Teaser – Links müssen `ROUTES`-Konstanten nutzen. |
| `src/components/AutoBreadcrumb.tsx` | 🟡 | Slug-Labels für Breadcrumb – kurz im Kontext prüfen. |
| `src/navigation/routes.ts` | 🔴 | Zentrale URL-Konstanten – nur kontrolliert ändern, da überall referenziert. |
| `src/components/MainNavigation.tsx` | 🔴 | Renderer-Logik, aktive Zustände, Accessibility. |
| `src/components/Footer.tsx` | 🔴 | Renderer-Logik des Footers. |
| `src/App.tsx` | 🔴 | App-Schale, Provider, zentrales Routing. |
| `src/app/routes.tsx` | 🔴 | Sammelstelle aller Routen. |
| `src/features/**/routes.tsx` | 🔴 | Routen und Legacy-Fallbacks – nur technisch kontrolliert ändern. |
| `src/i18n/index.ts` | 🔴 | i18n-Initialisierung und Namespace-Registrierung. |

Faustregel:

- **Texte und Übersetzungen** → 🟢, immer in `src/i18n/locales/`.
- **Reihenfolgen und Linkziele in der Navigation** → 🟡, in `src/navigation/`.
- **Routing, App-Schale, zentrale Renderer** → 🔴, mit technischer Begleitung.

---

## Kurzform: „Wo finde ich…?"

- **Eine Seite** → `src/features/<domain>/pages/`
- **Einen Menüpunkt** → `src/navigation/mainNavigation.ts`
- **Ein Linkziel als Konstante** → `src/navigation/routes.ts`
- **Den Footer** → Daten in `src/navigation/footerNavigation.ts`, Darstellung in `src/components/Footer.tsx`
- **Übersetzungen der Navigation** → `src/i18n/locales/{de,en}/navigation.json`
- **Globale Bilder** → `src/assets/` · **Domain-Bilder** → `src/features/<domain>/assets/`
- **Architektur und Historie** → `docs/02-architecture/architecture.md`, `docs/migration-log.md`

---

## 12. Route / Feature-Ordner / Namespace

Die Projektstruktur folgt grundsätzlich Feature-Domains: Eine Route einer Domain wird in der Regel von einer TSX-Datei im gleichnamigen Feature-Ordner gerendert und nutzt den gleichnamigen i18n-Namespace.

Es können jedoch **historische Sonderfälle** existieren, bei denen Route, Datei-Ort und i18n-Namespace nicht identisch wirken. Solche Sonderfälle dürfen nicht stillschweigend entstehen – sie müssen dokumentiert und bei Final-Checks routebasiert geprüft werden.

### Bekannter Sonderfall

| Route | TSX-Datei | Feature-Ordner | i18n-Namespace | Begründung |
|---|---|---|---|---|
| `/gebaeudekommunikation/beschilderung` (auch `/beschilderung` als Legacy) | `BeschilderungPage.tsx` | `src/features/signage/` | `gebaeudekommunikation` | Seite ist fachlich der Gebäudekommunikation zugeordnet, liegt aber historisch in der Domain `signage` (siehe Etappen 8a/8b). Der Namespace folgt der fachlichen Route, nicht dem Datei-Ort. |

### Konsequenz für Final-Checks

Final-Checks prüfen daher immer routebasiert: **Route → tatsächlich gerenderte TSX-Datei → Feature-Ordner → i18n-Namespace → strictPages.** Nicht nur den erwarteten Domain-Ordner prüfen. Details siehe `docs/ai-start-prompt.md` (Abschnitt „Routebasierte Final-Check-Pflicht") und `docs/01-strategy/i18n-strategy.md` (Abschnitt „Routebasierte i18n-Prüfung").
