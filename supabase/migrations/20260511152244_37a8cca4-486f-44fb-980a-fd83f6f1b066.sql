CREATE OR REPLACE FUNCTION public.rpc_public_read_navigation_overlay(p_nav_area text)
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
        'is_active', n.is_active,
        'sort_order', n.sort_order,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id
  WHERE n.nav_area = p_nav_area;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_read_navigation_overlay(text) TO anon, authenticated;