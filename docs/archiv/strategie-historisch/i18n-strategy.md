# i18n-Strategie – TCS Unternehmenswebseite

Diese Datei beschreibt, **wie Mehrsprachigkeit (DE/EN) für Seitentexte in diesem Projekt organisiert ist**.
Sie ergänzt [`code-landkarte.md`](../02-architecture/code-landkarte.md) und ist die verbindliche Referenz für künftige Textmigrationen.

> Stand: nach Etappe `hygiene-dead-code-1` (toter Code/Assets/i18n-Keys entfernt). Vorgänger u. a. `hygiene-status-1`, `hygiene-cta-rest-1`, `hygiene-strictpages-close-1`, `i18n-validator-fix-1`, `hygiene-nav-rest-1`, `footer-rest-hygiene-1`, `i18n-coverage-policy-1`, `i18n-coverage-close-1`.
> Sprachumschalter ist aktiv. Real registriert in `src/i18n/index.ts`: **17 Namespaces**. Real in `scripts/i18n/i18n-check.config.json`: **68 `strictPages`** und **2 `exemptPages`** (Container-/Hilfskomponente mit Begründung). Reale Tool-Ausgabe von `npm run i18n:check`: **0 Fehler, 0 Warnungen**. Seit Etappe `hygiene-strictpages-close-1` deckt `strictPages` alle gerouteten i18n-fähigen Pages ab; offene Lücken werden vom Health Check nicht mehr gemeldet.

---

## Variante A – zentrale i18n-Dateien pro Feature-Domain

Seitentexte werden in zentralen JSON-Dateien je Feature-Domain abgelegt:

```
src/i18n/locales/
├── de/
│   ├── common.json
│   ├── navigation.json
│   ├── home.json
│   ├── personas.json
│   ├── gebaeudekommunikation.json
│   ├── zutrittskontrolle.json
│   ├── gebaeudemanagement.json
│   ├── eingangssysteme.json
│   ├── anwendungen.json
│   ├── signage.json
│   ├── service.json
│   ├── serviceportal.json
│   ├── wissen.json
│   ├── kontakt.json
│   ├── karriere.json
│   ├── presse.json
│   └── legal.json
└── en/
    └── … (strukturgleich)
```

---

## Konventionen

- **Ein Feature-Bereich = ein Namespace.** Der Dateiname (ohne `.json`) ist der Namespace.
- **Deutsch ist Master-Sprache.** Neue Texte werden zuerst in `de/<namespace>.json` ergänzt.
- **Englisch hat dieselbe Key-Struktur.** Jede neue Schlüsselebene muss in beiden Dateien existieren. Fehlen Übersetzungen, wird zumindest der Key strukturell angelegt (mit deutschem Platzhalter, falls nötig markiert).
- **Keine extrem kleinteiligen Dateien** pro Persona oder pro Seite. Eine Datei pro Domain.
- **Splitting nur bei Bedarf.** Erst wenn eine Domain-Datei nachweislich unhandlich wird (Faustregel: > 500–800 Zeilen), kann z. B. `anwendungen.json` + `anwendungen.referenzen.json` entstehen.
- **Keine Sammeldateien über Domains hinweg.** Jede Domain pflegt ihre Texte selbst.
- **Keine Seitentexte mehr direkt hart in TSX** ergänzen, sobald die Migration einer Domain begonnen hat. Stattdessen `useTranslation("<namespace>")` + `t("…")`.

---

## Key-Struktur

Keys folgen der fachlichen Hierarchie:

```
<seite>.<abschnitt>.<element>
```

Beispiele:

- `home.hero.title`
- `home.hero.subtitle`
- `wohnbau.hero.title`
- `personas.architekt.solutions.signage.headline`

So lassen sich Änderungen eindeutig adressieren – auch in Prompts oder einer späteren Admin-/Datenbank-Pflege.

---

## Pflege per Prompt

Damit Textänderungen eindeutig adressierbar sind, wird jede Änderung über **Namespace + Key** beschrieben:

- Namespace: `personas`
- Key: `architekt.solutions.signage.headline`
- Sprache(n): `de` und `en`

Regeln:

- Nicht „ändere irgendeinen Text auf der Architektenseite", sondern **immer Namespace und Key**.
- **Jede Textänderung berücksichtigt DE und EN.**
- Neue Texte werden als i18n-Keys in der zuständigen Domain-Datei angelegt, nicht als TSX-String.

---

## Aktueller Stand (nach `hygiene-dead-code-1`)

- **17 Namespaces** sind in `src/i18n/index.ts` registriert (`common`, `navigation`, `home`, `personas`, `gebaeudekommunikation`, `zutrittskontrolle`, `gebaeudemanagement`, `eingangssysteme`, `anwendungen`, `signage`, `service`, `serviceportal`, `wissen`, `kontakt`, `karriere`, `presse`, `legal`).
- **68 Seiten** sind in `scripts/i18n/i18n-check.config.json` als `strictPages` aufgenommen, **2 Pages** als `exemptPages` mit Begründung dokumentiert.
- `npm run i18n:check` meldet aktuell **0 Fehler und 0 Warnungen** (Resultat OK).
- **DE ist Master**, **EN ist strukturgleich** (jede neue Schlüsselebene existiert in beiden Dateien).
- **Sprachumschalter ist aktiv** (Header) und persistiert die Auswahl über `i18next` + `localStorage`.
- **Kein /de-/en-Routing.** URLs bleiben aktuell sprachneutral. Eine URL-Sprachstrategie (z. B. Pfad-Prefix oder Subdomain) bleibt eine spätere SEO-/Produktionsentscheidung.
- **Zentrale i18n-Dateien pro Namespace** bleiben die Strategie. Splitting nur bei Bedarf (Faustregel > 500–800 Zeilen).

### Migrierte Namespaces (realer Code-Befund)

| Namespace | Stand | Bemerkung |
|---|---|---|
| `common` | – (kein `_meta`) | u. a. globaler PageLayout-CTA `pageCta.*` und `notFound.*`. |
| `navigation` | – (kein `_meta`) | Hauptnav, Dropdowns, Footer, Meta, Breadcrumbs, a11y-Labels (Skip-Link, Navigationen). |
| `home` | `migrated` | `UeberTCSPage.tsx` vollständig migriert (`home.ueberTcs.*`) und in `strictPages`. `HomePage.tsx` ist eine **Container-Page** ohne eigenen `useTranslation`-Aufruf – Texte kommen ausschließlich aus den Shared-Komponenten (`HeroSection`, `ContentBlocks`, `PersonaSection`, `CTASection`); seit `i18n-coverage-policy-1` formal als `exemptPages`-Eintrag mit Begründung geführt. |
| `personas` | `migrated` | Architekt, Bauherr, Fachhandel, Fachplaner, Handwerk, Wohnungswirtschaft – alle `*Content.tsx` nutzen `useTranslation("personas")`. Persona-Komponenten werden eingebettet, daher bewusst nicht in `strictPages`. |
| `kontakt` | `migrated` | `KontaktPage.tsx` nutzt `useTranslation` und ist seit `hygiene-strictpages-close-1` in `strictPages`. |
| `karriere` | `migrated` | `KarrierePage.tsx` nutzt `useTranslation` und ist seit `hygiene-strictpages-close-1` in `strictPages`. |
| `presse` | `migrated` | `PressePage.tsx` nutzt `useTranslation` und ist seit `hygiene-strictpages-close-1` in `strictPages`. |
| `serviceportal` | `migrated` | Login, Registrierung, Passwort vergessen – alle 3 Pages nutzen `useTranslation("serviceportal")` und sind seit `hygiene-strictpages-close-1` in `strictPages`. Reine Frontend-Stubs ohne Auth-Backend. |
| `gebaeudekommunikation` | `migrated` | Root, Türsprechanlagen, Briefkastenanlagen, Systemlösungen, Großanlagen, snipdoo IP – alle 6 Pages nutzen `useTranslation("gebaeudekommunikation")` und sind seit `hygiene-strictpages-close-1` in `strictPages`. Sonderfall: `BeschilderungPage.tsx` liegt in `src/features/signage/`, ist unter `/gebaeudekommunikation/beschilderung` gemountet, nutzt Namespace `gebaeudekommunikation` und ist in `strictPages`. |
| `zutrittskontrolle` | `migrated` | Root, Fahrstuhlsteuerung, Mobiler Zutritt, Zufahrten/Parkplätze, Türen/Tore – alle 5 Pages nutzen `useTranslation("zutrittskontrolle")` und sind seit `hygiene-strictpages-close-1` in `strictPages`. |
| `gebaeudemanagement` | `migrated` | Root, Alarmanlagenkopplung, Digital Signage, Reservieren/Buchen, Schränke/Behälter, Digitale Namensanzeige – alle 6 Pages in `strictPages`. |
| `eingangssysteme` | `migrated` | Root/Entry, Design, Funktionalität, Material, Integrationsformen, Referenzen, Standards, Beratung – alle 8 Pages in `strictPages`. |
| `anwendungen` | `migrated` | Root, 5 Übersichten, 16 Detailseiten, Referenzliste + Detail – 24 Pages in `strictPages`. EN-Label des Bereichs lautet `Use cases`. |
| `signage` | `migrated` | `SignagePage.tsx` vollständig migriert (Namespace `signage`) und in `strictPages`. `BeschilderungPage.tsx` läuft fachlich über Namespace `gebaeudekommunikation` (s. o.). |
| `service` | `migrated` | Service-Hub, OnlineProduktkatalog, PlanenKonfigurieren, Downloads, TechnischerSupport, Ersatzteile – alle 6 Pages in `strictPages`. |
| `wissen` | `migrated` | `AkademiePage` in `strictPages`. |
| `legal` | `in-progress` | Domain `src/features/legal/` real angelegt (Etappe `doc-legal-base-2`). 3 Pages (`ImpressumPage`, `DatenschutzPage`, `AgbPage`) in `strictPages`. **Inhalte sind redaktionell offen und in der UI als „in Bearbeitung" markiert** – keine finalen Rechtstexte. |

### Verbleibende offene Punkte

- Finale redaktionelle Inhalte der Legal-Seiten (`legal._meta.status` bleibt `in-progress`, bis reale Rechtstexte vorliegen).
- URL-Sprachstrategie (sprachneutrale URLs vs. Pfad-Prefix vs. Subdomain, hreflang) – spätere SEO-/Produktionsentscheidung.

### Begriffsdefinitionen (seit `i18n-coverage-policy-1`)

- **Page** – TSX-Datei unter `src/features/<domain>/pages/*Page.tsx`, die direkt in einem `routes.tsx` als `element={<Foo />}` gemountet wird. Pages **müssen** entweder in `strictPages` stehen **oder** in `exemptPages` mit Begründung geführt werden. Stille Lücken sind nicht erlaubt.
- **Container-Page** – Page ohne eigene sichtbare Texte. Alle Inhalte werden ausschließlich über Shared-Komponenten gerendert, die selbst i18n nutzen. Container-Pages dürfen **nicht** künstlich mit `useTranslation` versehen werden, sondern gehören in `exemptPages` mit klarer Begründung. Beispiel: `HomePage.tsx`.
- **Hilfskomponente** – TSX-Datei, die nicht direkt geroutet ist (z. B. unter `components/`), sondern von einer oder mehreren Pages eingebettet wird. Hilfskomponenten gehören **nicht** in `strictPages`. Wenn ihr Dateiname zufällig auf `Page.tsx` endet (z. B. `AnwendungDetailPage.tsx` unter `anwendungen/components/`), gehört sie in `exemptPages` mit Begründung, damit der Health Check sie korrekt einordnet.

### Wann muss eine Seite in `strictPages` stehen?

Eine Seite muss in `strictPages` aufgenommen werden, sobald **alle** der folgenden Bedingungen erfüllt sind:

1. Die Datei ist eine **Page** (geroutet, unter `pages/`).
2. Die Datei nutzt `useTranslation(...)`.
3. Die Datei enthält keine sichtbaren harten deutschen Texte (laut Hardtext-Heuristik).

Wenn eine geroutete Page `useTranslation` nutzt, aber nicht in `strictPages` und nicht in `exemptPages` steht, **meldet der Health Check sie als Warnung** (`npm run i18n:check` → Abschnitt „Health Check"). Aktuell sind alle gerouteten i18n-fähigen Pages abgedeckt; der Health Check meldet **0 Warnungen**.

### Wann ist eine `exemptPages`-Ausnahme erlaubt?

Eine Ausnahme ist nur dann zulässig, wenn:

- die Page eine echte **Container-Page** ist (keine eigenen Texte) **oder**
- die Datei eine **Hilfskomponente** ist, die formal `Page.tsx` heißt, aber nicht direkt geroutet wird.

Jeder `exemptPages`-Eintrag **muss** ein nicht-leeres `reason`-Feld enthalten. Fehlt das Feld oder ist es leer, schlägt `npm run i18n:check` mit einem Fehler fehl. Veraltete Ausnahmen (Datei nicht mehr vorhanden) führen ebenfalls zu einem Fehler.

### Hinweis zu `strictPages`

`strictPages` ist eine bewusste Härte-Liste in `scripts/i18n/i18n-check.config.json`. Seit Etappe `i18n-coverage-policy-1` werden i18n-fähige Pages ohne `strictPages`/`exemptPages`-Eintrag vom Health Check explizit als Warnung gemeldet. Seit Etappe `hygiene-strictpages-close-1` enthält `strictPages` alle gerouteten i18n-fähigen Pages (68 Einträge), `exemptPages` führt 2 dokumentierte Sonderfälle (`HomePage.tsx` als Container-Page, `AnwendungDetailPage.tsx` als Hilfskomponente). Der Health Check meldet damit aktuell 0 Warnungen.

---

## Nächste Schritte

- Schrittweise Migration der verbleibenden Domains (eigene Etappen pro Domain).
- URL-Sprachstrategie zu einem späteren Zeitpunkt entscheiden (SEO, hreflang, Routing).
- Optionale spätere Migration in eine Datenbank (z. B. Supabase) – das Schema `(locale, namespace, key, value)` lässt sich 1:1 übernehmen.

---

## Routebasierte i18n-Prüfung

i18n-Migrationen und Final-Checks dürfen **nicht nur anhand des Feature-Ordners** geprüft werden. Maßgeblich ist, **welche TSX-Datei eine Route tatsächlich rendert**.

Regeln:

- Eine Seite kann fachlich einer Domain zugeordnet sein, aber technisch in einem anderen Feature-Ordner liegen. Beispiel: `BeschilderungPage.tsx` liegt unter `src/features/signage/pages/`, ist aber unter `/gebaeudekommunikation/beschilderung` gemountet und nutzt den Namespace `gebaeudekommunikation`.
- Der verwendete i18n-Namespace muss bewusst gewählt und im Migration-Log (und ggf. in der Code-Landkarte) dokumentiert sein.
- Nach jeder abgeschlossenen Seitenmigration soll die Seite in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen werden, sofern sie vollständig i18n-migriert ist.
- Sonderfälle (Route ↔ Datei-Ort ↔ Namespace nicht identisch) müssen im Migration-Log benannt und nicht stillschweigend gelassen werden.
- Domain-Final-Checks müssen zusätzlich prüfen, ob alle fachlich zur Domain gehörenden Routen abgedeckt sind – auch wenn ihre TSX-Dateien in anderen Feature-Ordnern liegen.

Stand: ergänzt mit Etappe 20-doc-1.

---

## Hinweis zur Produktionsreife

- Die aktuelle i18n-Struktur ist **sprachfähig** (DE/EN aktiv, weitere Sprachen technisch ergänzbar), aber **noch keine finale internationale SEO-URL-Strategie**.
- Für **weitere Sprachen wie NL** muss eine zusätzliche Locale-Struktur (`src/i18n/locales/nl/`) ergänzt, die Sprache in `src/i18n/index.ts` registriert und der `LanguageSwitcher` erweitert werden.
- Die **URL-Sprachstrategie** (sprachneutrale URLs vs. Pfad-Präfixe vs. Subdomains) ist im Produktionsfahrplan dokumentiert: [`production-readiness-plan.md`](./production-readiness-plan.md), Abschnitt 4.
