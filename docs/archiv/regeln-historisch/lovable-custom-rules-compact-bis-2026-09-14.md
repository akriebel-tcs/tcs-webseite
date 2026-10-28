# ARCHIV — Projektregeln (Kompakt), Fassung bis 2026-09-14

> **Historie. Nicht mehr maßgeblich.**
>
> - Ursprungspfad: `docs/lovable-custom-rules-compact.md`
> - Archiviert am: 2026-09-14 (Etappe 1 CMS-Light-Reparatur)
> - Inhaltlicher Stand dieser Fassung: bis 2026-09-14
> - Nachfolger (aktiv): `docs/lovable-custom-rules-compact.md (überarbeitet) sowie docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md (führende Regelquelle)`
>
> Die hier genannten Prüfwerte sind **historische Messwerte** und
> **keine aktuellen grünen Gates**. Der Inhalt unterhalb ist
> unverändert erhalten.
>
> Überholt sind insbesondere: „Websitecontent codebasiert", „CMS-Light
> liefert öffentlich keine Inhalte", „Navigation bleibt Code", „keine
> Admin-UI" und die alte Produktbasis-ID `tkscpnwbkjmqopnddxle`.

---

# TCS Unternehmenswebseite – Projektregeln (Kompakt)

> Kompaktversion. Ausführliche Fassung: `docs/lovable-custom-rules.md`.

## Projektkontext
- Stack: React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + shadcn/ui + react-i18next.
- Sprachen: Deutsch (Default) und Englisch, vollständig über i18n-Keys.
- Webseitencontent (Texte, Hero-Bilder, Landingpages, Personas) ist heute codebasiert (i18n-JSON + lokale Assets in src/assets bzw. public/). CMS-Light ist vorbereitet, liefert aber öffentlich noch keine Inhalte.
- Strukturierte Fachdaten (Produktkatalog, PDP, Bilder, Dokumente, Downloads, Specs) kommen aus einer **externen Produktdatenbank** und werden read-only gelesen.
- Das Projekt war ursprünglich Frontend-only. Inzwischen existiert eine eigene **interne Lovable Cloud / Supabase-Instanz** (CMS-Light, Projekt-ID `uvkubrrljyzfvbvejepl`), ausschließlich für redaktionelle Webseiteninhalte. Die externe Produktdatenbank (`tkscpnwbkjmqopnddxle`) bleibt davon strikt getrennt und read-only.

## Datenbanken – harte Regeln

Es gibt zwei strikt getrennte Datenquellen mit zwei strikt getrennten Clients:

### Externe Produktdatenbank (read-only)
1. Projekt-ID: `tkscpnwbkjmqopnddxle`. Führend für Produktkatalog/PDP/Bilder/Dokumente/Downloads/Specs.
2. Verboten im Frontend: insert, update, delete, upsert, schreibende rpc(...).
3. Niemals service_role im Frontend.
4. Keine Produktdaten in CMS-Light kopieren oder spiegeln.
5. Verbindung ausschließlich über:
   - VITE_PRODUCT_SUPABASE_URL
   - VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY
   - Fallback (publishable, dokumentiert): externe Produkt-DB tkscpnwbkjmqopnddxle.
   - Generische VITE_SUPABASE_* gehören zur internen CMS-Light-Cloud und dürfen NICHT für die Produktdatenbank verwendet werden.
6. Genau **ein** Produktdatenbank-Client: `src/lib/supabase/client.ts`. Keine weiteren `createClient(...)`-Aufrufe gegen die Produktdatenbank.
7. Produktdaten-Client läuft ohne Auth-State: persistSession: false, autoRefreshToken: false, detectSessionInUrl: false.
8. Vor jedem `supabase.from(...).select(...)` Guard `isSupabaseConfigured()`. Listen-Funktionen geben bei fehlender Konfiguration `[]` zurück, Einzelabfragen `null`.
9. Keine eigenen Tabellen, Views, Spalten, Enums, Policies in der Produktdatenbank erfinden.

### Interne CMS-Light / Lovable Cloud
1. Projekt-ID: `uvkubrrljyzfvbvejepl`. Aktiviert seit Etappe `cms-light-pilot-schema-1`.
2. Ausschließlich für **redaktionelle Webseiteninhalte** (Hero-Texte, Answer-First-Blöcke, redaktionelle Bilder, Karten-/Blockinhalte, CMS-Pilotseiten).
3. Modellrahmen: `cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`. (`cms_navigation_nodes` nicht in Phase 1.)
4. Niemals Produktdaten/Artikelnummern/PDP/Downloads/Specs im CMS abbilden.
5. Genau **ein** CMS-Light-Client: `src/integrations/supabase/client.ts`. Env: generische VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
6. **Keine Schreibrechte für anon.** Keine pauschalen Schreibrechte für `authenticated`. Schreibwege erst mit Editor-/Auth-Etappe.
7. Keine Navigation-aus-DB in Phase 1. Navigation bleibt Code (`src/navigation/*`).
8. Keine Migration aller i18n-Texte ins CMS; i18n-JSON bleibt Fallback.
9. Keine Admin-UI / kein Editor ohne eigene Etappe.

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
6. Keine Admin-UI / kein Editor / kein Redakteur-Login ohne eigene Etappe.
7. Keine zweite Produktdatenbank im Webseitenprojekt. CMS-Light ist die einzige zulässige interne Datenbank und bleibt redaktionell.

## Internationalisierung (i18n)
1. Alle sichtbaren UI-Strings über react-i18next (useTranslation). Keine hardcoded UI-Strings.
2. Übersetzungen unter src/i18n/locales/{de,en}/<namespace>.json.
3. Keys sprechend, hierarchisch, stabil. de und en mit identischem Key-Baum.
4. Vor Abschluss jeder Änderung mit UI-Bezug: `npm run i18n:check` muss grün sein.

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
1. Vor Abschluss grün: `npm run i18n:check` und `npm run build`.
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
- ❌ Admin-UI / Editor ohne eigene Pilot-Etappe.
- ❌ Navigation-aus-DB ohne eigene Architekturentscheidung.
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
