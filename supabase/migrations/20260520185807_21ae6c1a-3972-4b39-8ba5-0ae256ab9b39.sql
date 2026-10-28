-- cms-mainnav-tcs-in-bauten-objektloesungen-1
-- Add MainNav node for "Gewerbe & Objektlösungen" under "TCS in Bauten"
-- Idempotent: insert only if no main-nav node points to anwendungen.objektloesungen yet.

DO $$
DECLARE
  v_parent_id uuid;
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_parent_id
  FROM public.cms_navigation_nodes
  WHERE nav_area = 'main' AND node_key = 'anwendungen'
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'MainNav parent node "anwendungen" not found';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.cms_navigation_nodes
  WHERE nav_area = 'main' AND page_key = 'anwendungen.objektloesungen'
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.cms_navigation_nodes (
      nav_area, node_key, parent_id, page_key, route_path,
      label_de, label_en, label,
      node_type, sort_order, is_active, show_in_public_nav
    ) VALUES (
      'main', 'an.objektloesungen', v_parent_id,
      'anwendungen.objektloesungen', '/anwendungen/objektloesungen',
      'Gewerbe & Objektlösungen', 'Commercial & Property Solutions',
      'Gewerbe & Objektlösungen',
      'page', 15, true, true
    );
  ELSE
    UPDATE public.cms_navigation_nodes
       SET parent_id          = v_parent_id,
           route_path         = '/anwendungen/objektloesungen',
           label_de           = COALESCE(NULLIF(label_de, ''), 'Gewerbe & Objektlösungen'),
           label_en           = COALESCE(NULLIF(label_en, ''), 'Commercial & Property Solutions'),
           node_type          = 'page',
           is_active          = true,
           show_in_public_nav = true,
           sort_order         = CASE WHEN sort_order IS NULL OR sort_order = 0 THEN 15 ELSE sort_order END,
           updated_at         = now()
     WHERE id = v_existing_id;
  END IF;
END $$;