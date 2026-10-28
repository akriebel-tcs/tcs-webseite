
-- Etappe cms-navigation-tree-as-breadcrumb-source-1
-- Idempotent.

-- 1) Aktiviere Produktlösungs-Knoten und fülle route_path aus cms_pages.
--    show_in_public_nav=false, damit das Hauptmenü unverändert bleibt.
UPDATE public.cms_navigation_nodes n
SET is_active = true,
    show_in_public_nav = false,
    route_path = COALESCE(NULLIF(n.route_path, ''), pg.route_path),
    updated_at = now()
FROM public.cms_pages pg
WHERE n.page_key = pg.page_key
  AND n.node_key IN (
    'zk.drueckergarnitur',
    'zk.knaufzylinder',
    'zk.vorhaengeschloss',
    'zk.biometrie',
    'zk.bcm-online-leser',
    'zk.funkvernetzte-offline-leser',
    'zk.bcm-handsender'
  );

-- 2) Vorhängeschloss fachlich nach gm.schraenke umhängen (eindeutig:
--    bestehender Breadcrumb-Override + Card-Quelle auf schraenke-behaelter).
UPDATE public.cms_navigation_nodes
SET parent_id = (
      SELECT id FROM public.cms_navigation_nodes WHERE node_key = 'gm.schraenke' LIMIT 1
    ),
    updated_at = now()
WHERE node_key = 'zk.vorhaengeschloss'
  AND parent_id IS DISTINCT FROM (
      SELECT id FROM public.cms_navigation_nodes WHERE node_key = 'gm.schraenke' LIMIT 1
    );

-- 3) Neue read-only RPC: Breadcrumb-Kette aus cms_navigation_nodes.
--    - Auflösung über route_path ODER cms_pages.route_path -> page_key.
--    - Knoten muss is_active=true; show_in_public_nav darf false sein.
--    - Bei page_key muss die Seite published + active sein.
--    - Parent-Kette via parent_id.
CREATE OR REPLACE FUNCTION public.rpc_public_resolve_breadcrumb(p_route_path text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start uuid;
  v_result jsonb;
BEGIN
  IF p_route_path IS NULL OR length(trim(p_route_path)) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Startknoten: direkter route_path-Match
  SELECT n.id INTO v_start
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.is_active = true
    AND n.route_path = p_route_path
    AND (
      n.page_key IS NULL
      OR (pg.status = 'published' AND pg.is_active = true)
    )
  ORDER BY n.nav_area = 'main' DESC, n.sort_order
  LIMIT 1;

  -- Fallback: über cms_pages.route_path -> page_key
  IF v_start IS NULL THEN
    SELECT n.id INTO v_start
    FROM public.cms_navigation_nodes n
    JOIN public.cms_pages pg ON pg.page_key = n.page_key
    WHERE n.is_active = true
      AND pg.route_path = p_route_path
      AND pg.status = 'published'
      AND pg.is_active = true
    ORDER BY n.nav_area = 'main' DESC, n.sort_order
    LIMIT 1;
  END IF;

  IF v_start IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

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
    WHERE p.is_active = true
      AND c.depth < 12
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
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_resolve_breadcrumb(text) TO anon, authenticated;
