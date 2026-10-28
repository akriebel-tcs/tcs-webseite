-- Trennstrich über Kartenlinks: globale Einstellung + Block-Override (idempotent)
INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
VALUES ('global.einstellungen', NULL, 'standard', 'Globale Einstellungen', 'Global settings', 'published', true)
ON CONFLICT (page_key) DO NOTHING;

INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
VALUES ('global.einstellungen', 'card_settings', 'content_v1', 0, true)
ON CONFLICT (page_key, section_key) DO NOTHING;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, review_status)
VALUES ('global.einstellungen', 'card_settings', 'card_dividers', 'de', 'on', 'geprueft')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
VALUES ('global.einstellungen', 'card_settings', 'card_dividers', 'de', true)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT p.page_key, p.section_key, 'card_dividers', 'de', true
  FROM public.cms_sections p
 WHERE p.section_type IN ('cards_v1','product_scroller_v1','feature_grid_v1','card_grid_v1')
    OR EXISTS (SELECT 1 FROM public.cms_sections c
                WHERE c.parent_section_id = p.id AND c.section_type = 'card_v1')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;