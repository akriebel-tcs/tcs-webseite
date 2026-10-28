-- Etappe 1.a — DB-erst-Navigation: Public-RPC für vollständigen Navigationsbaum.
--
-- Bisher liefert rpc_public_read_navigation_overlay nur Overlay-Felder
-- (Labels, Sortierung, Sichtbarkeit). Für DB-erst-Rendering brauchen
-- die öffentlichen Renderer (MainNavigation, MetaNavigation, Footer)
-- aber zusätzlich Routen, Beschreibungen, externe URLs und Knotentyp.
--
-- Diese RPC liefert ausschließlich öffentlich sichtbare Knoten
-- (is_active = true UND show_in_public_nav = true) eines Bereichs.
-- Idempotent (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION public.rpc_public_read_navigation_tree(p_nav_area text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'node_key', n.node_key,
        'parent_node_key', p.node_key,
        'page_key', n.page_key,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'description_de', n.description_de,
        'description_en', n.description_en,
        'route_path', n.route_path,
        'external_url', n.external_url,
        'node_type', n.node_type,
        'sort_order', n.sort_order,
        'is_active', n.is_active,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id
  WHERE n.nav_area = p_nav_area
    AND n.is_active = true
    AND n.show_in_public_nav = true;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_read_navigation_tree(text) TO anon, authenticated;