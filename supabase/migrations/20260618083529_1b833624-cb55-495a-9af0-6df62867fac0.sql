INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'anwendungen.kindertagesstaetten', section_key, field_key, locale, is_enabled
FROM public.cms_admin_editable_fields
WHERE page_key='anwendungen.bildungseinrichtungen' AND section_key='broschure_kita'
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled=EXCLUDED.is_enabled, updated_at=now();

DELETE FROM public.cms_admin_editable_fields
WHERE page_key='anwendungen.bildungseinrichtungen' AND section_key='broschure_kita';