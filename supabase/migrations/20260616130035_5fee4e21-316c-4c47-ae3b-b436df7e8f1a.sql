
UPDATE public.cms_assets SET is_active = false
WHERE page_key='anwendungen.einfamilienhaus' AND section_key='hero' AND field_key='image' AND is_active = true;

INSERT INTO public.cms_assets (page_key, section_key, field_key, asset_role, storage_path, public_url, alt_de, alt_en, sort_order, is_active, viewport)
VALUES (
  'anwendungen.einfamilienhaus','hero','image','image',
  'anwendungen.einfamilienhaus/hero/image/1781308100000-efh-hero.jpg',
  'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/anwendungen.einfamilienhaus%2Fhero%2Fimage%2F1781308100000-efh-hero.jpg',
  'Modernes Einfamilienhaus mit Photovoltaikanlage',
  'Modern single-family house with photovoltaic system',
  0, true, 'desktop'
);
