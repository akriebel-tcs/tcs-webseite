-- Etappe 3: icon + image für alle card_v1 Sections whitelisten (idempotent)
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, loc.locale, true
FROM cms_sections s
CROSS JOIN (VALUES ('icon'), ('image')) AS fk(field_key)
CROSS JOIN (VALUES ('de'), ('en')) AS loc(locale)
WHERE s.section_type = 'card_v1'
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();