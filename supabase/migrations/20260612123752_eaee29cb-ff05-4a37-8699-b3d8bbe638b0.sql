-- B-2668 (card_uebersicht_schule): Bild + image_enabled-Toggle. Idempotent.
UPDATE public.cms_assets
SET is_active = false, updated_at = now()
WHERE page_key = 'anwendungen.bildungseinrichtungen'
  AND section_key = 'card_uebersicht_schule'
  AND field_key = 'image'
  AND viewport = 'desktop'
  AND is_active = true
  AND storage_path <> 'anwendungen.bildungseinrichtungen/card_uebersicht_schule/image/1781308010000-schule-hegel-gymnasium.jpg';

INSERT INTO public.cms_assets (
  page_key, section_key, asset_role, field_key, locale,
  storage_path, public_url, file_name, mime_type,
  alt_de, alt_en, alt_text_de, alt_text_en,
  sort_order, is_active, viewport
)
SELECT
  'anwendungen.bildungseinrichtungen',
  'card_uebersicht_schule',
  'image', 'image', NULL,
  'anwendungen.bildungseinrichtungen/card_uebersicht_schule/image/1781308010000-schule-hegel-gymnasium.jpg',
  'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/anwendungen.bildungseinrichtungen/card_uebersicht_schule/image/1781308010000-schule-hegel-gymnasium.jpg',
  'csm_Schule_321_04c30623f4.jpg', 'image/jpeg',
  'Moderner Schulhof mit TCS Türstation am Eingang des Hegel-Gymnasiums',
  'Modern schoolyard with TCS door station at the entrance of Hegel-Gymnasium',
  'Moderner Schulhof mit TCS Türstation am Eingang des Hegel-Gymnasiums',
  'Modern schoolyard with TCS door station at the entrance of Hegel-Gymnasium',
  0, true, 'desktop'
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_assets
  WHERE page_key = 'anwendungen.bildungseinrichtungen'
    AND section_key = 'card_uebersicht_schule'
    AND field_key = 'image'
    AND viewport = 'desktop'
    AND is_active = true
);

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'image_enabled', 'de', '1'),
  ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'image_enabled', 'en', '1')
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();