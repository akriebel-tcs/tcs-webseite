
WITH defaults(idx, loc, std) AS (
  VALUES
    (1, 'de', 'Mehr erfahren'),
    (1, 'en', 'Learn more'),
    (2, 'de', 'Zum Planer'),
    (2, 'en', 'To planner'),
    (3, 'de', 'Zum Konfigurator'),
    (3, 'en', 'To configurator')
),
override_whitelist(val) AS (
  VALUES
    ('details'), ('detail'), ('mehr'), ('more'),
    ('mehr erfahren'), ('learn more'),
    ('zum planer'), ('to planner'),
    ('zum konfigurator'), ('to configurator')
)
UPDATE cms_section_fields f
SET value = d.std,
    updated_at = now()
FROM cms_sections s, defaults d
WHERE s.section_type = 'card_v1'
  AND s.is_active = true
  AND f.page_key = s.page_key
  AND f.section_key = s.section_key
  AND f.field_key = 'link_' || d.idx || '_label'
  AND f.locale = d.loc
  AND (
    f.value IS NULL
    OR btrim(f.value) = ''
    OR lower(btrim(f.value)) IN (SELECT val FROM override_whitelist)
  )
  AND COALESCE(f.value, '') <> d.std;
