UPDATE cms_section_fields
SET value = value_json::text,
    updated_at = now()
WHERE page_key LIKE 'anwendungen.referenzprojekte.%'
  AND field_key = 'items'
  AND value_json IS NOT NULL
  AND (value IS NULL OR value = '');