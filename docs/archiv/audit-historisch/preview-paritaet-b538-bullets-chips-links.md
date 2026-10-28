# Preview-Paritätsfix B-538 — Bulletpoints, Chips, Links

Stand 2026-06-03. Kein neuer Sprint, reiner UI-Fix im seitenlokalen
`ProduktScroller` auf `/gebaeudekommunikation/tuersprechanlagen`.

## Befund vor Fix (Preview)

- B-538 `bullets.0 = "Test"` und `chips.0 = "Test"` werden inzwischen
  ausgespielt — Spezialrenderer ist also aktiv.
- Bulletpoints wurden aber optisch als bordere Tags gerendert
  (Border + Pille), nicht als echte Liste mit Anstrich.
- Chips/Merkmale waren bereits korrekt als graue Pillen sichtbar.
- Links: `kurz-id`-Werte ohne aufgelöste URL würden als rohes `href="P-203"`
  ausgegeben werden (gebrochener Link).

## Fix (UI-only, keine Migration, keine neuen Felder)

`src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`:

1. **Bulletpoints** als echte Liste mit Punkt-Anstrich:
   `ul.list-disc.pl-5.space-y-1.text-sm.text-muted-foreground.marker:text-primary`
   mit normalen `li`. Keine Border-/Pill-/Chip-Optik mehr.
   Der Punkt liefert der Renderer (`list-disc`), Redaktion tippt nichts ein.
2. **Chips/Merkmale** bleiben unverändert als graue Pillen (`bg-muted`,
   `rounded-full`, `text-[11px]`).
3. **Links** zählen erst dann als aktiv, wenn:
   - `link_N_enabled` an (über `vis.linksVisible`),
   - Label vorhanden,
   - Ziel vorhanden **und** öffentlich auflösbar
     (`/…`, `http(s)://…`, `mailto:`, `tel:`, `#…`).
   Rohe Kurz-IDs wie `P-203`/`B-538` ohne aufgelöste URL werden öffentlich
   **nicht** gerendert. Damit gibt es weder `href="#"` noch gebrochene Links.
   Der Admin markiert solche Ziele weiterhin als „Kurz-ID-Ziel noch nicht
   auflösbar".

## Andere card_v1-Renderer (visuelle Semantik)

- `CardsSectionV1` und `ProductScrollerV1` rendern Bulletpoints bereits
  als Liste mit Punkt-Anstrich (`<span class="w-1 h-1 rounded-full bg-primary">`
  als Bullet) und Chips als graue Pillen. Keine Änderung nötig.

## Akzeptanz Preview

- B-538 Bulletpoint „Test" sichtbar als echter Bulletpoint mit Punkt.
- B-538 Chip „Test" sichtbar als graue Pille.
- Link 1 bleibt unsichtbar, solange `link_1_href` leer **oder** ein nicht
  auflösbares Kurz-ID-Ziel ist. Status im Admin: `0 aktiv · 3 unvollständig`
  bleibt korrekt.

## Scope

- Nur Renderer-/Klassenänderung.
- Keine neuen Felder, keine Migration, keine Whitelist-Erweiterung.
- Kein Eingriff in Hero/Teaser/CTA/FAQ/Content, keine Navigation/Footer,
  keine Produktdatenbank.
