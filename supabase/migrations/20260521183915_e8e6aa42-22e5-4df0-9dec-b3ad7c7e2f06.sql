
-- mobile_tk: update existing asset row with new file + alt texts
UPDATE public.cms_assets
SET
  storage_path = 'gebaeudekommunikation.tuersprechanlagen/mobile_tk/image/desktop/hero-mobile-tuerkommunikation.webp',
  public_url   = 'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/gebaeudekommunikation.tuersprechanlagen/mobile_tk/image/desktop/hero-mobile-tuerkommunikation.webp',
  file_name    = 'hero-mobile-tuerkommunikation.webp',
  mime_type    = 'image/webp',
  alt_text_de  = 'Frau mit Smartphone vor modernem Gebäude, auf dem Display ein Türrufbildschirm mit Lieferant.',
  alt_text_en  = 'Woman with smartphone in front of a modern building, the display shows a door call screen with a courier.',
  alt_de       = 'Frau mit Smartphone vor modernem Gebäude, auf dem Display ein Türrufbildschirm mit Lieferant.',
  alt_en       = 'Woman with smartphone in front of a modern building, the display shows a door call screen with a courier.',
  is_active    = true,
  updated_at   = now()
WHERE page_key = 'gebaeudekommunikation.tuersprechanlagen'
  AND section_key = 'mobile_tk'
  AND field_key = 'image'
  AND viewport = 'desktop';

-- snipdoo: insert new asset (no existing row)
INSERT INTO public.cms_assets (
  page_key, section_key, asset_role, field_key, viewport, locale,
  storage_path, public_url, file_name, mime_type,
  alt_text_de, alt_text_en, alt_de, alt_en,
  sort_order, is_active
)
SELECT
  'gebaeudekommunikation.tuersprechanlagen', 'snipdoo', 'image', 'image', 'desktop', NULL,
  'gebaeudekommunikation.tuersprechanlagen/snipdoo/image/desktop/teaser-snipdoo-ip.webp',
  'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/gebaeudekommunikation.tuersprechanlagen/snipdoo/image/desktop/teaser-snipdoo-ip.webp',
  'teaser-snipdoo-ip.webp', 'image/webp',
  'Moderne Glasfassade mit grafischem Kreis: Effizienter planen, einfacher installieren, mobil nutzen, günstiger verwalten.',
  'Modern glass facade with a graphic circle: plan more efficiently, install more easily, use mobile, manage more cost-effectively.',
  'Moderne Glasfassade mit grafischem Kreis: Effizienter planen, einfacher installieren, mobil nutzen, günstiger verwalten.',
  'Modern glass facade with a graphic circle: plan more efficiently, install more easily, use mobile, manage more cost-effectively.',
  0, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_assets
  WHERE page_key = 'gebaeudekommunikation.tuersprechanlagen'
    AND section_key = 'snipdoo'
    AND field_key = 'image'
    AND viewport = 'desktop'
);

-- if a snipdoo row already exists from a previous run, also keep it in sync (idempotent)
UPDATE public.cms_assets
SET
  storage_path = 'gebaeudekommunikation.tuersprechanlagen/snipdoo/image/desktop/teaser-snipdoo-ip.webp',
  public_url   = 'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/gebaeudekommunikation.tuersprechanlagen/snipdoo/image/desktop/teaser-snipdoo-ip.webp',
  file_name    = 'teaser-snipdoo-ip.webp',
  mime_type    = 'image/webp',
  alt_text_de  = 'Moderne Glasfassade mit grafischem Kreis: Effizienter planen, einfacher installieren, mobil nutzen, günstiger verwalten.',
  alt_text_en  = 'Modern glass facade with a graphic circle: plan more efficiently, install more easily, use mobile, manage more cost-effectively.',
  alt_de       = 'Moderne Glasfassade mit grafischem Kreis: Effizienter planen, einfacher installieren, mobil nutzen, günstiger verwalten.',
  alt_en       = 'Modern glass facade with a graphic circle: plan more efficiently, install more easily, use mobile, manage more cost-effectively.',
  is_active    = true,
  updated_at   = now()
WHERE page_key = 'gebaeudekommunikation.tuersprechanlagen'
  AND section_key = 'snipdoo'
  AND field_key = 'image'
  AND viewport = 'desktop';
