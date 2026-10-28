INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('gebaeudekommunikation.grossanlagen', 'namensanzeige', 'cta_label', 'de', 'Mehr zur digitalen Namensanzeige'),
  ('gebaeudekommunikation.grossanlagen', 'namensanzeige', 'cta_label', 'en', 'More about the digital name display'),
  ('gebaeudekommunikation.grossanlagen', 'namensanzeige', 'cta_link',  'de', '/gebaeudemanagement/digitale-namensanzeige'),
  ('gebaeudekommunikation.grossanlagen', 'namensanzeige', 'cta_link',  'en', '/gebaeudemanagement/digitale-namensanzeige')
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = now();