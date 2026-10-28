# URL- und Sprachstrategie

> Strategische Entscheidungsgrundlage. Beschreibt den **Ist-Zustand**, die **bewerteten Optionen** und die **empfohlene Zielstrategie** für URLs und Sprachen.
> Diese Etappe (`doc-url-strategy-1`) hält die Strategie ausschließlich dokumentarisch fest. Es wird **kein Produktivcode geändert**.

---

## 1. Ist-Zustand

Aktueller Stand im Repository:

- **Sprachneutrale URLs.** Alle Routen sind sprachunabhängig (z. B. `/zutrittskontrolle`, `/tuerkommunikation`, `/akademie`).
- **Sprachumschaltung nur über i18n im Frontend.** Die aktive Sprache wird über `i18next` + `localStorage` persistiert (siehe `src/i18n/index.ts`, Sprachumschalter in `src/components/LanguageSwitcher.tsx`).
- **Kein `/de/`- und kein `/en/`-Routing.** Es gibt keine sprachpräfigierten Pfade, keine sprachspezifischen Slugs und keine sprachgebundenen Routen.
- **Keine hreflang-Implementierung.** Es werden weder `<link rel="alternate" hreflang="…">` noch `x-default` ausgegeben.
- **Keine Sitemap mit Sprachvarianten** und **keine Redirect-Strategie** zwischen Sprachen.
- **`<html lang>` wird dynamisch gesetzt** über `useDocumentLang` (eingeführt in `doc-seo-base-1`). Das ist eine HTML-/A11y-Basis, **ersetzt aber keine SEO-taugliche URL-Sprachtrennung**.

Dieser Zustand ist für den aktuellen Prototyp- und i18n-Migrationsstand bewusst gewählt und tragfähig. Für **internationale SEO**, **eindeutige kanonische Sprachsignale** und **strukturierte Suchsignale** ist er jedoch nicht ausreichend.

---

## 2. Bewertete Optionen

### Option A — Sprachneutrale URLs beibehalten (Status quo)

- **Beschreibung:** Eine URL pro Inhalt, Sprachumschaltung nur im Client.
- **Vorteile:** Einfachste Variante; keine Routen-Umstellung nötig; keine Redirect-Strategie nötig.
- **Nachteile:**
  - Keine sauberen hreflang-Signale möglich (es gibt keine separaten URLs für DE und EN).
  - Suchmaschinen können Sprachvarianten nicht eindeutig zuordnen.
  - Keine sprachspezifischen Slugs (z. B. `/use-cases` statt `/anwendungen`).
  - Sprache hängt von Client-State ab (localStorage) — schlecht für geteilte Links und Indexierung.

### Option B — Sprachpräfix im Pfad (`/de/...`, `/en/...`)

- **Beschreibung:** Jede Seite existiert unter einem sprachpräfigierten Pfad. Beispiel: `/de/zutrittskontrolle`, `/en/access-control`.
- **Vorteile:**
  - Saubere kanonische URL pro Sprache.
  - Volle hreflang-Fähigkeit (inkl. `x-default`).
  - Sprachspezifische Slugs technisch sauber abbildbar.
  - Eine Domain, ein Hosting, eine Deployment-Pipeline.
  - Sprache ist aus der URL ableitbar (kein Client-State nötig).
- **Nachteile:**
  - Einmaliger Migrationsaufwand: Routen, interne Links, Breadcrumbs, Sitemap, Redirects.
  - Slug-Übersetzungstabelle muss gepflegt werden.

### Option C — Subdomain oder ccTLD (z. B. `de.tcs.de`, `en.tcs.com`)

- **Beschreibung:** Pro Sprache eine eigene Subdomain oder Top-Level-Domain.
- **Vorteile:**
  - Stärkstes Signal für rein landes-/sprachspezifische Auftritte.
  - Sehr klare Trennung auf Infrastruktur-Ebene.
- **Nachteile:**
  - Höchster Betriebs- und SEO-Aufwand (eigene Domain-Autorität pro Host).
  - Hosting, Zertifikate, Analytics und Deployment doppelt zu pflegen.
  - Für eine zweisprachige Unternehmenswebseite mit gemeinsamer Marke deutlich überdimensioniert.

---

## 3. Empfohlene Zielstrategie

**Empfehlung: Option B — Sprachpräfix im Pfad (`/de/...`, `/en/...`).**

Begründung, kompakt:

- **Internationale SEO:** Eine URL pro Sprache ist Voraussetzung für saubere Indexierung pro Sprachversion.
- **hreflang-Fähigkeit:** Erst getrennte URLs erlauben gültige `hreflang`-Annotationen inklusive `x-default`.
- **Klare kanonische Sprachtrennung:** Jede Sprachversion hat eine eindeutige kanonische URL — unabhängig vom Client-State.
- **Sprachspezifische Slugs:** Slugs können pro Sprache übersetzt werden (z. B. `/de/anwendungen` ↔ `/en/use-cases`), ohne URL-Konflikte.
- **Bessere langfristige Skalierbarkeit:** Weitere Sprachen oder Marktversionen können später nach demselben Muster ergänzt werden, ohne die Infrastruktur zu duplizieren (anders als Option C).

**Wichtig:** Diese Empfehlung ist eine **strategische Zielentscheidung**. Sie ist **noch nicht im Code umgesetzt**.

---

## 4. Konsequenzen bei späterer Umsetzung

Bei einer späteren Code-Umsetzung von Option B sind insbesondere betroffen:

- **`src/navigation/routes.ts`** — Routenkonstanten und Slug-Definitionen.
- **Feature-Routen** — `src/features/*/routes.tsx` (Routen je Domain).
- **Interne Links** — alle `<Link to="…">`-Stellen in Komponenten und Seiten.
- **Breadcrumb-Logik** — `src/components/AutoBreadcrumb.tsx` (Sprachpräfix in Pfadparsing einbeziehen).
- **i18n-Initialisierung / Sprache aus URL** — `src/i18n/index.ts` und Sprachableitung in `src/main.tsx` / `useDocumentLang`.
- **hreflang** — Ausgabe von `<link rel="alternate" hreflang="…">` und `x-default` im `<head>`.
- **Sitemap** — Sprachvarianten je Seite, mit korrekter `<xhtml:link>`-Annotation.
- **Redirect-Strategie** — Verhalten beim Aufruf der sprachneutralen Wurzel (`/`), bei alten Pfaden ohne Sprachpräfix und beim Sprachwechsel.

Diese Liste ist eine **Vorschau**, kein Umsetzungsplan. Die konkrete Umsetzung wird in einer eigenen Etappe geplant und durchgeführt.

---

## 5. Abgrenzung dieser Etappe

- Diese Etappe (`doc-url-strategy-1`) ändert **keinen Produktivcode**.
- Es werden **keine Routen, keine Navigation, keine Slugs, keine i18n-Initialisierung, keine hreflang-Tags und keine Sitemap** angefasst.
- Die Etappe legt nur die **strategische Entscheidung** und die **bei späterer Umsetzung betroffenen Bereiche** fest.

---

## 6. Verwandte Dokumente

- [`seitentyp-taxonomie.md`](./seitentyp-taxonomie.md) — Seitentyp-Taxonomie (v2); definiert URL-Muster pro Seitentyp und referenziert die hier dokumentierte Sprachpräfix-Entscheidung in Abschnitt 5.
- [`i18n-strategie.md`](./i18n-strategie.md) — i18n-Strategie und Status der Namespaces (DB-first über `useCmsI18n`, JSON als Fallback).
- [`../02-architektur/architektur.md`](../02-architektur/architektur.md) — Architektur-Gesamtbild (DB, Renderer, RPC, Admin).
- [`../current-status.md`](../current-status.md) — aktueller Projektstand und offene Bereiche.
