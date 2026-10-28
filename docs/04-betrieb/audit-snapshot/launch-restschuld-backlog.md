# Launch-Restschuld-Backlog

Stand: 2026-06-04. Diese Datei klassifiziert die verbleibenden Befunde **neu** nach der Priorität „CMS-Steuerbarkeit / Übergabefähigkeit", nicht mehr nur nach „Launch ja/nein".

**Wichtig:** Launch (Public-Release) ist technisch möglich. Diese Liste beschreibt, was zwischen „Public live" und „CMS sauber übergebbar" noch zu tun ist. Login ist hier **kein Punkt** und ausdrücklich geparkt.

## A — Muss vor CMS-Abschluss weg (redaktioneller Inhalt nicht im CMS pflegbar)

| # | Befund | Quelle | Menge | Begründung | Aufwand |
|---|--------|--------|------:|------------|---------|
| A1 | `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` — 28 Pages, 73 Sections, prominent: `snipdoo-ip` (12), `home.start` (3), `karriere.root` (3), `kontakt.root` (3), `kontakt-bcm.root` (3), `referenzprojekte` (?), Detailseiten Gebäudemanagement / Anwendungen | `page-renderer-coverage.json` | 73 | Redaktion legt im Admin Sections an, Public ignoriert sie still. Das ist der Kern des „Schein-CMS"-Eindrucks. | 5–8 PT (Welle 1: triviale → GenericCmsPage; Welle 2: Custom-Pages mit Sonderlayout) |
| A2 | `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK` | `globaler-spiegel-audit.json` | 6 | Inhalte sind sichtbar, aber im Admin nicht editierbar. Direkter Spiegelregel-Bruch. | 2 PT |
| A3 | Pages mit hartcodierten Headlines/Buttons, die im Admin **kein** Gegenstück haben (Heuristik): `TuersprechanlagenPage`, `CategoryListPage`, `ProduktHubPage`, `TuerkommunikationHubPage` | `hartcode-steuerbarkeit-inventar.json` (Prio A) | 4–5 | Hub-/Kategorie-Seiten mit eigener Linkmap, die nicht über CMS-Karten gepflegt werden. | 2–3 PT |
| A4 | Snipdoo-IP Tertiärbutton „Schulung/Demo buchen" | manuell, Batch 6 | 1 | Sichtbarkeitsverlust eines fachlichen Buttons. Eigener Block `schulung_teaser` oder `cta_tertiary_*` nötig. | 1 PT |

## B — Sollte vor Übergabe weg (Kopieren/Verschieben/Duplizieren im Admin nicht sicher)

| # | Befund | Quelle | Menge | Begründung | Aufwand |
|---|--------|--------|------:|------------|---------|
| B1 | `copy_move_risiko` — Custom-Page-Komponenten, die DB-Sections nicht über `renderPageSectionByType` rendern | `hartcode-steuerbarkeit-inventar.json` | 28 | Würde der Admin diese Page duplizieren, ginge der Render-Pfad verloren. | überlappt mit A1 |
| B2 | `CONTAINER_HEADER_WHITELIST_FEHLT` | `globaler-spiegel-audit.json` | 12 | Container-Header sichtbar, aber im Admin nicht editierbar. Spiegelregel-Lücke. | 0.5 PT (Whitelist-Batch) |
| B3 | Public-Blocks gelb (medium 32 + restschuld 33) | `public-blocks-ignorieren-admin-visibility.json` | 65 | Admin-Sichtbarkeitsschalter wirken nicht 1:1 auf Inline-Layoutblöcke (Hero-Eyebrow, Persona-Tabs). | 4–6 PT |
| B4 | `PERSONA_FALLBACK_RENDERER_AKTIV` | `globaler-spiegel-audit.json` | 2 | Lokaler Fallback-Renderer, Sub-Gate hält Drift fern, aber Fallback noch im Code. | 1 PT |
| B5 | `CODE_SONDERRENDERER` | `globaler-spiegel-audit.json` | 1 | Eigener JSX-Pfad statt Standard. | 0.5 PT |

## C — Darf bleiben (reines Layout, Sonderseite, Service-Logik)

| # | Befund | Begründung |
|---|--------|------------|
| C1 | `KontaktPage`, `KontaktBcmPage`, `ServiceportalPage`, `RegistrierenPage`, `PasswortVergessenPage`, `MerklistePage` | Registriert in `sonderseiten-register.json`. Funktion = Formular/State. Inhaltstexte sukzessive in CMS heben, Mechanik bleibt Code. |
| C2 | `ProductDetailPage`, Produktkatalog-Seiten (Tuerkommunikation PDP) | Eigene Produkt-DB (`src/lib/supabase/client.ts`). Außerhalb des CMS-Scope. |
| C3 | `ReferenzprojektDetailPage` (dynamische Slugs) | Template über Slug, kein redaktionelles Hardcoding. |
| C4 | Layout-Komponenten (`HeroSection`, `StatsSection`, `PersonaSection`, `Footer`, `MainNavigation`, `CmsBodyRenderer`, `Teaser2ColV1`) | Pure Layout/Render-Logik, keine Inhalte. |
| C5 | `CONTAINER_LEER` (2) | Container ohne Kinder. Public rendert nichts, Restschuld harmlos. |
| C6 | `PUNKT_KEY_IN_INAKTIVER_CONTAINER` (20) | Datenkeime in deaktivierten Containern. Keine Public-Wirkung. |

## D — Entscheidung Thomas

| # | Frage | Optionen |
|---|-------|----------|
| D1 | Snipdoo-IP Tertiärbutton („Schulung/Demo buchen") | (a) neuer Block `schulung_teaser`, (b) `cta_v1`-Vertrag um optionalen Tertiärbutton erweitern, (c) bewusst weglassen — Akademie ist über Hauptnavigation/Footer erreichbar |
| D2 | Hub-Seiten `produkte.hub` / `produkte.tuerkommunikation` / Kategorie-Linkmaps | (a) auf `catalog_filter_grid_v1` mit Karten aus DB migrieren, (b) als Sonderseite registrieren und Inhalte aus Produkt-DB ziehen |
| D3 | Persona-Fallback-Renderer (2 Pages) | (a) Fallback streichen sobald DB-Pfad bewiesen, (b) bewusst als „Notbremse" behalten |
| D4 | 28 Custom-Pages mit aktiven, aber ignorierten DB-Sections | (a) auf `GenericCmsPage` migrieren (Reihenfolge aus DB), (b) `renderPageSectionByType`-Loop in bestehende Page einbauen, (c) Sections im Admin deaktivieren und Page bleibt Custom |

## Bewusst NICHT in dieser Liste

- Login / Auth / `user_roles` — geparkt.
- Neue `section_type`-Verträge — nur falls D1 oder D2 das zwingend erfordern.
- Migrationen, die das DB-Modell ändern.
