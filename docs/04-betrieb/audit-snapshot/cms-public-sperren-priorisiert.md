# CMS/Public-Sperren · priorisiert

| Prioritaet | Anzahl |
| --- | --- |
| blocker_eine_wahrheit | 0 |
| struktur_schuld | 4 |
| audit_korrektur | 8 |

## struktur_schuld (4)

| typ | page_key | section_key | feld/typ | bedeutung |
| --- | --- | --- | --- | --- |
| whitelist_ohne_section | home.start | block_communication_kopie | * | Whitelist erlaubt Pflege, Section existiert aber nicht in cms_sections. |
| whitelist_ohne_section | home.start | content_blocks | * | Whitelist erlaubt Pflege, Section existiert aber nicht in cms_sections. |
| sonderseite_ohne_cms_page | (route:/produkte/merkliste) | - | - | /produkte/merkliste ist Sonderseite und hat keinen Eintrag in cms_pages — Inhalte ausschließlich im Code. |
| sonderseite_ohne_cms_page | (route:/produkte/tuerkommunikation/:pdpSlug) | - | - | /produkte/tuerkommunikation/:pdpSlug ist Sonderseite und hat keinen Eintrag in cms_pages — Inhalte ausschließlich im Code. |

## audit_korrektur (8)

| typ | page_key | section_key | feld/typ | bedeutung |
| --- | --- | --- | --- | --- |
| section_type_ohne_renderer | * | * | card_v1 | Korrektur: card_v1 ist child_only (via Eltern: cards_v1, product_scroller_v1, product_showcase_list_v1, card_grid_v1, catalog_filter_grid_v1, feature_grid_v1, download_list_v1). Keine echte Renderer-Luecke. |
| section_type_ohne_renderer | * | * | catalog_filter_grid_v1 | Korrektur: catalog_filter_grid_v1 ist bespoke_registered (Spezial-/Page-Renderer (kein CmsBodyRenderer-Eintrag)). Keine echte Renderer-Luecke. |
| section_type_ohne_renderer | * | * | hero_v1 | Korrektur: hero_v1 ist layout_skip_registered (CmsPageLayout (Page-Hero)). Keine echte Renderer-Luecke. |
| section_type_ohne_renderer | * | * | role_tabs_v1 | Korrektur: role_tabs_v1 ist bespoke_registered (Spezial-/Page-Renderer (kein CmsBodyRenderer-Eintrag)). Keine echte Renderer-Luecke. |
| section_type_ohne_renderer | * | * | series_override_container_v1 | Korrektur: series_override_container_v1 ist data_only ((kein UI — reiner Datentraeger)). Keine echte Renderer-Luecke. |
| section_type_ohne_renderer | * | * | series_override_v1 | Korrektur: series_override_v1 ist data_only ((kein UI — reiner Datentraeger)). Keine echte Renderer-Luecke. |
| section_type_ohne_renderer | * | * | stat_v1 | Korrektur: stat_v1 ist child_only (via Eltern: stats_v1). Keine echte Renderer-Luecke. |
| section_type_ohne_renderer | * | * | tab_v1 | Korrektur: tab_v1 ist child_only (via Eltern: tabs_v1). Keine echte Renderer-Luecke. |
