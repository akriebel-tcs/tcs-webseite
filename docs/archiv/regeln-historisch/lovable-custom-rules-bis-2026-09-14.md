> **ARCHIV — nicht führend.**
> Ursprungspfad: `docs/lovable-custom-rules.md`
> Archiviert: 2026-09-14 (Etappe 1, Restkorrekturen)
> Stand dieser Fassung: vor CMS-Light-DB-first (nennt i18n-JSON noch als
> führenden Renderpfad)
> Nachfolger (aktiv): `docs/lovable-custom-rules-compact.md` und
> `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`
> Relative Verweise in dieser Fassung gingen von der Basis `docs/` aus und
> wurden hier NICHT umgeschrieben.

# Lovable Custom Rules – TCS Unternehmenswebseite

> **Zweck dieser Datei:**
> Diese Datei bündelt alle dauerhaften Leitplanken für die TCS-Unternehmenswebseite.
> Der Inhalt ist so formuliert, dass er **1:1 als Custom Rules in Lovable** hinterlegt werden kann
> (Project Settings → Knowledge → Instructions & Guidelines / Custom rules).
>
> **Wo hinterlegen?**
> - **Desktop:** Projektname (oben links) → *Settings* → Tab *Knowledge* → Feld *Instructions & Guidelines* (Custom rules).
>   Alternativ: `Cmd/Ctrl + K` → "Knowledge".
> - **Mobile:** `…` (unten rechts, Chat-Modus) → *Settings* → Tab *Knowledge*.
> - Zusätzlich verbleibt diese Datei im Repo unter `docs/lovable-custom-rules.md`
>   als versionierte Quelle der Wahrheit.

---

## 1. Projektkontext (Kurzfassung für die KI)

- **Projekt:** Öffentliche Unternehmenswebseite der TCS AG.
- **Stack:** React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + shadcn/ui + react-i18next.
- **Sprachen:** Deutsch (Default) und Englisch, vollständig über i18n-Keys.
- **Inhalte:** Webseitencontent (Texte, Hero-Bilder, Landingpages, Personas) ist **codebasiert**
  (i18n-JSON + lokale Assets in `src/assets` bzw. `public/`).
- **Strukturierte Fachdaten:** Produktkatalog und Dokumente/Downloads kommen aus einer
  **externen Supabase-Datenbank**, die in einem **separaten TCS-Datenbankprojekt** verwaltet wird.
- **Dieses Webseitenprojekt** war ursprünglich frontend-only. Inzwischen existiert eine
  **eigene interne Lovable Cloud / Supabase-Instanz** (Projekt-ID `uvkubrrljyzfvbvejepl`),
  ausschließlich für **CMS-Light** (redaktionelle Webseiteninhalte). Migrationen für CMS-Light
  sind erlaubt, aber nur im redaktionellen Scope (`cms_pages`, `cms_sections`,
  `cms_section_fields`, `cms_assets`). Die externe Produktdatenbank bleibt davon strikt
  getrennt und weiterhin **read-only** angebunden. Produktdaten dürfen niemals in CMS-Light
  kopiert werden.

---

## 2. Datenbanken – harte Regeln

In diesem Projekt werden **zwei voneinander getrennte Datenquellen** unterschieden:

1. die **externe Produktdatenbank** (Projekt-ID `tkscpnwbkjmqopnddxle`, führend für
   Produktkatalog, PDP, Produktbilder, Produktdokumente, Downloads, Spezifikationen) –
   **read-only**,
2. die **interne CMS-Light-Datenbank / Lovable Cloud** (Projekt-ID `uvkubrrljyzfvbvejepl`),
   ausschließlich für redaktionelle Webseiteninhalte.

Beide Datenquellen sind strikt getrennt. Produktdaten werden niemals in CMS-Light kopiert.
Es gibt **genau einen** Produktdatenbank-Client und **genau einen** CMS-Light-/Lovable-
Cloud-Client, beide an unterschiedlichen Pfaden.

### 2a. Externe Produktdatenbank – read-only

1. Bleibt **führend** für Produktkatalog, PDP, Produktbilder, Produktdokumente, Downloads
   und Produktspezifikationen.
2. Wird **ausschließlich READ-ONLY** genutzt.
3. **Verboten** im Frontend: `insert`, `update`, `delete`, `upsert`, schreibende `rpc(...)`.
4. **Niemals** einen `service_role`-Key im Frontend verwenden oder im Code hinterlegen.
5. **Keine** Produktdaten in eine CMS-Light-Datenbank kopieren oder spiegeln.
   Produktdaten bleiben außerhalb des redaktionellen CMS.
6. Verbindung **ausschließlich** über die produkt-spezifischen Vite-Env-Variablen:
   - `VITE_PRODUCT_SUPABASE_URL`
   - `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY`
   - Fallback (publishable, dokumentiert): externe Produktdatenbank `tkscpnwbkjmqopnddxle`
     (`https://tkscpnwbkjmqopnddxle.supabase.co`).
   - **Wichtig:** Die generischen `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
     gehören seit der Aktivierung von Lovable Cloud zur **internen CMS-Light-Datenbank**
     und dürfen **nicht** für den Produktdatenbank-Client verwendet werden.
7. Es existiert genau **ein** zentraler Produktdatenbank-Client: `src/lib/supabase/client.ts`.
   Keine weiteren `createClient(...)`-Aufrufe für die Produktdatenbank. Der CMS-Light-Client
   (`src/integrations/supabase/client.ts`, Lovable Cloud) ist davon strikt getrennt und
   darf den Produktdaten-Client nicht ersetzen.
8. Der Client läuft ohne Auth-State: `persistSession: false`, `autoRefreshToken: false`,
   `detectSessionInUrl: false`. Die Produktdatenbank wird **nicht** für Auth genutzt.
9. Vor jedem `supabase.from(...).select(...)` wird `isSupabaseConfigured()` als Guard genutzt.
   Listenfunktionen geben bei fehlender Konfiguration `[]` zurück, Einzelabfragen `null`.

### Erlaubte Datenquellen der Produktdatenbank (führend, nicht durch Frontend-Heuristiken ersetzbar)

Führender Produktdatenvertrag ist die **freigegebene API-/Manifest-Schicht** der externen
Produktdatenbank. Erlaubt sind ausschließlich:

- **Manifest / Listing / Filter:** `api_v1_catalog_manifest`, `api_v1_products_catalog`,
  `product_filter_options_view`
- **Lesende RPCs:** `rpc_get_catalog_context`, `rpc_get_product_listing`,
  `rpc_get_product_pdp`, `rpc_get_product_specs_display`
- **Produktbilder/-dokumente:** bevorzugt über die mitgelieferten `public_url`-Felder.
  Keine eigene Storage-Pfad-/Bucket-Erfindung im Frontend.
- Weitere `api_v1_*`-Views oder lesende `rpc_*`-Funktionen nur, wenn sie ausdrücklich Teil der
  freigegebenen Auslieferungsschicht sind.

Interne Tabellen/Views (z. B. `products_public_view`, `article_images`, `paket_komponenten`,
`paket_dokumente_resolved_view`, `article_documents`, `document_artikel`) sind **kein**
führender Frontend-Vertrag mehr. Sie dürfen nur verwendet werden, wenn sie ausdrücklich Teil
der freigegebenen Auslieferungsschicht sind.

### Fachliche Regeln (Produktdaten)

- `artikel_nr` ist der **fachliche Schlüssel**.
- Präfixe wie `PA`, `PP`, `PV` sind **Kontext**, **nicht** alleinige Frontend-Entscheidungslogik.
- Klassifikationen, Filter, Status, Healthchecks und Zuordnungen werden **nicht** im UI hardcodiert,
  sondern aus den freigegebenen Views/RPCs gelesen.

### 2b. Interne CMS-Light-Datenbank / Lovable Cloud

1. Die eigene **Lovable Cloud / Supabase-Instanz** für CMS-Light ist seit Etappe
   `cms-light-pilot-schema-1` aktiviert (Projekt-ID `uvkubrrljyzfvbvejepl`). Migrationen,
   `supabase/`-Ordner und CMS-Tabellen für **redaktionelle** Inhalte sind erlaubt.
   Weitergehende Schema-/Bucket-Änderungen werden weiterhin nur im Rahmen ausdrücklich
   beauftragter Etappen vorgenommen.
2. CMS-Light dient **ausschließlich redaktionellen Webseiteninhalten** (Hero-Texte, Answer-
   First-Blöcke, redaktionelle Bilder, Karten-/Blockinhalte, CMS-Pilotseiten).
3. Aktueller / erlaubter Modellrahmen:
   - `cms_pages`
   - `cms_sections`
   - `cms_section_fields`
   - `cms_assets`
   - später eventuell `cms_navigation_nodes`, **nicht** in Phase 1.
4. CMS-Light darf **niemals** Produktdaten, Artikelnummern-Logik, PDP-Inhalte, Downloads oder
   Produktspezifikationen ersetzen oder ergänzen. Produktdaten werden **nicht** ins CMS kopiert.
5. **Keine Schreibrechte für `anon`** in CMS-Light. Schreibzugriffe sind erst zulässig mit
   sauberer Editor-/Auth-Regelung (eigene Etappe).
6. **Keine Navigation-aus-DB in Phase 1.** Navigation bleibt Code
   (`src/navigation/mainNavigation.ts`, `footerNavigation.ts`, `metaNavigation.ts`,
   `personaNavigation.ts`).
7. **Keine Migration aller i18n-Texte in die DB.** Das `i18n`-JSON unter
   `src/i18n/locales/{de,en}/<namespace>.json` bleibt gültiger Fallback.
8. `src/navigation/pageRegistry.ts` ist die **statische Seitenidentität**.
   `page_key` ist die **stabile technische Seiten-ID**, `route_path` darf sich ändern,
   `page_key` nicht. `page_type` bleibt an die Seitentyp-Taxonomie T01–T21 gebunden
   (siehe [`01-strategie/seitentyp-taxonomie.md`](./01-strategie/seitentyp-taxonomie.md);
   historische ID-/Key-Notizen unter [`archiv/strategie-historisch/cms-id-key-modell.md`](./archiv/strategie-historisch/cms-id-key-modell.md)).
9. **Produktdaten-Client und CMS-Light-Client sind technisch getrennt:**
   - **Produktdaten-Client:** `src/lib/supabase/client.ts`, Env
     `VITE_PRODUCT_SUPABASE_URL` / `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY` (Fallback
     externe Produktdatenbank `tkscpnwbkjmqopnddxle`).
   - **CMS-Light-/Lovable-Cloud-Client:** `src/integrations/supabase/client.ts`, Env
     `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (interne Lovable Cloud
     `uvkubrrljyzfvbvejepl`).
   - Beide Clients dürfen sich gegenseitig **nicht ersetzen oder überschreiben**.
10. **Keine Admin-UI / kein Editor** im Webseitenprojekt ohne eigene Etappe.
11. Eine **öffentliche Auslieferung** von CMS-Light-Inhalten erfolgt nur in einer eigenen
    Etappe; ohne diese bleibt der i18n-/statische Inhalt der führende Renderpfad.

---

## 3. Architektur & Codeorganisation

1. Feature-orientierte Struktur unter `src/features/<feature>/{pages,components,api,types}`.
2. Querschnittliches Zeug unter `src/components/`, `src/shared/`, `src/lib/`, `src/hooks/`.
3. Routing dezentral pro Feature in `src/features/<feature>/routes.tsx`,
   eingehängt über `src/app/routes.tsx`.
4. **Keine** zirkulären Abhängigkeiten zwischen Features.
   Features kommunizieren über `shared/`, `lib/` oder explizite APIs.
5. Komponenten klein und fokussiert halten. Lieber neue Datei als Mega-Komponente erweitern.
6. Eine **Admin-Oberfläche, ein CMS-Light oder ein Editor** wird **nur nach ausdrücklich
   beauftragter Pilot-Etappe** gebaut. Ohne solche Etappe gilt: keine Admin-UI im
   Webseitenprojekt.
7. Eine **zweite Datenbank für Webseitencontent** ist nur als **CMS-Light gemäß Abschnitt 2b**
   zulässig – ausschließlich für redaktionelle Inhalte und nur nach beauftragter Etappe.
   **Keine zweite Produktdatenbank**, keine Vermischung mit Produktdaten.
   Solange keine CMS-Light-Etappe beauftragt ist, bleibt Webseitencontent codebasiert über i18n.

---

## 4. Internationalisierung (i18n)

1. **Pflicht:** Alle sichtbaren UI-Strings laufen über `react-i18next` (`useTranslation`).
2. **Keine** hardcoded deutschen oder englischen Strings in JSX/TSX.
3. Übersetzungen liegen unter `src/i18n/locales/{de,en}/<namespace>.json`.
4. Keys sind sprechend, hierarchisch und stabil. Keine UI-Texte in Keys mischen.
5. `de` und `en` müssen denselben Key-Baum haben. Fehlende Keys sind ein Fehler.
6. Vor Abschluss jeder Änderung mit UI-Bezug: `npm run i18n:check` muss grün sein.

---

## 5. Design-System & UI

1. **Keine** direkten Farbklassen wie `text-white`, `bg-black`, `text-[#123456]` in Komponenten.
2. Immer **semantische Tokens** aus `src/index.css` und `tailwind.config.ts` verwenden
   (`bg-background`, `text-foreground`, `text-primary`, `bg-muted`, …).
3. Alle Farben in **HSL** definieren.
4. Neue Farben/Schatten/Gradienten zuerst als Tokens in `index.css` + `tailwind.config.ts` anlegen,
   dann in Komponenten verwenden.
5. shadcn/ui-Komponenten werden über Varianten erweitert, nicht durch Inline-Styles übersteuert.
6. Light- und Dark-Mode-Tauglichkeit ist Pflicht (auch wenn aktuell nur ein Modus aktiv ist).
7. Bilder primär aus `src/assets` per ES6-Import. `public/` nur für CSS/HTML/Meta-Referenzen.
8. Responsives Verhalten ist Pflicht (mobile first, `sm` / `md` / `lg` / `xl` sauber bedienen).

---

## 6. SEO & Accessibility

1. Pro Seite genau **ein** `<h1>`.
2. Title `<60` Zeichen mit Hauptkeyword, Meta-Description `<160` Zeichen.
3. Semantisches HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).
4. Alle Bilder mit sinnvollem `alt`-Text. Dekorative Bilder mit `alt=""`.
5. Lazy Loading für nicht-kritische Bilder.
6. Canonical Tags und korrekt gesetzter `lang`-Attribut über `useDocumentLang`.
7. Tastatur-Bedienbarkeit und ausreichender Farbkontrast für interaktive Elemente.

---

## 7. Sicherheit

1. **Keine** Secrets, API-Keys oder personenbezogene Daten ins Repo committen.
2. Im Frontend dürfen **nur** publishable Keys (`anon` / `publishable`) vorhanden sein.
3. Rollen, Rechte, Schreiblogik gehören **nicht** in dieses Projekt.
4. Auth-Status **nicht** über `localStorage` / `sessionStorage` als Wahrheit verwenden.
5. Externe Inhalte (Bilder, iframes) immer mit Bedacht einbinden, keine Mixed-Content-Quellen.

---

## 8. Qualität, Tests, Build

1. Vor Abschluss einer Änderung müssen folgende Befehle grün sein:
   - `npm run i18n:check`
   - `npm run build`
2. Keine Konsolen-Errors im laufenden Preview hinterlassen.
3. TypeScript-Fehler werden behoben, nicht durch `any` oder `@ts-ignore` versteckt.
4. Keine ungenutzten Imports, keine toten Dateien.
5. Bei größeren Änderungen `docs/migration-log.md` kurz ergänzen
   (Etappenname, was geändert, was bewusst nicht geändert).

---

## 9. Arbeitsweise der KI in diesem Projekt

1. **Erst lesen, dann ändern.** Vor jeder Änderung relevante Dateien tatsächlich öffnen.
2. **Nur das ändern, was angefragt wurde.** Keine ungefragten Refactorings, kein Scope-Creep.
3. UI-Änderungen bleiben in Frontend-/Präsentationscode, sofern nicht explizit anders gewünscht.
4. Bei mehrdeutigen oder breiten Anfragen **erst Rückfrage** stellen, dann umsetzen.
5. Bestehende Strukturen (Feature-Ordner, i18n-Namespaces, Routing-Konvention) respektieren.
6. **Keine** Webseitenänderung erzeugen, wenn die Aufgabe rein technisch/infrastrukturell ist
   (z. B. read-only Anbindung, Doku, Cleanup).
7. Antworten und Erklärungen in der Sprache des Users (Deutsch), Code-/Dateiinhalte bleiben EN-neutral.
8. Produktnamen wie *Lovable Cloud* und *Supabase* bleiben in englischer Schreibweise.

---

## 10. Explizite "Don'ts" (No-Go-Liste)

- ❌ Lovable Cloud im Webseitenprojekt für **andere Zwecke als CMS-Light** nutzen.
- ❌ Eine **eigene Produktdatenbank** im Webseitenprojekt anlegen (Produktdaten kommen
  ausschließlich aus der externen, read-only angebundenen Produktdatenbank
  `tkscpnwbkjmqopnddxle`).
- ❌ **Produktdaten in CMS-Light kopieren, spiegeln oder ergänzen.**
- ❌ **CMS-Light-Schreibrechte für `anon`** ohne separate Sicherheitsentscheidung.
- ❌ **Admin-UI** ohne separate Pilot-Etappe.
- ❌ **Navigation-aus-DB** ohne separate Architekturentscheidung.
- ❌ **Vermischung von Produktdaten-Client (`src/lib/supabase/client.ts`) und CMS-Light-Client
  (`src/integrations/supabase/client.ts`).** Beide Clients sind Pflicht und strikt getrennt.
- ❌ **Generische `VITE_SUPABASE_*` für die Produktdatenbank** verwenden – diese gehören zur
  internen CMS-Light/Lovable Cloud.
- ❌ Schreiboperationen (`insert`/`update`/`delete`/`upsert`/`rpc(write)`) gegen die
  **Produktdatenbank**.
- ❌ `service_role`-Key im Frontend.
- ❌ Erfinden eigener Tabellen, Views, Spalten, Enums oder Policies in der **Produktdatenbank**.
- ❌ Eigene Storage-Pfad-/Bucket-Heuristiken für Produktassets statt der gelieferten
  `public_url`-Felder.
- ❌ Hardcoded UI-Strings statt i18n.
- ❌ Direkte Farbwerte in Komponenten statt Design-Tokens.
- ❌ Fachliche Klassifikationen (Präfix-Logik, Status-Mapping) im Frontend hardcoden.
- ❌ Mega-Komponenten / cross-Feature-Imports / zirkuläre Abhängigkeiten.
- ❌ `npm run build` oder `npm run i18n:check` mit Fehlern hinterlassen.

---

## 11. Kurzform für das Custom-Rules-Feld (Copy & Paste)

> Falls das Custom-Rules-Feld eine kompakte Variante verlangt, kann dieser Block als
> Minimal-Set hinterlegt werden. Die ausführliche Fassung bleibt in dieser Datei.

```
- Stack: React 18 + Vite + TS + Tailwind + shadcn/ui + react-i18next.
- Zwei strikt getrennte Datenquellen mit zwei strikt getrennten Clients:
  1) Externe Produktdatenbank (Projekt tkscpnwbkjmqopnddxle), führend für Katalog/PDP/Bilder/
     Dokumente/Downloads/Specs – read-only. Client: src/lib/supabase/client.ts.
     Env: VITE_PRODUCT_SUPABASE_URL / VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY (Fallback
     tkscpnwbkjmqopnddxle).
  2) Interne CMS-Light / Lovable Cloud (Projekt uvkubrrljyzfvbvejepl), nur redaktionelle
     Webseiteninhalte. Client: src/integrations/supabase/client.ts.
     Env: generische VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
- Produktdatenbank: keine insert/update/delete/upsert/rpc(write). Niemals service_role im Frontend.
  Generische VITE_SUPABASE_* gehören zur CMS-Light-Cloud und dürfen NICHT für Produktdaten
  verwendet werden. Genau ein Produktdaten-Client und genau ein CMS-Light-Client, nicht vermischbar.
  Vor jedem select() Guard isSupabaseConfigured(). Keine eigenen Tabellen/Views/Policies in der
  Produktdatenbank.
- Führende Produktquellen: freigegebene Auslieferungsschicht (api_v1_catalog_manifest,
  api_v1_products_catalog, product_filter_options_view, rpc_get_catalog_context,
  rpc_get_product_listing, rpc_get_product_pdp, rpc_get_product_specs_display). Bilder/Dokumente
  bevorzugt über public_url. Keine eigene Storage-Pfad-Erfindung. Interne Tabellen/Views nur,
  wenn ausdrücklich Teil der freigegebenen Auslieferungsschicht.
- artikel_nr ist fachlicher Schlüssel. Präfixe (PA/PP/PV) sind Kontext, KEINE Frontend-Logik.
- CMS-Light: nur redaktioneller Content (Hero, Answer-First, Karten, Bilder). Keine Produktdaten
  in CMS-Light kopieren. Keine anon-Schreibrechte. Keine Navigation-aus-DB in Phase 1.
  Keine Migration aller i18n-Texte in die DB; i18n-JSON bleibt Fallback. Keine Admin-UI ohne
  eigene Etappe.
- pageRegistry.ts ist die statische Seitenidentität: page_key stabil, route_path veränderlich,
  page_type aus Taxonomie T01–T21.
- i18n-Pflicht: keine hardcoded UI-Strings. de und en haben denselben Key-Baum.
- Design-Tokens aus index.css/tailwind.config.ts. Keine direkten Farbklassen, alle Farben HSL.
- Feature-Struktur unter src/features/<feature>/. Routing dezentral. Keine zirkulären Feature-Imports.
- Vor Abschluss: npm run i18n:check und npm run build müssen grün sein.
- Nur das ändern, was angefragt wurde. Bei breiten Anfragen erst Rückfrage stellen.
- Antworten auf Deutsch, Produktnamen (Lovable Cloud, Supabase) in englischer Schreibweise.
```

---

_Stand: gepflegt parallel zu `docs/migration-log.md`. Änderungen an dieser Datei sollten dort kurz erwähnt werden._
