-- Etappe D1: cta_v1 Legacy-Felder bereinigen + show_secondary Toggle einführen
-- Idempotent: kann mehrfach ausgeführt werden.

-- 1) Inhalte von Legacy-Keys auf kanonische Keys übertragen (nur wenn Ziel leer).
--    Betrifft genau die Sections mit Legacy-Werten (heute: home.start/cta).
WITH legacy AS (
  SELECT page_key, section_key, locale, field_key, value
  FROM cms_section_fields
  WHERE field_key IN ('headline', 'intro', 'primary', 'secondary')
    AND (page_key, section_key) IN (
      SELECT page_key, section_key FROM cms_sections WHERE section_type = 'cta_v1'
    )
)
UPDATE cms_section_fields tgt
SET value = src.value, updated_at = now()
FROM legacy src
WHERE tgt.page_key = src.page_key
  AND tgt.section_key = src.section_key
  AND tgt.locale = src.locale
  AND tgt.field_key = CASE src.field_key
    WHEN 'headline'  THEN 'title'
    WHEN 'intro'     THEN 'text'
    WHEN 'primary'   THEN 'cta_label'
    WHEN 'secondary' THEN 'cta_secondary_label'
  END
  AND COALESCE(NULLIF(TRIM(tgt.value), ''), '') = '';

-- 2) Legacy-Keys aus cms_section_fields entfernen (nur für cta_v1).
DELETE FROM cms_section_fields f
USING cms_sections s
WHERE f.page_key = s.page_key
  AND f.section_key = s.section_key
  AND s.section_type = 'cta_v1'
  AND f.field_key IN ('headline', 'intro', 'primary', 'secondary');

-- 3) Legacy-Keys aus Whitelist entfernen.
DELETE FROM cms_admin_editable_fields ef
USING cms_sections s
WHERE ef.page_key = s.page_key
  AND ef.section_key = s.section_key
  AND s.section_type = 'cta_v1'
  AND ef.field_key IN ('headline', 'intro', 'primary', 'secondary');

-- 4) Neues Toggle-Feld show_secondary für ALLE cta_v1 Sections (DE+EN, leer).
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, s.section_key, 'show_secondary', l.locale, ''
FROM cms_sections s
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE s.section_type = 'cta_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 5) Whitelist-Eintrag für show_secondary (DE+EN, aktiv).
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, 'show_secondary', l.locale, true
FROM cms_sections s
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE s.section_type = 'cta_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;