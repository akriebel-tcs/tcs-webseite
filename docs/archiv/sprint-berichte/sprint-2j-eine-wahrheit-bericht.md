# Sprint 2j — R2-Strukturmigration Restseiten (`presse`, `signage`, `zutrittskontrolle`)

_Stand: 2026-05-29_

## Kurzfassung

Sprint 2j schließt die R2-Bereinigung (`content_v1 → card_v1`) vollständig ab.
Die letzten 5 Parent-Containern auf den verbliebenen 5 Restseiten wurden
per reiner Typkorrektur `section_type='content_v1' → 'cards_v1'` migriert.
Keine Felder, Assets, Whitelist, Sortierung oder Sichtbarkeit angefasst.
Public-Layout vorher = nachher.

| Kennzahl | Sprint 2i | Sprint 2j | Δ |
|---|---:|---:|---:|
| D1 `contract_missing` | 0 | 0 | 0 |
| D8 `active_without_renderer` | 0 | 0 | 0 |
| **D9 `invalid_parent_child`** | **67** | **25** | **−42** |
| Aktive R2-Hits (`content_v1 → card_v1`) | 21 | **0** | **−21** |
| D9-Pattern `content_v1->card_v1` (symmetrisch) | 42 | 0 | −42 |
| D9-Pattern `(none)->card_v1` | 19 | 19 | 0 |
| D9-Pattern `rich_v1->rich_v1` | 6 | 6 | 0 |
| Distinct D9-Beziehungen | 3 | 2 | −1 |

## Geprüfte R2-Restfälle

Quelle: `SELECT` auf `cms_sections` mit aktivem Parent `content_v1`, aktivem
Child `card_v1` über `parent_section_id`.

| Page-Komponente | Klasse | page_key | section_key | aktive Kinder | Parent fachlich Karten-Container? | Migration |
|---|---|---|---|---:|---|---|
| `PressePage` | S1 | `presse.root` | `releases` | 5 | ja (Pressemitteilungs-Karten) | ✅ migriert |
| `SignagePage` | S1 | `signage.root` | `products` | 4 | ja (Produkt-Karten) | ✅ migriert |
| `FahrstuhlsteuerungPage` | S2 | `zutrittskontrolle.fahrstuhlsteuerung` | `benefits` | 4 | ja (Vorteils-Karten) | ✅ migriert |
| `MobilerZutrittPage` | S2 | `zutrittskontrolle.mobiler-zutritt` | `benefits` | 4 | ja (Vorteils-Karten) | ✅ migriert |
| `ZufahrtenParkplaetzePage` | S2 | `zutrittskontrolle.zufahrten-parkplaetze` | `benefits` | 4 | ja (Vorteils-Karten) | ✅ migriert |

**Summe: 5 Parent-Sections retyped · 21 R2-Hits aufgelöst.**

Alle Parents waren vorher und nachher `is_active=true`. Sortierung
(`sort_order`) blieb unverändert. Parent-Felder (`label`, `title`, `intro` etc.)
und sämtliche Asset-Slots blieben unangetastet. Whitelist
(`cms_admin_editable_fields`) wurde nicht berührt.

## Renderer-Beweis je Seite

Alle 5 Page-Komponenten lesen die Kinder **typ-agnostisch zum Parent**:
sie filtern `cms.sections` nach `parent_section_key === "<key>"` UND
`section_type === "card_v1"`. Der Parent-Typ wird im JSX nirgends abgefragt.
Damit ist die Migration `content_v1 → cards_v1` auf dem Parent layoutgleich.

### `PressePage.tsx` (S1, low)

```tsx
const releaseCards = cms.sections
  .filter((s) => s.parent_section_key === "releases" && s.section_type === "card_v1");
```

Parent `releases` wird als manuelle `<section>` mit `<h2>{t("releases.title")}</h2>`
gerendert. Kein generischer `CmsBodyRenderer`, kein `ContentSectionV1`.
Texte kommen via `useCmsI18n` → DB-first. **Layoutgleich sicher.**

### `SignagePage.tsx` (S1, low)

```tsx
const productCards = cms.sections
  .filter((s) => s.parent_section_key === "products" && s.section_type === "card_v1");
```

Parent `products` wird in `<ContentSection label={t("products.label")} title={t("products.title")}>`
gerendert — eine reine Hüll-Komponente, nicht der CMS-Body-Renderer.
Kein Doppelrendering. **Layoutgleich sicher.**

### `FahrstuhlsteuerungPage.tsx` (S2, medium)

```tsx
const benefitCards = cms.sections.filter(
  (s) => s.parent_section_key === "benefits" && s.section_type === "card_v1",
);
```

Parent `benefits` als manuelle `<ContentSection label={t("shared.sections.benefits")} title={t("fahrstuhlsteuerung.benefits.title")}>`-Hülle.
Karten-Inhalte: `cms.text(sk, "title"/"description")` mit i18n-Fallback —
unverändert. **Layoutgleich sicher.**

### `MobilerZutrittPage.tsx` (S2, medium)

```tsx
const benefitCards = cms.sections.filter(
  (s) => s.parent_section_key === "benefits" && s.section_type === "card_v1",
);
```

Identisches Pattern wie Fahrstuhlsteuerung. Parent-`section_type` nicht
abgefragt. Daneben existiert ein zweiter Container `products` (bereits
`cards_v1`, nicht betroffen). **Layoutgleich sicher.**

### `ZufahrtenParkplaetzePage.tsx` (S2, medium)

```tsx
const benefitCards = cms.sections.filter(
  (s) => s.parent_section_key === "benefits" && s.section_type === "card_v1",
);
```

Identisches Pattern. **Layoutgleich sicher.**

Gemeinsam für alle 5: kein `CmsBodyRenderer` für die betroffenen Container,
kein `ContentSectionV1`, keine Produktdatenbank-Joins, kein Doppelrendering.

## Dry-Run-Bericht (vor Migration)

| Section | alter Typ | neuer Typ | Grund | erw. D9-Reduktion | Public-Wirkung |
|---|---|---|---|---:|---|
| `presse.root / releases` | `content_v1` | `cards_v1` | 5 aktive `card_v1`-Kinder, Renderer typ-agnostisch | −10 (sym.) / −5 (aktiv) | keine |
| `signage.root / products` | `content_v1` | `cards_v1` | 4 aktive `card_v1`-Kinder | −8 / −4 | keine |
| `zutrittskontrolle.fahrstuhlsteuerung / benefits` | `content_v1` | `cards_v1` | 4 aktive `card_v1`-Kinder | −8 / −4 | keine |
| `zutrittskontrolle.mobiler-zutritt / benefits` | `content_v1` | `cards_v1` | 4 aktive `card_v1`-Kinder | −8 / −4 | keine |
| `zutrittskontrolle.zufahrten-parkplaetze / benefits` | `content_v1` | `cards_v1` | 4 aktive `card_v1`-Kinder | −8 / −4 | keine |

Erwartete Reduktion D9 (symmetrisch) ≈ 42, aktive R2 ≈ 21. **Erreicht: D9 −42, R2 −21.**

## Migration

```sql
UPDATE public.cms_sections
SET section_type = 'cards_v1', updated_at = now()
WHERE section_type = 'content_v1'
  AND is_active = true
  AND (page_key, section_key) IN (
    ('presse.root', 'releases'),
    ('signage.root', 'products'),
    ('zutrittskontrolle.fahrstuhlsteuerung', 'benefits'),
    ('zutrittskontrolle.mobiler-zutritt', 'benefits'),
    ('zutrittskontrolle.zufahrten-parkplaetze', 'benefits')
  );
```

Idempotent durch `WHERE section_type='content_v1'`. Keine weiteren Spalten
geändert (außer `updated_at`).

## Audit-Nachprüfung

- `npm run cms:audit:contract-drift`: D1=0 · D8=0 · **D9=25** · D2=2649 · D3=3502 · D4=3074 · D5=3416 · D6=184 · D7=0 · D10=28 · D0=5 OK.
- `npm run cms:audit:d9`: 25 D9 gesamt, 5 aktiv / 20 inaktiv. Muster: 19 `child_only_at_top_level` + 6 `top_level_only_under_parent`. **Kein `content_v1->card_v1` mehr.**
- `npm run cms:audit:d9-relations`: D9-Pattern-Summe **25**, distinct Beziehungen **2** — `(none)->card_v1` (19) und `rich_v1->rich_v1` (6).
- `npm run cms:audit:renderer-fallback-inventory`: Klassen unverändert (2 G0 · 4 G1 · 54 S1 · 19 S2 · 2 S3 · 1 P1).
- Live-DB-Check: `SELECT COUNT(*) FROM cms_sections p JOIN cms_sections c ON c.parent_section_id=p.id WHERE p.is_active AND c.is_active AND p.section_type='content_v1' AND c.section_type='card_v1';` → **0**.
- `npm run build`: vom Lovable-Harness automatisch ausgeführt, nicht manuell aufgerufen (Vorgabe).

## Scope-Bestätigung

- Keine Produktdatenbank angefasst.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung.
- Keine Inhalte, Bilder oder Feldwerte überschrieben.
- Keine Whitelist-Änderung (`cms_admin_editable_fields`).
- Keine neue Schreib-RPC.
- Keine Reparenting-Migration (`parent_section_id` unverändert).
- Keine Aktivierung/Deaktivierung (`is_active` unverändert).
- Keine Sort-Order-Änderung (`sort_order` unverändert).
- D1=0 stabil. D8=0 stabil.
- Public-Website sichtbar unverändert.
- Bestehende CMS-Pflege bleibt möglich (Felder + Karten weiterhin im Admin sichtbar).

## Meilenstein

Mit Sprint 2j ist die R2-Klasse (`content_v1 → card_v1`) vollständig
aufgelöst — von 88 aktiven R2-Hits in Sprint 2g auf **0** in Sprint 2j
über drei kontrollierte Tranchen (2h: −29, 2i: −38, 2j: −21).

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2k-d3-d5-rest-seeding-bereichsweise-1` —
bereichsweises Seeding der verbliebenen D3 (3502) und D5 (3416) Drift-
Klassen, beginnend mit dem fachlichen Bereich mit der höchsten Dichte.
Die verbliebenen 25 D9-Hits (19 `(none)->card_v1` + 6 `rich_v1->rich_v1`)
sind eigene Klassen für spätere, kleinere Sprints und blockieren das
D3/D5-Seeding nicht.
