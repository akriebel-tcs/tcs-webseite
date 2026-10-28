-- Nachzug: anwendungsumfelder card_v1-Kinder
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'gebaeudekommunikation.tuersprechanlagen', v.skey, 'card_v1', v.sort, true, p.id
FROM (VALUES
  ('anwendungsumfelder__einfamilienhaus', 10),
  ('anwendungsumfelder__mehrfamilienhaus', 20),
  ('anwendungsumfelder__gewerbebau', 30)
) v(skey, sort)
CROSS JOIN cms_sections p
WHERE p.page_key='gebaeudekommunikation.tuersprechanlagen' AND p.section_key='anwendungsumfelder'
ON CONFLICT (page_key, section_key) DO NOTHING;

-- Felder spiegeln
WITH mapping(src, tgt) AS (VALUES ('title','title'), ('teaser','description'))
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT
  f.page_key,
  'anwendungsumfelder__' || split_part(substring(f.field_key FROM '^items\.([^.]+)\.'), '.', 1),
  m.tgt,
  f.locale,
  f.value
FROM cms_section_fields f
CROSS JOIN mapping m
WHERE f.page_key='gebaeudekommunikation.tuersprechanlagen'
  AND f.section_key='anwendungsumfelder'
  AND f.field_key = 'items.' || split_part(substring(f.field_key FROM '^items\.([^.]+)\.'), '.', 1) || '.' || m.src
  AND f.value IS NOT NULL AND f.value <> ''
  AND split_part(substring(f.field_key FROM '^items\.([^.]+)\.'), '.', 1) IN ('einfamilienhaus','mehrfamilienhaus','gewerbebau')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- Whitelist Felder + image-Slot
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, l.locale, true
FROM cms_sections s
CROSS JOIN (VALUES ('title'),('description'),('image')) fk(field_key)
CROSS JOIN (VALUES ('de'),('en')) l(locale)
WHERE s.page_key='gebaeudekommunikation.tuersprechanlagen'
  AND s.section_key LIKE 'anwendungsumfelder\_\_%'
  AND s.section_type='card_v1'
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();
