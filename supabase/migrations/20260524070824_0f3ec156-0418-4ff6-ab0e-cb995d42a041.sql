-- Tranche 7e: DB-first Icons für gebaeudekommunikation.tuersprechanlagen / vorteile
WITH icon_data(page_key, section_key, field_key, value) AS (
  VALUES
    ('gebaeudekommunikation.tuersprechanlagen','vorteile','items.qualitaet.icon','video'),
    ('gebaeudekommunikation.tuersprechanlagen','vorteile','items.mobil.icon','smartphone'),
    ('gebaeudekommunikation.tuersprechanlagen','vorteile','items.barrierefrei.icon','accessibility'),
    ('gebaeudekommunikation.tuersprechanlagen','vorteile','items.skalierbar.icon','network')
)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT d.page_key, d.section_key, d.field_key, l.locale, d.value
FROM icon_data d
CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true
FROM public.cms_section_fields
WHERE page_key = 'gebaeudekommunikation.tuersprechanlagen'
  AND section_key = 'vorteile'
  AND field_key LIKE '%.icon'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
