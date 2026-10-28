UPDATE public.cms_section_fields
SET value = '0', updated_at = now()
WHERE field_key IN ('link_2_enabled','link_3_enabled')
  AND value IS DISTINCT FROM '0';