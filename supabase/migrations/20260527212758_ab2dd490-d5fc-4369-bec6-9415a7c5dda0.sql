WITH pilot_cards AS (
  SELECT s.page_key, s.section_key
  FROM public.cms_sections s
  JOIN public.cms_sections p ON p.id = s.parent_section_id
  WHERE s.page_key = 'gebaeudekommunikation.tuersprechanlagen'
    AND s.section_type = 'card_v1'
    AND p.section_key IN ('aussenstationen', 'innenstationen')
), pilot_defaults AS (
  SELECT
    pc.page_key,
    pc.section_key,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.cms_assets a
        WHERE a.page_key = pc.page_key
          AND a.section_key = pc.section_key
          AND a.field_key = 'image'
          AND a.is_active = true
      ) THEN '1'
      ELSE '0'
    END AS default_value
  FROM pilot_cards pc
)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT pd.page_key, pd.section_key, 'image_enabled', l.locale, pd.default_value
FROM pilot_defaults pd
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.cms_section_fields f
  WHERE f.page_key = pd.page_key
    AND f.section_key = pd.section_key
    AND f.field_key = 'image_enabled'
    AND f.locale = l.locale
);

WITH pilot_cards AS (
  SELECT s.page_key, s.section_key
  FROM public.cms_sections s
  JOIN public.cms_sections p ON p.id = s.parent_section_id
  WHERE s.page_key = 'gebaeudekommunikation.tuersprechanlagen'
    AND s.section_type = 'card_v1'
    AND p.section_key IN ('aussenstationen', 'innenstationen')
)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT pc.page_key, pc.section_key, 'image_enabled', l.locale, true
FROM pilot_cards pc
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.cms_admin_editable_fields w
  WHERE w.page_key = pc.page_key
    AND w.section_key = pc.section_key
    AND w.field_key = 'image_enabled'
    AND w.locale = l.locale
);
