-- card_v1: Bild-Slots im Admin für alle aktiven Standardkarten sichtbar machen.
-- Idempotent: erzeugt fehlende Whitelist-Einträge für image/thumbnail/icon_image,
-- damit der Upload auch ohne vorhandenes Asset angezeigt wird.

INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, loc.locale, true
FROM cms_sections s
CROSS JOIN (
  VALUES ('image'), ('thumbnail'), ('icon_image')
) AS fk(field_key)
CROSS JOIN (
  VALUES ('de'), ('en')
) AS loc(locale)
WHERE s.section_type = 'card_v1'
  AND s.is_active = true
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET
  is_enabled = true,
  updated_at = now();
