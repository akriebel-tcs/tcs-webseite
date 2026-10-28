-- CTA: Per-Button-Farbe (auto/dark/light), Default "auto" (folgt Hintergrund).
-- 1) Whitelist für die zwei neuen Felder in DE für alle cta_v1-Sections.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, 'de'::text, true
FROM public.cms_sections s
CROSS JOIN (VALUES ('cta_primary_color'), ('cta_secondary_color')) AS fk(field_key)
WHERE s.section_type = 'cta_v1'
ON CONFLICT DO NOTHING;

-- 2) Default-Wert "auto" für alle cta_v1-Sections (idempotent).
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, s.section_key, fk.field_key, 'de'::text, 'auto'::text
FROM public.cms_sections s
CROSS JOIN (VALUES ('cta_primary_color'), ('cta_secondary_color')) AS fk(field_key)
WHERE s.section_type = 'cta_v1'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_section_fields f
    WHERE f.page_key = s.page_key
      AND f.section_key = s.section_key
      AND f.field_key = fk.field_key
      AND f.locale = 'de'
  );