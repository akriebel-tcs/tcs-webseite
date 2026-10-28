-- 1) Section-Typ auf teaser_2col_v1 umstellen (idempotent)
UPDATE cms_sections
SET section_type = 'teaser_2col_v1', updated_at = now()
WHERE page_key = 'home.start'
  AND section_key IN ('block_communication','block_access','block_signage','block_entry','block_solutions','block_consulting')
  AND section_type <> 'teaser_2col_v1';

-- 2) Neue Felder befüllen: title (= headline), cta_label (= cta), image_position alternierend, background_variant=default
--    sowie cta_link für block_consulting auf bisheriges Anker-Verhalten setzen.
WITH src AS (
  SELECT page_key, section_key, field_key, locale, value
  FROM cms_section_fields
  WHERE page_key='home.start'
    AND section_key IN ('block_communication','block_access','block_signage','block_entry','block_solutions','block_consulting')
    AND field_key IN ('headline','cta')
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT page_key, section_key,
       CASE field_key WHEN 'headline' THEN 'title' WHEN 'cta' THEN 'cta_label' END,
       locale, value
FROM src
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();

-- image_position alternierend nach sort_order der 6 Blöcke
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('home.start','block_communication','image_position','de','right'),
  ('home.start','block_communication','image_position','en','right'),
  ('home.start','block_access',       'image_position','de','left'),
  ('home.start','block_access',       'image_position','en','left'),
  ('home.start','block_signage',      'image_position','de','right'),
  ('home.start','block_signage',      'image_position','en','right'),
  ('home.start','block_entry',        'image_position','de','left'),
  ('home.start','block_entry',        'image_position','en','left'),
  ('home.start','block_solutions',    'image_position','de','right'),
  ('home.start','block_solutions',    'image_position','en','right'),
  ('home.start','block_consulting',   'image_position','de','left'),
  ('home.start','block_consulting',   'image_position','en','left')
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();

-- background_variant=default für alle sechs
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'home.start', sk, 'background_variant', loc, 'default'
FROM (VALUES ('block_communication'),('block_access'),('block_signage'),('block_entry'),('block_solutions'),('block_consulting')) AS s(sk)
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- cta_link für block_consulting: bisheriges Code-Default '#kontakt' jetzt CMS-pflegbar
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('home.start','block_consulting','cta_link','de','#kontakt'),
  ('home.start','block_consulting','cta_link','en','#kontakt')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 3) Whitelist (Admin sichtbar) für neue Felder
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'home.start', sk, fk, loc, true
FROM (VALUES ('block_communication'),('block_access'),('block_signage'),('block_entry'),('block_solutions'),('block_consulting')) AS s(sk)
CROSS JOIN (VALUES ('title'),('cta_label'),('image_position'),('background_variant')) AS f(fk)
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
  SET is_enabled = true, updated_at = now();