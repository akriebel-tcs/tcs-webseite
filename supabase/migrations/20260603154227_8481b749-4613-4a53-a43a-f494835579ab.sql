-- Schließt Whitelist-Lücken für card_v1-Bildslots flächendeckend (idempotent).
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT DISTINCT a.page_key, a.section_key, a.field_key, l.locale, true
FROM public.cms_assets a
JOIN public.cms_sections s
  ON s.page_key = a.page_key
 AND s.section_key = a.section_key
 AND s.is_active
 AND s.section_type = 'card_v1'
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE a.is_active
  AND a.field_key IN ('image','thumbnail','icon_image')
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields w
    WHERE w.page_key = a.page_key
      AND w.section_key = a.section_key
      AND w.field_key = a.field_key
      AND w.locale = l.locale
  );

-- Zusätzlich: alle card_v1-Sections bekommen image/thumbnail/icon_image
-- als pflegbares Feld, damit Redaktion ein NEUES Bild hochladen kann,
-- auch wenn noch keins existiert. Die Container-Matrix entscheidet
-- weiterhin, was öffentlich sichtbar wird.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, l.locale, true
FROM public.cms_sections s
CROSS JOIN (VALUES ('image'), ('thumbnail'), ('icon_image')) AS fk(field_key)
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE s.is_active AND s.section_type = 'card_v1'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields w
    WHERE w.page_key = s.page_key
      AND w.section_key = s.section_key
      AND w.field_key = fk.field_key
      AND w.locale = l.locale
  );