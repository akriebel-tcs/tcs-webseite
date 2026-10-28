-- Fokuspunkt "rechts Mitte" für Hero-Bild auf Seite gebaeudemanagement.digitale-namensanzeige.
-- Neues Feld hero.image_focus. Wert = CSS object-position ("right center").
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled) VALUES
  ('gebaeudemanagement.digitale-namensanzeige', 'hero', 'image_focus', 'de', true),
  ('gebaeudemanagement.digitale-namensanzeige', 'hero', 'image_focus', 'en', true)
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('gebaeudemanagement.digitale-namensanzeige', 'hero', 'image_focus', 'de', 'right center'),
  ('gebaeudemanagement.digitale-namensanzeige', 'hero', 'image_focus', 'en', 'right center')
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = now();