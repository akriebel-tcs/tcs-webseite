
-- 1) Hero-Bild Kita aktivieren
INSERT INTO public.cms_assets (page_key, section_key, asset_role, field_key, viewport, storage_path, public_url, alt_de, alt_en, sort_order, is_active, file_name, mime_type)
VALUES (
  'anwendungen.kindertagesstaetten','hero','image','image','desktop',
  'anwendungen.kindertagesstaetten/hero/image/desktop/1781705100000-kita-hero.jpg',
  'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/anwendungen.kindertagesstaetten/hero/image/desktop/1781705100000-kita-hero.jpg',
  'Farbenfrohe Kindertagesstätte mit bunten Fassadenelementen','Colourful kindergarten building with vibrant facade panels',
  0, true, 'Web_Hero_Bildformat_3840_x_1360px_Kita-1.jpg','image/jpeg'
)
ON CONFLICT (page_key, section_key, field_key, viewport) WHERE is_active DO NOTHING;

UPDATE public.cms_section_fields SET value='1'
WHERE page_key='anwendungen.kindertagesstaetten' AND section_key='hero'
  AND field_key='image_enabled' AND locale IN ('de','en');

-- 2) Kita-Karte B-2667 auf P-057 verlinken
UPDATE public.cms_section_fields SET value='1'
WHERE page_key='anwendungen.bildungseinrichtungen' AND section_key='card_uebersicht_kita'
  AND field_key='link_1_enabled';

UPDATE public.cms_section_fields SET value='internal'
WHERE page_key='anwendungen.bildungseinrichtungen' AND section_key='card_uebersicht_kita'
  AND field_key='link_1_kind';

UPDATE public.cms_section_fields SET value='/anwendungen/kindertagesstaetten'
WHERE page_key='anwendungen.bildungseinrichtungen' AND section_key='card_uebersicht_kita'
  AND field_key='link_1_href';
