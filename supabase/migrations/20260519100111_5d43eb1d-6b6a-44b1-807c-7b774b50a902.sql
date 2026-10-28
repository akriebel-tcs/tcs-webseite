-- Etappe 2: sort_order strikt normalisieren (idempotent)
-- Regeln pro Page-Ebene (parent_section_id-Gruppe):
--   1. hero_v1                                      -> Priorität 0
--   2. content_v1 + section_key='overview'          -> Priorität 1
--   3. content_v1 + section_key='submenu'           -> Priorität 2
--   4. alle anderen                                 -> Priorität 3
-- Innerhalb der Priorität: bestehende sort_order, dann section_key (stabil)
-- Neue sort_order = row_number() * 10

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY page_key, COALESCE(parent_section_id::text, '__root__')
      ORDER BY
        CASE
          WHEN section_type = 'hero_v1' THEN 0
          WHEN section_type = 'content_v1' AND section_key = 'overview' THEN 1
          WHEN section_type = 'content_v1' AND section_key = 'submenu'  THEN 2
          ELSE 3
        END,
        sort_order,
        section_key
    ) * 10 AS new_sort
  FROM cms_sections
)
UPDATE cms_sections s
SET sort_order = r.new_sort,
    updated_at = now()
FROM ranked r
WHERE s.id = r.id
  AND s.sort_order IS DISTINCT FROM r.new_sort;