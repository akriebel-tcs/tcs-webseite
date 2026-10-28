-- Hotfix Navigation Main Root Repair
-- Setzt 3 versehentlich reparentete Root-Knoten zurück auf parent_id = NULL
-- und korrigiert die sort_order der 7 Main-Roots auf die fachlich richtige Reihenfolge.
-- Idempotent: kein DELETE, keine Inhaltsfelder, nur cms_navigation_nodes (nav_area='main').

UPDATE public.cms_navigation_nodes
SET parent_id = NULL,
    is_active = true,
    show_in_public_nav = true,
    updated_at = now()
WHERE nav_area = 'main'
  AND node_key IN ('gebaeudekommunikation', 'gebaeudemanagement', 'zutrittskontrolle')
  AND parent_id IS NOT NULL;

-- Reihenfolge der Roots: Produkte, Gebäudekommunikation, Gebäudemanagement,
-- Eingangssysteme, Zutrittskontrolle, TCS in Bauten, Services
UPDATE public.cms_navigation_nodes SET sort_order = 0, updated_at = now()
  WHERE nav_area = 'main' AND node_key = 'pr.root' AND sort_order IS DISTINCT FROM 0;
UPDATE public.cms_navigation_nodes SET sort_order = 1, updated_at = now()
  WHERE nav_area = 'main' AND node_key = 'gebaeudekommunikation' AND sort_order IS DISTINCT FROM 1;
UPDATE public.cms_navigation_nodes SET sort_order = 2, updated_at = now()
  WHERE nav_area = 'main' AND node_key = 'gebaeudemanagement' AND sort_order IS DISTINCT FROM 2;
UPDATE public.cms_navigation_nodes SET sort_order = 3, updated_at = now()
  WHERE nav_area = 'main' AND node_key = 'eingangssysteme' AND sort_order IS DISTINCT FROM 3;
UPDATE public.cms_navigation_nodes SET sort_order = 4, updated_at = now()
  WHERE nav_area = 'main' AND node_key = 'zutrittskontrolle' AND sort_order IS DISTINCT FROM 4;
UPDATE public.cms_navigation_nodes SET sort_order = 5, updated_at = now()
  WHERE nav_area = 'main' AND node_key = 'anwendungen' AND sort_order IS DISTINCT FROM 5;
UPDATE public.cms_navigation_nodes SET sort_order = 6, updated_at = now()
  WHERE nav_area = 'main' AND node_key = 'services' AND sort_order IS DISTINCT FROM 6;