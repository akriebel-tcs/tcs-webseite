# TCS Unternehmenswebseite – Projektregeln (Kompakt)

> **Führende Regelquelle ist das Dachdokument**
> [`03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](./03-redaktion/redaktions-uebergabe-und-prompt-regeln.md).
> Diese Datei ist nur eine technische Kurzfassung. Bei Widerspruch gilt
> das Dachdokument, danach `04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`,
> dann `.lovable/always-follow.md`.
> Aktualisiert 2026-09-14 (Etappe 1): überholte Aussagen entfernt.

## Projektkontext
- Stack: React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + shadcn/ui + react-i18next.
- Sprachen: Deutsch ist Quelle. Zielumfang EN, PL, NL, DA. **Welche
  Sprachen aktiv/öffentlich sind, steht ausschließlich im Sprachregister
  `cms_locales`** (`src/i18n/localeRegistry.ts`) — keine Sprachliste im
  Code, keine neue Whitelist.
- **Redaktionelle Inhalte (Texte, Bilder, Alt-Texte, Karten, Navigation)
  sind DB-first in CMS-Light und werden öffentlich ausgespielt.**
  i18n-JSON und Code-Assets sind nur noch **Übergangs-Fallback** und
  werden nicht ohne Auftrag entfernt.
- Zentrale Bedien-/UI-Texte liegen im vorhandenen Katalog
  `cms_ui_strings` samt Übersetzungen. Verbleibende Bedien-Texte in
  i18n-Ressourcen sind **dokumentierter Übergang bzw. Notfall-Fallback**
  — **keine eigenständig gepflegte zweite Inhaltswahrheit**. Sie werden
  nicht ohne Auftrag entfernt, aber auch nicht ausgebaut; neue
  Bedien-Texte gehören in den Katalog.
- Strukturierte Fachdaten (Produktkatalog, PDP, Bilder, Dokumente, Downloads, Specs)
  kommen aus der **Produktbasis** und werden ausschließlich **read-only** gelesen.
- Interne Lovable-Cloud-Instanz `uvkubrrljyzfvbvejepl` = CMS-Light,
  ausschließlich für redaktionelle Webseiteninhalte. Die Produktbasis
  `ncvxzkwazdemivdolpzc` bleibt strikt getrennt und read-only.


## Datenbanken – harte Regeln

Es gibt zwei strikt getrennte Datenquellen mit zwei strikt getrennten Clients:

### Produktbasis (read-only)
1. Projekt-ID: `ncvxzkwazdemivdolpzc` (TCS Product Base). Führend für Produktkatalog/PDP/Bilder/Dokumente/Downloads/Specs. Ältere IDs in Archivdokumenten sind Historie.
2. Verboten im Frontend: insert, update, delete, upsert, schreibende rpc(...).
3. Niemals service_role im Frontend.
4. Keine Produktdaten in CMS-Light kopieren oder spiegeln.
5. Verbindung ausschließlich über:
   - VITE_PRODUCT_SUPABASE_URL
   - VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY
   - Generische VITE_SUPABASE_* gehören zur internen CMS-Light-Cloud und dürfen NICHT für die Produktbasis verwendet werden.
6. Genau **ein** Produktbasis-Client: `src/lib/supabase/client.ts`. Keine weiteren `createClient(...)`-Aufrufe gegen die Produktbasis.
7. Produktdaten-Client läuft ohne Auth-State: persistSession: false, autoRefreshToken: false, detectSessionInUrl: false.
8. Vor jedem `supabase.from(...).select(...)` Guard `isSupabaseConfigured()`. Listen-Funktionen geben bei fehlender Konfiguration `[]` zurück, Einzelabfragen `null`.
9. Keine eigenen Tabellen, Views, Spalten, Enums, Policies in der Produktbasis erfinden.
10. Angeforderte Sprache unverändert an die Produkt-RPCs geben; feldweiser Rückfall requested → en → de. Keine clientseitige globale Rückstufung.

### Interne CMS-Light / Lovable Cloud
1. Projekt-ID: `uvkubrrljyzfvbvejepl`.
2. Ausschließlich für **redaktionelle Webseiteninhalte** und CMS-Steuerung.
3. Modellrahmen: `cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`, `cms_navigation_nodes`, `cms_admin_editable_fields`, `cms_ui_strings`, `cms_locales`, `cms_translation_units`.
4. Niemals Produktdaten/Artikelnummern/PDP/Downloads/Specs im CMS abbilden.
5. Genau **ein** CMS-Light-Client: `src/integrations/supabase/client.ts` (Zugriff über `src/lib/cmsSupabase/client.ts`).
6. **Keine Schreibrechte für anon.** Keine pauschalen Schreibrechte für `authenticated`. Schreiben ausschließlich über `rpc_admin_*`.
7. **Navigation ist DB-first** (`cms_navigation_nodes`); der Code bleibt nur für die technische Routing-Mechanik zuständig.
8. i18n-JSON ist Übergangs-Fallback und wird jetzt nicht entfernt.
9. `/admin` ist vorhanden und läuft als No-Login-Prototyp — **offener Sicherheitszustand**, keine Abnahme. Bestehender legitimer Zugang bleibt, neue Kontopflicht kommt erst mit eigener Etappe.


### Erlaubte Produktdatenquellen (führender Auslieferungsvertrag)
- Manifest / Listing / Filter: `api_v1_catalog_manifest`, `api_v1_products_catalog`, `product_filter_options_view`.
- Lesende RPCs: `rpc_get_catalog_context`, `rpc_get_product_listing`, `rpc_get_product_pdp`, `rpc_get_product_specs_display`.
- Bilder/Dokumente: bevorzugt über `public_url`-Felder. Keine eigene Storage-Pfad-/Bucket-Erfindung im Frontend.
- Weitere `api_v1_*`-Views oder lesende `rpc_*`-Funktionen nur, wenn ausdrücklich Teil der freigegebenen Auslieferungsschicht.
- Interne Tabellen/Views (z. B. `products_public_view`, `article_images`, `paket_komponenten`) sind kein führender Frontend-Vertrag mehr.

### Fachliche Regeln (Produktdaten)
- `artikel_nr` ist der fachliche Schlüssel.
- Präfixe wie PA/PP/PV sind Kontext, NICHT alleinige Frontend-Entscheidungslogik.
- Klassifikationen, Filter, Status, Healthchecks und Zuordnungen werden NICHT im UI hardcodiert, sondern aus den freigegebenen Views/RPCs gelesen.

## Architektur & Codeorganisation
1. Feature-orientierte Struktur unter src/features/<feature>/{pages,components,api,types}.
2. Querschnittliches Zeug unter src/components/, src/shared/, src/lib/, src/hooks/.
3. Routing dezentral pro Feature in src/features/<feature>/routes.tsx, eingehängt über src/app/routes.tsx.
4. Keine zirkulären Abhängigkeiten zwischen Features.
5. Komponenten klein und fokussiert. Lieber neue Datei als Mega-Komponente erweitern.
6. `/admin` ist bestehender Arbeitsbereich; kein neuer Editor/Login-Umbau ohne eigene Etappe.
7. Keine zweite Produktdatenbank im Webseitenprojekt. CMS-Light ist die einzige zulässige interne Datenbank und bleibt redaktionell.

## Internationalisierung (i18n)
1. Sichtbare Bedien-Texte über react-i18next bzw. den DB-Katalog `cms_ui_strings`. Keine hardcoded UI-Strings.
2. Redaktionelle Seiteninhalte kommen aus CMS-Light, nicht aus i18n-JSON.
3. Fallback-Dateien unter src/i18n/locales/<locale>/<namespace>.json; Keys sprechend, hierarchisch, stabil.
4. Verfügbare Sprachen ausschließlich aus `cms_locales` / `localeRegistry` lesen.
5. Vor Abschluss jeder Änderung mit UI-Bezug: `npm run cms:preflight` (enthält `i18n:contract`).


## Design-System & UI
1. Keine direkten Farbklassen (text-white, bg-black, text-[#…]) in Komponenten.
2. Immer semantische Tokens aus src/index.css und tailwind.config.ts (bg-background, text-foreground, …). Alle Farben in HSL.
3. Neue Farben/Schatten/Gradienten zuerst als Tokens anlegen.
4. shadcn/ui-Komponenten über Varianten erweitern, nicht inline übersteuern.
5. Light-/Dark-Mode-Tauglichkeit ist Pflicht. Responsive Pflicht (mobile first).
6. Bilder primär aus src/assets per ES6-Import. public/ nur für CSS/HTML/Meta.

## SEO & Accessibility
1. Pro Seite genau ein <h1>. Title <60 Zeichen, Meta-Description <160 Zeichen.
2. Semantisches HTML, alt-Texte, Lazy Loading, Canonical, korrekt gesetztes lang via useDocumentLang.
3. Tastatur-Bedienbarkeit, ausreichender Farbkontrast.

## Sicherheit
1. Keine Secrets/API-Keys/PII im Repo.
2. Im Frontend nur publishable Keys (anon/publishable).
3. Auth-Status NICHT über localStorage/sessionStorage als Wahrheit verwenden.
4. Externe Inhalte (Bilder, iframes) bewusst einbinden, kein Mixed Content.

## Qualität, Tests, Build
1. Vor Abschluss grün: `npm run cms:preflight` (Typprüfung → Unit-Tests → `i18n:contract` → Build, bricht beim ersten Fehler ab). Struktur-, Datenbank- und Preview-Abnahme bleiben zusätzlich verpflichtend.
2. Keine Konsolen-Errors im Preview hinterlassen. TypeScript-Fehler beheben (kein any/@ts-ignore).
3. Keine ungenutzten Imports, keine toten Dateien.
4. Bei größeren Änderungen `docs/migration-log.md` ergänzen (Etappenname, was geändert, was bewusst nicht).

## Arbeitsweise der KI
1. Erst lesen, dann ändern. Vor jeder Änderung relevante Dateien öffnen.
2. Nur das ändern, was angefragt wurde. Kein Scope-Creep.
3. UI-Änderungen bleiben in Frontend-/Präsentationscode, sofern nicht anders gewünscht.
4. Bei mehrdeutigen oder breiten Anfragen erst Rückfrage stellen.
5. Bestehende Strukturen (Feature-Ordner, i18n-Namespaces, Routing) respektieren.
6. Antworten auf Deutsch. Produktnamen (Lovable Cloud, Supabase) in englischer Schreibweise.

## Explizite Don'ts (No-Go-Liste)
- ❌ Lovable Cloud im Webseitenprojekt für andere Zwecke als CMS-Light nutzen.
- ❌ Eigene Produktdatenbank im Webseitenprojekt anlegen.
- ❌ Produktdaten in CMS-Light kopieren/spiegeln/ergänzen.
- ❌ CMS-Light-Schreibrechte für anon. Pauschale Schreibrechte für authenticated.
- ❌ Umbau von `/admin` oder Auth ohne eigene Etappe.
- ❌ Redaktionelle Inhalte oder Navigationsinhalte hartcodieren statt in CMS-Light pflegen.
- ❌ Neue Sprach-Whitelist im Code statt `cms_locales`.
- ❌ Behauptung „alles grün" ohne frische Messung.
- ❌ Vermischung von Produktdaten-Client (`src/lib/supabase/client.ts`) und CMS-Light-Client (`src/integrations/supabase/client.ts`).
- ❌ Generische VITE_SUPABASE_* für Produktdaten verwenden.
- ❌ Schreiboperationen (insert/update/delete/upsert/rpc(write)) gegen die Produktdatenbank.
- ❌ service_role-Key im Frontend.
- ❌ Erfundene Tabellen/Views/Spalten/Enums/Policies in der Produktdatenbank.
- ❌ Eigene Storage-Pfad-/Bucket-Heuristiken für Produktassets statt `public_url`.
- ❌ Hardcoded UI-Strings statt i18n.
- ❌ Direkte Farbwerte statt Design-Tokens.
- ❌ Hardcodierte Präfix-/Status-Logik im Frontend.
- ❌ Mega-Komponenten / cross-Feature-Imports / zirkuläre Abhängigkeiten.
- ❌ `npm run build` oder `npm run i18n:check` mit Fehlern hinterlassen.
