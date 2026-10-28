-- 1. Schreib-RPC entfernen
DROP FUNCTION IF EXISTS public.rpc_admin_update_navigation_label(uuid, text, text);

-- 2. Lese-RPC auf Originalstand zurücksetzen (ohne label_de/label_en)
CREATE OR REPLACE FUNCTION public.rpc_admin_read_navigation_nodes()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'nav_area', n.nav_area,
        'node_key', n.node_key,
        'parent_id', n.parent_id,
        'parent_node_key', p.node_key,
        'page_key', n.page_key,
        'label', n.label,
        'route_path', n.route_path,
        'sort_order', n.sort_order,
        'is_active', n.is_active
      )
      ORDER BY n.nav_area, n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id;
$function$;

-- 3. Spalten entfernen
ALTER TABLE public.cms_navigation_nodes
  DROP COLUMN IF EXISTS label_de,
  DROP COLUMN IF EXISTS label_en;