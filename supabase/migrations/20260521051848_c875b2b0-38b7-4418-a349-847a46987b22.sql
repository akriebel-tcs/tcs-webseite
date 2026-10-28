
-- Stage 1A: Card template normalization (idempotent, project-wide)
-- benefits: desc -> description (DE/EN), don't overwrite existing
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT f.page_key, f.section_key, 'description', f.locale, f.value
FROM public.cms_section_fields f
JOIN public.cms_sections c ON c.page_key = f.page_key AND c.section_key = f.section_key
JOIN public.cms_sections p ON p.id = c.parent_section_id
WHERE f.field_key = 'desc'
  AND f.locale IN ('de','en')
  AND p.section_key = 'benefits'
  AND f.value IS NOT NULL AND f.value <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_section_fields x
    WHERE x.page_key = f.page_key AND x.section_key = f.section_key
      AND x.field_key = 'description' AND x.locale = f.locale
  );

-- useCases: text -> description (DE/EN), don't overwrite existing
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT f.page_key, f.section_key, 'description', f.locale, f.value
FROM public.cms_section_fields f
JOIN public.cms_sections c ON c.page_key = f.page_key AND c.section_key = f.section_key
JOIN public.cms_sections p ON p.id = c.parent_section_id
WHERE f.field_key = 'text'
  AND f.locale IN ('de','en')
  AND p.section_key = 'useCases'
  AND f.value IS NOT NULL AND f.value <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_section_fields x
    WHERE x.page_key = f.page_key AND x.section_key = f.section_key
      AND x.field_key = 'description' AND x.locale = f.locale
  );

-- Whitelist canonical fields for all benefit/useCase cards (idempotent)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT c.page_key, c.section_key, fk.f, l.loc, true
FROM public.cms_sections c
JOIN public.cms_sections p ON p.id = c.parent_section_id
CROSS JOIN (VALUES ('title'),('description'),('icon'),('image')) AS fk(f)
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
WHERE p.section_key IN ('benefits','useCases')
ON CONFLICT DO NOTHING;
