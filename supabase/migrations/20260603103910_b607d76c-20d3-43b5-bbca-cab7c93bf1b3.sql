INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, 'icon_enabled', locale, true
  FROM public.cms_admin_editable_fields
 WHERE field_key = 'icon'
ON CONFLICT DO NOTHING;