-- B-2667 (card_uebersicht_kita): Bild + image_enabled-Toggle.
-- Idempotent: alte aktive Assets in diesem Slot werden deaktiviert,
-- dann das neue Asset aktiv eingefügt.
UPDATE public.cms_assets
SET is_active = false, updated_at = now()
WHERE page_key = 'anwendungen.bildungseinrichtungen'
  AND section_key = 'card_uebersicht_kita'
  AND field_key = 'image'
  AND viewport = 'desktop'
  AND is_active = true
  AND storage_path <> 'anwendungen.bildungseinrichtungen/card_uebersicht_kita/image/1781308000000-kita-bunte-welt.jpg';

INSERT INTO public.cms_assets (
  page_key, section_key, asset_role, field_key, locale,
  storage_path, public_url, file_name, mime_type,
  alt_de, alt_en, alt_text_de, alt_text_en,
  sort_order, is_active, viewport
)
SELECT
  'anwendungen.bildungseinrichtungen',
  'card_uebersicht_kita',
  'image', 'image', NULL,
  'anwendungen.bildungseinrichtungen/card_uebersicht_kita/image/1781308000000-kita-bunte-welt.jpg',
  'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/anwendungen.bildungseinrichtungen/card_uebersicht_kita/image/1781308000000-kita-bunte-welt.jpg',
  'csm_Kita_321_a0b0cf962c.jpg', 'image/jpeg',
  'Bunte Kita-Fassade mit TCS Türsprechanlage am Eingang',
  'Colourful nursery facade with TCS door entry system at the entrance',
  'Bunte Kita-Fassade mit TCS Türsprechanlage am Eingang',
  'Colourful nursery facade with TCS door entry system at the entrance',
  0, true, 'desktop'
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_assets
  WHERE page_key = 'anwendungen.bildungseinrichtungen'
    AND section_key = 'card_uebersicht_kita'
    AND field_key = 'image'
    AND viewport = 'desktop'
    AND is_active = true
);

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('anwendungen.bildungseinrichtungen', 'card_uebersicht_kita', 'image_enabled', 'de', '1'),
  ('anwendungen.bildungseinrichtungen', 'card_uebersicht_kita', 'image_enabled', 'en', '1')
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();