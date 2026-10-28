WITH pilot_cards AS (
  SELECT c.page_key, c.section_key
  FROM public.cms_sections c
  JOIN public.cms_sections p ON p.id = c.parent_section_id
  WHERE c.page_key = 'gebaeudekommunikation.tuersprechanlagen'
    AND c.section_type = 'card_v1'
    AND p.section_key IN ('aussenstationen', 'innenstationen')
), locales(locale) AS (VALUES ('de'), ('en'))
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT pc.page_key, pc.section_key, 'icon', l.locale, ''
FROM pilot_cards pc CROSS JOIN locales l
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_section_fields f
  WHERE f.page_key = pc.page_key AND f.section_key = pc.section_key
    AND f.field_key = 'icon' AND f.locale = l.locale
);
