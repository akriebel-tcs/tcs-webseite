# Section-Type-Klassifikation

_Read-only. Klassen: top_level_renderable · child_only · layout_skip_registered · data_only · bespoke_registered · real_gap._

## Uebersicht

| Klasse | Anzahl Typen | Aktive Instanzen |
| --- | --- | --- |
| top_level_renderable | 13 | 599 |
| child_only | 3 | 677 |
| layout_skip_registered | 1 | 92 |
| data_only | 2 | 31 |
| bespoke_registered | 4 | 28 |
| real_gap | 0 | 0 |

## top_level_renderable (13)

| section_type | aktiv | renderer | status | hinweise |
| --- | --- | --- | --- | --- |
| cards_v1 | 131 | CmsBodyRenderer.RENDERERS | gruen | — |
| contact_block_v1 | 0 | CmsBodyRenderer.RENDERERS | gruen | — |
| content_v1 | 190 | CmsBodyRenderer.RENDERERS | gruen | — |
| cta_v1 | 110 | CmsBodyRenderer.RENDERERS | gruen | Zusaetzlich global ueber CmsTailCta gerendert. |
| download_list_v1 | 0 | CmsBodyRenderer.RENDERERS | gruen | — |
| faq_v1 | 80 | CmsBodyRenderer.RENDERERS | gruen | — |
| feature_grid_v1 | 1 | CmsBodyRenderer.RENDERERS | gruen | — |
| product_scroller_v1 | 7 | CmsBodyRenderer.RENDERERS | gruen | — |
| product_showcase_list_v1 | 2 | CmsBodyRenderer.RENDERERS | gruen | — |
| rich_v1 | 2 | CmsBodyRenderer.RENDERERS | gruen | — |
| stats_v1 | 8 | CmsBodyRenderer.RENDERERS | gruen | — |
| tabs_v1 | 1 | CmsBodyRenderer.RENDERERS | gruen | — |
| teaser_2col_v1 | 67 | CmsBodyRenderer.RENDERERS | gruen | — |

## child_only (3)

| section_type | aktiv | renderer | status | hinweise |
| --- | --- | --- | --- | --- |
| card_v1 | 641 | via Eltern: cards_v1, product_scroller_v1, product_showcase_list_v1, card_grid_v1, catalog_filter_grid_v1, feature_grid_v1, download_list_v1 | gruen | — |
| stat_v1 | 32 | via Eltern: stats_v1 | gruen | — |
| tab_v1 | 4 | via Eltern: tabs_v1 | gruen | — |

## layout_skip_registered (1)

| section_type | aktiv | renderer | status | hinweise |
| --- | --- | --- | --- | --- |
| hero_v1 | 92 | CmsPageLayout (Page-Hero) | gruen | — |

## data_only (2)

| section_type | aktiv | renderer | status | hinweise |
| --- | --- | --- | --- | --- |
| series_override_container_v1 | 1 | (kein UI — reiner Datentraeger) | gelb | Konsument/Auswertung muss in docs/02-architektur dokumentiert sein. |
| series_override_v1 | 30 | (kein UI — reiner Datentraeger) | gelb | Konsument/Auswertung muss in docs/02-architektur dokumentiert sein. |

## bespoke_registered (4)

| section_type | aktiv | renderer | status | hinweise |
| --- | --- | --- | --- | --- |
| card_grid_v1 | 0 | Spezial-/Page-Renderer (kein CmsBodyRenderer-Eintrag) | gelb | Konsument/Datei/Zweck muss im Vorlagenbereich-Abgleich dokumentiert sein. |
| catalog_filter_grid_v1 | 3 | Spezial-/Page-Renderer (kein CmsBodyRenderer-Eintrag) | gelb | Konsument/Datei/Zweck muss im Vorlagenbereich-Abgleich dokumentiert sein. |
| list_v1 | 24 | Spezial-/Page-Renderer (kein CmsBodyRenderer-Eintrag) | gelb | Konsument/Datei/Zweck muss im Vorlagenbereich-Abgleich dokumentiert sein. |
| role_tabs_v1 | 1 | Spezial-/Page-Renderer (kein CmsBodyRenderer-Eintrag) | gelb | Konsument/Datei/Zweck muss im Vorlagenbereich-Abgleich dokumentiert sein. |
