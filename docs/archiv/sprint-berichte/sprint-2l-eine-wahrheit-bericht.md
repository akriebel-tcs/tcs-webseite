# Sprint 2l „Eine Wahrheit" — `card_v1`-Variantenmodell & Alias-Auflösung (read-only Vertrags-/UI-Schärfung)

_Stand: 2026-05-29 — Sprint 2l Abschluss._

## Ziel

`card_v1` fachlich in **7 Varianten** modellieren, damit der Admin nicht
mehr alle optionalen Kartenfelder auf jeder Karte erwartet und die
D3/D5-Triage Basis- von Variantenfeldern unterscheidet — **ohne** DB-
Mutation, ohne Migration, ohne Seeding, ohne Whitelist-Änderung.

## Geänderte Dateien (Code, kein Public-Renderer-Verhalten)

- `src/features/cms/contract/sectionTypes.ts` — `CARD_V1_VARIANTS`
  (`image`, `thumbnail`, `icon_lucide`, `icon_image`, `download`,
  `multi_link`, `text`), Helper `detectCardVariant`,
  `CARD_V1_FIELD_ALIASES` (`headline↔title`, `eyebrow↔subtitle`,
  `beschreibung↔description`).
- `src/features/admin/lib/buildAdminFieldPlan.ts` — variantenbewusste
  Filterung „fehlende Vertragsfelder": Felder, die nicht zur erkannten
  Variante gehören, werden im Admin **nicht mehr als Lücke** angezeigt.
  Bereits gepflegte Werte bleiben sichtbar (Legacy-Tag).
- `src/features/admin/components/PageEditor.tsx` — reicht Parent-Typ
  und aktive Asset-Slots an den Feldplan-Builder durch.
- `scripts/cms/d3-d5-rest-triage.mjs` — Klassifikation nutzt das
  Variantenmodell: Basisfelder (`title`, `description`) → S1;
  Variantenfelder ohne passende Variante → S3 (nicht seeden).

## Audit-Ergebnisse (alle read-only ausgeführt)

| Audit | Ergebnis |
|---|---|
| `cms:audit:contract` | 15 OK · 7 Warn · 0 Konflikt |
| `cms:audit:contract-drift` | D1=0 · D2=2649 · D3=3502 · D4=3074 · D5=3416 · D6=184 · D7=0 · D8=0 · **D9=25** · D10=28 |
| `cms:audit:d3-d5-triage` | D3 aktiv=2004 · D5 aktiv=2000 — Klassen D3: S1 5 · S2 38 · **S3 1541** · S4 88 · S5 256 · S7 76 (S5 sinkt von 696 → 256, S3 steigt von 1101 → 1541 durch variantenbewusste Reklassifikation) |
| `cms:audit:d9` | 25 (19 `child_only_at_top_level` + 6 `top_level_only_under_parent`) |
| `cms:audit:d9-relations` | 2 distinct: `(none/top-level)→card_v1` 19 · `rich_v1→rich_v1` 6 |
| `cms:audit:renderer-fallback-inventory` | 60/80 Pages bereits DB-first (G0/G1/S1) · 19 S2 · 2 S3 · 1 P1 |

**Stabilität:** D1=0, D8=0, D9=25 unverändert. D3/D5 unverändert in Summe; die
Triage-Klassifikation verschiebt sich erwartet von S5 → S3 (Variantenmodell
identifiziert Felder als „variantenspezifisch", nicht „dynamisch") — das ist
exakt das Ziel dieses Sprints. **Kein Seeding ausgelöst.**

## Akzeptanz

- `card_v1` ist fachlich in 7 Varianten modelliert ✅
- Admin erwartet nicht mehr alle optionalen Kartenfelder auf jeder Karte ✅
- Vorhandene Felder bleiben pflegbar (Legacy-Sichtbarkeit) ✅
- D3/D5-Triage unterscheidet Basisfeld-Lücken von optionalen Variantenfeldern ✅
- Kein pauschales Seeding ✅
- Public-Website bleibt sichtbar unverändert (Renderer unangetastet) ✅

## Scope-Bestätigung

Keine DB-Mutation · keine Migration · keine neue RPC · keine Inhalts-/
Bild-/Feldwert-/Whitelist-/i18n-Änderung · keine Public-Renderer-/Routen-/
Navigation-/Footer-/Breadcrumb-Änderung · keine Produktdatenbank.

**Empfohlene nächste Etappe:** Sprint 2m — Basis-Seedings (`cards_v1`-Header,
`hero_v1 · cta_*`, `content_v1 · label` — ~200 Sections), ausschließlich
Vertragsbasisfelder, nach Variantenmodell.
