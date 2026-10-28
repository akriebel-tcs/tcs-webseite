UPDATE public.cms_section_fields
SET value = '/produkte/tuerkommunikation', updated_at = now()
WHERE page_key = 'gebaeudekommunikation.grossanlagen'
  AND section_key = 'card_pespetpro'
  AND field_key = 'link_1_href'
  AND locale IN ('de','en');