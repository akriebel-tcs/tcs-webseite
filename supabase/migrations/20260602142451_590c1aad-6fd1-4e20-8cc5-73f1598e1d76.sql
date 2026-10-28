-- Etappe E1: cta_v1 LinkBlock — neue editoriale Hilfsfelder cta_kind + cta_secondary_kind
-- Werte: 'intern' (Default) | 'extern' | 'shortid'.
-- Reine Admin-Hilfe für die Eingabemaske (steuert nur den Placeholder im href-Feld).
-- Der Public-Renderer benutzt weiterhin ausschließlich cta_href / cta_secondary_href.
-- Locale 'de' (technisches/redaktionelles Feld, nicht übersetzbar).
-- Idempotent: ON CONFLICT DO NOTHING beim Seeden, WHERE NOT EXISTS beim Whitelisten.

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, s.section_key, 'cta_kind', 'de', 'intern'
FROM public.cms_sections s
WHERE s.section_type = 'cta_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, s.section_key, 'cta_secondary_kind', 'de', 'intern'
FROM public.cms_sections s
WHERE s.section_type = 'cta_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- Whitelist (Admin-Pflege erlauben)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, 'cta_kind', 'de', true
FROM public.cms_sections s
WHERE s.section_type = 'cta_v1'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields w
    WHERE w.page_key = s.page_key AND w.section_key = s.section_key
      AND w.field_key = 'cta_kind' AND w.locale = 'de'
  );

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, 'cta_secondary_kind', 'de', true
FROM public.cms_sections s
WHERE s.section_type = 'cta_v1'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields w
    WHERE w.page_key = s.page_key AND w.section_key = s.section_key
      AND w.field_key = 'cta_secondary_kind' AND w.locale = 'de'
  );