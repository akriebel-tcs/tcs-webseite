-- Freischaltung des bereits vom Renderer gelesenen Feldes `section_bg`
-- für genau einen cards_v1-Block auf P-006 (idempotent).
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.briefkastenanlagen', 'sortiment_bilder', 'section_bg', l, true
FROM (VALUES ('de'), ('en')) AS v(l)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_admin_editable_fields x
  WHERE x.page_key = 'gebaeudekommunikation.briefkastenanlagen'
    AND x.section_key = 'sortiment_bilder'
    AND x.field_key = 'section_bg'
    AND x.locale = v.l
);

UPDATE public.cms_admin_editable_fields
SET is_enabled = true, updated_at = now()
WHERE page_key = 'gebaeudekommunikation.briefkastenanlagen'
  AND section_key = 'sortiment_bilder'
  AND field_key = 'section_bg'
  AND is_enabled IS DISTINCT FROM true;