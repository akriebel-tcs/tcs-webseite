INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, 'background_variant', loc.locale, true
FROM public.cms_sections s
CROSS JOIN (VALUES ('de'), ('en')) AS loc(locale)
WHERE s.section_type = 'teaser_2col_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
  SET is_enabled = true, updated_at = now();