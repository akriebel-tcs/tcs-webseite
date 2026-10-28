-- Tranche 24: icon_image-Slot pro Iconkarte unter Kartencontainer (Whitelist DE+EN)
-- Idempotent: ON CONFLICT DO NOTHING. Keine Assets, keine Feldwerte angelegt —
-- nur Whitelist-Eintrag, damit Bildredakteur später TCS-Bildicon hochladen kann.
-- Scope: alle aktiven card_v1-Sections unter aktiven cards_v1-Eltern, die bereits
-- ein gepflegtes `icon` (Lucide) haben. Bestehende Renderer-Priorität
-- icon_image → icon → Fallback gilt (CardsSectionV1, FeatureGridV1).

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT DISTINCT s.page_key, s.section_key, 'icon_image', loc, true
FROM public.cms_sections s
JOIN public.cms_sections p ON p.id = s.parent_section_id
JOIN public.cms_section_fields f
  ON f.page_key = s.page_key
 AND f.section_key = s.section_key
 AND f.field_key = 'icon'
CROSS JOIN (VALUES ('de'), ('en')) AS l(loc)
WHERE s.section_type = 'card_v1'
  AND p.section_type = 'cards_v1'
  AND s.is_active = true
  AND p.is_active = true
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;