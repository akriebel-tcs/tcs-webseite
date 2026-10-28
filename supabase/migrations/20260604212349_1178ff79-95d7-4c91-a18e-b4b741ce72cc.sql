CREATE OR REPLACE FUNCTION public.rpc_public_resolve_breadcrumb(p_route_path text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start uuid;
  v_result jsonb;
BEGIN
  IF p_route_path IS NULL OR length(trim(p_route_path)) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Startknoten: direkter route_path-Match.
  -- WICHTIG: `n.is_active` wird hier NICHT geprüft. "Hauptmenü aus"
  -- bedeutet nur, dass der Knoten nicht in der oberen Menüleiste
  -- erscheint — die Seite ist trotzdem live und braucht ihre
  -- Breadcrumb-Hierarchie (z. B. Service-Hub-Sub-Pages).
  -- Geprüft wird nur, ob die zugehörige Seite veröffentlicht/aktiv ist.
  SELECT n.id INTO v_start
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.route_path = p_route_path
    AND (
      n.page_key IS NULL
      OR (pg.status = 'published' AND pg.is_active = true)
    )
  ORDER BY n.nav_area = 'main' DESC, n.is_active DESC, n.sort_order
  LIMIT 1;

  -- Fallback: über cms_pages.route_path -> page_key
  IF v_start IS NULL THEN
    SELECT n.id INTO v_start
    FROM public.cms_navigation_nodes n
    JOIN public.cms_pages pg ON pg.page_key = n.page_key
    WHERE pg.route_path = p_route_path
      AND pg.status = 'published'
      AND pg.is_active = true
    ORDER BY n.nav_area = 'main' DESC, n.is_active DESC, n.sort_order
    LIMIT 1;
  END IF;

  IF v_start IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Rekursive Eltern-Kette. Auch hier kein `is_active`-Filter:
  -- eine Eltern-Sektion „Hauptmenü aus" darf den Crumb-Pfad nicht abreißen.
  WITH RECURSIVE chain AS (
    SELECT n.id, n.parent_id, n.node_key, n.label_de, n.label_en,
           n.route_path, n.page_key, 0 AS depth
    FROM public.cms_navigation_nodes n
    WHERE n.id = v_start
    UNION ALL
    SELECT p.id, p.parent_id, p.node_key, p.label_de, p.label_en,
           p.route_path, p.page_key, c.depth + 1
    FROM public.cms_navigation_nodes p
    JOIN chain c ON c.parent_id = p.id
    WHERE c.depth < 12
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'node_key', c.node_key,
      'page_key', c.page_key,
      'label_de', c.label_de,
      'label_en', c.label_en,
      'route_path', COALESCE(c.route_path, pg.route_path)
    )
    ORDER BY c.depth DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM chain c
  LEFT JOIN public.cms_pages pg ON pg.page_key = c.page_key;

  RETURN v_result;
END;
$function$;