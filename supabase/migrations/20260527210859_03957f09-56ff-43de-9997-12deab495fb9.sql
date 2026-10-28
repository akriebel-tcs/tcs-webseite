UPDATE public.cms_section_fields
SET value = 'Mehr erfahren', updated_at = now()
WHERE page_key = 'gebaeudekommunikation.tuersprechanlagen'
  AND section_key = 'card_pak'
  AND field_key = 'link_1_label'
  AND locale = 'de'
  AND value = 'Produkte';