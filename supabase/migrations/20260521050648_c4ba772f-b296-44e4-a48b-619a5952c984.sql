INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT f.page_key, f.section_key, 'description'::text, f.locale, f.value
  FROM public.cms_section_fields f
  JOIN public.cms_sections s ON s.page_key = f.page_key AND s.section_key = f.section_key
  JOIN public.cms_sections p ON p.id = s.parent_section_id
 WHERE s.section_type = 'card_v1'
   AND p.section_key IN ('benefits', 'useCases')
   AND f.field_key IN ('desc', 'text')
   AND f.value IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.cms_section_fields f2
      WHERE f2.page_key = f.page_key
        AND f2.section_key = f.section_key
        AND f2.field_key = 'description'
        AND f2.locale = f.locale
   );

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT t.page_key, t.section_key, fk.field_key, lo.locale, true
  FROM (
    SELECT s.page_key, s.section_key
      FROM public.cms_sections s
      JOIN public.cms_sections p ON p.id = s.parent_section_id
     WHERE s.section_type = 'card_v1'
       AND p.section_key IN ('benefits', 'useCases')
  ) t
  CROSS JOIN (VALUES ('title'), ('description'), ('icon'), ('image')) AS fk(field_key)
  CROSS JOIN (VALUES ('de'), ('en')) AS lo(locale)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;