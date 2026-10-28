# Sprint-Bericht: `card_v1` Runtime-Vertrag (Phase 1)

**Datum:** 2026-06-03
**Auslöser:** wiederkehrende Inselbildung — Admin, DB und Renderer
laufen pro Baustein auseinander, statt eine gemeinsame Wahrheit zu
teilen. Konkret sichtbar an B-538.
**Scope:** ausschließlich `card_v1`. Andere Bausteine (hero, teaser,
cta, faq, content) bleiben unverändert und kommen in eigenen Sprints.

## Was gemacht wurde

1. **Vertragsdatei angelegt:**
   `src/features/cms/contract/runtime/card_v1.ts`
   - re-exportiert die existierende Container-Matrix und den Resolver
     unter einem zentralen Modulpfad,
   - exportiert `CARD_V1_FIELD_INVENTORY` (statische Feldliste),
   - markiert Vertragsversion `1.0.0`.

2. **E2E-Skript (read-only):**
   `scripts/cms/e2e-vertrag.mjs`
   - liest DB (`cms_sections`, `cms_section_fields`, `cms_assets`),
   - berechnet pro Pflichtkarte den Vertragsstatus jedes Feldes,
   - ruft Public-HTML der Preview-Route ab und prüft, ob `active`-Felder
     dort tatsächlich erscheinen,
   - meldet ehrlich `skipped`, wenn nur die SPA-Shell zurückkommt,
   - Bericht: `scripts/cms/output/e2e-vertrag-latest.json`,
   - Pflichtkarte für Phase 1: **B-538** (fest verdrahtet).

3. **Doku:** `docs/04-betrieb/runtime-vertrag-card-v1.md` —
   Erweiterungspfad, Konsumentenliste, Status.

## Was bewusst NICHT gemacht wurde

- Kein Service-Role-Key, kein schreibender CI-Test gegen
  Redaktionsinhalte (Wunsch explizit). Schreibende E2E-Tests folgen
  später nur über separate Testkarten + Rollback.
- Keine dynamische Auswahl aller Karten — B-538 fest, weil dort der
  konkrete Bruch sichtbar war. Erweiterung auf weitere Karten erst,
  wenn der Referenzbeweis stabil grün ist (Phase 1b).
- Keine Vertragsdateien für andere Bausteine. Reproduziert sonst genau
  die Inselbildung, die wir gerade abbauen.
- Keine Migration. Keine Inhaltsänderung. Kein Refactor der bewährten
  Resolver-Implementierung — sie liefert die Wahrheit, jetzt nur
  hinter einer Vertragsschicht.

## Beleg (B-538)

E2E-Lauf am 2026-06-03 liefert:

```
○ skipped  B-538  gebaeudekommunikation.tuersprechanlagen/card_pak  (product_scroller_v1)
   active:      eyebrow, title, description, bullets.0, chips.0, image
   incomplete:  link_1, link_2, link_3
   • Public-HTML scheint nicht hydratisiert (SPA-Shell). Vertragsstatus
     wurde trotzdem berechnet, HTML-Verifikation übersprungen.
```

Das deckt sich exakt mit dem Admin-Bild nach „Runtime-Parität":
- `bullets.0 = "Test"` (Toggle 1) → active
- `chips.0 = "Test"` (Toggle 1) → active
- `link_1_label = "Mehr erfahren"` ohne `link_1_href` → incomplete
- Container ist `product_scroller_v1` (Parent „aussenstationen")

## Nächste Schritte (Vorschlag, nicht Teil dieses Sprints)

- **Phase 1b — Pflichtkarten erweitern:** B-539/B-540/B-2195 dazu,
  dann repräsentative Karten aus `cards_v1.grid` und `card_grid_v1`.
- **Public-HTML scharf schalten:** statt rohem `fetch` ein Preview-
  Render (Playwright/Build-HTML), damit der Negativbeweis im SPA
  möglich wird.
- **Phase 2 — weitere Bausteine:** je Sprint ein Vertrag
  (`hero_v1`, `teaser_2col_v1`, `cta_v1`, `faq_v1`, `content_v1`),
  jeweils Pflichtkomponente + Spiegel im E2E-Skript.

## Dateien

- neu: `src/features/cms/contract/runtime/card_v1.ts`
- neu: `scripts/cms/e2e-vertrag.mjs`
- neu: `docs/04-betrieb/runtime-vertrag-card-v1.md`
- neu: `docs/04-betrieb/sprint-card-v1-runtime-vertrag-phase1-bericht.md`
