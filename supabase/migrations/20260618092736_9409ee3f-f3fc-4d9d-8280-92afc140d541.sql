-- Batch 55: Reproduktionsmigration für B-2521 (broschure_kita) auf P-266.
INSERT INTO public.cms_section_fields
  (page_key, section_key, field_key, locale, value)
VALUES
  ('anwendungen.kindertagesstaetten', 'broschure_kita', 'title', 'de',
   'Broschüre für Kindertagesstätten'),
  ('anwendungen.kindertagesstaetten', 'broschure_kita', 'title', 'en',
   'Brochure for daycare centres')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_admin_editable_fields
  (page_key, section_key, field_key, locale, is_enabled)
VALUES
  ('anwendungen.kindertagesstaetten', 'broschure_kita', 'title', 'de', true),
  ('anwendungen.kindertagesstaetten', 'broschure_kita', 'title', 'en', true)
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
  SET is_enabled = EXCLUDED.is_enabled;
