-- Etappe snipdoo-ip-hero-bild-1
-- Hero-Bild + Alt-Text für /gebaeudekommunikation/snipdoo-ip

-- 1) Feld hero.imageAlt (DE + EN) anlegen
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('gebaeudekommunikation.snipdoo-ip', 'hero', 'imageAlt', 'de',
   'snipdoo IP – vier Nutzenversprechen vor moderner Glasfassade: effizienter planen, einfacher installieren, mobil nutzen, günstiger verwalten'),
  ('gebaeudekommunikation.snipdoo-ip', 'hero', 'imageAlt', 'en',
   'snipdoo IP – four value propositions over a modern glass facade: plan more efficiently, install more easily, use mobile, manage more cost-effectively')
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 2) Whitelist-Einträge für hero.imageAlt (DE + EN)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
VALUES
  ('gebaeudekommunikation.snipdoo-ip', 'hero', 'imageAlt', 'de', true),
  ('gebaeudekommunikation.snipdoo-ip', 'hero', 'imageAlt', 'en', true)
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();

-- 3) Whitelist-Eintrag für hero.image (Bild-Slot — locale-neutral via 'de'/'en')
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
VALUES
  ('gebaeudekommunikation.snipdoo-ip', 'hero', 'image', 'de', true),
  ('gebaeudekommunikation.snipdoo-ip', 'hero', 'image', 'en', true)
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();

-- 4) Asset-Zeile für hero.image (viewport=desktop)
INSERT INTO public.cms_assets (
  page_key, section_key, field_key, viewport, asset_role,
  storage_path, public_url, file_name, mime_type,
  alt_de, alt_en, is_active
)
VALUES (
  'gebaeudekommunikation.snipdoo-ip', 'hero', 'image', 'desktop', 'image',
  'gebaeudekommunikation.snipdoo-ip/hero/image/hero-snipdoo-ip.webp',
  'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/gebaeudekommunikation.snipdoo-ip/hero/image/hero-snipdoo-ip.webp',
  'hero-snipdoo-ip.webp',
  'image/webp',
  'snipdoo IP – vier Nutzenversprechen vor moderner Glasfassade: effizienter planen, einfacher installieren, mobil nutzen, günstiger verwalten',
  'snipdoo IP – four value propositions over a modern glass facade: plan more efficiently, install more easily, use mobile, manage more cost-effectively',
  true
)
ON CONFLICT (page_key, section_key, field_key, viewport) WHERE is_active
DO UPDATE SET
  storage_path = EXCLUDED.storage_path,
  public_url   = EXCLUDED.public_url,
  file_name    = EXCLUDED.file_name,
  mime_type    = EXCLUDED.mime_type,
  alt_de       = EXCLUDED.alt_de,
  alt_en       = EXCLUDED.alt_en,
  updated_at   = now();
