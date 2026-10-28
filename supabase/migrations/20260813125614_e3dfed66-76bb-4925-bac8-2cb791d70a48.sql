INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT w.page_key, 'card_feuerwehr', w.field_key, w.locale, true
FROM public.cms_admin_editable_fields w
WHERE w.page_key = 'anwendungen.oeffentliche-hand'
  AND w.section_key = 'card_behoerde'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields x
    WHERE x.page_key = w.page_key
      AND x.section_key = 'card_feuerwehr'
      AND x.field_key = w.field_key
      AND x.locale = w.locale
  );

UPDATE public.cms_admin_editable_fields
SET is_enabled = true, updated_at = now()
WHERE page_key = 'anwendungen.oeffentliche-hand'
  AND section_key = 'card_feuerwehr'
  AND is_enabled = false;