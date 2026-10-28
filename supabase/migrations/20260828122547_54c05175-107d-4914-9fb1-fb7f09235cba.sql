INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, 'section_bg', 'de', true
FROM public.cms_sections s
WHERE s.section_type IN ('hero_v1', 'hero')
  AND s.parent_section_id IS NULL
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();