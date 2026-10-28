INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, f.field_key, l.locale, true
FROM public.cms_sections s
CROSS JOIN (VALUES ('image'), ('icon_image')) AS f(field_key)
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE s.parent_section_id = '83825f04-783f-4797-8465-167494fd7193'
  AND s.section_type = 'card_v1'
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();