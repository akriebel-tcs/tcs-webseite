# Sprint 2b — Seeding-Dry-Run

_Generiert: 2026-05-28T21:20:51.640Z_

Quelle: `scripts/cms/sprint-2b-seed-plan.mjs` (read-only).

## Daten

- Seiten gesamt: **118**
- Sections gesamt: **1455**
- cms_section_fields gesamt: **15558**
- cms_admin_editable_fields gesamt: **19130**

## Geplante Inserts (Dry-Run)

- **23387** neue cms_section_fields-Zeilen (value = '')
- **23105** neue cms_admin_editable_fields-Zeilen (is_enabled = true)

## Übersprungene Klassen

| Klasse | Anzahl |
|---|---:|
| Page archived / inactive | 24 |
| Section inactive | 111 |
| Typ unsicher (legacy/special/etc.) | 150 |
| Typ unbekannt (kein Vertrag) | 0 |
| D9 Parent/Child-Verletzung | 101 |
| Alias deckt cms_section_fields ab | 226 |
| Alias deckt Whitelist ab | 226 |

## Inserts pro section_type

| section_type | cms_section_fields | cms_admin_editable_fields |
|---|---:|---:|
| card_v1 | 21723 | 21469 |
| cards_v1 | 480 | 480 |
| content_v1 | 1016 | 1016 |
| cta_v1 | 8 | 8 |
| faq_v1 | 6 | 6 |
| feature_grid_v1 | 2 | 2 |
| product_scroller_v1 | 22 | 22 |
| rich_v1 | 4 | 4 |
| stat_v1 | 64 | 64 |
| stats_v1 | 32 | 32 |
| tabs_v1 | 2 | 2 |
| teaser_2col_v1 | 28 | 0 |

## Top Inserts pro (section_type · field_key)

| section_type · field_key | cms_section_fields | cms_admin_editable_fields |
|---|---:|---:|
| card_v1.cta_label | 1210 | 1202 |
| card_v1.link_1_label | 1190 | 1190 |
| card_v1.link_1_href | 1190 | 1190 |
| card_v1.link_1_kind | 1190 | 1190 |
| card_v1.link_2_label | 1190 | 1190 |
| card_v1.link_2_href | 1190 | 1190 |
| card_v1.link_2_kind | 1190 | 1190 |
| card_v1.link_3_label | 1190 | 1190 |
| card_v1.link_3_href | 1190 | 1190 |
| card_v1.link_3_kind | 1190 | 1190 |
| card_v1.cta_href | 1176 | 1176 |
| card_v1.features.4 | 1174 | 1174 |
| card_v1.features.3 | 1170 | 1170 |
| card_v1.href | 1165 | 1165 |
| card_v1.features.2 | 1164 | 1164 |
| card_v1.features.0 | 1160 | 1160 |
| card_v1.features.1 | 1160 | 1160 |
| card_v1.subtitle | 1020 | 1014 |
| card_v1.icon | 540 | 310 |
| content_v1.label | 364 | 364 |
| content_v1.title | 360 | 360 |
| content_v1.text | 292 | 292 |
| cards_v1.label | 168 | 168 |
| cards_v1.title | 160 | 160 |
| cards_v1.intro | 152 | 152 |
| stat_v1.description | 64 | 64 |
| card_v1.description | 56 | 46 |
| card_v1.title | 18 | 18 |
| stats_v1.title | 16 | 16 |
| stats_v1.intro | 16 | 16 |
| product_scroller_v1.intro | 10 | 10 |
| teaser_2col_v1.cta_label | 14 | 0 |
| teaser_2col_v1.cta_link | 14 | 0 |
| product_scroller_v1.label | 6 | 6 |
| product_scroller_v1.title | 6 | 6 |
| faq_v1.eyebrow | 4 | 4 |
| feature_grid_v1.intro | 2 | 2 |
| rich_v1.title | 2 | 2 |
| rich_v1.body | 2 | 2 |
| cta_v1.title | 2 | 2 |
| cta_v1.text | 2 | 2 |
| cta_v1.cta_label | 2 | 2 |
| cta_v1.cta_href | 2 | 2 |
| tabs_v1.intro | 2 | 2 |
| faq_v1.intro | 2 | 2 |

---

**Garantien:** keine bestehenden Werte werden überschrieben, keine Aliase migriert, keine Asset-Slots berührt, keine technical_fields/Toggles, keine D9-Sections, keine archivierten Seiten, keine inaktiven Sections.
