
-- Etappe: FAQ-Item-Toggle (cms-light-faq-item-enabled-1)
-- Idempotent: ON CONFLICT DO NOTHING. Mehrfaches Ausführen ändert nichts.

WITH faq_items AS (
  SELECT DISTINCT
    f.page_key,
    f.section_key,
    split_part(substring(f.field_key from 7), '.', 1) AS slug
  FROM cms_section_fields f
  JOIN cms_sections s
    ON s.page_key = f.page_key AND s.section_key = f.section_key
  WHERE s.section_type = 'faq_v1'
    AND f.field_key LIKE 'items.%'
    AND split_part(substring(f.field_key from 7), '.', 1) <> ''
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT page_key, section_key, 'items.' || slug || '.enabled', loc, '1'
FROM faq_items, (VALUES ('de'), ('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

WITH faq_items AS (
  SELECT DISTINCT
    f.page_key,
    f.section_key,
    split_part(substring(f.field_key from 7), '.', 1) AS slug
  FROM cms_section_fields f
  JOIN cms_sections s
    ON s.page_key = f.page_key AND s.section_key = f.section_key
  WHERE s.section_type = 'faq_v1'
    AND f.field_key LIKE 'items.%'
    AND split_part(substring(f.field_key from 7), '.', 1) <> ''
)
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, 'items.' || slug || '.enabled', loc, true
FROM faq_items, (VALUES ('de'), ('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
