
DELETE FROM public.cms_section_fields f
USING public.cms_sections s
WHERE f.page_key = s.page_key
  AND f.section_key = s.section_key
  AND s.is_active = false
  AND f.field_key LIKE '%.%'
  AND f.value IS NOT NULL
  AND f.value <> '';
