-- Register 5 missing CMS pages so optional image slots become publicly readable.
-- Idempotent.
INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
VALUES
  ('home.ueber-tcs', '/ueber-tcs', 'standard', 'Über TCS', 'About TCS', 'published', true),
  ('karriere.root',  '/karriere',  'standard', 'Karriere',  'Careers',   'published', true),
  ('kontakt.root',   '/kontakt',   'standard', 'Kontakt',   'Contact',   'published', true),
  ('kontakt.bcm',    '/kontakt/bcm','standard','Kontakt BCM','Contact BCM','published', true),
  ('presse.root',    '/presse',    'standard', 'Presse',    'Press',     'published', true)
ON CONFLICT (page_key) DO UPDATE SET
  route_path = EXCLUDED.route_path,
  status     = 'published',
  is_active  = true,
  updated_at = now();