
-- 1) Whitelist-Header für personas.wohnungswirtschaft
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'personas.wohnungswirtschaft', sk, fk, lo, true
FROM unnest(ARRAY['detail_bestandsmodernisierung','detail_zutrittParkraum']) sk
CROSS JOIN unnest(ARRAY['label','title','intro']) fk
CROSS JOIN unnest(ARRAY['de','en']) lo
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true;

-- 2) Verwaiste Punkt-Key-Felder in inaktiven Containern entfernen
DELETE FROM public.cms_section_fields f
USING public.cms_sections s
WHERE f.page_key = s.page_key
  AND f.section_key = s.section_key
  AND s.is_active = false
  AND f.field_key LIKE '%.%'
  AND f.value IS NOT NULL
  AND f.value <> '';
