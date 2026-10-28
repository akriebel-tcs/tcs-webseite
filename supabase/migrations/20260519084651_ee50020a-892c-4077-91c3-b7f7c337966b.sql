-- Whitelist `items.N.icon` (DE+EN) für jede (page_key, section_key, N),
-- in der bereits ein `items.N.title` existiert. Idempotent.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT DISTINCT
  f.page_key,
  f.section_key,
  regexp_replace(f.field_key, '\.title$', '.icon') AS field_key,
  loc.locale,
  true
FROM public.cms_section_fields f
CROSS JOIN (VALUES ('de'), ('en')) AS loc(locale)
WHERE f.field_key ~ '^items\.[0-9]+\.title$'
ON CONFLICT DO NOTHING;
