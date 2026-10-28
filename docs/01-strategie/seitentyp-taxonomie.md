# Seitentyp-Taxonomie – TCS Unternehmenswebseite (v2)

Diese Datei beschreibt, **welche Seitentypen es auf der TCS-Unternehmenswebseite geben soll, welche Pflichtbausteine jeder Typ enthält, welches Primärziel und welche Hauptkonversion er verfolgt, und wie der heutige Bestand auf diese Typen abgebildet wird**.

Sie ist die **architektonische Grundlage** für alle künftigen Inhalts-, Navigations- und Strukturarbeiten. Jeder neue Lovable-Prompt, jede neue Seite und jede Strukturdebatte soll sich gegen dieses Dokument prüfen lassen.

> Ablageort im Projekt: `docs/01-strategie/seitentyp-taxonomie.md`
>
> Verwandte Dokumente: [`i18n-strategie.md`](./i18n-strategie.md), [`url-sprachstrategie.md`](./url-sprachstrategie.md), [`../02-architektur/architektur.md`](../02-architektur/architektur.md)
>
> **Änderungen gegenüber v1:**
> - Typenkatalog in **4 Cluster** gegliedert (Kern, Wissen, Unternehmen, System).
> - **T16 aufgetrennt** in T16a (Service-Hub) und T16b (Service-Unterseite).
> - **Akademie** Primärtyp festgelegt: Teil von Wissen (T10b), Service verlinkt dorthin.
> - **T04-URL-Empfehlung** explizit: `/<domain>/<kategorie>/<produkt-slug>`.
> - Neue Dimensionen pro Typ: **Primärziel** und **Hauptkonversion**.
> - Neuer Abschnitt: **Anti-Pattern pro Typ („Nicht tun")**.

---

## 1. Warum dieses Dokument

Der aktuelle Projektstand hat eine saubere Domainstruktur und eine wachsende Zahl fachlicher Seiten, aber **keine einheitlich definierten Seitentypen**. In der Folge baut jede neue Seite ihren eigenen Inhaltsaufbau, und der Unterschied zwischen „Hub", „Lösung", „Produktkategorie" und „Branche" ist im Code nicht sichtbar.

Eine Seitentyp-Taxonomie liefert vier Dinge gleichzeitig:

1. **Redaktion weiß, wie eine Seite aufgebaut sein muss** – Pflichtbausteine pro Typ.
2. **Entwicklung weiß, welches Template zu bauen ist** – wiederverwendbare Shells statt Einzel-Unikate.
3. **SEO/AEO/GEO weiß, welche strukturellen Signale zu liefern sind** – JSON-LD, Answer-First, FAQ, interne Verlinkung.
4. **Marketing/Vertrieb wissen, welche Rolle eine Seite in der Customer Journey spielt** – Primärziel und Hauptkonversion.

Die Taxonomie ersetzt keine Inhalte, sie rahmt sie.

---

## 2. Leitprinzipien

1. **Jede öffentliche Seite hat genau einen Seitentyp** und gehört genau einem **Cluster** an.
2. **Jeder Typ hat Pflichtbausteine.** Was fehlt, bleibt nicht einfach weg, sondern wird als „in redaktioneller Bearbeitung" markiert.
3. **Jeder Typ hat genau ein Primärziel und eine Hauptkonversion.** Alles weitere ist sekundär.
4. **Jeder Typ hat einen Template-Bestandteil im Code.** Neue Seiten erweitern Templates, sie konstruieren keinen neuen Aufbau.
5. **Answer-First ist für alle Content-Typen Standard.** Unter jeder H2/H3 steht in 40–60 Wörtern eine direkte, zitierfähige Antwort.
6. **Interne Verlinkung ist Pflichtbaustein**, nicht Dekoration.
7. **Jeder Typ hat eine URL-Konvention.**
8. **Jeder Typ hat ein JSON-LD-Schema** oder ist bewusst von Strukturierung ausgenommen.
9. **Jeder Typ hat Anti-Pattern** (siehe Abschnitt 12), die nicht wiederkehren dürfen.

---

## 3. Typenkatalog

### 3.1 Cluster-Übersicht

Die 22 Typen gliedern sich in 4 Obergruppen. Für operative Gespräche, Prompts und Reviews reicht in den meisten Fällen die Cluster-Ebene — die Typ-Ebene ist für Templates und Pflichtbausteine gedacht.

| Cluster | Rolle | Typen |
|---|---|---|
| **Kern** | Das eigentliche Produkt-/Lösungsangebot, inkl. Anwendungen und Referenzen. | T01, T02, T03, T04, T05, T06, T07, T08, T09 |
| **Wissen** | Fachliche Autorität, AEO/GEO-Hebel, Entscheidungsunterstützung. | T10a, T10b, T11, T12, T13, T14, T15 |
| **Unternehmen** | Vertrauen, E-E-A-T, Kontakt/Karriere/Presse, Rechtliches. | T18, T19, T20 |
| **System** | Service-Ebene und technische Hilfsseiten. | T16a, T16b, T17, T21 |

### 3.2 Typen-Übersicht (kompakt)

| Kürzel | Typ | Cluster | Primärziel | Hauptkonversion | Bestand? |
|---|---|---|---|---|---|
| T01 | Domain-Hub | Kern | Orientierung | Weiterklick auf T02/T03/T05 | ✅ |
| T02 | Systemlösung | Kern | Lösungsverständnis | Beratung anfragen | ✅ |
| T03 | Produktkategorie | Kern | Vergleich & Vorauswahl | Weiterklick auf T04 | ✅ |
| T04 | Produktdetail (PDP) | Kern | technische Entscheidung | Datenblatt-Download / RFQ | ❌ fehlt |
| T05 | Anwendungs-/Branchenseite | Kern | Einsatzfeld-Verständnis | Beratung anfragen / Referenz ansehen | ✅ |
| T06 | Funktions-/Feature-Seite | Kern | Funktions-Verständnis | Weiterklick auf T03/T04 oder Beratung | ✅ |
| T07 | Referenzliste | Kern | Autoritätsbeleg | Weiterklick auf T08 | ✅ |
| T08 | Referenzdetail | Kern | Vertrauensbildung | Beratung anfragen / Ähnliche Referenz ansehen | ✅ |
| T09 | Persona-/Rolleneinstieg | Kern | Einstieg aus Rollensicht | Weiterklick auf kuratierte T01/T02/T05 | ✅ (Overlay) |
| T10a | Wissens-Hub | Wissen | Wissensorientierung | Weiterklick auf T11/T12/T14 | teilweise |
| T10b | Akademie | Wissen | Schulungs-/Lernangebot | Schulung buchen | ✅ (als `AkademiePage`) |
| T11 | Wissensartikel / Fachbeitrag | Wissen | Wissensaufbau | Verwandter Artikel / passendes T03/T04 | ❌ fehlt |
| T12 | FAQ-Hub | Wissen | schnelle Fachantwort | Verwandtes T11 / Beratung | ❌ fehlt |
| T13 | FAQ-Eintrag (optional) | Wissen | Zitierbare Einzelantwort | Verwandtes T11 | ❌ fehlt, optional |
| T14 | Glossar-Hub | Wissen | Begriffsorientierung | Weiterklick auf T15 | ❌ fehlt |
| T15 | Glossar-Eintrag | Wissen | Begriffsdefinition | Verwandter Artikel/Produkt | ❌ fehlt |
| T16a | Service-Hub | System | Service-Orientierung | Weiterklick auf T16b / Serviceportal | ✅ |
| T16b | Service-Unterseite | System | Servicezugang | konkrete Service-Aktion (Download, Bestellung, Kontakt) | ✅ |
| T17 | Serviceportal (geschützt) | System | Bestandskunden-Self-Service | Auth / Funktionsnutzung | ✅ (Stub) |
| T18 | Vertrauens-/Unternehmensseite | Unternehmen | Vertrauensbildung | Beratung anfragen / Referenz ansehen | ✅ (schwach) |
| T19 | Meta-Seite (Kontakt / Karriere / Presse) | Unternehmen | Unternehmens-Kontaktpunkt | Anfrage / Bewerbung / Pressezugang | ✅ |
| T20 | Legal-Seite | Unternehmen | Rechtliche Compliance | (keine) | ✅ (Stub) |
| T21 | Fehlerseite | System | Wiedereinstieg | Rückweg zur Startseite | ✅ |

---

## 4. Detailbeschreibung pro Typ

Jeder Eintrag folgt demselben Schema: **Zweck · Primärziel · Hauptkonversion · Pflichtbausteine · URL-Muster · Template · i18n-Namespace · SEO/AEO-Hinweise · Crosslink-Slots**. Anti-Pattern stehen gesammelt in Abschnitt 12.

### T01 – Domain-Hub (Cluster: Kern)

- **Zweck:** Breiter Themeneinstieg in eine Fachdomain. Orientierung, nicht Verkauf.
- **Primärziel:** Orientierung.
- **Hauptkonversion:** Weiterklick auf T02/T03/T05.
- **Pflichtbausteine:**
  - Hero (label, headline, intro)
  - Answer-First-Block: „Was ist <Domain>?" in 40–60 Wörtern
  - Unterbereiche als Kacheln (3–6), je mit Bild, Headline, 1-Satz-Teaser, Link auf T02/T03/T06
  - „Für welche Anwendungen?" – Verweise auf 3–5 passende T05
  - Systemnutzen-Block (3–5 Bullets)
  - FAQ-Teaser (3–5 Fragen, Link auf Domain-Anker im T12)
  - Beratungs-CTA (konkretes Ziel, kein `href="#"`)
- **URL-Muster:** `/<domain>` (z. B. `/zutrittskontrolle`)
- **Template:** `<DomainHubTemplate />`
- **i18n-Namespace:** `<domain>`
- **SEO/AEO:** `BreadcrumbList`-JSON-LD Pflicht. Meta-Title: `<Domain> | TCS`. Description aus `<domain>.root.seo.description`.
- **Crosslinks (Pflicht):** Unterbereiche (T02/T03/T06), passende Anwendungen (T05), Service-Hub (T16a), FAQ-Anker der Domain (T12).

### T02 – Systemlösung (Cluster: Kern)

- **Zweck:** Eine ganzheitliche, meist produktübergreifende Lösung darstellen.
- **Primärziel:** Lösungsverständnis.
- **Hauptkonversion:** Beratung anfragen.
- **Pflichtbausteine:**
  - Hero
  - Answer-First („Was leistet die Systemlösung?")
  - Problem / Ausgangslage
  - Systemprinzip in 3–5 Bausteinen (mit Diagramm)
  - Zielgruppen/Rollen (Tabs/Kacheln, Verweis auf T09)
  - Anwendungsfälle (Verweise auf 3–5 T05)
  - „Aus welchen Produkten besteht die Lösung?" (Verweise auf T03/T04)
  - Referenzen (Verweise auf 2–3 T08)
  - FAQ (5–8, mit `FAQPage`-Schema)
  - Downloads (Systembroschüre, Datenblätter)
  - Beratungs-CTA
- **URL-Muster:** `/<domain>/<loesung-slug>`
- **Template:** `<SolutionTemplate />`
- **i18n-Namespace:** `<domain>`, Schlüssel `<loesung>.*`
- **SEO/AEO:** `BreadcrumbList` + optional `TechArticle`. FAQ-Block mit `FAQPage`.
- **Crosslinks (Pflicht):** Mutter-Hub (T01), Anwendungen (T05), Produktkategorien (T03), Wissensartikel (T11).

### T03 – Produktkategorieseite (Cluster: Kern)

- **Zweck:** Überblick über eine Produktfamilie. **Keine einzelne SKU-Beschreibung.**
- **Primärziel:** Vergleich & Vorauswahl.
- **Hauptkonversion:** Weiterklick auf T04.
- **Pflichtbausteine:**
  - Hero
  - Answer-First
  - Kurzes Entscheidungs-Intro („Wann brauche ich was?")
  - Produktübersicht als Grid/Scroller – jede Kachel verlinkt auf T04
  - Kern-Eigenschaften der Kategorie (3–6 Bullets)
  - Einsatzbereiche (Verweis auf T05)
  - Systemzusammenhang (Verweis auf T02)
  - Downloads auf Kategorie-Ebene
  - FAQ (3–5)
  - Beratungs-CTA
- **URL-Muster:** `/<domain>/<kategorie-slug>`
- **Template:** `<ProductCategoryTemplate />`
- **i18n-Namespace:** `<domain>`, Schlüssel `<kategorie>.*`
- **SEO/AEO:** `BreadcrumbList` + `ItemList` (Produkte).
- **Crosslinks (Pflicht):** enthaltene T04, mindestens eine T02, mindestens eine T05.

### T04 – Produktdetailseite / PDP (Cluster: Kern)

**Heute nicht vorhanden. Die wichtigste fehlende Ebene.**

- **Zweck:** Ein einzelnes Produkt technisch präzise beschreiben.
- **Primärziel:** technische Entscheidung.
- **Hauptkonversion:** Datenblatt-Download / RFQ.
- **Pflichtbausteine:**
  - Hero mit Produktgalerie
  - Answer-First
  - Spezifikationstabelle (Maße, Stromversorgung, Schutzart, Norm-Konformität, Anschlusstechnik, Zubehör-Schnittstellen)
  - Varianten/Artikel (SKU-Liste mit Artikelnummer)
  - Integrationen / Kompatibilität (Verweis auf T02)
  - Anwendungsbeispiele (Verweis auf 2–3 T05)
  - Zubehör (Verweis auf andere T04)
  - Downloads pro Produkt (Datenblatt PDF, Montageanleitung, CAD/BIM, Zertifikate) – **ungated**
  - Ersatzteil-/Support-Link (Verweis auf T16b)
  - FAQ (3–6)
  - Beratungs-CTA / RFQ-CTA
- **URL-Muster (empfohlen):** `/<domain>/<kategorie>/<produkt-slug>`
- **Template:** `<ProductDetailTemplate />` – props-basiert, **nicht** mit Literaltexten. Daten aus strukturierter Quelle.
- **i18n-Namespace:** `produkte` (neu, querschnittlich).
- **SEO/AEO:** `Product`-JSON-LD zwingend (Name, Brand: TCS, Category, Datenblatt-Link, Bild, Identifier). `BreadcrumbList`. Optional `Offer`.
- **Datenmodellierung:** Template muss so gebaut sein, dass Produktdaten aus einer Datenquelle gespeist werden (anfangs JSON in `src/features/produkte/data/`, später Supabase/PIM).
- **Crosslinks (Pflicht):** Mutter-T03, enthaltene T02, passende T05, Zubehör (T04).

### T05 – Anwendungs-/Branchenseite (Cluster: Kern)

- **Zweck:** Fachliche Sicht aus Perspektive eines Einsatzfeldes (Wohnbau, Pflege, Klinik, Behörde, Bildung).
- **Primärziel:** Einsatzfeld-Verständnis.
- **Hauptkonversion:** Beratung anfragen / Referenz ansehen.
- **Pflichtbausteine:**
  - Hero
  - Answer-First
  - Problem / Anforderungen (spezifisch, nicht generisch)
  - Systemprinzip (2–4 Bausteine)
  - Passende Produkte (T03/T04)
  - Passende Systemlösungen (T02)
  - Referenzprojekte (T08)
  - Normen/rechtliche Rahmen (mit Glossar-Links auf T15)
  - FAQ spezifisch zum Einsatzfeld (5–8)
  - Downloads (einsatzfeldspezifische Broschüre)
  - Beratungs-CTA
- **URL-Muster:** `/anwendungen/<slug>`
- **Template:** `<UseCaseTemplate />`
- **i18n-Namespace:** `anwendungen`
- **SEO/AEO:** `BreadcrumbList` + FAQ mit `FAQPage`.
- **Crosslinks (Pflicht):** ≥ 2× T03/T04, ≥ 1× T02, ≥ 1× T08, ≥ 1× T11.

### T06 – Funktions-/Feature-Seite (Cluster: Kern)

- **Zweck:** Eine übergreifende Funktion erklären, die quer zu Produkten liegt.
- **Primärziel:** Funktions-Verständnis.
- **Hauptkonversion:** Weiterklick auf T03/T04 oder Beratung.
- **Pflichtbausteine:** wie T05 ohne Normen-Block. Zusätzlich: „Wie ist die Funktion technisch realisiert?".
- **URL-Muster:** Heute unter `/anwendungen/<funktions-slug>`. **Migrations-Empfehlung:** Funktionsseiten langfristig in die fachliche Mutter-Domain umziehen (`/gebaeudekommunikation/concierge`, `/zutrittskontrolle/bcm` usw.), nicht im Anwendungen-Baum belassen.
- **Template:** `<FeatureTemplate />`
- **i18n-Namespace:** langfristig `funktionen` (querschnittlich).
- **Crosslinks (Pflicht):** passende T03/T04, passende T02, passende T05.

### T07 – Referenzliste (Cluster: Kern)

- **Zweck:** Übersicht aller realisierten Projekte.
- **Primärziel:** Autoritätsbeleg.
- **Hauptkonversion:** Weiterklick auf T08.
- **Pflichtbausteine:** Hero, Filter (Anwendung/Region), Projektkarten mit Link auf T08.
- **URL-Muster:** `/anwendungen/referenzprojekte`
- **Template:** `<ReferenceListTemplate />`
- **i18n-Namespace:** `anwendungen.referenzen.*`
- **SEO/AEO:** `ItemList`-Schema.

### T08 – Referenzdetail (Cluster: Kern)

- **Zweck:** Ein konkretes Projekt als Case Study.
- **Primärziel:** Vertrauensbildung.
- **Hauptkonversion:** Beratung anfragen / Ähnliche Referenz ansehen.
- **Pflichtbausteine:** Hero · Answer-First · Projekt-Metadaten · Herausforderung · Lösung · Ergebnis mit Zitat · Bilderstrecke · verwandte Referenzen · Verweis auf T05/T02.
- **URL-Muster:** `/anwendungen/referenzprojekte/<slug>`
- **Template:** `<ReferenceDetailTemplate />`
- **i18n-Namespace:** `anwendungen.referenzen.projekte.<slug>.*`
- **SEO/AEO:** `Article` oder `CreativeWork`. `BreadcrumbList`.

### T09 – Persona-/Rolleneinstieg (Cluster: Kern)

- **Zweck:** Kuratierter Einstieg aus Rollensicht (6 Personas).
- **Primärziel:** Einstieg aus Rollensicht.
- **Hauptkonversion:** Weiterklick auf kuratierte T01/T02/T05.
- **Strategische Entscheidung nötig:** SEO-URL (empfohlen: `/fuer/<rolle>`) oder Overlay (Status quo).
- **Pflichtbausteine:** Hero aus Rollensicht · Answer-First · 3–5 Rollen-spezifische Themen-Einstiege · „Was braucht diese Rolle" · einschlägige Referenzen · Beratungs-CTA.
- **URL-Muster (wenn umgesetzt):** `/fuer/<rolle>`
- **Template:** `<PersonaTemplate />`
- **i18n-Namespace:** `personas`
- **Crosslinks (Pflicht):** rollen-spezifische Auswahl aus T01/T02/T05/T11.

### T10a – Wissens-Hub (Cluster: Wissen)

- **Zweck:** Einstieg in alle Wissens-Inhalte.
- **Primärziel:** Wissensorientierung.
- **Hauptkonversion:** Weiterklick auf T10b/T11/T12/T14.
- **Pflichtbausteine:**
  - Hero
  - Answer-First („Was findet man im Wissensbereich?")
  - Einstiege nach Wissens-Typ (Kacheln): Akademie (T10b), Fachbeiträge (T11), FAQ (T12), Glossar (T14), Planungswissen, Normen
  - Aktuelle Inhalte (neueste 3–5 T11)
  - „Meistgesuchte Begriffe" (top T15)
- **URL-Muster:** `/wissen`
- **Template:** `<KnowledgeHubTemplate />`
- **i18n-Namespace:** `wissen`
- **SEO/AEO:** `BreadcrumbList`. Interne Verlinkung ist das zentrale Signal.

### T10b – Akademie (Cluster: Wissen)

- **Zweck:** TCS Akademie als strukturiertes Schulungs-/Lernangebot.
- **Primärziel:** Schulungsverständnis und -Buchung.
- **Hauptkonversion:** Schulung buchen / Termine ansehen.
- **Zuordnung:** primär **Wissen**, nicht Service. Der Service-Hub (T16a) verlinkt auf die Akademie, enthält sie aber nicht strukturell.
- **Pflichtbausteine:** Hero · Answer-First · Kursübersicht (Kacheln oder Kalender) · Zielgruppe/Voraussetzungen · Ablauf/Format · Anmeldung/Kontakt · Referenzen von Teilnehmern (optional).
- **URL-Muster:** `/wissen/akademie` (perspektivisch) oder `/akademie` (aktueller flacher Slug).
- **Template:** `<AcademyTemplate />`
- **i18n-Namespace:** `wissen`, Schlüssel `akademie.*`
- **SEO/AEO:** `EducationalOrganization` oder `Course`-Schema je Kurs.

### T11 – Wissensartikel / Fachbeitrag (Cluster: Wissen)

**Heute nicht vorhanden. AEO-Hebel.**

- **Zweck:** Fachliche Erklärartikel zu übergreifenden Themen.
- **Primärziel:** Wissensaufbau.
- **Hauptkonversion:** Verwandter Artikel / passendes T03/T04.
- **Pflichtbausteine:**
  - Hero (Titel, Kurzlead, Datum, Autor)
  - Answer-First (TL;DR in 3–5 Zeilen)
  - Inhaltsverzeichnis / SubNav (wenn > 800 Wörter)
  - Hauptteil in H2/H3-Blöcken mit 40–60-Wörter-Antwortabsatz direkt unter der Überschrift
  - Tabellen, Listen, Zitate als maschinenlesbare Extrakte
  - Verknüpfte Glossarbegriffe (T15)
  - Verwandte Artikel
  - Verwandte Anwendungen (T05) und Produkte (T03/T04)
  - Quellen-/Normenreferenzen
  - Beratungs-CTA
- **URL-Muster:** `/wissen/<slug>`
- **Template:** `<KnowledgeArticleTemplate />`
- **i18n-Namespace:** `wissen`, Schlüssel `artikel.<slug>.*`
- **SEO/AEO:** `Article`-JSON-LD mit Autor, `datePublished`, `dateModified`. `BreadcrumbList`. Optional `FAQPage` für inline-FAQ.
- **Autor-Pflicht:** E-E-A-T verlangt sichtbaren Autor oder Fachbereich. Empfehlung: Feature-Ordner `src/features/experten/` mit Autorenprofilen.

### T12 – FAQ-Hub (Cluster: Wissen)

**Heute nicht vorhanden. AEO-Gold.**

- **Zweck:** Zentrale, themensortierte FAQ-Sammlung.
- **Primärziel:** schnelle Fachantwort.
- **Hauptkonversion:** Verwandtes T11 / Beratung.
- **Pflichtbausteine:** Hero · Filter (Themen/Domain) · FAQ-Gruppen als Accordion · H3 pro Frage · Antwort 40–80 Wörter direkt darunter · Glossar-Links · Link auf T11 falls vorhanden.
- **URL-Muster:** `/wissen/faq` (optional zusätzlich `/wissen/faq/<themen-slug>`)
- **Template:** `<FaqHubTemplate />` + `<FaqAccordion />`
- **i18n-Namespace:** `wissen`, Schlüssel `faq.*`
- **SEO/AEO:** `FAQPage`-JSON-LD zwingend. Fragen und Antworten müssen im DOM vollständig gerendert sein.

### T13 – FAQ-Eintrag (optional, Cluster: Wissen)

- **Zweck:** Einzelne Frage mit eigener URL für direkte Verlinkung.
- **MVP:** nicht nötig. Erst sinnvoll, wenn einzelne FAQs extern als Landing-Ziel dienen sollen.
- **URL-Muster (wenn genutzt):** `/wissen/faq/<frage-slug>`
- **SEO/AEO:** `Question` + `Answer`-Schema.

### T14 – Glossar-Hub (Cluster: Wissen)

**Heute nicht vorhanden.**

- **Zweck:** Alphabetische Übersicht aller Fachbegriffe.
- **Primärziel:** Begriffsorientierung.
- **Hauptkonversion:** Weiterklick auf T15.
- **Pflichtbausteine:** Hero · Answer-First · A–Z-Navigation · Liste nach Anfangsbuchstabe · jede Zeile: Begriff + 1 Satz + Link auf T15.
- **URL-Muster:** `/wissen/glossar`
- **Template:** `<GlossaryHubTemplate />`
- **i18n-Namespace:** `wissen`, Schlüssel `glossar.*`
- **SEO/AEO:** `DefinedTermSet`-Schema.

### T15 – Glossar-Eintrag (Cluster: Wissen)

**Heute nicht vorhanden.**

- **Zweck:** Genau einen Fachbegriff definieren.
- **Primärziel:** Begriffsdefinition.
- **Hauptkonversion:** Verwandter Artikel/Produkt.
- **Pflichtbausteine:** Titel = Begriff · Answer-First: Definition in 40–60 Wörtern · 2–4 Absätze Erklärung · Synonyme/Abgrenzungen · verwandte Begriffe · verwandte T11/T03/T04.
- **URL-Muster:** `/wissen/glossar/<begriff-slug>`
- **Template:** `<GlossaryEntryTemplate />`
- **i18n-Namespace:** `wissen`, Schlüssel `glossar.eintraege.<slug>.*`
- **SEO/AEO:** `DefinedTerm`-JSON-LD.

### T16a – Service-Hub (Cluster: System)

- **Zweck:** Zentraler Einstieg in alle Service-Angebote.
- **Primärziel:** Service-Orientierung.
- **Hauptkonversion:** Weiterklick auf T16b / Serviceportal (T17).
- **Pflichtbausteine:** Hero · Answer-First · Service-Unterbereiche als Kacheln (Downloads, Support, Ersatzteile, Konfiguratoren, Produktkatalog) · Verweis auf T10b Akademie · Verweis auf T17 Serviceportal · Beratungs-CTA.
- **URL-Muster:** `/service`
- **Template:** `<ServiceHubTemplate />`
- **i18n-Namespace:** `service`

### T16b – Service-Unterseite (Cluster: System)

- **Zweck:** Konkreter Servicezugang (Downloads, Technischer Support, Ersatzteile, Planen & Konfigurieren, Online-Produktkatalog).
- **Primärziel:** Servicezugang.
- **Hauptkonversion:** konkrete Service-Aktion.
- **Pflichtbausteine:** Hero · Answer-First · konkreter Nutzwert · Crosslinks zu Produkt- und Wissens-Inhalten · Hinweis „folgt", wenn Tool noch nicht existiert.
- **URL-Muster:** heute teilweise flach; langfristig optional unter `/service/<slug>`.
- **Template:** `<ServiceSubpageTemplate />`
- **i18n-Namespace:** `service`

### T17 – Serviceportal geschützt (Cluster: System)

- **Zweck:** Bestandskunden-/Partner-Bereich nach Login.
- **Primärziel:** Bestandskunden-Self-Service.
- **Hauptkonversion:** Auth / Funktionsnutzung.
- **Pflichtbausteine:** außerhalb dieses Dokuments, siehe [`serviceportal-status.md`](./serviceportal-status.md).
- **URL-Muster:** `/serviceportal`, `/serviceportal/*`
- **SEO/AEO:** `noindex`.

### T18 – Vertrauens-/Unternehmensseite (Cluster: Unternehmen)

- **Zweck:** Belegen, warum TCS ein verlässlicher Partner ist.
- **Primärziel:** Vertrauensbildung.
- **Hauptkonversion:** Beratung anfragen / Referenz ansehen.
- **Pflichtbausteine:** Hero · Answer-First · Kompetenzversprechen · Fertigung/Entwicklung/Standorte · Qualitätsnachweise · Referenzen-Teaser · Meilensteine · Team/Gesichter · Kontakt-CTA.
- **URL-Muster:** `/ueber-tcs`
- **Template:** `<TrustPageTemplate />`
- **i18n-Namespace:** `home` oder später `unternehmen`
- **SEO/AEO:** `AboutPage`-Schema.

### T19 – Meta-Seite (Cluster: Unternehmen)

- **Zweck:** Kontakt / Karriere / Presse.
- **Primärziel:** Unternehmens-Kontaktpunkt.
- **Hauptkonversion:** Anfrage / Bewerbung / Pressezugang.
- **Pflichtbausteine:** abhängig von Kontakt, Karriere, Presse.
- **URL-Muster:** `/kontakt`, `/karriere`, `/presse`
- **Template:** je eigenes Template.
- **i18n-Namespace:** `kontakt`, `karriere`, `presse`

### T20 – Legal-Seite (Cluster: Unternehmen)

- **Zweck:** Rechtliche Pflichtinhalte.
- **Primärziel:** Rechtliche Compliance.
- **Hauptkonversion:** keine.
- **Pflichtbausteine:** juristischer Text · Stand-Datum · Verantwortlicher.
- **URL-Muster:** `/impressum`, `/datenschutz`, `/agb`
- **Template:** `<LegalTemplate />`
- **i18n-Namespace:** `legal`

### T21 – Fehlerseite (Cluster: System)

- **Zweck:** 404-Handling.
- **Primärziel:** Wiedereinstieg.
- **Hauptkonversion:** Rückweg zur Startseite.
- **Pflichtbausteine:** Fehlermeldung · Rückweg · optional Top-Links.
- **URL-Muster:** Catch-all `*`
- **SEO/AEO:** `noindex, nofollow`.

---

## 5. URL-Konventionen und Sprachstrategie-Weiche

Die Seitentyp-Taxonomie hängt eng mit der URL-Sprachstrategie zusammen. Drei Muster sind realistisch, eine Entscheidung ist getroffen.

### Option A – sprachneutrale URLs (aktueller Zustand)

### Option B – Sprachpräfix im Pfad (empfohlen)

### Option C – Subdomain / ccTLD

**Empfohlene Weiche: Option B.** Die Entscheidung ist in [`url-sprachstrategie.md`](./url-sprachstrategie.md) als strategische Zielentscheidung dokumentiert; die Code-Umsetzung steht noch aus.

---

## 6. Mapping: heutiger Bestand → Typ

Dieser Abschnitt ordnet die heute real gerouteten Pages unter `src/features/**/pages/*Page.tsx` einem Seitentyp zu. Grundlage: reale Dateien im Repo und reale Routen in den `src/features/**/routes.tsx` plus `src/app/routes.tsx`. Sonderfälle sind als solche benannt. Das Mapping ist pragmatisch, nicht akademisch – es soll Folge-Etappen und Lovable-Prompts eine belastbare Zuordnung liefern.

> Lesehilfe: Eine Page kann heute strukturell einem Typ entsprechen, ohne dass das zugehörige Template im Code bereits existiert. Das Mapping beschreibt die **Rolle** der Seite, nicht ihre Template-Reife.

### 6.1 Domain-Hubs (T01)

Jeder fachliche Bereich hat heute eine Root-Page, die als Domain-Hub fungiert.

| Page | Route | Typ |
|---|---|---|
| `gebaeudekommunikation/pages/TuerkommunikationPage.tsx` | `/gebaeudekommunikation` (Legacy: `/tuerkommunikation`) | T01 |
| `zutrittskontrolle/pages/ZutrittskontrollePage.tsx` | `/zutrittskontrolle` | T01 |
| `gebaeudemanagement/pages/GebaeudemanagementPage.tsx` | `/gebaeudemanagement` | T01 |
| `eingangssysteme/pages/EntrySystemPage.tsx` | `/entry-system` | T01 |
| `signage/pages/SignagePage.tsx` | `/signage` (Legacy) | T01 (schwach – Inhalt heute eher Übersicht/Teaser) |
| `anwendungen/pages/AnwendungenPage.tsx` | `/anwendungen` | T01 (Sonderfall: fungiert auch als Einstiegs-Hub für T05) |

### 6.2 Produktkategorien (T03)

Pages, die heute eine Produktfamilie überblicksartig darstellen.

| Page | Route | Typ |
|---|---|---|
| `gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` | `/gebaeudekommunikation/tuersprechanlagen` | T03 |
| `gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx` | `/gebaeudekommunikation/briefkastenanlagen` | T03 |
| `gebaeudekommunikation/pages/GrossanlagenPage.tsx` | `/gebaeudekommunikation/grossanlagen` | T03 |
| `gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx` | `/gebaeudemanagement/schraenke-behaelter` | T03 |

### 6.3 Systemlösungen / Funktions-Seiten (T02 / T06)

Seiten, die ganze Lösungen oder querschnittliche Funktionen beschreiben. Die Trennung T02 vs. T06 ist heute unscharf, weil noch kein eigenes Template existiert.

| Page | Route | Typ |
|---|---|---|
| `gebaeudekommunikation/pages/SystemloesungenPage.tsx` | `/gebaeudekommunikation/systemloesungen` | T02 |
| `gebaeudekommunikation/pages/SnipdooIpPage.tsx` | `/gebaeudekommunikation/snipdoo-ip` (Legacy: `/snipdoo-ip`, `/systemtechnik/snipdoo-ip`) | T02 |
| `gebaeudemanagement/pages/DigitalSignagePage.tsx` | `/gebaeudemanagement/digital-signage` | T06 |
| `gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx` | `/gebaeudemanagement/digitale-namensanzeige` | T06 |
| `gebaeudemanagement/pages/ReservierenBuchenPage.tsx` | `/gebaeudemanagement/reservieren-buchen` | T06 |
| `gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx` | `/gebaeudemanagement/alarmanlagenkopplung` | T06 |
| `zutrittskontrolle/pages/TuerenTorePage.tsx` | `/zutrittskontrolle/tueren-tore` | T06 |
| `zutrittskontrolle/pages/MobilerZutrittPage.tsx` | `/zutrittskontrolle/mobiler-zutritt` | T06 |
| `zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | `/zutrittskontrolle/fahrstuhlsteuerung` | T06 |
| `zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx` | `/zutrittskontrolle/zufahrten-parkplaetze` | T06 |
| `signage/pages/BeschilderungPage.tsx` | `/gebaeudekommunikation/beschilderung` (Sonderfall: liegt in `signage/`, gemountet unter `gebaeudekommunikation`, Namespace `gebaeudekommunikation`) | T06 |
| `zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` | `/zutrittskontrolle/elektronische-drueckergarnitur` | T03 (Produktfamilie EvoLock; produktnah, ohne SKU-/Spec-Tabelle → noch keine echte T04-PDP) |
| `zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx` | `/zutrittskontrolle/elektronischer-knaufzylinder` | T03 (Produktfamilie Knaufzylinder) |
| `zutrittskontrolle/pages/BcmHandsenderPage.tsx` | `/zutrittskontrolle/bcm-handsender` | T03 (Produktfamilie Handsender) |
| `zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx` | `/zutrittskontrolle/funkvernetzte-offline-leser` | T03 (Produktfamilie Offline-Leser) |
| `zutrittskontrolle/pages/BcmOnlineLeserPage.tsx` | `/zutrittskontrolle/bcm-online-leser` | T03 (Produktfamilie Online-Leser) |
| `zutrittskontrolle/pages/VorhaengeschlossPage.tsx` | `/zutrittskontrolle/vorhaengeschloss` | T03 (Produktfamilie elektronisches Vorhängeschloss) |
| `zutrittskontrolle/pages/BiometriePage.tsx` | `/zutrittskontrolle/biometrie` | T06 (Technologie/Funktion, keine Produktfamilie) |

### 6.4 Eingangssysteme – Sonderfall

Die Domain `eingangssysteme` hat einen eigenen Hub plus eine Reihe von Aspekt-Seiten (Design, Material, Funktionalität, Integrationsformen, Standards, Beratung, Referenzen). Diese Seiten passen nicht sauber auf T03 (Produktkategorie) und nicht auf T02 (Systemlösung). Sie sind heute am ehesten **eine Mischform aus T06 (Funktions-/Aspekt-Seite) und Hub-Unterseite**. Eine spätere Etappe muss entscheiden, ob für Entry ein eigener Sub-Typ definiert oder T06 erweitert wird.

| Page | Route | Vorläufige Zuordnung |
|---|---|---|
| `eingangssysteme/pages/EntryDesignPage.tsx` | `/entry-system/design` | T06 (Aspekt) |
| `eingangssysteme/pages/EntryMaterialPage.tsx` | `/entry-system/material` | T06 (Aspekt) |
| `eingangssysteme/pages/EntryFunktionalitaetPage.tsx` | `/entry-system/funktionalitaet` | T06 (Aspekt) |
| `eingangssysteme/pages/EntryIntegrationsformenPage.tsx` | `/entry-system/integrationsformen` | T06 (Aspekt) |
| `eingangssysteme/pages/EntryStandardsPage.tsx` | `/entry-system/standards` | T06 (Aspekt) |
| `eingangssysteme/pages/EntryBeratungPage.tsx` | `/entry-system/beratung` | T19 (Beratungs-/Kontaktpunkt – Sonderfall, eher Meta als Kern) |
| `eingangssysteme/pages/EntryReferenzenPage.tsx` | `/entry-system/referenzen` | T07 (Referenzliste, domain-spezifisch) |

### 6.5 Anwendungen / Branchen / Funktionsthemen (T05 / T06)

Die Domain `anwendungen` ist heute der größte Sammeltopf. Zwei Rollen mischen sich: echte Branchen-/Einsatzfeld-Seiten (T05) und übergreifende Funktions-Seiten (T06), die nur historisch im Anwendungen-Baum liegen.

| Page | Route | Typ |
|---|---|---|
| `anwendungen/pages/WohnbauPage.tsx` | `/anwendungen/wohnbau` | T05 |
| `anwendungen/pages/EinfamilienhausPage.tsx` | `/anwendungen/einfamilienhaus` | T05 |
| `anwendungen/pages/MehrfamilienhausPage.tsx` | `/anwendungen/mehrfamilienhaus` | T05 |
| `anwendungen/pages/ObjektloesungenPage.tsx` | `/anwendungen/objektloesungen` | T05 |
| `anwendungen/pages/SanierungPage.tsx` | `/anwendungen/sanierung` | T05 |
| `anwendungen/pages/PflegePage.tsx` | `/anwendungen/pflege` | T05 |
| `anwendungen/pages/KlinikPage.tsx` | `/anwendungen/klinik` | T05 |
| `anwendungen/pages/GesundheitseinrichtungenPage.tsx` | `/anwendungen/gesundheitseinrichtungen` | T05 |
| `anwendungen/pages/BehoerdePage.tsx` | `/anwendungen/behoerde` | T05 |
| `anwendungen/pages/OeffentlicheHandPage.tsx` | `/anwendungen/oeffentliche-hand` | T05 |
| `anwendungen/pages/BildungseinrichtungenPage.tsx` | `/anwendungen/bildungseinrichtungen` | T05 |
| `anwendungen/pages/FeuerwehrPage.tsx` | `/anwendungen/feuerwehr` | T05 |
| `anwendungen/pages/SchwimmbadPage.tsx` | `/anwendungen/schwimmbad` | T05 |
| `anwendungen/pages/GrossanlagePage.tsx` | `/anwendungen/grossanlage` | T05 (Sonderfall: thematisch auch Produktkategorie, hier Einsatzfeld-Sicht) |
| `anwendungen/pages/ConciergePage.tsx` | `/anwendungen/concierge` | T06 (Migrations-Empfehlung: später unter `/gebaeudekommunikation/concierge`) |
| `anwendungen/pages/BidirektionaleVideoPage.tsx` | `/anwendungen/bidirektionale-video` | T06 |
| `anwendungen/pages/MobileTuerkommunikationPage.tsx` | `/anwendungen/mobile-tuerkommunikation` | T06 |
| `anwendungen/pages/InterneKommunikationPage.tsx` | `/anwendungen/interne-kommunikation` | T06 |
| `anwendungen/pages/FeuerwehrdurchsagePage.tsx` | `/anwendungen/feuerwehrdurchsage` | T06 |
| `anwendungen/pages/DigitaleNamensverwaltungPage.tsx` | `/anwendungen/digitale-namensverwaltung` | T06 |
| `anwendungen/pages/ZutrittskontrolleBCMPage.tsx` | `/anwendungen/zutrittskontrolle-bcm` | T06 (Migrations-Empfehlung: später unter `/zutrittskontrolle/bcm`) |

### 6.6 Referenzen (T07 / T08)

| Page | Route | Typ |
|---|---|---|
| `anwendungen/pages/ReferenzprojektePage.tsx` | `/anwendungen/referenzprojekte` | T07 |
| `anwendungen/pages/ReferenzprojektDetailPage.tsx` | `/anwendungen/referenzprojekte/<slug>` | T08 |

> Hinweis: `anwendungen/components/AnwendungDetailPage.tsx` ist **keine** geroutete Page, sondern eine Hilfskomponente (siehe `exemptPages` im i18n-Health-Check) und wird daher nicht typisiert.

### 6.7 Wissen / Akademie (T10b)

| Page | Route | Typ |
|---|---|---|
| `wissen/pages/AkademiePage.tsx` | `/akademie` | T10b |

> Hinweis: T10a (Wissens-Hub), T11 (Wissensartikel), T12 (FAQ-Hub), T14/T15 (Glossar) existieren heute **nicht** als Pages. Siehe Abschnitt 7.

### 6.8 Service (T16a / T16b)

| Page | Route | Typ |
|---|---|---|
| `service/pages/ServicePage.tsx` | `/service` | T16a |
| `service/pages/OnlineProduktkatalogPage.tsx` | `/online-produktkatalog` | T16b |
| `service/pages/PlanenKonfigurierenPage.tsx` | `/planen-konfigurieren` | T16b |
| `service/pages/DownloadsPage.tsx` | `/downloads` | T16b |
| `service/pages/TechnischerSupportPage.tsx` | `/technischer-support` | T16b |
| `service/pages/ErsatzteilePage.tsx` | `/ersatzteile` | T16b |

### 6.9 Serviceportal (T17)

| Page | Route | Typ |
|---|---|---|
| `serviceportal/pages/ServiceportalPage.tsx` | `/serviceportal` | T17 (Stub) |
| `serviceportal/pages/RegistrierenPage.tsx` | `/serviceportal/registrieren` | T17 (Stub) |
| `serviceportal/pages/PasswortVergessenPage.tsx` | `/serviceportal/passwort-vergessen` | T17 (Stub) |

### 6.10 Unternehmen / Meta (T18 / T19)

| Page | Route | Typ |
|---|---|---|
| `home/pages/HomePage.tsx` | `/` | Sonderfall – Container-Page (siehe `exemptPages`); strukturell Startseite, kein eigener Typ in der Taxonomie |
| `home/pages/UeberTCSPage.tsx` | `/ueber-tcs` | T18 |
| `kontakt/pages/KontaktPage.tsx` | `/kontakt` | T19 |
| `karriere/pages/KarrierePage.tsx` | `/karriere` | T19 |
| `presse/pages/PressePage.tsx` | `/presse` | T19 |

### 6.11 Legal (T20)

| Page | Route | Typ |
|---|---|---|
| `legal/pages/ImpressumPage.tsx` | `/impressum` | T20 (Inhalt redaktionell offen) |
| `legal/pages/DatenschutzPage.tsx` | `/datenschutz` | T20 (Inhalt redaktionell offen) |
| `legal/pages/AgbPage.tsx` | `/agb` | T20 (Inhalt redaktionell offen) |

### 6.12 System (T21)

| Page | Route | Typ |
|---|---|---|
| `app/pages/NotFoundPage.tsx` | Catch-all `*` | T21 |

### 6.13 Personas (T09)

T09-Inhalte existieren heute **nicht als eigene Pages**, sondern als eingebettete Komponenten unter `src/features/personas/<persona>/components/*Content.tsx`. Sie werden über `PersonaContext` und `PersonaSection` aktiviert. Die strategische Entscheidung „Overlay vs. eigene `/fuer/<rolle>`-URL" (siehe T09) ist offen.

### 6.14 Zusammenfassung

- **T01–T03, T05–T08, T10b, T16a/b, T17, T18–T20, T21** sind im Bestand vertreten.
- **T04 (PDP), T10a (Wissens-Hub), T11 (Wissensartikel), T12/T13 (FAQ), T14/T15 (Glossar)** existieren heute nicht.
- **T09 (Persona)** existiert nur als eingebettete Komponente, nicht als eigene Route.
- Mehrere `anwendungen/`-Seiten sind strukturell T06 (Funktion), nicht T05 (Branche), und sollten langfristig in ihre fachliche Mutter-Domain umziehen (siehe Migrations-Empfehlung in T06 und Markierungen in 6.5).

---

## 7. Fehlende Seitentypen – wo neu gebaut werden muss

Aus der Übersicht in Abschnitt 3.2 ergeben sich folgende Typen ohne aktuelle Umsetzung:

- **T04** Produktdetailseite (PDP) – die wichtigste fehlende Ebene.
- **T11** Wissensartikel / Fachbeitrag.
- **T12** FAQ-Hub.
- **T13** FAQ-Eintrag (optional, MVP nicht nötig).
- **T14** Glossar-Hub.
- **T15** Glossar-Eintrag.
- **T10a** Wissens-Hub (heute nur teilweise als `AkademiePage` abgedeckt).

Diese Lücken sind die strategischen Bauaufgaben für künftige Etappen. Reihenfolge, Priorisierung und Templating werden in einem separaten Umsetzungsplan beschrieben.

---

## 8. Verhältnis zu Navigation und Breadcrumbs

Taxonomie, Navigation und Breadcrumbs sind drei verwandte, aber **unterschiedliche** Konzepte. Sie greifen ineinander, sind aber nicht identisch und dürfen nicht aufeinander abgebildet werden, als wären sie es.

### 8.1 Was definiert was?

| Konzept | Definiert | Quelle im Code |
|---|---|---|
| **Taxonomie** (dieses Dokument) | Welche **Rolle** eine Seite hat (Typ, Cluster, Primärziel, Hauptkonversion, Pflichtbausteine). | dieses Dokument; Templates (perspektivisch). |
| **Navigation** | Welche Seiten **kuratiert sichtbar** in Header, Footer, Meta- und Personabar erscheinen, in welcher Reihenfolge und mit welchem Label. | `src/navigation/mainNavigation.ts`, `footerNavigation.ts`, `metaNavigation.ts`, `personaNavigation.ts`, `routes.ts` (siehe `src/navigation/README.md`). |
| **Breadcrumbs** | Die **strukturelle Position** einer Seite innerhalb der URL-Hierarchie, automatisch aus dem aktuellen Pfad abgeleitet. | `src/components/AutoBreadcrumb.tsx` (Slug-Labels werden dort gepflegt). |

### 8.2 Seitentyp ≠ Hauptnavigationseintrag

- Nicht jede Seite eines Typs gehört in die Hauptnavigation.
  - Beispiel: T05-Branchenseiten (`/anwendungen/wohnbau`, `/anwendungen/pflege` …) existieren als typisierte Pages, sind aber **nicht alle** als Dropdown-Eintrag in `mainNavigation.ts` gelistet – die Navigation kuratiert eine sinnvolle Auswahl.
  - Beispiel: T20-Legal-Seiten sind Pflicht-Seiten, leben aber bewusst nur im Footer/Bottom-Bar, nicht in der Hauptnavigation.
  - Beispiel: T17-Serviceportal-Subpages (`/serviceportal/registrieren`, `/serviceportal/passwort-vergessen`) sind eigene Pages, aber kein Hauptnavigationseintrag.
- Umgekehrt darf die Navigation keine „Mini-Hubs" erfinden, die im Typenkatalog nicht existieren. Wer einen neuen Menüpunkt setzen will, der inhaltlich kein T01/T02/T03/T05/T06/T16a ist, muss zuerst klären, welcher Typ dahintersteht.

### 8.3 Breadcrumbs folgen URL, nicht Typ

`AutoBreadcrumb` leitet die Krümel **rein aus dem aktuellen Pfad** ab und übersetzt Slugs über eine zentrale Label-Map. Das hat Konsequenzen:

- Eine Seite, die fachlich T06 (Funktion) ist, aber unter `/anwendungen/<slug>` liegt, erhält automatisch eine Breadcrumb über „Anwendungen". Das ist solange korrekt, wie der Slug dort liegt – die in T06 dokumentierte Migrations-Empfehlung (Funktionsseiten in die fachliche Mutter-Domain umziehen) wirkt sich erst dann auf die Breadcrumb aus, wenn die URL real verlegt wird.
- Sonderfälle wie `BeschilderungPage.tsx` (liegt in `src/features/signage/`, gemountet unter `/gebaeudekommunikation/beschilderung`) zeigen, dass **URL-Hierarchie maßgeblich** ist – nicht Domain-Ordner und nicht Typenkatalog.

### 8.4 Konsistenzregel

Typisierung, Navigation und URL-Hierarchie müssen **zusammenpassen, dürfen aber nicht identisch sein**:

1. Typisierung beantwortet: *Was ist das für eine Seite?*
2. Navigation beantwortet: *Welche Seiten zeigen wir wem zuerst?*
3. URL-Hierarchie / Breadcrumbs beantworten: *Wo im Baum sitzt die Seite?*

Inkonsistenzen zwischen diesen drei Ebenen (z. B. Funktion-Typ unter Branchen-URL, Hub-Eintrag in der Navigation ohne reale T01-Seite dahinter) sind Hinweise auf strukturelle Schulden und gehören in eine eigene Aufräum-Etappe.

### 8.5 Anschluss an bestehende Doku

- Reale Verdrahtung der Navigation: `src/navigation/README.md`.
- Historisches Inventar der Ausgangsnavigation: [`../archiv/inventories/navigation-inventory.md`](../archiv/inventories/navigation-inventory.md) (historisch).
- Slug-Labels für Breadcrumbs werden in `src/components/AutoBreadcrumb.tsx` gepflegt; siehe auch [`../02-architektur/architektur.md`](../02-architektur/architektur.md).

---

## 9. Verhältnis zur bestehenden i18n-Strategie

Die Taxonomie ist mit der aktuellen i18n-Strategie ([`i18n-strategie.md`](./i18n-strategie.md)) kompatibel:

- Jeder Typ hat einen klar benannten i18n-Namespace (siehe Detailbeschreibung in Abschnitt 4).
- Querschnittliche Typen (T04 `produkte`, T06 langfristig `funktionen`) erfordern neue Namespaces, die bei Einführung in `src/i18n/index.ts` registriert und im Validator erfasst werden müssen.
- Pflichtbausteine pro Typ definieren, welche Keys in Zukunft strukturell garantiert sein müssen – das ist eine Erweiterung der heutigen Health-Check-Logik, kein Bruch.

---

## 10. Verhältnis zur Produktionsreife

Die Taxonomie ist Grundlage für mehrere Punkte aus dem (archivierten) [`../archiv/strategie-historisch/production-readiness-plan.md`](../archiv/strategie-historisch/production-readiness-plan.md):

- AEO/GEO-Sichtbarkeit (Answer-First, FAQ-Schema, Glossar-Schema).
- SEO-Grundlagen (BreadcrumbList, ItemList, Article, Product).
- Internationale SEO (in Verbindung mit [`url-sprachstrategie.md`](./url-sprachstrategie.md)).
- Vertrauen/Autorität (E-E-A-T, Autorenprofile bei T11).

Sie ersetzt den Produktionsfahrplan nicht, sondern liefert ihm die strukturelle Sprache.

---

## 11. Nächste Schritte

> Hinweis: Konkrete Umsetzungs-Etappen werden außerhalb dieses Dokuments geplant. Sinnvolle nächste Bausteine:
> 1. Inventar-Etappe: vollständiges Mapping Bestand → Typ (Abschnitt 6).
> 2. Template-Etappe: erstes wiederverwendbares Template (Empfehlung: `<DomainHubTemplate />` oder `<UseCaseTemplate />`, weil hier der Bestand am größten ist).
> 3. Pilot-Etappe T04: erste Produktdetailseite als referenzfähiges Template inkl. Datenmodell.
>
> Reihenfolge und Scope werden pro Etappe in einem eigenen Lovable-Prompt festgelegt.

---

## 12. Anti-Pattern pro Typ („Nicht tun")

Anti-Pattern sind operative Verbote: konkrete Dinge, die ein Final-Check oder Lovable-Prompt direkt prüfen kann. Die Liste ist aus den Pflichtbausteinen, Primärzielen und Hauptkonversionen der jeweiligen Typen abgeleitet. Sie ist bewusst handfest und nicht generisch („keine Buzzwords" steht hier nicht).

### 12.1 Cluster-übergreifende Anti-Pattern (gelten für alle Typen)

- Keine `href="#"`-CTAs in produktiver UI – tote Links sind in `hygiene-cta-rest-1` bereinigt und dürfen nicht zurückkehren. Bewusst deaktivierte Platzhalter werden als nicht-klickbares Element (`<span aria-disabled="true">`) gerendert, nicht als Link.
- Keine harten deutschen Texte in TSX-Dateien außerhalb dokumentierter `exemptPages`. Alle sichtbaren Texte gehören in den passenden i18n-Namespace (`useTranslation("<namespace>")`).
- Keine generischen Hero-Floskeln ohne Answer-First-Block direkt darunter.
- Keine Page ohne Eintrag in `strictPages` oder begründeter Ausnahme in `exemptPages` (siehe [`i18n-strategie.md`](./i18n-strategie.md)).
- Keine Inhaltsstruktur, die im Typenkatalog nicht vorgesehen ist – wer eine neue Seite baut, ordnet sie zuerst einem Typ zu.

### 12.2 Anti-Pattern Cluster „Kern"

**T01 – Domain-Hub**
- Kein Hub, der ausschließlich aus einem Hero plus Footer besteht (keine Unterbereich-Kacheln = kein Hub).
- Kein Hub, der einzelne Produkte (T04) detailliert beschreibt – das gehört auf die PDP.
- Keine SKU-Nummern, Maße oder Spezifikationstabellen auf einem T01.
- Keine Kacheln, die auf `"#"` oder auf einen anderen Hub zeigen, ohne fachliche Verfeinerung.

**T02 – Systemlösung**
- Keine Systemlösungs-Seite ohne klar erkennbares Systemprinzip (3–5 Bausteine).
- Keine Beschreibung als Marketing-Story ohne Verweis auf reale Produkte (T03/T04).
- Keine doppelte Lösungsseite, die thematisch identisch zu einer bestehenden T02 ist – Konsolidieren statt Duplizieren.

**T03 – Produktkategorie**
- Keine SKU-/Artikel-Detailbeschreibung auf einer Kategorieseite (T03 ≠ T04).
- Keine Kategorieseite ohne Übersicht der enthaltenen Produkte und ohne Crosslink in mindestens eine T05.
- Keine Kategorieseite, die in Wahrheit nur eine einzelne Produktbeschreibung mit Plural-Headline ist.

**T04 – Produktdetail (PDP)**
- Keine PDP ohne Spezifikationstabelle.
- Keine PDP mit hartcodierten Texten in der TSX-Datei – Daten müssen aus einer strukturierten Quelle kommen (Stand: JSON in `src/features/produkte/data/`, später PIM/Supabase).
- Keine gated Downloads für Datenblätter, Montageanleitungen, CAD/BIM oder Zertifikate.
- Keine PDP ohne `Product`-JSON-LD.
- Keine PDP, die als generische „Produktwelt"-Seite gebaut wird und mehrere SKUs in einem Kasten mischt.

**T05 – Anwendungs-/Branchenseite**
- Keine generische Lösungsbeschreibung, die genauso gut für eine andere Branche stehen könnte – T05 verlangt einsatzfeld-spezifische Anforderungen.
- Keine T05 ohne Verweis auf mindestens 2 Produkte/Kategorien (T03/T04), mindestens 1 Systemlösung (T02), mindestens 1 Referenz (T08).
- Keine Vermischung mit T06: Funktionsseiten gehören dort, nicht ein zweites Mal als „Branche".

**T06 – Funktions-/Feature-Seite**
- Keine Funktionsseite ohne Verweis auf die Produkte/Lösungen, die die Funktion realisieren.
- Keine Funktionsseite, die so tut, als wäre sie eine Branchenseite (Doppelt-Pflege mit T05 vermeiden).
- Bei zukünftiger URL-Migration: keine neuen Funktionsseiten mehr unterhalb `/anwendungen/` anlegen, wenn die Mutter-Domain klar ist.

**T07 – Referenzliste**
- Keine Referenzliste ohne mindestens grundlegende Filtermöglichkeit (Anwendung/Region).
- Keine reine Bildergalerie ohne Verlinkung auf Detailseiten (T08).

**T08 – Referenzdetail**
- Keine Case Study ohne nachvollziehbares Ergebnis (zumindest qualitatives Statement, idealerweise Zitat).
- Keine reine Produktwerbung im Referenzgewand – T08 ist Vertrauensbeleg, nicht PDP.
- Keine Referenz ohne Crosslink auf zugehörige T05 oder T02.

**T09 – Persona-/Rolleneinstieg**
- Keine Persona-Seite, die Produkte oder Lösungen eigenständig neu beschreibt – Personas verlinken kuratiert in die Fachbereiche, sie wiederholen sie nicht.
- Keine Persona-Aktivmarkierung, die nach dem Wechsel in einen Fachbereich „kleben" bleibt (siehe Etappe 14e-2).
- Keine reine Marketing-Selbstbespiegelung ohne handfeste Themen-Einstiege.

### 12.3 Anti-Pattern Cluster „Wissen"

**T10a – Wissens-Hub**
- Kein Wissens-Hub, der nur auf die Akademie verweist – Wissen ist mehr als Schulung.
- Kein Hub ohne Einstiege in T11/T12/T14, sobald diese Typen real existieren.

**T10b – Akademie**
- Keine Vermischung mit Service – die Akademie ist Wissen (T10b), Service-Hub verlinkt nur dorthin.
- Keine Akademie-Seite ohne klare Zielgruppe und ohne Buchungs-/Anmeldepfad (auch wenn der Pfad zunächst nur ein Kontakt-CTA ist).

**T11 – Wissensartikel / Fachbeitrag**
- Keine Wissensartikel ohne sichtbaren Autor oder Fachbereich (E-E-A-T).
- Keine Wissensartikel ohne Answer-First-Absatz unter jeder H2/H3.
- Keine Sales-Pitches als Wissensartikel verkleidet – Verlinkung auf T03/T04 ja, Verkauf nein.
- Keine Wissensartikel ohne `Article`-JSON-LD (mit `datePublished`, `dateModified`).

**T12 – FAQ-Hub**
- Keine FAQ, die nur als JavaScript-Accordion ohne DOM-Inhalt rendert – Fragen und Antworten müssen serverseitig/im DOM vollständig vorhanden sein.
- Keine FAQ ohne `FAQPage`-JSON-LD.
- Keine generischen „Was ist TCS?"-Marketing-Fragen – FAQs sind Fachantworten.

**T13 – FAQ-Eintrag**
- Keine eigene FAQ-Eintrags-URL ohne Mehrwert gegenüber dem FAQ-Hub – T13 nur, wenn ein einzelner Eintrag als Landing-Ziel taugt.

**T14 – Glossar-Hub**
- Kein Glossar-Hub ohne A–Z-Navigation.
- Kein Glossar-Hub, der die Begriffe nur als Liste ohne Verlinkung auf T15-Einträge zeigt.

**T15 – Glossar-Eintrag**
- Kein Glossar-Eintrag ohne Definitions-Absatz in 40–60 Wörtern.
- Kein Glossar-Eintrag ohne `DefinedTerm`-JSON-LD.
- Keine Vermischung mit T11: Glossar = Begriff erklären, Wissensartikel = Thema entwickeln.

### 12.4 Anti-Pattern Cluster „System"

**T16a – Service-Hub**
- Kein Service-Hub, der die Akademie strukturell enthält statt sie zu verlinken (Akademie ist T10b in Wissen).
- Kein Service-Hub mit toten Kacheln – Tools, die noch nicht existieren, werden als nicht-klickbarer Platzhalter mit „folgt"-Hinweis gerendert (siehe `ServicePage`).
- Kein Service-Hub ohne Crosslink auf das Serviceportal (T17).

**T16b – Service-Unterseite**
- Keine Service-Unterseite ohne konkreten Nutzwert (Download, Bestellung, Tool, Kontakt).
- Keine Service-Unterseite, die in Wahrheit ein zweiter Service-Hub ist.

**T17 – Serviceportal (geschützt)**
- Keine öffentliche Indexierung – `noindex` ist Pflicht.
- Keine Mock-Daten in Produktion ohne klare Kennzeichnung als Demo, solange kein Auth-Backend existiert (siehe `serviceportal-status.md`).
- Keine geschützten Funktionen ohne echte Server-seitige Validierung – `localStorage`/Frontend-Checks sind kein Auth.

**T21 – Fehlerseite**
- Keine 404 ohne `noindex, nofollow`.
- Keine 404 ohne sichtbaren Rückweg zur Startseite oder zur Hauptnavigation.
- Keine 404, die wie eine echte Inhaltsseite aussieht – Fehlerstatus muss erkennbar bleiben.

### 12.5 Anti-Pattern Cluster „Unternehmen"

**T18 – Vertrauens-/Unternehmensseite**
- Keine Vertrauens-Seite ohne handfeste Belege (Standorte, Fertigung, Qualitätsnachweise, Referenzen-Teaser).
- Keine reine Image-Floskel ohne Kontaktpfad.

**T19 – Meta-Seite (Kontakt / Karriere / Presse)**
- Keine Kontakt-Seite ohne reale Kontaktwege (Adresse, Formular, Telefon).
- Keine Karriere-Seite ohne Bewerbungspfad.
- Keine Presse-Seite ohne Pressekontakt.
- Keine zusätzlichen „Sub-Hubs" unter Meta-Seiten erfinden – Meta ist flach.

**T20 – Legal-Seite**
- Keine Legal-Seite mit erfundenen oder generischen Vorlagentexten in Produktion. Solange keine finalen Rechtstexte vorliegen, bleibt die Seite sichtbar als „in redaktioneller Bearbeitung" markiert (Status quo).
- Keine Vermischung von Impressum, Datenschutz, AGB auf einer Seite.
- Keine Legal-Seite ohne Stand-Datum und ohne benannten Verantwortlichen (sobald die Inhalte real sind).

---

## 13. Änderungshistorie

| Version | Datum | Änderung |
|---|---|---|
| v2 | 2026-04-24 | Erstmalige Aufnahme als strategisches Projektdokument (Etappe `doc-taxonomie-2`). 4-Cluster-Gliederung, T16-Auftrennung, Akademie-Zuordnung, T04-URL-Empfehlung, Primärziel/Hauptkonversion pro Typ. |
| v2.1 | 2026-04-24 | Etappe `doc-taxonomie-complete-1`: Abschnitt 6 (Mapping Bestand → Typ), Abschnitt 8 (Verhältnis zu Navigation und Breadcrumbs) und Abschnitt 12 (Anti-Pattern pro Typ) auf Basis des realen Repo-Stands ausformuliert. Keine inhaltliche Änderung der Typdefinitionen (T01–T21) selbst. |
