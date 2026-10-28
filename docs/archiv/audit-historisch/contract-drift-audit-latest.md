# Contract-Drift-Audit — Aktueller Stand

_Generiert: 2026-06-03T08:45:32.150Z_

Quelle: `scripts/cms/contract-drift-audit.mjs` über die read-only RPC `rpc_admin_export_contract_drift`.

> ⚠️ DB-Teil übersprungen (http). Statischer Teil wurde geprüft.

## Drift-Klassen

| Klasse | Beschreibung | Count |
|---|---|---:|
| D1 | contract_missing | 0 |
| D2 | fields_unknown_to_contract | 0 |
| D3 | contract_fields_missing_in_db | 0 |
| D4 | whitelist_unknown_to_contract | 0 |
| D5 | whitelist_missing_for_contract_field | 0 |
| D6 | asset_slot_unknown_to_contract | 0 |
| D7 | contract_asset_slot_missing | 0 |
| D8 | active_without_renderer | 0 |
| D9 | invalid_parent_child | 0 |
| D10 | i18n_or_special_owner_risk | 28 |
| D0 | ok_sections (keine D1/D2/D3/D8/D9) | 0 |

## Top 20 betroffene Sections

_(keine)_

## Top 20 unbekannte field_keys (D2)

_(keine)_

## Fehlende Vertragsfelder je section_type (D3)

_(keine)_

## Aktive Top-Level-Sections ohne Renderer (D8)

_(keine)_

## Parent/Child-Vertragsverletzungen (D9)

_(keine)_

## Spezial-/i18n-Risiken (D10, aus Vertrag)

| section_type | Hinweis |
|---|---|
| hero_v1 | Wird nicht im CmsBodyRenderer ausgegeben (SKIP_TYPES). |
| content_v1 | normalizeType aliasiert content, intro, content_block_v1, content_blocks_intro_v1 → content_v1. |
| cards_v1 | P055 (B-2059): Header heute aus i18n, Vertrag verlangt DB-Felder label/title/intro am Container. |
| product_scroller_v1 | Türsprechanlagen: Container-Header kommt aus i18n (tuersprechanlagen.*), nicht aus DB. |
| product_scroller_v1 | Spezial-Renderer liest zusätzlich card.eyebrow/headline/beschreibung sowie *_enabled-Toggles. |
| card_v1 | Aliase eyebrow/headline/beschreibung werden generisch nicht gelesen (nur Spezial-Renderer). |
| card_v1 | feature_grid_v1-Kinder dürfen kein image — Admin muss dort image-Slot ausblenden. |
| card_v1 | card_grid_v1 / catalog_filter_grid_v1 lesen thumbnail, nicht image. |
| feature_grid_v1 | Kinder sind Iconkarten — image/thumbnail an Kindern bewusst nicht gerendert. |
| teaser_2col_v1 | cta_link vs. cta_href: niemals im selben Adminfeld vermischen. |
| faq_v1 | Items leben als Felder items.<slug>.frage|antwort (nicht als Kindsection). |
| faq_v1 | Renderer akzeptiert drei Schemata: items.<slug>.frage|antwort, items.<slug>.question|answer, items.<n>.q|a. |
| tabs_v1 | Erlaubte Kindtypen müssen mittelfristig enger gefasst werden. |
| download_list_v1 | Kinder card_v1 lesen file_label / cta_href, kein image-Slot erwartet. |
| card_grid_v1 | Kinder card_v1 lesen thumbnail statt image — Admin darf hier nur thumbnail anbieten. |
| catalog_filter_grid_v1 | Kinder card_v1 lesen thumbnail statt image. |
| series_override_v1 | Legacy/Fallback: nur Produktkatalog-Overrides, Admin read-only. |
| list_v1 | Konsumiert von ReferenzprojektDetailPage (anwendungen.referenzprojekte.<slug>, Sections 'highlights'/'systems'). |
| list_v1 | Kein generischer CmsBodyRenderer — Page liest das Feld 'items' direkt und splittet zeilenweise. |
| role_tabs_v1 | Konsumiert von SnipdooIpPage (gebaeudekommunikation.snipdoo-ip, Section 'role_tabs'). |
| role_tabs_v1 | Felder leben dynamisch als tabs.<roleKey>.label|headline|p1|p2 — werden vom Audit als dynamic-Pattern behandelt. |
| role_tabs_v1 | Kein generischer Renderer — die Page liest die Rollen-Keys aus i18n und fragt pro Schlüssel cms.text() ab. |
| tab_v1 | Renderer liest zusätzlich vorteile.<n>.headline und vorteile.<n>.body (flach, max ~4 Einträge). |
| tab_v1 | Audit erkennt vorteile.<n>.headline|body als dynamic-Pattern. |
| tab_v1 | DB-Bestand auf mobile-tk-preview.root hat tab_v1 historisch ohne Parent (Top-Level) — D9 markiert das korrekt als child_only_at_top_level. |
| series_override_container_v1 | Konsumiert von CatalogMvp/TuerkommunikationHub: nutzt sort_order der series_override_v1-Kinder als Sortierquelle für Serienkacheln. |
| series_override_container_v1 | Container hat selbst keinen sichtbaren Header — reiner Admin-Pflegeblock. |
| series_override_container_v1 | Children (series_override_v1) sind Legacy: pflegbar nur über Admin-spezifische Schreibwege; tragen Thumbnail-Override per cms_assets-Slot 'thumbnail'. |

## Empfohlene Reparatur-Tranchen

_(keine — Stand sauber)_

---

**Hinweis:** Dieses Audit ist read-only. Es ändert keine Inhalte, keine Bilder, keine Whitelist und keine Public-Renderer.
