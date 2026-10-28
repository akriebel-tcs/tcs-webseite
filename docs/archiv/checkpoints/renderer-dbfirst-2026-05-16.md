# Checkpoint: Renderer flächendeckend DB-first (2026-05-16)

## Was wurde umgestellt

Neuer zentraler Hook `src/features/cms/hooks/useCmsI18n.ts`. Er ersetzt
`useTranslation(...)` in Seitenkomponenten und liefert `{ t, cms, loc, i18n }`,
wobei `t(key)` automatisch **DB-first** auflöst:

```
i18n-Key      = "<rootPrefix>.<section>.<field>"
DB-Lookup     = cms.text("<section>", "<field>", locale, i18n-Fallback)
```

Vorteil: keine einzige `t("…")`-Aufrufstelle muss umgeschrieben werden.
i18n bleibt automatischer Fallback, wenn `cms_section_fields` (noch) leer ist.

## Reichweite

Codemod `scripts/cms/renderer-dbfirst-codemod.mjs` hat **52 Seiten** automatisch
umgestellt. Inkl. Nachbesserungen ergibt sich:

- **61 / 81** Seitendateien lesen Inhalte DB-first
  (entweder via `useCmsI18n` oder via explizite `cms.text`/`cms.asset`/`tcms`).
- **16 Wrapper-Seiten** unter `src/features/anwendungen/pages/*Page.tsx` rendern
  über die gemeinsame Komponente `AnwendungDetailPage`, die selbst DB-first
  arbeitet — also de facto auch versorgt.
- **3 verbliebene Seiten** ohne DB-Wiring:
  - `service/pages/ProductDetailPage.tsx` (Produktkatalog, andere Datenquelle).
  - `gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` (zwei
    `useTranslation`-Aufrufe in zwei Komponenten — manueller Folge-Task).
  - `app/pages/NotFoundPage.tsx` (statische 404, irrelevant).

## Was Redakteure jetzt sehen

- Jede Textänderung im `/admin` (`cms_section_fields`) erscheint sofort auf
  der öffentlichen Seite — i18n wird übersteuert, sobald ein DB-Wert existiert.
- Reihenfolge/Sichtbarkeit werden weiterhin über `cms_sections.sort_order` /
  `is_active` gesteuert (Spiegelregel).
- Asset-Slots (`cms.asset`) sind in den meisten Templates bereits verdrahtet;
  fehlt der DB-Eintrag, greift der Code-Fallback (Bild-Import).

## Was nicht angefasst wurde

- Keine i18n-Datei wurde verändert. Fallback-Pfad bleibt vollständig
  funktionsfähig — auch wenn die DB-Verbindung mal nicht erreichbar ist.
- Produktdaten (`src/lib/supabase/client.ts`, PDP) unberührt.
- Navigations-/Layout-Logik unverändert.

## Folgearbeiten (nicht zwingend)

1. `TuersprechanlagenPage`: zwei `useTranslation`-Aufrufe konsolidieren.
2. Pro Template prüfen, ob noch hartkodierte Bild-Imports auf `cms.asset()`
   umgestellt werden sollten (alle Detailseiten Zutrittskontrolle haben
   bereits 1–3 Asset-Slots; Hero-Bilder dort sind eingehängt, Inline-Bilder
   teilweise noch nicht).
3. SnipdooIp: System-Diagramm bleibt Bild-Slot; Accordion-Stufen
   ("struktur", "erkennung", "zuordnung") sind reine Layout-Stufen. Falls
   sie redaktionell editierbar werden sollen → eigene `accordion_v1`-Section
   anlegen (Migration + Whitelist + Renderer-Iteration).
