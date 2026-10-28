# Produktionsfahrplan – TCS Unternehmenswebseite

> Erstellt in Etappe **17-doc-2**.
> Strategischer Fahrplan für den Übergang vom Lovable-Prototyp zur produktiv betriebenen Unternehmenswebseite.

---

## 1. Zweck dieses Dokuments

- Dieses Dokument ist **kein Migrationslog**, sondern ein **strategischer Fahrplan**.
- Es beschreibt, **was noch notwendig ist, bevor die Webseite produktiv sauber betrieben werden kann**.
- Es dient als **Leitplanke für Mitarbeiter**, die später Inhalte, Bilder, Seiten oder Daten ergänzen.
- Es ergänzt die operativen Dokumente (`current-status.md`, `migration-log.md`, `i18n-strategy.md`, `code-landkarte.md`) um die strategische Ebene: **was kommt nach der Migration?**

---

## 2. Aktueller Charakter der Webseite

- Die Webseite ist aktuell ein **fortgeschrittener Prototyp** auf Basis von Lovable / React / TypeScript / Vite.
- **Viele Inhalte sind bereits angelegt** (Personas, Gebäudekommunikation, Zutrittskontrolle in Migration, etc.).
- Die **Struktur wird derzeit systematisch bereinigt** (dezentrales Routing, Feature-Domains, Asset-Strategie, Navigation als Datenstruktur).
- **i18n wird schrittweise** aus TSX in zentrale Locale-Dateien (`src/i18n/locales/<lang>/<namespace>.json`) ausgelagert.
- **Produkte, Downloads und Serviceportal** sind noch nicht final datenbank-/backendgetrieben – sie sind aktuell teilweise Mock-/Frontend-Strukturen.
- **Lovable eignet sich aktuell für Prototyping**, Strukturaufbau, Content-Seiten und UI-Iteration.
- Für **produktive Datenlogik, Auth, Rollen, Kundenprojekte, Produktsuche und Downloadverwaltung** braucht es später klare Backend-/Datenbankentscheidungen (siehe Abschnitt 9).

---

## 3. Empfohlene Arbeitsphasen

| Phase | Ziel | Wesentliche Aufgaben |
|---|---|---|
| **Phase 1 – Struktur abschließen** | Technische Basis fertigstellen | i18n-Migration der offenen Domains abschließen · Doku aktualisieren · Content-Workflow festlegen · keine neuen harten TSX-Texte mehr |
| **Phase 2 – Content vorbereiten** | Inhalte produktionsreif machen | Mitarbeiter liefern Texte, Bilder, Seitenwünsche und Produktinformationen · Inhalte nach festgelegtem Schema vorbereiten · neue Seiten nur mit korrekter Domain-/Asset-/i18n-Struktur anlegen |
| **Phase 3 – Datenbankintegration vorbereiten** | Single Source of Truth etablieren | Supabase als zentrale Quelle für Produkte, Downloads, Bilder, Kategorien und Dokumente definieren · Mockdaten durch Datenbankdaten ersetzen · Produkt- und Downloadbereiche nicht dauerhaft hart im Code pflegen |
| **Phase 4 – SEO/URL/Accessibility produktionsreif machen** | Produktive Sichtbarkeit & Qualität | Sprach-URL-Strategie entscheiden · Meta-Daten, Sitemaps, hreflang, Canonicals, strukturierte Daten prüfen · Barrierefreiheit prüfen · Performance/Bundle-Größe prüfen |
| **Phase 5 – Produktionsbetrieb** | Stabiler Live-Betrieb | Hosting, Deployment, Monitoring, Analytics, Datenschutz, Rollen/Rechte, Redaktionsprozess |

---

## 4. Qualitätsgrundlage für moderne technische B2B-Webseiten

Dieser Abschnitt ist keine Marketingtheorie, sondern eine **prüfbare Richtlinie**. Er beschreibt, woran sich eine moderne technische B2B-Webseite messen lassen sollte – inhaltlich, strukturell, technisch und im Hinblick auf Auffindbarkeit (klassische Suche und KI-Systeme).

### 4.1 Seitenstruktur

Nicht jede Seite braucht alles. Anforderungen hängen vom **Seitentyp** ab.

- **Startseite** – Einstieg, Orientierung, klare Wegweiser zu Lösungen, Anwendungen, Produkten und Kontakt.
- **Produktseite** – konkretes Produkt mit technischen Daten, Varianten, kompatiblen Systemen, Datenblatt-/Downloadbezug.
- **Lösungsseite** – beschreibt eine technische Lösung (z. B. Zutrittskontrolle, Türsprechanlage) mit Bausteinen, Vorteilen und Anwendungskontext.
- **Anwendungsseite** – beschreibt einen Einsatzkontext (z. B. Mehrfamilienhaus, Klinik, Schwimmbad) und welche Lösungen dort sinnvoll sind.
- **Wissens-/Ratgeberseite** – erklärt Themen, Begriffe, Normen und Zusammenhänge; sollte fachlich verlässlich und aktuell gehalten werden.
- **FAQ** – beantwortet echte Nutzerfragen kurz, sachlich und ohne Werbesprache.
- **Downloadbereich** – zentraler Servicebereich für Datenblätter, Anleitungen, CAD-/PDF-Daten, Zertifikate.
- **Kontakt-/Leadbereich** – klar strukturiert, mit eindeutiger nächster Handlung (Anfrage, Beratung, Standort, Support).

### 4.2 Content-Aufbau

- **Hero-Bereich** sollte Problem, Zielgruppe, Nutzen und nächste Handlung erkennbar machen.
- **Überschriften** sollten aussagekräftig sein, nicht rein werblich.
- **Answer-First-Abschnitte**: die zentrale Antwort sollte früh, kompakt und verständlich erscheinen.
- **Feature, Vorteil und Nutzen** sauber trennen – nicht alles als „Vorteil“ etikettieren.
- **Technische Fakten** mit konkreten Daten, Normen oder verlinkten Dokumenten stützen.
- **CTA-Beschriftungen** konkret und handlungsbezogen formulieren („Datenblatt öffnen“, „Beratung anfragen“ statt „Mehr erfahren“).

### 4.3 KI-Sichtbarkeit / AEO / GEO

Damit Inhalte sowohl von Suchmaschinen als auch von KI-Systemen (Antwortmaschinen, generative Suche) gut erfassbar sind:

- klare Definitionen im Format **„X ist …“**
- **Fragen als H2/H3**, wenn sie echte Nutzerfragen abbilden
- **direkte Kurzantworten** unter der Frage, bevor Details folgen
- **Tabellen** für Vergleiche und Spezifikationen
- **Listen** für Abläufe, Vorteile und Anforderungen
- **FAQ-Blöcke** mit direkter Antwort
- **Glossar** für zentrale Fachbegriffe
- **technische Fakten, Produktdaten und Downloads** als nachprüfbare Vertrauensbasis
- **keine reinen Marketingfloskeln** ohne überprüfbaren Inhalt

### 4.4 SEO-Grundlagen

- sprechende, stabile **URLs**
- eindeutige **Meta Titles** und **Meta Descriptions** pro URL
- **Canonicals**
- **Sitemap**
- **Robots.txt**
- **interne Verlinkung** mit verständlichen Ankertexten
- **Bild-Alt-Texte**
- **strukturierte Daten / JSON-LD**

Hinweise zu strukturierten Daten:

- `Organization` und `BreadcrumbList` sind grundsätzlich sinnvoll.
- `Product`, `FAQPage`, `Article`, `Person` nur dort einsetzen, wo der Seitentyp das wirklich rechtfertigt.
- `Person` und `Article` sind **keine pauschale Pflicht** für alle Seiten.

### 4.5 Internationale SEO

- Der aktuelle Prototyp kann **sprachneutral** bleiben.
- Für produktive internationale SEO sind **eigene aufrufbare Sprach-URLs** sinnvoll (z. B. `/de/`, `/en/`, ggf. `/nl/`).
- Reine Sprachumschaltung über `localStorage` ist für UI-Tests ausreichend, **für internationale SEO aber nicht ideal**.
- **hreflang** ist nur sinnvoll, wenn es eigene Sprach-URLs gibt.
- Übersetzungen sollten **fachlich geprüft** werden, nicht nur automatisch 1:1 übernommen.

### 4.6 UX und Accessibility

- klare **Lesbarkeit**
- logische **Überschriftenhierarchie**
- **Tastaturbedienbarkeit**
- sichtbare **Fokuszustände**
- **ausreichende Kontraste**
- sinnvolle **Alt-Texte**
- **Formularlabels** und verständliche **Fehlermeldungen**
- **Sprachumschalter** verständlich und bedienbar
- **ARIA** nur dort, wo native HTML-Semantik nicht ausreicht
- **WCAG 2.2 AA** als sinnvolle Zielgröße vor Produktivstart

### 4.7 Vertrauen und Autorität

- **technische Daten** nachvollziehbar darstellen
- **Normen, Kompatibilitäten und Dokumente** sichtbar machen
- **Aktualität** von Wissens-/Ratgeberinhalten kenntlich machen (z. B. „Stand: …“)
- **Expertenhinweise** vor allem bei Fachartikeln, Ratgeberseiten, Glossar und Wissen
- **Referenzen, Beispiele und Anwendungsfälle** konkret erklären – nicht nur dekorativ zeigen
- **Impressum, Kontakt und Verantwortlichkeit** einfach auffindbar halten

### 4.8 Self-Service und Kundenbindung

- **Downloadbereich** als wichtiger Recherche- und Servicebereich pflegen.
- **Ersatzteile, Dokumente, Anleitungen, CAD-/PDF-Daten** sind sichtbarer Ausdruck von Servicequalität.
- **Login-/Portalbereich** ist eine spätere strategische Erweiterung (siehe Serviceportal-Strategie).
- **Supportbereich und Chatbot** sind Ergänzung, nicht Ersatz für klare Inhalte.
- **Newsletter und Einwilligungen** nur mit klarem Nutzen für Empfänger und datenschutzkonform.

---

## 5. Strategische Arbeitsweise für neue Seiten und Inhalte

Lovable ist das **Umsetzungswerkzeug**, aber **nicht der alleinige strategische Kopf**. Vor größeren Änderungen soll ein **strategischer KI-Dialog** (außerhalb von Lovable) genutzt werden, um Struktur, Seitenlogik, Zielgruppe, FAQ, interne Verlinkung und SEO-/KI-Sichtbarkeit zu prüfen. Der Mensch bleibt **Human-in-the-Loop** und entscheidet, was fachlich, strategisch und wirtschaftlich sinnvoll ist. Andere KI-Systeme können ergänzend zur Prüfung genutzt werden – die **Dokumentation im Projekt bleibt die verbindliche Grundlage**.

### 5.1 Strategischer KI-Workflow

Empfohlener Arbeitsablauf für neue Seiten, größere Inhaltsänderungen oder strukturelle Erweiterungen:

1. **Ausgangsfrage oder Seitenwunsch formulieren.**
2. **Strategische Prüfung außerhalb von Lovable** durchführen:
   - Was ist der Zweck der Seite?
   - Welches Problem wird beschrieben?
   - Für welche Zielgruppe ist die Seite?
   - Welche Nutzerfragen werden beantwortet?
   - Welche Produkte, Lösungen, Anwendungen oder Downloads gehören dazu?
   - Gibt es FAQ-/Glossar-/Wissensbezug?
   - Welche interne Verlinkung ist sinnvoll?
   - Welche SEO-/KI-Sichtbarkeitsanforderungen sind relevant?
3. **Klaren Lovable-Prompt** aus diesem Strategiecheck ableiten.
4. **Lovable setzt um.**
5. **Ergebnis prüfen** – fachlich, strukturell, i18n, Navigation/Routen, Layout, SEO/AEO/GEO, Accessibility.
6. **Erst danach** weiterarbeiten oder freigeben.

Wichtig:

- Keine **freien, spontanen Strukturänderungen** direkt in Lovable.
- Keine neuen sichtbaren Texte **hart in TSX**.
- Keine neuen Seiten **ohne Domain-, Routen-, Asset- und i18n-Logik**.
- Keine **isolierten Einzelseiten** ohne interne Verlinkung.

### 5.2 Standardmodell für technische Lösungsseiten

Wiederverwendbares Modell als **Prüflogik**, nicht als starre Pflichtschablone. Nicht jede Seite muss jeden Baustein sichtbar enthalten – fehlt ein Baustein, sollte **bewusst entschieden** werden, warum er nicht gebraucht wird.

1. **Hero** – klare Kurzbeschreibung, für wen, welches Problem / welcher Nutzen, erste Handlung / CTA.
2. **Ausgangslage / Herausforderung** – konkretes Kundenproblem, typische Alltagssituation, aus Nutzersicht erklärt.
3. **Perspektive / Lösungsansatz** – wie die Lösung gedacht ist, warum der Ansatz sinnvoll ist, wie Systeme zusammenspielen.
4. **Systembausteine** – Komponenten, Funktionen oder Module, je kurz und verständlich erklärt.
5. **Produkte & Systeme** – passende Produkte oder Serien mit kurzer Beschreibung und Verlinkung auf Produkt-/Download-/Katalogbereiche.
6. **Anwendungsbereiche** – Gebäudetypen oder Nutzungssituationen (Mehrfamilienhaus, Großanlage, Pflegeeinrichtung, Behörde, Schule, Gewerbe etc.).
7. **Planung & Werkzeuge** – Planer, Konfigurator, Ausschreibungstexte, technische Beratung, Downloads, Dokumentation.
8. **Verwandte Themen** – Querverweise auf angrenzende Themenwelten (Gebäudekommunikation, Zutrittskontrolle, Gebäudemanagement, Entry, Service, Wissen).
9. **FAQ** – echte Nutzerfragen, direkte kurze Antwort zuerst, danach Vertiefung; keine Marketingfloskeln.
10. **Vertrauen / Verantwortlichkeit / Aktualität** – fachlich geprüft von, Rolle/Fachbereich, zuletzt aktualisiert/geprüft am, relevante Normen/Dokumente/technische Daten.
11. **CTA** – Beratung, Planung, Download, Kontakt, Serviceportal – je nach Seitentyp passend.

### 5.3 Problem-Lösung-Frage-Antwort-Prinzip

Moderne technische Webseiten sollten **nicht nur Produkte zeigen**. Sie sollten Probleme beschreiben, die Nutzer wirklich haben – auch solche, die sie noch gar nicht klar formuliert haben.

Gute Seiten beantworten nicht nur „Was ist das Produkt?", sondern auch:

- Welches Problem entsteht im Alltag?
- Warum reicht die bisherige Lösung nicht?
- Welche Risiken entstehen ohne Lösung?
- Wie löst das System das Problem?
- Welche Bausteine braucht man?
- Für welche Anwendung ist es geeignet?
- Was muss geplant werden?
- Welche Dokumente helfen weiter?
- Welche nächsten Schritte sind sinnvoll?

Diese Struktur hilft **Menschen, Suchmaschinen und KI-Systemen** gleichermaßen.

Beispielhafte Problemfelder (abstrakt, nicht als fertige Produkttexte):

- verlorene oder kopierte Schlüssel
- wechselnde Nutzer/Mieter/Teams
- fehlende Nachverfolgbarkeit
- Wunsch nach Komfort
- zentrale Verwaltung
- Integration von Zutrittskontrolle und Türkommunikation

### 5.4 Strategische Prüffragen für jede neue Seite

Checkliste, die **vor jeder neuen Seite** beantwortet werden sollte:

- [ ] Welches konkrete Problem löst diese Seite?
- [ ] Für welche Zielgruppe ist sie geschrieben?
- [ ] Welche Frage würde ein Nutzer oder eine KI zu diesem Thema stellen?
- [ ] Steht die wichtigste Antwort früh und verständlich auf der Seite?
- [ ] Sind Feature, Vorteil und Nutzen getrennt?
- [ ] Gibt es passende Produkte oder Systembausteine?
- [ ] Gibt es passende Anwendungen oder Gebäudetypen?
- [ ] Gibt es passende Downloads, Dokumente oder Planungshilfen?
- [ ] Gibt es FAQ-Fragen?
- [ ] Gibt es Glossar-/Wissensbezug?
- [ ] Gibt es interne Links zu verwandten Themen?
- [ ] Gibt es einen klaren CTA?
- [ ] Sind technische Aussagen belegbar?
- [ ] Gibt es Alt-Texte, sinnvolle Überschriften und Accessibility-Basics?
- [ ] Muss die Seite später in SEO, Sitemap, hreflang oder strukturierte Daten einbezogen werden?

### 5.5 Arbeitsregel für parallele Mitarbeit

**Mitarbeiter können parallel Inhalte vorbereiten:**

- Texte
- Bilder
- Produktinformationen
- FAQ-Fragen
- Glossarbegriffe
- Referenzen
- Download-/Dokumentenwünsche

**Strukturelle Änderungen erfolgen nur nach Prüfung:**

- neue Route
- neue Domain
- neue Navigation
- neue Seitentypen
- neue Datenmodelle
- neue Produkt-/Downloadlogik

**Neue Seitenwünsche sollen nicht nur als Textidee geliefert werden**, sondern mit:

- Ziel der Seite
- Zielgruppe
- Problemstellung
- gewünschtem Seitentyp
- benötigten Bausteinen
- internen Verlinkungen
- benötigten Bildern/Dokumenten
- DE/EN-Textbedarf

### 5.6 Was nicht mehr passieren soll

Negativliste – diese Muster sind ab sofort zu vermeiden:

- ❌ Keine neuen sichtbaren Texte direkt **hart in TSX**.
- ❌ Keine **ungeordneten Bilder** irgendwo im Projekt.
- ❌ Keine neuen Seiten **ohne Domain- und Routenlogik**.
- ❌ Keine **isolierten Seiten** ohne interne Verlinkung.
- ❌ Keine Produktdaten dauerhaft **doppelt im Code** pflegen, wenn sie später zentral gepflegt werden sollen.
- ❌ Keine FAQ-/Glossar-/Wissensinhalte als **zufällige Einzeltexte** ohne Struktur.
- ❌ Keine **Navigationserweiterung** ohne Statusprüfung.
- ❌ Keine SEO-relevanten Seiten ohne spätere **Meta-/URL-/Sitemap-Prüfung**.
- ❌ Keine **reinen Produktlisten** ohne Problem-, Nutzen- und Anwendungsebene.

---

## 6. SEO- und URL-Strategie

**Ist-Zustand:**

- Es gibt aktuell **kein `/de`-/`/en`-Pfad-Routing**.
- Die Sprache wird über **`i18next` + `localStorage`** gesteuert (Sprachumschalter im Header).
- Das ist für Prototyp und UI-Test ausreichend, **aber nicht produktionsreif für internationale SEO**.

**Optionen für die produktive URL-Strategie:**

| Option | Vorteile | Nachteile |
|---|---|---|
| **Sprachneutrale URLs** (Status quo) | einfach, kein Routing-Umbau | SEO-begrenzt, kein hreflang sinnvoll, Suchmaschinen sehen nur eine Sprachvariante |
| **Pfad-Präfixe** `/de/...`, `/en/...`, `/nl/...` | gut für SEO, hreflang sauber möglich, eindeutige Indexierung pro Sprache | Routing-Umbau nötig, Redirect-Strategie für Altlinks |
| **Übersetzte Slugs** (z. B. `/de/zutrittskontrolle`, `/en/access-control`) | maximale SEO-Wirkung pro Sprache | hoher Pflegeaufwand, Slug-Mapping je Sprache nötig |
| **Subdomains** (`de.tcs.com`, `en.tcs.com`) | klare Trennung, hosting-/CDN-flexibel | organisatorisch größer, eigene Zertifikate/DNS, getrennte Analytics |

**Empfehlung:**

- **Für den Prototyp**: sprachneutrale URLs beibehalten.
- **Für den Produktivstart**: Sprach-URL-Strategie **vor finalem Launch entscheiden**.
- Wenn internationale Sichtbarkeit (insb. EN, NL) wichtig ist: **`/de`-/`/en`-/ggf. `/nl`-Pfadstruktur** prüfen, mit hreflang-Tags und einer klaren Default-/Fallback-Sprache.

---

## 7. SEO-Pflichten vor Produktivstart

Checkliste:

- [ ] finale Seitenstruktur und Zielseiten definieren
- [ ] sprechende, stabile URLs festlegen
- [ ] Legacy-Routen dokumentieren und ggf. **301-Redirects** planen
- [ ] **Meta Title** pro Hauptseite und Unterseite
- [ ] **Meta Description** pro Hauptseite und Unterseite
- [ ] **OpenGraph-/Social-Meta-Daten** (og:title, og:description, og:image, twitter:card)
- [ ] **Canonical URLs** je Seite
- [ ] **hreflang** bei mehrsprachigen URL-Strukturen
- [ ] **Sitemap.xml** generieren (idealerweise sprachsegmentiert)
- [ ] **Robots.txt** prüfen und produktionsgerecht setzen
- [ ] **Strukturierte Daten** (JSON-LD: Organization, Product, BreadcrumbList) prüfen, falls sinnvoll
- [ ] interne Verlinkung prüfen (keine toten `#`-Links mehr)
- [ ] Breadcrumb-Struktur prüfen (visuell + JSON-LD)
- [ ] **Bild-Alt-Texte** flächendeckend prüfen
- [ ] Duplicate Content vermeiden (insb. bei Persona-/Anwendungs-Querverweisen)
- [ ] Produkt- und Downloadseiten **nur indexieren, wenn sie echte Zielseiten sind**

---

## 8. i18n-Strategie

- **DE bleibt Master.**
- **EN ist strukturgleich** (jede neue Schlüsselebene existiert in beiden Dateien).
- **Weitere Sprachen wie NL** sind technisch möglich, sobald alle Texte sauber in i18n liegen.
- **Neue sichtbare Texte dürfen nicht mehr hart in TSX stehen.**
- **Neue Seiten** müssen direkt mit i18n-Struktur (Namespace + Keys) angelegt werden.
- **Jede Textänderung** muss DE und EN berücksichtigen.
- Für **NL** müsste:
  - `src/i18n/locales/nl/` ergänzt werden (strukturgleich zu `de/`),
  - die Sprache in `src/i18n/index.ts` registriert,
  - der `LanguageSwitcher` um die Option erweitert werden,
  - eine Übersetzungspflege-Strategie (intern oder Übersetzungsdienstleister) festgelegt werden.

Details siehe [`i18n-strategy.md`](./i18n-strategy.md).

---

## 9. Supabase-/Datenbankstrategie

**Grundsatz:**

- **Statische Content-Seiten** (Persona-Texte, Marketing-Abschnitte, Hero-Storytelling) können weiter aus Code/i18n kommen.
- **Datenbankgetriebene Bereiche** sollten später aus **Supabase** kommen.

**Aus Supabase kommen sollten perspektivisch:**

- Produkte
- Produktkategorien
- Dokumente
- Downloads
- Bilder/Medien
- Serien/Produktgruppen
- ggf. FAQ-/Wissensdaten
- ggf. Serviceportal-Projekte

**Empfehlung:**

- **Produkte und Downloads nicht dauerhaft hart in TSX pflegen.**
- Die Webseite sollte perspektivisch **Daten aus Supabase lesen**.
- **Supabase = „Single Source of Truth"** für Produkt-/Download-/Dokumentdaten.
- Die Webseite **rendert** diese Daten, statt sie doppelt im Code zu halten.
- Für die i18n-Pflege von DB-Inhalten ist ein Schema `(locale, namespace, key, value)` oder pro Entität ein `translations`-Subobjekt sinnvoll – die jetzige i18n-Key-Struktur lässt sich 1:1 übernehmen.

---

## 10. Serviceportal-Strategie

**Ist-Zustand:**

- Aktuelles Serviceportal ist ein **Frontend-Dummy** (siehe `serviceportal-status.md`).
- **Demo-Login ist nicht produktiv** und darf nicht live gehen.

**Produktiv benötigt:**

- echte **Authentifizierung** (Supabase Auth oder externer IdP)
- **Rollen/Rechte** (z. B. Kunde, Partner, Fachhandel, Admin) – über separate `user_roles`-Tabelle, nie auf dem User-Profil
- **Kunden-/Partnerkonten** mit Kontextdaten
- **Projekt-/Anlagenverwaltung**
- **Datenschutz-/DSGVO-Konzept** (AVV, Speicherorte, Löschkonzepte)
- **CRM-/ERP-Anbindung**, falls erforderlich
- **KI-Chat mit projektspezifischem Kontext** nur nach sauberer Rechteprüfung (keine Cross-Tenant-Leaks)

---

## 11. Accessibility / Barrierefreiheit

Checkliste vor Produktivstart:

- [ ] semantische Überschriftenhierarchie (genau ein `<h1>` pro Seite, sinnvolle `<h2>`/`<h3>`-Staffelung)
- [ ] vollständige **Tastaturbedienbarkeit** (Tab-Reihenfolge, Skip-Links)
- [ ] sichtbare **Fokuszustände**
- [ ] **ausreichende Kontraste** (WCAG AA, idealerweise AAA für Fließtext)
- [ ] **Aria-Labels** für Buttons, Scroller, Dialoge, Sprachumschalter
- [ ] **Alt-Texte** für Bilder (dekorativ → leeres `alt=""`, inhaltlich → beschreibend)
- [ ] **Formularlabels** korrekt verknüpft
- [ ] **Spracheinstellung** im HTML (`<html lang="…">`) prüfen, ggf. dynamisch an i18next koppeln
- [ ] **reduzierte Bewegung** / Animationen respektieren `prefers-reduced-motion`
- [ ] **Screenreader-Test** für Navigation, Breadcrumbs, Dialoge, Persona-Switch

---

## 12. Performance / technische Produktionsreife

- **Bekannt**: Chunk-Size-Warnung > 500 kB beim Build.
- Aktuell **akzeptabel für Prototyp**.
- Vor Produktivstart prüfen:
  - **Code-Splitting** (`React.lazy`, dynamic imports, `manualChunks`)
  - **Lazy Loading** für Bilder und schwere Komponenten
  - **Bildoptimierung** (WebP/AVIF, responsive `srcset`, korrekte Dimensionen)
  - **Caching** (HTTP-Header, CDN-Strategie)
  - **Bundle-Analyse** (rollup-plugin-visualizer)
  - **SSR/SSG-Optionen**, falls SEO relevant
  - ggf. **Next.js-Portierung** prüfen, falls SSR/ISR/Edge-Rendering benötigt wird

---

## 13. Workflow für Mitarbeiter

**Grundsatz:** Mitarbeiter können Inhalte vorbereiten, **aber nicht beliebig Struktur verändern**.

**Neue Inhalte sollen nach Schema geliefert werden:**

- Domain (z. B. `zutrittskontrolle`)
- Seite (z. B. `MobilerZutrittPage`)
- Abschnitt (z. B. `benefits.items.komfort`)
- DE-Text
- EN-Text oder Übersetzungsbedarf
- Bild/Asset (Datei + gewünschter Dateiname)
- gewünschte Verlinkung (interne Route / externer Link)
- Produkt-/Download-Bezug (sofern relevant)

**Neue Seiten sollen erst als strukturierter Vorschlag angelegt werden:**

- Route (URL)
- Domain
- Page-Datei (`src/features/<domain>/pages/<Name>Page.tsx`)
- i18n-Keys (Namespace + Key-Baum)
- Asset-Ordner (`src/features/<domain>/assets/<seite>/`)
- Navigationsbedarf (MainNav, Footer, Persona-Querverweis)

**Bilder:**

- domainbezogen ablegen: `src/features/<domain>/assets/...`
- globale Bilder nur bei domänenübergreifender Nutzung
- siehe [`asset-strategy.md`](./asset-strategy.md)

**Texte:**

- **Keine neuen sichtbaren Texte hart in TSX.** Immer als i18n-Key in der zuständigen Domain-Datei.

---

## 14. Entscheidungspunkte vor Übergabe an Mitarbeiter

Vor breiter Mitarbeiterbeteiligung müssen folgende Punkte geklärt sein:

- Welche Domains sind **i18n-fertig**?
- Welche Domains dürfen **schon inhaltlich bearbeitet** werden?
- Welche Bereiche sind **noch gesperrt** (in Migration)?
- Wer **liefert Bilder** (Marketing, externer Dienstleister)?
- Wer **prüft Texte** (DE-Master, EN-Übersetzung)?
- Wer **entscheidet über neue Seiten** (Produktmanagement, Marketing, Geschäftsführung)?
- Wer **entscheidet über Produkt-/Downloaddaten** (Produktmanagement, Vertrieb)?
- Wer **entscheidet über SEO-URLs** (Marketing/SEO-Verantwortliche)?
- Wer **entscheidet über Supabase-Anbindung** (IT/Entwicklung)?

---

## 15. Empfehlung

- **Die i18n-Migration sollte zuerst abgeschlossen werden** (offene Domains: `gebaeudemanagement`, `eingangssysteme`, `anwendungen`, `signage`, `service`, `wissen`). Bereits vollständig migriert: `gebaeudekommunikation` und `zutrittskontrolle`.
- Danach sollte eine **kurze Struktur-/Produktionsreife-Etappe** erfolgen (Doku-Sweep, Linkprüfung, Asset-Sweep, Build-Hygiene).
- **Danach können Mitarbeiter gezielt weiterarbeiten** – nach dem in Abschnitt 13 beschriebenen Schema.
- Mitarbeiter können **parallel bereits Inhalte vorbereiten** (Texte, Bilder, Produktdaten), aber **noch nicht frei strukturell in den Code eingreifen**.
- **Produkt- und Downloaddaten sollten langfristig nicht im Code gepflegt werden**, sondern aus **Supabase** kommen. Das spart doppelte Pflege, ermöglicht zentrale Aktualisierung und ist Voraussetzung für Suchfunktionen, Filter und ein produktives Serviceportal.

---

## Verwandte Dokumente

- [`current-status.md`](../current-status.md) – aktueller Stand der Migration
- [`i18n-strategy.md`](./i18n-strategy.md) – i18n-Konventionen
- [`asset-strategy.md`](./asset-strategy.md) – Asset-Ordnung
- [`code-landkarte.md`](../02-architecture/code-landkarte.md) – Code-Struktur
- [`serviceportal-status.md`](./serviceportal-status.md) – Serviceportal-Stand
- [`migration-log.md`](../migration-log.md) – chronologisches Migrationsprotokoll
