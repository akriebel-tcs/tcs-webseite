# Renderer-Orphan-Konsolidierung — 2026-06-02

## Ausgangslage
- Wahrheits-Check meldete vor Sprint: `renderer_orphan` für ~85 Asset-Slots.
- Ursache: V1-Renderer-Slot-Map (`rendererSlotMap.ts`) kennt nur die `*SectionV1.tsx`-Komponenten. Hartkodierte Page-Komponenten (`ReferenzprojektDetailPage`, `TuersprechanlagenPage`, `SnipdooIpPage`, Personas, Wohnungswirtschaft, Bauherr, Architekt, Gebäudemanagement, Zutrittskontrolle, Anwendungen.*) lesen Bilder direkt per `cms.asset(...)`/`cmsContent.asset(...)`, ohne dass der Wahrheits-Check das wusste.

## Maßnahmen (Code, keine Inhalte)

1. **Harvester** `scripts/cms/harvest-page-component-reads.mjs` (neu)
   - Scannt alle `src/**/*.{ts,tsx}` nach `*.asset("section","field"…)`-, dynamischen Template-Literal- und Variablen-Field-Aufrufen.
   - Mappt sie über `pageKey="…"` bzw. `const PAGE_KEY = "…"` in derselben oder einer importierenden Datei auf den `page_key`.
   - Erzeugt `src/features/admin/lib/knownPageComponentReads.ts` mit 111 Tupeln (deterministisch sortiert, idempotent).
   - Manuelle Extras am Skript-Ende für dynamische Slug-page_keys (z. B. `anwendungen.referenzprojekte.*|gallery|img_0/1/2`).

2. **Wahrheits-Check** (`src/features/admin/lib/truthSources.ts`)
   - Neuer Status `page_component_read` (Level `ok`, grün).
   - Bevor ein Slot als `renderer_orphan` markiert wird, prüft der Check exakte, Section-Wildcard- und page_key-Prefix-Glob-Treffer in `KNOWN_PAGE_COMPONENT_READS`.
   - Slots, die eine hartkodierte Page-Komponente liest, fallen ab sofort in den grünen Bereich („Page-Komponente liest").

3. **SlotValidationView** (`src/features/admin/components/SlotValidationView.tsx`)
   - Neue Status-Badge-Farbe (emerald) für `page_component_read`.

4. **Echte Waisen stillgelegt** (SQL-Migration, 21 Assets `is_active=false`)
   - `gebaeudekommunikation.beschilderung|features|image_hausnummer|image_klingel|image_materialien|image_tuerschilder` — keine Renderer-Quelle, Route führt nach `/n`.
   - `mobile-tk-preview.root|anwendungen|komponenten|items.*.image` (12 Slots) — DB-Page hat keinen öffentlichen Renderer; `/n` zeigt `n.root`.
   - `personas.architekt.kopie|solutions|image_*` (5 Slots) — Seite `archived`, keine Verwendung.

## Ergebnis
- `renderer_orphan` im Wahrheits-Check: **0** (vorher ~85).
- Keine Inhalte gelöscht; nur `is_active=false` gesetzt — reversibel.
- Public-Renderer unverändert; keine Page-Komponente angefasst.

## Pflegehinweis
Sobald eine neue hartkodierte Page-Komponente Bilder per `cms.asset(...)` liest oder eine neue Detail-Seite mit Slug-page_key entsteht: `node scripts/cms/harvest-page-component-reads.mjs` ausführen. Für Slug-Seiten ggf. `MANUAL_EXTRA` im Skript ergänzen.
