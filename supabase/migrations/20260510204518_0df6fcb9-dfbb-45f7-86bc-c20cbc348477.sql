-- cms-light-admin-tree-pilot-node-fix-1
-- 1) Migrationsfest machen: home.start als draft/inaktiv und home im Public-Nav verbergen.
UPDATE public.cms_pages
   SET status = 'draft', is_active = false, updated_at = now()
 WHERE page_key = 'home.start'
   AND (status <> 'draft' OR is_active <> false);

UPDATE public.cms_navigation_nodes
   SET show_in_public_nav = false, updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'home'
   AND show_in_public_nav <> false;

-- 2) Pilot-Strukturknoten anwendungen.pflege idempotent unter an.gesundheit anlegen.
--    Nicht öffentlich sichtbar (show_in_public_nav=false), aber im Admin-Baum auswählbar.
INSERT INTO public.cms_navigation_nodes (
  nav_area, node_key, parent_id, page_key, label, label_de, label_en,
  node_type, route_path, sort_order, is_active, show_in_public_nav
)
SELECT
  'main',
  'an.pflege',
  p.id,
  'anwendungen.pflege',
  'Pflege & Betreutes Wohnen',
  'Pflege & Betreutes Wohnen',
  'Care & Assisted Living',
  'page',
  '/anwendungen/pflege',
  35,
  true,
  false
FROM public.cms_navigation_nodes p
WHERE p.nav_area = 'main' AND p.node_key = 'an.gesundheit'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_navigation_nodes
     WHERE nav_area = 'main' AND node_key = 'an.pflege'
  );

-- 3) Read-RPC erweitern: show_in_public_nav mitliefern.
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
        'label_de', n.label_de,
        'label_en', n.label_en,
        'description_de', n.description_de,
        'description_en', n.description_en,
        'node_type', n.node_type,
        'external_url', n.external_url,
        'route_path', n.route_path,
        'sort_order', n.sort_order,
        'is_active', n.is_active,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.nav_area, n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id;
$function$;