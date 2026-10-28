-- 1) Section-Reihenfolge an gewünschtes Visual anpassen (Spiegel-Regel).
--    hero(0) → overview(1) → products(2) → useCases(3) + Kinder(4..7) → technology(8, inaktiv)
UPDATE public.cms_sections SET sort_order = 2, is_active = true
  WHERE page_key='gebaeudemanagement.digital-signage' AND section_key='products';
UPDATE public.cms_sections SET sort_order = 3, is_active = true
  WHERE page_key='gebaeudemanagement.digital-signage' AND section_key='useCases';
UPDATE public.cms_sections SET sort_order = 4
  WHERE page_key='gebaeudemanagement.digital-signage' AND section_key='useCases__eingangsbereiche';
UPDATE public.cms_sections SET sort_order = 5
  WHERE page_key='gebaeudemanagement.digital-signage' AND section_key='useCases__empfangsbereiche';
UPDATE public.cms_sections SET sort_order = 6
  WHERE page_key='gebaeudemanagement.digital-signage' AND section_key='useCases__handelGastronomie';
UPDATE public.cms_sections SET sort_order = 7
  WHERE page_key='gebaeudemanagement.digital-signage' AND section_key='useCases__individuell';
UPDATE public.cms_sections SET sort_order = 8, is_active = false
  WHERE page_key='gebaeudemanagement.digital-signage' AND section_key='technology';

-- 2) Produktkartenbild für BCM Infoboard ergänzen (idempotent).
--    Wiederverwendung des bereits vorhandenen Hero-Bildes der BCM-Infoboard-Detailseite.
INSERT INTO public.cms_assets (
  page_key, section_key, field_key, asset_role, locale,
  storage_path, public_url, alt_de, alt_en, viewport, is_active, sort_order
)
SELECT
  'gebaeudemanagement.digital-signage',
  'products',
  'items.infoboard.image',
  'image',
  NULL,
  'gebaeudemanagement.bcm-infoboard/hero.jpg',
  'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/gebaeudemanagement.bcm-infoboard/hero.jpg',
  'BCM Infoboard in einem Eingangsbereich',
  'BCM Infoboard in an entrance area',
  'desktop',
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_assets
  WHERE page_key='gebaeudemanagement.digital-signage'
    AND section_key='products'
    AND field_key='items.infoboard.image'
    AND viewport='desktop'
);
