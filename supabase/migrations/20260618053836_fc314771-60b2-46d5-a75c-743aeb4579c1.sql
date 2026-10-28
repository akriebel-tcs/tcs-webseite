
INSERT INTO cms_pages (page_key, page_no, page_type, route_path, title_de, title_en, status, is_active)
VALUES ('anwendungen.wohnheim', 268, 'T05', '/anwendungen/wohnheim', 'Wohnheim', 'Hall of residence', 'published', true)
ON CONFLICT (page_key) DO NOTHING;

INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'anwendungen.wohnheim', section_key, section_type, sort_order, is_active, parent_section_id
FROM cms_sections WHERE page_key='anwendungen.schule'
ON CONFLICT (page_key, section_key) DO NOTHING;

INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
SELECT 'anwendungen.wohnheim', section_key, field_key, locale, value, value_json
FROM cms_section_fields WHERE page_key='anwendungen.schule'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

UPDATE cms_section_fields SET value='Wohnheim'
  WHERE page_key='anwendungen.wohnheim' AND section_key IN ('hero','content') AND field_key='headline' AND locale='de';
UPDATE cms_section_fields SET value='Hall of residence'
  WHERE page_key='anwendungen.wohnheim' AND section_key IN ('hero','content') AND field_key='headline' AND locale='en';

UPDATE cms_section_fields SET value='Türkommunikation und Zutritt für Wohnheime – klare Bedienung am Haupteingang, sichere Identifikation von Bewohnerinnen, Bewohnern und Besuchern sowie eine zuverlässige Sprech- und Videoverbindung in jedes Zimmer.'
  WHERE page_key='anwendungen.wohnheim' AND section_key IN ('hero','content') AND field_key='intro' AND locale='de';
UPDATE cms_section_fields SET value='Door communication and access control for halls of residence – clear operation at the main entrance, secure identification of residents and visitors, and a reliable audio and video link to every room.'
  WHERE page_key='anwendungen.wohnheim' AND section_key IN ('hero','content') AND field_key='intro' AND locale='en';

UPDATE cms_section_fields SET value='TCS unterstützt Wohnheime mit robusten Außenstationen, geschütztem Zutritt zu Wohnbereichen und Verwaltung sowie einer übersichtlichen Bedienung – auch bei häufigem Bewohnerwechsel und hohem Besucheraufkommen.'
  WHERE page_key='anwendungen.wohnheim' AND section_key='content' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='TCS supports halls of residence with robust outdoor stations, protected access to living areas and administration, and clear operation – even with frequent resident changes and high visitor traffic.'
  WHERE page_key='anwendungen.wohnheim' AND section_key='content' AND field_key='description' AND locale='en';

INSERT INTO cms_assets (page_key, section_key, asset_role, field_key, viewport, storage_path, public_url, alt_de, alt_en, sort_order, is_active)
SELECT 'anwendungen.wohnheim', 'hero', 'image', 'image', 'desktop',
  'anwendungen.wohnheim/hero/image/desktop/1781800100000-wohnheim-hero.jpg',
  'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/anwendungen.wohnheim/hero/image/desktop/1781800100000-wohnheim-hero.jpg',
  'Wohnheim – Fassade in der Abenddämmerung',
  'Hall of residence – facade at dusk',
  0, true
WHERE NOT EXISTS (
  SELECT 1 FROM cms_assets
  WHERE page_key='anwendungen.wohnheim' AND section_key='hero' AND field_key='image' AND viewport='desktop'
);

INSERT INTO cms_navigation_nodes (nav_area, node_key, parent_id, page_key, route_path, sort_order, is_active, label_de, label_en, node_type, show_in_public_nav)
VALUES ('main','an.bildung.wohnheim','392d9107-3b3b-4b38-83af-85b75571c596','anwendungen.wohnheim','/anwendungen/wohnheim',3,true,'Wohnheim','Hall of residence','page',true)
ON CONFLICT (nav_area, node_key) DO NOTHING;

INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('anwendungen.bildungseinrichtungen','card_uebersicht_wohnheim','link_1_enabled','de','1'),
  ('anwendungen.bildungseinrichtungen','card_uebersicht_wohnheim','link_1_enabled','en','1'),
  ('anwendungen.bildungseinrichtungen','card_uebersicht_wohnheim','link_1_kind','de','internal'),
  ('anwendungen.bildungseinrichtungen','card_uebersicht_wohnheim','link_1_kind','en','internal'),
  ('anwendungen.bildungseinrichtungen','card_uebersicht_wohnheim','link_1_href','de','/anwendungen/wohnheim'),
  ('anwendungen.bildungseinrichtungen','card_uebersicht_wohnheim','link_1_href','en','/anwendungen/wohnheim'),
  ('anwendungen.bildungseinrichtungen','card_uebersicht_wohnheim','link_1_label','de','Mehr erfahren'),
  ('anwendungen.bildungseinrichtungen','card_uebersicht_wohnheim','link_1_label','en','Learn more')
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value=EXCLUDED.value;
