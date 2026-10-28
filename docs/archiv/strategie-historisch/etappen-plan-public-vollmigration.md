# Etappen-Plan: Public-Vollmigration (CMS-Light → DB-getrieben)

**Erstellt:** 2026-05-15  
**Status:** Vorschlag, wartet auf Freigabe pro Etappe  
**Pfad:** A — sauber, templateweise (gemäß Core-Regel „Vollständige Umstellung erfolgt templateweise")

---

## Ausgangslage

- **38 öffentliche Seiten** nutzen aktuell `CmsPageLayout` (Hero aus DB) + hartkodierten Body (i18n-Strings, ~7.944 Zeilen JSX).
- **DB-Inhalt für Bodies:** überwiegend leer. Die meisten Seiten haben in `cms_sections` nur `hero` + 1× `placeholder/content`. Spezifische Card-/Feature-Inhalte fehlen vollständig in der DB.
- **Spiegel-Regel:** Renderer muss über `cms.sections` iterieren, kein Hardcoding der Reihenfolge im Code.
- **Public-Schutz:** Kein Public-Inhaltsverlust während der Migration.

## Ziel-Architektur

```
Public-Seite (z. B. AlarmanlagenkopplungPage.tsx)
└── CmsPageLayout              (Hero aus DB, schon vorhanden)
    └── <CmsBodyRenderer pageKey="..." />   ← NEU
        └── iteriert cms.sections (sortiert nach sort_order)
            └── pro section_type → spezialisierte Komponente
                ├── content_v1        → Label/Title/Text-Block
                ├── cards_v1          → Card-Grid mit Items
                ├── feature_grid_v1   → Icon+Title+Desc-Grid
                ├── product_scroller_v1 → Horizontaler Produkt-Scroller
                ├── download_list_v1  → Datei-Download-Liste
                ├── contact_block_v1  → Kontakt-Karte mit CTAs
                ├── stats_v1          → Zahlen-Bänder
                └── cta_v1            → Call-to-Action-Banner
```

`<CmsBodyRenderer>` rendert **nichts**, wenn keine Sections vorhanden sind → Page-Komponente kann i18n-Fallback-JSX in einer `else`-Branch behalten. Damit bleibt Public während der Migration immer befüllt.

## Etappen-Struktur (jede Etappe = ein Tool-Call-Block)

### Etappe P-0 — Schema & Renderer-Skelett (klein, risikoarm)
- Neue Datei: `src/features/cms/components/CmsBodyRenderer.tsx`
- Neue Datei: `src/features/cms/components/sections/` (Ordner mit Stub-Komponenten pro Typ)
- Doku: `docs/02-architecture/section-typen-katalog.md` (Schema je `section_type`: welche `field_key`s in welcher Form)
- **Keine** DB-Migration, **keine** Page-Refactors. Nur Infrastruktur.
- **Verifikation:** Build grün, kein Public-Diff.

### Etappe P-1 — Pilot-Template „Gebäudemanagement" (6 Seiten)
Seiten: `alarmanlagenkopplung`, `digital-signage`, `digitale-namensanzeige`, `gebaeudemanagement`, `reservieren-buchen`, `schraenke-behaelter`
- Section-Typen: `content_v1`, `cards_v1` (für `useCases.items` und `benefits.items`), `product_scroller_v1`
- DB-Seeding via Migration: i18n-Strings → `cms_sections` + `cms_section_fields` (idempotent, `ON CONFLICT DO NOTHING`)
- Renderer-Komponenten implementieren
- 6 Page-Files refactoren: Body-JSX entfernen, `<CmsBodyRenderer/>` einsetzen, i18n-Fallback bleibt für Notfall
- **Verifikation:** Pro Seite 1:1 visueller Vergleich Public ↔ Pre-Migration

### Etappe P-2 — Eingangssysteme (8 Seiten)
Seiten: `beratung`, `design`, `funktionalitaet`, `integrationsformen`, `material`, `referenzen`, `standards`, `system`
- Erwartete neue Typen: ggf. `feature_grid_v1`
- Sonst Ablauf wie P-1

### Etappe P-3 — Anwendungen-Übersichten (5 Seiten)
Seiten: `bildungseinrichtungen`, `gesundheitseinrichtungen`, `objektloesungen`, `oeffentliche-hand`, `referenzprojekte`

### Etappe P-4 — Service (5 Seiten)
Seiten: `downloads`, `ersatzteile`, `online-produktkatalog`, `service` (hub), `technischer-support`
- Erwartete neue Typen: `download_list_v1`, `contact_block_v1`

### Etappe P-5 — Gebäudekommunikation (5 Seiten)
Seiten: `briefkastenanlagen`, `grossanlagen`, `systemloesungen`, `tuerkommunikation`, `tuersprechanlagen`
- Größte und reichhaltigste Seiten — ggf. weitere Typen nötig

### Etappe P-6 — Zutrittskontrolle Übersichten (5 Seiten)
Seiten: `fahrstuhlsteuerung`, `mobiler-zutritt`, `tueren-tore`, `zufahrten-parkplaetze`, `zutrittskontrolle` (hub)

### Etappe P-7 — Signage + Wissen (3 Seiten)
Seiten: `beschilderung`, `signage` (hub), `wissen.akademie`

### Etappe P-8 — Aufräumen
- i18n-Fallbacks aus Page-Files entfernen, sobald DB-Inhalte stabil
- Tote i18n-Keys aus `*.json` löschen
- Dokumentations-Update: `cms-light-source-of-truth.md` neu, Status „vollmigriert"

## Spielregeln pro Etappe (verbindlich)
1. **Idempotente Migration:** Inserts mit `ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING`. Re-Run muss safe sein.
2. **i18n-Fallback bleibt** in der Page bis P-8.
3. **Pro Seite ein 1:1-Vergleich** vor/nach (Headline, Anzahl Cards, Reihenfolge, Bilder).
4. **Keine** Routen-, Navigations- oder Footer-Änderungen.
5. **Nur** `rpc_admin_*` für Admin-Schreibwege — Seeder läuft als Migration (DDL-Pfad), nicht aus Frontend.
6. **Stop & Report** bei jeder Abweichung von DB-Schema oder fehlenden Übersetzungen.

## Was NICHT Teil dieses Plans ist
- Produktdaten / PDP / Produktkatalog (`src/lib/supabase/client.ts`) — bleibt unangetastet.
- Persona-Seiten, Legal, Karriere, Kontakt, Home — eigene Templates, separater Plan.
- Admin-UI — keine Änderungen, bestehende RPCs reichen.
