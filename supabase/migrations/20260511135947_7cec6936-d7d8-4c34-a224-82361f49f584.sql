-- Einmalige Neuvergabe von cms_pages.page_no anhand der DFS-Reihenfolge
-- im Navigationsbaum. Idempotent: Wiederholtes Ausführen erzeugt dieselbe
-- Zuteilung (deterministische ORDER BY).
DO $$
DECLARE
  _r record;
  _i integer := 0;
BEGIN
  -- 1) Alle bestehenden Nummern temporär in den negativen Bereich schieben,
  --    damit der UNIQUE-Index beim Re-Assign nicht stolpert.
  UPDATE public.cms_pages SET page_no = -page_no WHERE page_no > 0;

  -- 2) Neuvergabe in DFS-Reihenfolge: home → main → meta → footer → footer_bottom.
  --    Pro Seite zählt nur das ERSTE Auftreten im Baum (MIN-Pfad).
  FOR _r IN
    WITH RECURSIVE tree AS (
      SELECT id, nav_area, parent_id, page_key, node_key, sort_order,
             ARRAY[lpad(sort_order::text,4,'0'), node_key]::text[] AS path
        FROM public.cms_navigation_nodes
       WHERE parent_id IS NULL
      UNION ALL
      SELECT n.id, n.nav_area, n.parent_id, n.page_key, n.node_key, n.sort_order,
             t.path || ARRAY[lpad(n.sort_order::text,4,'0'), n.node_key]
        FROM public.cms_navigation_nodes n
        JOIN tree t ON n.parent_id = t.id
    ),
    ranked AS (
      SELECT
        page_key,
        MIN(
          ARRAY[
            CASE nav_area
              WHEN 'home'          THEN '1'
              WHEN 'main'          THEN '2'
              WHEN 'meta'          THEN '3'
              WHEN 'footer'        THEN '4'
              WHEN 'footer_bottom' THEN '5'
              ELSE '9'
            END
          ] || path
        ) AS sort_path
      FROM tree
      WHERE page_key IS NOT NULL
      GROUP BY page_key
    ),
    all_pages AS (
      -- Seiten mit Nav-Eintrag: nach Baum-Position
      SELECT p.page_key, r.sort_path AS sort_key, 0 AS bucket
        FROM public.cms_pages p
        JOIN ranked r ON r.page_key = p.page_key
      UNION ALL
      -- Seiten ohne Nav-Eintrag: ans Ende, alphabetisch
      SELECT p.page_key, ARRAY[p.page_key]::text[], 1 AS bucket
        FROM public.cms_pages p
        LEFT JOIN ranked r ON r.page_key = p.page_key
       WHERE r.page_key IS NULL
    )
    SELECT page_key
      FROM all_pages
      ORDER BY bucket, sort_key, page_key
  LOOP
    _i := _i + 1;
    UPDATE public.cms_pages SET page_no = _i WHERE page_key = _r.page_key;
  END LOOP;

  -- 3) Sequenz auf neuen Höchstwert setzen (>=1, damit setval gültig ist)
  PERFORM setval(
    'public.cms_pages_page_no_seq',
    GREATEST(_i, 1),
    true
  );
END $$;